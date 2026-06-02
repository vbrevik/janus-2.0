# Stack Research

**Domain:** Demo/mock frontend — digital resource hierarchy (Network → Platform → Application) for Janus 2.0 v2.2
**Researched:** 2026-06-02
**Confidence:** HIGH — entire stack is present and running; analysis is of what the existing v2.1 patterns already provide, not of new choices

---

## Executive Finding

**Add nothing to package.json.** Every rendering primitive, state pattern, and UI element needed for v2.2 already exists in the installed stack. The three-tier digital resource hierarchy (Network → Platform → Application) is structurally isomorphic to v2.1 physical zones (Site → Building → Room): same collapsible tree rendering, same detail panel layout, same two-gate-plus-advisory resolution trace, same grant toggle interactivity, same `WorldState` + `useReducer` store pattern. The correct v2.2 strategy is to mirror the v2.1 implementation, not to diverge or add new tools.

---

## Recommended Stack

### Core Technologies — all already installed, zero new installs

| Technology | Version (installed) | Role in v2.2 |
|------------|---------------------|--------------|
| React 19 | ^19.1.1 | Component tree; `useState`/`useMemo` hooks for all new panels — same patterns as v2.1 |
| TypeScript ~5.9 | ~5.9.3 | New model types: `DigitalResource`, `ResourceAccessGrant`, `ResourceDelegate`, `ResourceAccessResult`; strict types enforce gate-chain logic at compile time |
| Tailwind CSS | ^3.4.17 | All layout and color — reuse existing tone system (`slate`/`amber`/`red`/`green`/`blue`) |
| Vite | ^7.1.7 | No config changes; demo island is already wired as a second `rollupOptions.input` entry (`demo.html`) in `vite.config.ts` |
| Vitest | ^4.0.3 | Unit tests for new model functions; same `jsdom` environment, same inline-fixture pattern as `physical-access.test.ts` |

### Supporting Libraries — already installed, use as-is

| Library | Version (installed) | How v2.2 Uses It |
|---------|---------------------|------------------|
| lucide-react | ^0.548.0 | Optional tier icons (network, server, app glyphs) — zero cost, already installed in the main app; use sparingly in demo if visually helpful |
| clsx + tailwind-merge | ^2.1.1 / ^3.3.1 | Conditional class composition in new components — same usage as existing demo components |

`class-variance-authority` is installed but not used in demo components; continue not using it there — it adds verbosity for one-off demo styling.

---

## What Each New v2.2 Module Needs From the Stack

### `demo/lib/digital-resource.ts` (new)

Pure TypeScript; no library imports. Exports:

- `ResourceTier`: `"NETWORK" | "PLATFORM" | "APPLICATION"`
- `DigitalResource` interface: `id`, `name`, `tier: ResourceTier`, `classification: Clearance` (imported from `model.ts`), `parent_id: string | null` (null at Network tier), `admin_org_id: UnitId`, `asset_owner_org_id: UnitId`, `zone_prereq_id: string | null` (links to a `ZoneNode.id` — advisory)
- `ResourceAccessGrant` interface: `id`, `person_id`, `resource_id`, `valid_from: Date | null`, `valid_until: Date | null` — structurally identical to `PhysicalAccessGrant` with `zone_id` renamed to `resource_id`
- `ResourceDelegate` interface: mirrors `ZoneAccessDelegate` with `resource_id` instead of `zone_id`
- `ResourceAccessResult` interface: `allow: boolean`, `gate: "CLEARANCE_CHECK" | "GRANT_LOOKUP" | "PARENT_TIER_CHECK"`, `reason: string`, `detail?: string`, `zonePrereqWarning?: string` (populated when `zone_prereq_id` is set; advisory, never blocks)
- `isResourceGrantActive(grant, now)`: identical two-line implementation to `isGrantActive` in `model.ts` — do NOT import `isGrantActive` directly as it is typed to `PhysicalAccessGrant`
- `resolveResourceAccess(personId, resource, clearance, allResources, allGrants, now, allZoneGrants?, allZones?)`: three-gate chain: (1) `CLEARANCE_RANK[clearance] >= CLEARANCE_RANK[resource.classification]`, (2) active `ResourceAccessGrant` exists for this specific resource, (3) if `tier === "PLATFORM"`, parent Network grant active; if `tier === "APPLICATION"`, parent Platform grant active; advisory zone-prereq populated if `zone_prereq_id` is set

