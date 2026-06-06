---
phase: 10-mock-dataset-worldstate
plan: 01
subsystem: testing
tags: [worldstate, digital-resources, reducer, seed, tdd]

requires:
  - phase: 09-digital-resource-model-policy-engine
    provides: DigitalResourceWorld types, gate evaluators, seed patterns
provides:
  - DigitalResourceWorld type with 9 fields (networks, platforms, apps, orgLinks, policies, policyAssignments, grants, delegates, disabledResourceGrantIds)
  - WorldState extension with digitalResources sub-object
  - TOGGLE_RESOURCE_GRANT reducer action (independent from physical TOGGLE_GRANT)
  - 6-unit seed dataset: 6 networks, 4 platforms, 4 applications with temporal variety
affects:
  - 10-mock-dataset-worldstate
  - 11-digital-resource-selectors

tech-stack:
  added: []
  patterns:
    - Immutable Set update pattern for disabledGrantIds / disabledResourceGrantIds
    - Flat arrays in seed.ts consumed 1:1 by DigitalResourceWorld
    - TOGGLE_RESOURCE_GRANT uses resourceGrantId field to avoid collision with physical TOGGLE_GRANT

key-files:
  created: []
  modified:
    - frontend/src/demo/lib/model.ts
    - frontend/src/demo/lib/seed.ts
    - frontend/src/demo/store/world-state.tsx
    - frontend/src/demo/store/world-state.test.tsx

key-decisions:
  - TOGGLE_RESOURCE_GRANT uses resourceGrantId (not grantId) to avoid collision with physical TOGGLE_GRANT
  - WorldState.digitalResources is a single nested sub-object (not flat fields) to avoid Pitfall 4

patterns-established:
  - Immutable Set toggle via new Set() spread pattern (mirrors physical TOGGLE_GRANT)
  - seed.ts exports flat arrays consumed by seedWorld() DigitalResourceWorld init

requirements-completed: [RSRC-SEED-01, RSRC-SEED-02, RSRC-SEED-03, RSRC-SEED-04, RSRC-SEED-05]

duration: ~5min
completed: 2026-06-05
---

# Phase 10 Plan 01: Digital Resource WorldState extension with 6-unit seed dataset

**DigitalResourceWorld type with 9 fields, TOGGLE_RESOURCE_GRANT reducer action, and 6-unit dataset (6 networks, 4 platforms, 4 applications) with temporal grant variety, policy-shift preservation, and zone-prereq wiring.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-06-05
- **Completed:** 2026-06-05
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- DigitalResourceWorld type added to model.ts with all 9 fields (networks, platforms, applications, orgLinks, policies, policyAssignments, grants, delegates, disabledResourceGrantIds)
- WorldState extended with digitalResources sub-object; TOGGLE_RESOURCE_GRANT reducer mirrors TOGGLE_GRANT pattern with independent disabledResourceGrantIds Set
- seed.ts restructured to 6-unit dataset: 6 networks (one per canonical UnitId), 4 platforms (with zone_prereq link), 4 applications (no classification field), temporal grant variety (expired/active/future per tier), policy-shift on MilNet (disjoint windows), non-baseline on IntelNet
- TOGGLE_RESOURCE_GRANT reducer tests verify toggle on/off and independence from physical TOGGLE_GRANT

## Task Commits

Each task was committed atomically:

1. **Task 1: Add DigitalResourceWorld type and TOGGLE_RESOURCE_GRANT test scaffold** - `b14439d` (test)
2. **Tasks 2+3: Extend WorldState with digitalResources + 6-unit seed dataset** - `af42b67` (feat)

_Note: TDD pattern followed - test commit (RED) precedes implementation commit (GREEN)._

## Files Created/Modified
- `frontend/src/demo/lib/model.ts` - Added DigitalResourceWorld interface with 9 fields
- `frontend/src/demo/lib/seed.ts` - Restructured to 6-unit dataset: 6 networks, 4 platforms, 4 apps, temporal grants, policy-shift, non-baseline policy, zone-prereq link
- `frontend/src/demo/store/world-state.tsx` - Added digitalResources field, TOGGLE_RESOURCE_GRANT action, reducer case, seedWorld() init
- `frontend/src/demo/store/world-state.test.tsx` - Added TOGGLE_RESOURCE_GRANT describe block with 2 tests (toggle on/off, independence from physical toggle)

## Decisions Made
- `TOGGLE_RESOURCE_GRANT` uses `resourceGrantId` field (not `grantId`) to avoid collision with physical `TOGGLE_GRANT`
- `digitalResources` is a single nested sub-object in WorldState (not flat fields) to follow Pitfall 4 guidance

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Test assertion for physical TOGGLE_GRANT independence**
- **Found during:** Task 1 (TOGGLE_RESOURCE_GRANT test scaffold)
- **Issue:** Initial test expected `state.digitalResources.disabledResourceGrantIds !== toggled.digitalResources.disabledResourceGrantIds`, but `TOGGLE_GRANT` returns `{ ...state, disabledGrantIds: next }` which spreads state and preserves the same Set reference. The assertion was testing an implementation detail (spread behavior) rather than actual independence.
- **Fix:** Removed the `.not.toBe()` Set reference comparison. The test still verifies the critical invariant: `disabledResourceGrantIds.size === 0` after physical toggle.
- **Files modified:** frontend/src/demo/store/world-state.test.tsx
- **Verification:** Both TOGGLE_RESOURCE tests pass (2/2)
- **Committed in:** b14439d (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Fix was necessary for test correctness. No scope creep.

## Issues Encountered
None - plan executed as specified.

## Next Phase Readiness
- DigitalResourceWorld type and WorldState extension complete
- 6-unit seed dataset with all canonical shapes exported from seed.ts
- TOGGLE_RESOURCE_GRANT reducer tested and verified
- Ready for Phase 11 Plan 01 (digital-resource-selectors)

---
*Phase: 10-mock-dataset-worldstate*
*Completed: 2026-06-05*
