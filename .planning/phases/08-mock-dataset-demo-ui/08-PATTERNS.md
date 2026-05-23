# Phase 8: Mock Dataset & Demo UI - Pattern Map

**Mapped:** 2026-05-23
**Files analyzed:** 7
**Analogs found:** 7 / 7

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `frontend/src/demo/lib/seed.ts` (append) | config/data | batch | same file — existing SUBJECTS/RESOURCES constants | exact |
| `frontend/src/demo/store/world-state.tsx` (extend) | store | event-driven | same file — existing WorldState/Action/reducer | exact |
| `frontend/src/demo/DemoRoot.tsx` (extend) | component | request-response | same file — existing 5-tab ActiveView pattern | exact |
| `frontend/src/demo/components/PhysicalAccessPanel.tsx` (create) | component | request-response | `DemoRoot.tsx` inner tab pattern | role-match |
| `frontend/src/demo/components/ZoneBrowser.tsx` (create) | component | request-response | `DecisionExplorer.tsx` — Card/Field/Pill layout | role-match |
| `frontend/src/demo/components/AccessResolutionExplorer.tsx` (create) | component | event-driven | `DecisionExplorer.tsx` — useMemo derivation + dispatch | exact |
| `frontend/src/demo/components/ZoneEntryLogView.tsx` (create) | component | request-response | `AuditView.tsx` / `DecisionExplorer.tsx` list rendering | role-match |

---

## Pattern Assignments

### `frontend/src/demo/lib/seed.ts` (append zone constants)

**Analog:** Same file — existing seed constant block structure.

**Append location** — last 6 lines of current file (lines 940–945):
```typescript
export const SUPPORT_OBLIGATIONS: { from: UnitId; to: UnitId }[] = [
  { from: "INFRA", to: "MILITARY_1" },
  { from: "MILITARY_2", to: "MILITARY_1" },
  { from: "INFRA", to: "MILITARY_2" },
];
// <-- zone constants go HERE, after this block
```

**Imports to add at top of file** — add zone types to the existing import from `./model`:
```typescript
// Current imports from ./model (lines 6-15) include: Subject, Resource, HubPointer, UnitId, AttrEvent, Subunit, EntityPolicy
// Add these types:
import type {
  ZoneNode,
  PhysicalAccessGrant,
  ZoneAccessDelegate,
  ZoneEntryLog,
  ZoneVisitorPass,
} from "./model";
```

**Constant block pattern** — follow the boundary-comment + typed export pattern used for SUBUNITS/SUPPORT_OBLIGATIONS:
```typescript
// ============================================================
// Phase 8: Physical Access Zone Seed Data
// ============================================================

export const ZONES: ZoneNode[] = [
  {
    id: "zone-site-alpha",
    name: "Alpha Command",
    level: "SITE",
    zone_type: "CONTROLLED",
    parent_id: null,
    admin_org_id: "MILITARY_1",
    asset_owner_org_id: "MILITARY_1",
    requires_explicit_auth: false,
  },
  // ... more nodes
];

export const GRANTS: PhysicalAccessGrant[] = [
  {
    id: "grant-1",
    person_id: "subj-1",
    zone_id: "zone-building-block-a",
    valid_from: null,
    valid_until: null,           // permanent grant
  },
  // ... more grants
];

export const DELEGATES: ZoneAccessDelegate[] = [...];
export const ENTRY_LOGS: ZoneEntryLog[] = [...];
export const VISITOR_PASSES: ZoneVisitorPass[] = [...];
```

**SEED-HEAD invariant:** All new `export const` declarations go AFTER line 945 (after `SUPPORT_OBLIGATIONS`). Do NOT modify anything above that line.

---

### `frontend/src/demo/store/world-state.tsx` (extend WorldState + reducer)

**Analog:** Same file — existing WorldState interface, seedWorld(), Action union, reducer.

**Imports to add** (append to existing import from `../lib/seed`, lines 30–35):
```typescript
// Current (lines 30-35):
import {
  AGREEMENTS,
  HUB_INDEX,
  INITIAL_EVENTS,
  RESOURCES,
  SUBJECTS,
} from "../lib/seed";

// Extended (add the 5 new seed constants):
import {
  AGREEMENTS,
  DELEGATES,
  ENTRY_LOGS,
  GRANTS,
  HUB_INDEX,
  INITIAL_EVENTS,
  RESOURCES,
  SUBJECTS,
  VISITOR_PASSES,
  ZONES,
} from "../lib/seed";
```

