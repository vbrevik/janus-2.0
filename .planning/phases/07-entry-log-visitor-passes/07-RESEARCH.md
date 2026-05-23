# Phase 7: Entry Log & Visitor Passes - Research

**Researched:** 2026-05-23
**Domain:** TypeScript model extension — pure in-memory types and functions in `model.ts`
**Confidence:** HIGH

## Summary

Phase 7 is a pure TypeScript append operation. There are no new packages, no new files, no framework integrations, and no external dependencies. The entire deliverable is two interfaces and three functions appended to `frontend/src/demo/lib/model.ts`, plus Vitest test cases appended to `frontend/src/demo/lib/physical-access.test.ts`.

The existing codebase has been fully read. The Phase 5/6 code is in excellent shape: exports are all named, patterns are consistent, the test file uses inline fixtures, and the TypeScript strict mode is active. Phase 7 must follow the established pattern precisely — same section header style, same `string | null` (not `?`) for nullable fields, same `now: Date` explicit parameter style, and same `describe/it/expect` test structure.

Current test baseline: **104 tests passing** across 5 test files. `tsc -b --noEmit` exits 0. Both must remain true after Phase 7.

**Primary recommendation:** Append Phase 7 code after the last line of `isDelegateActive` (line 323 in current `model.ts`) and before the `// --- D-10: UnitId ---` section comment. Append Phase 7 tests after the last `describe("resolveZoneAccess", ...)` block (line 816, end of file) in `physical-access.test.ts`.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** All new types and functions appended at end of `model.ts`, after the existing Phase 6 exports (after `isDelegateActive`). No new files.
- **D-02:** Tests appended at end of `physical-access.test.ts`, after existing Phase 6 describe blocks. Two new top-level describe blocks: `describe("ZoneEntryLog")` and `describe("ZoneVisitorPass")`.
- **D-03:** Section headers: `// --- Phase 7: Entry log and visitor pass types ---` (matching Phase 5/6 header style in model.ts).
- **D-04:** Error strings are descriptive (not short codes): `"ESCORT entry requires escort_person_id"`, `"CARD entry must not have escort_person_id"`, `"SECURED zone requires a ZoneEntryLog entry"`. Consistent with `detail` strings already returned by `evaluateRestrictedAccess`/`evaluateSecuredAccess`.
- **D-05:** `getActiveVisitorPasses` uses inclusive boundaries on both ends: `pass.valid_from <= now && pass.valid_until >= now`. Matches `isGrantActive` semantics exactly.

### Claude's Discretion

All other choices (import ordering, test fixture naming, comment style) follow Phase 5/6 patterns.

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| LOG-01 | `ZoneEntryLog` interface: id, person_id, zone_id, entry_at, exit_at (nullable), method (CARD/ESCORT), escort_person_id (nullable) | Fully specified; interface pattern matches Phase 6 `PhysicalAccessGrant` |
| LOG-02 | `validateEntryLog(entry): string \| null` — ESCORT requires escort_person_id; CARD must not have it | Pattern matches Phase 5/6 evaluator return shapes; `string \| null` is the established validator return type |
| LOG-03 | `validateSecuredZoneEntry(zone, entry): string \| null` — SECURED zone mandates non-null entry; non-SECURED always null | Uses existing `ZoneNode` type; short-circuit on `zone.zone_type !== "SECURED"` |
| VISIT-01 | `ZoneVisitorPass` interface: id, entry_log_id, escort_person_id, zone_id, valid_from, valid_until | Linked via entry_log_id; caller supplies both objects; valid_until is required (not optional) |
| VISIT-02 | Pass linkage: `ZoneVisitorPass.entry_log_id` references `ZoneEntryLog.id`; valid_from/valid_until are caller-supplied | Type-system linkage only (string reference); no runtime enforcement needed at model level |
| VISIT-03 | `getActiveVisitorPasses(zoneId, allPasses, now): ZoneVisitorPass[]` — inclusive boundaries matching `isGrantActive` | Filter pattern is identical to `isGrantActive` null-boundary logic; `ZoneVisitorPass.valid_from/valid_until` are non-nullable (no null-boundary handling needed) |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| ZoneEntryLog type definition | Demo model layer (`model.ts`) | — | All domain types live in model.ts per D-01; no UI/API layer involved |
| ZoneVisitorPass type definition | Demo model layer (`model.ts`) | — | Same as above |
| validateEntryLog | Demo model layer (`model.ts`) | — | Pure function on a model type; zero dependencies |
| validateSecuredZoneEntry | Demo model layer (`model.ts`) | — | Uses existing `ZoneNode` type already in model.ts |
| getActiveVisitorPasses | Demo model layer (`model.ts`) | — | Pure query over in-memory slice; no backend |
| Test coverage | Vitest unit layer (`physical-access.test.ts`) | — | All demo lib tests are co-located in this file per Phase 5/6 pattern |

