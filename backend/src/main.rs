#[macro_use] extern crate rocket;

mod auth;
mod person;
mod organizations;
mod vendor_relations;
mod relations;
mod access;
mod audit;
mod shared;
mod info_systems;
mod roles;
mod nda;
mod discussions;
mod document_references;
mod messaging;

use rocket::serde::json::Json;
use serde::Serialize;

#[derive(Serialize)]
struct HealthResponse {
    status: String,
    version: String,
    port: u16,
    database: String,
}

#[get("/")]
fn index() -> &'static str {
    "Janus 2.0 API - Welcome"
}

#[get("/api/health")]
fn health() -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "healthy".to_string(),
        version: "2.0.0".to_string(),
        port: 15520,
        database: "connected".to_string(),
    })
}

// Use rocket setup from shared module
use shared::rocket_setup::create_rocket;

#[launch]
async fn rocket() -> _ {
    create_rocket().await
}
