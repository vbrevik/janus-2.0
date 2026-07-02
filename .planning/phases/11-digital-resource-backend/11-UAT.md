---
status: complete
phase: 11-digital-resource-backend
source: [11-01-SUMMARY.md, 11-02-SUMMARY.md, 11-03-SUMMARY.md, 11-04-SUMMARY.md]
started: 2026-07-02T20:15:00.000Z
updated: 2026-07-02T20:45:00.000Z
tested_by: claude (user-delegated — "you run the tests for me")
---

## Current Test

[testing complete]

## Tests

### 1. Cold Start Smoke Test
expected: Backend killed and restarted from scratch boots without errors, binds :15520, and the login endpoint returns 200 with a JWT (live data from the dev DB).
result: pass
evidence: pkill → cargo run → boot clean, admin login 200 with JWT (role=admin)

### 2. JWT fail-loud (SEC-03)
expected: Starting the backend with JWT_SECRET unset or empty refuses to boot — prints `FATAL: JWT_SECRET must be set...` and exits 1 before binding the port.
result: pass
evidence: unset → "FATAL: JWT_SECRET must be set to a non-empty value (no fallback secret exists)", exit=1; empty string → same

### 3. Auth wall on every endpoint (SEC-01)
expected: Any API call without a Bearer token returns 401, including vendor_relations. Only /api/auth/login is public.
result: pass
evidence: GET /api/person 401, GET /api/audit 401, GET /api/vendors/1/relations 401, DELETE /api/vendors/relations/:id 401. (Initial 404 was a wrong test URL — vendor routes are absolute /api/vendors/...)

### 4. Per-role RBAC — 403 not 500 (SEC-02)
expected: viewer writes → 403; manager nda.write 200 but access writes 403; admin passes gates.
result: issue
reported: "Convention holds everywhere tested (viewer POST /api/nda 403, manager POST /api/nda 200, manager+viewer POST /api/access/computer 403, viewer GET /api/audit 403, admin 200) EXCEPT the roles module: POST /api/roles as viewer returns 401, not 403 — roles/handlers.rs uses AppError::Unauthorized at all 5 permission-gate sites instead of AppError::Forbidden."
severity: minor

### 5. Digital-resources aggregate read (RSRC-BE-03)
expected: GET /api/digital-resources/world with valid JWT returns 200 with world payload; arrays empty on janus2 until seed data applied there (known carried blocker).
result: pass
evidence: 200 `{"success":true,"data":{"networks":[],...}}` — correct shape, empty as documented

### 6. Grant issue + idempotency (RSRC-BE-04, gap-closure 4fd2ec9)
expected: Duplicate issue-grant creates exactly one row (NULLS NOT DISTINCT).
result: pass
evidence: `test_issue_grant_idempotent` vs seeded janus2_fresh: 1 passed, 0 failed

### 7. CORS pinned to dev origin (SEC-04)
expected: localhost:15510 origin gets ACAO + credentials; foreign origin gets no ACAO.
result: pass
evidence: good origin → `access-control-allow-origin: http://localhost:15510` + `access-control-allow-credentials: true`; evil.example → no ACAO header

### 8. Rust resolver parity + security suite (RSRC-BE-02, SEC-01..04)
expected: resolver_parity 1 passed; security_hardening_test 12 passed.
result: pass
evidence: parity `ok. 1 passed; 0 failed`; security `ok. 12 passed; 0 failed` (--include-ignored, live dev DB)

## Summary

total: 8
passed: 7
issues: 1
pending: 0
skipped: 0

## Gaps

- truth: "Permission-gate refusal returns 403 Forbidden (never 401/500) on every module (SEC-02)"
  status: failed
  reason: "User-delegated test found: POST /api/roles as viewer returns 401. roles/handlers.rs pre-dates the 11-04 AppError::Forbidden variant and uses AppError::Unauthorized at its 5 permission-gate sites (lines ~18,39,64,103,120). Response is still a denial (no privilege escalation) — wrong status semantics only."
  severity: minor
  test: 4
  artifacts: [backend/src/roles/handlers.rs]
  missing: ["swap 5x AppError::Unauthorized → AppError::Forbidden at the role_has_permission gate sites in roles/handlers.rs", "extend security_hardening_test with a viewer→roles.write 403 assertion"]
