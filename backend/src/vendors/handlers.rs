// Vendor HTTP handlers
use rocket::{State, get, post, put, delete, http::Status};
use rocket::serde::json::Json;
use sqlx::PgPool;
use validator::Validate;

use super::models::{Vendor, CreateVendorRequest, UpdateVendorRequest};
use crate::auth::middleware::AuthGuard;
use crate::shared::response::PaginatedResponse;
use crate::shared::pagination::PaginationParams;

#[get("/api/vendors?<page>&<per_page>")]
pub async fn list_vendors(
    page: Option<i32>,
    per_page: Option<i32>,
    db: &State<PgPool>,
    _auth: AuthGuard,
) -> Result<Json<PaginatedResponse<Vendor>>, Status> {
    let pagination = PaginationParams {
        page: page.unwrap_or(1).max(1),
        per_page: per_page.unwrap_or(20).clamp(1, 100),
    };

    // Get total count (exclude soft deleted)
    let total: i64 = sqlx::query_scalar!(
        "SELECT COUNT(*) FROM vendors WHERE deleted_at IS NULL"
    )
    .fetch_one(db.inner())
    .await
    .map_err(|_| Status::InternalServerError)?
    .unwrap_or(0);

    // Get vendors with pagination
    let vendors = sqlx::query_as!(
        Vendor,
        r#"
        SELECT id, company_name, contact_name, contact_email, contact_phone,
               clearance_level, contract_number, deleted_at, created_at, updated_at
        FROM vendors
        WHERE deleted_at IS NULL
        ORDER BY company_name
        LIMIT $1 OFFSET $2
        "#,
        pagination.limit(),
        pagination.offset()
    )
    .fetch_all(db.inner())
    .await
    .map_err(|_| Status::InternalServerError)?;

    Ok(Json(PaginatedResponse {
        items: vendors,
        total,
        page: pagination.page,
        per_page: pagination.per_page,
        total_pages: ((total as f64) / (pagination.per_page as f64)).ceil() as i32,
    }))
}

#[get("/api/vendors/<id>")]
pub async fn get_vendor(
    id: i32,
    db: &State<PgPool>,
    _auth: AuthGuard,
) -> Result<Json<Vendor>, Status> {
    let vendor = sqlx::query_as!(
        Vendor,
        r#"
        SELECT id, company_name, contact_name, contact_email, contact_phone,
               clearance_level, contract_number, deleted_at, created_at, updated_at
        FROM vendors
        WHERE id = $1 AND deleted_at IS NULL
        "#,
        id
    )
    .fetch_optional(db.inner())
    .await
    .map_err(|_| Status::InternalServerError)?
    .ok_or(Status::NotFound)?;

    Ok(Json(vendor))
}

#[post("/api/vendors", data = "<vendor_request>")]
pub async fn create_vendor(
    vendor_request: Json<CreateVendorRequest>,
    db: &State<PgPool>,
    _auth: AuthGuard,
) -> Result<Json<Vendor>, Status> {
    // Validate input
    vendor_request.validate().map_err(|_| Status::BadRequest)?;

    // Insert vendor
    let vendor = sqlx::query_as!(
        Vendor,
        r#"
        INSERT INTO vendors 
        (company_name, contact_name, contact_email, contact_phone, clearance_level, contract_number)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, company_name, contact_name, contact_email, contact_phone,
                  clearance_level, contract_number, deleted_at, created_at, updated_at
        "#,
        vendor_request.company_name,
        vendor_request.contact_name,
        vendor_request.contact_email,
        vendor_request.contact_phone,
        vendor_request.clearance_level,
        vendor_request.contract_number
    )
    .fetch_one(db.inner())
    .await
    .map_err(|e| {
        eprintln!("Database error: {:?}", e);
        Status::InternalServerError
    })?;

    Ok(Json(vendor))
}

#[put("/api/vendors/<id>", data = "<vendor_request>")]
pub async fn update_vendor(
    id: i32,
    vendor_request: Json<UpdateVendorRequest>,
    db: &State<PgPool>,
    _auth: AuthGuard,
) -> Result<Json<Vendor>, Status> {
    // Validate input
    vendor_request.validate().map_err(|_| Status::BadRequest)?;

    // Check if vendor exists and is not deleted
    let exists = sqlx::query_scalar!(
        "SELECT EXISTS(SELECT 1 FROM vendors WHERE id = $1 AND deleted_at IS NULL)",
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
    let mut query = String::from("UPDATE vendors SET updated_at = CURRENT_TIMESTAMP");
    let mut param_count = 1;

    if vendor_request.company_name.is_some() {
        query.push_str(&format!(", company_name = ${}", param_count));
        param_count += 1;
    }
    if vendor_request.contact_name.is_some() {
        query.push_str(&format!(", contact_name = ${}", param_count));
        param_count += 1;
    }
    if vendor_request.contact_email.is_some() {
        query.push_str(&format!(", contact_email = ${}", param_count));
        param_count += 1;
    }
    if vendor_request.contact_phone.is_some() {
        query.push_str(&format!(", contact_phone = ${}", param_count));
        param_count += 1;
    }
    if vendor_request.clearance_level.is_some() {
        query.push_str(&format!(", clearance_level = ${}", param_count));
        param_count += 1;
    }
    if vendor_request.contract_number.is_some() {
        query.push_str(&format!(", contract_number = ${}", param_count));
        param_count += 1;
    }

    query.push_str(&format!(" WHERE id = ${} RETURNING *", param_count));

    // Execute update with dynamic parameters
    let mut query_builder = sqlx::query_as::<_, Vendor>(&query);
    
    if let Some(ref company_name) = vendor_request.company_name {
        query_builder = query_builder.bind(company_name);
    }
    if let Some(ref contact_name) = vendor_request.contact_name {
        query_builder = query_builder.bind(contact_name);
    }
    if let Some(ref contact_email) = vendor_request.contact_email {
        query_builder = query_builder.bind(contact_email);
    }
    if let Some(ref contact_phone) = vendor_request.contact_phone {
        query_builder = query_builder.bind(contact_phone);
    }
    if let Some(ref clearance_level) = vendor_request.clearance_level {
        query_builder = query_builder.bind(clearance_level);
    }
    if let Some(ref contract_number) = vendor_request.contract_number {
        query_builder = query_builder.bind(contract_number);
    }
    
    query_builder = query_builder.bind(id);

    let vendor = query_builder
        .fetch_one(db.inner())
        .await
        .map_err(|_| Status::InternalServerError)?;

    Ok(Json(vendor))
}

#[delete("/api/vendors/<id>")]
pub async fn delete_vendor(
    id: i32,
    db: &State<PgPool>,
    _auth: AuthGuard,
) -> Result<Status, Status> {
    // Soft delete by setting deleted_at timestamp
    let result = sqlx::query!(
        r#"
        UPDATE vendors 
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
    fn test_create_vendor_validation() {
        let valid_request = CreateVendorRequest {
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
    fn test_create_vendor_invalid_email() {
        let invalid_request = CreateVendorRequest {
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
