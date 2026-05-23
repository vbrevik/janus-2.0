# Phase 8: Mock Dataset & Demo UI — Specification

**Created:** 2026-05-23
**Ambiguity score:** 0.16 (gate: ≤ 0.20)
**Requirements:** 15 locked

## Goal

A developer or reviewer can open the demo, browse the 6-unit zone hierarchy, resolve any person/zone combination with an explained trace, toggle grants interactively to observe inheritance and deny fallback, and inspect zone entry log history — all from a new "Physical Access" tab in DemoRoot.

## Background

Phases 5–7 built all model types and logic in `frontend/src/demo/lib/model.ts` — `ZoneNode`, `PhysicalAccessGrant`, `ZoneAccessDelegate`, `ZoneEntryLog`, `ZoneVisitorPass`, and all resolution functions (`resolveZoneAccess`, `resolveGrant`, `isGrantActive`, etc.) are complete and test-covered.

What does NOT exist today:
- **Seed data**: no `ZONES`, `GRANTS`, `DELEGATES`, `ENTRY_LOGS`, or `VISITOR_PASSES` constants in `seed.ts`
- **WorldState**: no zone fields (`zones`, `grants`, `delegates`, `entryLogs`, `visitorPasses`) in `WorldState`; no `TOGGLE_GRANT` action in the reducer
- **DemoRoot**: 5 tabs only (`decisions`, `federation`, `entity-console`, `audit`, `context`); no "physical-access" tab
- **UI components**: no `PhysicalAccessPanel`, `ZoneBrowser`, `AccessResolutionExplorer`, or `ZoneEntryLogView` components exist

This phase wires together all prior v2.1 work into a demonstrable, interactive UI.

## Requirements

1. **Zone seed — site hierarchy**: Dataset defines ≥3 root Sites with subtrees including Areas, Buildings, Zones, and/or Rooms.
   - Current: No zone constants exist in `seed.ts`
   - Target: `ZONES` constant appended to `seed.ts` below the SEED-HEAD boundary; contains ≥3 root sites with nested subtrees; all zone records satisfy `isValidZoneTypeCombination(level, zone_type)` (ZONE-03 ceiling rule); SEED-HEAD records remain unmodified
   - Acceptance: TypeScript compiles; `ZONES.filter(z => z.parent_id === null).length >= 3`; no SECURED nodes at SITE or AREA level

2. **Zone seed — all three zone types**: Dataset includes zones of all three types (CONTROLLED, RESTRICTED, SECURED); SECURED nodes appear only at BUILDING, ZONE, or ROOM level.
   - Current: No zone seed
   - Target: `ZONES` includes at least one node of each `zone_type`; every SECURED node has `level` in `["BUILDING", "ZONE", "ROOM"]`
   - Acceptance: `ZONES.some(z => z.zone_type === "CONTROLLED")`, `ZONES.some(z => z.zone_type === "RESTRICTED")`, `ZONES.some(z => z.zone_type === "SECURED")`; no SECURED node has `level === "SITE"` or `level === "AREA"`

3. **Zone seed — grant placement**: Access grants are primarily at BUILDING or ROOM level; ≤2 Site-level grants.
   - Current: No grant seed
   - Target: `GRANTS` constant appended to `seed.ts`; `GRANTS.filter(g => ZONES.find(z => z.id === g.zone_id)?.level === "SITE").length <= 2`
   - Acceptance: Assertion holds on the exported constants

4. **Zone seed — inheritance demo**: Dataset demonstrates zone_type-scoped inheritance (a CONTROLLED-Building grant covering CONTROLLED Rooms inside it).
   - Current: No grant seed
   - Target: At least one grant exists on a CONTROLLED Building node; at least one CONTROLLED Room exists as its descendant; `resolveGrant(personId, controlledRoom, ZONES, GRANTS, now)` returns that building grant for the same person
   - Acceptance: Manual trace in the Access Resolution Explorer shows "Grant found (via ancestor)" for the CONTROLLED room when the building grant is active

5. **Zone seed — explicit exclusion demo**: Dataset demonstrates a RESTRICTED or SECURED node inside a CONTROLLED parent that requires its own grant.
   - Current: No seed
   - Target: At least one RESTRICTED or SECURED zone has a CONTROLLED ancestor (different `zone_type`); `resolveGrant` returns `null` for that zone when only the CONTROLLED ancestor grant exists (zone_type mismatch)
   - Acceptance: Access Resolution Explorer shows DENY for that zone when only the parent CONTROLLED grant is active and no explicit grant exists for the RESTRICTED/SECURED zone

