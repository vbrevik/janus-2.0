---
phase: 12-demo-ui-tab-integration
plan: 02
subsystem: frontend
tags: [react-query, reducer, mapper, typescript, demo-ui]

requires:
  - phase: 11-digital-resource-backend
    provides: "GET /api/digital-resources/world flat response shape (DigitalResourceWorldResponse)"
  - plan: 12-01
    provides: "seeded janus2 dev DB so /world returns the 6-unit dataset"
provides:
  - "mapWorldResponse: backend flat /world JSON -> denormalized DigitalResourceWorld (per-node org_links/policy_assignments, resolved policy objects, Date parsing, fail-closed on dangling policy_id)"
  - "exported parseNullableDate + mapOrgLink helpers for 12-03's hooks"
  - "world-state.tsx reducer actions: SET_DIGITAL_RESOURCES (preserves disabledResourceGrantIds), UPSERT_RESOURCE_GRANT, UPSERT_RESOURCE_DELEGATE (replace-or-append)"
  - "QueryClientProvider wrapping DemoRoot in demo/main.tsx — React Query usable anywhere in the demo tree"
  - "CLEARANCE_TONE exported from access-resolution-explorer.tsx for 12-04/12-05"
affects: [12-03, 12-04, 12-05, 12-06]

tech-stack:
  added: []
  patterns:
    - "raw-response interfaces mirror backend snake_case field-for-field; all dates string|null until parsed at the mapper boundary"

key-files:
  created:
    - frontend/src/demo/lib/digital-resource-mapper.ts
    - frontend/src/demo/lib/digital-resource-mapper.test.ts
  modified:
    - frontend/src/demo/store/world-state.tsx
    - frontend/src/demo/store/world-state.test.tsx
    - frontend/src/demo/main.tsx
    - frontend/src/demo/components/access-resolution-explorer.tsx

key-decisions:
  - "Pre-existing tsc breakage (27 latent errors, invisible to vitest) fixed as a blocking deviation so this plan's — and every later plan's — `npm run build` gate is meaningful"

requirements-completed: [RSRC-UI-04 (data layer), RSRC-UI-06 (reducer actions)]

coverage:
  - id: D1
    description: "mapWorldResponse denormalizes flat org_links/policy_assignments per node, resolves policy_id to full objects, throws on dangling policy_id, parses dates"
    requirement: "RSRC-UI-04"
    verification:
      - kind: unit
        ref: "frontend/src/demo/lib/digital-resource-mapper.test.ts"
        status: pass
    human_judgment: false
  - id: D2
    description: "SET_DIGITAL_RESOURCES preserves disabledResourceGrantIds; UPSERT_RESOURCE_* replace-or-append without duplicates"
    requirement: "RSRC-UI-06"
    verification:
      - kind: unit
        ref: "frontend/src/demo/store/world-state.test.tsx"
        status: pass
    human_judgment: false
  - id: D3
    description: "Full build + suite green: npm run build zero TS errors; 16 files / 211 tests pass (baseline 15/194 + this plan's additions, none lost)"
    requirement: "RSRC-UI-04"
    verification:
      - kind: build+unit
        ref: "npm run build && npm run test"
        status: pass
    human_judgment: false

duration: ~2 sessions (interrupted mid-task-3; closed out via safe-resume)
completed: 2026-07-03
status: complete
---

# Phase 12 Plan 02: Data-Layer Foundations Summary

**Built the pure data layer every later Phase 12 plan consumes: `mapWorldResponse` denormalizing the backend's flat `/world` response into per-node `DigitalResourceWorld`, three new world-state reducer actions, a `QueryClientProvider` in the demo Vite entry, and the `CLEARANCE_TONE` export — plus a blocking-deviation repair of 27 pre-existing tsc errors that had silently broken `npm run build` since phase 10.**

## Task Commits

1. **Task 1: raw-response → DigitalResourceWorld mapper** — `3dbdcb4` (test, RED), `d54f8fe` (feat, GREEN)
2. **Task 2: SET_DIGITAL_RESOURCES / UPSERT_RESOURCE_* reducer actions** — `3ba4624` (test, RED), `f2f94ab` (feat, GREEN)
3. **Task 3: QueryClientProvider + CLEARANCE_TONE export** — `6f633a5` (feat)
4. **Deviation: pre-existing build repair** — `beef07e` (fix)

## Accomplishments

- `digital-resource-mapper.ts`: raw snake_case interfaces mirroring `DigitalResourceWorldResponse`; `mapWorldResponse` filters flat `org_links`/`policy_assignments` by `resource_id`+`resource_tier` per node, resolves `policy_id` → full `ResourcePolicy` (throws on dangling reference, fail-closed), parses all dates via exported `parseNullableDate`, initializes `disabledResourceGrantIds: new Set()`
- Reducer: `SET_DIGITAL_RESOURCES` replaces `digitalResources` wholesale but preserves client-only `disabledResourceGrantIds` across refetches; `UPSERT_RESOURCE_GRANT`/`UPSERT_RESOURCE_DELEGATE` replace-if-id-exists, append-if-not
- Demo entry wraps `DemoRoot` in `QueryClientProvider` (same defaults as main app: staleTime 5 min, no refetch-on-focus), StrictMode outermost
- `CLEARANCE_TONE` exported (exactly one line changed in `access-resolution-explorer.tsx`)

## Deviations from Plan

- **[blocking] Pre-existing `npm run build` breakage fixed (`beef07e`).** Task 3's acceptance criterion "build completes with zero TypeScript errors" was unmeetable: 27 latent tsc errors existed at HEAD (vitest transpiles without type-checking, so they went unnoticed since phase 10). Fixed minimally: seed.ts missing type imports (6), physical-access.test.ts fictional org-ids cast `as UnitId` (18 sites, zero runtime change), 5 unused type imports in digital-resource-selectors.ts, 1 unused var in digital-resource.test.ts, node types reference in golden-export.test.ts, and `NONE` → `UNCLASSIFIED` in both organizations ClearanceBadge maps (`ClearanceLevel` has no `NONE`; the Record was missing `UNCLASSIFIED`). All later plans' build gates now meaningful.
- Plan executed across two sessions: tasks 1–2 committed in a prior session; task 3 was found half-applied uncommitted (QueryClientProvider present, export missing) and closed out via the safe-resume gate's close-out-manually path.

## Verification

- `npx vitest run src/demo/lib/digital-resource-mapper.test.ts src/demo/store/world-state.test.tsx` — pass
- `npm run build` — zero TS errors (BUILD_OK)
- `npm run test` — 16 files / 211 tests, all pass
