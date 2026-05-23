# Phase 5: Zone Model & Access Rules — Pattern Map

**Mapped:** 2026-05-23
**Files analyzed:** 2 (1 modified, 1 new)
**Analogs found:** 2 / 2

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `frontend/src/demo/lib/model.ts` | model / utility | transform | self (existing file being extended) | exact |
| `frontend/src/demo/lib/physical-access.test.ts` | test | request-response | `frontend/src/demo/lib/policy.test.ts` | exact |

---

## Pattern Assignments

### `frontend/src/demo/lib/model.ts` (model, transform) — MODIFIED

**Analog:** self — read current state before editing.

#### Current file header (lines 1–5) — preserve verbatim

```typescript
// demo/lib/model.ts — FROZEN unified world schema for the Authorization Hub demo.
// D-05: field set is frozen here for the whole milestone; do NOT reshape in P2/P3.
// D-10: UnitId (6 canonical units) is the single entity-id type; spike 3-entity scaffolding retired.
// D-11: authorization lifecycle fields are present (seed-only; evaluated in Phase 3, OQ-B).
```

#### Clearance block to REPLACE (lines 6–19)

Current state (lines 6–19):
```typescript
// --- Clearance ladder (lifted verbatim from data.ts:4-14) ---

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
```

Replacement (insert `"RESTRICTED"` at position 2; shift all remaining ranks up by 1):
```typescript
// --- Clearance ladder (lifted verbatim from data.ts:4-14) ---

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

#### TIERS block to REPLACE (lines 27–31)

Current state (lines 27–31):
```typescript
export const TIERS: Record<Domain, string[]> = {
  COMPUTER: ["STANDARD", "PRIVILEGED", "ROOT"],
  DATA: ["INTERNAL", "RESTRICTED", "CLASSIFIED"],
  PHYSICAL: ["LOBBY", "RESTRICTED_AREA", "SECURE_VAULT"],
};
```

Replacement — remove `PHYSICAL` key, change type annotation to `Partial<Record<>>`:
```typescript
export const TIERS: Partial<Record<Domain, string[]>> = {
  COMPUTER: ["STANDARD", "PRIVILEGED", "ROOT"],
  DATA: ["INTERNAL", "RESTRICTED", "CLASSIFIED"],
};
```

**Companion edits required in downstream consumers (see Shared Patterns below):**
- `abac.ts` line 52: `tierRank` helper must guard against `undefined`
- `policy.ts` line 18: `tierRank` helper must guard against `undefined`

#### New block to INSERT — Zone types and access functions

Insert after line 31 (after the closing `};` of `TIERS`) and before the `// --- D-10: UnitId` comment at line 33. Add a blank line separator above and below.

Pattern for new type definitions (follows existing string-union style throughout model.ts):
```typescript
// --- Zone hierarchy types (Phase 5: zone model foundation) ---
// NOTE: "RESTRICTED" as ZoneType is distinct from TIERS.DATA["RESTRICTED"] and Clearance["RESTRICTED"].

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

Pattern for access-rule functions (pure evaluators — mirrors `evaluate()` in `abac.ts` lines 61–137; uses `CLEARANCE_RANK` directly per D-04):
```typescript
// --- Zone access rule functions (Phase 5: CONTROLLED / RESTRICTED / SECURED) ---

export function isValidZoneTypeCombination(
  level: ZoneLevel,
  zone_type: ZoneType,
): boolean {
  if (zone_type === 'SECURED' && (level === 'SITE' || level === 'AREA')) {
    return false;
  }
  return true;
}

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
  return {
    allow: false,
    gate: 'ZONE_TYPE_RULE',
    reason: 'INSUFFICIENT_CLEARANCE',
    detail: `clearance: ${clearance}, required: RESTRICTED`,
  };
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
  return {
    allow: false,
    gate: 'ZONE_TYPE_RULE',
    reason: 'INSUFFICIENT_CLEARANCE',
    detail: `clearance: ${clearance}, required: SECRET`,
  };
}
```

Pattern for tree helpers (pure traversal — no external imports; follows Map-based lookup pattern):
```typescript
// --- Zone tree traversal helpers (Phase 5: D-02) ---

// Returns parent-first chain: [direct-parent, grandparent, ..., root]
// Phase 6 uses this for grant resolution (leaf-first = most specific wins).
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

// Returns all transitive descendants (not just direct children).
// Phase 8 tree rendering uses this for full subtree expansion.
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

---

### `frontend/src/demo/lib/physical-access.test.ts` (test) — NEW

**Analog:** `frontend/src/demo/lib/policy.test.ts` (exact match — same test style, same project, same lib directory)

#### File header pattern (from policy.test.ts line 1–2)

