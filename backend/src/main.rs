#[macro_use]
extern crate rocket;

mod access;
mod audit;
mod auth;
mod digital_resources;
mod discussions;
mod document_references;
mod info_systems;
mod messaging;
mod nda;
mod organizations;
mod person;
mod relations;
mod roles;
mod shared;
mod vendor_relations;

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
        port: 8000,
        database: "connected".to_string(),
    })
}

// Use rocket setup from shared module
use shared::rocket_setup::create_rocket;

#[launch]
async fn rocket() -> _ {
    create_rocket().await
}
