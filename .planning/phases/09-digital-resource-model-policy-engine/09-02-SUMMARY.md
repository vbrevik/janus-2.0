---
phase: 09-digital-resource-model-policy-engine
plan: 02
subsystem: demo-island / digital-resource policy engine
tags: [resolver, gate-dispatch, abac, policy-engine, fail-closed, append-only]
requires:
  - "09-01 types/helpers: GateDescriptor, ResourcePolicy, ResourceAccessGrant, ResourceAccessDelegate, ResourceGateResult, ResourceAccessResult, NetworkNode/PlatformNode/ApplicationNode, isWindowActive, activeOrgLinksForRole, effectiveClassification, selectActivePolicy"
  - "v2.1: CLEARANCE_RANK, resolveZoneAccess, ZoneNode, PhysicalAccessGrant, ZoneAccessResult"
provides:
  - "evaluateClearanceGate, evaluateOwnTierGrantGate, evaluateParentTierGrantGate, evaluateRequiredRoleGate"
  - "GateContext (gate-evaluator extension point)"
  - "evaluateGate (fail-closed dispatcher)"
  - "resolveResourceAccess (loop-over-gates resolver, fail-closed no-policy, non-blocking zoneAdvisory)"
  - "canIssueResourceGrant (ADMIN-or-active-delegate authority, closes v2.1 DELEG-03 gap)"
affects: [frontend/src/demo/lib/model.ts]
tech-stack:
  added: []
  patterns: [data-driven-gate-dispatch, fail-closed-unknown-kind, fail-closed-no-policy, flat-resource-id-match-no-ancestor-walk, advisory-non-blocking-zone, two-layer-exhaustiveness]
key-files:
  created: []
  modified: [frontend/src/demo/lib/model.ts]
decisions:
  - "OWN_TIER_GRANT is a flat resource_id match — NO getAncestors/resolveGrant reuse (req 7 / T-09-06)"
  - "zoneAdvisory assigned independently of allow; allow = gates.every(g => g.pass) only (req 8 / T-09-07)"
  - "evaluateGate default branch returns pass:false/UNKNOWN_GATE_KIND — fail-closed, never silent ALLOW (req 5 / T-09-05)"
  - "no-active-policy returns { allow:false, reason:'NO_ACTIVE_POLICY', policyVersion:null, gates:[] } DENY, not a throw (D-03 / T-09-08)"
  - "canIssueResourceGrant: ADMIN org-link OR active ORG ResourceAccessDelegate; expired delegate => false (req 10)"
  - "GateContext is the documented req-5 extension point: a new kind = one evaluator + one case (no plugin registry)"
metrics:
  duration: ~5 min
  completed: 2026-06-02
---

# Phase 9 Plan 02: Digital Resource Gate-Dispatch Engine Summary

Appended the Phase 9 authorization engine to `model.ts` — four baseline gate evaluators, a fail-closed `evaluateGate` dispatcher, the data-driven `resolveResourceAccess` loop-over-gates resolver (with no-active-policy DENY and a non-blocking advisory zone), and `canIssueResourceGrant` closing the v2.1 DELEG-03 delegation-authority gap. Append-only, zero new dependencies, `model.ts` compiles clean against the unchanged 20-error project baseline.

## What Was Built

**Task 1 — Baseline evaluators + evaluateGate dispatcher (commit `df4eae2`):** Added a `// --- Phase 9 gate-dispatch engine (v2.2, Plan 02) ---` section with a `GateContext` extension-point interface and four pure evaluators returning `ResourceGateResult { kind, pass, reason }`:
- `evaluateClearanceGate` — `CLEARANCE_RANK` comparison of subject vs pre-derived `effectiveClassification` (mirrors `evaluateSecuredAccess`).
- `evaluateOwnTierGrantGate` — FLAT `person_id === subject && resource_id === resource.id` active-grant find. No `getAncestors`/`resolveGrant` — the structural guard against cross-tier inheritance (req 7).
- `evaluateParentTierGrantGate` — separate explicit check on the single parent id (`network_id` for Platform, `platform_id` for Application); Network passes trivially.
- `evaluateRequiredRoleGate` — `activeOrgLinksForRole(resource.org_links, gate.role, now)` membership check for the subject org.
- `evaluateGate` — `switch (gate.kind)` over the four baseline kinds; `default` branch fails closed with `{ pass:false, reason:'UNKNOWN_GATE_KIND' }`. Two layers: a `assertNeverGateKind` compile-time exhaustiveness reference plus the runtime fail-closed default for injected unknown string kinds.

