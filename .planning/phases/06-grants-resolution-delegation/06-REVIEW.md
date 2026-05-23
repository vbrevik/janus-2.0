---
phase: 06-grants-resolution-delegation
reviewed: 2026-05-23T17:22:17Z
depth: standard
files_reviewed: 2
files_reviewed_list:
  - frontend/src/demo/lib/model.ts
  - frontend/src/demo/lib/physical-access.test.ts
findings:
  critical: 2
  warning: 3
  info: 2
  total: 7
status: issues_found
---

# Phase 6: Code Review Report

**Reviewed:** 2026-05-23T17:22:17Z
**Depth:** standard
**Files Reviewed:** 2
**Status:** issues_found

## Summary

Reviewed `model.ts` (types + pure functions for grant resolution and delegation) and `physical-access.test.ts` (60 Vitest unit tests). All 60 tests pass and `tsc -b --noEmit` exits clean. The implementation is generally well-structured, but two spec acceptance criteria are entirely unmet by the tests (the two mandatory positive-path cases from GRANT-02 and GRANT-03), the cycle guard in `getAncestors` contains a logic flaw that allows one extra iteration under a self-referential parent, the `resolveZoneAccess` default branch silently absorbs any future `ZoneType` value as `SECURED`, and the `resolveZoneAccess` function passes `hasValidEscort` (a RESTRICTED-zone concept) through to `evaluateSecuredAccess` where the spec requires it to be renamed `isEscorted` and treated as annotation-only.

---

## Critical Issues

### CR-01: `getAncestors` cycle guard checks the current node too late — one extra push under self-loop

**File:** `frontend/src/demo/lib/model.ts:163-169`

**Issue:** The cycle guard reads `visited.has(current.id)` and then `visited.add(current.id)` *before* resolving the parent, but the `visited` set tracks the node being *departed from*, not the node being *arrived at*. If a zone has `parent_id === id` (self-referential row, possible in dirty seed data), the loop condition `current?.parent_id != null` passes, the guard fires on the *next* iteration, but in the *current* iteration `current` is the self-referential node — it gets added to `ancestors` once before the guard can stop it on the re-entry. The parent is fetched (`nodeMap.get(current.parent_id)` returns the same node again), pushed to `ancestors`, and only then does the guard break. The result is the self-referential node appears once in the output, silently producing an incorrect ancestor chain instead of an empty one.

The root cause is that the guard is placed after the `while` condition resolves the *next* node but before any work — however, `current` at that point is still the *previous* node (the one already visited), not the newly fetched parent. The parent is fetched on line 166 and pushed on line 168, but the guard only checks `current` (not the parent), so the parent is pushed before it can be checked.

**Fix:**
```typescript
export function getAncestors(zoneId: string, allZones: ZoneNode[]): ZoneNode[] {
  const nodeMap = new Map(allZones.map((z) => [z.id, z]));
  const ancestors: ZoneNode[] = [];
  const visited = new Set<string>();
  let currentId: string | null | undefined = nodeMap.get(zoneId)?.parent_id;
  while (currentId != null) {
    if (visited.has(currentId)) break; // cycle guard on the node being arrived at
    visited.add(currentId);
    const node = nodeMap.get(currentId);
    if (!node) break;
    ancestors.push(node);
    currentId = node.parent_id;
  }
  return ancestors;
}
```

This guard checks the *destination* ID before resolving it, preventing any cyclic node from ever appearing in the output.

---

### CR-02: Two mandatory GRANT-02 and GRANT-03 acceptance criteria have no test coverage

**File:** `frontend/src/demo/lib/physical-access.test.ts`

**Issue:** The spec (`06-SPEC.md`) defines two explicit acceptance criteria that have zero corresponding tests:

**GRANT-02 positive path (spec §3, acceptance criteria §6):**
> "Test with a CONTROLLED parent grant and a CONTROLLED child zone returns GRANT_FOUND"

No test covers this scenario. The `resolveGrant` suite tests CONTROLLED-to-SECURED (null) and CONTROLLED-to-RESTRICTED (null), but never CONTROLLED-parent-grant → CONTROLLED-child-zone → expects the grant to be inherited. This is the only test that proves zone_type-matching inheritance actually works in the affirmative; without it, a broken implementation that returns `null` for all ancestor lookups would still pass all 60 current tests.

**GRANT-03 positive path (spec §4, acceptance criteria):**
> "Test where person has a CONTROLLED parent grant but target zone is CONTROLLED + `requires_explicit_auth: true` returns NO_GRANT"

