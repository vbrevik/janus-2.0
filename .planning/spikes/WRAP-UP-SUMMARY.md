# Spike Wrap-Up Summary

**Date:** 2026-05-20
**Spikes processed:** 4
**Feature areas:** ABAC engine, Federation, Roles & SoD
**Skill output:** `./.claude/skills/spike-findings-janus-2.0/`

## Processed Spikes
| # | Name | Type | Verdict | Feature Area |
|---|------|------|---------|--------------|
| 001 | abac-engine | standard | VALIDATED | ABAC engine |
| 002 | hub-discovery-index | standard | VALIDATED | Federation |
| 003 | inter-entity-handshake | standard | VALIDATED | Federation |
| 004 | role-sod | standard | VALIDATED | Roles & SoD |

## Key Findings
- **Pure-computed ABAC is explainable** when every rule emits a human-readable trace (verified by vitest 6/6). The accepted cost: "who has access right now" must be reconstructed from an evaluation log — audit = the eval log, not a grants table.
- **Per-domain tiers earn their keep** — "clearance OK, domain tier too low" is a distinct, visible failure reason. Don't collapse them into one ladder.
- **Federation's value is the handshake, not the hub.** A pointer-only hub ("who knows what") only matters because the inter-entity handshake turns a pointer into holder-gated detail. "Discovery without disclosure" is the compelling, validated property.
- **Deny overrides are essential** under pure-ABAC — with no stored grant to delete, revocation/holds must override an otherwise-ALLOW.
- **8 operating roles are legible**, each with a distinct action set; strict-SoD Admin (no grant power) renders as a locked-out state. The 3 scoped roles (Manager/Sponsor/Subject) need data-level authz beyond flat role lists.

## Feasibility
Model holds end-to-end as a demo — no "won't work" signal. Remaining unknowns are interface-shaped, not feasibility-shaped: the wire contract (publish/discover/request-detail), identity federation, and ABAC policy authorship (AUTH-MODEL open questions #2, #4, #5).

## Next
Re-scope the roadmap around the validated AUTH-MODEL (`/gsd:new-milestone`), or spike the open interface questions.
