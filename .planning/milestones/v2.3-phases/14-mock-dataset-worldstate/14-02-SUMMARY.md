---
phase: 14-mock-dataset-worldstate
plan: 2
subsystem: testing
tags: [typescript, vitest, abac, selectors, dataset-access]

# Dependency graph
requires:
  - phase: 14-mock-dataset-worldstate
    provides: "Plan 14-01's DATASET_NODES/DATASET_GRANTS/DATASET_DELEGATES fixtures, ds-deny-subj Subject, additive RESOURCE_GRANTS entries"
  - phase: 13-dataset-model-access-resolver
    provides: "resolveDatasetAccess, DatasetAccessResult, isWindowActive, DatasetNode/DatasetAccessGrant types"
provides:
  - "dataset-selectors.ts: datasetsForApplication, activeDatasetGrantsForPerson, resolveDatasetAt (pure read selectors, D-11 individual-array-params style)"
  - "dataset-selectors.test.ts: 11 passing tests proving the application_id join, no-orphan-reference structural check, and DATA-SEED-01..06 against real seed.ts fixtures"
affects: [14-03-worldstate-wiring, 15-demo-ui-access-explorer]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Selector functions take individual array params (not a single world/sub-object param) when a join spans two separate WorldState sub-objects — deliberate divergence from digital-resource-selectors.ts's single-world-param style (D-11)"
    - "Deny-matrix gate-trace tests assert the sole failing gate AND explicitly assert the other two gates independently pass in the SAME test (R5 edge-probe idiom, reused from Phase 13's dataset.test.ts)"

key-files:
  created:
    - frontend/src/demo/lib/dataset-selectors.ts
    - frontend/src/demo/lib/dataset-selectors.test.ts
  modified: []

key-decisions:
  - "resolveDatasetAt returns resolveDatasetAccess's result verbatim with zero post-processing of allow/visible/gates — the not-found path returns a closed {allow:false, visible:false, gates:[]} without a reason field (DatasetAccessResult has no reason, unlike ResourceAccessResult)"
  - "Merged DATA-SEED-01's subj-1/subj-2 assertions into a single it block (loop over both person ids) to hit the acceptance criteria's exact count of 11 it blocks (3 join/structural + 8 seed-integration)"

patterns-established:
  - "dataset-selectors.ts mirrors digital-resource-selectors.ts's pure-function/explicit-now style but diverges on param shape per D-11 (individual arrays, not a single world object)"

requirements-completed: [DATA-SEED-01, DATA-SEED-02, DATA-SEED-03, DATA-SEED-04, DATA-SEED-05, DATA-SEED-06]

