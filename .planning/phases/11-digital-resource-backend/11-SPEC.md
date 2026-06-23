# Phase 11: Digital Resource Backend & Resolver Port — Specification

**Created:** 2026-06-19
**Last updated:** 2026-06-23
**Ambiguity score:** 0.18 (gate: ≤ 0.20)
**Requirements:** 10 locked

> **Amendment 2026-06-23 (spec-phase update).** Phase 13 (Security hardening) was **folded
> into Phase 11 in full and removed from the roadmap**. The live server-side security holes
> from `.planning/codebase/CONCERNS.md` are now Phase 11 requirements: SEC-01 (universal
> AuthGuard), SEC-02 (per-role authorization on writes + sensitive reads), SEC-03 (JWT
> fail-loud, no hardcoded fallback), SEC-04 (CORS restricted to the dev frontend). Rationale:
> they share the backend trust boundary with RSRC-BE-04 and SEC-03/04 touch `rocket_setup.rs`,
> which this phase already modifies for migration repair. **Plans 11-01/02/03 predate this fold
> and must be re-planned to cover SEC-01..04** (most land in 11-03 handlers/integration; SEC
> also warrants its own plan slice).

> **Amendment 2026-06-19 (discuss-phase D-01).** Scope expanded to include **migration-chain
> repair**: the previously-additive-only migration constraint is superseded. A clean database
> must now migrate end-to-end with zero errors before the 8 new tables are added. New
> requirement RSRC-BE-06 + a new acceptance criterion added; Constraints updated.

