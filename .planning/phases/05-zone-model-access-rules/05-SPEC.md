# Phase 5: Zone Model & Access Rules — Specification

**Created:** 2026-05-23
**Ambiguity score:** 0.14 (gate: ≤ 0.20)
**Requirements:** 9 locked

## Goal

`model.ts` is extended with a 5-tier clearance ladder, a complete zone hierarchy type (ZoneNode, ZoneLevel, ZoneType), and three access-rule functions that all downstream phases can import without ambiguity.

## Background

The current demo (`frontend/src/demo/lib/model.ts`) defines a 4-tier `Clearance` type (`UNCLASSIFIED → CONFIDENTIAL → SECRET → TOP_SECRET`) and a physical access placeholder in `TIERS.PHYSICAL` (`["LOBBY", "RESTRICTED_AREA", "SECURE_VAULT"]`). No zone hierarchy (tree nodes, levels, zone types) exists anywhere in the demo. No access-rule functions exist. All downstream v2.1 phases (grants, entry log, demo UI) need these as a stable, tested foundation.

## Requirements

1. **5-tier clearance ladder**: The `Clearance` union and `CLEARANCE_RANK` in `model.ts` gain a fifth value.
   - Current: `Clearance` = `"UNCLASSIFIED" | "CONFIDENTIAL" | "SECRET" | "TOP_SECRET"` (4 tiers, ranks 0–3)
   - Target: `Clearance` = `"UNCLASSIFIED" | "RESTRICTED" | "CONFIDENTIAL" | "SECRET" | "TOP_SECRET"` (5 tiers); `CLEARANCE_RANK` maps `RESTRICTED` to `1`, shifts `CONFIDENTIAL` to `2`, `SECRET` to `3`, `TOP_SECRET` to `4`
   - Acceptance: `CLEARANCE_RANK["RESTRICTED"] === 1` and `CLEARANCE_RANK["CONFIDENTIAL"] === 2` in a Vitest assertion; TypeScript `tsc --noEmit` passes across the whole project

2. **Remove stale PHYSICAL tiers**: `TIERS.PHYSICAL` in `model.ts` is deleted.
   - Current: `TIERS.PHYSICAL = ["LOBBY", "RESTRICTED_AREA", "SECURE_VAULT"]`
   - Target: `TIERS` no longer has a `PHYSICAL` key; the `Domain` union remains (`"COMPUTER" | "DATA" | "PHYSICAL"`)
   - Acceptance: `grep "LOBBY\|RESTRICTED_AREA\|SECURE_VAULT" frontend/src/demo/lib/model.ts` returns no matches; `tsc --noEmit` passes

3. **ZoneLevel enum**: An ordered 5-level enum type is defined in `model.ts`.
   - Current: No `ZoneLevel` type exists anywhere in the demo
   - Target: `export type ZoneLevel = "SITE" | "AREA" | "BUILDING" | "ZONE" | "ROOM"` exported from `model.ts`; order is semantically significant (SITE = broadest, ROOM = narrowest)
   - Acceptance: Type is exported and importable; `tsc --noEmit` passes

4. **ZoneType enum**: A 3-value security classification for zones is defined in `model.ts`.
   - Current: No `ZoneType` type exists
   - Target: `export type ZoneType = "CONTROLLED" | "RESTRICTED" | "SECURED"` exported from `model.ts`
   - Acceptance: Type is exported and importable; `tsc --noEmit` passes

5. **ZoneNode interface**: A tree-node type for zone hierarchy is defined in `model.ts`.
   - Current: No zone tree node type exists
   - Target: `export interface ZoneNode { id: string; name: string; level: ZoneLevel; zone_type: ZoneType; parent_id: string | null; admin_org_id: string; asset_owner_org_id: string; requires_explicit_auth: boolean; }` exported from `model.ts`
   - Acceptance: Interface is exported; a valid `ZoneNode` object literal with all fields passes TypeScript; `tsc --noEmit` passes

6. **ZONE-03 ceiling rule**: A function enforces that SECURED zone_type is only valid at BUILDING, ZONE, or ROOM level.
   - Current: No such validation function exists
   - Target: `export function isValidZoneTypeCombination(level: ZoneLevel, zone_type: ZoneType): boolean` returns `false` when `zone_type === "SECURED"` and `level` is `"SITE"` or `"AREA"`; returns `true` for all other combinations
   - Acceptance: Vitest tests confirm: `isValidZoneTypeCombination("SITE", "SECURED") === false`, `isValidZoneTypeCombination("AREA", "SECURED") === false`, `isValidZoneTypeCombination("BUILDING", "SECURED") === true`, `isValidZoneTypeCombination("SITE", "CONTROLLED") === true`

7. **CONTROLLED zone rule**: A function evaluates access to a CONTROLLED zone (authz only, no clearance required).
   - Current: No zone access rule functions exist
   - Target: `export function evaluateControlledAccess(hasGrant: boolean): ZoneAccessResult` returns `{ allow: true, reason: "GRANT_FOUND" }` when `hasGrant` is true; `{ allow: false, reason: "NO_GRANT" }` otherwise
   - Acceptance: Vitest tests confirm both branches; `ZoneAccessResult` type is exported with `{ allow: boolean; reason: string }`

8. **RESTRICTED zone rule**: A function evaluates access to a RESTRICTED zone (clearance >= RESTRICTED OR escort).
   - Current: No zone access rule functions exist
   - Target: `export function evaluateRestrictedAccess(hasGrant: boolean, clearance: Clearance, isEscorted: boolean): ZoneAccessResult` returns ALLOW when `hasGrant && (CLEARANCE_RANK[clearance] >= CLEARANCE_RANK["RESTRICTED"] || isEscorted)`; returns DENY with specific reason otherwise
   - Acceptance: Vitest tests confirm: grant + sufficient clearance → ALLOW, grant + insufficient clearance + escort → ALLOW, grant + insufficient clearance + no escort → DENY(`"INSUFFICIENT_CLEARANCE"`), no grant → DENY(`"NO_GRANT"`)

