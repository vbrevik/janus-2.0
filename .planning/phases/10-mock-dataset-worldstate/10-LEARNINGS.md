---
phase: 10
phase_name: "mock-dataset-worldstate"
project: "Janus 2.0"
generated: "2026-07-03"
counts:
  decisions: 4
  lessons: 4
  patterns: 3
  surprises: 2
missing_artifacts: []
---

# Phase 10 Learnings: mock-dataset-worldstate

## Decisions

### TOGGLE_RESOURCE_GRANT uses a `resourceGrantId` field, not `grantId`
The new reducer action's payload field is deliberately named differently from the physical `TOGGLE_GRANT`'s `grantId`.

**Rationale:** Avoids action-payload collision between the physical and digital toggle actions that share one reducer; the distinct name makes cross-wiring a compile-time error rather than a silent bug.
**Source:** 10-01-SUMMARY.md (key-decisions)

### WorldState grows a single nested `digitalResources` sub-object, not flat fields
All nine digital-resource collections live under one sub-object in WorldState.

**Rationale:** Pitfall 4 from phase research — flat fields would interleave two domains in one namespace and make wholesale replacement (later needed by Phase 12's `SET_DIGITAL_RESOURCES`) impossible to do atomically.
**Source:** 10-01-SUMMARY.md (key-decisions)

### Selectors are pure reads that delegate to the model.ts resolver
`buildResourceTree`, `activeGrantsForResource`, and `resolveResourceAt` never mutate state, and `resolveResourceAt` delegates to `resolveResourceAccess` so there is a single resolver source of truth.

**Rationale:** Keeps resolution logic in one tested place; selectors only adapt WorldState shapes to the resolver's inputs.
**Source:** 10-02-SUMMARY.md (patterns)

### Goal-backward UAT for phases with no user-facing surface
Phase 10 is pure model/store/selector work — nothing to click. UAT was run goal-backward: each of the 5 ROADMAP success criteria mapped to a named, passing Vitest test in an evidence table.

**Rationale:** "User acceptance" for a data layer is the roadmap contract, not a walkthrough; the evidence table makes the mapping auditable.
**Source:** 10-UAT.md

---

## Lessons

### Assert the invariant, not the implementation detail
The independence test initially asserted Set *reference* inequality after a physical toggle — but `TOGGLE_GRANT` spreads state and legitimately preserves the untouched Set's reference. The assertion was testing spread mechanics, not independence. Fixed to assert the actual invariant (`disabledResourceGrantIds.size === 0` after a physical toggle).

**Context:** Caught during the RED phase of Task 1; the corrected test still guards the collision risk the decision above exists to prevent.
**Source:** 10-01-SUMMARY.md (Auto-fixed Issues)

### A missing SUMMARY makes completed work invisible to the process
Plan 10-02 was executed and committed 2026-06-06 (b1a8fb8, 86fa85f) but its SUMMARY was never written — so GSD routing reported Phase 10 as incomplete for nearly a month, until the file was reconstructed from the plan, the commits, and a fresh test run.

**Context:** The work was fine; the bookkeeping gap alone triggered re-execution risk. Commits + SUMMARY are jointly the completion record — either alone is insufficient.
**Source:** 10-02-SUMMARY.md (backfill note)

### The canonical verification artifact must exist, not just the verification
Phase 10 was UAT-passed on 2026-06-18 (10-UAT.md, 10-VALIDATION.md, ROADMAP all said complete) but 10-VERIFICATION.md was never created — so `verification.status` tooling reported the phase unverified three weeks later at milestone close, forcing a retroactive goal-backward verification.

**Context:** The retro verification passed 5/5 with zero gaps; the only real defect was the missing file. Same-day artifact creation is the fix, not better verification.
**Source:** 10-VERIFICATION.md (header: "retroactive — VERIFICATION.md never previously created")

### A thin convenience wrapper can silently narrow the behavior it wraps
`resolveResourceAt` (created in 10-02 as a "timestamp wrapper delegating to the model.ts resolver") passed empty arrays for the resolver's zone and physical-grant inputs — permanently disabling the zone-advisory output while every direct test of the underlying resolver stayed green.

**Context:** Dormant here; discovered as a major UAT gap in Phase 12 and fixed by making the omitted inputs explicit parameters (12-07). The wrapper, not the resolver, is where the integration test belonged.
**Source:** 10-02-SUMMARY.md (what was built); confirmed downstream in 12-UAT.md / 12-07-SUMMARY.md

---

## Patterns

### Immutable Set toggle via `new Set()` spread, mirroring the sibling action
`TOGGLE_RESOURCE_GRANT`'s reducer copies the physical `TOGGLE_GRANT` idiom exactly — clone the Set, add/delete, return new state — with its own independent Set.

**When to use:** Any client-only enable/disable collection in reducer state; mirroring the existing idiom made review a diff-against-precedent.
**Source:** 10-01-SUMMARY.md (patterns-established)

### Seed exports flat arrays consumed 1:1 by the world init
`seed.ts` exports flat typed arrays; `seedWorld()` composes them into the `DigitalResourceWorld` sub-object without transformation.

**When to use:** Mock datasets meant to be replaced by an API later — Phase 11/12 swapped the source (Postgres via `/world`) while the shape contract held.
**Source:** 10-01-SUMMARY.md (patterns-established)

### Success-criteria evidence table for goal-backward verification
A table of criterion → backing named test/code line → PASS, with the full-suite count up top (193 passed / 0 failed / 0 TS errors*), as the entire UAT document.

**When to use:** Verifying non-UI phases; the named-test column makes each claim independently re-runnable. (*The "0 TS errors" claim referred to the test run — `tsc -b` was in fact broken at the time, which Phase 12 later exposed; pair this pattern with an explicit typecheck command.)
**Source:** 10-UAT.md

---

## Surprises

### The phase's bookkeeping trailed its code by weeks — twice
Execution finished 2026-06-06; the 10-02 SUMMARY arrived 2026-07-02 (backfill) and the VERIFICATION.md 2026-07-03 (retroactive, at milestone close). Both gaps were discovered by tooling (routing/verification queries), not by anyone remembering.

**Impact:** Two separate close-out sessions spent reconstructing what a few same-day minutes would have recorded; contributed the "milestone-close artifacts decay fast" lesson to the v2.2 retrospective.
**Source:** 10-02-SUMMARY.md (backfill note), 10-VERIFICATION.md (header)

### Five requirements closed in a ~5-minute plan
Plan 10-01 completed RSRC-SEED-01 through RSRC-SEED-05 in roughly five minutes of execution — the dataset design work had already been done in Phase 9's fixtures and the phase-10 CONTEXT, so execution was mostly transcription of locked shapes.

**Impact:** Reinforces the phase-9 finding: when discuss/plan lock the shapes, seed-data phases are nearly free. The cost center was never the typing — it was the decisions.
**Source:** 10-01-SUMMARY.md (duration, requirements-completed)
