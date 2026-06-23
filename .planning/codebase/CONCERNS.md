# Codebase Concerns

**Analysis Date:** 2026-06-23

## Tech Debt

**Broken migration chain (cannot build a fresh DB):**
- Issue: `sqlx migrate run` fails on a clean database — ALTER-before-CREATE ordering, duplicate version timestamps, and zombie rename migrations. The live dev DB has drifted from the migration set and from the code.
- Files: `backend/migrations/` — duplicate versions `20251026132437` (computer/data/physical access share one timestamp) and `20251101190000` (`add_schema_org_relation_types.sql` vs `rename_vendors_to_organizations.sql`); `20251101191000_rename_personnel_to_person.sql` and `20251101190000_rename_vendors_to_organizations.sql` are rename migrations that conflict with the authoritative `20250131000000_create_person_table_unified.sql`.
- Impact: No reproducible environment provisioning; new developers / CI cannot stand up the schema; production migration story is unknown.
- Fix approach: Reconstruct a clean, linear migration set (squash to a known-good baseline reflecting the live DB), assign unique monotonic versions, remove zombie rename migrations. Phase 11 (`11-01-migration-repair-schema`) is already scoped for this.

**Schema drift between code and live DB (person/org rename incomplete):**
- Issue: Some tables/columns still use the pre-rename names (`personnel_id`, `issued_by`, FKs to a dead `users` table) while newer code expects `person_id` / `person`.
- Files: `backend/src/vendor_relations/models.rs`, `backend/src/access/models.rs`, `backend/src/nda/models.rs` + `handlers.rs`, `backend/src/discussions/models.rs`, `backend/src/document_references/models.rs`, `backend/src/relations/handlers.rs`, `backend/src/messaging/websocket.rs`.
- Impact: SQL written against the "expected" names fails silently against the drifted live DB; column/FK names must be verified per-table before writing queries.
- Fix approach: Land alignment migrations (`20260601120000_align_nda_with_person_model.sql`, `20260601120300_align_audit_log_with_person_model.sql` are partial starts), then normalize all domains onto `person`/`person_id` and drop the dead `users` table.

**Duplicate deprecated flat route tree:**
- Issue: Pre-pivot flat routes duplicate the canonical `/admin/*` pages and carry the same bugs (empty `SelectItem`, `/api` prefix issues).
- Files: `frontend/src/routes/{access,ndas,organizations,person,roles,audit,person-relations}/`, plus loose `frontend/src/routes/{dashboard,info-systems,profile,tasks}.tsx`. The `/api`-related TODOs duplicate across both trees, e.g. `frontend/src/routes/access/index.tsx` vs `frontend/src/routes/admin/access/index.tsx`, and `frontend/src/routes/person/$personId.tsx` vs `frontend/src/routes/admin/person/$personId.tsx`.
- Impact: ~2x maintenance surface, confusion over canonical page, dead code that still compiles into the route tree.
- Fix approach: Delete the flat duplicates once `/admin/*`, `/enduser/*`, `/official/*` cover all functionality; regenerate `routeTree.gen.ts`.

**Scaffold leftover:**
- Issue: `frontend/src/App.tsx` is the unused Vite scaffold entry; the real entry is `main.tsx` + `routes/__root.tsx`.
- Files: `frontend/src/App.tsx`.
- Impact: Misleading for new contributors.
- Fix approach: Remove once confirmed unreferenced.

## Known Bugs

**Empty `<SelectItem value="">` crashes the whole page:**
- Symptoms: Radix `Select` throws on an empty-string item value; the root error boundary renders a blank "Something went wrong".
- Files: any page using `Select` with an empty option; flat-route pages under `frontend/src/routes/organizations/`, `frontend/src/routes/access/` are the documented offenders.
- Trigger: Rendering a `SelectItem` with `value=""` (commonly an "All / no filter" option).
- Workaround: Use a sentinel value (`value="ALL"`) and treat it as "no filter".

