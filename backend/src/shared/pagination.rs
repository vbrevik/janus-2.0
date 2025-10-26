// Pagination utilities
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct PaginationParams {
    pub page: i32,
    pub per_page: i32,
}

impl Default for PaginationParams {
    fn default() -> Self {
        PaginationParams {
            page: 1,
            per_page: 20,
        }
    }
}

impl PaginationParams {
    pub fn offset(&self) -> i64 {
        ((self.page - 1) * self.per_page) as i64
    }

    pub fn limit(&self) -> i64 {
        self.per_page as i64
    }

    pub fn validate(&self) -> Result<(), String> {
        if self.page < 1 {
            return Err("Page must be >= 1".to_string());
        }
        if self.per_page < 1 || self.per_page > 100 {
            return Err("Per page must be between 1 and 100".to_string());
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pagination_offset() {
        let params = PaginationParams { page: 1, per_page: 20 };
        assert_eq!(params.offset(), 0);

        let params = PaginationParams { page: 2, per_page: 20 };
        assert_eq!(params.offset(), 20);

        let params = PaginationParams { page: 3, per_page: 10 };
        assert_eq!(params.offset(), 20);
    }

    #[test]
    fn test_pagination_validation() {
        let params = PaginationParams { page: 0, per_page: 20 };
        assert!(params.validate().is_err());

        let params = PaginationParams { page: 1, per_page: 0 };
        assert!(params.validate().is_err());

        let params = PaginationParams { page: 1, per_page: 101 };
        assert!(params.validate().is_err());

        let params = PaginationParams { page: 1, per_page: 20 };
        assert!(params.validate().is_ok());
    }
}

