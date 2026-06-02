# Phase 9: Digital Resource Model & Policy Engine - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-02
**Phase:** 9-digital-resource-model-policy-engine
**Areas discussed:** Gate descriptor shape, No-active-policy outcome, Policy-shift example (SEED-06), Non-baseline example (SEED-07)

---

## Gate descriptor shape

| Option | Description | Selected |
|--------|-------------|----------|
| Parameterized {kind, ...params} | Baseline kinds paramless; richer gates carry params (REQUIRED_ROLE, CLEARANCE_FLOOR). Enables flexibility/shift without new kinds. | ✓ |
| Minimal {kind} only | Each gate just a kind; any variation = new kind + evaluator. | |

**User's choice:** Parameterized {kind, ...params}
**Notes:** Directly serves the "flexible / shift to new values" requirement and RSRC-POLICY-04 open vocabulary.

---

## No-active-policy outcome

| Option | Description | Selected |
|--------|-------------|----------|
| DENY with reason NO_ACTIVE_POLICY | {allow:false, reason:'NO_ACTIVE_POLICY', policyVersion:null}; fail-closed, uniform, renderable. | ✓ |
| Throw an error | Treat uncovered timestamp as a config bug; caller catches. | |
| Sentinel result | Distinct shape with no reason code. | |

**User's choice:** DENY with reason NO_ACTIVE_POLICY
**Notes:** Fail-closed secure default; an uncovered timestamp is a normal access outcome in a time-versioned model, not an exception.

---

## Policy-shift example (SEED-06)

| Option | Description | Selected |
|--------|-------------|----------|
| Tighten after an incident | Network baseline until incident date, then stricter policy (+REQUIRED_ROLE). Same person ALLOW before / DENY after. | ✓ |
| Temporary relaxation | Resource loosens for a window then reverts. | |
| Reclassification | Platform raises required clearance at a date. | |

**User's choice:** Tighten after an incident
**Notes:** MilNet, boundary 2026-03-01; cleanest point-in-time before/after demo, NSM-flavored.

---

## Non-baseline example (SEED-07)

| Option | Description | Selected |
|--------|-------------|----------|
| Extra REQUIRED_ROLE gate | baseline + REQUIRED_ROLE: 'SECURITY_APPROVAL'. Showcases parameterized gates + open vocab. | ✓ |
| Stricter clearance floor | Minimum clearance above the resource's classification. | |
| Drop the parent-tier gate | Standalone resource omitting PARENT_TIER_GRANT. | |

**User's choice:** Extra REQUIRED_ROLE gate
**Notes:** Same mechanism as SEED-06's post-incident policy B — the two examples reinforce one shared mechanism.

---

## Claude's Discretion

- Module stays in `model.ts` (separate file → circular import with reused `resolveZoneAccess`; confirmed by ARCHITECTURE.md).
- `resolveResourceAccess` signature mirrors v2.1 `resolveZoneAccess` (explicit `now`, pure function).
- Test file layout mirrors `physical-access.test.ts`.
- Exact seed IDs / persons / dates for SEED-06/07 within the locked narratives.
- `org_links.role` typing (bare `string` vs open union with autocomplete).
- Whether `CLEARANCE_FLOOR` gets an evaluator in Phase 9 (only if a fixture uses it).

## Deferred Ideas

- `CLEARANCE_FLOOR` gate evaluator — pattern documented, implement on demand.
- Full 6-unit dataset, WorldState integration, UI — Phases 10–11 (roadmapped).
- In-app policy authoring — deferred; v2.2 ships policies as seed data.