The test at line 461 correctly covers `requires_explicit_auth: true` blocking a SECURED ancestor, but there is no test where both the zone and the ancestor grant are CONTROLLED and `requires_explicit_auth` is the sole blocker. This is the case that distinguishes GRANT-03 from the zone_type mismatch rule (GRANT-02) — the two rules can be independently broken without triggering any existing test.

**Fix:** Add the two missing tests:

```typescript
it("GRANT-02: returns ancestor grant when zone_type matches — CONTROLLED ancestor for CONTROLLED child", () => {
  // Direct child of Z_SITE (CONTROLLED); no requires_explicit_auth
  const Z_CONTROLLED_CHILD: ZoneNode = {
    id: "z-controlled-child",
    name: "Controlled Child",
    level: "BUILDING",
    zone_type: "CONTROLLED",
    parent_id: "z-site",
    admin_org_id: "org-a",
    asset_owner_org_id: "org-a",
    requires_explicit_auth: false,
  };
  const allZonesExt = [...ALL_ZONES, Z_CONTROLLED_CHILD];
  const G_SITE_CTRL: PhysicalAccessGrant = {
    id: "g-site-ctrl",
    person_id: "p-1",
    zone_id: "z-site",
    valid_from: null,
    valid_until: null,
  };
  const grant = resolveGrant("p-1", Z_CONTROLLED_CHILD, allZonesExt, [G_SITE_CTRL], NOW);
  expect(grant).not.toBeNull();
  expect(grant?.id).toBe("g-site-ctrl");
});

it("GRANT-03: returns null for CONTROLLED zone with matching ancestor when requires_explicit_auth=true", () => {
  const Z_CONTROLLED_EXPLICIT: ZoneNode = {
    id: "z-controlled-explicit",
    name: "Controlled + Explicit Auth",
    level: "BUILDING",
    zone_type: "CONTROLLED",
    parent_id: "z-site",
    admin_org_id: "org-a",
    asset_owner_org_id: "org-a",
    requires_explicit_auth: true,
  };
  const allZonesExt = [...ALL_ZONES, Z_CONTROLLED_EXPLICIT];
  const G_SITE_CTRL: PhysicalAccessGrant = {
    id: "g-site-ctrl2",
    person_id: "p-1",
    zone_id: "z-site",
    valid_from: null,
    valid_until: null,
  };
  const grant = resolveGrant("p-1", Z_CONTROLLED_EXPLICIT, allZonesExt, [G_SITE_CTRL], NOW);
  expect(grant).toBeNull();
});
```

---

## Warnings

### WR-01: `resolveZoneAccess` default branch silently treats any unknown `ZoneType` as `SECURED`

**File:** `frontend/src/demo/lib/model.ts:290-291`

**Issue:** The dispatch in `resolveZoneAccess` has an explicit `if` for `CONTROLLED`, an explicit `if` for `RESTRICTED`, and then a bare `return evaluateSecuredAccess(...)` as the "Default: SECURED" fallback. `ZoneType` is currently a 3-member union, but if a fourth zone type is ever added (e.g., `"PUBLIC"`) the new type will silently evaluate under SECURED rules — which include a hard SECRET clearance requirement. Access would be denied to every subject who does not have SECRET clearance, which is both incorrect behavior and a silent security regression (over-restriction is still a security defect in an access control system).

TypeScript will not flag this because the function parameter is typed `ZoneNode` and `zone.zone_type` is `ZoneType`; there is no exhaustive check.

**Fix:** Replace the bare fallback with an exhaustive switch or explicit else with a TypeScript exhaustiveness assertion:

```typescript
// Exhaustive helper — TS will error if ZoneType grows and the switch isn't updated
function assertNever(x: never): never {
  throw new Error(`Unhandled zone_type: ${String(x)}`);
}

// In resolveZoneAccess, replace the final return:
switch (zone.zone_type) {
  case "CONTROLLED":
    return evaluateControlledAccess(true);
  case "RESTRICTED":
    return evaluateRestrictedAccess(true, clearance, hasValidEscort);
  case "SECURED":
    return evaluateSecuredAccess(true, clearance, hasValidEscort);
  default:
    return assertNever(zone.zone_type);
}
```

---

### WR-02: `resolveZoneAccess` passes `hasValidEscort` to `evaluateSecuredAccess` as `isEscorted`, conflating two semantically different parameters

**File:** `frontend/src/demo/lib/model.ts:291`

