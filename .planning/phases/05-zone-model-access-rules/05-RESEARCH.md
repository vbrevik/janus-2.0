# Phase 5: Zone Model & Access Rules — Research

**Researched:** 2026-05-23
**Domain:** TypeScript type extension + pure-function logic in `frontend/src/demo/lib/model.ts`
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**D-01: ZoneAccessResult — rich type with gate field**

`ZoneAccessResult` carries a `gate` discriminator so Phase 6 can compose two results into a two-gate trace without reshaping the type:

```typescript
export type ZoneAccessGate = 'GRANT_LOOKUP' | 'ZONE_TYPE_RULE';
export type ZoneAccessReason =
  | 'GRANT_FOUND'
  | 'NO_GRANT'
  | 'INSUFFICIENT_CLEARANCE'
  | 'ESCORT_REQUIRED'
  | 'ENTRY_LOG_REQUIRED';

export interface ZoneAccessResult {
  allow: boolean;
  gate: ZoneAccessGate;
  reason: ZoneAccessReason;
  detail?: string;
}
```

Phase 5 rule functions always emit `gate: 'ZONE_TYPE_RULE'`. Phase 6 creates `gate: 'GRANT_LOOKUP'` results independently. `reason` is a typed string union — exhaustive switch in Phase 8 UI, no typos. `detail?` carries human-readable supplementary info.

**D-02: Tree traversal helpers — included in Phase 5**

```typescript
export function getAncestors(zoneId: string, allZones: ZoneNode[]): ZoneNode[]
export function getDescendants(zoneId: string, allZones: ZoneNode[]): ZoneNode[]
```

`getAncestors` returns ordered chain from direct parent to root (leaf → root, parent-first order). `getDescendants` returns all transitive descendants. Both tested in `physical-access.test.ts`.

**D-03: Escort parameter naming — RESTRICTED vs SECURED differ**

`evaluateRestrictedAccess` uses `hasValidEscort` (caller has already verified the escort holds an active grant). `evaluateSecuredAccess` uses `isEscorted` (does NOT affect ALLOW/DENY; passed to `detail` annotation only).

**D-04: Clearance rank comparisons — CLEARANCE_RANK directly**

Use `CLEARANCE_RANK[clearance] >= CLEARANCE_RANK['RESTRICTED']` in rule functions. Consistent with `abac.ts` pattern. No new `compareClearance()` helper.

**D-05: Clearance rank update strategy**

New ranks: `UNCLASSIFIED=0, RESTRICTED=1, CONFIDENTIAL=2, SECRET=3, TOP_SECRET=4`. All comparisons in `abac.ts` and `policy.ts` are relative (`>=`, `<`), not hardcoded numerics — existing tests self-correct. Implementation order: run `npx vitest run` BEFORE touching `model.ts` to establish the 80-test green baseline.

### Claude's Discretion

None — discussion stayed within phase scope.

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ZONE-01 | Flexible tree node with id, name, zone_type, parent_id, level (SITE/AREA/BUILDING/ZONE/ROOM) | `ZoneNode` interface with all fields; `getAncestors`/`getDescendants` for traversal |
| ZONE-02 | Each zone node has zone_type: CONTROLLED, RESTRICTED, or SECURED | `ZoneType` string union type |
| ZONE-03 | SECURED zone_type only valid at BUILDING, ZONE, or ROOM level | `isValidZoneTypeCombination(level, zone_type): boolean` ceiling function |
| ZONE-04 | Each zone carries admin_org_id and asset_owner_org_id | Fields on `ZoneNode` interface |
| ZONE-05 | Zone node flagged `requires_explicit_auth = true` for explicit per-person grant | Boolean field on `ZoneNode` interface |
| ACCESS-01 | Clearance ladder 5-tier: UNCLASSIFIED → RESTRICTED → CONFIDENTIAL → SECRET → TOP_SECRET | Extend `Clearance` union and `CLEARANCE_RANK` record |
| ACCESS-02 | CONTROLLED zone — explicit authorization required, no clearance level required | `evaluateControlledAccess(hasGrant): ZoneAccessResult` — grant check only |
| ACCESS-03 | RESTRICTED zone — RESTRICTED clearance or above, OR escorted | `evaluateRestrictedAccess(hasGrant, clearance, hasValidEscort): ZoneAccessResult` |
| ACCESS-04 | SECURED zone — SECRET clearance or above AND explicit per-zone grant | `evaluateSecuredAccess(hasGrant, clearance, isEscorted): ZoneAccessResult` |
</phase_requirements>

---

## Summary

Phase 5 is a pure TypeScript model extension — no UI, no backend, no route changes. All work lands in two files: `frontend/src/demo/lib/model.ts` (types, functions, helpers) and a new `frontend/src/demo/lib/physical-access.test.ts` (Vitest unit tests). The existing 80-test suite must still pass after changes.

The dominant risks are: (1) the `TIERS.PHYSICAL` removal breaks TypeScript compilation because `TIERS` is typed as `Record<Domain, string[]>` — requires a type annotation change alongside the key deletion; (2) rank-shift when inserting `RESTRICTED=1` — mitigated because all existing comparisons are relative (`>=`), not hardcoded numbers, confirmed by grep; (3) the seed.ts subjects and resources reference `PHYSICAL` tier string values (`"LOBBY"`, `"RESTRICTED_AREA"`, `"SECURE_VAULT"`) in `domainAuth` and `requiredTier` fields, but those are plain `string` types in the interfaces — no TypeScript or runtime impact from removing `TIERS.PHYSICAL`.

