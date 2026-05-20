# Codebase Concerns

**Analysis Date:** 2026-05-20

---

## Security Considerations

### Backend Has No Role-Based Authorization on Most Endpoints

**Risk:** Any authenticated user (any role) can call destructive or admin-only backend endpoints directly (e.g., create/update/delete person, grant access, manage organizations). Role enforcement only exists in the roles module (`/api/roles`).
**Files:**
- `backend/src/person/handlers.rs` — all routes use `_auth: AuthGuard` (authentication only, no role check)
- `backend/src/access/handlers.rs` — same pattern
- `backend/src/organizations/handlers.rs` — same pattern
- `backend/src/audit/handlers.rs` — same pattern
- `backend/src/roles/handlers.rs` — correct: calls `role_has_permission()` per endpoint
**Current mitigation:** Frontend `ProtectedRoute` component enforces roles client-side, but this is bypassable via direct API calls.
**Recommendations:** Introduce role-guard middleware in Rocket (mirroring `roles/handlers.rs`) for person, access, organizations, nda, discussions, and info_systems handlers. Any authenticated user with a valid JWT currently has full write access.

---

### JWT Secret Falls Back to Hardcoded Value in Production

**Risk:** If `JWT_SECRET` env var is not set, the backend silently uses `"test-secret-key-must-be-at-least-32-characters-long"` — a public value that allows forging valid tokens.
**Files:**
- `backend/src/shared/rocket_setup.rs` lines 22–23
**Current mitigation:** `docker-compose.yml` sets a different development secret, but the fallback means a misconfigured production deployment would be exploitable.
**Recommendations:** Panic with an explicit error message if `JWT_SECRET` is unset in non-test builds. Use `env::var("JWT_SECRET").expect("JWT_SECRET must be set")` (guarded behind `cfg!(not(test))`).

---

### CORS Allows All Origins

**Risk:** `AllowedOrigins::all()` with `allow_credentials(true)` permits cross-origin requests with credentials from any domain. This opens the API to CSRF and credential-theft attacks from any website.
**Files:**
- `backend/src/shared/rocket_setup.rs` lines 57–66
**Current mitigation:** None.
**Recommendations:** Restrict `allowed_origins` to the frontend origin via an env var (`ALLOWED_ORIGIN` or similar). Remove `allow_credentials(true)` if not required, or tighten origin list.

---

### `password_hash` Is Serialized in All Person API Responses

**Risk:** Every `GET /api/person`, `GET /api/person/:id`, create, and update response includes `password_hash` (bcrypt hash). While not a plaintext password, exposing hashes increases offline-cracking attack surface.
**Files:**
- `backend/src/person/models.rs` — `Person` struct derives `Serialize` with `password_hash: Option<String>` (line 17)
- `backend/src/person/handlers.rs` — all handlers return `Json<Person>` directly
**Current mitigation:** None.
**Recommendations:** Add a separate `PersonResponse` DTO that omits `password_hash` and use it in all handler return types.

---

### JWT Claims `sub` Parse Failure Silently Uses Person ID 0

**Risk:** If the JWT `sub` claim is not a valid integer, `auth.claims.sub.parse::<i32>().unwrap_or(0)` returns 0. Person ID 0 does not exist, so the handler returns 404 — but in theory this could be a logic bug if any record ever gets ID 0.
**Files:**
- `backend/src/auth/handlers.rs` lines 66, 108
- `backend/src/discussions/handlers.rs` line 106
**Current mitigation:** ID 0 doesn't exist in practice, so these calls return NotFound.
**Recommendations:** Return `Status::Unauthorized` explicitly on parse failure rather than silently defaulting to 0.

---

### Auth Token Stored in `localStorage` (XSS Risk)

**Risk:** `localStorage` is accessible by any JavaScript running on the page. An XSS vulnerability would immediately expose the JWT.
**Files:**
- `frontend/src/lib/api.ts` line 24 — reads token from `localStorage`
- `frontend/src/contexts/auth-context.tsx` lines 60–61 — writes token to `localStorage`
**Current mitigation:** No explicit XSS vectors identified yet, but the storage choice increases blast radius.
**Recommendations:** Migrate to `httpOnly` cookies for token storage. This requires backend changes to set/clear the cookie on login/logout.

---

## Tech Debt

### Duplicate Route Files: Non-Admin vs. Admin Views

