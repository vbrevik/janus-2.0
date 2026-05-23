// Person HTTP handlers - unified handlers for person entities
use rocket::{State, get, post, put, delete, http::Status};
use rocket::serde::json::Json;
use sqlx::PgPool;
use validator::Validate;
use bcrypt::{hash, DEFAULT_COST};

use super::models::{Person, CreatePersonRequest, UpdatePersonRequest};
use crate::auth::middleware::AuthGuard;
use crate::shared::response::PaginatedResponse;
use crate::shared::pagination::PaginationParams;

#[get("/?<page>&<per_page>")]
pub async fn list_persons(
    page: Option<i32>,
    per_page: Option<i32>,
    db: &State<PgPool>,
    _auth: AuthGuard,
) -> Result<Json<PaginatedResponse<Person>>, Status> {
    // Create pagination params with defaults
    let pagination = PaginationParams {
        page: page.unwrap_or(1),
        per_page: per_page.unwrap_or(20),
    };

    // Validate pagination
    pagination.validate().map_err(|_| Status::BadRequest)?;

    // Get total count (excluding soft-deleted)
    let total: Option<i64> = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM person WHERE deleted_at IS NULL"
    )
    .fetch_optional(db.inner())
    .await
    .map_err(|_| Status::InternalServerError)?;
    let total = total.unwrap_or(0);

    // Get paginated persons - order by last_name, first_name, or username/email if no name
    let persons = sqlx::query_as::<_, Person>(
        r#"
        SELECT id, first_name, last_name, email, phone, 
               username, password_hash, role,
               clearance_level, department, position,
               deleted_at, created_at, updated_at
        FROM person 
        WHERE deleted_at IS NULL
        ORDER BY 
            COALESCE(last_name, ''), 
            COALESCE(first_name, ''), 
            COALESCE(username, email, '')
        LIMIT $1 OFFSET $2
        "#
    )
    .bind(pagination.limit())
    .bind(pagination.offset())
    .fetch_all(db.inner())
    .await
    .map_err(|_| Status::InternalServerError)?;

    // Calculate total pages
    let total_pages = ((total as f64) / (pagination.per_page as f64)).ceil() as i32;

    Ok(Json(PaginatedResponse {
        items: persons,
        total,
        page: pagination.page,
        per_page: pagination.per_page,
        total_pages,
    }))
}

#[get("/<id>")]
pub async fn get_person(
    id: i32,
    db: &State<PgPool>,
    _auth: AuthGuard,
) -> Result<Json<Person>, Status> {
    let person = sqlx::query_as::<_, Person>(
        r#"
        SELECT id, first_name, last_name, email, phone,
               username, password_hash, role,
               clearance_level, department, position,
               deleted_at, created_at, updated_at
        FROM person 
        WHERE id = $1 AND deleted_at IS NULL
        "#
    )
    .bind(id)
    .fetch_optional(db.inner())
    .await
    .map_err(|_| Status::InternalServerError)?
    .ok_or(Status::NotFound)?;

    Ok(Json(person))
}

#[post("/", data = "<person_request>")]
pub async fn create_person(
    person_request: Json<CreatePersonRequest>,
    db: &State<PgPool>,
    _auth: AuthGuard,
) -> Result<Json<Person>, Status> {
    // Validate input
    person_request.validate().map_err(|_| Status::BadRequest)?;

    // Validate that person has at least some identity
    if person_request.first_name.is_none() 
        && person_request.last_name.is_none() 
        && person_request.email.is_none() 
        && person_request.username.is_none() {
        return Err(Status::BadRequest);
    }

    // If creating a user, username and password are required
    if person_request.username.is_some() {
        if person_request.password.is_none() || person_request.role.is_none() {
            return Err(Status::BadRequest);
        }
    }

    // Validate department exists in organizations if provided
    if let Some(ref department) = person_request.department {
        let department_exists: bool = sqlx::query_scalar::<_, bool>(
            "SELECT EXISTS(SELECT 1 FROM organizations WHERE department = $1 AND deleted_at IS NULL)"
        )
        .bind(department)
        .fetch_one(db.inner())
        .await
        .map_err(|_| Status::InternalServerError)?;

        if !department_exists {
            return Err(Status::BadRequest);
        }
    }

    // Hash password if provided
    let password_hash = if let Some(ref password) = person_request.password {
        Some(hash(password, DEFAULT_COST).map_err(|_| Status::InternalServerError)?)
    } else {
        None
    };

    // Insert person
    let person = sqlx::query_as::<_, Person>(
        r#"
        INSERT INTO person 
        (first_name, last_name, email, phone, username, password_hash, role, 
         clearance_level, department, position)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id, first_name, last_name, email, phone,
                  username, password_hash, role,
                  clearance_level, department, position,
                  deleted_at, created_at, updated_at
        "#
    )
    .bind(&person_request.first_name)
    .bind(&person_request.last_name)
    .bind(&person_request.email)
    .bind(&person_request.phone)
    .bind(&person_request.username)
    .bind(&password_hash)
    .bind(&person_request.role)
    .bind(&person_request.clearance_level)
    .bind(&person_request.department)
    .bind(&person_request.position)
    .fetch_one(db.inner())
    .await
    .map_err(|e| {
        eprintln!("Database error: {:?}", e);
        Status::InternalServerError
    })?;

    Ok(Json(person))
}

