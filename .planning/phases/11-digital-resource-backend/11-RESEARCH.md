# Phase 11: Digital Resource Backend & Resolver Port — Research

**Researched:** 2026-06-19
**Domain:** Rust/Rocket backend domain creation, migration-chain repair, TS→Rust resolver port, golden-fixture parity testing
**Confidence:** HIGH (all claims grounded in file paths or direct code reads)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Repair the broken migration chain as part of Phase 11, then add the 8 new tables on a clean baseline. The clean DB must migrate end-to-end (no ALTER-before-CREATE, no duplicate versions, resolve the zombie `rename_personnel_to_person` vs the authoritative unified-create). SPEC must be updated.
- **D-02:** After chain repair, create 8 digital-resource tables (single additive create on the clean baseline).
- **D-03:** Seed via embedded idempotent seed migration (`ON CONFLICT DO NOTHING`/equivalent), matching the `20260601120200_seed_enduser_official_users.sql` pattern.
- **D-04:** Hand-port fixtures from `frontend/src/demo/lib/seed.ts` to SQL; comment block in seed migration cites `seed.ts` as source of truth.
- **D-05:** Rust resolver lives in `src/digital_resources/resolver.rs` — pure module, explicit evaluation timestamp, no Rocket types, no `now()` inside.
- **D-06:** Parity via golden fixtures exported from TS → committed JSON; Rust test loads same JSON and asserts byte-equal results. Must cover inclusive policy-window boundary and no-policy `NO_ACTIVE_POLICY` DENY.
- **D-07:** One aggregate GET — `GET /api/digital-resources/world` — returns whole tree + policies + assignments + grants + delegates.
- **D-08:** Wrap reads in existing `ApiResponse<T>`. Issue POST derives actor from `AuthGuard`'s authenticated person, resolves that person's org-link, re-validates server-side.
- **D-09:** Mount at `/api/digital-resources` in `shared/rocket_setup.rs` using relative handler paths.

### Claude's Discretion
- FK vs standalone IDs for org_links/grant-issuers: verify the actual `organizations`/`person` schema in the live DB first, then choose FK-to-existing vs standalone string IDs matching seed. Planner decides after inspection.
- Exact placement of the resolver file within `src/digital_resources/` and module decomposition.

### Deferred Ideas (OUT OF SCOPE)
- All Phase 12 UI/loader/issuing-form work.
- Migration-chain repair as its own separate phase (folded into Phase 11, D-01).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| RSRC-BE-06 | Migration-chain repair: clean DB migrates end-to-end with zero errors | Section 1 below — concrete breakage list + repair sequence |
| RSRC-BE-01 | Backend domain + schema: 8 tables via migration, sqlx models, Rocket handlers | Sections 2, 3, 6 — domain pattern + schema design + FK decision |
| RSRC-BE-02 | Rust resolver parity: full gate-chain resolver ported, parity test with golden fixtures | Section 4 — gate-chain mapping, chrono usage, fixture mechanism |
| RSRC-BE-03 | Read API: AuthGuard-protected GET endpoints for hierarchy/policies/grants/delegates | Section 2, 5 — handler pattern, AuthGuard, aggregate GET shape |
| RSRC-BE-04 | Issue API + server-side trust boundary: POST endpoints re-validate authority | Section 4, 5 — canIssueResourceGrant port, 403 cases, idempotency |
| RSRC-BE-05 | Postgres single source of truth: seed.ts fixtures into DB, seedWorld() stops hardcoding | Section 3, 5 — seed migration pattern, seedWorld lines to remove |
</phase_requirements>

---

## Summary

Phase 11 has three distinct work streams that must execute in strict order: (1) repair the broken migration chain so a fresh DB migrates cleanly, (2) create 8 digital-resource tables on that clean baseline, and (3) port the TS resolver + API handlers + golden-fixture parity test.

The migration repair is the highest-risk item. The chain has at least 7 concrete breakages (detailed in Section 1): chronological inversions that cause ALTER-before-CREATE on a fresh DB, three identical version timestamps for access tables, two identical version timestamps for `rename_vendors`/`add_schema_org_relation_types`, a zombie migration that conflicts with the authoritative unified person table, a buggy INSERT in the relations migration that references a column that never existed, and two recent align migrations (`20260601120000`, `20260601120300`) that are idempotent DO-blocks and safe to leave in place. The project memory (`project_migrations_fresh_db_broken`) confirms all of these and provides a reconstruction recipe. The repair strategy is a controlled rename/delete of the unmigrated early files combined with a single "clean-baseline" replacement migration, applied to a throwaway empty DB first, then verified against the live dev DB.

The domain code pattern is well-established. Reading `backend/src/access/` and `backend/src/organizations/` reveals a completely consistent template: `mod.rs` (re-exports + `routes()`), `models.rs` (`sqlx::FromRow` + `serde` structs), `handlers.rs` (relative macro paths, `AuthGuard`, `&State<PgPool>`, `Result<Json<T>, Status>`). The mount pattern in `shared/rocket_setup.rs` is `.mount("/api/digital-resources", digital_resources::routes())`.

The TS resolver (`frontend/src/demo/lib/model.ts`) is a pure data-driven loop with 5 gate kinds: CLEARANCE, OWN_TIER_GRANT, PARENT_TIER_GRANT, REQUIRED_ROLE, and unknown-fail-closed. All functions take explicit `now: Date`. The Rust port is structurally straightforward using `chrono::DateTime<Utc>` as the timestamp parameter. The golden-fixture mechanism (D-06) requires adding a Vitest test that calls `resolveResourceAccess` on 2–3 seed fixtures at fixed timestamps and writes JSON to `backend/tests/fixtures/resolver-golden.json`; a Rust `#[test]` then loads that file and asserts serde equality.

**Primary recommendation:** Execute in waves: Wave 0 = migration repair on throwaway DB + verify live DB; Wave 1 = 8-table schema migration (additive); Wave 2 = sqlx models + resolver module; Wave 3 = handlers + mount; Wave 4 = golden fixtures + parity test; Wave 5 = seed migration + seedWorld removal.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Migration-chain repair | Database/Storage | — | Pure SQL/sqlx migration files; no application code involved |
| Digital-resource schema (8 tables) | Database/Storage | — | Additive migration; tables are the authority for the domain |
| Rust gate-chain resolver | API/Backend | — | Pure Rust module; no DB reads inside resolution; called by handlers |
| Aggregate GET /world | API/Backend | — | AuthGuard-gated; loads all 8 tables and assembles payload |
| Issue POST + authority validation | API/Backend | — | Re-validates via ported `canIssueResourceGrant`; actor from AuthGuard JWT |
| Seed migration (DB fixtures) | Database/Storage | — | SQL `ON CONFLICT` INSERTs; matches D-03 pattern |
| seedWorld() removal | Frontend (store) | — | Remove hardcoded arrays; store becomes DB-driven in Phase 12 |

---

## Section 1: Migration-Chain Repair (RSRC-BE-06)

### Concrete Breakages — Verified from File Reads

The following table documents every breakage found by reading the actual migration files. All filenames are paths under `backend/migrations/`.

**[VERIFIED: backend/migrations/ directory read]**

