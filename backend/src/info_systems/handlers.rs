// Information Systems HTTP handlers
use rocket::{State, get, post, put, delete, http::Status};
use rocket::serde::json::Json;
use sqlx::PgPool;
use validator::Validate;

use super::models::{InfoSystem, CreateInfoSystemRequest, UpdateInfoSystemRequest};
use crate::shared::response::PaginatedResponse;
use crate::shared::pagination::PaginationParams;

#[get("/api/info-systems?<page>&<per_page>")]
pub async fn list_info_systems(
    page: Option<i32>,
    per_page: Option<i32>,
    db: &State<PgPool>,
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
) -> Result<Json<InfoSystem>, Status> {
    request.validate().map_err(|_| Status::BadRequest)?;

        // Parse last_audit_date if provided
        let audit_date = request.last_audit_date.as_ref()
            .and_then(|d| chrono::NaiveDate::parse_from_str(d, "%Y-%m-%d").ok());

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
) -> Result<Json<InfoSystem>, Status> {
    request.validate().map_err(|_| Status::BadRequest)?;

    // Build dynamic update query
    let mut updates = Vec::new();
    
    if request.system_name.is_some() {
        updates.push("system_name = $".to_string());
    }
    if request.description.is_some() {
        updates.push("description = $".to_string());
    }
    if request.environment.is_some() {
        updates.push("environment = $".to_string());
    }
    if request.status.is_some() {
        updates.push("status = $".to_string());
    }
    if request.ip_address.is_some() {
        updates.push("ip_address = $".to_string());
    }
    if request.domain.is_some() {
        updates.push("domain = $".to_string());
    }
    if request.managed_by.is_some() {
        updates.push("managed_by = $".to_string());
    }
    if request.last_audit_date.is_some() {
        updates.push("last_audit_date = $".to_string());
    }

    if updates.is_empty() {
        return get_info_system(id, db).await;
    }

    updates.push("updated_at = CURRENT_TIMESTAMP".to_string());

    let update_sql = format!(
        "UPDATE info_systems SET {} WHERE id = $1 RETURNING id, system_name, description, environment, status, ip_address, domain, managed_by, last_audit_date, created_at, updated_at",
        updates.join(", ")
    );

    let system = sqlx::query_as::<_, InfoSystem>(&update_sql)
        .fetch_one(db.inner())
        .await
        .map_err(|_| Status::InternalServerError)?;

    Ok(Json(system))
}

#[delete("/api/info-systems/<id>")]
pub async fn delete_info_system(
    id: i32,
    db: &State<PgPool>,
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

