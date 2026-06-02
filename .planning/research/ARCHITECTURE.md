# Architecture Research

**Domain:** v2.2 Digital-Resource Access Demo (Network → Platform → Application)
**Researched:** 2026-06-02
**Confidence:** HIGH — derived from direct inspection of actual v2.1 demo code

---

## Standard Architecture

### System Overview

```
frontend/src/demo/                   ← demo island (no routeTree.gen.ts dependency)
├── main.tsx                         ← separate Vite entry; WorldProvider wraps tree
├── DemoRoot.tsx                     ← tab switcher; add "Digital Resources" tab here
├── lib/
│   ├── model.ts                     ← SHARED types + pure functions (FROZEN seed head)
│   │                                   v2.1 adds: ZoneNode, PhysicalAccessGrant,
│   │                                             ZoneAccessDelegate, ZoneEntryLog,
│   │                                             ZoneVisitorPass + resolver fns
│   │                                   v2.2 adds: NetworkNode, PlatformNode, ApplicationNode,
│   │                                             ResourceAccessGrant, ResourceAccessDelegate,
│   │                                             gate-chain resolver fns
│   ├── seed.ts                      ← v2.1 adds ZONES/GRANTS/DELEGATES/ENTRY_LOGS/VISITOR_PASSES
│   │                                   v2.2 adds: NETWORKS/PLATFORMS/APPLICATIONS,
│   │                                             RESOURCE_GRANTS/RESOURCE_DELEGATES
│   ├── physical-access.test.ts      ← v2.1 unit tests for zone model (UNMODIFIED)
│   └── digital-resource.test.ts    ← NEW — unit tests for gate-chain functions
├── store/
│   └── world-state.tsx              ← single useReducer; v2.2 extends WorldState +
│                                       Action union + reducer cases
└── components/
    ├── physical-access-panel.tsx    ← v2.1 outer shell (UNMODIFIED)
    │   sub-views: zone-browser.tsx, access-resolution-explorer.tsx,
    │              zone-entry-log-view.tsx
    ├── digital-resources-panel.tsx  ← NEW v2.2 outer shell (mirrors PhysicalAccessPanel)
    │   sub-views: resource-browser.tsx, resource-resolution-explorer.tsx
    └── ui.tsx                       ← shared Pill, Card, Field, Select, MockTag (UNMODIFIED)
```

### Component Responsibilities

| Component | Responsibility | v2.1 Analog |
|-----------|----------------|-------------|
| Digital-resource types in `lib/model.ts` | Type definitions + pure gate-chain functions for Network/Platform/Application | Zone types + `evaluateControlledAccess` etc. in `model.ts` |
| `seed.ts` additions | In-memory mock dataset: networks, platforms, applications, grants, delegates | `ZONES`, `GRANTS`, `DELEGATES` constants |
| `world-state.tsx` extensions | Add resource arrays to `WorldState`; new action `TOGGLE_RESOURCE_GRANT`; reducer cases | `zones`, `grants`, `delegates` fields + `TOGGLE_GRANT` action |
| `digital-resources-panel.tsx` | Outer shell; sub-nav for Resource Browser and Resource Resolution Explorer | `physical-access-panel.tsx` |
| `resource-browser.tsx` | Network → Platform → Application collapsible tree + detail panel | `zone-browser.tsx` |
| `resource-resolution-explorer.tsx` | Person + resource selector, gate-chain trace, advisory zone-prereq row, grant toggles | `access-resolution-explorer.tsx` |
| `DemoRoot.tsx` (modified) | Add `"digital-resources"` to `ActiveView` union and a new tab button | Existing tab bar |

---

## Recommended Project Structure

