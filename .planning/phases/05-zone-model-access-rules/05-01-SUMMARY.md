---
phase: 05-zone-model-access-rules
plan: "01"
subsystem: frontend-demo-lib
tags: [zone-model, clearance-ladder, access-rules, typescript, model]

dependency_graph:
  requires: []
  provides:
    - ZoneLevel, ZoneType, ZoneNode types in model.ts
    - ZoneAccessGate, ZoneAccessReason, ZoneAccessResult types in model.ts
    - isValidZoneTypeCombination, evaluateControlledAccess, evaluateRestrictedAccess, evaluateSecuredAccess functions
    - getAncestors, getDescendants tree traversal helpers
    - 5-tier Clearance ladder (UNCLASSIFIED=0, RESTRICTED=1, CONFIDENTIAL=2, SECRET=3, TOP_SECRET=4)
  affects:
    - frontend/src/demo/lib/abac.ts (null-guard on tierRank)
    - frontend/src/demo/lib/policy.ts (null-guard on tierRank)

tech_stack:
  added: []
  patterns:
    - Partial<Record<Domain, string[]>> for sparse domain-tier map
    - Optional-chaining null-guard: TIERS[domain]?.indexOf(tier) ?? -1
    - Pure ZoneAccessResult evaluator functions returning typed gate+reason+detail
    - Map-based O(n) parent_id chain traversal for getAncestors/getDescendants

key_files:
  created: []
  modified:
    - frontend/src/demo/lib/model.ts
    - frontend/src/demo/lib/abac.ts
    - frontend/src/demo/lib/policy.ts

decisions:
  - "Used Partial<Record<Domain, string[]>> over tombstone PHYSICAL:[] to satisfy SPEC key-removal requirement"
  - "isEscorted in evaluateSecuredAccess annotates detail only — does not affect allow/deny (D-03, T-05-01)"
  - "CLEARANCE_RANK comparisons are relative (>=) throughout — rank shift from 3-tier to 5-tier self-corrects all existing tests"
  - "getAncestors returns parent-first (direct parent first, root last) — matches Phase 6 most-specific-wins traversal"

metrics:
  duration_minutes: 15
  completed_date: "2026-05-23"
  tasks_completed: 3
  tasks_total: 3
  files_changed: 3
---

# Phase 5 Plan 01: Zone Model Foundation Summary

5-tier Clearance ladder, NSM-grounded zone hierarchy types (ZoneLevel/ZoneType/ZoneNode), four access-rule functions (CONTROLLED/RESTRICTED/SECURED + ceiling rule), two tree traversal helpers, and null-guard companion edits in abac.ts and policy.ts — all landing in model.ts with zero test regressions.

## What Was Built

### Task 1: 5-tier Clearance ladder and PHYSICAL tier removal

- Inserted `"RESTRICTED"` between `"UNCLASSIFIED"` and `"CONFIDENTIAL"` in the `Clearance` union type
- Updated `CLEARANCE_RANK` to UNCLASSIFIED=0, RESTRICTED=1, CONFIDENTIAL=2, SECRET=3, TOP_SECRET=4
- Changed `TIERS` annotation from `Record<Domain, string[]>` to `Partial<Record<Domain, string[]>>`
- Deleted the `PHYSICAL` key entirely — no tombstone empty array (SPEC requires key absent, not just string-free)
- `Domain` union unchanged: `"COMPUTER" | "DATA" | "PHYSICAL"`

**Pre-edit baseline:** 80 Vitest tests passing (12 test files). Post-edit: still 80 (confirmed Task 3).

### Task 2: Zone hierarchy types, access result types, four rule functions, two tree helpers

Inserted a new section in model.ts between the TIERS block and the D-10/UnitId comment:

