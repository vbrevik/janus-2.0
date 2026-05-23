# Phase 8: Mock Dataset & Demo UI - Context

**Gathered:** 2026-05-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the 6-unit physical access zone seed dataset (zones, grants, delegates, entry logs, visitor passes) and wire up three new demo UI views — Zone Browser, Access Resolution Explorer, and Zone Entry Log — as a "Physical Access" tab in DemoRoot. After this phase, a developer or reviewer can open the demo, browse the zone hierarchy, resolve any person/zone combination with an explained trace, and inspect entry log history.

</domain>

<decisions>
## Implementation Decisions

### Seed Data File

- **D-01:** Zone seed constants (ZONES, GRANTS, DELEGATES, ENTRY_LOGS, VISITOR_PASSES) are appended to `frontend/src/demo/lib/seed.ts` below the existing SEED-HEAD boundary comment. The SEED-HEAD invariant (do NOT modify records above the boundary) is respected — all existing records are untouched.
- **D-02:** Persons in the zone scenario are the existing subj-1..4 (Dana Reyes, Sam Okafor, Lee Park, Mara Vance). No new person records are created.

### WorldState Integration

- **D-03:** Zone data is added to `WorldState` in `world-state.tsx` — not kept as isolated module-level constants. Fields added to WorldState: `zones: ZoneNode[]`, `grants: PhysicalAccessGrant[]`, `delegates: ZoneAccessDelegate[]`, `entryLogs: ZoneEntryLog[]`, `visitorPasses: ZoneVisitorPass[]`.
- **D-04:** `seedWorld()` is extended to initialize these fields from the new seed constants.
- **D-05:** The reducer gains a `TOGGLE_GRANT` action that marks an individual grant as active or inactive (by id). This lets the Access Resolution Explorer show how the resolution trace changes when a grant is toggled — demonstrating inheritance and explicit-auth rules interactively.
- **D-06:** Grant toggling uses an in-memory `disabledGrantIds: Set<string>` (or equivalent flag on the grant object) in the reducer, not a mutation of the seed data itself.

### UI Tab Structure

- **D-07:** DemoRoot gets one new top-level tab: "Physical Access". The outer tab bar stays at 6 tabs total.
- **D-08:** Inside the Physical Access tab, an internal sub-nav (same button-row pattern as the outer tab bar) switches between three views: Zone Browser | Access Resolution | Entry Log.
- **D-09:** Zone Browser renders the zone hierarchy as a collapsible tree on the left panel. Selecting a node reveals its details — admin_org, asset_owner_org, zone_type badge, active grants, and delegates — in a right-side detail panel as Cards.

### Access Resolution Explorer

- **D-10:** Person selector (subject dropdown) drives clearance automatically — clearance is read from the selected subject's `clearance` field (subj-1 = SECRET, subj-2 = TOP_SECRET, etc.). No manual clearance input.
- **D-11:** A second dropdown lets the user select an escort person (optional — "None" is the default). The UI automatically runs `resolveGrant(escortPersonId, zone, ...)` to determine if the escort holds a valid grant for the selected zone. `hasValidEscort` passed to `resolveZoneAccess` equals that result.
- **D-12:** The resolution trace displays as plain prose rows (matching the existing `DecisionTrace` style in `ui.tsx`): grant gate result, zone_type rule evaluated, clearance check result, and escort note. Each gate on its own labeled row.
- **D-13:** The TOGGLE_GRANT action (D-05) is surfaced in the Access Resolution Explorer — a grant list panel shows all grants relevant to the selected zone with checkboxes to toggle them. The trace recomputes live.

### Claude's Discretion

- Exact field names for the disabled grant tracking in the reducer (flag on grant vs. separate Set)
- Expand/collapse state management for the zone tree (local useState in the Zone Browser component)
- Detail panel layout for zone node (field ordering, spacing)
- Entry Log view filtering UI (dropdowns for zone and person filters)
- Zone tree node indentation and expand/collapse icon style

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase requirements
- `.planning/REQUIREMENTS.md` — SEED-01 through SEED-09, UI-01 through UI-06 (the full Phase 8 requirement set)
- `.planning/ROADMAP.md` §Phase 8 — Success criteria (6 items) and UI hint

### Existing model (change target)
- `frontend/src/demo/lib/model.ts` — All types already defined: `ZoneNode`, `ZoneType`, `ZoneLevel`, `PhysicalAccessGrant`, `ZoneAccessDelegate`, `ZoneEntryLog`, `ZoneVisitorPass`, `ZoneAccessResult`, `Clearance`, `CLEARANCE_RANK`. Functions: `resolveZoneAccess`, `resolveGrant`, `isGrantActive`, `isDelegateActive`, `getActiveVisitorPasses`, `validateEntryLog`, `validateSecuredZoneEntry`, `getAncestors`, `getDescendants`, `evaluateControlledAccess`, `evaluateRestrictedAccess`, `evaluateSecuredAccess`.