```
frontend/src/demo/
├── lib/
│   ├── model.ts                          MODIFIED — append digital-resource types + functions
│   ├── seed.ts                           MODIFIED — append NETWORKS, PLATFORMS, APPLICATIONS,
│   │                                               RESOURCE_GRANTS, RESOURCE_DELEGATES
│   ├── physical-access.test.ts           UNMODIFIED
│   └── digital-resource.test.ts         NEW — unit tests for gate-chain functions
├── store/
│   └── world-state.tsx                  MODIFIED — WorldState fields, Action union, reducer
├── components/
│   ├── DemoRoot.tsx                     MODIFIED — new tab entry
│   ├── digital-resources-panel.tsx      NEW — outer shell (mirrors physical-access-panel.tsx)
│   ├── resource-browser.tsx             NEW — tree browser (mirrors zone-browser.tsx)
│   ├── resource-resolution-explorer.tsx NEW — gate-chain explorer (mirrors access-resolution-explorer.tsx)
│   ├── physical-access-panel.tsx        UNMODIFIED
│   ├── zone-browser.tsx                 UNMODIFIED
│   ├── access-resolution-explorer.tsx   UNMODIFIED
│   ├── zone-entry-log-view.tsx          UNMODIFIED
│   └── ui.tsx                           UNMODIFIED (reuse Pill, Card, Field, Select, MockTag)
```

### Structure Rationale

- **No new directories.** v2.1 placed zone model types directly in `lib/model.ts` and zone seed data in `lib/seed.ts`. v2.2 mirrors this: append digital-resource types to the same `model.ts` and append seed constants to `seed.ts`. Keeping one model file avoids import-cycle risk between model and seed.
- **New test file** (`digital-resource.test.ts`) rather than appending to `physical-access.test.ts`. Tests map 1:1 to their domain; mixing physical and digital tests in one file creates noise and breaks the "one domain per test file" pattern established in v2.1.
- **New component files per sub-view.** v2.1 has `zone-browser.tsx`, `access-resolution-explorer.tsx`, `zone-entry-log-view.tsx` as separate files. v2.2 follows this: `resource-browser.tsx` and `resource-resolution-explorer.tsx` are separate files (no entry-log analog in v2.2 scope).
- **`digital-resources-panel.tsx`** is the exact structural sibling of `physical-access-panel.tsx` — a thin shell that owns the sub-nav and conditionally renders sub-view components.

---

## Architectural Patterns

### Pattern 1: Append to `model.ts`, export from one module

**What:** All domain types (interfaces) and pure resolver functions live in `lib/model.ts`. v2.1 added ~300 lines of zone types and functions to the existing file rather than creating a separate `zone-model.ts`. v2.2 must do the same.

**When to use:** Always — this is the established module contract. `seed.ts` imports from `./model`; `store/world-state.tsx` imports from `../lib/model`. Adding a new `digital-resource-model.ts` would require updating every consumer and risks circular imports when the digital-resource resolver needs `ZoneNode` and `PhysicalAccessGrant` for the advisory zone-prereq check.

**Trade-offs:** `model.ts` grows longer (~650 lines today → ~950 after v2.2), but it is organized with `// --- Phase N: [section name] ---` comment headers. This convention must be followed.

**Example (types appended to model.ts):**
```typescript
// --- Phase 9: Digital Resource hierarchy model (v2.2) ---

export type ResourceTier = "NETWORK" | "PLATFORM" | "APPLICATION";

export interface NetworkNode {
  id: string;
  name: string;
  classification: Clearance;
  admin_org_id: UnitId;
  asset_owner_org_id: UnitId;
  zone_prereq_id: string | null; // advisory link to a ZoneNode (RSRC-ACCESS-04)
}

export interface PlatformNode {
  id: string;
  name: string;
  network_id: string;          // strict tree: exactly one Network
  classification: Clearance;
  admin_org_id: UnitId;
  asset_owner_org_id: UnitId;
  zone_prereq_id: string | null;
}

export interface ApplicationNode {
  id: string;
  name: string;
  platform_id: string;         // strict tree: exactly one Platform
  // NO classification field — inherited from Platform at resolution time
  admin_org_id: UnitId;
  asset_owner_org_id: UnitId;
  zone_prereq_id: string | null;
}

export interface ResourceAccessGrant {
  id: string;
  person_id: string;
  resource_tier: ResourceTier;
  resource_id: string;
  valid_from: Date | null;
  valid_until: Date | null;
}

export interface ResourceAccessDelegate {
  id: string;
  resource_tier: ResourceTier;
  resource_id: string;
  delegate_type: "PERSON" | "ORG";
  delegate_person_id: string | null;
  delegate_org_id: string | null;
  granted_by_org_id: string;
  valid_from: Date | null;
  valid_until: Date | null;
}
```