## Standard Stack

### Core
No new packages. Phase 7 uses only the existing project TypeScript setup.

| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| TypeScript | ~5.9.3 | Type interfaces and functions | Project-wide; already configured |
| Vitest | 4.0.x | Unit test runner | Project standard for frontend unit tests |

### No New Packages Required
Phase 7 is a pure TypeScript extension of `model.ts`. No npm installs needed.

## Package Legitimacy Audit

No packages are installed in this phase. Audit not applicable.

## Architecture Patterns

### System Architecture Diagram

```
physical-access.test.ts
        │
        │ imports
        ▼
frontend/src/demo/lib/model.ts
  ┌─────────────────────────────────────────────────────────┐
  │ Phase 5 types: ZoneNode, ZoneType, Clearance, ...        │
  │ Phase 5 fns:  evaluateControlledAccess,                  │
  │               evaluateRestrictedAccess,                  │
  │               evaluateSecuredAccess,                     │
  │               getAncestors, getDescendants               │
  │──────────────────────────────────────────────────────────│
  │ Phase 6 types: PhysicalAccessGrant, ZoneAccessDelegate   │
  │ Phase 6 fns:  isGrantActive, resolveGrant,               │
  │               resolveZoneAccess, isDelegateActive         │
  │──────────────────────────────────────────────────────────│
  │ Phase 7 types: ZoneEntryLog, ZoneVisitorPass  ← NEW      │
  │ Phase 7 fns:  validateEntryLog,               ← NEW      │
  │               validateSecuredZoneEntry,        ← NEW      │
  │               getActiveVisitorPasses           ← NEW      │
  └─────────────────────────────────────────────────────────┘
        │
        │ will be consumed by
        ▼
  Phase 8: seed data constructors + demo UI
```

### Recommended Project Structure

No structural changes. Everything appends to existing files:

```
frontend/src/demo/lib/
├── model.ts                  ← append Phase 7 section after isDelegateActive
└── physical-access.test.ts   ← append two describe blocks at end of file
```

### Exact Insertion Points (VERIFIED by reading files)

**model.ts insertion point:** After line 323 (closing brace of `isDelegateActive`), before line 325 (`// --- D-10: UnitId ---`). The Phase 7 section goes between Phase 6 functions and the UnitId/general types block.

**physical-access.test.ts insertion point:** After line 816 (closing brace of `describe("resolveZoneAccess", ...)`, which is the last line of the file). Two new top-level describe blocks appended at end.

**physical-access.test.ts import line:** Line 6–22 currently imports from `./model`. Phase 7 needs to add `ZoneEntryLog`, `ZoneVisitorPass`, `validateEntryLog`, `validateSecuredZoneEntry`, `getActiveVisitorPasses` to the import list. `type ZoneNode` is already imported and available for `validateSecuredZoneEntry` tests.

### Pattern 1: Interface Declaration

`[VERIFIED: reading model.ts]` — All interfaces follow this pattern:

```typescript
// --- Phase 7: Entry log and visitor pass types ---

/**
 * JSDoc describing the interface purpose.
 */
export interface ZoneEntryLog {
  id: string;
  person_id: string;
  zone_id: string;
  entry_at: Date;
  exit_at: Date | null;
  method: "CARD" | "ESCORT";
  escort_person_id: string | null;
}
```

Key rules (verified from Phase 6 interfaces):
- Named `export interface`, never `export type`
- snake_case field names
- Nullable fields as `Type | null`, NOT `field?: Type` — both are distinct and the project uses `| null` exclusively for "present but possibly null" fields
- JSDoc comment above interface (not inline)

### Pattern 2: Validator Function

