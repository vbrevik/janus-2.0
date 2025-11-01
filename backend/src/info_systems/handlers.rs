// Information Systems HTTP handlers
use rocket::{State, get, post, put, delete, http::Status};
use rocket::serde::json::Json;
use sqlx::PgPool;
use validator::Validate;

use super::models::{InfoSystem, CreateInfoSystemRequest, UpdateInfoSystemRequest};
use crate::shared::response::PaginatedResponse;
use crate::shared::pagination::PaginationParams;
use crate::auth::middleware::AuthGuard;

#[get("/api/info-systems?<page>&<per_page>")]
pub async fn list_info_systems(
    page: Option<i32>,
    per_page: Option<i32>,
    db: &State<PgPool>,
    _auth: AuthGuard,
) -> Result<Json<PaginatedResponse<InfoSystem>>, Status> {
    let pagination = PaginationParams {
        page: page.unwrap_or(1).max(1),
        per_page: per_page.unwrap_or(20).clamp(1, 100),
    };

    // Get total count
    let total: i64 = sqlx::query_scalar!(
        "SELECT COUNT(*) FROM info_systems"
    )
    .fetch_one(db.inner())
    .await
    .map_err(|_| Status::InternalServerError)?
    .unwrap_or(0);

    // Get paginated info systems
    let systems = sqlx::query_as!(
        InfoSystem,
        r#"
        SELECT id, system_name, description, environment, status,
               ip_address, domain, managed_by, last_audit_date,
               created_at, updated_at
        FROM info_systems
        ORDER BY system_name
        LIMIT $1 OFFSET $2
        "#,
        pagination.limit(),
        pagination.offset()
    )
    .fetch_all(db.inner())
    .await
    .map_err(|_| Status::InternalServerError)?;

    let total_pages = ((total as f64) / (pagination.per_page as f64)).ceil() as i32;

    Ok(Json(PaginatedResponse {
        items: systems,
        total,
        page: pagination.page,
        per_page: pagination.per_page,
        total_pages,
    }))
}

#[get("/api/info-systems/<id>")]
pub async fn get_info_system(
    id: i32,
    db: &State<PgPool>,
    _auth: AuthGuard,
) -> Result<Json<InfoSystem>, Status> {
    let system = sqlx::query_as!(
        InfoSystem,
        r#"
        SELECT id, system_name, description, environment, status,
               ip_address, domain, managed_by, last_audit_date,
               created_at, updated_at
        FROM info_systems
        WHERE id = $1
        "#,
        id
    )
    .fetch_optional(db.inner())
    .await
    .map_err(|_| Status::InternalServerError)?
    .ok_or(Status::NotFound)?;

    Ok(Json(system))
}

#[post("/api/info-systems", data = "<request>")]
pub async fn create_info_system(
    request: Json<CreateInfoSystemRequest>,
    db: &State<PgPool>,
    _auth: AuthGuard,
) -> Result<Json<InfoSystem>, Status> {
    request.validate().map_err(|_| Status::BadRequest)?;

        // Parse last_audit_date if provided
        let audit_date = request.last_audit_date.as_ref()
            .map(|d| chrono::NaiveDate::parse_from_str(d, "%Y-%m-%d"))
            .transpose()
            .map_err(|_| Status::BadRequest)?;

        let system = sqlx::query_as!(
        InfoSystem,
        r#"
        INSERT INTO info_systems (system_name, description, environment, status, 
                                  ip_address, domain, managed_by, last_audit_date)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, system_name, description, environment, status,
                  ip_address, domain, managed_by, last_audit_date,
                  created_at, updated_at
        "#,
        request.system_name,
        request.description,
        request.environment,
        request.status,
        request.ip_address,
        request.domain,
        request.managed_by,
        audit_date
    )
    .fetch_one(db.inner())
    .await
    .map_err(|_| Status::InternalServerError)?;

    Ok(Json(system))
}

