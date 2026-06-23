---
phase: 11-digital-resource-backend
plan: 02
subsystem: backend
tags: [rust, sqlx, resolver, gate-chain, parity, golden-fixtures, digital-resources]

requires:
  - phase: 11-digital-resource-backend
    plan: 01
    provides: 8 digital-resource tables on the repaired migration baseline (the structs map 1:1)
provides:
  - Pure Rust gate-chain resolver (resolve_resource_access, can_issue_resource_grant) with byte-equal output parity to the TS resolver (RSRC-BE-02)
  - 8 sqlx::FromRow domain structs + tagged GateDescriptor enum (fail-closed Unknown) + resolver-output structs (ResourceAccessResult/ResourceGateResult/PolicyVersion)
  - Committed golden fixtures (TS exporter -> JSON) + a passing Rust parity test covering the inclusive policy-window boundary and the NO_ACTIVE_POLICY fail-closed DENY
affects:
  - 11-03-handlers-integration (handlers assemble ResolverResource from flat sqlx rows and call resolve_resource_access / can_issue_resource_grant)

tech-stack:
  added: []
  patterns:
    - "Pure logic module: no Rocket/PgPool imports, explicit `now: NaiveDateTime`, zero Utc::now() (first such module in the backend)"
    - "Cross-engine byte-parity via a golden JSON contract: TS exporter normalizes Date -> chrono NaiveDateTime serde form (YYYY-MM-DDTHH:MM:SS), Rust uses default serde"
    - "GateDescriptor #[serde(tag=\"kind\")] tagged enum with #[serde(other)] Unknown as the fail-closed sink"

key-files:
  created:
    - backend/src/digital_resources/mod.rs
    - backend/src/digital_resources/models.rs
    - backend/src/digital_resources/resolver.rs
    - backend/src/digital_resources/handlers.rs
    - backend/tests/resolver_parity.rs
    - backend/tests/fixtures/resolver-golden.json
    - frontend/src/demo/lib/digital-resource-golden-export.test.ts
  modified:
    - backend/src/lib.rs

key-decisions:
  - "D-06 parity proven the mandated way: a TS Vitest exporter emits resolver outputs at three FIXED timestamps to a committed JSON file; a plain Rust #[test] loads that JSON and asserts serde byte-equality over the same fixtures at the same timestamps."
  - "Datetime serde divergence (TS Date `...59.000Z` vs Rust NaiveDateTime `...59`) resolved by normalizing on the exporter side — the golden file is the cross-engine contract, so the TS side owns the on-disk format and Rust uses default serde."
  - "zone_advisory stubbed to None for Phase 11 (documented deviation per 11-RESEARCH Q3); parity fixtures use zone_prereq_id == null and the advisory never feeds `allow`."
  - "Resolver takes plain input shapes (ResolverResource/ResolverPolicyAssignment/ResolverPolicy/ResolverPlatform/ResolverOrgLink) rather than the flat sqlx rows, mirroring the TS node shape the resolver actually reads; Plan 03 handlers assemble these from rows."

metrics:
  duration: ~11 min
  completed: 2026-06-23
  tasks: 3
  files: 8

requirements-completed: [RSRC-BE-02]
status: complete
---

# Phase 11 / Plan 02: Resolver Port + sqlx Models + Golden-Fixture Parity — Summary

**The TS gate-chain resolver is ported to a pure, deterministic Rust module that produces byte-equal allow / gate-set / policy-version output to the TS engine, proven by committed golden fixtures (TS exporter -> JSON -> Rust assertion) including the inclusive policy-window boundary and the no-policy NO_ACTIVE_POLICY fail-closed DENY.**

## Performance

- **Duration:** ~11 min
- **Completed:** 2026-06-23
- **Tasks:** 3 (domain structs; resolver port; golden-fixture parity)
- **Files:** 8 (7 created, 1 modified)

## What Was Built

- **Task 1 — domain structs (commit `4431bfb`):** `digital_resources/models.rs` with 8 `sqlx::FromRow` structs (TEXT PKs for the resource entities; `i32` for the two SERIAL link/assignment tables; `gates: serde_json::Value` on `ResourcePolicy`). `GateDescriptor` is a `#[serde(tag = "kind")]` tagged enum (CLEARANCE / OWN_TIER_GRANT / PARENT_TIER_GRANT / REQUIRED_ROLE{role}) with a `#[serde(other)] Unknown` fail-closed arm. Added `IssueGrantRequest` (carries `actor_org_id`), `IssueDelegateRequest`, `DigitalResourceWorldResponse`, and the resolver-output structs `ResourceGateResult` / `PolicyVersion` / `ResourceAccessResult` (both `reason` fields use `skip_serializing_if`). `mod.rs` declares the three submodules + `routes()`; a `handlers.rs` 501 stub keeps the crate compiling (Plan 03 replaces it). `lib.rs` declares `pub mod digital_resources;`.
- **Task 2 — resolver port (commit `b222ae4`):** `digital_resources/resolver.rs` — a pure module (no Rocket/PgPool, no `Utc::now()`), every time-dependent fn takes explicit `now: NaiveDateTime`. `resolve_resource_access` selects the active policy (None -> fail-closed `NO_ACTIVE_POLICY` DENY with empty gates and null policy_version), derives effective classification once (single-hop app->platform, fail-closed on a missing host), evaluates gates in list order, and `allow = gates.all(pass)`. Helpers mirror the TS source 1:1: `clearance_rank` (RESTRICTED=1; unknown=-1), `is_window_active` (inclusive `valid_until >= now`), `select_active_policy`, `effective_classification`. OWN_TIER_GRANT is a flat `resource_id ==` match (no ancestor walk); the Unknown gate arm returns `UNKNOWN_GATE_KIND`. `can_issue_resource_grant` = active ADMIN org_link OR active ORG delegate.
- **Task 3 — golden-fixture parity (commit `23b758b`):** `digital-resource-golden-export.test.ts` (`// @vitest-environment node`) computes the MilNet fixture at three fixed timestamps and `writeFileSync`s normalized output to `backend/tests/fixtures/resolver-golden.json`. `resolver_parity.rs` (plain `#[test]`) `include_str!`s that JSON, builds the identical fixture, and asserts `serde_json::to_value` equality at the same three timestamps.

