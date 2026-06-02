# Phase 10: Mock Dataset & WorldState — Specification

**Created:** 2026-06-02
**Ambiguity score:** 0.15 (gate: ≤ 0.20)
**Requirements:** 9 locked

## Goal

The full 6-unit digital-resource dataset is loaded into `WorldState` through a new `digitalResources: DigitalResourceWorld` sub-object — covering ≥3 Networks / ≥3 Platforms / ≥3 Applications mapped to the canonical 6 org units, with active/expired/future grants per tier, a preserved policy-shift and non-baseline-policy resource, and a Platform→v2.1-zone prerequisite link — and is exposed through pure read selectors plus a `TOGGLE_RESOURCE_GRANT` action, with the entire Vitest suite green.

## Background

Phase 9 shipped the complete digital-resource engine in `frontend/src/demo/lib/model.ts` (types `NetworkNode`/`PlatformNode`/`ApplicationNode`, `ResourcePolicy`, `ResourceAccessGrant`, `ResourceAccessDelegate`, `resolveResourceAccess`, `canIssueResourceGrant`, gate evaluators) and two minimal seed fixtures in `seed.ts` — `MilNet` (SEED-06 policy-shift across 2026-03-01) and `IntelNet` (SEED-07 non-baseline policy) — plus 24 blocking tests in `digital-resource.test.ts`.

None of this is wired into the runtime store. `WorldState` (`frontend/src/demo/store/world-state.tsx:73`) carries v2.1 fields (`resources: Resource[]`, `disabledGrantIds: Set<string>`, the physical `TOGGLE_GRANT` reducer) but has **no** `digitalResources` field. `seedWorld()` (line 98) does not initialise digital resources. There is no `TOGGLE_RESOURCE_GRANT` action and no selectors over the digital topology. The canonical demo scenario is 6 org units (2 military, intelligence, infrastructure, industry, home guard — `PROJECT.md`). v2.1 zone IDs (`zone-room-sr1`, `zone-secure-lab`, …) exist in `seed.ts` for the advisory zone-prerequisite link.

Per round-1 decisions, Phase 10 **reuses the 6 org units** for `org_links`, **restructures** the two Phase-9 fixtures into the full dataset (it may rename/reposition `MilNet`/`IntelNet`), and **also ships read selectors** so Phase 11 UI only renders.

## Requirements

1. **DigitalResourceWorld sub-object**: WorldState carries a single nested digital-resource sub-object, not flat top-level fields.
   - Current: `WorldState` has no digital-resource state; Phase-9 fixtures live only as module-level `seed.ts` constants
   - Target: a `DigitalResourceWorld` type (networks, platforms, applications, org_links, policies, policy_assignments, grants, delegates, plus `disabledResourceGrantIds: Set<string>`) added to `WorldState` as `digitalResources`; `seedWorld()` initialises it from the dataset
   - Acceptance: `seedWorld().digitalResources` is defined and contains the seeded nodes/grants/policies; `WorldState` exposes exactly one new field (`digitalResources`), no new flat top-level resource fields

2. **TOGGLE_RESOURCE_GRANT action**: a distinct reducer action toggles digital-resource grants without colliding with the physical grant toggle.
   - Current: only `TOGGLE_GRANT` exists, targeting `disabledGrantIds` (physical)
   - Target: a `TOGGLE_RESOURCE_GRANT` action targets `digitalResources.disabledResourceGrantIds`; the physical `TOGGLE_GRANT`/`disabledGrantIds` path is unchanged
   - Acceptance: dispatching `TOGGLE_RESOURCE_GRANT` for a grant id adds/removes it from `disabledResourceGrantIds` and leaves `disabledGrantIds` untouched; a test asserts both action names coexist and operate on separate sets

3. **RSRC-SEED-01 — Networks**: ≥3 Networks with distinct classification tiers, administered by the existing 6 units.
   - Current: 2 networks (`MilNet`, `IntelNet`), both SECRET-classified
   - Target: ≥3 `NetworkNode`s spanning at least two distinct classification tiers, each with `org_links` referencing existing 6-unit org IDs
   - Acceptance: dataset contains ≥3 networks; the set of their classifications has ≥2 distinct values; every network has ≥1 `org_link` whose org id is one of the 6 canonical unit ids

4. **RSRC-SEED-02 — Platforms**: ≥3 Platforms hosted on those networks.
   - Current: no platforms seeded
   - Target: ≥3 `PlatformNode`s, each referencing a parent network present in the dataset
   - Acceptance: dataset contains ≥3 platforms; every platform's network reference resolves to a seeded network

