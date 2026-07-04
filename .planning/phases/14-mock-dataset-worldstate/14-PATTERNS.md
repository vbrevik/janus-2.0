# Phase 14: Mock Dataset & WorldState - Pattern Map

**Mapped:** 2026-07-04
**Files analyzed:** 6 (2 new files, 4 modified files)
**Analogs found:** 6 / 6

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|--------------------|------|-----------|-----------------|----------------|
| `frontend/src/demo/lib/seed.ts` (additive: DATASET_NODES/GRANTS/DELEGATES, +RESOURCE_GRANTS entries, +1 Subject) | fixture/config module | CRUD (static data) | itself, `RESOURCE_GRANTS`/`APPLICATIONS`/`BASE_SUBJECTS` sections (same file, lines 1450-1826) | exact (append same style) |
| `frontend/src/demo/lib/model.ts` (additive: `DatasetAuditEntry` type only) | model/type module | transform | `AttrEvent`/`AttrOp` (model.ts:553-571) | exact (type addition, same file) |
| `frontend/src/demo/lib/dataset-selectors.ts` (new) | service/utility (pure selectors) | CRUD (read-only joins) | `frontend/src/demo/lib/digital-resource-selectors.ts` (full file) | role-match (diverges on param shape per D-11) |
| `frontend/src/demo/lib/dataset-selectors.test.ts` (new) | test | request-response (pure fn assertions) | `frontend/src/demo/lib/digital-resource.test.ts` seed-integration block (lines 888-972) + `frontend/src/demo/lib/dataset.test.ts` gate-trace idiom (lines 551-660) | exact |
| `frontend/src/demo/store/world-state.tsx` (additive: `datasets` field, `seedWorld()` population, `ISSUE_DATASET_GRANT` Action + reducer case) | store/reducer | event-driven (React reducer) | itself: `zones`/`grants`/`delegates` seeding (lines 126-131), `UPSERT_RESOURCE_GRANT` reducer case (lines 509-522), `WITHDRAW_AUTHORIZATION_ACTION` conditional no-op idiom (lines 344-360) | exact |
| `frontend/src/demo/store/world-state.test.tsx` (additive: `ISSUE_DATASET_GRANT` describe block) | test | event-driven (reducer assertions) | `UPSERT_RESOURCE_GRANT` / `UPSERT_RESOURCE_DELEGATE` describe block (lines 246-332 per RESEARCH.md; not directly re-read this pass, trust RESEARCH.md excerpt) | exact |

## Pattern Assignments

### `frontend/src/demo/lib/seed.ts` (fixture data, additive)

**Analog:** same file — `RESOURCE_GRANTS` array (seed.ts:1680-1719+) and `BASE_SUBJECTS` (seed.ts:59-100+)

**Section-header + array-of-object convention** (seed.ts:1680-1719):
```typescript
// --- Grants (RSRC-SEED-05: temporal variety per tier) ---

export const RESOURCE_GRANTS: ResourceAccessGrant[] = [
  // === NETWORK grants ===
  // Expired network grant
  {
    id: "rsrc-grant-milnet-expired",
    person_id: "subj-1",
    resource_id: "rsrc-milnet",
    valid_from: null,
    valid_until: new Date("2025-01-01"),
  },
  // Active network grant
  {
    id: "rsrc-grant-milnet-active",
    person_id: "subj-1",
    resource_id: "rsrc-milnet",
    valid_from: null,
    valid_until: null,
  },
  ...
```
Follow this exact convention for `DATASET_NODES`/`DATASET_GRANTS`/`DATASET_DELEGATES`: a `// --- Phase 14: Mock dataset fixtures (v2.3) ---` header comment, one `export const X: Type[] = [...]` per array, inline `// comment` above each fixture object explaining its narrative role (expired/active/future/deny-case), consistent `id` naming scheme (`ds-<type>-<n>`, `ds-grant-<...>`).

