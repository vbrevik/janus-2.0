# Phase 7: Entry Log & Visitor Passes — Specification

**Created:** 2026-05-23
**Ambiguity score:** 0.182 (gate: ≤ 0.20)
**Requirements:** 8 locked

## Goal

Zone entry events are recordable with method and escort tracking, SECURED zones enforce mandatory logging at the model level, and escorted visitors have queryable visitor passes linked to their entry log entries.

## Background

Phases 5 and 6 built the complete zone hierarchy model (`ZoneNode`, access rules, `PhysicalAccessGrant`, `ZoneAccessDelegate`, `resolveZoneAccess`) in `frontend/src/demo/lib/model.ts`. `evaluateSecuredAccess` already annotates its result with `detail: "entry log mandatory"` but has no enforcement mechanism — LOG-03 enforcement was intentionally deferred to Phase 7. No `ZoneEntryLog` or `ZoneVisitorPass` types exist anywhere in the codebase. Phase 7 adds both types and their companion functions to `model.ts`, and extends `physical-access.test.ts` with Vitest coverage.

## Requirements

1. **ZoneEntryLog type**: Defines the data shape for a zone access event.
   - Current: No `ZoneEntryLog` interface exists in `model.ts` or anywhere else
   - Target: `ZoneEntryLog` interface exported from `model.ts` with fields: `id: string`, `person_id: string`, `zone_id: string`, `entry_at: Date`, `exit_at: Date | null`, `method: "CARD" | "ESCORT"`, `escort_person_id: string | null`
   - Acceptance: `ZoneEntryLog` is importable from `model.ts`; TypeScript compiles without error; a valid CARD entry and a valid ESCORT entry can each be assigned to the type

2. **LOG-02 ESCORT constraint**: ESCORT entries must carry an escort person reference; CARD entries must not.
   - Current: No validation exists — the type system does not enforce `escort_person_id` presence on ESCORT entries
   - Target: `validateEntryLog(entry: ZoneEntryLog): string | null` exported from `model.ts`; returns `null` if valid, returns an error string if `method === "ESCORT"` and `escort_person_id` is null, or if `method === "CARD"` and `escort_person_id` is non-null
   - Acceptance: `validateEntryLog` returns `null` for valid CARD entry (no escort); returns error string for ESCORT entry missing `escort_person_id`; returns error string for CARD entry with unexpected `escort_person_id`

3. **LOG-03 SECURED enforcement**: Creating an entry for a SECURED zone without logging must be detectable at the model level.
   - Current: `evaluateSecuredAccess` returns `detail: "entry log mandatory"` but no function enforces that a log entry actually exists
   - Target: `validateSecuredZoneEntry(zone: ZoneNode, entry: ZoneEntryLog | null): string | null` exported from `model.ts`; returns `null` if `zone.zone_type !== "SECURED"` or if a valid `entry` is provided; returns error string if `zone.zone_type === "SECURED"` and `entry` is null
   - Acceptance: Returns `null` for non-SECURED zones regardless of entry; returns `null` for SECURED zone with a non-null entry; returns error string for SECURED zone with null entry

4. **ZoneVisitorPass type**: Defines the data shape for a visitor pass issued on ESCORT entry.
   - Current: No `ZoneVisitorPass` interface exists
   - Target: `ZoneVisitorPass` interface exported from `model.ts` with fields: `id: string`, `entry_log_id: string`, `escort_person_id: string`, `zone_id: string`, `valid_from: Date`, `valid_until: Date`
   - Acceptance: `ZoneVisitorPass` is importable from `model.ts`; TypeScript compiles; a valid pass object can be assigned to the type

5. **VISIT-01/VISIT-02 pass creation linkage**: A ZoneVisitorPass is a separate structure linked to its entry log by `entry_log_id`; caller creates both and links them.
   - Current: No linkage mechanism defined
   - Target: `ZoneVisitorPass.entry_log_id` references `ZoneEntryLog.id`; `valid_from` and `valid_until` are both set explicitly by the caller at creation time (not derived)
   - Acceptance: A `ZoneVisitorPass` can be constructed with `entry_log_id` pointing to any `ZoneEntryLog.id`; `valid_until` is a required, caller-supplied field (not optional, not computed)

6. **VISIT-03 active pass query**: Active visitor passes for a zone are queryable at a given moment.
   - Current: No query function exists
   - Target: `getActiveVisitorPasses(zoneId: string, allPasses: ZoneVisitorPass[], now: Date): ZoneVisitorPass[]` exported from `model.ts`; returns passes where `pass.zone_id === zoneId` AND `pass.valid_from <= now` AND `pass.valid_until >= now`
   - Acceptance: Returns correct subset for a zone with a mix of active, expired, and future passes; returns empty array when no passes match; returns empty array when `allPasses` is empty

7. **Test coverage — entry log**: Vitest tests covering LOG-01, LOG-02, LOG-03.
   - Current: `physical-access.test.ts` covers Phases 5 and 6 only; no entry log tests
   - Target: New `describe("ZoneEntryLog")` block in `physical-access.test.ts` with cases: valid CARD entry, valid ESCORT entry, ESCORT missing escort rejects, CARD with escort rejects, SECURED zone without entry rejects, SECURED zone with entry passes, non-SECURED zone with null entry passes
   - Acceptance: All new tests pass under `vitest run`; no existing tests regress