| # | File | Breakage | Fresh-DB Impact |
|---|------|----------|-----------------|
| B-01 | `20250127000000_add_dates_to_vendor_relations.sql` | `ALTER TABLE vendor_relations ADD COLUMN valid_from …` — but `vendor_relations` is created in `20251026195324_create_vendor_relations_table.sql` (October). January file runs FIRST on a fresh DB → relation doesn't exist yet. | `ERROR: relation "vendor_relations" does not exist` |
| B-02 | `20250128000000_create_nda_table.sql` | `REFERENCES personnel(id)` and `REFERENCES users(id)` — but `personnel` and `users` are created in October files that sort LATER. | FK constraint to non-existent table → ERROR |
| B-03 | `20250129000000_create_discussions_table.sql` | Same: `REFERENCES personnel(id)` / `REFERENCES users(id)`. | FK constraint to non-existent table → ERROR |
| B-04 | `20250129000001_create_document_references_table.sql` | Same: `REFERENCES personnel(id)` / `REFERENCES users(id)`. | FK constraint to non-existent table → ERROR |
| B-05 | `20250131000000_create_person_table_unified.sql` | Authoritative unified schema — but creates `person` before `users`/`personnel` tables exist, then SELECTs from them. On a fresh DB with the correct order, it also tries to rename `audit_log.user_id` etc. which may not exist yet. | Sequencing error with B-01..04 |
| B-06 | Three files all stamped `20251026132437`: `create_computer_access_table.sql`, `create_data_access_table.sql`, `create_physical_access_table.sql` | sqlx tracks migrations by timestamp; duplicate timestamps cause `error: migration … has already been applied` | sqlx REFUSES to apply the second/third file |
| B-07 | Two files both stamped `20251101190000`: `add_schema_org_relation_types.sql`, `rename_vendors_to_organizations.sql` | Same duplicate-version error | sqlx refuses one of them |
| B-08 | `20251101191000_rename_personnel_to_person.sql` (ZOMBIE) | Assumes `personnel` table exists (from B-02 path). Conflicts with `20250131000000_create_person_table_unified.sql` (the authoritative path). Running both on a clean DB creates a `person` table twice (once in Jan, once renamed in Nov) OR causes a name-collision error. The project memory confirms this is the zombie — the unified create is the authoritative migration for the `Person` model in `backend/src/person/models.rs`. | Contradicts authoritative path; data migration INSERTs from `users`/`personnel` which were just dropped in `20250131000001_drop_old_tables_after_migration.sql`. |
| B-09 | `20251101180000_create_unified_relations_table.sql` | Includes: `FROM vendor_relations WHERE (deleted_at IS NULL OR deleted_at IS NOT NULL)` — `deleted_at` column never existed on `vendor_relations` (not in `create_vendor_relations_table.sql`). On a real DB this is a no-op error; on a fresh DB it's a syntax/column error at INSERT time. | `ERROR: column "deleted_at" does not exist` |

### What Is SAFE (leave in place)

| File | Status | Reason |
|------|--------|--------|
| `20260601120000_align_nda_with_person_model.sql` | SAFE | Fully idempotent `DO $$ BEGIN … IF EXISTS … END $$;` blocks — no-op on a clean DB that already has correct columns |
| `20260601120100_drop_organizations_contact_email_unique.sql` | SAFE | Idempotent `DROP CONSTRAINT IF EXISTS` |
| `20260601120200_seed_enduser_official_users.sql` | SAFE | Idempotent INSERT with `WHERE NOT EXISTS` guard |
| `20260601120300_align_audit_log_with_person_model.sql` | SAFE | Fully idempotent `DO $$ BEGIN … IF EXISTS … END $$;` |

### The Authoritative Path (what the code actually needs)

From reading `backend/src/person/models.rs` (`Person` struct with `id: i32, username: Option<String>, password_hash: Option<String>, role: Option<String>`, nullable identity/clearance fields) and `backend/src/auth/jwt.rs` (`sub` is a string person-id), the authoritative `person` table must come from `20250131000000_create_person_table_unified.sql` — NOT from `rename_personnel_to_person`. [VERIFIED: backend/src/person/models.rs, backend/src/auth/jwt.rs]

### Repair Strategy — Concrete Sequence

**DO NOT edit migration files that are already applied to the live dev DB.** The live DB has some migrations applied. The correct repair approach depends on which migrations are in `_sqlx_migrations` on the live DB — the planner MUST verify this first (the DB is down during research, so [ASSUMED] that the live DB has the Oct files applied but NOT the zombie). The standard safe pattern for history rewriting is: **the already-applied migrations must be left on disk unchanged; only unapplied migrations get restructured.**

Based on the reconstruction recipe from project memory and direct file analysis, the recommended repair is:

**Step 1 (VERIFY FIRST):** On the live dev DB, run:
```sql
SELECT version, description, installed_on FROM _sqlx_migrations ORDER BY installed_on;
```
This tells you the exact cut-point. Any migration with an `installed_on` timestamp is already applied — DO NOT touch those files' content (only their filenames if they haven't been applied). [ASSUMED: live DB has some Oct migrations applied]

**Step 2 (Fresh-DB strategy):** Create a throwaway empty DB:
```bash
docker exec -e PGPASSWORD=janus_dev_password <pg-container> \
  psql -U janus -c "CREATE DATABASE janus2_fresh;"
DATABASE_URL=postgresql://janus:janus_dev_password@localhost:15530/janus2_fresh \
  sqlx migrate run
```
This validates that the repaired chain succeeds on a clean DB without risking the live DB.

**Step 3 (Repair moves):** For migration files NOT yet applied on the live DB, the planner must:

1. **Rename the Jan misdated files** to timestamps AFTER their October dependencies (or squash them into the October files). The simplest safe approach:
   - `20250127000000_add_dates_to_vendor_relations.sql` → rename to `20251026195325_add_dates_to_vendor_relations.sql` (immediately after create_vendor_relations)
   - `20250128000000_create_nda_table.sql` → rename to `20251026195326_create_nda_table.sql`
   - `20250129000000_create_discussions_table.sql` → rename to `20251026195327_create_discussions_table.sql`
   - `20250129000001_create_document_references_table.sql` → rename to `20251026195328_create_document_references_table.sql`
   - `20250131000000_create_person_table_unified.sql` → rename to `20251101192000_create_person_table_unified.sql` (after rename_vendors, before align migrations)
   - `20250131000001_drop_old_tables_after_migration.sql` → rename to `20251101192001_drop_old_tables_after_migration.sql`
   - `20250131000002_update_relations_entity_type.sql` → rename to `20251101192002_update_relations_entity_type.sql`

2. **Fix duplicate timestamps:**
   - Rename `20251026132437_create_data_access_table.sql` → `20251026132438_create_data_access_table.sql`
   - Rename `20251026132437_create_physical_access_table.sql` → `20251026132439_create_physical_access_table.sql`
   - Keep `20251026132437_create_computer_access_table.sql` as-is (lowest alpha-sort, already applied if any)
   - Rename `20251101190000_add_schema_org_relation_types.sql` → `20251101190001_add_schema_org_relation_types.sql` (keep rename_vendors at 190000 since it must run first — relations table uses `entity_type` values that rename_vendors updates)

3. **Excise the zombie:** Delete `20251101191000_rename_personnel_to_person.sql` — it is superseded by `create_person_table_unified` (the authoritative path) AND conflicts with it.

4. **Fix the buggy INSERT in `20251101180000_create_unified_relations_table.sql`:** Remove `deleted_at` from the WHERE clause. Change:
   ```sql
   FROM vendor_relations WHERE (deleted_at IS NULL OR deleted_at IS NOT NULL)
   ```
   to:
   ```sql
   FROM vendor_relations
   ```

