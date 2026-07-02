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
    #[validate(length(min = 1, max = 100))]
    pub system_name: Option<String>,

    pub description: Option<String>,

    #[validate(custom = "validate_environment")]
    pub environment: Option<String>,

    #[validate(custom = "validate_status")]
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_environment_valid() {
        assert!(validate_environment("DEV").is_ok());
        assert!(validate_environment("TEST").is_ok());
        assert!(validate_environment("PROD").is_ok());
    }

    #[test]
    fn test_validate_environment_invalid() {
        assert!(validate_environment("").is_err());
        assert!(validate_environment("INVALID").is_err());
        assert!(validate_environment("dev").is_err()); // Case sensitive
    }

    #[test]
    fn test_validate_status_valid() {
        assert!(validate_status("ACTIVE").is_ok());
        assert!(validate_status("INACTIVE").is_ok());
        assert!(validate_status("MAINTENANCE").is_ok());
    }

    #[test]
    fn test_validate_status_invalid() {
        assert!(validate_status("").is_err());
        assert!(validate_status("INVALID").is_err());
        assert!(validate_status("active").is_err()); // Case sensitive
    }

    #[test]
    fn test_create_info_system_request_validation() {
        let valid_request = CreateInfoSystemRequest {
            system_name: "Test System".to_string(),
            description: Some("Test description".to_string()),
            environment: "PROD".to_string(),
            status: "ACTIVE".to_string(),
            ip_address: Some("192.168.1.1".to_string()),
            domain: Some("test.example.com".to_string()),
            managed_by: Some("IT Operations".to_string()),
            last_audit_date: Some("2024-01-15".to_string()),
        };

        assert!(valid_request.validate().is_ok());
    }

    #[test]
    fn test_create_info_system_request_invalid_name_too_short() {
        let invalid_request = CreateInfoSystemRequest {
            system_name: "".to_string(), // Empty name
            description: None,
            environment: "PROD".to_string(),
            status: "ACTIVE".to_string(),
            ip_address: None,
            domain: None,
            managed_by: None,
            last_audit_date: None,
        };

        assert!(invalid_request.validate().is_err());
    }

    #[test]
    fn test_create_info_system_request_invalid_environment() {
        let invalid_request = CreateInfoSystemRequest {
            system_name: "Test System".to_string(),
            description: None,
            environment: "INVALID".to_string(), // Invalid environment
            status: "ACTIVE".to_string(),
            ip_address: None,
            domain: None,
            managed_by: None,
            last_audit_date: None,
        };

        assert!(invalid_request.validate().is_err());
    }

    #[test]
    fn test_create_info_system_request_invalid_status() {
        let invalid_request = CreateInfoSystemRequest {
            system_name: "Test System".to_string(),
            description: None,
            environment: "PROD".to_string(),
            status: "INVALID".to_string(), // Invalid status
            ip_address: None,
            domain: None,
            managed_by: None,
            last_audit_date: None,
        };

        assert!(invalid_request.validate().is_err());
    }

    #[test]
    fn test_update_info_system_request_validation() {
        let valid_request = UpdateInfoSystemRequest {
            system_name: Some("Updated System".to_string()),
            description: None,
            environment: None,
            status: None,
            ip_address: None,
            domain: None,
            managed_by: None,
            last_audit_date: None,
        };

        assert!(valid_request.validate().is_ok());
    }

    #[test]
    fn test_update_info_system_request_partial_update() {
        // Partial update with only status
        let partial_request = UpdateInfoSystemRequest {
            system_name: None,
            description: None,
            environment: None,
            status: Some("MAINTENANCE".to_string()),
            ip_address: None,
            domain: None,
            managed_by: None,
            last_audit_date: None,
        };

        assert!(partial_request.validate().is_ok());
    }

    #[test]
    fn test_update_info_system_request_invalid_status() {
        let invalid_request = UpdateInfoSystemRequest {
            system_name: None,
            description: None,
            environment: None,
            status: Some("INVALID".to_string()), // Invalid status
            ip_address: None,
            domain: None,
            managed_by: None,
            last_audit_date: None,
        };

        assert!(invalid_request.validate().is_err());
    }

    #[test]
    fn test_update_info_system_request_invalid_environment() {
        let invalid_request = UpdateInfoSystemRequest {
            system_name: None,
            description: None,
            environment: Some("INVALID".to_string()), // Invalid environment
            status: None,
            ip_address: None,
            domain: None,
            managed_by: None,
            last_audit_date: None,
        };

        assert!(invalid_request.validate().is_err());
    }
}
