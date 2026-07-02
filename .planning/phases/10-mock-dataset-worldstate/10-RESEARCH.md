# Phase 10: Mock Dataset & WorldState - Research

**Researched:** 2026-06-05
**Domain:** TypeScript demo dataset wiring, WorldState extension, reducer actions, pure read selectors, seed fixture restructure
**Confidence:** HIGH

## Summary

Phase 10 is a data-integration phase — the Phase-9 engine is complete and tested (24 tests in `digital-resource.test.ts`). The work is entirely in `frontend/src/demo/` and adds:

1. A `DigitalResourceWorld` sub-object to `WorldState` with flat arrays mirroring seed.ts constants 1:1
2. A `TOGGLE_RESOURCE_GRANT` reducer action that mirrors the existing `TOGGLE_GRANT`/`disabledGrantIds` pattern
3. A restructured 6-unit dataset (≥3 networks, ≥3 platforms, ≥3 applications) that preserves the SEED-06 policy-shift and SEED-07 non-baseline narratives
4. Three pure read selectors (hierarchy builder, active-grants-for-resource, resolve-at-timestamp) in a new module
5. Seed-validation tests + updates to the two existing seed-resolution integration tests

All changes are additive to the existing v2.1 zone model and physical access state. No backend, no new dependencies, no UI.

**Primary recommendation:** Mirror the exact `TOGGLE_GRANT`/`disabledGrantIds` pattern verbatim for `TOGGLE_RESOURCE_GRANT`/`disabledResourceGrantIds` — same immutable Set update, same action-dispatch style, same reducer case. The selectors are thin pure functions that import types from model.ts; the only non-trivial selector logic is `buildResourceTree` which needs a flat-array lookup phase.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Digital resource hierarchy data | Demo store (world-state.tsx + seed.ts) | — | Flat arrays under `digitalResources` sub-object, seeded from module-level constants |
| Digital resource access resolution | Demo engine (model.ts) | — | Phase 9 shipped `resolveResourceAccess` — Phase 10 only consumes it |
| Digital resource grant toggling | Demo store reducer (world-state.tsx) | — | New `TOGGLE_RESOURCE_GRANT` action mirrors physical `TOGGLE_GRANT` |
| Read selectors (tree, active grants, resolve-at) | New pure-function module (digital-resource-selectors.ts) | — | Pure functions, no React, import `DigitalResourceWorld` sub-object |
| Test suite | demo/lib/digital-resource.test.ts | — | Append seed-validation `describe` block; update 2 seed-resolution tests |

No cross-tier responsibility — everything is demo-only TypeScript under `frontend/src/demo/`. The planner should never assign backend, route, or React component tasks to this phase.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vitest | 4.0.3 | Unit testing framework | Already configured in frontend/vitest.config.ts, 178 tests green |
| TypeScript | 5.9.3 | Type system — ensures parent references resolve, no `classification` on Applications | Strict TS enforced (noUnusedLocals/noUnusedParameters), `npm run build` passes |
| React | 19.1.1 | Provider/context infrastructure for WorldState | Existing `WorldProvider` + `useWorld()` pattern; Phase 10 adds no UI but may use context in selectors (deferred) |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| React Testing Library | 16.3.0 | Not used in demo tests | Vitest uses inline fixtures, not rendering (Phase 9 established this) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| New test file for seed validation | Append to digital-resource.test.ts | D-07 decided on append-only in existing file; fewer files to manage, one test run |
| Map/Dictionary in WorldState | Flat arrays | D-01 locked arrays: matches WorldState style, selectors do their own lookups, consistency over micro-optimization |
| Separate selectors type | Import from model.ts | model.ts already exports NetworkNode/PlatformNode/ApplicationNode — adding DigitalResourceWorld here avoids circular import |

## Package Legitimacy Audit