5. **RSRC-SEED-03 — Applications**: ≥3 Applications hosted on those platforms.
   - Current: no applications seeded
   - Target: ≥3 `ApplicationNode`s, each referencing a parent platform present in the dataset; no Application carries a `classification` field (inherited via `effectiveClassification`)
   - Acceptance: dataset contains ≥3 applications; every application's platform reference resolves to a seeded platform; `"classification" in app === false` for every application

6. **RSRC-SEED-04 — Zone-prerequisite link**: ≥1 Platform carries a zone prerequisite pointing to an existing v2.1 zone, so the advisory row is exercised.
   - Current: no digital resource references a v2.1 zone
   - Target: at least one seeded Platform's active policy declares a `zone_prereq_id` equal to an existing v2.1 zone id from `seed.ts`
   - Acceptance: a test resolves that platform and asserts the result's `zoneAdvisory` is present and non-null (advisory exercised, still non-blocking)

7. **RSRC-SEED-05 — Temporal grant variety**: active, expired, and future grants exist across all three tiers.
   - Current: Phase-9 grants are limited to the two fixtures
   - Target: for each tier (Network, Platform, Application), ≥1 grant with `valid_until` in the past and ≥1 grant with `valid_from` in the future, plus active grants
   - Acceptance: a seed-validation test asserts, for each tier, `isGrantActive(g, NOW)` is `false` for the designated expired grant and `false` for the designated future grant, and `true` for ≥1 active grant

8. **Policy-shift & non-baseline preserved through restructure**: the SEED-06 and SEED-07 behaviours survive the dataset rework.
   - Current: `MilNet` (policy-shift) and `IntelNet` (non-baseline) carry these behaviours; `digital-resource.test.ts` asserts them by name
   - Target: the restructured dataset still contains ≥1 resource with two adjacent non-overlapping policy windows (different gate sets across the boundary) and ≥1 resource with a non-baseline policy; if fixtures are renamed, the Phase-9 seed-resolution integration tests are updated to match
   - Acceptance: resolving the policy-shift resource at a pre-boundary vs post-boundary timestamp returns different gate-rule counts (or different required roles); resolving the non-baseline resource applies the extra org-role gate, not the baseline; `seed-06`/`seed-07` integration tests pass against the (possibly-renamed) fixtures

9. **Read selectors**: pure selectors expose the digital topology for Phase 11 to render.
   - Current: no selectors over digital resources exist
   - Target: ship (a) a hierarchy builder producing the Network→Platform→Application tree, (b) an active-grants-for-resource selector that respects `disabledResourceGrantIds`, and (c) a resolve-at-timestamp wrapper over `resolveResourceAccess`
   - Acceptance: each selector is unit-tested — the tree builder returns the correct parent/child nesting for the seeded dataset; the active-grants selector excludes a grant once its id is in `disabledResourceGrantIds`; the resolve wrapper returns the same result as calling `resolveResourceAccess` directly for a known input

## Boundaries

**In scope:**
- `DigitalResourceWorld` type + `digitalResources` field on `WorldState` + `seedWorld()` initialisation
- `TOGGLE_RESOURCE_GRANT` reducer action + `disabledResourceGrantIds` set
- Full 6-unit digital-resource dataset in `seed.ts` (≥3 networks/platforms/apps, org_links on the 6 units, temporal grant variety, zone-prereq link), restructured from the Phase-9 fixtures
- Preservation of one policy-shift and one non-baseline resource
- Pure read selectors: hierarchy builder, active-grants-for-resource, resolve-at-timestamp wrapper
- A seed-validation test plus updates to the Phase-9 seed-resolution tests so the full Vitest suite stays green
- Edits to `seed.ts` and `digital-resource.test.ts` are permitted (append-only convention is intentionally lifted for this phase — Phase 10 owns the final dataset)

