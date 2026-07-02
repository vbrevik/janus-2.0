# Phase 11: Digital Resource Backend & Resolver Port — Pattern Map

**Mapped:** 2026-06-19
**Files analyzed:** 9 new/modified files
**Analogs found:** 8 / 9 (resolver.rs is novel for the backend)

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `backend/src/digital_resources/mod.rs` | module | request-response | `backend/src/organizations/mod.rs` | exact |
| `backend/src/digital_resources/models.rs` | model | CRUD | `backend/src/organizations/models.rs` | exact |
| `backend/src/digital_resources/handlers.rs` | controller | request-response | `backend/src/organizations/handlers.rs` | role-match (simpler — fewer write paths) |
| `backend/src/digital_resources/resolver.rs` | utility | transform | — | **no analog** (pure logic module; no precedent in backend) |
| `backend/migrations/YYYYMMDD_create_digital_resource_tables.sql` | migration | batch | `backend/migrations/20251026112330_create_vendors_table.sql` | role-match |
| `backend/migrations/YYYYMMDD_seed_digital_resources.sql` | migration/seed | batch | `backend/migrations/20260601120200_seed_enduser_official_users.sql` | exact |
| `backend/tests/resolver_parity.rs` | test | batch | `backend/tests/nda_test.rs` | partial (nda_test is stub; use `#[test]` fn not `async_test`) |
| `frontend/src/demo/lib/digital-resource-golden-export.test.ts` | test | batch | `frontend/src/demo/lib/digital-resource.test.ts` | role-match |
| `backend/src/shared/rocket_setup.rs` (modified) | config | request-response | itself (existing mount lines 108–114) | exact |

---

## Pattern Assignments

### `backend/src/digital_resources/mod.rs` (module, request-response)

**Analog:** `backend/src/organizations/mod.rs` (lines 1–16)

**Pattern to copy** (entire file is the template):
```rust
// backend/src/organizations/mod.rs lines 1-16
pub mod models;
pub mod handlers;

pub fn routes() -> Vec<rocket::Route> {
    routes![
        handlers::list_organizations,
        handlers::get_organization,
        handlers::create_organization,
        handlers::update_organization,
        handlers::delete_organization,
    ]
}
```

**What to replicate:** Add `pub mod resolver;` alongside `pub mod models; pub mod handlers;`. List only three handlers: `handlers::get_world`, `handlers::issue_grant`, `handlers::issue_delegate`.

**What to avoid:** No extra modules beyond models/handlers/resolver.

---

### `backend/src/digital_resources/models.rs` (model, CRUD)

**Analog:** `backend/src/organizations/models.rs` (lines 1–18)

**Imports + struct pattern** (lines 1–18):
```rust
// backend/src/organizations/models.rs lines 1-18
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Organization {
    pub id: i32,
    pub company_name: String,
    pub contact_name: String,
    pub contact_email: String,
    pub contact_phone: Option<String>,
    pub clearance_level: String,
    pub contract_number: String,
    pub department: Option<String>,
    pub deleted_at: Option<chrono::NaiveDateTime>,
    pub created_at: chrono::NaiveDateTime,
    pub updated_at: chrono::NaiveDateTime,
}
```

**What to replicate:**
- Use `serde::{Deserialize, Serialize}` (not `rocket::serde`) for model structs
- `#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]` on every DB-mapped struct
- `Option<chrono::NaiveDateTime>` for nullable timestamps
- `String` (not enum types) for CHECK-constrained columns like `classification`

**Key differences from the analog:**
- 8 domain structs (ResourceNetwork, ResourcePlatform, ResourceApplication, ResourceOrgLink, ResourcePolicy, ResourcePolicyAssignment, ResourceAccessGrant, ResourceAccessDelegate) instead of one
- `id: String` (TEXT PK), not `id: i32` (SERIAL) — all digital-resource PKs are text
- `ResourcePolicy.gates` maps to `serde_json::Value` (JSONB column)
- Add 3 request structs: `IssueGrantRequest`, `IssueDelegateRequest`, and the response aggregate `DigitalResourceWorldResponse` (no `sqlx::FromRow` on response structs)
- `IssueGrantRequest` fields: `resource_id: String`, `person_id: String`, `actor_org_id: String`, `valid_from: Option<chrono::NaiveDateTime>`, `valid_until: Option<chrono::NaiveDateTime>` — use `#[derive(Deserialize)]` only

