use rocket::serde::json::Json;
use rocket::State;
use sqlx::PgPool;

use crate::access::models::*;
use crate::shared::response::ApiResponse;

/// Grant computer access to a personnel member
#[post("/api/access/computer", data = "<data>")]
pub async fn grant_computer_access(
    db: &State<PgPool>,
    data: Json<CreateComputerAccessRequest>,
) -> Result<Json<ApiResponse<ComputerAccess>>, String> {
    // TODO: Add auth guard and permission check
    
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
        1i32, // TODO: Get from auth guard
        data.expires_at
    )
    .fetch_one(db.inner())
    .await
    .map_err(|e| format!("Database error: {}", e))?;
    
    Ok(Json(ApiResponse::success(access)))
}

/// Grant data access to a personnel member
#[post("/api/access/data", data = "<data>")]
pub async fn grant_data_access(
    db: &State<PgPool>,
    data: Json<CreateDataAccessRequest>,
) -> Result<Json<ApiResponse<DataAccess>>, String> {
    // TODO: Add auth guard and permission check
    
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
        1i32, // TODO: Get from auth guard
        data.expires_at
    )
    .fetch_one(db.inner())
    .await
    .map_err(|e| format!("Database error: {}", e))?;
    
    Ok(Json(ApiResponse::success(access)))
}

/// Grant physical access to a personnel member
#[post("/api/access/physical", data = "<data>")]
pub async fn grant_physical_access(
    db: &State<PgPool>,
    data: Json<CreatePhysicalAccessRequest>,
) -> Result<Json<ApiResponse<PhysicalAccess>>, String> {
    // TODO: Add auth guard and permission check
    
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
        1i32, // TODO: Get from auth guard
    )
    .fetch_one(db.inner())
    .await
    .map_err(|e| format!("Database error: {}", e))?;
    
    Ok(Json(ApiResponse::success(access)))
}

/// List all access for a personnel member
#[get("/api/personnel/<id>/access")]
pub async fn list_personnel_access(
    db: &State<PgPool>,
    id: i32,
) -> Result<Json<ApiResponse<PersonnelAccess>>, String> {
    // TODO: Add auth guard and permission check
    
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
    .map_err(|e| format!("Database error: {}", e))?;
    
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
    .map_err(|e| format!("Database error: {}", e))?;
    
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
    .map_err(|e| format!("Database error: {}", e))?;
    
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
    access_type: &str,
    id: i32,
) -> Result<Json<ApiResponse<&'static str>>, String> {
    // TODO: Add auth guard and permission check
    
    match access_type {
        "computer" => {
            sqlx::query!(
                "UPDATE computer_access SET status = 'REVOKED' WHERE id = $1",
                id
            )
            .execute(db.inner())
            .await
            .map_err(|e| format!("Database error: {}", e))?;
        }
        "data" => {
            sqlx::query!(
                "UPDATE data_access SET status = 'REVOKED' WHERE id = $1",
                id
            )
            .execute(db.inner())
            .await
            .map_err(|e| format!("Database error: {}", e))?;
        }
        "physical" => {
            sqlx::query!(
                "UPDATE physical_access SET status = 'REVOKED' WHERE id = $1",
                id
            )
            .execute(db.inner())
            .await
            .map_err(|e| format!("Database error: {}", e))?;
        }
        _ => {
            return Err(format!("Invalid access type: {}", access_type));
        }
    }
    
    Ok(Json(ApiResponse::success("Access revoked successfully")))
}