**Out of scope:**
- All demo UI (Resource Browser, detail panel, Access Resolution Explorer — RSRC-UI-01..03) — Phase 11
- Any new resolver/engine logic in `model.ts` — the engine is complete from Phase 9; Phase 10 only consumes it (selectors wrap, don't reimplement)
- Modifying existing v2.1 `resources`/physical-access state, the `TOGGLE_GRANT` action, or `disabledGrantIds` — additive only alongside them
- Rust/PostgreSQL backend, real persistence, in-app policy authoring — deferred per milestone scope
- New runtime dependencies — the demo island ships zero new deps

## Constraints

- Demo/mock TypeScript only, under `frontend/src/demo/` — no backend, no TanStack route changes (`git diff frontend/src/routeTree.gen.ts` stays empty)
- Reuse the v2.1 inclusive/null time-window rule (`isGrantActive`/`isWindowActive`) for all grant/policy/delegate windows — do not invent a divergent rule
- Selectors must be pure functions; any timestamp is passed in explicitly (no `Date.now()`/`new Date()` in bodies), consistent with the Phase-9 engine
- The 5-tier demo `Clearance` ladder applies (UNCLASSIFIED|RESTRICTED|CONFIDENTIAL|SECRET|TOP_SECRET) — independent of the 4-tier backend CHECK constraint
- `org_links` reference the canonical 6-unit org ids already used elsewhere in the demo
- Final acceptance bar: `cd frontend && npm run test` passes with zero failures and introduces zero new `tsc` errors beyond the documented pre-existing baseline

## Acceptance Criteria

- [ ] `WorldState` has a `digitalResources: DigitalResourceWorld` sub-object; `seedWorld()` initialises it; no new flat top-level resource fields added
- [ ] `TOGGLE_RESOURCE_GRANT` toggles `digitalResources.disabledResourceGrantIds` and never mutates `disabledGrantIds`; physical `TOGGLE_GRANT` is unchanged
- [ ] Dataset contains ≥3 Networks (≥2 distinct classification tiers), ≥3 Platforms, ≥3 Applications; every parent reference resolves
- [ ] Every network has ≥1 `org_link` referencing one of the 6 canonical unit org ids
- [ ] No Application carries a `classification` field
- [ ] ≥1 Platform's active policy declares a `zone_prereq_id` matching an existing v2.1 zone id; resolving it yields a non-null `zoneAdvisory`
- [ ] For each tier, the designated expired grant and future grant return `isGrantActive(g, NOW) === false`, and ≥1 active grant returns `true`
- [ ] The policy-shift resource returns different gate sets across its policy boundary; the non-baseline resource applies its extra org-role gate
- [ ] Hierarchy builder, active-grants selector, and resolve-at-timestamp wrapper each pass dedicated unit tests; the active-grants selector excludes a disabled grant id
- [ ] `cd frontend && npm run test` passes with zero failures and zero new `tsc` errors

## Ambiguity Report

| Dimension          | Score | Min  | Status | Notes                                                        |
|--------------------|-------|------|--------|--------------------------------------------------------------|
| Goal Clarity       | 0.88  | 0.75 | ✓      | 5 ROADMAP success criteria + selector scope locked           |
| Boundary Clarity   | 0.84  | 0.70 | ✓      | Restructure perimeter + UI deferral + additive-to-v2.1 fixed |
| Constraint Clarity | 0.80  | 0.65 | ✓      | Append-only lifted for this phase; reuse-window rule explicit |
| Acceptance Criteria| 0.85  | 0.70 | ✓      | 10 pass/fail checkboxes                                       |
| **Ambiguity**      | 0.15  | ≤0.20| ✓      |                                                              |

Status: ✓ = met minimum, ⚠ = below minimum (planner treats as assumption)

## Interview Log

| Round | Perspective              | Question summary                                  | Decision locked                                                                 |
|-------|--------------------------|---------------------------------------------------|---------------------------------------------------------------------------------|
| 1     | Researcher               | Map dataset onto the 6 units, or standalone?      | Reuse the 6 org units for `org_links`                                           |
| 1     | Researcher               | Keep/extend vs restructure the Phase-9 fixtures?  | Restructure MilNet/IntelNet into the full dataset (rename/reposition allowed)   |
| 1     | Simplifier               | WorldState scope beyond data?                     | Additive sub-object + toggle + **read selectors** (hierarchy/grants/resolve)    |
| 2     | Boundary / Failure       | How to handle editing 'completed' Phase-9 tests?  | May edit `seed.ts` + Phase-9 seed-resolution tests; full suite must stay green  |
| 2     | Boundary Keeper          | Exact selector surface vs Phase 11?               | Hierarchy builder + active-grants + resolve-at-timestamp wrapper; UI is Phase 11 |

---

*Phase: 10-mock-dataset-worldstate*
*Spec created: 2026-06-02*
*Next step: /gsd:discuss-phase 10 — implementation decisions (DigitalResourceWorld field layout, selector signatures, fixture naming, where the seed-validation test lives)*