6. **Zone seed — delegation examples**: Dataset includes ≥1 person delegate and ≥1 org delegate.
   - Current: No delegate seed
   - Target: `DELEGATES` constant appended to `seed.ts`; contains at least one record with `delegate_type === "PERSON"` and at least one with `delegate_type === "ORG"`
   - Acceptance: `DELEGATES.filter(d => d.delegate_type === "PERSON").length >= 1`; `DELEGATES.filter(d => d.delegate_type === "ORG").length >= 1`

7. **Zone seed — entry log method coverage**: `ZoneEntryLog` entries include both CARD and ESCORT method examples.
   - Current: No entry log seed
   - Target: `ENTRY_LOGS` constant appended to `seed.ts`; contains at least one `method: "CARD"` entry and at least one `method: "ESCORT"` entry; all ESCORT entries have `escort_person_id` set; all CARD entries have `escort_person_id === null`; `validateEntryLog(entry)` returns `null` for all entries
   - Acceptance: `ENTRY_LOGS.filter(e => e.method === "CARD").length >= 1`; `ENTRY_LOGS.filter(e => e.method === "ESCORT").length >= 1`; `ENTRY_LOGS.every(e => validateEntryLog(e) === null)`

8. **Zone seed — visitor pass**: Dataset includes ≥1 `ZoneVisitorPass` tied to an ESCORT entry.
   - Current: No visitor pass seed
   - Target: `VISITOR_PASSES` constant appended to `seed.ts`; each pass has a corresponding ESCORT `ZoneEntryLog` (matched by `entry_log_id`); at least one pass is active relative to the demo's reference timestamp
   - Acceptance: `VISITOR_PASSES.length >= 1`; each pass's `entry_log_id` matches an `ENTRY_LOGS` record with `method === "ESCORT"`

9. **Zone seed — temporal variety**: Grants include a realistic mix of active, expired, and future-dated records.
   - Current: No grant seed
   - Target: `GRANTS` contains at least one grant with `valid_until` in the past (expired), at least one with `valid_from` in the future (future), and at least one permanent grant (`valid_from === null && valid_until === null`)
   - Acceptance: At least 3 temporally distinct grant types represented in `GRANTS`

10. **WorldState extension — zone fields**: `WorldState` gains 5 zone fields; `seedWorld()` initializes them from seed constants.
    - Current: `WorldState` interface has no zone fields; `world-state.tsx` does not import zone seed constants
    - Target: `WorldState` interface gains: `zones: ZoneNode[]`, `grants: PhysicalAccessGrant[]`, `delegates: ZoneAccessDelegate[]`, `entryLogs: ZoneEntryLog[]`, `visitorPasses: ZoneVisitorPass[]`; `seedWorld()` initializes all 5 from the new seed constants; `useWorld()` consumers can read these fields
    - Acceptance: TypeScript compiles; `useWorld().zones.length` equals `ZONES.length`

11. **WorldState extension — TOGGLE_GRANT action**: Reducer gains a `TOGGLE_GRANT` action that marks a grant as active or inactive in-memory without mutating seed data.
    - Current: No `TOGGLE_GRANT` action exists in the `Action` union or reducer
    - Target: `Action` union includes `{ type: "TOGGLE_GRANT"; grantId: string }`; reducer handles this action by tracking disabled grant IDs in-memory (via `disabledGrantIds` set or equivalent flag on grant object); `resolveZoneAccess` called with only non-disabled grants reflects the toggle immediately in the resolution trace
    - Acceptance: Dispatching `TOGGLE_GRANT` for an active grant changes the Access Resolution Explorer result from ALLOW to DENY (for a zone where that grant was the sole path to access)

12. **DemoRoot — Physical Access tab**: DemoRoot adds a 6th tab labeled "Physical Access" with an internal sub-nav for 3 views.
    - Current: `ActiveView` union has 5 values; no "physical-access" tab exists
    - Target: `ActiveView` gains `"physical-access"`; a 6th tab button appears in the tab bar; clicking it renders `<PhysicalAccessPanel />`; inside `PhysicalAccessPanel`, a button-row sub-nav switches between Zone Browser, Access Resolution, and Entry Log views
    - Acceptance: Clicking "Physical Access" renders the sub-nav and defaults to the Zone Browser view; other 5 tabs are unaffected

