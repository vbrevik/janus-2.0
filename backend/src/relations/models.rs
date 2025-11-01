use chrono::NaiveDateTime;
use rocket::serde::{Deserialize, Serialize};
use sqlx::FromRow;
use validator::Validate;

#[derive(Debug, Clone, Copy, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "entity_type", rename_all = "lowercase")]
pub enum EntityType {
    Personnel,
    Vendor,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Relation {
    pub id: i32,
    pub entity_type: String, // 'personnel' or 'vendor'
    pub entity_id: i32,
    pub related_entity_type: String, // 'personnel' or 'vendor'
    pub related_entity_id: i32,
    pub relation_type: String, // sub_vendor, employee, consultant, etc.
    pub notes: Option<String>,
    pub valid_from: NaiveDateTime,
    pub valid_until: Option<NaiveDateTime>,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
}

#[derive(Debug, Serialize, Deserialize, Validate)]
pub struct CreateRelationRequest {
    pub entity_type: String, // 'personnel' or 'vendor'
    pub entity_id: i32,
    pub related_entity_type: String, // 'personnel' or 'vendor'
    pub related_entity_id: i32,
    #[validate(length(min = 1))]
    pub relation_type: String,
    pub notes: Option<String>,
    pub valid_from: Option<String>, // ISO date string
    pub valid_until: Option<String>, // ISO date string
}

#[derive(Debug, Serialize, Deserialize, Validate)]
pub struct UpdateRelationRequest {
    pub relation_type: Option<String>,
    pub notes: Option<String>,
    pub valid_from: Option<String>,
    pub valid_until: Option<String>,
}

// Helper struct for querying relations
#[derive(Debug, Serialize, Deserialize)]
pub struct RelationWithNames {
    #[serde(flatten)]
    pub relation: Relation,
    pub entity_name: String,
    pub related_entity_name: String,
}

// Hierarchical structure for recursive relations
#[derive(Debug, Serialize, Deserialize)]
pub struct EntityHierarchy {
    pub entity_id: i32,
    pub entity_type: String,
    pub entity_name: String,
    pub relation_type: String,
    pub level: i32,
    pub children: Vec<EntityHierarchy>,
}

