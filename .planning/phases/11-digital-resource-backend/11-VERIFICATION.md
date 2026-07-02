---
phase: 11-digital-resource-backend
verified: 2026-07-02T20:00:00Z
status: passed
score: 16/16 must-haves verified
behavior_unverified: 0
overrides_applied: 1
overrides:
  - must_have: "403 for non-ADMIN/no-delegate, expired-delegate, and out-of-window-delegate actors (server-side re-validation via ported canIssueResourceGrant)"
    reason: "Locked decision (11-03 key-decision, confirmed by user): authz model is role-based (Option B) — write authority derives from the JWT role, never the request body; the org/delegate-based authority model (Option A) requires a person→org data model that does not exist and is deferred to SEED-012. Server-side re-validation IS achieved (role gate at the HTTP edge, body org fields ignored — behaviorally proven); the delegate-window 403 sub-cases and the can_issue_resource_grant wiring are moot under Option B."
    accepted_by: "vidar (via 11-03 execution decision)"
    accepted_at: "2026-07-02T00:00:00Z"
re_verification:
  previous_status: gaps_found
  previous_score: 15/16
  gaps_closed:
    - "A duplicate issue creates no duplicate row (ROADMAP SC 4 / RSRC-BE-04) — closed by commit 4fd2ec9: migration 20260601130003_fix_uq_grant_nulls_not_distinct.sql (ctid-based NULL-safe dedupe + uq_grant recreated as UNIQUE NULLS NOT DISTINCT). Re-verified independently: pg_constraint on both janus2 and janus2_fresh shows 'UNIQUE NULLS NOT DISTINCT (person_id, resource_id, valid_from, valid_until)'; zero duplicate natural-key tuples; test_issue_grant_idempotent run --exact --include-ignored against seeded janus2_fresh → 1 passed, exactly 1 row after the duplicate POST"
  gaps_remaining: []
  regressions: []
---

# Phase 11: Digital Resource Backend & Resolver Port — Verification Report

**Phase Goal:** The digital-resource model becomes persisted and server-authoritative — 8 Postgres tables back the Network → Platform → Application domain, the full gate-chain resolver is re-implemented in Rust with parity to the TS resolver, and AuthGuard read + issue endpoints expose it (issue endpoints re-validate authority server-side); seed.ts fixtures are loaded into Postgres as the single source of truth.
**Verified:** 2026-07-02 (initial 14:05Z, re-verification after gap closure ~20:00Z)
**Status:** passed
**Re-verification:** Yes — after gap closure (commit `4fd2ec9`)

## Re-Verification of the Closed Gap

Initial verification found grant-issue idempotency FAILED: `uq_grant` treated NULL window values as distinct, so `ON CONFLICT DO NOTHING` never fired for null-windowed grants (4 identical rows proven). Fix `4fd2ec9` re-verified independently:

| Check | Command | Result |
| ----- | ------- | ------ |
| Migration content | `git show 4fd2ec9` + read 20260601130003 | NULL-safe ctid dedupe (`IS NOT DISTINCT FROM`) then `ADD CONSTRAINT uq_grant UNIQUE NULLS NOT DISTINCT (...)`; idempotent (DROP IF EXISTS, no-op dedupe on clean data) |
| Constraint live (janus2_fresh) | `pg_constraint` | `UNIQUE NULLS NOT DISTINCT (person_id, resource_id, valid_from, valid_until)` |
| Constraint live (janus2) | `pg_constraint` | Same — applied to both DBs |
| No duplicate tuples | GROUP BY natural key HAVING count>1 | 0 on both DBs; janus2_fresh grants back to the 18 seed rows (evidence rows deleted) |
| Behavioral proof | `DATABASE_URL=...janus2_fresh cargo test --test digital_resources_api_test test_issue_grant_idempotent -- --exact --include-ignored` | **1 passed**; exactly **1 row** for the (test-person-idempotent, rsrc-homeguard, NULL, NULL) tuple after two identical POSTs (row removed after verification, DB restored to 18 seed rows) |
| Regression | `resolver_parity`; `security_hardening_test -- --include-ignored`; `cargo build` | 1 passed; 12 passed; 0 errors |
| Cleanup items | resolver.rs / handlers.rs comments | `can_issue_resource_grant` now `#[allow(dead_code)]` with SEED-012 retention comment (resolver.rs:370-373); stale issue_grant comment rewritten to describe the actual role gate + NULLS NOT DISTINCT (handlers.rs:130-134) |

