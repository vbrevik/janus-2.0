#[macro_use] extern crate rocket;

mod auth;
mod personnel;
mod vendors;
mod access;
mod audit;
mod shared;

use rocket::serde::json::Json;
use serde::Serialize;
use sqlx::postgres::PgPoolOptions;
use std::env;

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

#[launch]
async fn rocket() -> _ {
    // Load environment variables
    dotenvy::dotenv().ok();

    // Get database URL
    let database_url = env::var("DATABASE_URL")
        .expect("DATABASE_URL must be set");

    // Get JWT secret
    let jwt_secret = env::var("JWT_SECRET")
        .expect("JWT_SECRET must be set");

    // Create database connection pool
    let db_pool = PgPoolOptions::new()
        .max_connections(10)
        .connect(&database_url)
        .await
        .expect("Failed to create database pool");

    println!("✅ Database connected");
    println!("✅ JWT secret loaded");

    rocket::build()
        .configure(rocket::Config::figment().merge(("port", 15520)))
        .manage(db_pool)
        .manage(jwt_secret)
        .mount("/", routes![
            index,
            health,
            auth::handlers::login,
            personnel::handlers::list_personnel,
            personnel::handlers::get_personnel,
        ])
}
