use chrono::NaiveDateTime;
use rocket::serde::{Deserialize, Serialize};
use sqlx::FromRow;
use validator::Validate;

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Discussion {
    pub id: i32,
    pub personnel_id: i32,
    pub subject: String,
    pub message: String,
    pub r#type: String, // discussion, report, request
    pub status: String, // OPEN, IN_PROGRESS, RESOLVED, CLOSED
    pub priority: String, // LOW, NORMAL, HIGH, URGENT
    pub created_by: i32,
    pub assigned_to: Option<i32>,
    pub resolved_at: Option<NaiveDateTime>,
    pub resolved_by: Option<i32>,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct DiscussionReply {
    pub id: i32,
    pub discussion_id: i32,
    pub message: String,
    pub created_by: i32,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
}

#[derive(Debug, Serialize, Deserialize, Validate)]
pub struct CreateDiscussionRequest {
    #[validate(length(min = 3))]
    pub subject: String,
    #[validate(length(min = 10))]
    pub message: String,
    pub r#type: String, // discussion, report, request
    pub priority: Option<String>, // LOW, NORMAL, HIGH, URGENT
}

#[derive(Debug, Serialize, Deserialize, Validate)]
pub struct CreateReplyRequest {
    #[validate(length(min = 1))]
    pub message: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DiscussionWithReplies {
    #[serde(flatten)]
    pub discussion: Discussion,
    pub replies: Vec<DiscussionReply>,
}