`Clearance`, `CLEARANCE_RANK`, `UnitId`, `ZoneNode`, `PhysicalAccessGrant` imported from the existing `model.ts` — do NOT duplicate.

### `demo/lib/seed.ts` additions

Append new export blocks after the existing `ZONES`/`GRANTS`/`DELEGATES`/`ENTRY_LOGS`/`VISITOR_PASSES` blocks. Export:
- `NETWORKS`, `PLATFORMS`, `APPLICATIONS`: `DigitalResource[]`
- `RESOURCE_GRANTS`: `ResourceAccessGrant[]` (active, expired, future-dated per RSRC-SEED-05)
- `RESOURCE_DELEGATES`: `ResourceDelegate[]`

Do not touch anything above the seed-head boundary comment — the six abac.test.ts fixture subjects are frozen.

### `demo/store/world-state.tsx` additions

Extend `WorldState` with six new fields:
```typescript
networks: DigitalResource[];
platforms: DigitalResource[];
applications: DigitalResource[];
resourceGrants: ResourceAccessGrant[];
resourceDelegates: ResourceDelegate[];
disabledResourceGrantIds: Set<string>;
```

Extend `seedWorld()` to initialize from new seed exports. Extend `Action` union with `{ type: "TOGGLE_RESOURCE_GRANT"; grantId: string }`. Extend `reducer` with a `TOGGLE_RESOURCE_GRANT` case using the same immutable-`Set` pattern as `TOGGLE_GRANT`.

### `demo/components/digital-access-panel.tsx` (new)

Sub-nav with two views: Resource Browser | Access Resolution. (No entry-log view — digital resources have no entry-log analog.) Same `useState<DigitalView>` + conditional render pattern as `physical-access-panel.tsx`.

### `demo/components/resource-browser.tsx` (new)

Left column (1/3): collapsible three-level tree (Network → Platform → Application). Recursive component following the `ZoneTreeNode` pattern in `zone-browser.tsx` — `div` with `marginLeft: depth * 16` indent, expand/collapse via `Set<string>` state. Classification badge via existing `Pill` from `ui.tsx`.

Right column (2/3): resource detail panel — `admin_org`, `asset_owner_org`, classification, tier, active grants, active delegates, advisory zone-prereq link if set. Uses `Card`, `Field`, `Pill` from `ui.tsx`.

### `demo/components/resource-access-resolution-explorer.tsx` (new)

Two selector cards (person, resource) plus one optional card (zone, only shown when selected resource has a `zone_prereq_id`). Full-width `ResourceResolutionTrace` component (local, analogous to `ZoneResolutionTrace` in `access-resolution-explorer.tsx`). The trace has four rows:

1. Clearance gate — `✓`/`✗`
2. Explicit grant gate — `✓`/`✗`
3. Parent tier gate — `✓`/`✗` (N/A row for Network-tier resources)
4. Zone prerequisite — `⚠` amber advisory row (never `✓`/`✗`; non-blocking)

Grant toggle panel below — same checkbox pattern as `AccessResolutionExplorer`. Reuses `Card`, `Field`, `Select`, `Pill`, `MockTag` from `ui.tsx`.

### `demo/components/ui.tsx` — no changes

Existing `Pill`, `MockTag`, `Card`, `Field`, `Select`, `DecisionTrace` cover all visual needs. `DecisionTrace` is typed to the ABAC `Decision` type and must not be repurposed for `ResourceAccessResult`.

