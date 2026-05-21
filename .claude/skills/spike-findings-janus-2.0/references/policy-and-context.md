# Per-Entity Policy & Context-Driven Access

Covers spikes 008 (per-entity policy) and 009 (obligations + shielding) — the mechanisms that turn the
generic engine into the 6-unit deployment scenario (see AUTH-MODEL §12).

## Requirements
- Each entity authors **its own release policy** (enable/disable rules; stricter floors).
- **Support obligations:** a subunit deployed ABROAD grants supporting units access — dynamic, context-on/off, NOT a stored grant.
- **Directional shielding:** shielded owner data (intel/industry) is default-deny even to standing-access units, unless allowlisted.

## How to Build It
1. **Per-entity policy (008, `sources/code/lib/policy.ts`):** `EntityPolicy` = per-rule booleans + optional `minClearanceFloor`. `evaluateWithPolicy` applies only enabled rules + floor; deny overrides still apply. Same request → different decisions per holder (military broad / strict floor / relaxed lab).
2. **Context rules (009, `sources/code/lib/obligations.ts`):** model rule *effects* — `BASE` (standing access), `GRANT` (obligation turns a DENY into ALLOW when subunit ABROAD + requester has `hasObligation`), `DENY` (shielding turns an ALLOW into DENY for shielded data unless allowlisted). Decision = base, then grants, then shields (shield wins).
3. Map the 6 units: military = broad standing; intel = reads-most but its data shielded-out; infra = infrastructure read; industry = own + leak monitoring; home guard = territorial; obligations connect supporters to deployed units.

## What to Avoid
- **Modeling obligations as static attributes or stored grants** — they're context-driven and must turn OFF when the subunit returns home.
- **Letting an obligation pierce shielding** — apply shielding last so protected intel/industry data stays protected even under an obligation grant.
- **Hardcoding one global policy** — entities must diverge; that's the whole point.

## Constraints
- Obligations need a real deployment/posting feed + time-bounding + auto-revocation on return.
- The 009 standing-access matrix is simplified; in the real model it composes with the full ABAC engine (001) + per-entity policy (008), not replaces them.
- Real policy authorship wants a richer expression (conditions over arbitrary attributes incl. location/deployment) + safe versioning — the boolean/floor + effect model here is the proof-of-concept.

## Origin
Synthesized from spikes: 008, 009 (use the 001 engine + data model).
Source files: `sources/code/lib/policy.ts`, `obligations.ts`, `sources/code/components/Spike008Policy.tsx`, `Spike009Context.tsx`, `sources/008-per-entity-policy/`, `sources/009-obligations-context/`.