**Type imports to add** (append to existing import from `../lib/model`, lines 7–28):
```typescript
// Add to the existing import block:
import type {
  PhysicalAccessGrant,
  ZoneAccessDelegate,
  ZoneEntryLog,
  ZoneNode,
  ZoneVisitorPass,
  // ... existing types already imported
} from "../lib/model";
```

**WorldState interface extension** — add 6 fields after `fedOutbox` (line 78):
```typescript
export interface WorldState {
  // ... existing fields (lines 64-79) unchanged ...
  fedOutbox: Partial<Record<UnitId, OutboxEntry[]>>;
  fedVerifyResults: { valid: VerifyResult | null; rogue: VerifyResult | null };
  // Phase 8 additions:
  zones: ZoneNode[];
  grants: PhysicalAccessGrant[];
  delegates: ZoneAccessDelegate[];
  entryLogs: ZoneEntryLog[];
  visitorPasses: ZoneVisitorPass[];
  disabledGrantIds: Set<string>;
}
```

**seedWorld() extension** — add 6 fields after `fedVerifyResults` (lines 104–106):
```typescript
export function seedWorld(): WorldState {
  // ... existing fields (lines 84-106) unchanged ...
  return {
    // existing fields...
    fedVerifyResults: { valid: null, rogue: null },
    // Phase 8 additions:
    zones: ZONES,
    grants: GRANTS,
    delegates: DELEGATES,
    entryLogs: ENTRY_LOGS,
    visitorPasses: VISITOR_PASSES,
    disabledGrantIds: new Set<string>(),
  };
}
```

**Action union extension** — add one case after `FEDERATION_RESET` (line 152):
```typescript
export type Action =
  // ... existing cases (lines 110-152) unchanged ...
  | { type: "FEDERATION_RESET" }
  | { type: "TOGGLE_GRANT"; grantId: string };  // Phase 8
```

**Reducer case** — add after `FEDERATION_RESET` case (lines 423–426), before the `default` branch. Follow the existing immutable-update pattern:
```typescript
case "TOGGLE_GRANT": {
  // Immutable Set update — new Set() so React re-renders (Pitfall 2 guard).
  const next = new Set(state.disabledGrantIds);
  if (next.has(action.grantId)) next.delete(action.grantId);
  else next.add(action.grantId);
  return { ...state, disabledGrantIds: next };
}
```

---

### `frontend/src/demo/DemoRoot.tsx` (add 6th tab)

**Analog:** Same file — existing 5-tab ActiveView/button row/conditional render (lines 1–72).

**ActiveView union extension** (line 15–20):
```typescript
// Current:
type ActiveView =
  | "decisions"
  | "federation"
  | "entity-console"
  | "audit"
  | "context";

// Extended:
type ActiveView =
  | "decisions"
  | "federation"
  | "entity-console"
  | "audit"
  | "context"
  | "physical-access";   // Phase 8
```

**Import to add** (after line 13):
```typescript
import { PhysicalAccessPanel } from "./components/PhysicalAccessPanel";
```

**Tab button to add** — copy the exact button pattern from lines 55–61 (Context button), changing strings:
```typescript
<button
  className={`rounded px-3 py-1.5 text-sm ${activeView === "physical-access" ? "bg-slate-800 text-white" : "border border-slate-300 text-slate-600 hover:bg-slate-50"}`}
  onClick={() => setActiveView("physical-access")}
>
  Physical Access
</button>
```

**Conditional render to add** (after line 67):
```typescript
{activeView === "physical-access" && <PhysicalAccessPanel />}
```

---

### `frontend/src/demo/components/PhysicalAccessPanel.tsx` (create new)

**Analog:** `DemoRoot.tsx` (lines 15–71) — the inner sub-nav is the same pattern as the outer tab bar, but for 3 sub-views inside this panel. Also mirrors `FederationHub.tsx` (lines 61–73) as a thin composition shell.

