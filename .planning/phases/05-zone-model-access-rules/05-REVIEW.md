---
phase: 05-zone-model-access-rules
reviewed: 2026-05-23T00:00:00Z
depth: standard
files_reviewed: 4
files_reviewed_list:
  - frontend/src/demo/lib/model.ts
  - frontend/src/demo/lib/abac.ts
  - frontend/src/demo/lib/policy.ts
  - frontend/src/demo/lib/physical-access.test.ts
findings:
  critical: 1
  warning: 4
  info: 3
  total: 8
status: issues_found
---

# Phase 05: Code Review Report

**Reviewed:** 2026-05-23T00:00:00Z
**Depth:** standard
**Files Reviewed:** 4
**Status:** issues_found

## Summary

Four files were reviewed: the frozen world schema (`model.ts`), the lifted ABAC evaluator (`abac.ts`), the per-entity policy evaluator (`policy.ts`), and the Phase 5 unit tests (`physical-access.test.ts`). The zone access rules and tree traversal helpers are structurally sound and the test suite exercises the four main branches of each zone-type evaluator correctly. However, one critical semantic correctness bug was found in the PHYSICAL domain tier evaluation path that will silently misclassify access decisions for all PHYSICAL-domain resources, and several warning-level issues affect API contract consistency and cycle safety.

## Critical Issues

### CR-01: PHYSICAL domain tier check silently passes for any non-null auth entry

**File:** `frontend/src/demo/lib/abac.ts:51-52` (also `frontend/src/demo/lib/policy.ts:15-18`)

**Issue:** `TIERS` is declared as `Partial<Record<Domain, string[]>>` with only `COMPUTER` and `DATA` populated. `PHYSICAL` is intentionally absent (model.ts:29 notes it was "removed in Phase 5"). However, many seed subjects and resources still carry `domain: "PHYSICAL"` with tier strings such as `"SECURE_VAULT"`, `"RESTRICTED_AREA"`, and `"LOBBY"` (seed.ts lines 63, 82, 107, 200, 234, etc.).

When `evaluate()` (or `evaluateWithPolicy()`) is called on a PHYSICAL resource:

```
tierRank("PHYSICAL", "LOBBY")        = TIERS["PHYSICAL"]?.indexOf("LOBBY") ?? -1        = -1
tierRank("PHYSICAL", "SECURE_VAULT") = TIERS["PHYSICAL"]?.indexOf("SECURE_VAULT") ?? -1 = -1
```

The comparison becomes `-1 >= -1` which is `true`. The only guard is `held != null`. This means **any subject with any non-null PHYSICAL domainAuth value — including `"LOBBY"` — will pass the domain tier check against a `"SECURE_VAULT"` resource**. A `"LOBBY"`-tier subject reaches the same tier verdict as a `"SECURE_VAULT"`-tier subject, defeating the entire purpose of PHYSICAL tier discrimination.

Concrete example from seed data: `subj-6` (Astrid Larsen, `PHYSICAL: "LOBBY"`, `CONFIDENTIAL`) evaluated against `res-2` (SCIF Door 4, `PHYSICAL: "SECURE_VAULT"`, `TOP_SECRET`). Clearance fails (`CONFIDENTIAL < TOP_SECRET`), masking the tier bug. But a `TOP_SECRET` subject with only `"LOBBY"` auth — such as `subj-9` (Sigrid Haug, CONFIDENTIAL — but a future similar subject) — would incorrectly ALLOW.

**Fix:** Either add a PHYSICAL ladder to `TIERS` covering all tiers used in seed data:

```typescript
export const TIERS: Partial<Record<Domain, string[]>> = {
  COMPUTER: ["STANDARD", "PRIVILEGED", "ROOT"],
  DATA: ["INTERNAL", "RESTRICTED", "CLASSIFIED"],
  PHYSICAL: ["LOBBY", "RESTRICTED_AREA", "SECURE_VAULT"],
};
```

Or, if PHYSICAL domain evaluation is truly decommissioned, strip `domain: "PHYSICAL"` from all seed resources and subjects so `evaluate()` is never called on PHYSICAL resources. A middle path: add a guard in `tierRank` (or before calling it) that throws or returns `Number.NEGATIVE_INFINITY` for unknown domains rather than `-1`, so the silent equality collapses.

