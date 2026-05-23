---
phase: 08-mock-dataset-demo-ui
reviewed: 2026-05-24T00:00:00Z
depth: standard
files_reviewed: 7
files_reviewed_list:
  - frontend/src/demo/DemoRoot.tsx
  - frontend/src/demo/components/access-resolution-explorer.tsx
  - frontend/src/demo/components/physical-access-panel.tsx
  - frontend/src/demo/components/zone-browser.tsx
  - frontend/src/demo/components/zone-entry-log-view.tsx
  - frontend/src/demo/lib/seed.ts
  - frontend/src/demo/store/world-state.tsx
findings:
  critical: 1
  warning: 5
  info: 3
  total: 9
status: issues_found
---

# Phase 8: Code Review Report

**Reviewed:** 2026-05-24
**Depth:** standard
**Files Reviewed:** 7
**Status:** issues_found

## Summary

Seven files spanning the Phase 8 mock-dataset and demo UI were reviewed. The reducer and most React hook patterns are sound. The TOGGLE_GRANT reducer correctly copies the Set before mutation. The `ZoneResolutionTrace` local component is correctly typed and kept separate from the `ui.tsx` DecisionTrace component. The `escortHasGrant` useMemo dependency array is complete. The zone-browser's expand/collapse also copies the Set correctly.

One critical bug was found: `ZoneTreeNode` and `ZoneDetailPanel` are defined as named functions **inside** the `ZoneBrowser` render function body. This causes React to treat them as brand-new component types on every parent render, unmounting and remounting the entire subtree on every state change — breaking selection state and producing jarring UI resets. Five warnings concern logic correctness, stale-closure risk, mutable module-level arrays, and a missing type guard. Three info items flag minor quality issues.

---

## Critical Issues

### CR-01: Component functions defined inside render — unmount/remount on every parent re-render

**File:** `frontend/src/demo/components/zone-browser.tsx:36` and `:78`

**Issue:** `ZoneTreeNode` and `ZoneDetailPanel` are defined as named `function` declarations inside the body of `ZoneBrowser`. Every time `ZoneBrowser` re-renders (e.g., when `expandedIds` or `selectedId` changes), React sees a **new function reference** as the component type for each child. React uses referential identity of the component type to decide whether to mount or unmount; a new reference forces a full unmount + remount of the subtree. This means:
- Clicking a zone to expand it immediately unmounts the node being expanded (its state and DOM are torn down).
- `selectedId` changes trigger a remount of `ZoneDetailPanel`, losing any local state it might accumulate.
- In a tree with recursive `ZoneTreeNode` children this compounds: the entire tree rerenders and every expanded subtree collapses, because children are also redefined as new types.

This is a well-known React anti-pattern; the React docs and eslint-plugin-react rule `no-unstable-nested-components` both flag it.

**Fix:** Lift both helper components out of `ZoneBrowser` to module scope. Pass the required closure values as explicit props:

```tsx
// --- module scope ---

interface ZoneTreeNodeProps {
  zone: ZoneNode;
  depth: number;
  allZones: ZoneNode[];
  expandedIds: Set<string>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
}

function ZoneTreeNode({
  zone, depth, allZones, expandedIds, selectedId, onSelect, onToggle,
}: ZoneTreeNodeProps) {
  const children = allZones.filter((z) => z.parent_id === zone.id);
  const isExpanded = expandedIds.has(zone.id);
  const isSelected = selectedId === zone.id;
  // ... rest of render, calling onSelect/onToggle instead of the outer setters
}

interface ZoneDetailPanelProps {
  zone: ZoneNode;
  allZones: ZoneNode[];
  allGrants: PhysicalAccessGrant[];
  allDelegates: ZoneAccessDelegate[];
  disabledGrantIds: Set<string>;
  subjects: Subject[];
  now: Date;
}

function ZoneDetailPanel({ zone, allZones, allGrants, allDelegates, disabledGrantIds, subjects, now }: ZoneDetailPanelProps) {
  // ... same body, replacing world.* with props
}

// --- ZoneBrowser body ---
export function ZoneBrowser() {
  // pass the needed values as props to the lifted components
}
```

---

## Warnings

### WR-01: `relevantGrants` computed without useMemo — recomputes on every render