### Pattern 2: Gate-chain as a pure function returning a typed trace record

**What:** v2.1 implements two-gate resolution as a pure function (`resolveZoneAccess`) returning a typed `ZoneAccessResult` that the UI renders as a trace. v2.2 must follow the same pattern for the three-gate digital-resource chain.

**When to use:** Resolution always. Derive the decision in the view via `useMemo`; never store it. This matches the "pure-computed ABAC" contract from the v2.0 AUTH-MODEL.

**Example (result type and resolver signature):**
```typescript
export interface ResourceGateResult {
  gate: "CLEARANCE" | "GRANT_LOOKUP" | "PREREQUISITE_GRANT";
  pass: boolean;
  detail: string;
}

export interface ZonePrereqTrace {
  zoneId: string;
  zoneGrantActive: boolean;
  advisory: string;  // plain-prose warning rendered in amber
}

export interface ResourceAccessResult {
  allow: boolean;
  tier: ResourceTier;
  resourceId: string;
  gates: ResourceGateResult[];
  zonePrerequisite?: ZonePrereqTrace;  // present only when zone_prereq_id is non-null
}

// Gate 1: clearance >= resource classification
//   (Application: classification derived from parent Platform)
// Gate 2: explicit active grant for this resource and tier
// Gate 3: prerequisite tier grant active (skipped for NETWORK — top of chain)
//   PLATFORM: active NETWORK grant for platform.network_id
//   APPLICATION: active PLATFORM grant for app.platform_id
// Zone prereq: advisory — uses existing resolveZoneAccess from same file
export function resolveResourceAccess(
  personId: string,
  resourceTier: ResourceTier,
  resourceId: string,
  allNetworks: NetworkNode[],
  allPlatforms: PlatformNode[],
  allApplications: ApplicationNode[],
  allGrants: ResourceAccessGrant[],
  personClearance: Clearance,
  now: Date,
  allZones: ZoneNode[],
  allZoneGrants: PhysicalAccessGrant[],
): ResourceAccessResult { ... }
```

**Why NOT separate functions per tier:** v2.1 used separate `evaluateControlledAccess` / `evaluateRestrictedAccess` / `evaluateSecuredAccess` because each zone-type has a distinct rule structure. For digital resources, all three tiers share the same gate structure (clearance → explicit grant → prereq grant); a single parameterized function handles all tiers with tier-specific prereq logic.

### Pattern 3: `WorldState` extension — append fields, new action types

**What:** `world-state.tsx` holds `WorldState`, `Action` (discriminated union), and `reducer`. v2.1 added `zones`, `grants`, `delegates`, `entryLogs`, `visitorPasses`, `disabledGrantIds` to `WorldState` and `TOGGLE_GRANT` to `Action`. v2.2 appends new fields and a new action type; existing fields are untouched.

**When to use:** Any new demo state. The split-context pattern (`WorldStateContext` + `WorldDispatchContext`) is already in place — do not change it.

**Example (diff to world-state.tsx):**
```typescript
// Extend WorldState (append only — do NOT restructure existing fields):
export interface WorldState {
  // ... all existing fields unchanged ...
  networks: NetworkNode[];
  platforms: PlatformNode[];
  applications: ApplicationNode[];
  resourceGrants: ResourceAccessGrant[];
  resourceDelegates: ResourceAccessDelegate[];
  disabledResourceGrantIds: Set<string>;  // mirrors disabledGrantIds pattern
}

// Extend Action union (append only):
export type Action =
  | /* all existing actions unchanged */
  | { type: "TOGGLE_RESOURCE_GRANT"; grantId: string };

// seedWorld() adds:
networks: [...NETWORKS],
platforms: [...PLATFORMS],
applications: [...APPLICATIONS],
resourceGrants: [...RESOURCE_GRANTS],
resourceDelegates: [...RESOURCE_DELEGATES],
disabledResourceGrantIds: new Set<string>(),
```

