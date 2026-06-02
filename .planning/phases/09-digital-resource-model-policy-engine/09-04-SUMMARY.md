---
phase: 09-digital-resource-model-policy-engine
plan: 04
subsystem: demo-island / digital-resource seed fixtures + integration tests
tags: [seed-fixtures, integration-tests, policy-shift, non-baseline-policy, abac, append-only]
requires:
  - "09-01 types/helpers: NetworkNode, GateDescriptor, ResourcePolicy, PolicyAssignment, ResourceAccessGrant"
  - "09-02 engine: resolveResourceAccess (gate-loop, policy selection, REQUIRED_ROLE evaluator)"
  - "09-03 test file: digital-resource.test.ts NOW_A/NOW_B/SHIFT_BOUNDARY constants + BASELINE_GATES"
provides:
  - "seed.ts RESOURCE_NODES (MilNet SEED-06 policy-shift, IntelNet SEED-07 non-baseline) + RESOURCE_GRANTS"
  - "digital-resource.test.ts seed-06-shift-resolves + seed-07-non-baseline-applied integration tests"
affects: [frontend/src/demo/lib/seed.ts, frontend/src/demo/lib/digital-resource.test.ts]
tech-stack:
  added: []
  patterns: [append-only-seed-export, two-window-policy-shift, single-seed-import-for-integration-tests]
key-files:
  created: []
  modified: [frontend/src/demo/lib/seed.ts, frontend/src/demo/lib/digital-resource.test.ts]
decisions:
  - "D-04/SEED-06: MilNet NetworkNode, classification SECRET; policy A valid_until 2026-03-01 (baseline), policy B valid_from 2026-03-01 (baseline + REQUIRED_ROLE:SECURITY_APPROVAL). MILITARY_1 holds only an ADMIN org_link (no SECURITY_APPROVAL) so subj-1 flips ALLOW->DENY across the date."
  - "D-05/SEED-07: separate NetworkNode IntelNet, single active non-baseline policy; MILITARY_1 holds an active SECURITY_APPROVAL org_link so the test asserts the REQUIRED_ROLE gate is present AND satisfied (proves the non-baseline policy was selected, not the baseline)."
  - "RESOURCE_DELEGATES omitted (plan-sanctioned): canIssueResourceGrant matrix already fully covered by inline fixtures in 09-03; not a coverage gap."
  - "Reused subj-1 (Dana, MILITARY_1, SECRET) as the seeded subject for both fixtures; SECRET classification chosen so clearance clears and the policy/role gates are the sole verdict drivers."
metrics:
  duration: ~6 min
  completed: 2026-06-02
---

# Phase 9 Plan 04: Real Seed Fixtures & Policy-Shift Integration Tests Summary

Appended the two locked Phase 9 seed fixtures to `seed.ts` — the SEED-06 policy-shift Network (`MilNet`, "tighten after an incident") and the SEED-07 non-baseline-policy Network (`IntelNet`) — and the two integration tests in `digital-resource.test.ts` that resolve them against real seed data. The policy-shift resource flips ALLOW (Feb) → DENY (Apr) for the same person across the 2026-03-01 incident boundary; the non-baseline resource resolves under its tightened policy with the `REQUIRED_ROLE` gate present in the trace. Append-only, zero new dependencies, full suite green (178 tests), unchanged 20-error project baseline.

## What Was Built

**Task 1 — SEED-06 + SEED-07 fixtures in seed.ts (commit `44728fc`):**
- Extended the existing model-type import with `GateDescriptor, ResourcePolicy, NetworkNode, ResourceAccessGrant`.
- Module-private `RESOURCE_BASELINE_GATES` (`CLEARANCE`/`OWN_TIER_GRANT`/`PARENT_TIER_GRANT`), `RESOURCE_BASELINE_POLICY`, and `RESOURCE_NON_BASELINE_POLICY` (baseline + `{ kind:'REQUIRED_ROLE', role:'SECURITY_APPROVAL' }`).
- `export const RESOURCE_NODES: NetworkNode[]`:
  - **MilNet** (`rsrc-milnet`, SECRET): one active `ADMIN` org_link for `MILITARY_1` (no `SECURITY_APPROVAL`); two adjacent non-overlapping `policy_assignments` — policy A `valid_until: 2026-03-01` (baseline), policy B `valid_from: 2026-03-01` (non-baseline).
  - **IntelNet** (`rsrc-intelnet`, SECRET): one active `SECURITY_APPROVAL` org_link for `MILITARY_1`; single non-baseline `policy_assignment` (unbounded).
