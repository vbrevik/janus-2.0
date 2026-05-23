---
phase: 08-mock-dataset-demo-ui
plan: "03"
subsystem: frontend-demo
tags: [demo-ui, physical-access, access-resolution, entry-log, zone-resolution-trace]
dependency_graph:
  requires: [08-01, 08-02]
  provides: [AccessResolutionExplorer, ZoneEntryLogView]
  affects:
    - frontend/src/demo/components/access-resolution-explorer.tsx
    - frontend/src/demo/components/zone-entry-log-view.tsx
tech_stack:
  added: []
  patterns: [three-stage-useMemo, stable-now-memo, local-component-closure, TOGGLE_GRANT-dispatch, visitor-pass-badge]
key_files:
  modified:
    - frontend/src/demo/components/access-resolution-explorer.tsx
    - frontend/src/demo/components/zone-entry-log-view.tsx
decisions:
  - "ZoneResolutionTrace declared as local function inside access-resolution-explorer.tsx — avoids the Decision/ZoneAccessResult type mismatch with ui.tsx DecisionTrace; reuses identical Tailwind classes"
  - "Select component uses options array format (not children) — matched existing ui.tsx signature exactly"
  - "Escort row in ZoneResolutionTrace shown only for RESTRICTED or SECURED zone_types — CONTROLLED zones have no clearance/escort requirement"
  - "DecisionTrace string removed from all comments to satisfy grep -c 0 structural check"
  - "Visitor pass badge rendered inline in list item map via local activePasses const — avoids IIFE pattern, readable at cost of one extra variable per row"
metrics:
  duration: "~7 minutes"
  completed: "2026-05-23"
  tasks_completed: 2
  files_modified: 0
  files_created: 0
  files_replaced: 2
---

# Phase 8 Plan 03: AccessResolutionExplorer + ZoneEntryLogView Summary

Full AccessResolutionExplorer (person/zone/escort selectors, local ZoneResolutionTrace with 4 gate rows, TOGGLE_GRANT checkboxes, live useMemo resolution) and ZoneEntryLogView (zone/person filter dropdowns, descending entry list, visitor pass badges on ESCORT rows) replacing the stubs from plan 08-02.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Build AccessResolutionExplorer with ZoneResolutionTrace and TOGGLE_GRANT | fa09064 | frontend/src/demo/components/access-resolution-explorer.tsx |
| 2 | Build ZoneEntryLogView with filters and visitor pass badges | 452f77b | frontend/src/demo/components/zone-entry-log-view.tsx |

## What Was Built

### Task 1: AccessResolutionExplorer

**Full implementation replacing stub:**

- **Intro prose:** "Select a person and zone to compute an access decision. Toggle grants to see how inheritance and explicit-auth rules change the result."
- **Three-column selector grid** (`grid gap-4 sm:grid-cols-3`):
  - Person card: Select dropdown + clearance Pill (CLEARANCE_TONE mapping) + MockTag
  - Zone card: Select dropdown + zone_type Pill + "Requires explicit grant" amber Pill when applicable
  - Escort card: Select dropdown (None + subjects) + escort-has-no-grant red note when escort selected without valid grant
- **ZoneResolutionTrace** — local function component, NOT imported from ui.tsx:
  - Outer div: green/red border+background based on `result.allow`
  - Verdict line: "✓ ALLOW" / "✗ DENY" (text-lg font-semibold)
  - 4 gate rows (ul/li with icon + label + detail):
    - Row 1 Grant: "Grant found" (pass) / "No grant" (fail) per UI-SPEC copywriting
    - Row 2 Zone type rule: pass/fail based on `result.allow || result.gate === "GRANT_LOOKUP"`
    - Row 3 Clearance: pass/fail based on `result.reason !== "INSUFFICIENT_CLEARANCE"`
    - Row 4 Escort: shown only when `selectedZone.zone_type` is RESTRICTED or SECURED
- **Three-stage useMemo derivation:**
  - Stage 1: `activeGrants` — filters disabled and expired grants
  - Stage 2: `selectedZone`, `person`, `escortHasGrant` (via `resolveGrant`)
  - Stage 3: `result` — calls `resolveZoneAccess` with all derived inputs
  - Stable `now = useMemo(() => new Date(), [])` — Pitfall 4 guard
- **Relevant grants toggle panel** (Card title "Relevant grants (toggle to simulate)"):
  - Filtered to `person_id === personId && relevantZoneIds.has(grant.zone_id)`
  - `relevantZoneIds` = selected zone + all ancestors via `getAncestors`
  - Checkbox dispatches `TOGGLE_GRANT` on change
  - Disabled grants: `line-through text-slate-400` + "(disabled)" label
- **Static explanation card** ("About this decision") — 2-sentence prose on two-gate resolution

### Task 2: ZoneEntryLogView

**Full implementation replacing stub:**

- **Filter row** (`flex gap-4 items-end`): Zone Select ("All zones" first) + Person Select ("All persons" first)
- **Filtered + sorted entries** (`useMemo`): descending `entry_at` sort
- **Entry list** (Card title "Entry Log", `divide-y divide-slate-100`):
  - Timestamp: monospace xs, `toISOString().slice(0,16).replace("T", " ")`
  - Method badge: `Pill tone="slate"` for CARD, `Pill tone="blue"` for ESCORT
  - Person name → zone name layout with arrow separator
  - Exit time: ISO slice or "–" if null
  - ESCORT rows: visitor pass badge via `getActiveVisitorPasses(entry.zone_id, world.visitorPasses, now).filter(p => p.entry_log_id === entry.id)` — `Pill tone="green"` "Active pass" or `Pill tone="slate"` "Expired"
  - ESCORT rows: escort person note "escorted by {name}"
- **Empty state:** "No entry log records match the current filters."

## Verification Results

1. `npx tsc --noEmit` — 0 errors
2. `npx vitest run src/demo/lib/physical-access.test.ts` — 74/74 passed
3. `npx vitest run src/demo/store/world-state.test.tsx` — 6/6 passed
4. `npx vitest run --exclude "**/*.e2e.*" --exclude "**/playwright*"` — 154/154 passed (13 test files)
5. `grep -c "resolveZoneAccess" access-resolution-explorer.tsx` — 2 (>= 1 required)
6. `grep -c "ZoneResolutionTrace" access-resolution-explorer.tsx` — 2 (>= 2 required)
7. `grep -c "DecisionTrace" access-resolution-explorer.tsx` — 0 (required)
8. `grep -c "getActiveVisitorPasses" zone-entry-log-view.tsx` — 2 (>= 1 required)

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — both stubs from plan 08-02 are fully replaced with working implementations.

## Threat Flags

None — all changes are in-memory React components with no network surface, no auth paths, and no schema changes. T-08-06 (useMemo deps arrays) mitigated by explicit dep arrays covering all store fields read inside each memo.

## Self-Check: PASSED

- `frontend/src/demo/components/access-resolution-explorer.tsx` — FOUND (394 lines, full implementation)
- `frontend/src/demo/components/zone-entry-log-view.tsx` — FOUND (141 lines, full implementation)
- Commit `fa09064` — Task 1 (AccessResolutionExplorer)
- Commit `452f77b` — Task 2 (ZoneEntryLogView)
- TypeScript: 0 errors
- All 154 tests: PASSED
- resolveZoneAccess: 2 occurrences
- ZoneResolutionTrace: 2 occurrences
- DecisionTrace: 0 occurrences
- getActiveVisitorPasses: 2 occurrences
