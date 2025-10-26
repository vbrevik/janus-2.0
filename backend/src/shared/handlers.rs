// Shared HTTP handlers (stats, health, etc.)
use rocket::{State, get, http::Status};
use rocket::serde::json::Json;
use serde::Serialize;
use sqlx::PgPool;

use crate::shared::response::ApiResponse;
use crate::auth::middleware::AuthGuard;

#[derive(Serialize)]
pub struct DashboardStats {
    pub total_personnel: i64,
    pub total_vendors: i64,
    pub total_access_grants: i64,
    pub active_access_grants: i64,
    pub recent_audit_logs: i64, // Last 24 hours
}

#[get("/api/stats")]
pub async fn get_stats(
    db: &State<PgPool>,
    _auth: AuthGuard,
) -> Result<Json<ApiResponse<DashboardStats>>, Status> {
    // Get total personnel
    let total_personnel: i64 = sqlx::query_scalar!(
        "SELECT COUNT(*) FROM personnel WHERE deleted_at IS NULL"
    )
    .fetch_one(db.inner())
    .await
    .map_err(|_| Status::InternalServerError)?
    .unwrap_or(0);

    // Get total vendors
    let total_vendors: i64 = sqlx::query_scalar!(
        "SELECT COUNT(*) FROM vendors WHERE deleted_at IS NULL"
    )
    .fetch_one(db.inner())
    .await
    .map_err(|_| Status::InternalServerError)?
    .unwrap_or(0);

    // Get total access grants (computer access only for now)
    let total_access_grants: i64 = sqlx::query_scalar!(
        "SELECT COUNT(*) FROM computer_access"
    )
    .fetch_one(db.inner())
    .await
    .map_err(|_| Status::InternalServerError)?
    .unwrap_or(0);

    // Get active access grants
    let active_access_grants: i64 = sqlx::query_scalar!(
        "SELECT COUNT(*) FROM computer_access WHERE status = 'ACTIVE'"
    )
    .fetch_one(db.inner())
    .await
    .map_err(|_| Status::InternalServerError)?
    .unwrap_or(0);

    // Get recent audit logs (last 24 hours)
    let recent_audit_logs: i64 = sqlx::query_scalar!(
        "SELECT COUNT(*) FROM audit_log WHERE created_at > NOW() - INTERVAL '24 hours'"
    )
    .fetch_one(db.inner())
    .await
    .map_err(|_| Status::InternalServerError)?
    .unwrap_or(0);

    let stats = DashboardStats {
        total_personnel,
        total_vendors,
        total_access_grants,
        active_access_grants,
        recent_audit_logs,
    };

    Ok(Json(ApiResponse::success(stats)))
}

