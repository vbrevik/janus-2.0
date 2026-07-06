# Phase 15: Demo UI & Access Explorer - Context

**Gathered:** 2026-07-05
**Status:** Ready for planning

<domain>
## Phase Boundary

A new dedicated "Datasets" top-level tab lets a staff user browse datasets nested within an Application (Application-only picker, not the full Network→Platform→Application tree), resolve dataset access for any person/dataset/datetime with a full 4-gate trace, see every person with active access to a dataset, and — if authorized — issue a new time-bounded DatasetAccessGrant. All reuses Phase 13's `resolveDatasetAccess`/`canIssueDatasetGrant` and Phase 14's seeded fixtures, with zero backend calls for the dataset domain itself (though the tab independently fetches the Digital Resources world so its Application picker works regardless of tab-visit order).

</domain>

<spec_lock>
## Requirements (locked via SPEC.md)

**4 requirements are locked.** See `15-SPEC.md` for full requirements, boundaries, and acceptance criteria.

Downstream agents MUST read `15-SPEC.md` before planning or implementing. Requirements are not duplicated here.

**In scope (from SPEC.md):**
- New dedicated "Datasets" top-level tab
- Datasets panel (browsing, filtered by selected Application, generic multi-app loop)
- New dataset-access-explorer sibling component (full 4-gate trace, ALLOW/DENY)
- Reverse-lookup view (dataset → authorized persons + effective level)
- Linked/pre-filled navigation between panel → explorer/reverse-lookup
- Admin-gated issuing form (Person + Level + Valid-from + Valid-until)
- `ISSUE_DATASET_GRANT` payload extension (add `validFrom`/`validUntil`, wire into reducer)
- Explicit empty states (zero datasets in an Application; zero grants on a dataset)
- Defensive error boundary/fallback around explorer/reverse-lookup

**Out of scope (from SPEC.md):**
- Editing/revoking existing dataset grants — only issuing new grants is in scope
- Bulk/multi-dataset operations
- Backend wiring for datasets — datasets stay pure frontend mock this milestone (D-10)
- New multi-application-dataset fixture (deferred verification, not deferred correctness)

</spec_lock>

<decisions>
## Implementation Decisions

### Tab layout & Application picker
- **D-01:** The Datasets tab's Application picker is a **new lightweight Application-only component**, not a reuse of `resource-browser.tsx`'s full Network→Platform→Application tree. Datasets only attach to Applications, so Network/Platform tiers are irrelevant noise here.
- **D-02:** The picker renders as a **clickable row list** (same visual style as `ResourceTreeNodeRow` — Pill + name, click to select — but flat, no expand/collapse), not a `Select` dropdown.
- **D-03:** The new tab's main orchestrating component is **`datasets-panel.tsx`** (plural, matches the tab label and mirrors `digital-resources-panel.tsx`'s naming convention).
- **D-04:** `world.digitalResources.applications` is currently only populated when the existing Digital Resources tab fetches on mount (`SET_DIGITAL_RESOURCES`). Since a user could open the new Datasets tab first, **`datasets-panel.tsx` performs its own independent fetch** — mounts `useDigitalResourcesWorld` + the same six-state loader classification as `digital-resources-panel.tsx` — so the Application picker works regardless of tab-visit order. This is the one place this phase touches network/loader concerns; the dataset domain itself (datasets, grants, resolver) stays pure in-memory per Phase 14's D-10.

