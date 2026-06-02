---
phase: 09-digital-resource-model-policy-engine
plan: 03
subsystem: demo-island / digital-resource policy-engine test suite
tags: [tdd, vitest, blocking-tests, abac, policy-engine, threat-mitigation, append-only]
requires:
  - "09-01 types/helpers: NetworkNode/PlatformNode/ApplicationNode, OrgLink, GateDescriptor, ResourcePolicy, PolicyAssignment, ResourceAccessGrant, ResourceAccessDelegate, isWindowActive, activeOrgLinks(ForRole), effectiveClassification, selectActivePolicy, validatePolicyWindows"
  - "09-02 engine: resolveResourceAccess, canIssueResourceGrant, evaluateGate, baseline evaluators"
  - "v2.1: ZoneNode, PhysicalAccessGrant, resolveZoneAccess (advisory-zone fixtures)"
provides:
  - "frontend/src/demo/lib/digital-resource.test.ts — 22 blocking Vitest tests, one per Phase 9 acceptance criterion"
  - "five grep-able named pitfall mitigations (cross-tier-inheritance-blocked, advisory-non-blocking, unknown-gate-kind-errors, no-active-policy-denies, app-classification-inherited)"
affects: [frontend/src/demo/lib/digital-resource.test.ts]
tech-stack:
  added: []
  patterns: [inline-fixtures-no-seed-import, fixed-NOW-determinism, SEED-06-window-constants-NOW_A-NOW_B, one-named-test-per-threat]
key-files:
  created: [frontend/src/demo/lib/digital-resource.test.ts]
  modified: []
decisions:
  - "Inline fixtures only; no seed.ts import (D3-13 pattern). SEED-06/07 integration tests are deferred with the seed fixtures themselves (Phase 10) — this plan tests the engine, which is fully implemented."
  - "SEED-06 boundary 2026-03-01 (D-04): NOW_A=2026-02-15 window A -> ALLOW, NOW_B=2026-04-15 window B -> DENY; 2026-06-01 not used."
  - "Disjoint policy windows use a one-second gap for the validator's null case — the inclusive boundary rule treats touching windows as overlapping (documented inline)."
  - "App-classification test gives the subject own-tier + parent grants so CLEARANCE is the sole denial driver, proving the Platform's SECRET (not a value on the App) gates the App."
metrics:
  duration: ~3 min
  completed: 2026-06-02
---

# Phase 9 Plan 03: Digital Resource Blocking Test Suite Summary

Created `frontend/src/demo/lib/digital-resource.test.ts` — 22 blocking Vitest tests asserting the real fail-closed, no-cross-tier-leak, non-blocking-advisory, point-in-time, and delegation-authority behavior of the Plan 01-02 engine. The five exactly-named pitfall tests are the executable threat mitigations for this phase; all run green against the already-implemented code, the full 176-test suite passes, and the new file adds zero TypeScript errors over the pre-existing 20-error baseline.

## What Was Built

**Task 1 — Five named pitfall blocking tests (commit `6df7e1b`):** Header coverage comment, `vitest` + Phase 9 symbol imports from `./model`, a fixed `NOW` and SEED-06 `NOW_A`/`NOW_B`/`SHIFT_BOUNDARY` constants, then the grep-able mitigations:
- `cross-tier-inheritance-blocked` (req 7 / T-09-11): subject holds ONLY a Network grant; Platform resolution returns `allow:false` with `OWN_TIER_GRANT.pass:false` while `PARENT_TIER_GRANT.pass:true` — proving the denial is the cross-tier block, not a missing parent.
- `advisory-non-blocking` (req 8 / T-09-12): all access gates pass, zone prereq unsatisfiable → `allow:true`, `zoneAdvisory !== null`, `zoneAdvisory.allow === false`.
- `unknown-gate-kind-errors` (req 5 / T-09-13): injected `{ kind: 'NONEXISTENT_GATE' }` → entry `pass:false`, `reason:'UNKNOWN_GATE_KIND'`, `result.allow:false` (never silent ALLOW).
- `no-active-policy-denies` (req 4 / D-03): assignments not covering `NOW` → `allow:false`, `reason:'NO_ACTIVE_POLICY'`, `policyVersion:null`, `gates:[]`.
- `app-classification-inherited` (req 2 / T-09-14): SECRET Platform + App with no classification; subject below SECRET fails CLEARANCE via the Platform's value; `expect('classification' in app).toBe(false)` and `effectiveClassification(app, [platform]) === 'SECRET'`.

