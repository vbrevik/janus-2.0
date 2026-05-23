# Phase 6: Grants, Resolution & Delegation — Research

**Researched:** 2026-05-23
**Domain:** Pure TypeScript types + functions; Vitest unit tests; zero new dependencies
**Confidence:** HIGH

## Summary

Phase 6 is a pure TypeScript extension of `model.ts` with no new libraries, no UI, no backend,
and no seed data. Every deliverable lives in `frontend/src/demo/lib/` and is tested by the
existing Vitest suite. The phase adds two interfaces (`PhysicalAccessGrant`,
`ZoneAccessDelegate`), two time-window predicate functions (`isGrantActive`,
`isDelegateActive`), one grant-resolution walk (`resolveGrant`), and one two-gate entry point
(`resolveZoneAccess`). All of these are pure functions whose correctness is fully testable with
inline fixtures.

All design decisions are locked via `06-CONTEXT.md` (D-01, D-02, D-03). The only choices left
to the planner are: ordering of new sections in `model.ts`, and the exact structure of
`describe` blocks in `physical-access.test.ts`. Follow Phase 5 patterns for both.

The existing baseline is green: `tsc -b --noEmit` exits 0, and all 100 Vitest tests pass (13
test files). Phase 6 must not regress either gate.

**Primary recommendation:** Add new code in two ordered waves — types first (Phase 6 types
appended to `model.ts`), then functions (Phase 6 functions appended after Phase 5 functions),
then tests (new `describe` blocks appended to `physical-access.test.ts`). Commit only when both
verification gates pass.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** All new types (`PhysicalAccessGrant`, `ZoneAccessDelegate`) exported from `model.ts`
- **D-02:** All new functions (`isGrantActive`, `resolveGrant`, `resolveZoneAccess`,
  `isDelegateActive`) added to `model.ts` co-located with Phase 5 evaluate functions — no new
  source file needed
- **D-03:** Phase 6 tests added to existing `physical-access.test.ts` — extends the file rather
  than creating a new one

### Claude's Discretion
All other implementation choices (ordering of new sections in `model.ts`, helper naming within
the functions, comment style) are at Claude's discretion — follow Phase 5 patterns.

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| GRANT-01 | `PhysicalAccessGrant` interface (id, person_id, zone_id, valid_from, valid_until) | Type contract fully specified in SPEC.md §1 |
| GRANT-02 | Zone-type-scoped grant inheritance — ancestor grant only counts if ancestor.zone_type === zone.zone_type | Algorithm specified in CONTEXT.md §specifics and SPEC.md §3 |
| GRANT-03 | `requires_explicit_auth = true` blocks inheritance; zone always requires own direct grant | `ZoneNode.requires_explicit_auth` field already in `model.ts`; logic in SPEC.md §4 |
| GRANT-04 | `resolveGrant()` ancestor walk — leaf-first, most-specific active grant wins | `getAncestors()` already in `model.ts`; signature + acceptance in SPEC.md §5 |
| ACCESS-05 | `resolveZoneAccess()` two-gate resolver — gate 1: grant lookup, gate 2: zone-type rule | Calls existing Phase 5 `evaluateXxxAccess()` functions; SPEC.md §6 |
| DELEG-01 | `isDelegateActive(delegate, now): boolean` — same null-boundary logic as `isGrantActive` | SPEC.md §8 |
| DELEG-02 | `ZoneAccessDelegate` interface (8 fields: id, zone_id, delegate_type, delegate_person_id, delegate_org_id, granted_by_org_id, valid_from, valid_until) | SPEC.md §7 |
| DELEG-03 | Type-only for now — `canIssueGrant()` runtime check deferred to Phase 8 UI | Out of scope per SPEC.md boundaries |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Grant time-window check | `model.ts` pure function | — | No I/O; deterministic; tested in isolation |
| Delegate time-window check | `model.ts` pure function | — | Identical pattern to grant check |
| Grant resolution walk | `model.ts` pure function | — | Composes `getAncestors()` already in `model.ts` |
| Two-gate access resolution | `model.ts` pure function | — | Composes Phase 5 evaluate functions already in `model.ts` |
| Type definitions | `model.ts` type exports | — | All domain types consolidated in one file per D-01 |
| Tests | `physical-access.test.ts` | — | Extends existing file per D-03 |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | ~5.9.3 | Type-safe interfaces and function signatures | Already in project; `model.ts` is pure TS |
| Vitest | 4.0.x | Test runner | Already in project; `physical-access.test.ts` uses it |

