---
phase: 11-digital-resource-backend
plan: 04
subsystem: backend
tags: [rust, rocket, security, rbac, authz, jwt, cors, sec-hardening]

requires:
  - phase: 11-digital-resource-backend
    plan: 03
    provides: role-based authz convention (Option B) + rocket_setup as modified by the domain mount
provides:
  - "SEC-01: every non-login HTTP handler is AuthGuard-protected; vendor_relations delete was the last unauthenticated one"
  - "SEC-02: all 27 write/mutation handlers across 9 domains + the audit read gate on role_has_permission('<domain>.<action>'); 403 (never 500) on missing key"
  - "SEC-03: JWT_SECRET fail-loud — hardcoded fallback removed; startup exits 1 before pool/port binding on unset/empty/whitespace secret (read_jwt_secret/validate_jwt_secret helpers)"
  - "SEC-04: CORS restricted to http://localhost:15510 via AllowedOrigins::some_exact, allow_credentials(true) retained"
  - "Idempotent permission-seed migration 20260601130002 (7 new <domain>.write keys; admin all, manager least-privilege) — applied to live janus2 AND janus2_fresh"
  - "12-test security_hardening_test.rs suite, all green against the live dev DB"
affects:
  - 12-demo-ui (frontend must send credentialed requests from localhost:15510 only; non-admin roles now 403 on writes they previously could perform)

tech-stack:
  added: []
  patterns:
    - "Permission gate idiom at top of handler body: `if !role_has_permission(db.inner(), &auth.claims.role, \"<domain>.write\").await.unwrap_or(false) { return Err(Status::Forbidden); }` — .unwrap_or(false) denies on DB error instead of 500"
    - "Fail-loud env secret: pure validate_jwt_secret(Option<String>) -> Result unit-testable without env races; create_rocket exits 1 on Err before binding"
    - "Side-effect-free gate-passage proof in tests: hit a post-gate validation error (400) — 400 proves the gate passed, 403 proves it rejected"

key-files:
  created:
    - backend/migrations/20260601130002_seed_domain_permissions.sql
    - backend/tests/security_hardening_test.rs
    - .planning/phases/11-digital-resource-backend/deferred-items.md
  modified:
    - backend/src/shared/rocket_setup.rs
    - backend/src/shared/error.rs
    - backend/src/access/handlers.rs
    - backend/src/audit/handlers.rs
    - backend/src/discussions/handlers.rs
    - backend/src/document_references/handlers.rs
    - backend/src/info_systems/handlers.rs
    - backend/src/nda/handlers.rs
    - backend/src/organizations/handlers.rs
    - backend/src/person/handlers.rs
    - backend/src/relations/handlers.rs
    - backend/src/vendor_relations/handlers.rs

key-decisions:
  - "AppError gained a Forbidden (403) variant: the existing AppError::Unauthorized maps to 401, but SEC-02 requires 403 for authenticated-but-unauthorized; discussions (the only AppError write module) uses it. The roles module's pre-existing 401-on-missing-permission behavior was left untouched (surgical scope)."
  - "vendor_relations write handlers converted from Result<_, String> to Result<_, Status>: a String error responds 200 OK with the error text, so 403 was impossible; reads keep String (out of scope)."
  - "Manager is NOT granted access.write: issuing/revoking computer/data/physical access is a privileged security operation reserved for admin (least privilege). Manager gets the 6 business .write keys (discussions, document_references, info_systems, nda, relations, vendor_relations). Operator/viewer get none."
  - "Permission seed applied directly via psql to live janus2 and janus2_fresh (sqlx migrate run remains broken on the drifted dev DB); the migration file is idempotent so a future repaired migrate run is safe."
  - "sign_nda/reject_nda gate on nda.write like all other NDA writes (per plan inventory). Consequence: a future end-user role cannot self-sign NDAs until granted nda.write or a self-service permission — no enduser seed users exist yet, so nothing breaks today."
  - "index (/) and /api/health in main.rs remain public — infra/health endpoints, not domain handlers; login remains the single public API handler."

metrics:
  duration: ~30 min
  completed: 2026-07-02
  tasks: 3
  files: 15

