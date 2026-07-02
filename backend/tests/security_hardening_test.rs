// Security hardening integration tests (Phase 11, Plan 04 — SEC-01..04).
//
// Test map:
//   SEC-03  validate_jwt_secret rejects unset/empty/whitespace secrets   [no DB]
//   SEC-01  GET /api/vendors/<id>/relations without a token -> 401      [DB: conn]
//   SEC-04  CORS preflight: dev origin granted, foreign origin not      [DB: conn]
//   SEC-02  viewer  DELETE /api/access/... -> 403 (not 500)             [DB: login]
//   SEC-02  manager DELETE /api/access/... -> 403 (no access.write)     [DB: login]
//   SEC-02  admin   DELETE /api/access/bogus/1 -> 400 (gate PASSED;     [DB: login]
//           the invalid access_type check is only reachable past the gate)
//
// create_rocket() connects a PgPool, so every client-based test needs the dev
// DB reachable; login-dependent tests are #[ignore] per repo convention.
// JWT_SECRET comes from backend/.env via dotenvy (startup now aborts without it).
// Run all with: cargo test --test security_hardening_test -- --include-ignored

use rocket::http::{ContentType, Header, Status};
use rocket::local::asynchronous::Client;
use serde_json::{json, Value};

use janus_backend::shared::rocket_setup::{create_rocket, validate_jwt_secret};

// ---------------------------------------------------------------------------
// Test harness helpers (same shape as digital_resources_api_test.rs)
// ---------------------------------------------------------------------------

async fn create_test_client() -> Client {
    Client::tracked(create_rocket().await)
        .await
        .expect("valid rocket instance")
}

async fn login(client: &Client, username: &str) -> String {
    let response = client
        .post("/api/auth/login")
        .header(ContentType::JSON)
        .body(json!({ "username": username, "password": "password123" }).to_string())
        .dispatch()
        .await;

    assert_eq!(
        response.status(),
        Status::Ok,
        "login must succeed for {username}"
    );
    let body: Value = response.into_json().await.expect("valid json");
    body["token"].as_str().expect("token field").to_string()
}

fn auth_header(token: &str) -> Header<'static> {
    Header::new("Authorization", format!("Bearer {}", token))
}

// ---------------------------------------------------------------------------
// SEC-03: JWT secret fail-loud — unset, empty, and whitespace-only all reject
// ---------------------------------------------------------------------------
//
// create_rocket() aborts the process (exit 1) when read_jwt_secret() errs, so
// the abort condition is asserted through the extracted pure helper instead of
// spawning a process. No env manipulation: the helper takes the value directly.

#[test]
fn test_jwt_secret_unset_rejected() {
    assert!(
        validate_jwt_secret(None).is_err(),
        "unset JWT_SECRET must be rejected"
    );
}

#[test]
fn test_jwt_secret_empty_rejected() {
    assert!(
        validate_jwt_secret(Some(String::new())).is_err(),
        "empty JWT_SECRET must be rejected"
    );
}

#[test]
fn test_jwt_secret_whitespace_rejected() {
    assert!(
        validate_jwt_secret(Some("   ".to_string())).is_err(),
        "whitespace-only JWT_SECRET must be rejected"
    );
}

#[test]
fn test_jwt_secret_nonempty_accepted() {
    let secret = "a-real-secret-value".to_string();
    assert_eq!(
        validate_jwt_secret(Some(secret.clone())).as_deref(),
        Ok(secret.as_str()),
        "a non-empty JWT_SECRET must be accepted unchanged"
    );
}

// ---------------------------------------------------------------------------
// SEC-01: unauthenticated request to vendor_relations is rejected
// ---------------------------------------------------------------------------

#[rocket::async_test]
async fn test_vendor_relations_unauthenticated_401() {
    let client = create_test_client().await;

    let response = client.get("/api/vendors/1/relations").dispatch().await;

    assert_eq!(
        response.status(),
        Status::Unauthorized,
        "unauthenticated GET /api/vendors/<id>/relations must return 401"
    );
}

#[rocket::async_test]
async fn test_vendor_relations_delete_unauthenticated_401() {
    let client = create_test_client().await;

    let response = client.delete("/api/vendors/relations/1").dispatch().await;

    assert_eq!(
        response.status(),
        Status::Unauthorized,
        "unauthenticated DELETE /api/vendors/relations/<id> must return 401"
    );
}

