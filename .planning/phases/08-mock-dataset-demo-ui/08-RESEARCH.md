# Phase 8: Mock Dataset & Demo UI — Research

**Researched:** 2026-05-23
**Domain:** TypeScript demo dataset authoring + React demo UI components
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Zone seed constants appended to `frontend/src/demo/lib/seed.ts` below the SEED-HEAD boundary. Existing records above the boundary are NOT modified.
- **D-02:** Persons in zone scenario are the existing subj-1..4 only. No new person records.
- **D-03:** `zones`, `grants`, `delegates`, `entryLogs`, `visitorPasses` fields added to `WorldState` interface.
- **D-04:** `seedWorld()` extended to initialize new fields from the new seed constants.
- **D-05:** Reducer gains a `TOGGLE_GRANT` action (marks individual grant active/inactive by id).
- **D-06:** Grant toggling uses in-memory `disabledGrantIds` (Set or flag on grant), NOT a mutation of seed data.
- **D-07:** DemoRoot gets one new top-level tab: "Physical Access". Outer tab bar = 6 tabs total.
- **D-08:** Inside Physical Access tab, internal sub-nav (button-row pattern) switches between: Zone Browser | Access Resolution | Entry Log.
- **D-09:** Zone Browser: collapsible tree left panel + detail right panel (Cards).
- **D-10:** Person selector drives clearance automatically from `subject.clearance` — no manual clearance input.
- **D-11:** Escort dropdown; escort validity computed via `resolveGrant(escortPersonId, zone, ...)`.
- **D-12:** Resolution trace displays as plain prose rows matching existing `DecisionTrace` style.
- **D-13:** TOGGLE_GRANT surfaced in Access Resolution Explorer as checkbox list; trace recomputes live.

### Claude's Discretion

- Exact field names for disabled grant tracking (flag on grant vs. separate Set)
- Expand/collapse state management for zone tree (local useState in Zone Browser)
- Detail panel layout for zone node (field ordering, spacing)
- Entry Log view filtering UI (dropdowns for zone and person filters)
- Zone tree node indentation and expand/collapse icon style

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SEED-01 | ≥3 root Sites from 6-unit scenario, each with subtree of Areas, Buildings, Zones, Rooms | ZoneNode interface confirmed; getDescendants/getAncestors support tree rendering |
| SEED-02 | All three zone_types present; SECURED only at BUILDING, ZONE, ROOM | isValidZoneTypeCombination enforces ceiling rule; seed must satisfy it |
| SEED-03 | Grants primarily at BUILDING or ROOM level; ≤2 Site-level grants | Design constraint for seed authoring |
| SEED-04 | Demonstrates zone_type-scoped inheritance (CONTROLLED parent covers CONTROLLED children) | resolveGrant ancestor walk with zone_type filter confirmed in model.ts |
| SEED-05 | Demonstrates explicit exclusion (RESTRICTED/SECURED inside CONTROLLED parent needs own grant) | requires_explicit_auth + higher zone_type block inheritance — both patterns present in model |
| SEED-06 | ≥1 person delegate, ≥1 org delegate | ZoneAccessDelegate interface with delegate_type "PERSON"/"ORG" confirmed |
| SEED-07 | ZoneEntryLog entries with both CARD and ESCORT methods | ZoneEntryLog.method: "CARD" \| "ESCORT" confirmed; validateEntryLog enforces constraint |
| SEED-08 | ≥1 ZoneVisitorPass tied to ESCORT entry | ZoneVisitorPass.entry_log_id links to log; getActiveVisitorPasses queries by zone |
| SEED-09 | Realistic mix of active, expired, future-dated grants | isGrantActive(grant, now) checks valid_from/valid_until; null = unbounded |
| UI-01 | Zone Browser tab with zone_type badges | Pill tone mapping: CONTROLLED=slate, RESTRICTED=amber, SECURED=red (UI-SPEC) |
| UI-02 | Selecting zone shows admin_org, asset_owner_org, active grants, delegates | ZoneNode carries admin_org_id, asset_owner_org_id; grants filtered by zone_id |
| UI-03 | Access Resolution Explorer: person + zone → ALLOW/DENY with trace | resolveZoneAccess() is the primary entry point; returns ZoneAccessResult |
| UI-04 | Trace shows grant found/not, zone_type rule, clearance check, escort note | ZoneAccessResult.gate + .reason + .detail map to trace rows |
| UI-05 | Zone Entry Log view filterable by zone and person | Local useState filters; entries ordered entry_at descending |
| UI-06 | Entry Log ESCORT rows show visitor pass status | getActiveVisitorPasses(zoneId, allPasses, now) per ESCORT row |