9. **SECURED zone rule**: A function evaluates access to a SECURED zone (clearance >= SECRET AND explicit grant AND escort-or-logged-entry).
   - Current: No zone access rule functions exist
   - Target: `export function evaluateSecuredAccess(hasGrant: boolean, clearance: Clearance, isEscorted: boolean): ZoneAccessResult` returns ALLOW only when `hasGrant && CLEARANCE_RANK[clearance] >= CLEARANCE_RANK["SECRET"]`; escort is noted in reason but does not substitute for clearance in SECURED zones
   - Acceptance: Vitest tests confirm: grant + SECRET clearance → ALLOW, grant + CONFIDENTIAL clearance → DENY(`"INSUFFICIENT_CLEARANCE"`), no grant + SECRET clearance → DENY(`"NO_GRANT"`)

## Boundaries

**In scope:**
- Extending `model.ts` with `Clearance` (5-tier), `ZoneLevel`, `ZoneType`, `ZoneNode`, `ZoneAccessResult`
- Removing `TIERS.PHYSICAL` from `model.ts`
- Three access-rule functions (`evaluateControlledAccess`, `evaluateRestrictedAccess`, `evaluateSecuredAccess`)
- `isValidZoneTypeCombination` ceiling-rule function
- Vitest unit tests for all 4 functions (covering ≥2 branches each)
- TypeScript compilation clean across the project after changes

**Out of scope:**
- `PhysicalAccessGrant` type — Phase 6 (grant resolution needs zone hierarchy first)
- `ZoneAccessDelegate` type — Phase 6
- Two-gate resolution (ACCESS-05) — Phase 6
- `ZoneEntryLog` and `ZoneVisitorPass` — Phase 7
- Mock dataset with zone tree data — Phase 8
- Demo UI (Zone Browser, Resolution Explorer, Entry Log view) — Phase 8
- Any Rust/PostgreSQL backend changes — deferred to a future milestone
- Existing demo components or routes (no UI changes in Phase 5)

## Constraints

- All changes are in `frontend/src/demo/lib/` only — no other directories touched
- `model.ts` is the canonical home for all new types and functions (no new files)
- Vitest tests go in `frontend/src/demo/lib/physical-access.test.ts` (new file, named after the domain)
- `tsc -b --noEmit` must pass across the full project after changes
- Existing Vitest suite (80 tests) must still pass — adding `RESTRICTED` to `Clearance` must not break any existing test
- `isEscorted` parameter in SECURED rule records the escort note in the result reason but escort does NOT substitute for SECRET+ clearance (unlike RESTRICTED where escort is a valid alternate path)

## Acceptance Criteria

- [ ] `Clearance` type in `model.ts` includes `"RESTRICTED"` between `"UNCLASSIFIED"` and `"CONFIDENTIAL"`
- [ ] `CLEARANCE_RANK["RESTRICTED"] === 1` and `CLEARANCE_RANK["CONFIDENTIAL"] === 2`
- [ ] `TIERS.PHYSICAL` removed from `model.ts`; `grep "LOBBY"` in model.ts returns no matches
- [ ] `ZoneLevel`, `ZoneType`, `ZoneNode`, `ZoneAccessResult` exported from `model.ts`
- [ ] `isValidZoneTypeCombination("SITE", "SECURED")` returns `false`
- [ ] `isValidZoneTypeCombination("BUILDING", "SECURED")` returns `true`
- [ ] `evaluateControlledAccess` passes Vitest (GRANT → ALLOW, NO_GRANT → DENY)
- [ ] `evaluateRestrictedAccess` passes Vitest (4 branches)
- [ ] `evaluateSecuredAccess` passes Vitest (≥3 branches including clearance-insufficient case)
- [ ] `tsc -b --noEmit` exits 0 across the full project
- [ ] All existing 80 Vitest tests still pass

## Ambiguity Report

| Dimension          | Score | Min  | Status | Notes                                             |
|--------------------|-------|------|--------|---------------------------------------------------|
| Goal Clarity       | 0.90  | 0.75 | ✓      | Specific: extend model.ts with types + functions  |
| Boundary Clarity   | 0.85  | 0.70 | ✓      | Grants/UI/log explicitly deferred to later phases |
| Constraint Clarity | 0.80  | 0.65 | ✓      | model.ts home, no new files, Vitest required      |
| Acceptance Criteria| 0.85  | 0.70 | ✓      | 11 pass/fail checkboxes                           |
| **Ambiguity**      | 0.14  | ≤0.20| ✓      |                                                   |

## Interview Log

| Round | Perspective     | Question summary                        | Decision locked                                               |
|-------|-----------------|-----------------------------------------|---------------------------------------------------------------|
| 1     | Researcher      | Where does clearance ladder live?       | Extend model.ts — FROZEN comment is v2.0-specific            |
| 1     | Simplifier      | Tests required for rule functions?      | Yes — Vitest unit tests required for all 3 rule functions     |
| 1     | Boundary Keeper | Remove old PHYSICAL tiers?              | Yes — TIERS.PHYSICAL removed; Domain union unchanged          |

---

*Phase: 05-zone-model-access-rules*
*Spec created: 2026-05-23*
*Next step: /gsd:discuss-phase 5 — implementation decisions (function signatures, test file location, RESTRICTED escort semantics)*
