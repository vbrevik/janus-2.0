---
phase: 13-dataset-model-access-resolver
reviewed: 2026-07-04T00:00:00Z
depth: standard
files_reviewed: 2
files_reviewed_list:
  - frontend/src/demo/lib/model.ts
  - frontend/src/demo/lib/dataset.test.ts
findings:
  critical: 1
  warning: 3
  info: 1
  total: 5
status: issues_found
---

# Phase 13: Code Review Report

**Reviewed:** 2026-07-04T00:00:00Z
**Depth:** standard
**Files Reviewed:** 2
**Status:** issues_found

## Summary

Reviewed the Phase 13 (v2.3) dataset model additions in `model.ts` (lines ~1166-1735:
`DatasetType`/`MailboxLevel`/`DocumentSiteLevel`/`ArchiveRole` vocabularies,
`archiveRoleCovers`, `isLevelInVocabulary`, `DatasetNode`/`DatasetAccessGrant`/
`DatasetAccessDelegate`, `validateDatasetNode`, `effectiveDatasetClassification`,
`validateDatasetClassification`/`deriveBaseClassification`, `effectiveRankedLevel`,
`effectiveArchiveCoverage`, `resolveDatasetAccess`, `canIssueDatasetGrant`) and the
companion `dataset.test.ts` Vitest suite.

The module is heavily documented and its stated invariants (fail-closed on missing
data, never throw on malformed *grant* data, no cross-tier/cross-vocabulary leakage)
are largely honored by the test suite — but one of those invariants is actually
broken at runtime: `isLevelInVocabulary`'s `ARCHIVE_ROLE` branch uses the `in`
operator against a plain object, which matches inherited `Object.prototype`
properties (`"constructor"`, `"toString"`, `"hasOwnProperty"`, etc.) and will crash
the resolver on a malformed grant instead of excluding it, directly contradicting
the "malformed-stored-grant-excluded-not-thrown" pitfall the tests otherwise assert.
Three further gaps (an unvalidated admin-issue level, a silent `undefined`
classification on empty `application_ids`, and duplicate classification-derivation
logic) round out the findings below.

## Critical Issues

### CR-01: `isLevelInVocabulary`'s ARCHIVE_ROLE check uses `in`, which matches inherited `Object.prototype` keys and crashes the resolver

**File:** `frontend/src/demo/lib/model.ts:1272-1273` (root cause), with crash sites at `frontend/src/demo/lib/model.ts:1239` (`archiveRoleCovers`) and `frontend/src/demo/lib/model.ts:1477` (`effectiveArchiveCoverage`)

**Issue:**
```ts
case "ARCHIVE_ROLE":
  return level in ARCHIVE_ROLE_CONTAINS;
```
`ARCHIVE_ROLE_CONTAINS` is a plain object literal (`{ ADMIN: [...], CASE_HANDLER: [...], READER: [] }`). The `in` operator walks the *entire prototype chain*, not just own properties, so `"constructor" in ARCHIVE_ROLE_CONTAINS`, `"toString" in ARCHIVE_ROLE_CONTAINS`, `"hasOwnProperty" in ARCHIVE_ROLE_CONTAINS`, `"valueOf" in ARCHIVE_ROLE_CONTAINS`, `"isPrototypeOf" in ARCHIVE_ROLE_CONTAINS`, and `"__proto__" in ARCHIVE_ROLE_CONTAINS` all evaluate to `true`.

This means a `DatasetAccessGrant` (or `DatasetAccessDelegate`-backed own-grant) with `level: "constructor"` (or any of the other Object.prototype names) passes `isLevelInVocabulary("ARCHIVE_ROLE", ...)` and is kept in the `filtered`/`ownGrants` arrays inside `resolveDatasetAccess` (model.ts:1572-1578) and `canIssueDatasetGrant` (model.ts:1697-1703). It is then cast `as ArchiveRole` and passed to `effectiveArchiveCoverage`, which does:
```ts
for (const contained of ARCHIVE_ROLE_CONTAINS[role]) { ... }
```
`ARCHIVE_ROLE_CONTAINS["constructor"]` resolves to the `Object` constructor function (or, for `"toString"`/`"hasOwnProperty"`, a built-in function; for `"__proto__"`, `Object.prototype` itself) — none of which are iterable. `for...of` over a non-iterable throws an uncaught `TypeError`.

This directly violates the module's own documented contract (the "malformed-stored-grant-excluded-not-thrown" pitfall test at `dataset.test.ts:843-882`): a bad grant `level` is supposed to be silently excluded, never crash the caller. Here, a specific class of bad `level` values (any Object.prototype property name) crashes `resolveDatasetAccess`/`canIssueDatasetGrant` instead of failing closed. Given `DatasetAccessGrant.level` is explicitly documented as an "OPEN (string)" field expected to sometimes hold out-of-vocabulary garbage, this is a realistic, reachable data-integrity crash, not a contrived edge case.

**Fix:** Use an own-property check instead of `in`:
```ts
case "ARCHIVE_ROLE":
  return Object.prototype.hasOwnProperty.call(ARCHIVE_ROLE_CONTAINS, level);
```
or equivalently `return (Object.keys(ARCHIVE_ROLE_CONTAINS) as string[]).includes(level);` to match the array-based `.includes()` style already used for `MAILBOX_LEVELS`/`DOCUMENT_SITE_LEVELS`. Add a regression test asserting `isLevelInVocabulary("ARCHIVE_ROLE", "constructor")` (and `"toString"`, `"hasOwnProperty"`) returns `false`, and that a `DatasetAccessGrant` with such a `level` is excluded (not thrown) by `resolveDatasetAccess`.