#[put("/<id>", data = "<person_request>")]
pub async fn update_person(
    id: i32,
    person_request: Json<UpdatePersonRequest>,
    db: &State<PgPool>,
    _auth: AuthGuard,
) -> Result<Json<Person>, Status> {
    // Validate input
    person_request.validate().map_err(|_| Status::BadRequest)?;

    // Check if person exists and is not deleted
    let exists: bool = sqlx::query_scalar::<_, bool>(
        "SELECT EXISTS(SELECT 1 FROM person WHERE id = $1 AND deleted_at IS NULL)"
    )
    .bind(id)
    .fetch_one(db.inner())
    .await
    .map_err(|_| Status::InternalServerError)?;

    if !exists {
        return Err(Status::NotFound);
    }

    // Validate department if it's being updated
    if let Some(ref department) = person_request.department {
        let department_exists: bool = sqlx::query_scalar::<_, bool>(
            "SELECT EXISTS(SELECT 1 FROM organizations WHERE department = $1 AND deleted_at IS NULL)"
        )
        .bind(department)
        .fetch_one(db.inner())
        .await
        .map_err(|_| Status::InternalServerError)?;

        if !department_exists {
            return Err(Status::BadRequest);
        }
    }

    // Hash password if provided
    let password_hash = if let Some(ref password) = person_request.password {
        Some(hash(password, DEFAULT_COST).map_err(|_| Status::InternalServerError)?)
    } else {
        None
    };

    // Build dynamic update query
    let mut query = String::from("UPDATE person SET updated_at = CURRENT_TIMESTAMP");
    let mut param_count = 1;
    let mut params: Vec<Box<dyn std::any::Any + Send + Sync>> = Vec::new();

    if person_request.first_name.is_some() {
        query.push_str(&format!(", first_name = ${}", param_count));
        param_count += 1;
    }
    if person_request.last_name.is_some() {
        query.push_str(&format!(", last_name = ${}", param_count));
        param_count += 1;
    }
    if person_request.email.is_some() {
        query.push_str(&format!(", email = ${}", param_count));
        param_count += 1;
    }
    if person_request.phone.is_some() {
        query.push_str(&format!(", phone = ${}", param_count));
        param_count += 1;
    }
    if person_request.username.is_some() {
        query.push_str(&format!(", username = ${}", param_count));
        param_count += 1;
    }
    if password_hash.is_some() {
        query.push_str(&format!(", password_hash = ${}", param_count));
        param_count += 1;
    }
    if person_request.role.is_some() {
        query.push_str(&format!(", role = ${}", param_count));
        param_count += 1;
    }
    if person_request.clearance_level.is_some() {
        query.push_str(&format!(", clearance_level = ${}", param_count));
        param_count += 1;
    }
    if person_request.department.is_some() {
        query.push_str(&format!(", department = ${}", param_count));
        param_count += 1;
    }
    if person_request.position.is_some() {
        query.push_str(&format!(", position = ${}", param_count));
        param_count += 1;
    }

    query.push_str(&format!(
        " WHERE id = ${} RETURNING id, first_name, last_name, email, phone, \
         username, password_hash, role, clearance_level, department, position, \
         deleted_at, created_at, updated_at",
        param_count
    ));

    // Use runtime query builder for dynamic updates
    let mut query_builder = sqlx::query_as::<_, Person>(&query);
    
    if let Some(ref first_name) = person_request.first_name {
        query_builder = query_builder.bind(first_name);
    }
    if let Some(ref last_name) = person_request.last_name {
        query_builder = query_builder.bind(last_name);
    }
    if let Some(ref email) = person_request.email {
        query_builder = query_builder.bind(email);
    }
    if let Some(ref phone) = person_request.phone {
        query_builder = query_builder.bind(phone);
    }
    if let Some(ref username) = person_request.username {
        query_builder = query_builder.bind(username);
    }
    if let Some(ref hash) = password_hash {
        query_builder = query_builder.bind(hash);
    }
    if let Some(ref role) = person_request.role {
        query_builder = query_builder.bind(role);
    }
    if let Some(ref clearance_level) = person_request.clearance_level {
        query_builder = query_builder.bind(clearance_level);
    }
    if let Some(ref department) = person_request.department {
        query_builder = query_builder.bind(department);
    }
    if let Some(ref position) = person_request.position {
        query_builder = query_builder.bind(position);
    }
    
    query_builder = query_builder.bind(id);

    let person = query_builder
        .fetch_one(db.inner())
        .await
        .map_err(|_| Status::InternalServerError)?;

    Ok(Json(person))
}

#[delete("/<id>")]
pub async fn delete_person(
    id: i32,
    db: &State<PgPool>,
    _auth: AuthGuard,
) -> Result<Status, Status> {
    // Soft delete by setting deleted_at timestamp
    let result = sqlx::query(
        r#"
        UPDATE person 
        SET deleted_at = CURRENT_TIMESTAMP 
        WHERE id = $1 AND deleted_at IS NULL
        "#
    )
    .bind(id)
    .execute(db.inner())
    .await
    .map_err(|_| Status::InternalServerError)?;

    if result.rows_affected() == 0 {
        return Err(Status::NotFound);
    }

    Ok(Status::NoContent)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pagination_params() {
        let params = PaginationParams {
            page: 1,
            per_page: 20,
        };
        assert_eq!(params.offset(), 0);
        assert_eq!(params.limit(), 20);
    }
}