The existing test suite does NOT exercise any PHYSICAL-domain resource in `evaluate()` calls. `res-2` (SCIF Door 4, PHYSICAL domain) is never passed to `decide()` in the 80 tests. Removing `TIERS.PHYSICAL` will not cause any test regression, but it will cause a runtime error if `evaluate()` is ever called with a PHYSICAL-domain resource after the change. The safest solution is to change the `TIERS` type annotation from `Record<Domain, string[]>` to `Partial<Record<Domain, string[]>>` and make `tierRank` guard against undefined — or keep `PHYSICAL: []` as a tombstone.

**Primary recommendation:** Change `TIERS` type to `Partial<Record<Domain, string[]>>`, remove the `PHYSICAL` key, and update the `tierRank` helper in `abac.ts` and `policy.ts` to handle `undefined` (or simply keep `PHYSICAL: []` which satisfies `Record<Domain, string[]>` with zero runtime risk).

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Zone type definitions (ZoneLevel, ZoneType, ZoneNode) | Frontend demo lib | — | Shared model types consumed by all Phase 6–8 demo layers |
| Clearance rank extension | Frontend demo lib | — | `model.ts` is canonical home for `Clearance` and `CLEARANCE_RANK` |
| Access rule functions (CONTROLLED/RESTRICTED/SECURED) | Frontend demo lib | — | Pure functions, no state, no UI — belong in model layer |
| Tree traversal helpers | Frontend demo lib | — | Pure functions on typed data structures |
| Unit tests | Frontend test layer | — | Vitest co-located with source in `src/demo/lib/` |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | ~5.9.3 (project) | Type system for all new types and interfaces | Project baseline — already in use [ASSUMED] |
| Vitest | 4.0.x (project) | Unit test runner for `physical-access.test.ts` | Established test runner for all demo lib tests [ASSUMED] |

No new packages are installed in this phase. All work uses the existing TypeScript + Vitest setup.

### Supporting

No additional libraries. Phase 5 is pure TypeScript logic.

### Alternatives Considered

None applicable — all choices are already locked by CONTEXT.md decisions.

---

## Package Legitimacy Audit

No external packages are installed in this phase. This section is not applicable.

---

## Architecture Patterns

### System Architecture Diagram

```
model.ts (single change surface)
  ├── Clearance (5-tier union + CLEARANCE_RANK)
  ├── TIERS (PHYSICAL key removed)
  ├── ZoneLevel / ZoneType / ZoneNode interfaces
  ├── ZoneAccessGate / ZoneAccessReason / ZoneAccessResult
  ├── isValidZoneTypeCombination(level, zone_type) → boolean
  ├── evaluateControlledAccess(hasGrant) → ZoneAccessResult
  ├── evaluateRestrictedAccess(hasGrant, clearance, hasValidEscort) → ZoneAccessResult
  ├── evaluateSecuredAccess(hasGrant, clearance, isEscorted) → ZoneAccessResult
  ├── getAncestors(zoneId, allZones) → ZoneNode[]
  └── getDescendants(zoneId, allZones) → ZoneNode[]

physical-access.test.ts (new file)
  └── imports from ./model only
  └── inline fixtures (no seed.ts imports)
  └── covers: isValidZoneTypeCombination, evaluateControlled/Restricted/Secured, getAncestors, getDescendants

Downstream consumers (read-only, no changes):
  abac.ts   ← still uses CLEARANCE_RANK, TIERS (PHYSICAL removed from TIERS)
  policy.ts ← still uses CLEARANCE_RANK, TIERS (same)
  seed.ts   ← re-exports TIERS, ROLES, UNITS (TIERS no longer has PHYSICAL key)
```

### Recommended Project Structure

No structural changes. The `frontend/src/demo/lib/` directory stays flat:

```
frontend/src/demo/lib/
├── model.ts                    # MODIFIED — Clearance, TIERS, new Zone types + functions
├── physical-access.test.ts     # NEW — Vitest tests for all Phase 5 additions
├── abac.ts                     # UNCHANGED (may need Partial<Record> guard — see Pitfall 1)
├── policy.ts                   # UNCHANGED (same guard note)
├── seed.ts                     # UNCHANGED — re-exports TIERS which loses PHYSICAL key
├── auditlog.ts / auditlog.test.ts
├── policy.test.ts
├── abac.test.ts
├── obligations.ts / obligations.test.ts
├── contract.ts
└── credential.ts
```

### Pattern 1: Clearance Extension — Additive Insert

**What:** Insert `"RESTRICTED"` between `"UNCLASSIFIED"` and `"CONFIDENTIAL"` in the union type and update `CLEARANCE_RANK` to shift all existing ranks up by 1.

**When to use:** Extending any ordered string union where downstream uses only relative comparisons (`>=`, `<`).

**Example (existing pattern in `abac.ts`, to be extended):**

