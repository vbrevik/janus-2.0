# Requirements: Janus 2.0 — v2.0 Authorization Hub (demo)

**Defined:** 2026-05-21
**Core Value:** Multiple entities can discover and exchange authorization information without exposing details, with every access decision computed live from attributes and fully explainable/auditable — proving the federated ABAC model (and its 6-unit deployment scenario) before a real build.

> DEMO / MOCK milestone. Mechanisms are validated by spikes 001–009. This milestone composes them into one
> coherent demo app instantiating the 6-unit scenario (AUTH-MODEL.md §12). Externals are simulated.
> "User" = a viewer interacting with the demo.

## v2.0 Requirements

### Foundation & Data Model

- [ ] **MODEL-01**: A unified mock "world" data model treats the 6 units (2 military, intelligence, inventory/infrastructure, industry, home guard) as the canonical entities, with subjects, resources (incl. shielding fields), and an append-only event log
- [ ] **MODEL-02**: One shared in-memory world-state store is the single source of truth across all demo views (useReducer; no new library)
- [ ] **MODEL-03**: A persistent `[DEMO / MOCK]` banner is visible on every screen and every simulated/external trust signal is labelled `[MOCK]`

### ABAC Engine

- [ ] **ENGINE-01**: Viewer sees a live ALLOW/DENY decision computed from attributes with a per-rule explanation trace
- [ ] **ENGINE-02**: Per-domain tiers (computer/data/physical) evaluate independently from clearance (a tier failure is distinct from a clearance failure)
- [ ] **ENGINE-03**: Deny overrides (revoked / security hold) force DENY even when base rules pass, shown distinctly

### Federation

- [ ] **FED-01**: Viewer can discover via the hub which entities hold authz info about a subject, with no details exposed and an explicit "what the hub does NOT store" callout
- [x] **FED-02**: Inter-entity exchange runs over a typed contract; the viewer sees the message transcript (publish → discover → request → response)
- [x] **FED-03**: A requester's attributes ride in a signed credential the holder verifies before trusting; forged or untrusted-issuer credentials are rejected (labelled `[MOCK]`)
- [x] **FED-04**: Detail release is gated by the holder's own ABAC policy — discovery without disclosure (pointer visible, content withheld unless authorized)

### Operating Roles & Separation of Duties

- [ ] **ROLE-01**: Viewer can act as any of the 8 operating roles; the available actions change by role
- [ ] **ROLE-02**: Approver grants/revokes attributes, Manager can only request, Security Officer can place holds, and Admin/Sponsor/Subject hold no access-decision authority

### Audit

- [ ] **AUDIT-01**: The append-only event log is the system of record; current access is a materialized projection answering current-state queries in O(1)
- [ ] **AUDIT-02**: Viewer can reconstruct "who can access resource R as of time T" via a timeline, including the effect of revocations and holds

### Context & Policy

- [ ] **CTX-01**: Each entity has its own release policy; the same request can resolve differently depending on the holding entity
- [ ] **CTX-02**: A subunit deployed ABROAD triggers a support-obligation grant to obligated units; access turns OFF when it returns HOME (dynamic, not a stored grant)
- [ ] **CTX-03**: Directional shielding denies protected intel/industry data to non-allowlisted requesters even with standing access, while intel retains broad read-out (asymmetric)

### Demo Integration & Legibility

- [ ] **DEMO-01**: The validated mechanisms are composed into coherent views (Hub, Entity Console, Audit, Context/Policy) plus a shell — not isolated per-mechanism tabs
- [ ] **DEMO-02**: Cross-view consistency holds: an action in one view (e.g. an Approver grant) is reflected in the Audit view and leaves the hub index unchanged
- [ ] **DEMO-03**: Decision traces read as plain prose; a non-developer can narrate each mechanism from the screen without coaching (legibility gate)
- [ ] **DEMO-04**: The demo builds in production (`spikes`/demo entry registered in the Vite build), not only in dev

## Future / Stretch Requirements

Deferred — safe to cut under time pressure; the infrastructure supports them.

- **AUDIT-03**: Leak/anomaly indicator highlights non-allowlisted access to shielded industry (stock-info) data on the audit log
- **CTX-04**: Home Guard territorial scoping via a location/territory attribute
- **SCOPE-01**: Real data-level ownership scoping for the 3 scoped roles (Manager→team, Sponsor→org, Subject→self) — demo approximates with flat roles + a "simplified for demo" note

## Out of Scope

| Feature | Reason |
|---------|--------|
| Real backend RBAC / authorization enforcement (Rust/Rocket) | DEMO simulates it; production authz is a separate real build |
| Real identity federation / IdP / asymmetric verifiable credentials + key distribution | Demo uses mock HMAC + a mock key registry |
| Real inter-entity network transport | Simulated in-process via the typed contract |
| Production persistence / hardening / scale | Demo is in-memory/seeded |
| Promoting the demo into TanStack Router / app auth flow | Demo stays on an isolated dev/build entry; no `routeTree.gen.ts` changes |
| The v1.0 frontend-consolidation cleanup | Superseded by the pivot; archived in `.planning/archive/v1.0-frontend-consolidation/` |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| MODEL-01 | Phase 1 | Pending |
| MODEL-02 | Phase 1 | Pending |
| MODEL-03 | Phase 1 | Pending |
| ENGINE-01 | Phase 1 | Pending |
| ENGINE-02 | Phase 1 | Pending |
| ENGINE-03 | Phase 1 | Pending |
| ROLE-01 | Phase 1 | Pending |
| ROLE-02 | Phase 1 | Pending |
| FED-01 | Phase 2 | Pending |
| FED-02 | Phase 2 | Complete |
| FED-03 | Phase 2 | Complete |
| FED-04 | Phase 2 | Complete |
| AUDIT-01 | Phase 3 | Pending |
| AUDIT-02 | Phase 3 | Pending |
| CTX-01 | Phase 3 | Pending |
| CTX-02 | Phase 3 | Pending |
| CTX-03 | Phase 3 | Pending |
| DEMO-01 | Phase 4 | Pending |
| DEMO-02 | Phase 4 | Pending |
| DEMO-03 | Phase 4 | Pending |
| DEMO-04 | Phase 4 | Pending |

---
*Requirements defined: 2026-05-21 for milestone v2.0 Authorization Hub (demo)*
