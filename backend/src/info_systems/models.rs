// Information Systems data models
use serde::{Deserialize, Serialize};
use validator::Validate;

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct InfoSystem {
    pub id: i32,
    pub system_name: String,
    pub description: Option<String>,
    pub environment: String,
    pub status: String,
    pub ip_address: Option<String>,
    pub domain: Option<String>,
    pub managed_by: Option<String>,
    pub last_audit_date: Option<chrono::NaiveDate>,
    pub created_at: chrono::NaiveDateTime,
    pub updated_at: chrono::NaiveDateTime,
}

#[derive(Debug, Deserialize, Validate)]
pub struct CreateInfoSystemRequest {
    #[validate(length(min = 1, max = 100))]
    pub system_name: String,
    
    pub description: Option<String>,
    
    #[validate(custom = "validate_environment")]
    pub environment: String,
    
    #[validate(custom = "validate_status")]
    pub status: String,
    
    pub ip_address: Option<String>,
    
    pub domain: Option<String>,
    
    pub managed_by: Option<String>,
    
    pub last_audit_date: Option<String>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct UpdateInfoSystemRequest {
    pub system_name: Option<String>,
    pub description: Option<String>,
    pub environment: Option<String>,
    pub status: Option<String>,
    pub ip_address: Option<String>,
    pub domain: Option<String>,
    pub managed_by: Option<String>,
    pub last_audit_date: Option<String>,
}

fn validate_environment(env: &str) -> Result<(), validator::ValidationError> {
    match env {
        "DEV" | "TEST" | "PROD" => Ok(()),
        _ => Err(validator::ValidationError::new("invalid_environment")),
    }
}

fn validate_status(status: &str) -> Result<(), validator::ValidationError> {
    match status {
        "ACTIVE" | "INACTIVE" | "MAINTENANCE" => Ok(()),
        _ => Err(validator::ValidationError::new("invalid_status")),
    }
}

