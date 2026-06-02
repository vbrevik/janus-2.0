# Phase 10: Mock Dataset & WorldState - Context

**Gathered:** 2026-06-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Wire the full 6-unit digital-resource dataset into the runtime store and expose it for rendering. Phase 10 adds a `DigitalResourceWorld` sub-object to `WorldState`, initialises it in `seedWorld()`, adds a `TOGGLE_RESOURCE_GRANT` reducer action over `disabledResourceGrantIds`, restructures the two Phase-9 fixtures into the full ≥3-network/≥3-platform/≥3-application dataset (mapped to the canonical 6 org units, with active/expired/future grants per tier and a Platform→v2.1-zone prerequisite link), and ships pure read selectors. Demo/mock TypeScript only under `frontend/src/demo/`. No UI (Phase 11), no engine changes (Phase 9 is complete), no backend.

</domain>

<spec_lock>
## Requirements (locked via SPEC.md)

**9 requirements are locked.** See `10-SPEC.md` for full requirements, boundaries, and acceptance criteria.

Downstream agents MUST read `10-SPEC.md` before planning or implementing. Requirements are not duplicated here.

**In scope (from SPEC.md):**
- `DigitalResourceWorld` type + `digitalResources` field on `WorldState` + `seedWorld()` initialisation
- `TOGGLE_RESOURCE_GRANT` reducer action + `disabledResourceGrantIds` set
- Full 6-unit dataset in `seed.ts` (≥3 networks/platforms/apps, org_links on the 6 units, temporal grant variety, zone-prereq link), restructured from the Phase-9 fixtures
- Preservation of one policy-shift and one non-baseline resource
- Pure read selectors: hierarchy builder, active-grants-for-resource, resolve-at-timestamp wrapper
- A seed-validation test + updates to the Phase-9 seed-resolution tests so the full Vitest suite stays green
- Edits to `seed.ts` and `digital-resource.test.ts` are permitted (append-only convention lifted for this phase)

**Out of scope (from SPEC.md):**
- All demo UI (RSRC-UI-01..03) — Phase 11
- Any new resolver/engine logic in `model.ts` — complete from Phase 9; Phase 10 only consumes it
- Modifying existing v2.1 `resources`/physical state, `TOGGLE_GRANT`, or `disabledGrantIds` — additive only
- Rust/PostgreSQL backend, persistence, in-app policy authoring; new runtime dependencies

</spec_lock>

<decisions>
## Implementation Decisions

### DigitalResourceWorld shape
- **D-01:** Store as **flat arrays mirroring the `seed.ts` constants 1:1** — `networks: NetworkNode[]`, `platforms: PlatformNode[]`, `applications: ApplicationNode[]`, `orgLinks`, `policies`, `policyAssignments`, `grants: ResourceAccessGrant[]`, `delegates: ResourceAccessDelegate[]`, plus `disabledResourceGrantIds: Set<string>`. No id-indexed Maps. Rationale: matches the existing `WorldState` style (`resources: Resource[]`, `disabledGrantIds: Set`), keeps `seedWorld()` a trivial lift from the seed constants, and selectors do their own lookups. Consistency over micro-optimization for a demo dataset.

### Fixture restructure & naming
- **D-02:** **Rename the Phase-9 fixtures into a coherent 6-unit naming scheme** (one network per unit where it reads cleanly; the canonical units are 2 military, intelligence, infrastructure, industry, home guard). The two behavioural fixtures from Phase 9 survive: one network keeps the policy-shift-over-time story (former `MilNet`/SEED-06), one keeps the non-baseline-policy story (former `IntelNet`/SEED-07).
- **D-03:** Because ids/names change, the **two Phase-9 seed-resolution integration tests** in `digital-resource.test.ts` (`seed-06-shift-resolves`, `seed-07-non-baseline-applied`) **must be updated to the new ids** so they keep passing. The five named *pitfall* tests (`cross-tier-inheritance-blocked`, `advisory-non-blocking`, `unknown-gate-kind-errors`, `no-active-policy-denies`, `app-classification-inherited`) use inline fixtures and must remain green unchanged.

### Read selectors
- **D-04:** Selectors live in a **new pure-function module `frontend/src/demo/lib/digital-resource-selectors.ts`** — functions take the `DigitalResourceWorld` sub-object (and explicit args) and return plain data, no React. Phase 11 wraps them with thin `useWorld()`-based hooks (not built now). Rationale: keeps derivation unit-testable without rendering, matches the pure-function discipline of the Phase-9 engine.
- **D-05:** Ship three selectors: (a) `buildResourceTree` → Network→Platform→Application nesting; (b) `activeGrantsForResource` → grants for a resource that are active at `now` AND **not** in `disabledResourceGrantIds`; (c) `resolveResourceAt` → a thin wrapper over `resolveResourceAccess` taking an explicit timestamp. Exact signatures are the planner's call within the pure-fn/arrays-in contract.

