// Vendor data models
use serde::{Deserialize, Serialize};
use validator::Validate;

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Vendor {
    pub id: i32,
    pub company_name: String,
    pub contact_name: String,
    pub contact_email: String,
    pub contact_phone: Option<String>,
    pub clearance_level: String,
    pub contract_number: String,
    pub deleted_at: Option<chrono::NaiveDateTime>,
    pub created_at: chrono::NaiveDateTime,
    pub updated_at: chrono::NaiveDateTime,
}

#[derive(Debug, Serialize, Deserialize, Validate)]
pub struct CreateVendorRequest {
    #[validate(length(min = 1, max = 200))]
    pub company_name: String,
    
    #[validate(length(min = 1, max = 100))]
    pub contact_name: String,
    
    #[validate(email)]
    pub contact_email: String,
    
    #[validate(length(max = 20))]
    pub contact_phone: Option<String>,
    
    #[validate(length(min = 1, max = 50))]
    pub clearance_level: String,
    
    #[validate(length(min = 1, max = 100))]
    pub contract_number: String,
}

#[derive(Debug, Serialize, Deserialize, Validate)]
pub struct UpdateVendorRequest {
    #[validate(length(min = 1, max = 200))]
    pub company_name: Option<String>,
    
    #[validate(length(min = 1, max = 100))]
    pub contact_name: Option<String>,
    
    #[validate(email)]
    pub contact_email: Option<String>,
    
    #[validate(length(max = 20))]
    pub contact_phone: Option<String>,
    
    #[validate(length(min = 1, max = 50))]
    pub clearance_level: Option<String>,
    
    #[validate(length(min = 1, max = 100))]
    pub contract_number: Option<String>,
}
