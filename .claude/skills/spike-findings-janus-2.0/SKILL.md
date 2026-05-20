---
name: spike-findings-janus-2.0
description: Implementation blueprint from spike experiments. Requirements, proven patterns, and verified knowledge for building the Janus authorization-hub + ABAC model. Auto-loaded during implementation work.
---

<context>
## Project: janus-2.0

Re-scoped Janus from a role-aware admin UI into an **authorization-exchange hub** for three access
domains (computer / data / physical), using **pure-computed ABAC**. Clearance is determined externally and
consumed read-only; Janus manages authorizations and defines an interchange contract for entities to
exchange auth info. DEMO/MOCK — these spikes prove the model, not a production system. Full model in
`.planning/AUTH-MODEL.md`.

Spike sessions wrapped: 2026-05-20
</context>

<requirements>
## Requirements

- **Build inside the real Vite app** (not CDN) — isolated via a dev-only `frontend/spikes.html` entry mounting `frontend/src/spikes/`, bypassing the TanStack router (no `routeTree.gen.ts` changes).
- **Per-domain tiers** — each of computer/data/physical has its own tier scale; subjects hold a separate authorization level per domain.
- **Pure-computed ABAC** — decisions evaluated live from attributes; no stored access rows.
- **Conjunctive rules + explicit deny overrides** — ALLOW iff all base rules pass AND no override (revoked / Security-Officer hold) fires.
- **Hub stores pointers only** — who-knows-what, no details; detail crosses entities only via the handshake, gated by the holder's ABAC.
- Clearance is external/read-only.
</requirements>

<findings_index>
## Feature Areas

| Area | Reference | Key Finding |
|------|-----------|-------------|
| ABAC engine | references/abac-engine.md | Pure-computed ABAC is explainable when each rule emits a trace; audit = an evaluation log |
| Federation | references/federation.md | Pointer-only hub + holder-gated handshake = "discovery without disclosure" (the compelling property) |
| Roles & SoD | references/roles-sod.md | 8 operating roles legible; deny overrides handle revocation under pure-ABAC; 3 scoped roles need data-level authz |

## Source Files

Original spike source preserved in `sources/` (`code/` = the working `frontend/src/spikes` tree;
`NNN-*/README.md` = per-spike investigation + verdict).
</findings_index>

<metadata>
## Processed Spikes

- 001-abac-engine
- 002-hub-discovery-index
- 003-inter-entity-handshake
- 004-role-sod
</metadata>