**Component file header comment pattern** (from `FederationHub.tsx` line 1):
```typescript
// PhysicalAccessPanel.tsx — Physical Access tab: inner sub-nav + three views.
// Sub-nav pattern matches outer DemoRoot tab bar (rounded px-3 py-1.5 text-sm).
// Zone data accessed via useWorld() inside child components, not passed as props.
```

**Imports pattern** (from `FederationHub.tsx` lines 3–9 and `DecisionExplorer.tsx` line 21):
```typescript
import { useState } from "react";
import { ZoneBrowser } from "./ZoneBrowser";
import { AccessResolutionExplorer } from "./AccessResolutionExplorer";
import { ZoneEntryLogView } from "./ZoneEntryLogView";
```

**Core pattern** — replicate the DemoRoot outer tab structure (lines 22–72) as an inner sub-nav. Inner buttons use `px-4 py-2` per UI-SPEC (outer uses `px-3 py-1.5`):
```typescript
type PhysicalView = "zone-browser" | "access-resolution" | "entry-log";

export function PhysicalAccessPanel() {
  const [activeView, setActiveView] = useState<PhysicalView>("zone-browser");

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          className={`rounded px-4 py-2 text-sm ${activeView === "zone-browser" ? "bg-slate-800 text-white" : "border border-slate-300 text-slate-600 hover:bg-slate-50"}`}
          onClick={() => setActiveView("zone-browser")}
        >
          Zone Browser
        </button>
        <button
          className={`rounded px-4 py-2 text-sm ${activeView === "access-resolution" ? "bg-slate-800 text-white" : "border border-slate-300 text-slate-600 hover:bg-slate-50"}`}
          onClick={() => setActiveView("access-resolution")}
        >
          Access Resolution
        </button>
        <button
          className={`rounded px-4 py-2 text-sm ${activeView === "entry-log" ? "bg-slate-800 text-white" : "border border-slate-300 text-slate-600 hover:bg-slate-50"}`}
          onClick={() => setActiveView("entry-log")}
        >
          Entry Log
        </button>
      </div>
      {activeView === "zone-browser" && <ZoneBrowser />}
      {activeView === "access-resolution" && <AccessResolutionExplorer />}
      {activeView === "entry-log" && <ZoneEntryLogView />}
    </div>
  );
}
```

---

### `frontend/src/demo/components/ZoneBrowser.tsx` (create new)

**Analog:** `DecisionExplorer.tsx` — Card/Field/Pill layout (lines 121–216), grouped selectors, left/right split. Zone tree expand/collapse uses local state only.

**Imports pattern** (from `DecisionExplorer.tsx` lines 6–21):
```typescript
import { useState, useMemo } from "react";
import { unitName, type ZoneNode, type ZoneType, getAncestors } from "../lib/model";
import { useWorld } from "../store/world-state";
import { Card, Field, Pill } from "./ui";
```

**ZoneType → Pill tone mapping** (UI-SPEC):
```typescript
const ZONE_TYPE_TONE: Record<ZoneType, "slate" | "amber" | "red"> = {
  CONTROLLED: "slate",
  RESTRICTED: "amber",
  SECURED: "red",
};
```

**Zone tree local state** — expand/collapse as `Set<string>` (never in WorldState per D-06 rationale; pure UI state):
```typescript
const [expanded, setExpanded] = useState<Set<string>>(new Set());
const [selectedId, setSelectedId] = useState<string | null>(null);
```

**Zone tree node rendering** — depth-based indentation via inline style:
```typescript
function ZoneTreeNode({ zone, depth, allZones, expanded, onToggle, selectedId, onSelect }: ...) {
  const children = allZones.filter(z => z.parent_id === zone.id);
  const isExpanded = expanded.has(zone.id);

  return (
    <div style={{ marginLeft: depth * 16 }}>
      <button
        className={`flex w-full items-center gap-1 rounded px-2 py-1 text-sm text-left ${selectedId === zone.id ? "bg-slate-200" : "hover:bg-slate-100"}`}
        onClick={() => onSelect(zone.id)}
      >
        {children.length > 0 && (
          <span onClick={(e) => { e.stopPropagation(); onToggle(zone.id); }} className="text-slate-400 w-4">
            {isExpanded ? "▾" : "▸"}
          </span>
        )}
        <Pill tone={ZONE_TYPE_TONE[zone.zone_type]}>{zone.zone_type}</Pill>
        <span className="ml-1">{zone.name}</span>
      </button>
      {isExpanded && children.map(child => (
        <ZoneTreeNode key={child.id} zone={child} depth={depth + 1} ... />
      ))}
    </div>
  );
}
```

