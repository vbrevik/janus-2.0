---
spike: 009
name: obligations-context
type: frontier
validates: "Given context attributes (deployment, ownership), when a subunit deploys abroad or owner data is shielded, then access is granted/denied dynamically by obligation and shielding rules"
verdict: VALIDATED
related: [001, 008]
tags: [context, obligation, shielding]
---

# Spike 009: Obligations & context

## What This Validates
The genuinely-new mechanisms from the 6-unit deployment scenario (AUTH-MODEL §12):
- **Support obligations** — a context-driven GRANT: when a subunit deploys ABROAD and the requester has a support obligation to its unit, access turns ON (and OFF again when it returns HOME).
- **Directional shielding** — a context-driven DENY: shielded owner data (intel/industry) is denied even to requesters with standing access, unless they're on the allowlist.

## How to Run
- UI: `npm run dev`, `/spikes.html`, tab **009 · Context**.
- Logic: `npx vitest run src/spikes/lib/obligations.test.ts` (7 tests).

## What to Expect
- Panel A: Inventory/Infrastructure → 1st Recon Coy. HOME → DENY; flip to ABROAD → ALLOW (support obligation grant). Switch requester to Industry → still DENY abroad (no obligation).
- Panel B: Military Unit 1 → INTEL Threat Brief (allowlisted) → ALLOW; Military Unit 2 (broad standing, not allowlisted) → DENY by shielding.

## Investigation Trail
- Modeled rule *effects* (BASE / GRANT / DENY) rather than only conjunctive passes — obligations are additive grants, shielding is a subtractive deny. Verified live: deployment toggle flips the decision via the obligation rule.

## Results
**VALIDATED** (7/7 + live UI). The obligation rule class — dynamic, context-on/off, no stored grant — works and is legible. Directional shielding correctly overrides standing access for protected data.

**Signal / what's next for a real build:**
- Obligations need a real source (deployment/posting feed) + time-bounding + revocation when a unit returns.
- Standing-access here is a simplified matrix; in the real model it composes with the full ABAC engine (001) + per-entity policy (008) rather than replacing them.
- This is the mechanism layer; mapping the actual 6 units' policies + leak/anomaly detection (industry) is the next planning step.
