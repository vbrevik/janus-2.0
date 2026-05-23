# Phase 6: Grants, Resolution & Delegation — Specification

**Created:** 2026-05-23
**Ambiguity score:** 0.150 (gate: ≤ 0.20)
**Requirements:** 8 locked

## Goal

Access decisions can be computed for any person + zone combination by walking the zone ancestor chain to find the most-specific active `PhysicalAccessGrant` and then applying the Phase 5 zone-type rule — and admin orgs can delegate granting authority via `ZoneAccessDelegate` records.

## Background

Phase 5 delivered: `ZoneNode` with `requires_explicit_auth`, `getAncestors()`/`getDescendants()` traversal helpers, and three zone-type rule functions (`evaluateControlledAccess`, `evaluateRestrictedAccess`, `evaluateSecuredAccess`) each taking `hasGrant: boolean` as the first parameter. `ZoneAccessGate = "GRANT_LOOKUP" | "ZONE_TYPE_RULE"` is already declared in `model.ts`.

What does NOT exist: `PhysicalAccessGrant` type, grant time-window check, zone-ancestor grant resolution, `resolveZoneAccess()` entry point, and `ZoneAccessDelegate` type. The Phase 5 functions cannot yet produce real access decisions because the grant side is entirely absent.

All Phase 6 work lives in `frontend/src/demo/lib/` — TypeScript types and pure functions, tested by Vitest. No backend, no UI component, no mock dataset (Phase 8). The `now: Date` parameter pattern is used for all time-window checks to keep tests deterministic.

## Requirements

1. **PhysicalAccessGrant type**: A `PhysicalAccessGrant` interface linking a person to a zone with time windows.
   - Current: No `PhysicalAccessGrant` type exists anywhere in the codebase
   - Target: `PhysicalAccessGrant` exported from `model.ts` with fields: `id: string`, `person_id: string`, `zone_id: string`, `valid_from: Date | null` (null = valid immediately), `valid_until: Date | null` (null = permanent)
   - Acceptance: `PhysicalAccessGrant` interface is exported from `model.ts`; `tsc -b --noEmit` exits 0 with the type in use

2. **Active grant check**: A pure function determines if a single grant is active at a given moment.
   - Current: No time-window check exists
   - Target: `isGrantActive(grant: PhysicalAccessGrant, now: Date): boolean` returns true iff `valid_from <= now` (or valid_from is null) AND `valid_until >= now` (or valid_until is null)
   - Acceptance: Test cases covering all 4 combinations of null/non-null valid_from and valid_until pass; boundary-exact timestamps (now === valid_until) return true

3. **Zone-type-scoped grant inheritance (GRANT-02)**: Grant resolution respects zone_type boundaries.
   - Current: `getAncestors()` exists but no caller uses it for grant lookup
   - Target: When walking the ancestor chain, a grant on an ancestor node only covers the requested zone if the ancestor's `zone_type` matches the requested zone's `zone_type`. A CONTROLLED ancestor grant does NOT cover a RESTRICTED or SECURED descendant.
   - Acceptance: Test with a CONTROLLED parent grant and a RESTRICTED child zone returns NO_GRANT; test with a CONTROLLED parent grant and a CONTROLLED child zone returns GRANT_FOUND

4. **Explicit-auth override (GRANT-03)**: `requires_explicit_auth = true` blocks inheritance.
   - Current: `ZoneNode.requires_explicit_auth` field exists in model.ts but nothing evaluates it
   - Target: When `zone.requires_explicit_auth === true`, the zone always requires its own explicit grant even if a matching-zone_type ancestor grant is active; parent grants are not sufficient
   - Acceptance: Test where person has a CONTROLLED parent grant but target zone is CONTROLLED + `requires_explicit_auth: true` returns NO_GRANT; test where person also has a direct grant on that zone returns GRANT_FOUND