</phase_requirements>

---

## Summary

Phase 8 is entirely within the frontend demo island — no backend changes. It has two distinct sub-tasks: (1) authoring a mock dataset (TypeScript constants in `seed.ts`) and (2) building three React view components wired to existing model functions and world-state.

The type system and all model functions were completed in Phases 5–7 and are frozen in `model.ts`. The planner can rely on them exactly as documented — no interface changes are needed. The zone data (ZONES, GRANTS, DELEGATES, ENTRY_LOGS, VISITOR_PASSES) is authored as plain TypeScript object arrays and appended below the SEED-HEAD boundary comment in `seed.ts`.

The UI follows established demo patterns exactly: `Card`/`Pill`/`Field`/`Select`/`DecisionTrace` from `demo/components/ui.tsx`, the `useState<ActiveView>` tab pattern from `DemoRoot.tsx`, and `useWorld()`/`useWorldDispatch()` for state. The only state extension needed is: 5 new fields on `WorldState`, their initialization in `seedWorld()`, and one new reducer action (`TOGGLE_GRANT`).

**Primary recommendation:** Plan as three sequential waves — (1) seed data + WorldState extension, (2) zone model functions integration check and `PhysicalAccessPanel` scaffold, (3) three view components.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Seed data (ZONES, GRANTS, etc.) | Frontend demo / seed.ts | — | All data is mock TypeScript; no backend |
| WorldState fields + reducer | Frontend demo / world-state.tsx | — | Existing split-context pattern extended |
| Zone Browser UI | Frontend demo / components | — | Pure React, no routing, no TanStack Router |
| Access Resolution Explorer | Frontend demo / components | model.ts (resolveZoneAccess) | Computation stays in model layer; UI is a thin shell |
| Entry Log view | Frontend demo / components | model.ts (getActiveVisitorPasses) | Filter logic is local; pass lookup delegated to model |
| DemoRoot tab extension | Frontend demo / DemoRoot.tsx | — | Single file edit: add to ActiveView union + button + render branch |

---

## Standard Stack

No new packages required. This phase uses only what is already installed.

### Core (already installed)
| Library | Purpose | Notes |
|---------|---------|-------|
| React 19 (useState, useMemo, useReducer) | Component state, derived computation | useMemo for live resolution trace recompute |
| TypeScript ~5.9.3 | Seed data typing, component props | Strict mode enforced |
| Tailwind CSS 3.4.x | All styling | Existing utility classes only |

### Demo-internal (existing)
| Module | Purpose |
|--------|---------|
| `demo/lib/model.ts` | All types and functions — FROZEN, do not modify |
| `demo/lib/seed.ts` | Append zone constants below SEED-HEAD boundary |
| `demo/store/world-state.tsx` | Extend WorldState, seedWorld(), Action, reducer |
| `demo/components/ui.tsx` | Card, Pill, Field, Select, DecisionTrace, MockTag |

**Installation:** None — no new dependencies.

---

## Package Legitimacy Audit

No packages are installed in this phase.

---

## Architecture Patterns

### System Architecture Diagram

```
seed.ts (zone constants)
    ↓ imported by
world-state.tsx (WorldState interface + seedWorld() + TOGGLE_GRANT reducer)
    ↓ via useWorld() / useWorldDispatch()
PhysicalAccessPanel (sub-nav router: Zone Browser | Access Resolution | Entry Log)
    ├── ZoneBrowser
    │     ├── zone tree (left, local expandedIds state)
    │     └── zone detail (right, Card/Pill/Field)
    ├── AccessResolutionExplorer
    │     ├── selectors (person, zone, escort)
    │     ├── useMemo → resolveZoneAccess() → DecisionTrace
    │     └── grant toggle list → TOGGLE_GRANT dispatch
    └── EntryLogView
          ├── filters (local zone + person state)
          └── entry list → getActiveVisitorPasses() per ESCORT row
```