**Resolver output structs** (needed for golden-fixture parity test, no `FromRow`):
```rust
#[derive(Debug, Serialize, Deserialize)]
pub struct ResourceGateResult {
    pub kind: String,
    pub pass: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reason: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ResourceAccessResult {
    pub allow: bool,
    pub gates: Vec<ResourceGateResult>,
    pub zone_advisory: Option<serde_json::Value>,   // placeholder, Phase 12 concern
    pub policy_version: Option<PolicyVersion>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reason: Option<String>,                     // only present for NO_ACTIVE_POLICY
}
```

---

### `backend/src/digital_resources/handlers.rs` (controller, request-response)

**Analog:** `backend/src/organizations/handlers.rs`

**Imports pattern** (lines 1–11):
```rust
// backend/src/organizations/handlers.rs lines 1-11
use rocket::serde::json::Json;
use rocket::{delete, get, http::Status, post, put, State};
use sqlx::PgPool;

use super::models::{CreateOrganizationRequest, Organization, UpdateOrganizationRequest};
use crate::auth::middleware::AuthGuard;
use crate::shared::pagination::PaginationParams;
use crate::shared::response::PaginatedResponse;
```

**Handler signature pattern — GET with AuthGuard** (lines 12–19):
```rust
// backend/src/organizations/handlers.rs lines 12-19
#[get("/?<page>&<per_page>&<top_level_only>")]
pub async fn list_organizations(
    page: Option<i32>,
    per_page: Option<i32>,
    top_level_only: Option<bool>,
    db: &State<PgPool>,
    _auth: AuthGuard,
) -> Result<Json<PaginatedResponse<Organization>>, Status> {
```

**sqlx inline query pattern** (lines 42–54):
```rust
// backend/src/organizations/handlers.rs lines 42-54
let total: i64 = sqlx::query_scalar::<sqlx::Postgres, i64>(total_sql)
    .fetch_one(db.inner())
    .await
    .map_err(|_| Status::InternalServerError)?;

let organizations: Vec<Organization> =
    sqlx::query_as::<sqlx::Postgres, Organization>(organizations_sql)
        .bind(pagination.limit())
        .bind(pagination.offset())
        .fetch_all(db.inner())
        .await
        .map_err(|_| Status::InternalServerError)?;
```

**POST handler with actor extraction** (lines 89–126, adapted):
```rust
// Pattern from organizations/handlers.rs lines 89-126 — adapt for issue_grant:
#[post("/grants", data = "<data>")]
pub async fn issue_grant(
    data: Json<IssueGrantRequest>,
    db: &State<PgPool>,
    auth: AuthGuard,                          // NOT _auth — actor identity needed
) -> Result<Json<ApiResponse<ResourceAccessGrant>>, Status> {
    // Auth guard extracts JWT; sub is person integer id as string:
    let _actor_person_id = auth.claims.sub.parse::<i32>()
        .map_err(|_| Status::InternalServerError)?;
    // ... load resource, load delegates, call resolver::can_issue_resource_grant
    // ... 403 if false, INSERT ON CONFLICT DO NOTHING RETURNING * if true
}
```

**What to replicate:**
- Macro paths are RELATIVE (`#[get("/world")]`, `#[post("/grants")]`) — NOT absolute with `/api/digital-resources/...`
- `db: &State<PgPool>` always present
- `_auth: AuthGuard` (underscore) for read-only handlers; `auth: AuthGuard` (no underscore) when actor identity is needed
- Error mapping: `.map_err(|_| Status::InternalServerError)?`, `.ok_or(Status::NotFound)?`
- Wrap aggregate response in `ApiResponse::success(...)` not `PaginatedResponse`

**What to avoid:**
- Do NOT copy the access domain (`backend/src/access/handlers.rs`) — it uses hardcoded absolute paths like `#[post("/api/access/computer", …)]` which double-prefix when mounted. This is the anti-pattern called out in CLAUDE.md.
- No `validator::Validate` needed for the request structs in this domain (the issue requests are simple enough; re-validation is done via `can_issue_resource_grant`, not field-level validators)

---

### `backend/src/digital_resources/resolver.rs` (utility, transform)