5. **Grant resolution walk (GRANT-04)**: Most-specific active grant wins.
   - Current: No grant resolution function exists
   - Target: `resolveGrant(personId: string, zone: ZoneNode, allZones: ZoneNode[], allGrants: PhysicalAccessGrant[], now: Date): PhysicalAccessGrant | null` walks leaf → ancestor chain, returns the first (most-specific) active grant whose zone's zone_type matches the requested zone's zone_type; returns null if none found
   - Acceptance: Test with both a direct zone grant and a matching ancestor grant returns the direct (more specific) grant; test with only an ancestor grant returns the ancestor grant; test with no active grant returns null

6. **Two-gate access resolution (ACCESS-05)**: Single entry point evaluates both gates in sequence.
   - Current: No unified resolver exists; Phase 5 rule functions are standalone
   - Target: `resolveZoneAccess(personId: string, zone: ZoneNode, clearance: Clearance, hasValidEscort: boolean, allZones: ZoneNode[], allGrants: PhysicalAccessGrant[], now: Date): ZoneAccessResult` — gate 1: calls `resolveGrant()`; gate 2: calls the appropriate Phase 5 `evaluateXxxAccess()` function; result carries `gate: "GRANT_LOOKUP"` when DENY is from no grant, `gate: "ZONE_TYPE_RULE"` when DENY is from clearance/escort check
   - Acceptance: Test producing DENY from no grant has `gate: "GRANT_LOOKUP"` and `reason: "NO_GRANT"`; test producing DENY from insufficient clearance (grant found, clearance too low) has `gate: "ZONE_TYPE_RULE"` and `reason: "INSUFFICIENT_CLEARANCE"`; test producing ALLOW has `allow: true`

7. **ZoneAccessDelegate type (DELEG-01, DELEG-02)**: Type for delegation records.
   - Current: No `ZoneAccessDelegate` type exists
   - Target: `ZoneAccessDelegate` interface exported from `model.ts` with fields: `id: string`, `zone_id: string`, `delegate_type: "PERSON" | "ORG"`, `delegate_person_id: string | null`, `delegate_org_id: string | null`, `granted_by_org_id: string`, `valid_from: Date | null`, `valid_until: Date | null`
   - Acceptance: `ZoneAccessDelegate` exported from `model.ts`; `delegate_person_id` and `delegate_org_id` are nullable to support both delegate types; `tsc -b --noEmit` exits 0

8. **Active delegate check (DELEG-01)**: A pure function determines if a delegate record is active.
   - Current: No delegate time-window check exists
   - Target: `isDelegateActive(delegate: ZoneAccessDelegate, now: Date): boolean` uses same null-boundary logic as `isGrantActive`
   - Acceptance: Same 4 null/non-null combinations and boundary-exact timestamp test cases pass as for `isGrantActive`

## Boundaries

**In scope:**
- `PhysicalAccessGrant` interface (fields: id, person_id, zone_id, valid_from, valid_until)
- `ZoneAccessDelegate` interface (fields per DELEG-02)
- `isGrantActive(grant, now): boolean` — time-window check
- `isDelegateActive(delegate, now): boolean` — time-window check
- `resolveGrant(personId, zone, allZones, allGrants, now): PhysicalAccessGrant | null` — ancestor walk with zone_type scoping + explicit-auth override
- `resolveZoneAccess(personId, zone, clearance, hasValidEscort, allZones, allGrants, now): ZoneAccessResult` — two-gate resolution entry point
- Vitest tests for all six items above, with inline fixtures (no seed.ts imports)
- All new exports added to `frontend/src/demo/lib/model.ts` (types) and a new `frontend/src/demo/lib/physical-access-grants.ts` (functions), or co-located in `model.ts` — final placement is discuss-phase decision