### Recommended Project Structure (new files only)
```
frontend/src/demo/
├── lib/
│   └── seed.ts                    # APPEND zone constants below SEED-HEAD
├── store/
│   └── world-state.tsx            # EXTEND: WorldState fields, seedWorld(), TOGGLE_GRANT
└── components/
    ├── physical-access-panel.tsx  # NEW: top-level container + sub-nav
    ├── zone-browser.tsx           # NEW: tree + detail panel
    ├── access-resolution-explorer.tsx  # NEW: person/zone/escort selectors + trace
    └── entry-log-view.tsx         # NEW: filtered entry log list
```

### Pattern 1: WorldState Extension
**What:** Add 5 new fields and initialize from seed constants.
**When to use:** Whenever demo data enters the shared world.

```typescript
// In WorldState interface (world-state.tsx):
zones: ZoneNode[];
grants: PhysicalAccessGrant[];
delegates: ZoneAccessDelegate[];
entryLogs: ZoneEntryLog[];
visitorPasses: ZoneVisitorPass[];

// In seedWorld():
zones: ZONES,
grants: GRANTS,
delegates: DELEGATES,
entryLogs: ENTRY_LOGS,
visitorPasses: VISITOR_PASSES,
// disabledGrantIds is reducer-only state, NOT in WorldState seed
```

### Pattern 2: TOGGLE_GRANT Action — Discriminated Union
**What:** New action in the Action union; reducer case maintains `disabledGrantIds: Set<string>` as a WorldState field initialized to `new Set()`.

```typescript
// Action union addition:
| { type: "TOGGLE_GRANT"; grantId: string }

// WorldState addition:
disabledGrantIds: Set<string>;

// seedWorld() addition:
disabledGrantIds: new Set<string>(),

// Reducer case:
case "TOGGLE_GRANT": {
  const next = new Set(state.disabledGrantIds);
  if (next.has(action.grantId)) next.delete(action.grantId);
  else next.add(action.grantId);
  return { ...state, disabledGrantIds: next };
}
```

**Note:** `Set` is mutable but the spread `new Set(state.disabledGrantIds)` creates a new object — satisfying the immutable-update requirement and triggering React re-render.

### Pattern 3: Live Resolution via useMemo
**What:** Access Resolution Explorer computes result on every selector change without storing it.
**Example:**

```typescript
const activeGrants = useMemo(
  () => world.grants.filter(g => !world.disabledGrantIds.has(g.id) && isGrantActive(g, now)),
  [world.grants, world.disabledGrantIds]
);

const escortHasGrant = useMemo(
  () => escortId !== "none"
    ? resolveGrant(escortId, selectedZone, world.zones, activeGrants, now) !== null
    : false,
  [escortId, selectedZone, world.zones, activeGrants]
);

const result = useMemo(
  () => resolveZoneAccess(personId, selectedZone, person.clearance, escortHasGrant, world.zones, activeGrants, now),
  [personId, selectedZone, person, escortHasGrant, activeGrants]
);
```

### Pattern 4: ZoneAccessResult → DecisionTrace rows
**What:** `DecisionTrace` in `ui.tsx` expects a `Decision` type from `abac.ts` (with `.rules` array, `.overrides` array, `.decision` string). `ZoneAccessResult` has a different shape. The planner must build an adapter.

**Critical finding:** `DecisionTrace` is typed to `Decision` from `../lib/abac`, NOT to `ZoneAccessResult`. The Phase 8 resolution explorer CANNOT pass `ZoneAccessResult` directly to `DecisionTrace`. Two options:
1. Build a local `ZoneResolutionTrace` component (simpler pattern, matches `DecisionTrace` visually but is its own component)
2. Adapt `ZoneAccessResult` to a `Decision`-shaped object before passing (more coupling)

**Recommendation:** Option 1 — a new `ZoneResolutionTrace` component local to `access-resolution-explorer.tsx` that renders the gate rows using the same Tailwind classes as `DecisionTrace` but accepts `ZoneAccessResult`. This avoids changing the frozen `ui.tsx` and avoids forcing `ZoneAccessResult` into the ABAC `Decision` type.

