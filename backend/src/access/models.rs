use rocket::serde::{Deserialize, Serialize};
use sqlx::FromRow;
use validator::Validate;

/// Computer Access - System-level access permissions
#[derive(Serialize, Deserialize, FromRow, Clone, Debug)]
pub struct ComputerAccess {
    pub id: i32,
    pub personnel_id: i32,
    pub system_name: String,
    pub access_level: String, // READ, WRITE, ADMIN
    pub granted_by: i32,
    pub granted_at: chrono::NaiveDateTime,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub expires_at: Option<chrono::NaiveDateTime>,
    pub status: String, // ACTIVE, REVOKED, EXPIRED
    pub created_at: chrono::NaiveDateTime,
    pub updated_at: chrono::NaiveDateTime,
}

#[derive(Deserialize, Validate, Debug)]
pub struct CreateComputerAccessRequest {
    #[validate(length(min = 1, max = 100))]
    pub system_name: String,
    
    pub access_level: String, // READ, WRITE, ADMIN
    
    #[validate(range(min = 1))]
    pub personnel_id: i32,
    
    pub expires_at: Option<chrono::NaiveDateTime>,
}

/// Data Access - Classification-based data access
#[derive(Serialize, Deserialize, FromRow, Clone, Debug)]
pub struct DataAccess {
    pub id: i32,
    pub personnel_id: i32,
    pub data_classification: String, // UNCLASSIFIED, CONFIDENTIAL, SECRET, TOP_SECRET
    pub access_level: String, // READ, WRITE, DELETE
    pub granted_by: i32,
    pub granted_at: chrono::NaiveDateTime,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub expires_at: Option<chrono::NaiveDateTime>,
    pub status: String, // ACTIVE, REVOKED, EXPIRED
    pub created_at: chrono::NaiveDateTime,
    pub updated_at: chrono::NaiveDateTime,
}

#[derive(Deserialize, Validate, Debug)]
pub struct CreateDataAccessRequest {
    pub data_classification: String, // UNCLASSIFIED, CONFIDENTIAL, SECRET, TOP_SECRET
    
    pub access_level: String, // READ, WRITE, DELETE
    
    #[validate(range(min = 1))]
    pub personnel_id: i32,
    
    pub expires_at: Option<chrono::NaiveDateTime>,
}

/// Physical Access - Zone-based physical access
#[derive(Serialize, Deserialize, FromRow, Clone, Debug)]
pub struct PhysicalAccess {
    pub id: i32,
    pub personnel_id: i32,
    pub zone_name: String,
    pub access_level: String, // VISITOR, STANDARD, RESTRICTED, FULL
    pub valid_from: chrono::NaiveDateTime,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub valid_until: Option<chrono::NaiveDateTime>,
    pub granted_by: i32,
    pub status: String, // ACTIVE, REVOKED, EXPIRED
    pub created_at: chrono::NaiveDateTime,
    pub updated_at: chrono::NaiveDateTime,
}

#[derive(Deserialize, Validate, Debug)]
pub struct CreatePhysicalAccessRequest {
    #[validate(length(min = 1, max = 100))]
    pub zone_name: String,
    
    pub access_level: String, // VISITOR, STANDARD, RESTRICTED, FULL
    
    #[validate(range(min = 1))]
    pub personnel_id: i32,
    
    pub valid_until: Option<chrono::NaiveDateTime>,
}

/// Unified access listing for a personnel member
#[derive(Serialize, Debug)]
pub struct PersonnelAccess {
    pub computer_access: Vec<ComputerAccess>,
    pub data_access: Vec<DataAccess>,
    pub physical_access: Vec<PhysicalAccess>,
}
