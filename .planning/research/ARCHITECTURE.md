# Architecture Research — v2.3 Dataset Access (demo)

**Domain:** Dataset-level authorization layer inside the existing federated ABAC demo (`frontend/src/demo/`)
**Researched:** 2026-07-03
**Confidence:** HIGH — grounded in direct reads of the v2.2 code (`lib/model.ts`, `store/world-state.tsx`, `lib/digital-resource-selectors.ts`, `hooks/use-digital-resources.ts`, `components/digital-resources-panel.tsx`, `components/resource-browser.tsx`, `components/resource-access-explorer.tsx`, `DemoRoot.tsx`, `lib/seed.ts`)

## Standard Architecture

### System Overview — where Dataset slots in

```
┌──────────────────────────────────────────────────────────────────────┐
│ UI (Digital Resources tab — DemoRoot activeView "digital-resources") │
│  digital-resources-panel.tsx (view switcher + SET_DIGITAL_RESOURCES) │
│   ├── ResourceBrowser        ← EXTEND: Datasets under Application    │
│   ├── ResourceAccessExplorer ← untouched (v2.2 tiers)                │
│   ├── [NEW] DatasetAccessExplorer (3-gate trace, DATA-UI-02)         │
│   └── [NEW] Dataset reverse-lookup view (who has access, what level) │
├──────────────────────────────────────────────────────────────────────┤
│ Selectors (pure, disabled-grant-aware)                               │
│  digital-resource-selectors.ts (v2.2, untouched)                     │
│  [NEW] dataset-selectors.ts: datasetsForApplication, resolveDatasetAt│
│        effectiveLevelFor, personsWithDatasetAccess                   │
├──────────────────────────────────────────────────────────────────────┤
│ World state (WorldProvider reducer, store/world-state.tsx)           │
│  digitalResources: DigitalResourceWorld   ← backend-fetched (v2.2)   │
│  [NEW] datasets: DatasetWorld             ← LOCAL seed (v2.3, mock)  │
│  [NEW] actions: TOGGLE_DATASET_GRANT / UPSERT_DATASET_GRANT /        │
│                 UPSERT_DATASET_DELEGATE                              │
├──────────────────────────────────────────────────────────────────────┤
│ Pure engine (lib/model.ts — append-only Phase 13 section)            │
│  v2.2 gate-dispatch resolver resolveResourceAccess  ← DO NOT TOUCH   │
│  [NEW] resolveDatasetAccess (fixed 3-gate chain), level-rank tables, │
│        effectiveDatasetClassification, canIssueDatasetGrant          │
├──────────────────────────────────────────────────────────────────────┤
│ Seed (lib/seed.ts — append DATASETS / DATASET_GRANTS / DELEGATES)    │
│  application_id FKs → existing APPLICATIONS ids (rsrc-milapp-1 …)    │
└──────────────────────────────────────────────────────────────────────┘
```

### The one structural tension to decide up front

**v2.2 digital-resource data is backend-served; v2.3 datasets are demo-only mock.** Since Phase 11, `seedWorld()` initializes `digitalResources` EMPTY (world-state.tsx:135, comment: "Backend is the source of truth… Do NOT re-inline the seed fixtures here"); the panel fetches `/api/digital-resources/world` via `useDigitalResourcesWorld` and dispatches `SET_DIGITAL_RESOURCES`. v2.3's scope constraint forbids backend work, so datasets must live in a **locally-seeded** `datasets` sub-object (the v2.0/v2.1 pattern), joined to backend-fetched applications by `application_id` at selector time.

This works because `seed.ts` fixtures (`APPLICATIONS`, ids `rsrc-milapp-1`, `rsrc-tacapp-1`, …) are the golden source Postgres was seeded from — ids match at runtime. But the join is cross-source, so it must degrade visibly, not throw: a dataset whose parent app is absent from the fetched world is a rendered warning (dev `console.warn` + hidden node), mirroring `getDescendants`' ghost-zone handling — NOT the `effectiveClassification` throw, because the backend world can legitimately differ from local fixtures.

