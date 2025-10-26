// Personnel HTTP handlers
use rocket::{State, get, http::Status};
use rocket::serde::json::Json;
use sqlx::PgPool;

use super::models::Personnel;
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
}
