use rocket::serde::json::Json;
use rocket::State;
use rocket::{get, post};
use sqlx::PgPool;

use crate::discussions::models::*;
use crate::shared::response::ApiResponse;
use crate::shared::error::AppError;
use crate::auth::middleware::AuthGuard;

/// List discussions for a personnel (end-user inbox)
#[get("/?<personnel_id>&<status>&<type>")]
pub async fn list_discussions(
    db: &State<PgPool>,
    personnel_id: Option<i32>,
    status: Option<String>,
    r#type: Option<String>,
    _auth: AuthGuard,
) -> Result<Json<ApiResponse<Vec<Discussion>>>, AppError> {
    let query_result = if let Some(pid) = personnel_id {
        if let Some(s) = status {
            if let Some(t) = r#type {
                sqlx::query_as::<sqlx::Postgres, Discussion>(
                    "SELECT id, personnel_id, subject, message, type, status, priority, created_by, assigned_to, resolved_at, resolved_by, created_at, updated_at FROM discussions WHERE personnel_id = $1 AND status = $2 AND type = $3 ORDER BY created_at DESC"
                )
                .bind(pid)
                .bind(&s)
                .bind(&t)
                .fetch_all(db.inner())
                .await
            } else {
                sqlx::query_as::<sqlx::Postgres, Discussion>(
                    "SELECT id, personnel_id, subject, message, type, status, priority, created_by, assigned_to, resolved_at, resolved_by, created_at, updated_at FROM discussions WHERE personnel_id = $1 AND status = $2 ORDER BY created_at DESC"
                )
                .bind(pid)
                .bind(&s)
                .fetch_all(db.inner())
                .await
            }
        } else {
            sqlx::query_as::<sqlx::Postgres, Discussion>(
                "SELECT id, personnel_id, subject, message, type, status, priority, created_by, assigned_to, resolved_at, resolved_by, created_at, updated_at FROM discussions WHERE personnel_id = $1 ORDER BY created_at DESC"
            )
            .bind(pid)
            .fetch_all(db.inner())
            .await
        }
    } else {
        sqlx::query_as::<sqlx::Postgres, Discussion>(
            "SELECT id, personnel_id, subject, message, type, status, priority, created_by, assigned_to, resolved_at, resolved_by, created_at, updated_at FROM discussions ORDER BY created_at DESC"
        )
        .fetch_all(db.inner())
        .await
    };

    let discussions = query_result.map_err(|e| {
        eprintln!("Database error in list_discussions: {:?}", e);
        AppError::Internal
    })?;
    Ok(Json(ApiResponse::success(discussions)))
}

/// Get a discussion with replies
#[get("/<id>")]
pub async fn get_discussion(
    db: &State<PgPool>,
    id: i32,
    _auth: AuthGuard,
) -> Result<Json<ApiResponse<DiscussionWithReplies>>, AppError> {
    let discussion = sqlx::query_as::<sqlx::Postgres, Discussion>(
        r#"
        SELECT id, personnel_id, subject, message, type, status, priority, created_by, assigned_to, resolved_at, resolved_by, created_at, updated_at
        FROM discussions
        WHERE id = $1
        "#
    )
    .bind(id)
    .fetch_one(db.inner())
    .await?;

    let replies = sqlx::query_as::<sqlx::Postgres, DiscussionReply>(
        r#"
        SELECT id, discussion_id, message, created_by, created_at, updated_at
        FROM discussion_replies
        WHERE discussion_id = $1
        ORDER BY created_at ASC
        "#
    )
    .bind(id)
    .fetch_all(db.inner())
    .await?;

    Ok(Json(ApiResponse::success(DiscussionWithReplies {
        discussion,
        replies,
    })))
}

/// Create a new discussion/report/request
#[post("/", data = "<data>")]
pub async fn create_discussion(
    db: &State<PgPool>,
    data: Json<CreateDiscussionRequest>,
    auth: crate::auth::middleware::AuthGuard,
) -> Result<Json<ApiResponse<Discussion>>, AppError> {
    let user_id = auth.claims.sub.parse::<i32>().unwrap_or(0);
    // Get personnel_id from user
    let user = sqlx::query!(
        "SELECT username FROM users WHERE id = $1",
        user_id
    )
    .fetch_optional(db.inner())
    .await?
    .ok_or(AppError::NotFound)?;

    // Find linked personnel by email matching username
    let personnel_id: Option<i32> = sqlx::query_scalar!(
        "SELECT id FROM personnel WHERE email LIKE $1 LIMIT 1",
        format!("{}%", user.username)
    )
    .fetch_optional(db.inner())
    .await?;

    let personnel_id = personnel_id.ok_or(AppError::NotFound)?;
    let created_by = user_id;
    let priority = data.priority.clone().unwrap_or_else(|| "NORMAL".to_string());

    let discussion = sqlx::query_as::<sqlx::Postgres, Discussion>(
        r#"
        INSERT INTO discussions (personnel_id, subject, message, type, priority, created_by)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, personnel_id, subject, message, type, status, priority, created_by, assigned_to, resolved_at, resolved_by, created_at, updated_at
        "#
    )
    .bind(personnel_id)
    .bind(&data.subject)
    .bind(&data.message)
    .bind(&data.r#type)
    .bind(&priority)
    .bind(created_by)
    .fetch_one(db.inner())
    .await?;

    Ok(Json(ApiResponse::success(discussion)))
}

/// Add a reply to a discussion
#[post("/<id>/replies", data = "<data>")]
pub async fn create_reply(
    db: &State<PgPool>,
    id: i32,
    data: Json<CreateReplyRequest>,
    auth: AuthGuard,
) -> Result<Json<ApiResponse<DiscussionReply>>, AppError> {
    let created_by = auth.claims.sub.parse::<i32>().unwrap_or(0);

    let reply = sqlx::query_as::<sqlx::Postgres, DiscussionReply>(
        r#"
        INSERT INTO discussion_replies (discussion_id, message, created_by)
        VALUES ($1, $2, $3)
        RETURNING id, discussion_id, message, created_by, created_at, updated_at
        "#
    )
    .bind(id)
    .bind(&data.message)
    .bind(created_by)
    .fetch_one(db.inner())
    .await?;

    // Update discussion updated_at
    sqlx::query("UPDATE discussions SET updated_at = CURRENT_TIMESTAMP WHERE id = $1")
        .bind(id)
        .execute(db.inner())
        .await?;

    Ok(Json(ApiResponse::success(reply)))
}