- `ZoneLevel`: `"SITE" | "AREA" | "BUILDING" | "ZONE" | "ROOM"` (ordered broad → narrow)
- `ZoneType`: `"CONTROLLED" | "RESTRICTED" | "SECURED"` (with disambiguation comment re: DATA tier + Clearance name collisions)
- `ZoneNode`: 8-field interface (id, name, level, zone_type, parent_id, admin_org_id, asset_owner_org_id, requires_explicit_auth)
- `ZoneAccessGate`: `'GRANT_LOOKUP' | 'ZONE_TYPE_RULE'` — Phase 5 emits only `ZONE_TYPE_RULE`; Phase 6 adds `GRANT_LOOKUP`
- `ZoneAccessReason`: 5-value union (GRANT_FOUND, NO_GRANT, INSUFFICIENT_CLEARANCE, ESCORT_REQUIRED, ENTRY_LOG_REQUIRED)
- `ZoneAccessResult`: `{ allow: boolean; gate: ZoneAccessGate; reason: ZoneAccessReason; detail?: string }`
- `isValidZoneTypeCombination`: returns false for SECURED at SITE/AREA; true otherwise (ZONE-03)
- `evaluateControlledAccess`: grant-only check, no clearance required
- `evaluateRestrictedAccess`: early-return NO_GRANT, then allow if `clearance>=RESTRICTED || hasValidEscort`
- `evaluateSecuredAccess`: allow only if `clearance>=SECRET`; isEscorted annotates detail only (T-05-01 mitigated)
- `getAncestors`: Map-based O(n) walk up parent_id chain, parent-first order
- `getDescendants`: BFS collecting all transitive descendants

### Task 3: tierRank null-guard companion edits

Surgical one-line edits to handle `TIERS[domain]` being `string[] | undefined` after the Partial<Record> change:

- `abac.ts` line 52: `TIERS[domain].indexOf(tier)` → `TIERS[domain]?.indexOf(tier) ?? -1`
- `policy.ts` line 18: same guard applied

Semantics: undefined domain returns rank -1 (always DENY) — correct default for removed PHYSICAL domain.

**Post-edit validation:** `tsc -b --noEmit` exits 0; 80 Vitest tests pass (no regressions from 80-test baseline).

## Deviations from Plan

None — plan executed exactly as written. The SPEC's choice of `Partial<Record<Domain, string[]>>` (vs. tombstone `PHYSICAL: []`) was pre-resolved in the plan's task description; both approaches were researched and the plan specified Partial.

## Verification Results

| Check | Result |
|-------|--------|
| `grep "LOBBY\|RESTRICTED_AREA\|SECURE_VAULT" model.ts` | 0 matches (PASS) |
| All 6 functions exported from model.ts | PASS |
| All 6 types/interfaces exported from model.ts | PASS |
| abac.ts contains `TIERS[domain]?.indexOf(tier) ?? -1` | PASS |
| policy.ts contains `TIERS[domain]?.indexOf(tier) ?? -1` | PASS |
| `tsc -b --noEmit` exits 0 | PASS |
| `npx vitest run` — test count | 80/80 (baseline: 80/80, no regression) |

## Threat Model Coverage

| Threat | Status |
|--------|--------|
| T-05-01: evaluateSecuredAccess escort unlock | MITIGATED — isEscorted only in detail ternary, not in allow condition |
| T-05-02: evaluateRestrictedAccess OR precedence | MITIGATED — early-return NO_GRANT first; ALLOW uses parenthesized `(rank>=RESTRICTED || escort)` |
| T-05-03: CLEARANCE_RANK rank shift | MITIGATED — all existing comparisons relative (>=); 80 tests confirm no silent breakage |
| T-05-04: tierRank on undefined TIERS[domain] | MITIGATED — `?.indexOf() ?? -1` in both abac.ts and policy.ts |
| T-05-05: ZoneAccessResult.detail strings | ACCEPTED — low risk (no PII, no secrets, intended as PACS audit payload) |

## Known Stubs

None — all new exports are complete, typed implementations. No placeholder values or wired-empty fields.

## Threat Flags

None — the three modified files add no new network endpoints, auth paths, file access patterns, or schema changes at trust boundaries. All changes are pure TypeScript demo-lib logic.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | 4555c65 | feat(05-01): extend Clearance to 5-tier ladder and remove PHYSICAL TIERS |
| Task 2 | 88b36b2 | feat(05-01): add zone hierarchy types, access result types, rule functions, and tree helpers |
| Task 3 | 116a9eb | fix(05-01): apply tierRank null-guard after TIERS becomes Partial<Record> |

## Self-Check: PASSED

- `frontend/src/demo/lib/model.ts` — exists and contains all 6 exported functions and 6 exported types
- `frontend/src/demo/lib/abac.ts` — contains `TIERS[domain]?.indexOf(tier) ?? -1`
- `frontend/src/demo/lib/policy.ts` — contains `TIERS[domain]?.indexOf(tier) ?? -1`
- Commits 4555c65, 88b36b2, 116a9eb — present in git log