**Analog:** NONE — no pure logic module exists in the backend codebase. This is the first one.

**What to build from (TS source of truth):** `frontend/src/demo/lib/model.ts` — `resolveResourceAccess` (line ~1084), `canIssueResourceGrant` (line ~1163), `isWindowActive` (line ~822), `selectActivePolicy`, `effectiveClassification`, `clearance_rank`.

**Structural rules (D-05):**
- Pure Rust module: no Rocket imports, no `&State<PgPool>`, no `now()` inside any function
- Every function takes explicit `now: chrono::NaiveDateTime` (not `Utc::now()` inside)
- Public functions: `pub fn resolve_resource_access(...)`, `pub fn can_issue_resource_grant(...)`
- Private helpers: `fn clearance_rank(c: &str) -> i32`, `fn is_window_active(...)`, `fn select_active_policy(...)`, `fn effective_classification(...)`

**Key patterns to implement verbatim from TS source:**

```rust
// isWindowActive: INCLUSIVE on both ends, null = unbounded
// Source: frontend/src/demo/lib/model.ts line ~822
fn is_window_active(
    valid_from: Option<chrono::NaiveDateTime>,
    valid_until: Option<chrono::NaiveDateTime>,
    now: chrono::NaiveDateTime,
) -> bool {
    let from_ok = valid_from.map_or(true, |vf| vf <= now);
    let until_ok = valid_until.map_or(true, |vu| vu >= now);  // >= NOT >
    from_ok && until_ok
}

// clearance_rank: must match model.ts:15-21 exactly (RESTRICTED is rank 1)
fn clearance_rank(c: &str) -> i32 {
    match c {
        "UNCLASSIFIED" => 0,
        "RESTRICTED"   => 1,
        "CONFIDENTIAL" => 2,
        "SECRET"       => 3,
        "TOP_SECRET"   => 4,
        _              => -1,   // unknown = fail closed
    }
}
```

**Critical parity constraints:**
- `valid_until >= now` (inclusive boundary) — the golden-fixture test exercises exactly this edge
- No-policy case returns `allow: false, gates: [], reason: Some("NO_ACTIVE_POLICY".into())`
- Unknown gate kind → `pass: false, reason: Some("UNKNOWN_GATE_KIND".into())` (never silently ALLOW)
- `effectiveClassification` for APPLICATION tier: one-hop lookup to platform; for NETWORK/PLATFORM: own classification

---

### `backend/migrations/YYYYMMDD_create_digital_resource_tables.sql` (migration, batch)

**Analog:** `backend/migrations/20251026112330_create_vendors_table.sql` (CREATE TABLE pattern)

**Pattern to copy:**
```sql
-- backend/migrations/20251026112330_create_vendors_table.sql (representative CREATE TABLE)
CREATE TABLE organizations (
    id SERIAL PRIMARY KEY,
    company_name VARCHAR(200) NOT NULL,
    ...
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

**What to replicate:**
- `CREATE TABLE` (not `CREATE TABLE IF NOT EXISTS`) — this is a new additive migration on a repaired chain; the file won't run twice
- Index lines immediately after each table: `CREATE INDEX idx_... ON table(column);`
- Use `TIMESTAMPTZ NOT NULL DEFAULT NOW()` for timestamps (better than `TIMESTAMP` — unambiguous UTC)

**What differs from the analog:**
- `id TEXT PRIMARY KEY` (not `SERIAL`) for resource_networks, resource_platforms, resource_applications, resource_access_grants, resource_access_delegates, resource_policies
- `id SERIAL PRIMARY KEY` for resource_org_links and resource_policy_assignments (no natural text ID)
- Add 5-value CHECK for classification: `CHECK (classification IN ('UNCLASSIFIED', 'RESTRICTED', 'CONFIDENTIAL', 'SECRET', 'TOP_SECRET'))` — this is wider than the existing `person.clearance_level` constraint which lacks RESTRICTED
- `resource_policies.gates JSONB NOT NULL` — no analog in existing schema; use raw `JSONB` column
- Inter-table FKs (resource_platforms → resource_networks, etc.) are text-to-text, not int-to-int

**Migration timestamp:** Use `20260601130000` (immediately after the last safe migration in the existing chain). Full filename: `20260601130000_create_digital_resource_tables.sql`.

---

### `backend/migrations/YYYYMMDD_seed_digital_resources.sql` (seed migration, batch)

**Analog:** `backend/migrations/20260601120200_seed_enduser_official_users.sql` (lines 1–23) — exact match

**Pattern to copy** (entire file):
```sql
-- backend/migrations/20260601120200_seed_enduser_official_users.sql lines 1-23
INSERT INTO person (username, password_hash, role, email)
SELECT v.username,
       '$2b$12$...',
       v.role,
       v.email
