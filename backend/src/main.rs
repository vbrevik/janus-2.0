#[macro_use] extern crate rocket;

mod auth;
mod personnel;
mod vendors;
mod access;
mod audit;
mod shared;

use rocket::serde::json::Json;
use serde::Serialize;

#[derive(Serialize)]
struct HealthResponse {
    status: String,
    version: String,
    port: u16,
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
    })
}

#[launch]
fn rocket() -> _ {
    rocket::build()
        .configure(rocket::Config::figment().merge(("port", 15520)))
        .mount("/", routes![index, health])
}
