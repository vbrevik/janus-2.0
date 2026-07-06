---
plan: 13-02
wave: 2
phase: 13-dataset-model-access-resolver
type: execute
date: 2026-07-04
status: complete
subsystem: demo/lib dataset access model
tags: [abac, dataset, resolver, delegation, tdd]
requirements-completed: [DATA-ACCESS-01, DATA-ACCESS-02, DATA-ACCESS-03, DATA-ACCESS-04, DATA-DELEG-01]
dependency-graph:
  requires: [13-01 (DatasetNode, vocabularies, effectiveDatasetClassification, aggregation fns)]
  provides: [resolveDatasetAccess, DatasetAccessResult, canIssueDatasetGrant]
  affects: [Phase 14 seed/deny-matrix, Phase 15 UI consumers]
key-files:
  created: []
  modified:
    - frontend/src/demo/lib/model.ts
    - frontend/src/demo/lib/dataset.test.ts
metrics:
  duration: ~15 min
  tasks: 3/3
  commits: 4
  tests: 67 in dataset.test.ts (295 full suite, 0 failures)
---

# Phase 13 Plan 02: Dataset Access Resolver & Delegation Cap Summary

3-gate `resolveDatasetAccess` (clearance -> app-grant OR-gate -> dataset-grant, with independent existence-visibility as both a top-level field and 4th trace entry) fully tested, plus new delegate-capped `canIssueDatasetGrant` reusing gate-3 aggregation — 295/295 tests green, tsc clean, phase scope held to the two declared files.

## Tasks completed

1. **Task 1: DatasetAccessResult + resolveDatasetAccess tests** — commit `dd59918`. 12 new tests: expired-app-grant-with-live-dataset-grant deny (APP_GRANT_OR sole failing gate), OR-across-application_ids (grant on 1 of 2 apps suffices), `visible:true/allow:false` reachable, orphan `visible:false` (no exemption), clearance-fail gate trace, wrong-vocabulary `requiredLevel` throws (rank + containment types), missing application_id throws, canonical 4-entry gate order, ARCHIVE_ROLE containment through the resolver, and two named pitfall tests (`visible-allow-independence`, `malformed-stored-grant-excluded-not-thrown`).
2. **Task 2: canIssueDatasetGrant** — TDD RED `36ff1d5` (9 failing tests), GREEN `7d82ffd`. Admin path: bare `admin_org_id` equality, unconditional, no personal-grant requirement, never windowed (Assumption A3). Delegate path: active delegate on the exact dataset + own active in-vocabulary grants required; cap enforced via the SAME `effectiveArchiveCoverage`/`effectiveRankedLevel` aggregation gate 3 uses. Out-of-vocabulary `requestedLevel` returns false (query, not invariant). Prohibition test asserts issuing-vs-access independence for the same admin actor in one test.
3. **Task 3: Regression sweep + acceptance audit** — commit `2f8c981`. Walked all SPEC.md Acceptance Criteria rows, Edge Coverage covered/backstop rows, and 3 Prohibitions rows against dataset.test.ts; one gap found and closed (explicit DATA-GRANT-03 expired-dataset-grant resolver test). Fixed readonly-tuple TS errors surfaced by the build.

## Verification

- `npx vitest run src/demo/lib/dataset.test.ts` — PASS (67) FAIL (0)
- `npm run test` — 19 files, 295 tests, 0 failures (v2.2 golden-fixture + digital-resource suites green, unmodified)
- `npm run build` — zero TypeScript errors
- Phase scope: all 4 phase commits (`be6ef61`, `dd59918`, `36ff1d5`, `7d82ffd`, `2f8c981`) touch only `model.ts` + `dataset.test.ts`

## SPEC.md coverage audit (Task 3)

- Acceptance Criteria rows 1-5, 11: covered by 13-01 tests; rows 6-10, 14-15: Plan 13-02 Task 1 tests; rows 12-13: Task 2 tests; rows 16-17: full-suite/build runs above.
- Edge Coverage: DATA-01 empty, DATA-03/05/ACCESS-01/02/04 unclassified — all have direct tests. DATA-GRANT-03 all-expired now explicit (Task 3). DATA-ACCESS-03 gate-order short-circuit matrix — **backstop, intentionally deferred to Phase 14's DATA-SEED-06 deny-matrix** per SPEC.md Edge Coverage row (not silently dropped).
- Prohibitions: all 3 rows have exactly-named passing tests (`visible-allow-independence`, CASE_HANDLER-cannot-issue-ADMIN, `issuing-vs-access-independence`).

## Deviations from Plan

### Auto-handled

**1. [Pre-existing implementation] Task 1's resolver was already committed in 13-01**
- **Found during:** Task 1 setup
- **Issue:** `DatasetAccessResult` + `resolveDatasetAccess` (model.ts:1503-1664) were committed in 13-01's `be6ef61` (wave-1 overshoot) — TDD RED impossible
- **Resolution:** Verified the existing implementation line-by-line against the plan's action spec (matched exactly, including gate order and both fail-closed classes); Task 1 became test-addition + verification, committed as `test(13-02)`
- **Commit:** dd59918

**2. [Rule 1 - Bug] readonly-tuple spread failed the TypeScript build**
- **Found during:** Task 3 build run
- **Issue:** `const args = [...] as const` spread into mutable-array parameters — 2 TS2345 errors
- **Fix:** replaced with an explicit `issue(level)` closure
- **Commit:** 2f8c981

**3. [Hook reformat] Project formatter hook collapsed multi-line union types in model.ts**
- **Found during:** Task 2 commit (`7d82ffd` shows 24 deletions)
- **Issue:** PostToolUse formatter reflowed `Clearance`/`GateKind`/org-role unions onto single lines outside the edited region
- **Resolution:** verified diff is pure reformat (no members removed), tests green — accepted as project-tooling behavior

## TDD Gate Compliance

- Task 2: RED `36ff1d5` (test) -> GREEN `7d82ffd` (feat) — compliant.
- Task 1: no RED commit possible — implementation pre-existed from 13-01 (see Deviation 1). Test-only commit `dd59918` verifies every behavior row.

## Known Stubs

None — no placeholder values, no unwired data paths; all functions are pure and fully exercised.

## Threat Flags

None — no new surface beyond the plan's threat model. T-13-01/03/05 mitigations implemented and tested as specified (delegate cap vs own coverage; app-grant gate at resolution time; visible from gate 2 alone with no privileged branch).

## Key design decisions

- `canIssueDatasetGrant` reuses `effectiveRankedLevel`/`effectiveArchiveCoverage` for the delegate cap — issuing authority and content access share one aggregation implementation (plan key_link honored)
- Out-of-vocabulary `requestedLevel` on the delegate path returns `false` rather than throwing — issuing is a permission query, unlike the resolver's `requiredLevel` invariant which throws
- `visible` computed from gate 2 alone; no admin_org/delegate branch exists anywhere in the computation

## Self-Check: PASSED

All modified files and all 4 task commits (dd59918, 36ff1d5, 7d82ffd, 2f8c981) verified present.
