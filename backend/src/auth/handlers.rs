// Authentication HTTP handlers
use rocket::{State, post, http::Status};
use rocket::serde::json::Json;
use sqlx::PgPool;
use validator::Validate;

use super::models::{LoginRequest, LoginResponse};
use super::jwt::create_jwt;

#[post("/api/auth/login", data = "<login_request>")]
pub async fn login(
    login_request: Json<LoginRequest>,
    db: &State<PgPool>,
    jwt_secret: &State<String>,
) -> Result<Json<LoginResponse>, Status> {
    // Validate input
    login_request.validate().map_err(|_| Status::BadRequest)?;

    // TODO: Implement actual authentication in Phase 1
    // For now, this is a placeholder that will be implemented in MVP 1

    Err(Status::NotImplemented)
}

