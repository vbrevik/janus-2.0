// Digital-resource HTTP handlers — STUB (Phase 11, Plan 02).
//
// Plan 03 replaces these with the real read/issue handlers. For now they exist
// only so `mod.rs::routes()` references valid fn names and the crate compiles.
// Each returns 501 Not Implemented.
use rocket::http::Status;
use rocket::{get, post};

#[get("/world")]
pub async fn get_world() -> Status {
    Status::NotImplemented
}

#[post("/grants")]
pub async fn issue_grant() -> Status {
    Status::NotImplemented
}

#[post("/delegates")]
pub async fn issue_delegate() -> Status {
    Status::NotImplemented
}
