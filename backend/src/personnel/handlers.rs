// Personnel HTTP handlers
use rocket::{State, get, post, put, delete, http::Status};
use rocket::serde::json::Json;
use sqlx::PgPool;
use validator::Validate;

use super::models::{Personnel, CreatePersonnelRequest, UpdatePersonnelRequest};
use crate::auth::middleware::AuthGuard;
use crate::shared::response::PaginatedResponse;
use crate::shared::pagination::PaginationParams;

#[get("/api/personnel?<page>&<per_page>")]
pub async fn list_personnel(
    page: Option<i32>,
    per_page: Option<i32>,
    db: &State<PgPool>,
    _auth: AuthGuard,
) -> Result<Json<PaginatedResponse<Personnel>>, Status> {
    // Create pagination params with defaults
    let pagination = PaginationParams {
        page: page.unwrap_or(1),
        per_page: per_page.unwrap_or(20),
    };

    // Validate pagination
    pagination.validate().map_err(|_| Status::BadRequest)?;

    // Get total count (excluding soft-deleted)
    let total: i64 = sqlx::query_scalar!(
        "SELECT COUNT(*) FROM personnel WHERE deleted_at IS NULL"
    )
    .fetch_one(db.inner())
    .await
    .map_err(|_| Status::InternalServerError)?
    .unwrap_or(0);

    // Get paginated personnel
    let personnel = sqlx::query_as!(
        Personnel,
        r#"
        SELECT id, first_name, last_name, email, phone, 
               clearance_level, department, position,
               deleted_at, created_at, updated_at
        FROM personnel 
        WHERE deleted_at IS NULL
        ORDER BY last_name, first_name
        LIMIT $1 OFFSET $2
        "#,
        pagination.limit(),
        pagination.offset()
    )
    .fetch_all(db.inner())
    .await
    .map_err(|_| Status::InternalServerError)?;

    // Calculate total pages
    let total_pages = ((total as f64) / (pagination.per_page as f64)).ceil() as i32;

    Ok(Json(PaginatedResponse {
        items: personnel,
        total,
        page: pagination.page,
        per_page: pagination.per_page,
        total_pages,
    }))
}

#[get("/api/personnel/<id>")]
pub async fn get_personnel(
    id: i32,
    db: &State<PgPool>,
    _auth: AuthGuard,
) -> Result<Json<Personnel>, Status> {
    let personnel = sqlx::query_as!(
        Personnel,
        r#"
        SELECT id, first_name, last_name, email, phone,
               clearance_level, department, position,
               deleted_at, created_at, updated_at
        FROM personnel 
        WHERE id = $1 AND deleted_at IS NULL
        "#,
        id
    )
    .fetch_optional(db.inner())
    .await
    .map_err(|_| Status::InternalServerError)?
    .ok_or(Status::NotFound)?;

    Ok(Json(personnel))
}

#[post("/api/personnel", data = "<personnel_request>")]
pub async fn create_personnel(
    personnel_request: Json<CreatePersonnelRequest>,
    db: &State<PgPool>,
    _auth: AuthGuard,
) -> Result<Json<Personnel>, Status> {
    // Validate input
    personnel_request.validate().map_err(|_| Status::BadRequest)?;

    // Insert personnel
    let personnel = sqlx::query_as!(
        Personnel,
        r#"
        INSERT INTO personnel 
        (first_name, last_name, email, phone, clearance_level, department, position)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, first_name, last_name, email, phone,
                  clearance_level, department, position,
                  deleted_at, created_at, updated_at
        "#,
        personnel_request.first_name,
        personnel_request.last_name,
        personnel_request.email,
        personnel_request.phone,
        personnel_request.clearance_level,
        personnel_request.department,
        personnel_request.position
    )
    .fetch_one(db.inner())
    .await
    .map_err(|e| {
        eprintln!("Database error: {:?}", e);
        Status::InternalServerError
    })?;

    Ok(Json(personnel))
}