The UI-SPEC copywriting contract provides the exact prose labels: "Grant found" / "No grant", "Zone type rule", "Clearance", "Escort".

### Pattern 5: Zone Tree Rendering
**What:** BFS/recursive render of the zone hierarchy using `getDescendants` or direct `parent_id` filtering.

```typescript
// Build root-level nodes:
const roots = world.zones.filter(z => z.parent_id === null);
// Children of a node:
const childrenOf = (id: string) => world.zones.filter(z => z.parent_id === id);
// Expand/collapse: local Set<string> of expanded node ids
const [expanded, setExpanded] = useState<Set<string>>(new Set());
```

Indentation: `style={{ marginLeft: depth * 16 }}` or `ml-4` per depth (UI-SPEC).

### Anti-Patterns to Avoid

- **Storing derived resolution result in WorldState:** Decision is always derived via useMemo. Storing it in the reducer violates the established MODEL-02 pattern (R2 from existing codebase).
- **Mutating the seed arrays:** The SEED-HEAD boundary comment is a hard invariant. Zone constants must be new `const` declarations appended BELOW the last existing export at the bottom of `seed.ts`.
- **Passing ZoneAccessResult directly to DecisionTrace:** DecisionTrace is typed to the ABAC `Decision` type — incompatible shapes. Build a local trace component.
- **Adding zone fields to DemoRoot.tsx imports:** DemoRoot should import only `PhysicalAccessPanel` — zone data is accessed inside via `useWorld()`.
- **Using `useMemo` with stale `now` Date:** Create `const now = useMemo(() => new Date(), [])` at component mount — do not call `new Date()` inside render or other memos to avoid clock drift across re-renders in the same session.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Zone ancestor chain | Custom parent-walk loop | `getAncestors(zoneId, allZones)` in model.ts | Already cycle-guarded and tested |
| Zone subtree listing | Custom BFS | `getDescendants(zoneId, allZones)` in model.ts | Already cycle-guarded and tested |
| Grant time-window check | Date comparison logic | `isGrantActive(grant, now)` in model.ts | Handles null boundaries correctly |
| Access resolution | Custom gate logic | `resolveZoneAccess(...)` in model.ts | Two-gate logic with zone_type dispatch, tested in Phases 5–6 |
| Escort grant check | Inline boolean | `resolveGrant(escortId, zone, ...)` in model.ts | Ancestor walk with type scoping |
| Active visitor passes | Filter loop | `getActiveVisitorPasses(zoneId, passes, now)` in model.ts | Handles both boundaries |

---

## Seed Data Design

This section documents the seed dataset constraints needed to satisfy SEED-01 through SEED-09.

### Persons Available (subj-1..4, per D-02)

| ID | Name | Clearance | Notes |
|----|------|-----------|-------|
| subj-1 | Dana Reyes | SECRET | Can enter RESTRICTED + SECURED |
| subj-2 | Sam Okafor | TOP_SECRET | Can enter all zone types |
| subj-3 | Lee Park | CONFIDENTIAL | Can enter CONTROLLED + RESTRICTED (not SECURED) |
| subj-4 | Mara Vance | TOP_SECRET | Can enter all zone types |

### Org IDs Available (from UnitId)
`MILITARY_1`, `MILITARY_2`, `INTEL`, `INFRA`, `INDUSTRY`, `HOME_GUARD` — use these as `admin_org_id` and `asset_owner_org_id` in zone nodes.

### Required Zone Scenario (minimum to satisfy SEED-01..09)

At minimum the dataset must contain:
1. **3 root SITE nodes** (SEED-01), each with at least one subtree
2. **Mix of zone_types** — at least one CONTROLLED, one RESTRICTED, one SECURED (SEED-02). SECURED never at SITE or AREA level.
3. **Inheritance chain** — e.g. CONTROLLED Building with CONTROLLED Room children; a grant at Building level covers the Room (SEED-04)
4. **Explicit exclusion** — e.g. a SECURED or RESTRICTED node inside the CONTROLLED building, with `requires_explicit_auth: true` or higher zone_type blocking inheritance (SEED-05)
5. **Delegation** — one PERSON delegate record, one ORG delegate record (SEED-06)
6. **Entry logs** — at least one CARD entry, at least one ESCORT entry; ESCORT must have `escort_person_id` (SEED-07)
7. **Visitor pass** — one `ZoneVisitorPass` linked to the ESCORT entry log record (SEED-08)
8. **Grant time variety** — at least one grant with `valid_until` in the past (expired), one with `valid_from` in the future (future), and permanent grants (`valid_from: null, valid_until: null`) as the majority (SEED-09)