## Warnings

### WR-01: `canIssueDatasetGrant`'s admin_org path never validates `requestedLevel` against the dataset's vocabulary

**File:** `frontend/src/demo/lib/model.ts:1684`

**Issue:** The delegate path explicitly rejects an out-of-vocabulary `requestedLevel` (model.ts:1707: `if (!isLevelInVocabulary(dataset.dataset_type, requestedLevel)) return false;`), but the admin_org path returns `true` unconditionally with no such check:
```ts
if (actorOrgId === dataset.admin_org_id) return true;
```
`canIssueDatasetGrant("ORG-ADMIN", "admin-p", archiveDs, "TOTALLY_BOGUS_LEVEL", [], [], NOW)` returns `true` today. This is asymmetric with the delegate path and untested (the existing admin-path tests all pass valid levels, e.g. `"FULL_ACCESS"`/`"ADMIN"`). Downstream, a caller that trusts this permission check to also validate the requested level could create a `DatasetAccessGrant` with a garbage `level`, which will later be silently excluded by `resolveDatasetAccess`'s vocabulary filter — not a security bypass, but a data-integrity/UX gap and an inconsistency in the permission contract.

**Fix:**
```ts
if (actorOrgId === dataset.admin_org_id) {
  return isLevelInVocabulary(dataset.dataset_type, requestedLevel);
}
```

### WR-02: `effectiveDatasetClassification`/`deriveBaseClassification` silently return `undefined` when `application_ids` is empty, instead of throwing

**File:** `frontend/src/demo/lib/model.ts:1347-1378` (`effectiveDatasetClassification`), `frontend/src/demo/lib/model.ts:1409-1436` (`deriveBaseClassification`)

**Issue:** Both functions do:
```ts
const classifications = resolvedApps.map((app) => effectiveClassification(app, allPlatforms));
const base = classifications[0];
for (let i = 1; i < classifications.length; i++) { ... }
if (dataset.classification_override !== null) return dataset.classification_override;
return base;
```
If `dataset.application_ids` is `[]`, `resolvedApps`/`classifications` are both `[]`, the divergence loop never runs, and `base` is `classifications[0]` which is `undefined`. The function's declared return type is `Clearance`, but it actually returns `undefined` in this case — a silent type-contract violation. Downstream in `resolveDatasetAccess`, `CLEARANCE_RANK[undefined]` is `undefined`, and `subjectClearanceRank >= undefined` is always `false` in JS, so the practical effect happens to fail closed here — but this is accidental, not designed, and the module's own stated philosophy elsewhere is explicit fail-loud (e.g. "Fail closed: an Application with no resolvable host Platform... never silently treat it as low-classification", `model.ts:843-847`). `validateDatasetNode` is a separate, not-automatically-invoked "seed-data check" (its own docstring says so) — nothing prevents a `DatasetNode` with empty `application_ids` from reaching `effectiveDatasetClassification`/`resolveDatasetAccess` directly.

**Fix:** Throw explicitly when `application_ids` is empty, consistent with the "never silently degrade" pattern used elsewhere in the file:
```ts
if (resolvedApps.length === 0) {
  throw new Error(
    `effectiveDatasetClassification: dataset "${dataset.id}" has no application_ids to derive a classification from`,
  );
}
```
(and the equivalent in `deriveBaseClassification`).

### WR-03: `effectiveDatasetClassification` and `deriveBaseClassification` duplicate ~20 lines of identical resolve-and-assert logic

**File:** `frontend/src/demo/lib/model.ts:1347-1378` and `frontend/src/demo/lib/model.ts:1409-1436`

**Issue:** The two functions are near-identical: resolve every `application_ids` entry against `applications` (throwing on a missing id), map to `effectiveClassification`, assert all resolved classifications match (throwing on divergence). The only difference is that `effectiveDatasetClassification` additionally returns the override when set. This duplication means any future change to the resolve/assert logic (error message wording, divergence rule, etc.) must be made in two places, and it has already partially drifted (error message prefixes differ: `"effectiveDatasetClassification: ..."` vs `"deriveBaseClassification: ..."`).

**Fix:** Extract the shared resolve-and-assert step into a private helper, e.g.:
```ts
function resolveDatasetBaseClassification(
  dataset: DatasetNode,
  applications: ApplicationNode[],
  allPlatforms: PlatformNode[],
): Clearance {
  // shared body currently duplicated across both functions
}
```
and have both `effectiveDatasetClassification` and `deriveBaseClassification` (or better, delete `deriveBaseClassification` and have `validateDatasetClassification` call the shared helper directly) call it.

## Info

### IN-01: `DatasetAccessResult.reason` is declared but never populated by `resolveDatasetAccess`

**File:** `frontend/src/demo/lib/model.ts:1493-1498` (interface), `frontend/src/demo/lib/model.ts:1640-1644` (return site)

**Issue:** `DatasetAccessResult` declares an optional `reason?: string` field, mirroring `ResourceAccessResult.reason` (which `resolveResourceAccess` does populate on its `NO_ACTIVE_POLICY` fail-closed path, `model.ts:1085`). `resolveDatasetAccess`, however, never sets `reason` on any return path — it always returns `{ allow, visible, gates }`. This looks like a copy-paste leftover from the `ResourceAccessResult` shape and is currently dead API surface that could mislead a future caller into relying on a field that is never populated.

**Fix:** Either populate `reason` for the resolver's throw-free deny paths (e.g. a compact summary of which gate failed) for parity with `ResourceAccessResult`, or drop the unused field from `DatasetAccessResult` until there's an actual use for it.

---

_Reviewed: 2026-07-04T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