#[put("/api/info-systems/<id>", data = "<request>")]
pub async fn update_info_system(
    id: i32,
    request: Json<UpdateInfoSystemRequest>,
    db: &State<PgPool>,
    _auth: AuthGuard,
) -> Result<Json<InfoSystem>, Status> {
    request.validate().map_err(|_| Status::BadRequest)?;

    // Check if system exists
    let exists = sqlx::query_scalar!(
        "SELECT EXISTS(SELECT 1 FROM info_systems WHERE id = $1)",
        id
    )
    .fetch_one(db.inner())
    .await
    .map_err(|_| Status::InternalServerError)?
    .unwrap_or(false);

    if !exists {
        return Err(Status::NotFound);
    }

    // Parse last_audit_date if provided
    let audit_date = request.last_audit_date.as_ref()
        .map(|d| chrono::NaiveDate::parse_from_str(d, "%Y-%m-%d"))
        .transpose()
        .map_err(|_| Status::BadRequest)?;

    // Build dynamic update query with parameterized placeholders
    let mut query = String::from("UPDATE info_systems SET updated_at = CURRENT_TIMESTAMP");
    let mut param_count = 1;

    if request.system_name.is_some() {
        query.push_str(&format!(", system_name = ${}", param_count));
        param_count += 1;
    }
    if request.description.is_some() {
        query.push_str(&format!(", description = ${}", param_count));
        param_count += 1;
    }
    if request.environment.is_some() {
        query.push_str(&format!(", environment = ${}", param_count));
        param_count += 1;
    }
    if request.status.is_some() {
        query.push_str(&format!(", status = ${}", param_count));
        param_count += 1;
    }
    if request.ip_address.is_some() {
        query.push_str(&format!(", ip_address = ${}", param_count));
        param_count += 1;
    }
    if request.domain.is_some() {
        query.push_str(&format!(", domain = ${}", param_count));
        param_count += 1;
    }
    if request.managed_by.is_some() {
        query.push_str(&format!(", managed_by = ${}", param_count));
        param_count += 1;
    }
    if audit_date.is_some() {
        query.push_str(&format!(", last_audit_date = ${}", param_count));
        param_count += 1;
    }

    query.push_str(&format!(" WHERE id = ${} RETURNING id, system_name, description, environment, status, ip_address, domain, managed_by, last_audit_date, created_at, updated_at", param_count));

    // Build query with proper parameter binding
    let mut query_builder = sqlx::query_as::<_, InfoSystem>(&query);

    if let Some(ref system_name) = request.system_name {
        query_builder = query_builder.bind(system_name);
    }
    if let Some(ref description) = request.description {
        query_builder = query_builder.bind(description);
    }
    if let Some(ref environment) = request.environment {
        query_builder = query_builder.bind(environment);
    }
    if let Some(ref status) = request.status {
        query_builder = query_builder.bind(status);
    }
    if let Some(ref ip_address) = request.ip_address {
        query_builder = query_builder.bind(ip_address);
    }
    if let Some(ref domain) = request.domain {
        query_builder = query_builder.bind(domain);
    }
    if let Some(ref managed_by) = request.managed_by {
        query_builder = query_builder.bind(managed_by);
    }
    if let Some(ref audit_date) = audit_date {
        query_builder = query_builder.bind(audit_date);
    }

    // Bind the id parameter last
    query_builder = query_builder.bind(id);

    let system = query_builder
        .fetch_one(db.inner())
        .await
        .map_err(|e| {
            eprintln!("Database error: {:?}", e);
            Status::InternalServerError
        })?;

    Ok(Json(system))
}

#[delete("/api/info-systems/<id>")]
pub async fn delete_info_system(
    id: i32,
    db: &State<PgPool>,
    _auth: AuthGuard,
) -> Result<Status, Status> {
    let rows_affected = sqlx::query!(
        "DELETE FROM info_systems WHERE id = $1",
        id
    )
    .execute(db.inner())
    .await
    .map_err(|_| Status::InternalServerError)?
    .rows_affected();

    if rows_affected == 0 {
        return Err(Status::NotFound);
    }

    Ok(Status::NoContent)
}

