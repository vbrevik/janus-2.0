use rocket::serde::json::Json;
use rocket::State;
use rocket::{get, post};
use sqlx::PgPool;

use crate::discussions::models::*;
use crate::auth::middleware::AuthGuard;
use crate::shared::response::ApiResponse;
use crate::shared::error::AppError;

/// List discussions for a person (end-user inbox)
#[get("/?<person_id>&<status>&<type>")]
pub async fn list_discussions(
    db: &State<PgPool>,
    person_id: Option<i32>, // Changed from personnel_id
    status: Option<String>,
    r#type: Option<String>,
    _auth: AuthGuard,
) -> Result<Json<ApiResponse<Vec<Discussion>>>, AppError> {
    let query_result = if let Some(pid) = person_id {
        if let Some(s) = status {
            if let Some(t) = r#type {
                sqlx::query_as::<sqlx::Postgres, Discussion>(
                    "SELECT id, person_id, subject, message, type, status, priority, created_by_person_id, assigned_to_person_id, resolved_at, resolved_by_person_id, created_at, updated_at FROM discussions WHERE person_id = $1 AND status = $2 AND type = $3 ORDER BY created_at DESC"
                )
                .bind(pid)
                .bind(&s)
                .bind(&t)
                .fetch_all(db.inner())
                .await
            } else {
                sqlx::query_as::<sqlx::Postgres, Discussion>(
                    "SELECT id, person_id, subject, message, type, status, priority, created_by_person_id, assigned_to_person_id, resolved_at, resolved_by_person_id, created_at, updated_at FROM discussions WHERE person_id = $1 AND status = $2 ORDER BY created_at DESC"
                )
                .bind(pid)
                .bind(&s)
                .fetch_all(db.inner())
                .await
            }
        } else {
            sqlx::query_as::<sqlx::Postgres, Discussion>(
                "SELECT id, person_id, subject, message, type, status, priority, created_by_person_id, assigned_to_person_id, resolved_at, resolved_by_person_id, created_at, updated_at FROM discussions WHERE person_id = $1 ORDER BY created_at DESC"
            )
            .bind(pid)
            .fetch_all(db.inner())
            .await
        }
    } else {
        sqlx::query_as::<sqlx::Postgres, Discussion>(
            "SELECT id, person_id, subject, message, type, status, priority, created_by_person_id, assigned_to_person_id, resolved_at, resolved_by_person_id, created_at, updated_at FROM discussions ORDER BY created_at DESC"
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
        SELECT id, person_id, subject, message, type, status, priority, created_by_person_id, assigned_to_person_id, resolved_at, resolved_by_person_id, created_at, updated_at
        FROM discussions
        WHERE id = $1
        "#
    )
    .bind(id)
    .fetch_one(db.inner())
    .await?;

    let replies = sqlx::query_as::<sqlx::Postgres, DiscussionReply>(
        r#"
        SELECT id, discussion_id, message, created_by_person_id, created_at, updated_at
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
    let person_id = auth.claims.sub.parse::<i32>().unwrap_or(0);
    // Find person_id - the authenticated user's person_id (from JWT claims.sub)
    // No need to look up - auth.claims.sub already contains the person_id
    
    let priority = data.priority.clone().unwrap_or_else(|| "NORMAL".to_string());
    let created_by_person_id = person_id;

    let discussion = sqlx::query_as::<sqlx::Postgres, Discussion>(
        r#"
        INSERT INTO discussions (person_id, subject, message, type, priority, created_by_person_id)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, person_id, subject, message, type, status, priority, created_by_person_id, assigned_to_person_id, resolved_at, resolved_by_person_id, created_at, updated_at
        "#
    )
    .bind(person_id)
    .bind(&data.subject)
    .bind(&data.message)
    .bind(&data.r#type)
    .bind(&priority)
    .bind(created_by_person_id)
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
    ws_manager: &State<crate::messaging::websocket::WebSocketManager>,
) -> Result<Json<ApiResponse<DiscussionReply>>, AppError> {
    let created_by_person_id = auth.claims.sub.parse::<i32>().unwrap_or(0);

    // Get discussion to find person_id and assigned_to_person_id for notifications
    #[derive(sqlx::FromRow)]
    struct DiscussionInfo {
        person_id: i32,
        assigned_to_person_id: Option<i32>,
    }
    let discussion = sqlx::query_as::<sqlx::Postgres, DiscussionInfo>(
        "SELECT person_id, assigned_to_person_id FROM discussions WHERE id = $1"
    )
    .bind(id)
    .fetch_optional(db.inner())
    .await?
    .ok_or(AppError::NotFound)?;

    let reply = sqlx::query_as::<sqlx::Postgres, DiscussionReply>(
        r#"
        INSERT INTO discussion_replies (discussion_id, message, created_by_person_id)
        VALUES ($1, $2, $3)
        RETURNING id, discussion_id, message, created_by_person_id, created_at, updated_at
        "#
    )
    .bind(id)
    .bind(&data.message)
    .bind(created_by_person_id)
    .fetch_one(db.inner())
    .await?;

    // Update discussion updated_at
    sqlx::query("UPDATE discussions SET updated_at = CURRENT_TIMESTAMP WHERE id = $1")
        .bind(id)
        .execute(db.inner())
        .await?;

    // Broadcast WebSocket message to relevant users
    let mut notify_users = vec![discussion.person_id];
    if let Some(assigned_to_person_id) = discussion.assigned_to_person_id {
        if assigned_to_person_id != created_by_person_id {
            notify_users.push(assigned_to_person_id);
        }
    }
    if created_by_person_id != discussion.person_id {
        // Don't notify the sender
        notify_users.retain(|&uid| uid != created_by_person_id);
    }

    if !notify_users.is_empty() {
        let ws_message = crate::messaging::models::WebSocketMessage::NewMessage {
            discussion_id: id,
            message: data.message.clone(),
            created_by: created_by_person_id,
            created_at: reply.created_at.format("%Y-%m-%d %H:%M:%S").to_string(),
        };
        ws_manager.broadcast_to_users(&notify_users, ws_message).await;
    }

    Ok(Json(ApiResponse::success(reply)))
}