13. **Zone Browser tab**: Zone Browser renders the zone hierarchy with zone_type badges; selecting a node reveals detail panel.
    - Current: No `ZoneBrowser` component exists
    - Target: Zone Browser renders all zones as a collapsible tree (expand/collapse per node); each node shows its name and a zone_type badge (CONTROLLED / RESTRICTED / SECURED); clicking a node shows a detail panel with: zone `name`, `level`, `zone_type` badge, `admin_org_id`, `asset_owner_org_id`, `requires_explicit_auth`, list of active grants (person name + active/expired status), and list of active delegates
    - Acceptance: All zones from `useWorld().zones` appear in the tree; clicking any zone node populates the detail panel with correct data from `WorldState`

14. **Access Resolution Explorer**: Explorer accepts person + zone selection and displays ALLOW/DENY trace with grant toggle.
    - Current: No `AccessResolutionExplorer` component exists
    - Target: Component provides: (a) person dropdown (subj-1..4 with name labels); (b) zone dropdown; (c) optional escort person dropdown ("None" default); (d) grant list panel showing all grants relevant to the selected zone with checkboxes (dispatches `TOGGLE_GRANT`); (e) resolution trace displaying — grant found/not-found, zone_type rule evaluated, clearance check result, escort note — recomputed live on dropdown or toggle change; result shows ALLOW or DENY with matching green/red styling
    - Acceptance: Selecting a person + zone with a valid active grant shows ALLOW; disabling that grant via checkbox changes result to DENY; escort selection affects RESTRICTED zone results; clearance mismatch produces DENY with "clearance: X, required: Y" detail

15. **Zone Entry Log view**: Entry Log view lists zone access events filterable by zone and person; ESCORT rows show visitor pass status.
    - Current: No `ZoneEntryLogView` component exists
    - Target: Component lists all `ZoneEntryLog` entries from `useWorld().entryLogs`; filterable by zone (dropdown) and person (dropdown); each row shows: person name, zone name, `entry_at`, `exit_at` (or "—"), method badge (CARD / ESCORT); ESCORT rows additionally show an active/expired badge for the associated `ZoneVisitorPass` (using `getActiveVisitorPasses` with a fixed reference `now`)
    - Acceptance: All entry log records render; zone and person filters reduce the visible set correctly; ESCORT rows show a visitor pass status badge; CARD rows show no badge

## Boundaries

**In scope:**
- Seed constants: `ZONES`, `GRANTS`, `DELEGATES`, `ENTRY_LOGS`, `VISITOR_PASSES` appended to `seed.ts` below the SEED-HEAD boundary
- `WorldState` interface extension (5 new fields) and `seedWorld()` initialization
- `TOGGLE_GRANT` action in the reducer (in-memory disabled-grant tracking)
- DemoRoot: 6th "Physical Access" tab + `PhysicalAccessPanel` component
- Zone Browser component (collapsible tree + detail panel)
- Access Resolution Explorer component (person/zone selection + TOGGLE_GRANT checkboxes + live trace)
- Zone Entry Log component (filterable list + visitor pass status badges)
- Using only existing subjects subj-1..4 as persons in zone seed data

**Out of scope:**
- Backend (Rust/PostgreSQL) implementation of zone model, grants, or entry log — defers to a later milestone
- New person records — only existing subj-1..4 are used in zone grants/entry logs (D-02)
- New UI primitives in `ui.tsx` — only existing `Card`, `Pill`, `Field`, `Select`, `DecisionTrace`-style rendering used
- Changes to existing 5 DemoRoot tabs — no modification to DecisionExplorer, FederationHub, UnitConsolePanel, AuditView, ContextView
- Modifications to records above the SEED-HEAD boundary in `seed.ts` — the invariant is inviolable
- Changes to `routeTree.gen.ts` or any route files — demo stays isolated in `frontend/src/demo/`
- SEED-003 crosswalk integration with the ABAC engine — zone data stays within the demo domain
- NDA or screening prerequisites as zone access gates — deferred (SEED-001/002/006)

## Constraints

