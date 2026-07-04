# Roadmap: Janus 2.0

## Milestones

- ✅ **v2.0 Authorization Hub (demo)** — Phases 1–4 (shipped 2026-05-22)
- ✅ **v2.1 Physical Access Zones (demo)** — Phases 5–8 (shipped 2026-05-23)
- ✅ **v2.2 Platform, Network & Application Access (demo)** — Phases 9–12 (shipped 2026-07-03)
- **v2.3 Dataset Access (demo)** — Phases 13–15 (active)

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

See `.planning/milestones/v2.1-ROADMAP.md` for full phase details. Audit: `.planning/milestones/v2.1-MILESTONE-AUDIT.md` (passed).

</details>

<details>
<summary>✅ v2.2 Platform, Network & Application Access (demo) — Phases 9–12 — SHIPPED 2026-07-03</summary>

- [x] Phase 9: Digital Resource Model & Policy Engine (4/4 plans) — completed 2026-06-02
- [x] Phase 10: Mock Dataset & WorldState (2/2 plans) — completed 2026-06-18
- [x] Phase 11: Digital Resource Backend & Resolver Port (4/4 plans) — completed 2026-07-02
- [x] Phase 12: Demo UI, Loader & Tab Integration (7/7 plans incl. 12-07 gap closure) — completed 2026-07-03

See `.planning/milestones/v2.2-ROADMAP.md` for full phase details. Audit: `.planning/milestones/v2.2-MILESTONE-AUDIT.md` (tech_debt — 31/31 requirements satisfied; all flagged items resolved or accepted at close).

</details>

### v2.3 Dataset Access (demo) — ACTIVE

**Milestone Goal:** Establish fine-grained authorization for named datasets within Applications — the innermost access layer. Application access (v2.2) does not grant access to everything inside; each dataset (mailbox, archive role, document site) requires its own authorization with its own access-level vocabulary.

- [ ] **Phase 13: Dataset Model & Access Resolver** - Dataset types (MAILBOX/ARCHIVE_ROLE/DOCUMENT_SITE) with per-type rank tables, DatasetAccessGrant/Delegate, the standalone 3-gate `resolveDatasetAccess` resolver, classification-override validation, and `canIssueDatasetGrant`
- [ ] **Phase 14: Mock Dataset & WorldState** - Seed fixtures (mailboxes, archive-role grants, document sites, prerequisite-chain and denied-access scenarios, full deny-matrix), `WorldState` datasets sub-object, dataset-selectors joining to backend Application data
- [ ] **Phase 15: Demo UI & Access Explorer** - Datasets section in the Resource Browser, dataset-level Access Resolution Explorer with full gate-chain trace, reverse-lookup view, admin-gated issuing form

---

## Phase Details

### Phase 13: Dataset Model & Access Resolver

