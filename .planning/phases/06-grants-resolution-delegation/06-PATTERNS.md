# Phase 6: Grants, Resolution & Delegation — Pattern Map

**Mapped:** 2026-05-23
**Files analyzed:** 2 (both are modifications to existing files)
**Analogs found:** 2 / 2

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `frontend/src/demo/lib/model.ts` | model / pure-function library | transform (evaluate) | `frontend/src/demo/lib/model.ts` lines 84–192 (Phase 5 functions) | exact — same file, same section |
| `frontend/src/demo/lib/physical-access.test.ts` | test | request-response (unit test) | `frontend/src/demo/lib/physical-access.test.ts` lines 1–196 (Phase 5 tests) | exact — same file, extend in place |

---

## Pattern Assignments

### `frontend/src/demo/lib/model.ts` — Phase 6 types section

**Analog:** `frontend/src/demo/lib/model.ts` lines 38–79 (Phase 5 zone types block)

**Interface declaration pattern** (lines 51–60):
```typescript
// A node in the zone tree. parent_id is null at the root (SITE level).
// admin_org_id: the org that controls/delegates access grants for this zone.
// asset_owner_org_id: the org that owns the protected assets inside the zone.
export interface ZoneNode {
  id: string;
  name: string;
  level: ZoneLevel;
  zone_type: ZoneType;
  parent_id: string | null;
  admin_org_id: string;
  asset_owner_org_id: string;
  requires_explicit_auth: boolean;
}
```

Copy this pattern for `PhysicalAccessGrant` and `ZoneAccessDelegate`:
- Named `export interface`
- `snake_case` field names (matching DB column conventions)
- Nullable fields expressed as `Type | null`
- JSDoc-style inline comment block above the interface explaining fields that are not self-evident
- Section header comment `// --- Phase 6: Grant types ---` follows the `// --- Phase 5: Zone hierarchy model ---` style at line 38

**ZoneAccessResult pattern** (lines 74–79) — reference for nullable optional field:
```typescript
export interface ZoneAccessResult {
  allow: boolean;
  gate: ZoneAccessGate;
  reason: ZoneAccessReason;
  detail?: string;
}
```

Use `field?: Type` only for genuinely optional fields. `valid_from` and `valid_until` are nullable (`Date | null`), not optional — they are always present, just possibly null.

---

### `frontend/src/demo/lib/model.ts` — Phase 6 functions section

**Analog:** `frontend/src/demo/lib/model.ts` lines 84–192 (Phase 5 evaluate + traversal functions)

**Section header pattern** (lines 82–83, 94–95, 103–104, 126–128, 154–157):
```typescript
// --- ACCESS-02: CONTROLLED zone access rule ---
// CONTROLLED zones require explicit authorization only — no clearance check.
export function evaluateControlledAccess(hasGrant: boolean): ZoneAccessResult {
```

Each function group starts with a `// --- LABEL: description ---` comment block. Phase 6 functions should use the requirement IDs from SPEC.md as labels:
- `// --- GRANT-01 / GRANT-02: isGrantActive — time-window check ---`
- `// --- GRANT-04: resolveGrant — ancestor walk, most-specific active grant ---`
- `// --- ACCESS-05: resolveZoneAccess — two-gate entry point ---`
- `// --- DELEG-01: isDelegateActive — delegate time-window check ---`

**Simple pure-function pattern** (lines 96–100):
```typescript
export function evaluateControlledAccess(hasGrant: boolean): ZoneAccessResult {
  return hasGrant
    ? { allow: true, gate: "ZONE_TYPE_RULE", reason: "GRANT_FOUND" }
    : { allow: false, gate: "ZONE_TYPE_RULE", reason: "NO_GRANT" };
}
```

`isGrantActive` and `isDelegateActive` follow this shape: single expression return, no intermediate variables needed.

**Multi-branch function with early return** (lines 105–124):
```typescript
export function evaluateRestrictedAccess(
  hasGrant: boolean,
  clearance: Clearance,
  hasValidEscort: boolean,
): ZoneAccessResult {
  if (!hasGrant)
    return { allow: false, gate: "ZONE_TYPE_RULE", reason: "NO_GRANT" };
  if (
    CLEARANCE_RANK[clearance] >= CLEARANCE_RANK["RESTRICTED"] ||
    hasValidEscort
  ) {
    return { allow: true, gate: "ZONE_TYPE_RULE", reason: "GRANT_FOUND" };
  }
  return {
    allow: false,
    gate: "ZONE_TYPE_RULE",
    reason: "INSUFFICIENT_CLEARANCE",
    detail: `clearance: ${clearance}, required: RESTRICTED`,
  };
}
```

