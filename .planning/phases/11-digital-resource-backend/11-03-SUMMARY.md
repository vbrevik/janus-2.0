---
phase: 11-digital-resource-backend
plan: 03
subsystem: backend
tags: [rust, rocket, sqlx, authz, idor, security, digital-resources, datetime, parity]

requires:
  - phase: 11-digital-resource-backend
    plan: 02
    provides: pure resolver + 8 sqlx structs + golden-parity test (handlers build on these)
provides:
  - "AuthGuard-protected GET /api/digital-resources/world aggregate read (RSRC-BE-03)"
  - "POST /grants + /delegates issue endpoints with server-side write authority (RSRC-BE-04)"
  - "Role-based write authz (Option B): authority derived from JWT role, never the request body — closes the 8ea8948 IDOR"
  - "Idempotent seed migration for the 6-unit dataset (RSRC-BE-05) — committed as a file (not yet applied to the drifted dev DB)"
  - "seedWorld() de-hardcoded: frontend digitalResources start empty; DB is the source of truth (RSRC-BE-05)"
  - "Resolver + models migrated to DateTime<Utc> (DB is TIMESTAMPTZ); PolicyVersion stays NaiveDateTime for TS golden byte-parity"
affects:
  - 11-04-security-hardening (SEC-01..04 — AuthGuard-all, per-role writes, JWT fail-loud, CORS — still TODO; the CORS start was backed out of this plan)
  - 12-demo-ui (Phase 12 populates digitalResources via GET /world; the empty seedWorld arrays are the handoff point)

tech-stack:
  added: []
  patterns:
    - "Role-based write gate at the HTTP edge: `if auth.claims.role != \"admin\" { return Err(Status::Forbidden) }` — authorizing identity from AuthGuard/JWT, never client body"
    - "assert_resource_exists: a single EXISTS-over-UNION probe for 404 validation (writes need existence, not a full ResolverResource, once authz is role-based)"
    - "Time-type boundary: resolver internals + DB reads use DateTime<Utc>; the PolicyVersion serde output shape stays NaiveDateTime and converts via .naive_utc() to preserve TS byte-parity"

key-files:
  created:
    - backend/migrations/20260601130001_seed_digital_resources.sql
    - backend/tests/digital_resources_api_test.rs
    - .planning/seeds/SEED-012-org-based-resource-authz.md
  modified:
    - backend/src/digital_resources/handlers.rs
    - backend/src/digital_resources/models.rs
    - backend/src/digital_resources/resolver.rs
    - backend/src/digital_resources/mod.rs
    - backend/tests/resolver_parity.rs
    - frontend/src/demo/store/world-state.tsx

key-decisions:
  - "Authz model = Option B (role-based), NOT Option A (org-based). Investigation against the live dev DB proved there is NO person→org linkage: person has no org column; the relations CHECK allows only person/vendor; resource_org_links is empty; and organizations.id (integer) vs resource org_id (text) are disjoint id spaces. Option A is therefore a data-model build, not a code change — deferred to SEED-012. Option B closes the IDOR minimally and matches the codebase's role-based guard convention."
  - "The paused executor left the tree non-compiling: a half-done NaiveDateTime→DateTime<Utc> resolver migration + a prematurely-started 11-04 CORS change. Completed the DateTime migration (correct: DB cols are TIMESTAMPTZ→DateTime<Utc>) and backed the CORS change out to HEAD (it belongs to 11-04, used the wrong rocket_cors API)."
  - "PolicyVersion output kept as NaiveDateTime: the golden fixture serializes policy-window timestamps without a Z suffix; DateTime<Utc> would emit `...Z` and break byte-parity. Converted at the resolver output boundary via .naive_utc()."
  - "build_resolver_resource (full ResolverResource build for the old authority check) replaced by assert_resource_exists — the role gate made the resolver-authority build dead code on the write path."

metrics:
  completed: 2026-07-02
  tasks: 3
  files: 9

requirements-completed: [RSRC-BE-03, RSRC-BE-04, RSRC-BE-05]
requirements-deferred: [SEC-01, SEC-02, SEC-03, SEC-04]
status: complete
---

# Phase 11 / Plan 03: Digital-Resource Endpoints + IDOR Fix — Summary

**The digital-resource domain is exposed through an AuthGuard-protected aggregate read and two issue endpoints whose write authority is derived server-side from the authenticated principal's role — closing a confirmed IDOR where any authenticated user could issue grants by naming an ADMIN org in the request body. The paused Plan-03 DB-wiring (resolver DateTime migration) was completed to a green, byte-parity-preserving compile, and seedWorld() was de-hardcoded so the backend is the source of truth.**

## What Shipped

- **GET `/api/digital-resources/world`** (RSRC-BE-03) — AuthGuard-protected; 8 flat queries assembled into one aggregate response. 401 without a token.
- **POST `/grants`, `/delegates`** (RSRC-BE-04) — ADMIN-only via the JWT `role`; the org fields in the body (`actor_org_id` / `granted_by_org_id`) are ignored for authorization. Idempotent inserts. 404 on unknown resource, 403 for non-admin.
- **Seed migration** (RSRC-BE-05) — `20260601130001_seed_digital_resources.sql`, idempotent, the 6-unit dataset. Committed earlier (290fd1c); **not yet applied** to the drifted dev DB (`sqlx migrate run` is broken there).
- **seedWorld() de-hardcode** (RSRC-BE-05) — `digitalResources` arrays start empty; Phase 12 loads them from `/world`.

## Security — the IDOR

The committed T1 handlers (8ea8948) authorized `can_issue_resource_grant(&data.actor_org_id, …)` against a **client-supplied org**, so any authenticated caller could name any ADMIN org and issue grants (privilege escalation). Fixed by gating both write endpoints on `auth.claims.role == "admin"` and removing the body-org authority path. See the `key-decisions` block for why the resolver-aligned org-based model (Option A) was not viable and was deferred to **SEED-012**.

## Verification

- `cargo test --test resolver_parity` → **1 passed** (byte-parity preserved after the DateTime migration).
- `cargo test --test digital_resources_api_test` → 401 test passes; security tests (non-admin→403 on grants + delegates, admin→404-clears-gate) **pass against the live DB**; seed-dependent tests (200 / count / idempotency) are `#[ignore]` and require the seed migration applied.
- `npx vitest run world-state` → **8 passed**.
- Backend library compiles clean (0 errors). Pre-existing, out-of-scope issues left untouched and noted: `organizations/handlers.rs` inline unit tests miss a `department` field (blocks the lib *unit-test* target only); `person/handlers.rs:257` unused-`params` warning; 6 `react-refresh` lint errors in `world-state.tsx`.

## Carried Forward

- **11-04 (SEC-01..04)** — security hardening not started; the CORS change was backed out of this plan.
- **Seed data** — the migration must actually be applied to a DB (or the migration baseline repaired) before the seed-dependent integration tests and the demo `/world` fetch return data.
- **SEED-012** — org-based resource authz (Option A), dormant.

## Commits

- `5e7bcb5` fix(11-03): close digital-resource IDOR with role-based write authz (Option B)
- `987c3d8` refactor(11-03): de-hardcode digital-resource fixtures from seedWorld
- (earlier) `8ea8948` handlers + mount, `290fd1c` seed migration