// ---------------------------------------------------------------------------
// SEC-04: CORS — dev origin granted, foreign origin not granted
// ---------------------------------------------------------------------------

#[rocket::async_test]
async fn test_cors_dev_origin_granted() {
    let client = create_test_client().await;

    let response = client
        .options("/api/auth/login")
        .header(Header::new("Origin", "http://localhost:15510"))
        .header(Header::new("Access-Control-Request-Method", "POST"))
        .dispatch()
        .await;

    let acao = response
        .headers()
        .get_one("Access-Control-Allow-Origin")
        .map(str::to_string);
    assert_eq!(
        acao.as_deref(),
        Some("http://localhost:15510"),
        "preflight from the dev origin must be granted CORS access"
    );
    let creds = response
        .headers()
        .get_one("Access-Control-Allow-Credentials")
        .map(str::to_string);
    assert_eq!(
        creds.as_deref(),
        Some("true"),
        "allow_credentials(true) must be retained for the dev origin"
    );
}

#[rocket::async_test]
async fn test_cors_foreign_origin_not_granted() {
    let client = create_test_client().await;

    let response = client
        .options("/api/auth/login")
        .header(Header::new("Origin", "http://evil.example"))
        .header(Header::new("Access-Control-Request-Method", "POST"))
        .dispatch()
        .await;

    let acao = response
        .headers()
        .get_one("Access-Control-Allow-Origin")
        .map(str::to_string);
    assert_eq!(
        acao, None,
        "a foreign origin must NOT receive Access-Control-Allow-Origin"
    );
}

// ---------------------------------------------------------------------------
// SEC-02: authenticated-but-unauthorized role gets 403 (never 500);
//         an authorized role clears the permission gate
// ---------------------------------------------------------------------------
//
// Endpoint under test: DELETE /api/access/<access_type>/<id> (access.write).
// The invalid access_type "bogus" makes the admin case side-effect free: 400
// (BadRequest) is only reachable AFTER the permission gate, so 400 proves the
// gate passed while 403 proves it rejected.

#[rocket::async_test]
#[ignore] // requires live DB for login (person table seeded)
async fn test_guarded_write_viewer_403_not_500() {
    let client = create_test_client().await;
    let token = login(&client, "viewer").await;

    let response = client
        .delete("/api/access/computer/999999")
        .header(auth_header(&token))
        .dispatch()
        .await;

    assert_eq!(
        response.status(),
        Status::Forbidden,
        "viewer (no access.write) must receive 403 — not 500 — on a guarded write"
    );
}

#[rocket::async_test]
#[ignore] // requires live DB for login
async fn test_guarded_write_manager_403_least_privilege() {
    let client = create_test_client().await;
    let token = login(&client, "manager").await;

    let response = client
        .delete("/api/access/computer/999999")
        .header(auth_header(&token))
        .dispatch()
        .await;

    assert_eq!(
        response.status(),
        Status::Forbidden,
        "manager is not granted access.write (least privilege) — must receive 403"
    );
}

#[rocket::async_test]
#[ignore] // requires live DB for login
async fn test_guarded_write_admin_clears_gate() {
    let client = create_test_client().await;
    let token = login(&client, "admin").await;

    let response = client
        .delete("/api/access/bogus/1")
        .header(auth_header(&token))
        .dispatch()
        .await;

    assert_eq!(
        response.status(),
        Status::BadRequest,
        "admin must clear the access.write gate and reach the access_type check (400, not 403)"
    );
}

// A second domain to guard the seeded manager grants: manager HOLDS nda.write,
// so the gate passes and the handler proceeds (side-effect-free: revoking a
// nonexistent NDA id still returns the handler's success path, proving 403
// did not fire for a role that holds the key).
#[rocket::async_test]
#[ignore] // requires live DB for login
async fn test_guarded_write_manager_holds_nda_write() {
    let client = create_test_client().await;
    let token = login(&client, "manager").await;

    let response = client
        .delete("/api/nda/999999")
        .header(auth_header(&token))
        .dispatch()
        .await;

    assert_eq!(
        response.status(),
        Status::Ok,
        "manager holds nda.write — the permission gate must not return 403"
    );
}
