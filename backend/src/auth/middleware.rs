// Authentication middleware for route guards
use rocket::request::{FromRequest, Request, Outcome};
use rocket::http::Status;
use super::jwt::{validate_jwt, Claims};

pub struct AuthGuard {
    pub claims: Claims,
}

#[rocket::async_trait]
impl<'r> FromRequest<'r> for AuthGuard {
    type Error = ();

    async fn from_request(request: &'r Request<'_>) -> Outcome<Self, Self::Error> {
        let jwt_secret = match request.rocket().state::<String>() {
            Some(secret) => secret,
            None => return Outcome::Error((Status::InternalServerError, ())),
        };

        let token = request.headers().get_one("Authorization");
        
        match token {
            Some(token) => {
                let token = token.trim_start_matches("Bearer ");
                match validate_jwt(token, jwt_secret) {
                    Ok(claims) => Outcome::Success(AuthGuard { claims }),
                    Err(_) => Outcome::Error((Status::Unauthorized, ())),
                }
            }
            None => Outcome::Error((Status::Unauthorized, ())),
        }
    }
}