```typescript
// demo/lib/physical-access.test.ts — Vitest unit tests for Phase 5 zone access rules.
// Covers: isValidZoneTypeCombination, evaluateControlledAccess, evaluateRestrictedAccess,
//         evaluateSecuredAccess, getAncestors, getDescendants.
```

#### Import pattern (from policy.test.ts lines 4–7)

```typescript
import { describe, it, expect } from "vitest";
import {
  isValidZoneTypeCombination,
  evaluateControlledAccess,
  evaluateRestrictedAccess,
  evaluateSecuredAccess,
  getAncestors,
  getDescendants,
  type ZoneNode,
} from "./model";
```

No imports from `./seed` — inline fixtures only (D3-13 pattern).

#### Inline fixture pattern (from policy.test.ts lines 11–43)

```typescript
// Inline fixtures — no seed.ts imports (D3-13 pattern).
// Use minimal ZoneNode objects with only the fields needed per test.

const Z_SITE: ZoneNode = {
  id: 'z-site-1',
  name: 'Main Campus',
  level: 'SITE',
  zone_type: 'CONTROLLED',
  parent_id: null,
  admin_org_id: 'org-a',
  asset_owner_org_id: 'org-a',
  requires_explicit_auth: false,
};

const Z_BUILDING: ZoneNode = {
  id: 'z-bldg-1',
  name: 'Classified Research Wing',
  level: 'BUILDING',
  zone_type: 'SECURED',
  parent_id: 'z-site-1',
  admin_org_id: 'org-intel',
  asset_owner_org_id: 'org-intel',
  requires_explicit_auth: true,
};
```

#### describe/it/expect block pattern (from policy.test.ts lines 70–85)

Each describe block covers exactly one function. At least 2 `it` cases per function. Assertions target `.allow`, `.reason`, `.gate`, `.detail` on the return value:

```typescript
describe("isValidZoneTypeCombination", () => {
  it("returns false for SITE + SECURED (ceiling rule)", () => {
    expect(isValidZoneTypeCombination("SITE", "SECURED")).toBe(false);
  });
  it("returns false for AREA + SECURED", () => {
    expect(isValidZoneTypeCombination("AREA", "SECURED")).toBe(false);
  });
  it("returns true for BUILDING + SECURED", () => {
    expect(isValidZoneTypeCombination("BUILDING", "SECURED")).toBe(true);
  });
  it("returns true for SITE + CONTROLLED (non-SECURED always valid)", () => {
    expect(isValidZoneTypeCombination("SITE", "CONTROLLED")).toBe(true);
  });
});

describe("evaluateControlledAccess", () => {
  it("ALLOW when hasGrant is true", () => {
    const r = evaluateControlledAccess(true);
    expect(r.allow).toBe(true);
    expect(r.reason).toBe("GRANT_FOUND");
    expect(r.gate).toBe("ZONE_TYPE_RULE");
  });
  it("DENY when hasGrant is false", () => {
    const r = evaluateControlledAccess(false);
    expect(r.allow).toBe(false);
    expect(r.reason).toBe("NO_GRANT");
  });
});
```

#### CLEARANCE_RANK assertion pattern (from SPEC acceptance criteria)

The test file must assert new rank values to satisfy the SPEC:
```typescript
import { CLEARANCE_RANK } from "./model";

describe("CLEARANCE_RANK — 5-tier ladder", () => {
  it("RESTRICTED is rank 1", () => {
    expect(CLEARANCE_RANK["RESTRICTED"]).toBe(1);
  });
  it("CONFIDENTIAL is rank 2 after inserting RESTRICTED", () => {
    expect(CLEARANCE_RANK["CONFIDENTIAL"]).toBe(2);
  });
});
```

---

## Shared Patterns

### CLEARANCE_RANK Comparison (applies to all 3 rule functions in model.ts)

**Source:** `frontend/src/demo/lib/abac.ts` line 50–52
**Apply to:** `evaluateRestrictedAccess`, `evaluateSecuredAccess` in model.ts

```typescript
// abac.ts:50-52 — canonical pattern for clearance rank comparison
const rank = (c: Clearance): number => CLEARANCE_RANK[c] ?? -1;
// Usage: rank(principal.clearance) >= rank(req.minClearance)

// Phase 5 rule functions use the same pattern inline (D-04 decision):
CLEARANCE_RANK[clearance] >= CLEARANCE_RANK['RESTRICTED']
CLEARANCE_RANK[clearance] >= CLEARANCE_RANK['SECRET']
```

### tierRank Null Guard (REQUIRED companion edit — applies to abac.ts and policy.ts)

**Source:** `frontend/src/demo/lib/abac.ts` line 52 (current unsafe state) and `frontend/src/demo/lib/policy.ts` line 18 (current unsafe state)

