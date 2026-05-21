# Feature Research

**Domain:** Authorization-exchange hub demo — federated ABAC, 6-unit deployment scenario
**Researched:** 2026-05-21
**Confidence:** HIGH (all features grounded in validated spikes 001–009 and AUTH-MODEL.md §12)

---

## What "convincing" means for this demo

A viewer unfamiliar with ABAC or federation should leave understanding three things:

1. **The hub knows nothing sensitive** — it routes, not stores. A pointer being visible proves
   nothing about the content behind it.
2. **Every decision is explainable** — not a black-box grant table, but a live computation
   showing which rules fired and why.
3. **Policy diverges per entity** — the same request resolves differently across the 6 units,
   and shielding / obligations turn on and off with context.

A viewer who can manipulate inputs and watch decisions change live will believe the model.
A viewer who stares at static screenshots will not.

---

## Feature Landscape

### Table Stakes — the demo is not convincing without these

Features a viewer of an authorization-hub demo implicitly expects. Missing any of these
makes the demo look like a prototype fragment, not a coherent system.

| Feature | Why Expected | Complexity | Validated Spike | Notes |
|---------|--------------|------------|-----------------|-------|
| Live ABAC decision panel with per-rule trace | Any authz demo must show the decision engine working interactively; a bare ALLOW/DENY is unauditable and unconvincing | MEDIUM | 001 | `DecisionTrace` component exists; must be reused as the canonical rendering primitive throughout the demo, not just in spike 001 |
| Per-domain tier rendering (COMPUTER / DATA / PHYSICAL shown distinctly) | Viewers must see that the three domains are independent ladders, not a single clearance comparison | LOW | 001 | Data model already separates `TIERS` per domain; just needs consistent labeling in the UI |
| Hub discovery view — pointer list only, explicit "not stored" panel | The hub's privacy property is the core architectural claim; it must be made visually obvious that no clearance/compartment data lives in the hub | LOW | 002 | `Spike002Hub` prototype exists; an "absent fields" callout box is required, otherwise the boundary is invisible |
| Entity-to-entity handshake flow (request → holder evaluates → ALLOW/DENY) | The mechanism that makes discovery useful; without it the hub is just a thin directory | MEDIUM | 003 | Must show both ALLOW (content revealed) and DENY (pointer visible, content withheld) branches |
| 8 operating roles visible and enforced in the UI | Viewers from a governance background expect to see SoD; "who can push which button" must be apparent | MEDIUM | 004 | Role selector already in spike 004; gate UI actions by `roleDef.ops.includes(op)` — Approver approves, Manager requests, Auditor reads |
| Deny override demonstration (revoke / security hold flips ALLOW → DENY) | Proves the "no stored grants" model handles revocation correctly; essential for security audiences | LOW | 001, 004 | Toggle `flags.revoked` or `flags.securityHold` on a subject and watch a live ALLOW become DENY |
| Audit timeline — drag to any T, "who can access" recomputes | A pure-ABAC system has no grants table; showing point-in-time reconstruction is the proof that the log is the system of record | MEDIUM | 007 | `Spike007Audit` prototype exists; must include visible event list showing what was applied vs future |
| Per-entity policy divergence panel (same request, 3 policies, different outcomes) | Proves the federation claim: entities author their own release policies; a global policy would defeat the model | MEDIUM | 008 | `Spike008Policy` already shows ENTITY_A / B / C side-by-side; must use the 6-unit names in the cohesive demo |
| Signed credential verification step (verify before ABAC) | Security audiences will ask "can a requester lie about their clearance?"; the answer must be visible in the flow | LOW | 006 | Verification gate must appear before the ABAC trace in the handshake path; show INVALID credential → abort |

### Differentiators — what makes this demo stand out

Features that are not universally expected of an authz demo but are central to the
specific model being demonstrated. These show the 6-unit scenario's novel mechanics.

