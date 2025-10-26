// Personnel data models
use serde::{Deserialize, Serialize};
use validator::Validate;

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Personnel {
    pub id: i32,
    pub first_name: String,
    pub last_name: String,
    pub email: String,
    pub phone: Option<String>,
    pub clearance_level: String,
    pub department: String,
    pub position: String,
    pub created_at: chrono::NaiveDateTime,
    pub updated_at: chrono::NaiveDateTime,
}

#[derive(Debug, Serialize, Deserialize, Validate)]
pub struct CreatePersonnelRequest {
    #[validate(length(min = 1, max = 100))]
    pub first_name: String,
    
    #[validate(length(min = 1, max = 100))]
    pub last_name: String,
    
    #[validate(email)]
    pub email: String,
    
    #[validate(length(max = 20))]
    pub phone: Option<String>,
    
    #[validate(length(min = 1, max = 50))]
    pub clearance_level: String,
    
    #[validate(length(min = 1, max = 100))]
    pub department: String,
    
    #[validate(length(min = 1, max = 100))]
    pub position: String,
}

#[derive(Debug, Serialize, Deserialize, Validate)]
pub struct UpdatePersonnelRequest {
    #[validate(length(min = 1, max = 100))]
    pub first_name: Option<String>,
    
    #[validate(length(min = 1, max = 100))]
    pub last_name: Option<String>,
    
    #[validate(email)]
    pub email: Option<String>,
    
    #[validate(length(max = 20))]
    pub phone: Option<String>,
    
    #[validate(length(min = 1, max = 50))]
    pub clearance_level: Option<String>,
    
    #[validate(length(min = 1, max = 100))]
    pub department: Option<String>,
    
    #[validate(length(min = 1, max = 100))]
    pub position: Option<String>,
}