> **Split note.** This phase was split out of the original Phase 11 ("Demo UI & Tab
> Integration") on 2026-06-19 when the user expanded scope to a full-stack vertical. The
> backend + resolver-port work lives here (Phase 11); the demo UI, hybrid loader, and tab
> integration live in **Phase 12** (`12-demo-ui-tab-integration`), which depends on this
> phase. The approved UI design contract moved to `12-UI-SPEC.md`. This scope goes beyond the
> original frontend-only ROADMAP framing of v2.2 — recorded deliberately.

## Goal

The Janus digital-resource model becomes persisted and server-authoritative: the broken migration chain is repaired so a clean database migrates end-to-end, eight new Postgres tables back the Network→Platform→Application domain, the complete gate-chain resolver is re-implemented in Rust with parity to the TS resolver, and AuthGuard-protected read + issue endpoints expose it — with the issue endpoints re-validating issuing authority server-side and the `seed.ts` fixtures loaded into Postgres as the single source of truth. **In the same pass, the backend's live server-side security holes are closed**: every handler across every domain enforces authentication and (on writes + sensitive reads) per-role authorization, the JWT secret fails loud instead of falling back to a hardcoded default, and CORS is restricted to the dev frontend origin.

## Background

The entire v2.2 digital-resource model currently lives **only in the frontend**: `demo/lib/model.ts` (types + `resolveResourceAccess`, `canIssueResourceGrant`, gate evaluators, `effectiveClassification`, `isWindowActive`), `demo/lib/seed.ts` (`RESOURCE_NODES`, `RSRC_POLICIES`, `RESOURCE_GRANTS`, `RSRC_DELEGATES`), and `demo/store/world-state.tsx` (`seedWorld()` hardcodes the arrays). There is **no backend domain** — no tables, no `/api` routes, no sqlx structs. The backend uses flat domain modules (`mod.rs`/`models.rs`/`handlers.rs`, no service layer, inline sqlx on `PgPool`), with `AuthGuard` Bearer-JWT on every non-login handler. Migrations are known-broken on a clean DB and the live dev DB drifts from code (CLAUDE.md gotchas). Phases 9–10 are verified.

## Requirements

0. **Migration-chain repair** (`RSRC-BE-06`, prerequisite): The broken migration history is repaired so a clean database applies all migrations end-to-end.
   - Current: `sqlx migrate run` fails on a clean DB (ALTER-before-CREATE, duplicate versions, zombie `rename_personnel_to_person` vs the authoritative unified-create); the live dev DB has drifted from the migration set
   - Target: A clean database migrates from empty to current with zero errors; the live dev DB is not broken by the repair (verify against it)
   - Acceptance: `sqlx migrate run` (or equivalent) against a freshly-created empty database completes with zero errors and yields a schema the backend compiles and queries against

1. **Backend domain + schema** (`RSRC-BE-01`): A new digital-resource backend domain persists all 8 entities.
   - Current: No tables, models, or routes for networks/platforms/applications/org_links/resource_policies/policy_assignments/resource_access_grants/resource_access_delegates
   - Target: 8 tables created via migration with sqlx models + Rocket handlers mounted under `/api/...`, mirroring the `model.ts` shapes (exact columns/FKs decided in plan-phase against the live DB)
   - Acceptance: A fresh-applied migration creates all 8 tables; `cargo build` compiles the new domain; each table is reachable via its handler

2. **Rust resolver parity** (`RSRC-BE-02`): The full gate-chain resolver is ported to Rust and matches the TS resolver.
   - Current: `resolveResourceAccess` exists only in TS; no server-side resolution
   - Target: A Rust resolver implements clearance + own-tier grant + parent-tier prerequisite + advisory zone + time-versioned policy selection, producing the same `allow`/gate-set/`policyVersion` as the TS resolver for the seed fixtures; takes an explicit evaluation timestamp (no `now()` inside resolution)
   - Acceptance: A parity test evaluates the seed fixtures at fixed timestamps and asserts the Rust output equals the TS output, **including** (a) a policy-window-boundary timestamp where `valid_from`/`valid_until` are inclusive on both sides, and (b) a timestamp with no covering policy returning a fail-closed DENY with `NO_ACTIVE_POLICY`

3. **Read API** (`RSRC-BE-03`): AuthGuard-protected GET endpoints expose the full domain.
   - Current: No endpoints
   - Target: GET endpoints return the network/platform/application hierarchy plus policies, grants, and delegates, behind `AuthGuard`
   - Acceptance: An authenticated GET returns the seeded hierarchy + policies/grants/delegates as JSON; an unauthenticated request is rejected by `AuthGuard`

4. **Issue API + server-side trust boundary** (`RSRC-BE-04`): POST endpoints issue a grant/delegate, re-validating authority server-side.
   - Current: No issue endpoints; `canIssueResourceGrant` exists only in TS (client-side)
   - Target: POST endpoints persist a new resource grant / delegate **only after** the ported Rust `canIssueResourceGrant` re-validates the actor's issuing authority
   - Acceptance: POST issue persists for an authorized actor (active ADMIN-org or active delegate); returns **403** for each of (i) a non-ADMIN actor with no delegate, (ii) an expired delegate, (iii) a delegate outside its validity window; issuing the **same** grant/delegate twice creates no duplicate row (rejected or de-duplicated)

5. **Postgres single source of truth** (`RSRC-BE-05`): Seed fixtures move into the DB; `seedWorld()` stops hardcoding resources.
   - Current: `seedWorld()` hardcodes the digital-resource arrays from `seed.ts`
   - Target: The `seed.ts` digital-resource fixtures are loaded into Postgres (migration vs script decided in plan-phase); `seedWorld()` no longer hardcodes the digital-resource arrays
   - Acceptance: `git grep` confirms `seedWorld()` no longer inlines the digital-resource fixtures; a GET against the seeded DB returns the same 6-unit dataset previously hardcoded

6. **Universal authentication** (`SEC-01`): Every backend handler across every domain is `AuthGuard`-protected.
   - Current: `messaging/handlers.rs` and `vendor_relations/handlers.rs` have NO `AuthGuard` — their endpoints are reachable unauthenticated; every other domain already guards
   - Target: `messaging` and `vendor_relations` handlers take `AuthGuard`; no endpoint except `auth` login is reachable without a valid Bearer JWT
   - Acceptance: an unauthenticated request to any `messaging` or `vendor_relations` endpoint is rejected (401/403); a `git grep` / handler audit shows every non-login handler signature includes `AuthGuard`

7. **Per-role authorization on writes + sensitive reads** (`SEC-02`): Authentication is not authorization — mutations and sensitive reads check the actor's role.
   - Current: only `roles/handlers.rs` calls `role_has_permission(&auth.claims.role, "roles.read"/"roles.write")`; every other domain is authn-only — any authenticated actor can write to any domain
   - Target: every write/mutation handler and every sensitive read (audit) gates via `role_has_permission(&auth.claims.role, "<domain>.<action>")`; the required permission keys are seeded into `permissions` + `role_permissions`
   - Acceptance: an authenticated actor whose role lacks the permission receives **403** (not 500) on a guarded write; an actor whose role holds it succeeds; the new permission keys exist in the seeded DB

8. **JWT secret fail-loud** (`SEC-03`): An unset secret aborts startup rather than silently using a known default.
   - Current: `rocket_setup.rs:22-23` falls back to the hardcoded `"test-secret-key-must-be-at-least-32-characters-long"` when `JWT_SECRET` is unset — anyone can forge admin tokens
   - Target: the hardcoded fallback is removed; backend startup aborts (panic/non-zero exit, before serving any request) when `JWT_SECRET` is unset or empty; tests, `docker-compose.dev`, and `.env` supply it explicitly
   - Acceptance: starting the backend with no `JWT_SECRET` exits non-zero before binding the port; `git grep` finds no hardcoded secret literal in the startup path; `cargo test` passes with the secret supplied via env

9. **CORS restricted to dev frontend** (`SEC-04`): The wildcard origin is replaced with the single dev origin.
   - Current: `rocket_setup.rs:58` uses `AllowedOrigins::all()` with `allow_credentials(true)` (line 65) — an invalid+permissive combo
   - Target: `AllowedOrigins::all()` is replaced with `http://localhost:15510`; `allow_credentials(true)` is retained
   - Acceptance: a CORS request from `http://localhost:15510` is permitted; a request from a different origin is not granted CORS access; the config contains no `AllowedOrigins::all()`

## Boundaries

**In scope:**
- Migration-chain repair: a clean database migrates end-to-end with zero errors (prerequisite to the new tables)
- New backend digital-resource domain: 8 tables + migration, sqlx models, Rocket handlers
- Full gate-chain resolver ported to Rust with a TS-parity test
- Read API (GET hierarchy/policies/grants/delegates) + Issue API (POST grant, POST delegate) — all AuthGuard-protected
- Server-side re-validation of issuing authority (ported `canIssueResourceGrant`)
- Seeding the `seed.ts` digital-resource fixtures into Postgres; removing the hardcoded `seedWorld()` digital-resource init
- **Security hardening (folded from Phase 13):** `AuthGuard` on `messaging` + `vendor_relations`; per-role `role_has_permission` gating on all write/mutation handlers + sensitive (audit) reads across all domains; JWT-secret fail-loud (remove hardcoded fallback); CORS restricted to `http://localhost:15510`

**Out of scope:**
- All demo UI, the hybrid loader, grant-toggle UI, issuing forms, and the tab — **Phase 12**
- Editing/creating policies, org-links, resources, or the hierarchy — only grant/delegate *issuing* is a write path
- New TanStack route files — none touched in this phase
- Reworking the v2.1 physical-access/zone backend — the advisory zone link reads existing data only
- A new RBAC framework or middleware redesign — SEC-02 reuses the existing `role_has_permission` helper and `AuthGuard`; no new auth abstraction
- Frontend role-guard changes — `ProtectedRoute` and client-side gating are untouched; this phase hardens the *server* only
- Defining new business roles or a full permission matrix audit — only the permission keys needed to gate the guarded handlers are seeded

## Constraints

- **Stack locked** (CLAUDE.md): Rust 1.87 + Rocket 0.5 + sqlx/PostgreSQL. No new frameworks.
- **Migration-chain repair is in scope** (amended 2026-06-19): the chain must be fixed so a clean DB migrates end-to-end (ALTER-before-CREATE, dup versions, dead `users` FK, zombie `rename_personnel_to_person` vs the authoritative unified-create, `personnel_id`/`issued_by` vs `person_id`). The repair must NOT break the live dev DB — verify against the live state and against a fresh empty DB. The 8 new tables are added on the repaired baseline. See project memory `project_migrations_fresh_db_broken` for the reconstruction recipe.
- **Backend conventions:** flat domain module (`mod.rs`/`models.rs`/`handlers.rs`), no service layer, inline sqlx on `PgPool`; handlers return `Result<Json<T>, Status>` (never panic); `AuthGuard` on every handler; relative handler paths under the `/api/<x>` mount (don't double-prefix).
- **Auth:** `AuthGuard` on all new endpoints; per-route role gating on the issue POSTs deferred to plan-phase.
- **DB seeding mechanism** (migration vs seed script) deferred to plan-phase; the requirement (fixtures must reach Postgres) is locked.
- **Determinism:** the Rust resolver takes an explicit evaluation timestamp — no `now()` inside resolution — so parity tests are reproducible.
- **Security reuses existing primitives** (SEC-01/02): `AuthGuard` (Bearer-JWT request guard) and `role_has_permission(db, &auth.claims.role, perm_key)` already exist — no new auth framework. Permission keys follow the `<domain>.<action>` convention already used by `roles.read`/`roles.write`.
- **JWT fail-loud everywhere** (SEC-03): the hardcoded fallback is removed in all build paths; tests + `docker-compose.dev` + `.env` must set `JWT_SECRET`. Startup aborts before serving when it is unset or empty.
- **CORS single dev origin** (SEC-04): `http://localhost:15510`, `allow_credentials(true)` retained. (Env-configurable origins were considered and deferred — single hardcoded dev origin for now.)

## Acceptance Criteria

- [ ] A freshly-created empty database migrates end-to-end with zero errors (chain repaired)
- [ ] A fresh-applied migration creates all 8 digital-resource tables; `cargo build` compiles the new domain
- [ ] Rust resolver parity test asserts equality with the TS resolver on the seed fixtures, including the inclusive policy-window boundary and the no-policy `NO_ACTIVE_POLICY` DENY
- [ ] AuthGuard-protected GET returns the seeded hierarchy + policies/grants/delegates; unauthenticated GET is rejected
- [ ] POST issue persists for an authorized actor and returns 403 for non-ADMIN/no-delegate, expired-delegate, and out-of-window-delegate actors
- [ ] Issuing the same grant/delegate twice creates no duplicate row
- [ ] `seedWorld()` no longer hardcodes the digital-resource fixtures; the seeded DB serves the same 6-unit dataset
- [ ] Every `messaging` and `vendor_relations` endpoint rejects an unauthenticated request; no non-login handler is missing `AuthGuard` (SEC-01)
- [ ] A guarded write returns 403 for an actor whose role lacks the permission key and succeeds for one that holds it; the new permission keys exist in the seeded DB (SEC-02)
- [ ] Backend startup with no `JWT_SECRET` exits non-zero before binding the port; no hardcoded secret literal remains in the startup path (SEC-03)
- [ ] CORS permits `http://localhost:15510` and does not grant access to a different origin; config contains no `AllowedOrigins::all()` (SEC-04)
- [ ] `cargo test` passes with zero failures

## Edge Coverage

**Coverage:** 7/7 applicable edges resolved · 0 unresolved

| Category | Requirement | Status | Resolution / Reason |
|----------|-------------|--------|---------------------|
| boundary | RSRC-BE-02 | ✅ covered | Policy window inclusive at both `valid_from`/`valid_until`; parity test asserts it |
| empty | RSRC-BE-02 | ✅ covered | No covering policy → fail-closed DENY `NO_ACTIVE_POLICY` |
| boundary | RSRC-BE-04 | ✅ covered | Issue 403 for non-ADMIN/no-delegate, expired delegate, out-of-window delegate |
| idempotency | RSRC-BE-04 | ✅ covered | Duplicate issue creates no duplicate row |
| auth | SEC-02 | ✅ covered | Authenticated-but-unauthorized actor → 403, not 500 (acceptance criterion) |
| empty | SEC-03 | ✅ covered | `JWT_SECRET` set but **empty string** also aborts startup, not just when unset |
| boundary | SEC-04 | ✅ covered | Disallowed origin (and preflight from it) is not granted CORS access |
| concurrency | RSRC-BE-03/04 | ⛔ dismissed | Demo backend; no concurrent-writer contract beyond DB row uniqueness |

## Prohibitions (must-NOT)

**Coverage:** 6/6 applicable prohibitions resolved · 0 unresolved

| Prohibition (must-NOT statement) | Requirement | Status | Verification / Reason |
|----------------------------------|-------------|--------|------------------------|
| The zone-advisory row MUST NOT change the ALLOW/DENY verdict in the ported Rust resolver | RSRC-BE-02 | resolved | test — parity + a fixture where only the zone prereq fails still resolves per the gate chain |
| Application classification MUST NOT be stored or editable independently of its Platform (no column, no API field) | RSRC-BE-01 | resolved | test — schema has no app classification column; classification is derived |
| The issue endpoint MUST NOT persist on the client's say-so — the server re-validates issuing authority on every call | RSRC-BE-04 | resolved | test — issue with a forged/insufficient actor returns 403 server-side regardless of client state |
| The hardcoded JWT-secret fallback MUST NOT remain reachable in any build path (incl. release) | SEC-03 | resolved | test — `git grep` finds no secret literal in startup; unset-secret start exits non-zero |
| A non-login handler MUST NOT be mounted without `AuthGuard` (no unauthenticated endpoint survives) | SEC-01 | resolved | test — handler-signature audit; unauthenticated request to every domain is rejected |
| CORS MUST NOT reflect an arbitrary `Origin` while `allow_credentials(true)` (no allow-all-with-credentials) | SEC-04 | resolved | test — config has no `AllowedOrigins::all()`; foreign origin not granted access |

## Ambiguity Report

| Dimension          | Score | Min  | Status | Notes                                            |
|--------------------|-------|------|--------|--------------------------------------------------|
| Goal Clarity       | 0.85  | 0.75 | ✓      | Backend + security outcomes fully specified      |
| Boundary Clarity   | 0.82  | 0.70 | ✓      | UI → Phase 12; security reuses existing primitives, no new framework |
| Constraint Clarity | 0.75  | 0.65 | ✓      | AuthGuard + RBAC bar + JWT fail-loud + CORS origin + migration + determinism |
| Acceptance Criteria| 0.82  | 0.70 | ✓      | 11 pass/fail criteria + negatives                |
| **Ambiguity**      | 0.18  | ≤0.20| ✓      | Gate passed (security fold re-scored 2026-06-23) |

## Interview Log

| Round | Perspective     | Question summary                          | Decision locked                                              |
|-------|-----------------|-------------------------------------------|--------------------------------------------------------------|
| 0     | Boundary Keeper | Delegation UI? Backend?                   | Backend IN scope (scope expansion — split into this phase)   |
| 1     | Researcher      | Which entities? Issue persistence?        | All 8 entities; backend POST + WorldState                    |
| 2     | Boundary Keeper | Issue authz? Endpoint auth? DB seeding?   | Port `canIssueResourceGrant` to Rust; AuthGuard (role-gating deferred); seed→DB (mechanism deferred) |
| 3     | Seed Closer     | Source of truth? Resolver port boundary?  | DB replaces `seedWorld()` init; **full** resolver ported to Rust |
| 5.5   | Failure Analyst | Edge cases to pin?                        | Policy-boundary + no-policy DENY; three 403 cases; issue idempotency |
| 5.6   | Prohibition     | must-NOT statements?                       | Advisory-never-flips; classification-inherited; no client-trusted issuing |
| U1    | Boundary Keeper | Security fold (2026-06-23): RBAC bar? JWT? CORS? | AuthGuard-all + per-role on writes/sensitive reads; JWT fail-loud everywhere (no fallback); CORS → `localhost:15510`. Phase 13 folded in full + removed |

---

*Phase: 11-digital-resource-backend*
*Spec created: 2026-06-19 (split from original Phase 11); security fold added 2026-06-23 (Phase 13 merged + removed)*
*Next step: re-plan Phase 11 — existing plans 11-01/02/03 predate the SEC-01..04 fold and must cover it (`/gsd-plan-phase 11`). Phase 12 (UI) depends on this.*
