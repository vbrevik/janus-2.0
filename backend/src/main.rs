#[macro_use] extern crate rocket;

mod auth;
mod personnel;
mod vendors;
mod access;
mod audit;
mod shared;

use rocket::serde::json::Json;
use rocket::http::Method;
use rocket_cors::{AllowedOrigins, CorsOptions};
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

    // Configure CORS
    let cors = CorsOptions::default()
        .allowed_origins(AllowedOrigins::all())
        .allowed_methods(
            vec![Method::Get, Method::Post, Method::Put, Method::Delete, Method::Options]
                .into_iter()
                .map(From::from)
                .collect(),
        )
        .allow_credentials(true)
        .to_cors()
        .expect("Failed to create CORS fairing");

    println!("✅ CORS configured");

    rocket::build()
        .configure(rocket::Config::figment().merge(("port", 15520)))
        .manage(db_pool)
        .manage(jwt_secret)
        .attach(cors)
        .mount("/", routes![
            index,
            health,
            auth::handlers::login,
            auth::handlers::get_profile,
            auth::handlers::change_password,
            shared::handlers::get_stats,
            personnel::handlers::list_personnel,
            personnel::handlers::get_personnel,
            personnel::handlers::create_personnel,
            personnel::handlers::update_personnel,
            personnel::handlers::delete_personnel,
            vendors::handlers::list_vendors,
            vendors::handlers::get_vendor,
            vendors::handlers::create_vendor,
            vendors::handlers::update_vendor,
            vendors::handlers::delete_vendor,
            audit::handlers::list_audit_logs,
            access::handlers::grant_computer_access,
            access::handlers::grant_data_access,
            access::handlers::grant_physical_access,
            access::handlers::list_personnel_access,
            access::handlers::revoke_access,
        ])
}