```typescript
// Source: frontend/src/demo/lib/model.ts (verified current state)

// BEFORE:
export type Clearance =
  | "UNCLASSIFIED"
  | "CONFIDENTIAL"
  | "SECRET"
  | "TOP_SECRET";

export const CLEARANCE_RANK: Record<Clearance, number> = {
  UNCLASSIFIED: 0,
  CONFIDENTIAL: 1,
  SECRET: 2,
  TOP_SECRET: 3,
};

// AFTER:
export type Clearance =
  | "UNCLASSIFIED"
  | "RESTRICTED"
  | "CONFIDENTIAL"
  | "SECRET"
  | "TOP_SECRET";

export const CLEARANCE_RANK: Record<Clearance, number> = {
  UNCLASSIFIED: 0,
  RESTRICTED: 1,
  CONFIDENTIAL: 2,
  SECRET: 3,
  TOP_SECRET: 4,
};
```

### Pattern 2: TIERS.PHYSICAL Removal — Two-Step

**What:** Remove the `PHYSICAL` key from `TIERS`. Requires changing the type annotation from `Record<Domain, string[]>` to `Partial<Record<Domain, string[]>>` to satisfy TypeScript while keeping `Domain` union unchanged. [ASSUMED: `Partial<Record<>>` is the correct type fix — this is the standard TypeScript pattern for sparse records]

**When to use:** Any time a constant implementing a full-coverage Record type needs to have keys removed without changing the discriminant union.

**Example:**

```typescript
// BEFORE (fails TypeScript if PHYSICAL key removed):
export const TIERS: Record<Domain, string[]> = {
  COMPUTER: ["STANDARD", "PRIVILEGED", "ROOT"],
  DATA: ["INTERNAL", "RESTRICTED", "CLASSIFIED"],
  PHYSICAL: ["LOBBY", "RESTRICTED_AREA", "SECURE_VAULT"],
};

// AFTER:
export const TIERS: Partial<Record<Domain, string[]>> = {
  COMPUTER: ["STANDARD", "PRIVILEGED", "ROOT"],
  DATA: ["INTERNAL", "RESTRICTED", "CLASSIFIED"],
};
```

**Note on downstream impact:** `abac.ts` and `policy.ts` call `TIERS[domain].indexOf(tier)`. If `domain === "PHYSICAL"`, this now returns `undefined.indexOf(...)` and throws. After the type change, TypeScript will flag `TIERS[domain]` as `string[] | undefined`. The `tierRank` helper in both files must add a null guard: `TIERS[domain]?.indexOf(tier) ?? -1`. This is a safe fix because `-1 < -1` is `false`, meaning any PHYSICAL tier comparison returns "insufficient" (DENY) — which is the correct behaviour once the zone model replaces PHYSICAL tiers. However, the current 80 tests DO NOT exercise PHYSICAL-domain evaluate() calls, so the guard can be added as a pure safety measure without affecting test results.

**Alternative (lower risk, zero downstream changes):** Keep `TIERS.PHYSICAL = []` as a tombstone to satisfy `Record<Domain, string[]>`. Semantically: PHYSICAL domain has no ABAC tiers (all PHYSICAL access is now via zone rules). Zero downstream changes needed. However, the SPEC explicitly requires `grep "LOBBY" frontend/src/demo/lib/model.ts` returns no matches — a tombstone empty array satisfies this. [ASSUMED: empty array `[]` satisfies the SPEC acceptance criterion for removing the LOBBY/RESTRICTED_AREA/SECURE_VAULT string literals]

### Pattern 3: ZoneNode Interface Definition

**What:** Define zone hierarchy node as an interface with all required fields. Mirrors the `Subject` and `Resource` interface patterns already in `model.ts`.

**Example (to be added):**

```typescript
// Source: 05-CONTEXT.md D-02, confirmed via SPEC.md requirement 5
export type ZoneLevel = "SITE" | "AREA" | "BUILDING" | "ZONE" | "ROOM";
export type ZoneType = "CONTROLLED" | "RESTRICTED" | "SECURED";

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

### Pattern 4: Access Rule Functions — Pure Evaluators

**What:** Pure functions that take typed inputs and return a `ZoneAccessResult`. Pattern mirrors `evaluate()` in `abac.ts` — no side effects, no imports from `seed.ts`.

**Example (from 05-CONTEXT.md):**

```typescript
// Source: 05-CONTEXT.md decisions D-01 through D-03

export function evaluateControlledAccess(hasGrant: boolean): ZoneAccessResult {
  return hasGrant
    ? { allow: true, gate: 'ZONE_TYPE_RULE', reason: 'GRANT_FOUND' }
    : { allow: false, gate: 'ZONE_TYPE_RULE', reason: 'NO_GRANT' };
}

export function evaluateRestrictedAccess(
  hasGrant: boolean,
  clearance: Clearance,
  hasValidEscort: boolean,
): ZoneAccessResult {
  if (!hasGrant) return { allow: false, gate: 'ZONE_TYPE_RULE', reason: 'NO_GRANT' };
  if (CLEARANCE_RANK[clearance] >= CLEARANCE_RANK['RESTRICTED'] || hasValidEscort) {
    return { allow: true, gate: 'ZONE_TYPE_RULE', reason: 'GRANT_FOUND' };
  }
  return { allow: false, gate: 'ZONE_TYPE_RULE', reason: 'INSUFFICIENT_CLEARANCE',
           detail: `clearance: ${clearance}, required: RESTRICTED` };
}