### Existing seed (append target)
- `frontend/src/demo/lib/seed.ts` — Append zone constants below the SEED-HEAD boundary. Existing SUBJECTS (subj-1..4) used as persons in zone grants/entry logs. SEED-HEAD records must NOT be modified.

### Existing state/store (extend)
- `frontend/src/demo/store/world-state.tsx` — WorldState interface, seedWorld(), Action union, reducer. New fields and TOGGLE_GRANT action added here.

### Existing UI components (reuse)
- `frontend/src/demo/components/ui.tsx` — `Card`, `Pill`, `Field`, `Select`, `DecisionTrace` (for resolution trace prose rows)
- `frontend/src/demo/DemoRoot.tsx` — Tab bar pattern and ActiveView union — extend with "physical-access" tab

### Prior phase contexts (constraints that apply)
- `.planning/phases/05-zone-model-access-rules/05-CONTEXT.md` — ZoneAccessResult shape, tree traversal helpers
- `.planning/phases/06-grants-resolution-delegation/06-CONTEXT.md` — resolveZoneAccess two-gate logic, grant resolution ancestor walk, zone_type scoping
- `.planning/phases/07-entry-log-visitor-passes/07-CONTEXT.md` — ZoneEntryLog/ZoneVisitorPass interface contracts

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `resolveZoneAccess(personId, zone, clearance, hasValidEscort, allZones, allGrants, now)` in `model.ts` — primary entry point for Access Resolution Explorer. Pass active grants only (filter out disabled ones per D-05/D-06).
- `resolveGrant(personId, zone, allZones, allGrants, now)` in `model.ts` — use to check escort validity (D-11).
- `getActiveVisitorPasses(zoneId, allPasses, now)` in `model.ts` — use in Zone Entry Log view for ESCORT rows (UI-06).
- `validateEntryLog(entry)` in `model.ts` — use to validate seed entry log records at seed-time (not at render time).
- `getDescendants(zoneId, allZones)` in `model.ts` — useful for zone tree rendering (expand to show children).
- `getAncestors(zoneId, allZones)` in `model.ts` — useful for breadcrumb display in Zone Browser detail panel.
- `Card`, `Pill`, `Field`, `Select` from `demo/components/ui.tsx` — the full UI primitive set; no new primitives needed.
- `DecisionTrace` from `demo/components/ui.tsx` — use for resolution trace rows (D-12 prose format).
- `useWorld()` / `useWorldDispatch()` from `world-state.tsx` — hooks for consuming state and dispatching TOGGLE_GRANT.

### Established Patterns
- WorldState fields initialized in `seedWorld()`, accessed via `useWorld()` — zone fields follow the same pattern.
- Action union in world-state.tsx uses discriminated unions (`{ type: "ACTION_NAME"; ... }`) — TOGGLE_GRANT follows this.
- All new React components go in `frontend/src/demo/components/` as named exports.
- Tab pattern: `type ActiveView = "..." | "..."`, `useState<ActiveView>`, button row + conditional render — replicate inside the Physical Access tab for its internal sub-nav.
- Zone tree expand/collapse: local `useState<Set<string>>` for expanded node IDs (not in WorldState — pure UI state).
- Existing 5 subjects have clearances: subj-1=SECRET, subj-2=TOP_SECRET, subj-3=CONFIDENTIAL, subj-4=TOP_SECRET. The zone grant dataset should include grants for multiple subjects across different zones so the explorer has interesting resolution cases.

### Integration Points
- `DemoRoot.tsx` — add `"physical-access"` to the `ActiveView` union and add a `<PhysicalAccessPanel />` component import.
- `world-state.tsx` — WorldState interface extension, seedWorld() extension, reducer TOGGLE_GRANT case.
- `seed.ts` — ZONES, GRANTS, DELEGATES, ENTRY_LOGS, VISITOR_PASSES constants appended below the SEED-HEAD boundary comment.

</code_context>

<specifics>
## Specific Ideas

- The TOGGLE_GRANT feature is the key interactive element of the Access Resolution Explorer — when a user toggles off a direct zone grant, they should see the resolver fall back to a parent grant (if zone_type matches) or deny. This makes the inheritance model tangible.
- The escort flow (D-11) should show clearly in the trace when the escort person lacks a grant — the escort check should fail visibly, not silently pass `hasValidEscort = false`.
- SECURED zones with `requires_explicit_auth = true` are good candidates for toggle-off demos — toggling off the explicit grant should immediately show a DENY even if a parent grant exists.
- Entry Log view: ESCORT rows should visually indicate whether an associated ZoneVisitorPass is still active (using `getActiveVisitorPasses`). A green "Active pass" / grey "Expired" badge is consistent with existing Pill component tones.
- The 6-unit scenario should include at least one SECURED zone with a full chain: person has a parent CONTROLLED grant but needs a SECURED explicit grant — toggling the explicit grant off shows the deny.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 8-mock-dataset-demo-ui*
*Context gathered: 2026-05-23*