coverage:
  - id: D1
    description: "datasetsForApplication(DATASET_NODES, 'rsrc-milapp-1') returns exactly the 4 milapp-1-attached datasets; 'rsrc-intapp-1' returns exactly ds-docsite-intel"
    requirement: "DATA-SEED-01"
    verification:
      - kind: unit
        ref: "frontend/src/demo/lib/dataset-selectors.test.ts#dataset-selectors: application_id join + structural integrity"
        status: pass
    human_judgment: false
  - id: D2
    description: "Every DATASET_NODES application_ids entry resolves to an existing APPLICATIONS id — zero orphan references (R6 covered edge)"
    requirement: "DATA-SEED-01"
    verification:
      - kind: unit
        ref: "frontend/src/demo/lib/dataset-selectors.test.ts#every DATASET_NODES application_ids entry resolves to an existing APPLICATIONS id (no orphans, R6)"
        status: pass
    human_judgment: false
  - id: D3
    description: "subj-1 and subj-2 each have >=2 active DatasetAccessGrant records on 2 distinct MAILBOX datasets"
    requirement: "DATA-SEED-01"
    verification:
      - kind: unit
        ref: "frontend/src/demo/lib/dataset-selectors.test.ts#DATA-SEED-01: subj-1 and subj-2 each have >=2 active grants on 2 distinct MAILBOX datasets"
        status: pass
    human_judgment: false
  - id: D4
    description: "ds-archive-caserecords' active grants cover all 3 ArchiveRole values (READER/CASE_HANDLER/ADMIN) across 3 distinct people"
    requirement: "DATA-SEED-02"
    verification:
      - kind: unit
        ref: "frontend/src/demo/lib/dataset-selectors.test.ts#DATA-SEED-02: ds-archive-caserecords' active grants cover all 3 ArchiveRole values across 3 people"
        status: pass
    human_judgment: false
  - id: D5
    description: ">=2 DOCUMENT_SITE datasets exist with >=2 distinct levels represented across their active grants"
    requirement: "DATA-SEED-03"
    verification:
      - kind: unit
        ref: "frontend/src/demo/lib/dataset-selectors.test.ts#DATA-SEED-03: >=2 DOCUMENT_SITE datasets with >=2 distinct levels across active grants"
        status: pass
    human_judgment: false
  - id: D6
    description: "resolveDatasetAt(subj-1, SECRET, ds-archive-caserecords, ADMIN, NOW) returns allow:true, visible:true — full prerequisite-chain success against real seed data"
    requirement: "DATA-SEED-04"
    verification:
      - kind: unit
        ref: "frontend/src/demo/lib/dataset-selectors.test.ts#DATA-SEED-04: full prerequisite-chain success (subj-1, SECRET, ADMIN on ds-archive-caserecords)"
        status: pass
    human_judgment: false
  - id: D7
    description: "resolveDatasetAt(ds-deny-subj, SECRET, ds-archive-caserecords, READER, NOW) returns visible:true, allow:false with DATASET_GRANT as the failing gate"
    requirement: "DATA-SEED-05"
    verification:
      - kind: unit
        ref: "frontend/src/demo/lib/dataset-selectors.test.ts#DATA-SEED-05: dataset-gate-denial (ds-deny-subj has an app grant but zero dataset grants)"
        status: pass
    human_judgment: false
  - id: D8
    description: "Deny-matrix case (a): subj-3/CONFIDENTIAL fails CLEARANCE only, APP_GRANT_OR and DATASET_GRANT both independently pass in the same test"
    requirement: "DATA-SEED-06"
    verification:
      - kind: unit
        ref: "frontend/src/demo/lib/dataset-selectors.test.ts#deny-matrix (a): subj-3/CONFIDENTIAL fails CLEARANCE only, other two gates independently pass"
        status: pass
    human_judgment: false
  - id: D9
    description: "Deny-matrix case (b): subj-2/TOP_SECRET fails APP_GRANT_OR only (expired app grant), visible:false, CLEARANCE and DATASET_GRANT both independently pass"
    requirement: "DATA-SEED-06"
    verification:
      - kind: unit
        ref: "frontend/src/demo/lib/dataset-selectors.test.ts#deny-matrix (b): subj-2/TOP_SECRET fails APP_GRANT_OR only (expired app grant), other two gates independently pass"
        status: pass
    human_judgment: false
  - id: D10
    description: "Deny-matrix case (c): reuses DATA-SEED-05's exact call with fuller edge-probe rigor — DATASET_GRANT is the sole failing gate, CLEARANCE and APP_GRANT_OR both independently pass"
    requirement: "DATA-SEED-06"
    verification:
      - kind: unit
        ref: "frontend/src/demo/lib/dataset-selectors.test.ts#deny-matrix (c): ds-deny-subj fails DATASET_GRANT only (fuller edge-probe rigor), other two gates independently pass"
        status: pass
    human_judgment: false

# Metrics
duration: 5min
completed: 2026-07-04
status: complete
---

# Phase 14 Plan 2: Dataset Selectors Summary