### Explorer / reverse-lookup arrangement
- **D-05:** Explorer and reverse-lookup render as a **single stacked view**, not inner sub-tabs — no tab-switch pattern like `digital-resources-panel.tsx`'s "Resource Browser / Access Resolution." Both sections appear together once a dataset is selected.
- **D-06:** The top section (Application picker + Datasets list for the selected Application) uses a **side-by-side grid** (Application list left / Datasets list right), matching `resource-browser.tsx`'s `grid-cols-3` tree-left/detail-right precedent.
- **D-07:** Before any dataset is selected, the Explorer and Reverse-lookup sections **do not render at all** (not a placeholder-prompt state like `resource-browser.tsx`'s "Select a resource to see details") — they appear only once a dataset is chosen from the list.

### Issuing form
- **D-08:** The admin-gated issuing form docks **directly under the dataset explorer** — mirrors v2.2's exact placement (`IssueGrantSection` sits under the grant-toggle card, beside `ResourceResolutionTrace`).
- **D-09:** The form uses the same **collapsed-by-default "+ Issue new grant" toggle** interaction as v2.2's `IssueGrantSection` — not always-expanded.
- **D-10:** Even though `ISSUE_DATASET_GRANT` is a synchronous in-memory reducer dispatch (no network call, per Phase 14 D-10) — unlike v2.2's real `useIssueGrant` API mutation — the form still **wraps the dispatch in a new `useIssueDatasetGrant()`-style hook** for API-shape parity (`isPending`/`isError`) with v2.2's mutation hooks, rather than calling `dispatch(...)` directly inline.
- **D-11:** `canIssueDatasetGrant` denial is currently silent (the reducer returns state unchanged, no throw, no flag). Since the wrapping hook (D-10) needs to expose `isError`, it must **detect denial by comparing `state.datasets.auditLog.length` before and after dispatch** — no new entry means the gate denied the request. (Do not modify the reducer to throw — SPEC's Phase 13/14 contract keeps `canIssueDatasetGrant`/`ISSUE_DATASET_GRANT` silent-on-denial by design.)

### Error boundary
- **D-12:** The new `ErrorBoundary` wraps **only the explorer + reverse-lookup sections** (per SPEC's explicit wording) — not the whole Datasets tab. If `resolveDatasetAccess` throws, the Application/Datasets picker above stays usable; only the explorer/reverse-lookup area shows the fallback.
- **D-13:** `ErrorBoundary` is a **new generic reusable class component**, added to `frontend/src/demo/components/ui` alongside `Card`/`Field`/`Pill`/`Select` — this is the first error boundary anywhere in the codebase (the main app's blank-page recovery is TanStack Router's root `errorComponent`, which the router-isolated demo bypasses by construction per `DemoRoot.tsx`'s own comment; there is nothing to extend).
- **D-14:** The fallback UI is a **static message + reset button** (same `destructive/10` error-card styling used elsewhere in the demo) — e.g. "Couldn't resolve access for this dataset — seed data may be inconsistent," plus a button that clears the boundary's caught-error state.
- **D-15:** The `ErrorBoundary` is **keyed by the selected dataset's id** — React remounts it fresh whenever the user picks a different dataset, so switching datasets always recovers automatically. The manual reset button (D-14) only matters for retrying resolution against the *same* dataset without a full page reload.

### Claude's Discretion
- Exact reverse-lookup table/list column layout and styling details not specified above (row shape, label text) — follow existing `Card`/`Field`/`Pill` conventions from `resource-access-explorer.tsx`.
- Exact naming of the new `dataset-access-explorer.tsx` sibling file's internal helper functions/types beyond what SPEC.md and Phase 13/14 CONTEXT.md already lock.
- Exact wording of empty-state messages (zero datasets in an Application; zero grants on a dataset) — follow the tone of existing empty-state copy in `resource-browser.tsx` / `digital-resources-panel.tsx`.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Roadmap
- `.planning/phases/15-demo-ui-access-explorer/15-SPEC.md` — locked requirements, boundaries, acceptance criteria, edge/prohibition coverage (MANDATORY, read first)
- `.planning/REQUIREMENTS.md` — DATA-UI-01..04
- `.planning/ROADMAP.md` §"Phase 15: Demo UI & Access Explorer" — goal, depends-on, success criteria

### Prior phase context (Phase 13/14 decisions this phase builds directly on)
- `.planning/phases/14-mock-dataset-worldstate/14-CONTEXT.md` — D-10 (`WorldState.datasets` eager-seed pattern, no backend fetch for the dataset domain itself), D-11 (individual-array-params selector style), D-05/D-06/D-07 (`DatasetAuditEntry` shape — `auditLog` is what D-11 in this phase's decisions above compares length on)
- `.planning/phases/13-dataset-model-access-resolver/13-CONTEXT.md` — D-03/D-04 (resolver output shape: `{allow, gates, visible, reason?}`, 4-entry `gates[]` including `VISIBILITY`), D-05 (admin_org delegate-cap exemption), D-06 (missing-application soft-fail — resolver never throws for that case; the new ErrorBoundary above is for genuinely unexpected seed-integrity errors, not this expected soft-fail path)

### Codebase precedent (extension points)
- `frontend/src/demo/DemoRoot.tsx` — `ActiveView` union + button-row + `<main>` swap pattern; add `"datasets"` as a new view value, a new nav button, and `{activeView === "datasets" && <DatasetsPanel />}`
- `frontend/src/demo/components/digital-resources-panel.tsx` — six-state loader pattern (`missing-token`/`loading`/`unauthorized`/`error`/`empty`/`success`) that `datasets-panel.tsx` reuses per D-04 for its own independent fetch
- `frontend/src/demo/components/resource-browser.tsx` — `ResourceTreeNodeRow` row-rendering style (Pill + name) that the new Application-only picker (D-01/D-02) mirrors visually without reusing the tree component itself; `grid-cols-3` layout (D-06)
- `frontend/src/demo/components/resource-access-explorer.tsx` — `ResourceResolutionTrace` (the exact rendering style `dataset-access-explorer.tsx` must match per SPEC DATA-UI-02), `IssueGrantSection` (the exact placement/toggle/field-shape pattern D-08/D-09 mirror), `GATE_LABEL` map (needs a dataset-domain equivalent for `CLEARANCE`/`APP_GRANT_OR`/`DATASET_GRANT`/`VISIBILITY`)
- `frontend/src/demo/store/world-state.tsx:219-226` — current `ISSUE_DATASET_GRANT` action payload (no `validFrom`/`validUntil` fields yet)
- `frontend/src/demo/store/world-state.tsx:568-611` — current `ISSUE_DATASET_GRANT` reducer case (hardcodes `valid_from`/`valid_until` to `null`; needs extension per SPEC R4, and is the site D-11's audit-log-length comparison reads before/after)
- `frontend/src/demo/lib/dataset-selectors.ts` — `datasetsForApplication`, `activeDatasetGrantsForPerson`, `resolveDatasetAt` — the selectors the new panel/explorer/reverse-lookup call
- `frontend/src/demo/lib/model.ts:1521` (`resolveDatasetAccess`), `:1679` (`canIssueDatasetGrant`), `:1452`/`:1477` (`effectiveRankedLevel`/`effectiveArchiveCoverage` — the reverse-lookup's "effective level" computation per SPEC R3)
- `frontend/src/demo/hooks/use-digital-resources.ts` — `useIssueGrant`, `getStoredUserRole`, `hasStoredToken`, `classifyLoaderState` — the hook-shape precedent D-10 mirrors for the new `useIssueDatasetGrant`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Card`, `Field`, `Pill`, `Select`, `MockTag` from `frontend/src/demo/components/ui` — used throughout; the new `ErrorBoundary` (D-13) joins this same directory
- `getStoredUserRole()` — reuse as-is for the `=== "admin"` UI-level gate (SPEC R4, matches D-01's existing single-role-string convention project-wide)
- `CLEARANCE_TONE` (exported from `access-resolution-explorer.tsx`) — reuse for rendering the dataset's effective classification consistently

### Established Patterns
- Module-local `TIER_TONE`/tone maps are duplicated per-file rather than shared (explicit existing convention per `resource-access-explorer.tsx`'s comment) — the new dataset components should follow the same per-file-copy convention for any tone map they need, not introduce a shared one
- Every time-dependent function takes an explicit `now: Date` — no internal `Date.now()`/`new Date()` — applies to the explorer's evaluation-timestamp input exactly as `resource-access-explorer.tsx` does
- `+ Issue new X` collapsed-toggle forms reset their fields on both cancel and successful submit (see `resetFields()` in both `IssueGrantSection` and `IssueDelegateSection`) — the new dataset issuing form should follow the same reset-on-success/cancel behavior

### Integration Points
- `frontend/src/demo/DemoRoot.tsx` — new `"datasets"` tab entry
- `frontend/src/demo/store/world-state.tsx` — `ISSUE_DATASET_GRANT` action + reducer extension (validFrom/validUntil)
- `frontend/src/demo/hooks/use-digital-resources.ts` (or a new sibling hooks file) — new `useIssueDatasetGrant` hook
- New files: `frontend/src/demo/components/datasets-panel.tsx`, `frontend/src/demo/components/dataset-access-explorer.tsx`, a reverse-lookup component (naming left to planner), `frontend/src/demo/components/ui` gains `ErrorBoundary`

</code_context>

<specifics>
## Specific Ideas

- The Application-only picker (D-01/D-02) should feel like "the tree, but flat" — same Pill-plus-name row aesthetic as `ResourceTreeNodeRow`, just without the expand/collapse chevron since there's only one tier to pick from.
- The ErrorBoundary's fallback message should explicitly acknowledge this "shouldn't happen" per SPEC's own wording (seed-integrity errors), not read like a generic crash screen.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

### Reviewed Todos (not folded)
None — `todo.match-phase` returned zero matches for Phase 15.

</deferred>

---

*Phase: 15-demo-ui-access-explorer*
*Context gathered: 2026-07-05*