requirements-completed: [SEC-01, SEC-02, SEC-03, SEC-04]
status: complete
---

# Phase 11 / Plan 04: Backend Security Hardening (SEC-01..04) — Summary

**Every non-login handler now requires a valid JWT, every write and the audit read additionally require a seeded per-role permission key (403, never 500, on refusal), the server refuses to start without a real JWT secret, and CORS is pinned to the single dev origin with credentials — all asserted by a 12-test integration suite running green against the live dev DB.**

## What Shipped

- **SEC-01** — `delete_vendor_relation` (the last unauthenticated handler) got `AuthGuard`; the other 3 vendor_relations handlers already had it from an earlier partial pass. Signature audit: routes == guards in every module; `login` is the only public API handler; messaging exposes no HTTP routes (WS authenticates separately on :15540).
- **SEC-02** — 27 write/mutation handlers in access(4), discussions(2), document_references(4), info_systems(3), nda(5), organizations(3), person(3), relations(3), vendor_relations(2), plus `list_audit_logs` (audit.read), gate on `role_has_permission` using the exact roles-module idiom. New migration `20260601130002_seed_domain_permissions.sql` seeds 7 `<domain>.write` keys: admin holds all 7, manager 6 (no `access.write`), operator/viewer 0. Verified in DB: admin=7, manager=6, manager lacks access.write.
- **SEC-03** — the `unwrap_or_else(|_| "test-secret-key-...")` fallback is gone. `validate_jwt_secret` (pure, unit-testable) + `read_jwt_secret` reject unset/empty/whitespace; `create_rocket` prints FATAL and exits 1 before creating the DB pool or binding the port. `JWT_SECRET` was already wired in `backend/.env` and `docker-compose.yml` line 28 — no change needed there.
- **SEC-04** — `AllowedOrigins::all()` replaced with `AllowedOrigins::some_exact(&["http://localhost:15510"])`, `allow_credentials(true)` retained (the handoff's anti-pattern note about the rocket_cors 0.6 API was followed).

## Verification (actual results)

- `cargo build` — **0 errors** (34 pre-existing warnings, unchanged; see deferred-items.md).
- `cargo test --test security_hardening_test -- --include-ignored` — **12 passed; 0 failed** (SEC-03 x4 unit, SEC-01 x2 401, SEC-04 x2 CORS granted/denied, SEC-02 x4: viewer 403, manager 403 on access.write, admin clears gate via 400 path, manager holds nda.write via 200 path).
- Process-level SEC-03: `janus-backend` with JWT_SECRET **unset → exit 1**, **empty → exit 1**, **whitespace → exit 1**, each printing `FATAL: JWT_SECRET must be set...` before binding.
- `git grep -nE 'test-secret-key' backend/src` → **0 matches**; `grep AllowedOrigins::all` → **0 matches**.
- Regression: `resolver_parity` **1 passed**; `digital_resources_api_test` **1 passed (6 ignored)**; `nda_test` **0 failed (5 ignored)**; `security_hardening_test` default run **8 passed, 4 ignored**.
- Seed verified on **both** `janus2` and `janus2_fresh`: 11 total `.write` keys after seeding; grants distribution as designed.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] AppError::Forbidden variant added**
- **Found during:** Task 2
- **Issue:** `AppError::Unauthorized` maps to 401; the plan/spec require 403 for authenticated-but-unauthorized, and discussions handlers return `AppError`.
- **Fix:** Added `Forbidden` variant mapping to `Status::Forbidden` in `shared/error.rs`.
- **Files modified:** backend/src/shared/error.rs
- **Commit:** 491708d

**2. [Rule 1 - Bug] vendor_relations String error type responded 200 OK**
- **Found during:** Task 2
- **Issue:** `Result<Json<T>, String>` — Rocket's String responder returns 200 with the error text, so DB errors looked like success and 403 was unrepresentable.
- **Fix:** Converted the two write handlers to `Result<_, Status>` (BadRequest/InternalServerError/Forbidden); reads left as-is (surgical).
- **Files modified:** backend/src/vendor_relations/handlers.rs
- **Commit:** 491708d

