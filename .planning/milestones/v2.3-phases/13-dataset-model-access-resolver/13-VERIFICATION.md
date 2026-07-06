---
phase: 13-dataset-model-access-resolver
verified: 2026-07-04T16:15:00Z
status: passed
score: 13/13 must-haves verified
behavior_unverified: 0
overrides_applied: 0
---

# Phase 13: Dataset Model & Access Resolver Verification Report

**Phase Goal:** Dataset types (MAILBOX/ARCHIVE_ROLE/DOCUMENT_SITE, multi-Application-capable) with per-type level mechanisms (rank for MAILBOX/DOCUMENT_SITE, containment for ARCHIVE_ROLE), DatasetAccessGrant/Delegate, the standalone 3-gate `resolveDatasetAccess` resolver with an independent existence-`visible` gate, classification-override validation, and delegate-capped `canIssueDatasetGrant`.
**Verified:** 2026-07-04T16:15:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `DatasetNode` requires non-empty `application_ids`; empty array rejected by `validateDatasetNode` (DATA-01) | ✓ VERIFIED | `model.ts:1329-1334` `validateDatasetNode`; tests `dataset.test.ts:98-129` (rejects empty, accepts 2-elem and 1-elem) |
| 2 | `dataset_type` = MAILBOX/ARCHIVE_ROLE/DOCUMENT_SITE with per-type level mechanisms (rank tables for MAILBOX/DOCUMENT_SITE, containment map for ARCHIVE_ROLE); cross-type comparison not representable; uncontained ARCHIVE_ROLE pair yields no substitution (DATA-02, DATA-03) | ✓ VERIFIED | `model.ts:1195-1249` — 3 separate literal unions (never merged), `MAILBOX_LEVELS`/`DOCUMENT_SITE_LEVELS` rank arrays, `ARCHIVE_ROLE_CONTAINS` `Record<ArchiveRole, ArchiveRole[]>` (TS forces all keys present — compiles clean), `archiveRoleCovers` transitive walk. Tests `dataset.test.ts:198-246` cover full pairwise matrix including CASE_HANDLER-does-NOT-cover-ADMIN and READER-covers-only-itself |
| 3 | Resolving a level/role not in a dataset's own vocabulary fails closed (throws) via `isLevelInVocabulary`, for both rank-table types and containment type | ✓ VERIFIED | `resolveDatasetAccess` step 1 (`model.ts:1534-1538`) throws when `requiredLevel` not in vocabulary; tests `dataset.test.ts:687-726` (both rank and containment types) |
| 4 | `admin_org_id`/`asset_owner_org_id` are fixed string fields, not a time-windowed org_links list (DATA-04) | ✓ VERIFIED | `DatasetNode` interface `model.ts:1291-1299` — two bare `string` fields; `canIssueDatasetGrant`'s admin path (`model.ts:1691-1693`) uses bare equality, never `isWindowActive` |
| 5 | `effectiveDatasetClassification` returns override when set, else parent's `effectiveClassification()`; validator accepts override == parent, rejects strictly lower | ✓ VERIFIED | `model.ts:1351-1394`; tests `dataset.test.ts:271-416` incl. explicit `toThrow` divergence case and empty-`application_ids` throw (WR-02 regression) |
| 6 | Dataset with >1 linked Application whose classifications diverge throws (assert-all-share-then-fail-loud, never highest-wins) | ✓ VERIFIED | `resolveDatasetBaseClassification` (`model.ts:1410-1442`) asserts identical classifications, throws on divergence; test `dataset.test.ts:308-321` |
| 7 | Effective access = highest active grant (MAILBOX/DOCUMENT_SITE); containment-union across active role grants (ARCHIVE_ROLE), never collapsed to one "highest" role (DATA-GRANT-01/02/03) | ✓ VERIFIED | `effectiveRankedLevel`/`effectiveArchiveCoverage` (`model.ts:1452-1488`); tests `dataset.test.ts:417-509` incl. `CASE_HANDLER` coverage explicitly asserting `.has("ADMIN")` is `false` |
| 8 | `resolveDatasetAccess` denies (`allow:false`) when APP_GRANT_OR gate fails at eval time, even with a nominally-active DatasetAccessGrant (DATA-ACCESS-01/03) | ✓ VERIFIED | `model.ts:1544-1561` (gate 2), `1646` (allow = AND of all 3); test `dataset.test.ts:560-588` |
| 9 | Application-grant gate is OR across `application_ids` — one active grant on any linked Application suffices (DATA-ACCESS-01) | ✓ VERIFIED | `model.ts:1544-1561` `.some`-style early-return loop; test `dataset.test.ts:590-616` (1-of-2 apps active -> pass) |
| 10 | `allow:true` requires all 3 gates in order CLEARANCE, APP_GRANT_OR, DATASET_GRANT, plus 4th VISIBILITY trace entry (DATA-ACCESS-02/03) | ✓ VERIFIED | `model.ts:1620-1641` — exactly 4-entry `gates[]` in that literal order; test `dataset.test.ts:747-767` asserts `gates.map(g=>g.kind)` equals the canonical order |
| 11 | `visible` computed from gate 2 alone, independent of clearance/dataset-grant; `visible:true,allow:false` is distinct reachable state; orphan case (dataset grant, no app grant) -> `visible:false`, no admin/delegate exemption (DATA-ACCESS-04) | ✓ VERIFIED | `model.ts:1647` `visible: appGrantPass` — no branch on admin_org/delegate anywhere in the function; tests `dataset.test.ts:618-660`, named pitfall test `839-873` (`visible-allow-independence`) |
| 12 | Non-existent Application id throws; out-of-vocabulary stored `DatasetAccessGrant.level` excluded (denied, not thrown), siblings still resolve | ✓ VERIFIED | `model.ts:1547-1551` throw; `1577-1583` filter excludes bad `level` via `isLevelInVocabulary`; tests `dataset.test.ts:727-746`, `875-952` (incl. CR-01 `Object.prototype`-key regression, confirmed fixed) |
| 13 | `canIssueDatasetGrant`: `true` unconditionally for active admin_org; delegate only when holding own active grant on exact dataset AND issuing at/below own coverage; `false` for no-personal-grant delegate, non-admin/non-delegate, expired delegate (DATA-DELEG-01) | ✓ VERIFIED | `model.ts:1679-1743`; tests `dataset.test.ts:976-1145` cover all 6 behaviors + WR-01 admin-path vocabulary regression + issuing-vs-access independence (`1146-1183`) |

