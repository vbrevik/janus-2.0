// JWT token creation and validation
use jsonwebtoken::{encode, decode, Header, Validation, EncodingKey, DecodingKey};
use serde::{Deserialize, Serialize};
use chrono::{Utc, Duration};

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,        // User ID
    pub exp: i64,           // Expiration time
    pub iat: i64,           // Issued at
    pub role: String,       // User role
}

pub fn create_jwt(user_id: &str, role: &str, secret: &str) -> Result<String, jsonwebtoken::errors::Error> {
    let expiration = Utc::now()
        .checked_add_signed(Duration::hours(8))
        .expect("Valid timestamp")
        .timestamp();

    let claims = Claims {
        sub: user_id.to_owned(),
        exp: expiration,
        iat: Utc::now().timestamp(),
        role: role.to_owned(),
    };

    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_ref()),
    )
}

pub fn validate_jwt(token: &str, secret: &str) -> Result<Claims, jsonwebtoken::errors::Error> {
    let token_data = decode::<Claims>(
        token,
        &DecodingKey::from_secret(secret.as_ref()),
        &Validation::default(),
    )?;

    Ok(token_data.claims)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_jwt_creation_and_validation() {
        let secret = "test-secret-at-least-32-characters-long";
        let user_id = "user123";
        let role = "admin";

        let token = create_jwt(user_id, role, secret).expect("Failed to create JWT");
        let claims = validate_jwt(&token, secret).expect("Failed to validate JWT");

        assert_eq!(claims.sub, user_id);
        assert_eq!(claims.role, role);
    }

    #[test]
    fn test_jwt_validation_fails_with_wrong_secret() {
        let secret = "test-secret-at-least-32-characters-long";
        let wrong_secret = "wrong-secret-at-least-32-characters-long";
        let token = create_jwt("user123", "admin", secret).unwrap();

        assert!(validate_jwt(&token, wrong_secret).is_err());
    }
}

