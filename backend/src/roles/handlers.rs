use rocket::serde::json::Json;
use rocket::{delete, get, post, put, State};
use sqlx::PgPool;

use super::models::{
    CreateRoleRequest, Permission, Role, SetRolePermissionsRequest, UpdateRoleRequest,
};
use crate::auth::middleware::AuthGuard;
use crate::shared::error::AppError;
use crate::shared::rbac::role_has_permission;

#[get("/")]
pub async fn list_roles(db: &State<PgPool>, auth: AuthGuard) -> Result<Json<Vec<Role>>, AppError> {
    if !role_has_permission(db.inner(), &auth.claims.role, "roles.read")
        .await
        .unwrap_or(false)
    {
        return Err(AppError::Forbidden);
    }
    let items = sqlx::query_as!(
        Role,
        r#"SELECT id, name, description, created_at FROM roles ORDER BY name"#
    )
    .fetch_all(db.inner())
    .await?;
    Ok(Json(items))
}

#[post("/", data = "<req>")]
pub async fn create_role(
    db: &State<PgPool>,
    auth: AuthGuard,
    req: Json<CreateRoleRequest>,
) -> Result<Json<Role>, AppError> {
    if !role_has_permission(db.inner(), &auth.claims.role, "roles.write")
        .await
        .unwrap_or(false)
    {
        return Err(AppError::Forbidden);
    }
    let item = sqlx::query_as!(
        Role,
        r#"INSERT INTO roles (name, description) VALUES ($1, $2)
           RETURNING id, name, description, created_at"#,
        req.name,
        req.description
    )
    .fetch_one(db.inner())
    .await?;
    Ok(Json(item))
}

#[put("/<id>", data = "<req>")]
pub async fn update_role(
    db: &State<PgPool>,
    auth: AuthGuard,
    id: i32,
    req: Json<UpdateRoleRequest>,
) -> Result<Json<Role>, AppError> {
    if !role_has_permission(db.inner(), &auth.claims.role, "roles.write")
        .await
        .unwrap_or(false)
    {
        return Err(AppError::Forbidden);
    }
    let current = sqlx::query_as!(
        Role,
        r#"SELECT id, name, description, created_at FROM roles WHERE id = $1"#,
        id
    )
    .fetch_optional(db.inner())
    .await?
    .ok_or(AppError::NotFound)?;
    let name = req.name.clone().unwrap_or(current.name);
    let description = if req.description.is_some() {
        req.description.clone()
    } else {
        current.description
    };
    let updated = sqlx::query_as!(
        Role,
        r#"UPDATE roles SET name = $1, description = $2 WHERE id = $3
           RETURNING id, name, description, created_at"#,
        name,
        description,
        id
    )
    .fetch_one(db.inner())
    .await?;
    Ok(Json(updated))
}

#[delete("/<id>")]
pub async fn delete_role(
    db: &State<PgPool>,
    auth: AuthGuard,
    id: i32,
) -> Result<Json<()>, AppError> {
    if !role_has_permission(db.inner(), &auth.claims.role, "roles.write")
        .await
        .unwrap_or(false)
    {
        return Err(AppError::Forbidden);
    }
    sqlx::query!("DELETE FROM roles WHERE id = $1", id)
        .execute(db.inner())
        .await?;
    Ok(Json(()))
}

#[get("/permissions")]
pub async fn list_permissions(
    db: &State<PgPool>,
    auth: AuthGuard,
) -> Result<Json<Vec<Permission>>, AppError> {
    if !role_has_permission(db.inner(), &auth.claims.role, "roles.read")
        .await
        .unwrap_or(false)
    {
        return Err(AppError::Forbidden);
    }
    let items = sqlx::query_as!(
        Permission,
        r#"SELECT id, key, description FROM permissions ORDER BY key"#
    )
    .fetch_all(db.inner())
    .await?;
    Ok(Json(items))
}

#[get("/<id>/permissions")]
pub async fn get_role_permissions(
    db: &State<PgPool>,
    auth: AuthGuard,
    id: i32,
) -> Result<Json<Vec<String>>, AppError> {
    if !role_has_permission(db.inner(), &auth.claims.role, "roles.read")
        .await
        .unwrap_or(false)
    {
        return Err(AppError::Forbidden);
    }
    let items = sqlx::query_scalar!(
        r#"SELECT p.key FROM role_permissions rp JOIN permissions p ON p.id = rp.permission_id WHERE rp.role_id = $1 ORDER BY p.key"#,
        id
    ).fetch_all(db.inner()).await?;
    Ok(Json(items))
}

#[put("/<id>/permissions", data = "<req>")]
pub async fn set_role_permissions(
    db: &State<PgPool>,
    auth: AuthGuard,
    id: i32,
    req: Json<SetRolePermissionsRequest>,
) -> Result<Json<()>, AppError> {
    if !role_has_permission(db.inner(), &auth.claims.role, "roles.write")
        .await
        .unwrap_or(false)
    {
        return Err(AppError::Forbidden);
    }
    let mut tx = db.inner().begin().await.map_err(|_| AppError::Internal)?;
    sqlx::query!("DELETE FROM role_permissions WHERE role_id = $1", id)
        .execute(&mut *tx)
        .await?;
    for key in &req.permissions {
        let perm_id = sqlx::query_scalar!("SELECT id FROM permissions WHERE key = $1", key)
            .fetch_optional(&mut *tx)
            .await?;
        if let Some(pid) = perm_id {
            sqlx::query!("INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", id, pid)
                .execute(&mut *tx).await?;
        }
    }
    tx.commit().await.map_err(|_| AppError::Internal)?;
    Ok(Json(()))
}
