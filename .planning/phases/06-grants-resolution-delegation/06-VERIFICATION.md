---
phase: 06-grants-resolution-delegation
verified: 2026-05-23T19:25:30Z
status: passed
score: 13/13 must-haves verified
overrides_applied: 0
deferred:
  - truth: "A person or org that holds a ZoneAccessDelegate record for a zone can issue PhysicalAccessGrants for that zone (DELEG-03 runtime enforcement)"
    addressed_in: "Phase 8"
    evidence: "SPEC.md Out of Scope section explicitly defers canIssueGrant() enforcement to Phase 8 UI. DELEG-03 is listed as Phase 6 in the traceability table but the SPEC interview lock (Round 2, Boundary Keeper) confirmed 'Type only — canIssueGrant() deferred to Phase 8 UI'. ZoneAccessDelegate type (the Phase 6 deliverable) is fully implemented."
---

# Phase 6: Grants, Resolution & Delegation Verification Report

**Phase Goal:** Access decisions can be computed for any person + zone combination, and admin orgs can delegate granting authority
**Verified:** 2026-05-23T19:25:30Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | PhysicalAccessGrant is exported from model.ts with id, person_id, zone_id, valid_from (Date\|null), valid_until (Date\|null) | ✓ VERIFIED | Lines 200–206 of model.ts: 5-field interface with exact types. `grep -c` returns 1. |
| 2 | ZoneAccessDelegate is exported from model.ts with all 8 fields from DELEG-02 | ✓ VERIFIED | Lines 212–221 of model.ts: 8 fields (id, zone_id, delegate_type, delegate_person_id, delegate_org_id, granted_by_org_id, valid_from, valid_until). |
| 3 | isGrantActive(grant, now) returns true iff both time boundaries pass (inclusive, null=unbounded) | ✓ VERIFIED | Lines 225–230 of model.ts: single boolean expression with null guards and `>=`/`<=` inclusive comparisons. 8 Vitest tests pass covering all 4 null/non-null combinations + boundary-exact. |
| 4 | resolveGrant returns the most-specific active grant matching zone_type, respecting requires_explicit_auth short-circuit | ✓ VERIFIED | Lines 236–263 of model.ts: searchZones array built with `[zone]` only when `requires_explicit_auth`, zone_type filter applied to ancestors with `searchZone.id !== zone.id` guard. 13 Vitest tests pass. |
| 5 | resolveZoneAccess emits gate:GRANT_LOOKUP on no-grant deny; delegates to Phase 5 evaluate functions for gate 2 | ✓ VERIFIED | Lines 270–292 of model.ts: early return `{allow:false, gate:"GRANT_LOOKUP", reason:"NO_GRANT"}` when grant===null; dispatches to evaluateControlledAccess(true), evaluateRestrictedAccess(true,...), evaluateSecuredAccess(true,...). 12 Vitest tests pass. |
| 6 | isDelegateActive(delegate, now) uses identical null-boundary logic to isGrantActive | ✓ VERIFIED | Lines 296–303 of model.ts: identical pattern with `delegate.valid_from`/`delegate.valid_until`. 7 Vitest tests pass. |
| 7 | isGrantActive is tested for all 4 null/non-null boundary combinations and boundary-exact timestamp | ✓ VERIFIED | `describe("isGrantActive")` block has 8 tests covering: null/null → true, active window → true, expired → false, future → false, boundary-exact → true, (non-null from, null until) → true, (null from, non-null until) → true, point-in-time past → false. |
| 8 | resolveGrant returns most-specific (leaf-first) grant and returns null when only ancestor grant is inactive or zone_type-mismatched | ✓ VERIFIED | Explicit tests: "returns direct grant over ancestor when both exist", "returns null when zone_type mismatch (CONTROLLED site, SECURED room)", "returns null for expired grant". |
| 9 | resolveGrant skips all ancestors when requires_explicit_auth=true; still finds direct grant on that zone | ✓ VERIFIED | Tests: "returns null when zone.requires_explicit_auth=true and only ancestor grant exists" and "returns direct grant when zone.requires_explicit_auth=true and direct grant exists". |
| 10 | resolveZoneAccess produces gate:GRANT_LOOKUP with reason:NO_GRANT when no grant exists | ✓ VERIFIED | Tests: no grants (allGrants=[]), CONTROLLED no-grant, expired grant fires GRANT_LOOKUP, different-person fires GRANT_LOOKUP. |
| 11 | resolveZoneAccess produces gate:ZONE_TYPE_RULE with reason:INSUFFICIENT_CLEARANCE when grant found but clearance fails | ✓ VERIFIED | Tests: RESTRICTED zone UNCLASSIFIED deny, SECURED zone CONFIDENTIAL deny, SECURED+escort deny (escort does not unlock SECURED). |
| 12 | resolveZoneAccess produces allow:true when both gates pass | ✓ VERIFIED | Tests: CONTROLLED+grant, RESTRICTED+RESTRICTED clearance, RESTRICTED+escort, SECURED+SECRET, SECURED+TOP_SECRET. |
| 13 | isDelegateActive is tested for all 4 null/non-null boundary combinations and boundary-exact timestamp | ✓ VERIFIED | 7 tests cover: null/null, expired, null-from only (future), boundary-exact, both bounds active, null-from+future-until, future-from. |

**Score:** 13/13 truths verified

### Deferred Items

Items not yet met but explicitly addressed in later milestone phases.

