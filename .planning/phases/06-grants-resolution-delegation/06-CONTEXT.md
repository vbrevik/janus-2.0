# Phase 6: Grants, Resolution & Delegation - Context

**Gathered:** 2026-05-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Add `PhysicalAccessGrant` and `ZoneAccessDelegate` types plus four pure resolution functions to `model.ts`, and extend `physical-access.test.ts` with the corresponding Vitest tests. No UI, no seed data, no backend. After this phase, `resolveZoneAccess()` is the single callable entry point that produces a fully-explained `ZoneAccessResult` for any person + zone combination.

</domain>

<spec_lock>
## Requirements (locked via SPEC.md)

**8 requirements are locked.** See `06-SPEC.md` for full requirements, boundaries, and acceptance criteria.

Downstream agents MUST read `06-SPEC.md` before planning or implementing. Requirements are not duplicated here.

**In scope (from SPEC.md):**
- `PhysicalAccessGrant` interface (fields: id, person_id, zone_id, valid_from, valid_until)
- `ZoneAccessDelegate` interface (fields per DELEG-02)
- `isGrantActive(grant, now): boolean` — time-window check
- `isDelegateActive(delegate, now): boolean` — time-window check
- `resolveGrant(personId, zone, allZones, allGrants, now): PhysicalAccessGrant | null` — ancestor walk with zone_type scoping + explicit-auth override
- `resolveZoneAccess(personId, zone, clearance, hasValidEscort, allZones, allGrants, now): ZoneAccessResult` — two-gate resolution entry point
- Vitest tests for all six items above, with inline fixtures (no seed.ts imports)

**Out of scope (from SPEC.md):**
- `canIssueGrant()` authorization check — Phase 8 UI concern
- Mock dataset / seed data — Phase 8
- React UI components — Phase 8
- ZoneEntryLog and ZoneVisitorPass — Phase 7
- Backend Rust/PostgreSQL implementation — deferred beyond v2.1
- Grant creation, update, or delete operations — Phase 6 is read/evaluate only

</spec_lock>

<decisions>
## Implementation Decisions

### Code File Organization

- **D-01:** All new types (`PhysicalAccessGrant`, `ZoneAccessDelegate`) exported from `model.ts` — consistent with Phase 5 pattern (all domain types in model.ts).
- **D-02:** All new functions (`isGrantActive`, `resolveGrant`, `resolveZoneAccess`, `isDelegateActive`) added to `model.ts` co-located with Phase 5 evaluate functions — no new source file needed.
- **D-03:** Phase 6 tests added to existing `physical-access.test.ts` — extends the file rather than creating a new one; both test suites import from `./model` and belong together.

### Claude's Discretion
All other implementation choices (ordering of new sections in model.ts, helper naming within the functions, comment style) are at Claude's discretion — follow Phase 5 patterns.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase requirements
- `.planning/phases/06-grants-resolution-delegation/06-SPEC.md` — Locked requirements — MUST read before planning. Contains full type contracts, function signatures, boundaries, and acceptance criteria.
- `.planning/REQUIREMENTS.md` — GRANT-01 through GRANT-04, ACCESS-05, DELEG-01 through DELEG-02

### Existing model (change target)
- `frontend/src/demo/lib/model.ts` — The file being modified. Contains Phase 5 types (`ZoneNode`, `ZoneAccessResult`, `ZoneAccessGate`, `ZoneAccessReason`, `Clearance`, `CLEARANCE_RANK`) and Phase 5 functions (`evaluateControlledAccess`, `evaluateRestrictedAccess`, `evaluateSecuredAccess`, `getAncestors`, `getDescendants`).

### Phase 5 context (locked decisions that apply here)
- `.planning/phases/05-zone-model-access-rules/05-CONTEXT.md` — D-01 (ZoneAccessResult shape with gate field), D-02 (tree traversal helpers), D-03 (escort parameter naming), D-04 (CLEARANCE_RANK comparisons).

### Test patterns
- `frontend/src/demo/lib/physical-access.test.ts` — File to extend with Phase 6 tests. Follow its inline-fixture pattern (no seed.ts imports, `describe/it/expect` style).
- `frontend/src/demo/lib/policy.test.ts` — Reference for inline fixture style.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `getAncestors(zoneId, allZones): ZoneNode[]` in `model.ts` — returns parent-first chain (direct parent first, root last). `resolveGrant` calls this for the ancestor walk.
- `CLEARANCE_RANK: Record<Clearance, number>` in `model.ts` — use for clearance comparisons in evaluate functions (already called by Phase 5 functions).
- `evaluateControlledAccess`, `evaluateRestrictedAccess`, `evaluateSecuredAccess` in `model.ts` — `resolveZoneAccess` calls the appropriate one as gate 2; do NOT modify these functions.
- `ZoneAccessGate = "GRANT_LOOKUP" | "ZONE_TYPE_RULE"` — gate discriminator already declared in `model.ts`.

### Established Patterns
- **Type exports:** All types exported as named exports from `model.ts` (no default exports, no barrel files).
- **Vitest test style:** `describe/it/expect` with inline fixtures — follow `physical-access.test.ts` exactly.
- **Function naming:** `camelCase` for functions, `PascalCase` for interfaces — per CONVENTIONS.md.
- **`now: Date` parameter:** All time-window functions accept `now: Date` explicitly — no internal `Date.now()` calls (keeps tests deterministic).
- **Null-safe boundaries:** `valid_from <= now` (null = valid immediately), `valid_until >= now` (null = permanent) — same logic for both `isGrantActive` and `isDelegateActive`.

### Integration Points
- `frontend/src/demo/lib/model.ts` — single change surface; append new types after Phase 5 types and new functions after Phase 5 functions.
- `frontend/src/demo/lib/physical-access.test.ts` — append new `describe` blocks for Phase 6; existing tests are not touched.
- TypeScript check: `tsc -b --noEmit` must exit 0 after changes. Full Vitest suite (currently 100/100) must remain passing.

</code_context>

<specifics>
## Specific Ideas

- `isGrantActive` null-boundary logic: `(grant.valid_from === null || grant.valid_from <= now) && (grant.valid_until === null || grant.valid_until >= now)` — boundary-exact (`now === valid_until`) returns true.
- `resolveGrant` walk order: target zone direct grants first, then `getAncestors()` order (leaf → root). First match wins (most specific). Zone_type scoping: ancestor grant only counts if `ancestor.zone_type === zone.zone_type`. `requires_explicit_auth` check: if `zone.requires_explicit_auth === true`, skip all ancestor grants, require direct grant only.
- `resolveZoneAccess` two-gate logic: gate 1 = `resolveGrant()` (null → immediate `{allow:false, gate:"GRANT_LOOKUP", reason:"NO_GRANT"}`); gate 2 = call `evaluate{ZoneType}Access(hasGrant, clearance, hasValidEscort)` with `hasGrant = true`. The Phase 5 evaluate functions emit `gate:"ZONE_TYPE_RULE"` in their results — pass through as-is.
- `isDelegateActive` is identical null-boundary logic to `isGrantActive` — can use the same `(field === null || boundary_check)` pattern.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 6-grants-resolution-delegation*
*Context gathered: 2026-05-23*
