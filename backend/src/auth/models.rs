// Authentication data models
use serde::{Deserialize, Serialize};
use validator::Validate;

#[derive(Debug, Serialize, Deserialize, Validate)]
pub struct LoginRequest {
    #[validate(length(min = 3, max = 50))]
    pub username: String,
    
    #[validate(length(min = 8))]
    pub password: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LoginResponse {
    pub token: String,
    pub person_id: String, // Changed from user_id to person_id
    pub role: String,
}

// User struct removed - now using Person from person module
// Users are now persons with username/password/role

// Struct for querying person with auth fields (username, password_hash, role)
// Used for login operations
#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct PersonAuth {
    pub id: i32,
    pub username: Option<String>,
    pub password_hash: Option<String>,
    pub role: Option<String>,
    pub created_at: chrono::NaiveDateTime,
    pub updated_at: chrono::NaiveDateTime,
}

#[derive(Debug, Serialize)]
pub struct ProfileResponse {
    pub id: i32,
    pub username: Option<String>,
    pub role: Option<String>,
    pub first_name: Option<String>,
    pub last_name: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub clearance_level: Option<String>,
    pub department: Option<String>,
    pub position: Option<String>,
    pub created_at: chrono::NaiveDateTime,
    pub updated_at: chrono::NaiveDateTime,
}

#[derive(Debug, Deserialize, Validate)]
pub struct ChangePasswordRequest {
    #[validate(length(min = 8))]
    pub old_password: String,
    
    #[validate(length(min = 8))]
    pub new_password: String,
}

