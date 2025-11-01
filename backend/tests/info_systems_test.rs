// Integration tests for Info Systems endpoints
use rocket::http::{ContentType, Header, Status};
use rocket::local::asynchronous::Client;
use serde_json::{json, Value};

// Use the shared rocket_setup module
// In integration tests, we can access the crate modules
use janus_backend::shared::rocket_setup::create_rocket;

// Helper function to create test client
async fn create_test_client() -> Client {
    Client::tracked(create_rocket().await)
        .await
        .expect("valid rocket instance")
}

// Helper function to get auth token for testing
async fn get_auth_token(client: &Client) -> String {
    let response = client
        .post("/api/auth/login")
        .header(ContentType::JSON)
        .body(json!({
            "username": "admin",
            "password": "password123"
        }).to_string())
        .dispatch()
        .await;

    assert_eq!(response.status(), Status::Ok);
    
    let body: Value = response.into_json().await.expect("valid json");
    body["token"].as_str().unwrap().to_string()
}

// Helper to create Authorization header
fn auth_header(token: &str) -> Header<'static> {
    Header::new("Authorization", format!("Bearer {}", token))
}

#[rocket::async_test]
async fn test_list_info_systems() {
    let client = create_test_client().await;
    let token = get_auth_token(&client).await;

    let response = client
        .get("/api/info-systems?page=1&per_page=20")
        .header(auth_header(&token))
        .dispatch()
        .await;

    assert_eq!(response.status(), Status::Ok);
    
    let body: Value = response.into_json().await.expect("valid json");
    assert!(body["items"].is_array());
    assert!(body["total"].is_number());
    assert!(body["page"].as_i64().unwrap() == 1);
    assert!(body["per_page"].as_i64().unwrap() == 20);
}

#[rocket::async_test]
async fn test_list_info_systems_pagination() {
    let client = create_test_client().await;
    let token = get_auth_token(&client).await;

    // Test first page
    let response = client
        .get("/api/info-systems?page=1&per_page=2")
        .header(auth_header(&token))
        .dispatch()
        .await;

    assert_eq!(response.status(), Status::Ok);
    let body: Value = response.into_json().await.expect("valid json");
    let items = body["items"].as_array().unwrap();
    assert!(items.len() <= 2);

    // Test second page
    let response = client
        .get("/api/info-systems?page=2&per_page=2")
        .header(auth_header(&token))
        .dispatch()
        .await;

    assert_eq!(response.status(), Status::Ok);
    let body: Value = response.into_json().await.expect("valid json");
    assert!(body["page"].as_i64().unwrap() == 2);
}

#[rocket::async_test]
async fn test_get_info_system_by_id() {
    let client = create_test_client().await;
    let token = get_auth_token(&client).await;

    // First, create a system to get its ID
    let create_response = client
        .post("/api/info-systems")
        .header(ContentType::JSON)
        .header(auth_header(&token))
        .body(json!({
            "system_name": "Test System Get",
            "description": "Test system for GET test",
            "environment": "DEV",
            "status": "ACTIVE"
        }).to_string())
        .dispatch()
        .await;

    assert_eq!(create_response.status(), Status::Ok);
    let created: Value = create_response.into_json().await.expect("valid json");
    let system_id = created["id"].as_i64().unwrap();

    // Now get it by ID
    let response = client
        .get(format!("/api/info-systems/{}", system_id))
        .header(auth_header(&token))
        .dispatch()
        .await;

    assert_eq!(response.status(), Status::Ok);
    
    let body: Value = response.into_json().await.expect("valid json");
    assert_eq!(body["id"].as_i64().unwrap(), system_id);
    assert_eq!(body["system_name"].as_str().unwrap(), "Test System Get");
    assert_eq!(body["environment"].as_str().unwrap(), "DEV");
    assert_eq!(body["status"].as_str().unwrap(), "ACTIVE");
}

#[rocket::async_test]
async fn test_get_info_system_not_found() {
    let client = create_test_client().await;
    let token = get_auth_token(&client).await;

    let response = client
        .get("/api/info-systems/99999")
        .header(auth_header(&token))
        .dispatch()
        .await;

    assert_eq!(response.status(), Status::NotFound);
}

