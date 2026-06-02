# Phase 10: Mock Dataset & WorldState - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-02
**Phase:** 10-mock-dataset-worldstate
**Areas discussed:** Sub-object shape, Fixture naming, Selectors, Toggle + tests

---

## DigitalResourceWorld shape

| Option | Description | Selected |
|--------|-------------|----------|
| Flat arrays (mirror seed.ts) | Arrays + disabledResourceGrantIds:Set; mirrors Phase-9 seed constants; selectors do lookups | ✓ |
| Id-indexed Maps | Map<id,T> for O(1) lookup; faster joins but diverges from array style | |

**User's choice:** Flat arrays (mirror seed.ts)
**Notes:** Consistency with existing `WorldState` (`resources: Resource[]`, `disabledGrantIds: Set`) over micro-optimization. `seedWorld()` becomes a trivial lift.

---

## Fixture restructure & naming

| Option | Description | Selected |
|--------|-------------|----------|
| Keep names, extend around | MilNet/IntelNet keep ids; add remaining units around them; minimal test edits | |
| Rename to 6-unit scheme | Coherent per-unit naming; 2 Phase-9 seed-resolution tests updated to new ids | ✓ |

**User's choice:** Rename to 6-unit scheme
**Notes:** Policy-shift (former MilNet) and non-baseline (former IntelNet) behaviours survive under new ids. The 5 named pitfall tests (inline fixtures) stay green unchanged; the 2 seed-resolution tests must be updated.

---

## Read selectors

| Option | Description | Selected |
|--------|-------------|----------|
| New pure-fn module + thin hooks | digital-resource-selectors.ts pure fns; Phase 11 wraps with hooks; testable without React | ✓ |
| Hooks in world-state.tsx | useDigitalResources/useResolveResourceAt in the store file; harder to unit-test | |

**User's choice:** New pure-fn module + thin hooks
**Notes:** Three selectors — buildResourceTree, activeGrantsForResource, resolveResourceAt. Matches Phase-9 pure-fn discipline. Hooks deferred to Phase 11.

---

## Toggle semantics + test layout

| Option | Description | Selected |
|--------|-------------|----------|
| Filter before resolve; new test file | resolveResourceAt excludes disabled grants; seed-validation in new digital-resource-seed.test.ts | |
| Filter before resolve; extend existing test | Same filtering; seed-validation assertions added to existing digital-resource.test.ts | ✓ |

**User's choice:** Filter before resolve; extend existing test
**Notes:** Toggling a grant off flips a live resolution ALLOW→DENY (interactive demo point), mirroring the physical TOGGLE_GRANT path. Seed-validation goes in a new `describe` block in the existing test file — no new file.

## Claude's Discretion

- Exact org ids per unit, resource ids/display names, classification tiers per network (within the 6-unit narrative).
- Selector signatures/return types (within the pure-fn/arrays-in contract).
- Which grants are designated expired/future/active per tier.
- Declaration site of `DigitalResourceWorld` (wherever avoids a circular import).

## Deferred Ideas

- Thin `useWorld()` hooks wrapping selectors + all rendering — Phase 11 (RSRC-UI-01..03).
- WorldState persistence / backend — out of milestone scope.