No new packages are installed in this phase. Phase 10 is entirely data wiring + existing library consumption.

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│  frontend/src/demo/                                  │
│                                                      │
│  seed.ts                                             │
│  ├── ZONES, GRANTS, DELEGATES (v2.1 physical)       │
│  ├── RESOURCE_NODES (→ restructured to 6 units)     │
│  └── RESOURCE_GRANTS (→ expanded temporal variety)  │
│         │                                            │
│         ▼                                            │
│  world-state.tsx                                     │
│  ├── WorldState interface  ──adds──▶  digitalResources│
│  ├── seedWorld()       ──reads──▶  RESOURCE_NODES    │
│  ├── reducer()         ──adds──▶  TOGGLE_RESOURCE    │
│  └── disabledResourceGrantIds: Set<string>           │
│         │                                            │
│         ▼                                            │
│  digital-resource-selectors.ts (NEW)                 │
│  ├── buildResourceTree(world)                         │
│  ├── activeGrantsForResource(world, resourceId)       │
│  └── resolveResourceAt(world, subject, timestamp)     │
│         │                                            │
│         ▼                                            │
│  digital-resource.test.ts                              │
│  ├── [existing] 5 pitfall tests (unchanged)           │
│  ├── [existing] gate matrix + policy tests            │
│  ├── [existing] 2 seed integration tests (update ids) │
│  └── [NEW] seed-validation describe block             │
│         │                                            │
│         ▼                                            │
│  model.ts (consumed, not changed)                     │
│  ├── resolveResourceAccess                            │
│  ├── isGrantActive, isWindowActive                    │
│  ├── effectiveClassification, selectActivePolicy      │
│  └── [Phase 9 types] NetworkNode, PlatformNode...     │
└─────────────────────────────────────────────────────┘
```

Data flows from `seed.ts` constants → `seedWorld()` → `WorldState.digitalResources` → selectors → test assertions. No React rendering, no route changes.

### Recommended Project Structure

```
frontend/src/demo/
├── lib/
│   ├── model.ts          ← Phase 9 types + resolver (CONSUMED)
│   ├── seed.ts           ← Phase 9 fixtures (EXTENDED: restructured dataset)
│   ├── digital-resource.test.ts  ← Phase 9 tests (UPDATED + EXTENDED)
│   └── digital-resource-selectors.ts  ← NEW: pure read selectors
└── store/
    ├── world-state.tsx   ← EXTENDED: DigitalResourceWorld + TOGGLE_RESOURCE_GRANT
    └── world-state.test.tsx   ← EXTENDED: TOGGLE_RESOURCE_GRANT tests
```

### Pattern 1: Reducer action mirroring (TOGGLE_GRANT → TOGGLE_RESOURCE_GRANT)
**What:** The physical `TOGGLE_GRANT` action (world-state.tsx:451) is the exact template for the digital-resource toggle. Same immutable Set update, same return shape.
**When to use:** Adding any new world-state feature that toggles a `Set<string>` of disabled IDs.
**Example:**
```typescript
// Source: world-state.tsx line 451-457 (existing pattern)
case "TOGGLE_GRANT": {
  const next = new Set(state.disabledGrantIds);
  if (next.has(action.grantId)) next.delete(action.grantId);
  else next.add(action.grantId);
  return { ...state, disabledGrantIds: next };
}

