use chrono::NaiveDateTime;
use rocket::serde::{Deserialize, Serialize};
use sqlx::FromRow;
use validator::Validate;

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct NDA {
    pub id: i32,
    pub personnel_id: i32,
    pub title: String,
    pub content: String,
    pub version: String,
    pub status: String, // PENDING, ACTIVE, SIGNED, EXPIRED, REVOKED
    pub issued_by: i32,
    pub issued_at: NaiveDateTime,
    pub signed_at: Option<NaiveDateTime>,
    pub expires_at: Option<NaiveDateTime>,
    pub signature: Option<String>,
    pub rejection_reason: Option<String>,
    pub sent_by_vendor_id: Option<i32>,
    pub sent_at: Option<NaiveDateTime>,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
}

#[derive(Debug, Serialize, Deserialize, Validate)]
pub struct CreateNDARequest {
    pub personnel_id: i32,
    #[validate(length(min = 1))]
    pub title: String,
    #[validate(length(min = 10))]
    pub content: String,
    pub version: Option<String>,
    pub expires_at: Option<String>, // ISO date string
    pub sent_by_vendor_id: Option<i32>,
}

#[derive(Debug, Serialize, Deserialize, Validate)]
pub struct UpdateNDARequest {
    pub title: Option<String>,
    pub content: Option<String>,
    pub status: Option<String>, // ADMIN only
    pub expires_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Validate)]
pub struct SignNDARequest {
    #[validate(length(min = 1))]
    pub signature: String,
}

#[derive(Debug, Serialize, Deserialize, Validate)]
pub struct RejectNDARequest {
    #[validate(length(min = 1))]
    pub reason: String,
}

