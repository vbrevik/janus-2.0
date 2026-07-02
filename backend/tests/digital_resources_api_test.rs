// Integration tests for digital-resource endpoints (Phase 11, Plan 03 — RSRC-BE-03/04).
//
// Authorization model = Option B (role-based). Write endpoints (POST /grants,
// POST /delegates) are ADMIN-only: the authorizing identity is derived from the
// AuthGuard/JWT `role`, NEVER from the org fields in the request body. This is
// the regression guard for the 8ea8948 IDOR, where authority was read from the
// client-supplied actor_org_id / granted_by_org_id.
//
// Test map:
//   (b)  GET  /world      — 401 without Authorization header          [no DB]
//   (c)  POST /grants     — 403 for a non-ADMIN principal (viewer)    [DB: login]
//   (d)  POST /delegates  — 403 for a non-ADMIN principal (viewer)    [DB: login]
//   (e)  POST /grants     — ADMIN passes the role gate; unknown        [DB: login]
//        resource then 404 (proves gate passed without seed data)
//   (a)  GET  /world      — 200 + seeded counts                        [DB: seed]
//   (f)  POST /grants     — 200 for ADMIN on a seeded resource         [DB: seed]
//   (g)  POST /grants     — idempotent (exactly one row on duplicate)  [DB: seed]
//
// DB-gated tests are #[ignore] so `cargo test` passes without a live DB. Tests
// (c)/(d)/(e) need only the seeded person table (for login) — no resource seed.
// Tests (a)/(f)/(g) additionally need the seed migration applied.
// Run with: cargo test --test digital_resources_api_test -- --include-ignored

use rocket::http::{ContentType, Header, Status};
use rocket::local::asynchronous::Client;
use serde_json::{json, Value};

use janus_backend::shared::rocket_setup::create_rocket;

// ---------------------------------------------------------------------------
// Test harness helpers
// ---------------------------------------------------------------------------

async fn create_test_client() -> Client {
    Client::tracked(create_rocket().await)
        .await
        .expect("valid rocket instance")
}

// Log in as a seed user and return the bearer token. `admin` yields an ADMIN
// role JWT; `viewer`/`manager`/`operator` yield non-ADMIN roles.
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

// A well-formed grant request body. actor_org_id is a required field of
// IssueGrantRequest but is IGNORED by the role-based authz — its value must
// never affect the outcome.
fn grant_body(resource_id: &str, person_id: &str) -> String {
    json!({
        "resource_id": resource_id,
        "person_id": person_id,
        "actor_org_id": "ANY_ORG_IS_IGNORED",
        "valid_from": null,
        "valid_until": null,
    })
    .to_string()
}

// ---------------------------------------------------------------------------
// (b) Unauthenticated GET returns 401 — no DB required
// ---------------------------------------------------------------------------
#[rocket::async_test]
async fn test_get_world_unauthenticated() {
    let client = create_test_client().await;

    let response = client.get("/api/digital-resources/world").dispatch().await;

    assert_eq!(
        response.status(),
        Status::Unauthorized,
        "unauthenticated GET /world must return 401"
    );
}

// ---------------------------------------------------------------------------
// (c) POST /grants — 403 for a non-ADMIN principal (IDOR regression guard)
// ---------------------------------------------------------------------------
//
// A `viewer` is authenticated (valid JWT) but not ADMIN. The role gate must
// reject with 403 BEFORE any resource lookup — so no resource seed is needed,
// and no org value in the body can grant authority.
#[rocket::async_test]
#[ignore] // requires live DB for login (person table seeded)
async fn test_issue_grant_non_admin_403() {
    let client = create_test_client().await;
    let token = login(&client, "viewer").await;

    let response = client
        .post("/api/digital-resources/grants")
        .header(auth_header(&token))
        .header(ContentType::JSON)
        .body(grant_body("rsrc-anything", "subj-1"))
        .dispatch()
        .await;

    assert_eq!(
        response.status(),
        Status::Forbidden,
        "non-ADMIN principal must receive 403 regardless of body org"
    );
}

// ---------------------------------------------------------------------------
// (d) POST /delegates — 403 for a non-ADMIN principal
// ---------------------------------------------------------------------------
#[rocket::async_test]
#[ignore] // requires live DB for login
async fn test_issue_delegate_non_admin_403() {
    let client = create_test_client().await;
    let token = login(&client, "viewer").await;

    let response = client
        .post("/api/digital-resources/delegates")
        .header(auth_header(&token))
        .header(ContentType::JSON)
        .body(
            json!({
                "resource_id": "rsrc-anything",
                "delegate_type": "ORG",
                "delegate_person_id": null,
                "delegate_org_id": "SOME_ORG",
                "granted_by_org_id": "ANY_ORG_IS_IGNORED",
                "valid_from": null,
                "valid_until": null,
            })
            .to_string(),
        )
        .dispatch()
        .await;

    assert_eq!(
        response.status(),
        Status::Forbidden,
        "non-ADMIN principal must receive 403 on delegates"
    );
}

