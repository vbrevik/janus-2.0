// Rocket setup for main and tests
use rocket::http::Method;
use rocket_cors::{AllowedOrigins, CorsOptions};
use sqlx::postgres::PgPoolOptions;
use std::env;

// Import all needed modules - these must be available when compiled as lib
use crate::{
    auth, audit, access, info_systems, person, roles, organizations, vendor_relations, relations,
    discussions, document_references, nda, shared, messaging
};

pub async fn create_rocket() -> rocket::Rocket<rocket::Build> {
    // Load environment variables
    dotenvy::dotenv().ok();

    // Get database URL (with test fallback)
    let database_url = env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgresql://janus:janus_dev_password@localhost:15530/janus2".to_string());

    // Get JWT secret (with test fallback)
    let jwt_secret = env::var("JWT_SECRET")
        .unwrap_or_else(|_| "test-secret-key-must-be-at-least-32-characters-long".to_string());

    // Create database connection pool
    let db_pool = PgPoolOptions::new()
        .max_connections(10)
        .connect(&database_url)
        .await
        .expect("Failed to create database pool");

    // Create WebSocket manager
    let ws_manager = messaging::websocket::WebSocketManager::new();
    
    // Start WebSocket server on separate port (15540)
    let ws_addr = "0.0.0.0:15540".parse().expect("Invalid WebSocket address");
    let ws_manager_clone = ws_manager.clone();
    let jwt_secret_clone = jwt_secret.clone();
    let db_pool_clone = db_pool.clone();
    tokio::spawn(async move {
        if let Err(e) = messaging::handlers::start_websocket_server(
            ws_addr,
            jwt_secret_clone,
            ws_manager_clone,
            db_pool_clone,
        ).await {
            eprintln!("Failed to start WebSocket server: {}", e);
        }
    });

    if cfg!(not(test)) {
        println!("✅ Database connected");
        println!("✅ JWT secret loaded");
    }

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

    if cfg!(not(test)) {
        println!("✅ CORS configured");
    }

    rocket::build()
        .configure(rocket::Config::figment().merge(("port", 15520)))
        .manage(db_pool)
        .manage(jwt_secret)
        .manage(ws_manager.clone())
        .attach(cors)
        .mount("/", rocket::routes![
            crate::index,
            crate::health,
            auth::handlers::login,
            auth::handlers::get_profile,
            auth::handlers::change_password,
            shared::handlers::get_stats,
            vendor_relations::handlers::list_vendor_relations,
            vendor_relations::handlers::create_vendor_relation,
            vendor_relations::handlers::get_vendor_hierarchy,
            vendor_relations::handlers::delete_vendor_relation,
            audit::handlers::list_audit_logs,
            access::handlers::grant_computer_access,
            access::handlers::grant_data_access,
            access::handlers::grant_physical_access,
            access::handlers::list_person_access,
            access::handlers::revoke_access,
            info_systems::handlers::list_info_systems,
            info_systems::handlers::get_info_system,
            info_systems::handlers::create_info_system,
            info_systems::handlers::update_info_system,
            info_systems::handlers::delete_info_system,
        ])
        .mount("/api/roles", roles::routes())
        .mount("/api/person", person::routes())
        .mount("/api/organizations", organizations::routes())
        .mount("/api/nda", nda::routes())
        .mount("/api/discussions", discussions::routes())
        .mount("/api/document-references", document_references::routes())
        .mount("/api", relations::routes())
}

