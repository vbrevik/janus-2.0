# Phase 9: Digital Resource Model & Policy Engine — Specification

**Created:** 2026-06-02
**Ambiguity score:** 0.13 (gate: ≤ 0.20)
**Requirements:** 11 locked

## Goal

The digital-resource type system (`NetworkNode` / `PlatformNode` / `ApplicationNode`, `org_links`, `ResourcePolicy`, `ResourceAccessGrant`, `ResourceAccessDelegate`) and a time-versioned, data-driven `resolveResourceAccess` resolver — plus delegation-authority enforcement (`canIssueResourceGrant`) — are appended to `frontend/src/demo/lib/model.ts`, exercised by a new `digital-resource.test.ts`, with every critical pitfall covered by a blocking test and `npm run test` + `tsc` green.

## Background

The v2.1 physical-zone model lives in `frontend/src/demo/lib/model.ts` (649 lines) and is the direct structural template. Already present and reused: `Clearance` (5-tier) + `CLEARANCE_RANK`; `isGrantActive` (both boundaries inclusive, `null` = unbounded); `resolveGrant` (ancestor walk); `resolveZoneAccess` returning `{ allow, gate, reason }`; `isDelegateActive`; `ZoneAccessDelegate`. A seed-only `EntityPolicy` type exists (per-entity ABAC rule flags) — the conceptual ancestor of `ResourcePolicy`, but not reused directly.

Nothing for the digital-resource stack exists yet: no resource node types, no `org_links`, no `ResourcePolicy`, no `ResourceAccessGrant`/`Delegate`, no `resolveResourceAccess`, no `canIssueResourceGrant`, no `digital-resource.test.ts`. v2.1 also shipped delegation as **type-only** — `canIssueGrant()` was never implemented (the DELEG-03 gap). Phase 9 does NOT repeat that: delegation authority is enforced here.

This is demo/mock TypeScript only. No backend, no new dependencies, no `routeTree.gen.ts` changes.

## Requirements

1. **Resource node types**: The three-tier hierarchy is typed with a strict-tree parent link.
   - Current: No `NetworkNode`/`PlatformNode`/`ApplicationNode` types exist.
   - Target: `NetworkNode` and `PlatformNode` carry a `classification: Clearance`; `PlatformNode` carries exactly one `network_id`; `ApplicationNode` carries exactly one `platform_id` and has **no** `classification` field. Each node carries `org_links` (req 3) and `policy_assignments` (req 4).
   - Acceptance: `tsc` compiles; a test asserts `ApplicationNode` has no `classification` property (type-level + runtime fixture) and that platform→network / app→platform links are single-valued.

2. **Application classification inheritance**: An Application's effective classification is its host Platform's.
   - Current: No inheritance logic exists.
   - Target: A helper derives an Application's classification by traversing `app → platform.classification` at evaluation/display time; the resolver uses it for the clearance gate.
   - Acceptance: A test seeds an Application whose Platform is `SECRET` and confirms the clearance gate requires `SECRET` (not a value stored on the Application).

3. **Time-windowed org-role links (open vocabulary)**: Resources carry a list of role-tagged org associations.
   - Current: v2.1 used fixed `admin_org`/`asset_owner_org` fields on zones.
   - Target: `org_links: { org_id: string; role: string; valid_from: Date | null; valid_until: Date | null }[]`. `role` is an open string; baseline values `ADMIN | ASSET_OWNER | OPERATOR | SECURITY_APPROVAL`. A helper returns active links (reusing the `isGrantActive` boundary rule) and active links for a given role.
   - Acceptance: A test confirms a resource with two active `OPERATOR` links and one expired `ADMIN` link reports both operators active and the admin inactive at `now`.

4. **Time-versioned per-resource policy**: Each resource carries policy assignments; the active one is selected by timestamp.
   - Current: No `ResourcePolicy` and no policy-versioning exist.
   - Target: `ResourcePolicy` carries an ordered `gates: { kind: string; ... }[]` descriptor list. A resource holds `policy_assignments: { policy: ResourcePolicy; valid_from: Date | null; valid_until: Date | null }[]`. A selector returns the single assignment whose window contains the supplied timestamp (boundary rule consistent with `isGrantActive`); overlapping windows are a seed error surfaced by a validator.
   - Acceptance: A test with two adjacent, non-overlapping assignments returns policy A inside window 1 and policy B inside window 2; a test with no covering window returns an explicit "no active policy" result (not a silent default).

5. **Data-driven gate dispatch with extension point**: The resolver evaluates the active policy's gate list by `kind`.
   - Current: v2.1 `resolveZoneAccess` hardcodes its gate sequence in a `switch`.
   - Target: `resolveResourceAccess` iterates the active policy's `gates` in order, dispatching each `kind` to an evaluator. Baseline kinds implemented: `CLEARANCE`, `OWN_TIER_GRANT`, `PARENT_TIER_GRANT`. An unknown `kind` produces an explicit error result (never a silent pass). Adding a new gate kind = adding one evaluator function (documented extension point), not a runtime plugin registry.
   - Acceptance: A test injects a policy containing a synthetic unknown gate `kind` and asserts the resolver returns an explicit error (does not allow). A test confirms baseline kinds evaluate in list order.