**Issue:** The `resolveZoneAccess` signature exposes `hasValidEscort: boolean` (a RESTRICTED-zone concept where a valid escort *substitutes* for clearance). This value is passed directly to `evaluateSecuredAccess(true, clearance, hasValidEscort)` as its third parameter `isEscorted` — which the spec and comments explicitly state is annotation-only for SECURED zones (D-03: "escort does not substitute for clearance in SECURED zones"). The two booleans are semantically different: `hasValidEscort` at the entry-point level implies substitution semantics; `isEscorted` at the `evaluateSecuredAccess` level implies annotation-only semantics.

The current behavior is technically correct because `evaluateSecuredAccess` ignores `isEscorted` for the allow/deny decision, but the code communicates the wrong intent to callers of `resolveZoneAccess`. A caller reading the signature would reasonably conclude that passing `hasValidEscort: true` unlocks SECURED zones, which it does not.

**Fix:** Rename the parameter in `resolveZoneAccess` to make the dual-use semantics explicit at the call site:

```typescript
export function resolveZoneAccess(
  personId: string,
  zone: ZoneNode,
  clearance: Clearance,
  hasValidEscort: boolean, // unlocks RESTRICTED; annotation-only in SECURED (D-03)
  allZones: ZoneNode[],
  allGrants: PhysicalAccessGrant[],
  now: Date,
): ZoneAccessResult {
  // ...
  if (zone.zone_type === "SECURED") {
    // isEscorted is annotation-only in SECURED zones (D-03); does not affect allow/deny
    return evaluateSecuredAccess(true, clearance, /* isEscorted */ hasValidEscort);
  }
```

The inline comment at the call site makes the D-03 constraint visible to future readers without requiring them to cross-reference the spec.

---

### WR-03: `getDescendants` BFS includes the start node in the `visited` set but not the `result` array — inconsistency is not tested for a non-existent start zone

**File:** `frontend/src/demo/lib/model.ts:183-191`

**Issue:** `getDescendants("non-existent-id", allZones)` returns an empty array, which is correct because `allZones.filter(z => z.parent_id === "non-existent-id")` will find no children. However, the `visited` set is seeded with the start `zoneId` (line 182), which means if by some data error a zone's `parent_id` points to the start `zoneId` and the start zone is in `allZones` under a different ID, the traversal silently skips it. More concretely: if `zoneId` does not exist in `allZones` (a ghost ID), the function returns `[]` silently rather than surfacing the referential integrity error.

This is a quality gap rather than a crash risk, but it means `resolveGrant` silently falls back to direct-only grant lookup without any signal that the zone tree is corrupt — masking data bugs.

**Fix:** Add an early existence check with a thrown error (or at minimum a console.warn in demo context):

```typescript
export function getDescendants(zoneId: string, allZones: ZoneNode[]): ZoneNode[] {
  if (!allZones.some((z) => z.id === zoneId)) {
    // Ghost zone ID — data integrity error; fail visibly in development
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`getDescendants: zone "${zoneId}" not found in allZones`);
    }
    return [];
  }
  // ...existing BFS...
}
```

---

## Info

### IN-01: `unitName` has a dead fallback path — `UNITS[id]` can never be `undefined` for a valid `UnitId`

**File:** `frontend/src/demo/lib/model.ts:327-329`

**Issue:** `UNITS` is typed as `Record<UnitId, { label: string }>`, meaning every `UnitId` value is guaranteed to have an entry. The optional-chaining fallback `?? id` in `UNITS[id]?.label ?? id` is dead code: `UNITS[id]` can never be `undefined` for a TypeScript-valid `UnitId`, so `.label` will always exist. The `?.` and `?? id` are unreachable.

**Fix:**
```typescript
export function unitName(id: UnitId): string {
  return UNITS[id].label;
}
```

---

### IN-02: Module-level comment header convention is met in `model.ts` but the test file does not follow the project convention for test file naming

**File:** `frontend/src/demo/lib/physical-access.test.ts:1`

**Issue:** CLAUDE.md specifies test files should be named `snake_case_test.rs` for Rust, but does not prescribe a TypeScript test naming convention beyond Vitest. However, the comment at line 1 is a good-faith header. Minor: the test file's header comment says "Phase 5 zone access rules" while also covering Phase 6 items (the file was extended). The comment could mislead future authors into thinking Phase 6 items are out of scope for this file.

**Fix:** Update the header comment to reflect the full scope:
```typescript
// demo/lib/physical-access.test.ts — Vitest unit tests for Phase 5 zone-type rules
//   and Phase 6 grant resolution, time-window checks, and delegation.
```

---

_Reviewed: 2026-05-23T17:22:17Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