**Subject roster convention** (seed.ts:54-57, 59-100):
```typescript
// subj-1: Dana Reyes — CA-1 clean ALLOW actor (MILITARY_1, SECRET, DATA:REST...)
// subj-2: Sam Okafor — cross-entity release target (MILITARY_2, TOP_SECRET, ...)
// subj-3: Lee Park — CA-2 tier-DENY actor (INTEL, CONFIDENTIAL, COMPUTER:STA...)
// subj-4: Mara Vance — CA-4 NTK-DENY actor (MILITARY_1, TOP_SECRET, CITADEL ...)

const BASE_SUBJECTS: Subject[] = [
  { id: "subj-1", ... },
  ...
];
```
New denial-narrative subject (D-04) should follow this same one-line-comment-above-the-array-entry documentation style, with a fictional name/unit/clearance per the existing convention (not appended silently without a comment).

**Additive extension is safe:** verified `RESOURCE_GRANTS` is a flat top-level array; appending new `{id, person_id, resource_id, valid_from, valid_until}` entries for subj-2/subj-3 requires no restructuring — same shape, same file, same export.

---

### `frontend/src/demo/lib/model.ts` (additive: `DatasetAuditEntry` type)

**Analog:** `AttrEvent`/`AttrOp` (model.ts:553-571, cited via RESEARCH.md; pattern only, not literal shape per D-05)

**Pattern to follow:** append a small new interface in the "Phase 13" Dataset-domain block (model.ts:1166-1743) rather than in `world-state.tsx`, per RESEARCH.md Open Question 1's recommendation — keeps every `Dataset*`-prefixed type co-located (`DatasetNode` model.ts:1291, `DatasetAccessGrant` model.ts:1305, `DatasetAccessDelegate` model.ts:1317, `DatasetAccessResult` model.ts:1499).

**Locked shape** (per CONTEXT.md D-05/D-06/D-07 — NOT a literal mirror of `AttrEvent`):
```typescript
export interface DatasetAuditEntry {
  seq: number;               // shares WorldState.seq (D-07)
  timestamp: Date;           // the `now` passed into issueDatasetGrant (D-07)
  actor_person_id: string;   // D-06 — matches canIssueDatasetGrant's own param name
  actor_org_id: string;      // D-06
  dataset_id: string;
  person_id: string;
  level: string;             // vocabulary depends on dataset_type — see model.ts DatasetType
}
```
**Do NOT** search for or reuse a pre-existing `AuditLogEntry` — confirmed absent repo-wide (see RESEARCH.md Pitfall 4).

---

### `frontend/src/demo/lib/dataset-selectors.ts` (new)

**Analog:** `frontend/src/demo/lib/digital-resource-selectors.ts` (full file, 143 lines)

**Imports pattern** (digital-resource-selectors.ts:1-15):
```typescript
// demo/lib/digital-resource-selectors.ts — Pure read selectors over DigitalResourceWorld.
// All functions take explicit `now: Date`; none call Date.now()/new Date() internally.

import {
  resolveResourceAccess,
  isWindowActive,
  effectiveClassification,
  type ResourceAccessGrant,
  type ResourceAccessResult,
  type Clearance,
  type ZoneNode,
  type PhysicalAccessGrant,
} from "./model";
import type { DigitalResourceWorld } from "./model";
```
For `dataset-selectors.ts`, import `resolveDatasetAccess`, `canIssueDatasetGrant`, `isWindowActive`, plus `type DatasetNode, DatasetAccessGrant, DatasetAccessDelegate, DatasetAccessResult, Clearance, ApplicationNode, PlatformNode` from `./model`.

**Signature-shape DIVERGENCE (deliberate, per D-11 + RESEARCH.md Pitfall 1):** the analog takes a single `world: DigitalResourceWorld` param (digital-resource-selectors.ts:31-32, 86-89, 103-111) — do NOT copy this literally. `dataset-selectors.ts` must take explicit individual array params because the join spans two different `WorldState` sub-objects (`state.datasets` and `state.digitalResources.applications`), e.g.:
```typescript
export function resolveDatasetAt(
  datasets: DatasetNode[],
  datasetGrants: DatasetAccessGrant[],
  applications: ApplicationNode[],
  platforms: PlatformNode[],
  subject: string,
  subjectClearance: Clearance,
  appGrants: ResourceAccessGrant[],
  datasetId: string,
  requiredLevel: string,
  now: Date,
): DatasetAccessResult { ... }
```

**Active-window filter pattern to reuse verbatim** (digital-resource-selectors.ts:86-98):
```typescript
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
Mirror for a dataset-scoped equivalent (no `disabled` set exists for datasets — omit that clause).

**"Not found" early-return pattern** (digital-resource-selectors.ts:117-130):
```typescript
const resource =
  world.networks.find((n) => n.id === resourceId) ??
  world.platforms.find((p) => p.id === resourceId) ??
  world.applications.find((a) => a.id === resourceId);
