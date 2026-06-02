# Roadmap: Janus 2.0

## Milestones

- ✅ **v2.0 Authorization Hub (demo)** — Phases 1–4 (shipped 2026-05-22)
- ✅ **v2.1 Physical Access Zones (demo)** — Phases 5–8 (shipped 2026-05-23)
- **v2.2 Platform, Network & Application Access (demo)** — Phases 9–11 (active)

## Phases

<details>
<summary>✅ v2.0 Authorization Hub (demo) — Phases 1–4 — SHIPPED 2026-05-22</summary>

- [x] Phase 1: Foundation (4/4 plans) — completed 2026-05-21
- [x] Phase 2: Federation Hub (6/6 plans) — completed 2026-05-22
- [x] Phase 3: Audit & Context (4/4 plans) — completed 2026-05-22
- [x] Phase 4: Demo Shell & Legibility (2/2 plans) — completed 2026-05-22

See `.planning/milestones/v2.0-ROADMAP.md` for full phase details.

</details>

<details>
<summary>✅ v2.1 Physical Access Zones (demo) — Phases 5–8 — SHIPPED 2026-05-23</summary>

- [x] Phase 5: Zone Model & Access Rules (2/2 plans) — completed 2026-05-23
- [x] Phase 6: Grants, Resolution & Delegation (2/2 plans) — completed 2026-05-23
- [x] Phase 7: Entry Log & Visitor Passes (2/2 plans) — completed 2026-05-23
- [x] Phase 8: Mock Dataset & Demo UI (3/3 plans) — completed 2026-05-23

See `.planning/milestones/v2.1-ROADMAP.md` for full phase details. Audit: `.planning/v2.1-MILESTONE-AUDIT.md` (passed).

</details>

### v2.2 Platform, Network & Application Access (demo) — ACTIVE

**Milestone Goal:** Extend the demo with a digital-resource access model — Network → Platform → Application hierarchy, data-driven time-versioned per-resource policies, explicit per-tier grants with a prerequisite chain, advisory zone-prerequisite link, delegation, a 6-unit mock dataset, and three new demo views.

- [ ] **Phase 9: Digital Resource Model & Policy Engine** — TypeScript types (NetworkNode, PlatformNode, ApplicationNode, org_links, ResourcePolicy, ResourceAccessGrant, ResourceAccessDelegate), time-versioned per-resource policy resolver (`resolveResourceAccess`), pitfall-blocking Vitest coverage
- [ ] **Phase 10: Mock Dataset & WorldState** — 6-unit seed (≥3 networks/platforms/apps, active/expired/future grants, policy-shift example, non-baseline-policy example, zone-prereq link to v2.1), `DigitalResourceWorld` sub-object in WorldState, toggle action
- [ ] **Phase 11: Demo UI & Tab Integration** — Resource Browser (hierarchy tree + detail panel), Access Resolution Explorer with evaluation-timestamp picker, wired as DemoRoot tab (no route file)

---

## Phase Details

### Phase 9: Digital Resource Model & Policy Engine
**Goal**: The digital-resource type system and gate-chain resolver are defined, tested, and safe to build on — every critical pitfall has a blocking Vitest test.
**Depends on**: Phase 8 (v2.1 model.ts is the extension point; `resolveZoneAccess` is reused for the advisory zone-prereq)
**Requirements**: RSRC-01, RSRC-02, RSRC-03, RSRC-04, RSRC-05, RSRC-POLICY-01, RSRC-POLICY-02, RSRC-POLICY-03, RSRC-POLICY-04, RSRC-POLICY-05, RSRC-ACCESS-01, RSRC-ACCESS-02, RSRC-ACCESS-03, RSRC-ACCESS-04, RSRC-ACCESS-05, RSRC-GRANT-01, RSRC-GRANT-02, RSRC-GRANT-03, RSRC-DELEG-01, RSRC-SEED-06, RSRC-SEED-07 *(SEED-06/07 pulled forward from Phase 10 per 09-SPEC.md — minimal real seed fixtures to exercise the policy mechanisms)*
**Success Criteria** (what must be TRUE):
  1. `resolveResourceAccess` returns `allow: false` when a person holds only a Network grant and Platform access is evaluated (cross-tier inheritance is blocked; test named `cross-tier-inheritance-blocked` passes)
  2. `resolveResourceAccess` returns `allow: true` when only the zone prerequisite is unsatisfied — the `zoneAdvisory` field is present and non-null but the `allow` boolean is unaffected (advisory-is-non-blocking test passes)
  3. Point-in-time policy resolution selects the policy whose `valid_from`/`valid_until` window contains the supplied timestamp — evaluating the same resource at two timestamps across a policy boundary returns different gate sets
  4. `ApplicationNode` has no `classification` field; the resolver derives classification by traversing `app → platform` at evaluation time; a test confirms the Platform's classification is used for the clearance gate
  5. `canIssueResourceGrant(actor, resource, now)` returns `true` for an active ADMIN-org actor and for an active delegate, `false` for non-ADMIN/no-delegate and expired-delegate actors (delegation enforced — closes the v2.1 DELEG-03 gap)
  6. `seed.ts` contains a policy-shift example resource (RSRC-SEED-06) and a non-baseline-policy example resource (RSRC-SEED-07), each resolved by a passing test
  7. `npm run test` passes with zero failures and zero TypeScript errors after all Phase 9 additions to `model.ts`, `seed.ts`, and the new `digital-resource.test.ts`
