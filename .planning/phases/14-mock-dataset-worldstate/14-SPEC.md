# Phase 14: Mock Dataset & WorldState — Specification

**Created:** 2026-07-04
**Ambiguity score:** 0.18 (gate: ≤ 0.20)
**Requirements:** 7 locked (DATA-SEED-01..06 + one interview-surfaced action requirement)

## Goal

A realistic mock dataset (mailboxes, an archiving system, document sites) is seeded into `WorldState` as static fixtures joinable to existing Application data by `application_id`, with a deny-matrix fixture proving every gate in Phase 13's 3-gate chain as the deciding gate at least once, plus a minimal grant-issuing action that reuses Phase 13's `canIssueDatasetGrant` gate and the existing audit-log mechanism.

## Background

`frontend/src/demo/lib/model.ts` now has the full Phase 13 dataset type system and `resolveDatasetAccess`/`canIssueDatasetGrant` resolver — but zero dataset data exists anywhere in `seed.ts` or `world-state.tsx`. `WorldState` (world-state.tsx:76) carries a `digitalResources: DigitalResourceWorld` sub-object (model.ts:782, `{networks, platforms, applications, orgLinks, policies, policyAssignments, grants, delegates, disabledResourceGrantIds}`) populated from `RESOURCE_NODES` and related fixtures in `seed.ts` (Phase 9/10 section, ~line 1271). `digital-resource-selectors.ts` provides pure read selectors (`buildResourceTree`, etc.) over that sub-object, taking explicit `now: Date` params, no internal `Date.now()`/`new Date()` calls. This phase mirrors that exact pattern for datasets: a new `DatasetWorld`-shaped sub-object on `WorldState`, seeded fixtures in `seed.ts`, and a new `dataset-selectors.ts`.

v2.2's Phase 11 gave `ApplicationNode` data a real Postgres/Rust backend, but per interview resolution this phase stays pure frontend mock — datasets join against whatever `ApplicationNode` fixtures `WorldState` already holds client-side (reusing 1–2 existing `RESOURCE_NODES` Applications), with zero new backend calls or tables. v2.2's digital-resource seed, selectors, and tests must remain unmodified and green throughout.

## Requirements

1. **DATA-SEED-01 — Mailboxes**: Seed data includes at least 2 mailboxes per relevant person (own mailbox + shared access to ≥1 other).
   - Current: No mailbox `DatasetNode` fixtures exist anywhere
   - Target: A small, hand-curated set (2–3 people) where each person owns one mailbox and has shared `DatasetAccessGrant` access to at least one other person's mailbox, attached to 1–2 existing `RESOURCE_NODES` Applications
   - Acceptance: A selector test confirms each seeded person has ≥2 resolvable mailbox-level grants (own + shared)

2. **DATA-SEED-02 — Archive roles**: Seed data includes ≥1 archiving system exercising READER/CASE_HANDLER/ADMIN grants across multiple people.
   - Current: No `ARCHIVE_ROLE` dataset fixtures exist
   - Target: One archive-type `DatasetNode` with grants distributed across at least 3 people, one per role tier
   - Acceptance: A selector test confirms all three `ArchiveRole` values (READER, CASE_HANDLER, ADMIN) appear across the seeded grants for this dataset

3. **DATA-SEED-03 — Document sites**: Seed data includes ≥2 document sites with varying permission levels per person.
   - Current: No `DOCUMENT_SITE` dataset fixtures exist
   - Target: Two document-site `DatasetNode`s with grants at different `DocumentSiteLevel` values across the seeded people
   - Acceptance: A selector test confirms ≥2 document-site nodes exist with at least two distinct level values represented across their grants

4. **DATA-SEED-04/05 — Prerequisite chain success + dataset-gate denial**: One seeded scenario demonstrates the full prerequisite chain succeeding; a second demonstrates denial at the dataset gate.
   - Current: No scenario data exists to exercise `resolveDatasetAccess`'s gate chain end-to-end
   - Target: Scenario A — a person with an active Application grant AND an active `DatasetAccessGrant` resolves to `allow: true`. Scenario B — a person with an active Application grant but NO `DatasetAccessGrant` for that dataset resolves to `allow: false`, with the gate trace showing the dataset-grant gate as the failure point
   - Acceptance: Two passing tests assert the exact allow/deny outcome and gate-trace shape for scenarios A and B respectively