## Parity Approach (D-06)

The golden file is the cross-engine contract. The MilNet baseline policy window is `[2026-02-01T00:00:00 .. 2026-02-28T23:59:59]`. Three mandated cases:

| Key | Timestamp | Result |
|-----|-----------|--------|
| `milnet_now_a` | 2026-02-15T12:00:00Z | ALLOW (all 3 baseline gates pass) |
| `milnet_boundary` | 2026-02-28T23:59:59Z (== valid_until) | ALLOW — inclusive boundary still selects the policy |
| `no_policy_deny` | 2025-06-01T00:00:00Z (before valid_from) | DENY, `reason: NO_ACTIVE_POLICY`, empty gates, null policy_version |

The TS exporter normalizes `Date` -> `chrono::NaiveDateTime`'s serde form (`YYYY-MM-DDTHH:MM:SS`), renames camelCase -> snake_case, and stubs `zone_advisory: null`, so the committed JSON is byte-equal to Rust's default serde output.

## Verification (commands + outputs)

- `cargo build` -> `Finished dev profile ... target(s)` (0 errors; the only warnings are pre-existing in `person`/other modules, out of scope).
- `cargo test --test resolver_parity` -> `test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out`.
- `npx vitest run digital-resource-golden-export` -> PASS (1) FAIL (0), exit 0; regenerates the committed golden JSON deterministically.
- `grep -v '^\s*//' resolver.rs | grep -c 'Utc::now'` -> 0. `is_window_active` uses `>= now` (inclusive). `UNKNOWN_GATE_KIND` arm present. No `getAncestors`/ancestor-walk helper (the 3 "ancestor" matches are comments documenting its deliberate absence).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Golden fixture's NO_ACTIVE_POLICY case initially resolved ALLOW**
- **Found during:** Task 3 (first exporter run).
- **Issue:** The MilNet policy assignment used `valid_from: null` (unbounded start), so the `2025-06-01` "no-policy" timestamp fell *inside* the window and resolved ALLOW instead of the required `NO_ACTIVE_POLICY` DENY.
- **Fix:** Bounded the window start to `2026-02-01T00:00:00Z` so `2025-06-01` precedes `valid_from`; the boundary (`2026-02-28T23:59:59`) and mid-window cases remain inside.
- **Files modified:** `frontend/src/demo/lib/digital-resource-golden-export.test.ts`
- **Commit:** `23b758b`

### Planner-sanctioned deviation carried out

- **zone_advisory stubbed to None** for Phase 11 (per 11-RESEARCH §Open Questions Q3). Parity fixtures use `zone_prereq_id == null`; the advisory never feeds `allow` (prohibition satisfied structurally — the resolver never reads `zone_advisory` into the verdict).

## must_haves Status

- Byte-equal allow/gate-set/policyVersion vs TS via golden fixtures (D-06) — ✅ (`resolver_parity` ok).
- Inclusive boundary (`valid_until >= now`) still selects + resolves — ✅ (`milnet_boundary` ALLOW).
- No-policy -> fail-closed DENY `NO_ACTIVE_POLICY`, empty gates — ✅.
- Unknown gate kind fails closed `UNKNOWN_GATE_KIND`, never silent ALLOW — ✅ (enum Unknown arm + resolver arm).
- OWN_TIER_GRANT flat `resource_id ==` match, no ancestor walk — ✅.
- effective_classification one-hop app->platform; Network/Platform own — ✅.
- Resolver takes explicit `now`, no internal `now()` — ✅ (grep == 0).

## Notes for Downstream Plans

- **11-03:** handlers load the 8 flat sqlx rows and assemble `ResolverResource` / `ResolverPolicyAssignment` / `ResolverPolicy` / `ResolverPlatform` / `ResolverOrgLink` (all `pub` in `resolver.rs`), then call `resolve_resource_access` / `can_issue_resource_grant`. Replace the `handlers.rs` 501 stub. SEC-01..04 (server-side RBAC, JWT fail-loud, CORS) are NOT covered here — they remain for the handlers/integration plan.
- `IssueGrantRequest.actor_org_id` is already in place for the `can_issue_resource_grant` authority check.

## Known Stubs

| Stub | File | Reason |
|------|------|--------|
| `handlers.rs` returns 501 for get_world/issue_grant/issue_delegate | `backend/src/digital_resources/handlers.rs` | Plan 02 owns models+resolver; Plan 03 owns handlers. Intentional, plan-sanctioned (artifacts_produced lists handlers.rs as "stub — Plan 03 replaces"). |
| `zone_advisory` always None | `backend/src/digital_resources/resolver.rs` | Phase-11 deviation (11-RESEARCH Q3); advisory zone wiring is a later (Phase 12 UI) concern and must never affect `allow`. |

## Self-Check: PASSED

All 7 created files exist on disk; all 3 task commits (`4431bfb`, `b222ae4`, `23b758b`) present in git history.