**Plans**: 4 plans
Plans:
- [x] 09-01-PLAN.md — Digital-resource types + pure data helpers (nodes, org_links, policy/grant/delegate types, window/classification/policy-selector/validator helpers)
- [x] 09-02-PLAN.md — Gate evaluators + resolveResourceAccess dispatcher + canIssueResourceGrant (fail-closed, no cross-tier inheritance, advisory non-blocking)
- [ ] 09-03-PLAN.md — digital-resource.test.ts blocking Vitest suite (one named test per acceptance criterion)
- [ ] 09-04-PLAN.md — SEED-06 policy-shift + SEED-07 non-baseline fixtures in seed.ts + seed-resolution tests

### Phase 10: Mock Dataset & WorldState
**Goal**: A realistic 6-unit mock dataset is loaded into `WorldState` via a `DigitalResourceWorld` sub-object, covering all required data shapes (active/expired/future grants, policy shift over time, non-baseline policy, zone-prereq link to v2.1).
**Depends on**: Phase 9 (all types and resolver functions must exist before seed data can be validated against them)
**Requirements**: RSRC-SEED-01, RSRC-SEED-02, RSRC-SEED-03, RSRC-SEED-04, RSRC-SEED-05 *(SEED-06/07 moved to Phase 9 per 09-SPEC.md; Phase 10 extends the policy-shift/non-baseline resources into the full 6-unit dataset)*
**Success Criteria** (what must be TRUE):
  1. `WorldState` carries a `digitalResources: DigitalResourceWorld` sub-object (not 6+ flat top-level fields); `seedWorld()` initialises it; the `TOGGLE_RESOURCE_GRANT` action targets `digitalResources.disabledResourceGrantIds` without colliding with the existing physical `TOGGLE_GRANT` action
  2. The seed includes ≥3 Networks with distinct classification tiers, ≥3 Platforms on those networks, and ≥3 Applications on those platforms; at least one Platform carries a `zone_prereq_id` pointing to an existing v2.1 zone ID
  3. At least one grant per resource tier (Network, Platform, Application) has `valid_until` in the past and at least one has `valid_from` in the future; `isGrantActive(g, NOW)` returns `false` for each of those grants (time-window coverage confirmed by a seed validation test)
  4. At least one resource carries two policy assignments with adjacent, non-overlapping validity windows; calling `resolveResourceAccess` at a timestamp inside the first window and again inside the second window returns different gate-set rule counts or different required roles
  5. At least one resource carries a non-baseline policy (e.g. an extra required org-role authorization); the resolver applies that policy rather than the baseline when that resource is evaluated
**Plans**: TBD

### Phase 11: Demo UI & Tab Integration
**Goal**: A developer or stakeholder can open the demo, navigate to the "Digital Resources" tab, browse the Network → Platform → Application hierarchy, inspect org-link roles and active grants, pick a person and an evaluation timestamp, and see the full gate-chain trace with the amber advisory zone row — all without touching any TanStack route files.
**Depends on**: Phase 10 (UI reads `useWorld()` — WorldState must be seeded before components render)
**Requirements**: RSRC-UI-01, RSRC-UI-02, RSRC-UI-03
**Success Criteria** (what must be TRUE):
  1. The demo shell shows a "Digital Resources" tab; clicking it renders `DigitalResourcesPanel` without touching `routeTree.gen.ts` (`git diff frontend/src/routeTree.gen.ts` is empty)
  2. The Resource Browser displays the Network → Platform → Application hierarchy with classification badges; Application badges show the inherited Platform classification; selecting a resource shows its org links grouped by role, the active policy summary, active grants, delegates, and (for platforms) NSM annotation badges
  3. The Access Resolution Explorer evaluates clearance + own-tier explicit grant + parent-tier prerequisite for the selected person, resource, and evaluation timestamp and renders a labeled gate-chain trace; the zone-prerequisite row (when present) renders in amber with an explicit "Advisory (non-blocking)" label and does not change the ALLOW/DENY verdict
  4. Sliding the evaluation timestamp picker across a policy-shift boundary visibly changes which policy version label appears in the trace and may change the gate requirements shown; the demo build (`npm run build`) produces zero TypeScript errors
**UI hint**: yes
**Plans**: TBD

---

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation | v2.0 | 4/4 | Complete | 2026-05-21 |
| 2. Federation Hub | v2.0 | 6/6 | Complete | 2026-05-22 |
| 3. Audit & Context | v2.0 | 4/4 | Complete | 2026-05-22 |
| 4. Demo Shell & Legibility | v2.0 | 2/2 | Complete | 2026-05-22 |
| 5. Zone Model & Access Rules | v2.1 | 2/2 | Complete | 2026-05-23 |
| 6. Grants, Resolution & Delegation | v2.1 | 2/2 | Complete | 2026-05-23 |
| 7. Entry Log & Visitor Passes | v2.1 | 2/2 | Complete | 2026-05-23 |
| 8. Mock Dataset & Demo UI | v2.1 | 3/3 | Complete | 2026-05-23 |
| 9. Digital Resource Model & Policy Engine | v2.2 | 2/4 | In Progress|  |
| 10. Mock Dataset & WorldState | v2.2 | 0/? | Not started | - |
| 11. Demo UI & Tab Integration | v2.2 | 0/? | Not started | - |
