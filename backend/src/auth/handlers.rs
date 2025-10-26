// Authentication HTTP handlers
use rocket::{State, post, http::Status};
use rocket::serde::json::Json;
use sqlx::PgPool;
use validator::Validate;

use super::models::{LoginRequest, LoginResponse, User};
use super::jwt::create_jwt;

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
    let password_valid = bcrypt::verify(&login_request.password, &user.password_hash)
        .map_err(|_| Status::InternalServerError)?;

    if !password_valid {
        return Err(Status::Unauthorized);
    }

    // Create JWT token
    let token = create_jwt(&user.id.to_string(), &user.role, jwt_secret)
        .map_err(|_| Status::InternalServerError)?;

    Ok(Json(LoginResponse {
        token,
        user_id: user.id.to_string(),
        role: user.role,
    }))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_password_hashing() {
        let password = "test_password_123";
        let hashed = bcrypt::hash(password, 12).expect("Failed to hash");
        
        assert!(bcrypt::verify(password, &hashed).expect("Failed to verify"));
        assert!(!bcrypt::verify("wrong_password", &hashed).expect("Failed to verify"));
    }
}

