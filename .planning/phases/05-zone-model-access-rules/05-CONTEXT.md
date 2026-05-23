# Phase 5: Zone Model & Access Rules - Context

**Gathered:** 2026-05-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Extend `frontend/src/demo/lib/model.ts` with a 5-tier clearance ladder, complete zone hierarchy types, tree traversal helpers, and three access-rule functions — all fully tested. No UI, no seed data, no backend changes. Every downstream phase (grants, entry log, demo UI) imports directly from `model.ts`.

</domain>

<spec_lock>
## Requirements (locked via SPEC.md)

**9 requirements are locked.** See `05-SPEC.md` for full requirements, boundaries, and acceptance criteria.

Downstream agents MUST read `05-SPEC.md` before planning or implementing. Requirements are not duplicated here.

**In scope (from SPEC.md):**
- Extending `model.ts` with `Clearance` (5-tier), `ZoneLevel`, `ZoneType`, `ZoneNode`, `ZoneAccessResult`
- Removing `TIERS.PHYSICAL` from `model.ts`
- Three access-rule functions (`evaluateControlledAccess`, `evaluateRestrictedAccess`, `evaluateSecuredAccess`)
- `isValidZoneTypeCombination` ceiling-rule function
- Vitest unit tests for all 4 functions (covering ≥2 branches each) in `physical-access.test.ts`
- TypeScript compilation clean across the project after changes

**Out of scope (from SPEC.md):**
- `PhysicalAccessGrant` type — Phase 6
- `ZoneAccessDelegate` type — Phase 6
- Two-gate resolution (ACCESS-05) — Phase 6
- `ZoneEntryLog` and `ZoneVisitorPass` — Phase 7
- Mock dataset with zone tree data — Phase 8
- Demo UI (Zone Browser, Resolution Explorer, Entry Log view) — Phase 8
- Any Rust/PostgreSQL backend changes — future milestone
- Existing demo components or routes (no UI changes in Phase 5)

</spec_lock>

<decisions>
## Implementation Decisions

### D-01: ZoneAccessResult — rich type with gate field

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

- Phase 5 rule functions always emit `gate: 'ZONE_TYPE_RULE'`.
- Phase 6 creates `gate: 'GRANT_LOOKUP'` results independently when evaluating grant existence.
- `reason` is a typed string union — exhaustive switch in Phase 8 UI, no typos.
- `detail?` carries human-readable supplementary info (e.g., `"clearance: CONFIDENTIAL, required: SECRET"` or `"escort noted"`).

### D-02: Tree traversal helpers — included in Phase 5

Two helper functions added to `model.ts` alongside type definitions:

```typescript
export function getAncestors(zoneId: string, allZones: ZoneNode[]): ZoneNode[]
export function getDescendants(zoneId: string, allZones: ZoneNode[]): ZoneNode[]
```

- `getAncestors`: returns ordered chain from direct parent to root (leaf → root). Phase 6 walks this chain for grant resolution (leaf-first = most specific wins).
- `getDescendants`: returns all descendants (not just direct children) — for Phase 8 Zone Browser tree rendering.
- Both tested in `physical-access.test.ts`.
- Note: these extend the SPEC scope (SPEC covers types + rule functions only). Treat as additions, not SPEC violations.

### D-03: Escort parameter naming — RESTRICTED vs SECURED differ

**`evaluateRestrictedAccess`** signature:
```typescript
export function evaluateRestrictedAccess(
  hasGrant: boolean,
  clearance: Clearance,
  hasValidEscort: boolean,   // renamed from isEscorted
): ZoneAccessResult
```
- `hasValidEscort` — signals the caller (Phase 6 resolver) has already verified the escort holds an active grant. Phase 5 trusts this boolean and applies the rule.

**`evaluateSecuredAccess`** signature:
```typescript
export function evaluateSecuredAccess(
  hasGrant: boolean,
  clearance: Clearance,
  isEscorted: boolean,       // does NOT affect ALLOW/DENY in SECURED
): ZoneAccessResult
```
- `isEscorted` in SECURED: does not substitute for clearance. Passed through to `detail` annotation only (e.g., `"escort noted — entry log mandatory"`). Phase 8 audit UI can surface it.

### D-04: Clearance rank comparisons — CLEARANCE_RANK directly

Use `CLEARANCE_RANK[clearance] >= CLEARANCE_RANK['RESTRICTED']` in rule functions. Consistent with `abac.ts` pattern. No new `compareClearance()` helper.