`resolveZoneAccess` follows this multi-branch early-return shape: guard clauses first, then dispatch by zone_type. Trailing comma on last field of multi-line object literal.

**Tree-traversal function pattern** (lines 158–172):
```typescript
export function getAncestors(zoneId: string, allZones: ZoneNode[]): ZoneNode[] {
  const nodeMap = new Map(allZones.map((z) => [z.id, z]));
  const ancestors: ZoneNode[] = [];
  const visited = new Set<string>();
  let current = nodeMap.get(zoneId);
  while (current?.parent_id != null) {
    if (visited.has(current.id)) break; // cycle guard
    visited.add(current.id);
    const parent = nodeMap.get(current.parent_id);
    if (!parent) break;
    ancestors.push(parent);
    current = parent;
  }
  return ancestors;
}
```

`resolveGrant` is a walk over a pre-built search list. It calls `getAncestors()` (already cycle-guarded and tested) rather than rolling its own walk. Use `Array.find()` for the per-zone grant lookup.

**Phase 6 function insertion point in model.ts:** Append after line 192 (end of `getDescendants`), before line 194 (UnitId section). Maintain blank line separators between sections.

---

### `frontend/src/demo/lib/physical-access.test.ts` — Phase 6 describe blocks

**Analog:** `frontend/src/demo/lib/physical-access.test.ts` lines 1–196 (entire Phase 5 test file)

**Import block pattern** (lines 5–15):
```typescript
import { describe, it, expect } from "vitest";
import {
  CLEARANCE_RANK,
  isValidZoneTypeCombination,
  evaluateControlledAccess,
  evaluateRestrictedAccess,
  evaluateSecuredAccess,
  getAncestors,
  getDescendants,
  type ZoneNode,
} from "./model";
```

Phase 6 adds to this existing import list. New named imports to add:
```typescript
  isGrantActive,
  resolveGrant,
  resolveZoneAccess,
  isDelegateActive,
  type PhysicalAccessGrant,
  type ZoneAccessDelegate,
```
Type imports use the `type` keyword prefix, value imports do not.

**Inline fixture pattern** (lines 121–165):
```typescript
const Z_SITE: ZoneNode = {
  id: "z-site",
  name: "Main Campus",
  level: "SITE",
  zone_type: "CONTROLLED",
  parent_id: null,
  admin_org_id: "org-a",
  asset_owner_org_id: "org-a",
  requires_explicit_auth: false,
};
```

Phase 6 grant fixtures follow the same pattern — typed `const` at file scope (or inside `describe` if zone-specific). `ALL_ZONES` and `Z_SITE`, `Z_BUILDING1`, `Z_ROOM1`, `Z_BUILDING2` from lines 121–165 are already in scope for all Phase 6 `describe` blocks since they share the same file. Do not redeclare them.

**Describe-block with branch comments pattern** (lines 58–83):
```typescript
describe("evaluateRestrictedAccess", () => {
  it("DENY when no grant regardless of clearance (NO_GRANT early return)", () => {
    // Branch 1: (false, "RESTRICTED", false) → DENY NO_GRANT
    const r = evaluateRestrictedAccess(false, "RESTRICTED", false);
    expect(r.allow).toBe(false);
    expect(r.reason).toBe("NO_GRANT");
  });
  it("ALLOW when has grant and sufficient clearance (RESTRICTED clearance meets threshold)", () => {
    // Branch 2: (true, "RESTRICTED", false) → ALLOW GRANT_FOUND
    const r = evaluateRestrictedAccess(true, "RESTRICTED", false);
    expect(r.allow).toBe(true);
    expect(r.reason).toBe("GRANT_FOUND");
  });
```

Each `it` block:
- `it` string describes the expected outcome and the key input condition in plain English
- Optional inline comment `// Branch N: (args) → outcome` documents which code path is exercised
- Assertions: `expect(result.field).toBe(value)` — assert the discriminating fields only; no `toEqual` for the whole object unless all fields are relevant
- No `beforeEach`, no shared mutable state — each `it` constructs its own inputs

