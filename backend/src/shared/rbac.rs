use sqlx::PgPool;

pub async fn role_has_permission(db: &PgPool, role_name: &str, perm_key: &str) -> Result<bool, sqlx::Error> {
    let exists = sqlx::query_scalar!(
        r#"
        SELECT EXISTS (
          SELECT 1
          FROM roles r
          JOIN role_permissions rp ON rp.role_id = r.id
          JOIN permissions p ON p.id = rp.permission_id
          WHERE r.name = $1 AND p.key = $2
        )
        "#,
        role_name,
        perm_key
    )
    .fetch_one(db)
    .await?
    .unwrap_or(false);

    Ok(exists)
}

