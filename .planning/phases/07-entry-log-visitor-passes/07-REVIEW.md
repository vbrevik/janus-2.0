---
phase: 07-entry-log-visitor-passes
reviewed: 2026-05-23T19:00:56Z
depth: standard
files_reviewed: 2
files_reviewed_list:
  - frontend/src/demo/lib/model.ts
  - frontend/src/demo/lib/physical-access.test.ts
findings:
  critical: 0
  warning: 3
  info: 2
  total: 5
status: issues_found
---

# Phase 7: Code Review Report

**Reviewed:** 2026-05-23T19:00:56Z
**Depth:** standard
**Files Reviewed:** 2
**Status:** issues_found

## Summary

Phase 7 adds `ZoneEntryLog`, `ZoneVisitorPass`, `validateEntryLog`, `validateSecuredZoneEntry`, and `getActiveVisitorPasses` to `model.ts`, and extends `physical-access.test.ts` with 19 new tests (74 total). All 74 tests pass. The Phase 7 additions are spec-conformant and the logic is correct. No security vulnerabilities, no data-loss risks, no crashes.

Three warnings surface: a logic gap in `validateSecuredZoneEntry` that allows a log entry for the wrong zone to satisfy a SECURED zone check; a missing temporal invariant in `ZoneVisitorPass`; and a misleading test description in the existing (Phase 6) `resolveGrant` suite that ships alongside the new Phase 7 tests. Two info items cover test coverage gaps.

## Narrative Findings (AI reviewer)

## Warnings

### WR-01: `validateSecuredZoneEntry` does not verify that the entry belongs to the target zone

**File:** `frontend/src/demo/lib/model.ts:367-374`
**Issue:** The function accepts any non-null `ZoneEntryLog` as proof of logging for the given zone, without checking `entry.zone_id === zone.id`. A caller that accidentally passes a log entry for a different SECURED zone (e.g., building A's log for room B's check) receives `null` (valid) even though room B has no log entry. Since SECURED zone mandatory logging (`LOG-03`) is the primary enforcement mechanism, a silent bypass is a correctness risk.

The spec acceptance criterion states "returns null for SECURED zone with a non-null entry" without specifying zone_id matching, so this is technically spec-conformant — but the spec intent ("a log entry exists for this access event") implies zone-id matching should be enforced.

**Fix:**
```typescript
export function validateSecuredZoneEntry(
  zone: ZoneNode,
  entry: ZoneEntryLog | null,
): string | null {
  if (zone.zone_type !== "SECURED") return null;
  if (entry !== null && entry.zone_id === zone.id) return null;
  return "SECURED zone requires a ZoneEntryLog entry";
}
```

---

### WR-02: `ZoneVisitorPass` has no validation that `valid_from` precedes `valid_until`

**File:** `frontend/src/demo/lib/model.ts:346-353`
**Issue:** The `ZoneVisitorPass` interface requires both `valid_from: Date` and `valid_until: Date` (non-nullable per spec), but no validator enforces `valid_from < valid_until`. A pass constructed with `valid_until` before `valid_from` is structurally valid but semantically impossible; `getActiveVisitorPasses` will silently never return it. There is no companion `validateVisitorPass` function to catch this at construction time, which is asymmetric with `validateEntryLog` covering the analogous constraint for `ZoneEntryLog`.

**Fix:** Add a validator (consistent with the `string | null` pattern already used in this module):
```typescript
// VISIT-02: validateVisitorPass — temporal invariant check
export function validateVisitorPass(pass: ZoneVisitorPass): string | null {
  if (pass.valid_until < pass.valid_from) {
    return "ZoneVisitorPass valid_until must not precede valid_from";
  }
  return null;
}
```

---

### WR-03: Misleading test title at line 421 — title claims a success case, body asserts null

**File:** `frontend/src/demo/lib/physical-access.test.ts:421-432`
**Issue:** The test is titled `"returns ancestor grant when zone_type matches (SECURED ancestor for SECURED zone)"` and the inline comment says `"G_ANCESTOR_BLDG1 is on z-bldg1 (SECURED)"` — but the actual call passes `[G_ANCESTOR_SITE]` (a grant on `z-site`, which is `CONTROLLED`, not `SECURED`) against target `Z_BUILDING1` (which is `SECURED` with `requires_explicit_auth: true`). The expectation `expect(grant).toBeNull()` confirms this tests a *failure* case (zone_type mismatch), not the success case the title describes.