### Component Responsibilities — extended vs new vs untouched

| Component | v2.3 verb | What changes |
|-----------|-----------|--------------|
| `lib/model.ts` | **EXTEND (append-only)** | Phase 13 section: `DatasetType`, per-type level vocab + rank tables, `DatasetNode`, `DatasetAccessGrant`, `DatasetAccessDelegate`, `effectiveDatasetClassification`, `resolveDatasetAccess`, `effectiveDatasetLevel`, `canIssueDatasetGrant`, seed validator. Reuses `isWindowActive`, `CLEARANCE_RANK`, `ResourceGateResult`, `effectiveClassification`. |
| `lib/seed.ts` | **EXTEND (append)** | `DATASETS`, `DATASET_GRANTS`, `DATASET_DELEGATES` fixtures instantiating DATA-SEED-01..05; FKs onto existing `APPLICATIONS` ids and `SUBJECTS` ids. |
| `store/world-state.tsx` | **EXTEND** | `WorldState.datasets: DatasetWorld` (mirror of `DigitalResourceWorld` incl. `disabledDatasetGrantIds: Set<string>`); seeded LOCALLY in `seedWorld()`; 3 new actions (`TOGGLE_DATASET_GRANT`, `UPSERT_DATASET_GRANT`, `UPSERT_DATASET_DELEGATE`) copied structurally from world-state.tsx:481-536. No `SET_DATASETS` — nothing refetches it. |
| `lib/dataset-selectors.ts` | **NEW** | `datasetsForApplication(world, appId)`, `resolveDatasetAt(...)` (filters `disabledDatasetGrantIds` AND `disabledResourceGrantIds` before calling the pure resolver — same D-06 pattern as `resolveResourceAt`), `effectiveLevelFor`, `personsWithDatasetAccess` (reverse lookup, DATA-UI-03). |
| `components/resource-browser.tsx` | **EXTEND** | Selected-Application detail pane gains a "Datasets" section (DATA-UI-01): type badge, effective classification, level vocab, active-grant count. |
| `components/dataset-access-explorer.tsx` | **NEW** | Dataset-level resolution: person + dataset + required level → ALLOW/DENY with 3-gate trace (DATA-UI-02). Reuse `ResourceResolutionTrace`'s row rendering style (resource-access-explorer.tsx:52). The existing explorer is already 477 lines and resolves a different resource union — don't extend it. |
| `components/digital-resources-panel.tsx` | **EXTEND** | `activeView` union grows (e.g. `"dataset-access"`); new nav button(s). Panel-internal — DemoRoot untouched. |
| `DemoRoot.tsx` | **UNTOUCHED** | Datasets live inside the existing Digital Resources tab (DATA-UI-01 says "within the Application view"). Stay 7 tabs. |
| `hooks/use-digital-resources.ts`, `lib/digital-resource-mapper.ts` | **UNTOUCHED** | Backend fetch path unchanged; datasets never travel through it in v2.3. |
| `resolveResourceAccess`, `evaluateGate`, `GateContext`, `ResourceTier` | **UNTOUCHED** | Byte-exact TS↔Rust golden-fixture parity (Phase 11). Any edit here forces a Rust re-port + fixture regen. Dataset is deliberately NOT a fourth `ResourceTier`. |
| Zone code (v2.1) | **UNTOUCHED** | No dataset↔zone link in requirements. |

## Recommended Project Structure

```
frontend/src/demo/
├── lib/
│   ├── model.ts                     # EXTEND: append "Phase 13: Dataset" section
│   ├── seed.ts                      # EXTEND: append DATASETS / DATASET_GRANTS / DATASET_DELEGATES
│   ├── dataset-selectors.ts         # NEW: world-aware selectors (disabled-grant filtering, reverse lookup)
│   ├── dataset-access.test.ts       # NEW: pure engine tests (mirrors digital-resource.test.ts)
│   └── dataset-selectors.test.ts    # NEW: selector tests
├── store/
│   └── world-state.tsx              # EXTEND: datasets sub-object + 3 actions + local seeding
└── components/
    ├── resource-browser.tsx          # EXTEND: Datasets section in Application detail pane
    ├── dataset-access-explorer.tsx   # NEW: person + dataset + level → gate-chain trace
    └── digital-resources-panel.tsx   # EXTEND: view-switcher entry
```