**Out of scope:**
- `canIssueGrant()` authorization check — DELEG-03 enforcement is a Phase 8 UI concern; only the type is needed here
- Mock dataset / seed data — Phase 8 (SEED-01..09)
- React UI components — Phase 8 (UI-01..06)
- ZoneEntryLog and ZoneVisitorPass — Phase 7 (LOG-01..03, VISIT-01..03)
- Backend Rust/PostgreSQL implementation — deferred beyond v2.1 (STATE.md decision: demo-frontend-mock-first)
- Grant creation, update, or delete operations — Phase 6 is read/evaluate only; the write path is Phase 8 UI

## Constraints

- TypeScript only: all deliverables live in `frontend/src/demo/lib/`
- All resolution functions must accept `now: Date` as an explicit parameter — no internal `Date.now()` calls
- Vitest tests must use inline fixtures (no `seed.ts` imports per existing project pattern D3-13)
- New functions must not import from `seed.ts` or any React component — pure logic only
- Phase 5 `evaluateXxxAccess()` functions must not be modified; `resolveZoneAccess()` calls them as-is
- `tsc -b --noEmit` must exit 0 after changes
- Full Vitest suite (currently 100/100) must remain at 100% pass

## Acceptance Criteria

- [ ] `PhysicalAccessGrant` interface exported from `model.ts` with 5 required fields (id, person_id, zone_id, valid_from, valid_until)
- [ ] `ZoneAccessDelegate` interface exported from `model.ts` with 8 required fields per DELEG-02
- [ ] `isGrantActive(grant, now)` returns correct boolean for all 4 null/non-null combinations and boundary-exact timestamps
- [ ] `resolveGrant()` returns the most-specific (leaf-first) active grant matching zone_type; returns null when none found
- [ ] `resolveGrant()` does NOT return an ancestor grant when `zone.requires_explicit_auth === true`
- [ ] A CONTROLLED ancestor grant does NOT cover a RESTRICTED or SECURED child zone
- [ ] `resolveZoneAccess()` produces `gate: "GRANT_LOOKUP"` on NO_GRANT deny
- [ ] `resolveZoneAccess()` produces `gate: "ZONE_TYPE_RULE"` when grant is found but clearance check fails
- [ ] `resolveZoneAccess()` produces `allow: true` when both gates pass
- [ ] `isDelegateActive(delegate, now)` returns correct boolean for all 4 null/non-null combinations
- [ ] `tsc -b --noEmit` exits 0
- [ ] Full Vitest suite passes (≥ 100 tests, no regressions)

## Ambiguity Report

| Dimension           | Score | Min  | Status | Notes                                               |
|---------------------|-------|------|--------|-----------------------------------------------------|
| Goal Clarity        | 0.90  | 0.75 | ✓      | resolveZoneAccess signature and two-gate model clear |
| Boundary Clarity    | 0.82  | 0.70 | ✓      | canIssueGrant, seed, UI, entry log all excluded      |
| Constraint Clarity  | 0.80  | 0.65 | ✓      | now:Date, inline fixtures, no model.ts mutations     |
| Acceptance Criteria | 0.85  | 0.70 | ✓      | 12 pass/fail checkboxes                             |
| **Ambiguity**       | 0.150 | ≤0.20| ✓      |                                                     |

## Interview Log

| Round | Perspective      | Question summary                        | Decision locked                                              |
|-------|------------------|-----------------------------------------|--------------------------------------------------------------|
| 1     | Researcher       | Same pure-TS-only pattern as Phase 5?   | Yes — types + functions + Vitest tests; no seed, no UI      |
| 1     | Researcher       | How to handle time-window "now"?        | `now: Date` parameter — deterministic test-friendly API     |
| 2     | Simplifier       | Resolution API shape?                   | One function: `resolveZoneAccess(...)` with both gates      |
| 2     | Boundary Keeper  | DELEG-03: runtime check or type only?   | Type only — `canIssueGrant()` deferred to Phase 8 UI        |

---

*Phase: 06-grants-resolution-delegation*
*Spec created: 2026-05-23*
*Next step: /gsd:discuss-phase 6 — implementation decisions (how to build what's specified above)*