| Feature | Value Proposition | Complexity | Validated Spike | Notes |
|---------|-------------------|------------|-----------------|-------|
| Deployment toggle → support obligation fires | Shows the most novel mechanism: a time-bounded context-driven grant that turns on when a subunit goes ABROAD and off when it returns — not a stored grant, not a policy flag | LOW | 009 | `Spike009Context` panel A already works; surface this prominently; the HOME → ABROAD flip is the single most striking live demo moment |
| Directional shielding panel (intel / industry data default-deny even to broad-access units) | Shows asymmetric policy: Intel reads almost everything, yet its own data is shielded out; Military has broad access, but Intel's resources stay dark unless allowlisted | LOW | 009 | Panel B of `Spike009Context` already implemented; allowlist toggle is the key interaction |
| Exchange transcript view (typed envelopes: PUBLISH → DISCOVER → REQUEST → RESPONSE) | Makes the contract visible — viewers can see that entities never call each other directly; all communication is a typed envelope routed through the network | MEDIUM | 005 | `Spike005Contract` transcript already rendered in monospace; promote to a first-class "Exchange" view in the coherent demo |
| 6-unit entity console (one panel per unit: Military 1, Military 2, Intel, Infra, Industry, Home Guard) | Grounds the abstract model in the real deployment scenario; viewers from the target organisations recognise their own unit | MEDIUM | 008, 009 (uses all spikes) | NEW — not yet in any single spike; requires composing the per-entity policy + obligations data into unit-labelled cards |
| Leak / anomaly detection view on the audit log (industry stock-info case) | Demonstrates that the append-only log is not just for point-in-time queries but for detecting suspicious access patterns | HIGH | 007 (extension) | Partially validated: spike 007 has the log infrastructure but no anomaly query; this requires a new scan over the log events for Industry-owned resources accessed by unexpected units |
| Location / territory attribute scoping (home guard territorial filter) | Shows Home Guard's "what happens in our turf" model: access gated by a location/territory attribute rather than just clearance | MEDIUM | 009 (partial) | Spike 009 models deployment status; territory is the home-guard analogue — not yet explicitly coded; moderate new work to add a `territory` attribute and a rule against it |

### Anti-Features — explicitly out of scope for the demo

| Feature | Why It Seems Attractive | Why It Is Wrong for This Demo | What to Do Instead |
|---------|-------------------------|-------------------------------|-------------------|
| Real JWT auth / login flow per entity | Makes the demo "feel real" | Adds a full auth layer with no value to the model demonstration; viewers spend time on login, not on authz | Use a role-selector dropdown at the top of each view; no passwords |
| Real inter-entity network transport (HTTP calls between entity services) | Looks more like a real system | Transport is explicitly out of scope (PROJECT.md); simulating it in-process via the typed `Network` class already proves the contract shape | Keep the in-process `Network`; label it clearly as "simulated transport" |
| Production RBAC backend enforcement (Rocket guards for every route) | Feels more complete | The demo is frontend-mock-first; wiring real Rocket authz guards distracts from the ABAC model and multiplies implementation scope | Gate UI actions via the role-ops check in the frontend; no backend RBAC changes needed |
| Persistent database writes for demo interactions | Users expect changes to stick | Defeats the demo's in-memory/seeded design; adds migration/seed complexity; the model is about policy evaluation, not CRUD | All state lives in React `useState`; seeded data is the ground truth |
| Asymmetric / PKI verifiable credentials | More realistic for a real build | Key distribution, certificate management, and JWKS endpoints are out of scope (PROJECT.md); the mechanism being demonstrated is "verify before trust", not the key infrastructure | Demo uses HMAC + mock key registry (spike 006 pattern); label it as "demo HMAC, real build uses asymmetric VCs" |
| A complete personnel CRUD admin UI | The existing Janus v1 substrate has it | It confuses viewers by making the demo look like a general HR tool; the demo is about authorization exchange, not personnel management | Hide or exclude existing Person/Org CRUD from the demo entry point; if needed, reference it as "substrate" |
| Animated / real-time WebSocket event push during demo interactions | Adds visual polish | The WebSocket server on port 15540 is part of the substrate, not the ABAC model; wiring it into demo interactions adds complexity without demonstrating any new mechanism | Decisions are synchronous and reactive to input changes; no async push needed in the demo |
| Audit log in PostgreSQL (real persistence) | Seems necessary for an audit demo | The append-only log for the demo is a seeded in-memory array; what matters is the replay logic, not the storage layer | Use the `auditlog.ts` in-memory array; label the boundary clearly |