**File:** `frontend/src/demo/components/access-resolution-explorer.tsx:216-218`

**Issue:** `relevantGrants` is computed inline (not inside `useMemo`) but depends on `world.grants`, `personId`, and `relevantZoneIds` (which is itself a `useMemo`). This means the `.filter()` runs on every render of `AccessResolutionExplorer`, including renders triggered by context updates that don't affect grants or the selected person. While not a correctness bug today, it is an inconsistency: all other derived values in this component are memoized, and this one is not. If the grant list grows, or the component re-renders frequently due to parent state, this creates a silent performance regression that will be hard to diagnose later.

**Fix:**
```tsx
const relevantGrants: PhysicalAccessGrant[] = useMemo(
  () =>
    world.grants.filter(
      (g) => g.person_id === personId && relevantZoneIds.has(g.zone_id),
    ),
  [world.grants, personId, relevantZoneIds],
);
```

### WR-02: `SUBJECTS`, `RESOURCES`, and `HUB_INDEX` are mutable module-level arrays that are `push`ed after declaration

**File:** `frontend/src/demo/lib/seed.ts:798-828`

**Issue:** `SUBJECTS`, `RESOURCES`, and `HUB_INDEX` are declared as `const` arrays and exported, then mutated in-place via `push()` later in the same module. Module-level state is shared across all importers in a single bundle. The `seedWorld()` function in `world-state.tsx` passes these arrays directly into the reducer's initial state (`subjects: SUBJECTS`). Because the state holds a **reference** to the same array, any future `push` to `SUBJECTS` (e.g., a second module import cycle or a test re-import) would silently mutate the live world state without going through the reducer. This also means multiple calls to `seedWorld()` (e.g., in tests or HMR reloads) share the same mutable backing array.

**Fix:** In `seed.ts`, build the final merged arrays into new `const` arrays rather than mutating exports:
```ts
export const SUBJECTS: Subject[] = [
  ...BASE_SUBJECTS,
  ...mil1Subjects,
  ...mil2Subjects,
  // ...
];
```
In `seedWorld()`, copy on intake:
```ts
subjects: [...SUBJECTS],
```

### WR-03: `unitName` called with potentially non-`UnitId` string via unsafe `as UnitId` cast

**File:** `frontend/src/demo/components/zone-browser.tsx:109` and `:114`

**Issue:** `zone.admin_org_id` and `zone.asset_owner_org_id` are typed as `string` on `ZoneNode` (see `model.ts:56-57`), not `UnitId`. The call `unitName(zone.admin_org_id as UnitId)` suppresses the type error but does not guard against a zone whose `admin_org_id` is a free-form string (e.g., an external partner not in the `UNITS` map). `unitName` does `UNITS[id]?.label ?? id`, so the fallback to `id` means it won't crash — but the `as UnitId` cast is still technically unsound and would mask future type evolution. The same pattern appears in `access-resolution-explorer.tsx:295` for `selectedZone.admin_org_id`.

**Fix:** Either widen `ZoneNode.admin_org_id` to `UnitId` in `model.ts` (the correct fix if zones are always owned by canonical units), or remove the cast and call `unitName` via a helper that accepts `string`:
```ts
// model.ts: widen the field type
admin_org_id: UnitId;
asset_owner_org_id: UnitId;
```
This is the preferred fix given that all seeded zones use `UnitId` values.

### WR-04: `escortHasGrant` is `false` when `selectedZone` is `null`, but `ZoneResolutionTrace` is only rendered when `result !== null` — however, `escortHasGrant` is passed regardless of zone selection validity

**File:** `frontend/src/demo/components/access-resolution-explorer.tsx:173-179` and `:329-336`

**Issue:** `escortHasGrant` evaluates to `false` when `escortId === "none"` OR when `selectedZone === null`. This is correct for the decision logic. However, the escort UI feedback (lines 314-325) renders the "Escort does not hold an active grant" warning whenever `escortId !== "none" && !escortHasGrant` — which includes the case where `selectedZone` is `null` (no zone selected yet). In that state, `escortHasGrant` is `false` by construction even though no zone has been chosen, so the red "does not hold an active grant" message fires immediately when the user selects an escort before selecting a zone. This is a misleading UX signal.

