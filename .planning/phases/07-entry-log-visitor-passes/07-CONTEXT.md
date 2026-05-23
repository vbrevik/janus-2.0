# Phase 7: Entry Log & Visitor Passes - Context

**Gathered:** 2026-05-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Add `ZoneEntryLog` and `ZoneVisitorPass` interfaces, three companion functions (`validateEntryLog`, `validateSecuredZoneEntry`, `getActiveVisitorPasses`), and Vitest tests to the existing `model.ts` and `physical-access.test.ts`. No UI, no seed data, no backend changes. After this phase, zone entry events and visitor passes are fully modelable and queryable from TypeScript.

</domain>

<spec_lock>
## Requirements (locked via SPEC.md)

**8 requirements are locked.** See `07-SPEC.md` for full requirements, boundaries, and acceptance criteria.

Downstream agents MUST read `07-SPEC.md` before planning or implementing. Requirements are not duplicated here.

**In scope (from SPEC.md):**
- `ZoneEntryLog` interface (id, person_id, zone_id, entry_at, exit_at, method, escort_person_id)
- `ZoneVisitorPass` interface (id, entry_log_id, escort_person_id, zone_id, valid_from, valid_until)
- `validateEntryLog(entry: ZoneEntryLog): string | null` — ESCORT/CARD method constraint
- `validateSecuredZoneEntry(zone: ZoneNode, entry: ZoneEntryLog | null): string | null` — SECURED zone mandatory logging
- `getActiveVisitorPasses(zoneId: string, allPasses: ZoneVisitorPass[], now: Date): ZoneVisitorPass[]` — active pass query
- Vitest tests for all five items in `physical-access.test.ts`

**Out of scope (from SPEC.md):**
- Mock dataset entries (SEED-07, SEED-08) — Phase 8
- Demo UI for Zone Entry Log and Visitor Passes (UI-05, UI-06) — Phase 8
- Escort eligibility validation (grant check) — caller responsibility
- Rust/PostgreSQL backend implementation — future milestone

</spec_lock>

<decisions>
## Implementation Decisions

### Code File Organization

- **D-01:** All new types and functions appended at end of `model.ts`, after the existing Phase 6 exports (after `isDelegateActive`). No new files.
- **D-02:** Tests appended at end of `physical-access.test.ts`, after existing Phase 6 describe blocks. Two new top-level describe blocks: `describe("ZoneEntryLog")` and `describe("ZoneVisitorPass")`.
- **D-03:** Section headers: `// --- Phase 7: Entry log and visitor pass types ---` (matching Phase 5/6 header style in model.ts).

### Validator Error Messages

- **D-04:** Error strings are descriptive (not short codes): `"ESCORT entry requires escort_person_id"`, `"CARD entry must not have escort_person_id"`, `"SECURED zone requires a ZoneEntryLog entry"`. Consistent with `detail` strings already returned by `evaluateRestrictedAccess`/`evaluateSecuredAccess`.

### Time Boundary Semantics

- **D-05:** `getActiveVisitorPasses` uses inclusive boundaries on both ends: `pass.valid_from <= now && pass.valid_until >= now`. Matches `isGrantActive` semantics exactly.

### Claude's Discretion

All other choices (import ordering, test fixture naming, comment style) follow Phase 5/6 patterns.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets

- `isGrantActive(grant, now)` — identical null-boundary pattern for `ZoneVisitorPass` time-window check
- `ZoneNode` type — used as parameter to `validateSecuredZoneEntry`
- `ZoneAccessResult`, `ZoneAccessGate` — not used in Phase 7 but context for evaluator return shapes
- Existing test fixtures in `physical-access.test.ts` (zone tree, grants) — Phase 7 tests can reuse `ZONE_*` and `G_*` fixtures for `validateSecuredZoneEntry` tests

### Established Patterns

- All domain types in `model.ts`; all tests in `physical-access.test.ts`
- Validator functions return `string | null` — error message or null (Phase 7 validators follow this)
- Phase boundary comment headers: `// --- Phase N: [description] ---`
- Test describe blocks named after the type/function being tested (`describe("isGrantActive", ...)`)
- Test fixture constants in SCREAMING_CASE declared at describe scope

### Integration Points

- `model.ts` → downstream: Phase 8 seed data will construct `ZoneEntryLog` and `ZoneVisitorPass` objects; Phase 8 UI will call `getActiveVisitorPasses`
- `physical-access.test.ts` → CI: existing tests must continue to pass after Phase 7 appends

</code_context>

<specifics>
## Specific Ideas

- `validateSecuredZoneEntry` should short-circuit immediately if `zone.zone_type !== "SECURED"` (return null) — CONTROLLED and RESTRICTED zones never require logging
- Test for `validateSecuredZoneEntry` should reuse an existing ZONE fixture with `zone_type: "SECURED"` if one exists in the test file, or define a minimal inline fixture
- `getActiveVisitorPasses` filter is straightforward: filter by zoneId match AND both time boundaries inclusive

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>
