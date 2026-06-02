---
phase: 09-digital-resource-model-policy-engine
verified: 2026-06-02T10:05:00Z
status: passed
score: 7/7 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: none
  note: initial verification
---

# Phase 9: Digital Resource Model & Policy Engine Verification Report

**Phase Goal:** The digital-resource type system and gate-chain resolver are defined, tested, and safe to build on — every critical pitfall has a blocking Vitest test.
**Verified:** 2026-06-02T10:05:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Test-run result (verifier-executed, not SUMMARY-claimed)

- `npm run test` → **14 files passed, 178 tests passed, 0 failed** (digital-resource.test.ts: **24 tests passed**). Run by the verifier in this session.
- `npx tsc -b --noEmit` → **20 errors in 3 files**, ALL pre-existing baseline: `src/demo/lib/physical-access.test.ts` (18× TS2322, last touched Phases 5–7), `src/routes/admin/organizations/index.tsx` + `src/routes/organizations/index.tsx` (2× TS2353, `NONE` clearance, predate Phase 9 — commits `d2fd5ab`/`c3ab511`). **Zero TS errors in `model.ts`, `seed.ts`, or `digital-resource.test.ts`** (grep of tsc output for those files returns nothing). Phase 9 introduced ZERO new errors.

### Observable Truths (the 7 ROADMAP success criteria)

| # | Truth | Status | Evidence |
| - | ----- | ------ | -------- |
| 1 | Network-only grant → Platform eval returns `allow:false` (cross-tier blocked); named test passes | ✓ VERIFIED | Test `cross-tier-inheritance-blocked` (digital-resource.test.ts:91) asserts `allow=false`, `OWN_TIER_GRANT.pass=false`, AND `PARENT_TIER_GRANT.pass=true` (isolating the cross-tier block). Implementation: `evaluateOwnTierGrantGate` (model.ts:947) uses FLAT `resource_id === ctx.resource.id` match, NO ancestor walk; parent is a separate check (model.ts:965). |
| 2 | Only zone prereq unsatisfied → `allow:true`, `zoneAdvisory` present + non-null | ✓ VERIFIED | Test `advisory-non-blocking` (digital-resource.test.ts:145): `allow=true`, `zoneAdvisory != null`, `zoneAdvisory.allow=false`. Implementation: resolver Step 4 (model.ts:1115–1129) attaches `zoneAdvisory` from reused `resolveZoneAccess`; `allow` computed at line 1111 from gates only — never from advisory. |
| 3 | Same resource at two timestamps across a policy boundary returns different gate sets | ✓ VERIFIED | Tests `policy-shift-window-A` (allow=true, 3 gates) / `policy-shift-window-B` (allow=false, 4 gates incl REQUIRED_ROLE) at NOW_A/NOW_B straddling 2026-03-01 (test:570,594); `selectActivePolicy returns A in w1, B in w2` (test:625); seed test `seed-06-shift-resolves` (test:884) confirms differing `policyVersion` + gate counts. Implementation: `selectActivePolicy` (model.ts:862) + resolver Step 1 (model.ts:1081). |
| 4 | `ApplicationNode` has NO classification field; resolver derives via app→platform; clearance gate uses Platform's classification | ✓ VERIFIED | Type def `ApplicationNode` (model.ts:744) has no `classification` field. Test `app-classification-inherited` (test:279): runtime `"classification" in app === false`, `effectiveClassification(app,[platform]) === "SECRET"`, subject CONFIDENTIAL → CLEARANCE gate fails on inherited SECRET. Implementation: `effectiveClassification` single-hop `app→platform` (model.ts:843), fail-closed throw if platform missing. |
| 5 | `canIssueResourceGrant`: true for active ADMIN-org actor AND active delegate; false for non-ADMIN/no-delegate AND expired-delegate | ✓ VERIFIED | Delegation matrix tests (test:774–795): admin→true, active ORG delegate→true, OPERATOR/ASSET_OWNER/SECURITY_APPROVAL→false, expired delegate+expired ADMIN→false. Implementation: `canIssueResourceGrant` (model.ts:1147) checks active ADMIN org_link OR active matching ORG delegate via `isWindowActive`. |
| 6 | `seed.ts` contains SEED-06 (policy-shift) + SEED-07 (non-baseline), each resolved by a passing test | ✓ VERIFIED | `RESOURCE_NODES` (seed.ts:1316): MilNet=SEED-06 two adjacent policy windows across 2026-03-01 (baseline / +REQUIRED_ROLE); IntelNet=SEED-07 single non-baseline policy. Seed tests `seed-06-shift-resolves` (test:884) and `seed-07-non-baseline-applied` (test:930) import real `RESOURCE_NODES`/`RESOURCE_GRANTS` and resolve them — both pass. |
| 7 | `npm run test` passes zero failures, zero new TS errors from Phase 9 | ✓ VERIFIED | 178/178 tests pass (verifier-run). 20 tsc errors are the documented pre-existing baseline in unrelated Phase 5–7 / org-route files; zero in Phase 9 files (verified via grep of tsc output). |

