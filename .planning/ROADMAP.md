# Roadmap: Janus 2.0

## Milestones

- ✅ **v2.0 Authorization Hub (demo)** — Phases 1–4 (shipped 2026-05-22)
- ✅ **v2.1 Physical Access Zones (demo)** — Phases 5–8 (shipped 2026-05-23)
- **v2.2 Platform, Network & Application Access (demo)** — Phases 9–12 (active)

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

- [x] **Phase 9: Digital Resource Model & Policy Engine** — TypeScript types (NetworkNode, PlatformNode, ApplicationNode, org_links, ResourcePolicy, ResourceAccessGrant, ResourceAccessDelegate), time-versioned per-resource policy resolver (`resolveResourceAccess`), pitfall-blocking Vitest coverage (completed 2026-06-02)
- [x] **Phase 10: Mock Dataset & WorldState** (2/2 plans, verified 2026-06-18) — 6-unit seed (≥3 networks/platforms/apps, active/expired/future grants, policy-shift example, non-baseline-policy example, zone-prereq link to v2.1), `DigitalResourceWorld` sub-object in WorldState, toggle action
- [x] **Phase 11: Digital Resource Backend & Resolver Port** — 8-table digital-resource Postgres domain (+ migration, sqlx models, Rocket handlers), full gate-chain resolver ported to Rust with TS-parity test, AuthGuard read + issue API (server-side `canIssueResourceGrant`), seed→DB as single source of truth *(scope expanded from the original frontend-only Phase 11 — split 2026-06-19)* (completed 2026-07-02)
- [ ] **Phase 12: Demo UI, Loader & Tab Integration** — hybrid loader (API→WorldState), Resource Browser (hierarchy tree + detail panel), Access Resolution Explorer with evaluation-timestamp picker, grant toggle, grant/delegate issuing forms, wired as DemoRoot tab (no route file). Depends on Phase 11

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
- [x] 09-03-PLAN.md — digital-resource.test.ts blocking Vitest suite (one named test per acceptance criterion)
- [x] 09-04-PLAN.md — SEED-06 policy-shift + SEED-07 non-baseline fixtures in seed.ts + seed-resolution tests

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

### Phase 11: Digital Resource Backend & Resolver Port

**Goal**: The digital-resource model becomes persisted and server-authoritative — 8 Postgres tables back the Network → Platform → Application domain, the full gate-chain resolver is re-implemented in Rust with parity to the TS resolver, and AuthGuard read + issue endpoints expose it (issue endpoints re-validate authority server-side); `seed.ts` fixtures are loaded into Postgres as the single source of truth.
**Depends on**: Phase 10 (TS model/seed/resolver are the parity reference and the fixture source)
**Requirements**: RSRC-BE-01, RSRC-BE-02, RSRC-BE-03, RSRC-BE-04, RSRC-BE-05, RSRC-BE-06, SEC-01, SEC-02, SEC-03, SEC-04 *(RSRC-BE added 2026-06-19 when Phase 11 was split into backend + UI; RSRC-BE-06 migration-chain repair added via discuss-phase; SEC-01..04 security hardening folded in from removed Phase 13 on 2026-06-23 — see REQUIREMENTS.md + 11-SPEC.md)*
**Success Criteria** (what must be TRUE):

  0. A freshly-created empty database migrates end-to-end with zero errors (broken migration chain repaired — RSRC-BE-06)
  1. A fresh-applied migration creates all 8 digital-resource tables and `cargo build` compiles the new domain
  2. A Rust resolver parity test asserts equality with the TS resolver on the seed fixtures, including the inclusive policy-window boundary and the no-policy `NO_ACTIVE_POLICY` fail-closed DENY
  3. AuthGuard-protected GET endpoints return the seeded hierarchy + policies/grants/delegates; unauthenticated requests are rejected
  4. POST issue endpoints persist for an authorized actor and return 403 for non-ADMIN/no-delegate, expired-delegate, and out-of-window-delegate actors (server-side re-validation via ported `canIssueResourceGrant`); a duplicate issue creates no duplicate row
  5. `seedWorld()` no longer hardcodes the digital-resource fixtures; the seeded DB serves the same 6-unit dataset