// Phase 10 mirror:
case "TOGGLE_RESOURCE_GRANT": {
  const next = new Set(state.digitalResources.disabledResourceGrantIds);
  if (next.has(action.resourceGrantId)) next.delete(action.resourceGrantId);
  else next.add(action.resourceGrantId);
  return {
    ...state,
    digitalResources: { ...state.digitalResources, disabledResourceGrantIds: next },
  };
}
```

### Pattern 2: Inline fixtures for unit tests, seed import for integration (D3-13)
**What:** Unit tests in `digital-resource.test.ts` create all fixtures inline (no seed.ts import). The single `import { RESOURCE_NODES, RESOURCE_GRANTS } from "./seed"` is only used in the seed integration tests at the bottom of the file (line 52).
**When to use:** Any new test — if it exercises specific seed data, it may import from seed.ts; otherwise it stays inline.
**Example:** All 5 pitfall tests (lines 90-348) and gate matrix tests (lines 385-517) are fully inline.

### Pattern 3: Flat arrays + explicit `now: Date` for deterministic tests
**What:** WorldState stores digital resources as flat arrays (`networks`, `platforms`, `applications`) — no Map/Dictionary. Every time-dependent helper takes `now: Date` explicitly, never calling `Date.now()`.
**When to use:** The selector functions must follow this discipline to stay unit-testable.

### Anti-Patterns to Avoid
- **Adding flat top-level fields to WorldState** — D-01 locked `digitalResources` as a single nested sub-object. Do not add `digitalResources: NetworkNode[]` as a parallel field.
- **Using `Date.now()` in selectors** — the Phase-9 engine enforces explicit `now: Date`; selectors must too (Constraint, PITFALLS #5).
- **Importing from world-state.tsx in seed.ts** — seed.ts is a data module, world-state.tsx is a React component/module with React imports. Keep seed.ts import-free.
- **Modifying model.ts resolver functions** — Phase 10 only consumes the Phase-9 engine. New selector logic in a separate module.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Grant active-window check | Write new `isGrantActive` | Import `isGrantActive` from model.ts | Phase 9 shipped it; the inclusive/null boundary rule must be shared across all windows (org_links, policies, grants, delegates) |
| Policy window selection | Write new `selectActivePolicy` | Import `selectActivePolicy` from model.ts | Same null-boundary semantics as isGrantActive |
| Effective classification for Apps | Store classification on AppNode | Use `effectiveClassification()` from model.ts | RSRC-02: Applications intentionally carry no classification field |
| Policy window overlap validation | Write new validator | Use `validatePolicyWindows()` from model.ts | Seed-data check, not resolver path (model.ts:877-900) |

**Key insight:** Phase 9 engine functions are deliberately pure and reusable. Phase 10 selectors are thin wrappers over these — do not reimplement resolver logic in selector code.

## Runtime State Inventory

Not applicable — this is a greenfield data-addition phase under `frontend/src/demo/`. No rename, no refactor, no migration. The Phase-9 fixtures (MilNet/IntelNet) are restructured/renamed in seed.ts, but no runtime systems consume them outside the demo island.

## Common Pitfalls

### Pitfall 1: Inclusive boundary window overlap on adjacent policy assignments
**What goes wrong:** `validatePolicyWindows` treats the inclusive boundary rule — two assignments where A.valid_until === B.valid_from are considered overlapping and produce an error string.
**Why it happens:** The `isWindowActive` check is inclusive on both sides: `(valid_from === null || valid_from <= now) && (valid_until === null || valid_until >= now)`. At the exact boundary timestamp, BOTH windows match.
**How to avoid:** Use strict disjoint windows with a gap (e.g., A.valid_until = `2026-02-28T23:59:59Z`, B.valid_from = `2026-03-01T00:00:00Z`) for the main dataset, as confirmed by the test at line 663-675 of digital-resource.test.ts.
**Warning signs:** `validatePolicyWindows` returns a non-null error string for a resource's policy_assignments.

### Pitfall 2: Circular import between model.ts and seed.ts
**What goes wrong:** Adding `DigitalResourceWorld` type to model.ts while seed.ts imports types from model.ts is safe. But if world-state.tsx (which imports from both) tries to import DigitalResourceWorld from model.ts and model.ts imports from world-state.tsx, you get a circular dependency.
**Why it happens:** TypeScript will compile, but runtime evaluation order matters. The Phase-9 types (NetworkNode etc.) live in model.ts which seed.ts imports — this is the established safe pattern.
**How to avoid:** Declare `DigitalResourceWorld` type in model.ts (where NetworkNode/PlatformNode/ApplicationNode already live), import it in world-state.tsx. Seed.ts never imports from world-state.tsx.
**Warning signs:** `TypeError: Cannot access 'X' before initialization` in tests.

### Pitfall 3: ApplicationNode "classification" field absence check
**What goes wrong:** Adding a `classification` field to an ApplicationNode during restructure causes RSRC-02 violation: `"classification" in app === false` test assertion to fail.
**Why it happens:** It's easy to copy the PlatformNode shape and forget to omit `classification` from ApplicationNode.
**How to avoid:** The existing test at line 320 checks `"classification" in app === false` — keep this assertion in the seed-validation block. Type system enforces it (ApplicationNode has no classification field).
**Warning signs:** TypeScript errors if you try to read `app.classification` — this is the correct behavior, not a bug.

### Pitfall 4: v2.1 zone IDs are string literals, not type-guaranteed
**What goes wrong:** A zone_prereq_id on a Platform's policy references a non-existent zone string — the advisory resolution silently returns null.
**Why it happens:** zone_prereq_id is `string | null`, not a typed union of valid zone IDs. There's no compile-time guarantee.
**How to avoid:** Use zone IDs that already exist in ZONES (seed.ts line 965-1104): `zone-room-sr1`, `zone-secure-lab`, `zone-room-sigint`, `zone-room-supply`. The most practical is `zone-room-sr1` (Server Room 1, MILITARY_1, CONTROLLED).
**Warning signs:** `zoneAdvisory` is `null` in test assertions that expect non-null.

### Pitfall 5: Seed resolution tests use `name` to find fixtures — renames break `.find()`
**What goes wrong:** The seed integration tests (lines 881-882) use `RESOURCE_NODES.find(n => n.name === "MilNet")` and `.find(n => n.name === "IntelNet")` — if you rename these networks without updating the tests, the `!` non-null assertion throws at runtime.
**Why it happens:** The test imports the real seed fixtures and finds them by name. D-03 says fixtures may be renamed/repositioned, but the tests must be updated to match.
**How to avoid:** The planner MUST update both `.find()` calls in `digital-resource.test.ts` to use the new names. Or use `.find(n => n.id === "rsrc-milnet")` which is more stable.
**Warning signs:** `TypeError: Cannot read properties of undefined (reading 'id')` at test runtime.

## Code Examples

### Example 1: TOGGLE_RESOURCE_GRANT reducer action
```typescript
// Source: world-state.tsx line 451-457 (template) + D-06 contract
case "TOGGLE_RESOURCE_GRANT": {
  const next = new Set(state.digitalResources.disabledResourceGrantIds);
  if (next.has(action.resourceGrantId)) next.delete(action.resourceGrantId);
  else next.add(action.resourceGrantId);
  return {
    ...state,
    digitalResources: {
      ...state.digitalResources,
      disabledResourceGrantIds: next,
    },
  };
}
```

### Example 2: WorldState interface extension
```typescript
// Source: world-state.tsx line 73-95 (existing) + D-01 contract
export interface WorldState {
  // ...existing fields unchanged...
  disabledGrantIds: Set<string>;  // physical grants (existing)
  digitalResources: DigitalResourceWorld;  // NEW: digital resources
}

