# Codebase Concerns

**Analysis Date:** 2026-06-18

---

## Security Considerations

### RBAC Not Enforced on Most Backend Endpoints

**Risk:** Any authenticated user (regardless of role) can read or mutate persons, access grants, NDAs, audit logs, organizations, relations, discussions, and document references. The `role_has_permission` function exists in `backend/src/shared/rbac.rs` but is called **only** in `backend/src/roles/handlers.rs`. Every other domain handler accepts any valid JWT bearer token as sufficient authorization.

**Files:**
- `backend/src/shared/rbac.rs` — function defined but unused outside roles
- `backend/src/access/handlers.rs` — grants computer/data/physical access with no role check
- `backend/src/person/handlers.rs` — creates and updates persons with no role check
- `backend/src/nda/handlers.rs` — issues NDAs with no role check
- `backend/src/audit/handlers.rs` — reads full audit log with no role check
- `backend/src/relations/handlers.rs` — manages relations with no role check
- `backend/src/organizations/handlers.rs` — manages orgs with no role check

**Current mitigation:** Frontend `ProtectedRoute` / `allowedRoles` guard limits UI access by role, but this is client-side only.

**Recommendations:** Apply `role_has_permission` (or a simpler `auth.claims.role` pattern) in every mutating handler. At minimum, scope write endpoints to `admin`/`manager` roles and read endpoints to everything above `viewer`.

---

### JWT Secret Falls Back to a Hardcoded Test Value in Production

**Risk:** If `JWT_SECRET` env var is absent at startup, the server silently uses `"test-secret-key-must-be-at-least-32-characters-long"`. Any attacker who knows this default can forge valid JWTs.

**Files:** `backend/src/shared/rocket_setup.rs:22`

**Fix approach:** Panic (or refuse startup) when `JWT_SECRET` is missing in non-test environments. Add a `cfg!(test)` guard so the fallback only applies in test builds.

---

### CORS Wildcard with Credentials Enabled

**Risk:** `AllowedOrigins::all()` combined with `.allow_credentials(true)` is a CORS misconfiguration. Browsers block wildcard origin with credentials per spec, but some older clients and non-browser HTTP clients are unrestricted.

**Files:** `backend/src/shared/rocket_setup.rs:57-67`

**Fix approach:** Restrict `allowed_origins` to a specific allowlist (e.g., `http://localhost:15510` in dev, production origin in prod).

---

### Hardcoded MinIO Credentials as Fallback

**Risk:** `backend/src/document_references/handlers.rs:206-207` falls back to `"janusminio"` / `"janusminio_password"` when env vars are not set. If MinIO is reachable from the network, these credentials grant full document bucket access.

**Files:** `backend/src/document_references/handlers.rs:205-208`

**Fix approach:** Panic on missing MinIO credentials in production, same as JWT secret pattern above.

---

### `unwrap_or(0)` on Person ID Parse — Silent Auth Confusion

**Risk:** Multiple handlers parse the JWT subject (person ID) with `.unwrap_or(0)`. If parsing fails, the handler silently operates as person ID 0 (non-existent), yielding `NOT FOUND` from the DB rather than a proper auth error.

**Files:**
- `backend/src/auth/handlers.rs:66` — `get_profile`
- `backend/src/auth/handlers.rs:108` — `change_password`
- `backend/src/discussions/handlers.rs:106`, `141`
- `backend/src/nda/handlers.rs:117`, `192`, `235`
- `backend/src/document_references/handlers.rs:111`

**Fix approach:** Return `Status::Unauthorized` on parse failure instead of falling through with ID 0.

---

## Tech Debt

### Duplicate Flat Routes vs. Admin Routes

**Issue:** Pre-pivot flat routes under `frontend/src/routes/{access,roles,ndas,organizations,person,person-relations,info-systems,tasks,...}` are near-identical copies of the canonical `frontend/src/routes/admin/` pages. They are unlinked from navigation but still compiled, maintained in the route tree, and carry older bugs.

**Files:**
- `frontend/src/routes/access/index.tsx` (379 lines) — mirrors `frontend/src/routes/admin/access/index.tsx` (379 lines)
- `frontend/src/routes/ndas/index.tsx` (478 lines) — mirrors `frontend/src/routes/admin/ndas/index.tsx` (527 lines)
- `frontend/src/routes/roles/index.tsx` (422 lines) — mirrors `frontend/src/routes/admin/roles/index.tsx` (422 lines)
- `frontend/src/routes/info-systems.tsx` (454 lines) — mirrors `frontend/src/routes/admin/info-systems.tsx` (452 lines)
- `frontend/src/routes/organizations/` — mirrors `frontend/src/routes/admin/organizations/`
- `frontend/src/routes/tasks.tsx` — mirrors `frontend/src/routes/enduser/tasks.tsx`
- `frontend/src/routes/person-relations/` — role unclear

