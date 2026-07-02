// Information Systems HTTP handlers
use rocket::serde::json::Json;
use rocket::{delete, get, http::Status, post, put, State};
use sqlx::PgPool;
use validator::Validate;

use super::models::{CreateInfoSystemRequest, InfoSystem, UpdateInfoSystemRequest};
use crate::auth::middleware::AuthGuard;
use crate::shared::pagination::PaginationParams;
use crate::shared::rbac::role_has_permission;
use crate::shared::response::{ApiResponse, PaginatedResponse};

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
    let total: i64 = sqlx::query_scalar!("SELECT COUNT(*) FROM info_systems")
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
    auth: AuthGuard,
) -> Result<Json<InfoSystem>, Status> {
    if !role_has_permission(db.inner(), &auth.claims.role, "info_systems.write")
        .await
        .unwrap_or(false)
    {
        return Err(Status::Forbidden);
    }
    request.validate().map_err(|_| Status::BadRequest)?;

    // Parse last_audit_date if provided
    let audit_date = request
        .last_audit_date
        .as_ref()
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
    auth: AuthGuard,
) -> Result<Json<InfoSystem>, Status> {
    if !role_has_permission(db.inner(), &auth.claims.role, "info_systems.write")
        .await
        .unwrap_or(false)
    {
        return Err(Status::Forbidden);
    }
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
    let audit_date = request
        .last_audit_date
        .as_ref()
        .map(|d| chrono::NaiveDate::parse_from_str(d, "%Y-%m-%d"))
        .transpose()
        .map_err(|_| Status::BadRequest)?;

    // Use COALESCE for optional fields to update only what's provided
    let system = sqlx::query_as!(
        InfoSystem,
        r#"
        UPDATE info_systems
        SET system_name = COALESCE($1, system_name),
            description = COALESCE($2, description),
            environment = COALESCE($3, environment),
            status = COALESCE($4, status),
            ip_address = COALESCE($5, ip_address),
            domain = COALESCE($6, domain),
            managed_by = COALESCE($7, managed_by),
            last_audit_date = COALESCE($8, last_audit_date),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $9
        RETURNING id, system_name, description, environment, status,
                  ip_address, domain, managed_by, last_audit_date,
                  created_at, updated_at
        "#,
        request.system_name.as_ref(),
        request.description.as_ref(),
        request.environment.as_ref(),
        request.status.as_ref(),
        request.ip_address.as_ref(),
        request.domain.as_ref(),
        request.managed_by.as_ref(),
        audit_date,
        id
    )
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
    auth: AuthGuard,
) -> Result<Json<ApiResponse<String>>, Status> {
    if !role_has_permission(db.inner(), &auth.claims.role, "info_systems.write")
        .await
        .unwrap_or(false)
    {
        return Err(Status::Forbidden);
    }
    let rows_affected = sqlx::query!("DELETE FROM info_systems WHERE id = $1", id)
        .execute(db.inner())
        .await
        .map_err(|_| Status::InternalServerError)?
        .rows_affected();

    if rows_affected == 0 {
        return Err(Status::NotFound);
    }

    Ok(Json(ApiResponse::success("Deleted".to_string())))
}