FROM (VALUES
    ('enduser', 'enduser', 'enduser@janus.local'),
    ('official', 'official', 'official@janus.local')
) AS v(username, role, email)
WHERE NOT EXISTS (SELECT 1 FROM person p WHERE p.username = v.username);
```

**What to replicate:**
- Multi-row VALUES form for bulk inserts
- Idempotency guard: use `ON CONFLICT (id) DO NOTHING` (simpler than `WHERE NOT EXISTS` for text PKs)
- Header comment block citing the source of truth file (D-04 requirement)

**Adapted for digital resources:**
```sql
-- Source of truth: frontend/src/demo/lib/seed.ts
-- RESOURCE_NODES (NetworkNode[]) -> resource_networks; PLATFORMS -> resource_platforms; etc.
INSERT INTO resource_networks (id, name, classification) VALUES
('rsrc-milnet',         'MilNet',          'SECRET'),
('rsrc-milnet-tac',     'TacNet-Mil2',     'SECRET'),
...
ON CONFLICT (id) DO NOTHING;
```

**Migration timestamp:** `20260601130001` (immediately after the create tables migration). Full filename: `20260601130001_seed_digital_resources.sql`.

**Fixture counts to hand-port:** 6 networks, 4 platforms, 4 applications, 3 policies, 15 policy assignments, 18 grants, 1 delegate, 18 org_links (all from `frontend/src/demo/lib/seed.ts`).

---

### `backend/tests/resolver_parity.rs` (test, batch)

**Analog:** `backend/tests/nda_test.rs` (structure only — nda_test is an integration stub; this test is a pure unit test)

**What NOT to copy from nda_test.rs:** `#[rocket::async_test]`, `#[ignore]`, and the async integration test pattern. The resolver is pure sync Rust — use plain `#[test]`.

**Pattern to use:**
```rust
// Plain unit test — no Rocket, no DB, no async
// backend/tests/resolver_parity.rs
use janus_backend::digital_resources::resolver;
use janus_backend::digital_resources::models::{ResourceAccessResult, ...};

#[test]
fn resolver_parity_against_golden_fixtures() {
    let golden: serde_json::Value = serde_json::from_str(
        include_str!("fixtures/resolver-golden.json")
    ).unwrap();

    // Re-run the same calls the TS exporter ran, at the same fixed timestamps
    let result_a = resolver::resolve_resource_access(/* params, GOLDEN_NOW_A */);
    let result_json = serde_json::to_value(&result_a).unwrap();

    assert_eq!(result_json, golden["milnet_now_a"]);
    assert_eq!(serde_json::to_value(&result_boundary).unwrap(), golden["milnet_boundary"]);
    // NO_ACTIVE_POLICY case
    assert_eq!(golden["no_policy_deny"]["allow"], false);
    assert_eq!(golden["no_policy_deny"]["reason"], "NO_ACTIVE_POLICY");
}
```

**Required directory:** `backend/tests/fixtures/resolver-golden.json` — must be committed; created by the TS golden exporter test.

**Mandatory parity cases (RSRC-BE-02):**
1. `GOLDEN_NOW_A = 2026-02-15T12:00:00Z` — mid-window ALLOW
2. `GOLDEN_NOW_BOUNDARY = 2026-02-28T23:59:59Z` — exactly at `valid_until`; inclusive boundary must ALLOW
3. `GOLDEN_NO_POLICY_NOW = 2025-06-01T00:00:00Z` — before all MilNet policy windows → `NO_ACTIVE_POLICY` DENY

---

### `frontend/src/demo/lib/digital-resource-golden-export.test.ts` (test, batch)

**Analog:** `frontend/src/demo/lib/digital-resource.test.ts` (lines 1–58)