**Score:** 7/7 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `frontend/src/demo/lib/model.ts` | Phase 9 types + resolver + helpers (append-only) | ✓ VERIFIED | 1167 lines; exports all 9 types (OrgLink, GateDescriptor, ResourcePolicy, PolicyAssignment, NetworkNode, PlatformNode, ApplicationNode, ResourceAccessGrant, ResourceAccessDelegate) + 8 functions incl `resolveResourceAccess`, `canIssueResourceGrant`, `effectiveClassification`, `selectActivePolicy`, `validatePolicyWindows`. All pure with explicit `now`. |
| `frontend/src/demo/lib/digital-resource.test.ts` | Blocking suite, one named test per criterion | ✓ VERIFIED | 954 lines, 24 passing tests; all 5 exactly-named pitfall tests present (`cross-tier-inheritance-blocked`, `advisory-non-blocking`, `unknown-gate-kind-errors`, `no-active-policy-denies`, `app-classification-inherited`). |
| `frontend/src/demo/lib/seed.ts` | SEED-06/07 fixtures | ✓ VERIFIED | `RESOURCE_NODES` + `RESOURCE_GRANTS` exported (seed.ts:1316,1377); substantive real fixtures, not stubs. |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | -- | --- | ------ | ------- |
| digital-resource.test.ts | model.ts | named imports of resolver + types | ✓ WIRED | import block test:28–49 |
| digital-resource.test.ts | seed.ts | `RESOURCE_NODES`, `RESOURCE_GRANTS` | ✓ WIRED | import test:52; used in seed integration tests |
| resolveResourceAccess | resolveZoneAccess (v2.1) | advisory reuse, unchanged | ✓ WIRED | model.ts:1119 — reuses v2.1 fn, attaches to separate field |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Full Vitest suite | `npm run test` | 178 passed / 0 failed | ✓ PASS |
| Phase 9 suite | (digital-resource.test.ts in run) | 24 passed | ✓ PASS |
| TypeScript build | `npx tsc -b --noEmit` | 20 baseline errors, 0 in Phase 9 files | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Status | Evidence |
| ----------- | ----------- | ------ | -------- |
| RSRC-01..05 | 09-01 | ✓ SATISFIED | Node types + strict-tree links (model.ts:720–751) |
| RSRC-POLICY-01..05 | 09-01/02/03/04 | ✓ SATISFIED | ResourcePolicy, PolicyAssignment, selectActivePolicy, validatePolicyWindows |
| RSRC-ACCESS-01..05 | 09-02/03 | ✓ SATISFIED | resolveResourceAccess + gate evaluators + named pitfall tests |
| RSRC-GRANT-01..03 | 09-01/02 | ✓ SATISFIED | ResourceAccessGrant + own/parent-tier gate evaluation |
| RSRC-DELEG-01 | 09-01/02 | ✓ SATISFIED | ResourceAccessDelegate + canIssueResourceGrant (closes v2.1 DELEG-03 gap) |
| RSRC-SEED-06 | 09-04 | ✓ SATISFIED | MilNet policy-shift fixture + seed test |
| RSRC-SEED-07 | 09-04 | ✓ SATISFIED | IntelNet non-baseline fixture + seed test |

All 21 phase requirement IDs are declared across the 4 plans and verified. No orphaned requirements.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| (none in Phase 9 files) | — | — | — | No TBD/FIXME/XXX in model.ts/seed.ts/digital-resource.test.ts. Two "placeholder" matches at seed.ts:778,793 are a Phase 2 rogue-issuer credential fixture (intentional test semantics), unrelated to Phase 9. |

### Human Verification Required

None. All 7 criteria are pure-function behaviors covered by deterministic, verifier-executed Vitest tests. No UI, no external service, no visual/real-time concerns in this phase (UI is Phase 11).

### Gaps Summary

No gaps. Every ROADMAP success criterion maps to substantive implementation in `model.ts` and a passing, correctly-asserting test in `digital-resource.test.ts`. The resolver enforces the four structural invariants (fail-closed no-policy, no cross-tier inheritance via flat resource_id match, advisory never feeds `allow`, unknown gate kind fails closed) — confirmed by reading the implementation, not just trusting that tests pass. The 20-error tsc baseline is pre-existing in unrelated files; Phase 9 added zero new errors.

---

_Verified: 2026-06-02T10:05:00Z_
_Verifier: Claude (gsd-verifier)_
