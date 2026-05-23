---
phase: 08-mock-dataset-demo-ui
plan: "01"
subsystem: frontend-demo
tags: [seed-data, world-state, physical-access, zone-model]
dependency_graph:
  requires: []
  provides: [ZONES, GRANTS, DELEGATES, ENTRY_LOGS, VISITOR_PASSES, WorldState-zone-fields, TOGGLE_GRANT]
  affects: [frontend/src/demo/lib/seed.ts, frontend/src/demo/store/world-state.tsx]
tech_stack:
  added: []
  patterns: [immutable-Set-reducer, typed-seed-constants, discriminated-union-action]
key_files:
  modified:
    - frontend/src/demo/lib/seed.ts
    - frontend/src/demo/store/world-state.tsx
decisions:
  - "Used disabledGrantIds: Set<string> in WorldState (not flag on grant object) — cleaner separation of seed data from runtime toggle state"
  - "Immutable Set copy pattern (new Set(state.disabledGrantIds)) in TOGGLE_GRANT reducer — direct mutation breaks React re-render"
  - "Zone type imports added to existing import type block in seed.ts rather than a separate import statement — consistent with file convention"
metrics:
  duration: "~8 minutes"
  completed: "2026-05-23"
  tasks_completed: 2
  files_modified: 2
---

# Phase 8 Plan 01: Zone Seed Data + WorldState Extension Summary

Zone seed constants (12 nodes, 8 grants, 2 delegates, 4 entry logs, 2 visitor passes) appended to seed.ts below the SEED-HEAD boundary; WorldState extended with 6 zone fields and TOGGLE_GRANT reducer action using immutable Set copy pattern.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Append zone seed constants to seed.ts | 18a351a | frontend/src/demo/lib/seed.ts |
| 2 | Extend WorldState with zone fields and TOGGLE_GRANT reducer | 884b838 | frontend/src/demo/store/world-state.tsx |

## What Was Built

### Task 1: seed.ts zone constants

Added `import type` entries for `ZoneNode`, `PhysicalAccessGrant`, `ZoneAccessDelegate`, `ZoneEntryLog`, `ZoneVisitorPass` to the existing import block (extending, not replacing).

Appended after the `SUPPORT_OBLIGATIONS` block (the SEED-HEAD boundary):

**ZONES** (12 nodes across 3 root Sites):
- Site 1 — Alpha Command (MILITARY_1, CONTROLLED): North Wing → Block A → Corridor C1 → Server Room 1; Block A also has Secure Lab (ZONE, SECURED, requires_explicit_auth: true) — SEED-05 explicit exclusion demo
- Site 2 — Intel Campus (INTEL, RESTRICTED): Analysis Wing (BUILDING, RESTRICTED) → SIGINT Suite (ROOM, SECURED, requires_explicit_auth: true) — SEED-02 SECURED at ROOM only
- Site 3 — Logistics Hub (INFRA, CONTROLLED): Yard → Warehouse A → Supply Room — SEED-04 inheritance demo target

All three `zone_type` values present. No SECURED node at SITE or AREA level.

**GRANTS** (8 records, full temporal variety per SEED-09):
- Permanent (null/null): grant-dana-block-a, grant-sam-alpha-site, grant-lee-warehouse, grant-mara-analysis
- Active with start date: grant-dana-secure-lab (2026-01-01 → null), grant-sam-sigint (2026-01-01 → null)
- Expired: grant-expired-lee (valid_until 2026-03-01, before demo date 2026-06-01)
- Future: grant-future-dana (valid_from 2026-08-01, after demo date 2026-06-01)
- Site-level grants: only grant-sam-alpha-site (1 of ≤2 per SEED-03)

**DELEGATES** (2 records per SEED-06):
- deleg-person-1: PERSON delegate — Mara (subj-4) for zone-bldg-block-a, granted by MILITARY_1
- deleg-org-1: ORG delegate — MILITARY_2 for zone-site-intel, granted by INTEL

**ENTRY_LOGS** (4 records per SEED-07):
- log-card-1 and log-card-2: CARD method, escort_person_id null
- log-escort-1 and log-escort-2: ESCORT method, escort_person_id set (subj-2 and subj-1 respectively)

**VISITOR_PASSES** (2 records per SEED-08):
- pass-1: linked to log-escort-1, expired relative to 2026-06-01
- pass-2: linked to log-escort-2, active until 2026-12-31

### Task 2: world-state.tsx extensions

**Imports added:**
- From `../lib/model`: `PhysicalAccessGrant`, `ZoneAccessDelegate`, `ZoneEntryLog`, `ZoneNode`, `ZoneVisitorPass`
- From `../lib/seed`: `DELEGATES`, `ENTRY_LOGS`, `GRANTS`, `VISITOR_PASSES`, `ZONES` (alphabetically inserted)

**WorldState interface** — 6 new fields after `fedVerifyResults`:
```typescript
zones: ZoneNode[];
grants: PhysicalAccessGrant[];
delegates: ZoneAccessDelegate[];
entryLogs: ZoneEntryLog[];
visitorPasses: ZoneVisitorPass[];
disabledGrantIds: Set<string>;
```

**seedWorld()** — 6 new initializers after `fedVerifyResults`:
```typescript
zones: ZONES,
grants: GRANTS,
delegates: DELEGATES,
entryLogs: ENTRY_LOGS,
visitorPasses: VISITOR_PASSES,
disabledGrantIds: new Set<string>(),
```

**Action union** — TOGGLE_GRANT added after FEDERATION_RESET:
```typescript
| { type: "TOGGLE_GRANT"; grantId: string }
```

**Reducer** — TOGGLE_GRANT case with immutable Set copy (Pitfall 2 guard):
```typescript
case "TOGGLE_GRANT": {
  const next = new Set(state.disabledGrantIds);
  if (next.has(action.grantId)) next.delete(action.grantId);
  else next.add(action.grantId);
  return { ...state, disabledGrantIds: next };
}
```

## Verification Results

All three verification commands passed:

1. `npx tsc --noEmit` — 0 errors
2. `npx vitest run src/demo/lib/physical-access.test.ts` — 74/74 tests passed
3. `npx vitest run src/demo/store/world-state.test.tsx` — 6/6 tests passed

SEED-HEAD invariant: `git diff` shows only additions (311 lines added to seed.ts, 0 deletions above SUPPORT_OBLIGATIONS).

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all constants are fully populated with real data. No placeholder values.

## Threat Flags

None — all changes are in-memory TypeScript constants with no network surface, no auth paths, and no schema changes. The T-08-02 threat (TOGGLE_GRANT Set mutation) is mitigated by the `new Set(state.disabledGrantIds)` copy pattern in the reducer.

## Self-Check: PASSED

- `frontend/src/demo/lib/seed.ts` — FOUND (311 lines added)
- `frontend/src/demo/store/world-state.tsx` — FOUND (32 lines added)
- Commit `18a351a` — FOUND (Task 1)
- Commit `884b838` — FOUND (Task 2)
- TypeScript: 0 errors
- physical-access.test.ts: 74/74
- world-state.test.tsx: 6/6