### `DemoRoot.tsx` — one addition

Add `"digital-access"` to the `ActiveView` union, add one tab button, add one conditional render line. Single-digit change.

---

## Installation

Nothing to install.

```bash
# Confirm no new deps are needed — all capabilities are in the current package.json
npm list react vite typescript tailwindcss vitest
```

---

## Alternatives Considered

| Recommended | Alternative | Why Alternative is Wrong Here |
|-------------|-------------|-------------------------------|
| Hand-rolled collapsible tree (`div` + `marginLeft` indent, recursive component) | `@radix-ui/react-collapsible`, `react-arborist`, `rc-tree` | v2.1 zone browser already proves this pattern works at the required depth (3 levels, ~30 nodes). A library adds a dependency, an incompatible styling model, and a new API surface for zero benefit in a demo context. |
| Local `ResourceResolutionTrace` component (a `ul` with per-gate rows) | `react-flow`, `cytoscape.js`, `d3` graph viz | The resolution logic is a sequential 3-gate chain plus one advisory row — it is a list, not a graph. Graph viz libraries are warranted for many-to-many, non-linear edge structures. This is not that case. |
| `Clearance`/`CLEARANCE_RANK`/`UnitId` imported from existing `model.ts` | Duplicate in new `digital-resource.ts` | Duplication creates drift risk if the clearance ladder or UnitId set changes in v2.3+. Single source of truth. |
| `ResourceAccessGrant` as a distinct interface | Reuse `PhysicalAccessGrant` with a renamed field via type alias | The v2.2 resource-grant type is semantically separate (different domain, different resolution rules). Keeping distinct types prevents confusion and lets each evolve independently in v2.3 dataset grants. |
| Inline `isResourceGrantActive` (two-line function, same logic) | Import `isGrantActive` from `model.ts` | `isGrantActive` is typed to `PhysicalAccessGrant`. Importing it for `ResourceAccessGrant` requires a structural cast or interface widening. A two-line local copy is cleaner and avoids coupling the physical and digital models. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Any tree/hierarchy rendering library (`react-arborist`, `react-d3-tree`, `rc-tree`, `@radix-ui/react-collapsible`) | The fixed-depth 3-level hierarchy is trivially rendered with recursive `div` indentation — proved by v2.1 zone browser. A library adds bundle weight and an incompatible API for a demo with ~30 nodes. | Recursive `ZoneTreeNode`-style component with `marginLeft: depth * 16` — already in `zone-browser.tsx`. |
| Graph visualization libraries (`react-flow`, `cytoscape.js`, `d3`, `vis-network`) | The access resolution trace is a 3-row gate list plus one advisory row — a `ul`. These libraries are for interactive node-edge graphs with many-to-many edges. Wrong shape of problem. | Local `ResourceResolutionTrace` component with `ul` — same pattern as `ZoneResolutionTrace`. |
| TanStack Router imports inside demo components | Demo island is router-isolated by design (no `routeTree.gen.ts` changes until fullstack integration). Importing TanStack Router in demo code breaks this constraint. | `useState` for view switching — the established pattern in `DemoRoot.tsx` and `physical-access-panel.tsx`. |
| shadcn/ui components (`src/components/ui/*`) inside demo components | shadcn components depend on CSS variable tokens from the main app's `index.css` and Radix primitives. Mixing them into demo components creates a styling coupling that is hard to remove when the demo is extracted. | `demo/components/ui.tsx` primitives (`Card`, `Pill`, `Field`, `Select`, `MockTag`) — the established demo primitive set. |
| New primitives added to `demo/components/ui.tsx` | The existing set covers all needed patterns. Widening a shared primitive file that every demo component depends on creates churn risk. | Inline one-off styled elements in the component that needs them. |
| Storing computed `ResourceAccessResult` in `WorldState` | Derived data stored in state causes stale-result bugs (documented as Pitfall 4 in v2.1 spike findings). | Compute `ResourceAccessResult` in the component via `useMemo` — the same pattern as `result` in `AccessResolutionExplorer`. |
| Immer | Demo immutable mutations are simple array-spread and `new Set()` updates; Immer draft-proxy adds indirection for no benefit at this scale. | Plain spread + filter mutations — the existing pattern throughout `world-state.tsx`. |