// ---------------------------------------------------------------------------
// (e) POST /grants — ADMIN passes the role gate (404 on unknown resource)
// ---------------------------------------------------------------------------
//
// An ADMIN clears the role gate, then hits the existence check. Against a DB
// with no matching resource, that yields 404 — which proves the gate PASSED
// (a 403 here would mean the gate wrongly rejected an admin). Needs no seed.
#[rocket::async_test]
#[ignore] // requires live DB for login
async fn test_issue_grant_admin_unknown_resource_404() {
    let client = create_test_client().await;
    let token = login(&client, "admin").await;

    let response = client
        .post("/api/digital-resources/grants")
        .header(auth_header(&token))
        .header(ContentType::JSON)
        .body(grant_body("rsrc-does-not-exist", "subj-1"))
        .dispatch()
        .await;

    assert_eq!(
        response.status(),
        Status::NotFound,
        "ADMIN must clear the role gate and reach the existence check (404), not 403"
    );
}

// ---------------------------------------------------------------------------
// (a) Authenticated GET returns 200 with seeded dataset
// ---------------------------------------------------------------------------
#[rocket::async_test]
#[ignore] // requires live DB WITH seed migration applied
async fn test_get_world_authenticated() {
    let client = create_test_client().await;
    let token = login(&client, "admin").await;

    let response = client
        .get("/api/digital-resources/world")
        .header(auth_header(&token))
        .dispatch()
        .await;

    assert_eq!(response.status(), Status::Ok);

    let body: Value = response.into_json().await.expect("valid json");
    assert!(body["success"].as_bool().unwrap_or(false), "success flag");
    let data = &body["data"];

    // Verify the seeded counts match the seed migration (6/4/4/18/18/3/15/1).
    assert_eq!(data["networks"].as_array().unwrap().len(), 6, "6 networks");
    assert_eq!(
        data["platforms"].as_array().unwrap().len(),
        4,
        "4 platforms"
    );
    assert_eq!(data["applications"].as_array().unwrap().len(), 4, "4 apps");
    assert_eq!(data["grants"].as_array().unwrap().len(), 18, "18 grants");
    assert_eq!(data["org_links"].as_array().unwrap().len(), 18, "18 links");
    assert_eq!(data["policies"].as_array().unwrap().len(), 3, "3 policies");
    assert_eq!(
        data["policy_assignments"].as_array().unwrap().len(),
        15,
        "15 policy_assignments"
    );
    assert_eq!(data["delegates"].as_array().unwrap().len(), 1, "1 delegate");
}

// ---------------------------------------------------------------------------
// (f) POST /grants — 200 for an ADMIN on a seeded resource
// ---------------------------------------------------------------------------
#[rocket::async_test]
#[ignore] // requires live DB WITH seed migration applied
async fn test_issue_grant_admin_200() {
    let client = create_test_client().await;
    let token = login(&client, "admin").await;

    let response = client
        .post("/api/digital-resources/grants")
        .header(auth_header(&token))
        .header(ContentType::JSON)
        .body(grant_body("rsrc-homeguard", "test-person-authorized"))
        .dispatch()
        .await;

    assert_eq!(response.status(), Status::Ok, "ADMIN must receive 200");

    let body: Value = response.into_json().await.expect("valid json");
    assert!(body["success"].as_bool().unwrap_or(false));
    assert_eq!(
        body["data"]["resource_id"].as_str().unwrap(),
        "rsrc-homeguard"
    );
    assert_eq!(
        body["data"]["person_id"].as_str().unwrap(),
        "test-person-authorized"
    );
}

// ---------------------------------------------------------------------------
// (g) Duplicate issue creates exactly one row
// ---------------------------------------------------------------------------
#[rocket::async_test]
#[ignore] // requires live DB WITH seed migration applied
async fn test_issue_grant_idempotent() {
    let client = create_test_client().await;
    let token = login(&client, "admin").await;

    let body = grant_body("rsrc-homeguard", "test-person-idempotent");

    let r1 = client
        .post("/api/digital-resources/grants")
        .header(auth_header(&token))
        .header(ContentType::JSON)
        .body(body.clone())
        .dispatch()
        .await;
    assert_eq!(r1.status(), Status::Ok, "first issue must return 200");

    let r2 = client
        .post("/api/digital-resources/grants")
        .header(auth_header(&token))
        .header(ContentType::JSON)
        .body(body)
        .dispatch()
        .await;
    assert_eq!(
        r2.status(),
        Status::Ok,
        "duplicate issue must also return 200"
    );

    let world_resp = client
        .get("/api/digital-resources/world")
        .header(auth_header(&token))
        .dispatch()
        .await;
    assert_eq!(world_resp.status(), Status::Ok);
    let world: Value = world_resp.into_json().await.expect("valid json");
    let grants = world["data"]["grants"].as_array().expect("grants array");
    let matching = grants
        .iter()
        .filter(|g| {
            g["person_id"].as_str() == Some("test-person-idempotent")
                && g["resource_id"].as_str() == Some("rsrc-homeguard")
        })
        .count();
    assert_eq!(matching, 1, "duplicate issue must not create a second row");
}
