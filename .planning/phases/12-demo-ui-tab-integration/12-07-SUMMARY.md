---
phase: 12-demo-ui-tab-integration
plan: 07
subsystem: frontend
tags: [gap-closure, react, selectors, zone-advisory, uat-followup, digital-resources]

requires:
  - plan: 12-05
    provides: "ResourceAccessExplorer component, resolveResourceAt caller wiring surface"
provides:
  - "resolveResourceAt(network, ..., allZones, allPhysicalGrants, now): ZoneAccessResult — 8-arg signature threading real zone/physical-grant data into resolveResourceAccess (model.ts), closing the dead zone-advisory code path"
  - "digital-resource-selectors.test.ts: dedicated regression suite (3 tests) asserting zoneAdvisory resolves/stays-null against inline fixtures, independent of seed.ts"
affects: []

tech-stack:
  added: []
  patterns:
    - "Explicit-parameter selector contract preserved: allZones/allPhysicalGrants added as required params rather than importing seed.ts statics, keeping resolveResourceAt unit-testable with inline fixtures (D3-13 pattern, matches digital-resource-mapper.test.ts)"

key-files:
  created:
    - frontend/src/demo/lib/digital-resource-selectors.test.ts
  modified:
    - frontend/src/demo/lib/digital-resource-selectors.ts
    - frontend/src/demo/lib/digital-resource.test.ts
    - frontend/src/demo/components/resource-access-explorer.tsx

key-decisions:
  - "New allZones/allPhysicalGrants params inserted immediately before the trailing now: Date param, mirroring resolveResourceAccess's own parameter order in model.ts — no reordering of existing params"
  - "resource-access-explorer.tsx passes world.zones/world.grants (live WorldState fields already in scope via useWorld()) rather than importing seed.ts statics, so future physical-grant mutations stay in sync with the advisory computation"
  - "digital-resource.test.ts's 3 pre-existing resolveResourceAt call sites updated in-place to pass ZONES/GRANTS from its existing seed-integration import block, rather than switching those tests to inline fixtures"

requirements-completed: [RSRC-UI-05]

coverage:
  - id: D1
    description: "resolveResourceAt, given a policy whose zone_prereq_id matches a real allZones entry, returns non-null zoneAdvisory (the exact regression for the confirmed UAT gap)"
    requirement: "RSRC-UI-05"
    verification:
      - kind: unit
        ref: "digital-resource-selectors.test.ts case 1: zone_prereq_id matching inline ZoneNode fixture asserts result.zoneAdvisory not.toBeNull()"
        status: pass
      - kind: human-check
        ref: "Live browser verification (Task 2): IntelNet in Access Resolution Explorer renders amber 'Zone prerequisite GRANT_FOUND' row with 'Advisory (non-blocking)' Pill and explanatory note, for any person/timestamp"
        status: pass
    human_judgment: true
  - id: D2
    description: "resolveResourceAt does not introduce false positives: no-match zone_prereq_id or null zone_prereq_id still returns zoneAdvisory: null"
    requirement: "RSRC-UI-05"
    verification:
      - kind: unit
        ref: "digital-resource-selectors.test.ts cases 2-3: non-matching zone_prereq_id and null zone_prereq_id both assert result.zoneAdvisory.toBeNull()"
        status: pass
      - kind: human-check
        ref: "Live browser verification (Task 2): switching to HomeGuardNet (no zone_prereq_id) shows no advisory row at all"
        status: pass
    human_judgment: true
  - id: D3
    description: "Overall ALLOW/DENY verdict is unaffected by the advisory row — it remains driven only by the CLEARANCE/OWN_TIER_GRANT/PARENT_TIER_GRANT/REQUIRED_ROLE gates"
    requirement: "RSRC-UI-05"
    verification:
      - kind: human-check
        ref: "Live browser verification (Task 2): IntelNet's verdict stayed DENY (INSUFFICIENT_CLEARANCE on the Clearance gate) with the amber advisory row present, confirming the advisory never flips the verdict"
        status: pass
    human_judgment: true
  - id: D4
    description: "Phase-level bar: no seed.ts import workaround introduced, build and full test suite green with additive-only growth"
    requirement: "RSRC-UI-05"
    verification:
      - kind: build+grep+unit
        ref: "grep -c 'from \"./seed\"' digital-resource-selectors.ts == 0; npm run build zero TS errors; npm run test full suite green, +3 tests from digital-resource-selectors.test.ts, zero regressions"
        status: pass
    human_judgment: false

