---
phase: 9
phase_name: "digital-resource-model-policy-engine"
project: "Janus 2.0"
generated: "2026-07-03"
counts:
  decisions: 7
  lessons: 4
  patterns: 5
  surprises: 3
missing_artifacts:
  - "09-UAT.md"
---

# Phase 9 Learnings: digital-resource-model-policy-engine

## Decisions

### GateDescriptor is a parameterized union, open at the type edge
Gates are `{ kind: string; ...params }` — baseline kinds carry no params, richer gates carry them (`{ kind: 'REQUIRED_ROLE', role: 'SECURITY_APPROVAL' }`). The union stays open via `{ kind: string & {}; [k: string]: unknown }` so new rule types are data, not code branches. Extension mechanism: one evaluator function + one `case` — deliberately no plugin registry.

**Rationale:** Directly serves RSRC-POLICY-04 (open vocabulary) and the user's "must be flexible / shift to new values" requirement, while keeping baseline autocomplete.
**Source:** 09-01-SUMMARY.md (D-01/D-02), 09-CONTEXT.md

### No-active-policy is a fail-closed DENY result, not a thrown error
An uncovered evaluation timestamp returns `{ allow:false, reason:'NO_ACTIVE_POLICY', policyVersion:null, gates:[] }`.

**Rationale:** In a time-versioned model an uncovered timestamp is a normal access outcome, not a config bug — the result stays uniform with other denials and renderable in the trace, while defaulting secure.
**Source:** 09-02-SUMMARY.md (D-03), 09-CONTEXT.md

### Own-tier grant check is a flat resource_id match — deliberately NOT reusing zone traversal
`evaluateOwnTierGrantGate` is `person_id === subject && resource_id === resource.id`; no `getAncestors`/`resolveGrant` reuse. Parent-tier prerequisite is a separate explicit gate on the single parent id.

**Rationale:** The structural guard against cross-tier inheritance (T-09-06) — reusing v2.1's inheritance-aware zone lookup would have reintroduced exactly the leak the requirement forbids.
**Source:** 09-02-SUMMARY.md

### Digital-resource module lives inside model.ts, not a new file
A separate `digital-resource.ts` would create a circular import with the reused `resolveZoneAccess`.