`[VERIFIED: reading model.ts evaluateRestrictedAccess/evaluateSecuredAccess]` — Validators returning `string | null`:

```typescript
// --- LOG-02: validateEntryLog — ESCORT/CARD method constraint ---
export function validateEntryLog(entry: ZoneEntryLog): string | null {
  if (entry.method === "ESCORT" && entry.escort_person_id === null) {
    return "ESCORT entry requires escort_person_id";
  }
  if (entry.method === "CARD" && entry.escort_person_id !== null) {
    return "CARD entry must not have escort_person_id";
  }
  return null;
}
```

Key rules:
- Section header comment matches Phase 5/6 style: `// --- REQ-ID: functionName — description ---`
- Return type is `string | null` explicitly
- Error strings are descriptive sentences (D-04), not codes
- No internal `Date.now()` or side effects — pure functions

### Pattern 3: Array Query Function

`[VERIFIED: reading isGrantActive in model.ts]` — Time-window filter matching `isGrantActive` semantics:

```typescript
// --- VISIT-03: getActiveVisitorPasses — active pass query ---
export function getActiveVisitorPasses(
  zoneId: string,
  allPasses: ZoneVisitorPass[],
  now: Date,
): ZoneVisitorPass[] {
  return allPasses.filter(
    (pass) =>
      pass.zone_id === zoneId &&
      pass.valid_from <= now &&
      pass.valid_until >= now,
  );
}
```

Key difference from `isGrantActive`: `ZoneVisitorPass.valid_from` and `valid_until` are **not nullable** (no `Date | null`). They are required `Date` fields (caller always sets them). So no null-boundary guard needed — simpler than `isGrantActive`.

### Pattern 4: Test Describe Block Structure

`[VERIFIED: reading physical-access.test.ts]` — Each describe block uses inline fixtures at describe scope:

```typescript
describe("ZoneEntryLog", () => {
  // Fixtures declared at describe scope (SCREAMING_CASE names, per Phase 6 pattern)
  const ENTRY_CARD: ZoneEntryLog = { ... };
  const ENTRY_ESCORT: ZoneEntryLog = { ... };
  const NOW = new Date("2026-01-15T12:00:00Z"); // reuse Phase 6 NOW value

  describe("validateEntryLog", () => {
    it("returns null for valid CARD entry (no escort_person_id)", () => { ... });
    it("returns null for valid ESCORT entry (escort_person_id set)", () => { ... });
    it("returns error string for ESCORT entry missing escort_person_id", () => { ... });
    it("returns error string for CARD entry with unexpected escort_person_id", () => { ... });
  });

  describe("validateSecuredZoneEntry", () => {
    // Can reuse Z_BUILDING1 (zone_type: "SECURED") and Z_SITE (zone_type: "CONTROLLED")
    // These are module-level fixtures — they are NOT in describe scope, so Phase 7
    // tests cannot directly reference them. Must re-declare inline in the describe block.
    it("returns null for non-SECURED zone with null entry", () => { ... });
    it("returns null for SECURED zone with non-null entry", () => { ... });
    it("returns error string for SECURED zone with null entry", () => { ... });
  });
});

describe("ZoneVisitorPass", () => {
  const NOW_V = new Date("2026-01-15T12:00:00Z");
  // Pass fixtures
  describe("getActiveVisitorPasses", () => {
    it("returns active pass within time window", () => { ... });
    it("excludes expired pass (valid_until before now)", () => { ... });
    it("excludes future pass (valid_from after now)", () => { ... });
    it("returns empty array when allPasses is empty", () => { ... });
    it("filters by zoneId — excludes passes for different zone", () => { ... });
  });
});
```

### Anti-Patterns to Avoid