---

## Warnings

### WR-01: `getDescendants` and `getAncestors` have no cycle detection — infinite loop on malformed data

**File:** `frontend/src/demo/lib/model.ts:155-183`

**Issue:** Both tree traversal helpers assume acyclic zone trees. `getDescendants` uses a BFS queue (lines 175-181) with no visited-node set. If a `ZoneNode` is created where `parent_id` chains create a cycle (e.g., A → B → A), `getDescendants` will loop forever filling the queue. `getAncestors` (lines 158-166) has the same risk: `current.parent_id` can point back to an ancestor, creating an infinite `while` loop.

Phase 8 is slated to call `getDescendants` for full subtree rendering. A single malformed seed entry, a migration error, or a future UI form creating circular parent assignments would cause a hung or OOM browser tab with no error message.

**Fix:**

```typescript
// getDescendants — add a visited set
export function getDescendants(zoneId: string, allZones: ZoneNode[]): ZoneNode[] {
  const result: ZoneNode[] = [];
  const visited = new Set<string>();
  const queue: string[] = [zoneId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue; // cycle guard
    visited.add(current);
    const children = allZones.filter((z) => z.parent_id === current);
    result.push(...children);
    queue.push(...children.map((c) => c.id));
  }
  return result;
}

// getAncestors — add a visited set
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

---

### WR-02: `failed[]` contract diverges between `evaluate()` and `evaluateWithPolicy()`

**File:** `frontend/src/demo/lib/policy.ts:105-108` vs `frontend/src/demo/lib/abac.ts:135`

**Issue:** Both functions return a `Decision` type with a `failed: string[]` field. The `Decision` interface comment (abac.ts:31) says `failed` lists "names of base rules that failed." `evaluate()` honours this: `failed` contains only base rule names (line 135). `evaluateWithPolicy()` deviates: it spreads override names (`"Revoked"`, `"Security hold"`) into `failed` as well (policy.ts:107).

Any consumer that inspects `d.failed` to understand *which base rule* caused a DENY will see different behaviour depending on which evaluator was called. For example, a revoked subject evaluated via `evaluateWithPolicy` would produce `failed: ["Revoked"]` even when all base rules pass, while the same subject via `evaluate` would produce `failed: []` (empty) — the override is only visible in `d.overrides`.

**Fix:** Align `evaluateWithPolicy` with the documented contract. Remove overrides from `failed`:

```typescript
return {
  decision,
  rules,
  overrides,
  failed: rules.filter((r) => !r.pass).map((r) => r.name), // base rules only
};
```

If callers need a combined "all deny reasons" list, add a separate derived field or let callers compute it from `failed` + `overrides.map(o => o.name)`.

---

### WR-03: `ZoneAccessReason` values `"ESCORT_REQUIRED"` and `"ENTRY_LOG_REQUIRED"` are dead code in the union type

**File:** `frontend/src/demo/lib/model.ts:68-69`

**Issue:** `ZoneAccessReason` declares two values that no evaluation function ever returns:

- `"ESCORT_REQUIRED"` — `evaluateRestrictedAccess` returns `"GRANT_FOUND"` even when the escort path is taken (the escort is noted in `detail` only via the `"ESCORT_REQUIRED"` reason string being unused).
- `"ENTRY_LOG_REQUIRED"` — `evaluateSecuredAccess` returns `"GRANT_FOUND"` for ALLOW paths; the log requirement is embedded in the `detail` string.

This creates a widened union type where two members can never appear at runtime. Any future exhaustive switch or discriminated union pattern over `ZoneAccessReason` would need dead branches, and reviewers/callers have no way to know these values are phantom without reading all three evaluation functions.

**Fix:** Remove the two unused union members, or immediately use them as the `reason` where semantically appropriate:

```typescript
// Option A: Remove dead members
export type ZoneAccessReason =
  | "GRANT_FOUND"
  | "NO_GRANT"
  | "INSUFFICIENT_CLEARANCE";