**No new packages are needed.** This phase adds zero new dependencies.

### Installation
No installation step required. All tooling is already installed.

## Package Legitimacy Audit

No external packages are introduced in this phase. The Package Legitimacy Gate is not
applicable.

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
  resolveZoneAccess(personId, zone, clearance, hasValidEscort, allZones, allGrants, now)
           │
           ▼  Gate 1: GRANT_LOOKUP
  resolveGrant(personId, zone, allZones, allGrants, now)
           │
           ├── isGrantActive(grant, now) ──── checks each grant in allGrants
           │
           ├── zone_type filter ──────────── ancestor.zone_type === zone.zone_type
           │
           └── requires_explicit_auth ──────  if true: only direct grants; ancestors skipped
           │
           ▼  null → DENY {gate:"GRANT_LOOKUP", reason:"NO_GRANT"}
           │  non-null PhysicalAccessGrant → proceed to gate 2
           │
           ▼  Gate 2: ZONE_TYPE_RULE
  evaluate{ZoneType}Access(hasGrant=true, clearance, hasValidEscort)
           │
           └── returns ZoneAccessResult with gate:"ZONE_TYPE_RULE"
```

### Recommended Project Structure

No new directories or files. All additions are appended in-place:

```
frontend/src/demo/lib/
├── model.ts              ← EXTEND: append Phase 6 types + functions
└── physical-access.test.ts  ← EXTEND: append Phase 6 describe blocks
```

### Pattern 1: `isGrantActive` null-boundary logic

**What:** Pure boolean predicate. Both boundaries are inclusive. Null means "unbounded".
**When to use:** Called by `resolveGrant` to filter inactive grants from the candidate set.

```typescript
// Source: CONTEXT.md §specifics
export function isGrantActive(grant: PhysicalAccessGrant, now: Date): boolean {
  return (
    (grant.valid_from === null || grant.valid_from <= now) &&
    (grant.valid_until === null || grant.valid_until >= now)
  );
}
```

Boundary-exact (`now === valid_until`) returns `true` — confirmed by SPEC.md acceptance
criteria §2.

### Pattern 2: `resolveGrant` walk order

**What:** Checks the target zone first (most specific), then `getAncestors()` in parent-first
order (direct parent next, root last). Returns the first match.
**When to use:** Gate 1 of `resolveZoneAccess`.

```typescript
// Source: CONTEXT.md §specifics + SPEC.md §5
export function resolveGrant(
  personId: string,
  zone: ZoneNode,
  allZones: ZoneNode[],
  allGrants: PhysicalAccessGrant[],
  now: Date,
): PhysicalAccessGrant | null {
  // requires_explicit_auth: skip ancestor walk entirely
  const searchZones: ZoneNode[] = zone.requires_explicit_auth
    ? [zone]
    : [zone, ...getAncestors(zone.id, allZones)];

  for (const searchZone of searchZones) {
    // ancestor grants only count if zone_type matches target zone
    if (searchZone.id !== zone.id && searchZone.zone_type !== zone.zone_type) {
      continue;
    }
    const grant = allGrants.find(
      (g) =>
        g.person_id === personId &&
        g.zone_id === searchZone.id &&
        isGrantActive(g, now),
    );
    if (grant) return grant;
  }
  return null;
}
```

### Pattern 3: `resolveZoneAccess` two-gate sequencing

**What:** Gate 1 calls `resolveGrant`; null result short-circuits with
`{allow:false, gate:"GRANT_LOOKUP", reason:"NO_GRANT"}`. Non-null result calls the appropriate
Phase 5 evaluate function with `hasGrant=true`; result passes through as-is (gate field is
already `"ZONE_TYPE_RULE"` from Phase 5 functions).
**When to use:** This is the single external entry point for any access decision.

```typescript
// Source: CONTEXT.md §specifics + SPEC.md §6
export function resolveZoneAccess(
  personId: string,
  zone: ZoneNode,
  clearance: Clearance,
  hasValidEscort: boolean,
  allZones: ZoneNode[],
  allGrants: PhysicalAccessGrant[],
  now: Date,
): ZoneAccessResult {
  const grant = resolveGrant(personId, zone, allZones, allGrants, now);
  if (grant === null) {
    return { allow: false, gate: "GRANT_LOOKUP", reason: "NO_GRANT" };
  }
  // Gate 2: zone-type rule (hasGrant=true because grant was found)
  if (zone.zone_type === "CONTROLLED") {
    return evaluateControlledAccess(true);
  }
  if (zone.zone_type === "RESTRICTED") {
    return evaluateRestrictedAccess(true, clearance, hasValidEscort);
  }
  return evaluateSecuredAccess(true, clearance, hasValidEscort);
}
```

Note: `evaluateControlledAccess` does not take `clearance` or `hasValidEscort` — correct, per
the Phase 5 function signature in `model.ts`.

### Pattern 4: `isDelegateActive` null-boundary logic

**What:** Identical pattern to `isGrantActive` but operating on `ZoneAccessDelegate`.
**When to use:** Standalone predicate for delegate time-window checks.

```typescript
// Source: SPEC.md §8 + CONTEXT.md §specifics
export function isDelegateActive(delegate: ZoneAccessDelegate, now: Date): boolean {
  return (
    (delegate.valid_from === null || delegate.valid_from <= now) &&
    (delegate.valid_until === null || delegate.valid_until >= now)
  );
}
```

### Pattern 5: Vitest test structure to follow

**What:** `describe/it/expect` with inline fixtures declared at file scope or `describe`-scope.
No `seed.ts` imports. No `beforeEach` setup — fixtures are plain `const` values.

```typescript
// Source: physical-access.test.ts lines 5-15 (exact import pattern)
import { describe, it, expect } from "vitest";
import {
  isGrantActive,
  resolveGrant,
  resolveZoneAccess,
  isDelegateActive,
  type PhysicalAccessGrant,
  type ZoneAccessDelegate,
  type ZoneNode,
} from "./model";
```

New `describe` blocks are appended after the existing `getDescendants` describe block.
Fixture zone nodes (`Z_SITE`, `Z_BUILDING1`, etc.) defined in Phase 5 tests are NOT
re-exported — Phase 6 test blocks must define their own inline fixtures or reuse test-local
`const` variables within the same file scope (since all tests share the same file,
`Z_SITE`, `Z_BUILDING1`, `Z_ROOM1`, `Z_BUILDING2`, and `ALL_ZONES` are already in scope).

### Anti-Patterns to Avoid

- **Modifying Phase 5 functions:** `evaluateControlledAccess`, `evaluateRestrictedAccess`,
  `evaluateSecuredAccess` must not be touched. Pass `hasGrant=true` to them from
  `resolveZoneAccess`.
- **Internal `new Date()` calls:** Functions must accept `now: Date` — never call `Date.now()`
  or `new Date()` inside function bodies. This keeps tests deterministic.
- **Importing from `seed.ts`:** Tests must use inline fixtures only (D3-13 pattern).
- **Importing from React components:** `model.ts` must remain a pure logic file with no
  React imports.
- **Zone_type mismatch inheritance:** A CONTROLLED ancestor grant must NOT cover a RESTRICTED or
  SECURED child — the `zone_type` filter is mandatory on every ancestor in the walk.
- **Missing `requires_explicit_auth` short-circuit:** If the target zone has
  `requires_explicit_auth: true`, the ancestor walk must be skipped entirely, not just filtered.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Ancestor traversal | Custom tree walk | `getAncestors()` already in `model.ts` | Already implemented, tested, cycle-guarded |
| Zone-type rule evaluation | Inline clearance/escort logic in `resolveZoneAccess` | `evaluateControlledAccess`, `evaluateRestrictedAccess`, `evaluateSecuredAccess` | Phase 5 functions handle all branches including escort logic |
| Clearance ranking | Manual integer comparisons | `CLEARANCE_RANK` constant | Canonical rank table already in `model.ts` |

## Common Pitfalls

### Pitfall 1: zone_type filter applied to target zone as well as ancestors

**What goes wrong:** `resolveGrant` skips the target zone's own direct grant because the
developer added the `zone_type === zone.zone_type` filter to all zones including the target.
**Why it happens:** The zone_type filter is only meaningful for ancestors. The target zone
trivially satisfies `searchZone.zone_type === zone.zone_type` (they are the same node).
**How to avoid:** Apply the zone_type equality check only when `searchZone.id !== zone.id`.
**Warning signs:** Test "direct zone grant found when zone_type matches" fails.

### Pitfall 2: `requires_explicit_auth` applied as a filter instead of a short-circuit

**What goes wrong:** Developer filters out ancestor results by `requires_explicit_auth` instead
of skipping the ancestor walk entirely. A person with both a direct grant AND an ancestor grant
on an `requires_explicit_auth=true` zone would still return the direct grant correctly, but the
walk over ancestors produces an intermediate false negative in some implementations.
**Why it happens:** The flag is on the _target zone_, not the ancestor. The correct read is:
"if the zone I am trying to enter requires explicit auth, only its own direct grants count".
**How to avoid:** Check `zone.requires_explicit_auth` before building the `searchZones` array —
if true, `searchZones = [zone]` only, no ancestors.
**Warning signs:** Test "parent grant + requires_explicit_auth=true zone → NO_GRANT" fails.

### Pitfall 3: `evaluateSecuredAccess` passed `hasValidEscort` as `isEscorted`

**What goes wrong:** The Phase 5 `evaluateSecuredAccess(hasGrant, clearance, isEscorted)`
parameter is named `isEscorted` and does NOT unlock access — it only annotates the detail
string. Passing `hasValidEscort` for this parameter is technically correct only because they
carry the same runtime value, but their semantics differ: escort does not substitute for
clearance in SECURED zones (D-03).
**Why it happens:** Parameter names look equivalent across calls.
**How to avoid:** Document in `resolveZoneAccess` that for SECURED zones, the escort parameter
is annotation-only — access still requires SECRET clearance.
**Warning signs:** Test "grant + CONFIDENTIAL + escort → DENY INSUFFICIENT_CLEARANCE in SECURED"
fails.

### Pitfall 4: Gate discriminator collision

**What goes wrong:** When `resolveZoneAccess` short-circuits on `grant === null`, it emits
`{gate:"GRANT_LOOKUP", reason:"NO_GRANT"}`. But `evaluateControlledAccess(false)` also emits
`{gate:"ZONE_TYPE_RULE", reason:"NO_GRANT"}`. If the developer calls the evaluate function
with `hasGrant=false` instead of early-returning, the gate field will be wrong.
**Why it happens:** Both results carry `reason:"NO_GRANT"` — developer doesn't notice the gate
field difference.
**How to avoid:** The short-circuit on `grant === null` must be an explicit early return with
`gate:"GRANT_LOOKUP"`. Never pass `hasGrant=false` to the Phase 5 functions from within
`resolveZoneAccess`.
**Warning signs:** Test "no grant → gate:GRANT_LOOKUP" fails; gate is "ZONE_TYPE_RULE" instead.

## Code Examples

### Interface: PhysicalAccessGrant
```typescript
// Source: SPEC.md §1
export interface PhysicalAccessGrant {
  id: string;
  person_id: string;
  zone_id: string;
  valid_from: Date | null;   // null = valid immediately (no start boundary)
  valid_until: Date | null;  // null = permanent (no end boundary)
}
```

### Interface: ZoneAccessDelegate
```typescript
// Source: SPEC.md §7
export interface ZoneAccessDelegate {
  id: string;
  zone_id: string;
  delegate_type: "PERSON" | "ORG";
  delegate_person_id: string | null;
  delegate_org_id: string | null;
  granted_by_org_id: string;
  valid_from: Date | null;
  valid_until: Date | null;
}
```

### Test fixture pattern for grant tests
```typescript
// Source: physical-access.test.ts lines 121-165 (inline fixture pattern)
const now = new Date("2026-01-15T12:00:00Z");