if (!resource) {
  return {
    allow: false,
    gates: [],
    zoneAdvisory: null,
    policyVersion: null,
    reason: "RESOURCE_NOT_FOUND",
  };
}
```
Adapt shape to `DatasetAccessResult`'s actual fields (check `model.ts:1499` for exact interface) if a "dataset not found" or "application not found" early-return is needed — SPEC.md's "missing-application soft-fail" requirement from Phase 13 already governs this inside `resolveDatasetAccess` itself, so this selector-level guard is likely unnecessary; only add it if `dataset-selectors.ts` needs to look up entities by ID before calling `resolveDatasetAccess`.

---

### `frontend/src/demo/lib/dataset-selectors.test.ts` (new)

**Analog:** `frontend/src/demo/lib/digital-resource.test.ts` seed-integration block (lines 888-944) + `frontend/src/demo/lib/dataset.test.ts` gate-trace idiom (lines 551-588, per RESEARCH.md excerpt)

**Seed-integration import + describe pattern** (digital-resource.test.ts:50-66, 888-897):
```typescript
// Seed integration tests — the ONE place this file imports real seed fixtures.
// Unit tests above stay inline (D3-13 pattern).
import {
  RESOURCE_NODES, RESOURCE_GRANTS, RSRC_DELEGATES, PLATFORMS, APPLICATIONS, ZONES, GRANTS,
} from "./seed";
import {
  buildResourceTree, activeGrantsForResource, resolveResourceAt,
} from "./digital-resource-selectors";

const NOW = new Date("2026-02-15T12:00:00Z");

describe("seed integration: digital-resource fixtures", () => {
  const milnet = RESOURCE_NODES.find((n) => n.name === "MilNet")!;
  it("seed-06-shift-resolves: ALLOW before / DENY after the incident date (same person)", () => {
    const before = resolveResourceAccess(
      "subj-1", "SECRET", "MILITARY_1", milnet, RESOURCE_NODES, [],
      RESOURCE_GRANTS, [], [], NOW_A,
    );
    expect(before.allow).toBe(true);
    ...
  });
});
```
For `dataset-selectors.test.ts`, import `DATASET_NODES, DATASET_GRANTS, DATASET_DELEGATES, APPLICATIONS, PLATFORMS, RESOURCE_GRANTS` from `./seed`, define one fixed `NOW` (RESEARCH.md recommends reusing `dataset.test.ts`'s `2026-07-01T12:00:00Z`), and structure DATA-SEED-04/05/06 as `it(...)` blocks inside a single `describe("seed integration: dataset fixtures", ...)`.

**Sole-deciding-gate assertion idiom** (RESEARCH.md verbatim citation of `dataset.test.ts:560-588` — reuse exactly for DATA-SEED-06's 3-case deny-matrix):
```typescript
it("denies when the app grant expired before now, even with a still-active dataset grant (APP_GRANT_OR is the sole failing gate)", () => {
  const result = resolveDatasetAccess(
    "p1", "SECRET", ds, apps, platforms,
    [expiredAppGrant], [liveDatasetGrant], "READ", NOW,
  );
  expect(result.allow).toBe(false);
  const appGate = result.gates.find((g) => g.kind === "APP_GRANT_OR");
  expect(appGate?.pass).toBe(false);
  expect(result.gates.find((g) => g.kind === "CLEARANCE")?.pass).toBe(true);
  expect(result.gates.find((g) => g.kind === "DATASET_GRANT")?.pass).toBe(true);
  expect(result.visible).toBe(false);
});
```
Critical gotcha from RESEARCH.md Pitfall 3: the app-grant-expired deny-matrix case has `visible: false` (NOT `true`) — do not conflate with DATA-SEED-05's "no dataset grant" case, which keeps `visible: true`.

---

### `frontend/src/demo/store/world-state.tsx` (additive)

**Analog:** same file — `WorldState` interface + `seedWorld()` (lines 76-147), `Action` union (149-197), `UPSERT_RESOURCE_GRANT` reducer case (509-522), `WITHDRAW_AUTHORIZATION_ACTION` no-op idiom (344-360)

**WorldState field + eager-seed pattern to mirror** (world-state.tsx:92-96, 126-131 — the `zones`/`grants`/`delegates` style, NOT `digitalResources`):
```typescript
// WorldState interface fields:
zones: ZoneNode[];
grants: PhysicalAccessGrant[];
delegates: ZoneAccessDelegate[];