export function evaluateSecuredAccess(
  hasGrant: boolean,
  clearance: Clearance,
  isEscorted: boolean,
): ZoneAccessResult {
  if (!hasGrant) return { allow: false, gate: 'ZONE_TYPE_RULE', reason: 'NO_GRANT' };
  if (CLEARANCE_RANK[clearance] >= CLEARANCE_RANK['SECRET']) {
    return {
      allow: true,
      gate: 'ZONE_TYPE_RULE',
      reason: 'GRANT_FOUND',
      detail: isEscorted ? 'escort noted — entry log mandatory' : 'entry log mandatory',
    };
  }
  return { allow: false, gate: 'ZONE_TYPE_RULE', reason: 'INSUFFICIENT_CLEARANCE',
           detail: `clearance: ${clearance}, required: SECRET` };
}
```

### Pattern 5: Tree Traversal Helpers

**What:** Pure functions for walking `parent_id` chains and collecting descendants. No external dependencies — only `ZoneNode[]` input.

**Example:**

```typescript
// Source: 05-CONTEXT.md D-02

// Returns parent-first chain: [direct-parent, grandparent, ..., root]
export function getAncestors(zoneId: string, allZones: ZoneNode[]): ZoneNode[] {
  const nodeMap = new Map(allZones.map(z => [z.id, z]));
  const ancestors: ZoneNode[] = [];
  let current = nodeMap.get(zoneId);
  while (current?.parent_id != null) {
    const parent = nodeMap.get(current.parent_id);
    if (!parent) break;
    ancestors.push(parent);
    current = parent;
  }
  return ancestors;
}

export function getDescendants(zoneId: string, allZones: ZoneNode[]): ZoneNode[] {
  const result: ZoneNode[] = [];
  const queue: string[] = [zoneId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    const children = allZones.filter(z => z.parent_id === current);
    result.push(...children);
    queue.push(...children.map(c => c.id));
  }
  return result;
}
```

### Pattern 6: Test File Style (from policy.test.ts)

**What:** Inline fixtures, no seed.ts imports, describe/it/expect blocks, imports from the lib file under test only.

**Example (from `frontend/src/demo/lib/policy.test.ts` — verified):**

```typescript
// Source: frontend/src/demo/lib/policy.test.ts (verified current file)
import { describe, it, expect } from "vitest";
import { /* functions to test */ } from "./model";
// import type { ... } from "./model";

// Inline fixture — no seed.ts import
const SIMPLE_ZONE: ZoneNode = {
  id: "z-001",
  name: "Main Lobby",
  level: "BUILDING",
  zone_type: "CONTROLLED",
  parent_id: null,
  admin_org_id: "org-a",
  asset_owner_org_id: "org-b",
  requires_explicit_auth: false,
};