6. **Baseline gate semantics**: The seeded baseline policy enforces clearance, own-tier grant, and parent-tier prerequisite.
   - Current: No digital-resource resolver exists.
   - Target: Under the baseline policy, ALLOW requires, in order: (1) subject clearance ≥ resource (or inherited) classification, (2) an active explicit own-tier `ResourceAccessGrant`, (3) for Platform/Application, an active grant on the parent (Platform needs its Network; Application needs its Platform). Networks have no parent gate.
   - Acceptance: Tests cover ALLOW (all gates pass) and a DENY for each gate individually, each DENY naming the failing gate.

7. **No cross-tier inheritance**: A grant on one tier never satisfies another tier's own-tier gate.
   - Current: v1's `resolveGrant` walks ancestors — copying it would leak inheritance.
   - Target: `resolveResourceAccess` performs NO ancestor walk for the own-tier grant; a Network grant does not satisfy Platform `OWN_TIER_GRANT`, and a Platform grant does not satisfy Application `OWN_TIER_GRANT`. The parent-tier gate is a separate, explicit check.
   - Acceptance: Test named `cross-tier-inheritance-blocked` — a person holding only a Network grant is evaluated for Platform access and returns `allow: false`.

8. **Advisory zone prerequisite (non-blocking)**: A resource policy may reference a v2.1 zone; the result is advisory.
   - Current: No link between digital resources and zones.
   - Target: If the active policy declares a zone prerequisite, the resolver calls the existing `resolveZoneAccess` and attaches the outcome to a separate `zoneAdvisory` field on the result. `zoneAdvisory` NEVER changes the `allow` boolean.
   - Acceptance: A test where all access gates pass but the zone prerequisite is unsatisfied returns `allow: true` with a non-null `zoneAdvisory` indicating the zone failure.

9. **Explainable trace**: The result reports per-gate outcomes and which policy version applied.
   - Current: v2.1 returns a single `{ allow, gate, reason }`.
   - Target: `resolveResourceAccess` returns `{ allow: boolean; gates: { kind; pass; reason }[]; zoneAdvisory: ... | null; policyVersion: { valid_from; valid_until } }`. The trace records each gate's pass/fail with reason, the advisory as a separate entry, and the applied policy's validity window.
   - Acceptance: A test asserts the result lists one entry per baseline gate with reasons, a separate `zoneAdvisory`, and a `policyVersion` matching the assignment selected for the timestamp.

10. **Resource grants & delegation enforcement**: Grant and delegate types mirror v2.1; delegation authority is enforced.
    - Current: No `ResourceAccessGrant`/`ResourceAccessDelegate`; v2.1 never implemented delegation enforcement (`canIssueGrant`).
    - Target: `ResourceAccessGrant { id; person_id; resource_id; valid_from; valid_until }` and `ResourceAccessDelegate { id; resource_id; delegate_type: 'PERSON'|'ORG'; delegate_person_id; delegate_org_id; granted_by_org_id; valid_from; valid_until }` (mirroring `PhysicalAccessGrant`/`ZoneAccessDelegate`). A `canIssueResourceGrant(actor, resource, now)` returns `true` iff the actor holds an active `ADMIN` org-link on the resource OR an active matching `ResourceAccessDelegate`; only `ADMIN`-role orgs may delegate.
    - Acceptance: Tests — an active `ADMIN`-org actor → `true`; an active delegate → `true`; an `OPERATOR`/`ASSET_OWNER`/`SECURITY_APPROVAL`-only actor with no delegate → `false`; an expired delegate → `false`.

11. **Seed examples for policy-shift and non-baseline policy**: Real seed resources exercise the policy mechanisms.
    - Current: `seed.ts` has no digital-resource data.
    - Target: `seed.ts` gains at least one resource with two adjacent-window policy assignments (policy shift, RSRC-SEED-06) and at least one resource whose active policy is non-baseline — e.g. an extra required org-role gate or a different gate set (RSRC-SEED-07). These are the minimum real fixtures Phase 9 tests resolve against; the full 6-unit dataset + WorldState wiring remain Phase 10.
    - Acceptance: A test resolves the policy-shift resource at two timestamps and gets different gate sets; a test resolves the non-baseline resource and confirms the non-baseline policy (not the baseline) was applied.

## Boundaries

**In scope:**
- New types in `model.ts`: `NetworkNode`, `PlatformNode`, `ApplicationNode`, `org_links` shape, `ResourcePolicy` + gate descriptors, `policy_assignments`, `ResourceAccessGrant`, `ResourceAccessDelegate`.
- New functions in `model.ts`: active-policy selector, gate-dispatch resolver `resolveResourceAccess`, baseline gate evaluators (`CLEARANCE`/`OWN_TIER_GRANT`/`PARENT_TIER_GRANT`), Application-classification derivation, active-org-link helpers, `canIssueResourceGrant`, a seed validator for overlapping policy windows.
- `digital-resource.test.ts` with blocking tests for every requirement above (named tests for `cross-tier-inheritance-blocked` and advisory-non-blocking).
- Minimal real seed additions to `seed.ts`: the policy-shift example resource (RSRC-SEED-06) and the non-baseline-policy example resource (RSRC-SEED-07).

