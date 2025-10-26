// Audit log HTTP handlers
use rocket::{State, get, http::Status};
use rocket::serde::json::Json;
use sqlx::PgPool;

use super::models::{AuditLog, CreateAuditLogRequest};
use crate::auth::middleware::AuthGuard;
use crate::shared::response::PaginatedResponse;
use crate::shared::pagination::PaginationParams;

/// List audit logs with optional filtering and pagination
#[get("/api/audit?<page>&<per_page>&<username>&<action>&<resource_type>")]
pub async fn list_audit_logs(
    page: Option<i32>,
    per_page: Option<i32>,
    username: Option<String>,
    action: Option<String>,
    resource_type: Option<String>,
    db: &State<PgPool>,
    _auth: AuthGuard, // Require authentication to view audit logs
) -> Result<Json<PaginatedResponse<AuditLog>>, Status> {
    let pagination = PaginationParams {
        page: page.unwrap_or(1).max(1),
        per_page: per_page.unwrap_or(20).clamp(1, 100),
    };

    // Build dynamic query based on filters
    let mut query = String::from("SELECT COUNT(*) FROM audit_log WHERE 1=1");
    let mut param_count = 1;

    if username.is_some() {
        query.push_str(&format!(" AND username = ${}", param_count));
        param_count += 1;
    }
    if action.is_some() {
        query.push_str(&format!(" AND action = ${}", param_count));
        param_count += 1;
    }
    if resource_type.is_some() {
        query.push_str(&format!(" AND resource_type = ${}", param_count));
        param_count += 1;
    }

    // Get total count with filters
    let mut count_query = sqlx::query_scalar::<_, i64>(&query);
    
    if let Some(ref u) = username {
        count_query = count_query.bind(u);
    }
    if let Some(ref a) = action {
        count_query = count_query.bind(a);
    }
    if let Some(ref rt) = resource_type {
        count_query = count_query.bind(rt);
    }

    let total: i64 = count_query
        .fetch_one(db.inner())
        .await
        .map_err(|_| Status::InternalServerError)?;

    // Build select query  
    let mut select_query = String::from(
        "SELECT id, user_id, username, action, resource_type, resource_id, details, ip_address, user_agent, created_at FROM audit_log WHERE 1=1"
    );
    
    let mut select_param_count = 1;
    
    if username.is_some() {
        select_query.push_str(&format!(" AND username = ${}", select_param_count));
        select_param_count += 1;
    }
    if action.is_some() {
        select_query.push_str(&format!(" AND action = ${}", select_param_count));
        select_param_count += 1;
    }
    if resource_type.is_some() {
        select_query.push_str(&format!(" AND resource_type = ${}", select_param_count));
        select_param_count += 1;
    }
    
    select_query.push_str(&format!(" ORDER BY created_at DESC LIMIT ${} OFFSET ${}", 
        select_param_count, select_param_count + 1));

    // Execute select with filters and pagination
    let mut logs_query = sqlx::query_as::<_, AuditLog>(&select_query);
    
    if let Some(ref u) = username {
        logs_query = logs_query.bind(u);
    }
    if let Some(ref a) = action {
        logs_query = logs_query.bind(a);
    }
    if let Some(ref rt) = resource_type {
        logs_query = logs_query.bind(rt);
    }
    
    logs_query = logs_query.bind(pagination.limit());
    logs_query = logs_query.bind(pagination.offset());

    let logs = logs_query
        .fetch_all(db.inner())
        .await
        .map_err(|_| Status::InternalServerError)?;

    Ok(Json(PaginatedResponse {
        items: logs,
        total,
        page: pagination.page,
        per_page: pagination.per_page,
        total_pages: ((total as f64) / (pagination.per_page as f64)).ceil() as i32,
    }))
}

/// Create an audit log entry (used by middleware and handlers)
pub async fn create_audit_log(
    log_request: &CreateAuditLogRequest,
    db: &PgPool,
) -> Result<AuditLog, sqlx::Error> {
    sqlx::query_as!(
        AuditLog,
        r#"
        INSERT INTO audit_log 
        (user_id, username, action, resource_type, resource_id, details, ip_address, user_agent)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, user_id, username, action, resource_type, resource_id, details, ip_address, user_agent, created_at
        "#,
        log_request.user_id,
        log_request.username,
        log_request.action,
        log_request.resource_type,
        log_request.resource_id,
        log_request.details,
        log_request.ip_address,
        log_request.user_agent
    )
    .fetch_one(db)
    .await
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pagination_params() {
        let pagination = PaginationParams {
            page: 1,
            per_page: 20,
        };
        assert_eq!(pagination.offset(), 0);
        assert_eq!(pagination.limit(), 20);

        let pagination2 = PaginationParams {
            page: 3,
            per_page: 10,
        };
        assert_eq!(pagination2.offset(), 20);
        assert_eq!(pagination2.limit(), 10);
    }
}
