# Spike Manifest

## Idea

Validate the Janus **authorization-hub + pure-computed ABAC** model (see `.planning/AUTH-MODEL.md`)
with a throwaway working spike — show what might work or not work before committing to a build.
DEMO/MOCK: everything seeded and in-memory. Clearance is treated as an external, read-only attribute.

## Requirements (emerged during spiking)

- **Build inside the real Vite app** (not CDN/throwaway HTML) — isolated via a dev-only `spikes.html`
  entry mounting `frontend/src/spikes/`, bypassing the TanStack router (no `routeTree.gen.ts` changes).
- **Per-domain tiers** — each of computer/data/physical has its own tier scale; a subject holds a
  separate authorization level per domain (not one flat clearance ladder).
- **Pure-computed ABAC** — decisions evaluated live from attributes; no stored access rows.
- **Conjunctive rules + explicit deny overrides** — ALLOW iff all base rules pass AND no override
  (revoked / Security-Officer hold) fires.
- **Hub stores pointers only** — who-knows-what, no details; detail crosses entities only via handshake.

## Spikes

| # | Name | Type | Validates | Verdict | Tags |
|---|------|------|-----------|---------|------|
| 001 | abac-engine | standard | Subject×resource → live allow/deny with per-rule explanation | ✓ VALIDATED | abac, engine |
| 002 | hub-discovery-index | standard | Who-holds-what about a subject, no details | ✓ VALIDATED | hub, federation |
| 003 | inter-entity-handshake | standard | Discover → request → holder's ABAC releases/withholds | ✓ VALIDATED | federation, abac |
| 004 | role-sod | standard | Role-gated actions over one shared decision (SoD) | ✓ VALIDATED | rbac, sod |
| 005 | interchange-contract | frontier | Two entities exchange only via a typed publish/discover/request-detail contract | ✓ VALIDATED | federation, contract |
| 006 | attribute-trust | frontier | Holder verifies a signed attribute token before trusting; forged/over-claimed rejected | ✓ VALIDATED | trust, federation |
| 007 | audit-reconstruction | integration | Append-only eval log reconstructs "who can access R now / as of T" | ✓ VALIDATED | audit, abac |
| 008 | per-entity-policy | frontier | Each entity authors its own release policy; engine honors divergence | ✓ VALIDATED | policy, abac |

## Where the code lives

Code: `frontend/src/spikes/` (lib + components). Entry: `frontend/spikes.html`.
Run: `cd frontend && npm run dev`, open `/spikes.html`. Logic test: `npx vitest run src/spikes/lib/abac.test.ts`.
