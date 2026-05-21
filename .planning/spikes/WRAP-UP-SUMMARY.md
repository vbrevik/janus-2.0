# Spike Wrap-Up Summary

**Dates:** 2026-05-20 (001–004), 2026-05-21 (005–009 frontier round)
**Spikes processed:** 9 (all VALIDATED)
**Feature areas:** ABAC engine · Federation · Roles & SoD · Audit · Policy & Context
**Skill output:** `./.claude/skills/spike-findings-janus-2.0/`
**Tests:** 29/29 (`npx vitest run src/spikes/lib`)

## Processed Spikes
| # | Name | Type | Verdict | Feature Area |
|---|------|------|---------|--------------|
| 001 | abac-engine | standard | VALIDATED | ABAC engine |
| 002 | hub-discovery-index | standard | VALIDATED | Federation |
| 003 | inter-entity-handshake | standard | VALIDATED | Federation |
| 004 | role-sod | standard | VALIDATED | Roles & SoD |
| 005 | interchange-contract | frontier | VALIDATED | Federation |
| 006 | attribute-trust | frontier | VALIDATED | Federation |
| 007 | audit-reconstruction | integration | VALIDATED | Audit |
| 008 | per-entity-policy | frontier | VALIDATED | Policy & Context |
| 009 | obligations-context | frontier | VALIDATED | Policy & Context |

## Key Findings
- **Pure-computed ABAC is explainable** (per-rule trace); audit = the append-only evaluation log, not a grants table. Point-in-time access reconstructs by replay (007).
- **Per-domain tiers** are worth modeling distinctly from clearance.
- **Federation = discovery without disclosure:** pointer-only hub (002) + holder-gated handshake (003), exchanged via a typed contract (005), with attributes carried in **verified signed credentials** (006 — never evaluate ABAC on unverified claims).
- **Deny overrides** handle revocation/holds under pure-ABAC.
- **Per-entity policies diverge** (008) — the mechanism behind the 6 units' different access profiles.
- **Context-driven access works** (009): deployment-driven **support-obligation grants** (turn on abroad, off at home) and **directional shielding** (protected intel/industry data denied unless allowlisted).

## Feasibility
Every part of the 6-unit deployment scenario (AUTH-MODEL §12) now has a validated mechanism. No "won't work" remains. The open work is real-build shaped: real transport for the contract, asymmetric/verifiable credentials + key distribution, a deployment feed with time-bounded obligation revocation, richer policy authoring, and leak/anomaly detection on the audit log.

## Next
Re-scope the roadmap around the validated AUTH-MODEL + 6-unit scenario (`/gsd:new-milestone`).