// Option B: Use them — evaluateSecuredAccess ALLOW path:
return {
  allow: true,
  gate: "ZONE_TYPE_RULE",
  reason: isEscorted ? "ESCORT_REQUIRED" : "ENTRY_LOG_REQUIRED", // or GRANT_FOUND + subtype
  detail: isEscorted ? "escort noted — entry log mandatory" : "entry log mandatory",
};
```

---

### WR-04: Redundant `as UnitId` type assertion in `evaluateWithPolicy`

**File:** `frontend/src/demo/lib/policy.ts:78`

**Issue:** `principal.entity` is declared as `UnitId` in the `Principal` interface (abac.ts:35). The call `hasAgreement(principal.entity as UnitId, req.ownerUnit)` casts a value that is already typed as `UnitId`. The `as` assertion suppresses TypeScript's type checker for that expression, meaning if `Principal.entity` were ever re-typed to a broader type in a refactor, this cast would silently mask the mismatch rather than producing a compile error.

**Fix:** Remove the cast:

```typescript
const ok = hasAgreement(principal.entity, req.ownerUnit);
```

---

## Info

### IN-01: `requires_explicit_auth` field on `ZoneNode` is defined but never read by any evaluation function

**File:** `frontend/src/demo/lib/model.ts:56`

**Issue:** `ZoneNode.requires_explicit_auth: boolean` is declared in the interface and populated in the test fixtures (physical-access.test.ts lines 129, 140, 151, 162), but none of `evaluateControlledAccess`, `evaluateRestrictedAccess`, or `evaluateSecuredAccess` accept or consult it. The field carries intent (it signals whether explicit authorization is needed independent of zone type), but that intent is not enforced anywhere.

**Fix:** Either wire the field into a resolver (Phase 6 is the likely target), or add a TODO comment noting the field is a Phase 6 forward-declaration and should not be treated as a Phase 5 constraint.

---

### IN-02: `physical-access.test.ts` has incomplete `CLEARANCE_RANK` test coverage

**File:** `frontend/src/demo/lib/physical-access.test.ts:19-26`

**Issue:** The CLEARANCE_RANK describe block tests only two of the five ranks (`RESTRICTED=1`, `CONFIDENTIAL=2`). The ranks for `UNCLASSIFIED=0`, `SECRET=3`, and `TOP_SECRET=4` are not directly asserted. While these values are implicitly exercised by the zone access function tests, a direct rank assertion suite is incomplete — if the rank ordering were shifted (e.g., UNCLASSIFIED changed from 0 to -1), no test in this file would catch it.

**Fix:** Add assertions for the remaining three ranks:

```typescript
it("UNCLASSIFIED is rank 0", () => { expect(CLEARANCE_RANK["UNCLASSIFIED"]).toBe(0); });
it("SECRET is rank 3", () => { expect(CLEARANCE_RANK["SECRET"]).toBe(3); });
it("TOP_SECRET is rank 4", () => { expect(CLEARANCE_RANK["TOP_SECRET"]).toBe(4); });
```

---

### IN-03: `evaluateSecuredAccess` with `isEscorted=true` and sufficient clearance not tested

**File:** `frontend/src/demo/lib/physical-access.test.ts:85-112`

**Issue:** The `evaluateSecuredAccess` test suite has four cases, but the case `(true, "SECRET", true)` — where the subject has both a grant and SECRET clearance AND is escorted — is not tested. The `detail` field in this case returns `"escort noted — entry log mandatory"` (model.ts:139), while the non-escorted allow path returns `"entry log mandatory"`. The distinction is present in the source but the test only asserts `r.detail.toContain("entry log mandatory")` for the non-escorted path (line 97), leaving the escort-noted variant untested.

**Fix:** Add a test:

```typescript
it("ALLOW when has grant, SECRET clearance, and escort — detail notes escort", () => {
  const r = evaluateSecuredAccess(true, "SECRET", true);
  expect(r.allow).toBe(true);
  expect(r.detail).toContain("escort noted");
  expect(r.detail).toContain("entry log mandatory");
});
```

---

_Reviewed: 2026-05-23T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
