---
phase: 14-mock-dataset-worldstate
plan: 1
subsystem: testing
tags: [typescript, vitest, seed-data, abac, fixtures]

# Dependency graph
requires:
  - phase: 13-dataset-model-access-resolver
    provides: "DatasetNode/DatasetAccessGrant/DatasetAccessDelegate types, resolveDatasetAccess, canIssueDatasetGrant, effectiveDatasetClassification, ArchiveRole containment map"
provides:
  - "DATASET_NODES (5), DATASET_GRANTS (10), DATASET_DELEGATES ([]) exported from seed.ts"
  - "ds-deny-subj Subject fixture (Priya Nair) for dataset-denial narratives"
  - "3 additive RESOURCE_GRANTS entries giving subj-2/subj-3/ds-deny-subj real Application-tier grants"
  - "Single archive dataset (ds-archive-caserecords) that doubles as the fixture for DATA-SEED-02, DATA-SEED-04, and all three DATA-SEED-06 deny-matrix cases"
affects: [14-02-dataset-selectors, 14-03-worldstate-wiring, 14-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Additive-only seed.ts extension: new fixtures appended to end of existing arrays, zero existing records modified (mirrors Phase 9/10's section-header convention)"
    - "One archive dataset triple-purposed as success fixture + 3-way deny-matrix fixture by careful person/grant combinatorics"

key-files:
  created: []
  modified:
    - frontend/src/demo/lib/seed.ts

key-decisions:
  - "Followed CONTEXT.md D-01..D-04 exactly: 3-person cast (subj-1/2/3) plus 1 new denial-narrative subject (ds-deny-subj), additive RESOURCE_GRANTS entries only"
  - "Grant/dataset combinatorics isolate each deny-matrix gate as the SOLE failing gate: subj-3/Lee fails CLEARANCE only (SECRET dataset vs her CONFIDENTIAL clearance, both other gates pass); subj-2/Sam fails APP_GRANT_OR only (expired milapp-1 grant, active CASE_HANDLER dataset grant); ds-deny-subj fails DATASET_GRANT only (active milapp-1 grant, zero dataset grants anywhere)"

patterns-established:
  - "Every new DatasetNode.application_ids references exactly one of rsrc-milapp-1/rsrc-intapp-1, never both in the same dataset, to avoid effectiveDatasetClassification's assert-all-share fail-loud throw"

requirements-completed: [DATA-SEED-01, DATA-SEED-02, DATA-SEED-03, DATA-SEED-04, DATA-SEED-05, DATA-SEED-06]

coverage:
  - id: D1
    description: "2 MAILBOX datasets (ds-mailbox-dana, ds-mailbox-sam), each with a single-element application_ids referencing rsrc-milapp-1, and subj-1/subj-2 each holding one FULL_ACCESS (own) + one READ (shared) mailbox grant"
    requirement: "DATA-SEED-01"
    verification:
      - kind: unit
        ref: "frontend/src/demo/lib/digital-resource.test.ts, abac.test.ts (regression, 43 tests)"
        status: pass
    human_judgment: true
    rationale: "Fixture shape is structurally verified by tsc/regression tests here; full functional/selector-level verification of these grants happens in Plan 14-02's dataset-selectors.test.ts (next wave) — deferring final pass/fail judgment to that plan's dedicated tests"
  - id: D2
    description: "1 ARCHIVE_ROLE dataset (ds-archive-caserecords) with DATASET_GRANTS distributing all 3 ArchiveRole values across 3 distinct people (READER/subj-3, CASE_HANDLER/subj-2, ADMIN/subj-1)"
    requirement: "DATA-SEED-02"
    verification: []
    human_judgment: true
    rationale: "Coverage not determined at authoring time — verifier must classify; full ArchiveRole containment resolution is exercised by Plan 14-02's tests"
  - id: D3
    description: "2 DOCUMENT_SITE datasets (ds-docsite-ops on rsrc-milapp-1, ds-docsite-intel on rsrc-intapp-1) spanning 3 DocumentSiteLevel values (CONTRIBUTE, READ, FULL_CONTROL)"
    requirement: "DATA-SEED-03"
    verification: []
    human_judgment: true
    rationale: "Coverage not determined at authoring time — verifier must classify; resolved by Plan 14-02's tests"
  - id: D4
    description: "subj-1 holds active DatasetAccessGrant (ADMIN) on ds-archive-caserecords layered on her pre-existing active ResourceAccessGrant on rsrc-milapp-1 — full prerequisite-chain-success fixture"
    requirement: "DATA-SEED-04"
    verification: []
    human_judgment: true
    rationale: "Coverage not determined at authoring time — verifier must classify; resolved by Plan 14-02's scenario tests"
  - id: D5
    description: "ds-deny-subj holds active additive ResourceAccessGrant on rsrc-milapp-1 but ZERO DatasetAccessGrant records anywhere — dataset-gate-denial fixture"
    requirement: "DATA-SEED-05"
    verification: []
    human_judgment: true
    rationale: "Coverage not determined at authoring time — verifier must classify; resolved by Plan 14-02's scenario tests"
  - id: D6
    description: "3-way deny-matrix: subj-3 isolates CLEARANCE-fail, subj-2 isolates APP_GRANT_OR-fail (expired grant), ds-deny-subj isolates DATASET_GRANT-fail — each with the other two gates independently passing"
    requirement: "DATA-SEED-06"
    verification: []
    human_judgment: true
    rationale: "Coverage not determined at authoring time — verifier must classify; the actual gate-trace assertions live in Plan 14-02's dataset-selectors.test.ts"

# Metrics
duration: 14min
completed: 2026-07-04
status: complete
---

# Phase 14 Plan 1: Mock Dataset Fixtures Summary

**Extended `seed.ts` additively with a full v2.3 dataset fixture set — 5 datasets, 10 grants, 3 new Application-tier grants, and one new denial-narrative Subject — hand-designed so a single archive dataset proves every gate in Phase 13's 3-gate deny-matrix.**

## Performance

- **Duration:** 14 min
- **Started:** 2026-07-04T18:21:15Z
- **Completed:** 2026-07-04T18:34:34Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- Added `ds-deny-subj` (Priya Nair, HOME_GUARD, SECRET) — the dedicated dataset-denial narrative actor
- Added 3 additive `RESOURCE_GRANTS` entries (subj-2 expired, subj-3 active, ds-deny-subj active) on `rsrc-milapp-1`, with zero existing entries touched
- Added `DATASET_NODES` (5): 2 mailboxes, 1 archive-role dataset, 2 document sites — every `application_ids` entry references exactly one of the two pre-existing Applications
- Added `DATASET_GRANTS` (10) and empty `DATASET_DELEGATES` — `ds-archive-caserecords` alone carries the full 3-way deny-matrix (CLEARANCE / APP_GRANT_OR / DATASET_GRANT) plus the DATA-SEED-04 success case

## Task Commits

Each task was committed atomically:

1. **Task 1: Cast prep — new denial-narrative Subject + additive Application-grant entries** - `ba71a47` (feat)
2. **Task 2: Dataset fixtures — mailboxes, archive roles, document sites** - `376d1e2` (feat)

**Plan metadata:** (pending final commit below)

## Files Created/Modified
- `frontend/src/demo/lib/seed.ts` - Added `phase14DatasetSubjects`/`ds-deny-subj` Subject, 3 additive `RESOURCE_GRANTS` entries, and new `DATASET_NODES`/`DATASET_GRANTS`/`DATASET_DELEGATES` exports plus the corresponding `DatasetNode`/`DatasetAccessGrant`/`DatasetAccessDelegate` type imports

## Decisions Made
- Followed CONTEXT.md's Claude's-Discretion guidance for exact fixture IDs/names and archive-role/document-site level distribution — no deviation from the plan's explicit per-record instructions was needed since the plan spelled out every field value.
- Grant `id` naming follows `ds-grant-<person>-<dataset-suffix>-<level-lowercase>` exactly as specified.

## Deviations from Plan

None — plan executed exactly as written. Every fixture ID, field value, and grant combination matches the plan's `<action>` text verbatim.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `seed.ts` now exports everything Plan 14-02's `dataset-selectors.ts` and `dataset-selectors.test.ts` need: `DATASET_NODES`, `DATASET_GRANTS`, `DATASET_DELEGATES`, plus the person/grant combinatorics for the deny-matrix and success-case scenario tests (D-08/D-09).
- No blockers. `npx tsc -b --noEmit` is clean and the full Vitest suite (300 tests) passes with zero regressions on the v2.2 digital-resource/abac fixtures.

---
*Phase: 14-mock-dataset-worldstate*
*Completed: 2026-07-04*

## Self-Check: PASSED

- FOUND: .planning/phases/14-mock-dataset-worldstate/14-01-SUMMARY.md
- FOUND: ba71a47 (Task 1 commit)
- FOUND: 376d1e2 (Task 2 commit)