#[rocket::async_test]
async fn test_create_info_system() {
    let client = create_test_client().await;
    let token = get_auth_token(&client).await;

    let response = client
        .post("/api/info-systems")
        .header(ContentType::JSON)
        .header(auth_header(&token))
        .body(json!({
            "system_name": "Test System Create",
            "description": "Test system for CREATE test",
            "environment": "PROD",
            "status": "ACTIVE",
            "ip_address": "192.168.1.100",
            "domain": "test.example.com",
            "managed_by": "IT Operations",
            "last_audit_date": "2024-01-15"
        }).to_string())
        .dispatch()
        .await;

    assert_eq!(response.status(), Status::Ok);
    
    let body: Value = response.into_json().await.expect("valid json");
    assert!(body["id"].is_number());
    assert_eq!(body["system_name"].as_str().unwrap(), "Test System Create");
    assert_eq!(body["environment"].as_str().unwrap(), "PROD");
    assert_eq!(body["status"].as_str().unwrap(), "ACTIVE");
    assert_eq!(body["ip_address"].as_str().unwrap(), "192.168.1.100");
    assert_eq!(body["domain"].as_str().unwrap(), "test.example.com");
    assert_eq!(body["managed_by"].as_str().unwrap(), "IT Operations");
    assert_eq!(body["last_audit_date"].as_str().unwrap(), "2024-01-15");
    assert!(body["created_at"].is_string());
    assert!(body["updated_at"].is_string());
}

#[rocket::async_test]
async fn test_create_info_system_validation_error_empty_name() {
    let client = create_test_client().await;
    let token = get_auth_token(&client).await;

    let response = client
        .post("/api/info-systems")
        .header(ContentType::JSON)
        .header(auth_header(&token))
        .body(json!({
            "system_name": "",  // Invalid: empty name
            "environment": "PROD",
            "status": "ACTIVE"
        }).to_string())
        .dispatch()
        .await;

    assert_eq!(response.status(), Status::BadRequest);
}

#[rocket::async_test]
async fn test_create_info_system_validation_error_invalid_environment() {
    let client = create_test_client().await;
    let token = get_auth_token(&client).await;

    let response = client
        .post("/api/info-systems")
        .header(ContentType::JSON)
        .header(auth_header(&token))
        .body(json!({
            "system_name": "Test System",
            "environment": "INVALID",  // Invalid environment
            "status": "ACTIVE"
        }).to_string())
        .dispatch()
        .await;

    assert_eq!(response.status(), Status::BadRequest);
}

#[rocket::async_test]
async fn test_create_info_system_validation_error_invalid_status() {
    let client = create_test_client().await;
    let token = get_auth_token(&client).await;

    let response = client
        .post("/api/info-systems")
        .header(ContentType::JSON)
        .header(auth_header(&token))
        .body(json!({
            "system_name": "Test System",
            "environment": "PROD",
            "status": "INVALID"  // Invalid status
        }).to_string())
        .dispatch()
        .await;

    assert_eq!(response.status(), Status::BadRequest);
}

#[rocket::async_test]
async fn test_create_info_system_invalid_date_format() {
    let client = create_test_client().await;
    let token = get_auth_token(&client).await;

    let response = client
        .post("/api/info-systems")
        .header(ContentType::JSON)
        .header(auth_header(&token))
        .body(json!({
            "system_name": "Test System",
            "environment": "PROD",
            "status": "ACTIVE",
            "last_audit_date": "2024-13-45"  // Invalid date format
        }).to_string())
        .dispatch()
        .await;

    assert_eq!(response.status(), Status::BadRequest);
}

#[rocket::async_test]
async fn test_update_info_system() {
    let client = create_test_client().await;
    let token = get_auth_token(&client).await;

    // First, create a system
    let create_response = client
        .post("/api/info-systems")
        .header(ContentType::JSON)
        .header(auth_header(&token))
        .body(json!({
            "system_name": "Test System Update",
            "environment": "DEV",
            "status": "ACTIVE"
        }).to_string())
        .dispatch()
        .await;

    assert_eq!(create_response.status(), Status::Ok);
    let created: Value = create_response.into_json().await.expect("valid json");
    let system_id = created["id"].as_i64().unwrap();

    // Update the system
    let response = client
        .put(format!("/api/info-systems/{}", system_id))
        .header(ContentType::JSON)
        .header(auth_header(&token))
        .body(json!({
            "system_name": "Updated System Name",
            "status": "MAINTENANCE",
            "managed_by": "Security Team"
        }).to_string())
        .dispatch()
        .await;

    assert_eq!(response.status(), Status::Ok);
    
    let body: Value = response.into_json().await.expect("valid json");
    assert_eq!(body["id"].as_i64().unwrap(), system_id);
    assert_eq!(body["system_name"].as_str().unwrap(), "Updated System Name");
    assert_eq!(body["status"].as_str().unwrap(), "MAINTENANCE");
    assert_eq!(body["managed_by"].as_str().unwrap(), "Security Team");
    // Environment should remain unchanged
    assert_eq!(body["environment"].as_str().unwrap(), "DEV");
}

