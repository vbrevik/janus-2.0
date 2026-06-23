// Library crate for testing
// Re-export all modules needed for rocket setup

#[macro_use]
extern crate rocket;

pub mod access;
pub mod audit;
pub mod auth;
pub mod digital_resources;
pub mod discussions;
pub mod document_references;
pub mod info_systems;
pub mod messaging;
pub mod nda;
pub mod organizations;
pub mod person;
pub mod relations;
pub mod roles;
pub mod shared;
pub mod vendor_relations;

// Re-export routes and handlers needed for rocket setup
use rocket::serde::json::Json;
use serde::Serialize;

#[derive(Serialize)]
pub struct HealthResponse {
    pub status: String,
    pub version: String,
    pub port: u16,
    pub database: String,
}

#[rocket::get("/")]
pub fn index() -> &'static str {
    "Janus 2.0 API - Welcome"
}

#[rocket::get("/api/health")]
pub fn health() -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "healthy".to_string(),
        version: "2.0.0".to_string(),
        port: 15520,
        database: "connected".to_string(),
    })
}

// Re-export create_rocket for integration tests
pub use shared::rocket_setup::create_rocket;
