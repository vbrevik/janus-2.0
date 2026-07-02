use rocket::serde::json::Json;
use rocket::{http::Status, State};
use sqlx::PgPool;

use crate::access::models::*;
use crate::auth::middleware::AuthGuard;
use crate::shared::response::ApiResponse;

/// Grant computer access to a personnel member
#[post("/api/access/computer", data = "<data>")]
pub async fn grant_computer_access(
    db: &State<PgPool>,
    auth: AuthGuard,
    data: Json<CreateComputerAccessRequest>,
) -> Result<Json<ApiResponse<ComputerAccess>>, Status> {
    let granted_by_person_id = auth
        .claims
        .sub
        .parse::<i32>()
        .map_err(|_| Status::InternalServerError)?;

    // Insert computer access
    let access = sqlx::query_as::<_, ComputerAccess>(
        r#"
        INSERT INTO computer_access 
        (person_id, system_name, access_level, granted_by_person_id, expires_at, status)
        VALUES ($1, $2, $3, $4, $5, 'ACTIVE')
        RETURNING 
            id, person_id, system_name, access_level, granted_by_person_id,
            granted_at, expires_at, status, created_at, updated_at
        "#,
    )
    .bind(data.person_id)
    .bind(&data.system_name)
    .bind(&data.access_level)
    .bind(granted_by_person_id)
    .bind(data.expires_at)
    .fetch_one(db.inner())
    .await
    .map_err(|_| Status::InternalServerError)?;

    Ok(Json(ApiResponse::success(access)))
}

/// Grant data access to a personnel member
#[post("/api/access/data", data = "<data>")]
pub async fn grant_data_access(
    db: &State<PgPool>,
    auth: AuthGuard,
    data: Json<CreateDataAccessRequest>,
) -> Result<Json<ApiResponse<DataAccess>>, Status> {
    let granted_by_person_id = auth
        .claims
        .sub
        .parse::<i32>()
        .map_err(|_| Status::InternalServerError)?;

    // Insert data access
    let access = sqlx::query_as::<_, DataAccess>(
        r#"
        INSERT INTO data_access 
        (person_id, data_classification, access_level, granted_by_person_id, expires_at, status)
        VALUES ($1, $2, $3, $4, $5, 'ACTIVE')
        RETURNING 
            id, person_id, data_classification, access_level, granted_by_person_id,
            granted_at, expires_at, status, created_at, updated_at
        "#,
    )
    .bind(data.person_id)
    .bind(&data.data_classification)
    .bind(&data.access_level)
    .bind(granted_by_person_id)
    .bind(data.expires_at)
    .fetch_one(db.inner())
    .await
    .map_err(|_| Status::InternalServerError)?;

    Ok(Json(ApiResponse::success(access)))
}

/// Grant physical access to a personnel member
#[post("/api/access/physical", data = "<data>")]
pub async fn grant_physical_access(
    db: &State<PgPool>,
    auth: AuthGuard,
    data: Json<CreatePhysicalAccessRequest>,
) -> Result<Json<ApiResponse<PhysicalAccess>>, Status> {
    let granted_by_person_id = auth
        .claims
        .sub
        .parse::<i32>()
        .map_err(|_| Status::InternalServerError)?;

    // Insert physical access
    let access = sqlx::query_as::<_, PhysicalAccess>(
        r#"
        INSERT INTO physical_access 
        (person_id, zone_name, access_level, valid_from, valid_until, granted_by_person_id, status)
        VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4, $5, 'ACTIVE')
        RETURNING 
            id, person_id, zone_name, access_level, valid_from, valid_until,
            granted_by_person_id, status, created_at, updated_at
        "#,
    )
    .bind(data.person_id)
    .bind(&data.zone_name)
    .bind(&data.access_level)
    .bind(data.valid_until)
    .bind(granted_by_person_id)
    .fetch_one(db.inner())
    .await
    .map_err(|_| Status::InternalServerError)?;

    Ok(Json(ApiResponse::success(access)))
}

/// List all access for a person
#[get("/api/persons/<id>/access")]
pub async fn list_person_access(
    db: &State<PgPool>,
    _auth: AuthGuard,
    id: i32,
) -> Result<Json<ApiResponse<PersonAccess>>, Status> {
    // Query computer access
    let computer_access = sqlx::query_as::<_, ComputerAccess>(
        r#"
        SELECT id, person_id, system_name, access_level, granted_by_person_id,
               granted_at, expires_at, status, created_at, updated_at
        FROM computer_access
        WHERE person_id = $1 AND status = 'ACTIVE'
        ORDER BY granted_at DESC
        "#,
    )
    .bind(id)
    .fetch_all(db.inner())
    .await
    .map_err(|_| Status::InternalServerError)?;

    // Query data access
    let data_access = sqlx::query_as::<_, DataAccess>(
        r#"
        SELECT id, person_id, data_classification, access_level, granted_by_person_id,
               granted_at, expires_at, status, created_at, updated_at
        FROM data_access
        WHERE person_id = $1 AND status = 'ACTIVE'
        ORDER BY granted_at DESC
        "#,
    )
    .bind(id)
    .fetch_all(db.inner())
    .await
    .map_err(|_| Status::InternalServerError)?;

    // Query physical access
    let physical_access = sqlx::query_as::<_, PhysicalAccess>(
        r#"
        SELECT id, person_id, zone_name, access_level, valid_from, valid_until,
               granted_by_person_id, status, created_at, updated_at
        FROM physical_access
        WHERE person_id = $1 AND status = 'ACTIVE'
        ORDER BY valid_from DESC
        "#,
    )
    .bind(id)
    .fetch_all(db.inner())
    .await
    .map_err(|_| Status::InternalServerError)?;

    let access = PersonAccess {
        computer_access,
        data_access,
        physical_access,
    };

    Ok(Json(ApiResponse::success(access)))
}

/// Revoke access (mark as REVOKED)
#[delete("/api/access/<access_type>/<id>")]
pub async fn revoke_access(
    db: &State<PgPool>,
    _auth: AuthGuard,
    access_type: &str,
    id: i32,
) -> Result<Json<ApiResponse<&'static str>>, Status> {
    match access_type {
        "computer" => {
            sqlx::query!(
                "UPDATE computer_access SET status = 'REVOKED' WHERE id = $1",
                id
            )
            .execute(db.inner())
            .await
            .map_err(|_| Status::InternalServerError)?;
        }
        "data" => {
            sqlx::query!(
                "UPDATE data_access SET status = 'REVOKED' WHERE id = $1",
                id
            )
            .execute(db.inner())
            .await
            .map_err(|_| Status::InternalServerError)?;
        }
        "physical" => {
            sqlx::query!(
                "UPDATE physical_access SET status = 'REVOKED' WHERE id = $1",
                id
            )
            .execute(db.inner())
            .await
            .map_err(|_| Status::InternalServerError)?;
        }
        _ => {
            return Err(Status::BadRequest);
        }
    }

    Ok(Json(ApiResponse::success("Access revoked successfully")))
}