### Suggested 3-Site Scenario

```
Site: Alpha Command (MILITARY_1 admin)   [CONTROLLED]
  Area: North Wing                        [CONTROLLED]
    Building: Block A                     [CONTROLLED]
      Zone: Server Room Corridor          [CONTROLLED, requires_explicit_auth: false]
        Room: Server Room 1               [CONTROLLED]
      Zone: Secure Lab                    [SECURED, requires_explicit_auth: true]  ← explicit exclusion (SEED-05)

Site: Intel Campus (INTEL admin)         [RESTRICTED]
  Building: Analysis Wing                 [RESTRICTED]
    Room: SIGINT Suite                    [SECURED, requires_explicit_auth: true]  ← SECURED at ROOM level (SEED-02)

Site: Logistics Hub (INFRA admin)        [CONTROLLED]
  Area: Yard                              [CONTROLLED]
    Building: Warehouse A                 [CONTROLLED]
      Room: Supply Room                   [CONTROLLED]   ← inheritance demo (SEED-04)
```

This gives 3 sites, all three zone_type values, SECURED at BUILDING/ROOM only, an inheritance chain, and an explicit exclusion.

### Grant Design for Demo Interactivity (D-05/D-13 TOGGLE_GRANT)

For the Access Resolution Explorer toggle demo, the most impactful setup is:
- subj-1 (Dana, SECRET) has a grant at `Building: Block A` (CONTROLLED) — covers CONTROLLED children by inheritance
- subj-1 has an additional explicit grant at `Zone: Secure Lab` (SECURED) — when toggled off, shows DENY even though parent grant exists
- subj-2 (Sam, TOP_SECRET) has a Site-level grant (≤2 such grants per SEED-03)

---

## Common Pitfalls

### Pitfall 1: DecisionTrace Type Incompatibility
**What goes wrong:** Passing `ZoneAccessResult` directly to `<DecisionTrace result={...} />` — TypeScript will error because `DecisionTrace` is typed to `Decision` from `abac.ts`.
**Why it happens:** Both are resolution result types but from different domains (ABAC vs. zone access).
**How to avoid:** Build a local `ZoneResolutionTrace` component inside `access-resolution-explorer.tsx` that renders `ZoneAccessResult` directly using the same Tailwind classes. Do not change `ui.tsx`.
**Warning signs:** TS error on the `result` prop — `Property 'decision' is missing / Property 'rules' is missing`.

### Pitfall 2: Set Immutability in Reducer
**What goes wrong:** `state.disabledGrantIds.add(id); return { ...state }` — mutates the existing Set, React does not re-render because the Set reference is unchanged.
**Why it happens:** Set is a mutable object; spread only shallow-copies the top-level.
**How to avoid:** Always `new Set(state.disabledGrantIds)` before mutating: `const next = new Set(state.disabledGrantIds); next.add(id); return { ...state, disabledGrantIds: next };`
**Warning signs:** Checkboxes toggle but DecisionTrace does not update.

### Pitfall 3: SEED-HEAD Boundary Violation
**What goes wrong:** Editing existing records above the boundary (re-ordering, renaming IDs, adding fields) breaks the existing test fixture assertions (R9 invariant).
**Why it happens:** It looks safe to reorganize seed.ts imports while adding zone constants.
**How to avoid:** Append ONLY. New `export const ZONES`, `export const GRANTS`, etc. go at the very bottom of `seed.ts`, after all existing `SUBJECTS.push(...)` and `HUB_INDEX.push(...)` calls.
**Warning signs:** Existing ABAC tests fail after Phase 8 changes.

### Pitfall 4: Stale `now` in useMemo
**What goes wrong:** `new Date()` called inside a useMemo with no dependencies — React may reuse the memo across renders, making `now` stale. Or it's called in multiple places and differs by milliseconds causing inconsistent active/expired states across components.
**How to avoid:** Define `const now = useMemo(() => new Date(), [])` once at the component root. Pass it down or use a shared constant. For a demo, a single stable `now` per mount is correct.