**`getAncestors` describe pattern** (lines 167–180) — reference for "returns expected collection" assertions:
```typescript
it("returns ancestors of room in parent-first order: [building1, site]", () => {
  const ancestors = getAncestors("z-room1", ALL_ZONES);
  expect(ancestors).toHaveLength(2);
  // parent-first: element [0] is the room's direct parent (building1)
  expect(ancestors[0].id).toBe("z-bldg1");
  // last element is root site
  expect(ancestors[ancestors.length - 1].id).toBe("z-site");
});
```

For `resolveGrant` tests that check which grant is returned, assert on `grant?.id` (or `grant`'s `zone_id`) rather than `toEqual` the whole object — less brittle, matches the Phase 5 test style of asserting the discriminating field.

**Test insertion point:** Append after line 196 (end of `getDescendants` describe block). No blank line needed before first new `describe` — match existing file spacing.

---

## Shared Patterns

### Null-boundary time-window check
**Source:** CONTEXT.md §specifics + SPEC.md §2 (no existing code analog — this is new logic)
**Apply to:** `isGrantActive`, `isDelegateActive`
```typescript
// Inclusive boundaries. null = unbounded on that side.
(field.valid_from === null || field.valid_from <= now) &&
(field.valid_until === null || field.valid_until >= now)
```
Both functions use identical logic; `isGrantActive` operates on `PhysicalAccessGrant`, `isDelegateActive` on `ZoneAccessDelegate`.

### `now: Date` parameter convention
**Source:** `frontend/src/demo/lib/model.ts` — established in Phase 5 design; carried into Phase 6
**Apply to:** `isGrantActive`, `resolveGrant`, `resolveZoneAccess`, `isDelegateActive`
All time-sensitive functions accept `now: Date` as the last parameter. No internal `new Date()` or `Date.now()` calls anywhere in function bodies. This keeps every test deterministic with a fixed `now` fixture.

### Zone-type-scoped ancestor filter
**Source:** SPEC.md §3 + RESEARCH.md Pitfall 1
**Apply to:** `resolveGrant` ancestor loop
```typescript
// Only apply zone_type filter to ancestors, not to the target zone itself.
if (searchZone.id !== zone.id && searchZone.zone_type !== zone.zone_type) {
  continue;
}
```
The target zone trivially satisfies the check (same node). Applying the filter to the target zone would incorrectly skip direct grants.

### `requires_explicit_auth` short-circuit
**Source:** SPEC.md §4 + RESEARCH.md Pitfall 2
**Apply to:** `resolveGrant` search-list construction
```typescript
const searchZones: ZoneNode[] = zone.requires_explicit_auth
  ? [zone]
  : [zone, ...getAncestors(zone.id, allZones)];
```
Check the flag before building the list — never filter after the walk. If `requires_explicit_auth` is true, the ancestor array is never built.

### Gate discriminator assignment
**Source:** `frontend/src/demo/lib/model.ts` lines 64–65 + SPEC.md §6 + RESEARCH.md Pitfall 4
**Apply to:** `resolveZoneAccess` — early-return on null grant
```typescript
if (grant === null) {
  return { allow: false, gate: "GRANT_LOOKUP", reason: "NO_GRANT" };
}
```
`gate: "GRANT_LOOKUP"` is only emitted here. The Phase 5 evaluate functions always emit `gate: "ZONE_TYPE_RULE"` — their results pass through unchanged. Never call an evaluate function with `hasGrant: false` from inside `resolveZoneAccess`.

---

## No Analog Found

All Phase 6 items have direct analogs in the existing Phase 5 code in the same files. No items require falling back to RESEARCH.md patterns alone.

However, three patterns are **new logic** with no prior codebase implementation (though their contracts are fully specified):

| Item | Type | Reason | Specification source |
|---|---|---|---|
| `isGrantActive` null-boundary logic | function | No time-window check exists anywhere in codebase | CONTEXT.md §specifics, SPEC.md §2 |
| `resolveGrant` zone_type-scoped walk | function | No grant resolution walk exists anywhere | SPEC.md §3–5, RESEARCH.md Patterns 2 |
| `resolveZoneAccess` two-gate dispatch | function | No unified resolver exists; Phase 5 functions are standalone | SPEC.md §6, RESEARCH.md Pattern 3 |

For these, the RESEARCH.md §Code Examples section contains the authoritative implementation blueprints (cross-checked against SPEC.md and CONTEXT.md).

---

## Metadata

**Analog search scope:** `frontend/src/demo/lib/` (model.ts, physical-access.test.ts, policy.test.ts)
**Files scanned:** 4 (model.ts, physical-access.test.ts, policy.test.ts, 06-SPEC.md)
**Pattern extraction date:** 2026-05-23
