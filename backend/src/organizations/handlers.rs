// Organization HTTP handlers
use rocket::{State, get, post, put, delete, http::Status};
use rocket::serde::json::Json;
use sqlx::PgPool;
use validator::Validate;

use super::models::{Organization, CreateOrganizationRequest, UpdateOrganizationRequest};
use crate::auth::middleware::AuthGuard;
use crate::shared::response::PaginatedResponse;
use crate::shared::pagination::PaginationParams;

#[get("/api/organizations?<page>&<per_page>&<top_level_only>")]
pub async fn list_organizations(
    page: Option<i32>,
    per_page: Option<i32>,
    top_level_only: Option<bool>,
    db: &State<PgPool>,
    _auth: AuthGuard,
) -> Result<Json<PaginatedResponse<Organization>>, Status> {
    let pagination = PaginationParams {
        page: page.unwrap_or(1).max(1),
        per_page: per_page.unwrap_or(20).clamp(1, 100),
    };

    // Determine if filtering for top-level organizations only
    let filter_top_level = top_level_only.unwrap_or(false);
    
    // Conditional SQL based on filter
    let (total_sql, organizations_sql) = if filter_top_level {
        (
            "SELECT COUNT(*) FROM organizations WHERE deleted_at IS NULL AND id NOT IN (SELECT DISTINCT organization_id FROM vendor_relations WHERE organization_id IS NOT NULL)",
            "SELECT id, company_name, contact_name, contact_email, contact_phone, clearance_level, contract_number, department, deleted_at, created_at, updated_at FROM organizations WHERE deleted_at IS NULL AND id NOT IN (SELECT DISTINCT organization_id FROM vendor_relations WHERE organization_id IS NOT NULL) ORDER BY company_name LIMIT $1 OFFSET $2"
        )
    } else {
        (
            "SELECT COUNT(*) FROM organizations WHERE deleted_at IS NULL",
            "SELECT id, company_name, contact_name, contact_email, contact_phone, clearance_level, contract_number, department, deleted_at, created_at, updated_at FROM organizations WHERE deleted_at IS NULL ORDER BY company_name LIMIT $1 OFFSET $2"
        )
    };

    // Get total count
    let total: i64 = sqlx::query_scalar::<sqlx::Postgres, i64>(total_sql)
        .fetch_one(db.inner())
        .await
        .map_err(|_| Status::InternalServerError)?;

    // Get organizations with pagination
    let organizations: Vec<Organization> = sqlx::query_as::<sqlx::Postgres, Organization>(organizations_sql)
        .bind(pagination.limit())
        .bind(pagination.offset())
        .fetch_all(db.inner())
        .await
        .map_err(|_| Status::InternalServerError)?;

    Ok(Json(PaginatedResponse {
        items: organizations,
        total,
        page: pagination.page,
        per_page: pagination.per_page,
        total_pages: ((total as f64) / (pagination.per_page as f64)).ceil() as i32,
    }))
}

#[get("/api/organizations/<id>")]
pub async fn get_organization(
    id: i32,
    db: &State<PgPool>,
    _auth: AuthGuard,
) -> Result<Json<Organization>, Status> {
    let organization = sqlx::query_as!(
        Organization,
        r#"
        SELECT id, company_name, contact_name, contact_email, contact_phone,
               clearance_level, contract_number, department, deleted_at, created_at, updated_at
        FROM organizations
        WHERE id = $1 AND deleted_at IS NULL
        "#,
        id
    )
    .fetch_optional(db.inner())
    .await
    .map_err(|_| Status::InternalServerError)?
    .ok_or(Status::NotFound)?;

    Ok(Json(organization))
}

#[post("/api/organizations", data = "<organization_request>")]
pub async fn create_organization(
    organization_request: Json<CreateOrganizationRequest>,
    db: &State<PgPool>,
    _auth: AuthGuard,
) -> Result<Json<Organization>, Status> {
    // Validate input
    organization_request.validate().map_err(|_| Status::BadRequest)?;

    // Insert organization
    let organization = sqlx::query_as!(
        Organization,
        r#"
        INSERT INTO organizations 
        (company_name, contact_name, contact_email, contact_phone, clearance_level, contract_number, department)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, company_name, contact_name, contact_email, contact_phone,
                  clearance_level, contract_number, department, deleted_at, created_at, updated_at
        "#,
        organization_request.company_name,
        organization_request.contact_name,
        organization_request.contact_email,
        organization_request.contact_phone,
        organization_request.clearance_level,
        organization_request.contract_number,
        organization_request.department
    )
    .fetch_one(db.inner())
    .await
    .map_err(|e| {
        eprintln!("Database error: {:?}", e);
        Status::InternalServerError
    })?;

    Ok(Json(organization))
}