5. **DATA-SEED-06 — Deny-matrix (sole-deciding-gate proof)**: A deny-matrix fixture exercises each of the 3 resolution gates as the sole deciding gate at least once.
   - Current: No deny-matrix fixture exists
   - Target: Three cases — (a) clearance-fails, (b) Application-grant-expired-with-live-dataset-grant, (c) dataset-grant-missing — each set up so exactly one gate fails
   - Acceptance: Three passing tests, each asserting via the gate trace that (1) the target gate is the one that failed, AND (2) the other two gates independently passed — not just the final ALLOW/DENY verdict (edge-probe R5-adjacency, specified)

6. **WorldState + selectors wiring**: `WorldState` carries a `datasets` sub-object populated by the new fixtures; `dataset-selectors.ts` joins to Application data by `application_id`; v2.2 stays green.
   - Current: `WorldState` has no `datasets` field; no `dataset-selectors.ts` file exists
   - Target: `WorldState.datasets: { nodes: DatasetNode[]; grants: DatasetAccessGrant[]; delegates: DatasetAccessDelegate[] }`, initialized from new `seed.ts` fixtures; `dataset-selectors.ts` mirrors `digital-resource-selectors.ts`'s pure-function, explicit-`now`, no-internal-Date pattern
   - Acceptance: A selector test passes for the join-by-`application_id` path; every dataset fixture's `application_ids` reference an Application that exists in `RESOURCE_NODES` (edge-probe R6, specified — structural check, not incidental); `npm run test` shows all pre-existing v2.2 digital-resource tests still green with zero modified assertions in those files

7. **Minimal issuing action + audit-log wiring** (surfaced during interview, resolves a scope contradiction): A minimal `issueDatasetGrant` WorldState action exists, gated by Phase 13's `canIssueDatasetGrant`, producing an audit-log entry.
   - Current: No dataset mutation actions exist on `WorldState`; no `DATASET_GRANT_ISSUED` audit event type exists
   - Target: `issueDatasetGrant(state, {actor, dataset_id, person_id, level, ...}, now)` action that calls `canIssueDatasetGrant` first and refuses (no grant created, no audit entry) if it returns `false`; on success, creates the `DatasetAccessGrant` and appends an audit-log entry using the existing `AuditLogEntry` interface with a new `event: "DATASET_GRANT_ISSUED"` discriminant (no new audit infrastructure/fields)
   - Acceptance: Two passing tests — (a) a permitted issuance creates the grant and an audit entry; (b) a gate-failing issuance creates neither (edge-probe R7, specified)

## Boundaries

**In scope:**
- New dataset fixtures in `seed.ts` (mailboxes, archive roles, document sites) — 2–3 people, 1–2 reused Applications, small hand-curated scale matching v2.2's "6-unit" precedent
- `WorldState.datasets` sub-object + initial state
- `dataset-selectors.ts` — pure read selectors mirroring `digital-resource-selectors.ts`
- One minimal `issueDatasetGrant` mutation action + its audit-log wiring (reusing the existing `AuditLogEntry` shape, new event subtype)
- Deny-matrix fixture + scenario-success/denial fixtures (DATA-SEED-04/05/06)
- 1–2 new Person fixtures IF the existing cast can't cleanly support the story (e.g., a clean-deny-case person with zero grants) — fictional data only (see Prohibitions)

**Out of scope:**
- Any UI/component work — that is Phase 15
- WebSocket wiring for dataset events — not required by any DATA-SEED requirement
- Modifying v2.2's existing digital-resource seed, selectors, or tests — they must remain unmodified and green (explicit phase-goal wording)
- Full CRUD reducer actions (update grant, disable grant, update delegate) beyond the one minimal `issueDatasetGrant` — Phase 15 adds the rest when its UI needs them
- Rich temporal variety across all fixtures (expired/future-dated grants throughout) — only the deny-matrix's expired-grant case needs a non-active window; the rest are simply active, per interview decision

## Constraints

