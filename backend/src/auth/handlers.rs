// Authentication HTTP handlers
use rocket::{State, post, get, put, http::Status};
use rocket::serde::json::Json;
use sqlx::PgPool;
use validator::Validate;
use bcrypt;

use super::models::{LoginRequest, LoginResponse, PersonAuth, ProfileResponse, ChangePasswordRequest};
use crate::person::models::Person;
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

    // Find person by username (must have username and password_hash - i.e., be a user)
    let person_auth = sqlx::query_as::<_, PersonAuth>(
        "SELECT id, username, password_hash, role, created_at, updated_at 
         FROM person 
         WHERE username = $1 AND password_hash IS NOT NULL"
    )
    .bind(&login_request.username)
    .fetch_optional(db.inner())
    .await
    .map_err(|_| Status::InternalServerError)?
    .ok_or(Status::Unauthorized)?;

    // Verify password_hash exists
    let password_hash = person_auth.password_hash.as_ref()
        .ok_or(Status::Unauthorized)?;

    // Verify password
    let is_valid = bcrypt::verify(&login_request.password, password_hash)
        .map_err(|_| Status::InternalServerError)?;

    if !is_valid {
        return Err(Status::Unauthorized);
    }

    // Get role (must exist for users)
    let role = person_auth.role.as_ref()
        .ok_or(Status::InternalServerError)?;

    // Create JWT token
    let token = create_jwt(&person_auth.id.to_string(), role, jwt_secret)
        .map_err(|_| Status::InternalServerError)?;

    Ok(Json(LoginResponse {
        token,
        person_id: person_auth.id.to_string(),
        role: role.clone(),
    }))
}

#[get("/api/auth/profile")]
pub async fn get_profile(
    db: &State<PgPool>,
    auth: AuthGuard,
) -> Result<Json<ProfileResponse>, Status> {
    let person_id = auth.claims.sub.parse::<i32>().unwrap_or(0);

    // Get person details
    let person = sqlx::query_as::<_, Person>(
        "SELECT id, first_name, last_name, email, phone,
                username, password_hash, role,
                clearance_level, department, position,
                deleted_at, created_at, updated_at 
         FROM person 
         WHERE id = $1 AND deleted_at IS NULL"
    )
    .bind(person_id)
    .fetch_optional(db.inner())
    .await
    .map_err(|_| Status::InternalServerError)?
    .ok_or(Status::NotFound)?;

    Ok(Json(ProfileResponse {
        id: person.id,
        username: person.username,
        role: person.role,
        first_name: person.first_name,
        last_name: person.last_name,
        email: person.email,
        phone: person.phone,
        clearance_level: person.clearance_level,
        department: person.department,
        position: person.position,
        created_at: person.created_at,
        updated_at: person.updated_at,
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

    let person_id = auth.claims.sub.parse::<i32>().unwrap_or(0);

    // Get current person (must have password_hash - i.e., be a user)
    let person_auth = sqlx::query_as::<_, PersonAuth>(
        "SELECT id, username, password_hash, role, created_at, updated_at 
         FROM person 
         WHERE id = $1 AND password_hash IS NOT NULL"
    )
    .bind(person_id)
    .fetch_optional(db.inner())
    .await
    .map_err(|_| Status::InternalServerError)?
    .ok_or(Status::NotFound)?;

    // Verify password_hash exists
    let password_hash = person_auth.password_hash.as_ref()
        .ok_or(Status::InternalServerError)?;

    // Verify old password
    let is_valid = bcrypt::verify(&request.old_password, password_hash)
        .map_err(|_| Status::InternalServerError)?;

    if !is_valid {
        return Err(Status::Unauthorized);
    }

    // Hash new password
    let new_hash = bcrypt::hash(&request.new_password, bcrypt::DEFAULT_COST)
        .map_err(|_| Status::InternalServerError)?;

    // Update password in person table
    sqlx::query(
        "UPDATE person SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2"
    )
    .bind(&new_hash)
    .bind(person_id)
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