**Fix:**
```tsx
{escortId !== "none" && selectedZone !== null && !escortHasGrant && escortName && (
  <p className="mt-2 text-xs text-red-500">
    Escort ({escortName}) does not hold an active grant for this zone
    — escort check fails.
  </p>
)}
{escortId !== "none" && selectedZone !== null && escortHasGrant && (
  <p className="mt-2 text-xs text-green-600">
    Escort holds a valid grant for this zone.
  </p>
)}
```

### WR-05: `seedWorld` initial state shares object references with frozen seed arrays — `grants`, `delegates`, `entryLogs`, `visitorPasses`, `zones` are not copied

**File:** `frontend/src/demo/store/world-state.tsx:122-128`

**Issue:** The seed arrays `ZONES`, `GRANTS`, `DELEGATES`, `ENTRY_LOGS`, `VISITOR_PASSES` are passed directly (by reference) into the initial `WorldState`. The reducer spreads `...state` on every action, which copies the top-level state object but leaves these arrays as the **same references** as the module-level seed constants. If any reducer case were ever added that mutates an item within one of these arrays (rather than replacing the array), it would silently mutate the seed constants and break `seedWorld` for any future call (e.g., during hot-module reload or testing). This is a latent correctness hazard. The pattern is inconsistent: `subjects` and `resources` have reducer cases that rebuild them via `.map()`, but the zone/grant/delegate/log/pass arrays have no mutation reducers yet — so the hazard is dormant but will become active in Phase 9 if grant mutation actions are added.

**Fix:** Copy on intake in `seedWorld`:
```ts
zones: [...ZONES],
grants: [...GRANTS],
delegates: [...DELEGATES],
entryLogs: [...ENTRY_LOGS],
visitorPasses: [...VISITOR_PASSES],
```

---

## Info

### IN-01: `DemoRoot.tsx` imports `PhysicalAccessPanel` with kebab-case path but all other imports use PascalCase filenames

**File:** `frontend/src/demo/DemoRoot.tsx:14`

**Issue:** `PhysicalAccessPanel` is imported from `./components/physical-access-panel` while all sibling component imports (lines 7-13) use PascalCase filenames (`DemoBanner`, `RoleSwitcherHeader`, etc.). This is consistent with the project convention that kebab-case filenames are used for the new Phase-8 components; the inconsistency is in the existing components, not this file. No action required from this phase's code, but it is worth noting for future consolidation.

**Fix:** No action needed for Phase 8 scope. Tracked for awareness.

### IN-02: `as unknown` casts in `FEDERATION_REQUEST_DETAIL` and `FEDERATION_RESPOND` reducer cases suppress type errors without explanation

**File:** `frontend/src/demo/store/world-state.tsx:390` and `:406`

**Issue:** `action.requester as unknown` and `action.detailResult.decision as unknown` are used to satisfy the `Envelope` type's `unknown` fields. The comment in `model.ts` explains this is intentional (circular import avoidance), but the cast at the dispatch site has no inline comment. A future maintainer may remove the cast thinking it's a bug, reintroducing the circular dependency.

**Fix:** Add a one-line comment at each cast site:
```ts
requester: action.requester as unknown, // Principal type kept as unknown to avoid circular import (see model.ts Envelope)
```

### IN-03: Magic date strings in `seed.ts` grant / pass records are not referenced to the documented demo date

**File:** `frontend/src/demo/lib/seed.ts:1151-1165` and `:1239-1255`

**Issue:** Comments reference "demo date 2026-06-01" for the EXPIRED and FUTURE grant classification (SEED-09) and visitor pass expiry, but this demo date is not defined as a named constant anywhere in the file. If the demo date is ever adjusted, the grant/pass dates must be updated by finding all the comment references manually. The `VISITOR_PASSES` pass-2 `valid_until` of `2026-12-31` is also effectively a magic date with no comment.

**Fix:** Define a module-level constant:
```ts
/** Demo reference date — grants and passes are defined relative to this date (SEED-09). */
export const DEMO_DATE = new Date("2026-06-01T00:00:00Z");
```
Then document each grant/pass against it in comments (the dates themselves can stay literal in seed data, as they are stable fixtures).

---

_Reviewed: 2026-05-24_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