### Pattern 4: Panel shell + sub-nav (mirrors `physical-access-panel.tsx` exactly)

**What:** `physical-access-panel.tsx` is a thin shell component that owns a local `activeView` state and renders one of three sub-view components. Each sub-view calls `useWorld()` directly for data — data is not passed as props. v2.2's `digital-resources-panel.tsx` must be structurally identical.

**Example:**
```typescript
// digital-resources-panel.tsx
type DigitalView = "resource-browser" | "resource-resolution";

export function DigitalResourcesPanel() {
  const [activeView, setActiveView] = useState<DigitalView>("resource-browser");
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          className={`rounded px-4 py-2 text-sm ${activeView === "resource-browser" ? "bg-slate-800 text-white" : "border border-slate-300 text-slate-600 hover:bg-slate-50"}`}
          onClick={() => setActiveView("resource-browser")}
        >
          Resource Browser
        </button>
        <button
          className={`rounded px-4 py-2 text-sm ${activeView === "resource-resolution" ? "bg-slate-800 text-white" : "border border-slate-300 text-slate-600 hover:bg-slate-50"}`}
          onClick={() => setActiveView("resource-resolution")}
        >
          Access Resolution
        </button>
      </div>
      {activeView === "resource-browser" && <ResourceBrowser />}
      {activeView === "resource-resolution" && <ResourceResolutionExplorer />}
    </div>
  );
}
```

---

## Data Flow

### Resolution Request Flow (v2.2 gate chain)

```
User selects person + resource tier + resource in ResourceResolutionExplorer
    ↓
useMemo recomputes resolveResourceAccess(...)
    ├── Gate 1: CLEARANCE
    │     Application: look up app → platform → platform.classification
    │     Platform: use platform.classification
    │     Network: use network.classification
    │     personClearance >= resource classification?
    │     DENY on fail — stop evaluating remaining gates
    ├── Gate 2: GRANT_LOOKUP
    │     find active ResourceAccessGrant for (personId, tier, resourceId, now)
    │     not in disabledResourceGrantIds
    │     DENY on fail — stop evaluating remaining gates
    ├── Gate 3: PREREQUISITE_GRANT (skipped for NETWORK tier)
    │     PLATFORM: active NETWORK grant for platform.network_id?
    │     APPLICATION: active PLATFORM grant for app.platform_id?
    │     DENY on fail
    └── ZONE PREREQ (advisory — always evaluated, never blocks)
          resource has zone_prereq_id?
            yes → call resolveZoneAccess(personId, zone, clearance, ...)
                  using existing v2.1 fn from same model.ts
            → ZonePrereqTrace{zoneId, zoneGrantActive, advisory string}
    → ResourceAccessResult{allow, tier, resourceId, gates[], zonePrerequisite?}
    ↓
ResourceResolutionTrace renders gate rows (red/green) + advisory zone row (amber)
```

### Application Classification Derivation

```
ApplicationNode has NO classification field
    ↓
resolveResourceAccess(tier="APPLICATION", resourceId, ...)
    ↓
look up application → get platform_id
look up platform → get platform.classification
use platform.classification for Gate 1 clearance check
```

`ApplicationNode` intentionally has no `classification` field. The resolver derives it, making the inheritance rule explicit in the gate trace rather than a hidden data-copy.

### State Management

```
WorldState (useReducer, single store)
    ↓ useWorld()
ResourceBrowser reads: world.networks, world.platforms, world.applications,
                       world.resourceGrants, world.resourceDelegates
ResourceResolutionExplorer reads: all of the above + world.subjects,
                                  world.disabledResourceGrantIds,
                                  world.zones, world.grants (for zone-prereq)
    ↓ useMemo → resolveResourceAccess(...)
ResourceGateResult[] + optional ZonePrereqTrace
    ↓
ResourceResolutionTrace (renders gate rows)

TOGGLE_RESOURCE_GRANT dispatched from grant checkbox
    ↓ reducer: new Set(disabledResourceGrantIds) with toggle applied
    ↓ disabledResourceGrantIds updated (new Set forces re-render)
    ↓ activeResourceGrants recomputed in useMemo
    ↓ Result re-evaluated live
```