**Task 2 — resolveResourceAccess + canIssueResourceGrant (commit `f9e05f3`):**
- `resolveResourceAccess(subject, subjectClearance, subjectOrgId, resource, allNetworks, allPlatforms, allGrants, allZones, allPhysicalGrants, now)` — (1) `selectActivePolicy` null → fail-closed `NO_ACTIVE_POLICY` DENY (D-03); (2) derive `effectiveClassification` once and build `ctx`; (3) `gates = policy.gates.map(evaluateGate)`, `allow = gates.every(g => g.pass)`; (4) if `zone_prereq_id !== null`, look up the `ZoneNode` and call the REUSED `resolveZoneAccess` unchanged, attaching to `zoneAdvisory` (never feeds `allow`); (5) `policyVersion` = selected assignment window. Pure — no `Date.now()`/`new Date()`.
- `canIssueResourceGrant(actorOrgId, resource, allDelegates, now)` — true iff an active `ADMIN` org-link on the resource includes the actor OR an active matching ORG `ResourceAccessDelegate` exists; expired delegate fails via `isWindowActive`. Closes v2.1 DELEG-03 (was type-only).

## Verification Evidence

- `npx tsc -b`: **0 errors in `model.ts`** after both tasks. Project-wide total stays at the pre-existing **20** errors in 3 unrelated files (18× TS2322 in `physical-access.test.ts`, 2× TS2353 `'NONE'` clearance in organizations routes) — identical baseline count captured before any Phase 9 Plan 02 change (`/tmp/tsc-baseline.txt`).
- Task 1: 5 evaluator/dispatcher exports present; `evaluateGate` default branch contains `UNKNOWN_GATE_KIND` with `pass: false` (never `pass: true`); `evaluateOwnTierGrantGate` body has **0** `getAncestors`/`resolveGrant` references; **0** `case 'CLEARANCE_FLOOR'` (A2 deferred).
- Task 2: `resolveResourceAccess` + `canIssueResourceGrant` exported; the `NO_ACTIVE_POLICY` block carries `allow: false`; resolver body contains `gates.every` and `resolveZoneAccess` with `zoneAdvisory` assigned independently of `allow`.
- No internal clock reads: the 3 `new Date()`/`Date.now()` grep matches are all prohibition **comments** (lines 799, 912, 1058) — no code path reads the clock.
- Append-only: `git diff` shows **0** deletions; the v2.1 `resolveZoneAccess` body and all existing symbols are unchanged.

## Deviations from Plan

None — plan executed exactly as written. Both `tdd="true"` tasks define pure functions whose authoritative gate per the plan is `tsc -b` + structural acceptance greps; the runtime suite `digital-resource.test.ts` is Plan 03 scope per 09-SPEC/09-PATTERNS. The PreToolUse TDD advisory (expecting `model.test.ts`) falls under its own "types" skip clause and points at a non-SPEC location — same disposition as Plan 01.

## Threat Surface

All four Plan-02-owned mitigations from the `<threat_model>` are realized in code:
- **T-09-05** (unknown gate kind → elevation): `evaluateGate` default returns `pass:false, reason:'UNKNOWN_GATE_KIND'` — never `pass:true`.
- **T-09-06** (cross-tier inheritance): `evaluateOwnTierGrantGate` is a flat `resource_id` match with no ancestor walk; `PARENT_TIER_GRANT` is a separate explicit gate.
- **T-09-07** (advisory-as-gate): `zoneAdvisory` is set independently; `allow = gates.every(...)` only.
- **T-09-08** (silent ALLOW on uncovered timestamp): `selectActivePolicy` null → immediate `NO_ACTIVE_POLICY` DENY.
- **T-09-09** (unstable now): all functions take explicit `now: Date`; no internal clock reads.
- **T-09-10** (non-ADMIN issuing grants): `canIssueResourceGrant` true only for active ADMIN org-link or active matching delegate.

No new threat surface introduced. The blocking tests guarding these (`unknown-gate-kind-errors`, `cross-tier-inheritance-blocked`, `advisory-non-blocking`, `no-active-policy-denies`) are authored in Plan 03.

## Known Stubs

None. All evaluators and the resolver are fully wired to the Plan 01 types/helpers; no placeholder data paths.

## Self-Check: PASSED
- FOUND: frontend/src/demo/lib/model.ts (+267 appended across two commits)
- FOUND commit df4eae2 (feat 09-02 evaluators + dispatcher)
- FOUND commit f9e05f3 (feat 09-02 resolver + canIssueResourceGrant)