**Issue:** Multiple routes exist in near-identical pairs. The non-admin versions use the old `protected-route` (no role enforcement) and are registered in the router alongside their `/admin/*` counterparts.
**Files (non-admin copies with no role enforcement):**
- `frontend/src/routes/ndas/index.tsx` and `frontend/src/routes/admin/ndas/index.tsx`
- `frontend/src/routes/access/index.tsx` and `frontend/src/routes/admin/access/index.tsx`
- `frontend/src/routes/info-systems.tsx` and `frontend/src/routes/admin/info-systems.tsx`
- `frontend/src/routes/roles/index.tsx` and `frontend/src/routes/admin/roles/index.tsx`
- `frontend/src/routes/person/$personId.tsx` and `frontend/src/routes/admin/person/$personId.tsx`
- `frontend/src/routes/organizations/$organizationId.tsx` and `frontend/src/routes/admin/organizations/$vendorId.tsx`
**Impact:** Every bug fix or feature addition must be applied twice. The non-admin copies are unguarded by role checks.
**Fix approach:** Determine which audience each route serves. If only admin-accessible, remove the non-admin copy and update the routeTree. If shared, parameterize with context rather than duplicating.

---

### Two Incompatible `ProtectedRoute` Components Coexist

**Issue:** Two separate `ProtectedRoute` implementations exist with different APIs and security models.
**Files:**
- `frontend/src/components/protected-route.tsx` — authentication only, no `allowedRoles` prop, uses `useNavigate` + `useEffect` (stale pattern)
- `frontend/src/components/ProtectedRoute.tsx` — authentication + role check via `allowedRoles: string[]`, uses `<Navigate>` (correct pattern)
**Impact:** Routes importing from `protected-route` (lowercase) get no role enforcement. At least 15 route files still use the old component including several under `/admin/`.
**Files still on old component:**
- `frontend/src/routes/admin/info-systems.tsx`
- `frontend/src/routes/dashboard.tsx`
- `frontend/src/routes/tasks.tsx`
- `frontend/src/routes/profile.tsx`
- `frontend/src/routes/info-systems.tsx`
- `frontend/src/routes/ndas/index.tsx`
- `frontend/src/routes/access/index.tsx`
- `frontend/src/routes/person/index.tsx`
- `frontend/src/routes/person/$personId.tsx`
- `frontend/src/routes/organizations/index.tsx`
- `frontend/src/routes/organizations/$organizationId.tsx`
- `frontend/src/routes/audit/index.tsx`
- `frontend/src/routes/roles/index.tsx`
- `frontend/src/routes/person-relations/index.tsx`
**Fix approach:** Delete `protected-route.tsx` (lowercase). Migrate all imports to `ProtectedRoute.tsx` (PascalCase) and add appropriate `allowedRoles`.

---

### Stale `update_admin_routes.sh` Script Committed in Source Tree

**Issue:** A shell script that performs in-place `sed` rewrites of route files is present at `frontend/src/routes/admin/update_admin_routes.sh`. It is untracked by git but present on disk. Running it again would corrupt route definitions.
**Files:**
- `frontend/src/routes/admin/update_admin_routes.sh`
**Impact:** Developer confusion; accidental execution would be destructive.
**Fix approach:** Delete the script. The migration it performed is already complete.

---

### Incomplete `update_person_handler` — Dynamic Query Builder with Manual String Concatenation