---

## Advisory Zone-Prerequisite Wiring

This is the only cross-domain integration point between the v2.2 digital-resource model and the v2.1 zone model.

### Decision (already recorded in PROJECT.md)

The zone-prerequisite link is advisory in the resolution trace — non-blocking. The gate-chain `allow` boolean is determined entirely by the three digital-resource gates. The zone-prereq check runs after all three gates and appends a `ZonePrereqTrace` to the result. A person can have `allow: true` while the zone-prereq warns they lack physical access to the terminal room.

### Storage: Zone prereq on the resource node (not the grant)

`zone_prereq_id: string | null` belongs on `NetworkNode` / `PlatformNode` / `ApplicationNode`, not on `ResourceAccessGrant`. The zone-prereq relationship is a structural property of the resource (the terminal physically lives in a room), not a property of a person's grant. This mirrors how `ZoneNode.requires_explicit_auth` is a property of the zone, not the grant.

### Resolver call

Because both `resolveResourceAccess` and `resolveZoneAccess` live in the same `model.ts` file, the zone-prereq check is a direct function call with no import needed:

```typescript
// Inside resolveResourceAccess, after Gate 3:
if (resource.zone_prereq_id !== null) {
  const prereqZone = allZones.find(z => z.id === resource.zone_prereq_id);
  if (prereqZone) {
    const zoneResult = resolveZoneAccess(
      personId, prereqZone, personClearance,
      false, // no escort context in digital-resource resolution
      allZones, allZoneGrants, now
    );
    result.zonePrerequisite = {
      zoneId: prereqZone.id,
      zoneGrantActive: zoneResult.allow,
      advisory: zoneResult.allow
        ? `Zone access to "${prereqZone.name}" confirmed.`
        : `Advisory: no active zone grant for "${prereqZone.name}" — physical access may be required.`,
    };
  }
}
```

### Trace Rendering

`ResourceResolutionTrace` renders four rows:

1. Gate 1 — Clearance (green/red)
2. Gate 2 — Explicit grant (green/red)
3. Gate 3 — Prerequisite tier grants (green/red; absent for NETWORK tier)
4. Zone prerequisite — advisory row (amber `Pill` from `ui.tsx`; present only when configured)

The advisory row never changes the overall ALLOW/DENY verdict label.

---

## Integration Points

### New vs Modified File Summary

| File | Status | Nature of Change |
|------|--------|-----------------|
| `lib/model.ts` | MODIFIED | Append digital-resource types and gate-chain functions after the last Phase 7 section comment |
| `lib/seed.ts` | MODIFIED | Append NETWORKS, PLATFORMS, APPLICATIONS, RESOURCE_GRANTS, RESOURCE_DELEGATES; update exports |
| `store/world-state.tsx` | MODIFIED | Append WorldState fields; extend Action union; extend reducer switch; update seedWorld() |
| `components/DemoRoot.tsx` | MODIFIED | Add `"digital-resources"` to ActiveView union; add tab button; add `<DigitalResourcesPanel />` branch |
| `lib/digital-resource.test.ts` | NEW | Unit tests for gate-chain functions (inline fixtures; no seed imports) |
| `components/digital-resources-panel.tsx` | NEW | Outer shell (mirrors physical-access-panel.tsx) |
| `components/resource-browser.tsx` | NEW | Tree browser + detail panel (mirrors zone-browser.tsx) |
| `components/resource-resolution-explorer.tsx` | NEW | Gate-chain explorer (mirrors access-resolution-explorer.tsx) |
| All other existing files | UNMODIFIED | zone-browser.tsx, access-resolution-explorer.tsx, zone-entry-log-view.tsx, ui.tsx, abac.ts, auditlog.ts, policy.ts, obligations.ts, contract.ts, credential.ts, physical-access.test.ts |

