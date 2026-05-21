# Phase 1: Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-21
**Phase:** 1-Foundation
**Areas discussed:** Spike→demo code strategy, Seed data breadth, Role + principal selection, Phase 1 decision surface

---

## Spike→demo code strategy

### Q1 — How should the proven spike lib become the demo's foundation?

| Option | Description | Selected |
|--------|-------------|----------|
| Consolidate/refactor | Lift proven logic (abac.ts verbatim) but unify fragmented per-spike data into ONE world-state + reducer (MODEL-02) | ✓ |
| Lift spike lib as-is + wrap store | Move spikes/lib unchanged, add reducer on top; leaves data fragmentation | |
| Rebuild data model fresh | Write clean model from scratch; throws away proven/tested code | |

**User's choice:** Consolidate/refactor (recommended).

### Q2 — Where should the consolidated demo code live, and what happens to frontend/src/spikes/?

| Option | Description | Selected |
|--------|-------------|----------|
| New frontend/src/demo/, retire spikes | Unified model under demo/ + own entry; spikes/ historical | ✓ |
| Evolve in place under spikes/ | Refactor inside spikes/, reuse spikes.html; misleading name | |
| Rename spikes/ → demo/ | git-move whole tree; preserves history but big churn commit | |

**User's choice:** New frontend/src/demo/, retire spikes (recommended).

---

## Seed data breadth

### Q1 — How complete should the seeded data MODEL be in Phase 1?

| Option | Description | Selected |
|--------|-------------|----------|
| Full scenario schema now | Model all fields incl. Phase 3 (shielding/deployment/territory/policy); seed realistic values; avoid later store reshape | ✓ |
| Phase-1 fields only | Seed only ENGINE/ROLE needs; extend store later | |
| Minimal seed | Fewest subjects/resources to pass criteria | |

**User's choice:** Full scenario schema now (recommended).

### Q2 — How much seed volume per unit?

| Option | Description | Selected |
|--------|-------------|----------|
| Curated contrast set | Hand-picked actors so each mechanism has clean ALLOW/tier-DENY/override examples; most legible | |
| Uniform small set | ~2–3 each per unit, even but some rows illustrate nothing | |
| Rich realistic seed | 5+ per unit, immersive but busier screens | ✓ |

**User's choice:** Rich realistic seed (diverged from recommendation — wants an immersive, full-looking world).
**Notes:** Legibility (DEMO-03) to be handled via UI affordances in a later phase, not by thinning the seed.

---

## Role + principal selection

### Q1 — How should the viewer control operating-role vs ABAC target?

| Option | Description | Selected |
|--------|-------------|----------|
| Two separate selectors | Role selector (action set) + separate ABAC target (subject/resource/domain); matches spike 004 | ✓ |
| One combined identity selector | Single persona sets both; conflates run-the-system vs whose-access | |
| Role selector only; target inline | Global role switch, triple chosen inline; target not visible at a glance | |

**User's choice:** Two separate selectors (recommended).

### Q2 — Where should the operating-role switcher live in Phase 1?

| Option | Description | Selected |
|--------|-------------|----------|
| Persistent global header now | Minimal top bar with banner; role in world-state; Phase 4 shell absorbs it | ✓ |
| Local to the Phase 1 view | Switcher inside the Phase 1 view; promoted to chrome in Phase 4 | |

**User's choice:** Persistent global header now (recommended).

---

## Phase 1 decision surface

### Q1 — What does the viewer see/use at the end of Phase 1?

| Option | Description | Selected |
|--------|-------------|----------|
| Single Decision Explorer view | Pick triple → live ALLOW/DENY + DecisionTrace; role-driven action panel mutates + recomputes; covers ENGINE + ROLE | ✓ |
| Reuse the spike Shell tabs | Spike per-mechanism tab nav; fast but DEMO-01 forbids per-mechanism tabs | |
| Two views: Decision + Roles/SoD | Split concerns; two surfaces to build + later reconcile | |

**User's choice:** Single Decision Explorer view (recommended).

---

## Claude's Discretion

- Banner / `[MOCK]` label mechanics (MODEL-03) — non-dismissable root component + reusable `[MOCK]` label convention.
- Reducer action shape & store slicing — implementation detail, constrained by MODEL-02 + full-schema decision.
- Exact per-domain tier scales — reuse spike `TIERS` unless a reason to adjust.

## Deferred Ideas

- Actual deletion of `frontend/src/spikes/` (retired now, removed later).
- Evaluation mechanics for shielding/deployment/territory/per-entity-policy fields (Phases 2–3) — fields modelled/seeded now.
- Legibility affordances for the rich seed (filter/curated default/search) — Phase 4 / ui-phase.