---

## Feature Dependencies

```
ABAC engine (001)
    ├──required by──> Hub handshake (003)
    ├──required by──> SoD role gates (004)
    ├──required by──> Per-entity policy (008)
    ├──required by──> Audit reconstruction (007)
    ├──required by──> Obligations + shielding (009)
    └──required by──> Signed credential verify (006)

Hub discovery index (002)
    └──required by──> Hub handshake (003)
                          └──required by──> Exchange transcript (005)

Audit log infrastructure (007)
    └──required by──> Leak / anomaly detection (007 extension)

Per-entity policy (008)
    └──composes with──> 6-unit entity console (NEW)

Obligations + shielding (009)
    └──composes with──> 6-unit entity console (NEW)
    └──composes with──> Deployment toggle interaction (009)

Signed credential verify (006)
    └──enhances──> Hub handshake (003) [must appear before ABAC trace in the flow]
```

### Dependency Notes

- **ABAC engine (001) is the foundation:** Every other mechanism calls `evaluate()` or
  `evaluateWithPolicy()`; it must be the first thing wired into the cohesive demo.
- **Hub handshake (003) requires both 002 and 001:** Discovery without handshake is
  just a directory; handshake without the discovery step loses the privacy-boundary story.
- **Signed credentials (006) must precede ABAC in the handshake path:** Verifying the
  credential envelope must visibly happen before the ABAC trace is shown; otherwise viewers
  miss the "verify before trust" guarantee.
- **6-unit entity console is a composition:** It is not a new mechanism — it stitches
  per-entity policy (008) and obligations/shielding (009) data under the real 6-unit names.
  All the logic already exists; the work is UI composition and data re-labeling.
- **Leak detection extends 007:** The log infrastructure exists; anomaly queries are new
  logic over the existing event array. Medium additional work.

---

## Grouping by the 6 Model Areas (AUTH-MODEL §12)

These groups inform how the demo should be navigated — one conceptual area per section.

### Area 1: Decision Engine (all 6 units share this)
Covers spikes 001, 006.

| Feature | Category | Complexity |
|---------|----------|------------|
| Live ABAC decision panel — per-rule trace | Table Stakes | MEDIUM |
| Per-domain tier rendering (COMPUTER / DATA / PHYSICAL) | Table Stakes | LOW |
| Deny override (revoke / security hold) | Table Stakes | LOW |
| Signed credential verification before ABAC | Table Stakes | LOW |

### Area 2: Federation Hub (discovery + exchange)
Covers spikes 002, 003, 005.

| Feature | Category | Complexity |
|---------|----------|------------|
| Hub discovery view — pointer list, no details | Table Stakes | LOW |
| Entity-to-entity handshake flow | Table Stakes | MEDIUM |
| Exchange transcript (typed envelopes) | Differentiator | MEDIUM |

### Area 3: Operating Roles & SoD
Covers spike 004.

| Feature | Category | Complexity |
|---------|----------|------------|
| 8 roles visible + ops-gated UI actions | Table Stakes | MEDIUM |

### Area 4: Audit & Reconstruction
Covers spike 007.

| Feature | Category | Complexity |
|---------|----------|------------|
| Audit timeline slider — point-in-time reconstruction | Table Stakes | MEDIUM |
| Leak / anomaly detection view (Industry case) | Differentiator | HIGH |

### Area 5: Per-Entity Policy Divergence
Covers spike 008.

