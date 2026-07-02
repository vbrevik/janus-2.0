---
phase: 06-grants-resolution-delegation
fixed_at: 2026-05-23T19:35:00Z
review_path: .planning/phases/06-grants-resolution-delegation/06-REVIEW.md
iteration: 1
findings_in_scope: 5
fixed: 5
skipped: 0
status: all_fixed
---

# Phase 6: Code Review Fix Report

**Fixed at:** 2026-05-23T19:35:00Z
**Source review:** .planning/phases/06-grants-resolution-delegation/06-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 5
- Fixed: 5
- Skipped: 0

## Fixed Issues

### CR-01: `getAncestors` uses ID-based iteration with destination-first cycle guard

**Files modified:** `frontend/src/demo/lib/model.ts`
**Commit:** c489d9e
**Applied fix:** Replaced the node-based `while (current?.parent_id != null)` loop with an ID-based loop (`let currentId = nodeMap.get(zoneId)?.parent_id`). The cycle guard now checks `visited.has(currentId)` before resolving the node — preventing a self-referential zone from ever being pushed to `ancestors`. The old guard checked `current.id` (the departing node) rather than the arriving ID, allowing one extra push under a self-loop.

---

### CR-02: Two mandatory GRANT-02 and GRANT-03 acceptance criteria tests added

**Files modified:** `frontend/src/demo/lib/physical-access.test.ts`
**Commit:** 36d8ea3
**Applied fix:** Added two tests inside the `describe("resolveGrant")` block:
1. `GRANT-02`: inline `Z_CONTROLLED_CHILD` fixture (CONTROLLED, parent_id="z-site", requires_explicit_auth=false) with ancestor grant `G_SITE_CTRL` on z-site — asserts `resolveGrant` returns non-null and `grant.id === "g-site-ctrl"`.
2. `GRANT-03`: inline `Z_CONTROLLED_EXPLICIT` fixture (CONTROLLED, parent_id="z-site", requires_explicit_auth=true) with same ancestor grant — asserts `resolveGrant` returns null. Test count advanced from 60 to 62; all pass.

---

### WR-01: Exhaustive `switch` with `assertNever` in `resolveZoneAccess`

**Files modified:** `frontend/src/demo/lib/model.ts`
**Commit:** aaedf2f
**Applied fix:** Added module-private `function assertNever(x: never): never` helper before `resolveZoneAccess`. Replaced the if/else-if/bare-return dispatch (`if (zone.zone_type === "CONTROLLED")` … `// Default: SECURED`) with an exhaustive `switch (zone.zone_type)` covering all three cases plus a `default: return assertNever(zone.zone_type)` branch. TypeScript will now produce a compile error if `ZoneType` grows without updating the switch.

---

### WR-02: D-03 inline comment at `evaluateSecuredAccess` call site and parameter annotation

**Files modified:** `frontend/src/demo/lib/model.ts`
**Commit:** aaedf2f (applied in same edit as WR-01)
**Applied fix:** Added inline comment `// isEscorted is annotation-only in SECURED zones (D-03); does not affect allow/deny` on the `case "SECURED":` arm. Added inline comment `// unlocks RESTRICTED; annotation-only in SECURED (D-03)` on the `hasValidEscort: boolean` parameter of `resolveZoneAccess`. Parameter was not renamed — only annotated as requested.

---

### WR-03: Ghost-zone existence check with `console.warn` in `getDescendants`

**Files modified:** `frontend/src/demo/lib/model.ts`
**Commit:** dc09151
**Applied fix:** Added early existence check at the top of `getDescendants`: `if (!allZones.some((z) => z.id === zoneId))` — emits `console.warn` guarded by `process.env.NODE_ENV !== 'production'` and returns `[]`. This surfaces referential integrity errors visibly in development without changing the function's return type or breaking existing callers.

---

_Fixed: 2026-05-23T19:35:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