**Pattern to copy** (imports + test structure):
```typescript
// frontend/src/demo/lib/digital-resource.test.ts lines 28-58
import { describe, it, expect } from "vitest";
import {
  resolveResourceAccess,
  canIssueResourceGrant,
  ...
} from "./model";
import {
  RESOURCE_NODES,
  RESOURCE_GRANTS,
  RSRC_DELEGATES,
  PLATFORMS,
  APPLICATIONS,
} from "./seed";
```

**What to replicate:**
- Import from `./model` and `./seed` (the exporter is the one place this file legitimately imports seed fixtures)
- Use fixed `const GOLDEN_NOW_A = new Date("2026-02-15T12:00:00Z")` timestamps — never `new Date()` (non-deterministic)

**Key difference from the analog:** This file uses `writeFileSync` to emit JSON output — it's a fixture exporter, not an assertion test. Add a `// @vitest-environment node` annotation so Node's `fs` is available (jsdom default won't have it). Use `afterAll` or a single `it` block that calls `writeFileSync` at the end.

**Output path:** `"../../../backend/tests/fixtures/resolver-golden.json"` (relative from the test file's location in `frontend/src/demo/lib/`).

---

### `backend/src/shared/rocket_setup.rs` (modified, config)

**Analog:** itself — lines 108–115 show the exact pattern to extend

**Mount pattern** (lines 108–114):
```rust
// backend/src/shared/rocket_setup.rs lines 108-114
.mount("/api/roles", roles::routes())
.mount("/api/person", person::routes())
.mount("/api/organizations", organizations::routes())
.mount("/api/nda", nda::routes())
.mount("/api/discussions", discussions::routes())
.mount("/api/document-references", document_references::routes())
.mount("/api", relations::routes())
```

**What to add:**
1. Line 9 — extend the `use crate::{...}` import block:
   ```rust
   use crate::{
       auth, audit, access, info_systems, person, roles, organizations,
       vendor_relations, relations, discussions, document_references, nda,
       shared, messaging,
       digital_resources,  // ADD THIS
   };
   ```
2. After line 113 — add one `.mount` line:
   ```rust
   .mount("/api/digital-resources", digital_resources::routes())
   ```

**What NOT to change:** Do not touch the flat `/` mount block (lines 85–107) — access and info_systems handlers use absolute paths there. Only the `digital_resources` domain uses the `/api/digital-resources` mount with relative paths.

---

## Shared Patterns

### AuthGuard — JWT Authentication
**Source:** `backend/src/auth/middleware.rs`
**Apply to:** All handlers in `digital_resources/handlers.rs`

```rust
// Pattern from organizations/handlers.rs lines 17-18, 69
// Read-only: use _auth (underscore suppresses unused warning)
_auth: AuthGuard,

// Write paths: use auth to extract actor
auth: AuthGuard,
let actor_person_id = auth.claims.sub.parse::<i32>()
    .map_err(|_| Status::InternalServerError)?;
```

### Error Handling
**Source:** `backend/src/organizations/handlers.rs` (throughout)
**Apply to:** All handlers

```rust
.map_err(|_| Status::InternalServerError)?   // DB errors
.ok_or(Status::NotFound)?                     // missing row
.map_err(|_| Status::BadRequest)?             // parse/validation errors
return Err(Status::Forbidden);                // authority check failed
```

### ApiResponse Wrapper
**Source:** `backend/src/shared/response.rs`
**Apply to:** `get_world`, `issue_grant`, `issue_delegate` handlers

```rust
// Import: use crate::shared::response::ApiResponse;
Ok(Json(ApiResponse::success(world_response)))
// Error: Ok(Json(ApiResponse::error("message")))  — or Err(Status::X)
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `backend/src/digital_resources/resolver.rs` | utility | transform | No pure logic modules exist in the Rust backend; all existing modules are Rocket handlers or DB models. The closest conceptual analog is the TS resolver in `frontend/src/demo/lib/model.ts` — port from there, not from any Rust file. |

---

## Metadata

**Analog search scope:** `backend/src/organizations/`, `backend/src/access/`, `backend/src/shared/`, `backend/migrations/`, `backend/tests/`, `frontend/src/demo/lib/`
**Files scanned:** 10
**Pattern extraction date:** 2026-06-19
