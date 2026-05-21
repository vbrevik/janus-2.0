---
phase: 01-foundation
plan: "02"
subsystem: demo-lib
tags: [abac, typescript, vitest, tdd, model, seed, authorization]

requires: []
provides:
  - "model.ts: frozen unified world schema (6-unit UnitId, all ABAC + D-05 forward + D-11 lifecycle types)"
  - "abac.ts: pure-computed ABAC evaluator lifted verbatim from spike (evaluate, principalFromSubject, requirementFromResource)"
  - "seed.ts: 28 subjects + 26 resources across 6 units with named CA-1..CA-5 + FW-1..FW-5 actors"
  - "abac.test.ts: ported 6-test Vitest suite locking ENGINE-02 (per-domain tier) and ENGINE-03 (deny overrides)"
affects: [01-03, 01-04, phase-2, phase-3]

tech-stack:
  added: []
  patterns:
    - "Verbatim engine lift: spike abac.ts copied with import rebasing only (D-01)"
    - "TDD RED/GREEN: test written first with missing modules, then engine+seed written to pass"
    - "UnitId entity fusion: 6 canonical units replace spike 3-entity scaffolding (D-10)"
    - "Seed-head invariant: original 4+4 fixtures preserved above boundary comment (R9)"
    - "Type re-export from seed.ts for consumer convenience (Subject/Resource/etc from ./model)"

key-files:
  created:
    - frontend/src/demo/lib/model.ts
    - frontend/src/demo/lib/abac.ts
    - frontend/src/demo/lib/seed.ts
    - frontend/src/demo/lib/abac.test.ts
  modified: []

key-decisions:
  - "D-10 entity fusion applied: UnitId (6 units) is the single entity-id type; ENTITY_A/B/C retired"
  - "OQ-A resolved: MANAGER gains AUTHORIZE_SUBJECT/WITHDRAW_AUTHORIZATION; approve_attribute stays on ACCESS_APPROVER (SoD crux)"
  - "OQ-B resolved: D-11 authorization fields seeded now, rule wired in Phase 3 — CA-5 is seed-only in Phase 1"
  - "MILITARY_1 ↔ INTEL agreement intentionally absent to preserve Affiliation-DENY test fixture (R9)"
  - "CA-4 and CA-5 subjects given DATA:CLASSIFIED tier so only NTK/authorization blocks them (correct contrast actor semantics)"

patterns-established:
  - "Per-domain tier compare: TIERS[domain].indexOf — never collapse into single ladder (ENGINE-02/R3)"
  - "Deny overrides: revoked + securityHold fire regardless of base rules (ENGINE-03)"
  - "Seed boundary comment: Task-3 expansion appended below boundary; head records immutable"

requirements-completed: [MODEL-01, ENGINE-01, ENGINE-02, ENGINE-03, ROLE-02]

duration: 13min
completed: "2026-05-21"
---

# Phase 1 Plan 02: Frozen Model + ABAC Engine + Rich Seed Summary

**UnitId-keyed frozen schema (model.ts), verbatim ABAC engine (abac.ts), and 28/26-record 6-unit world (seed.ts) with named contrast actors CA-1..CA-5 and forward actors FW-1..FW-5; all 6 Vitest assertions green**

## Performance

- **Duration:** 13 min
- **Started:** 2026-05-21T18:23:36Z
- **Completed:** 2026-05-21T18:36:52Z
- **Tasks:** 3 (Task 2 has 2 TDD commits: RED + GREEN)
- **Files modified:** 4 created

## Accomplishments

- Frozen unified schema in `model.ts`: UnitId (6 units), Compartment widened to 6 values (SIGINT/STOCKWATCH/HOMELAND added), Subject/Resource with D-05 forward + D-11 lifecycle fields, ROLES with D-11 Manager authorize/withdraw ops, AttrOp with SET_REVOKED/CLEAR_REVOKED, all forward types (EntityPolicy/Deployment/Subunit/Envelope/Pointer/AttrClaims/Credential) as type stubs
- Verbatim ABAC engine in `abac.ts`: 4 conjunctive base rules, per-domain tier ladder independence (TIERS[domain].indexOf), deny overrides (revoked/securityHold), adapter helpers; no logic changes
- Rich 6-unit world in `seed.ts`: 28 subjects + 26 resources, all 6 units with profiles per AUTH-MODEL §12, CA-1..CA-5 contrast actors (ALLOW, tier-DENY, override-DENY x2, NTK-DENY, auth-gap seed-only), FW-1..FW-5 forward actors (intel shielded, deployed field hospital, industry leak target, hub pointers, rogue-issuer placeholder)
- Ported `abac.test.ts`: 6 green assertions including ENGINE-02 lock (clearance.pass=true/tier.pass=false) and ENGINE-03 lock (overridden.rules.every(r=>r.pass)=true)

## Task Commits

1. **Task 1: Frozen unified model schema** - `64211d4` (feat)
2. **Task 2 RED: Failing ABAC engine tests** - `64241b7` (test)
3. **Task 2 GREEN: Verbatim engine + seed head** - `78cab51` (feat)
4. **Task 3: Rich 6-unit seed + named actors** - `cb27b6e` (feat)

## Files Created/Modified

- `/frontend/src/demo/lib/model.ts` - Frozen unified world schema (types + const ladders; no seed arrays or functions)
- `/frontend/src/demo/lib/abac.ts` - Pure-computed ABAC evaluator verbatim from spike; imports rebased to ./model + ./seed
- `/frontend/src/demo/lib/seed.ts` - 28 subjects + 26 resources across 6 units; AGREEMENTS; HUB_INDEX; boundary comment separating head from expansion
- `/frontend/src/demo/lib/abac.test.ts` - 6-test Vitest suite; imports rebased to ./seed + ./abac

