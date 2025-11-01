// Person data models - unified model replacing both Personnel and User
use serde::{Deserialize, Serialize};
use validator::Validate;

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Person {
    pub id: i32,
    
    // Identity fields (optional - person may not have a name)
    pub first_name: Option<String>,
    pub last_name: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    
    // User-specific fields (optional - only if person is a user)
    pub username: Option<String>,
    pub password_hash: Option<String>,
    pub role: Option<String>, // admin, manager, operator, viewer
    
    // Personnel-specific fields (optional - only if person has clearance info)
    pub clearance_level: Option<String>, // UNCLASSIFIED, CONFIDENTIAL, SECRET, TOP_SECRET
    pub department: Option<String>,
    pub position: Option<String>,
    
    // Common fields
    pub deleted_at: Option<chrono::NaiveDateTime>,
    pub created_at: chrono::NaiveDateTime,
    pub updated_at: chrono::NaiveDateTime,
}

#[derive(Debug, Serialize, Deserialize, Validate)]
pub struct CreatePersonRequest {
    // Identity fields
    #[validate(length(max = 100))]
    pub first_name: Option<String>,
    
    #[validate(length(max = 100))]
    pub last_name: Option<String>,
    
    #[validate(email)]
    pub email: Option<String>,
    
    #[validate(length(max = 20))]
    pub phone: Option<String>,
    
    // User fields (optional - only if creating a user)
    #[validate(length(max = 50))]
    pub username: Option<String>,
    
    #[validate(length(min = 8))]
    pub password: Option<String>,
    
    #[validate(length(max = 20))]
    pub role: Option<String>,
    
    // Personnel fields (optional)
    #[validate(length(max = 50))]
    pub clearance_level: Option<String>,
    
    #[validate(length(max = 100))]
    pub department: Option<String>,
    
    #[validate(length(max = 100))]
    pub position: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Validate)]
pub struct UpdatePersonRequest {
    #[validate(length(max = 100))]
    pub first_name: Option<String>,
    
    #[validate(length(max = 100))]
    pub last_name: Option<String>,
    
    #[validate(email)]
    pub email: Option<String>,
    
    #[validate(length(max = 20))]
    pub phone: Option<String>,
    
    #[validate(length(max = 50))]
    pub username: Option<String>,
    
    #[validate(length(min = 8))]
    pub password: Option<String>,
    
    #[validate(length(max = 20))]
    pub role: Option<String>,
    
    #[validate(length(max = 50))]
    pub clearance_level: Option<String>,
    
    #[validate(length(max = 100))]
    pub department: Option<String>,
    
    #[validate(length(max = 100))]
    pub position: Option<String>,
}

// Helper methods for Person
impl Person {
    /// Check if this person is a user (has username/password)
    pub fn is_user(&self) -> bool {
        self.username.is_some() && self.password_hash.is_some()
    }
    
    /// Check if this person has a name
    pub fn has_name(&self) -> bool {
        self.first_name.is_some() || self.last_name.is_some()
    }
    
    /// Get display name (first_name + last_name, or username, or email, or "Unknown")
    pub fn display_name(&self) -> String {
        if let (Some(first), Some(last)) = (&self.first_name, &self.last_name) {
            format!("{} {}", first, last)
        } else if let Some(username) = &self.username {
            username.clone()
        } else if let Some(email) = &self.email {
            email.clone()
        } else {
            "Unknown".to_string()
        }
    }
}

