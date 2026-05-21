# Janus 2.0

## What This Is

Janus 2.0 is a **DEMO / MOCK of a federated authorization-exchange hub**. It explores a model where
multiple entities (military units, intelligence, infrastructure, industry, home guard) share *authorization*
information across three access domains — **computer, data, physical** — without exposing the underlying
details. Access decisions are **pure-computed ABAC** (attribute-based, evaluated live, no stored grants),
fully explainable and reconstructable from an append-only audit log. **Clearance is determined externally**
and consumed as a read-only attribute.

It originated as a security-clearance/access-management admin tool (Rust/Rocket + PostgreSQL backend,
React + TanStack SPA). That codebase is the substrate; the v2.0 direction repurposes it to demonstrate the
authorization-hub model. The hub demo is **frontend-mock-first** — external integrations are simulated.

The design contract is `.planning/AUTH-MODEL.md`; the model was validated end-to-end by 9 spikes
(`.planning/spikes/`, skill `spike-findings-janus-2.0`).

## Core Value

Multiple entities can **discover and exchange authorization information without exposing details**, with
every access decision **computed live from attributes** and **fully explainable and auditable** — proving a
federated ABAC model (and its 6-unit deployment scenario) before committing to a real build.

## Requirements

### Validated

<!-- Mechanisms proven by spikes 001-009 (demo-level), plus the existing code substrate. -->

- ✓ Pure-computed ABAC engine: per-domain tiers, deny overrides, explainable per-rule traces (spike 001)
- ✓ Pointer-only discovery hub — "who knows what" without details (spike 002)
- ✓ Inter-entity handshake — holder-gated detail release (spike 003)
- ✓ Operating roles & separation of duties — 8 roles (spike 004)
- ✓ Typed interchange contract between entities (spike 005)
- ✓ Signed/verified attribute credentials — verify before trust (spike 006)
- ✓ Audit reconstruction — replay log for point-in-time access (spike 007)
- ✓ Per-entity policy divergence (spike 008)
- ✓ Context access — deployment-driven support obligations + directional shielding (spike 009)
- ✓ Existing substrate: JWT auth, Person/Org/InfoSystem CRUD, access grants, audit log, WebSocket, React/Vite/shadcn frontend

### Active

<!-- This milestone: v2.0 Authorization Hub (demo). -->

- [ ] ABAC engine integrated into a coherent demo app (not just isolated spikes)
- [ ] Federation: pointer hub + typed contract + verified credentials + holder-gated release, wired together
- [ ] Operating roles & SoD across the demo (8 roles, attribute-approval grants)
- [ ] Audit: append-only log, point-in-time reconstruction, leak/anomaly detection (industry)
- [ ] Context & policy: per-entity policies, deployment obligations, directional shielding, location/deployment attributes
- [ ] The 6-unit deployment scenario instantiated end-to-end (2 military, intel, infra, industry, home guard)

### Out of Scope

- **Real backend RBAC / authorization enforcement** — demo simulates it; production authz is a later, real build
- **Real identity federation / IdP / asymmetric verifiable credentials + key distribution** — demo uses mock HMAC + a mock key registry
- **Real inter-entity network transport** — simulated in-process via the typed contract
- **Production persistence / hardening / scale** — demo is in-memory/seeded
- **The abandoned v1.0 frontend-consolidation cleanup** (GUARD/ROUTE/TEST/CLEAN) — superseded by this pivot; archived in `.planning/archive/v1.0-frontend-consolidation/`

## Context

- **Pivot (2026-05-20/21).** The project sat dormant while real-world responsibilities clarified. The team's
  scope is now *managing authorizations across three domains* and *exchanging auth info between entities* —
  clearance determination belongs to external authorities. The v1.0 frontend-consolidation milestone (never
  shipped) is superseded.
- **DEMO / MOCK.** Goal is to demonstrate what works (and what doesn't) convincingly, not to ship production
  security. Don't over-engineer hardening.
- **Validated by spikes.** 9 spikes proved every mechanism in the 6-unit scenario; `.planning/AUTH-MODEL.md`
  is the design contract; `spike-findings-janus-2.0` holds build blueprints.
- **Brownfield substrate.** Codebase map in `.planning/codebase/`. The existing Rust/React app is the base.

## Constraints

- **DEMO/MOCK** — simulate external clearance feeds, identity federation, and inter-entity transport.
- **Stack** — React 19 + TanStack + Vite + Tailwind + shadcn/ui (frontend); Rust 1.87 + Rocket + sqlx/Postgres
  (backend substrate). Match existing patterns; no new frameworks.
- **Spike code** lives in `frontend/src/spikes/` behind a dev-only `/spikes.html` entry (isolated from the
  TanStack router; no `routeTree.gen.ts` changes).
- **Pure-computed ABAC** — no stored grants; audit log is the system of record.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Pivot to a federated ABAC authorization-hub demo (v2.0) | Real-world need clarified: manage authorizations + exchange between entities, clearance external | — Active |
| DEMO/MOCK, not production | Prove the model and surface failure modes before a real build | — Active |
| Supersede incomplete v1.0 frontend-consolidation | The pivot replaces the direction entirely; old artifacts archived, not deleted | — Done |
| Pure-computed ABAC + append-only audit log | No stored grants; explainable decisions; reconstructable access | — Validated (spikes 001/007) |
| Discovery without disclosure (pointer hub + handshake) | Entities share *that* they hold info, not the details; release is policy-gated | — Validated (spikes 002/003/005) |
| Verify-before-trust on signed credentials | Cross-entity ABAC must not trust self-asserted attributes | — Validated (spike 006) |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-21 — pivot to v2.0 Authorization Hub (demo)*