describe("evaluateControlledAccess", () => {
  it("ALLOW when hasGrant is true", () => {
    const result = evaluateControlledAccess(true);
    expect(result.allow).toBe(true);
    expect(result.reason).toBe("GRANT_FOUND");
  });

  it("DENY when hasGrant is false", () => {
    const result = evaluateControlledAccess(false);
    expect(result.allow).toBe(false);
    expect(result.reason).toBe("NO_GRANT");
  });
});
```

### Anti-Patterns to Avoid

- **Hardcoding rank numbers in rule functions:** `CLEARANCE_RANK[clearance] >= 2` — use `CLEARANCE_RANK['RESTRICTED']` instead. Any future rank shift breaks hardcoded numbers silently.
- **Importing from seed.ts in the test file:** Pattern is inline fixtures only (D3-13 pattern, confirmed by `policy.test.ts`). Seed imports create coupling and make tests dependent on large datasets.
- **Creating a separate physical-access.ts file for the new functions:** SPEC and CONTEXT.md lock these to `model.ts`. No new library files.
- **Storing `ZONE_TYPE_RULE` gate inline as a string literal in every return:** Derive it from the type constant to avoid typos — or accept that TypeScript union checking on the return type catches misspellings at compile time.
- **Forgetting `gate: 'ZONE_TYPE_RULE'` in every return statement:** All Phase 5 functions emit this gate. A missing gate field will fail TypeScript since `ZoneAccessResult.gate` is required (non-optional).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Map creation for tree traversal | Custom iteration logic | `new Map(allZones.map(z => [z.id, z]))` | Standard JS Map pattern; O(n) lookup vs O(n²) nested loop |
| Clearance comparison | Custom comparison function | `CLEARANCE_RANK[c] >= CLEARANCE_RANK[threshold]` (D-04) | Consistent with `abac.ts` pattern; locked decision |
| Enum simulation | TypeScript enum keyword | String union type (`"SITE" \| "AREA" \| ...`) | Project convention — all domain values use string unions, not `enum` |

**Key insight:** This phase is pure logic composition on existing patterns. Every pattern has an established analog in the codebase (`evaluate()` in abac.ts for rule functions, `CLEARANCE_RANK` for rank comparisons, `policy.test.ts` for test style).

---

## Common Pitfalls

### Pitfall 1: TIERS.PHYSICAL Removal Breaks TypeScript

**What goes wrong:** Removing the `PHYSICAL` key from `TIERS` while the type remains `Record<Domain, string[]>` causes `tsc --noEmit` to fail with "Property 'PHYSICAL' is missing in type".

**Why it happens:** `TIERS: Record<Domain, string[]>` requires all three `Domain` values to be present as keys. Removing `PHYSICAL` violates the `Record` constraint.

**How to avoid:** Either:
- Change type to `Partial<Record<Domain, string[]>>` and add null guard in `tierRank` calls in `abac.ts` and `policy.ts`
- OR keep `PHYSICAL: []` as a tombstone (empty array) — satisfies `Record<Domain, string[]>`, zero downstream changes, SPEC acceptance criterion is satisfied because `grep "LOBBY"` still returns no matches

**Warning signs:** `tsc --noEmit` output containing "Property 'PHYSICAL' is missing" or similar.

**Recommended approach:** Use the tombstone (`PHYSICAL: []`) for zero ripple. If the empty-array tombstone feels unclean, use `Partial<Record<...>>` with null guards in both `abac.ts` and `policy.ts`.

### Pitfall 2: TIERS[domain].indexOf on undefined

**What goes wrong:** If `TIERS` type is changed to `Partial<Record<Domain, string[]>>`, then `TIERS[domain]` can return `undefined`. Calling `.indexOf()` on `undefined` throws `TypeError: Cannot read properties of undefined`.

**Why it happens:** `tierRank` in `abac.ts:52` and `policy.ts:18` calls `TIERS[domain].indexOf(tier)` without null check. TypeScript will now flag this after the type change, so it's a compile error as well as a potential runtime error.

**How to avoid:** Update `tierRank` to `TIERS[domain]?.indexOf(tier) ?? -1`. The `?? -1` means "no tiers defined for this domain = tier rank -1 = always insufficient" which is the safe default for PHYSICAL domain under the new zone model.

**Note:** This pitfall only applies if choosing `Partial<Record<...>>` over the tombstone approach. The tombstone (`PHYSICAL: []`) sidesteps this entirely.

### Pitfall 3: Rank Shift Breaks Assertions on Clearance Numbers

**What goes wrong:** Any test that asserts `CLEARANCE_RANK["CONFIDENTIAL"] === 1` will fail after the shift to `CONFIDENTIAL: 2`.

**Why it mitigated:** Current grep confirms no existing test hardcodes clearance rank numbers. All comparisons are relative (`>=`). The SPEC itself requires a test asserting the NEW values (`CLEARANCE_RANK["CONFIDENTIAL"] === 2`).

**How to avoid:** Run `npx vitest run` before touching `model.ts` to establish the 80-test green baseline. Confirm all 80 pass. Make changes. Re-run immediately.

**Warning signs:** Any test asserting `.toBe(1)` or `.toBe(2)` on `CLEARANCE_RANK["CONFIDENTIAL"]` or similar.

### Pitfall 4: Missing `gate` Field in Return Objects

**What goes wrong:** `ZoneAccessResult.gate` is required (non-optional per D-01). Every return statement in the four access-rule functions must include `gate: 'ZONE_TYPE_RULE'`. Forgetting it in one branch causes a TypeScript error on the return type.

**Why it happens:** Multiple return paths per function, easy to miss one in early drafts.

**How to avoid:** Write a single return-type assertion on the function signature before writing the body. TypeScript will flag any return object missing the `gate` property.

### Pitfall 5: `evaluateRestrictedAccess` — ALLOW Condition Logic Inversion

**What goes wrong:** The ALLOW condition is `hasGrant && (sufficientClearance || hasValidEscort)`. A common mistake is to check escort as primary path rather than alternate path: `hasGrant && clearanceOK || escort` (wrong precedence, wrong semantics).

**Why it happens:** The "OR" in the rule ("clearance OR escort") is easily misread as top-level OR instead of parenthesized sub-condition.

**How to avoid:** Explicitly parenthesize: `hasGrant && (CLEARANCE_RANK[clearance] >= CLEARANCE_RANK['RESTRICTED'] || hasValidEscort)`. Check the no-grant case first (early return `NO_GRANT`), then evaluate clearance/escort.

### Pitfall 6: `evaluateSecuredAccess` — Escort Semantics Confusion

**What goes wrong:** Treating `isEscorted` in the SECURED function the same as `hasValidEscort` in RESTRICTED — applying it as an ALLOW unlock. In SECURED, escort does NOT substitute for clearance.

**Why it happens:** The two functions have parallel structure but different semantics for the escort parameter.

**How to avoid:** The escort parameter in SECURED affects only the `detail` string annotation (for audit logging). The ALLOW branch is strictly `hasGrant && CLEARANCE_RANK[clearance] >= CLEARANCE_RANK['SECRET']`. Escort is noted in the detail field of the ALLOW result: `detail: isEscorted ? "escort noted — entry log mandatory" : "entry log mandatory"`.

### Pitfall 7: getAncestors Direction Convention

**What goes wrong:** Returning ancestors in root-first order (root → leaf) when Phase 6 needs parent-first order (leaf → root, direct-parent first = most specific wins).

**Why it happens:** Natural traversal visits parent then grandparent then root — pushing each onto an array gives root-first unless reversed or using push vs unshift.

**How to avoid:** Per D-02, `getAncestors` returns in parent-first order (direct parent first, root last). Use `ancestors.push(parent)` while walking up — the result array is already in parent-first order since each visited parent is appended after the previous one.

### Pitfall 8: `ZoneType` Name Collision with existing `DATA.RESTRICTED` tier

**What goes wrong:** `ZoneType = "CONTROLLED" | "RESTRICTED" | "SECURED"` introduces a `"RESTRICTED"` string value that also appears as a `DATA` tier in `TIERS.DATA`. In the new `Clearance` union, `"RESTRICTED"` also appears. These are three distinct contexts — no actual code collision, but tooling search results can be confusing.

**Why it matters:** Grepping for `"RESTRICTED"` will now return results in `Clearance`, `ZoneType`, and `TIERS.DATA`. Not a runtime issue, but can confuse code review and future changes.

**How to avoid:** The TypeScript type system enforces context — `ZoneType` values are only valid where `ZoneType` is expected. Document in a comment near `ZoneType` that "RESTRICTED" as a ZoneType is distinct from `TIERS.DATA["RESTRICTED"]`.

---

## Code Examples

### Full ZoneNode Inline Test Fixture

```typescript
// Source: inferred from SPEC.md requirement 5 + D-02
const Z_BUILDING_SECURED: ZoneNode = {
  id: "z-bldg-1",
  name: "Classified Research Wing",
  level: "BUILDING",
  zone_type: "SECURED",
  parent_id: "z-site-1",
  admin_org_id: "org-intel",
  asset_owner_org_id: "org-intel",
  requires_explicit_auth: true,
};