**WebSocket auth rejection floods console:**
- Symptoms: WS server on `:15540` rejects auth; the frontend reconnect loop retries continuously and floods the console.
- Files: `backend/src/messaging/websocket.rs`, frontend `WebSocketContext` (`frontend/src/routes/__root.tsx` providers).
- Trigger: Any authenticated session establishing the WS connection.
- Workaround: Ignore in tests; not chased. Needs the WS handshake to accept the JWT.

## Security Considerations

**JWT secret silently falls back to a hardcoded default:**
- Risk: If `JWT_SECRET` is unset, the server boots with a public, source-visible secret — anyone can forge valid tokens for any role (including `admin`).
- Files: `backend/src/shared/rocket_setup.rs:22-23` (`unwrap_or_else(|_| "test-secret-key-must-be-at-least-32-characters-long")`).
- Current mitigation: None — it logs "✅ JWT secret loaded" regardless, masking the fallback.
- Recommendations: Fail loud (panic / refuse to boot) in non-test builds when `JWT_SECRET` is absent; never log success when the default is used.

**Authorization is authn-only for most domains (no per-role enforcement):**
- Risk: `AuthGuard` (`backend/src/auth/middleware.rs`) only verifies a valid Bearer JWT. Only `backend/src/roles/handlers.rs` performs `role_has_permission(...)` checks. All other domain handlers (person, organizations, access, nda, discussions, relations, info_systems, document_references) accept any authenticated user regardless of role.
- Files: `backend/src/*/handlers.rs` (every domain except `roles`); guard at `backend/src/auth/middleware.rs`; shared RBAC at `backend/src/shared/rbac.rs`.
- Current mitigation: Frontend role-aware routing (`ProtectedRoute`) hides UI — client-side only, trivially bypassed by calling the API directly.
- Recommendations: Move RBAC enforcement to the backend handlers (or the guard) for every mutating/sensitive endpoint, matching the `roles` domain pattern. This is the project's "never regress the role-aware guards" core invariant and is currently not enforced server-side.

**Endpoints with no auth guard at all:**
- Risk: `messaging` and `vendor_relations` handlers do not reference `AuthGuard` — potentially unauthenticated access.
- Files: `backend/src/messaging/handlers.rs`, `backend/src/vendor_relations/handlers.rs` (only handlers without an `AuthGuard` reference).
- Current mitigation: Unknown — verify whether the guard is applied at mount or genuinely absent.
- Recommendations: Confirm and add `AuthGuard` (plus role checks) unless intentionally public.

**CORS allows all origins:**
- Risk: `AllowedOrigins::all()` permits any origin to call the API.
- Files: `backend/src/shared/rocket_setup.rs:57-58`.
- Current mitigation: None.
- Recommendations: Restrict to the known frontend origin(s) (`http://localhost:15510` in dev, configured value in prod).

**`role_has_permission` failure swallows errors:**
- Risk: `.unwrap_or(false)` on the permission check (`backend/src/roles/handlers.rs:12+`) treats DB errors as "no permission" — fails safe, but hides DB connectivity/SQL faults behind a 403.
- Files: `backend/src/roles/handlers.rs`.
- Recommendation: Distinguish "no permission" (403) from "lookup failed" (500) for observability.

## Performance Bottlenecks

**Missing person→relations endpoint forces client-side fetching:**
- Problem: No backend endpoint to get relations by `person_id`; the person detail page works around it.
- Files: `frontend/src/routes/admin/person/$personId.tsx:177`, `frontend/src/routes/person/$personId.tsx:178` (`// TODO: Implement a backend endpoint to get relations by person_id`).
- Cause: Relations fetched/filtered client-side instead of a scoped query.
- Improvement path: Add `GET /api/relations?person_id=...` and consume it from the person detail hook.

## Fragile Areas

**Hand-rolled Dialog (not Radix):**
- Files: `frontend/src/components/ui/dialog.tsx`.
- Why fragile: Custom implementation; sets `role="dialog"` but has no focus-trap or portal. Easy to introduce focus/escape/overlay bugs.
- Safe modification: Don't assume Radix Dialog semantics; test keyboard/focus behavior manually.
- Test coverage: None observed.