The correct success test for "ancestor grant with matching zone_type" is the subsequent test at line 433. The test at 421 is actually testing the CONTROLLED-site-grant-denied-for-SECURED-building scenario, which is already covered more clearly at line 456.

This defect means a future reader trying to understand GRANT-01 (ancestor matching) logic from the test suite will draw the opposite conclusion from the title.

**Fix:** Rename the test to match what it actually tests:
```typescript
it("returns null when only ancestor is CONTROLLED but target is SECURED (type mismatch — requires_explicit_auth irrelevant)", () => {
  // G_ANCESTOR_SITE is on z-site (CONTROLLED); Z_BUILDING1 is SECURED → zone_type mismatch → null
  // Also blocked by requires_explicit_auth: true on Z_BUILDING1 (ancestor walk skipped entirely)
  const grant = resolveGrant(
    "p-1",
    Z_BUILDING1,
    ALL_ZONES,
    [G_ANCESTOR_SITE],
    NOW,
  );
  expect(grant).toBeNull();
});
```

---

## Info

### IN-01: `getActiveVisitorPasses` has no boundary-exact test for `valid_from === now`

**File:** `frontend/src/demo/lib/physical-access.test.ts:940-968`
**Issue:** `isGrantActive` and `isDelegateActive` each include an explicit boundary test for `valid_until === now` (inclusive), but `getActiveVisitorPasses` has no equivalent test for `valid_from === now`. The logic is symmetric (`valid_from <= now`) and is correct, but the gap leaves the lower-bound inclusive contract unverified for visitor passes.

**Fix:** Add one boundary test inside `describe("getActiveVisitorPasses")`:
```typescript
it("includes pass whose valid_from equals now (lower boundary inclusive)", () => {
  const PASS_AT_BOUNDARY: ZoneVisitorPass = {
    id: "pass-boundary",
    entry_log_id: "log-b",
    escort_person_id: "p-1",
    zone_id: "z-room1",
    valid_from: NOW,                             // exactly at NOW
    valid_until: new Date("2026-01-15T18:00:00Z"),
  };
  const result = getActiveVisitorPasses("z-room1", [PASS_AT_BOUNDARY], NOW);
  expect(result).toHaveLength(1);
});
```

---

### IN-02: `getAncestors` silently returns `[]` for an unknown `zoneId`; `getDescendants` warns

**File:** `frontend/src/demo/lib/model.ts:158-172` and `176-199`
**Issue:** `getDescendants` checks for ghost zone IDs with `allZones.some(z => z.id === zoneId)` and emits `console.warn` in DEV. `getAncestors` has no such check — when `zoneId` is not in `allZones`, `nodeMap.get(zoneId)?.parent_id` returns `undefined`, the `while` loop condition `undefined != null` is falsy (JS loose equality), and the function silently returns `[]`. The silent path obscures data integrity errors at the call site.

The ghost-zone path in `getDescendants` is also untested (no test passes an unknown zone ID).

**Fix (model.ts):** Mirror the same guard in `getAncestors`:
```typescript
export function getAncestors(zoneId: string, allZones: ZoneNode[]): ZoneNode[] {
  const nodeMap = new Map(allZones.map((z) => [z.id, z]));
  if (!nodeMap.has(zoneId)) {
    if (import.meta.env.DEV) {
      console.warn(`getAncestors: zone "${zoneId}" not found in allZones`);
    }
    return [];
  }
  // ... rest unchanged
```

**Fix (test):** Add a test for the ghost-zone path in `getDescendants`:
```typescript
it("returns empty array for unknown zone id (ghost zone)", () => {
  const descendants = getDescendants("z-does-not-exist", ALL_ZONES);
  expect(descendants).toHaveLength(0);
});
```

---

_Reviewed: 2026-05-23T19:00:56Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