const Z_SITE: ZoneNode = {
  id: "z-site-1",
  name: "Main Campus",
  level: "SITE",
  zone_type: "CONTROLLED",
  parent_id: null,
  admin_org_id: "org-intel",
  asset_owner_org_id: "org-intel",
  requires_explicit_auth: false,
};
```

### isValidZoneTypeCombination — All 4 Test Cases (from SPEC acceptance criteria)

```typescript
// Source: 05-SPEC.md requirement 6
expect(isValidZoneTypeCombination("SITE", "SECURED")).toBe(false);
expect(isValidZoneTypeCombination("AREA", "SECURED")).toBe(false);
expect(isValidZoneTypeCombination("BUILDING", "SECURED")).toBe(true);
expect(isValidZoneTypeCombination("SITE", "CONTROLLED")).toBe(true);
```

### evaluateRestrictedAccess — 4 Branch Coverage

```typescript
// Branch 1: no grant
evaluateRestrictedAccess(false, "RESTRICTED", false)
// → { allow: false, reason: "NO_GRANT", gate: "ZONE_TYPE_RULE" }

// Branch 2: grant + sufficient clearance
evaluateRestrictedAccess(true, "RESTRICTED", false)
// → { allow: true, reason: "GRANT_FOUND", gate: "ZONE_TYPE_RULE" }

// Branch 3: grant + insufficient clearance + escort
evaluateRestrictedAccess(true, "UNCLASSIFIED", true)
// → { allow: true, reason: "GRANT_FOUND", gate: "ZONE_TYPE_RULE" }

// Branch 4: grant + insufficient clearance + no escort
evaluateRestrictedAccess(true, "UNCLASSIFIED", false)
// → { allow: false, reason: "INSUFFICIENT_CLEARANCE", gate: "ZONE_TYPE_RULE" }
```

### evaluateSecuredAccess — 3 Branch Coverage

```typescript
// Branch 1: no grant
evaluateSecuredAccess(false, "TOP_SECRET", false)
// → { allow: false, reason: "NO_GRANT", gate: "ZONE_TYPE_RULE" }

// Branch 2: grant + SECRET clearance
evaluateSecuredAccess(true, "SECRET", false)
// → { allow: true, reason: "GRANT_FOUND", gate: "ZONE_TYPE_RULE", detail: "entry log mandatory" }

// Branch 3: grant + insufficient clearance (CONFIDENTIAL = rank 2 < SECRET = rank 3)
evaluateSecuredAccess(true, "CONFIDENTIAL", false)
// → { allow: false, reason: "INSUFFICIENT_CLEARANCE", gate: "ZONE_TYPE_RULE" }
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| 4-tier Clearance (0–3) | 5-tier Clearance (0–4, adding RESTRICTED=1) | Phase 5 | All existing relative comparisons self-correct; rank 1 slot was unoccupied |
| `TIERS.PHYSICAL` string array | Removed (tombstone or Partial type) | Phase 5 | Physical access domain now uses zone-type rules, not ABAC tier ladder |
| No zone hierarchy | `ZoneNode` tree with 5 levels + 3 zone types | Phase 5 | Foundation for Phases 6–8 grant resolution, entry log, UI |

**Deprecated/outdated:**
- `TIERS.PHYSICAL = ["LOBBY", "RESTRICTED_AREA", "SECURE_VAULT"]`: Removed in Phase 5. The ABAC tier model for physical spaces is superseded by the zone model.

---

## Project Constraints (from CLAUDE.md)