**Rationale:** Confirmed against ARCHITECTURE.md research during discuss-phase; append-only extension of the existing module avoids the cycle entirely.
**Source:** 09-CONTEXT.md (Claude's Discretion)

### zone_prereq_id is policy-level; CLEARANCE_FLOOR deferred to a comment
The advisory zone prerequisite is declared on `ResourcePolicy` (A1), not on nodes. `CLEARANCE_FLOOR` is documented as an example of the param pattern but excluded from the union and has no evaluator (A2) — it only earns one if a seed fixture uses it.

**Rationale:** Prerequisites are rules (policy), not intrinsic node properties; and speculative gate kinds stay out of the code until data demands them.
**Source:** 09-01-SUMMARY.md (A1/A2)

### Unit tests use inline fixtures only; exactly one seed import for integration tests
`digital-resource.test.ts`'s 22 unit tests import nothing from `seed.ts` (D3-13 pattern, grep-enforced `from "./seed"` = 0 → later exactly 1 when Plan 04 added the two integration tests).

**Rationale:** Keeps the engine testable without coupling to production seed data; the single sanctioned import isolates seed-integration coverage to the two SEED-06/07 tests that exist specifically to exercise seed fixtures.
**Source:** 09-03-SUMMARY.md, 09-04-SUMMARY.md

### Both seed narratives share one mechanism; delegates fixture deliberately omitted
SEED-06's post-incident policy B *is* a non-baseline policy — the "tighten after an incident" shift (D-04) and the standalone non-baseline resource (D-05) demonstrate one shared `REQUIRED_ROLE` mechanism, not two unrelated ones. `RESOURCE_DELEGATES` was omitted from the fixtures (plan-sanctioned) because the `canIssueResourceGrant` matrix was already fully covered by inline 09-03 fixtures.

**Rationale:** Reinforce one mechanism from two angles; don't duplicate coverage as seed data.
**Source:** 09-04-SUMMARY.md (D-04/D-05, RESOURCE_DELEGATES note), 09-CONTEXT.md

---

## Lessons

### A deferred-items ledger with a baseline-count proof makes scope boundaries defensible — but deferral needs an owner
Plan 01 captured 20 pre-existing tsc errors in `deferred-items.md` with the killer evidence: the error count was identical with `model.ts` stashed, proving none originated from Phase 9. Every later plan re-verified "still exactly 20, none mention digital-resource."

**Context:** The discipline was exemplary — and yet the same 20 errors sat unfixed for two more phases (they were finally repaired in 12-02 when a build gate made them blocking). A ledger documents debt; it doesn't retire it.
**Source:** 09-01-SUMMARY.md (Deferred Issues), deferred-items.md

### The inclusive window rule makes touching windows "overlapping" — test data must respect boundary semantics
The overlap validator's null (no-overlap) test case needed a one-second gap between windows, because the shared inclusive/null boundary rule treats windows that merely touch as overlapping.

**Context:** Documented inline in the test; a subtle consequence of reusing `isGrantActive`'s inclusive semantics (`<= now` / `>= now`) everywhere. Adjacent SEED-06 policy windows sharing the 2026-03-01 boundary are legal precisely because `selectActivePolicy` returns the first covering window and tests resolve away from the boundary.
**Source:** 09-03-SUMMARY.md (decisions), 09-04-SUMMARY.md (T-09-16)

### Generic TDD advisories can point at the wrong test location — the SPEC decides, and the disposition must be written down
The PreToolUse TDD hook expected `model.test.ts` (Plans 01/02) and `seed.test.ts` (Plan 04), but 09-SPEC/09-PATTERNS mandate `digital-resource.test.ts` as the single test home. Each SUMMARY explicitly recorded why the advisory was overridden.

**Context:** Type-only and fixture-only tasks used `tsc -b` + structural greps as their authoritative gate, with the runtime suite arriving as its own dedicated plan (03). Documenting the advisory-vs-SPEC disposition in each SUMMARY prevented it from looking like a silently skipped gate.
**Source:** 09-01/02/04-SUMMARY.md (Deviations)

### Splitting types → engine → tests → fixtures into four waves kept each plan trivially verifiable
Each plan had a single artifact class (type appends, pure functions, a test file, seed data) with grep/compile acceptance criteria matched to that class; total execution was ~20 minutes for the whole phase with zero deviations across all four plans.

**Context:** The tests (Plan 03) ran GREEN against already-implemented code by design — the phase used tests-as-executable-threat-register rather than RED/GREEN TDD, and the plans said so up front.
**Source:** 09-01..04-SUMMARY.md (metrics, Deviations)

---

## Patterns

### Two-layer exhaustiveness for open unions
`evaluateGate` pairs a compile-time `assertNeverGateKind` exhaustiveness reference (catches a forgotten `case` for known kinds) with a runtime fail-closed `default` returning `pass:false / UNKNOWN_GATE_KIND` (catches injected unknown string kinds). Never a silent ALLOW.

**When to use:** Any dispatcher over a union that is deliberately open at the type edge — compile-time safety for the known set, runtime fail-closed for the open remainder.
**Source:** 09-02-SUMMARY.md

### One named blocking test per threat-register entry
Every threat in the plan's `<threat_model>` maps to an exactly-named, grep-able test (`cross-tier-inheritance-blocked`, `advisory-non-blocking`, `unknown-gate-kind-errors`, `no-active-policy-denies`, `app-classification-inherited`) that fails if the corresponding mitigation is removed.

**When to use:** Security-relevant invariants — the test name IS the mitigation's audit trail, and verification can grep for presence.
**Source:** 09-03-SUMMARY.md (Threat Surface)

### Append-only module extension, proven by diff
All four plans appended to `model.ts`/`seed.ts` under a dated section comment, with `git diff` asserting **0 deletions** and existing v2.1 symbols byte-unchanged as an acceptance criterion.

**When to use:** Extending a shared, already-verified module — the 0-deletion check turns "we didn't break v2.1" from a claim into a mechanical assertion.
**Source:** 09-01/02/04-SUMMARY.md (Verification Evidence)

### Explicit clock injection with grep-enforced prohibition
Every function takes `now: Date`; no code path reads `Date.now()`/`new Date()`. The prohibition lives as comments at the section heads, and verification greps confirm the only clock-API matches are the prohibition comments themselves.

**When to use:** Any point-in-time resolution logic — determinism for tests, reproducibility for audit, and the grep makes regressions visible.
**Source:** 09-01-SUMMARY.md, 09-02-SUMMARY.md

### Fixed named time constants for window tests
A single fixed `NOW` plus scenario constants (`NOW_A`=Feb, `NOW_B`=Apr, `SHIFT_BOUNDARY`=2026-03-01) shared between the unit suite and the seed fixtures, so the policy-shift narrative resolves identically wherever it's exercised.

**When to use:** Time-versioned behavior tests — named constants make the temporal story readable and keep fixture/test dates from drifting apart.
**Source:** 09-03-SUMMARY.md, 09-04-SUMMARY.md

---

## Surprises

### Baseline capture surfaced 20 pre-existing TypeScript errors nobody knew about
The first plan's routine "capture the tsc baseline before changing anything" step revealed the project had 20 standing compile errors (18 in v2.1 test fixtures, 2 stale `'NONE'` clearance keys in organization routes).

**Impact:** Correctly quarantined via deferred-items.md with a with/without-stash proof; they remained the project's silent build breakage until Phase 12's build gate forced the fix. The baseline-capture habit is what made them visible at all.
**Source:** 09-01-SUMMARY.md, deferred-items.md

### The two locked seed stories turned out to be one mechanism
During context gathering it emerged that SEED-06's "after the incident" policy is itself a non-baseline policy — D-05 explicitly notes the two examples "reinforce one shared mechanism rather than introducing two unrelated ones."

**Impact:** Simpler fixtures and tests than two independent mechanisms would have required; the demo narrative got stronger, not weaker, from the collapse.
**Source:** 09-CONTEXT.md (D-05), 09-04-SUMMARY.md

### The entire policy engine phase executed in about 20 minutes
Four plans (types → engine → 22-test suite → seed fixtures + integration tests) completed in ~6+5+3+6 minutes with zero deviations and a 7/7 verification — the fastest verified phase of the milestone despite being its conceptual core.

**Impact:** Evidence that the discuss-phase decision lock (D-01..D-05, A1/A2, T-09-*) plus per-plan single-artifact-class scoping moves essentially all cost to planning time; execution became transcription.
**Source:** 09-01..04-SUMMARY.md (metrics), 09-VERIFICATION.md