**Apply to:** Both `tierRank` helpers after `TIERS` type changes to `Partial<Record<Domain, string[]>>`

Current (unsafe after type change):
```typescript
// abac.ts:52
const tierRank = (domain: Domain, tier: string): number =>
  TIERS[domain].indexOf(tier);

// policy.ts:15-18
const tierRank = (
  domain: NonNullable<Requirement["domain"]>,
  tier: string,
): number => TIERS[domain].indexOf(tier);
```

Required fix in both files:
```typescript
// abac.ts:52 — after TIERS type becomes Partial<Record<Domain, string[]>>
const tierRank = (domain: Domain, tier: string): number =>
  TIERS[domain]?.indexOf(tier) ?? -1;

// policy.ts:15-18 — same fix
const tierRank = (
  domain: NonNullable<Requirement["domain"]>,
  tier: string,
): number => TIERS[domain]?.indexOf(tier) ?? -1;
```

Semantic safety: `TIERS["PHYSICAL"]` is now `undefined`. `undefined?.indexOf(...)` returns `undefined`, `?? -1` returns `-1`. Any tier comparison with rank `-1` is always insufficient — correct DENY behavior for PHYSICAL domain under zone model.

### String Union Type Convention (applies to all new types in model.ts)

**Source:** `frontend/src/demo/lib/model.ts` lines 8–12, 23, 36–42 (all existing domain types)
**Apply to:** `ZoneLevel`, `ZoneType`, `ZoneAccessGate`, `ZoneAccessReason`

```typescript
// Established pattern — ALL domain values use string union, never TypeScript enum keyword
export type Domain = "COMPUTER" | "DATA" | "PHYSICAL";
export type Deployment = "HOME" | "ABROAD";
// NOT: enum Domain { COMPUTER, DATA, PHYSICAL }
```

### Named Export Convention (applies to all new types and functions)

**Source:** `frontend/src/demo/lib/model.ts` throughout; `frontend/src/demo/lib/policy.test.ts` line 5
**Apply to:** All Phase 5 additions

```typescript
// All exports are named — no default exports in lib files
export type ZoneLevel = ...
export interface ZoneNode { ... }
export function evaluateControlledAccess(...) { ... }
// Never: export default function ...
```

### Module-Level Comment Header

**Source:** `frontend/src/demo/lib/model.ts` line 1; `frontend/src/demo/lib/policy.test.ts` line 1
**Apply to:** `physical-access.test.ts` (new file)

```typescript
// demo/lib/physical-access.test.ts — Vitest unit tests for Phase 5 zone access rules.
```

---

## Downstream Consumer Verification

After modifying `model.ts`, these files import from it and must be verified to still compile:

| File | Imports from model.ts | Risk |
|------|-----------------------|------|
| `frontend/src/demo/lib/abac.ts` | `CLEARANCE_RANK`, `TIERS`, types | `tierRank` at line 52 breaks TypeScript — requires null guard fix |
| `frontend/src/demo/lib/policy.ts` | `CLEARANCE_RANK`, `TIERS`, types | `tierRank` at line 18 breaks TypeScript — requires null guard fix |
| `frontend/src/demo/lib/seed.ts` | re-exports `ROLES`, `TIERS`, `UNITS`, types | `TIERS` no longer has `PHYSICAL` key — re-export is fine, callers that do `TIERS.PHYSICAL` will get `undefined` (compile-time TypeScript flags if any) |
| `frontend/src/demo/lib/contract.ts` | types only | No risk |
| `frontend/src/demo/lib/obligations.ts` | `UnitId`, `Subunit`, `Resource` | No risk |
| `frontend/src/demo/lib/credential.ts` | `AttrClaims`, `Credential` | No risk |
| `frontend/src/demo/lib/auditlog.ts` | `Subject`, `AttrEvent` | No risk |
| `frontend/src/demo/lib/abac.test.ts` | via `./seed` | No PHYSICAL-domain evaluate() calls in existing 80 tests — confirmed safe |
| `frontend/src/demo/lib/policy.test.ts` | `EntityPolicy` type | No risk |

**Verification command:** `cd /Users/vidarbrevik/projects/janus-2.0/frontend && npx tsc -b --noEmit`

---

## No Analog Found

No files in this phase lack analogs. Both targets have exact matches:
- `model.ts` is itself the analog (extend in place)
- `physical-access.test.ts` maps exactly to `policy.test.ts`

---

## Metadata

**Analog search scope:** `frontend/src/demo/lib/`
**Files scanned:** model.ts, abac.ts, policy.ts, policy.test.ts, abac.test.ts, seed.ts
**Pattern extraction date:** 2026-05-23
