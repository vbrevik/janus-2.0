// Audit logging data models
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct AuditLog {
    pub id: i32,
    pub person_id: Option<i32>, // Changed from user_id
    pub username: String,
    pub action: String,
    pub resource_type: String,
    pub resource_id: Option<i32>,
    pub details: Option<String>,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
    pub created_at: chrono::NaiveDateTime,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateAuditLogRequest {
    pub person_id: Option<i32>, // Changed from user_id
    pub username: String,
    pub action: String,
    pub resource_type: String,
    pub resource_id: Option<i32>,
    pub details: Option<String>,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AuditLogQuery {
    pub person_id: Option<i32>, // Changed from user_id
    pub username: Option<String>,
    pub action: Option<String>,
    pub resource_type: Option<String>,
    pub resource_id: Option<i32>,
    pub start_date: Option<chrono::NaiveDateTime>,
    pub end_date: Option<chrono::NaiveDateTime>,
}
