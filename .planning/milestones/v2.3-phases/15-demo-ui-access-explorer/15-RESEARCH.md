# Phase 15: Demo UI & Access Explorer - Research

**Researched:** 2026-07-05
**Domain:** React 19 + TypeScript frontend UI, wiring new components/hook/reducer-action onto an existing pure-frontend mock (`frontend/src/demo/`)
**Confidence:** HIGH

## Summary

This phase is 100% additive frontend work inside a single, already-mature, router-isolated demo module. Zero new dependencies, zero backend changes. CONTEXT.md, SPEC.md, and UI-SPEC.md for this phase are unusually complete and were independently verified against the live codebase in this research pass: every cited line number, function signature, and prior-art code pattern checked out exactly as claimed (see "Canonical Reference Verification" below), with one confirmed exception — Phase 13's D-06 decision ("missing-application soft-fail, never throw") does **not** match the shipped `resolveDatasetAccess` implementation, which throws by design and is covered by a passing test explicitly titled "fail-closed, not silent deny." This matters directly for this phase's new `ErrorBoundary`: it is not a purely theoretical safety net, it has a real, tested throw path it must catch.

The other major finding is a genuine, non-obvious React wiring hazard in D-10/D-11's `useIssueDatasetGrant` hook: the `ISSUE_DATASET_GRANT` reducer case returns the *exact same state reference* (`return state;`, proven by an existing passing test asserting `expect(next).toBe(state)`) when `canIssueDatasetGrant` denies the request. Per React's own documented `useReducer` bailout behavior, an `Object.is`-equal returned state causes React to skip re-rendering **and skip firing effects** entirely. A naive `useEffect`-only implementation of D-11's "compare audit-log length before/after dispatch" will hang in `isPending: true` forever on denial, because the effect that would notice the length changed literally never runs. This research documents a concrete, tested-precedent-compatible implementation pattern that avoids this trap (see Common Pitfall 1 and Code Examples).

Live-verified baseline: `cd frontend && npx vitest run` → 314/314 tests passing (20 files); `npx tsc -b --noEmit` → zero errors. Both must stay true after this phase's changes per SPEC's acceptance criteria.

**Primary recommendation:** Build strictly by extending the existing patterns this research confirms are accurate (`ResourceResolutionTrace`, `IssueGrantSection`, `ResourceTreeNodeRow`, the six-state loader, `useWorld()`/`useWorldDispatch()`), implement `useIssueDatasetGrant`'s denial-detection with the dual effect+fallback-timer pattern in Code Examples (not a naive effect-only comparison), and treat the new `ErrorBoundary`'s fallback as covering a real, already-tested throw path, not a defensive-only stub.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Application picker (datasets tab) | Browser / Client | — | Pure client-side selection UI over already-fetched `world.digitalResources.applications`; no new fetch beyond D-04's existing-pattern reuse |
| Dataset browsing (per-Application list) | Browser / Client | — | Reads `state.datasets.nodes` (eager in-memory seed, Phase 14 D-10) via `datasetsForApplication` selector; zero network |
| Dataset access resolution (4-gate trace) | Browser / Client | — | `resolveDatasetAccess` (Phase 13, `lib/model.ts`) runs synchronously in the browser against in-memory `WorldState`; there is no backend for this domain this milestone |
| Reverse-lookup (dataset → persons) | Browser / Client | — | Iterates `world.subjects` client-side, calling `resolveDatasetAt` per person; no backend aggregation exists or is needed |
| Grant issuing (`ISSUE_DATASET_GRANT`) | Browser / Client | — | Synchronous in-memory reducer dispatch (Phase 14 D-10); explicitly NOT routed through the real `/api/digital-resources/*` backend the way v2.2's `useIssueGrant` is |
| Digital Resources world fetch (Applications only, reused for the picker) | API / Backend (fetch) | Browser / Client (cache in `WorldState`) | The only network call this phase's UI triggers, and it's a *reuse* of the existing Phase 12 `/api/digital-resources/world` endpoint via `useDigitalResourcesWorld`, not a new one |
| Auth/session (admin gate) | Browser / Client (UI gate) | — (no new backend gate) | `getStoredUserRole() === "admin"` reads `localStorage` only; the authoritative enforcement is the in-browser `canIssueDatasetGrant` reducer-level gate (Phase 13), not any server call — there is no backend in this domain to enforce anything server-side |