## Goal Achievement

### Observable Truths

| #   | Truth | Status | Evidence |
| --- | ----- | ------ | -------- |
| 1   | SC0 (RSRC-BE-06): fresh empty DB migrates end-to-end, zero errors | ✓ VERIFIED | Chain statically clean (no duplicate version prefixes, zombie rename_personnel_to_person deleted — 0 matches). janus2_fresh `_sqlx_migrations`: 31 versions tracked, all `success=t`, through 20260601130001; 20260601130002/130003 applied via psql on both DBs and proven executable (role grants present: admin=15, manager=9; uq_grant recreated) |
| 2   | SC1 (RSRC-BE-01): fresh-applied migration creates all 8 digital-resource tables; domain compiles | ✓ VERIFIED | 8 CREATE TABLE statements in 20260601130000; tables live in janus2 and janus2_fresh; `cargo build` 0 errors |
| 3   | SC2 (RSRC-BE-02): Rust resolver parity incl. inclusive boundary + NO_ACTIVE_POLICY DENY | ✓ VERIFIED | `cargo test --test resolver_parity` → **1 passed** (run twice by verifier, incl. post-fix regression). Golden JSON committed (3 cases: mid-window ALLOW, boundary ALLOW, NO_ACTIVE_POLICY DENY); TS exporter wired via writeFileSync |
| 4   | SC3 (RSRC-BE-03): AuthGuard GET returns seeded hierarchy; unauth rejected | ✓ VERIFIED | test_get_world_unauthenticated (401) passed; GET /world against seeded janus2_fresh returned 200 + success flag + correct hierarchy counts. Mounted at /api/digital-resources with relative macro paths |
| 5   | SC4a: POST issue persists for an authorized actor | ✓ VERIFIED | test_issue_grant_admin_200 **passed** against seeded janus2_fresh (200, row returned) |
| 6   | SC4b: 403 for unauthorized actors, authority re-validated server-side | ✓ PASSED (override) | test_issue_grant_non_admin_403, test_issue_delegate_non_admin_403, test_issue_grant_admin_unknown_resource_404 all **passed** against live DB; request body claims `"actor_org_id": "ANY_ORG_IS_IGNORED"` and is ignored — authority derived from JWT role. Delegate-window sub-cases + can_issue_resource_grant wiring overridden per locked Option B decision (SEED-012 defers Option A) |
| 7   | SC4c: duplicate issue creates no duplicate row | ✓ VERIFIED (gap closed, 4fd2ec9) | Initially FAILED (NULLs-distinct uq_grant). After 20260601130003: constraint is UNIQUE NULLS NOT DISTINCT on both DBs; test_issue_grant_idempotent (--exact --include-ignored, seeded janus2_fresh) → **1 passed**, exactly 1 row after duplicate POST; 0 duplicate tuples in either DB. Delegates path was already NULL-safe (WHERE NOT EXISTS / IS NOT DISTINCT FROM) |
| 8   | SC5 (RSRC-BE-05): seedWorld() de-hardcoded; seeded DB serves the 6-unit dataset | ✓ VERIFIED | world-state.tsx digitalResources arrays all start empty with do-not-re-inline comment; seed migration inserts 6 networks/4 platforms/4 apps/18 org_links/3 policies/15 assignments/18 grants/1 delegate; janus2_fresh serves them via GET /world |
| 9   | resource_applications has NO classification column; networks/platforms 5-level RESTRICTED CHECK; person 4-level CHECK untouched | ✓ VERIFIED | Table 3 columns: id/name/platform_id/timestamps only; RESTRICTED in networks+platforms CHECKs; person CHECK remains ('UNCLASSIFIED','CONFIDENTIAL','SECRET','TOP_SECRET') |
| 10  | Resolver deterministic: explicit `now`, no internal Utc::now() | ✓ VERIFIED | Only Utc::now occurrence in resolver.rs is a comment (line 9); handlers contain none either (write path no longer needs it under Option B) |
| 11  | Unknown gate fails closed; OWN_TIER_GRANT flat match; effectiveClassification one-hop | ✓ VERIFIED | UNKNOWN_GATE_KIND arm (resolver.rs:285) + #[serde(other)] Unknown; evaluate_own_tier_grant_gate is flat `g.resource_id == resource.id` (no ancestor walk anywhere); parity test green |
| 12  | Zone advisory never feeds allow | ✓ VERIFIED | zone_advisory hardcoded None (resolver.rs:314, 349), never read into `allow` |
| 13  | SEC-01: every non-login handler AuthGuard-protected | ✓ VERIFIED | Route-macro vs guard audit across all 15 handler modules: routes==guards everywhere (discussions' create_discussion uses fully-qualified path; login the sole public API handler; main.rs `/` + `/api/health` infra-public per decision); vendor_relations 401 tests passed |
| 14  | SEC-02: writes + audit read gate role_has_permission; 403 not 500; keys seeded | ✓ VERIFIED | role_has_permission wired in all 10 target domains (27 writes + audit read); `cargo test --test security_hardening_test -- --include-ignored` → **12 passed, 0 failed** (run twice by verifier against live DB: viewer 403, manager 403 least-privilege, admin clears gate, manager holds nda.write); DB grants: admin=15, manager=9, operator/viewer=1 |
| 15  | SEC-03: JWT fail-loud — no fallback, abort before bind | ✓ VERIFIED | grep test-secret-key → 0; process-level check run by verifier: `JWT_SECRET=""` → exit 1, `JWT_SECRET="  "` → exit 1, FATAL printed before pool/bind (exit precedes pool creation, rocket_setup.rs:36-40); 4 unit tests green |
| 16  | SEC-04: CORS pinned to http://localhost:15510 with credentials | ✓ VERIFIED | AllowedOrigins::some_exact(&["http://localhost:15510"]) (line 78) + allow_credentials(true) (line 91); AllowedOrigins::all → 0 matches; CORS granted/denied tests passed |

**Score:** 16/16 truths verified (0 present-behavior-unverified; 1 override applied)

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `backend/migrations/20260601130000_create_digital_resource_tables.sql` | 8 tables | ✓ VERIFIED | 8 CREATE TABLE; uq_grant superseded by 130003 |
| `backend/migrations/20260601130003_fix_uq_grant_nulls_not_distinct.sql` | Gap-closure: NULL-safe uq_grant | ✓ VERIFIED | Idempotent dedupe + UNIQUE NULLS NOT DISTINCT; live on both DBs |
| `backend/src/digital_resources/resolver.rs` | Pure resolver, min 120 lines | ✓ VERIFIED | 386+ lines; pure (no Rocket/PgPool/Utc::now); can_issue_resource_grant retained `#[allow(dead_code)]` for SEED-012 |
| `backend/src/digital_resources/models.rs` | 8 FromRow structs + GateDescriptor + outputs, min 90 lines | ✓ VERIFIED | 194 lines |
| `backend/src/digital_resources/handlers.rs` | get_world/issue_grant/issue_delegate, min 120 lines | ✓ VERIFIED | 315+ lines; no 501 stub; AuthGuard on all 3 routes; comments now describe the actual role-gate flow |
| `backend/tests/resolver_parity.rs` | Parity test vs golden JSON | ✓ VERIFIED | Passed 1/1 (twice) |
| `backend/tests/fixtures/resolver-golden.json` | Committed golden fixtures | ✓ VERIFIED | 3 mandated cases present |
| `frontend/src/demo/lib/digital-resource-golden-export.test.ts` | TS exporter | ✓ VERIFIED | writeFileSync → resolver-golden.json wired |
| `backend/migrations/20260601130001_seed_digital_resources.sql` | Idempotent 6-unit seed | ✓ VERIFIED | 12 ON CONFLICT clauses; INSERTs into all 8 tables; applies via sqlx (tracked success=t on janus2_fresh) |
| `backend/tests/digital_resources_api_test.rs` | GET 200/401, POST 403, idempotency tests | ✓ VERIFIED | 7 tests; idempotency test now passes against a seeded DB |
| `backend/migrations/20260601130002_seed_domain_permissions.sql` | Permission keys + role grants | ✓ VERIFIED | INSERT INTO permissions/role_permissions, ON CONFLICT idempotent |
| `backend/tests/security_hardening_test.rs` | 401/403/JWT/CORS suite | ✓ VERIFIED | 12/12 green (twice) |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | -- | --- | ------ | ------- |
| Repaired migration chain | fresh empty Postgres | sqlx migrate run | ✓ WIRED | janus2_fresh 31 tracked, success=t, incl. digital-resource + seed migrations |
| TS golden exporter | resolver-golden.json | writeFileSync | ✓ WIRED | pattern present; JSON committed |
| resolver_parity.rs | resolver.rs | resolve_resource_access | ✓ WIRED | test passes |
| rocket_setup.rs | digital_resources::routes() | .mount("/api/digital-resources", ...) | ✓ WIRED | line 143 |
| issue handlers | resolver::can_issue_resource_grant | validate-then-insert | ⚠️ NOT_WIRED — OVERRIDDEN | Replaced by JWT role gate (Option B, locked). Function annotated `#[allow(dead_code)]` and documented as retained for SEED-012 |
| issue_grant INSERT | uq_grant constraint | ON CONFLICT ... DO NOTHING | ✓ WIRED | Conflict target now fires for null-window grants (NULLS NOT DISTINCT) — behaviorally proven |
| seed migration | GET /world | seeded rows returned | ✓ WIRED | 200 + seeded counts on janus2_fresh |
| write handlers (10 domains) | shared/rbac.rs role_has_permission | gate before mutate, 403 on false | ✓ WIRED | 27 writes + audit read; behaviorally tested |
| rocket_setup.rs | JWT_SECRET env | no-fallback read, abort on empty | ✓ WIRED | exit 1 verified at process level |
| rocket_setup.rs | CORS config | some_exact 15510 + credentials | ✓ WIRED | granted/denied tests pass |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Resolver parity (3 golden cases) | `cargo test --test resolver_parity` | 1 passed (initial + post-fix) | ✓ PASS |
| Security suite incl. RBAC 403s | `cargo test --test security_hardening_test -- --include-ignored` | 12 passed, 0 failed (initial + post-fix) | ✓ PASS |
| API authz (401, 403 x2, 404) | `cargo test --test digital_resources_api_test -- --include-ignored --skip <seed-mutating>` | 4 passed | ✓ PASS |
| World 200 + admin persist vs janus2_fresh | seed-dependent tests vs janus2_fresh | get_world 200 + hierarchy ✓; admin_200 ✓ | ✓ PASS |
| **Grant idempotency (was the gap)** | `DATABASE_URL=...janus2_fresh cargo test --test digital_resources_api_test test_issue_grant_idempotent -- --exact --include-ignored` | **1 passed; 1 row after duplicate POST** | ✓ PASS |
| Constraint + data audit | psql pg_constraint + GROUP BY dupes | NULLS NOT DISTINCT on both DBs; 0 dup tuples; 18 seed rows | ✓ PASS |
| JWT fail-loud process-level | `JWT_SECRET="" ./target/debug/janus-backend` / `JWT_SECRET="  "` | FATAL printed, exit 1 (both) | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Status | Evidence |
| ----------- | ----------- | ------ | -------- |
| RSRC-BE-01 | 11-01 | ✓ SATISFIED | 8 tables + models + handlers; no app classification column |
| RSRC-BE-02 | 11-02 | ✓ SATISFIED | Parity test green (run by verifier, twice) |
| RSRC-BE-03 | 11-03 | ✓ SATISFIED | 401 + 200-with-seeded-hierarchy verified |
| RSRC-BE-04 | 11-03 | ✓ SATISFIED | Persist 200 ✓, 403 ✓ (Option B override), idempotency ✓ after 4fd2ec9 (re-verified) |
| RSRC-BE-05 | 11-03 | ✓ SATISFIED | Seed migration serves 6-unit dataset; seedWorld() arrays empty |
| RSRC-BE-06 | 11-01 | ✓ SATISFIED | Fresh chain applies end-to-end (janus2_fresh evidence) |
| SEC-01 | 11-04 | ✓ SATISFIED | Guard audit + 401 tests |
| SEC-02 | 11-04 | ✓ SATISFIED | 12/12 incl. RBAC; keys seeded in both DBs |
| SEC-03 | 11-04 | ✓ SATISFIED | Process-level exit 1 verified |
| SEC-04 | 11-04 | ✓ SATISFIED | some_exact + credentials; CORS tests |

No orphaned requirements — REQUIREMENTS.md maps exactly RSRC-BE-01..06 + SEC-01..04 to Phase 11, all claimed across the 4 plans.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| backend/src/digital_resources/resolver.rs | 370-373 | can_issue_resource_grant dead code | ℹ️ Info (resolved) | Now `#[allow(dead_code)]` with explicit SEED-012 retention comment; stale handler comment corrected in 4fd2ec9 |
| .planning (ROADMAP.md / .continue-here.md / REQUIREMENTS.md checkboxes) | — | ROADMAP shows "1/4 plans executed" + 11-04 unchecked; .continue-here.md says "11-04 next"; RSRC-BE-01/03/04/05/06 checkboxes unticked — all four plans + the gap-closure fix are committed (13/13 claimed commits verified in git) | ⚠️ Warning | Bookkeeping drift only — orchestrator should sync state |

No TBD/FIXME/XXX/TODO debt markers in any phase-modified source file. No stubs, no hollow data paths.

### Environment Notes (accepted, not gaps)

- Live `janus2` remains unseeded for digital resources (resource_networks=0; grants=0) — documented accepted carried blocker per STATE.md. The uq_grant fix IS applied there (constraint verified via pg_constraint).
- 20260601130002 and 20260601130003 were applied via psql (not sqlx migrate) on both DBs, so they are untracked in `_sqlx_migrations` (janus2_fresh 31/33 files); both files are idempotent and proven executable.
- janus2_fresh restored to the exact 18 seed grant rows after re-verification (test rows removed).

### Gaps Summary

None remaining. The single initial gap — null-window grant duplication under `uq_grant` — was closed by `4fd2ec9` (migration 20260601130003: NULL-safe dedupe + `UNIQUE NULLS NOT DISTINCT`) and independently re-verified: the constraint is live on both DBs, the previously-failing `test_issue_grant_idempotent` now passes with exactly one row after a duplicate issue, and no regressions surfaced (parity 1/1, security 12/12, build 0 errors).

Phase goal achieved: the migration chain is repaired, all 8 tables exist and apply on a fresh DB, the Rust resolver is deterministic and byte-parity-proven against the TS engine, the domain is mounted behind AuthGuard with server-side (role-based, per locked Option B) write authority and idempotent issue endpoints, the seed fixtures live in Postgres as the source of truth, seedWorld() is de-hardcoded, and all four SEC hardening items are behaviorally green.

---

_Verified: 2026-07-02T20:00:00Z (re-verification after gap closure)_
_Verifier: Claude (gsd-verifier)_