export interface DigitalResourceWorld {
  networks: NetworkNode[];
  platforms: PlatformNode[];
  applications: ApplicationNode[];
  orgLinks: OrgLink[];
  policies: ResourcePolicy[];
  policyAssignments: PolicyAssignment[];
  grants: ResourceAccessGrant[];
  delegates: ResourceAccessDelegate[];
  disabledResourceGrantIds: Set<string>;
}
```

### Example 3: Selector — activeGrantsForResource (D-06, filtered by disabled set)
```typescript
// Contract: pure function, explicit now, filters disabledResourceGrantIds
import { isWindowActive, type ResourceAccessGrant } from "./model";

export function activeGrantsForResource(
  world: DigitalResourceWorld,
  resourceId: string,
  now: Date,
): ResourceAccessGrant[] {
  const disabled = world.disabledResourceGrantIds;
  return world.grants.filter(
    (g) =>
      g.resource_id === resourceId &&
      !disabled.has(g.id) &&
      isWindowActive(g.valid_from, g.valid_until, now),
  );
}
```

### Example 4: Seed validation test (new describe block pattern)
```typescript
// Pattern: mirrors pitfall tests (inline fixtures) but validates seed.ts exports
describe("seed-validation: 6-unit digital resource dataset", () => {
  const networks = RESOURCE_NODES.filter(n => n.tier === "NETWORK");
  const platforms = RESOURCE_NODES.filter(n => n.tier === "PLATFORM");
  const applications = RESOURCE_NODES.filter(n => n.tier === "APPLICATION");

  it("contains >= 3 networks", () => {
    expect(networks.length).toBeGreaterThanOrEqual(3);
  });
  // ...additional assertions for classifications, org_links, tiers, zone_prereq, temporal variety
});
```

### Example 5: resolve-at-timestamp wrapper (D-06, filters disabled before resolving)
```typescript
export function resolveResourceAt(
  world: DigitalResourceWorld,
  subjectId: string,
  subjectClearance: Clearance,
  subjectOrgId: string,
  resourceId: string,
  now: Date,
): ResourceAccessResult {
  const disabled = world.disabledResourceGrantIds;
  const filteredGrants = world.grants.filter((g) => !disabled.has(g.id));
  // ...find resource, call resolveResourceAccess with filtered grants
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Two standalone NetworkNodes (MilNet/IntelNet) with no hierarchy | 6-unit flat-array dataset with Network→Platform→Application tree | Phase 9 → Phase 10 | SEED-01/02/03 met; parent references resolve; Applications inherit classification |
| WorldState has physical grants only (`disabledGrantIds`) | WorldState has `digitalResources: DigitalResourceWorld` sub-object with its own `disabledResourceGrantIds` | Phase 10 | Reducer mirrors TOGGLE_GRANT; selectors filter disabled grants; UI (Phase 11) toggles |
| No read selectors over digital resources | Three pure selectors: buildResourceTree, activeGrantsForResource, resolveResourceAt | Phase 10 | Phase 11 renders without re-implementing tree/grant/filter logic |

**Deprecated/outdated:**
- Phase-9 fixture names `rsrc-milnet` / `rsrc-intelnet` — will be renamed in the restructured dataset (D-02)
- No zone_prereq_id on any Platform — Phase 10 must wire at least one Platform to a v2.1 zone ID

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `DigitalResourceWorld` type is declared in model.ts (not a separate file) | Architecture | Model.ts is large (40KB). Splitting types vs. extending in-place is a tradeoff the planner will weigh. Declaring in model.ts keeps type co-location with NetworkNode/PlatformNode/ApplicationNode. |
| A2 | `world-state.test.tsx` should get a new test for TOGGLE_RESOURCE_GRANT, not digital-resource.test.ts | Test layout | world-state.test.tsx already tests reducer actions; D-07 says seed-validation goes in digital-resource.test.ts. A separate reducer action test in world-state.test.tsx is consistent with the file's purpose. |
| A3 | The 6-unit org IDs in PROJECT.md are the canonical set used by UNITS (MILITARY_1, MILITARY_2, INTEL, INFRA, INDUSTRY, HOME_GUARD) | Seed dataset | Verified: UNITS in model.ts:393-408 matches these IDs. org_links reference them directly. |
| A4 | `resourceGrantId` action field name avoids collision with physical `grantId` | Reducer action | Confirmed in STATE.md: "TOGGLE_RESOURCE_GRANT uses resourceGrantId field (not grantId) to avoid collision with physical TOGGLE_GRANT". |
| A5 | Current 178 Vitest test pass rate is the baseline to maintain | Test expectations | Verified: `npx vitest run` reports PASS (178) FAIL (0). |

## Open Questions

1. **How many org_links per resource?** SPEC says "1-N, demo seeds up to ~5" per RSRC-04. The planner should seed at least 1 active ADMIN link per resource (per RSRC-SEED-03 acceptance: "every network has ≥1 org_link"). Additional roles (ASSET_OWNER, OPERATOR) add realism but aren't explicitly required.
2. **Exactly which v2.1 zone to use for zone_prereq_id?** `zone-room-sr1` (Server Room 1, CONTROLLED, MILITARY_1) or `zone-secure-lab` (SECURED, requires_explicit_auth: true, MILITARY_1/INTEL)? CONTROLLED zones have simpler access rules and the advisory gate always passes if the person has a grant — safer for a non-blocking demo. `zone-room-sr1` is the safer choice.
3. **Should the selector module import from model.ts or receive types as parameters?** The pattern in physical-access tests is pure functions — model.ts exports all needed types. Importing from model.ts is consistent.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js (npm) | Vite + Vitest + TypeScript | ✓ | (check) | — |
| Vitest 4.0.3 | Test runner | ✓ | 4.0.3 (in package.json) | — |
| TypeScript 5.9.3 | Type checking | ✓ | 5.9.3 (in package.json) | — |
| jsdom 28.1.0 | Test environment | ✓ | 28.1.0 (in package.json) | — |

**Missing dependencies with no fallback:** none
**Missing dependencies with fallback:** none

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.3 |
| Config file | frontend/vitest.config.ts (jsdom environment, globals: true, setupFiles: ./src/test-setup.ts) |
| Quick run command | `cd frontend && npx vitest run --reporter=verbose` |
| Full suite command | `cd frontend && npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| RSRC-SEED-01 | ≥3 Networks, distinct classifications, org_links on 6 units | Seed validation | `npx vitest run --reporter=verbose digital-resource.test.ts -t "seed-validation"` | ✅ Wave 0 |
| RSRC-SEED-02 | ≥3 Platforms, parent network resolves | Seed validation | Same command | ✅ Wave 0 |
| RSRC-SEED-03 | ≥3 Applications, no classification field, parent platform resolves | Seed validation | Same command | ✅ Wave 0 |
| RSRC-SEED-04 | Zone-prereq on ≥1 Platform resolves to non-null zoneAdvisory | Seed validation | Same command | ✅ Wave 0 |
| RSRC-SEED-05 | Per-tier active/expired/future grants via isGrantActive | Seed validation | Same command | ✅ Wave 0 |
| RSRC-01 (Req 1) | WorldState has digitalResources sub-object | Seed validation | Same command | ✅ Wave 0 |
| RSRC-02 (Req 2) | TOGGLE_RESOURCE_GRANT toggles disabledResourceGrantIds | Reducer test | `npx vitest run --reporter=verbose world-state.test.tsx -t "TOGGLE_RESOURCE"` | ✅ Wave 0 |
| RSRC-03 (Req 9) | Three selectors pass unit tests | Selector tests | Same as above | ✅ Wave 0 |

### Sampling Rate
- **Per task commit:** `cd frontend && npx vitest run --reporter=verbose` (quick, ~3-5s)
- **Per wave merge:** `cd frontend && npx vitest run` (same command — all tests are unit)
- **Phase gate:** Full suite green (178+ tests) + `cd frontend && npm run build` (zero new tsc errors)

### Wave 0 Gaps
- [ ] `digital-resource.test.ts` — seed-validation describe block (NEW, covers REQ-01..05)
- [ ] `digital-resource.test.ts` — updated seed-resolution tests (seed-06-shift-resolves, seed-07-non-baseline-applied — may need new fixture IDs)
- [ ] `world-state.test.tsx` — TOGGLE_RESOURCE_GRANT reducer test
- [ ] `digital-resource-selectors.ts` — unit tests for all three selectors

*(If no gaps: N/A — Phase 10 creates new test content.)*

## Security Domain

Not applicable — Phase 10 is entirely demo/mock data wiring under `frontend/src/demo/`. No auth changes, no backend, no persistence. The `disabledResourceGrantIds` toggle is a client-side-only state flag with no security boundary.

## Sources

### Primary (HIGH confidence)
- `frontend/src/demo/store/world-state.tsx` — WorldState interface (line 73), seedWorld() (line 98), reducer + TOGGLE_GRANT (line 451)
- `frontend/src/demo/lib/model.ts` — Phase 9 types, resolveResourceAccess (line 1068), isGrantActive (line 232), effectiveClassification (line 839), selectActivePolicy (line 862)
- `frontend/src/demo/lib/seed.ts` — RESOURCE_NODES (line 1316), RESOURCE_GRANTS (line 1377), ZONES (line 965), UNITS (line 401)
- `frontend/src/demo/lib/digital-resource.test.ts` — 24 existing tests, inline fixture pattern, seed import pattern (line 52), vitest config (frontend/vitest.config.ts)
- `.planning/phases/10-mock-dataset-worldstate/10-SPEC.md` — 9 locked requirements, 10 acceptance criteria
- `.planning/phases/10-mock-dataset-worldstate/10-CONTEXT.md` — D-01..D-07 decisions (flat arrays, rename fixtures, selector signatures, toggle semantics, test layout)
- `frontend/package.json` — Vitest 4.0.3, TypeScript 5.9.3

### Secondary (MEDIUM confidence)
- `frontend/tsconfig.json` — baseUrl + path alias configuration
- `.planning/STATE.md` — Phase 9 decisions logged (resourceGrantId naming, DigitalResourceWorld as sub-object)
- `.planning/REQUIREMENTS.md` — RSRC-SEED-01..05 requirement text

### Tertiary (LOW confidence)
- `.planning/PROJECT.md` — canonical 6-unit scenario description (2 military, intelligence, infrastructure, industry, home guard)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Vitest 4.0.3 verified via package.json and `npx vitest run` showing 178 passing tests
- Architecture: HIGH — WorldState extension pattern (flat arrays, sub-object, Set) verified via direct source reading; reducer mirroring verified via TOGGLE_GRANT source (line 451)
- Pitfalls: HIGH — inclusive boundary overlap (Pitfall 1) confirmed by validatePolicyWindows test at line 663-675; seed-by-name lookup (Pitfall 5) confirmed by lines 881-882

**Research date:** 2026-06-05
**Valid until:** 30 days (stable demo types — unlikely to change once Phase 9 is locked)