**Out of scope:**
- Full 6-unit mock dataset (≥3 networks/platforms/apps, active/expired/future grants across all tiers, zone-prereq terminal link) — Phase 10 (RSRC-SEED-01..05).
- `WorldState` / `DigitalResourceWorld` sub-object and `TOGGLE_RESOURCE_GRANT` action — Phase 10.
- All demo UI (resource browser, detail panel, resolution explorer, timestamp picker, DemoRoot tab) — Phase 11 (RSRC-UI-01..03).
- Runtime gate-evaluator plugin registry — explicitly not built; extension is via a new evaluator function (documented).
- Rust/PostgreSQL backend, in-app policy authoring, multi-homing — deferred per REQUIREMENTS.md Out of Scope.
- Modifying any existing v2.1 function or test — Phase 9 is append-only; `resolveZoneAccess` is reused, not changed.

## Constraints

- Append-only to `model.ts`; no edits to existing v2.1 types/functions/tests. No new npm dependencies.
- Reuse the v2.1 active-window boundary rule (both boundaries inclusive, `null` = unbounded) for grants, delegates, org-links, and policy assignments — do not invent a divergent convention.
- The resolver and all helpers must be pure functions taking an explicit `now: Date` parameter (no `Date.now()` / `new Date()` inside) — consistent with v2.1, so point-in-time tests are deterministic.
- No `routeTree.gen.ts` changes; demo-island isolation preserved.
- `npm run test` (Vitest) passes with zero failures; `npm run build` / `tsc` reports zero TypeScript errors.

## Acceptance Criteria

- [ ] `resolveResourceAccess` returns `allow: false` when a person holds only a Network grant and Platform access is evaluated (test `cross-tier-inheritance-blocked` passes).
- [ ] `resolveResourceAccess` returns `allow: true` with a non-null `zoneAdvisory` when only the zone prerequisite is unsatisfied (advisory is non-blocking).
- [ ] Point-in-time selection returns policy A inside window 1 and policy B inside window 2 for a resource with two adjacent policy assignments; no covering window returns an explicit "no active policy" result.
- [ ] `ApplicationNode` has no `classification` field; the clearance gate uses the parent Platform's classification (test confirms).
- [ ] A policy containing an unknown gate `kind` yields an explicit error result (never a silent ALLOW); baseline gate kinds evaluate in list order.
- [ ] `canIssueResourceGrant` returns `true` for an active ADMIN-org actor and for an active delegate; `false` for non-ADMIN/no-delegate actors and for expired delegates.
- [ ] `seed.ts` contains a policy-shift example resource (RSRC-SEED-06) and a non-baseline-policy example resource (RSRC-SEED-07), each resolved by a passing test.
- [ ] `npm run test` passes with zero failures and zero TypeScript errors after all Phase 9 additions.

## Ambiguity Report

| Dimension          | Score | Min  | Status | Notes                                                        |
|--------------------|-------|------|--------|--------------------------------------------------------------|
| Goal Clarity       | 0.90  | 0.75 | ✓      | Types + resolver + canIssueResourceGrant + tests; 8 criteria |
| Boundary Clarity   | 0.88  | 0.70 | ✓      | Delegation enforced; SEED-06/07 pulled into P9; UI/WorldState out |
| Constraint Clarity | 0.78  | 0.65 | ✓      | String-keyed gate list, unknown→error, pure fns, append-only |
| Acceptance Criteria| 0.88  | 0.70 | ✓      | 8 pass/fail checkboxes                                        |
| **Ambiguity**      | 0.13  | ≤0.20| ✓      |                                                              |

Status: ✓ = met minimum, ⚠ = below minimum (planner treats as assumption)

**Traceability note:** Choice to "add seed examples now" moves **RSRC-SEED-06** and **RSRC-SEED-07** from Phase 10 into Phase 9. ROADMAP traceability should be updated to reflect this; Phase 10 retains RSRC-SEED-01..05.

## Interview Log

| Round | Perspective     | Question summary                                   | Decision locked                                                        |
|-------|-----------------|----------------------------------------------------|------------------------------------------------------------------------|
| 1     | Boundary Keeper | Enforce delegation, or type-only (v2.1 gap)?       | Enforce now — deliver `canIssueResourceGrant` with blocking tests      |
| 1     | Boundary Keeper | What is the falsifiable "open vocabulary" deliverable? | Data-driven string-keyed gate list + documented evaluator extension point; unknown kind → explicit error (no runtime plugin registry) |
| 1     | Boundary Keeper | Prove policy mechanisms with synthetic or real seed? | Add real seed examples now — SEED-06/07 land in Phase 9                |

---

*Phase: 09-digital-resource-model-policy-engine*
*Spec created: 2026-06-02*
*Next step: /gsd:discuss-phase 9 — implementation decisions (how to build what's specified above)*