### Internal Module Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `model.ts` ← `seed.ts` | `import type { ... } from "./model"` | seed.ts imports types; never exports logic |
| `seed.ts` ← `world-state.tsx` | Named imports of constant arrays | `[...NETWORKS]` spread avoids shared array reference |
| `world-state.tsx` → UI components | `useWorld()` / `useWorldDispatch()` hooks | Components never import seed.ts directly |
| `resolveResourceAccess` → `resolveZoneAccess` | Same-file call (both in model.ts) | No import needed; zone-prereq wiring is contained in model.ts |
| `resource-resolution-explorer.tsx` → `model.ts` | Import `resolveResourceAccess`, `isResourceGrantActive` | Same import path as v2.1: `../lib/model` |

---

## Suggested Build Order

This order ensures each layer is testable before the next depends on it.

**Phase 9 — Model + Tests (no UI, no seed dependency)**
1. Append digital-resource type definitions to `lib/model.ts` — `ResourceTier`, `NetworkNode`, `PlatformNode`, `ApplicationNode`, `ResourceAccessGrant`, `ResourceAccessDelegate`, `ResourceAccessResult`, `ResourceGateResult`, `ZonePrereqTrace`
2. Append pure functions to `lib/model.ts` — `isResourceGrantActive`, `resolveResourceGrant`, and the main `resolveResourceAccess` with advisory zone-prereq wiring using existing `resolveZoneAccess`
3. Create `lib/digital-resource.test.ts` — unit tests for all gate-chain function branches (inline fixtures only, no seed imports; mirrors the D3-13 pattern from `physical-access.test.ts`)

**Phase 10 — Seed + Store (model must be complete)**
4. Append NETWORKS, PLATFORMS, APPLICATIONS, RESOURCE_GRANTS, RESOURCE_DELEGATES to `lib/seed.ts`; add to export list; include zone_prereq_id links to existing zone IDs for at least one resource (RSRC-SEED-04)
5. Extend `WorldState`, `Action`, `reducer`, `seedWorld()` in `store/world-state.tsx` — all append-only changes

**Phase 11 — UI Components (store must be seeded)**
6. Create `components/digital-resources-panel.tsx` (shell with sub-nav; renders sub-views)
7. Create `components/resource-browser.tsx` (Network → Platform → Application collapsible tree + detail panel with admin_org, asset_owner_org, classification, active grants, delegates)
8. Create `components/resource-resolution-explorer.tsx` (person + tier + resource selectors, gate-chain trace with advisory zone row, grant toggle panel)
9. Modify `components/DemoRoot.tsx` — add `"digital-resources"` entry and `<DigitalResourcesPanel />` branch (smallest change; done last to avoid breaking the tab bar during construction)

**Why this order:** Gate-chain logic is the riskiest part (most decision branching); test it before seed or UI depends on it. Seed before UI so components have real data on first render. Shell before sub-views so the sub-nav exists to navigate between sub-views as each is built. DemoRoot last because it just wires the already-working panel in.

---

## Anti-Patterns

### Anti-Pattern 1: Creating `digital-resource-model.ts` as a separate file

**What people do:** Extract digital-resource types into their own file to keep `model.ts` shorter.

**Why it's wrong:** `seed.ts` imports from `./model`. `world-state.tsx` imports from `../lib/model`. `access-resolution-explorer.tsx` imports from `../lib/model`. A second model file requires updating all consumers. Critically, `resolveResourceAccess` needs `ZoneNode` and `PhysicalAccessGrant` from the existing model for the zone-prereq check — splitting the file creates a circular import (`digital-resource-model.ts` imports from `model.ts`, which imports from `digital-resource-model.ts`).

**Do this instead:** Append to `model.ts` under a `// --- Phase 9: Digital Resource hierarchy model (v2.2) ---` section comment, exactly as v2.1 appended zone types under `// --- Phase 5: Zone hierarchy model (v2.1 Physical Access Zones) ---`.