**Impact:** Dead code doubles the surface area of every UI bug fix; fixes applied to `/admin/*` must be manually checked against the flat copies. Bundle size is inflated. Regenerated `routeTree.gen.ts` includes these routes.

**Fix approach:** Delete all flat route files that are shadowed by `/admin/`, `/enduser/`, or `/official/` equivalents. Regenerate `routeTree.gen.ts`.

---

### `App.tsx` — Vite Scaffold Leftover

**Issue:** `frontend/src/App.tsx` is the original Vite scaffold (counter demo). Real entry is `main.tsx` + `routes/__root.tsx`. The file exists but is never imported.

**Files:** `frontend/src/App.tsx`

**Fix approach:** Delete `App.tsx` and `App.css`.

---

### Migration History Cannot Reconstruct a Clean Database

**Issue:** Running `sqlx migrate run` on a fresh DB fails due to ordering conflicts:
- `20251101191000_rename_personnel_to_person.sql` executes `ALTER TABLE personnel RENAME TO person` — but on a clean DB the `personnel` table does not exist yet if the later-timestamped `20250131000000_create_person_table_unified.sql` has already run first.
- `20251026112329_create_personnel_table.sql` creates `personnel`, then `20250131000000` creates a new unified `person` table — both coexist in the migration sequence but the unified migration supersedes the earlier ones.
- Two migrations share timestamp prefix `20251101190000` (schema org relation types + rename vendors to organizations).

**Files:** `backend/migrations/` — specifically the 2025-10 series and 2025-01-31 series.

**Impact:** Cannot spin up a fresh dev environment or CI DB without manual intervention.

**Fix approach:** Squash all migrations up to the current stable schema into a single `0000000000_initial_schema.sql` baseline, then add incremental migrations from that point forward.

---

### Relations Backend Missing Endpoint for Person-Specific Lookup

**Issue:** Two frontend pages stub a missing backend endpoint for fetching relations by `person_id`. The frontend leaves the data as an empty array `[]` with a `TODO` comment.

**Files:**
- `frontend/src/routes/person/$personId.tsx:178-179`
- `frontend/src/routes/admin/person/$personId.tsx:178-179`

**Impact:** Person detail pages silently show no relations.

**Fix approach:** Add `GET /api/relations?person_id=<id>` handler in `backend/src/relations/handlers.rs` and wire up the frontend hook.

---

### `any` Type Proliferation in TypeScript

**Issue:** ~18 explicit `: any` annotations across the frontend undermine strict TS checks and hide type errors.

**Files (sample):**
- `frontend/src/components/person-details/details-tab.tsx:11` — `personnel: any`
- `frontend/src/routes/organizations/$organizationId.tsx:100,214,215,348`
- `frontend/src/routes/admin/organizations/$vendorId.tsx:99,213,214,347`
- `frontend/src/routes/person-relations/index.tsx:287-288`
- `frontend/src/lib/api.ts:7,68,75` — API response/request typed as `any`

**Fix approach:** Define shared types in `frontend/src/types/` for Organization, Relation, and API payloads; replace `any` with those types.

---

### `console.error` Used for Error UI Instead of In-App Feedback

**Issue:** Across ~20 error handlers, errors are logged to `console.error` but not surfaced to the user in the UI (no toast, no inline message). Users see silent failure.

**Files (sample):**
- `frontend/src/routes/admin/ndas/index.tsx:206,415`
- `frontend/src/routes/admin/discussions/index.tsx:304,411`
- `frontend/src/routes/admin/info-systems.tsx:178,191,362`
- `frontend/src/routes/ndas/index.tsx:190,381`
- `frontend/src/components/person-details/vendor-relations-tab.tsx:91,102`

**Fix approach:** Per conventions, render inline error messages (`bg-destructive/10 text-destructive`) rather than only logging. The existing `ApiError{status}` propagation makes this straightforward.

---

### WebSocket Auth Rejection Loop

**Issue:** The WebSocket server on port 15540 rejects authentication, causing the frontend reconnect logic to flood the browser console with errors on every page load. This is a known non-fatal issue but degrades developer experience and obscures real errors.

**Files:**
- `backend/src/messaging/handlers.rs`
- `frontend/src/hooks/use-websocket.ts:69,101,106,125`
- `frontend/src/contexts/websocket-context.tsx:23`

**Impact:** Console noise makes debugging harder; reconnect loops may contribute to backend load.

**Fix approach:** Investigate why auth fails in the WS handshake (likely bearer token format mismatch). Add exponential backoff or a max-retry cap in `use-websocket.ts` to prevent infinite loops.

---

## Fragile Areas

### `routeTree.gen.ts` — Generated File Committed, Easy to Desync

**Issue:** `frontend/src/routeTree.gen.ts` (779 lines) is auto-generated by TanStack Router. It is committed to the repo and must be manually regenerated after any route directory change. A desync between the route directory tree and this file causes silent routing failures.