#[rocket::async_test]
async fn test_update_info_system_partial() {
    let client = create_test_client().await;
    let token = get_auth_token(&client).await;

    // Create a system
    let create_response = client
        .post("/api/info-systems")
        .header(ContentType::JSON)
        .header(auth_header(&token))
        .body(json!({
            "system_name": "Test System Partial",
            "environment": "PROD",
            "status": "ACTIVE",
            "ip_address": "10.0.0.1"
        }).to_string())
        .dispatch()
        .await;

    assert_eq!(create_response.status(), Status::Ok);
    let created: Value = create_response.into_json().await.expect("valid json");
    let system_id = created["id"].as_i64().unwrap();

    // Update only status
    let response = client
        .put(format!("/api/info-systems/{}", system_id))
        .header(ContentType::JSON)
        .header(auth_header(&token))
        .body(json!({
            "status": "INACTIVE"
        }).to_string())
        .dispatch()
        .await;

    assert_eq!(response.status(), Status::Ok);
    
    let body: Value = response.into_json().await.expect("valid json");
    assert_eq!(body["status"].as_str().unwrap(), "INACTIVE");
    // Other fields should remain unchanged
    assert_eq!(body["system_name"].as_str().unwrap(), "Test System Partial");
    assert_eq!(body["environment"].as_str().unwrap(), "PROD");
    assert_eq!(body["ip_address"].as_str().unwrap(), "10.0.0.1");
}

#[rocket::async_test]
async fn test_update_info_system_not_found() {
    let client = create_test_client().await;
    let token = get_auth_token(&client).await;

    let response = client
        .put("/api/info-systems/99999")
        .header(ContentType::JSON)
        .header(auth_header(&token))
        .body(json!({
            "status": "ACTIVE"
        }).to_string())
        .dispatch()
        .await;

    assert_eq!(response.status(), Status::NotFound);
}

#[rocket::async_test]
async fn test_update_info_system_validation_error() {
    let client = create_test_client().await;
    let token = get_auth_token(&client).await;

    // Create a system first
    let create_response = client
        .post("/api/info-systems")
        .header(ContentType::JSON)
        .header(auth_header(&token))
        .body(json!({
            "system_name": "Test System",
            "environment": "PROD",
            "status": "ACTIVE"
        }).to_string())
        .dispatch()
        .await;

    assert_eq!(create_response.status(), Status::Ok);
    let created: Value = create_response.into_json().await.expect("valid json");
    let system_id = created["id"].as_i64().unwrap();

    // Try to update with invalid status
    let response = client
        .put(format!("/api/info-systems/{}", system_id))
        .header(ContentType::JSON)
        .header(auth_header(&token))
        .body(json!({
            "status": "INVALID_STATUS"
        }).to_string())
        .dispatch()
        .await;

    assert_eq!(response.status(), Status::BadRequest);
}

#[rocket::async_test]
async fn test_delete_info_system() {
    let client = create_test_client().await;
    let token = get_auth_token(&client).await;

    // Create a system
    let create_response = client
        .post("/api/info-systems")
        .header(ContentType::JSON)
        .header(auth_header(&token))
        .body(json!({
            "system_name": "Test System Delete",
            "environment": "TEST",
            "status": "ACTIVE"
        }).to_string())
        .dispatch()
        .await;

    assert_eq!(create_response.status(), Status::Ok);
    let created: Value = create_response.into_json().await.expect("valid json");
    let system_id = created["id"].as_i64().unwrap();

    // Delete it
    let response = client
        .delete(format!("/api/info-systems/{}", system_id))
        .header(auth_header(&token))
        .dispatch()
        .await;

    assert_eq!(response.status(), Status::NoContent);

    // Verify it's deleted
    let get_response = client
        .get(format!("/api/info-systems/{}", system_id))
        .header(auth_header(&token))
        .dispatch()
        .await;

    assert_eq!(get_response.status(), Status::NotFound);
}

#[rocket::async_test]
async fn test_delete_info_system_not_found() {
    let client = create_test_client().await;
    let token = get_auth_token(&client).await;

    let response = client
        .delete("/api/info-systems/99999")
        .header(auth_header(&token))
        .dispatch()
        .await;

    assert_eq!(response.status(), Status::NotFound);
}