**Two-panel layout** — left tree, right detail, matching `DecisionExplorer.tsx` grid (line 130):
```typescript
<div className="grid gap-4 sm:grid-cols-2">
  <Card title="Zone Hierarchy">
    {roots.map(zone => <ZoneTreeNode key={zone.id} zone={zone} depth={0} ... />)}
  </Card>
  <Card title="Zone Detail">
    {selected ? <ZoneDetailPanel zone={selected} ... /> : <p className="text-sm text-slate-400">Select a zone</p>}
  </Card>
</div>
```

**Detail panel fields** — use `Field` component (from `ui.tsx` lines 60–75):
```typescript
function ZoneDetailPanel({ zone, allZones, allGrants, allDelegates, now }: ...) {
  const ancestors = getAncestors(zone.id, allZones);
  const activeGrants = allGrants.filter(g => g.zone_id === zone.id && isGrantActive(g, now));
  return (
    <div className="space-y-3">
      <Field label="Zone Type"><Pill tone={ZONE_TYPE_TONE[zone.zone_type]}>{zone.zone_type}</Pill></Field>
      <Field label="Level"><span className="text-sm">{zone.level}</span></Field>
      <Field label="Admin Org"><span className="text-sm">{unitName(zone.admin_org_id as UnitId)}</span></Field>
      <Field label="Asset Owner"><span className="text-sm">{unitName(zone.asset_owner_org_id as UnitId)}</span></Field>
      {/* breadcrumb */}
      {/* active grants list */}
      {/* delegate list */}
    </div>
  );
}
```

---

### `frontend/src/demo/components/AccessResolutionExplorer.tsx` (create new)

**Analog:** `DecisionExplorer.tsx` (lines 73–318) — useMemo derivation pattern, useWorld/useWorldDispatch, Card/Field/Select layout, inline dispatch for toggle actions.

**CRITICAL:** Do NOT use `<DecisionTrace />` — it is typed to `Decision` from `abac.ts`, not `ZoneAccessResult`. Build a local `ZoneResolutionTrace` component (see Pattern below).

**Imports pattern** (from `DecisionExplorer.tsx` lines 6–22):
```typescript
import { useMemo, useState } from "react";
import {
  CLEARANCE_RANK,
  isGrantActive,
  resolveGrant,
  resolveZoneAccess,
  unitName,
  type Clearance,
  type PhysicalAccessGrant,
  type UnitId,
  type ZoneAccessResult,
  type ZoneNode,
} from "../lib/model";
import { useWorld, useWorldDispatch } from "../store/world-state";
import { Card, Field, Pill, Select } from "./ui";
```

**Stable `now` reference** (Pitfall 4 guard — from RESEARCH §Pitfall 4):
```typescript
const now = useMemo(() => new Date(), []);
```

**Three-stage useMemo derivation** (from `DecisionExplorer.tsx` lines 82–91 pattern):
```typescript
// Stage 1: active grants (filter out disabled)
const activeGrants = useMemo(
  () => world.grants.filter(g => !world.disabledGrantIds.has(g.id) && isGrantActive(g, now)),
  [world.grants, world.disabledGrantIds, now],
);

// Stage 2: escort check
const escortHasGrant = useMemo(
  () => escortId !== "none" && selectedZone !== null
    ? resolveGrant(escortId, selectedZone, world.zones, activeGrants, now) !== null
    : false,
  [escortId, selectedZone, world.zones, activeGrants, now],
);

// Stage 3: full resolution
const result = useMemo(
  () => personId && selectedZone && person
    ? resolveZoneAccess(personId, selectedZone, person.clearance as Clearance, escortHasGrant, world.zones, activeGrants, now)
    : null,
  [personId, selectedZone, person, escortHasGrant, world.zones, activeGrants, now],
);
```

**TOGGLE_GRANT dispatch** (from `DecisionExplorer.tsx` lines 234–243 pattern for button dispatch):
```typescript
const dispatch = useWorldDispatch();
// In grant toggle checkbox handler:
dispatch({ type: "TOGGLE_GRANT", grantId: grant.id });
```