| Directive | Applies to Phase 5 |
|-----------|-------------------|
| Tech stack: TypeScript ~5.9.3, React 19, TanStack Router, Vitest 4.0.x | YES — use existing test runner, no new frameworks |
| Routing: TanStack file-based router; routeTree.gen.ts is generated — never hand-edit | NOT APPLICABLE — no route changes in Phase 5 |
| Ports: frontend 15510, backend 15520, postgres 15530, WebSocket 15540 | NOT APPLICABLE — no service changes |
| Testing: Vitest (unit, jsdom) + Playwright (e2e, excluded from Vitest) | YES — new test file goes in Vitest, no Playwright |
| Security: do not regress role-aware UI guards | NOT APPLICABLE — no UI changes in Phase 5 |
| Named exports for all hooks, components, utilities — no default exports except route `_component.tsx` | YES — all new types and functions use named exports |
| No barrel index.ts files — imports reference specific files directly | YES — test imports directly from `./model` |
| Functions: camelCase; Types/interfaces: PascalCase | YES — `evaluateControlledAccess`, `ZoneNode`, etc. |
| String enums stored as SCREAMING_SNAKE_CASE | YES — `ZoneType`, `ZoneLevel`, `ZoneAccessGate`, `ZoneAccessReason` all use SCREAMING_SNAKE_CASE values |
| module-level comment header on every file | YES — new test file needs `// demo/lib/physical-access.test.ts — ...` header |
| `src/demo/lib/` only — no other directories touched | YES — enforced by SPEC constraints section |

---

## Open Questions

1. **TIERS removal strategy: tombstone vs Partial type**
   - What we know: `TIERS: Record<Domain, string[]>` requires all three Domain keys. `TIERS.PHYSICAL` must be removed per SPEC. `abac.ts` and `policy.ts` call `TIERS[domain].indexOf()` without null guards.
   - What's unclear: SPEC says "TIERS no longer has a PHYSICAL key" — tombstone `[]` removes the string literals but keeps the key, which technically violates "no longer has a PHYSICAL key".
   - Recommendation: Use `Partial<Record<Domain, string[]>>` and add `?? -1` null guards in both `abac.ts:52` and `policy.ts:18`. This fully satisfies the SPEC acceptance criterion, keeps TypeScript clean, and is the minimal correct fix. Note: touching `abac.ts` and `policy.ts` is necessary — document this in the plan as a required companion edit.

2. **`detail` field in RESTRICTED ALLOW case**
   - What we know: D-01 specifies `detail?` carries human-readable info. CONTEXT.md specifics for RESTRICTED give examples of DENY detail strings but not the ALLOW detail string.
   - What's unclear: Should a RESTRICTED ALLOW result include a `detail` field? (e.g., `"clearance: RESTRICTED"` or `"escort granted"`)
   - Recommendation: Omit `detail` on ALLOW results for CONTROLLED and RESTRICTED (the reason alone is sufficient). Include `detail` on SECURED ALLOW results to note escort + entry log requirement (Phase 8 audit UI surfaces it). Keep DENY detail strings always populated.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `Partial<Record<Domain, string[]>>` is the correct TypeScript type fix for removing PHYSICAL from TIERS | Pitfall 1 / Pattern 2 | Alternative is tombstone `PHYSICAL: []` — both approaches are valid TypeScript; low risk either way |
| A2 | Empty array tombstone `PHYSICAL: []` satisfies the SPEC acceptance criterion `grep "LOBBY" returns no matches` | Pattern 2 | SPEC might mean the key itself must be absent; use Partial approach to be safe |
| A3 | No test in the 80-test suite hardcodes clearance rank numbers (only relative comparisons) | Pitfall 3 | Confirmed by grep: no `=== 1` or `=== 2` assertions on CLEARANCE_RANK values in test files |
| A4 | `getAncestors` should use parent-first order per D-02 context "most specific wins" traversal | Pattern 5 / Code Examples | If Phase 6 needs root-first order, result must be reversed — verify with Phase 6 consumer |
| A5 | TypeScript version ~5.9.3 is in use (from project CLAUDE.md) | Standard Stack | No runtime impact for this phase; TypeScript version only affects compiler behaviour |

---

## Environment Availability

Step 2.6: All work is pure TypeScript in `frontend/src/demo/lib/`. No external tools, services, CLIs, runtimes, databases, or package managers beyond the existing `npm` + `npx vitest` setup are required. Verified: `npx vitest run` executes successfully (80 tests passing).

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js + npm | Running Vitest | Available | — | — |
| Vitest | All tests | Available | 4.0.x | — |
| TypeScript compiler (tsc) | `tsc -b --noEmit` check | Available | ~5.9.3 | — |

---

## PACS Vendor Domain Research

**Purpose:** Validate zone model design against industry PACS systems (Lenel OnGuard, C•CURE 9000, Gallagher, Genetec, Honeywell Pro-Watch).

**Critical architectural context:** Janus is the **authorization source of truth** that feeds data TO these PACS enforcement layers — it does not replace them. `ZoneAccessResult` is the structured decision payload the integration layer will push to PACS. The PACS enforces at the door; Janus decides who should have access and why.

### Integration Architecture

```
Janus 2.0 (authorization decisions)
  └─ ZoneAccessResult { allow, gate, reason, detail }
       ├─► Lenel OnGuard   → maps to AccessLevel + Segment assignment
       ├─► C•CURE 9000     → maps to Clearance (door group) + CFL gate
       ├─► Gallagher       → maps to AccessGroup + Competency gate
       └─► Genetec Synergis → maps to AccessRule + clearance-level on Area
```

### Vendor Findings Summary