---

## Stack Patterns for v2.2 Implementation

**Tree rendering:**
- Root nodes are `DigitalResource` records where `tier === "NETWORK"` (equivalently, `parent_id === null`)
- Depth 0 = Network, depth 1 = Platform, depth 2 = Application
- Expand/collapse state: `useState<Set<string>>(new Set())` — identical to `expandedIds` in `ZoneBrowser`
- The `getChildren(resourceId, allResources)` helper replaces `allZones.filter(z => z.parent_id === zone.id)` — same structure

**Classification badges:**
- Reuse `Pill` from `ui.tsx` with the clearance tone map (define as a `const` in the component file, same as `CLEARANCE_TONE` in `access-resolution-explorer.tsx`)
- `UNCLASSIFIED` → `"slate"`, `RESTRICTED` → `"blue"`, `CONFIDENTIAL` → `"slate"`, `SECRET` → `"amber"`, `TOP_SECRET` → `"red"`

**Advisory zone-prerequisite row in the resolution trace:**
- Render as a `li` with `⚠` prefix in amber when `resource.zone_prereq_id` is set
- Label: `Zone Prereq` — amber text, not green/red (it is advisory, not a gate outcome)
- Text: "Zone access to [zone name] may be required for physical terminal access — not enforced here." (or similar plain prose)
- If the person has an active zone grant for the linked zone, annotate "(grant held)"; if not, annotate "(no grant — advisory only)"
- This row is always present when `zone_prereq_id` is set; it never changes the `allow` outcome

**Three-gate resolution order:**
1. `CLEARANCE_RANK[clearance] >= CLEARANCE_RANK[resource.classification]` — fail → immediate DENY
2. Active `ResourceAccessGrant` exists for this specific resource — no inheritance across tiers — fail → DENY
3. If `tier !== "NETWORK"`: active grant exists for the parent resource — fail → DENY

**`disabledResourceGrantIds` toggle:**
- Same `Set<string>` in `WorldState`, same `TOGGLE_RESOURCE_GRANT` action, same immutable-Set update
- The resolution explorer filters `resourceGrants` through `disabledResourceGrantIds` before passing to `resolveResourceAccess` — same as the zone explorer's `activeGrants` computation

---

## Version Compatibility

| Concern | Status |
|---------|--------|
| New types import `Clearance`/`CLEARANCE_RANK`/`UnitId` from `model.ts` | No risk — stable exported types with no external dependencies |
| `WorldState` extension with six new fields | No risk — `seedWorld()` initializes all; consumers destructure only what they need |
| Vitest test file for `digital-resource.ts` | Same `jsdom` environment, same inline-fixture pattern — no new test setup required |
| `vite.config.ts` `rollupOptions.input` | The existing config already uses `rollupOptions` (not `rolldownOptions`) and already registers both `index.html` and `demo.html` — no config change needed for v2.2 |

---

## Sources

- Live codebase: `frontend/src/demo/` — direct inspection of all relevant files — HIGH confidence
- `frontend/package.json` — installed versions verified directly — HIGH confidence
- `frontend/vite.config.ts` — build entry setup verified directly — HIGH confidence
- `.planning/milestones/v2.2-REQUIREMENTS.md` — requirements analysis — HIGH confidence
- v2.1 implementation patterns (`zone-browser.tsx`, `access-resolution-explorer.tsx`, `physical-access-panel.tsx`, `model.ts`, `world-state.tsx`) — structural isomorphism confirmed by direct code reading — HIGH confidence

---

*Stack research for: Janus 2.0 v2.2 digital resource access demo (Network → Platform → Application)*
*Researched: 2026-06-02*
