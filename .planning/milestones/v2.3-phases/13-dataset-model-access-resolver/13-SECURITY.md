---
phase: 13-dataset-model-access-resolver
audited: 2026-07-04
asvs_level: 1
block_on: high
threats_total: 7
threats_closed: 7
threats_open: 0
---

# Phase 13: Security Audit Report

**Phase:** 13 — Dataset Model & Access Resolver
**Threats Closed:** 7/7
**ASVS Level:** 1

Verification method per disposition: `mitigate` → grep/read for the cited mitigation pattern in the cited files (ASVS L1: presence-level). `accept` → verify a documented risk-acceptance entry exists (SPEC.md Prohibitions row, since no prior SECURITY.md existed for this phase). Implementation files were read-only for this audit; nothing was patched.

All 7 threats registered in 13-01-PLAN.md / 13-02-PLAN.md are CLOSED. Full vitest run: `npx vitest run src/demo/lib/dataset.test.ts` → PASS (72) FAIL (0).

## Threat Verification

| Threat ID | Category | Severity | Disposition | Status | Evidence |
|-----------|----------|----------|-------------|--------|----------|
| T-13-02 | Tampering / Elevation of Privilege | high | mitigate | CLOSED | `frontend/src/demo/lib/model.ts:1377-1394` (`validateDatasetClassification` rejects override strictly below base via `CLEARANCE_RANK[override] < CLEARANCE_RANK[base]`), `model.ts:1351-1365` (`effectiveDatasetClassification` returns override verbatim, never clamps). Tests: `dataset.test.ts:355` (null-override passes), `:369` (equal-override passes), `:380-383` (strictly-lower override rejected, `err` non-null), `:401-408` (empty `application_ids` now throws — WR-02 regression, not silent `undefined`). |
| T-13-04 | Tampering | medium | mitigate | CLOSED — **given particular scrutiny per audit instructions** | Root cause fixed: `model.ts:1263-1281` (`isLevelInVocabulary`) — ARCHIVE_ROLE branch now uses `Object.prototype.hasOwnProperty.call(ARCHIVE_ROLE_CONTAINS, level)` (line 1277), not the prototype-walking `in` operator. Dispatch-before-touch verified structurally at both call sites that reach `ARCHIVE_ROLE_CONTAINS`/`effectiveArchiveCoverage` with untrusted strings: `resolveDatasetAccess`'s gate-3 `filtered` array is built with `isLevelInVocabulary(...)` as a filter predicate (`model.ts:1577-1583`) *before* `.map(g => g.level as ArchiveRole)` is passed to `effectiveArchiveCoverage` (line 1587-1589); `canIssueDatasetGrant`'s `ownGrants` filter applies the same `isLevelInVocabulary` predicate (`model.ts:1706-1712`) before casting to `ArchiveRole` (line 1723). `requiredLevel`/`requestedLevel` are independently vocabulary-checked before use (lines 1534, 1716). No comparator anywhere touches a bare level value pre-dispatch — the plan's stated mitigation ("every comparator dispatches on dataset_type before touching a bare level value") holds for the current code, not just the isolated `isLevelInVocabulary` fix. Regression tests confirmed current (not just claimed by commit message): `dataset.test.ts:183-191` asserts `isLevelInVocabulary("ARCHIVE_ROLE", X)` is `false` for `"constructor"`, `"toString"`, `"hasOwnProperty"`, AND `"__proto__"` (a broader set than the review's own fix example, which only named the first three) — read directly, not inferred. `dataset.test.ts:916-952` ("Object.prototype-key grant level is excluded, not thrown (CR-01 regression)") constructs an actual `DatasetAccessGrant` with `level: "constructor"` on an ARCHIVE_ROLE dataset, asserts `resolveDatasetAccess(...)` does `.not.toThrow()`, then asserts `result.allow === false` and the `DATASET_GRANT` gate's `pass === false` — proving the malformed grant is excluded, not merely that the vocabulary function returns false in isolation. Ran the actual test file (`npx vitest run src/demo/lib/dataset.test.ts` → PASS 72/72) to confirm this is not just present in source but currently green. |
| T-13-07 | Information Disclosure | medium | mitigate | CLOSED | `frontend/src/demo/lib/model.ts:1410-1429` (`resolveDatasetBaseClassification`, shared by both `effectiveDatasetClassification` and `validateDatasetClassification` per the WR-03 refactor) throws `"...application \"{appId}\" not found for dataset \"{id}\""` on unresolved `application_id`, and separately throws on empty `application_ids` (WR-02 fix) rather than falling through to a permissive default. Tests: `dataset.test.ts:323-331` (`throws when a referenced application_id does not exist`, asserts `/not found/i`), `:727-744` (same throw behavior exercised through `resolveDatasetAccess`'s own application resolution at `model.ts:1544-1551`). |
| T-13-01 | Elevation of Privilege | high | mitigate | CLOSED | `frontend/src/demo/lib/model.ts:1679-1742` (`canIssueDatasetGrant`) delegate path (lines 1695-1739) computes `ownGrants` — the delegate's OWN `DatasetAccessGrant`s on the exact dataset (`model.ts:1706-1712`) — and compares `requestedLevel` against `effectiveArchiveCoverage(ownGrants...)` (ARCHIVE_ROLE, line 1721-1725) or the delegate's own best rank via `effectiveRankedLevel(levels, ownGrants...)` (MAILBOX/DOCUMENT_SITE, line 1727-1739). The dataset's max/admin level is never consulted on this path. Test: `dataset.test.ts:1040-1071` (`delegate holding ONLY CASE_HANDLER cannot issue ADMIN — no escalation, including to self`). |
| T-13-03 | Elevation of Privilege | high | mitigate | CLOSED | `frontend/src/demo/lib/model.ts:1544-1561` (Application-grant OR-gate, `appGrantPass`) is computed and gated inside `resolveDatasetAccess` itself, evaluated against `now` via `isWindowActive` at line 1556 — inside the same function/gate chain as gate 3 (`datasetGrantPass`, lines 1573-1617), not checked only at grant-issue time. Test: `dataset.test.ts:560-581` (`denies when the app grant expired before now, even with a still-active dataset grant`) — asserts the `APP_GRANT_OR` gate is the sole failing gate while a nominally-active `DatasetAccessGrant` exists. |
| T-13-05 | Elevation of Privilege | high | mitigate | CLOSED | `frontend/src/demo/lib/model.ts:1646-1649` — `visible: appGrantPass` (gate 2 alone); grep of the entire `resolveDatasetAccess` function body (`model.ts:1521-1650`) confirms no reference to `admin_org_id`, `DatasetAccessDelegate`, or any delegate/admin branch inside the visibility computation. Test: `dataset.test.ts:839` (`visible-allow-independence`) plus the orphan case at `:860-873` (`DatasetAccessGrant` held directly with no Application grant → `visible: false`, no exemption). |
| T-13-06 | Elevation of Privilege (delegate/dataset-id confusion) | low | accept | CLOSED (documented risk acceptance) | Disposition `accept` per the plan-time register; verified the acceptance is actually documented (not just asserted in the register), per `.planning/phases/13-dataset-model-access-resolver/13-SPEC.md:134`: "Dropped as canon (owned by code-review/OWASP, not minted here): dataset-id spoofing/IDOR-shaped attacks on the delegate check; PII in audit logs" — corroborated by the prohibition-probe trace at SPEC.md:160 (3 candidates kept as test-tier prohibitions, 2 dropped as canon incl. this one). No request-authentication boundary exists in this pure demo/mock milestone (confirmed: `canIssueDatasetGrant`/`resolveDatasetAccess` take `subject`/`actorPersonId` as trusted string parameters with no caller-identity verification layer anywhere in `model.ts`). Below `block_on: high` threshold in any case (severity: low). |

### Note on severity-filtered gate

`block_on: high`. All threats above `high`/`critical` (T-13-02, T-13-01, T-13-03, T-13-05) are CLOSED. T-13-04/T-13-07 (medium) and T-13-06 (low, accepted) are also CLOSED. `threats_open` (severity ≥ block_on, i.e. high/critical only) = **0**.

### Unregistered Flags

None. 13-02-SUMMARY.md's `## Threat Flags` section explicitly states "None — no new surface beyond the plan's threat model" and this audit found no additional attack surface in `model.ts`'s Phase 13 section (lines ~1183-1745) beyond what the 7 registered threats already cover.

SECURITY.md: `.planning/phases/13-dataset-model-access-resolver/SECURITY.md`