**Issue:** The `update_person` handler in the backend builds a dynamic SQL UPDATE by string-concatenating field names and parameter indices (`$1`, `$2`, ...) in a loop. This is fragile: adding or reordering fields requires matching changes in two separate loops.
**Files:**
- `backend/src/person/handlers.rs` lines 190–270
**Impact:** High maintenance burden; easy to introduce off-by-one errors in parameter binding order.
**Fix approach:** Use `sqlx::QueryBuilder` (the crate's typed builder API) or implement a PATCH-style endpoint that accepts only the fields provided, using a simpler static query with COALESCE.

---

### E2E Tests Reference Old `/personnel` URL and "Personnel" Terminology

**Issue:** E2E test files were not updated during the personnel→person rename refactor. They reference `/personnel` URLs and "Personnel Management" headings that no longer exist.
**Files:**
- `frontend/e2e/personnel.spec.ts` — `waitForURL('/personnel', ...)`, `getByRole('button', { name: /add personnel/i })`
- `frontend/e2e/auth.spec.ts` — `expect(page).toHaveURL('/personnel', ...)`
- `frontend/e2e/access.spec.ts` — `waitForURL('/personnel')`
- `frontend/e2e/organizations.spec.ts` — `page.goto('/personnel')`, `waitForURL('/personnel', ...)`
- `frontend/e2e/role-based-routing.spec.ts` — `page.goto('http://localhost:5173/admin/personnel')`, `getByText('Personnel Management')`
**Impact:** All of these E2E tests will fail against the current application, providing no regression protection.
**Fix approach:** Update all `personnel` URL references to `/admin/person` and text assertions to match current UI labels.

---

### `vendor_relations` Module Name Not Updated After Organizations Rename

**Issue:** The backend module `vendor_relations` and its associated DB table, Rocket routes (`/api/vendors/...`), and frontend types/hooks still use "vendor" terminology after organizations were renamed.
**Files:**
- `backend/src/vendor_relations/` — full module directory
- `backend/src/relations/handlers.rs` line 150 — calls `list_relations(db, "vendor".to_string(), ...)` which passes an entity type that fails the `"person" || "organization"` validation check at line 20
- `frontend/src/types/vendor-relation.ts`
- `frontend/src/hooks/use-vendor-relations.ts` — calls `/vendors/relations` endpoint
- `frontend/src/components/person-details/vendor-relations-tab.tsx`
**Impact:** The `/api/vendors/<id>/relations` endpoint currently passes `"vendor"` as `entity_type` to `list_relations`, which validates against `"person" | "organization"` and will return `400 Bad Request` for all calls. This is a functional bug.
**Fix approach:** Either (a) update relations handler validation to allow `"vendor"` OR (b) rename the vendor_relations module and routes to use organization/organization terminology consistently.

---

### Audit Logging Only Covers NDA Operations

**Issue:** The `create_audit_log` function exists but is only called from `backend/src/nda/handlers.rs`. Security-sensitive operations — creating/updating/deleting persons, granting/revoking access — produce no audit trail.
**Files:**
- `backend/src/nda/handlers.rs` lines 147, 191, 234 — only callers
- `backend/src/person/handlers.rs` — no audit calls
- `backend/src/access/handlers.rs` — no audit calls
- `backend/src/roles/handlers.rs` — no audit calls
- `backend/src/organizations/handlers.rs` — no audit calls
**Impact:** The audit log UI (`frontend/src/routes/admin/audit/`) shows an incomplete security record. Compliance and forensic requirements cannot be met.
**Fix approach:** Add `create_audit_log(...)` calls to all create/update/delete handlers in person, access, organizations, roles, and discussions.

---

## Known Bugs

### `/api/vendors/<vendor_id>/relations` Always Returns 400

**Symptoms:** Calling the vendor-specific relations endpoint returns a 400 Bad Request.
**Files:**
- `backend/src/relations/handlers.rs` line 150: passes `"vendor"` as `entity_type`
- `backend/src/relations/handlers.rs` line 20: validates `entity_type != "person" && entity_type != "organization"` — `"vendor"` fails this check
**Trigger:** Any request to `/api/vendors/{id}/relations`.
**Workaround:** None. The endpoint is broken since the entity_type check was updated to `organization`.

---

### Missing Backend Endpoint: Person Relations by `person_id`

**Symptoms:** Person detail pages in both admin and non-admin views note a missing endpoint with a TODO comment and cannot load relations data.
**Files:**
- `frontend/src/routes/person/$personId.tsx` line 178: `// TODO: Implement a backend endpoint to get relations by person_id`
- `frontend/src/routes/admin/person/$personId.tsx` line 177: same comment
**Trigger:** Viewing person detail page → Relations tab.
**Workaround:** None; the tab shows no data.

---

## Performance Bottlenecks

### `update_person` Handler Runs Two Extra DB Queries Per Update

**Problem:** Before updating a person, the handler runs a separate `EXISTS` check, then the update. Additionally, a department existence check adds a third query.
**Files:**
- `backend/src/person/handlers.rs` lines 154–175 (exists check), 177–200 (department check), 200+ (update)
**Cause:** Defensive checks that could be collapsed into the UPDATE itself using `RETURNING` row count.
**Improvement path:** Use `UPDATE ... WHERE id = $1 AND deleted_at IS NULL RETURNING ...` — if no rows returned, emit 404. Eliminate the pre-flight SELECT.

---

### Audit Log Dynamic Query Builder Has Unused `param_count` Increment

**Problem:** In `list_audit_logs`, the `resource_type` filter increments `param_count` but the comment notes it's intentionally not incremented — meaning the binding and counting are inconsistent.
**Files:**
- `backend/src/audit/handlers.rs` lines 40–44 — `param_count` is not incremented after `resource_type` clause
**Cause:** Copy-paste error during dynamic query construction.
**Improvement path:** Audit the full binding sequence; or switch to `sqlx::QueryBuilder` for type-safe dynamic queries.

---

## Fragile Areas

### `routeTree.gen.ts` — Generated File Includes Untracked Routes

**Files:**
- `frontend/src/routeTree.gen.ts` — 779-line generated file
**Why fragile:** The generated route tree imports from `frontend/src/routes/admin/dashboard/` and `frontend/src/routes/admin/discussions/` which are untracked (`??` in git status). If these directories are deleted or cleaned, the generated imports break the build.
**Safe modification:** Run `pnpm run build` or the TanStack Router codegen command after any route file changes. Ensure new route directories are committed before the routeTree is regenerated.
**Test coverage:** No unit tests for routing logic; only E2E tests (currently broken, see above).

---

### `native alert()` Used for All User Feedback

**Files:**
- `frontend/src/routes/info-systems.tsx` — 6 uses of `alert()`
- `frontend/src/routes/ndas/index.tsx` — 3 uses of `alert()`
- `frontend/src/routes/person/$personId.tsx` — 3 uses of `alert()`
- `frontend/src/routes/tasks.tsx` — 1 use of `alert()`
- `frontend/src/routes/profile.tsx` — 2 uses of `alert()`
- `frontend/src/routes/organizations/$organizationId.tsx` — 1 use of `alert()`
- `frontend/src/components/person-details/vendor-relations-tab.tsx` — 2 uses of `alert()`
**Why fragile:** `window.alert()` blocks the main thread, cannot be styled, and cannot be tested in Playwright without special config. It creates a poor UX.
**Safe modification:** Replace with a toast/notification system (the project has shadcn/ui; `sonner` or `useToast` can be added). The admin routes (`/admin/info-systems.tsx`) have already eliminated `alert()` in favor of `console.error` — extend that approach with a toast.

---

## Test Coverage Gaps

### No Unit Tests for Frontend Components or Hooks

**What's not tested:** All React components, all custom hooks (`use-person`, `use-vendor-relations`, `use-info-systems`, etc.), API client logic in `lib/api.ts`, auth context.
**Files:**
- `frontend/src/hooks/use-websocket.test.ts` — only one hook has a test file
- No test files under `frontend/src/components/`, `frontend/src/routes/`, `frontend/src/lib/`, `frontend/src/contexts/`
**Risk:** Refactoring hooks or components has no safety net. Business logic in mutation callbacks is untested.
**Priority:** High — especially for `auth-context.tsx` (login/logout/role routing logic) and `lib/api.ts` (token injection, error parsing).

---

### E2E Tests Are All Broken (See Tech Debt Section)

**What's not tested:** All user flows that reference `/personnel`, including auth login redirect, personnel CRUD, access granting, organization relations, and role-based routing.
**Files:**
- `frontend/e2e/personnel.spec.ts`
- `frontend/e2e/auth.spec.ts`
- `frontend/e2e/access.spec.ts`
- `frontend/e2e/organizations.spec.ts`
- `frontend/e2e/role-based-routing.spec.ts`
**Risk:** Regression protection for these flows is effectively zero.
**Priority:** High — fix URL and text references to match current routes.

---

### Backend Integration Tests Only Cover NDA and Info Systems

**What's not tested:** Person CRUD, access grants, audit logging, discussions, organization relations, roles, authentication edge cases.
**Files:**
- `backend/tests/nda_test.rs`
- `backend/tests/info_systems_test.rs`
**Risk:** The backend has no coverage for the security-critical person and access-management endpoints.
**Priority:** High — add integration tests for person create/update/delete and access grant/revoke.

---

## Missing Critical Features

### No Token Expiry Handling on Frontend

**Problem:** JWTs expire after 8 hours (`Duration::hours(8)` in `backend/src/auth/jwt.rs` line 16). The frontend never checks expiry — expired tokens are sent until the next manual page load or login.
**Blocks:** Users experience silent API failures (401 responses) with no prompt to re-authenticate.
**Files:**
- `frontend/src/lib/api.ts` — catches 401 but throws `ApiError`; no redirect to login
- `frontend/src/contexts/auth-context.tsx` — no expiry detection on token load

---

### No Input Sanitization for Free-Text Fields

**Problem:** Fields like discussion content, NDA content, and document notes accept arbitrary text. There is no server-side or client-side sanitization or length enforcement beyond the validator crate's `length(max = N)` constraint.
**Files:**
- `backend/src/discussions/handlers.rs` — no sanitization before DB insert
- `backend/src/nda/handlers.rs` — no sanitization
**Risk:** If any of this content is rendered as HTML (e.g., in a future rich-text viewer), it becomes an XSS vector.

---

*Concerns audit: 2026-05-20*
