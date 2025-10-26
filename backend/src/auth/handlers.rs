// Authentication HTTP handlers
use rocket::{State, post, get, put, http::Status};
use rocket::serde::json::Json;
use sqlx::PgPool;
use validator::Validate;
use bcrypt;

use super::models::{LoginRequest, LoginResponse, User, ProfileResponse, ChangePasswordRequest};
use super::jwt::create_jwt;
use super::middleware::AuthGuard;

#[post("/api/auth/login", data = "<login_request>")]
pub async fn login(
    login_request: Json<LoginRequest>,
    db: &State<PgPool>,
    jwt_secret: &State<String>,
) -> Result<Json<LoginResponse>, Status> {
    // Validate input
    login_request.validate().map_err(|_| Status::BadRequest)?;

    // Find user by username
    let user = sqlx::query_as!(
        User,
        "SELECT id, username, password_hash, role, created_at, updated_at 
         FROM users 
         WHERE username = $1",
        login_request.username
    )
    .fetch_optional(db.inner())
    .await
    .map_err(|_| Status::InternalServerError)?
    .ok_or(Status::Unauthorized)?;

    // Verify password
    let is_valid = bcrypt::verify(&login_request.password, &user.password_hash)
        .map_err(|_| Status::InternalServerError)?;

    if !is_valid {
        return Err(Status::Unauthorized);
    }

    // Create JWT token
    let token = create_jwt(&user.id.to_string(), &user.role, jwt_secret)
        .map_err(|_| Status::InternalServerError)?;

    Ok(Json(LoginResponse {
        token,
        user_id: user.id.to_string(),
        role: user.role.clone(),
    }))
}

#[get("/api/auth/profile")]
pub async fn get_profile(
    db: &State<PgPool>,
    auth: AuthGuard,
) -> Result<Json<ProfileResponse>, Status> {
    // Get user details
    let user = sqlx::query_as!(
        User,
        "SELECT id, username, password_hash, role, created_at, updated_at 
         FROM users 
         WHERE id = $1",
        auth.claims.sub.parse::<i32>().unwrap_or(0)
    )
    .fetch_optional(db.inner())
    .await
    .map_err(|_| Status::InternalServerError)?
    .ok_or(Status::NotFound)?;

    Ok(Json(ProfileResponse {
        id: user.id,
        username: user.username,
        role: user.role,
        created_at: user.created_at,
        updated_at: user.updated_at,
    }))
}

#[put("/api/auth/change-password", data = "<request>")]
pub async fn change_password(
    request: Json<ChangePasswordRequest>,
    db: &State<PgPool>,
    auth: AuthGuard,
) -> Result<Status, Status> {
    // Validate input
    request.validate().map_err(|_| Status::BadRequest)?;

    let user_id = auth.claims.sub.parse::<i32>().unwrap_or(0);

    // Get current user
    let user = sqlx::query_as!(
        User,
        "SELECT id, username, password_hash, role, created_at, updated_at 
         FROM users 
         WHERE id = $1",
        user_id
    )
    .fetch_optional(db.inner())
    .await
    .map_err(|_| Status::InternalServerError)?
    .ok_or(Status::NotFound)?;

    // Verify old password
    let is_valid = bcrypt::verify(&request.old_password, &user.password_hash)
        .map_err(|_| Status::InternalServerError)?;

    if !is_valid {
        return Err(Status::Unauthorized);
    }

    // Hash new password
    let new_hash = bcrypt::hash(&request.new_password, bcrypt::DEFAULT_COST)
        .map_err(|_| Status::InternalServerError)?;

    // Update password
    sqlx::query!(
        "UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2",
        new_hash,
        user_id
    )
    .execute(db.inner())
    .await
    .map_err(|_| Status::InternalServerError)?;

    Ok(Status::NoContent)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_password_hashing() {
        let password = "password123";
        let hash = bcrypt::hash(password, bcrypt::DEFAULT_COST).unwrap();
        assert!(bcrypt::verify(password, &hash).unwrap());
    }
}