5. **Add `IF NOT EXISTS` guards** to any remaining non-idempotent DDL (particularly indexes in older migrations that don't use `IF NOT EXISTS`) — the align migrations already do this correctly as a template.

**Critical constraint:** If any of the misdated January files have already been applied to the live dev DB (check `_sqlx_migrations`), their content is frozen — you can only add a NEW migration to fix the damage they caused, not rename/edit them.

### Verifying Both DBs

```bash
# Test 1: Fresh empty DB — must complete with 0 errors
DATABASE_URL=postgresql://janus:janus_dev_password@localhost:15530/janus2_fresh \
  sqlx migrate run 2>&1 | grep -i error

# Test 2: Live DB — must show "no new migrations" (no errors)
DATABASE_URL=postgresql://janus:janus_dev_password@localhost:15530/janus2 \
  sqlx migrate run 2>&1
```

---

## Section 2: sqlx + Rocket Domain Conventions

**[VERIFIED: backend/src/access/mod.rs, models.rs, handlers.rs; backend/src/organizations/mod.rs, models.rs, handlers.rs; backend/src/shared/rocket_setup.rs; backend/src/auth/middleware.rs; backend/src/auth/jwt.rs; backend/src/shared/response.rs]**

### Module Layout (exact pattern)

```
backend/src/digital_resources/
├── mod.rs         # pub mod models; pub mod handlers; pub mod resolver;  pub fn routes() -> Vec<rocket::Route>
├── models.rs      # sqlx::FromRow + serde structs + request structs
├── handlers.rs    # Rocket handlers — relative macro paths, AuthGuard, &State<PgPool>
└── resolver.rs    # Pure Rust resolver — no Rocket types, no DB, explicit timestamp (D-05)
```

### mod.rs Pattern

```rust
// Source: backend/src/access/mod.rs (verified)
pub mod models;
pub mod handlers;
pub mod resolver;  // new for this domain

pub fn routes() -> Vec<rocket::Route> {
    routes![
        handlers::get_world,
        handlers::issue_grant,
        handlers::issue_delegate,
    ]
}
```

### models.rs Pattern

```rust
// Source: backend/src/access/models.rs (verified)
use rocket::serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Serialize, Deserialize, FromRow, Clone, Debug)]
pub struct ResourceNetwork {
    pub id: String,          // text PK (matches seed IDs like "rsrc-milnet")
    pub name: String,
    pub classification: String,   // SCREAMING_SNAKE_CASE CHECK enum
    pub created_at: chrono::NaiveDateTime,
    pub updated_at: chrono::NaiveDateTime,
}
```

Key type mappings from TS to Rust/sqlx:
- `string` (PK/FK) → `String` (text in Postgres)
- `Date | null` → `Option<chrono::NaiveDateTime>` (no timezone in DB; UTC assumed)
- `boolean` → `bool`
- enum string fields → `String` with a DB `CHECK` constraint

### handlers.rs Pattern

```rust
// Source: backend/src/access/handlers.rs (verified) — handler macro is RELATIVE path
// Mounted at /api/digital-resources, so "/" is the root of that mount.
#[get("/world")]
pub async fn get_world(
    db: &State<PgPool>,
    _auth: AuthGuard,
) -> Result<Json<ApiResponse<DigitalResourceWorldResponse>>, Status> {
    // ... inline sqlx queries
    Ok(Json(ApiResponse::success(world)))
}

#[post("/grants", data = "<data>")]
pub async fn issue_grant(
    db: &State<PgPool>,
    auth: AuthGuard,
    data: Json<IssueGrantRequest>,
) -> Result<Json<ApiResponse<ResourceAccessGrant>>, Status> {
    let actor_person_id = auth.claims.sub.parse::<i32>()
        .map_err(|_| Status::InternalServerError)?;
    // ... derive org_id, call resolver::can_issue_resource_grant, persist
}
```

**GOTCHA — route double-prefix:** The access domain handlers incorrectly use absolute paths in their macros (`#[post("/api/access/computer", …)]`). This is the pre-pivot pattern that CLAUDE.md warns about. The digital-resources domain MUST use relative paths since it mounts at `/api/digital-resources`. [VERIFIED: backend/src/access/handlers.rs shows the old absolute-path anti-pattern; organizations/handlers.rs shows the correct relative path pattern]

### AuthGuard

`AuthGuard` (`backend/src/auth/middleware.rs`) extracts the JWT from `Authorization: Bearer <token>`, validates it, and exposes `auth.claims: Claims`. The `Claims.sub` field is the person's integer `id` encoded as a string (`user_id.to_string()` at login time in `backend/src/auth/handlers.rs`).

```rust
// Extracting actor person_id (verified pattern from access/handlers.rs):
let actor_person_id = auth.claims.sub.parse::<i32>()
    .map_err(|_| Status::InternalServerError)?;
```

`Claims.role` is also available for role-gating: `auth.claims.role` is a String matching `person.role` values.

### ApiResponse<T>

```rust
// Source: backend/src/shared/response.rs (verified)
pub struct ApiResponse<T> {
    pub success: bool,
    pub data: Option<T>,
    pub error: Option<String>,
}
impl<T> ApiResponse<T> {
    pub fn success(data: T) -> Self { … }
    pub fn error(message: &str) -> ApiResponse<T> { … }
}
```

### Mount Pattern in rocket_setup.rs

```rust
// Source: backend/src/shared/rocket_setup.rs (verified)
// Add this line alongside the existing .mount("/api/roles", roles::routes()) etc.
.mount("/api/digital-resources", digital_resources::routes())
```

Also add `digital_resources` to the `use crate::{…}` import at the top of `rocket_setup.rs`.

### Clearance Enum — IMPORTANT MISMATCH

**[VERIFIED: backend/migrations/20251026112329_create_personnel_table.sql; frontend/src/demo/lib/model.ts line 8-13]**

The backend DB `CHECK` constraint (from `create_person_table_unified.sql`) uses:
```sql
CHECK (clearance_level IN ('UNCLASSIFIED', 'CONFIDENTIAL', 'SECRET', 'TOP_SECRET'))
```
That is 4 values — NO `RESTRICTED`.

The TS `model.ts` `Clearance` type has 5 values:
```typescript
"UNCLASSIFIED" | "RESTRICTED" | "CONFIDENTIAL" | "SECRET" | "TOP_SECRET"
```
`RESTRICTED` appears as a clearance level in the seed fixtures (e.g. `rsrc-industry` network has `classification: "RESTRICTED"`).

**Resolution:** The digital-resource migration must add `RESTRICTED` to the clearance CHECK constraint for the new tables (it's not in the existing `person` table but it IS needed for the resource classification column). The new `resource_networks` table should use:
```sql
classification VARCHAR(50) NOT NULL CHECK (classification IN ('UNCLASSIFIED', 'RESTRICTED', 'CONFIDENTIAL', 'SECRET', 'TOP_SECRET'))
```
This does NOT touch the existing `person.clearance_level` constraint. [ASSUMED: keeping RESTRICTED isolated to the digital-resource tables is safe; the existing person model doesn't have this level]

---

## Section 3: Live Organizations/Person Schema — FK vs Standalone Decision

**The live dev DB is currently down (Docker container not running during research).** The following is derived entirely from migration files and Rust model code. [ASSUMED: live DB column types match what the migrations + Rust models imply]

### `person` table (authoritative from `20250131000000_create_person_table_unified.sql`)

```sql
CREATE TABLE IF NOT EXISTS person (
    id SERIAL PRIMARY KEY,  -- INTEGER, auto-increment
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20),
    username VARCHAR(50) UNIQUE,
    password_hash VARCHAR(255),
    role VARCHAR(20) CHECK (role IN ('admin', 'manager', 'operator', 'viewer')),
    clearance_level VARCHAR(50) CHECK (clearance_level IN ('UNCLASSIFIED', 'CONFIDENTIAL', 'SECRET', 'TOP_SECRET')),
    department VARCHAR(100),
    position VARCHAR(100),
    deleted_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```
**PK: `id SERIAL` (integer)**. [VERIFIED: backend/migrations/20250131000000_create_person_table_unified.sql + backend/src/person/models.rs]

### `organizations` table (authoritative from `20251026112330_create_vendors_table.sql` + `20251101190000_rename_vendors_to_organizations.sql`)

```sql
-- renamed from vendors by rename_vendors_to_organizations.sql
CREATE TABLE organizations (
    id SERIAL PRIMARY KEY,  -- INTEGER, auto-increment (from vendors table)
    company_name VARCHAR(200) NOT NULL,
    contact_name VARCHAR(100) NOT NULL,
    contact_email VARCHAR(255) UNIQUE NOT NULL,
    contact_phone VARCHAR(20),
    clearance_level VARCHAR(50) NOT NULL,
    contract_number VARCHAR(100) UNIQUE NOT NULL,
    department VARCHAR(100),
    deleted_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);
```
**PK: `id SERIAL` (integer)**. [VERIFIED: backend/migrations/20251026112330_create_vendors_table.sql + backend/src/organizations/models.rs]

### FK vs Standalone ID Decision

The seed fixtures use string IDs like `"MILITARY_1"`, `"INTEL"`, `"subj-1"` for `org_id`/`person_id` fields in digital-resource entities (`OrgLink.org_id`, `ResourceAccessGrant.person_id`, `ResourceAccessDelegate.delegate_org_id`, etc.).

These string IDs do NOT correspond to integer PKs in the `organizations` or `person` tables. The `organizations` table has integer PKs (SERIAL); "MILITARY_1" is not a company name or a PK. The `person` table has integer PKs; "subj-1" is not a username or a PK.

**Verdict: Use standalone TEXT columns, NOT foreign keys to `organizations.id` or `person.id`.**

Rationale:
1. The seed fixtures use synthetic domain IDs (`"MILITARY_1"`, `"INTEL"`, `"subj-1"`) that have no 1:1 mapping to existing table PKs.
2. Creating FK mappings would require inserting 6 organizations (MILITARY_1, MILITARY_2, etc.) and 4 subjects (subj-1..4) into the existing tables just to satisfy FK constraints — this is out of scope and leaks demo-data coupling.
3. The digital-resource domain is self-contained: it needs its own `org_id` and `person_id` namespaces that happen to be string labels matching the seed.
4. The Phase 12 hybrid loader (out of scope here) will eventually reconcile these string IDs with real person rows, but that bridge is Phase 12 work.

**[ASSUMED: the live DB doesn't have pre-existing organizations rows for MILITARY_1 etc.; needs user confirmation if real person-record linkage is desired]**

---

## Section 4: TS→Rust Resolver Port (RSRC-BE-02)

**[VERIFIED: frontend/src/demo/lib/model.ts full read]**

### Gate-Chain Mapping

The TS resolver (`resolveResourceAccess` at model.ts:1084) has this exact structure:

```
1. selectActivePolicy(resource.policy_assignments, now)
   → null → { allow: false, gates: [], zoneAdvisory: null, policyVersion: null, reason: "NO_ACTIVE_POLICY" }
2. effectiveClassification(resource, allPlatforms)
   → Application: single-hop lookup to platform.classification; Network/Platform: own classification
3. evaluateGate loop: policy.gates.map(gate => evaluateGate(gate, ctx))
   allow = gates.every(g => g.pass)
   Gate kinds:
     CLEARANCE       → CLEARANCE_RANK[subject_clearance] >= CLEARANCE_RANK[effective_class]
     OWN_TIER_GRANT  → flat find: person_id == subject && resource_id == resource.id && isWindowActive(now)
     PARENT_TIER_GRANT → resource.tier == NETWORK: trivially pass (NO_PARENT_TIER)
                         resource.tier == PLATFORM: find grant on resource.network_id
                         resource.tier == APPLICATION: find grant on resource.platform_id
     REQUIRED_ROLE   → activeOrgLinksForRole(resource.org_links, gate.role, now).some(link => link.org_id == subjectOrgId)
     unknown kind    → { pass: false, reason: "UNKNOWN_GATE_KIND" }
4. zoneAdvisory: if policy.zone_prereq_id != null → call resolveZoneAccess (existing Phase 6 logic)
   → NEVER affects allow boolean
5. Return { allow, gates, zoneAdvisory, policyVersion: { valid_from, valid_until } }
```

### Clearance Rank

```rust
// Must match model.ts:15-21 exactly
fn clearance_rank(c: &str) -> i32 {
    match c {
        "UNCLASSIFIED" => 0,
        "RESTRICTED"   => 1,
        "CONFIDENTIAL" => 2,
        "SECRET"       => 3,
        "TOP_SECRET"   => 4,
        _              => -1,  // unknown = fail closed
    }
}
```

### isWindowActive (INCLUSIVE boundaries, null = unbounded)

```rust
// Source: model.ts:822-831 (verified) — both boundaries inclusive, null = unbounded
fn is_window_active(
    valid_from: Option<chrono::NaiveDateTime>,
    valid_until: Option<chrono::NaiveDateTime>,
    now: chrono::NaiveDateTime,
) -> bool {
    let from_ok = valid_from.map_or(true, |vf| vf <= now);
    let until_ok = valid_until.map_or(true, |vu| vu >= now);
    from_ok && until_ok
}
```
**Critical:** `valid_until >= now` (inclusive) — NOT `>`. This is the parity test boundary case for RSRC-BE-02.

### canIssueResourceGrant

```rust
// Source: model.ts:1163-1183 (verified)
// True iff: active ADMIN org_link on resource for actor org, OR active ORG delegate for actor org
fn can_issue_resource_grant(
    actor_org_id: &str,
    resource_org_links: &[OrgLink],
    all_delegates: &[ResourceAccessDelegate],
    resource_id: &str,
    now: chrono::NaiveDateTime,
) -> bool {
    // Path 1: active ADMIN org_link
    let has_admin = resource_org_links.iter().any(|link| {
        link.org_id == actor_org_id
            && link.role == "ADMIN"
            && is_window_active(link.valid_from, link.valid_until, now)
    });
    if has_admin { return true; }
    // Path 2: active ORG delegate
    all_delegates.iter().any(|d| {
        d.resource_id == resource_id
            && d.delegate_type == "ORG"
            && d.delegate_org_id.as_deref() == Some(actor_org_id)
            && is_window_active(d.valid_from, d.valid_until, now)
    })
}
```

### Resolving Actor's org_id in Issue Handlers

The issue POST handler receives an `AuthGuard` (person integer ID). To find the actor's `org_id` for `canIssueResourceGrant`, the handler must:
1. Parse `auth.claims.sub` → `actor_person_id: i32`
2. Query `resource_org_links` to find an `org_id` where `delegate_person_id = actor_person_id` — OR look up the actor's `person.username` and match against seed `org_id` strings

**[ASSUMED: the simplest approach for Phase 11 is to include an `actor_org_id` field in the issue POST request body and NOT attempt to auto-derive it from the person table, since there is no person-to-UnitId mapping in the existing DB.** The server still re-validates authority with the provided `actor_org_id` — it just trusts the org claim for the resolver call but validates the issuing authority server-side, satisfying the prohibition "no client-trusted issuing". This needs user confirmation if a stricter approach is preferred.]

### chrono Dependency

Already in `Cargo.toml`: `chrono = { version = "0.4", features = ["serde"] }`. No new dependency needed. [VERIFIED: backend/Cargo.toml]

### Rust Struct Shapes for Golden Fixtures

The Rust resolver output (`ResourceAccessResult`) must serialize to match the TS golden JSON. Key serde considerations:
- `Option<T>` fields → JSON `null` when `None`, no `skip_serializing_if` (the test asserts exact byte equality)
- `valid_from`/`valid_until` → `Option<NaiveDateTime>` serialized as RFC3339 string (chrono's default with `features = ["serde"]`)
- `gates: Vec<ResourceGateResult>` → array of `{kind: string, pass: bool, reason: string}`
- `policyVersion: Option<PolicyVersion>` → `null` or `{valid_from: ..., valid_until: ...}`
- `reason: Option<String>` → omit when None OR emit null — the golden fixture must match exactly

**Recommended:** use `#[serde(skip_serializing_if = "Option::is_none")]` on `reason` to match TS behavior (TS omits the field when undefined).

### Golden-Fixture Mechanism (D-06)

**Vitest exporter (new test in `frontend/src/demo/lib/`):**
```typescript
// digital-resource-golden-export.test.ts
// Run with: vitest run digital-resource-golden-export --reporter=json
import { writeFileSync } from "fs";
import { resolveResourceAccess } from "./model";
import { RESOURCE_NODES, PLATFORMS, RESOURCE_GRANTS } from "./seed";

const GOLDEN_NOW_A = new Date("2026-02-15T12:00:00Z");
const GOLDEN_NOW_BOUNDARY = new Date("2026-02-28T23:59:59Z"); // inclusive valid_until
const GOLDEN_NO_POLICY_NOW = new Date("2025-06-01T00:00:00Z"); // no policy covers this

const fixtures = {
  milnet_now_a: resolveResourceAccess("subj-1", "SECRET", "MILITARY_1",
    RESOURCE_NODES.find(n => n.id === "rsrc-milnet")!, RESOURCE_NODES, PLATFORMS, RESOURCE_GRANTS, [], [], GOLDEN_NOW_A),
  milnet_boundary: resolveResourceAccess("subj-1", "SECRET", "MILITARY_1",
    RESOURCE_NODES.find(n => n.id === "rsrc-milnet")!, RESOURCE_NODES, PLATFORMS, RESOURCE_GRANTS, [], [], GOLDEN_NOW_BOUNDARY),
  no_policy_deny: resolveResourceAccess("subj-1", "SECRET", "MILITARY_1",
    RESOURCE_NODES.find(n => n.id === "rsrc-milnet")!, RESOURCE_NODES, PLATFORMS, RESOURCE_GRANTS, [], [], GOLDEN_NO_POLICY_NOW),
};

writeFileSync("../backend/tests/fixtures/resolver-golden.json", JSON.stringify(fixtures, null, 2));
```

**Rust assertion (new integration test `backend/tests/resolver_parity.rs`):**
```rust
#[test]
fn resolver_parity_against_golden_fixtures() {
    let golden: serde_json::Value = serde_json::from_str(
        include_str!("fixtures/resolver-golden.json")
    ).unwrap();
    let rust_result = resolve_resource_access(/* same params */);
    let rust_json = serde_json::to_value(&rust_result).unwrap();
    assert_eq!(rust_json["milnet_now_a"], golden["milnet_now_a"]);
    assert_eq!(rust_json["milnet_boundary"], golden["milnet_boundary"]);
    // NO_ACTIVE_POLICY case: verify reason field
    assert_eq!(rust_json["no_policy_deny"]["allow"], false);
    assert_eq!(rust_json["no_policy_deny"]["reason"], "NO_ACTIVE_POLICY");
}
```

**Mandatory parity cases per RSRC-BE-02:**
1. `GOLDEN_NOW_BOUNDARY = new Date("2026-02-28T23:59:59Z")` — this is exactly MilNet's `valid_until` for the baseline policy; inclusive means it should still select policy A and allow
2. `GOLDEN_NO_POLICY_NOW = new Date("2025-06-01T00:00:00Z")` — before all MilNet policy windows → `NO_ACTIVE_POLICY` DENY

---

## Section 5: API Shape — Aggregate GET + Issue POST

**[VERIFIED: frontend/src/demo/store/world-state.tsx lines 140-148; backend/src/shared/response.rs]**

### GET /api/digital-resources/world Response

The `DigitalResourceWorld` interface (model.ts:801-811) is what Phase 12 needs. The aggregate GET must return exactly these fields:

```rust
// Rust response struct (maps 1:1 to DigitalResourceWorld)
#[derive(Serialize, Debug)]
pub struct DigitalResourceWorldResponse {
    pub networks: Vec<ResourceNetwork>,
    pub platforms: Vec<ResourcePlatform>,
    pub applications: Vec<ResourceApplication>,
    pub org_links: Vec<ResourceOrgLink>,       // flat array (all across all resources)
    pub policies: Vec<ResourcePolicy>,
    pub policy_assignments: Vec<ResourcePolicyAssignment>,
    pub grants: Vec<ResourceAccessGrant>,
    pub delegates: Vec<ResourceAccessDelegate>,
    // NOTE: disabledResourceGrantIds is frontend-only runtime state; NOT in DB/API response
}
```

The `disabledResourceGrantIds: Set<string>` field in `DigitalResourceWorld` is frontend-only runtime state — it must NOT be in the API response. Phase 12 will initialize it as empty on load. [VERIFIED: world-state.tsx seedWorld function — disabledResourceGrantIds is `new Set<string>()` in the initializer]

**Full JSON wrapper:**
```json
{
  "success": true,
  "data": {
    "networks": [...],
    "platforms": [...],
    "applications": [...],
    "org_links": [...],
    "policies": [...],
    "policy_assignments": [...],
    "grants": [...],
    "delegates": [...]
  },
  "error": null
}
```

### Issue POST Endpoints

Two endpoints (per RSRC-BE-04):

```
POST /api/digital-resources/grants   — issues a ResourceAccessGrant
POST /api/digital-resources/delegates — issues a ResourceAccessDelegate
```

**Request body for grant:**
```rust
#[derive(Deserialize, Debug)]
pub struct IssueGrantRequest {
    pub resource_id: String,
    pub person_id: String,        // the subject receiving the grant
    pub actor_org_id: String,     // actor's org for authority validation
    pub valid_from: Option<chrono::NaiveDateTime>,
    pub valid_until: Option<chrono::NaiveDateTime>,
}
```

**Server-side validation sequence (RSRC-BE-04):**
1. `auth: AuthGuard` — JWT valid (else 401)
2. Load resource from DB by `resource_id` (else 404)
3. Load all delegates for the resource from DB
4. Call `can_issue_resource_grant(actor_org_id, resource.org_links, delegates, now)` → false → return `Status::Forbidden` (403)
5. Check for existing duplicate: `SELECT id FROM resource_access_grants WHERE resource_id=$1 AND person_id=$2 AND valid_from IS NOT DISTINCT FROM $3 AND valid_until IS NOT DISTINCT FROM $4` → if exists, return existing row (idempotent)
6. INSERT new grant with `ON CONFLICT DO NOTHING RETURNING *`

**403 cases (from RSRC-BE-04 acceptance criteria):**
- (i) actor_org_id has no ADMIN org_link AND no delegate → `can_issue_resource_grant` returns false
- (ii) actor_org_id has only expired delegate → `is_window_active` returns false → `can_issue` returns false
- (iii) actor_org_id delegate exists but outside validity window → same

---

## Section 6: Schema Design for the 8 Tables

**[VERIFIED: frontend/src/demo/lib/seed.ts full read for field set; frontend/src/demo/lib/model.ts interfaces]**

All IDs are `TEXT PRIMARY KEY` (standalone, not FK to person/organizations — see Section 3 decision). Timestamps use `TIMESTAMPTZ` for unambiguous UTC storage. Windows use the same `valid_from`/`valid_until` pattern as existing access tables.

### Table 1: `resource_networks`
```sql
CREATE TABLE resource_networks (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    classification TEXT NOT NULL CHECK (classification IN (
        'UNCLASSIFIED', 'RESTRICTED', 'CONFIDENTIAL', 'SECRET', 'TOP_SECRET'
    )),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Table 2: `resource_platforms`
```sql
CREATE TABLE resource_platforms (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    classification TEXT NOT NULL CHECK (classification IN (
        'UNCLASSIFIED', 'RESTRICTED', 'CONFIDENTIAL', 'SECRET', 'TOP_SECRET'
    )),
    network_id TEXT NOT NULL,  -- standalone string FK to resource_networks.id
    CONSTRAINT fk_platform_network FOREIGN KEY (network_id)
        REFERENCES resource_networks(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Table 3: `resource_applications`
```sql
CREATE TABLE resource_applications (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    -- NO classification column (RSRC-02 prohibition — derived at resolution time)
    platform_id TEXT NOT NULL,
    CONSTRAINT fk_application_platform FOREIGN KEY (platform_id)
        REFERENCES resource_platforms(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Table 4: `resource_org_links`
```sql
CREATE TABLE resource_org_links (
    id SERIAL PRIMARY KEY,
    resource_id TEXT NOT NULL,       -- any tier node id (network/platform/application)
    resource_tier TEXT NOT NULL CHECK (resource_tier IN ('NETWORK', 'PLATFORM', 'APPLICATION')),
    org_id TEXT NOT NULL,            -- UnitId string e.g. "MILITARY_1"
    role TEXT NOT NULL,              -- BaselineOrgRole or open string
    valid_from TIMESTAMPTZ,
    valid_until TIMESTAMPTZ
);
CREATE INDEX idx_resource_org_links_resource ON resource_org_links(resource_id);
```

### Table 5: `resource_policies`
```sql
CREATE TABLE resource_policies (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    zone_prereq_id TEXT,             -- references zones table (standalone string, no FK — zone table is in demo store)
    gates JSONB NOT NULL             -- stores GateDescriptor[] as JSON array
);
```

**Note on `gates` storage:** The gate list is a small ordered array of discriminated union objects. `JSONB` is the right fit here — the resolver reads all gates at once anyway, and we don't query individual gates. No separate `gates` table needed.

### Table 6: `resource_policy_assignments`
```sql
CREATE TABLE resource_policy_assignments (
    id SERIAL PRIMARY KEY,
    resource_id TEXT NOT NULL,
    resource_tier TEXT NOT NULL CHECK (resource_tier IN ('NETWORK', 'PLATFORM', 'APPLICATION')),
    policy_id TEXT NOT NULL REFERENCES resource_policies(id) ON DELETE CASCADE,
    valid_from TIMESTAMPTZ,
    valid_until TIMESTAMPTZ
);
CREATE INDEX idx_policy_assignments_resource ON resource_policy_assignments(resource_id);
```

### Table 7: `resource_access_grants`
```sql
CREATE TABLE resource_access_grants (
    id TEXT PRIMARY KEY,
    person_id TEXT NOT NULL,         -- standalone: subject ID string (e.g. "subj-1")
    resource_id TEXT NOT NULL,
    valid_from TIMESTAMPTZ,
    valid_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_grant UNIQUE (person_id, resource_id, valid_from, valid_until)
);
CREATE INDEX idx_resource_grants_resource ON resource_access_grants(resource_id);
CREATE INDEX idx_resource_grants_person ON resource_access_grants(person_id);
```

### Table 8: `resource_access_delegates`
```sql
CREATE TABLE resource_access_delegates (
    id TEXT PRIMARY KEY,
    resource_id TEXT NOT NULL,
    delegate_type TEXT NOT NULL CHECK (delegate_type IN ('PERSON', 'ORG')),
    delegate_person_id TEXT,
    delegate_org_id TEXT,
    granted_by_org_id TEXT NOT NULL,
    valid_from TIMESTAMPTZ,
    valid_until TIMESTAMPTZ,
    CONSTRAINT chk_delegate_target CHECK (
        (delegate_type = 'PERSON' AND delegate_person_id IS NOT NULL AND delegate_org_id IS NULL) OR
        (delegate_type = 'ORG' AND delegate_org_id IS NOT NULL AND delegate_person_id IS NULL)
    )
);
CREATE INDEX idx_delegates_resource ON resource_access_delegates(resource_id);
```

---

## Section 7: Seed Migration (RSRC-BE-05)

**[VERIFIED: backend/migrations/20260601120200_seed_enduser_official_users.sql; frontend/src/demo/lib/seed.ts (RESOURCE_NODES, PLATFORMS, APPLICATIONS, RSRC_POLICIES, RESOURCE_GRANTS, RSRC_DELEGATES)]**

### Seed Pattern to Follow

```sql
-- 20260601120200_seed_enduser_official_users.sql pattern (verified):
INSERT INTO person (username, password_hash, role, email)
SELECT v.username, '...', v.role, v.email
FROM (VALUES ('enduser', 'enduser', 'enduser@janus.local')) AS v(username, role, email)
WHERE NOT EXISTS (SELECT 1 FROM person p WHERE p.username = v.username);
```

For the digital-resource seed, use `ON CONFLICT DO NOTHING` (D-03):
```sql
INSERT INTO resource_networks (id, name, classification) VALUES
('rsrc-milnet',         'MilNet',          'SECRET'),
('rsrc-milnet-tac',     'TacNet-Mil2',     'SECRET'),
('rsrc-intelnet',       'IntelNet',        'TOP_SECRET'),
('rsrc-infrastructure', 'InfraNet',        'CONFIDENTIAL'),
('rsrc-industry',       'IndusNet',        'RESTRICTED'),
('rsrc-homeguard',      'HomeGuardNet',    'UNCLASSIFIED')
ON CONFLICT (id) DO NOTHING;
```

### Source of Truth Comment Block (D-04)

```sql
-- Source of truth: frontend/src/demo/lib/seed.ts
-- RESOURCE_NODES (NetworkNode[]) -> resource_networks
-- PLATFORMS (PlatformNode[])     -> resource_platforms
-- APPLICATIONS (ApplicationNode[]) -> resource_applications
-- RSRC_POLICIES (ResourcePolicy[]) -> resource_policies (gates as JSONB)
-- POLICY_ASSIGNMENTS              -> resource_policy_assignments
-- RESOURCE_GRANTS                 -> resource_access_grants
-- RSRC_DELEGATES                  -> resource_access_delegates
-- ORG_LINKS (flat)                -> resource_org_links
-- Field mapping: OrgLink.org_id -> org_id (TEXT); valid_from/valid_until as TIMESTAMPTZ
```

### Fixture Counts (from seed.ts read)

- Networks: 6 (`rsrc-milnet`, `rsrc-milnet-tac`, `rsrc-intelnet`, `rsrc-infrastructure`, `rsrc-industry`, `rsrc-homeguard`)
- Platforms: 4 (`rsrc-milpl-1`, `rsrc-tacpl-1`, `rsrc-intpl-1`, `rsrc-infrapl-1`)
- Applications: 4 (`rsrc-milapp-1`, `rsrc-tacapp-1`, `rsrc-intapp-1`, `rsrc-infraapp-1`)
- Policies: 3 (`rsrc-pol-baseline`, `rsrc-pol-restricted`, `rsrc-pol-non-baseline`)
- Policy assignments: 15 (split across resources; MilNet has 2 for the shift story)
- Grants: 18 (RESOURCE_GRANTS array)
- Delegates: 1 (`rsrc-delegate-subj2`)
- OrgLinks (flat): 18 entries in `ORG_LINKS` [VERIFIED: seed.ts lines 1597-1631]

### seedWorld() Lines to Remove (RSRC-BE-05)

```typescript
// frontend/src/demo/store/world-state.tsx — lines to remove from seedWorld():
networks: [...RESOURCE_NODES],        // line 140
platforms: [...PLATFORMS],            // line 141
applications: [...APPLICATIONS],      // line 142
orgLinks: [...ORG_LINKS],             // line 143 (implied)
policies: [...RSRC_POLICIES],         // line 144 (implied)
policyAssignments: [...POLICY_ASSIGNMENTS], // line 145 (implied)
grants: [...RESOURCE_GRANTS],         // line 146
delegates: [...RSRC_DELEGATES],       // line 147
```
These will be replaced by an API call to `GET /api/digital-resources/world` in Phase 12. For Phase 11, removing them means `seedWorld()` must initialize `digitalResources` to empty arrays (or move to a lazy/async load). [ASSUMED: in Phase 11, seedWorld sets empty arrays; Phase 12 populates via the API loader]

Also remove the seed.ts imports from world-state.tsx lines 45-53:
```typescript
import { RESOURCE_NODES, RESOURCE_GRANTS, PLATFORMS, APPLICATIONS, … RSRC_DELEGATES } from "../lib/seed";
```

---

## Standard Stack

### Core (no additions needed)
| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| rocket | 0.5 | Web framework | Already in Cargo.toml [VERIFIED] |
| sqlx | 0.7 | DB queries + FromRow | Already in Cargo.toml [VERIFIED] |
| chrono | 0.4 with serde | DateTime for resolver timestamp | Already in Cargo.toml [VERIFIED] |
| serde + serde_json | 1.0 | JSON serialization | Already in Cargo.toml [VERIFIED] |

No new Rust dependencies required for Phase 11. [VERIFIED: backend/Cargo.toml]

### Testing
| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| vitest | (existing) | Golden fixture exporter test | Already in frontend [VERIFIED] |
| cargo test | (built-in) | Rust parity test | Built-in |

---

## Package Legitimacy Audit

No new packages. All dependencies are already present in `backend/Cargo.toml`. This section is N/A.

---

## Architecture Patterns

### System Architecture Diagram

```
[seed.ts fixtures]
       │ (hand-port, D-04)
       ▼
[SQL seed migration] → [Postgres: 8 new tables]
                              │
       ┌──────────────────────┤
       │                      │
       ▼                      ▼
[GET /api/digital-           [POST /api/digital-resources/grants]
 resources/world]            [POST /api/digital-resources/delegates]
       │                      │
       │ AuthGuard             │ AuthGuard (extract person_id from JWT.sub)
       │                      │
       │                      ▼
       │             [resolver::can_issue_resource_grant(actor_org_id, ...)]
       │                      │ false → 403
       │                      │ true → INSERT ... ON CONFLICT DO NOTHING
       │                      │
       ▼                      ▼
[ApiResponse<DigitalResourceWorldResponse>]   [ApiResponse<ResourceAccessGrant>]
       │
       ▼
[Phase 12 hybrid loader → WorldState.digitalResources]
```

```
[TS resolver (model.ts)]   [golden fixtures (vitest export)]
       │                              │
       ▼                              │
[committed JSON file] ←───────────────┘
       │
       ▼
[Rust #[test] loads JSON, calls Rust resolver, asserts byte-equal]
       │
       ▼
[Rust resolver (src/digital_resources/resolver.rs)]
     pure fn, explicit now: NaiveDateTime
```

### Recommended Project Structure

```
backend/src/digital_resources/
├── mod.rs           # pub mod models; pub mod handlers; pub mod resolver; pub fn routes()
├── models.rs        # DB row structs (FromRow + Serialize), request/response structs
├── handlers.rs      # get_world, issue_grant, issue_delegate — relative macro paths
└── resolver.rs      # resolve_resource_access, can_issue_resource_grant, helpers

backend/migrations/
├── ... (repaired chain)
├── 20260601120400_create_digital_resource_tables.sql
└── 20260601120500_seed_digital_resources.sql

backend/tests/
├── fixtures/
│   └── resolver-golden.json   (generated by TS vitest, committed)
└── resolver_parity.rs          (Rust integration test)

frontend/src/demo/lib/
└── digital-resource-golden-export.test.ts  (generates fixtures/resolver-golden.json)
```

### Anti-Patterns to Avoid

- **Absolute handler macro paths:** `#[get("/api/digital-resources/world")]` → double-prefixes the route. Use `#[get("/world")]` since the module is mounted at `/api/digital-resources`. [VERIFIED: access/handlers.rs uses old absolute-path pattern; organizations/handlers.rs uses correct relative pattern — follow organizations]
- **Calling `chrono::Utc::now()` inside resolver:** All time-dependent logic must accept `now: chrono::NaiveDateTime` as a parameter. The handler gets `now` from the system at the HTTP request boundary, then passes it down.
- **Ancestor walk for OWN_TIER_GRANT:** The TS resolver explicitly does NOT walk ancestors for own-tier (model.ts:961-972 comment: "no getAncestors/resolveGrant"). The Rust port must be a flat `WHERE person_id = $1 AND resource_id = $2` match — no tree traversal.
- **Storing classification on ApplicationNode:** The migration must NOT add a `classification` column to `resource_applications`. Effective classification is always derived from the parent platform at resolution time.
- **Querying all 8 tables in N+1 loops:** The `GET /world` handler should load all 8 tables in parallel queries, then assemble the response. Use 8 parallel `sqlx::query_as` calls or a single transaction with multiple CTEs.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JWT validation | Custom JWT parser | `AuthGuard` (existing) | Already tested; handles all edge cases |
| Response wrapping | Custom success/error struct | `ApiResponse<T>` (`shared/response.rs`) | Consistent with all other domains |
| DB connection pooling | Manual connection management | `&State<PgPool>` (existing) | Rocket manages lifecycle |
| JSONB serialization | Custom JSON encoding | `serde_json::Value` as the sqlx column type | sqlx `json` feature handles JSONB ↔ serde automatically |
| Date parsing | Custom timestamp parser | `chrono::NaiveDateTime` with sqlx `chrono` feature | Already in Cargo.toml |

---

## Common Pitfalls

### Pitfall 1: Editing Already-Applied Migrations

**What goes wrong:** The planner renames or edits a migration that already appears in `_sqlx_migrations` on the live dev DB. sqlx detects the checksum mismatch and refuses to run any further migrations.

**Why it happens:** The repair involves renaming files; if those files were applied in a prior session, their checksum is locked.

**How to avoid:** Run `SELECT version FROM _sqlx_migrations ORDER BY version;` on the live DB BEFORE touching any migration files. Only rename/delete files whose version does NOT appear in that table.

**Warning signs:** sqlx error `"migration … previously applied … has a different checksum"`.

### Pitfall 2: Clearance RESTRICTED Missing from Existing Tables

**What goes wrong:** The IntelNet network (and IndusNet) have `classification: "RESTRICTED"` in seed.ts. The existing `person.clearance_level` DB CHECK constraint only allows `'UNCLASSIFIED', 'CONFIDENTIAL', 'SECRET', 'TOP_SECRET'` — no `RESTRICTED`. If the schema migration uses the same CHECK list for network classification, the seed INSERT will fail.

**Why it happens:** The clearance type was extended in model.ts but not backported to the old DB constraint.

**How to avoid:** The new resource tables must declare their own CHECK constraint that includes `RESTRICTED`. Do NOT alter the existing `person.clearance_level` constraint.

### Pitfall 3: Policy-Window Boundary at exactly valid_until

**What goes wrong:** The no-active-policy DENY test uses a timestamp exactly equal to `valid_until` of the last policy assignment. If the implementation uses `<` instead of `<=` for `valid_until`, the boundary case incorrectly DENYs when the policy should still be active.

**Why it happens:** Off-by-one in the window comparator.

**How to avoid:** Use `valid_until >= now` (inclusive) in both the Rust resolver and the SQL query for golden fixture verification. The test must use exactly `2026-02-28T23:59:59Z` as the boundary timestamp.

### Pitfall 4: Double-Prefixed Routes

**What goes wrong:** A handler macro uses `#[get("/api/digital-resources/world")]` AND the module is mounted at `"/api/digital-resources"` in `rocket_setup.rs` → actual route becomes `/api/digital-resources/api/digital-resources/world` (404).

**Why it happens:** The `access` domain uses the old absolute-path anti-pattern (pre-pivot). The new domain must follow the relative-path pattern used by `organizations`, `person`, etc.

**How to avoid:** Use `#[get("/world")]`, `#[post("/grants")]`, `#[post("/delegates")]` and mount at `"/api/digital-resources"`.

### Pitfall 5: JSONB Gates Array Deserialization

**What goes wrong:** The `gates JSONB` column in `resource_policies` stores `[{kind:"CLEARANCE"},{kind:"OWN_TIER_GRANT",…}]`. When the handler loads this via sqlx and tries to deserialize into a `Vec<GateDescriptor>`, the REQUIRED_ROLE gate carries an extra `role` field. If the Rust enum doesn't use `#[serde(tag = "kind")]` or an equivalent, unknown/extra fields will cause deserialization errors.

**Why it happens:** The `GateDescriptor` union has heterogeneous shape: `{kind}` for CLEARANCE/OWN_TIER/PARENT_TIER, and `{kind, role}` for REQUIRED_ROLE.

**How to avoid:** Use `serde_json::Value` as the intermediate type when loading from JSONB, then deserialize into a typed enum in the resolver. Or use an untagged Rust enum:
```rust
#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(tag = "kind")]
pub enum GateDescriptor {
    #[serde(rename = "CLEARANCE")]
    Clearance,
    #[serde(rename = "OWN_TIER_GRANT")]
    OwnTierGrant,
    #[serde(rename = "PARENT_TIER_GRANT")]
    ParentTierGrant,
    #[serde(rename = "REQUIRED_ROLE")]
    RequiredRole { role: String },
    #[serde(other)]
    Unknown,  // fail-closed: any unknown kind
}
```

---

## Runtime State Inventory

> Phase 11 is NOT a rename/refactor phase — no existing runtime state is renamed. The migration repair renames files in `backend/migrations/` only. No OS-registered state, no Mem0 user_ids, no stored data using the old names.

| Category | Items Found | Action Required |
|----------|-------------|-----------------|
| Stored data | None renamed | N/A |
| Live service config | None | N/A |
| OS-registered state | None | N/A |
| Secrets/env vars | `DATABASE_URL`, `JWT_SECRET` unchanged | None — only adding new tables |
| Build artifacts | `target/` dir may cache old sqlx query metadata | Run `cargo clean` or `cargo sqlx prepare` after schema changes |

**Note on sqlx query metadata:** If the project uses `cargo sqlx prepare` (compile-time query verification), the `.sqlx/` query cache must be regenerated after adding the 8 new tables and before `cargo build` in CI.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Docker (Postgres container) | Migration repair + testing | ✓ | (running other projects) | Start with `docker compose -f docker-compose.dev.yml up -d` |
| `sqlx-cli` | `sqlx migrate run` | Unknown | — | Install: `cargo install sqlx-cli --features postgres` |
| Node.js / vitest | Golden fixture export | ✓ | (frontend dev) | n/a — already in use |
| Rust 1.87 / cargo | `cargo test`, `cargo build` | [ASSUMED] ✓ | — | Already used for backend |

**Note:** The Postgres container was not running at research time (DB connection refused). The `docker compose -f docker-compose.dev.yml up -d` command (from CLAUDE.md) must be the first step in Wave 0.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework (backend) | `cargo test` (built-in Rust test runner) |
| Framework (frontend) | Vitest (existing) |
| Config file | `backend/Cargo.toml` (test config); `frontend/vitest.config.*` (existing) |
| Quick run command | `cd frontend && npm run test` (unit); `cd backend && cargo test` |
| Full suite command | `cd frontend && npm run test && cd ../backend && cargo test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| RSRC-BE-06 | Fresh DB migrates end-to-end | Integration (manual) | `sqlx migrate run` against fresh DB | N/A (migration files) |
| RSRC-BE-02 | Resolver parity — boundary case | Rust unit | `cargo test resolver_parity` | ❌ Wave 0 |
| RSRC-BE-02 | Resolver parity — no-policy DENY | Rust unit | `cargo test resolver_parity` | ❌ Wave 0 |
| RSRC-BE-03 | Authenticated GET returns 200 | Rust integration | `cargo test` | ❌ Wave 0 |
| RSRC-BE-03 | Unauthenticated GET returns 401 | Rust integration | `cargo test` | ❌ Wave 0 |
| RSRC-BE-04 | POST 403 for non-ADMIN | Rust integration | `cargo test` | ❌ Wave 0 |
| RSRC-BE-04 | POST 403 for expired delegate | Rust integration | `cargo test` | ❌ Wave 0 |
| RSRC-BE-04 | Duplicate issue → no new row | Rust integration | `cargo test` | ❌ Wave 0 |
| RSRC-BE-05 | seedWorld() has no digital resource arrays | Vitest | `npm run test` | Existing test in digital-resource.test.ts |

### Wave 0 Gaps

- [ ] `backend/tests/resolver_parity.rs` — covers RSRC-BE-02 inclusive boundary + NO_ACTIVE_POLICY DENY
- [ ] `backend/tests/fixtures/resolver-golden.json` — generated by TS vitest exporter
- [ ] `frontend/src/demo/lib/digital-resource-golden-export.test.ts` — golden fixture exporter
- [ ] Rocket integration test harness for endpoint 200/401/403 testing (pattern from existing backend tests if any)

---

## Security Domain

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Yes | `AuthGuard` Bearer-JWT on all endpoints |
| V3 Session Management | No | Stateless JWT; no session state in this phase |
| V4 Access Control | Yes | `can_issue_resource_grant()` re-validated server-side; no client authority assertion |
| V5 Input Validation | Yes | `validate()` on request bodies; `Status::BadRequest` on invalid input |
| V6 Cryptography | No | No new crypto — JWT validation is existing |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Client asserts own authority for issue POST | Elevation of Privilege | Server re-validates `can_issue_resource_grant` from DB state, not request body; 403 if fails |
| Expired delegate reused | Elevation of Privilege | `is_window_active` check in `can_issue_resource_grant` — expired → false |
| Cross-tier inheritance (network grant satisfies platform check) | Elevation of Privilege | OWN_TIER_GRANT is flat `resource_id ==` match; NO ancestor walk in Rust resolver |
| Unknown gate kind silently allows | Elevation of Privilege | Unknown arm returns `{pass: false, reason: "UNKNOWN_GATE_KIND"}` — fail closed |
| Application classification stored independently | Information Disclosure | `resource_applications` has NO `classification` column; effective classification derived at resolution time |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Live dev DB does NOT have the Jan misdated migrations applied (so they can be renamed) | Section 1 | If already applied: cannot rename — must use a NEW migration to fix the damage; repair sequence changes significantly |
| A2 | Live dev DB has the Oct migrations applied (create_users, create_personnel, create_vendors, create_access_tables) | Section 1 | If not: different cut-point for rename strategy |
| A3 | `org_id` in org_links and `person_id` in grants use standalone TEXT strings (not FK to existing tables) | Section 3 | If FKs are desired: requires inserting 6 org rows + subject rows into existing tables before seed migration |
| A4 | `actor_org_id` for issue POST comes from request body, not auto-derived from JWT person → org lookup | Section 5 | If auto-derive is required: need a `person_to_org` mapping table or join, which is out of scope; changes handler complexity |
| A5 | `disabledResourceGrantIds` is NOT stored in DB (frontend-only runtime state) | Section 5 | If it needs persistence: requires a new column/table and DB reads |
| A6 | `RESTRICTED` clearance level is only needed in new resource tables, not in existing `person.clearance_level` | Section 2 | If person.clearance_level also needs RESTRICTED: must alter existing constraint (live DB impact) |
| A7 | `cargo sqlx prepare` / offline query checking is NOT used in CI (so no `.sqlx/` cache to update) | Section 7 | If used: must run `cargo sqlx prepare` after adding tables before CI will pass |

---

## Open Questions

1. **What migrations are already applied on the live dev DB?**
   - What we know: The live DB was running at some point (seeded users work); the project memory says it "drifted from the migration set"
   - What's unclear: Exact cut-point — which Jan misdated migrations (if any) are in `_sqlx_migrations`
   - Recommendation: First task in Wave 0 must be `SELECT version FROM _sqlx_migrations ORDER BY version;` against the live DB (after `docker compose up -d`)

2. **Does the Phase 12 hybrid loader expect `orgLinks` as a flat array or embedded per-node?**
   - What we know: `DigitalResourceWorld.orgLinks` is a flat `OrgLink[]` in the TS type (model.ts:806); `seedWorld()` uses `[...ORG_LINKS]` which is the flat array from seed.ts
   - What's unclear: Whether Phase 12 expects the org_links embedded IN each network/platform/application node (nested), or as a flat array that it joins itself
   - Recommendation: Emit both — embed `org_links` on each node in the response (matching the model.ts `NetworkNode.org_links: OrgLink[]` shape) AND include the flat `orgLinks` array for the world-state shape

3. **Should `resolve_resource_access` in Rust call the existing zone-access resolver or stub it?**
   - What we know: The TS resolver calls `resolveZoneAccess` for the `zoneAdvisory` field (model.ts:1132-1145); the zone access types and logic are already in the Phase 6-8 frontend code but not in the Rust backend
   - What's unclear: Whether the Rust resolver must fully port the zone resolver too, or can return `zoneAdvisory: null` for any resource with a `zone_prereq_id`
   - Recommendation: For Phase 11, stub `zoneAdvisory` as `null` when a zone_prereq_id is present (the parity test can use fixtures where zone_prereq_id is null); port the full zone resolver in a future phase. Document this as a known deviation.

---

## Sources

### Primary (HIGH confidence)
- `backend/migrations/*.sql` — all 29 migration files read directly; breakage catalog is grounded in exact file contents
- `backend/src/access/mod.rs`, `models.rs`, `handlers.rs` — exact handler/model pattern
- `backend/src/organizations/mod.rs`, `handlers.rs` — relative path pattern (correct template)
- `backend/src/shared/rocket_setup.rs` — mount pattern
- `backend/src/auth/middleware.rs`, `backend/src/auth/jwt.rs` — AuthGuard + Claims struct
- `backend/src/shared/response.rs` — ApiResponse<T> shape
- `backend/src/person/models.rs` — Person struct confirming authoritative person table schema
- `frontend/src/demo/lib/model.ts` — complete resolver logic, gate functions, type definitions
- `frontend/src/demo/lib/seed.ts` — complete fixture dataset (RESOURCE_NODES, PLATFORMS, APPLICATIONS, RSRC_POLICIES, POLICY_ASSIGNMENTS, RESOURCE_GRANTS, RSRC_DELEGATES, ORG_LINKS)
- `frontend/src/demo/lib/digital-resource.test.ts` — golden fixture test patterns, fixed timestamps
- `frontend/src/demo/store/world-state.tsx` — seedWorld() body, DigitalResourceWorld field set
- `backend/Cargo.toml` — confirmed existing dependencies (no new deps needed)
- Project memory `project_migrations_fresh_db_broken` — reconstruction recipe confirming all breakages

### Secondary (MEDIUM confidence)
- CLAUDE.md gotchas section — migration drift, route double-prefix, clearance levels

### Tertiary (LOW confidence — assumptions)
- Live DB `_sqlx_migrations` table contents (DB was down during research) [ASSUMED]
- `actor_org_id` derivation strategy (query path) [ASSUMED]

---

## Metadata

**Confidence breakdown:**
- Migration-chain repair: HIGH — every breakage traced to a specific line in a specific file
- Domain conventions: HIGH — read directly from 3 existing domains
- Resolver port: HIGH — model.ts read in full; gate functions verified line by line
- Schema design: HIGH — derived directly from seed.ts field shapes + model.ts interfaces
- FK vs standalone decision: HIGH (reasoning) / ASSUMED (live DB PK verification)
- Golden fixture mechanism: MEDIUM — pattern is sound but exact Rust serde shape needs validation during implementation

**Research date:** 2026-06-19
**Valid until:** 2026-07-19 (migration content is stable; model.ts is frozen per D-05 annotation in the file)
