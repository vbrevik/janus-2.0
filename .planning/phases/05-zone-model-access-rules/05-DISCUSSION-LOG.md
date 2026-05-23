# Phase 5: Zone Model & Access Rules - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-23
**Phase:** 5-zone-model-access-rules
**Areas discussed:** ZoneAccessResult shape, Tree traversal helpers, Escort semantics, Clearance rank shift

---

## ZoneAccessResult shape

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal `{ allow, reason }` | Simple; Phase 6 wraps two results into its own GateResult | |
| Rich `{ allow, gate, reason, detail? }` | Gate discriminator baked in Phase 5; Phase 6 composes without reshaping | ✓ |

**User's choice:** Rich type with `gate` field

| Option | Description | Selected |
|--------|-------------|----------|
| Typed union reason | e.g. `'GRANT_FOUND' \| 'NO_GRANT' \| 'INSUFFICIENT_CLEARANCE'` — exhaustive switch, no typos | ✓ |
| Freeform string | Simpler; no compile-time guarantee | |

**User's choice:** Typed union

| Option | Description | Selected |
|--------|-------------|----------|
| `gate` always `'ZONE_TYPE_RULE'` for Phase 5 functions | Phase 5 evaluates only gate 2; Phase 6 creates `'GRANT_LOOKUP'` results independently | ✓ |
| Caller-supplied gate param | Flexible but makes output ambiguous | |

**User's choice:** Always `'ZONE_TYPE_RULE'` from Phase 5 functions

---

## Tree traversal helpers

| Option | Description | Selected |
|--------|-------------|----------|
| Include `getAncestors()` in Phase 5 | Phase 6 imports directly; no duplication | ✓ |
| Defer to Phase 6 | Phase 6 implements traversal inline; larger Phase 6 plan | |

**User's choice:** Include `getAncestors()` in Phase 5

| Option | Description | Selected |
|--------|-------------|----------|
| Only `getAncestors()` | Minimal — Phase 8 defines its own rendering traversal | |
| Both `getAncestors()` and `getDescendants()` | Symmetric; avoids duplicate in Phase 8 | ✓ |

**User's choice:** Add both helpers

| Option | Description | Selected |
|--------|-------------|----------|
| Same `physical-access.test.ts` | One test file for all Phase 5 additions | ✓ |
| Separate `tree-helpers.test.ts` | Cleaner separation but adds a file outside SPEC scope | |

**User's choice:** Same `physical-access.test.ts`

---

## Escort semantics

| Option | Description | Selected |
|--------|-------------|----------|
| `isEscorted: boolean` | Caller asserts escort exists | |
| Rename to `hasValidEscort: boolean` | Signals caller must verify escort has active grant | ✓ |

**User's choice:** Rename to `hasValidEscort` in `evaluateRestrictedAccess`

| Option | Description | Selected |
|--------|-------------|----------|
| Keep `isEscorted` for detail annotation only | Captured for audit trace; doesn't affect ALLOW/DENY | ✓ |
| Drop from `evaluateSecuredAccess` | Simpler signature | |

**User's choice:** Keep `isEscorted` in `evaluateSecuredAccess` for detail annotation only

| Option | Description | Selected |
|--------|-------------|----------|
| Use `CLEARANCE_RANK` directly | Consistent with `abac.ts` pattern | ✓ |
| Add `compareClearance()` helper | More readable but adds API surface | |

**User's choice:** Use `CLEARANCE_RANK` directly

---

## Clearance rank shift

| Option | Description | Selected |
|--------|-------------|----------|
| Update ranks inline | All comparisons relative; existing tests self-correct | ✓ |
| Grep for hardcoded rank numbers first | Safer if tests compare numeric values directly | |

**User's choice:** Update ranks inline (`RESTRICTED=1, CONFIDENTIAL=2, SECRET=3, TOP_SECRET=4`)

| Option | Description | Selected |
|--------|-------------|----------|
| Run tests first to establish baseline | Green baseline before changes; regressions visible immediately | ✓ |
| Run once at end | Simpler workflow | |

**User's choice:** Run `npx vitest run` before touching `model.ts`

---

## Claude's Discretion

None — all gray areas resolved by user selection.

## Deferred Ideas

None — discussion stayed within phase scope.