**Relevant grants panel scope** (Pitfall 5 guard — filter to zone + ancestors):
```typescript
const relevantZoneIds = useMemo(
  () => selectedZone
    ? new Set([selectedZone.id, ...getAncestors(selectedZone.id, world.zones).map(z => z.id)])
    : new Set<string>(),
  [selectedZone, world.zones],
);
const relevantGrants = world.grants.filter(g => g.person_id === personId && relevantZoneIds.has(g.zone_id));
```

**ZoneResolutionTrace local component** (replaces DecisionTrace — renders ZoneAccessResult directly):
```typescript
function ZoneResolutionTrace({ result }: { result: ZoneAccessResult }) {
  const allow = result.allow;
  return (
    <div className={`rounded-lg border p-4 ${allow ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
      <div className="text-lg font-bold">{allow ? "✓ ALLOW" : "✗ DENY"}</div>
      <ul className="mt-3 space-y-1.5">
        <li className="flex gap-2 text-sm">
          <span className={result.gate === "GRANT_LOOKUP" && result.reason === "GRANT_FOUND" || result.gate !== "GRANT_LOOKUP" ? "text-green-600" : "text-red-600"}>
            {/* pass/fail icon */}
          </span>
          <span className="w-28 shrink-0 font-medium">Grant found</span>
          <span className="text-slate-600">{result.reason === "NO_GRANT" ? "No active grant for this zone" : "Grant resolved"}</span>
        </li>
        <li className="flex gap-2 text-sm">
          <span className={allow || result.reason !== "INSUFFICIENT_CLEARANCE" ? "text-green-600" : "text-red-600"}>...</span>
          <span className="w-28 shrink-0 font-medium">Zone type rule</span>
          <span className="text-slate-600">{result.gate === "ZONE_TYPE_RULE" ? result.detail ?? result.reason : "—"}</span>
        </li>
        {/* clearance row, escort row */}
      </ul>
    </div>
  );
}
```

**Three-column selector grid** (from `DecisionExplorer.tsx` lines 130–215 — `grid gap-4 sm:grid-cols-3`):
```typescript
<div className="grid gap-4 sm:grid-cols-3">
  <Card><Field label="Person"><Select .../></Field></Card>
  <Card><Field label="Zone"><Select .../></Field></Card>
  <Card><Field label="Escort (optional)"><Select .../></Field></Card>
</div>
```

---

### `frontend/src/demo/components/ZoneEntryLogView.tsx` (create new)

**Analog:** `DecisionExplorer.tsx` Audit log section (lines 300–314) — scrollable list with Card wrapper, `max-h-40 space-y-1 overflow-auto`. Local filter state (not in WorldState).

**Imports pattern:**
```typescript
import { useMemo, useState } from "react";
import {
  getActiveVisitorPasses,
  type ZoneEntryLog,
  type ZoneNode,
} from "../lib/model";
import { useWorld } from "../store/world-state";
import { Card, Field, Pill, Select } from "./ui";
```

**Local filter state** (per D, discretion on filtering UI):
```typescript
const [zoneFilter, setZoneFilter] = useState<string>("all");
const [personFilter, setPersonFilter] = useState<string>("all");
```

**Stable `now`** (same pattern as AccessResolutionExplorer):
```typescript
const now = useMemo(() => new Date(), []);
```

**Filtered + sorted entries** (UI-05 — entry_at descending):
```typescript
const filtered = useMemo(
  () => world.entryLogs
    .filter(e =>
      (zoneFilter === "all" || e.zone_id === zoneFilter) &&
      (personFilter === "all" || e.person_id === personFilter)
    )
    .sort((a, b) => b.entry_at.getTime() - a.entry_at.getTime()),
  [world.entryLogs, zoneFilter, personFilter],
);
```

**ESCORT row with visitor pass badge** (UI-06 — use `getActiveVisitorPasses`):
```typescript
{entry.method === "ESCORT" && (() => {
  const activePasses = getActiveVisitorPasses(entry.zone_id, world.visitorPasses, now)
    .filter(p => p.entry_log_id === entry.id);
  const hasActive = activePasses.length > 0;
  return (
    <Pill tone={hasActive ? "green" : "slate"}>
      {hasActive ? "Active pass" : "Expired"}
    </Pill>
  );
})()}
```

**List entry row** — follow the audit log pattern (lines 304–313):
```typescript
<ul className="space-y-1">
  {filtered.map(entry => (
    <li key={entry.id} className="border-b py-2 last:border-0 flex items-center gap-2 text-sm">
      <span className="text-slate-400 font-mono text-xs">{entry.entry_at.toISOString().slice(0, 16)}</span>
      <Pill tone={entry.method === "CARD" ? "slate" : "blue"}>{entry.method}</Pill>
      <span>{personName(entry.person_id)}</span>
      <span className="text-slate-400">→</span>
      <span>{zoneName(entry.zone_id)}</span>
      {/* ESCORT badge */}
    </li>
  ))}
