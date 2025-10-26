use chrono::{NaiveDateTime, Utc};
use rocket::serde::{Deserialize, Serialize};
use sqlx::FromRow;
use validator::Validate;

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct VendorRelation {
    pub id: i32,
    pub vendor_id: i32,
    pub related_vendor_id: Option<i32>,
    pub related_personnel_id: Option<i32>,
    pub relation_type: String,
    pub notes: Option<String>,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
}

#[derive(Debug, Serialize, Deserialize, Validate)]
pub struct CreateVendorRelationRequest {
    pub vendor_id: i32,
    #[validate(length(min = 1))]
    pub relation_type: String, // sub_vendor, employee, consultant, partner, subcontractor
    pub related_vendor_id: Option<i32>,
    pub related_personnel_id: Option<i32>,
    pub notes: Option<String>,
}

fn validate_relation_type(relation_type: &str) -> Result<(), validator::ValidationError> {
    let valid_types = ["sub_vendor", "employee", "consultant", "partner", "subcontractor"];
    if valid_types.contains(&relation_type) {
        Ok(())
    } else {
        Err(validator::ValidationError::new("invalid_relation_type"))
    }
}

#[derive(Debug, Serialize, Deserialize, Validate)]
pub struct UpdateVendorRelationRequest {
    pub relation_type: Option<String>,
    pub notes: Option<String>,
}

// Hierarchical vendor tree structure
#[derive(Debug, Serialize, Deserialize)]
pub struct VendorHierarchy {
    pub vendor_id: i32,
    pub vendor_name: String,
    pub relation_type: String,
    pub level: i32,
    pub sub_vendors: Vec<VendorHierarchy>,
}