| # | Item | Addressed In | Evidence |
|---|------|-------------|----------|
| 1 | DELEG-03: canIssueGrant() enforcement — a ZoneAccessDelegate record enables issuing PhysicalAccessGrants for a zone | Phase 8 | SPEC.md Out of Scope clause: "canIssueGrant() authorization check — DELEG-03 enforcement is a Phase 8 UI concern; only the type is needed here". Phase 8 requirement SEED-06 covers delegation examples in the mock dataset. DELEG-03 in REQUIREMENTS.md is the behavioral rule; the type prerequisite (ZoneAccessDelegate) is fully implemented in Phase 6. |

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `frontend/src/demo/lib/model.ts` | PhysicalAccessGrant, ZoneAccessDelegate interfaces + isGrantActive, resolveGrant, resolveZoneAccess, isDelegateActive | ✓ VERIFIED | All 6 named exports present exactly once. File is 566 lines with full implementation — not a stub. |
| `frontend/src/demo/lib/physical-access.test.ts` | Phase 6 Vitest tests — 4 describe blocks covering all 8 requirements | ✓ VERIFIED | 4 describe blocks: isGrantActive (8 tests), isDelegateActive (7 tests), resolveGrant (13 tests), resolveZoneAccess (12 tests). 60 total tests in file, 140 full suite. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `resolveZoneAccess` | `resolveGrant` | gate 1 call | ✓ WIRED | Line 279: `const grant = resolveGrant(personId, zone, allZones, allGrants, now)` |
| `resolveZoneAccess` | `evaluateControlledAccess / evaluateRestrictedAccess / evaluateSecuredAccess` | gate 2 dispatch by zone_type | ✓ WIRED | Lines 285, 288, 291: dispatch with `true` as hasGrant in all branches |
| `resolveGrant` | `getAncestors` | ancestor walk | ✓ WIRED | Line 246: `[zone, ...getAncestors(zone.id, allZones)]` |
| `resolveGrant` | `isGrantActive` | per-grant time check | ✓ WIRED | Line 258: `isGrantActive(g, now)` inside allGrants.find() |
| `physical-access.test.ts Phase 6 describe blocks` | `model.ts Phase 6 exports` | import | ✓ WIRED | Lines 15–18: `isGrantActive, resolveGrant, resolveZoneAccess, isDelegateActive` imported with `type PhysicalAccessGrant, type ZoneAccessDelegate` |

### Data-Flow Trace (Level 4)

Not applicable — all artifacts are pure TypeScript functions operating on in-memory objects. No I/O, no external data sources, no state. Data flows entirely through function parameters.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| All 60 Phase 6 tests pass | `npx vitest run src/demo/lib/physical-access.test.ts` | 60/60 passed, 0 failed | ✓ PASS |
| Full suite 140 tests, no regressions | `npx vitest run` | 140/140 passed, 13 test files | ✓ PASS |
| TypeScript compiles clean | `npx tsc -b --noEmit` | exit 0, no errors | ✓ PASS |

### Probe Execution

No probes declared for this phase.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| GRANT-01 | 06-01, 06-02 | PhysicalAccessGrant interface with time windows | ✓ SATISFIED | Interface at model.ts:200–206; isGrantActive tested 8 ways |
| GRANT-02 | 06-01, 06-02 | Zone-type-scoped grant inheritance (same zone_type only) | ✓ SATISFIED | resolveGrant filter at line 251; cross-type mismatch test cases in resolveGrant block |
| GRANT-03 | 06-01, 06-02 | requires_explicit_auth blocks inheritance | ✓ SATISFIED | searchZones built as `[zone]` only when `requires_explicit_auth=true`; 2 explicit tests |
| GRANT-04 | 06-01, 06-02 | Most-specific active grant wins (leaf-first walk) | ✓ SATISFIED | resolveGrant iterates `[zone, ...getAncestors()]`; "most-specific wins" test passes |
| ACCESS-05 | 06-01, 06-02 | Two-gate access resolution entry point | ✓ SATISFIED | resolveZoneAccess at lines 270–292; 12 tests covering all gate paths |
| DELEG-01 | 06-01, 06-02 | ZoneAccessDelegate type and isDelegateActive | ✓ SATISFIED | Interface at model.ts:212–221; isDelegateActive at lines 296–303; 7 tests |
| DELEG-02 | 06-01, 06-02 | ZoneAccessDelegate 8-field shape | ✓ SATISFIED | Exactly 8 fields present: id, zone_id, delegate_type, delegate_person_id, delegate_org_id, granted_by_org_id, valid_from, valid_until |
| DELEG-03 | 06-01 | canIssueGrant() enforcement (person/org with ZoneAccessDelegate can issue grants) | DEFERRED | SPEC.md explicitly defers `canIssueGrant()` to Phase 8 UI. The type prerequisite (ZoneAccessDelegate) is fully implemented. No implementation exists in Phase 6 and none was required per the spec. |

### Anti-Patterns Found

No anti-pattern markers (TBD, FIXME, XXX, TODO, HACK, PLACEHOLDER) found in `model.ts` or `physical-access.test.ts`.

No stub patterns found: all functions have full logic bodies. No `return null` / `return {}` / `return []` stubs. No `console.log`-only handlers.

### Human Verification Required

None — all Phase 6 deliverables are pure TypeScript logic verifiable programmatically.

### Gaps Summary

No gaps. All 13 must-have truths verified against the codebase with passing tests and correct implementation.

The only open item is DELEG-03 (canIssueGrant enforcement), which is explicitly out of scope for Phase 6 per the SPEC interview record and will be addressed at Phase 8 (UI). The ZoneAccessDelegate type required to implement DELEG-03 later is fully delivered by this phase.

---

_Verified: 2026-05-23T19:25:30Z_
_Verifier: Claude (gsd-verifier)_