8. **Test coverage — visitor passes**: Vitest tests covering VISIT-01, VISIT-02, VISIT-03.
   - Current: No visitor pass tests
   - Target: New `describe("ZoneVisitorPass")` block in `physical-access.test.ts` with cases: `getActiveVisitorPasses` returns active pass, excludes expired pass, excludes future pass, empty when no passes, zone filter applied correctly
   - Acceptance: All new tests pass under `vitest run`; no existing tests regress

## Boundaries

**In scope:**
- `ZoneEntryLog` interface in `model.ts`
- `validateEntryLog(entry)` validator function in `model.ts`
- `validateSecuredZoneEntry(zone, entry)` validator function in `model.ts`
- `ZoneVisitorPass` interface in `model.ts`
- `getActiveVisitorPasses(zoneId, allPasses, now)` query function in `model.ts`
- Vitest tests for all of the above in `physical-access.test.ts`

**Out of scope:**
- Rust/PostgreSQL backend implementation — this milestone is demo/in-memory TypeScript only
- Real-time occupancy tracking beyond VISIT-03 (active pass query) — no head-count or presence tracking
- Escort eligibility validation (checking the escort holds a valid grant) — caller responsibility; Phase 6 grant resolution handles this
- Mock dataset entries for Phase 7 types — that is Phase 8 (SEED-07, SEED-08)
- Demo UI for Zone Entry Log and Visitor Passes — that is Phase 8 (UI-05, UI-06)
- Any changes to `routeTree.gen.ts` or the main app routing — demo stays isolated in `frontend/src/demo/`

## Constraints

- All code added to `model.ts` — Phase 7 does not create new files; it extends the single `model.ts` module where Phases 5 and 6 live
- Validation functions return `string | null` (error message or null), not `boolean` — consistent with the project pattern where error context matters
- `ZoneEntryLog.method` is a discriminated union field (`"CARD" | "ESCORT"`) but the interface uses a single flat shape; no subtype splitting (two separate structures, caller links via `entry_log_id`)
- No changes to existing exported functions from Phases 5/6 — `resolveZoneAccess`, `resolveGrant`, `isGrantActive`, `isDelegateActive` are frozen
- Tests run via `npm run test` (Vitest); Playwright e2e excluded from Vitest run per project convention

## Acceptance Criteria

- [ ] `ZoneEntryLog` and `ZoneVisitorPass` interfaces are exported from `model.ts` and type-check without error
- [ ] `validateEntryLog` returns `null` for valid CARD entry and valid ESCORT entry; returns error string for ESCORT without escort_person_id; returns error string for CARD with escort_person_id set
- [ ] `validateSecuredZoneEntry` returns null for non-SECURED zones with null entry; returns null for SECURED zone with a non-null entry; returns error string for SECURED zone with null entry
- [ ] `getActiveVisitorPasses` returns only passes where zone_id matches AND now falls within [valid_from, valid_until]
- [ ] All Phase 5 and 6 tests continue to pass after Phase 7 additions
- [ ] New entry log and visitor pass tests all pass under `vitest run` (zero failures, zero skips)
- [ ] No new TypeScript compiler errors introduced (`tsc --noEmit` passes)

## Ambiguity Report

| Dimension          | Score | Min  | Status | Notes                                                      |
|--------------------|-------|------|--------|------------------------------------------------------------|
| Goal Clarity       | 0.87  | 0.75 | ✓      | Entry log, SECURED enforcement, visitor pass all specified |
| Boundary Clarity   | 0.75  | 0.70 | ✓      | Backend, Phase 8 UI, escort eligibility explicitly excluded |
| Constraint Clarity | 0.85  | 0.65 | ✓      | Enforcement via model-level validators; no new files        |
| Acceptance Criteria| 0.78  | 0.70 | ✓      | 7 pass/fail criteria covering all 6 requirements           |
| **Ambiguity**      | 0.182 | ≤0.20| ✓      |                                                            |

## Interview Log

| Round | Perspective      | Question summary                           | Decision locked                                                        |
|-------|------------------|--------------------------------------------|------------------------------------------------------------------------|
| 1     | Researcher       | How should LOG-03 SECURED enforcement work? | Model-level validation function (`validateSecuredZoneEntry`)          |
| 1     | Researcher       | ESCORT entry + visitor pass: atomic or separate? | Two separate structures; caller links via `entry_log_id`          |
| 2     | Simplifier       | Who sets ZoneVisitorPass.valid_until?      | Caller provides explicitly at creation; not derived from exit_at       |
| 2     | Boundary Keeper  | What is out of scope?                      | Rust/DB backend explicitly out; escort eligibility = caller's responsibility |

---

*Phase: 07-entry-log-visitor-passes*
*Spec created: 2026-05-23*
*Next step: /gsd:discuss-phase 7 — implementation decisions (function signatures, test structure, wave sequencing)*