- **SEED-HEAD invariant**: All existing records in `seed.ts` (above the existing Task-3 boundary comment) must remain unmodified. Zone seed constants are appended below.
- **No new person records**: Zone grants and entry logs use only existing subjects subj-1..4 (Dana Reyes, Sam Okafor, Lee Park, Mara Vance) as persons.
- **Tab count cap**: DemoRoot's outer tab bar must have exactly 6 tabs after this phase (D-07).
- **In-memory toggling**: `TOGGLE_GRANT` must not mutate seed data — disabled state tracked separately in WorldState (D-06).
- **No backend changes**: All data is mock/in-memory TypeScript; no Rust or SQL changes.
- **No new UI primitives**: Use `Card`, `Pill`, `Field`, `Select` from `ui.tsx`; adopt `DecisionTrace`-style visual layout for resolution trace rows.
- **Component placement**: All new React components go in `frontend/src/demo/components/` as named exports.
- **Reference timestamp for "now"**: Zone Browser grant active/expired status and Entry Log visitor pass badges should evaluate against `new Date()` (wall-clock) at render time; the seed must contain records that are active relative to 2026 dates so the demo shows meaningful active/expired variation.

## Acceptance Criteria

- [ ] `ZONES`, `GRANTS`, `DELEGATES`, `ENTRY_LOGS`, `VISITOR_PASSES` constants exist in `seed.ts` and TypeScript compiles with no errors
- [ ] SEED-HEAD records (above the boundary comment) are unmodified
- [ ] `ZONES.filter(z => z.parent_id === null).length >= 3` (≥3 root Sites)
- [ ] No SECURED zone node has `level === "SITE"` or `level === "AREA"`
- [ ] `GRANTS` contains at least one expired, one future, and one permanent grant
- [ ] `DELEGATES` contains at least one PERSON delegate and at least one ORG delegate
- [ ] `ENTRY_LOGS.every(e => validateEntryLog(e) === null)` (all log records are valid)
- [ ] Each `VISITOR_PASSES` entry references an `ENTRY_LOGS` record with `method === "ESCORT"`
- [ ] `WorldState` interface includes `zones`, `grants`, `delegates`, `entryLogs`, `visitorPasses`
- [ ] `seedWorld()` initializes all 5 zone fields from seed constants
- [ ] `TOGGLE_GRANT` action exists in the `Action` union and is handled by the reducer
- [ ] DemoRoot renders 6 tabs; clicking "Physical Access" renders `PhysicalAccessPanel`
- [ ] Zone Browser shows all zones in a collapsible tree with zone_type badges
- [ ] Clicking a zone node populates the detail panel with grants and delegates
- [ ] Access Resolution Explorer: valid grant + clearance → ALLOW; toggling that grant off → DENY
- [ ] Escort person selection affects RESTRICTED zone results in the resolution trace
- [ ] Entry Log view renders all entries; zone and person filters work; ESCORT rows show pass status badge

## Ambiguity Report

| Dimension           | Score | Min  | Status | Notes                                                       |
|---------------------|-------|------|--------|-------------------------------------------------------------|
| Goal Clarity        | 0.90  | 0.75 | ✓      | 6 measurable success criteria in ROADMAP.md                |
| Boundary Clarity    | 0.85  | 0.70 | ✓      | "Claude's Discretion" items explicitly named in CONTEXT.md |
| Constraint Clarity  | 0.75  | 0.65 | ✓      | SEED-HEAD, tab cap, no-new-persons all explicit             |
| Acceptance Criteria | 0.82  | 0.70 | ✓      | 17 pass/fail checkboxes; UI criteria observable             |
| **Ambiguity**       | 0.16  | ≤0.20| ✓      |                                                             |

## Interview Log

No interview rounds conducted — initial ambiguity score (0.16) passed the gate before questioning began. Requirements derived directly from ROADMAP.md success criteria, REQUIREMENTS.md (SEED-01..09, UI-01..06), and 08-CONTEXT.md implementation decisions (D-01..D-13).

| Round | Perspective | Question summary                     | Decision locked                               |
|-------|-------------|--------------------------------------|-----------------------------------------------|
| 0     | (pre-score) | Scout codebase state vs. phase goal  | All model types done; 0 seed/UI/store exists |

---

*Phase: 08-mock-dataset-demo-ui*
*Spec created: 2026-05-23*
*Next step: /gsd:discuss-phase 8 — implementation decisions (how to build what's specified above)*