### Out-of-scope discoveries (logged, NOT fixed)

- `info_systems_test.rs` failures during regression run: pre-existing one-shot fixture design (UNIQUE system_name + no cleanup on a persistent DB) plus a deterministic 200-vs-204 expectation mismatch on delete. Diagnosed to rule out this plan's gates (after fixture cleanup: 14/15 pass; sole failure is the pre-existing 204 mismatch). Logged in `deferred-items.md`.

## Known Stubs

None — no placeholder values or unwired data paths were introduced.

## Threat Flags

None — no new surface beyond the plan's threat model; T-11-13..16 all mitigated and test-asserted.

## Carried Forward

- The seed migration for digital resources (`20260601130001`) is still unapplied to the drifted dev DB (unchanged from 11-03).
- A future end-user role needs an NDA self-sign permission decision (see key-decisions).
- `info_systems_test` hygiene + 200-vs-204 delete mismatch (deferred-items.md).

## Commits

- `6d3c221` fix(11-04): AuthGuard on vendor_relations delete, JWT fail-loud, CORS single origin (SEC-01,03,04)
- `491708d` feat(11-04): gate every write handler + audit read on role_has_permission (SEC-02)
- `539fc5a` test(11-04): security integration tests — 401 unauth, 403-not-500 RBAC, JWT fail-loud, CORS origin (SEC-01..04)

## Self-Check: PASSED

All 4 created/key files exist on disk; all 3 task commits (`6d3c221`, `491708d`, `539fc5a`) present in git log.

## Gap Closure (post-verification)

**Gap (verifier, ROADMAP SC 4 / RSRC-BE-04):** `uq_grant UNIQUE (person_id, resource_id, valid_from, valid_until)` treated NULLs as distinct (Postgres default), so `issue_grant`'s `ON CONFLICT DO NOTHING` never fired for the endpoint's default request shape (both window fields null) — duplicate grant rows accumulated (4 identical `(test-person-idempotent, rsrc-homeguard, NULL, NULL)` rows on `janus2_fresh`). Delegates were unaffected (NULL-safe `WHERE NOT EXISTS` pattern).

**Fix chosen:** constraint-level — new migration `20260601130003_fix_uq_grant_nulls_not_distinct.sql` dedupes existing null-window duplicates (`ctid`-based, `IS NOT DISTINCT FROM` grouping), then recreates `uq_grant` as `UNIQUE NULLS NOT DISTINCT` (PG 15.15 supports it).
*Why over the handler-side `WHERE NOT EXISTS` alternative:* the constraint protects the data layer against ANY writer (future handlers, scripts), not just this code path; the existing handler (`ON CONFLICT (cols) DO NOTHING` + `IS NOT DISTINCT FROM` re-select) works unchanged because ON CONFLICT column-list inference matches the new index; and it restores the original T-11-11 design intent of a constraint-backed natural key.

**Applied:** direct psql to both `janus2` and `janus2_fresh` (same path as prior migrations; `sqlx migrate run` still broken on drifted `janus2`). Constraint verified on both: `UNIQUE NULLS NOT DISTINCT (person_id, resource_id, valid_from, valid_until)`. The 6 duplicate/leftover `test-person-%` rows on `janus2_fresh` deleted — grants back to the 18 seed rows.

**Verification (quoted):**
- `DATABASE_URL=...janus2_fresh cargo test --test digital_resources_api_test test_issue_grant_idempotent -- --exact --include-ignored` → `test test_issue_grant_idempotent ... ok` / `test result: ok. 1 passed; 0 failed` — and the DB held exactly **1** matching row after the duplicate issue (cleaned after).
- `cargo test --test security_hardening_test -- --include-ignored` → `12 passed; 0 failed` (no regression).
- `cargo test --test resolver_parity` → `1 passed; 0 failed` (byte-parity intact).

**Cleanup (verifier warning):** `resolver::can_issue_resource_grant` marked `#[allow(dead_code)]` with the comment corrected — retained for SEED-012 (org-based authz), not deleted; the stale org-based sequence comment on `issue_grant` rewritten to describe the actual Option B flow. Build warnings 34 → 29.