</ul>
```

---

## Shared Patterns

### useWorld / useWorldDispatch hooks
**Source:** `frontend/src/demo/store/world-state.tsx` lines 449–468
**Apply to:** All four new components (ZoneBrowser, AccessResolutionExplorer, ZoneEntryLogView) and PhysicalAccessPanel
```typescript
import { useWorld, useWorldDispatch } from '../store/world-state';
// State read:
const world = useWorld();
// Dispatch:
const dispatch = useWorldDispatch();
dispatch({ type: "TOGGLE_GRANT", grantId: grant.id });
```

### Card / Pill / Field / Select primitives
**Source:** `frontend/src/demo/components/ui.tsx` lines 7–99
**Apply to:** All new components

Pill tone values: `"slate" | "green" | "red" | "blue" | "amber"`
Card: `rounded-lg border border-slate-200 bg-white p-4` with optional `title` (small-caps header)
Field: `label` renders as `text-xs font-semibold uppercase tracking-wide text-slate-400`
Select: `mt-1 w-full rounded border border-slate-300 p-2 text-sm`

### useMemo derivation pattern (R2 — decision never stored)
**Source:** `frontend/src/demo/components/DecisionExplorer.tsx` lines 82–91
**Apply to:** AccessResolutionExplorer (resolution result), ZoneBrowser (active grants per zone), ZoneEntryLogView (filtered entries)
```typescript
const result = useMemo(
  () => subject && resource ? evaluate(principalFromSubject(subject), requirementFromResource(resource)) : null,
  [subject, resource],
);
```
Key rule: useMemo deps must include all store fields the computation touches — new object refs from immutable reducer updates trigger re-compute automatically.

### Tab button className pattern
**Source:** `frontend/src/demo/DemoRoot.tsx` lines 32–36
**Apply to:** PhysicalAccessPanel inner sub-nav buttons
```typescript
className={`rounded px-3 py-1.5 text-sm ${
  activeView === "decisions"
    ? "bg-slate-800 text-white"
    : "border border-slate-300 text-slate-600 hover:bg-slate-50"
}`}
```
Inner sub-nav uses `px-4 py-2` (larger touch target per UI-SPEC) but same conditional class structure.

### Immutable Set update in reducer
**Source:** `frontend/src/demo/store/world-state.tsx` — pattern established in all mutation cases (e.g. lines 191–213 for array mutation). For Set:
**Apply to:** TOGGLE_GRANT reducer case
```typescript
// NEVER: state.disabledGrantIds.add(id); return { ...state }
// ALWAYS:
const next = new Set(state.disabledGrantIds);
if (next.has(action.grantId)) next.delete(action.grantId);
else next.add(action.grantId);
return { ...state, disabledGrantIds: next };
```

---

## No Analog Found

All files have analogs within the existing codebase. No files require pattern invention from external sources.

| File | Note |
|------|------|
| `ZoneResolutionTrace` (local to AccessResolutionExplorer) | A small internal component rendering `ZoneAccessResult` — modeled visually after `DecisionTrace` (ui.tsx lines 101–137) but written from scratch to avoid the `Decision` type mismatch. Reuse the same Tailwind classes: `rounded-lg border p-4`, `border-green-200 bg-green-50` / `border-red-200 bg-red-50`, `text-lg font-bold`, `mt-3 space-y-1.5`, `flex gap-2 text-sm`, `w-28 shrink-0 font-medium`. |

---

## Metadata

**Analog search scope:** `frontend/src/demo/` (all files)
**Files scanned:** 11 component files + 2 lib files + 1 store file
**Pattern extraction date:** 2026-05-23