### D-05: Clearance rank update strategy

- New ranks: `UNCLASSIFIED=0, RESTRICTED=1, CONFIDENTIAL=2, SECRET=3, TOP_SECRET=4`
- All comparisons in `abac.ts` and `policy.ts` are relative (`>=`, `<`), not hardcoded numerics — existing tests self-correct.
- **Implementation order:** Run `npx vitest run` BEFORE touching `model.ts` to establish the 80-test green baseline. Make changes. Re-run. Any regression is immediately visible.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase requirements
- `.planning/phases/05-zone-model-access-rules/05-SPEC.md` — Locked requirements — MUST read before planning. Contains full type contracts, function signatures, boundaries, and acceptance criteria.
- `.planning/REQUIREMENTS.md` — Phase 5 requirements: ZONE-01 through ZONE-05, ACCESS-01 through ACCESS-04

### Existing model (change target)
- `frontend/src/demo/lib/model.ts` — The file being modified. Contains current `Clearance`, `CLEARANCE_RANK`, `TIERS` (including PHYSICAL to remove), `Subject`, `Resource`, and all existing demo types.
- `frontend/src/demo/lib/abac.ts` — Uses `CLEARANCE_RANK` for numeric comparisons — verify no regressions after rank shift.

### Test patterns
- `frontend/src/demo/lib/policy.test.ts` — Preferred test pattern: inline fixtures (no seed.ts imports). Follow this for `physical-access.test.ts`.
- `frontend/src/demo/lib/abac.test.ts` — Alternative pattern: imports from seed.ts. Avoid for Phase 5 (seed changes deferred to Phase 8).

### Downstream consumers (read for interface awareness)
- `frontend/src/demo/lib/seed.ts` — Existing clearance values used by subjects (no changes in Phase 5, but must remain valid after RESTRICTED is added to the union).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `CLEARANCE_RANK: Record<Clearance, number>` in `model.ts` — extend with `RESTRICTED: 1` and shift remaining ranks. Direct reuse in rule functions.
- `Clearance` type union in `model.ts` — insert `"RESTRICTED"` between `"UNCLASSIFIED"` and `"CONFIDENTIAL"`.
- `TIERS.PHYSICAL` in `model.ts` — delete this entry only; `Domain` union stays unchanged.

### Established Patterns
- **Type exports:** All new types exported as named exports from `model.ts` (no default exports, no barrel files).
- **Vitest test style:** `describe/it/expect` with inline fixtures — see `policy.test.ts`. Import only from the lib file under test.
- **Function naming:** `camelCase` for functions, `PascalCase` for types/interfaces — per CONVENTIONS.md.
- **Typed string unions for domain values:** `Clearance`, `Domain`, `RoleId`, `Op` all use TypeScript string union types (not enums). New types follow the same pattern.

### Integration Points
- `frontend/src/demo/lib/model.ts` — single file, single change surface. All new exports appear here.
- `frontend/src/demo/lib/physical-access.test.ts` — new test file (does not yet exist). Lives alongside other `*.test.ts` files in the same directory.
- No route tree changes. No `DemoRoot.tsx` changes. No `vite.config.ts` changes — Vitest autodiscovers `*.test.ts`.

</code_context>

<specifics>
## Specific Ideas

- `evaluateControlledAccess` is the simplest rule: `hasGrant ? allow : deny`. No clearance check — CONTROLLED is authorization-only.
- `evaluateRestrictedAccess` ALLOW condition: `hasGrant && (CLEARANCE_RANK[clearance] >= CLEARANCE_RANK['RESTRICTED'] || hasValidEscort)`
- `evaluateSecuredAccess` ALLOW condition: `hasGrant && CLEARANCE_RANK[clearance] >= CLEARANCE_RANK['SECRET']` — escort does NOT unlock SECURED.
- `isValidZoneTypeCombination('SITE', 'SECURED')` → `false`; `isValidZoneTypeCombination('AREA', 'SECURED')` → `false`; all other combinations → `true`.
- `getAncestors` walks `parent_id` chain from the starting node up to root (null parent_id). Returns nodes in parent-first order (direct parent first, root last) — matches Phase 6's "most specific wins" traversal.
- `getDescendants` returns all transitive descendants (not just direct children) — Phase 8 tree rendering needs full subtrees.
- Test file: `physical-access.test.ts` covers all 4 functions + 2 tree helpers with ≥2 branches each.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 5-zone-model-access-rules*
*Context gathered: 2026-05-23*