#[put("/api/organizations/<id>", data = "<organization_request>")]
pub async fn update_organization(
    id: i32,
    organization_request: Json<UpdateOrganizationRequest>,
    db: &State<PgPool>,
    _auth: AuthGuard,
) -> Result<Json<Organization>, Status> {
    // Validate input
    organization_request.validate().map_err(|_| Status::BadRequest)?;

    // Check if organization exists and is not deleted
    let exists = sqlx::query_scalar!(
        "SELECT EXISTS(SELECT 1 FROM organizations WHERE id = $1 AND deleted_at IS NULL)",
        id
    )
    .fetch_one(db.inner())
    .await
    .map_err(|_| Status::InternalServerError)?
    .unwrap_or(false);

    if !exists {
        return Err(Status::NotFound);
    }

    // Build dynamic update query
    let mut query = String::from("UPDATE organizations SET updated_at = CURRENT_TIMESTAMP");
    let mut param_count = 1;

    if organization_request.company_name.is_some() {
        query.push_str(&format!(", company_name = ${}", param_count));
        param_count += 1;
    }
    if organization_request.contact_name.is_some() {
        query.push_str(&format!(", contact_name = ${}", param_count));
        param_count += 1;
    }
    if organization_request.contact_email.is_some() {
        query.push_str(&format!(", contact_email = ${}", param_count));
        param_count += 1;
    }
    if organization_request.contact_phone.is_some() {
        query.push_str(&format!(", contact_phone = ${}", param_count));
        param_count += 1;
    }
    if organization_request.clearance_level.is_some() {
        query.push_str(&format!(", clearance_level = ${}", param_count));
        param_count += 1;
    }
    if organization_request.contract_number.is_some() {
        query.push_str(&format!(", contract_number = ${}", param_count));
        param_count += 1;
    }
    if organization_request.department.is_some() {
        query.push_str(&format!(", department = ${}", param_count));
        param_count += 1;
    }

    query.push_str(&format!(" WHERE id = ${} RETURNING *", param_count));

    // Execute update with dynamic parameters
    let mut query_builder = sqlx::query_as::<_, Organization>(&query);
    
    if let Some(ref company_name) = organization_request.company_name {
        query_builder = query_builder.bind(company_name);
    }
    if let Some(ref contact_name) = organization_request.contact_name {
        query_builder = query_builder.bind(contact_name);
    }
    if let Some(ref contact_email) = organization_request.contact_email {
        query_builder = query_builder.bind(contact_email);
    }
    if let Some(ref contact_phone) = organization_request.contact_phone {
        query_builder = query_builder.bind(contact_phone);
    }
    if let Some(ref clearance_level) = organization_request.clearance_level {
        query_builder = query_builder.bind(clearance_level);
    }
    if let Some(ref contract_number) = organization_request.contract_number {
        query_builder = query_builder.bind(contract_number);
    }
    if let Some(ref department) = organization_request.department {
        query_builder = query_builder.bind(department);
    }
    
    query_builder = query_builder.bind(id);

    let organization = query_builder
        .fetch_one(db.inner())
        .await
        .map_err(|_| Status::InternalServerError)?;

    Ok(Json(organization))
}

#[delete("/api/organizations/<id>")]
pub async fn delete_organization(
    id: i32,
    db: &State<PgPool>,
    _auth: AuthGuard,
) -> Result<Status, Status> {
    // Soft delete by setting deleted_at timestamp
    let result = sqlx::query!(
        r#"
        UPDATE organizations 
        SET deleted_at = CURRENT_TIMESTAMP 
        WHERE id = $1 AND deleted_at IS NULL
        "#,
        id
    )
    .execute(db.inner())
    .await
    .map_err(|_| Status::InternalServerError)?;

    if result.rows_affected() == 0 {
        return Err(Status::NotFound);
    }

    Ok(Status::NoContent)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_create_organization_validation() {
        let valid_request = CreateOrganizationRequest {
            company_name: "Acme Corp".to_string(),
            contact_name: "John Doe".to_string(),
            contact_email: "john@acme.com".to_string(),
            contact_phone: Some("555-0100".to_string()),
            clearance_level: "SECRET".to_string(),
            contract_number: "CTR-2024-001".to_string(),
        };
        
        assert!(valid_request.validate().is_ok());
    }

    #[test]
    fn test_create_organization_invalid_email() {
        let invalid_request = CreateOrganizationRequest {
            company_name: "Acme Corp".to_string(),
            contact_name: "John Doe".to_string(),
            contact_email: "invalid-email".to_string(),
            contact_phone: None,
            clearance_level: "SECRET".to_string(),
            contract_number: "CTR-2024-001".to_string(),
        };
        
        assert!(invalid_request.validate().is_err());
    }
}
