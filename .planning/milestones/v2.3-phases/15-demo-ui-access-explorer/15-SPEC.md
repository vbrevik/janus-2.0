# Phase 15: Demo UI & Access Explorer — Specification

**Created:** 2026-07-05
**Ambiguity score:** 0.195 (gate: ≤ 0.20)
**Requirements:** 4 locked

## Goal

A new dedicated "Datasets" tab lets a staff user browse datasets nested within an Application, resolve dataset access for any person/dataset/datetime with a full 4-gate trace, see every person with active access to a dataset, and — if authorized — issue a new time-bounded DatasetAccessGrant, all reusing Phase 13's resolver and Phase 14's fixtures with zero backend calls.

## Background

Phase 14 built the mock dataset fixtures (`seed.ts`), the read-path selectors (`dataset-selectors.ts`), and the `ISSUE_DATASET_GRANT` write-path action (`world-state.tsx`), all proven by 314 passing tests. No UI exists yet at the dataset tier. The v2.2 Digital Resources tab (`resource-browser.tsx`, `resource-access-explorer.tsx`, `access-resolution-explorer.tsx`, `digital-resources-panel.tsx`) is the proven prior art for the Application tier: a Resource Browser + Access Resolution Explorer + admin-gated issuing form (`IssueGrantSection`), all wired to a real backend API. The dataset tier stays pure frontend mock this milestone (D-10) — no API calls.

`resolveDatasetAccess` (Phase 13) already computes an unconditional 4-entry gate trace (`CLEARANCE`, `APP_GRANT_OR`, `DATASET_GRANT`, `VISIBILITY`) — no short-circuit — and `DatasetAccessGrant` already carries `valid_from`/`valid_until` fields, though `ISSUE_DATASET_GRANT`'s reducer currently hardcodes both to `null`. `DatasetNode.application_ids` is a plural array; current fixtures deliberately keep every dataset single-application (D-03) because the only two seeded Applications have mismatched classifications, but the model and resolver already support multi-application datasets via an OR-gate loop.

## Requirements

1. **Datasets tab (DATA-UI-01)**: A new dedicated "Datasets" top-level tab shows a Datasets panel alongside the Application tree, listing datasets for whichever Application is selected.
   - Current: No dataset-tier UI exists. Only the Application-tier Resource Browser exists (v2.2).
   - Target: Selecting an Application shows its mailboxes, archive roles, and document sites in a separate panel (mirroring how `resource-access-explorer.tsx` sits beside `resource-browser.tsx`). The panel loops generically over every dataset's `application_ids` — a dataset spanning 2+ applications appears once under each application it belongs to (no dedup to a single "canonical" app). An Application with zero datasets shows an explicit empty message. List order is seed/array order (no new sort).
   - Acceptance: Selecting `rsrc-milapp-1` shows its 4 seeded datasets (2 mailboxes, 1 archive role, 1 document site); selecting `rsrc-intapp-1` shows its 1 document site; an Application with no datasets shows an empty-state message, not a blank panel.

2. **Dataset Access Resolution Explorer (DATA-UI-02)**: A new sibling component (not an extension of `resource-access-explorer.tsx`) takes person + dataset + datetime and renders an ALLOW/DENY verdict with the full gate-chain trace.
   - Current: No dataset-level explorer exists. `resource-access-explorer.tsx`'s `ResourceResolutionTrace` is the only precedent, styled per-gate-row, always showing every gate regardless of pass/fail.
   - Target: A new `dataset-access-explorer.tsx` (or equivalent) component calls `resolveDatasetAccess`, renders all 4 gate entries (`CLEARANCE`, `APP_GRANT_OR`, `DATASET_GRANT`, `VISIBILITY`) in order, styled consistently with `ResourceResolutionTrace`. Selecting a dataset in the Datasets panel pre-fills the explorer with that dataset (linked navigation, not independent re-selection). Defensive error boundary/fallback wraps the explorer in case `resolveDatasetAccess` throws (seed-integrity errors), even though current fixtures are exhaustively tested and this "shouldn't happen."
   - Acceptance: For `ds-archive-caserecords` (the deny-matrix fixture), all 3 documented deny-matrix scenarios render DENY with the correct single failing gate highlighted, and the 2 passing-gate scenarios render ALLOW.

