---
phase: 09-digital-resource-model-policy-engine
plan: 01
subsystem: demo-island / digital-resource model
tags: [types, pure-helpers, abac, policy-engine, append-only]
requires: [model.ts v2.1 Clearance/CLEARANCE_RANK/ZoneAccessResult/isGrantActive]
provides:
  - "ResourceTier, OrgLink, BaselineOrgRole, GateDescriptor, ResourcePolicy, PolicyAssignment"
  - "NetworkNode, PlatformNode, ApplicationNode"
  - "ResourceAccessGrant, ResourceAccessDelegate, ResourceGateResult, ResourceAccessResult"
  - "isWindowActive, activeOrgLinks, activeOrgLinksForRole, effectiveClassification, selectActivePolicy, validatePolicyWindows"
affects: [frontend/src/demo/lib/model.ts]
tech-stack:
  added: []
  patterns: [inclusive-null-window-rule, single-hop-classification-derivation, fail-closed-null-policy, string-null-validator]
key-files:
  created: []
  modified: [frontend/src/demo/lib/model.ts]
decisions:
  - "D-01/D-02: GateDescriptor parameterized union, open at the type edge via { kind: string & {}; [k: string]: unknown }"
  - "A1: zone_prereq_id declared on ResourcePolicy (policy-level), not on nodes"
  - "A2: CLEARANCE_FLOOR documented as comment example only, NOT in the union (deferred)"
  - "T-09-01: effectiveClassification fails closed (throws) when host Platform missing"
metrics:
  duration: ~6 min
  completed: 2026-06-02
---

# Phase 9 Plan 01: Digital Resource Type System & Pure Helpers Summary

Appended the Phase 9 digital-resource contract layer to `model.ts` — the strict-tree node types, open-vocabulary parameterized policy/gate descriptors, grant/delegate types, explainable result trace, plus five pure data helpers reusing the v2.1 inclusive/null window rule verbatim — establishing every shape Plans 02 (resolver) and 03 (tests) build against. Append-only, zero new dependencies, `model.ts` compiles clean.

## What Was Built

**Task 1 — Types (commit `4290196`):** Appended a `// --- Phase 9: Digital Resource hierarchy model (v2.2) ---` section defining `ResourceTier`, `BaselineOrgRole`, `OrgLink`, `GateDescriptor` (open-edge parameterized union), `ResourcePolicy`, `PolicyAssignment`, `NetworkNode`/`PlatformNode` (with `classification`), `ApplicationNode` (no `classification`), `ResourceAccessGrant`, `ResourceAccessDelegate`, `ResourceGateResult`, `ResourceAccessResult`.

**Task 2 — Pure helpers (commit `75086a5`):** `isWindowActive` (single shared inclusive/null boundary, byte-identical to `isGrantActive`), `activeOrgLinks`, `activeOrgLinksForRole`, `effectiveClassification` (single-hop app→platform, fail-closed throw on missing platform), `selectActivePolicy` (single covering assignment or null), `validatePolicyWindows` (overlap → error string, else null).

## Verification Evidence

- `npx tsc -b`: **0 errors in `model.ts`**. (20 total errors exist project-wide but are all pre-existing and in unrelated files — see Deferred Issues; baseline count without the Phase 9 append is identical at 20.)
- `ApplicationNode` block: **0** `classification:` lines (RSRC-02).
- All 10 required types + 6 helpers exported (grep-confirmed).
- `isWindowActive` uses `<= now` and `>= now` (no strict `<`/`>` drift).
- `effectiveClassification`: **0** `getAncestors` references (no cross-tier walk, req 7 / T-09-01).
- No `new Date()`/`Date.now()` in any function body (the single grep match is the prohibition comment itself).
- Append-only: **0** deletions vs prior commit; `routeTree.gen.ts` unchanged.

## Deviations from Plan

None — plan executed exactly as written. Both `tdd="true"` tasks are type/pure-helper definitions whose authoritative gate per the plan is `tsc -b` + structural acceptance greps; the runtime test file `digital-resource.test.ts` is Plan 03 scope per 09-SPEC. The PreToolUse TDD advisory (expecting `model.test.ts`) falls under its own "types" skip clause and was not the SPEC-mandated test location.

## Deferred Issues

20 pre-existing TypeScript errors logged to `.planning/phases/09-digital-resource-model-policy-engine/deferred-items.md` (18× TS2322 in `physical-access.test.ts` org-id fixtures; 2× TS2353 `'NONE'` clearance in organizations routes). Confirmed present on baseline before any Phase 9 change (identical 20-error count with `model.ts` stashed). Out of SCOPE BOUNDARY — none originate from `model.ts` or any Phase 9 symbol. Not fixed.

## Threat Surface

All four mitigations from the plan's `<threat_model>` are realized at the type/helper layer: single-hop fail-closed classification (T-09-01), null-not-default policy selection (T-09-02), one shared window rule (T-09-03), overlap validator (T-09-04). The fail-closed resolver behaviors (NO_ACTIVE_POLICY DENY, UNKNOWN_GATE_KIND) are Plan 02's responsibility. No new threat surface introduced.

## Self-Check: PASSED
- FOUND: frontend/src/demo/lib/model.ts (900 lines, +251 appended)
- FOUND commit 4290196 (feat 09-01 types)
- FOUND commit 75086a5 (feat 09-01 helpers)
