use rocket::{http::Status, request::Request, response::{Responder, Result as ResponseResult}};

#[derive(Debug)]
pub enum AppError {
    BadRequest,
    Unauthorized,
    NotFound,
    Internal,
}

impl From<sqlx::Error> for AppError {
    fn from(_: sqlx::Error) -> Self { AppError::Internal }
}

impl From<validator::ValidationErrors> for AppError {
    fn from(_: validator::ValidationErrors) -> Self { AppError::BadRequest }
}

impl<'r> Responder<'r, 'static> for AppError {
    fn respond_to(self, _req: &'r Request<'_>) -> ResponseResult<'static> {
        let status = match self {
            AppError::BadRequest => Status::BadRequest,
            AppError::Unauthorized => Status::Unauthorized,
            AppError::NotFound => Status::NotFound,
            AppError::Internal => Status::InternalServerError,
        };
        Err(status)
    }
}