### Anti-Pattern 2: Storing Application classification on `ApplicationNode`

**What people do:** Copy `platform.classification` onto the application record in seed data for convenience.

**Why it's wrong:** The project decision is "Application INHERITS Platform classification." Storing it on the node creates two sources of truth and obscures the inheritance rule in the resolution trace. The detail panel should show "classification: SECRET (inherited from Platform X)" — this requires deriving it at display time, not reading a stored value.

**Do this instead:** `ApplicationNode` has no `classification` field. `resolveResourceAccess` for `tier="APPLICATION"` looks up the application, then its platform, then uses `platform.classification` for Gate 1. The detail panel in `resource-browser.tsx` does the same lookup and renders the inheritance note.

### Anti-Pattern 3: Making zone-prerequisite a blocking gate

**What people do:** Put the zone-prereq check as Gate 4 so a missing zone grant causes DENY.

**Why it's wrong:** The project decision (recorded in `PROJECT.md` Key Decisions) is: "zone-prerequisite link is advisory, not a hard gate — the prereq surfaces in the resolution trace as a warning rather than forcing DENY." Hard-gating creates tight coupling between the physical and digital access domains that the design explicitly avoids.

**Do this instead:** Run the zone-prereq check after all three digital gates. Attach `zonePrerequisite?: ZonePrereqTrace` to `ResourceAccessResult`. Render it as an amber advisory row that never contributes to the `allow` boolean.

### Anti-Pattern 4: Implementing cross-tier grant inheritance (Network grant covers Platform)

**What people do:** Allow a Network-level grant to automatically cover Platforms on that network, mirroring how the zone model allows parent grants to cover children of the same zone_type.

**Why it's wrong:** RSRC-GRANT-02 explicitly states: "each tier always requires explicit authorization — no automatic inheritance across tiers (Network grant does not grant Platform access)." The prerequisite chain is not inheritance; Gate 3 verifies a parent-tier grant exists as a precondition, but that grant does not substitute for the child-tier grant.

**Do this instead:** Gate 2 checks for an explicit grant on the target resource. Gate 3 checks that a separate, independent grant exists at the prerequisite tier. Both must pass independently.

### Anti-Pattern 5: Accessing seed data directly from UI components

**What people do:** Import `NETWORKS` / `PLATFORMS` etc. directly from `seed.ts` in a component.

**Why it's wrong:** v2.1 establishes that all demo data flows through `WorldState` via `useWorld()`. This allows `TOGGLE_RESOURCE_GRANT` to disable grants and have the change reflected everywhere. Direct seed imports bypass the store and break the toggle interactivity.

**Do this instead:** Read `world.networks`, `world.platforms`, etc. from `useWorld()`, as every existing v2.1 component does.

---

## Sources

All findings are from direct code inspection — no external sources needed for this milestone.

- `frontend/src/demo/lib/model.ts` — v2.1 zone model (structural template for types and resolver)
- `frontend/src/demo/lib/seed.ts` — v2.1 zone seed (data shape and export pattern template)
- `frontend/src/demo/store/world-state.tsx` — WorldState, Action, reducer, split-context pattern
- `frontend/src/demo/components/physical-access-panel.tsx` — panel shell pattern
- `frontend/src/demo/components/zone-browser.tsx` — tree browser pattern
- `frontend/src/demo/components/access-resolution-explorer.tsx` — resolution explorer with trace pattern
- `frontend/src/demo/components/zone-entry-log-view.tsx` — sub-view with filters pattern
- `frontend/src/demo/components/ui.tsx` — shared UI primitives (Pill, Card, Field, Select, MockTag)
- `frontend/src/demo/DemoRoot.tsx` — tab integration pattern
- `.planning/milestones/v2.2-REQUIREMENTS.md` — RSRC-* requirements (gate chain, grant model, delegation)
- `.planning/PROJECT.md` — key decisions: advisory zone-prereq, application inherits platform classification

---
*Architecture research for: v2.2 Digital-Resource Access Demo*
*Researched: 2026-06-02*