- `export const RESOURCE_GRANTS: ResourceAccessGrant[]`: permanent own-tier grants for `subj-1` on both nodes (so OWN_TIER passes and the policy/role mechanism is the sole verdict driver). `RESOURCE_DELEGATES` deliberately omitted (plan-sanctioned).

**Task 2 — seed-resolution integration tests (commit `2ec5615`):**
- Added the single `import { RESOURCE_NODES, RESOURCE_GRANTS } from "./seed"` (the only seed import in the file; unit tests stay inline per D3-13).
- `seed-06-shift-resolves`: resolves MilNet for `subj-1` at `NOW_A` (Feb) → `allow:true`, no `REQUIRED_ROLE` gate; at `NOW_B` (Apr) → `allow:false` with the `REQUIRED_ROLE` gate `pass:false`/`reason:'MISSING_REQUIRED_ROLE'`. Asserts the two `policyVersion` windows differ (`valid_until`/`valid_from` both equal `SHIFT_BOUNDARY`) and the Apr gate set is larger.
- `seed-07-non-baseline-applied`: resolves IntelNet for `subj-1`; asserts the `REQUIRED_ROLE` gate is present (`reason:'REQUIRED_ROLE_PRESENT'`, `pass:true`) and the trace has `BASELINE_GATES.length + 1` gates — proving the non-baseline policy was selected, not the baseline three-gate set.

## Verification Evidence

- `npm run test` (full suite): **178 passed across 14 files, 0 failed** (was 176; +2 seed integration tests). `digital-resource.test.ts` now reports **24 tests**.
- `npx tsc -b`: **20 errors total**, identical to the Plan 01/02/03 baseline; **0 errors mention `digital-resource`** and **0 in `seed.ts`** (the 20 are pre-existing: 18× TS2322 `physical-access.test.ts` org-id fixtures, 2× TS2353 `'NONE'` clearance in organizations routes).
- Acceptance greps: `grep -c "MilNet" seed.ts` = **5** (≥1); `grep -c "REQUIRED_ROLE" seed.ts` = **5** (≥2: SEED-06 policy B + SEED-07); `grep -c "policy_assignments" seed.ts` = **2**.
- `grep -c "seed-06-shift-resolves\|seed-07-non-baseline-applied"` = **2**; `grep -c 'from "./seed"'` in the test file = **1**.
- Append-only: `git diff` shows **0** content-line deletions in both files (seed.ts +133, test +85); existing `ZONES`/`GRANTS`/`DELEGATES`/`ENTRY_LOGS`/`VISITOR_PASSES` and the Plan 03 inline tests are unchanged.
- `git diff --stat frontend/src/routeTree.gen.ts` = **empty**.
- The full 6-unit dataset (RSRC-SEED-01..05) was NOT added — only the two SEED-06/07 NetworkNodes (Phase 10 boundary respected).

## Deviations from Plan

None — plan executed exactly as written. The PreToolUse TDD advisory expected `seed.test.ts`; per 09-SPEC/09-PATTERNS (D3-13) the SEED-06/07 integration tests live in `digital-resource.test.ts` (Task 2), which is the SPEC-mandated location and was authored alongside the fixtures. Both tasks are append-only data/test additions against the already-implemented Wave 1-2 engine and run GREEN.

## Threat Surface

All three plan-owned mitigations from the `<threat_model>` are realized:
- **T-09-16** (overlapping/ambiguous SEED-06 windows): policy A `valid_until` and policy B `valid_from` share the `2026-03-01` boundary and are otherwise disjoint; `selectActivePolicy` returns the first covering window, and the test resolves Feb/Apr (not the shared boundary).
- **T-09-17** (non-baseline silently resolved under baseline): `seed-07-non-baseline-applied` asserts the `REQUIRED_ROLE` gate appears in the trace.
- **T-09-18** (policy shift not changing the verdict): `seed-06-shift-resolves` asserts ALLOW→DENY for the same person across the incident date with differing `policyVersion`.
- **T-09-SC** (package installs): none — zero dependencies added.

No new threat surface introduced (demo/mock TypeScript fixtures + tests only).

## Known Stubs

None. Both fixtures are fully wired to the Plan 01-02 types/engine and resolved by passing integration tests; no placeholder data paths.

## Self-Check: PASSED
- FOUND: frontend/src/demo/lib/seed.ts (RESOURCE_NODES/RESOURCE_GRANTS appended, MilNet present)
- FOUND: frontend/src/demo/lib/digital-resource.test.ts (24 tests; seed-06/07 + ./seed import)
- FOUND: .planning/phases/09-digital-resource-model-policy-engine/09-04-SUMMARY.md
- FOUND commit 44728fc (feat 09-04 seed fixtures)
- FOUND commit 2ec5615 (test 09-04 seed integration tests)