**Score:** 13/13 truths verified (0 present-but-behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `frontend/src/demo/lib/model.ts` (Phase 13 section) | Dataset types/vocab/classification/aggregation/resolver/delegation, appended after line 1183 | ✓ VERIFIED | Section spans lines ~1183-1743 (~560 net lines after review fixes); all listed types/functions present, exported, and match plan action specs line-for-line |
| `frontend/src/demo/lib/dataset.test.ts` | New sibling test file, inline fixtures only | ✓ VERIFIED | 1184 lines, 72 tests, no `seed.ts` import, fixed `NOW` constant matching sibling convention |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `isLevelInVocabulary` | comparator/aggregation entry points | dispatch on `dataset_type` before touching bare level | ✓ WIRED | Called first in `resolveDatasetAccess` (throws), and used as a filter predicate before every aggregation call in both `resolveDatasetAccess` and `canIssueDatasetGrant` |
| `resolveDatasetAccess` | `effectiveDatasetClassification` | direct call for gate 1, never re-derives | ✓ WIRED | `model.ts:1564-1568` |
| `effectiveRankedLevel`/`effectiveArchiveCoverage` | caller-pre-filtered grants | caller applies `isWindowActive` before calling | ✓ WIRED | `resolveDatasetAccess:1577-1583` and `canIssueDatasetGrant:1706-1712` both filter via `isWindowActive` before calling the aggregation functions; the functions themselves never call `isWindowActive` |
| `canIssueDatasetGrant` delegate cap | `effectiveArchiveCoverage`/rank tables | same aggregation as gate 3, not a parallel implementation | ✓ WIRED | `model.ts:1720-1739` calls the identical exported functions used by `resolveDatasetAccess`'s gate 3 |
| `DatasetAccessResult.gates` | `ResourceGateResult` (v2.2 type) | reused, not redefined | ✓ WIRED | `model.ts:1499-1503` — no new gate-result interface introduced |

### Behavioral Spot-Checks / Test Execution

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full dataset.test.ts suite | `npx vitest run src/demo/lib/dataset.test.ts` | PASS (72) FAIL (0) | ✓ PASS |
| Full repo test suite (regression) | `npm run test` | 19 files, 300 tests, 0 failures (matches SUMMARY's 300/300 claim) | ✓ PASS |
| TypeScript build | `npm run build` (`tsc -b && vite build`) | 0 errors, build succeeds | ✓ PASS |
| Phase-commit scope | `git show --stat` on all 9 phase-13 commits | Every commit touches only `model.ts`/`dataset.test.ts` | ✓ PASS |

### Code Review Fix Verification (post-review regressions)

| Finding | Fix Commit | Verified in Code | Verified in Tests |
|---------|-----------|-------------------|--------------------|
| CR-01 (critical): `in` operator on `ARCHIVE_ROLE_CONTAINS` matches `Object.prototype` keys, crashes resolver | `2c41529` | `model.ts:1277` now uses `Object.prototype.hasOwnProperty.call(...)` | `dataset.test.ts:183-196` (isLevelInVocabulary), `:916-952` (resolver doesn't throw on `"constructor"` grant) |
| WR-01: admin_org path never validates `requestedLevel` vocabulary | `225054c` | `model.ts:1691-1693` now returns `isLevelInVocabulary(...)` instead of bare `true` | `dataset.test.ts:998-1010` |
| WR-02: silent `undefined` classification on empty `application_ids` | `4d05650` | `resolveDatasetBaseClassification` (`model.ts:1425-1429`) throws explicitly | `dataset.test.ts:334-349`, `:401-415` |
| WR-03: duplicated resolve-and-assert logic | `4d05650` | Extracted to shared `resolveDatasetBaseClassification` (`model.ts:1410-1442`); `deriveBaseClassification` deleted | N/A (refactor; existing tests still pass) |
| IN-01: unused `reason` field on `DatasetAccessResult` | `dd78d8e` | Field removed (`model.ts:1499-1503` has only `allow`/`visible`/`gates`) | N/A (no test referenced it) |

All 5 review findings are fixed in the code as claimed, each backed by a passing regression test (except the two structural/dead-code fixes, which are appropriately verified by "field absent" / "no duplication present" rather than a behavioral test). Full-suite regression run (300/300) confirms no fix introduced a regression.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|--------------|--------|----------|
| DATA-01 | 13-01 | Dataset multi-Application, non-empty application_ids | ✓ SATISFIED | Truth #1 |
| DATA-02 | 13-01 | dataset_type vocabulary | ✓ SATISFIED | Truth #2 |
| DATA-03 | 13-01 | Per-type level mechanism, fail-closed on unrecognized | ✓ SATISFIED | Truths #2, #3 |
| DATA-04 | 13-01 | Fixed admin_org_id/asset_owner_org_id | ✓ SATISFIED | Truth #4 |
| DATA-05 | 13-01 | Classification derive-with-override | ✓ SATISFIED | Truths #5, #6 |
| DATA-ACCESS-01 | 13-02 | App-grant OR-gate, resolution-time enforcement | ✓ SATISFIED | Truths #8, #9 |
| DATA-ACCESS-02 | 13-02 | DatasetAccessGrant covering required level/role | ✓ SATISFIED | Truth #10 |
| DATA-ACCESS-03 | 13-02 | 3-gate ordered chain | ✓ SATISFIED | Truth #10 (single-deciding-gate exhaustive matrix explicitly deferred to Phase 14 DATA-SEED-06 per SPEC.md backstop — not a Phase 13 gap) |
| DATA-ACCESS-04 | 13-02 | Independent visibility gate | ✓ SATISFIED | Truth #11 |
| DATA-GRANT-01 | 13-01 | DatasetAccessGrant person/dataset/level/window shape | ✓ SATISFIED | `DatasetAccessGrant` interface (`model.ts:1305-1312`) |
| DATA-GRANT-02 | 13-01 | Multiple grants per dataset at different levels | ✓ SATISFIED | Aggregation functions operate over arrays of grants; test `dataset.test.ts:488-509` (union across multiple grants) |
| DATA-GRANT-03 | 13-01/13-02 | Effective access aggregation (rank-max / containment-union) | ✓ SATISFIED | Truth #7; explicit all-expired test `dataset.test.ts:769-796` |
| DATA-DELEG-01 | 13-02 | Delegate-capped issuing authority | ✓ SATISFIED | Truth #13 |

No orphaned requirements: REQUIREMENTS.md's Traceability table maps only these 13 IDs to Phase 13; DATA-SEED-* and DATA-UI-* are explicitly mapped to Phase 14/15, correctly out of scope here.

### Anti-Patterns Found

None. No `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER` markers, no stub returns, no hardcoded-empty data paths in `model.ts` or `dataset.test.ts`.

### Minor Documentation Observation (non-blocking)

`REQUIREMENTS.md`'s checkboxes for DATA-01..05 and DATA-GRANT-01..03 remain unchecked (`[ ]`) despite being fully implemented and tested, while DATA-ACCESS-01..04 and DATA-DELEG-01 were checked (`[x]`) during this phase's commits. This is a documentation-hygiene inconsistency only — code and test evidence independently confirm all 13 requirements are satisfied. Recommend checking the remaining 8 boxes as a trivial follow-up; not a gap in the phase goal.

### Human Verification Required

None. All truths in this phase are pure-function, unit-testable logic (no UI, no runtime state machine, no external service) — Vitest coverage plus direct code reading is sufficient for full confidence.

### Gaps Summary

No gaps found. All 13 requirement IDs (DATA-01..05, DATA-ACCESS-01..04, DATA-GRANT-01..03, DATA-DELEG-01) are implemented, exported from `model.ts`, and covered by passing tests in `dataset.test.ts`. The 5 code-review findings (1 critical, 3 warnings, 1 info) are all fixed with regression tests, and the full 300-test suite plus TypeScript build remain green post-fix — confirming the fix commits introduced no regressions. Scope was held to exactly the two declared files (`model.ts`, `dataset.test.ts`) across all 9 phase commits.

---

_Verified: 2026-07-04T16:15:00Z_
_Verifier: Claude (gsd-verifier)_
