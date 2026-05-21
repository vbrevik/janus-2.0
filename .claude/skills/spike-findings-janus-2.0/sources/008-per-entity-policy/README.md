---
spike: 008
name: per-entity-policy
type: frontier
validates: "Given each entity authors its own release policy, when entities define different rules, then the engine honors the divergence"
verdict: VALIDATED
related: [001]
tags: [policy, abac]
---

# Spike 008: Per-entity policy

## What This Validates
Each holding entity authors its own release policy (enable/disable rules, set a stricter clearance floor). The SAME request can resolve differently per entity. Closes AUTH-MODEL Q#5 (policy authorship).

## How to Run
- UI: `npm run dev`, `/spikes.html`, tab **008 · Policy**.
- Logic: `npx vitest run src/spikes/lib/policy.test.ts` (3 tests).

## What to Expect
Pick a subject + resource; see the decision under all three entity policies side by side:
- **ENTITY_A** standard (all rules) → ALLOW for a qualifying subject.
- **ENTITY_B** strict (TOP_SECRET floor) → DENY for a SECRET subject regardless of resource.
- **ENTITY_C** relaxed lab (no need-to-know / no affiliation) → ALLOW where A/B would block.

## Investigation Trail
- `EntityPolicy` = per-rule booleans + optional `minClearanceFloor`. `evaluateWithPolicy` applies only enabled rules plus the floor; deny overrides still apply.

## Results
**VALIDATED** (3/3). Per-entity divergence works and is legible side-by-side. This is the mechanism that lets different real-world units (military / intel / industry / home-guard) enforce different release rules over a shared model.

**Signal:** real policy authorship wants a richer expression (conditions over arbitrary attributes — location, deployment, operation) and a way to author/version policies safely. The boolean+floor model is the proof-of-concept, not the final DSL. Directly relevant to the multi-unit deployment scenario (see WRAP-UP / AUTH-MODEL).