- All new selector functions take an explicit `now: Date` parameter; none call `Date.now()`/`new Date()` internally (matches `digital-resource-selectors.ts` and Phase 13's own constraint)
- Dataset fixtures attach to 1–2 Applications already present in `RESOURCE_NODES` — no new Application/Platform/Network fixtures
- `issueDatasetGrant`'s audit-log entry reuses the existing `AuditLogEntry` interface verbatim (new `event` discriminant only) — no new audit fields or infrastructure
- No additional constraints beyond standard project conventions (single quotes, existing seed.ts section-comment convention, `frontend/src/demo/lib/` file placement)

## Acceptance Criteria

- [ ] Seed data includes ≥2 mailboxes per relevant person (own + ≥1 shared) across 2–3 people (DATA-SEED-01)
- [ ] Seed data includes ≥1 archive dataset with grants covering all three `ArchiveRole` values (DATA-SEED-02)
- [ ] Seed data includes ≥2 document sites with ≥2 distinct permission levels represented across grants (DATA-SEED-03)
- [ ] A passing test demonstrates the full prerequisite-chain-success scenario (DATA-SEED-04)
- [ ] A passing test demonstrates dataset-gate denial with an active Application grant but no dataset grant (DATA-SEED-05)
- [ ] Three passing deny-matrix tests each prove one gate as sole decider via gate-trace inspection, with the other two gates shown passing (DATA-SEED-06)
- [ ] `WorldState.datasets` sub-object exists and is populated from seed fixtures
- [ ] `dataset-selectors.ts` exists with a passing selector test for the application_id join
- [ ] Every dataset fixture's `application_ids` resolve to an existing `RESOURCE_NODES` Application (no orphan references)
- [ ] `issueDatasetGrant` action exists; a permitted call creates a grant + audit entry, a gate-failing call creates neither
- [ ] `npm run test` shows all pre-existing v2.2 digital-resource tests unmodified and green
- [ ] No new fixture (Person name, email, org name) resembles a real, identifiable individual or organization
- [ ] Role/level assignment across any new fixture people is not correlated with a name-implied protected attribute

## Edge Coverage

**Coverage:** 3/3 applicable edges resolved · 0 unresolved

| Category | Requirement | Status | Resolution / Reason |
|----------|-------------|--------|---------------------|
| adjacency | R5 (DATA-SEED-06) | ✅ covered | Acceptance criterion: each deny-matrix test asserts the sole target gate fails AND the other two independently pass via gate-trace inspection |
| empty | R5 (DATA-SEED-06) | ⛔ dismissed | Fixed hand-authored fixture data, not variable-size input processing — empty/single/null input has no meaning here |
| ordering | R5 (DATA-SEED-06) | ⛔ dismissed | Deny-matrix cases are independent fixtures, not a sorted/ordered collection — output-order stability doesn't apply |
| unclassified | R1 (DATA-SEED-01) | ⛔ dismissed | Fixture-count assertion (≥2 mailboxes/person) — no algorithmic shape applies; covered by its own acceptance criterion |
| unclassified | R2 (DATA-SEED-02) | ⛔ dismissed | Fixture-count assertion; aggregation-logic edge cases already exhaustively tested in Phase 13's `dataset.test.ts` — not re-tested here |
| unclassified | R3 (DATA-SEED-03) | ⛔ dismissed | Fixture-count assertion — no algorithmic shape applies |
| unclassified | R4 (DATA-SEED-04/05) | ⛔ dismissed | Scenario-fixture assertion, not an algorithm over variable input |
| unclassified | R6 (WorldState/selectors) | ✅ covered | Orphan `application_id` reference risk specified as its own acceptance criterion (structural check, not incidental) |
| unclassified | R7 (issueDatasetGrant) | ✅ covered | Gate-bypass risk specified as its own acceptance criterion (must call `canIssueDatasetGrant` before creating) |

## Prohibitions (must-NOT)

**Coverage:** 2/2 applicable prohibitions resolved · 0 unresolved

| Prohibition (must-NOT statement) | Requirement | Status | Verification / Reason |
|----------------------------------|-------------|--------|------------------------|
| MUST NOT introduce fixture data (Person names, emails, org names) resembling a real, identifiable individual or organization | R1/R2/R3 (new fixtures) | resolved | judgment — spot-checked in code review, consistent with existing seed.ts convention |
| MUST NOT correlate role/access-level assignment across new fixture people with a name-implied protected attribute | R2/R3 (new person fixtures) | resolved | judgment — spot-checked in code review |

Canon-referred (dropped, not minted here): audit-log injection / insufficient-logging concerns for the new `DATASET_GRANT_ISSUED` event are OWASP A09/log-injection territory — owned by code-review/`/gsd-secure-phase`, not minted here. Gate-bypass via a code path that skips `canIssueDatasetGrant` is an access-control-bypass class already covered structurally by the R7 acceptance criterion above and Phase 13's own threat model.

## Ambiguity Report

| Dimension          | Score | Min  | Status | Notes                              |
|--------------------|-------|------|--------|-------------------------------------|
| Goal Clarity       | 0.85  | 0.75 | ✓      | Backend-location and scope-contradiction resolved via interview |
| Boundary Clarity   | 0.82  | 0.70 | ✓      | Explicit in/out-of-scope list, including the resolved issuing-action scope |
| Constraint Clarity | 0.78  | 0.65 | ✓      | Reuse-existing-Applications, minimal-temporal-variety, no-new-audit-fields all locked |
| Acceptance Criteria| 0.80  | 0.70 | ✓      | 13 pass/fail checkboxes, edge + prohibition probes folded in |
| **Ambiguity**      | 0.18  | ≤0.20| ✓      |                                     |

## Interview Log

| Round | Perspective     | Question summary                                                        | Decision locked |
|-------|-----------------|---------------------------------------------------------------------------|-----------------|
| 1     | Researcher      | Where does dataset seed data live given v2.2's real backend vs. v2.3's mock-only scope constraint? | Pure frontend mock, joined to existing frontend Application fixtures — no backend calls |
| 1     | Researcher      | Does Phase 14 need WorldState mutation/reducer actions like v2.2's grant/delegate CRUD? | Static seed + read-only selectors only — no CRUD this phase (initially; revised in round 4) |
| 1     | Researcher      | Does seed data need rich temporal variety (expired/future grants) like v2.2? | Minimal — mostly active grants; only the deny-matrix needs an expired-grant case |
| 2     | Simplifier      | What is the "relevant entity" for mailbox counts, and how many? | Per-Person, small fixed set (2–3 people) |
| 2     | Simplifier      | How many Applications host the new datasets — reuse or new? | Reuse 1–2 existing v2.2 Application fixtures |
| 3     | Boundary Keeper | New Person/Org fixtures allowed, or must reuse existing only? | Allow 1–2 new People if needed for a clean story |
| 3     | Boundary Keeper | Explicit exclusions — UI, WebSocket, audit-log wiring? | Audit-log wiring for dataset grant issuance is acceptable (created a contradiction with round 1's "no mutation actions" — resolved in round 4) |
| 4     | Failure Analyst | Contradiction: no-mutation-actions vs. audit-log-for-issuance — which wins? | Add one minimal `issueDatasetGrant` action + audit-log entry; Phase 15 reuses it |
| Seed Closer | — | Audit entry shape — reuse existing interface or new dataset-specific shape? | Reuse existing `AuditLogEntry` interface, new `event` subtype only |
| Edge probe | — | Sole-deciding-gate proof — trace-level or verdict-only? | Trace-level: assert target gate fails AND other two pass |
| Edge probe | — | Orphan `application_id` references — explicit check or rely on Phase 13's throw? | Explicit structural acceptance criterion |
| Edge probe | — | Should `issueDatasetGrant` enforce `canIssueDatasetGrant` before creating? | Yes — must gate, refuse silently otherwise |
| Prohibition probe | — | Fictional-data hygiene for new fixtures — keep or dismiss as redundant? | Keep as explicit judgment-tier prohibition |
| Prohibition probe | — | Bias/protected-attribute correlation in new fixture roles — keep or dismiss? | Keep as explicit judgment-tier prohibition |

---

*Phase: 14-mock-dataset-worldstate*
*Spec created: 2026-07-04*
*Next step: /gsd-discuss-phase 14 — implementation decisions (exact fixture IDs/names, gate trace shape details, etc.)*
