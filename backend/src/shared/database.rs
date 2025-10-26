// Database connection utilities
use sqlx::postgres::{PgPool, PgPoolOptions};
use std::time::Duration;

#[allow(dead_code)]
pub async fn create_pool(database_url: &str) -> Result<PgPool, sqlx::Error> {
    PgPoolOptions::new()
        .max_connections(10)
        .acquire_timeout(Duration::from_secs(5))
        .connect(database_url)
        .await
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_create_pool_invalid_url() {
        let result = create_pool("invalid://url").await;
        assert!(result.is_err());
    }
}

