---
spike: 001
name: abac-engine
type: standard
validates: "Given a subject's attributes and a resource's requirements, when the pure-computed ABAC policy evaluates, then it returns allow/deny with a human-readable explanation tracing each attribute"
verdict: VALIDATED
related: [003, 004]
tags: [abac, engine]
---

# Spike 001: ABAC engine

## What This Validates
Given a subject (clearance, per-domain tiers, compartments, entity) and a resource's requirements,
when the policy evaluates, then it returns ALLOW/DENY **with a per-rule trace** — proving pure-computed
ABAC is explainable/auditable, not opaque.

## How to Run
- UI: `cd frontend && npm run dev`, open `/spikes.html`, tab **001 · ABAC engine**.
- Logic: `cd frontend && npx vitest run src/spikes/lib/abac.test.ts`.

## What to Expect
Selecting a subject + resource produces a decision with four traced rules: Clearance, Domain tier,
Need-to-know, Affiliation. Each shows the compared values and pass/fail.

## Investigation Trail
- First modeled domain as a label with one clearance ladder; corrected to **per-domain tiers** (A7) so
  "clearance passes but COMPUTER tier too low" is a distinct, visible failure reason.
- Added **explicit deny overrides** (A4) — revoked / Security-Officer hold — that force DENY even when
  base rules pass (needed because pure-ABAC has no stored grant to delete).

## Results
**VALIDATED.** Vitest 6/6. UI shows e.g. Lee Park → Dev Jump Host DENY on *domain tier* while clearance
passes; Dana → Dev Jump Host DENY on *affiliation* only. Decisions are explainable to the exact attribute.

**Signal / what might not work:** "who has access *right now*" is not stored — it must be reconstructed by
replaying evaluations. Audit therefore = an evaluation log (see 004). That is a real, accepted cost of
pure-computed ABAC, not a blocker.
