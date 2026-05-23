---
phase: 05-zone-model-access-rules
fixed_at: 2026-05-23T16:51:00Z
review_path: .planning/phases/05-zone-model-access-rules/05-REVIEW.md
iteration: 1
findings_in_scope: 5
fixed: 5
skipped: 0
status: all_fixed
---

# Phase 05: Code Review Fix Log

**Fixed at:** 2026-05-23T16:51:00Z
**Source review:** .planning/phases/05-zone-model-access-rules/05-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 5 (1 Critical, 4 Warning)
- Fixed: 5
- Skipped: 0

## Fixed Issues

### CR-01: PHYSICAL domain tier check silently passes for any non-null auth entry

**Files modified:** `frontend/src/demo/lib/model.ts`
**Commit:** 7599246
**Applied fix:** Restored `PHYSICAL: ["LOBBY", "RESTRICTED_AREA", "SECURE_VAULT"]` to the `TIERS`
constant. Without this entry `tierRank("PHYSICAL", any)` returned `-1` for both held and required
tiers, making `-1 >= -1` always true — any non-null PHYSICAL domainAuth value passed the tier check
regardless of the actual tier level. The restored ladder gives `tierRank` correct discriminating
index values so LOBBY (0) < RESTRICTED_AREA (1) < SECURE_VAULT (2) comparisons evaluate accurately.
The updated comment clarifies that zone-type rules and resource-level ABAC are independent concerns.

### WR-01: getDescendants and getAncestors have no cycle detection

**Files modified:** `frontend/src/demo/lib/model.ts`
**Commit:** 3b72966
**Applied fix:** Added a `visited: Set<string>` to both traversal helpers. `getAncestors` breaks
out of its while loop if the current node id is already in visited. `getDescendants` skips already-
visited nodes with `continue` before pushing children to the BFS queue. No behaviour change on
well-formed acyclic zone trees.

### WR-02: failed[] contract diverges between evaluate() and evaluateWithPolicy()

**Files modified:** `frontend/src/demo/lib/policy.ts`
**Commit:** 02d4363
**Applied fix:** Replaced the spread of `overrides.map(r => r.name)` into `failed[]` with
`rules.filter(r => !r.pass).map(r => r.name)` — base rules only, matching the documented contract
in `Decision` (abac.ts:31) and the implementation in `evaluate()`. Override deny reasons remain
accessible via `d.overrides`. No test assertions were broken by this change.

### WR-03: ZoneAccessReason union contains dead members ESCORT_REQUIRED and ENTRY_LOG_REQUIRED

**Files modified:** `frontend/src/demo/lib/model.ts`
**Commit:** fb31646
**Applied fix:** Removed both dead union members (Option A from review). No evaluator function
returns them: `evaluateRestrictedAccess` returns `GRANT_FOUND` on the escort path, and
`evaluateSecuredAccess` returns `GRANT_FOUND` on all allow paths. Escort and entry-log semantics
are carried in the `detail` string. Added a comment noting the removal rationale. Grep confirmed
no consumers reference these values outside model.ts itself.

### WR-04: Redundant as UnitId cast in evaluateWithPolicy

**Files modified:** `frontend/src/demo/lib/policy.ts`
**Commit:** b20a6e6
**Applied fix:** Removed the `as UnitId` cast from `hasAgreement(principal.entity as UnitId, ...)`.
`principal.entity` is already typed as `UnitId` in the `Principal` interface (abac.ts:35). Also
removed the now-unused `UnitId` type from the import line to avoid a `noUnusedLocals` error.

## Verification

- TypeScript (`npx tsc -b --noEmit`): no errors in modified files. Pre-existing errors in
  `routeTree.gen` (generated file, not committed) are unrelated to these changes.
- Vitest (`npx vitest run src/demo/lib/`): 62/62 tests pass across all 5 demo lib test files.

---

_Fixed: 2026-05-23T16:51:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