**Goal**: The dataset type system and 3-gate access resolver are defined, tested, and safe to build on — per-type level vocabularies are rank-safe, the Application-grant prerequisite is enforced at resolution time (not just issue time), and classification-override validation prevents privilege escalation.
**Depends on**: Phase 12 (v2.2's digital-resource model is the extension point; the dataset resolver composes v2.2 primitives — `isWindowActive`, `CLEARANCE_RANK`, `effectiveClassification` — without modifying the frozen `ResourceTier` union or `resolveResourceAccess`, preserving the byte-exact TS↔Rust golden-fixture parity contract)
**Requirements**: DATA-01, DATA-02, DATA-03, DATA-04, DATA-05, DATA-ACCESS-01, DATA-ACCESS-02, DATA-ACCESS-03, DATA-GRANT-01, DATA-GRANT-02, DATA-GRANT-03, DATA-DELEG-01
**Success Criteria** (what must be TRUE):

  1. `DatasetNode` belongs to exactly one parent Application (no multi-homing) and carries a `dataset_type` of `MAILBOX | ARCHIVE_ROLE | DOCUMENT_SITE`, each backed by its own ranked level table (`READ<SEND_AS<FULL_ACCESS`, `READER<CASE_HANDLER<ADMIN`, `READ<CONTRIBUTE<FULL_CONTROL`) such that comparing levels across two different dataset types is not representable — asserted by a passing test (DATA-01, DATA-02, DATA-03)
  2. `resolveDatasetAccess` returns `allow: false` when the person's Application grant has expired at evaluation time `t`, even though a `DatasetAccessGrant` for the same dataset is still nominally active at `t` — the Application-grant prerequisite is a gate checked at resolution time, not only at grant-issue time (DATA-ACCESS-01, DATA-ACCESS-03)
  3. `resolveDatasetAccess` returns `allow: true` only when clearance, the Application-grant gate, and the DatasetAccessGrant-level gate all pass in that order; when a person holds multiple concurrent grants at different levels for the same dataset, the effective level resolved is the highest currently-active one per the DATA-03 rank table (DATA-ACCESS-02, DATA-GRANT-01, DATA-GRANT-02, DATA-GRANT-03)
  4. `effectiveDatasetClassification` derives classification from the parent Application unless `classification_override` is set; a constructor-time validator rejects any override lower than the parent's effective classification (DATA-05)
  5. `canIssueDatasetGrant(actor, dataset, now)` returns `true` for an active `admin_org` actor and for an active delegate issuing at any level defined for the dataset — not capped at the delegate's own held level — and `false` for a non-admin, no-delegate, or expired-delegate actor (DATA-DELEG-01); `npm run test` passes with zero failures and zero TypeScript errors after these additions, and the existing v2.2 golden-fixture and digital-resource suites remain green and untouched

**Plans**: TBD

### Phase 14: Mock Dataset & WorldState

**Goal**: A realistic mock dataset — mailboxes, an archiving system, and document sites — is seeded into `WorldState` and joinable to backend-fetched Application data, with a deny-matrix fixture proving every gate in the 3-gate chain as the deciding gate at least once.
**Depends on**: Phase 13 (all dataset types and the resolver must exist before seed data can be validated against them)
**Requirements**: DATA-SEED-01, DATA-SEED-02, DATA-SEED-03, DATA-SEED-04, DATA-SEED-05, DATA-SEED-06
**Success Criteria** (what must be TRUE):

  1. Seed data includes at least 2 mailboxes per relevant entity (own mailbox + at least 1 shared mailbox), at least 1 archiving system exercising READER/CASE_HANDLER/ADMIN grants, and at least 2 document sites with varying permission levels per person (DATA-SEED-01, DATA-SEED-02, DATA-SEED-03)
  2. One seeded scenario demonstrates the full prerequisite chain succeeding — Application grant present, DatasetAccessGrant present, dataset access allowed — and a second seeded scenario demonstrates denial at the dataset gate: Application grant present, no DatasetAccessGrant, access denied (DATA-SEED-04, DATA-SEED-05)
  3. A deny-matrix fixture exercises each of the 3 resolution gates as the sole deciding gate at least once — clearance-fails, Application-grant-expired-with-live-dataset-grant, and dataset-grant-missing — each case resolved by a passing test that asserts which specific gate failed (DATA-SEED-06)
  4. `WorldState` carries a `datasets` sub-object (nodes, grants, delegates) populated by the new fixtures, and `dataset-selectors.ts` joins dataset fixtures to backend-fetched Application data by `application_id`, verified by a passing selector test — while v2.2's existing digital-resource seed, selectors, and tests remain unmodified and green

**Plans**: TBD

### Phase 15: Demo UI & Access Explorer

**Goal**: A developer or stakeholder can browse datasets nested within an Application, resolve dataset access for a person/dataset/time with a full gate-chain trace, see who has access to a dataset at what level, and — if authorized — issue a new DatasetAccessGrant, all reusing the resolver and row-rendering style already proven in the Digital Resources tab.
**Depends on**: Phase 14 (the explorer, reverse lookup, and issuing form consume the seeded dataset data and the Phase 13 resolver)
**Requirements**: DATA-UI-01, DATA-UI-02, DATA-UI-03, DATA-UI-04
**Success Criteria** (what must be TRUE):

  1. The Resource Browser shows a Datasets section within each selected Application, listing its mailboxes, archive roles, and document sites (DATA-UI-01)
  2. The Access Resolution Explorer, extended to the dataset level, takes person + dataset + datetime and renders an ALLOW/DENY verdict with a full gate-chain trace (clearance, Application grant, dataset grant), styled consistently with `resource-access-explorer.tsx`'s `ResourceResolutionTrace` (DATA-UI-02)
  3. Selecting a dataset shows a reverse-lookup list of every person with active access and their effective level, computed through the same `resolveDatasetAccess` resolver used by the explorer — not a separately computed shortcut (DATA-UI-03)
  4. An admin-gated form lets an authorized admin/delegate issue a new DatasetAccessGrant; live UAT with a non-admin persona confirms the action is blocked (`canIssueDatasetGrant` gate holds), and the v2.2 golden-fixture and regression suites remain green after UI wiring (DATA-UI-04)

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
| 9. Digital Resource Model & Policy Engine | v2.2 | 4/4 | Complete | 2026-06-02 |
| 10. Mock Dataset & WorldState | v2.2 | 2/2 | Complete | 2026-06-18 |
| 11. Digital Resource Backend & Resolver Port | v2.2 | 4/4 | Complete | 2026-07-02 |
| 12. Demo UI, Loader & Tab Integration | v2.2 | 7/7 | Complete | 2026-07-03 |
| 13. Dataset Model & Access Resolver | v2.3 | 0/TBD | Not started | - |
| 14. Mock Dataset & WorldState | v2.3 | 0/TBD | Not started | - |
| 15. Demo UI & Access Explorer | v2.3 | 0/TBD | Not started | - |