### Toggle semantics
- **D-06:** `resolveResourceAt` **filters disabled grants before resolving** — it passes `resolveResourceAccess` only the grants NOT in `disabledResourceGrantIds`. Toggling a grant off therefore flips a live resolution ALLOW→DENY, which is the interactive demo point (mirrors how the physical `TOGGLE_GRANT`/`disabledGrantIds` path behaves for zones).

### Test layout
- **D-07:** The **seed-shape validation assertions go into the existing `digital-resource.test.ts`** (no new test file) — added as a new `describe` block alongside the Phase-9 tests. Validates the dataset criteria (≥3/≥3/≥3, distinct tiers, parent refs resolve, no Application `classification`, zone-prereq present, per-tier active/expired/future via `isGrantActive`) and the selector behaviours.

### Claude's Discretion
- Exact org ids per unit, network/platform/application ids and display names, and the concrete classification tiers assigned — within D-02's 6-unit narrative.
- Exact selector signatures and return types — within D-04/D-05's pure-fn contract.
- Which seeded grants are designated the "expired" / "future" / "active" examples per tier.
- Whether `DigitalResourceWorld` is declared in `world-state.tsx` or imported from `model.ts`/seed types — wherever avoids a circular import.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Locked requirements
- `.planning/phases/10-mock-dataset-worldstate/10-SPEC.md` — 9 locked requirements, boundaries, 10 acceptance criteria. MUST read before planning.

### Prior phase (the engine + fixtures being consumed/restructured)
- `.planning/phases/09-digital-resource-model-policy-engine/09-SPEC.md` — the locked Phase-9 contract (types, resolver, fail-closed semantics) Phase 10 builds on.
- `.planning/phases/09-digital-resource-model-policy-engine/09-CONTEXT.md` — Phase-9 decisions D-01..D-05 (gate descriptor shape, no-active-policy DENY, SEED-06/07 narratives).

### Requirements & roadmap
- `.planning/REQUIREMENTS.md` — RSRC-SEED-01..05 definitions + traceability (SEED-06/07 marked Phase 9 Complete).
- `.planning/ROADMAP.md` §"Phase 10" — goal + 5 success criteria; §"Phase 11" — confirms UI is the next phase (boundary).
- `.planning/PROJECT.md` — the canonical 6-unit scenario (2 military, intelligence, infrastructure, industry, home guard).

### Implementation substrate
- `frontend/src/demo/store/world-state.tsx` — `WorldState` interface (:73), `seedWorld()` (:98), `reducer` + `TOGGLE_GRANT`/`disabledGrantIds` (:451) to mirror for the resource toggle.
- `frontend/src/demo/lib/model.ts` — Phase-9 types + `resolveResourceAccess`, `isGrantActive`/`isWindowActive`, `effectiveClassification`, `canIssueResourceGrant` (consumed, not changed).
- `frontend/src/demo/lib/seed.ts` — Phase-9 `RESOURCE_NODES` (MilNet/IntelNet), `RESOURCE_GRANTS`, policies; existing v2.1 zone ids (`zone-room-sr1`, `zone-secure-lab`, …) for the zone-prereq link.
- `frontend/src/demo/lib/digital-resource.test.ts` — test file to extend (seed-validation + selector tests) and update (2 seed-resolution tests).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `WorldState` + `seedWorld()` + `reducer` (`world-state.tsx`) — the additive integration point; the physical `TOGGLE_GRANT`/`disabledGrantIds` path is the exact template for `TOGGLE_RESOURCE_GRANT`/`disabledResourceGrantIds`.
- Phase-9 engine in `model.ts` — `resolveResourceAccess`, `isGrantActive`, `effectiveClassification` are consumed by the selectors (no reimplementation).
- Phase-9 seed constants in `seed.ts` — the starting material for the restructured dataset.

### Established Patterns
- Flat-array world state with a `Set<string>` of disabled ids toggled by a reducer action (physical zones) — replicate verbatim for resources.
- Pure functions with explicit `now: Date` (no `Date.now()`/`new Date()` in bodies) — applies to all three selectors.
- 5-tier demo `Clearance` ladder; v2.1 inclusive/null time-window rule shared across all grant/policy windows.

### Integration Points
- `digitalResources` added to `WorldState`; `seedWorld()` initialises it; new selectors module imports the sub-object type. No TanStack route changes (`routeTree.gen.ts` stays untouched). UI hooks deferred to Phase 11.

</code_context>

<specifics>
## Specific Ideas

- Toggling a resource grant off should visibly flip a live ALLOW→DENY in the eventual Phase-11 explorer — `resolveResourceAt` enforces this by excluding disabled grant ids before calling the resolver (D-06).
- The policy-shift resource (former MilNet) and the non-baseline resource (former IntelNet) are the two "interesting" units in the 6-unit story; the other units provide the temporal-variety and classification-tier coverage.

</specifics>

<deferred>
## Deferred Ideas

- Thin `useWorld()`-based hooks wrapping the selectors, and all rendering — Phase 11 (RSRC-UI-01..03).
- Full WorldState persistence / backend — out of milestone scope.

None of the above is in Phase 10 scope — discussion stayed within the phase boundary.

</deferred>

---

*Phase: 10-mock-dataset-worldstate*
*Context gathered: 2026-06-02*