| Feature | Category | Complexity |
|---------|----------|------------|
| Per-entity policy panel (same request, divergent outcomes) | Table Stakes | MEDIUM |
| 6-unit entity console (unit-labelled cards) | Differentiator | MEDIUM |

### Area 6: Context, Obligations & Shielding
Covers spike 009.

| Feature | Category | Complexity |
|---------|----------|------------|
| Deployment toggle → support obligation fires | Differentiator | LOW |
| Directional shielding panel (Intel / Industry) | Differentiator | LOW |
| Location / territory attribute scoping (Home Guard) | Differentiator | MEDIUM |

---

## MVP Definition

### Launch With — minimum to be convincing

The demo is convincing when a viewer can see the full decision flow end-to-end, including
the privacy boundary at the hub, a live decision explanation, at least one SoD gate, and
the deployment obligation toggle. The anomaly detection and territory scoping are "also
interesting" but not required to prove the core model.

- [ ] Live ABAC decision panel with per-rule trace — core proof the engine works
- [ ] Per-domain tier display — shows three-domain structure
- [ ] Deny override (revoke / security hold) — proves revocation without stored grants
- [ ] Hub discovery view with explicit "not stored" callout — proves the privacy boundary
- [ ] Entity-to-entity handshake (ALLOW + DENY branches) — proves hub value
- [ ] Signed credential verification step before ABAC trace — proves verify-before-trust
- [ ] 8 operating roles with ops-gated UI (Approver approves, Manager requests, Auditor reads) — proves SoD
- [ ] Audit timeline slider with event list — proves log is system of record
- [ ] Per-entity policy divergence (same request, 3 outcomes) — proves federation claim
- [ ] Deployment toggle → obligation fires (HOME vs ABROAD) — the most striking live moment
- [ ] Directional shielding (Intel / Industry data blocked for broad-access units) — proves asymmetric policy
- [ ] Exchange transcript view (typed envelopes) — makes the contract visible

### Add After Validation

- [ ] 6-unit entity console (compose all mechanisms under the real unit names) — increases recognisability for the target audience
- [ ] Location / territory attribute scoping (Home Guard) — rounds out the 6-unit scenario

### Future Consideration (production build, not demo)

- [ ] Leak / anomaly detection view — the logic is new, the infrastructure exists; defer until the demo's core story is validated
- [ ] Real transport layer between entity services — relevant only once the model is approved for a real build
- [ ] Asymmetric / PKI credentials — correct for production; out of scope for demo

---

## Feature Prioritization Matrix

| Feature | Demo Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| ABAC decision panel + trace | HIGH | MEDIUM | P1 |
| Hub discovery view + "not stored" panel | HIGH | LOW | P1 |
| Handshake flow (ALLOW + DENY) | HIGH | MEDIUM | P1 |
| Deployment toggle → obligation | HIGH | LOW | P1 |
| Directional shielding panel | HIGH | LOW | P1 |
| Audit timeline slider | HIGH | MEDIUM | P1 |
| Per-entity policy divergence | HIGH | MEDIUM | P1 |
| 8-role SoD gates | HIGH | MEDIUM | P1 |
| Signed credential verify step | MEDIUM | LOW | P1 |
| Exchange transcript view | MEDIUM | MEDIUM | P2 |
| 6-unit entity console | HIGH | MEDIUM | P2 |
| Territory / location scoping (Home Guard) | MEDIUM | MEDIUM | P2 |
| Deny override (revoke / hold) | MEDIUM | LOW | P1 |
| Leak / anomaly detection | MEDIUM | HIGH | P3 |

---

## Sources

- Spike findings synthesized from: `.claude/skills/spike-findings-janus-2.0/references/` (all 5 reference files)
- AUTH-MODEL.md §12 — target deployment scenario (6 units, obligations, shielding, territory)
- PROJECT.md — demo/mock constraints, out-of-scope items
- Working spike code: `frontend/src/spikes/` — existing component and lib files confirm what is already built vs what is new

---

*Feature research for: Janus 2.0 — Authorization Hub demo*
*Researched: 2026-05-21*
