use rocket::{State, http::Status};
use rocket::serde::json::Json;
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
    let granted_by = auth.claims.sub.parse::<i32>()
        .map_err(|_| Status::InternalServerError)?;
    
    // Insert computer access
    let access = sqlx::query_as!(
        ComputerAccess,
        r#"
        INSERT INTO computer_access 
        (personnel_id, system_name, access_level, granted_by, expires_at, status)
        VALUES ($1, $2, $3, $4, $5, 'ACTIVE')
        RETURNING 
            id, personnel_id, system_name, access_level, granted_by,
            granted_at, expires_at, status, created_at, updated_at
        "#,
        data.personnel_id,
        data.system_name,
        data.access_level,
        granted_by,
        data.expires_at
    )
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
    let granted_by = auth.claims.sub.parse::<i32>()
        .map_err(|_| Status::InternalServerError)?;
    
    // Insert data access
    let access = sqlx::query_as!(
        DataAccess,
        r#"
        INSERT INTO data_access 
        (personnel_id, data_classification, access_level, granted_by, expires_at, status)
        VALUES ($1, $2, $3, $4, $5, 'ACTIVE')
        RETURNING 
            id, personnel_id, data_classification, access_level, granted_by,
            granted_at, expires_at, status, created_at, updated_at
        "#,
        data.personnel_id,
        data.data_classification,
        data.access_level,
        granted_by,
        data.expires_at
    )
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
    let granted_by = auth.claims.sub.parse::<i32>()
        .map_err(|_| Status::InternalServerError)?;
    
    // Insert physical access
    let access = sqlx::query_as!(
        PhysicalAccess,
        r#"
        INSERT INTO physical_access 
        (personnel_id, zone_name, access_level, valid_from, valid_until, granted_by, status)
        VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4, $5, 'ACTIVE')
        RETURNING 
            id, personnel_id, zone_name, access_level, valid_from, valid_until,
            granted_by, status, created_at, updated_at
        "#,
        data.personnel_id,
        data.zone_name,
        data.access_level,
        data.valid_until,
        granted_by,
    )
    .fetch_one(db.inner())
    .await
    .map_err(|_| Status::InternalServerError)?;
    
    Ok(Json(ApiResponse::success(access)))
}

/// List all access for a personnel member
#[get("/api/personnel/<id>/access")]
pub async fn list_personnel_access(
    db: &State<PgPool>,
    _auth: AuthGuard,
    id: i32,
) -> Result<Json<ApiResponse<PersonnelAccess>>, Status> {
    
    // Query computer access
    let computer_access = sqlx::query_as!(
        ComputerAccess,
        r#"
        SELECT id, personnel_id, system_name, access_level, granted_by,
               granted_at, expires_at, status, created_at, updated_at
        FROM computer_access
        WHERE personnel_id = $1 AND status = 'ACTIVE'
        ORDER BY granted_at DESC
        "#,
        id
    )
    .fetch_all(db.inner())
    .await
    .map_err(|_| Status::InternalServerError)?;
    
    // Query data access
    let data_access = sqlx::query_as!(
        DataAccess,
        r#"
        SELECT id, personnel_id, data_classification, access_level, granted_by,
               granted_at, expires_at, status, created_at, updated_at
        FROM data_access
        WHERE personnel_id = $1 AND status = 'ACTIVE'
        ORDER BY granted_at DESC
        "#,
        id
    )
    .fetch_all(db.inner())
    .await
    .map_err(|_| Status::InternalServerError)?;
    
    // Query physical access
    let physical_access = sqlx::query_as!(
        PhysicalAccess,
        r#"
        SELECT id, personnel_id, zone_name, access_level, valid_from, valid_until,
               granted_by, status, created_at, updated_at
        FROM physical_access
        WHERE personnel_id = $1 AND status = 'ACTIVE'
        ORDER BY valid_from DESC
        "#,
        id
    )
    .fetch_all(db.inner())
    .await
    .map_err(|_| Status::InternalServerError)?;
    
    let access = PersonnelAccess {
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
