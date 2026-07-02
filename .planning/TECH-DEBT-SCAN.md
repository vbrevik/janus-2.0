# Janus 2.0 — Tech-Debt Scan

> Generated 2026-05-29 via multi-agent workflow (7 dimensions, 83 agents, adversarial verification).
> 72 confirmed findings: 8 critical · 16 high · 21 medium · 27 low.
> Companion to the e2e run (2 passed / 57 failed) — see §G Testing and §E Migrations.


## 1. Executive Summary

The single most dangerous systemic risk is **broken access control on the backend**: the DB-backed RBAC system (`role_has_permission`) is wired into exactly one module, so any authenticated user of any role can grant/revoke all three access tiers and create/modify/delete personnel (including assigning `role='admin'`), while the entire `vendor_relations` domain has **zero authentication** at all — the project's stated Core Value ("data never mutated by an unauthorized user") is currently false. The second systemic risk is a **non-functional schema lifecycle**: `sqlx migrate run` fails on the very first migration on any fresh database due to pervasive ALTER-before-CREATE ordering, duplicate version prefixes, and two mutually-exclusive abandoned refactor lineages — meaning no developer, CI pipeline, or disaster-recovery process can reproducibly stand up the schema, and the documented README setup command is actively broken. Third, the **frontend ships a duplicated, shadow route tree** guarded only by an auth-only `ProtectedRoute`, giving non-admin users URL-reachable admin CRUD pages that the unguarded backend will then execute — a real privilege-escalation path compounded by ~3,500 lines of already-drifting duplicated code. Fourth, the **Docker `full` profile and CI builds are broken** (sqlx offline cache excluded, no `SQLX_OFFLINE`; missing WebSocket port mapping and MinIO config). Finally, **observability and test coverage of the security core are absent**: 86 sites swallow DB errors, the audit log records almost nothing, and there are zero backend integration tests for auth, RBAC, or access grants while the e2e suite cannot run from a clean checkout.

---

## 2. Prioritized Summary Table

### Critical