**Spec**: `11-SPEC.md` (10 requirements, ambiguity 0.18 — re-planned 2026-06-23 with the SEC-01..04 fold)
**Plans**: 1/4 plans executed
Plans:
**Wave 1**

- [x] 11-01-PLAN.md — Migration-chain repair + 8 digital-resource tables schema (RSRC-BE-06, RSRC-BE-01) [wave 1]

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 11-02-PLAN.md — Rust resolver port + sqlx models + golden-fixture parity test (RSRC-BE-02) [wave 2]

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 11-03-PLAN.md — Handlers (get_world, issue_grant, issue_delegate) + mount + seed migration + seedWorld removal (RSRC-BE-03, RSRC-BE-04, RSRC-BE-05) [wave 3] — role-based authz (Option B) closed the IDOR; org-based model deferred to SEED-012; seed migration committed but not yet applied to dev DB

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 11-04-PLAN.md — Security hardening: vendor_relations AuthGuard, per-role RBAC on writes + audit read, JWT fail-loud, CORS single origin (SEC-01, SEC-02, SEC-03, SEC-04) [wave 4]

### Phase 12: Demo UI, Loader & Tab Integration

**Goal**: A developer or stakeholder can open the demo, navigate to the "Digital Resources" tab, browse the Network → Platform → Application hierarchy (loaded from the Phase 11 API into WorldState), inspect org-link roles and active grants, pick the current identity and an evaluation timestamp, see the full gate-chain trace with the amber advisory zone row, toggle grants, and issue new grants/delegates — all without touching any TanStack route files.
**Depends on**: Phase 11 (the loader, resolution trace, and issuing forms consume the backend API + seeded DB)
**Requirements**: RSRC-UI-01, RSRC-UI-02, RSRC-UI-03, RSRC-UI-04, RSRC-UI-05, RSRC-UI-06 *(UI-04/05/06 added 2026-06-19: hybrid loader, grant toggle, delegation-issuing UI)*
**Success Criteria** (what must be TRUE):

  1. On mount with the backend up, the loader populates `WorldState.digitalResources` from the API and the Browser renders it; an unreachable API surfaces an explicit error/empty state (no silent stale fallback)
  2. The Resource Browser displays the hierarchy with classification badges (Application badges show the inherited Platform classification); selecting a resource shows org links grouped by role, active policy summary, active grants, delegates, and (for platforms) NSM annotation badges
  3. The Access Resolution Explorer renders a labeled gate-chain trace for the current identity + resource + evaluation timestamp; the zone-prerequisite row renders amber with an explicit "Advisory (non-blocking)" label and does not change the ALLOW/DENY verdict
  4. Sliding the evaluation timestamp across a policy-shift boundary visibly changes which policy version label appears in the trace; disabling the grant behind an ALLOW flips the verdict to DENY and re-enabling restores it
  5. Issuing a grant/delegate persists it via the Phase 11 API (visible on a later GET) and updates `WorldState`; the control is hidden/disabled when the actor cannot issue; the demo shell shows a "Digital Resources" tab without touching `routeTree.gen.ts` (`git diff frontend/src/routeTree.gen.ts` is empty) and `npm run build` produces zero TypeScript errors

**UI hint**: yes
**UI Spec**: `12-UI-SPEC.md` (approved 2026-06-19)
**Spec**: `12-SPEC.md` (6 requirements, ambiguity 0.18)
**Plans**: TBD

> **Phase 13 (Security hardening) folded into Phase 11 and removed — 2026-06-23.** Its scope
> (server-side RBAC across all domains, JWT-secret fail-loud, CORS restriction) is now Phase 11
> requirements SEC-01..04. See `11-SPEC.md`.

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
| 9. Digital Resource Model & Policy Engine | v2.2 | 4/4 | Complete   | 2026-06-02 |
| 10. Mock Dataset & WorldState | v2.2 | 2/2 | Complete | 2026-06-18 |
| 11. Digital Resource Backend & Resolver Port | v2.2 | 4/4 | Complete    | 2026-07-02 |
| 12. Demo UI, Loader & Tab Integration | v2.2 | 0/? | Not started | - |