### Pitfall 5: Relevant Grants Panel Scope
**What goes wrong:** The grant toggle list shows ALL grants (unfiltered), making it hard to see which grants are relevant to the selected zone.
**Why it happens:** It's simpler to list all grants.
**How to avoid:** Filter the toggle list to grants whose `zone_id` equals the selected zone OR is an ancestor of it — i.e., `[selectedZone, ...getAncestors(selectedZone.id, allZones)].map(z => z.id)`. This matches the set resolveGrant actually consults.

### Pitfall 6: ESCORT Entry Without Matching Visitor Pass
**What goes wrong:** An ESCORT entry log record exists but no `ZoneVisitorPass` with `entry_log_id` matching it — the UI shows "No pass on record" instead of an active pass badge, which looks like a data bug.
**Why it happens:** Seed data oversight — the entry log and visitor pass are authored separately.
**How to avoid:** For every ESCORT entry log in the seed, ensure a corresponding `ZoneVisitorPass` with the same `entry_log_id`. Only some passes need to be currently active (SEED-09 mix applies to passes too).

---

## Code Examples

### Verified Pattern: resolveZoneAccess signature (from model.ts)

```typescript
// Source: frontend/src/demo/lib/model.ts (read directly)
resolveZoneAccess(
  personId: string,
  zone: ZoneNode,
  clearance: Clearance,
  hasValidEscort: boolean,
  allZones: ZoneNode[],
  allGrants: PhysicalAccessGrant[],
  now: Date,
): ZoneAccessResult
```

### Verified Pattern: ZoneAccessResult shape (from model.ts)

```typescript
// Source: frontend/src/demo/lib/model.ts
export interface ZoneAccessResult {
  allow: boolean;
  gate: "GRANT_LOOKUP" | "ZONE_TYPE_RULE";
  reason: "GRANT_FOUND" | "NO_GRANT" | "INSUFFICIENT_CLEARANCE";
  detail?: string;
}
```

### Verified Pattern: Existing tab button pattern (from DemoRoot.tsx)

```typescript
// Source: frontend/src/demo/DemoRoot.tsx
<button
  className={`rounded px-3 py-1.5 text-sm ${
    activeView === "decisions"
      ? "bg-slate-800 text-white"
      : "border border-slate-300 text-slate-600 hover:bg-slate-50"
  }`}
  onClick={() => setActiveView("decisions")}
>
  Decision Explorer
</button>
```

The Physical Access tab button follows this exact pattern. Inner sub-nav uses `px-4 py-2` per the UI-SPEC.

### Verified Pattern: Seed append location (from seed.ts)

The last lines of `seed.ts` are:
```typescript
SUPPORT_OBLIGATIONS: { from: UnitId; to: UnitId }[] = [...]
```
Zone constants go AFTER this block, e.g.:
```typescript
// ============================================================
// Phase 8: Physical Access Zone Seed Data
// ============================================================
export const ZONES: ZoneNode[] = [...];
export const GRANTS: PhysicalAccessGrant[] = [...];
export const DELEGATES: ZoneAccessDelegate[] = [...];
export const ENTRY_LOGS: ZoneEntryLog[] = [...];
export const VISITOR_PASSES: ZoneVisitorPass[] = [...];
```

### Verified Pattern: worldState split-context import pattern (from world-state.tsx)