**Two ProtectedRoute components:**
- Files: canonical `frontend/src/components/ProtectedRoute.tsx` (PascalCase, `allowedRoles`) vs `frontend/src/components/protected-route.tsx` (lowercase, auth-only).
- Why fragile: Importing the wrong one silently drops role enforcement.
- Safe modification: Always use the PascalCase `ProtectedRoute` with `allowedRoles` for role-gated routes.

**Frontend `/api` prefix convention:**
- Files: `frontend/src/lib/api.ts` (base host has no `/api`); all callers must prefix `/api/...`.
- Why fragile: Omitting the prefix 404s silently — no error surfaced.
- Safe modification: Every `apiFetch`/`api.*` call must start with `/api/`.

**Backend route-mount double-prefix trap:**
- Files: modules mounted at `/api/<x>` in `backend/src/shared/rocket_setup.rs` use relative handler paths.
- Why fragile: Hardcoding `/api/...` in a `#[get(...)]` macro double-prefixes the URL.
- Safe modification: Use relative paths in handler macros only.

**`.unwrap()` / `.expect()` usage:**
- Files: `backend/src/shared/rocket_setup.rs:30,36,67` (DB pool, WS address, CORS — startup panics, acceptable). Verify no `.unwrap()` leaks into request handlers, which would violate the "never panic, return `Result<Json<T>, Status>`" convention.
- Why fragile: A handler panic takes down the request worker.
- Safe modification: Keep `.unwrap()` to startup only; handlers must map errors to `Status`.

## Scaling Limits

- Not assessed in depth. Note: handlers query `PgPool` directly with inline `sqlx` (no service layer) — acceptable at current scale, but no query batching/caching layer exists. `PaginatedResponse<T>` pagination is in place (`backend/src/shared/response.rs`, `backend/src/shared/pagination.rs`).

## Dependencies at Risk

- None flagged. Stack is pinned (Rust 1.87 / Rocket 0.5 / sqlx; React 19 / TanStack / Vite / shadcn). No new frameworks permitted by project constraints.

## Missing Critical Features

**Server-side RBAC enforcement (see Security):**
- Problem: Per-role authorization exists only for the `roles` domain; the rest rely on client-side gating.
- Blocks: The project's core security guarantee ("data never mutated by an unauthorized user") is not enforced at the API layer.

**Backend relations-by-person endpoint (see Performance):**
- Problem: No scoped relations query.
- Blocks: Efficient person detail rendering.

**Runtime `enduser` / `official` role parity:**
- Problem: Login redirects exist for `enduser`/`official` (`getDefaultRoute` in `auth-context.tsx`), and a seed migration `20260601120200_seed_enduser_official_users.sql` exists, but it depends on the broken migration chain applying cleanly.
- Blocks: Testing non-admin role flows until migrations are repaired.

## Test Coverage Gaps

**Sparse backend tests:**
- What's not tested: Only 8 Rust files contain tests, concentrated in `backend/src/auth/jwt.rs` and `backend/src/auth/handlers.rs`. Domain handlers (person, organizations, access, nda, relations, info_systems) have no visible unit/integration tests.
- Files: `backend/src/*/handlers.rs` (untested), `backend/src/shared/rbac.rs`.
- Risk: RBAC and SQL-drift regressions ship undetected.
- Priority: High (authz is security-critical and currently client-side only).

**Frontend tests concentrated in demo layer:**
- What's not tested: 14 frontend test files, but the largest (`frontend/src/demo/lib/digital-resource.test.ts` 1231 lines, `frontend/src/demo/lib/physical-access.test.ts` 968 lines) cover the demo/mock dataset, not the live `/admin/*` route pages or `src/hooks/use-*.ts` data layer.
- Files: `frontend/src/routes/admin/*`, `frontend/src/hooks/use-*.ts`.
- Risk: Real UI/data-layer regressions (e.g., the empty-SelectItem crash) are not caught by the suite.
- Priority: Medium-High.

**Playwright e2e must stay excluded from Vitest:**
- What's not tested / config risk: e2e tests must be excluded from the Vitest run; misconfiguration causes Vitest to choke on Playwright specs.
- Files: Vitest config, `frontend/` Playwright specs.
- Priority: Low (config hygiene).

---

*Concerns audit: 2026-06-23*