## Decisions Made

- **Entity fusion (D-10 applied):** UnitId from obligations.ts is the single entity-id type; spike ENTITY_A/B/C scaffolding retired entirely. model.ts and seed.ts never reference the old type.
- **OQ-A (Manager op-set):** MANAGER gains `AUTHORIZE_SUBJECT` and `WITHDRAW_AUTHORIZATION` (autoriserende leder). `approve_attribute`/`revoke_attribute` remain on ACCESS_APPROVER only — SoD crux preserved.
- **OQ-B (evaluate timing):** D-11 authorization fields are present and populated in the seed (ca5-subj with WITHDRAWN status), but the authorization rule is NOT wired into abac.ts. Phase 3 wires the rule (OQ-B). CA-5 is seed-only in Phase 1.
- **Affiliation DENY pair:** MILITARY_1 ↔ INTEL agreement intentionally absent. All other unit pairs are mutually agreed. This preserves the Affiliation-DENY fixture (subj-1@MILITARY_1 vs res-3@INTEL) without restricting the demo's ability to show cross-entity access.
- **CA-4 and CA-5 tier fix:** Both ca4-subj and ca5-subj given `DATA: "CLASSIFIED"` (matching fw3-res `requiredTier: "CLASSIFIED"`) so their respective DENYs are caused solely by the NTK and authorization gap, not a tier mismatch.
- **Type re-exports from seed.ts:** `Subject`, `Resource`, `HubPointer`, `UnitId` re-exported from seed.ts so the test can `import type { Subject } from "./seed"` matching the spike's `from "./data"` pattern (minimal diff, R9).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] ca4-subj and ca5-subj had DATA:RESTRICTED instead of DATA:CLASSIFIED**
- **Found during:** Task 3 (contrast actor verification)
- **Issue:** fw3-res requires `requiredTier: "CLASSIFIED"` but both CA-4 and CA-5 subjects had `DATA: "RESTRICTED"`, causing tier-DENY to fire before the intended NTK-DENY / authorization-gap. The contrast actor semantics require clearance OK + tier OK + NTK failing (CA-4) or authorization WITHDRAWN (CA-5).
- **Fix:** Set `domainAuth: { DATA: "CLASSIFIED", ... }` on both subjects.
- **Files modified:** frontend/src/demo/lib/seed.ts
- **Verification:** CA-4 NTK-DENY correctly isolates the compartment failure; CA-5 is seed-only per OQ-B.
- **Committed in:** cb27b6e (Task 3 commit)

**2. [Rule 1 - Bug] seed.ts did not re-export Subject/Resource types needed by abac.test.ts**
- **Found during:** Task 2 GREEN (TypeScript check)
- **Issue:** abac.test.ts imports `type Subject, type Resource` from `./seed` (matching spike pattern), but those types are defined in `./model`. TypeScript reported TS2724 errors.
- **Fix:** Added `export type { Subject, Resource, HubPointer, UnitId } from "./model"` to seed.ts.
- **Files modified:** frontend/src/demo/lib/seed.ts
- **Verification:** `npx tsc --noEmit` reports no errors in demo/lib; all 6 tests pass.
- **Committed in:** 78cab51 (Task 2 GREEN commit)

---

**Total deviations:** 2 auto-fixed (2 Rule 1 bugs — contrast actor field correction + type re-export fix)
**Impact on plan:** Both fixes necessary for correctness. No scope creep.

## Issues Encountered

- `npm ci` needed in the worktree before `npx vitest run` could execute (node_modules not present in git worktree). Ran `npm ci --prefer-offline` as a one-time setup step.
- Comments in model.ts/abac.ts initially referenced the old spike entity names (`ENTITY_A`, `EntityId`, `homeEntity`, `ownerEntity`) which triggered the acceptance-criteria grep checks. Fixed by rewriting comments to not mention the retired identifiers.

## Known Stubs

- **CA-5 authorization-gap:** `ca5-subj` has `authorization.status: "WITHDRAWN"` but the ABAC engine does NOT evaluate this field in Phase 1 (OQ-B). The field is seeded and visible; the rule that makes it cause a DENY will be wired in Phase 3. This is intentional per the plan.
- **FW-5 rogue-issuer:** `fw5-subj` carries `clearanceGrantedBy: "ROGUE-ISSUER"` as a placeholder. The `issueCredential`/`verifyCredential` functions from spike 006 are not yet wired. Phase 2 implements credential verification.
- **Forward types in model.ts:** `Envelope`, `EntityPolicy`, `AttrClaims`, `Credential` are type stubs only; their implementing functions remain in `frontend/src/spikes/lib/` for Phase 2/3 reference.

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes at trust boundaries introduced. All files are in-memory TypeScript types and seed data only. No threat flags beyond those catalogued in the plan's threat model (T-02-01 through T-02-SC).

## Next Phase Readiness

- `model.ts`, `abac.ts`, and `seed.ts` are the stable foundation for plan 01-03 (world-state store) and 01-04 (Decision Explorer view).
- The store (01-03) imports `Subject`, `Resource`, `AttrEvent`, `AttrOp`, `RoleId`, `ROLES` from `./model` and `SUBJECTS`, `RESOURCES`, `AGREEMENTS`, `HUB_INDEX` from `./seed`.
- The Decision Explorer (01-04) imports `evaluate`, `principalFromSubject`, `requirementFromResource` from `./abac`.
- No blockers for 01-03 or 01-04.

---
*Phase: 01-foundation*
*Completed: 2026-05-21*
