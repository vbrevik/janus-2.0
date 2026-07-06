---
phase: 13-dataset-model-access-resolver
fixed_at: 2026-07-04T15:59:30Z
review_path: .planning/phases/13-dataset-model-access-resolver/13-REVIEW.md
iteration: 1
findings_in_scope: 5
fixed: 5
skipped: 0
status: all_fixed
---

# Phase 13: Code Review Fix Report

**Fixed at:** 2026-07-04T15:59:30Z
**Source review:** .planning/phases/13-dataset-model-access-resolver/13-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 5 (fix_scope: all)
- Fixed: 5
- Skipped: 0

## Fixed Issues

### CR-01: `isLevelInVocabulary`'s ARCHIVE_ROLE check uses `in`, which matches inherited `Object.prototype` keys and crashes the resolver

**Files modified:** `frontend/src/demo/lib/model.ts`, `frontend/src/demo/lib/dataset.test.ts`
**Commit:** 2c41529
**Applied fix:** Replaced `level in ARCHIVE_ROLE_CONTAINS` with `Object.prototype.hasOwnProperty.call(ARCHIVE_ROLE_CONTAINS, level)` in `isLevelInVocabulary`'s `ARCHIVE_ROLE` branch, eliminating the prototype-chain match on keys like `"constructor"`/`"toString"`/`"hasOwnProperty"`/`"__proto__"`. Added regression tests: `isLevelInVocabulary("ARCHIVE_ROLE", "constructor"|"toString"|"hasOwnProperty"|"__proto__")` all assert `false`, and a new `resolveDatasetAccess` test confirms a stored grant with `level: "constructor"` is excluded (gate fails, `allow: false`) rather than throwing.

### WR-01: `canIssueDatasetGrant`'s admin_org path never validates `requestedLevel` against the dataset's vocabulary

**Files modified:** `frontend/src/demo/lib/model.ts`, `frontend/src/demo/lib/dataset.test.ts`
**Commit:** 225054c
**Applied fix:** Changed the admin_org path from `if (actorOrgId === dataset.admin_org_id) return true;` to `if (actorOrgId === dataset.admin_org_id) { return isLevelInVocabulary(dataset.dataset_type, requestedLevel); }`, matching the delegate path's existing vocabulary check. Added a regression test confirming `canIssueDatasetGrant("ORG-ADMIN", ..., "TOTALLY_BOGUS_LEVEL", ...)` now returns `false`. Verified the existing admin_org and issuing-vs-access-independence tests (which pass valid levels) still pass unchanged.

### WR-02: `effectiveDatasetClassification`/`deriveBaseClassification` silently return `undefined` when `application_ids` is empty, instead of throwing

**Files modified:** `frontend/src/demo/lib/model.ts`, `frontend/src/demo/lib/dataset.test.ts`
**Commit:** 4d05650 (combined with WR-03 — see note below)
**Applied fix:** Added an explicit throw (`resolveDatasetBaseClassification: dataset "{id}" has no application_ids to derive a classification from`) when `resolvedApps.length === 0`, inside the new shared helper (see WR-03). Added regression tests for both `effectiveDatasetClassification` and `validateDatasetClassification` confirming they now throw (not silently return `undefined`) when `application_ids` is empty.

### WR-03: `effectiveDatasetClassification` and `deriveBaseClassification` duplicate ~20 lines of identical resolve-and-assert logic

**Files modified:** `frontend/src/demo/lib/model.ts`, `frontend/src/demo/lib/dataset.test.ts`
**Commit:** 4d05650
**Applied fix:** Extracted the shared resolve-and-assert logic (per the review's "better" option) into a new private helper `resolveDatasetBaseClassification`, deleted `deriveBaseClassification` entirely, and updated both `effectiveDatasetClassification` and `validateDatasetClassification` to call the shared helper directly. This also fixes the drifted error-message prefixes the review flagged (both paths now use `"resolveDatasetBaseClassification: ..."`). Updated a stale comment reference (`deriveBaseClassification below` -> `resolveDatasetBaseClassification below`) in `validateDatasetClassification`'s docstring.

**Note:** WR-02 and WR-03 were fixed in a single commit because the WR-03 refactor (extracting the shared helper) is the natural place to add the WR-02 empty-array throw — splitting them into two commits would have required implementing the throw twice (once per duplicate) only to immediately delete one copy in the very next commit. Both finding IDs and their reasoning are documented here for traceability.

### IN-01: `DatasetAccessResult.reason` is declared but never populated by `resolveDatasetAccess`

**Files modified:** `frontend/src/demo/lib/model.ts`
**Commit:** dd78d8e
**Applied fix:** Removed the unused `reason?: string` field from `DatasetAccessResult`. Chose "drop the field" over "populate it" because `resolveDatasetAccess` has no early fail-closed exit path analogous to `resolveResourceAccess`'s `NO_ACTIVE_POLICY` (the only site that populates `ResourceAccessResult.reason`); populating `reason` for every ordinary gate-fail path would just duplicate information already available in the `gates` array trace. Confirmed no test or other module referenced `DatasetAccessResult.reason` before removal.

## Skipped Issues

None — all findings were fixed.

---

_Fixed: 2026-07-04T15:59:30Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