No tier misassignment risk here: every capability in this phase is client-tier by construction (SPEC's own "zero backend calls for the dataset domain" constraint), except the one already-existing Digital Resources fetch this phase reuses read-only.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DATA-UI-01 | New "Datasets" tab + panel, filtered by selected Application, generic multi-app loop | Verified `datasetsForApplication` selector signature and live seed data (`rsrc-milapp-1` → 4 datasets, `rsrc-intapp-1` → 1 dataset) exactly match SPEC's acceptance claim; `ResourceTreeNodeRow`/`TIER_TONE` precedent confirmed at exact cited lines for the D-01/D-02 flat-picker pattern |
| DATA-UI-02 | New `dataset-access-explorer.tsx` sibling, full 4-gate trace, ALLOW/DENY | Verified `resolveDatasetAccess`/`DatasetAccessResult` signature and gate order at `model.ts:1521`/`1499`; verified `ResourceResolutionTrace`'s exact JSX/className structure to mirror; found and documented the real throw path (missing `application_id`, out-of-vocabulary `requiredLevel`) the wrapping `ErrorBoundary` must catch |
| DATA-UI-03 | Reverse-lookup: persons with `allow===true`, one row per person, effective level | Verified `effectiveRankedLevel`/`effectiveArchiveCoverage` signatures at `model.ts:1452`/`1477`; confirmed `resolveDatasetAt`'s per-person-call pattern in `dataset-selectors.ts` is the correct building block (no batch/backend equivalent exists or is needed) |
| DATA-UI-04 | Admin-gated issuing form, `ISSUE_DATASET_GRANT` payload extension | Verified current action payload (`world-state.tsx:219-226`) and reducer case (`:568-611`) exactly as CONTEXT.md cites; verified via a passing test that denial returns the identical state reference — documented the resulting React `useReducer`-bailout hazard for D-11's hook and a working implementation pattern |

</phase_requirements>

## Canonical Reference Verification

Every canonical ref cited in `15-CONTEXT.md`, `14-CONTEXT.md`, and `13-CONTEXT.md` was checked directly against the live repository this session. Results:

| Claim | Verified? | Note |
|---|---|---|
| `world-state.tsx:219-226` — current `ISSUE_DATASET_GRANT` action, no `validFrom`/`validUntil` | ✅ exact | Confirmed field-for-field |
| `world-state.tsx:568-611` — reducer case hardcodes `valid_from`/`valid_until` to `null` | ✅ exact | Confirmed at `:590-591` |
| `model.ts:1521` `resolveDatasetAccess`, `:1679` `canIssueDatasetGrant`, `:1452`/`:1477` effective-level helpers | ✅ exact | All four line numbers point to the exact function declaration |
| `dataset-selectors.ts` — `datasetsForApplication`, `activeDatasetGrantsForPerson`, `resolveDatasetAt` | ✅ exact | All three exist with the individual-array-param style D-11 describes |
| `CLEARANCE_TONE` exported from `access-resolution-explorer.tsx` | ✅ exact | `export const CLEARANCE_TONE: Record<Clearance, ...>` at line 24 |
| `resource-access-explorer.tsx` `GATE_LABEL`, `IssueGrantSection` (`isAdmin` early-return, `resetFields`, toggle, submit button) | ✅ exact | Line numbers within a few lines of CONTEXT's/UI-SPEC's implied structure; exact code quoted in Code Examples below |
| `resource-browser.tsx` `ResourceTreeNodeRow`, `TIER_TONE`, `grid-cols-3` | ✅ exact | `TIER_TONE.APPLICATION = "green"`, `grid grid-cols-3 gap-4` at line 310 |
| SPEC.md: "314 passing tests" / "20 test files" | ✅ exact | Re-ran `npx vitest run` live: 314 passed (314), 20 test files passed (20) |
| SPEC.md: `npx tsc -b --noEmit` clean | ✅ exact | Re-ran live: zero errors |
| SPEC.md acceptance: `rsrc-milapp-1` → 2 mailboxes + 1 archive role + 1 document site; `rsrc-intapp-1` → 1 document site | ✅ exact | Confirmed via `grep` on `seed.ts:1899-1941` `DATASET_NODES` |
| 13-CONTEXT.md D-06: "missing application soft-fail... NOT a hard error/throw" | ❌ **drift found** | See Common Pitfall 2 — the shipped code throws, and this is tested/intentional, not a bug |
| 15-CONTEXT.md's restatement of D-06 ("resolver never throws for that case") | ❌ **inherits the drift** | See Common Pitfall 2 |
| `useWorld()` / `useWorldDispatch()` as the state/dispatch hooks | ✅ exact, with one naming correction | CONTEXT.md's canonical refs never state a state-reading hook name explicitly, but the correct name is **`useWorld()`**, not `useWorldState()` — flagging since a planner/executor could plausibly guess the latter by analogy to `useWorldDispatch` |

## Standard Stack

No new dependencies this phase (SPEC constraint: "No new frameworks or libraries"). All libraries below are already installed and in use; this table documents current, live-verified versions only — no installation step is needed.

| Library | Installed version (verified) | Purpose in this phase |
|---------|-------------------------------|------------------------|
| React / react-dom | 19.1.1 [VERIFIED: frontend/package.json] | New components + the new `ErrorBoundary` class component |
| TypeScript | 5.9.3 [VERIFIED: frontend/package.json] | Strict-mode typing for all new files |
| Vitest | 4.0.3 [VERIFIED: `node -e "require('vitest/package.json').version"`] | Existing/any new unit tests |
| @testing-library/react | 16.3.0 [VERIFIED: frontend/package.json, used today only in `src/hooks/use-websocket.test.ts`] | Available if the planner wants `renderHook`-based tests for `useIssueDatasetGrant`; not currently used anywhere in `demo/` |
| @tanstack/react-query | 5.90.5 [VERIFIED: frontend/package.json] | Reused only via `useDigitalResourcesWorld` (D-04's independent fetch) — the new `useIssueDatasetGrant` hook itself is NOT a `useMutation` (see Common Pitfall 1) |
| lucide-react | 0.548.0 [VERIFIED: frontend/package.json] | `Loader2` only, already used by the six-state loader this phase reuses verbatim |

No shadcn/Radix components are introduced (per UI-SPEC's explicit scope note) — not applicable to check.

### Installation
Not applicable — no `npm install` needed this phase.

## Package Legitimacy Audit

Not applicable. This phase installs zero external packages (constraint: "No new frameworks or libraries"). No package-legitimacy check was run because there is nothing to check.

**Packages removed due to SLOP verdict:** none (n/a)
**Packages flagged as suspicious [SUS]:** none (n/a)

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│ DemoRoot.tsx  (ActiveView union + nav button row)                   │
│   activeView === "datasets"  ──────────────────────────────┐        │
└──────────────────────────────────────────────────────────── │ ──────┘
                                                                ▼
┌───────────────────────────────────────────────────────────────────────┐
│ DatasetsPanel  (own useDigitalResourcesWorld fetch, D-04)              │
│                                                                         │
│  [network call]                                                        │
│  useDigitalResourcesWorld(hasToken) ──▶ GET /api/digital-resources/world│
│         │ (query.isSuccess)                                           │
│         ▼                                                              │
│  dispatch(SET_DIGITAL_RESOURCES)  ──▶  WorldState.digitalResources     │
│         │                                                              │
│  classifyLoaderState() ──▶ one of 6 mutually-exclusive states          │
│         │ (only "success" continues below)                            │
│         ▼                                                              │
│  ┌───────────────────────┬─────────────────────────────┐              │
│  │ Application picker     │ Datasets list (right)       │              │
│  │ (flat rows, D-01/D-02)  │ datasetsForApplication(     │              │
│  │ world.digitalResources  │   state.datasets.nodes,     │              │
│  │  .applications           │   selectedAppId)            │              │
│  └───────────┬─────────────┴──────────────┬──────────────┘              │
│              │ row click (selects a dataset, D-05/D-07)                 │
│              ▼                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ <ErrorBoundary key={selectedDataset.id}>   (D-12/D-15)          │   │
│  │                                                                   │   │
│  │  DatasetAccessExplorer (person + dataset + requiredLevel + now) │   │
│  │       │                                                          │   │
│  │       ▼                                                          │   │
│  │  resolveDatasetAt(...) ──▶ DatasetAccessResult{allow,gates,visible}│  │
│  │       │  (may THROW — missing application_id / bad vocabulary)  │   │
│  │       ▼                                                          │   │
│  │  DatasetResolutionTrace  (verdict card + 4 gate rows)            │   │
│  │                                                                   │   │
│  │  IssueDatasetGrantSection (admin-gated, D-08/D-09)               │   │
│  │       │ submit                                                   │   │
│  │       ▼                                                          │   │
│  │  useIssueDatasetGrant().mutate(...)                              │   │
│  │       │ dispatch(ISSUE_DATASET_GRANT)                            │   │
│  │       ▼                                                          │   │
│  │  reducer: canIssueDatasetGrant(...) ? {new grant + audit entry}  │   │
│  │                                     : return SAME state ref      │   │
│  │                                       (no re-render — Pitfall 1) │   │
│  │                                                                   │   │
│  │  DatasetReverseLookup (loops world.subjects, calls resolveDatasetAt│  │
│  │   per person, keeps allow===true)                                │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure
```
frontend/src/demo/
├── DemoRoot.tsx                       # EDIT: add "datasets" ActiveView + nav button + <main> swap
├── components/
│   ├── ui.tsx                         # EDIT: add ErrorBoundary export (D-13)
│   ├── datasets-panel.tsx             # NEW: DatasetsPanel (tab orchestrator, D-04 fetch, D-06 grid)
│   ├── dataset-access-explorer.tsx    # NEW: DatasetAccessExplorer + DatasetResolutionTrace + GATE_LABEL
│   └── dataset-reverse-lookup.tsx     # NEW: DatasetReverseLookup
├── hooks/
│   └── use-datasets.ts                # NEW: useIssueDatasetGrant
├── lib/
│   ├── model.ts                       # untouched this phase (Phase 13 already complete)
│   └── dataset-selectors.ts           # untouched this phase (Phase 14 already complete)
└── store/
    └── world-state.tsx                # EDIT: extend ISSUE_DATASET_GRANT payload + reducer case only
```

### Pattern 1: Six-state loader reuse (D-04)
**What:** `datasets-panel.tsx` performs its own independent `useDigitalResourcesWorld` fetch and reuses `classifyLoaderState`/`LoaderState` verbatim, exactly like `digital-resources-panel.tsx` does, so the Application picker works regardless of tab-visit order.
**When to use:** Any time this phase's UI needs `world.digitalResources.applications` before the Digital Resources tab has necessarily been visited.
**Example:**
```tsx
// Source: frontend/src/demo/components/digital-resources-panel.tsx (verbatim pattern to copy)
const hasToken = hasStoredToken();
const query = useDigitalResourcesWorld(hasToken);
const dispatch = useWorldDispatch();
const state: LoaderState = classifyLoaderState(hasToken, query);

useEffect(() => {
  if (query.isSuccess && query.data) {
    dispatch({ type: "SET_DIGITAL_RESOURCES", world: query.data });
  }
}, [query.isSuccess, query.data, dispatch]);

if (state === "missing-token") { /* ...same 5 non-success branches... */ }
```

### Pattern 2: Flat picker row, not a tree (D-01/D-02)
**What:** `ResourceTreeNodeRow`'s Pill+name row shell, without the expand/collapse chevron branch and without recursion.
**When to use:** The new Application-only picker.
**Example:**
```tsx
// Source: frontend/src/demo/components/resource-browser.tsx:64-89 (ResourceTreeNodeRow), stripped of the chevron/children branch
function ApplicationRow({ app, selected, onSelect }: { app: ApplicationNode; selected: boolean; onSelect: (id: string) => void }) {
  return (
    <button
      className={`flex w-full items-center gap-2 rounded px-2 py-1 text-left text-sm ${selected ? "bg-slate-200" : "hover:bg-slate-100"}`}
      onClick={() => onSelect(app.id)}
    >
      <Pill tone="green">APPLICATION</Pill>
      <span className={`text-sm${selected ? " font-semibold text-slate-900" : ""}`}>{app.name}</span>
    </button>
  );
}
```
`"green"` matches the live `TIER_TONE.APPLICATION` value confirmed in `resource-browser.tsx`.

### Pattern 3: Gate-chain trace rendering (DATA-UI-02)
**What:** Unconditional 4-row gate list under a green/red verdict card, matching `ResourceResolutionTrace` pixel-for-pixel.
**Example:** see Code Examples section (full `DatasetResolutionTrace` below) — do not add any conditional hiding of passing/failing gates; `resolveDatasetAccess` already computes all 4 unconditionally (13-CONTEXT D-03/D-04, confirmed live at `model.ts:1499-1503`).

### Anti-Patterns to Avoid
- **Wrapping `useIssueDatasetGrant` in `useMutation`:** There is no async operation to wrap (D-10's own reasoning notwithstanding — D-10 asks for *API-shape parity*, i.e., `isPending`/`isError` fields, not literal reuse of TanStack Query's `useMutation`). A synchronous dispatch wrapped in `useMutation`'s `mutationFn` will resolve on literally the next microtick regardless of success/denial, and does not naturally expose the audit-log-length comparison D-11 requires. Build a small hand-rolled hook instead (Code Examples).
- **Detecting `ISSUE_DATASET_GRANT` denial via a bare `useEffect` keyed on `auditLog.length`:** Will hang forever on denial — see Common Pitfall 1.
- **Assuming `resolveDatasetAccess`/`resolveDatasetAt` never throws:** They do, by tested design, for a missing `application_id` or an out-of-vocabulary `requiredLevel`. Always call them inside the new `ErrorBoundary`'s subtree (Common Pitfall 2).
- **Introducing a shared cross-file `GATE_LABEL`/tone map:** This codebase's explicit, repeated convention (per-file comment in `resource-access-explorer.tsx`) is per-file duplication of these small maps. Don't "DRY" this up into a shared module — that would be an unrequested refactor outside this phase's surgical scope.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|--------------|-----|
| 4-gate ALLOW/DENY computation | A new dataset-specific resolution algorithm in the component | `resolveDatasetAccess` / `resolveDatasetAt` (Phase 13/14, already exhaustively tested) | Duplicating gate logic in the UI would double-maintain the CLEARANCE/APP_GRANT_OR/DATASET_GRANT/VISIBILITY semantics and risk drifting from the tested resolver |
| Effective level for reverse-lookup | A component-local "highest grant" reducer | `effectiveRankedLevel` / `effectiveArchiveCoverage` (same functions gate 3 uses internally) | SPEC R3 explicitly requires the *same* internal ranking, not a separately computed shortcut |
| Denial-detection for a silent reducer | A reducer change to throw/return a flag | The audit-log-length-diff pattern in Code Examples, with proper effect+fallback timing | 13/14-CONTEXT and SPEC.md's own Prohibition row both lock this reducer's silent-fail contract; changing it would break the existing regression test at `world-state.test.tsx:373-389` |
| Error recovery UI for resolver throws | Try/catch scattered through the explorer's render logic | The new class-component `ErrorBoundary` (D-12/D-13) | React only supports catching render-phase throws via error boundaries (class components); try/catch in a function component's body cannot catch errors thrown during a child's render |

**Key insight:** Every piece of "intelligence" this phase's UI needs (access decisions, effective levels, issuing authority) already exists, tested, in `model.ts`/`dataset-selectors.ts`. The entire phase is proven-in-place plumbing, not new logic — treat any temptation to compute something inline as a signal to go find the existing selector/resolver first.

## Common Pitfalls

### Pitfall 1: `useIssueDatasetGrant`'s denial detection can hang forever if implemented naively
**What goes wrong:** A `useEffect` that runs "after dispatch, compare `state.datasets.auditLog.length` before/after" and depends on `state.datasets.auditLog.length` will simply never fire when the request is denied.
**Why it happens:** The `ISSUE_DATASET_GRANT` reducer case does `if (!permitted) return state;` — returning the exact same object reference. This is directly proven by an existing, passing test: `expect(next).toBe(state)` at `frontend/src/demo/store/world-state.test.tsx:388` [VERIFIED: frontend/src/demo/store/world-state.test.tsx:373-389]. React's `useReducer` performs an `Object.is` bailout check on the reducer's return value: if the new state is referentially identical to the old, **React skips re-rendering the component and does not fire its effects** [CITED: react.dev/reference/react/useReducer — "Bailing out of a state update"]. So an effect keyed on `auditLog.length` is simply never invoked on the denial path, and any `isPending` flag set before dispatch is never cleared.
**How to avoid:** Use a dual-path detection: (1) a `useEffect` keyed on `state.datasets.auditLog.length` that resolves the pending promise/flag to "success" when the length increased since the last dispatch, AND (2) a `setTimeout(0)` fallback scheduled immediately after calling `dispatch(...)` that resolves to "denied" if the effect in (1) hasn't already cleared the pending flag by the time the timeout fires. See Code Examples for the full implementation. An equally valid, arguably simpler alternative that satisfies the same *observable* contract (isError reflects whether the gate would deny) without depending on React's reducer-timing internals at all: call `canIssueDatasetGrant(...)` directly from `lib/model.ts` in the hook, synchronously, *before* dispatching, and set `isError` from that return value directly — never dispatch at all when it returns `false`. This sidesteps the entire bailout hazard. Either approach is compatible with D-11's *intent* (surface denial via `isError`); the pre-check approach does not literally "compare before/after," so if the planner wants literal adherence to D-11's wording, use the dual-path effect+timeout pattern instead.
**Warning signs:** A submit button that gets stuck showing "Issuing…" forever after a non-admin/non-delegate attempts to issue a grant; `isPending` never flips back to `false` in that case during manual/live-UAT testing.

### Pitfall 2: `resolveDatasetAccess` has a real, tested throw path — CONTEXT.md's D-06 restatement is stale
**What goes wrong:** 13-CONTEXT.md's D-06 says missing-`application_id` handling is "soft fail... NOT a hard error/throw," and 15-CONTEXT.md's canonical_refs repeats this ("the resolver never throws for that case"). The live code does the opposite.
**Why it happens:** `resolveDatasetAccess` (model.ts:1544-1551) explicitly throws `Error(...not found in applications list...)` when a `dataset.application_ids` entry doesn't resolve against the passed-in `applications` array — and this is intentional, documented in the function's own header comment as one of three named throw semantics, and covered by a passing test explicitly titled `"throws when the dataset references a non-existent application_id (fail-closed, not silent deny)"` [VERIFIED: frontend/src/demo/lib/dataset.test.ts:727-745]. It appears D-06 was reconsidered during Phase 13's actual implementation (fail-closed was chosen over soft-fail) but the CONTEXT.md decision text for both Phase 13 and Phase 15 was never updated to match.
**How to avoid:** Do not treat the new `ErrorBoundary` as a purely defensive, "shouldn't ever happen" stub. It has two concrete, reachable trigger conditions with current/foreseeable data: (a) a stale/invalid `application_ids` entry on a `DatasetNode` (not possible with today's seed, but plausible if a future fixture or manual data edit introduces one), and (b) an out-of-vocabulary `requiredLevel` passed to `resolveDatasetAt` (also throws, per `dataset.test.ts:702/724` — this IS user-input-adjacent, since the explorer's "Required level" field is populated by the UI, so a bug in the vocabulary-population logic that lets a wrong-type level slip through would trip this immediately). Keep the UI-SPEC's mandated default-to-first-vocabulary-entry behavior exactly as specified to keep (b) unreachable in practice, but don't skip building/testing the ErrorBoundary on the theory that it will never fire.
**Warning signs:** None directly observable at runtime with current seed data (both throw paths are currently unreachable given the seed's own internal consistency) — the risk surfaces only if seed data or the required-level vocabulary wiring is later edited incorrectly.

### Pitfall 3: `ErrorBoundary` is the first class component in this entire codebase — some TS strict-mode settings bite class syntax specifically
**What goes wrong:** `frontend/tsconfig.app.json` sets `erasableSyntaxOnly: true` [VERIFIED: frontend/tsconfig.app.json] — a TypeScript 5.8+ option that rejects any syntax requiring non-trivial transformation, including TypeScript's constructor-parameter-property shorthand (e.g. `constructor(private foo: X)`). No code in this repo currently uses a class component, so there is no existing precedent to copy defensively from.
**Why it happens:** A developer reaching for the familiar React class-component boilerplate from other projects/tutorials might write `constructor(props: Props) { super(props); }` — which is fine — but might also be tempted to shorthand additional instance fields via constructor parameter properties, which `erasableSyntaxOnly` will reject at compile time.
**How to avoid:** Declare `state` as a plain class field (`state: State = { hasError: false };`) and use `static getDerivedStateFromError(error: Error): State { return { hasError: true }; }` plus (optionally) `componentDidCatch(error: Error, info: ErrorInfo)` — the standard, transformation-free class-component pattern, confirmed still current for React 19 [CITED: react.dev/reference/react/Component]. If `componentDidCatch`'s `info` parameter is intentionally unused, prefix it `_info` — `noUnusedParameters: true` is also enabled [VERIFIED: frontend/tsconfig.app.json] but TypeScript exempts underscore-prefixed parameter names by default.
**Warning signs:** A `tsc -b` failure citing `erasableSyntaxOnly` specifically on the new `ErrorBoundary` class.

### Pitfall 4: `useWorld()`, not `useWorldState()`
**What goes wrong:** Neither 15-CONTEXT.md nor 14-CONTEXT.md ever states the exact name of the state-reading hook (only `useWorldDispatch` is named in canonical refs); by analogy with `useWorldDispatch`, it would be easy to guess `useWorldState()`.
**Why it happens:** `store/world-state.tsx` exports `useWorld()` for reading state and `useWorldDispatch()` for dispatch — an asymmetric naming pair [VERIFIED: frontend/src/demo/store/world-state.tsx:634-648]. All existing consumers (`resource-access-explorer.tsx`, `resource-browser.tsx`) import `{ useWorld, useWorldDispatch }`.
**How to avoid:** Import `useWorld` (not `useWorldState`) for reading `world.datasets`, `world.subjects`, `world.digitalResources.applications`, etc., in every new file this phase adds.
**Warning signs:** A TypeScript "has no exported member" compile error on `useWorldState`.

## Code Examples

### `DatasetResolutionTrace` (mirrors `ResourceResolutionTrace` exactly, per DATA-UI-02)
```tsx
// New file: frontend/src/demo/components/dataset-access-explorer.tsx
// Pattern source: frontend/src/demo/components/resource-access-explorer.tsx (ResourceResolutionTrace, GATE_LABEL)
import type { DatasetAccessResult } from "../lib/model";

const GATE_LABEL: Record<string, string> = {
  CLEARANCE: "Clearance",
  APP_GRANT_OR: "Application grant",
  DATASET_GRANT: "Dataset grant",
  VISIBILITY: "Visibility",
};

function DatasetResolutionTrace({ result }: { result: DatasetAccessResult }) {
  return (
    <div
      className={`rounded-lg border p-4 ${result.allow ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}
    >
      <div className="text-lg font-semibold">
        {result.allow ? "✓ ALLOW" : "✗ DENY"}
      </div>
      <ul className="mt-3 space-y-1.5">
        {result.gates.map((g, i) => (
          <li key={`${g.kind}-${i}`} className="flex gap-2 text-sm">
            <span className={g.pass ? "text-green-600" : "text-red-600"}>
              {g.pass ? "✓" : "✗"}
            </span>
            <span className="w-28 shrink-0 font-medium">
              {GATE_LABEL[g.kind] ?? `Gate: ${g.kind}`}
            </span>
            <span className="text-slate-600">{g.reason}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### `ErrorBoundary` (new export in `ui.tsx`, D-12/D-13/D-14/D-15)
```tsx
// Addition to: frontend/src/demo/components/ui.tsx
import { Component, type ReactNode, type ErrorInfo } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}
interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, _info: ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error("DatasetsPanel ErrorBoundary caught:", error);
  }

  reset = (): void => this.setState({ hasError: false });

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="rounded bg-destructive/10 p-3 text-sm text-destructive">
          <p className="font-semibold">Couldn't resolve access for this dataset.</p>
          <p>Seed data may be inconsistent — this shouldn't happen.</p>
          <button className="underline text-xs mt-1" onClick={this.reset}>
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
```
Usage in `DatasetsPanel` (D-15's remount-on-dataset-change key):
```tsx
{selectedDataset && (
  <ErrorBoundary key={selectedDataset.id}>
    <DatasetAccessExplorer dataset={selectedDataset} />
    <DatasetReverseLookup dataset={selectedDataset} />
  </ErrorBoundary>
)}
```

### `useIssueDatasetGrant` — denial-safe hook (Pitfall 1's fix)
```tsx
// New file: frontend/src/demo/hooks/use-datasets.ts
import { useEffect, useRef, useState } from "react";
import { useWorld, useWorldDispatch } from "../store/world-state";

export interface IssueDatasetGrantVariables {
  actorOrgId: string;
  actorPersonId: string;
  datasetId: string;
  personId: string;
  level: string;
  validFrom?: Date | null;
  validUntil?: Date | null;
}

export function useIssueDatasetGrant() {
  const world = useWorld();
  const dispatch = useWorldDispatch();
  const [isPending, setIsPending] = useState(false);
  const [isError, setIsError] = useState(false);

  // Tracks an in-flight call's "before" length + a settle guard so both the
  // success-effect and the fallback timer can't both resolve the same call.
  const pendingRef = useRef<{ beforeLen: number; settled: boolean } | null>(null);

  // Success path: fires only when a NEW state commits (auditLog grew).
  useEffect(() => {
    const pending = pendingRef.current;
    if (pending && !pending.settled && world.datasets.auditLog.length > pending.beforeLen) {
      pending.settled = true;
      setIsError(false);
      setIsPending(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [world.datasets.auditLog.length]);

  function mutate(vars: IssueDatasetGrantVariables): void {
    const beforeLen = world.datasets.auditLog.length;
    pendingRef.current = { beforeLen, settled: false };
    setIsPending(true);
    setIsError(false);

    dispatch({
      type: "ISSUE_DATASET_GRANT",
      actorOrgId: vars.actorOrgId,
      actorPersonId: vars.actorPersonId,
      datasetId: vars.datasetId,
      personId: vars.personId,
      level: vars.level,
      now: new Date(),
    });

    // Denial path: if the reducer bailed out (Object.is-equal state), React
    // never re-renders and the effect above never fires. This fallback marks
    // the call as denied once the current event-loop turn has fully flushed.
    setTimeout(() => {
      const pending = pendingRef.current;
      if (pending && !pending.settled) {
        pending.settled = true;
        setIsError(true);
        setIsPending(false);
      }
    }, 0);
  }

  return { mutate, isPending, isError };
}
```

## State of the Art

Nothing in this domain has changed "over time" in the traditional sense — this is a same-session extension of a module built entirely within this same milestone (v2.3). The one relevant "state of the art" note is React-version-specific:

| Old Approach | Current Approach | When Changed | Impact |
|---|---|---|---|
| Hook-based error catching | Class components remain the only way to build an error boundary | Unchanged through React 19 | Confirms D-13's approach (`ErrorBoundary` as a class component) is still the only correct option, not a legacy pattern to avoid |
| Duplicate console error logs from caught errors | React 19 logs a caught error once (previously logged twice in dev in React 18) | React 19 | No app-level `onCaughtError`/`onUncaughtError` root options are configured in `main.tsx` [VERIFIED: frontend/src/main.tsx] — default behavior applies, nothing extra to wire |

**Deprecated/outdated:** None applicable to this phase's scope.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The dual effect+`setTimeout(0)` pattern in `useIssueDatasetGrant` is presented as the recommended fix for Pitfall 1, but is itself `[ASSUMED]` untested-in-this-repo — it has not been run against this codebase's actual React 19 batching behavior in an integration test, only reasoned through from documented React semantics + the codebase's own passing reducer-identity test. | Common Pitfalls / Code Examples | If React 19's automatic batching defers the effect longer than one macrotask tick in some edge case, the `setTimeout(0)` fallback could theoretically fire before a legitimate success effect in rare timing scenarios; the planner should have the executor write a `renderHook`-based test (using `@testing-library/react`, already installed) asserting both the success and denial paths resolve `isPending` correctly before considering this hook done. |
| A2 | The pre-check-with-`canIssueDatasetGrant` alternative (also offered in Pitfall 1) is presented as functionally equivalent to D-11's literal wording but is a stronger deviation from D-11's stated mechanism ("compare... before and after dispatch"). | Common Pitfalls | If the planner/executor picks this alternative without flagging the deviation, a strict reading of D-11 could be considered unmet even though the observable behavior (isError on denial) is identical. |

**If empty:** N/A — table has 2 entries.

## Open Questions

1. **Should the D-06 CONTEXT.md drift (Pitfall 2) be corrected in 13-CONTEXT.md/14-CONTEXT.md, or just noted for Phase 15's planner?**
   - What we know: The shipped, tested behavior is fail-closed/throw, not soft-fail. This is almost certainly the *better* behavior (matches this project's own "fail loud" convention per CLAUDE.md Rule 8) and should not be changed.
   - What's unclear: Whether a documentation correction to the two upstream CONTEXT.md files is in scope for this phase or should be filed separately.
   - Recommendation: Treat as informational for Phase 15's plan (build the `ErrorBoundary` assuming throws are real); optionally note the doc drift in a follow-up todo rather than blocking this phase on it.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build/test toolchain | ✓ | v22.12.0 | — |
| npm | Package scripts | ✓ | 10.9.0 | — |
| Vitest | `npm run test` | ✓ | 4.0.3 | — |
| TypeScript | `npx tsc -b --noEmit` | ✓ | 5.9.3 | — |
| Backend (Rocket, :15520) | Only for the reused `/api/digital-resources/world` fetch (D-04) | Not required to be running for this research; the existing loader's "error"/"missing-token" states already handle it being down | — | UI already has an explicit non-success state for this — no new fallback needed |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** the backend being unreachable is already a handled, existing state (`classifyLoaderState` → `"error"`), not something this phase needs to newly account for.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.3, jsdom environment [VERIFIED: frontend/vite.config.ts] |
| Config file | `frontend/vite.config.ts` (`test` block); `frontend/src/test-setup.ts` |
| Quick run command | `cd frontend && npx vitest run src/demo/store/world-state.test.tsx src/demo/hooks/use-datasets.test.ts` (once the latter exists) |
| Full suite command | `cd frontend && npm run test` (→ `vitest run`, excludes `e2e/**`) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DATA-UI-04 (reducer) | `ISSUE_DATASET_GRANT` payload with `validFrom`/`validUntil` produces a grant with those dates, not `null` | unit | `npx vitest run src/demo/store/world-state.test.tsx` | ✅ existing file — extend its `"ISSUE_DATASET_GRANT action"` describe block |
| DATA-UI-04 (hook) | `useIssueDatasetGrant` resolves `isPending`/`isError` correctly on both allow and deny | unit (renderHook) | `npx vitest run src/demo/hooks/use-datasets.test.ts` | ❌ Wave 0 — new file, mirrors `use-digital-resources.test.ts`'s pure-helper style but will need `renderHook`/`act` (precedent: `src/hooks/use-websocket.test.ts`) since this hook has internal `useState`/`useEffect` |
| DATA-UI-01/02/03 (UI rendering, empty states, admin gate) | Panel/explorer/reverse-lookup/admin-block render correctly | manual-only (live UAT) | — | Justification: **this demo module has zero existing component-level render tests anywhere** [VERIFIED: grep across `frontend/src/demo/` found no `@testing-library/react` import in any `.tsx` file] — every prior phase (12, 14) verified its UI behavior via live UAT, not React Testing Library render tests, and SPEC.md's own acceptance criteria explicitly say "confirmed via live UAT" for the non-admin block. Following existing convention, don't introduce the demo module's first render-test file unless the planner has a specific reason to diverge from this established pattern. |

### Sampling Rate
- **Per task commit:** `cd frontend && npx vitest run` (full run is already ~2s locally — no need to scope to a subset)
- **Per wave merge:** same full run + `npx tsc -b --noEmit`
- **Phase gate:** Full suite green (314+ tests) + `tsc -b --noEmit` clean + live UAT of the non-admin block, before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `frontend/src/demo/hooks/use-datasets.test.ts` — covers DATA-UI-04's hook-level `isPending`/`isError` behavior on both the allow and deny paths (the one piece of genuinely new logic this phase adds, per Pitfall 1)
- [ ] No new shared fixtures needed — reuse `seedWorld()` and existing `DATASET_NODES`/`DATASET_GRANTS` from `seed.ts` (Phase 14) directly, matching `world-state.test.tsx`'s existing `ISSUE_DATASET_GRANT` describe block's own pattern
- [ ] Framework install: none — Vitest and `@testing-library/react` are already dependencies

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | This phase adds no new authentication surface; it reuses the existing `localStorage` token/role convention read-only |
| V3 Session Management | No | No session changes |
| V4 Access Control | Yes | UI-level gate: `getStoredUserRole() === "admin"` (existing convention, matches D-01's single-role-string pattern project-wide). Authoritative gate: `canIssueDatasetGrant` (Phase 13, `model.ts:1679`), enforced entirely client-side since there is no backend for this domain this milestone — this is a demo/mock limitation already acknowledged and tested at the reducer level (`world-state.test.tsx`'s existing denial test), not a new gap this phase introduces |
| V5 Input Validation | Yes | `requiredLevel`/`level` values are constrained to the dataset's own vocabulary via `isLevelInVocabulary` inside the resolver/reducer — the UI's job is to populate `Select` options from the correct vocabulary (per UI-SPEC's dynamic-vocabulary requirement) so an out-of-vocabulary value can't reach the resolver in the first place (see Pitfall 2) |
| V6 Cryptography | No | Not applicable — no cryptographic operations in this phase |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| UI-level-only authorization gate bypass (client can always call the "protected" action directly, e.g. via devtools console) | Elevation of Privilege | `canIssueDatasetGrant` is checked *inside* the reducer itself, not only in the form component — so even a bypassed UI gate cannot produce a grant/audit entry for a non-admin/non-delegate identity. This is exactly the enforcement-gap/IDOR-shaped concern SPEC.md's own Prohibitions section names explicitly (not generic OWASP boilerplate — this project's own v2.2 history flagged this exact pattern per SPEC.md's wording), and it is already covered by the existing passing test at `world-state.test.tsx:373-389` plus this phase's live-UAT requirement. No new mitigation code needed — verify the existing one stays intact. |
| Stale/incorrect `application_ids` reference producing an unhandled exception that crashes the whole tab | Denial of Service (client-side) | The new `ErrorBoundary` (D-12/D-13), scoped to exactly the explorer+reverse-lookup subtree, contains the blast radius to that subtree only — the Application/Datasets picker above it stays interactive (Pitfall 2) |

## Sources

### Primary (HIGH confidence)
- Live repository reads/greps this session: `frontend/src/demo/lib/model.ts`, `frontend/src/demo/lib/dataset-selectors.ts`, `frontend/src/demo/lib/seed.ts`, `frontend/src/demo/lib/dataset.test.ts`, `frontend/src/demo/store/world-state.tsx`, `frontend/src/demo/store/world-state.test.tsx`, `frontend/src/demo/components/ui.tsx`, `frontend/src/demo/components/digital-resources-panel.tsx`, `frontend/src/demo/components/resource-access-explorer.tsx`, `frontend/src/demo/components/resource-browser.tsx`, `frontend/src/demo/components/access-resolution-explorer.tsx` (partially via delegated read), `frontend/src/demo/hooks/use-digital-resources.ts`, `frontend/src/demo/hooks/use-digital-resources.test.ts`, `frontend/src/hooks/use-websocket.test.ts`, `frontend/src/demo/DemoRoot.tsx`, `frontend/vite.config.ts`, `frontend/tsconfig.app.json`, `frontend/package.json`
- Live command execution this session: `npx vitest run` (314/314 passing, 20 files), `npx tsc -b --noEmit` (clean)

### Secondary (MEDIUM confidence)
- [react.dev/reference/react/useReducer](https://react.dev/reference/react/useReducer) — "Bailing out of a state update" (Object.is bailout skips re-render and effects), via WebSearch this session
- [react.dev/reference/react/Component](https://react.dev/reference/react/Component) — error boundary lifecycle methods still class-component-only as of React 19, via WebSearch this session

### Tertiary (LOW confidence)
- None used — every claim in this document is either directly codebase-verified or drawn from official React documentation confirmed this session.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — nothing new installed; all versions read directly from `package.json` and confirmed by running the tools
- Architecture: HIGH — every extension point cited by CONTEXT.md was independently re-verified against live source this session, with one documented drift (Pitfall 2) and one naming correction (Pitfall 4)
- Pitfalls: HIGH for Pitfalls 2/3/4 (directly codebase-verified); MEDIUM for Pitfall 1's specific recommended fix (A1 in Assumptions Log — reasoned from documented React semantics + a passing codebase test, but the fix itself has not been run in this repo)

**Research date:** 2026-07-05
**Valid until:** 30 days (stable, self-contained demo module; no external dependency churn risk since no new packages are installed)