### Structure Rationale

- **Engine in `model.ts`, not a new file:** every prior milestone (zones Phase 5/6, digital resources Phase 9) appended its pure engine to `model.ts`; tests, seed, and selectors import types from one module and circular imports are avoided by design (`DigitalResourceWorld` was declared in model.ts for exactly this reason — model.ts:797-800).
- **Selectors in a new file:** `digital-resource-selectors.ts` is scoped to `DigitalResourceWorld`; dataset selectors consume BOTH `world.datasets` and `world.digitalResources` (cross-source join), so a sibling file keeps that dependency explicit.
- **New explorer component, extended browser:** browsing is additive (a section in an existing pane); resolution is a different input tuple (dataset + required level) with a different trace — separate component, shared trace-row rendering.

## Architectural Patterns

### Pattern 1: Fixed 3-gate dataset resolver, NOT a data-driven policy

**What:** `resolveDatasetAccess` is a standalone pure function implementing DATA-ACCESS-03's fixed chain, emitting the same `ResourceGateResult[]` trace shape as v2.2:

```typescript
export interface DatasetAccessResult {
  allow: boolean;
  gates: ResourceGateResult[];        // reuse the v2.2 trace-entry shape
  effectiveLevel: string | null;      // highest active level, null if none
  requiredLevel: string;
}

export function resolveDatasetAccess(
  subject: string,
  subjectClearance: Clearance,
  dataset: DatasetNode,
  parentApp: ApplicationNode,          // caller resolves the join
  allPlatforms: PlatformNode[],
  resourceGrants: ResourceAccessGrant[],   // v2.2 grants — app prerequisite
  datasetGrants: DatasetAccessGrant[],
  requiredLevel: string,
  now: Date,
): DatasetAccessResult {
  // Gate 1 — CLEARANCE: rank >= effectiveDatasetClassification(dataset, parentApp, allPlatforms)
  // Gate 2 — APP_GRANT_PREREQ: flat active ResourceAccessGrant on parentApp.id
  //          (structurally identical to evaluateParentTierGrantGate's lookup)
  // Gate 3 — DATASET_GRANT: highest active DatasetAccessGrant rank >= requiredLevel rank
  // allow = AND of all three; every gate always evaluated (full trace, v2.2 style)
}
```