**Files:** `frontend/src/routeTree.gen.ts`

**Why fragile:** Adding or removing a route file without regenerating causes the router to silently ignore the new route or continue serving the old one.

**Safe modification:** Always run the TanStack route generation command after touching `frontend/src/routes/`; commit the new `routeTree.gen.ts` in the same PR.

---

### Hand-Rolled `Dialog` Component Lacks Portal/Focus-Trap

**Issue:** `frontend/src/components/ui/dialog.tsx` is a hand-rolled dialog, not Radix UI Dialog. It lacks focus trapping, scroll lock, and a proper portal mount. An empty `<SelectItem value="">` inside a dialog will cause a full-page crash (Radix throws, root error boundary shows blank screen).

**Files:** `frontend/src/components/ui/dialog.tsx`

**Why fragile:** Any consumer that passes an empty-string value to `<SelectItem>` inside a dialog will trigger a full-page crash with an unhelpful error boundary message.

**Safe modification:** Always use a sentinel value (e.g., `value="ALL"`) for placeholder `<SelectItem>` entries, never `value=""`. Long-term: migrate to Radix Dialog.

---

### `parse::<i32>().unwrap_or(0)` Pattern on Auth Claims

**Issue:** Six handlers silently coerce a failed person-ID parse to 0. If a JWT is malformed (e.g., subject is a non-numeric string), handlers continue with ID 0 instead of rejecting the request.

**Files:** See Security section above.

**Why fragile:** Masquerades auth issues as "not found" errors, making security bugs harder to detect.

---

## Performance Bottlenecks

### N+1 Risk in Relations Handlers

**Issue:** `backend/src/relations/handlers.rs` (419 lines) handles complex multi-entity relation lookups. Without examining query plans, the inline `sqlx` pattern (no ORM, raw SQL) is generally safe, but the handler complexity suggests multiple sequential queries may be issued per request.

**Files:** `backend/src/relations/handlers.rs`

**Fix approach:** Add `EXPLAIN ANALYZE` to the most-used relation queries during load testing; add indexes on `entity_id`/`entity_type` columns if not already present.

---

### `seed.ts` — 1837-line Frontend Seed File Loaded at Runtime

**Issue:** `frontend/src/demo/lib/seed.ts` (1837 lines) is a large in-memory dataset loaded when the demo world-state store initializes. This is fine for demo use but would be inappropriate in a production code path.

**Files:** `frontend/src/demo/lib/seed.ts`, `frontend/src/demo/store/world-state.tsx`

**Current risk:** Low — demo code is isolated under `src/demo/`. Risk elevates if demo store is ever imported outside demo routes.

---

## Test Coverage Gaps

### Backend: No Tests for Core Domain Handlers

**What's not tested:** Person CRUD, access grants (computer/data/physical), NDA lifecycle, organizations, relations, audit log, discussions, document references — all in production handler files.

**Files:**
- `backend/tests/info_systems_test.rs` — exists
- `backend/tests/nda_test.rs` — exists
- All other domains: no integration tests

**Risk:** Regressions in access-grant logic, person creation, or NDA issuance go undetected.

**Priority:** High — these are the security-critical paths.

---

### Frontend: No Component or Hook Tests for Production UI

**What's not tested:** All route components under `frontend/src/routes/admin/`, `frontend/src/routes/enduser/`, and `frontend/src/routes/official/`. Hooks in `frontend/src/hooks/use-*.ts` (except `use-websocket.test.ts`).

**Files:** `frontend/src/routes/admin/`, `frontend/src/hooks/`

**Risk:** UI regressions in access management, NDA workflows, and person detail pages are not caught before commit.

**Priority:** Medium.

---

### E2E Tests Not Covering Role-Based Access Paths

**What's not tested:** Playwright e2e tests exist but there is no evidence of tests verifying that a `viewer`-role user cannot perform `admin`-role actions (either via UI or direct API call).

**Files:** `frontend/e2e/`

**Risk:** A role-regression (e.g., a `viewer` gaining write access) would not be caught by automated tests.

**Priority:** High given the system's core value proposition is role-aware access control.

---

## Dependencies at Risk

### `enduser` and `official` Seed Users Missing

**Issue:** `CLAUDE.md` documents seed users `enduser` and `official` but the migration `20260601120200_seed_enduser_official_users.sql` may not have run on all developer DBs (the migration is recent). The `getDefaultRoute` in `auth-context.tsx` routes these roles to `/enduser/tasks` and `/official/dashboard`, but without seed users those flows cannot be manually tested.

**Files:**
- `backend/migrations/20260601120200_seed_enduser_official_users.sql`
- `frontend/src/contexts/auth-context.tsx`

**Fix approach:** Verify the migration ran on dev DBs; document in README or run script.

---

*Concerns audit: 2026-06-18*