const G_DIRECT: PhysicalAccessGrant = {
  id: "g-direct",
  person_id: "p-1",
  zone_id: "z-room1",
  valid_from: new Date("2026-01-01T00:00:00Z"),
  valid_until: new Date("2026-12-31T23:59:59Z"),
};

const G_ANCESTOR: PhysicalAccessGrant = {
  id: "g-ancestor",
  person_id: "p-1",
  zone_id: "z-bldg1",
  valid_from: null,
  valid_until: null,
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Phase 5 evaluate functions standalone (no grant lookup) | Phase 6 `resolveZoneAccess` wraps them with grant gate | Phase 6 | Single entry point for all access decisions |

**Deprecated/outdated:**
- Nothing from Phase 5 is deprecated. `evaluateControlledAccess`, `evaluateRestrictedAccess`,
  `evaluateSecuredAccess` remain in place as the gate-2 implementations called by
  `resolveZoneAccess`.

## Assumptions Log

No assumptions were made in this research. All claims are either verified from the project
codebase or cited from locked SPEC.md / CONTEXT.md documents.

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| — | — | — | — |

**All claims in this research were verified from the codebase or cited from locked project
documents — no user confirmation needed.**

## Open Questions

None. The SPEC.md reports ambiguity score 0.150, all four interview rounds resolved. No open
design questions remain.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Vitest, tsc | ✓ | (v20 per Dockerfile) | — |
| TypeScript | type checking | ✓ | ~5.9.3 | — |
| Vitest | test runner | ✓ | 4.0.x | — |

**Missing dependencies with no fallback:** None.

**Verified baseline:**
- `tsc -b --noEmit` exits 0 (verified in session)
- Vitest suite: 100/100 tests, 13 files (verified in session)

## Validation Architecture

`workflow.nyquist_validation` is explicitly `false` in `.planning/config.json`.
Validation Architecture section is skipped per config.

## Security Domain

This phase adds no authentication, session management, access control enforcement, input
validation from external sources, or cryptography. All functions operate on in-memory
TypeScript objects with no I/O. ASVS categories V2-V6 are not applicable. Security domain
section is omitted.

## Project Constraints (from CLAUDE.md)

| Directive | Impact on Phase 6 |
|-----------|-------------------|
| Tech stack: React 19 + TanStack + Vite + shadcn/ui; do not introduce new frameworks | No new packages introduced |
| Routing: TanStack file-based; `routeTree.gen.ts` is generated | No route changes in this phase |
| Testing: Vitest (unit) + Playwright (e2e, excluded from Vitest) | All tests are Vitest unit tests in `physical-access.test.ts` |
| Named exports for all hooks/components/utilities; no default exports except route `_component.tsx` | All new exports from `model.ts` are named exports |
| `@/` prefix for all internal imports | No new cross-file imports in this phase |
| No toast notifications — errors rendered inline | No UI in this phase |
| No barrel `index.ts` files | Not applicable |
| `tsc -b --noEmit` must exit 0 | Verification gate after every change |

## Sources

### Primary (HIGH confidence)
- `frontend/src/demo/lib/model.ts` — authoritative existing type and function definitions verified in session
- `.planning/phases/06-grants-resolution-delegation/06-SPEC.md` — locked requirements, function signatures, acceptance criteria
- `.planning/phases/06-grants-resolution-delegation/06-CONTEXT.md` — locked implementation decisions D-01, D-02, D-03
- `frontend/src/demo/lib/physical-access.test.ts` — exact test file structure verified in session
- `.planning/config.json` — `nyquist_validation: false` confirmed in session

### Secondary (MEDIUM confidence)
None needed — all requirements are fully specified by locked project documents.

### Tertiary (LOW confidence)
None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified from project package.json and existing test files
- Architecture: HIGH — locked via SPEC.md and CONTEXT.md decisions
- Pitfalls: HIGH — derived from exact function semantics in SPEC.md and Phase 5 code

**Research date:** 2026-05-23
**Valid until:** Stable — requirements and code are locked; no external dependencies to track