| Our Concept | Lenel OnGuard | C•CURE 9000 | Gallagher | Genetec | Pro-Watch |
|---|---|---|---|---|---|
| ZoneLevel tree | Flat Areas (APB only) | Flat Areas (APB only) | Flat Access Zones | Nested Areas (opt-in, ≤3 levels) | Site→Channel→Panel (hardware) |
| ZoneType (CONTROLLED/RESTRICTED/SECURED) | Reader mode (card/card+PIN) | CFL on reader + clearance | statusFlags + competency | Min. clearance level + escort rule | Auth-required clearance code flag |
| Clearance (0–4 tier) | No native tier; custom extension | CFL (1–6, lockdown urgency scale, NOT classification) | Competency (named, date-bound) | 0–7 (inverted: 0=highest) | Naming convention only |
| Explicit grant | AccessLevel (reader+schedule bundle) | Clearance (door group + schedule) | AccessGroup membership | AccessRule assignment | ClearanceCode assignment |
| Escort gate | Area-specific chaperone flag | Dual-swipe (both must badge) | Visitor credential provisioning | Area-level visitor escort rule | Per-door escort requirement |
| admin_org_id | Segment (admin/visibility boundary) | Partition | Division | Partition | Partition |
| asset_owner_org_id | No equivalent | No equivalent | No equivalent | No equivalent | No equivalent |
| Zone inheritance | No native | No native | No native | Area nesting (explicit config) | No native |

### Key Validations for Phase 5

1. **Two-gate pattern is industry-aligned.** C•CURE CFL (threshold gate) + Clearance (grant gate) is exactly our `GRANT_LOOKUP` + `ZONE_TYPE_RULE` two-gate model. The pattern is well-established.

2. **Escort semantics confirmed correct.** All five vendors implement escort as a zone-level rule (not just a person attribute). RESTRICTED allows escort as alternate path; SECURED does not — validated by Lenel's area-specific escort + C•CURE's escort model that doesn't override CFL requirements.

3. **`ZoneAccessResult.detail` is the PACS audit payload.** The `detail` field (e.g., `"clearance: CONFIDENTIAL, required: SECRET"`, `"escort noted — entry log mandatory"`) is exactly what PACS audit logs and integration middleware need. Keep it.

4. **Our ZoneLevel hierarchy is richer than any vendor.** No vendor has a native SITE→AREA→BUILDING→ZONE→ROOM hierarchy. We are building a superset; PACS integration will map our levels to their flat area/partition constructs.

5. **admin_org_id / asset_owner_org_id has no PACS precedent.** All vendors have a single partition/division per zone. Our dual-org ownership is a deliberate addition. When mapping to PACS, admin_org_id maps to the PACS partition owner; asset_owner_org_id is metadata kept in Janus only.

6. **Clearance direction convention matters for integration.** Genetec uses 0=highest (inverted). Document clearly in Phase 5 that our UNCLASSIFIED=0 / TOP_SECRET=4 convention is ascending (higher number = higher clearance).

7. **NATO alignment confirmed.** NATO Class I Security Area ≈ our `SECURED` (classified info access). NATO Class II ≈ our `RESTRICTED`. US Army FM 3-19-30 Controlled/Limited/Exclusion areas = our CONTROLLED/RESTRICTED/SECURED. The 5-tier ladder matches NATO NR/NC/NS/CTS + UNCLASSIFIED.

### No Phase 5 Scope Changes

Vendor research confirms Phase 5 implementation is unchanged. The model is architecturally sound and richer than industry baselines. No new fields or functions needed in Phase 5 as a result of this research.

---

## Sources

### Primary (HIGH confidence)

- `frontend/src/demo/lib/model.ts` — Verified current state: 4-tier Clearance, CLEARANCE_RANK ranks 0–3, TIERS with PHYSICAL key, full type structure
- `frontend/src/demo/lib/abac.ts` — Verified: uses `CLEARANCE_RANK` and `TIERS[domain].indexOf()`, all comparisons relative
- `frontend/src/demo/lib/policy.ts` — Verified: uses `CLEARANCE_RANK` and `TIERS[domain].indexOf()`, same pattern
- `frontend/src/demo/lib/policy.test.ts` — Verified: canonical test pattern — inline fixtures, describe/it/expect, imports from lib only
- `frontend/src/demo/lib/seed.ts` — Verified: re-exports `TIERS` from model; PHYSICAL tier string values in subjects/resources are plain `string` fields, not typed against TIERS
- `.planning/phases/05-zone-model-access-rules/05-CONTEXT.md` — Locked decisions D-01 through D-05
- `.planning/phases/05-zone-model-access-rules/05-SPEC.md` — 9 locked requirements with acceptance criteria
- Vitest run output — Verified: 80 tests passing, 12 test files, baseline established

### Secondary (MEDIUM confidence)

- CLAUDE.md (project) — Naming conventions, export patterns, test conventions verified against existing files

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified existing tools, no new packages
- Architecture: HIGH — single file change surface confirmed by codebase grep
- Pitfalls: HIGH — TIERS typing issue confirmed by reading type annotation; clearance rank shift safety confirmed by grep of test assertions
- Test patterns: HIGH — verified from policy.test.ts canonical example

**Research date:** 2026-05-23
**Valid until:** 2026-06-22 (30 days — stable TypeScript project)