#[put("/api/personnel/<id>", data = "<personnel_request>")]
pub async fn update_personnel(
    id: i32,
    personnel_request: Json<UpdatePersonnelRequest>,
    db: &State<PgPool>,
    _auth: AuthGuard,
) -> Result<Json<Personnel>, Status> {
    // Validate input
    personnel_request.validate().map_err(|_| Status::BadRequest)?;

    // Check if personnel exists and is not deleted
    let exists = sqlx::query_scalar!(
        "SELECT EXISTS(SELECT 1 FROM personnel WHERE id = $1 AND deleted_at IS NULL)",
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
    let mut query = String::from("UPDATE personnel SET updated_at = CURRENT_TIMESTAMP");
    let mut param_count = 1;

    if personnel_request.first_name.is_some() {
        query.push_str(&format!(", first_name = ${}", param_count));
        param_count += 1;
    }
    if personnel_request.last_name.is_some() {
        query.push_str(&format!(", last_name = ${}", param_count));
        param_count += 1;
    }
    if personnel_request.email.is_some() {
        query.push_str(&format!(", email = ${}", param_count));
        param_count += 1;
    }
    if personnel_request.phone.is_some() {
        query.push_str(&format!(", phone = ${}", param_count));
        param_count += 1;
    }
    if personnel_request.clearance_level.is_some() {
        query.push_str(&format!(", clearance_level = ${}", param_count));
        param_count += 1;
    }
    if personnel_request.department.is_some() {
        query.push_str(&format!(", department = ${}", param_count));
        param_count += 1;
    }
    if personnel_request.position.is_some() {
        query.push_str(&format!(", position = ${}", param_count));
        param_count += 1;
    }

    query.push_str(&format!(" WHERE id = ${} RETURNING *", param_count));

    // Execute update with dynamic parameters
    let mut query_builder = sqlx::query_as::<_, Personnel>(&query);
    
    if let Some(ref first_name) = personnel_request.first_name {
        query_builder = query_builder.bind(first_name);
    }
    if let Some(ref last_name) = personnel_request.last_name {
        query_builder = query_builder.bind(last_name);
    }
    if let Some(ref email) = personnel_request.email {
        query_builder = query_builder.bind(email);
    }
    if let Some(ref phone) = personnel_request.phone {
        query_builder = query_builder.bind(phone);
    }
    if let Some(ref clearance_level) = personnel_request.clearance_level {
        query_builder = query_builder.bind(clearance_level);
    }
    if let Some(ref department) = personnel_request.department {
        query_builder = query_builder.bind(department);
    }
    if let Some(ref position) = personnel_request.position {
        query_builder = query_builder.bind(position);
    }
    
    query_builder = query_builder.bind(id);

    let personnel = query_builder
        .fetch_one(db.inner())
        .await
        .map_err(|_| Status::InternalServerError)?;

    Ok(Json(personnel))
}

#[delete("/api/personnel/<id>")]
pub async fn delete_personnel(
    id: i32,
    db: &State<PgPool>,
    _auth: AuthGuard,
) -> Result<Status, Status> {
    // Soft delete by setting deleted_at timestamp
    let result = sqlx::query!(
        r#"
        UPDATE personnel 
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
    fn test_pagination_params() {
        let params = PaginationParams {
            page: 1,
            per_page: 20,
        };
        assert_eq!(params.offset(), 0);
        assert_eq!(params.limit(), 20);

        let params2 = PaginationParams {
            page: 3,
            per_page: 10,
        };
        assert_eq!(params2.offset(), 20);
        assert_eq!(params2.limit(), 10);
    }

    #[test]
    fn test_create_personnel_validation() {
        let valid_request = CreatePersonnelRequest {
            first_name: "John".to_string(),
            last_name: "Doe".to_string(),
            email: "john.doe@example.com".to_string(),
            phone: Some("555-0101".to_string()),
            clearance_level: "SECRET".to_string(),
            department: "Engineering".to_string(),
            position: "Engineer".to_string(),
        };
        
        assert!(valid_request.validate().is_ok());
    }

    #[test]
    fn test_create_personnel_invalid_email() {
        let invalid_request = CreatePersonnelRequest {
            first_name: "John".to_string(),
            last_name: "Doe".to_string(),
            email: "invalid-email".to_string(),
            phone: None,
            clearance_level: "SECRET".to_string(),
            department: "Engineering".to_string(),
            position: "Engineer".to_string(),
        };
        
        assert!(invalid_request.validate().is_err());
    }
}
