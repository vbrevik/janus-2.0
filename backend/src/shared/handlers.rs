// Shared HTTP handlers (stats, health, etc.)
use rocket::serde::json::Json;
use rocket::{get, http::Status, State};
use serde::Serialize;
use sqlx::PgPool;

use crate::auth::middleware::AuthGuard;
use crate::shared::response::ApiResponse;

#[derive(Serialize)]
pub struct DashboardStats {
    pub total_persons: i64,
    pub total_organizations: i64,
    pub total_access_grants: i64,
    pub active_access_grants: i64,
    pub recent_audit_logs: i64, // Last 24 hours
}

#[get("/api/stats")]
pub async fn get_stats(
    db: &State<PgPool>,
    _auth: AuthGuard,
) -> Result<Json<ApiResponse<DashboardStats>>, Status> {
    // Get total persons
    let total_persons: i64 =
        sqlx::query_scalar!("SELECT COUNT(*) FROM person WHERE deleted_at IS NULL")
            .fetch_one(db.inner())
            .await
            .map_err(|_| Status::InternalServerError)?
            .unwrap_or(0);

    // Get total organizations
    let total_organizations: i64 =
        sqlx::query_scalar!("SELECT COUNT(*) FROM organizations WHERE deleted_at IS NULL")
            .fetch_one(db.inner())
            .await
            .map_err(|_| Status::InternalServerError)?
            .unwrap_or(0);

    // Get total access grants (all access types)
    let total_access_grants: i64 = sqlx::query_scalar!(
        "SELECT COUNT(*) FROM (
            SELECT id FROM computer_access 
            UNION ALL
            SELECT id FROM data_access
            UNION ALL
            SELECT id FROM physical_access
        ) as all_access"
    )
    .fetch_one(db.inner())
    .await
    .map_err(|_| Status::InternalServerError)?
    .unwrap_or(0);

    // Get active access grants
    let active_access_grants: i64 = sqlx::query_scalar!(
        "SELECT COUNT(*) FROM (
            SELECT id FROM computer_access WHERE status = 'ACTIVE'
            UNION ALL
            SELECT id FROM data_access WHERE status = 'ACTIVE'
            UNION ALL
            SELECT id FROM physical_access WHERE status = 'ACTIVE'
        ) as all_active_access"
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
        total_persons,
        total_organizations,
        total_access_grants,
        active_access_grants,
        recent_audit_logs,
    };

    Ok(Json(ApiResponse::success(stats)))
}