**When to use:** exactly this milestone. DATA-ACCESS-03 specifies a fixed chain; datasets have no `policy_assignments` in the requirements.
**Trade-offs:** loses per-dataset policy versioning (v2.2's headline feature) — acceptable because requirements don't ask for it; if a later milestone does, the dataset can adopt `PolicyAssignment[]` additively. The big win: `resolveResourceAccess` and its Rust twin stay byte-identical.

**Why NOT extend the v2.2 gate-dispatch engine:** `GateContext.resource` is typed `NetworkNode | PlatformNode | ApplicationNode` and `ResourceTier` is a closed 3-member union with a Rust mirror. Adding `DATASET` ripples into `digital-resource-mapper.ts`, the golden-fixture export test, and `backend/` — all out of scope for a demo-only milestone.

### Pattern 2: Application-grant prerequisite = flat grant lookup (v2.2's own semantics)

**What:** Gate 2 checks for an active `ResourceAccessGrant` where `resource_id === dataset.application_id` — a flat `find` + `isWindowActive`, exactly what `evaluateParentTierGrantGate` does one tier up (model.ts:981-1007). It does NOT recursively run `resolveResourceAccess(parentApp)`.
**When to use:** DATA-ACCESS-01 says "active Application grant", not "would currently pass the full application gate chain". Flat lookup is also what v2.2's own prerequisite chain means by "grant".
**Trade-offs:** a person whose application ACCESS would be denied (e.g., clearance dropped, policy changed) but who still holds a raw app grant passes Gate 2. That is consistent with how PARENT_TIER_GRANT already behaves for Platform→Network, so it is the correct precedent — but the demo UI can optionally show the parent app's full `resolveResourceAt` verdict as advisory context in the trace (the `zoneAdvisory` precedent: informative, never feeds `allow`).

### Pattern 3: Per-type level vocab as rank tables (the `TIERS` precedent)

**What:** mirror `TIERS: Partial<Record<Domain, string[]>>` (model.ts:32-36) — ordered low→high arrays keyed by type:

```typescript
export type DatasetType = "MAILBOX" | "ARCHIVE_ROLE" | "DOCUMENT_SITE";
export const DATASET_LEVELS: Record<DatasetType, string[]> = {
  MAILBOX: ["READ", "SEND_AS", "FULL_ACCESS"],
  ARCHIVE_ROLE: ["READER", "CASE_HANDLER", "ADMIN"],
  DOCUMENT_SITE: ["READ", "CONTRIBUTE", "FULL_CONTROL"],
};
```

`effectiveDatasetLevel` = highest active grant by index (DATA-GRANT-03); Gate 3 compares indices. Keep levels `string` on `DatasetAccessGrant` (open at the type edge, like `OrgLink.role`) and fail closed on a level not present in the dataset's type vocab (`UNKNOWN_LEVEL` deny — the `UNKNOWN_GATE_KIND` precedent). This answers the requirements' open question "open enum or closed set": closed baseline union + rank tables, extensible by adding a table entry, per-type vocab validated at seed time.

### Pattern 4: Classification override, never lower (DATA-05)

**What:**

```typescript
export interface DatasetNode {
  id: string;
  name: string;
  dataset_type: DatasetType;
  application_id: string;                       // single parent, strict tree
  classification_override: Clearance | null;    // null = inherit from app
  admin_org_id: string;                         // v2.1 dual-org pattern (DATA-04)
  asset_owner_org_id: string;
}

export function effectiveDatasetClassification(
  dataset: DatasetNode, parentApp: ApplicationNode, allPlatforms: PlatformNode[],
): Clearance {
  const base = effectiveClassification(parentApp, allPlatforms); // reuse v2.2 single-hop
  if (dataset.classification_override === null) return base;
  // fail closed: an override below the app's level can never LOWER it
  return CLEARANCE_RANK[dataset.classification_override] >= CLEARANCE_RANK[base]
    ? dataset.classification_override : base;
}
```

Plus a `validateDatasetClassification` seed validator returning `string | null` (the `validatePolicyWindows` contract) that flags any below-base override as a seed error.
**Trade-offs:** resolve-time clamping AND seed-time validation is belt-and-braces; keeps the resolver total (never throws on runtime data) while still failing loud on bad fixtures. Note DATA-04 uses v2.1's fixed dual-org fields, not v2.2's `org_links` list — the requirements say so explicitly, and `canIssueDatasetGrant` becomes a simple `admin_org_id` check + delegate lookup (mirroring `canIssueResourceGrant`'s two paths).

## Data Flow

### Dataset resolution flow (new)

```
UI: DatasetAccessExplorer (person, dataset, requiredLevel, timestamp)
    ↓
selector: resolveDatasetAt(world, …)                    [dataset-selectors.ts]
    ├─ join: world.datasets.datasets → world.digitalResources.applications
    │        (by application_id; missing parent → visible warning, no resolve)
    ├─ filter: drop grants in disabledDatasetGrantIds AND app grants in
    │          disabledResourceGrantIds (D-06 pattern, both sets)
    ↓
engine: resolveDatasetAccess(...)                        [model.ts, pure]
    Gate 1 CLEARANCE  → effectiveDatasetClassification (reuses v2.2 single-hop)
    Gate 2 APP_GRANT  → flat active ResourceAccessGrant on application_id
    Gate 3 DS_GRANT   → highest active DatasetAccessGrant rank ≥ required rank
    ↓
DatasetAccessResult { allow, gates[3], effectiveLevel, requiredLevel }
    ↓
UI: trace rows (reuse ResourceResolutionTrace row style) + ALLOW/DENY banner
```

### State management (extended)

```
seedWorld()                          ── datasets seeded LOCALLY (unlike digitalResources)
    ↓
WorldState { digitalResources ←SET_DIGITAL_RESOURCES(api),  datasets ←local }
    ↓ useWorld()
components ── dispatch TOGGLE_DATASET_GRANT / UPSERT_DATASET_GRANT / UPSERT_DATASET_DELEGATE
              (local reducer only — NO backend mutation hooks in v2.3)
```

### Key Data Flows

1. **Cross-source join:** local `datasets.datasets[].application_id` → backend-fetched `digitalResources.applications[].id`. Ids align because Postgres was seeded from the same `seed.ts` fixtures. Dataset UI renders only in the panel's `"success"` loader state (the six-state loader already gates the whole tab's content).
2. **Grant toggling:** `TOGGLE_DATASET_GRANT` maintains `disabledDatasetGrantIds`; `resolveDatasetAt` filters before resolving — identical mechanics to `TOGGLE_RESOURCE_GRANT`/`resolveResourceAt`. Because Gate 2 reads app grants, toggling a v2.2 app grant off must flip the dataset verdict live — a strong demo moment and a required test.
3. **Issuing (demo-local):** issuing forms dispatch `UPSERT_DATASET_GRANT` directly after a `canIssueDatasetGrant` check in the UI — no POST, unlike v2.2's `useIssueGrant`. Gate the form on the actor org the same way `IssueGrantSection` gates on role.

## Scaling Considerations

Demo-scale only (6 units, tens of datasets). Real concerns are file growth, not load:

| Concern | Adjustment |
|---------|------------|
| `seed.ts` at 1,842 lines grows another ~300 | Acceptable one more time; if it crosses ~2,500 consider `seed-datasets.ts` re-exported from `seed.ts` (import direction: seed → model, never reverse) |
| `model.ts` at 1,183 lines grows another ~250 | Same call: keep appending (precedent + circular-import safety) unless it becomes unnavigable |
| Reverse lookup (`personsWithDatasetAccess`) is O(persons × grants) | Fine at demo scale; memoize with `useMemo` on `[world, now]` as `resource-browser.tsx:257` already does for `buildResourceTree` |

## Anti-Patterns

### Anti-Pattern 1: Making Dataset a fourth `ResourceTier`

**What people do:** extend `ResourceTier` / `GateContext.resource` union and reuse `resolveResourceAccess` with new grant semantics for datasets.
**Why it's wrong:** breaks the byte-exact TS↔Rust parity contract (golden-fixture export test + Rust resolver + mapper + backend tables all mirror the 3-tier union); v2.3 is demo-only and must not touch the backend surface.
**Do this instead:** standalone `resolveDatasetAccess` sharing primitives (`isWindowActive`, `CLEARANCE_RANK`, `ResourceGateResult`) but not the dispatcher.

### Anti-Pattern 2: Fetching datasets through `use-digital-resources.ts`

**What people do:** add datasets to the `/api/digital-resources/world` response shape "since the plumbing exists".
**Why it's wrong:** requires backend/schema/mapper changes — explicitly out of scope; also entangles the six-state loader with data that has no server source.
**Do this instead:** local seeding in `seedWorld()`; join at selector time.

### Anti-Pattern 3: Ancestor-walk or inheritance semantics for the app prerequisite

**What people do:** let a Network or Platform grant satisfy the dataset's application prerequisite, or run the full app gate chain recursively inside Gate 2.
**Why it's wrong:** v2.2's core invariant is NO cross-tier inheritance (T-09-06); flat parent-id lookup is the established prerequisite semantics (`evaluateParentTierGrantGate`).
**Do this instead:** flat active-grant match on `dataset.application_id`; surface the app's full resolution only as advisory trace context if desired.

### Anti-Pattern 4: Storing effective level or effective classification on the node/grant

**What people do:** denormalize `effective_level` onto `DatasetNode` or the grant.
**Why it's wrong:** violates the project's pure-computed ABAC constraint; goes stale the moment a grant window lapses or is toggled.
**Do this instead:** compute per-call with explicit `now: Date` (no `Date.now()` inside helpers — the Phase 9 PITFALLS #5 rule).

### Anti-Pattern 5: Advisory/trace rows wired to empty data

**What people do:** ship a trace row backed by a hardcoded empty array. v2.2's zone-advisory row shipped exactly this way and was only caught in live UAT (fixed in 12-07).
**Do this instead:** every trace row added to the UI must have a seed fixture exercising both its pass and fail rendering (DATA-SEED-04/05 provide these cases).

## Integration Points

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `resolveDatasetAccess` ↔ v2.2 engine | function reuse only (`isWindowActive`, `CLEARANCE_RANK`, `effectiveClassification`, `ResourceGateResult` shape) | never modifies v2.2 exports |
| `dataset-selectors.ts` ↔ world state | reads `world.datasets` + `world.digitalResources` + both disabled-id sets | the ONLY place the cross-source join happens |
| Dataset UI ↔ panel | new `activeView` value inside `digital-resources-panel.tsx` | DemoRoot tab list unchanged |
| Seed fixtures ↔ backend ids | `application_id` strings match `rsrc-*app-*` ids in Postgres | if backend reseeds with different ids, dataset section degrades to warnings — acceptable demo failure mode |

## Suggested Build Order (dependency-driven)

1. **Phase 13 — Model + pure engine** (mirrors v2.2 Phase 9 plans 01/02): append types, level rank tables, `effectiveDatasetClassification`, `resolveDatasetAccess`, `effectiveDatasetLevel`, `canIssueDatasetGrant`, seed validators to `model.ts` + exhaustive Vitest coverage (each gate pass/fail, level ranking, override clamp, unknown-level fail-closed, window boundaries). Zero UI/state dependencies — pure functions testable standalone.
2. **Phase 14 — Seed + world state + selectors:** `DATASETS`/`DATASET_GRANTS`/`DATASET_DELEGATES` fixtures (DATA-SEED-01..05, incl. the has-app-grant-but-no-dataset-grant denial case), `DatasetWorld` sub-object + 3 reducer actions + local seeding in `seedWorld()`, `dataset-selectors.ts` with disabled-grant filtering and reverse lookup. Depends on 1.
3. **Phase 15 — Demo UI:** ResourceBrowser dataset section (DATA-UI-01), DatasetAccessExplorer with 3-gate trace + grant toggle (DATA-UI-02), reverse-lookup view (DATA-UI-03), issuing form gated by `canIssueDatasetGrant`. Depends on 1+2. Live-UAT the toggle-app-grant→dataset-DENY flow explicitly (Anti-Pattern 5 lesson).

Research flags: Phase 13 needs no external research (all patterns proven in-repo). Phase 15 should re-read `resource-access-explorer.tsx:52-106` (`ResourceResolutionTrace`) before building the dataset trace to reuse its row rendering.

## Sources

- `frontend/src/demo/lib/model.ts` (read in full — Phase 9 engine, gate evaluators, `GateContext`, `canIssueResourceGrant`)
- `frontend/src/demo/store/world-state.tsx` (actions :194-197, reducers :481-536, empty `digitalResources` seeding :135)
- `frontend/src/demo/lib/digital-resource-selectors.ts` (`buildResourceTree`, `activeGrantsForResource`, `resolveResourceAt`)
- `frontend/src/demo/hooks/use-digital-resources.ts` (backend fetch, six-state loader, `useIssueGrant`/`useIssueDelegate`)
- `frontend/src/demo/components/{digital-resources-panel,resource-browser,resource-access-explorer}.tsx`, `DemoRoot.tsx`
- `frontend/src/demo/lib/seed.ts` (fixture exports incl. `APPLICATIONS` ids `rsrc-milapp-1`, `rsrc-tacapp-1`)
- `.planning/PROJECT.md`, `.planning/milestones/v2.3-REQUIREMENTS.md`

---
*Architecture research for: v2.3 Dataset Access (demo) — integration with the v2.2 digital-resource demo*
*Researched: 2026-07-03*
