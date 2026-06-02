# Phase 9: Digital Resource Model & Policy Engine - Context

**Gathered:** 2026-06-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 9 delivers the digital-resource type system (`NetworkNode` / `PlatformNode` / `ApplicationNode`, `org_links`, `ResourcePolicy`, `ResourceAccessGrant`, `ResourceAccessDelegate`), a time-versioned, data-driven `resolveResourceAccess` resolver, delegation-authority enforcement (`canIssueResourceGrant`), a new `digital-resource.test.ts` with blocking pitfall tests, and the minimal real seed fixtures (policy-shift + non-baseline) needed to exercise the policy mechanisms. All appended to `frontend/src/demo/lib/model.ts` and `seed.ts`. Demo/mock TypeScript only — no backend, no UI, no WorldState wiring, no new deps.

</domain>

<spec_lock>
## Requirements (locked via SPEC.md)

**11 requirements are locked.** See `09-SPEC.md` for full requirements, boundaries, and acceptance criteria.

Downstream agents MUST read `09-SPEC.md` before planning or implementing. Requirements are not duplicated here.

**In scope (from SPEC.md):**
- New types in `model.ts`: `NetworkNode`, `PlatformNode`, `ApplicationNode`, `org_links` shape, `ResourcePolicy` + gate descriptors, `policy_assignments`, `ResourceAccessGrant`, `ResourceAccessDelegate`.
- New functions in `model.ts`: active-policy selector, gate-dispatch resolver `resolveResourceAccess`, baseline gate evaluators (`CLEARANCE` / `OWN_TIER_GRANT` / `PARENT_TIER_GRANT`), Application-classification derivation, active-org-link helpers, `canIssueResourceGrant`, a seed validator for overlapping policy windows.
- `digital-resource.test.ts` with blocking tests for every requirement (incl. named `cross-tier-inheritance-blocked` and advisory-non-blocking).
- Minimal real seed additions to `seed.ts`: policy-shift example (RSRC-SEED-06) and non-baseline-policy example (RSRC-SEED-07).

**Out of scope (from SPEC.md):**
- Full 6-unit dataset (RSRC-SEED-01..05) — Phase 10.
- `WorldState` / `DigitalResourceWorld` sub-object and `TOGGLE_RESOURCE_GRANT` — Phase 10.
- All demo UI (RSRC-UI-01..03) — Phase 11.
- Runtime gate-evaluator plugin registry; Rust/PostgreSQL backend; in-app policy authoring; multi-homing — deferred.
- Modifying any existing v2.1 function or test — append-only; `resolveZoneAccess` is reused, not changed.

</spec_lock>

<decisions>
## Implementation Decisions

### Gate descriptor shape
- **D-01:** Gates are **parameterized** — `{ kind: string; ...params }`. Baseline kinds carry no params (`{ kind: 'CLEARANCE' }`, `{ kind: 'OWN_TIER_GRANT' }`, `{ kind: 'PARENT_TIER_GRANT' }`); richer gates carry params (`{ kind: 'REQUIRED_ROLE', role: 'SECURITY_APPROVAL' }`, `{ kind: 'CLEARANCE_FLOOR', min: 'SECRET' }`). This is the mechanism that makes policies flexible and shiftable without inventing a new `kind` per nuance — it directly serves RSRC-POLICY-04 (open vocabulary) and the user's "must be flexible / shift to new values" requirement.
- **D-02:** Phase 9 implements the baseline kinds plus `REQUIRED_ROLE` (needed by SEED-06/07). `CLEARANCE_FLOOR` is shown as an example of the param pattern but only needs an evaluator if a seed fixture uses it — planner's call. Each `kind` maps to one evaluator function; an unknown `kind` returns an explicit error result (never a silent ALLOW), per SPEC req 5.

### No-active-policy outcome
- **D-03:** When no policy assignment's validity window contains the evaluation timestamp, the resolver returns a **fail-closed DENY**: `{ allow: false, reason: 'NO_ACTIVE_POLICY', policyVersion: null, gates: [] }`. Uniform with other gate denials, renderable in the trace, secure default. Not a thrown error (an uncovered timestamp is a normal access outcome in a time-versioned model, not a config bug).

### Policy-shift seed example (SEED-06)
- **D-04:** The shift tells a **"tighten after an incident"** story. A Network (working name `MilNet`) runs the baseline policy until an incident date (2026-03-01), then shifts to a stricter policy that adds `{ kind: 'REQUIRED_ROLE', role: 'SECURITY_APPROVAL' }`. Resolving the *same* person across the boundary yields ALLOW before the date and DENY after — the canonical point-in-time demonstration. (Exact IDs/dates are the planner's/Phase-10's to finalize; the narrative and mechanism are locked.)

### Non-baseline seed example (SEED-07)
- **D-05:** One resource carries a **non-baseline policy = baseline + `{ kind: 'REQUIRED_ROLE', role: 'SECURITY_APPROVAL' }`**. Best showcases parameterized gates + open vocab. Note: this is the *same mechanism* as the post-incident policy B in D-04 — SEED-06's "after" state is itself a non-baseline policy, so the two examples reinforce one shared mechanism rather than introducing two unrelated ones.

