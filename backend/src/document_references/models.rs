use chrono::{NaiveDate, NaiveDateTime};
use rocket::serde::{Deserialize, Serialize};
use sqlx::FromRow;
use validator::Validate;

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct DocumentReference {
    pub id: i32,
    pub personnel_id: i32,
    pub title: String,
    pub document_type: String, // security_brief, briefing, report, certification, other
    pub description: Option<String>,
    pub issued_date: Option<NaiveDate>,
    pub location: Option<String>,
    pub self_reported_by: i32,
    pub self_reported_at: NaiveDateTime,
    pub verified_by: Option<i32>,
    pub verified_at: Option<NaiveDateTime>,
    pub status: String, // PENDING, VERIFIED, REJECTED
    pub notes: Option<String>,
    pub attachment_path: Option<String>,
    pub attachment_mime_type: Option<String>,
    pub attachment_original_name: Option<String>,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
}

#[derive(Debug, Serialize, Deserialize, Validate)]
pub struct CreateDocumentReferenceRequest {
    #[validate(length(min = 3))]
    pub title: String,
    pub document_type: Option<String>, // Defaults to 'security_brief'
    pub description: Option<String>,
    pub issued_date: Option<String>, // ISO date string
    pub location: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Validate)]
pub struct UpdateDocumentReferenceRequest {
    pub title: Option<String>,
    pub document_type: Option<String>,
    pub description: Option<String>,
    pub issued_date: Option<String>,
    pub location: Option<String>,
    pub status: Option<String>, // Admin only
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Validate)]
pub struct AttachmentUploadRequest {
    #[validate(length(min = 1))]
    pub filename: String,
    #[validate(length(min = 3))]
    pub mime_type: String,
    #[validate(length(min = 10))]
    pub data_base64: String,
}