- **Optional fields for nullable:** Do NOT use `exit_at?: Date` — use `exit_at: Date | null`. The project pattern is consistent: all Phase 5/6 interfaces use `| null` for "present but nullable", never `?` (which means omittable). `noUnusedParameters` and strict mode make this matter.
- **Internal Date.now():** Phase 6 pattern is explicit `now: Date` parameter. `getActiveVisitorPasses` takes `now: Date` — do not use `new Date()` internally.
- **Discriminated union split:** CONTEXT.md explicitly forbids splitting `ZoneEntryLog` into subtypes for CARD vs ESCORT. Use one flat interface with `method: "CARD" | "ESCORT"`.
- **Importing seed data or external fixtures in tests:** All test fixtures must be inline in `physical-access.test.ts`. `D3-13 pattern` (no seed.ts imports) is documented in the test file header.
- **Modifying existing Phase 5/6 exports:** CONTEXT.md freezes `resolveZoneAccess`, `resolveGrant`, `isGrantActive`, `isDelegateActive`. Phase 7 does not touch them.
- **Re-using Phase 6 module-level fixtures by reference:** The Zone fixtures (`Z_SITE`, `Z_BUILDING1`, `Z_ROOM1`, `Z_BUILDING2`, `G_PERMANENT`, `NOW`, etc.) are declared at module scope in the test file (lines 128–172 and 208–303). Phase 7 `describe` blocks CAN reference these directly since they are module-level constants, not inside another describe. The `NOW` constant on line 208 is module-level and can be referenced in Phase 7 tests.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Time-window query | Custom date comparison logic | Mirror `isGrantActive` pattern exactly | Already proven correct; boundary-inclusive semantics already tested |
| Validator pattern | Custom error object or exception | `string \| null` return type | Matches all existing Phase 5/6 evaluators; no overhead |
| Zone type check | Runtime type guard | Direct `zone.zone_type === "SECURED"` comparison | TypeScript literal type; no runtime cost |

## Runtime State Inventory

SKIPPED — This is a greenfield extension of a pure TypeScript demo module. No databases, no running services, no OS registrations, no stored state. All data is in-memory.

## Common Pitfalls

