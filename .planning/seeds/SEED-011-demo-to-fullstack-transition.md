---
id: SEED-011
status: dormant
planted: 2026-05-22
planted_during: v2.0 Authorization Hub (demo), Phase 2 complete (deferred — finish v2.0 first)
trigger_when: when v2.0 demo is complete/validated and the decision is made to build for real — the in-memory/mock → real fullstack transition
scope: Large
---

# SEED-011: Demo → real fullstack transition

The plan to take Janus from the **in-memory, frontend-mock-first v2.0 demo** to a **real fullstack
build** (Rust/Rocket + PostgreSQL substrate, real external integrations). This is the **capstone /
assembly seed**: it ties together every deferred fullstack concern and the other ten seeds.

> "Complete picture when v2 is done": this seed is the **review point**. When v2.0 finishes, revisit
> this + all surfaced seeds (via `/gsd-new-milestone`) to scope the real-build milestone(s).

## Why This Matters

v2.0 deliberately proves the *model* in-memory (PROJECT.md: frontend-mock-first; persistence/real
integrations are Out of Scope). The model is validated (9 spikes). The transition is where the proven
model becomes a deployable system — the biggest, riskiest chunk of remaining work.

## What's mocked now → what "real" means

| Layer | Demo now (v2.0) | Real fullstack | Related |
|---|---|---|---|
| **Persistence** | in-memory React (useReducer, **event-sourced**), seeded data | Rust/Rocket + **PostgreSQL** (existing substrate); real append-only event store; **materialized projection** for "current access" at scale | spike 007 signal; [[SEED-005]] |
| **ABAC enforcement** | pure-computed **in-browser** (UI) | **server-side enforcement** (not just UI) — real authorization enforcement | PROJECT Out of Scope "real backend RBAC"; spike 001 |
| **Clearance feed** | seeded JSON (read-only attr) | real external clearance feed + **verifiable credentials + key distribution** (HMAC → asymmetric) | [[SEED-008]]; spike 006 |
| **Identity** | mocked | real **identity federation / IdP** | AUTH-MODEL §10 |
| **Inter-entity transport** | **in-process** typed contract | real **network transport** between entities | spikes 003/005 |
| **Audit log** | in-memory event log | durable **tamper-evident** store; retention/hardening | [[SEED-005]] |
| **Forms** (if adopted) | n/a (deferred) | POB / autorisasjonssamtale / taushetserklæring wired to backend | [[SEED-001]] [[SEED-002]] [[SEED-007]] |
| **Security-Officer domains** | UI/in-memory | real backend modules: NDA, info-system security, clearance import, annotations | [[SEED-006]] [[SEED-009]] [[SEED-008]] [[SEED-010]] |

## Net-new mechanisms still to prove (AUTH-MODEL §12 — candidate spikes)

- **Obligation rule class** — deployment-driven, time-bounded, context-toggled access (most novel;
  "might not work" risk).
- **Directional shielding** — resource-side default-deny + explicit allow (intel, industry secrets).
- **Environment/context attributes** — location/territory, deployment status (home vs abroad).
- **Leak/anomaly detection** — monitoring layer over the audit log (industry).

(These extend the validated model: per-entity policy = spike 008; context feeds engine = spike 001;
leak detection on audit log = spike 007.)

## Suggested transition order (rough)

1. Stand up persistence on the existing substrate (Postgres schema for event store + entities).
2. Move ABAC evaluation server-side; keep the pure-computed core, enforce on the backend.
3. Real audit log (durable, tamper-evident) — system of record ([[SEED-005]]).
4. Clearance import via verifiable credentials + key registry ([[SEED-008]]).
5. Real inter-entity transport over the typed contract (spikes 003/005).
6. Identity federation / IdP.
7. (If in scope) the NSM forms + Security-Officer backend modules.
8. Prove the net-new mechanisms (obligations / directional shielding / leak detection).

## Open questions

- Reuse the existing Rust/Rocket + Postgres substrate as-is, or re-architect?
- One big real-build milestone or several (persistence → enforcement → integrations → forms)?
- Which "real" integrations are actually needed first vs. can stay stubbed longer?
- Does the clearance/forms scope (SEED-001/002/007) get adopted at all (the "clearance external"
  decision — [[SEED-001]] flags the contradiction)?

## Breadcrumbs

- `.planning/AUTH-MODEL.md` §10 (mocked/stubbed), §12 (target units + net-new mechanisms).
- `.planning/PROJECT.md` — Out of Scope (production persistence, real RBAC, real federation/VC + key
  distribution, real transport) = the exact list this seed reverses.
- `.planning/spikes/` 001–009 — validated mechanisms to productionize; `spike-findings-janus-2.0`.
- `backend/src/` — the Rust/Rocket + Postgres substrate to build on.
- Index of all seeds: [[SEED-001]]…[[SEED-010]] (forms 001/002/007; requirements 003/005/006/008/009/010;
  properties 004).

## Notes

Captured 2026-05-22. The capstone transition seed. Grounded in AUTH-MODEL §10/§12 + PROJECT Out of
Scope. Not actionable until v2.0 demo is validated — then it's the assembly point for scoping the real
build. v2 itself stays in-memory/mock by design.