// seedWorld() population:
zones: [...ZONES],
grants: [...GRANTS],
delegates: [...DELEGATES],
```
Add to `WorldState`: `datasets: { nodes: DatasetNode[]; grants: DatasetAccessGrant[]; delegates: DatasetAccessDelegate[]; auditLog: DatasetAuditEntry[] };` and in `seedWorld()`:
```typescript
datasets: {
  nodes: [...DATASET_NODES],
  grants: [...DATASET_GRANTS],
  delegates: [...DATASET_DELEGATES],
  auditLog: [],
},
```
**Contrast — explicitly do NOT mirror** the `digitalResources` empty-then-fetch pattern (world-state.tsx:132-145):
```typescript
// Backend is the source of truth (Phase 11). These start empty; Phase 12
// populates them via GET /api/digital-resources/world. Do NOT re-inline the
// seed fixtures here...
digitalResources: { networks: [], platforms: [], applications: [], ... },
```

**Unconditional-upsert reducer pattern** (world-state.tsx:509-522, `UPSERT_RESOURCE_GRANT` — precedent for array-append shape, but NOT for the gate-check):
```typescript
case "UPSERT_RESOURCE_GRANT": {
  const exists = state.digitalResources.grants.some(
    (g) => g.id === action.grant.id,
  );
  const grants = exists
    ? state.digitalResources.grants.map((g) =>
        g.id === action.grant.id ? action.grant : g,
      )
    : [...state.digitalResources.grants, action.grant];
  return {
    ...state,
    digitalResources: { ...state.digitalResources, grants },
  };
}
```

**Conditional-no-op idiom to mirror for the gate check** (world-state.tsx:344-350, `WITHDRAW_AUTHORIZATION_ACTION`):
```typescript
case "WITHDRAW_AUTHORIZATION_ACTION": {
  const subjects = state.subjects.map((s) => {
    if (s.id !== action.subjectId || !s.authorization) return s;
    const clone = cloneSubject(s);
    clone.authorization = { ...s.authorization, status: "WITHDRAWN" };
    return clone;
  });
  return { ...state, subjects, events: [...], seq: state.seq + 1 };
}
```
Combine both into `ISSUE_DATASET_GRANT` (RESEARCH.md's Pattern 2 code example is the authoritative synthesis — reproduced here):
```typescript
case "ISSUE_DATASET_GRANT": {
  const allowed = canIssueDatasetGrant(
    action.actorOrgId, action.actorPersonId, dataset,
    action.level, state.datasets.grants, state.datasets.delegates, action.now,
  );
  if (!allowed) return state; // silent refusal — no grant, no audit (SPEC R7)
  const grant: DatasetAccessGrant = { /* ... */ };
  const auditEntry: DatasetAuditEntry = {
    seq: state.seq + 1, timestamp: action.now,
    actor_person_id: action.actorPersonId, actor_org_id: action.actorOrgId,
    dataset_id: action.datasetId, person_id: action.personId, level: action.level,
  };
  return {
    ...state,
    datasets: {
      ...state.datasets,
      grants: [...state.datasets.grants, grant],
      auditLog: [...state.datasets.auditLog, auditEntry],
    },
    seq: state.seq + 1,
  };
}
```
Add `now: Date` explicitly to the `ISSUE_DATASET_GRANT` action payload (RESEARCH.md Open Question 2 — no reducer case currently carries `now`, but this is required for deterministic `DatasetAuditEntry.timestamp` testing).

**Action union entry to add** (world-state.tsx:196, alongside):
```typescript
| { type: "UPSERT_RESOURCE_GRANT"; grant: ResourceAccessGrant }
```
→
```typescript
| { type: "ISSUE_DATASET_GRANT"; actorOrgId: string; actorPersonId: string; datasetId: string; personId: string; level: string; now: Date }
```

**Imports to add** (world-state.tsx:14-35 style — named imports from `../lib/model` and `../lib/seed`): add `DatasetNode, DatasetAccessGrant, DatasetAccessDelegate, DatasetAuditEntry, resolveDatasetAccess (if needed), canIssueDatasetGrant` to the `model` import block, and `DATASET_NODES, DATASET_GRANTS, DATASET_DELEGATES` to the `seed` import block.

---

### `frontend/src/demo/store/world-state.test.tsx` (additive)

**Analog:** `UPSERT_RESOURCE_GRANT` / `UPSERT_RESOURCE_DELEGATE` describe block (world-state.test.tsx:246-332, per RESEARCH.md verbatim citation — not independently re-read this pass since RESEARCH.md already quoted it directly):
```typescript
describe("UPSERT_RESOURCE_GRANT / UPSERT_RESOURCE_DELEGATE actions", () => {
  it("UPSERT_RESOURCE_GRANT appends when the id is novel", () => {
    const state = seedWorld();
    expect(state.digitalResources.grants).toHaveLength(0);
    const next = reducer(state, { type: "UPSERT_RESOURCE_GRANT", grant: grantFixture() });
    expect(next.digitalResources.grants).toHaveLength(1);
  });
});
```
New `describe("ISSUE_DATASET_GRANT action", ...)` block needs exactly 2 tests per SPEC R7: (1) permitted issuance creates both a grant AND an audit entry; (2) gate-failing issuance creates NEITHER (state reference equality or unchanged array lengths). This lives in `world-state.test.tsx`, NOT `dataset-selectors.test.ts` (file-per-concern precedent: reducer-action tests stay with `world-state.test.tsx`, pure-selector tests stay with `dataset-selectors.test.ts` per D-09).

## Shared Patterns

### Explicit-`now`, no internal `Date.now()`
**Source:** `digital-resource-selectors.ts` (file header comment, line 2) + carried from Phase 13's `model.ts` dataset functions
**Apply to:** `dataset-selectors.ts` (every exported function), `ISSUE_DATASET_GRANT`'s action payload (must carry `now: Date` explicitly, not read from `state` or call `new Date()` in the reducer)

### Fixed-clock test convention
**Source:** `digital-resource.test.ts:70` (`const NOW = new Date("2026-02-15T12:00:00Z")`), `dataset.test.ts:513` (`2026-07-01T12:00:00Z`)
**Apply to:** `dataset-selectors.test.ts` — define one module-level fixed `NOW` constant, reuse `dataset.test.ts`'s value for continuity unless the deny-matrix's expired-grant window forces a different date

### Append-only array mutation via spread, never in-place `.push()`
**Source:** `world-state.tsx:126-131` (`zones: [...ZONES]`), `world-state.tsx:517` (`[...state.digitalResources.grants, action.grant]`)
**Apply to:** `seedWorld()`'s `datasets` population, and `ISSUE_DATASET_GRANT`'s grant/audit-log appends

### Additive seed.ts extension, never restructuring existing arrays
**Source:** `seed.ts:1682` (`RESOURCE_GRANTS` flat array), confirmed via research no test snapshots array length
**Apply to:** the new `RESOURCE_GRANTS` entries for subj-2/subj-3 (D-01) — append only, same object shape, no reordering of existing entries

## No Analog Found

None — every file in this phase's scope has a strong same-repo analog (this is an explicitly "mirror an existing pattern" phase per RESEARCH.md's own framing). The one genuinely novel piece is the `canIssueDatasetGrant`-gated reducer branch (`ISSUE_DATASET_GRANT`), which has no exact reducer precedent but is fully specified by combining two existing idioms (`UPSERT_RESOURCE_GRANT`'s append shape + `WITHDRAW_AUTHORIZATION_ACTION`'s conditional-no-op guard) — see Pattern Assignments above.

## Metadata

**Analog search scope:** `frontend/src/demo/lib/`, `frontend/src/demo/store/` (no other directories relevant — phase is pure-frontend-mock, no backend/UI touched)
**Files scanned:** `digital-resource-selectors.ts`, `world-state.tsx` (full), `seed.ts` (targeted sections: BASE_SUBJECTS, PLATFORMS, APPLICATIONS, RESOURCE_GRANTS), `digital-resource.test.ts` (imports + seed-integration block), `model.ts` (Dataset-domain type locations via grep), `dataset.test.ts` (via RESEARCH.md citation, not re-read)
**Pattern extraction date:** 2026-07-04