| Severity | Area | Issue | File | Effort |
|---|---|---|---|---|
| Critical | Security / Backend | `vendor_relations` handlers have ZERO authentication (unauthenticated list/create/**DELETE**) | `backend/src/vendor_relations/handlers.rs:10,33,81,151` | Trivial–Small |
| Critical | Security / Backend | RBAC enforced only in `roles` module; access/person/org/nda/etc. are auth-only → privilege escalation to admin | `backend/src/shared/rbac.rs:3`; `backend/src/access/handlers.rs:11-212`; `backend/src/person/handlers.rs:97-119` | Large |
| Critical | Frontend / Security | Dual `ProtectedRoute`: auth-only shadow tree exposes admin CRUD pages by URL to any role | `frontend/src/components/protected-route.tsx:5`; `frontend/src/components/ProtectedRoute.tsx:20` | Medium |
| Critical | Migrations / DB | `sqlx migrate run` fails on file #1 on a fresh DB (broken lexicographic ordering) | `backend/migrations/20250127000000_add_dates_to_vendor_relations.sql:2` | Large |
| Critical | Migrations / DB | ALTER-before-CREATE pervasive across the entire January-dated migration era | `backend/migrations/20250131000000_create_person_table_unified.sql:43` | Large |
| Critical | Build / Deps | Docker backend build fails: sqlx compile-time macros need DB/offline cache, but `.sqlx` excluded & `SQLX_OFFLINE` unset | `backend/Dockerfile:14-27`; `backend/.dockerignore:32` | Small |

### High

| Severity | Area | Issue | File | Effort |
|---|---|---|---|---|
| High | Security / Backend | `Person` model serializes `password_hash` (bcrypt) into list/get/create/update JSON | `backend/src/person/models.rs:5-29` | Small |
| High | Security / Backend | Audit logging absent for access grants & personnel changes; NDA audit failures swallowed (`let _ =`) | `backend/src/audit/handlers.rs:115-139` | Large |
| High | Backend | Pervasive error swallowing: 86× `map_err(\|_\| Status::InternalServerError)` discards DB detail | `backend/src/access/handlers.rs:37` | Medium |
| High | Security / Backend | `vendor_relations` leaks raw DB error strings to clients (`Result<_, String>`) | `backend/src/vendor_relations/handlers.rs:26,74,92,141,159` | Small |
| High | Security | JWT secret has insecure dev fallback and no min-length validation (forgeable admin tokens if unset) | `backend/src/shared/rocket_setup.rs:22-23` | Small |
| High | Security / Frontend | Client-side-only role enforcement; `ProtectedRoute` is the sole role gate (localStorage-editable) | `frontend/src/components/ProtectedRoute.tsx:33-49` | Large |
| High | Frontend | Entire route tree duplicated: ~10 near-identical top-level vs `/admin` pairs (~3,500 lines, already drifting) | `frontend/src/routes/access/index.tsx` vs `admin/access/index.tsx` | Medium |
| High | Migrations / DB | Duplicate version prefixes: 3× `20251026132437`, 2× `20251101190000` (sqlx PK conflict) | `backend/migrations/20251026132437_create_computer_access_table.sql` | Small |
| High | Migrations / DB | Contradictory/abandoned migration lineages for `person`/`organizations`/`relations`; live DB hand-built | `backend/migrations/20250131000000_create_person_table_unified.sql:7` | Large |
| High | Docs / DB | `backend/README.md` documents the exact `sqlx migrate run` command that fails on a fresh DB | `backend/README.md:24` | Trivial |
| High | Testing | Playwright `webServer` starts only the frontend; e2e silently depends on a separate backend + seeded DB; no `test:e2e` script (yet docs reference it) | `frontend/playwright.config.ts:25-29` | Large |
| High | Testing | E2e login asserts redirect to `/personnel`, but admin lands on `/admin/dashboard` — 6 spec files have guaranteed-failing `beforeEach` | `frontend/e2e/auth.spec.ts:20` | Small |
| High | Testing | `role-based-routing.spec.ts` & `navigation-flow.spec.ts` hardcode `localhost:5173` (dead port; app is 15510) — only RBAC e2e coverage is dead | `frontend/e2e/role-based-routing.spec.ts:17` | Small |
| High | Testing | Backend RBAC, auth, and access-grant flows have zero integration test coverage | `backend/tests/info_systems_test.rs` | Large |
| High | Build / Deps | Docker `full` profile: backend missing MinIO env vars and WebSocket (15540) port mapping | `docker-compose.yml:21-56` | Medium |
| High | Docs / Arch Drift | README & CLAUDE.md never mention the v2.1 milestone (zones/ABAC/federation) — largest recent work | `README.md:194-210`; `CLAUDE.md` | Medium |

### Medium

| Severity | Area | Issue | File | Effort |
|---|---|---|---|---|
| Medium | Backend | `get_vendor_hierarchy` is a stub: runs an expensive recursive CTE, discards it, always returns `[]` | `backend/src/vendor_relations/handlers.rs:80-147` | Medium |
| Medium | Backend | N+1 + duplicated (6×) entity-name resolution SQL in relations handler | `backend/src/relations/handlers.rs:78-119` | Medium |
| Medium | Backend | Silent JWT-subject fallback `parse::<i32>().unwrap_or(0)` → misattributed data | `backend/src/discussions/handlers.rs:106` | Small |
| Medium | Security | CORS allows all origins (reflected) WITH `allow_credentials(true)`; env allowlist ignored | `backend/src/shared/rocket_setup.rs:56-67` | Small |
| Medium | Frontend | Vite production build ships the demo/mock app as a second entry point (`/demo.html`, unauthenticated) | `frontend/vite.config.ts:24` | Small |
| Medium | Frontend | Widespread `any`/`as any` defeats TS strict mode at the API boundary and routing | `frontend/src/lib/api.ts:7` | Large |
| Medium | Frontend | `alert()/confirm()` (56 calls) used for all feedback, violating documented inline-error convention | `frontend/src/routes/ndas/index.tsx:382` | Large |
| Medium | Frontend | Oversized route components (>300 lines) embedding multiple concerns, duplicated 2× | `frontend/src/routes/person/$personId.tsx:1` | Large |
| Medium | Testing | E2e parses a `data.*` response envelope the backend doesn't return (login/lists are flat); reads nonexistent `user_id` | `frontend/e2e/nda.spec.ts:27` | Medium |
| Medium | Testing | RBAC tests/guards target `enduser`/`official` roles not seeded and rejected by DB CHECK constraint | `frontend/e2e/role-based-routing.spec.ts:36-37` | Medium |
| Medium | Testing | `nda_test.rs` is 5 `#[ignore]` placeholder stubs masking zero NDA coverage | `backend/tests/nda_test.rs:16-45` | Medium |
| Medium | Testing | `info-systems.spec.ts` conditional `test.skip()` turns empty-DB/broken flows into green passes | `frontend/e2e/info-systems.spec.ts:100` | Medium |
| Medium | Testing | Vitest unit coverage is almost entirely sandbox `demo/`+`spikes/`; canonical guards untested | `frontend/src/spikes/lib/abac.test.ts` | Medium |
| Medium | Migrations / DB | Backend does not auto-run migrations; no `sqlx::migrate!` anywhere (no working automated schema path) | `backend/src/shared/rocket_setup.rs` | Small |
| Medium | Build / Deps | `routeTree.gen.ts` gitignored (×2) but required at build; `tsc -b` before `vite` breaks clean clone/CI | root `.gitignore` & `frontend/.gitignore` | Small |
| Medium | Build / Deps | Outdated Rust deps: sqlx 0.7 (RUSTSEC-2024-0363, fixed 0.8.1), validator 0.16, tokio-tungstenite 0.21 | `backend/Cargo.toml:18,25,34` | Large |
| Medium | Docs / Arch Drift | v2.1 zones/grants/entry-logs/visitor-passes have NO backend persistence — in-memory demo only | `frontend/src/demo/store/world-state.tsx:469-478` | Large |
| Medium | Docs / Arch Drift | README claims "no mock data / 100% complete," contradicted by ~7.3k-LOC mock demo island | `README.md:140-142,355-361` | Small |
| Medium | Docs / Arch Drift | Documented anti-patterns still live: dual `ProtectedRoute`, 86 swallowed errors | `frontend/src/components/*ProtectedRoute*`; `backend/src/*/handlers.rs` | Medium |
| Medium | Docs / Arch Drift | Deferred "build-later" scope (backend, DELEG-03 `canIssueGrant` enforcement) invisible outside `.planning/` | `.planning/phases/06-.../06-VERIFICATION.md:42-110` | Small |

### Low

| Severity | Area | Issue | File | Effort |
|---|---|---|---|---|
| Low | Backend | Ad hoc `println!/eprintln!`; declared `log`/`env_logger` crates never used/initialized | `backend/src/messaging/handlers.rs:46` | Medium |
| Low | Backend | Dead/stale code: `create_pool` & `create_audit_log` `#[allow(dead_code)]`; empty audit middleware | `backend/src/shared/database.rs:5` | Small |
| Low | Backend | Repeated hand-rolled dynamic UPDATE builders (manual param-count bookkeeping) in 4 modules | `backend/src/organizations/handlers.rs:149-209` | Medium |
| Low | Frontend | Dead component dir `src/components/person-details/` — zero importers (5 files) | `frontend/src/components/person-details/index.ts:1` | Small |
| Low | Frontend | Leftover Vite scaffold `App.tsx`/`App.css` (+ unused assets) committed, orphaned | `frontend/src/App.tsx:1` | Trivial |
| Low | Frontend | `console.log/console.error` in prod paths; WS `console.log` dumps every inbound message | `frontend/src/contexts/websocket-context.tsx:23` | Small |
| Low | Frontend | Unused exported helpers `hasRole`/`hasAnyRole` (role logic inlined elsewhere) | `frontend/src/contexts/auth-context.tsx:117` | Trivial |
| Low | Frontend | TODO: missing relations-by-person wiring (renders silently empty); absent grant success/error feedback | `frontend/src/routes/person/$personId.tsx:178` | Medium |
| Low | Frontend | Floating delete promises in `onClick` (`mutate` w/o `onError`) — silent failures | `frontend/src/routes/organizations/$organizationId.tsx:369` | Small |
| Low | Frontend | `as any` on `ProtectedRoute` `Navigate` search/route disables typed navigation (auth redirect) | `frontend/src/components/ProtectedRoute.tsx:39` | Small |
| Low | Security | WebSocket fail-open auth bypass when `jwt_secret` is `None` (latent, unreachable today) | `backend/src/messaging/handlers.rs:25` | Small |
| Low | Security | Committed seed users w/ known shared password `password123` (cost-12 hash in repo) | `backend/migrations/20251026112400_seed_test_users.sql:2-19` | Small |
| Low | Security | `change_password` allows reusing old password; no complexity policy (min 8 only) | `backend/src/auth/handlers.rs:99-136` | Trivial |
| Low | Security | JWT uses `Validation::default()` — no aud/iss binding, implicit alg, 8h fixed exp, no revocation | `backend/src/auth/jwt.rs:34-42` | Small |
| Low | Security | `auth.claims.sub` parsed with `unwrap_or(0)` in profile/change-password | `backend/src/auth/handlers.rs:66,108` | Trivial |
| Low | Security | No security response headers (CSP/HSTS) on API; SPA has X-Frame/X-Content but no CSP/HSTS | `backend/src/shared/rocket_setup.rs` | Small |
| Low | Security | Dynamic SQL builders are parameterized — no injection (informational, confirms scope) | `backend/src/audit/handlers.rs:28-99` (+3) | Medium (opt) |
| Low | Build / Deps | `log`/`env_logger` declared but never used | `backend/Cargo.toml:46-48` | Trivial |
| Low | Build / Deps | `tokio-test` dev-dependency declared but unused | `backend/Cargo.toml:50-52` | Trivial |
| Low | Build / Deps | Hardcoded MinIO credential fallbacks in source | `backend/src/document_references/handlers.rs:206-207` | Small |
| Low | Build / Deps | WS address hardcoded `0.0.0.0:15540`; no env override (unlike `ROCKET_PORT`) | `backend/src/shared/rocket_setup.rs:36` | Trivial |
| Low | Build / Deps | No Node version pin (`.nvmrc`); `@types/node ^24` vs Node 20 runtime | (missing) `frontend/.nvmrc`; `frontend/Dockerfile:2` | Trivial |
| Low | Build / Deps | No Prettier; ESLint has no style rules (formatting unenforced); `ecmaVersion 2020` cosmetic drift | `frontend/eslint.config.js:18-21` | Small |
| Low | Testing | Hardcoded credentials & seed-row coupling copy-pasted across 11 e2e specs | `frontend/e2e/role-based-routing.spec.ts:33-37` | Small |
| Low | Testing | Vitest excludes by path only; a misplaced `.spec.ts` would break `npm test` | `frontend/vite.config.ts:39-44` | Trivial |
| Low | Docs / Arch Drift | `docs/` folder is a v2.0 snapshot; silent on v2.1; demo entry (`demo.html`) undocumented | `docs/` (00–11 + features/) | Small |

> **Deduplicated:** `vendor_relations` no-auth (security + backend dimensions) → one Critical item. RBAC gap (backend + security) → one Critical item. Error swallowing (backend + arch-drift "86 errors") → one High item plus an arch-drift cross-reference. CORS (two near-identical entries) → one Medium item. `App.tsx` (frontend + build-deps) → one Low item. Client-side role enforcement + dual-ProtectedRoute share root cause but are listed separately (distinct fixes: backend enforcement vs route consolidation).

---

## 3. Detail by Area

### A. Backend Authorization & Authentication (Security)

**A1 — `vendor_relations` has zero authentication (CRITICAL).**
*Evidence:* All four mounted handlers — `list_vendor_relations` (`:10`), `create_vendor_relation` (`:33`), `get_vendor_hierarchy` (`:81`), `delete_vendor_relation` (`:151`) — take only `db: &State<PgPool>` plus path/body params; `grep -c AuthGuard` = 0. Routes are live-mounted at `rocket_setup.rs:92-95`, exposing an unauthenticated `DELETE FROM vendor_relations WHERE id = $1` (`:155`) and INSERT (`:57-72`). It is the *only* REST module without `AuthGuard` (messaging is a WebSocket server doing its own in-band JWT check).
*Impact:* Any unauthenticated network client can read, create, and delete vendor-relationship data. Direct violation of the Core Value.
*Fix:* Add `_auth: AuthGuard` to all four handlers (and ideally a `role_has_permission` check) to match `person`/`access`.

**A2 — RBAC wired into one module only; everything else is "logged in == admin" (CRITICAL).**
*Evidence:* `role_has_permission` (`shared/rbac.rs:3`) has 7 call sites, all in `roles/handlers.rs`. `AuthGuard` (`auth/middleware.rs`) only validates the JWT and extracts claims — no role enforcement. `grant_computer_access` (`access/handlers.rs:11`), `grant_data_access` (`:44`), `grant_physical_access` (`:77`), `revoke_access` (`:172`) never read `auth.claims.role`. `create_person` (`person/handlers.rs:98`) binds the caller-supplied `role` straight into the INSERT (`:162`) with only a presence check. `update_person` (`:177`), `delete_person` (`:319`), and the org/nda/info_systems/relations/document_references/discussions write handlers are all `_auth`-only.
*Impact:* Any authenticated user of any role can create an `admin` account, grant/revoke all three access tiers, and modify/delete personnel — OWASP A01 broken access control on the most sensitive writes. (Note: a known ABAC re-scope is in progress per project memory, but the code is vulnerable today.)
*Fix:* Add `role_has_permission(db, &auth.claims.role, "<resource>.<read|write>")` gates at the top of each mutating handler; centralize as a shared helper/guard to avoid per-handler drift.

**A3 — JWT secret insecure dev fallback, no length check (HIGH).**
*Evidence:* `rocket_setup.rs:22-23`: `env::var("JWT_SECRET").unwrap_or_else(|_| "test-secret-key-must-be-at-least-32-characters-long")`. Not `cfg!(test)`-gated; no `len() >= 32` assertion. HMAC symmetric signing means a known constant lets an attacker forge admin JWTs. Startup logs "JWT secret loaded" unconditionally, masking it.
*Fix:* `.expect("JWT_SECRET must be set")` outside test builds + assert length ≥ 32 (fail fast).

**A4 — `password_hash` serialized to API responses (HIGH).**
*Evidence:* `person/models.rs:5-29` derives `Serialize` on `pub password_hash: Option<String>` with no `#[serde(skip_serializing)]`. Returned verbatim by list (`handlers.rs:19`), get (`:77`), create (`:102`), update (`:182`); every SELECT/RETURNING explicitly lists `password_hash`.
*Impact:* Any caller with a valid JWT of any role can read all users' bcrypt hashes → offline cracking surface.
*Fix:* Add `#[serde(skip_serializing)]` to the field, or use a response DTO; stop selecting `password_hash` where unneeded.

**A5 — CORS wildcard + credentials (MEDIUM).**
*Evidence:* `rocket_setup.rs:56-67`: `AllowedOrigins::all()` + `allow_credentials(true)`. The documented `CORS_ALLOWED_ORIGINS` env var is never read. rocket_cors 0.6 reflects the request Origin back (not literal `*`) and validation passes, so the misconfig is live and exploitable cross-origin.
*Mitigation:* auth is a Bearer header (not a cookie), so classic CSRF is dampened.
*Fix:* Read `CORS_ALLOWED_ORIGINS` and use `AllowedOrigins::some_exact(&[...])`; only enable credentials if cookie auth is used.

**A6 — JWT-subject `unwrap_or(0)` fallback (MEDIUM/LOW).**
*Evidence:* `auth.claims.sub.parse::<i32>().unwrap_or(0)` at `discussions/handlers.rs:106,141`, `auth/handlers.rs:66,108`, `document_references/handlers.rs:111`, `nda/handlers.rs:117`. A malformed `sub` becomes `person_id 0` (e.g., `create_discussion` writes a row attributed to person 0) instead of returning 401. Dormant today (server-issued numeric subs), but `access/handlers.rs` already does this correctly with `.map_err(|_| Status::InternalServerError)?`.
*Fix:* `.map_err(|_| Status::Unauthorized)?` instead of `.unwrap_or(0)`.

**A7 — Low-severity auth hardening:** WebSocket fail-open when `jwt_secret` is `None` (`messaging/handlers.rs:25`, latent/unreachable today); committed seed `password123` cost-12 hash (`20251026112400_seed_test_users.sql:2-19`, targets the legacy unused `users` table so no live admin login, but a documented shared password in the repo); `change_password` permits old==new and only `min=8` (`auth/handlers.rs:99-136`); `Validation::default()` with no aud/iss/explicit-alg and 8h fixed exp with no revocation (`jwt.rs:34-42`); no CSP/HSTS headers on the API (`rocket_setup.rs`; SPA `nginx.conf` already sets X-Frame/X-Content but no CSP/HSTS); MinIO credential fallbacks baked into source (`document_references/handlers.rs:206-207`). Dynamic SQL builders are parameterized — **no injection risk** (informational, audit-scope confirmation).

### B. Backend Reliability, Observability & Code Quality

**B1 — 86 swallowed DB errors (HIGH).**
*Evidence:* 86× `map_err(|_| Status::InternalServerError)` across `src/` (e.g., `access/handlers.rs:37,70,103,129,186,195,204`; `auth/handlers.rs:31,40,52,80,...`; `organizations/handlers.rs:45,53,82,...`). Only ~18 sites capture the error; `eprintln!` appears in just 7 files. No centralized logging fairing or `env_logger`/`tracing` init exists.
*Impact:* Production 500s — including on grant/revoke — are undebuggable.
*Fix:* Replace discard closures with the existing `|e| { eprintln!("Database error: {:?}", e); Status::InternalServerError }` pattern, ideally via a shared helper.

**B2 — `vendor_relations` leaks raw DB error strings (HIGH).**
*Evidence:* All four handlers return `Result<_, String>` with `.map_err(|e| format!("Database error: {}", e))?` (`:26,74,92,141,159`). Rocket renders the `Err` String directly as the 200 response body → CWE-209 information disclosure (table/column/constraint detail). It is the only module returning `Result<_, String>`; combined with A1 (no auth) it is reachable unauthenticated.
*Fix:* Return `Status`/`AppError` like every other module; log the real error server-side.

**B3 — `get_vendor_hierarchy` is a result-discarding stub (MEDIUM).**
*Evidence:* `vendor_relations/handlers.rs:80-147` runs a real recursive CTE, binds it to `_hierarchy_raw` (discarded), and unconditionally returns `let hierarchy: Vec<VendorHierarchy> = vec![];` (`:144`). Comments at `:94`/`:143` admit "not fully implemented." Endpoint is live-mounted (`rocket_setup.rs:94`).
*Fix:* Map the `PgRow`s into `VendorHierarchy`, or remove the endpoint and query until needed.

**B4 — N+1 + duplicated entity-name resolution (MEDIUM).**
*Evidence:* `relations/handlers.rs:78-119` resolves `entity_name` and `related_entity_name` inside `for rel in relations`, each via a person-SELECT + vendor-SELECT (up to 2 queries/row). The same SQL is duplicated 6× (person at `:83/103/295`, vendor at `:92/104/304`), with a second N+1 in the hierarchy loop.
*Fix:* Extract `resolve_entity_name(db, entity_type, id)` and batch via JOIN/`IN`.

**B5 — Ad hoc logging; declared crates unused (LOW).**
*Evidence:* `Cargo.toml:46-48` declares `log`/`env_logger`; zero `log::`/`info!`/etc. usages; `env_logger` never initialized. All output is unconditional `println!`/`eprintln!` (e.g., `messaging/handlers.rs:46,58,109,...`). `tokio-test` (`Cargo.toml:50-52`) is also an unused dev-dep.
*Fix:* Either init `env_logger` and migrate to `log::` macros, or remove the dead deps (minimal fix).

**B6 — Dead/stale code (LOW).**
*Evidence:* `shared/database.rs:5` `create_pool` `#[allow(dead_code)]` (pool is built inline in `rocket_setup.rs`); `audit/handlers.rs:116` `#[allow(dead_code)]` on `create_audit_log` is *stale* (NDA uses it); `audit/middleware.rs` is 3 comment lines. Other allows at `shared/response.rs:11`, `vendor_relations/models.rs:32`, `auth/middleware.rs:6`.
*Fix:* Remove `create_pool`, drop the stale allow, delete/implement the audit middleware stub.

**B7 — Repeated hand-rolled UPDATE builders (LOW).**
*Evidence:* The `push_str(&format!(", col = ${}"))` + parallel `.bind()` pattern is duplicated in `organizations/handlers.rs:149-209`, `person/handlers.rs:227-267`, `relations/handlers.rs:341-394`, `audit/handlers.rs:28-82`. No injection (placeholders only), but manual param-count lock-step is fragile (e.g., `person/handlers.rs:224` has a dead `params: Vec<Box<dyn Any>>`). CLAUDE.md flags this anti-pattern.
*Fix:* Adopt sqlx `QueryBuilder` or a shared helper.

### C. Audit Logging

**C1 — Audit absent on the most security-relevant mutations; NDA failures swallowed (HIGH).**
*Evidence:* `create_audit_log` (`audit/handlers.rs:116`, `#[allow(dead_code)]`) is called only from `nda/handlers.rs:147,191,234`, each discarding the result via `let _ =`. The `access` module (grant/revoke) and `person` module (create/update/delete) make zero audit calls. `audit/middleware.rs` is an empty Phase-2 stub. CLAUDE.md advertises "audit logging" as a core feature.
*Impact:* Access grants/revokes and personnel/role changes are never recorded; existing NDA audit writes silently ignore DB failures.
*Fix:* Call `create_audit_log` from access/person/org mutating handlers; log (don't discard) the `Result`; implement or remove the middleware stub.

### D. Frontend Architecture & Security

**D1 — Dual `ProtectedRoute`; shadow route tree skips role checks (CRITICAL).**
*Evidence:* `protected-route.tsx:5` (auth-only, no role logic) vs `ProtectedRoute.tsx:20` (`allowedRoles: string[]`, `.includes(user.role)` at `:43`). 15+ top-level routes import the auth-only variant with **no** `allowedRoles` (e.g., `access/index.tsx:52`, `roles/index.tsx:45`, `ndas/index.tsx:63`, `audit/index.tsx:11`). All paths (`/access`, `/roles`, `/ndas`, `/audit`, `/info-systems`, `/organizations`, `/dashboard`, `/tasks`, `/profile`, `/person`) are live in `routeTree.gen.ts`; `layout.tsx:28-49` nav only links to `/admin|/enduser|/official`, hiding (but not gating) them. No `beforeLoad`/route-level guard compensates. Combined with A2 (unguarded backend), a non-admin who navigates directly to `/access` renders the grant UI **and** the API executes the mutation = real privilege escalation.
*Fix:* Delete the orphaned top-level route files (resolves D2 too), regenerate `routeTree.gen.ts`, delete `protected-route.tsx`, keep only the role-aware guard; verify nav and `getDefaultRoute` (`auth-context.tsx:101`) target only the surviving `/admin|/enduser|/official` trees.

**D2 — Entire route tree duplicated, ~3,500 lines, already drifting (HIGH).**
*Evidence:* ~10 byte-near-identical top-level vs `/admin` pairs differing only in the `ProtectedRoute` import, route path, `allowedRoles` prop, and Link targets (access 379/379, ndas 478/478, roles 422/422, person `$personId` 517/516, organizations `$organizationId` 399/398, info-systems 454/452). **Drift confirmed:** `person/$personId.tsx:54-56` vs `admin/person/$personId.tsx:54-55` render the header name differently; clearance default `UNCLASSIFIED` vs `NONE`; info-systems `alert()` vs `console.error`.
*Fix:* Remove the obsolete top-level copies (with D1).

**D3 — Client-side-only role enforcement (HIGH).**
*Evidence:* `ProtectedRoute.tsx:43` checks `allowedRoles.includes(user.role)` where `user` is hydrated from `localStorage` (`auth-context.tsx:29-33`) — not the signed JWT. A user can edit the stored role or call the API directly (per A2/A1).
*Fix:* Treat client guards as UX only; enforce all authorization server-side (see A2). Never make a security decision from localStorage role.

**D4 — Demo/mock app shipped in production build (MEDIUM).**
*Evidence:* `vite.config.ts:24` declares `demo: demo.html` as a second rollup input. `npx vite build` emits `dist/demo.html` (title "Janus — Authorization Hub (DEMO/MOCK)") + `dist/assets/demo-*.js` (76.4K). `nginx.conf` serves it statically at a guessable `/demo.html`, no env gate. The demo bundle is auth-less but contains no real data/API code, so blast radius is the unintended prototype surface, not a data leak.
*Fix:* Remove the `demo` input from the prod build (gate behind env or a `build:demo` script) — `spikes.html` is already excluded, the correct pattern.

**D5 — Pervasive `any`/`as any` (MEDIUM).**
*Evidence:* `api.ts` `data?: any` at `:7,9,68,75` (every POST/PUT body untyped); component/route `any` (`details-tab.tsx:11`, `organizations/$organizationId.tsx:100,214-215,348` + admin mirror); enum-bypass `value as any` (`access/index.tsx:220,273,288,351`; `ndas/index.tsx:167` where `'success'` is already valid, masking a Badge mismatch); navigation casts (`layout.tsx:159,169`; `login.tsx:39`; `ProtectedRoute.tsx:39`). `tsconfig.app.json` has `strict: true`, so these are deliberate escapes. ~36 hits.
*Fix:* Generic-type `api.post/put` bodies; type props with `Organization`/`Person`; replace enum casts with `ClearanceLevel`/`AccessLevel` unions; use TanStack typed `to`.

**D6 — `alert()/confirm()` for all feedback (MEDIUM).**
*Evidence:* 56 blocking calls drive UX/error handling (e.g., `ndas/index.tsx:191,364,382`; `person/$personId.tsx:183,205,...`; `info-systems.tsx:162,...`; `details-tab.tsx:39`); destructive deletes gated only by native `confirm()` (`ndas/index.tsx:185`, `roles/index.tsx:140`, `info-systems.tsx:183`). Contradicts CLAUDE.md:161-163 ("No toast — errors rendered inline"); `ndas/index.tsx:109` already renders inline load errors in the *same file*.
*Fix:* Inline `bg-destructive/10 text-destructive` blocks + shadcn `AlertDialog` for confirms; surface React Query `error` state.

**D7 — Oversized multi-concern route components (MEDIUM).**
*Evidence:* >300-line files (excl. generated/tests/demo): `person/$personId.tsx` 517 (page + local `DetailsTab` `:115` + `VendorRelationsTab` `:165` + inline NDA dialog) and its admin mirror 516; ndas 478×2; admin/discussions 462; person-relations 461; info-systems 454/452; organizations 427; roles 422×2; etc.
*Fix:* After de-duplicating (D1/D2), extract inline sub-components into the (currently dead) `person-details/` dir and split list+create-dialog concerns.

**D8 — Frontend low-severity items:** dead `src/components/person-details/` (5 files, zero importers; route files use local copies — `person/$personId.tsx:115,165`); orphaned Vite scaffold `App.tsx`/`App.css` + `react.svg`; `console.log` in prod incl. WS message dump of full payloads (`websocket-context.tsx:23`, no `drop_console`); unused `hasRole`/`hasAnyRole` (`auth-context.tsx:117`); TODO hardcoded `personnelRelations: any[] = []` rendering a silently-empty panel even though the backend endpoint **exists** (`relations/handlers.rs:132`, hook `use-relations.ts:48` — a wiring oversight, not a missing endpoint) plus absent grant success/error feedback (`access/index.tsx:44,47`); floating delete `mutate` without `onError` (`organizations/$organizationId.tsx:369`); `as any` on the auth redirect `Navigate` masking a missing `/login` `validateSearch` schema (`ProtectedRoute.tsx:39`).

### E. Migrations & Database

**E1 — `sqlx migrate run` fails on file #1 on a fresh DB (CRITICAL).**
*Evidence:* Empirically reproduced: fresh DB → `error: while executing migration 20250127000000: relation "vendor_relations" does not exist`, exit 1, zero app tables. Root cause: lexicographic version order — `20250127000000_add_dates_to_vendor_relations.sql:2` ALTERs `vendor_relations`, but the table is only created in `20251026195324_create_vendor_relations_table.sql` (sorts later). The live `janus2` DB has **no** `_sqlx_migrations` table, proving it was hand-assembled.
*Fix:* Renumber the January-dated files to fall after their dependencies, or (safest, since no env tracks these migrations) consolidate to a single dependency-ordered baseline regenerated from `pg_dump --schema-only` of `janus2` and archive the historical files.

**E2 — ALTER-before-CREATE pervasive across the January era (CRITICAL).**
*Evidence:* `20250131000000_create_person_table_unified.sql` `INSERT...SELECT FROM users`/`personnel` (created Oct), ALTERs `computer/data/physical_access`, `nda`, `discussions`, `document_references`, `audit_log` (all later-dated), and `CREATE TRIGGER ... update_updated_at_column()` (`:254`) where the function is defined in the later-sorting `20251026112327_create_users_table.sql:18`. `20250131000001/2` `UPDATE relations` (created `20251101180000`).
*Fix:* Same remediation as E1; verify with a full `sqlx migrate run` on a throwaway DB before merge.

**E3 — Duplicate version prefixes (HIGH).**
*Evidence:* 3 files share `20251026132437` (computer/data/physical_access), 2 share `20251101190000` (add_schema_org_relation_types, rename_vendors_to_organizations). sqlx `_sqlx_migrations` uses `version BIGINT PRIMARY KEY`; the migrator snapshots applied versions once, then the second/third same-version file hits a duplicate-key violation on insert (verified against sqlx 0.7.4 source), aborting the run and making apply order non-deterministic.
*Fix:* Give every migration a unique version (bump two of the `...437` files and one `...190000` file); confirm `sqlx migrate info` shows no repeats.

**E4 — Contradictory/abandoned lineages (HIGH).**
*Evidence:* Path A (`20250131000000`+`...001`) creates `person`, migrates, then `DROP TABLE users/personnel CASCADE`. Path B (`20251101191000_rename_personnel_to_person.sql:2`) `ALTER TABLE personnel RENAME TO person` — incompatible; both define `update_person_updated_at`. Same for `vendor_relations` vs unified `relations` vs renamed `organizations`. Live `janus2` holds BOTH `users` AND `person` (4 identities duplicated as ids 1-4 and 6-9), BOTH `vendor_relations` AND `relations` AND `organizations` (17 tables) — irreproducible. Plus a case bug at `20251101190000_...:28`: `UPDATE relations SET entity_type='ORGANIZATION' WHERE entity_type='VENDOR'` can never match the lowercase `'personnel'/'vendor'` CHECK constraint.
*Fix:* Pick one canonical lineage, delete the abandoned migrations (not both), fix the `'ORGANIZATION'/'VENDOR'` case mismatch — best as part of the consolidated baseline.

**E5 — No auto-run migrations (MEDIUM).**
*Evidence:* `grep -rn migrate backend/src backend/Cargo.toml` = 0; `rocket_setup.rs` builds the pool but never runs migrations. Combined with E1–E4, there is no working automated path to the schema.
*Fix:* After repairing the set, either document the CLI step in CI/deploy or embed `sqlx::migrate!("./migrations").run(&pool)` in `create_rocket()`. Do **not** enable auto-run until ordering/duplicates are fixed.

### F. Documentation & Architecture Drift

**F1 — README documents the failing setup command (HIGH).**
*Evidence:* `backend/README.md:24-28` instructs `sqlx database create` / `sqlx migrate run` — the exact command proven to fail (E1). `docs/10-MIGRATION-STRATEGY.md` is about 1.0→2.0 data migration ("not yet executed") and doesn't cover sqlx ordering. No doc acknowledges the breakage.
*Fix:* Fix the migrations (preferred) and re-verify the README command on a throwaway DB; until then, document the actual working provisioning method and flag the set as broken.

**F2 — README & CLAUDE.md silent on the v2.1 milestone (HIGH).**
*Evidence:* README "Development Status" stops at "FRONTEND CONSOLIDATION COMPLETE / Nov 1, 2025"; grep for `zone|abac|federation` in README/CLAUDE.md returns nothing about v2.1. Meanwhile `.planning/phases/05-08` + `STATE.md` document a full ABAC + federation-hub + zone milestone, and `frontend/src/demo` is ~7,325 LOC. CLAUDE.md is auto-loaded agent context, so the wrong mental model propagates to every session.
*Fix:* Add a v2.1 section to README & CLAUDE.md describing the demo island (entry `demo.html`, code `frontend/src/demo/`), its mock-first nature, the ABAC/federation/zone model, and its isolation from the production app.

**F3 — v2.1 zones/grants/entry-logs/visitor-passes have no backend persistence (MEDIUM).**
*Evidence:* All zone state is one `useReducer(reducer, undefined, seedWorld)` (`world-state.tsx:469-470`) seeded from frozen TS arrays in `demo/lib/seed.ts:961-1242`. `grep fetch|localStorage|apiFetch|VITE_API` across `frontend/src/demo/` = 0. No migration creates zones/grants/entry_logs/visitor_passes (only a flat `physical_access` table with a `zone_name` column). State resets to seed on reload. This is intentional (mock-first, "build-later") and self-labeled, but invisible at the repo top level.
*Fix:* Keep it explicitly labeled demo-only with a top-level note, or build the backend (migrations + Rust `zones` module + REST wiring).

**F4 — README "no mock data / 100% complete" contradicted (MEDIUM).**
*Evidence:* `README.md:142` "100% complete features, no mock data" and `:361` "No mock data, no TODO comments" vs an explicit 7,325-LOC mock island (permanent `[DEMO/MOCK]` banner, `MockTag`, `// [MOCK]` markers). README predates the v2.x pivot.
*Fix:* Scope the "no mock data" rule to the production app, or note the demo island as an intentional isolated exception.

**F5 — Documented anti-patterns still live (MEDIUM).**
*Evidence:* Both `ProtectedRoute` files coexist (1.4K role-aware + 879B auth-only), each imported by ~18 routes (live footgun; `admin/profile.tsx` & `official/profile.tsx` even pass `allowedRoles={['enduser']}` — a probable copy-paste bug); no service layer (deliberate, README-celebrated); 86 swallowed errors. Cross-references D1/D3 (consolidation) and B1 (logging).
*Fix:* Consolidate to the canonical `ProtectedRoute`; replace `map_err(|_| ...)` with a logged path.

**F6 — Deferred "build-later" scope invisible outside `.planning/` (MEDIUM).**
*Evidence:* `06-SPEC.md:74,78` and `06-VERIFICATION.md:42-110` defer backend impl and `canIssueGrant()` enforcement to "Phase 8 UI" (a mock phase); `canIssueGrant` does not exist in `frontend/src` (delegation authorization is unimplemented). Yet `README.md:305` documents `POST /api/access/physical` as live and CLAUDE.md describes a backed three-tier-grant system with no caveat.
*Fix:* Add a short "v2.1 scope: physical-zone & delegation are demo/mock-frontend only; backend + `canIssueGrant` enforcement deferred" note to README/CLAUDE.md.

**F7 — `docs/` is a v2.0 snapshot (LOW).**
*Evidence:* grep of v2.1 vocabulary across `docs/` yields one incidental line (`09-LESSONS-LEARNED.md:365`); `docs/features/` has only `info-systems/`; numbered architecture/data-model/API docs describe only the v2.0 flat `physical_access` model and never the zone hierarchy/federation; the `demo.html` entry is undocumented outside `.planning/`.
*Fix:* Add a docs/README pointer to the demo island and mark numbered docs as v2.0-scoped pending a v2.1 update.

### G. Testing

**G1 — Playwright boots only the frontend; e2e silently needs a separate backend + seed (HIGH).**
*Evidence:* `playwright.config.ts:22-26` runs `npm run dev` (= `vite`, frontend only); specs POST to the real backend (`nda.spec.ts:19`, `role-based-routing.spec.ts:10`, `navigation-flow.spec.ts:10`) and depend on seed data. No `globalSetup`, no CI dir, no `test:e2e` script — yet both READMEs document `npm run test:e2e`, which errors with "Missing script."
*Fix:* Add a `test:e2e` script; extend `webServer` to boot backend+frontend with a health-check + `globalSetup` running migrations/seed against a disposable test DB, or fail fast with a clear "backend not reachable" message.

**G2 — Backend RBAC/auth/access-grant: zero integration coverage (HIGH).**
*Evidence:* `backend/tests/` has only `info_systems_test.rs` (CRUD) and `nda_test.rs` (all `#[ignore]`). No test exercises `AuthGuard`, `role_has_permission`, login 401, or any grant/revoke handler. (JWT/bcrypt primitives have inline unit tests at `jwt.rs:48-68` and `handlers.rs:155-160`, but the enforcement points are untested.) The only RBAC assertion lives in `audit.spec.ts:20`, in the e2e layer that can't run.
*Fix:* Add Rocket local-client integration tests for login success/401, `AuthGuard` rejecting missing/invalid tokens, `role_has_permission` allow/deny per role, and grant/revoke per tier.

**G3 — E2e login asserts `/personnel`; admin lands on `/admin/dashboard` (HIGH).**
*Evidence:* `auth.spec.ts:20` (and 47,62,68) assert `toHaveURL('/personnel')`; shared `login()` helpers in 5 specs `waitForURL('/personnel')`. But `getDefaultRoute('admin')` → `/admin/dashboard` (`auth-context.tsx:103-104`), and no top-level `/personnel` route exists in `routeTree.gen.ts`. `role-based-routing.spec.ts:114` correctly waits for `/admin/dashboard`. → guaranteed-failing `beforeEach` across 6 spec files.
*Fix:* Update all login helpers to `/admin/dashboard` (or per-role `getDefaultRoute`); centralize the post-login URL in one shared helper.

**G4 — Two specs hardcode `localhost:5173` (HIGH).**
*Evidence:* `playwright.config.ts` sets `baseURL: http://localhost:15510`, but `role-based-routing.spec.ts` navigates to `http://localhost:5173/` 15× (`:17,43,...,186`) and `navigation-flow.spec.ts` 7×. Nothing listens on 5173 (stock Vite default). These two files contain the **only** dedicated RBAC route-guard/cross-role coverage, so it's effectively dead.
*Fix:* Use relative paths (`page.goto('/')`) so `baseURL` applies; centralize the API origin in a config constant.

**G5 — E2e parses a `data.*` envelope the backend doesn't return (MEDIUM).**
*Evidence:* `nda.spec.ts:27` reads `loginData.data?.token`, `:37` `personnelData.data?.items`, `:58/110` `.data.id`. Backend `LoginResponse` is flat `{ token, person_id, role }` (`auth/handlers.rs:54-58`) and `PaginatedResponse` is flat `{ items, ... }` (`response.rs:31-38`); only DELETE wraps in `ApiResponse`. So `.data?.items` is undefined → always takes the create branch → `newPersonnel.data.id` throws. `role-based-routing.spec.ts:21` reads nonexistent `data.user_id` (field is `person_id`).
*Fix:* Parse the real flat shapes; add a backend test asserting login/list shapes; standardize one envelope convention.

**G6 — RBAC tests/guards target unseedable roles (MEDIUM).**
*Evidence:* `role-based-routing.spec.ts:36-37` defines `enduser`/`official` credentials and `getDefaultRoute` routes them, but only `admin/manager/operator/viewer` are seeded and the CHECK constraint forbids other roles. The frontend has real `enduser/`/`official/` route trees, so the UI is built on a 3-role model the DB can't persist; those positive-access guard branches are untestable. (Note: the spec's `loginAsRole` calls all use `admin`, so it doesn't 401 as the finding's mechanism claimed.)
*Fix:* Reconcile the role taxonomy (seed + widen CHECK, or rewrite guards/tests to real roles); add backend RBAC tests as the single source of truth.

**G7 — Conditional `test.skip()` hides broken flows (MEDIUM).**
*Evidence:* `info-systems.spec.ts` has 7 runtime guards (`:100,109,124,209,268,299,334`) that mark edit/delete/pagination/status tests *skipped* when data is absent. With no seeding, an empty DB or changed selectors becomes a green skip on the largest e2e file.
*Fix:* Seed a known info-system in `beforeEach` (via API); reserve `test.skip` for genuinely environment-gated cases.

**G8 — Vitest coverage is mostly sandbox code (MEDIUM).**
*Evidence:* 13 vitest files: 6 under `demo/`, 6 under `spikes/` (dead — zero imports outside `spikes/`, duplicates `demo/` tests), only `use-websocket.test.ts` covers shared prod code. ~154 tests look healthy but the canonical security guard `ProtectedRoute.tsx`, `auth-context.tsx` (`getDefaultRoute`/`hasRole`), `api.ts`, and all `src/hooks/` have zero unit tests. CLAUDE.md flags "do not regress the role-aware UI guards."
*Fix:* Add focused tests for `ProtectedRoute` `allowedRoles`, `getDefaultRoute`/`hasRole`, and `api.ts` error normalization; delete `spikes/` + its duplicated tests if no longer needed.

**G9 — `nda_test.rs` is 5 `#[ignore]` stubs (MEDIUM).**
*Evidence:* All 5 tests (`:16-45`) are `#[ignore]` with empty bodies and "Test implementation would go here". NDA lifecycle (7 live endpoints, 8 audit refs) has no executing backend test; `cargo test` reports them as ignored, masking the gap.
*Fix:* Implement using the `Client` + `get_auth_token` pattern from `info_systems_test.rs`, or delete the placeholder so the gap is honest.

**G10 — Testing low-severity:** hardcoded `password123` + seed-row coupling copy-pasted across 11 specs (`role-based-routing.spec.ts:33-37`; extract a shared fixtures module); Vitest excludes by path only (`vite.config.ts` `exclude: ['e2e/**','node_modules/**']`, default include still matches `**/*.spec.ts` → a misplaced spec breaks `npm test`; verified by reproduction; fix by also excluding `**/*.spec.ts`).

### H. Build, Dependencies & Configuration

**H1 — Docker backend build fails on sqlx compile-time macros (CRITICAL).**
*Evidence:* 31 compile-time sqlx macros (`query!`/`query_as!`/`query_scalar!`) across 7 handler files. `Dockerfile:17` sets `DATABASE_URL=...host.docker.internal:15530/janus2`, `:27` runs `cargo build --release` with no `SQLX_OFFLINE`. The offline cache `.sqlx/` is gitignored and excluded by `.dockerignore:32`. With no cache and offline unset, sqlx attempts a live connect to an unreachable host during `docker compose --profile full build` → hard failure for CI/clean clones.
*Fix:* Commit `backend/.sqlx/`, remove it from `.dockerignore`, COPY it in the Dockerfile, and add `ENV SQLX_OFFLINE=true` before `cargo build` (standard reproducible approach).

**H2 — Docker `full` profile: missing MinIO env + WebSocket port (HIGH).**
*Evidence:* `docker-compose.yml:26-31` sets DB/JWT/ROCKET vars but no `MINIO_*`, and there is no MinIO service at all → uploads fall back to `localhost:9000` inside the container. The backend binds WS on `0.0.0.0:15540` (`rocket_setup.rs:36`) but only `15520:8000` is published (`:33`); the frontend's `ws://localhost:15540` (`websocket-context.tsx:16`) cannot reach it.
*Fix:* Add `ports: - "15540:15540"`, add `MINIO_*` env + a minio service (or external endpoint), and set `VITE_WS_URL` to the published WS URL.

**H3 — `routeTree.gen.ts` gitignored but build-required (MEDIUM).**
*Evidence:* Not git-tracked, yet 27.2K on disk and imported by `main.tsx:8`; ignored in BOTH root `.gitignore` and `frontend/.gitignore`. Build is `tsc -b && vite build`, so `tsc` runs *before* vite (the TanStack plugin regenerator) → on a clean clone the import is missing and `tsc -b` emits TS2307. Docker `COPY . .` excludes it too, so a clean Docker build hits the same failure.
*Fix:* Either commit the file (remove both ignore entries) or run codegen/vite before `tsc`; consolidate the duplicated ignore rule.

**H4 — Outdated Rust deps (MEDIUM).**
*Evidence:* sqlx 0.7.4 (RUSTSEC-2024-0363 binary-protocol misinterpretation, fixed in 0.8.1), validator 0.16.1 (several majors behind, changed derive API), tokio-tungstenite 0.21.0. s3-tokio 0.39.6 is a niche maintained fork (Rust 1.86+ workaround).
*Mitigation:* the sqlx advisory needs 4GiB+ attacker-controlled input — unlikely for this internal tool.
*Fix:* Plan upgrades (sqlx 0.7→0.8 for the advisory; validator handler edits; tokio-tungstenite); run `cargo audit` before/after.

**H5 — Build/config low-severity:** `log`/`env_logger` declared but never used (`Cargo.toml:46-48`); `tokio-test` unused dev-dep (`:50-52`); orphaned `App.tsx`/`App.css` (also tracked under D8); hardcoded MinIO credential fallbacks (`document_references/handlers.rs:206-207`); WS address hardcoded with no env override (`rocket_setup.rs:36`); no `.nvmrc` and `@types/node ^24` vs Node 20 runtime; no Prettier and ESLint has no style rules (formatting unenforced; the `ecmaVersion 2020` "drift" is cosmetic/inert under the typescript-eslint parser).

---

## 4. Quick Wins (trivial/small effort, high value)

1. **Add `_auth: AuthGuard` to the 4 `vendor_relations` handlers** (`vendor_relations/handlers.rs:10,33,81,151`) — closes the only fully-unauthenticated REST surface. *(trivial; Critical)*
2. **Add `#[serde(skip_serializing)]` to `Person.password_hash`** (`person/models.rs`) — stops leaking bcrypt hashes to every authenticated caller. *(small; High)*
3. **Fail-fast JWT secret guard** (`rocket_setup.rs:22-23`): require the env var + assert `len() >= 32` for non-test builds — eliminates forgeable-admin-token risk. *(small; High)*
4. **Return `Status`/`AppError` (not `String`) from `vendor_relations`** (`handlers.rs:26,74,92,141,159`) — stops raw DB error disclosure. *(small; High)*
5. **Add `ENV SQLX_OFFLINE=true` + commit/COPY `.sqlx/`** (`Dockerfile`, `.dockerignore:32`) — unblocks CI/Docker `full` builds. *(small; Critical)*
6. **Give duplicate migration versions unique prefixes** (3× `20251026132437`, 2× `20251101190000`) — removes a hard migration PK conflict. *(small; High)*
7. **Add the missing `ports: - "15540:15540"` and `MINIO_*` config** to `docker-compose.yml` — restores WS + uploads in the full profile. *(medium-but-mechanical; High)*
8. **Fix e2e base URLs/redirects**: replace `localhost:5173` with relative paths in 2 specs (G4), and update `/personnel`→`/admin/dashboard` in the 6 login helpers (G3). *(small; revives the only RBAC e2e coverage)*
9. **Switch error closures to the logging variant** project-wide (`|e| { eprintln!(...); Status::InternalServerError }`) — makes 86 swallowed 500s debuggable. *(medium; High)*
10. **Replace `unwrap_or(0)` with `.map_err(|_| Status::Unauthorized)?`** on JWT-subject parses (A6). *(trivial; Medium)*
11. **Delete dead code**: `App.tsx`/`App.css`, `src/components/person-details/`, unused `hasRole`/`hasAnyRole`, `create_pool`, stale `#[allow(dead_code)]`, unused `log`/`env_logger`/`tokio-test`. *(trivial–small; Low, but clears noise)*
12. **Remove the `demo` input from the prod Vite build** (`vite.config.ts:24`) — stops shipping the unauthenticated mock at `/demo.html`. *(small; Medium)*

---

## 5. Suggested Remediation Sequence

**Phase 0 — Stop the bleeding (security, days).**
Start with the unauthenticated/leaking surface and forgeable tokens because they are exploitable today and cheap to fix: vendor_relations auth (QW1), `password_hash` serialization (QW2), JWT secret fail-fast (QW3), vendor_relations error-string leak (QW4). These are trivial/small and directly restore the Core Value invariant.

**Phase 1 — Make the schema reproducible (unblocks everyone).**
Fix the migration set *before* anything that touches the DB: resolve ordering (E1/E2) and duplicate versions (E3), pick one lineage and delete the abandoned migrations + fix the `'ORGANIZATION'/'VENDOR'` case bug (E4), then re-verify `sqlx migrate run` end-to-end on a throwaway DB and correct the README (F1). Decide auto-run vs CLI (E5). This is prerequisite for CI, fresh environments, disaster recovery, *and* for backend integration tests. The safest path is a consolidated baseline from `pg_dump` of the live `janus2`.

**Phase 2 — Unblock builds (CI/Docker).**
Fix the Docker sqlx-offline build (H1/QW5), the `routeTree.gen.ts` build ordering (H3), and the `full`-profile WS/MinIO gaps (H2/QW7). Now both backend and frontend build reproducibly from a clean clone — a precondition for trustworthy automated testing.

**Phase 3 — Close the real authorization holes (the big one).**
Implement backend RBAC across all mutating handlers (A2) — this is the deepest fix and the one that actually makes the system safe, since client guards are cosmetic (D3). Pair it with consolidating to the single canonical `ProtectedRoute` and deleting the shadow route tree (D1/D2), which also removes ~3,500 lines of drifting duplication and roughly halves the oversized-file count (D7). Add audit logging to access/person mutations (C1) in the same pass, since you're already editing those handlers.

**Phase 4 — Build the safety net.**
Add backend integration tests for auth/RBAC/access grants (G2) — fast, deterministic, and now possible because the schema is reproducible (Phase 1). Then repair the e2e harness (G1/G3/G4/G5/G6/G7) and add unit tests for the canonical guards (G8). Do this *after* Phase 3 so the tests encode the corrected behavior rather than the broken one.

**Phase 5 — Hardening, hygiene & docs.**
Sweep the medium/low items: logging swap (B1), `any`/`as any` cleanup (D5), `alert/confirm`→inline errors (D6), CORS allowlist (A5), dep upgrades incl. sqlx 0.8 (H4), and the documentation drift (F2–F7) so README/CLAUDE.md reflect the v2.1 demo island and deferred scope. Fold in the remaining quick-win deletions (QW11/QW12) opportunistically.

*Rationale:* security-now → reproducible schema → working builds → real authorization → tests → polish. Each phase removes a blocker for the next: you cannot meaningfully test (Phase 4) until the schema is reproducible (Phase 1) and builds work (Phase 2), and you should not lock in tests until the authorization model is correct (Phase 3).