### Pitfall 1: `ZoneVisitorPass.valid_from/valid_until` are not nullable
**What goes wrong:** Developer copies `isGrantActive` null-boundary logic (`null || field <= now`) into `getActiveVisitorPasses`.
**Why it happens:** `PhysicalAccessGrant.valid_from/valid_until` are `Date | null`. `ZoneVisitorPass.valid_from/valid_until` are plain `Date` (not nullable — caller always supplies them).
**How to avoid:** Use simple direct comparison: `pass.valid_from <= now && pass.valid_until >= now`. No null guards needed.
**Warning signs:** TypeScript will NOT error on the null guard (it's a valid comparison) — must catch in code review.

### Pitfall 2: Import list in physical-access.test.ts must be updated
**What goes wrong:** New types and functions are added to `model.ts` but the import block in `physical-access.test.ts` (lines 6–22) is not updated. Tests fail with "X is not defined".
**Why it happens:** The import list is explicit named imports, not a wildcard.
**How to avoid:** Update the import block to add `ZoneEntryLog`, `ZoneVisitorPass`, `validateEntryLog`, `validateSecuredZoneEntry`, `getActiveVisitorPasses`. `type ZoneNode` is already imported and reusable for `validateSecuredZoneEntry` tests.

### Pitfall 3: noUnusedLocals/noUnusedParameters will fail on unused test variables
**What goes wrong:** A test fixture is declared but not used in any `it()` block — `tsc -b --noEmit` fails.
**Why it happens:** `tsconfig.app.json` has `"noUnusedLocals": true` and `"noUnusedParameters": true`.
**How to avoid:** Only declare fixtures that are used in at least one test case. Inline minimal object literals in tests that only need them once.

### Pitfall 4: validateSecuredZoneEntry null-entry parameter type
**What goes wrong:** Parameter typed as `entry?: ZoneEntryLog` (optional) instead of `entry: ZoneEntryLog | null`.
**Why it happens:** Confusion between TypeScript optional parameter and "must be provided but can be null".
**How to avoid:** The SPEC defines signature as `validateSecuredZoneEntry(zone: ZoneNode, entry: ZoneEntryLog | null): string | null`. Callers must always pass the second argument explicitly (even if null). This is testable — `validateSecuredZoneEntry(zone, null)` must compile.

### Pitfall 5: Section header position in model.ts
**What goes wrong:** Phase 7 section inserted after the `// --- D-10: UnitId ---` comment block, mixing domain-specific types with general application types.
**Why it happens:** model.ts has two conceptually different sections: physical access types/functions (lines 1–323) and general domain model types (lines 325+, starting with UnitId).
**How to avoid:** Verify insertion is BEFORE the `// --- D-10: UnitId ---` line. Phase 7 types belong with the physical access section (Phases 5/6), not with the general domain model.

## Code Examples

### ZoneEntryLog interface (exact pattern to use)
```typescript
// --- Phase 7: Entry log and visitor pass types ---

/**
 * Records a single zone access event: who entered, which zone, when, and how.
 * ESCORT entries require escort_person_id; CARD entries must not have one.
 */
export interface ZoneEntryLog {
  id: string;
  person_id: string;
  zone_id: string;
  entry_at: Date;
  exit_at: Date | null;
  method: "CARD" | "ESCORT";
  escort_person_id: string | null;
}
```

### ZoneVisitorPass interface
```typescript
/**
 * Visitor pass issued when an escort accompanies a person into a zone.
 * Linked to its ZoneEntryLog by entry_log_id. valid_from and valid_until
 * are both required (caller-supplied); neither is nullable.
 */
export interface ZoneVisitorPass {
  id: string;
  entry_log_id: string;
  escort_person_id: string;
  zone_id: string;
  valid_from: Date;
  valid_until: Date;
}
```

### validateEntryLog function
```typescript
// --- LOG-02: validateEntryLog — ESCORT/CARD method constraint ---
export function validateEntryLog(entry: ZoneEntryLog): string | null {
  if (entry.method === "ESCORT" && entry.escort_person_id === null) {
    return "ESCORT entry requires escort_person_id";
  }
  if (entry.method === "CARD" && entry.escort_person_id !== null) {
    return "CARD entry must not have escort_person_id";
  }
  return null;
}
```

### validateSecuredZoneEntry function
```typescript
// --- LOG-03: validateSecuredZoneEntry — SECURED zone mandatory logging ---
export function validateSecuredZoneEntry(
  zone: ZoneNode,
  entry: ZoneEntryLog | null,
): string | null {
  if (zone.zone_type !== "SECURED") return null;
  if (entry !== null) return null;
  return "SECURED zone requires a ZoneEntryLog entry";
}
```

### getActiveVisitorPasses function
```typescript
// --- VISIT-03: getActiveVisitorPasses — active pass query ---
export function getActiveVisitorPasses(
  zoneId: string,
  allPasses: ZoneVisitorPass[],
  now: Date,
): ZoneVisitorPass[] {
  return allPasses.filter(
    (pass) =>
      pass.zone_id === zoneId &&
      pass.valid_from <= now &&
      pass.valid_until >= now,
  );
}
```

### Test fixture pattern — Phase 7 can reuse module-level fixtures from Phase 6
```typescript
// Module-level fixtures already available in physical-access.test.ts:
// Z_SITE (zone_type: "CONTROLLED"), Z_BUILDING1 (zone_type: "SECURED"),
// Z_ROOM1 (zone_type: "SECURED"), Z_BUILDING2 (zone_type: "RESTRICTED")
// NOW = new Date("2026-01-15T12:00:00Z")

describe("ZoneEntryLog", () => {
  const ENTRY_CARD: ZoneEntryLog = {
    id: "log-card-1",
    person_id: "p-1",
    zone_id: "z-room1",
    entry_at: NOW,
    exit_at: null,
    method: "CARD",
    escort_person_id: null,
  };

  const ENTRY_ESCORT: ZoneEntryLog = {
    id: "log-escort-1",
    person_id: "p-visitor",
    zone_id: "z-room1",
    entry_at: NOW,
    exit_at: null,
    method: "ESCORT",
    escort_person_id: "p-1",
  };
  // ...
});
```

## State of the Art

| Old Approach | Current Approach | Notes |
|--------------|------------------|-------|
| N/A | Append to model.ts | Phase 7 is entirely additive; no rework |

The codebase is already in the correct state for Phase 7. No deprecated patterns to update.

## Assumptions Log

All claims in this research were verified by direct file reads and test execution. No assumptions.

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| — | No assumptions | — | — |

**If this table is empty:** All claims in this research were verified or cited — no user confirmation needed.

## Open Questions

None. All architectural decisions are locked in CONTEXT.md and verified against the codebase.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js + npm | Vitest test runner | ✓ | (via existing frontend setup) | — |
| TypeScript compiler | `tsc -b --noEmit` verification | ✓ | ~5.9.3 | — |
| Vitest | Test execution | ✓ | 4.0.x | — |

**No missing dependencies.** Phase 7 is pure model extension with no external tools beyond what already runs.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.x |
| Config file | `frontend/vite.config.ts` (test.environment: "jsdom") |
| Quick run command | `cd frontend && npx vitest run src/demo/lib/physical-access.test.ts` |
| Full suite command | `cd frontend && npx vitest run src/demo/lib/` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| LOG-01 | ZoneEntryLog type-checks as valid CARD entry | unit | `npx vitest run src/demo/lib/physical-access.test.ts` | ✅ (append to existing) |
| LOG-01 | ZoneEntryLog type-checks as valid ESCORT entry | unit | same | ✅ |
| LOG-02 | validateEntryLog returns null for valid CARD entry | unit | same | ✅ |
| LOG-02 | validateEntryLog returns null for valid ESCORT entry | unit | same | ✅ |
| LOG-02 | validateEntryLog returns error for ESCORT missing escort_person_id | unit | same | ✅ |
| LOG-02 | validateEntryLog returns error for CARD with escort_person_id set | unit | same | ✅ |
| LOG-03 | validateSecuredZoneEntry returns null for non-SECURED with null entry | unit | same | ✅ |
| LOG-03 | validateSecuredZoneEntry returns null for SECURED with non-null entry | unit | same | ✅ |
| LOG-03 | validateSecuredZoneEntry returns error for SECURED with null entry | unit | same | ✅ |
| VISIT-01/02 | ZoneVisitorPass constructs with entry_log_id reference | unit | same | ✅ |
| VISIT-03 | getActiveVisitorPasses returns pass within time window | unit | same | ✅ |
| VISIT-03 | getActiveVisitorPasses excludes expired pass | unit | same | ✅ |
| VISIT-03 | getActiveVisitorPasses excludes future pass | unit | same | ✅ |
| VISIT-03 | getActiveVisitorPasses returns empty for empty allPasses | unit | same | ✅ |
| VISIT-03 | getActiveVisitorPasses filters by zoneId correctly | unit | same | ✅ |

### Sampling Rate
- **Per task commit:** `cd frontend && npx vitest run src/demo/lib/physical-access.test.ts`
- **Per wave merge:** `cd frontend && npx vitest run src/demo/lib/`
- **Phase gate:** Full suite green + `tsc -b --noEmit` exits 0 before phase close

### Wave 0 Gaps
None — existing test infrastructure covers all phase requirements. No new test config, fixtures files, or framework installs needed.

## Security Domain

Phase 7 adds pure in-memory TypeScript interfaces and functions with no I/O, no network calls, no authentication, and no user-facing endpoints. No ASVS categories apply. The code carries no secrets, handles no PII at runtime, and has no trust boundaries.

## Sources

### Primary (HIGH confidence)
- `frontend/src/demo/lib/model.ts` — read directly; all interface and function patterns verified
- `frontend/src/demo/lib/physical-access.test.ts` — read directly; all fixtures and describe-block patterns verified
- `frontend/tsconfig.app.json` — read directly; strict mode, noUnusedLocals, noUnusedParameters confirmed
- `.planning/phases/07-entry-log-visitor-passes/07-CONTEXT.md` — locked decisions D-01 through D-05
- `.planning/phases/07-entry-log-visitor-passes/07-SPEC.md` — all 8 requirements and acceptance criteria
- `.planning/phases/06-grants-resolution-delegation/06-01-PLAN.md` — Phase 6 plan structure for task pattern reference
- Test execution: `npx vitest run src/demo/lib/` — 104 tests passing, 0 failures (verified 2026-05-23)
- TypeScript check: `tsc -b --noEmit` — exits 0 (verified 2026-05-23)

## Metadata

**Confidence breakdown:**
- Types and interfaces: HIGH — read directly from model.ts; exact pattern clear
- Function implementations: HIGH — implementations follow directly from SPEC and established patterns
- Test structure: HIGH — read directly from physical-access.test.ts; append-only, no restructuring
- Insertion points: HIGH — verified line numbers from direct file reads
- Pitfalls: HIGH — derived from strict TypeScript config and code reading, not speculation

**Research date:** 2026-05-23
**Valid until:** Indefinite — model.ts and physical-access.test.ts are frozen (no other phases modify them before Phase 7 executes)