duration: ~15 min
completed: 2026-07-03
status: complete
---

# Phase 12 Plan 07: Zone-Advisory Gap Closure Summary

**Fixed `resolveResourceAt` in `digital-resource-selectors.ts`, which hardcoded empty `allZones`/`allPhysicalGrants` arrays when calling the core `resolveResourceAccess` resolver — making the amber "Advisory (non-blocking)" zone-prerequisite row permanently dead code in the running Access Resolution Explorer despite passing all prior build/grep/JSX checks — by threading the live `WorldState.zones`/`WorldState.grants` fields through the selector and its sole caller, backed by a new dedicated regression suite and confirmed live in the running app.**

## Task Commits

1. **Task 1: Thread real allZones/allPhysicalGrants through resolveResourceAt + regression test** — `c89167d` (test, RED), `e0341fc` (feat, GREEN)
2. **Task 2: Human-verify the zone-advisory row renders live** — checkpoint only, no code changes; approved live in the running app

## Accomplishments

- `digital-resource-selectors.ts`: `resolveResourceAt`'s signature grows by two required parameters (`allZones: ZoneNode[]`, `allPhysicalGrants: PhysicalAccessGrant[]`) inserted immediately before the trailing `now: Date`, mirroring `resolveResourceAccess`'s own parameter order in `model.ts`; the two hardcoded `[]` literals in the `resolveResourceAccess(...)` call are replaced with the real params
- `resource-access-explorer.tsx`: the sole `resolveResourceAt(...)` call now passes `world.zones`/`world.grants` (already in scope via `useWorld()`, no new imports) immediately before `evalTime`; both fields added to the `result` `useMemo`'s dependency array alongside `world.digitalResources`
- `digital-resource.test.ts`: `ZONES`/`GRANTS` added to the file's existing seed-integration import block; all 3 pre-existing `resolveResourceAt(...)` calls updated to pass `ZONES, GRANTS` before their trailing `NOW` argument — none of these 3 tests assert on `.zoneAdvisory` and MilNet (the resource under test) carries no `zone_prereq_id`, so no existing assertion's outcome changed
- New `digital-resource-selectors.test.ts` (inline fixtures only, no `./seed` import — matches `digital-resource-mapper.test.ts`'s convention): 3 tests covering match/no-match/null `zone_prereq_id` behavior against `resolveResourceAt`'s new 8-argument signature
- Live human verification (Task 2): switching to IntelNet in the Access Resolution Explorer rendered the amber "Zone prerequisite GRANT_FOUND" row with the "Advisory (non-blocking)" Pill and its explanatory note, verdict remained DENY (INSUFFICIENT_CLEARANCE) confirming the advisory never flips the verdict; switching to HomeGuardNet (no `zone_prereq_id`) showed no advisory row at all

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- `cd frontend && npm run build` — zero TypeScript errors
- `cd frontend && npx vitest run src/demo/lib/digital-resource-selectors.test.ts src/demo/lib/digital-resource.test.ts` — both files pass, 3/3 new tests green, 3 pre-existing selector tests unaffected
- `cd frontend && npm run test` — full suite green, additive-only growth (+3 tests)
- `grep -c 'from "./seed"' frontend/src/demo/lib/digital-resource-selectors.ts` — 0 (no hidden static-import workaround; explicit params preserved)
- `grep -c 'world.zones'` / `grep -c 'world.grants'` in `resource-access-explorer.tsx` — both >= 1 (caller wires live WorldState fields through)
- Live browser walkthrough (Task 2 checkpoint, human-approved): amber "Advisory (non-blocking)" row renders for IntelNet at any person/timestamp inside the policy's active window; verdict unaffected (stays DENY from the Clearance gate); row disappears entirely for HomeGuardNet (no `zone_prereq_id`)

## Self-Check: PASSED

- frontend/src/demo/lib/digital-resource-selectors.ts — FOUND
- frontend/src/demo/lib/digital-resource-selectors.test.ts — FOUND
- frontend/src/demo/lib/digital-resource.test.ts — FOUND
- frontend/src/demo/components/resource-access-explorer.tsx — FOUND
- Commit c89167d — FOUND
- Commit e0341fc — FOUND