**Task 2 — Gate-matrix, policy-window, org-link, delegation, trace tests (commit `a9a922f`):**
- `baseline-allow` + `baseline-deny-clearance` / `baseline-deny-own-tier` / `baseline-deny-parent-tier`, each flipping exactly one precondition and asserting that gate's reason.
- `gates-evaluate-in-list-order`: permuted gate order; `result.gates` order matches policy `gates[]` exactly.
- `policy-shift-window-A` / `policy-shift-window-B`: MilNet narrative — policy A (3 gates) ALLOWs at `NOW_A`, policy B (4 gates incl. `REQUIRED_ROLE: SECURITY_APPROVAL`) DENYs at `NOW_B`; `policyVersion` matches the selected window.
- `selectActivePolicy` window selection + null-when-uncovered; `overlapping-windows-validator` (overlap → error string, disjoint → null).
- `org-links-active-by-role` (2 active OPERATOR, 0 active ADMIN at `NOW`); `isWindowActive` inclusive boundary.
- `canIssueResourceGrant` matrix: `can-issue-admin` / `can-issue-delegate` true; `cannot-issue-non-admin` (OPERATOR/ASSET_OWNER/SECURITY_APPROVAL) / `cannot-issue-expired-delegate` false.
- `explainable-trace`: one entry per baseline gate with non-empty reasons, `zoneAdvisory` a separate field (no `GRANT_LOOKUP` leaking into `gates`), `policyVersion` matching the assignment window.

## Verification Evidence

- `npm run test -- digital-resource`: **22 passed, 0 failed.**
- `npm run test` (full suite): **176 passed across 14 files, 0 failed.**
- `npm run build`: exactly **20 pre-existing errors** (18× TS2322 in `physical-access.test.ts` org-id fixtures, 2× TS2353 `'NONE'` clearance in organizations routes) — identical to the Plan 01/02 baseline; **0 errors mention `digital-resource`** (`grep -c digital-resource` on build output = 0).
- Named-test presence: all five names + the Task-2 named tests grep-confirmed (`baseline-deny-`=3, window/order set=5, can-issue set=4).
- `grep -c 'from "./seed"'` = **0** (inline fixtures only, D3-13 pattern).
- `git diff --stat frontend/src/demo/lib/model.ts frontend/src/demo/lib/seed.ts` = **empty** (append-only; this plan creates only the test file).
- No file deletions in either commit.

## Deviations from Plan

None — plan executed exactly as written. Both tasks are TDD tests against already-implemented Wave 1-2 code and run GREEN (not RED), as the plan's `<critical_constraints>` require. The SEED-06/07 integration tests that the plan/PATTERNS note "DO import from seed.ts" are correctly NOT in this file: the SEED-06/07 seed fixtures are Phase 10 scope (per 09-SPEC Out-of-scope and the RSRC-SEED-06/07 → Phase 9 note remains seed-only), so the policy-shift mechanism is exercised here with inline adjacent-window assignments mirroring the locked D-04 narrative (boundary 2026-03-01, NOW_A ALLOW / NOW_B DENY) rather than against seed data that does not yet exist.

## Deferred Issues

20 pre-existing TypeScript errors remain (out of SCOPE BOUNDARY; tracked in `.planning/phases/09-digital-resource-model-policy-engine/deferred-items.md`). None originate from `digital-resource.test.ts`. Not fixed.

## Threat Surface

All five threat-register mitigations (T-09-11..15) now have grep-able named blocking tests that fail if the corresponding engine mitigation is removed:
- T-09-11 cross-tier inheritance → `cross-tier-inheritance-blocked`
- T-09-12 advisory flipping the verdict → `advisory-non-blocking`
- T-09-13 silent ALLOW on unknown kind / no policy → `unknown-gate-kind-errors` + `no-active-policy-denies`
- T-09-14 misclassified Application → `app-classification-inherited`
- T-09-15 non-ADMIN delegation → `canIssueResourceGrant` matrix (`can-issue-*` / `cannot-issue-*`)

No new threat surface introduced (test-only file, zero dependencies added).

## Known Stubs

None. Every test asserts real engine behavior against the Plan 01-02 implementation; no placeholder/mock data paths.

## Self-Check: PASSED
- FOUND: frontend/src/demo/lib/digital-resource.test.ts (869 lines, 22 tests)
- FOUND: .planning/phases/09-digital-resource-model-policy-engine/09-03-SUMMARY.md
- FOUND commit 6df7e1b (test 09-03 five named pitfall tests)
- FOUND commit a9a922f (test 09-03 gate-matrix/policy-window/delegation/trace tests)
