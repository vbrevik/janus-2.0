---
plan: 13-01
wave: 1
phase: 13-dataset-model-access-resolver
type: execute
date: 2026-07-04
status: complete
---

# Plan 13-01 Summary: Dataset Model & Access Resolver — Foundation

All 3 tasks done, 0 test failures, 0 new TypeScript errors.

## Tasks completed

1. **Task 1: Dataset entity types and per-type level/containment vocabulary** — `DatasetType`, `MailboxLevel`, `DocumentSiteLevel`, `ArchiveRole` types; `MAILBOX_LEVELS`, `DOCUMENT_SITE_LEVELS`, `ARCHIVE_ROLE_CONTAINS` constants; `archiveRoleCovers`, `isLevelInVocabulary`, `assertNeverDatasetType`, `validateDatasetNode` functions; `DatasetNode`, `DatasetAccessGrant`, `DatasetAccessDelegate` interfaces. 15 describe blocks / 25 it cases.

2. **Task 2: Classification derive-with-override + validator** — `effectiveDatasetClassification` (assert-all-share-then-fail-loud, override-wins when set, throw on missing/divergent Applications) and `validateDatasetClassification` (rejects strictly-lower overrides). 8 describe blocks / 9 it cases.

3. **Task 3: Effective-access aggregation functions** — `effectiveRankedLevel` (rank-max for MAILBOX/DOCUMENT_SITE) and `effectiveArchiveCoverage` (containment-union for ARCHIVE_ROLE). 3 describe blocks / 11 it cases.

## Artifacts

- `frontend/src/demo/lib/model.ts` — new `// --- Phase 13: Dataset model & access resolver (v2.3) ---` section appended after line 1183 (~280 lines of new code)
- `frontend/src/demo/lib/dataset.test.ts` — new sibling test file, inline fixtures only (D3-13 pattern), 45 tests passing

## Verification

- `npx vitest run src/demo/lib/dataset.test.ts` — PASS (45) FAIL (0)
- `npm run build` — zero TypeScript errors
- `git diff --stat HEAD -- frontend/src/demo/lib/model.ts frontend/src/demo/lib/dataset.test.ts` — only these 2 files modified (no other files outside scope)

## Requirements covered

DATA-01 (validateDatasetNode rejects empty application_ids), DATA-02 (per-type vocabularies), DATA-03 (cross-type comparison not representable), DATA-04 (fixed admin_org_id/asset_owner_org_id), DATA-05 (effectiveDatasetClassification with override), DATA-GRANT-01/02/03 (effectiveRankedLevel rank-max, effectiveArchiveCoverage containment-union).

## Key design decisions

- `ArchiveRole` vocabulary uses containment map, not rank table (ARCHIVE_ROLE is role-shaped, not level-shaped)
- `effectiveDatasetClassification` uses assert-all-share-then-fail-loud (never silently picks highest-wins)
- `effectiveRankedLevel` and `effectiveArchiveCoverage` take ALREADY-window-filtered inputs (caller pre-filters via `isWindowActive`)
- `DatasetAccessGrant.level` kept open (`string`) — per-type vocabulary validation at resolution time