### Claude's Discretion
- Module stays in `model.ts` (a separate `digital-resource.ts` would create a circular import with the reused `resolveZoneAccess`) — confirmed by ARCHITECTURE.md research.
- `resolveResourceAccess` signature mirrors the v2.1 `resolveZoneAccess` style (explicit `now: Date`, explicit subject clearance/personId, arrays passed in) — pure function, no `Date.now()`.
- Test file layout mirrors `physical-access.test.ts`.
- Exact seed IDs, person references, and dates for SEED-06/07 fixtures — within the locked narratives above.
- Whether `org_links.role` is typed as bare `string` or `('ADMIN' | ... ) | (string & {})` for baseline autocomplete while staying open.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Locked requirements
- `.planning/phases/09-digital-resource-model-policy-engine/09-SPEC.md` — 11 locked requirements, boundaries, acceptance criteria. MUST read before planning.

### Phase research (milestone-level, v2.2)
- `.planning/research/SUMMARY.md` — synthesis: isomorphic to v2.1, zero new deps, 3-phase split.
- `.planning/research/ARCHITECTURE.md` — exact file locations, gate-chain composition, advisory zone-prereq wiring, why model.ts (circular-import rationale), build order.
- `.planning/research/PITFALLS.md` — cross-tier inheritance, advisory-as-gate, App-classification, WorldState sprawl, unstable `now`, pattern drift; each phase-tagged.
- `.planning/research/STACK.md` — reuse analysis + explicit do-not-add list.

### Requirements & roadmap
- `.planning/REQUIREMENTS.md` — RSRC* requirement definitions + key decisions + traceability (SEED-06/07 now Phase 9).
- `.planning/ROADMAP.md` §"Phase 9" — goal, dependencies, 7 success criteria.

### Implementation substrate (v2.1 templates to mirror)
- `frontend/src/demo/lib/model.ts` — extension point (649 lines). Mirror: `isGrantActive` (inclusive boundaries, null=unbounded), `resolveGrant`, `resolveZoneAccess` (reuse for advisory zone), `isDelegateActive`, `ZoneAccessDelegate`, `PhysicalAccessGrant`, `Clearance` + `CLEARANCE_RANK`, `EntityPolicy` (conceptual ancestor).
- `frontend/src/demo/lib/physical-access.test.ts` — test-suite template (32KB).
- `frontend/src/demo/lib/seed.ts` — seed extension point for SEED-06/07.

### Grounding
- `.planning/seeds/SEED-009-info-system-security-requirements.md` — NSM §6 (classification, sikkerhetsgodkjenning) behind the SECURITY_APPROVAL role / REQUIRED_ROLE gate.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `resolveZoneAccess(personId, zone, clearance, hasValidEscort, allZones, allGrants, now)` — called as-is for the advisory zone-prerequisite; its `{allow, gate, reason}` outcome is attached to `zoneAdvisory` (never affects `allow`).
- `isGrantActive(grant, now)` boundary rule (both inclusive, null = unbounded) — reuse the SAME convention for `ResourceAccessGrant`, `ResourceAccessDelegate`, `org_links`, and `policy_assignments` window checks. Do NOT invent a divergent rule.
- `isDelegateActive(delegate, now)` — direct template for the resource delegate active-check feeding `canIssueResourceGrant`.
- `Clearance` + `CLEARANCE_RANK` — the clearance gate compares ranks; `CLEARANCE_FLOOR` param reuses the same rank map.

### Established Patterns
- Pure functions taking explicit `now: Date` (no `Date.now()`/`new Date()` inside) — required for deterministic point-in-time tests (D-03/D-04 depend on it).
- Resolver returns a structured result with an explicit gate/reason — extend to `{ allow, gates[], zoneAdvisory, policyVersion }` (SPEC req 9).
- `assertNever`-style exhaustive switches in model.ts — apply to gate-kind dispatch so an unhandled kind is caught (complements the explicit-error-on-unknown-kind for runtime-injected kinds).

### Integration Points
- New code appends to `model.ts` (types + functions) and `seed.ts` (two fixtures); new `digital-resource.test.ts` sibling to `physical-access.test.ts`. No edits to existing v2.1 symbols. No `routeTree.gen.ts` / WorldState / UI changes (those are Phases 10–11).

</code_context>

<specifics>
## Specific Ideas

- SEED-06 concrete shape (narrative locked, values illustrative): Network `MilNet`, policy A `valid_until 2026-03-01` = baseline, policy B `valid_from 2026-03-01` = baseline + `REQUIRED_ROLE: SECURITY_APPROVAL`. A test resolves one person at a Feb timestamp (ALLOW) and an Apr timestamp (DENY).
- SEED-07: a resource whose active policy = baseline + `REQUIRED_ROLE: SECURITY_APPROVAL` — the same parameterized-gate mechanism as SEED-06's policy B.
- `canIssueResourceGrant(actor, resource, now)` → true iff actor holds an active `ADMIN` `org_link` on the resource OR an active matching `ResourceAccessDelegate`. This closes the v2.1 DELEG-03 gap (delegation was type-only there).

</specifics>

<deferred>
## Deferred Ideas

- `CLEARANCE_FLOOR` gate kind — pattern documented; only implement an evaluator if a fixture needs it (otherwise a future-phase nicety).
- Full 6-unit digital-resource dataset, WorldState integration, and all UI — Phases 10–11 (already roadmapped, not scope creep).
- In-app policy authoring (creating/editing policies in the UI) — deferred per REQUIREMENTS.md; v2.2 ships policies as seed data.

None of the above is in Phase 9 scope — discussion stayed within the phase boundary.

</deferred>

---

*Phase: 9-digital-resource-model-policy-engine*
*Context gathered: 2026-06-02*
