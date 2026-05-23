---
phase: 06-grants-resolution-delegation
plan: 01
subsystem: frontend/demo/lib
tags: [typescript, pure-functions, grants, delegation, tdd]
dependency_graph:
  requires: [phase-05]
  provides: [PhysicalAccessGrant, ZoneAccessDelegate, isGrantActive, resolveGrant, resolveZoneAccess, isDelegateActive]
  affects: [frontend/src/demo/lib/model.ts, frontend/src/demo/lib/physical-access.test.ts]
tech_stack:
  added: []
  patterns: [null-boundary time-window predicate, leaf-first ancestor walk, two-gate resolver]
key_files:
  modified:
    - frontend/src/demo/lib/model.ts
    - frontend/src/demo/lib/physical-access.test.ts
decisions:
  - "Interfaces inserted after getDescendants (line 192), before UnitId section — preserves section ordering per plan instruction"
  - "Functions appended in order: isGrantActive, resolveGrant, resolveZoneAccess, isDelegateActive — matches plan action sequence"
  - "node_modules symlinked from main repo into worktree for Vitest to resolve packages"
metrics:
  duration: "~9 minutes"
  completed: "2026-05-23"
  tasks_completed: 2
  files_modified: 2
---

# Phase 6 Plan 01: Grant and Delegation Type Layer Summary

Two interfaces and four pure functions added to `model.ts`, completing the grant resolution and delegation type layer. `resolveZoneAccess` is now the single callable entry point that produces a fully-explained `ZoneAccessResult` for any person + zone combination.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| RED | Phase 6 failing tests (TDD gate) | 6f74869 | physical-access.test.ts |
| Task 1 | PhysicalAccessGrant + ZoneAccessDelegate interfaces | 0eeeb10 | model.ts |
| Task 2 | isGrantActive, resolveGrant, resolveZoneAccess, isDelegateActive | 7a82188 | model.ts |

## What Was Built

- **`PhysicalAccessGrant` interface** (5 fields: id, person_id, zone_id, valid_from `Date|null`, valid_until `Date|null`) — links a person to a zone with an optional time window
- **`ZoneAccessDelegate` interface** (8 fields) — delegation record for granting zone-level authority to persons or orgs
- **`isGrantActive(grant, now)`** — inclusive null-boundary predicate; null on either side means unbounded
- **`resolveGrant(personId, zone, allZones, allGrants, now)`** — leaf-first ancestor walk with zone_type scoping and `requires_explicit_auth` short-circuit; calls existing `getAncestors()`
- **`resolveZoneAccess(personId, zone, clearance, hasValidEscort, allZones, allGrants, now)`** — two-gate resolver: gate 1 is grant lookup (GRANT_LOOKUP), gate 2 dispatches to Phase 5 evaluate functions with `hasGrant=true`
- **`isDelegateActive(delegate, now)`** — identical null-boundary logic to `isGrantActive` on `ZoneAccessDelegate`
- **23 new Vitest tests** in `physical-access.test.ts` covering all function branches per TDD plan

## Verification Results

- `tsc -b --noEmit`: exits 0, no type errors
- `npx vitest run`: 123/123 tests pass (100 Phase 5 baseline + 23 Phase 6 new tests)
- All 6 exports confirmed present exactly once in model.ts

## TDD Gate Compliance

1. RED commit: `6f74869` — 23 failing tests (functions undefined in model.ts)
2. GREEN commit (interfaces): `0eeeb10` — types added
3. GREEN commit (functions): `7a82188` — all 23 tests pass; no regressions

## Threat Mitigations Applied

Per STRIDE threat register in plan frontmatter:

- **T-06-01** (Tampering — hasGrant=false path): `resolveZoneAccess` early-returns `{gate:"GRANT_LOOKUP", reason:"NO_GRANT"}` when grant is null; evaluate functions never called with `hasGrant=false`
- **T-06-02** (Tampering — zone_type filter on target zone): filter condition guards with `searchZone.id !== zone.id` before applying zone_type check
- **T-06-03** (Tampering — requires_explicit_auth as filter): `searchZones` array built before the loop; if `requires_explicit_auth` then `[zone]` only — ancestors never added

## Deviations from Plan

### Auto-fixed Issues

None.

### Worktree path correction (Rule 3 — blocking issue)

- **Found during:** Task 1 setup
- **Issue:** Edit tool defaulted to main repo path (`/Users/vidarbrevik/projects/janus-2.0/...`). Git in worktree did not see changes to those files.
- **Fix:** All edits redirected to worktree-relative paths (`/Users/vidarbrevik/projects/janus-2.0/.claude/worktrees/agent-a0115c272bbc4fd26/...`). Main repo edit reverted via `git checkout --`. `node_modules` symlinked from main repo into worktree frontend directory to allow Vitest to resolve packages.
- **Files modified:** Worktree paths used for all model.ts and physical-access.test.ts edits

### Test fixture adjustment (Rule 1 — bug fix during RED phase)

- **Found during:** Task 1 RED — `resolveGrant` ancestor test
- **Issue:** The plan's behavioral spec said "only ancestor grant with matching zone_type counts" but the test fixtures (`Z_ROOM1`, `Z_BUILDING1`) both have `requires_explicit_auth: true`, making it impossible to test ancestor inheritance on those nodes. A test case that expected ancestor grant return would always get null due to the explicit auth requirement.
- **Fix:** Added an additional `resolveGrant` test using an inline `Z_SECURED_ROOM` fixture with `requires_explicit_auth: false`, which properly demonstrates SECURED-type ancestor inheritance. Kept the test for "null when requires_explicit_auth=true and only ancestor grant" using the original fixtures (which correctly validate the short-circuit).

## Known Stubs

None — all functions are fully implemented with no placeholders.

## Threat Flags

None — pure in-memory TypeScript functions; no new network endpoints, auth paths, or file access patterns.

## Self-Check: PASSED

- FOUND: frontend/src/demo/lib/model.ts
- FOUND: frontend/src/demo/lib/physical-access.test.ts
- FOUND: .planning/phases/06-grants-resolution-delegation/06-01-SUMMARY.md
- FOUND commit: 6f74869 (test - RED gate)
- FOUND commit: 0eeeb10 (feat - Task 1 interfaces)
- FOUND commit: 7a82188 (feat - Task 2 functions)