3. **Reverse-lookup view (DATA-UI-03)**: A separate dedicated view lists every person with active access to a selected dataset and their effective level, computed through `resolveDatasetAccess` — not a separately computed shortcut.
   - Current: No reverse-lookup UI exists.
   - Target: A new standalone view, linked/pre-filled from the Datasets panel's dataset selection (same linking as the explorer). For each person, the view calls `resolveDatasetAccess(person, dataset, now)` and includes them iff `allow === true`; effective level is derived from the same internal ranking used by the `DATASET_GRANT` gate (`effectiveArchiveCoverage` / `effectiveRankedLevel`). One row per person (not one row per raw grant record) — a person with 2 grants on the same dataset appears once, at their combined effective level. Zero active grants shows an explicit empty message. List order is subject/seed array order (no new sort).
   - Acceptance: For `ds-archive-caserecords`, the reverse-lookup lists exactly the persons for whom the deny-matrix fixtures resolve `allow: true`, each exactly once, at their correct effective `ArchiveRole` level.

4. **Admin-gated issuing form (DATA-UI-04)**: A form lets an authorized admin/delegate issue a new DatasetAccessGrant; a non-admin persona is blocked, and existing regression suites stay green.
   - Current: `ISSUE_DATASET_GRANT`'s payload has no `valid_from`/`valid_until` fields — the reducer hardcodes both to `null`. `DatasetAccessGrant.valid_from`/`valid_until` already exist on the model. No UI dispatches this action yet.
   - Target: A form with Person, Level, Valid-from, and Valid-until fields, mirroring `IssueGrantSection`'s exact shape (v2.2 prior art) — no delegate-picker field (delegate authority is resolved automatically inside `canIssueDatasetGrant`, never selected by the issuer). `ISSUE_DATASET_GRANT`'s payload gains optional `validFrom`/`validUntil` fields; the reducer wires them into the constructed grant instead of hardcoding `null`. The form is gated on `getStoredUserRole() === "admin"` at the UI level (matching D-01's existing single-role-string convention) with `canIssueDatasetGrant` as the authoritative reducer-level gate. A non-admin login shows the form blocked/disabled, confirmed via live UAT. Full v2.2 golden-fixture + regression suite (314 tests) stays green after wiring.
   - Acceptance: Admin persona issuing a grant with a Valid-from/Valid-until produces a `DatasetAccessGrant` with those exact dates (not `null`) and a `DatasetAuditEntry`; non-admin persona sees the form blocked (live-UAT'd); `cd frontend && npx vitest run` stays 314/314+ passing; `npx tsc -b --noEmit` stays clean.

## Boundaries

**In scope:**
- New dedicated "Datasets" top-level tab
- Datasets panel (browsing, filtered by selected Application, generic multi-app loop)
- New dataset-access-explorer sibling component (full 4-gate trace, ALLOW/DENY)
- Reverse-lookup view (dataset → authorized persons + effective level)
- Linked/pre-filled navigation between panel → explorer/reverse-lookup
- Admin-gated issuing form (Person + Level + Valid-from + Valid-until)
- `ISSUE_DATASET_GRANT` payload extension (add `validFrom`/`validUntil`, wire into reducer)
- Explicit empty states (zero datasets in an Application; zero grants on a dataset)
- Defensive error boundary/fallback around explorer/reverse-lookup

**Out of scope:**
- Editing/revoking existing dataset grants — only issuing new grants is in scope (matches DATA-UI-04's wording)
- Bulk/multi-dataset operations — issuing form and explorer operate on one dataset at a time
- Backend wiring for datasets — carries forward Phase 14's D-10 decision; datasets stay pure frontend mock this milestone, no API/Postgres
- New multi-application-dataset fixture — the code path is built generically and correctly, but no new same-classification Application + shared-dataset fixture is added this phase (deferred verification, not deferred correctness)

## Constraints

- No new frameworks or libraries — match existing demo component patterns (`Card`, `Field`, `Select`, `Pill` from `components/ui`)
- Dataset explorer must be styled consistently with `resource-access-explorer.tsx`'s `ResourceResolutionTrace` (per DATA-UI-02's explicit wording), but as a separate component file, not an extension
- Issuing form must mirror `IssueGrantSection`'s exact field shape (Person, Level, Valid-from, Valid-until) — no additional fields
- No `routeTree.gen.ts` changes — demo stays isolated in `frontend/src/demo/` per project convention
- `ISSUE_DATASET_GRANT` payload extension must remain backward-compatible with Phase 14's existing dispatch call sites and tests

## Acceptance Criteria

- [ ] Datasets tab shows datasets for the selected Application, generically looping over all `application_ids` (not just the first) — a dataset spanning 2+ applications appears under each
- [ ] Empty states render explicit messages (zero datasets in an Application; zero grants in reverse-lookup) — no blank panels
- [ ] Dataset explorer renders all 4 gate-chain entries (`CLEARANCE`, `APP_GRANT_OR`, `DATASET_GRANT`, `VISIBILITY`) for any person+dataset+datetime, ALLOW or DENY
- [ ] Reverse-lookup shows every person with `resolveDatasetAccess(...).allow === true` for the selected dataset, one row per person, at their effective level
- [ ] Issuing form (Person + Level + Valid-from + Valid-until) dispatches the extended `ISSUE_DATASET_GRANT`; a submitted grant carries the entered dates, not `null`
- [ ] Non-admin login shows the issuing form blocked/disabled (live-UAT'd)
- [ ] MUST NOT let the issuing action succeed for a non-admin/non-delegate identity even if the UI-level gate were bypassed (existing 14-03 reducer test + Phase 15 live-UAT both confirm)
- [ ] Full v2.2 golden-fixture + regression suite (314 tests) stays green after wiring
- [ ] `npx tsc -b --noEmit` reports zero errors

## Edge Coverage

**Coverage:** 6/9 applicable edges resolved · 3 dismissed · 0 unresolved

| Category | Requirement | Status | Resolution / Reason |
|----------|-------------|--------|---------------------|
| adjacency | R1 | ✅ covered | Dataset spanning 2+ apps appears once per app (no dedup) — AC row 1 |
| empty | R1 | ✅ covered | Application with zero datasets shows explicit empty message — AC row 2 |
| ordering | R1 | ✅ covered | Seed/array order, no new sort (matches existing Resource Browser convention — no `.sort()` anywhere in it) |
| unclassified | R2 | ⛔ dismissed | Gate-chain trace shape is fully fixed by Phase 13's `resolveDatasetAccess` (always exactly 4 entries, computed unconditionally) — nothing left for this UI-only requirement to specify |
| adjacency | R3 | ✅ covered | One row per person at effective (combined) level, not one row per raw grant record — AC row 4 |
| empty | R3 | ✅ covered | Zero active grants shows explicit empty message — AC row 2 |
| ordering | R3 | ✅ covered | Subject/seed array order, no new sort |
| idempotency | R4 | ⛔ dismissed | Duplicate form submissions create separate additive grant records — matches existing v2.2 `IssueGrantSection` behavior (no dedup there either); harmless since effective level = highest active grant |
| concurrency | R4 | ⛔ dismissed | `ISSUE_DATASET_GRANT` is a synchronous in-memory reducer dispatch, no network call (D-10) — no concurrency surface exists, unlike the resource tier's async API mutation |

## Prohibitions (must-NOT)

**Coverage:** 1/1 applicable prohibitions resolved · 0 unresolved

| Prohibition (must-NOT statement) | Requirement | Status | Verification / Reason |
|-----------------------------------|-------------|--------|------------------------|
| MUST NOT let the grant-issuing action succeed for a non-admin/non-delegate identity, even if the UI-level `isAdmin` gate were somehow bypassed | R4 | resolved | test (existing `world-state.test.tsx` `ISSUE_DATASET_GRANT` reducer test, Phase 14) + judgment (Phase 15 live-UAT with non-admin persona). Matches this project's own explicitly-named enforcement-gap/IDOR lesson from v2.2 — not generic OWASP boilerplate, this requirement's own wording flags it directly. |

R1, R2, and R3 yielded zero kept prohibitions after the recall→precision pass — no bespoke values/safety/ethics concern applies beyond the R4 enforcement gate (browsing and the trace/reverse-lookup views reuse the existing v2.2 full-transparency convention, which already prevents misleading or conflated gate display).

## Ambiguity Report

| Dimension          | Score | Min  | Status | Notes                              |
|--------------------|-------|------|--------|-------------------------------------|
| Goal Clarity       | 0.85  | 0.75 | ✓      | 4 requirements each with Current/Target/Acceptance |
| Boundary Clarity   | 0.75  | 0.70 | ✓      | Explicit in/out-of-scope lists, multi-app case scoped |
| Constraint Clarity | 0.75  | 0.65 | ✓      | Exact prior-art component/field shapes locked |
| Acceptance Criteria| 0.85  | 0.70 | ✓      | 9 pass/fail checkboxes, incl. 1 negative (prohibition) |
| **Ambiguity**      | 0.195 | ≤0.20| ✓      |                                      |

Status: ✓ = met minimum, ⚠ = below minimum (planner treats as assumption)

## Interview Log

| Round | Perspective      | Question summary                                              | Decision locked                                                                 |
|-------|------------------|-----------------------------------------------------------------|-----------------------------------------------------------------------------------|
| 1     | Researcher       | Where does Datasets section live vs. Resource Browser tree?    | Separate panel alongside the tree (mirrors resource-access-explorer's layout)     |
| 1     | Researcher       | New explorer component or extend existing one?                  | New sibling component (`dataset-access-explorer.tsx`), not an extension           |
| 1     | Researcher       | Where does reverse-lookup live?                                  | Separate dedicated view                                                           |
| 2     | Researcher       | Tab placement: inside Digital Resources or new tab?              | New dedicated "Datasets" top-level tab                                            |
| 2     | Researcher       | Navigation between the 3 pieces?                                 | Linked/pre-filled (selecting a dataset drives explorer + reverse-lookup)          |
| 2     | Simplifier       | Issuing form field scope?                                        | Fuller form (later corrected: Person + Level + Valid-from + Valid-until, no delegate field, mirrors v2.2 exactly) |
| 3     | Boundary Keeper  | Reverse-lookup empty state?                                      | Explicit empty message                                                            |
| 3     | Failure Analyst  | Defensive handling for resolver throws?                          | Add a defensive error boundary/fallback                                           |
| 3     | Boundary Keeper  | Multi-application dataset — build the case or add a new fixture? | Build UI generically (loop all `application_ids`); no new fixture this phase      |
| 4     | Seed Closer      | Draft acceptance checklist confirmation                          | Locked as-is (5-item draft, later expanded to 9 with edge/prohibition findings)   |
| —     | Edge probe       | 9 applicable edges across R1/R2/R3/R4                            | 6 resolved/explicit, 3 dismissed, 0 unresolved (see Edge Coverage table)          |
| —     | Prohibition probe| Enforcement-gap/IDOR pattern on R4                               | Kept — test (existing reducer test) + judgment (Phase 15 live-UAT) tiers          |

---

*Phase: 15-demo-ui-access-explorer*
*Spec created: 2026-07-05*
*Next step: /gsd-discuss-phase 15 — implementation decisions (component file layout, exact styling classes, hook wiring)*