```typescript
// Source: frontend/src/demo/store/world-state.tsx
export function useWorld(): WorldState { ... }
export function useWorldDispatch(): Dispatch<Action> { ... }
```
Components import both: `import { useWorld, useWorldDispatch } from '../store/world-state'`.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| 4-tier clearance (UNCLASSIFIED → CONFIDENTIAL → SECRET → TOP_SECRET) | 5-tier (+ RESTRICTED between UNCLASSIFIED and CONFIDENTIAL) | Phase 5 (v2.1) | RESTRICTED clearance needed for RESTRICTED zone entry (ACCESS-03) |
| No physical zone model | ZoneNode hierarchy with zone_type + explicit_auth | Phase 5 | Seed must use the new interface exactly |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `disabledGrantIds: Set<string>` is the cleanest representation for TOGGLE_GRANT state | Architecture Patterns §TOGGLE_GRANT | If a flag on the grant object were preferred, WorldState would need a `grants: (PhysicalAccessGrant & {disabled?: boolean})[]` type — more complex but planner could choose it |
| A2 | A local `ZoneResolutionTrace` component (not adapting to `Decision`) is the correct approach for rendering ZoneAccessResult | Common Pitfalls §Pitfall 1 | If the planner opts for an adapter, it works but introduces ABAC type coupling |
| A3 | Org IDs in zone nodes use `UnitId` string values (e.g. "MILITARY_1") as they map to the existing UNITS record in model.ts | Seed Data Design | If zone admin orgs need separate string IDs, the UI labels would need a separate lookup; using UnitId means `unitName(admin_org_id as UnitId)` works directly |

---

## Open Questions (RESOLVED)

1. **ZoneResolutionTrace vs DecisionTrace adapter**
   - What we know: DecisionTrace accepts `Decision` (ABAC type); ZoneAccessResult has a different shape
   - What's unclear: Whether to build a new component or adapt to the Decision type
   - Recommendation: Build `ZoneResolutionTrace` as a local component — less coupling, simpler TypeScript

2. **`now` reference for seed dates**
   - What we know: Seed needs active, expired, and future grants (SEED-09)
   - What's unclear: Whether to use a fixed reference date (e.g. `new Date("2026-05-23")`) or relative offsets from runtime `new Date()`
   - Recommendation: Use a fixed reference date in the seed (e.g. `const SEED_NOW = new Date("2026-05-23")`), then set `valid_until = new Date("2026-03-01")` for expired and `valid_from = new Date("2026-08-01")` for future. Runtime `now` will then naturally produce the correct active/expired/future states.

---

## Environment Availability

Step 2.6: SKIPPED — this phase makes no external tool calls; all changes are TypeScript source edits within the existing frontend project.

---

## Validation Architecture

`workflow.nyquist_validation` is explicitly `false` in `.planning/config.json` — this section is omitted per config.

---

## Security Domain

This phase is demo/mock only with no backend changes, no authentication, no network requests, and no user data. All data is in-memory TypeScript constants. ASVS categories do not apply to a local demo island with no persistence or network surface.

---

## Sources

### Primary (HIGH confidence — read directly from codebase)
- `frontend/src/demo/lib/model.ts` — All type interfaces and function signatures verified by direct read
- `frontend/src/demo/lib/seed.ts` — SEED-HEAD boundary location, existing subjects (subj-1..4) and their clearances confirmed
- `frontend/src/demo/store/world-state.tsx` — WorldState interface, Action union, reducer pattern, seedWorld() confirmed
- `frontend/src/demo/DemoRoot.tsx` — Tab button pattern, ActiveView union, 5-tab current state confirmed
- `frontend/src/demo/components/ui.tsx` — Card/Pill/Field/Select/DecisionTrace/MockTag signatures; DecisionTrace typed to `Decision` (not ZoneAccessResult) confirmed
- `.planning/phases/08-mock-dataset-demo-ui/08-CONTEXT.md` — All decisions D-01..D-13
- `.planning/phases/08-mock-dataset-demo-ui/08-UI-SPEC.md` — Layout contracts, color tokens, component inventory, copywriting
- `.planning/REQUIREMENTS.md` — SEED-01..09, UI-01..06 requirement text
- `.planning/ROADMAP.md` — Phase 8 success criteria

### Secondary (MEDIUM confidence)
- `frontend/src/demo/components/DecisionExplorer.tsx` — Confirmed useMemo derivation pattern (R2), useWorld/useWorldDispatch usage, and groupByUnit helper pattern

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; all libraries confirmed by direct file read
- Architecture: HIGH — all integration points confirmed by reading actual source files
- Pitfalls: HIGH — most discovered by reading the actual type signatures (e.g. DecisionTrace/Decision type mismatch)
- Seed data design: MEDIUM — the specific zone topology is Claude's Discretion; the constraints are HIGH confidence from requirements

**Research date:** 2026-05-23
**Valid until:** Stable (all source is local, frozen per phase convention)