**Built `dataset-selectors.ts` (3 pure read functions wrapping Phase 13's `resolveDatasetAccess`) and `dataset-selectors.test.ts` (11 passing tests) proving DATA-SEED-01 through DATA-SEED-06 against Plan 14-01's real seed.ts fixtures — including all three deny-matrix gates isolated as sole deciders.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-07-04T19:00:23Z
- **Completed:** 2026-07-04T19:05:37Z
- **Tasks:** 2
- **Files modified:** 2 (both new)

## Accomplishments
- `datasetsForApplication` — application_id join filter, verified against real `APPLICATIONS`/`DATASET_NODES` (4 datasets on `rsrc-milapp-1`, 1 on `rsrc-intapp-1`, zero orphan references)
- `activeDatasetGrantsForPerson` — person + window-active filter, reusing `isWindowActive` (no reimplemented date-range logic)
- `resolveDatasetAt` — thin wrapper delegating to `resolveDatasetAccess` verbatim; not-found path returns a closed result without throwing and without a `reason` field
- 11 tests in `dataset-selectors.test.ts`: 3 join/structural + 8 seed-integration scenarios covering DATA-SEED-01 through DATA-SEED-06's full 3-case deny-matrix, each asserting the sole failing gate with the other two gates independently passing (R5 edge-probe rigor)

## Task Commits

Each task was committed atomically:

1. **Task 1: dataset-selectors.ts — application_id join + active-grant filter + resolveDatasetAt wrapper** - `a23096e` (feat)
2. **Task 2: dataset-selectors.test.ts — join/structural tests + DATA-SEED-01..06 seed-integration scenarios** - `8844beb` (test)

**Plan metadata:** (pending final commit below)

## Files Created/Modified
- `frontend/src/demo/lib/dataset-selectors.ts` - 3 exported pure functions: `datasetsForApplication`, `activeDatasetGrantsForPerson`, `resolveDatasetAt`
- `frontend/src/demo/lib/dataset-selectors.test.ts` - join/structural tests + DATA-SEED-01..06 seed-integration scenario tests, 11 `it` blocks total

## Decisions Made
- Followed D-11 exactly: individual array params, not a single `world`/sub-object param, since the join spans `state.datasets` and `state.digitalResources` — a deliberate divergence from `digital-resource-selectors.ts`'s single-`world`-param style, per the plan's explicit instruction.
- `resolveDatasetAt`'s not-found branch returns `{ allow: false, visible: false, gates: [] }` with no `reason` field, matching `DatasetAccessResult`'s actual shape (it has no `reason`, unlike `ResourceAccessResult`).
- Merged the two DATA-SEED-01 person-specific assertions (subj-1, subj-2) into a single `it` block (loop over both ids) to hit the acceptance criteria's exact literal count of 11 `it` blocks (3 join/structural + 8 seed-integration) — an initial draft with 12 blocks (subj-1/subj-2 split) was corrected before the commit landed.

## Deviations from Plan

None — plan executed exactly as written. The only in-flight correction (merging the DATA-SEED-01 test into one `it` block) happened before any commit was made, so no deviation-rule applies; the committed file matches the plan's literal 11-block acceptance criteria.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `dataset-selectors.ts` and its 11 passing tests give Plan 14-03 (WorldState wiring) a proven read path to call from selector hooks / the reducer's `ISSUE_DATASET_GRANT` action.
- Full regression suite green: `npx tsc -b --noEmit` reports zero errors; `npx vitest run` reports 311/311 tests passing (up from the 123-test pre-Phase-14 baseline plus Plan 14-01's additions), zero regressions on any pre-existing digital-resource/dataset/abac/world-state test.
- No blockers.

---
*Phase: 14-mock-dataset-worldstate*
*Completed: 2026-07-04*

## Self-Check: PASSED

- FOUND: frontend/src/demo/lib/dataset-selectors.ts
- FOUND: frontend/src/demo/lib/dataset-selectors.test.ts
- FOUND: a23096e (Task 1 commit)
- FOUND: 8844beb (Task 2 commit)
