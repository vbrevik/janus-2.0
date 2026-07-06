# Phase 14: Mock Dataset & WorldState - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-04
**Phase:** 14-mock-dataset-worldstate
**Areas discussed:** Person casting & app-grant realism, Audit-log shape for issueDatasetGrant, Scenario tests real seed vs standalone fixtures, WorldState.datasets init pattern

---

## Person casting & Application-grant realism

Discovery: only `subj-1` (Dana Reyes) holds any v2.2 `ResourceAccessGrant` in `seed.ts` today — every other existing subject has zero.

**Q1: How to give other people resolvable dataset access?**

| Option | Description | Selected |
|--------|-------------|----------|
| Add new grants to v2.2 seed.ts | Additive `ResourceAccessGrant` entries for other subjects; verified no test asserts array length/snapshot | ✓ |
| Keep v2.2 grants untouched, subj-1-centric | Others simply lack any app grant; naturally invisible/denied | |
| New people with fresh grants only | Brand-new Subject fixtures only, existing subj-2..17 untouched | |

**Q2: Which existing subjects form the cast?**

| Option | Description | Selected |
|--------|-------------|----------|
| subj-1, subj-2, subj-3 | Dana Reyes / Sam Okafor / Lee Park — 3 units, 3 clearances | ✓ |
| subj-1, subj-2, subj-4 | Dana Reyes / Sam Okafor / Mara Vance — tighter MILITARY_1/2 story | |
| You decide | Claude picks post-drafting | |

**Q3: Which Application(s) host the datasets?**

| Option | Description | Selected |
|--------|-------------|----------|
| rsrc-milapp-1 + rsrc-intapp-1 | MilApp-1 + IntelApp-1, covers 2 of 3 cast orgs | ✓ |
| Single app: rsrc-milapp-1 only | Simpler, fewer new grants | |
| You decide | Claude picks post-drafting | |

**Q4: Reuse existing subjects or mint new one for deny-case narratives?**

| Option | Description | Selected |
|--------|-------------|----------|
| Reuse existing subjects only | subj-4 (zero app grants today) covers the pure invisible case | |
| Mint 1 new Person for a clean deny story | Keeps allow-cases and deny-cases on separate people | ✓ |

**User's choice:** Additive new grants in v2.2 seed.ts; cast = subj-1/subj-2/subj-3; Applications = rsrc-milapp-1 + rsrc-intapp-1; mint 1 new denial-narrative Subject.
**Notes:** This resolves a real tension in SPEC.md's boundary text ("v2.2 seed must remain unmodified") — read as "existing entries/tests unmodified," not "byte-for-byte frozen," since additions don't break any existing assertion.

---

## Audit-log shape for issueDatasetGrant

Discovery: SPEC.md's "existing `AuditLogEntry` interface" does not exist anywhere in the repo (verified by full-repo grep). The only audit-like mechanism is `AttrEvent`/`AttrOp` (ABAC compartment domain), whose `value` field is a closed 6-value enum that can't hold `dataset_id`/`level`. v2.2's own grant-issuing action has zero audit trail today.

**Q1: What should issueDatasetGrant's audit record be?**

| Option | Description | Selected |
|--------|-------------|----------|
| New DatasetAuditEntry type | Mirrors AttrEvent's pattern (seq/actor/append-only), dataset-shaped fields, stored on WorldState.datasets.auditLog | ✓ |
| Extend AttrEvent/AttrOp union | Lossy — Compartment enum can't hold dataset_id/level | |
| You decide | Claude designs minimal shape | |

**Q2: What should the actor field capture?**

| Option | Description | Selected |
|--------|-------------|----------|
| actor_person_id + actor_org_id | Matches canIssueDatasetGrant's own parameters | ✓ |
| Single actor label string | Mirrors AttrEvent.actor convention | |

**Q3: Should it store a real timestamp alongside seq?**

| Option | Description | Selected |
|--------|-------------|----------|
| Both seq and timestamp | seq for ordering, timestamp: Date (the `now` param) for real dates in UI | ✓ |
| seq only, no timestamp | Matches AttrEvent exactly | |

**User's choice:** New `DatasetAuditEntry` type with `actor_person_id`/`actor_org_id` and both `seq`+`timestamp`, stored on `WorldState.datasets.auditLog`.
**Notes:** Flagged explicitly in CONTEXT.md that this is new (small) infrastructure, not literal reuse of a nonexistent interface — researcher/planner should not search for `AuditLogEntry`.

---

## Scenario tests: real seed vs. standalone fixtures

**Q1: Should DATA-SEED-04/05/06 tests use real seed.ts/WorldState data or standalone fixtures?**

| Option | Description | Selected |
|--------|-------------|----------|
| Real seed integration | Mirrors digital-resource.test.ts's "seed integration" block; proves actual demo data resolves, matches what Phase 15's UI will show | ✓ |
| Standalone inline fixtures | Mirrors Phase 13's dataset.test.ts convention; simpler but doesn't prove real seeded data | |

**Q2: Where should these tests live?**

| Option | Description | Selected |
|--------|-------------|----------|
| New dataset-selectors.test.ts | Covers both selector-join tests and seed-integration scenarios in one file | ✓ |
| Separate dataset-seed.test.ts | Splits selector-unit vs seed-integration concerns | |

**User's choice:** Real seed integration tests, all inside one new `dataset-selectors.test.ts`.
**Notes:** Diverges intentionally from Phase 13's inline-fixture convention — Phase 13's own `dataset.test.ts` is unaffected and stays inline-only.

---

## WorldState.datasets init pattern

Discovery: `WorldState.digitalResources` now starts EMPTY at `seedWorld()` (Phase 11 moved it to backend-fetch-populated) — but datasets stay pure frontend mock.

**Q1: Should WorldState.datasets mirror zones/grants/delegates (eager) or digitalResources (empty-then-fetch)?**

| Option | Description | Selected |
|--------|-------------|----------|
| Eager seed-array init | Matches zones/grants/delegates pattern; no backend involvement | ✓ |
| Empty-then-action-populated | Unnecessary indirection for data never actually fetched | |

**Q2: Should dataset-selectors.ts take individual array params or the whole WorldState?**

| Option | Description | Selected |
|--------|-------------|----------|
| Individual array params | Matches digital-resource-selectors.ts's existing signature style | ✓ |
| Accept the whole WorldState object | Less boilerplate but diverges from sibling convention | |

**User's choice:** Eager seed-array init in `seedWorld()`; selectors take individual array params.

---

## Claude's Discretion

- Exact fixture IDs/names for new mailboxes, archive dataset, document sites, and the 1 new denial-narrative Subject
- Exact archive-role/document-site-level distribution across subj-1/2/3
- Whether the new additive ResourceAccessGrant entries are all active or one is deliberately expired (recommended: one expired, to give the app-grant-expired deny-matrix case a real fixture)

## Deferred Ideas

None — discussion stayed within phase scope.
