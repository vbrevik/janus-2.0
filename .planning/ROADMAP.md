# Roadmap: Janus 2.0 — Authorization Hub (demo)

## Overview

The demo is built in four phases. Phase 1 lays the data and engine foundation: a unified mock world-state,
a pure-computed ABAC engine, and the 8 operating roles — everything downstream views depend on.
Phase 2 builds the federation hub and entity consoles: discovery-without-disclosure, the typed interchange
contract, signed credentials, and holder-gated release. Phase 3 adds the audit and context/policy views:
the append-only log with point-in-time reconstruction, per-entity policy divergence, support-obligation
grants, and directional shielding. Phase 4 composes the four views into a coherent demo shell, validates
cross-view consistency, enforces the legibility gate, and registers the entry in the production build.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation** - Unified mock world-state, pure-computed ABAC engine, 8 operating roles, and persistent [DEMO/MOCK] banner
- [ ] **Phase 2: Federation Hub** - Discovery-without-disclosure hub, typed interchange contract, verified signed credentials, holder-gated release, and entity console views
- [ ] **Phase 3: Audit & Context** - Append-only event log with point-in-time reconstruction, per-entity policy divergence, support-obligation grants, and directional shielding
- [ ] **Phase 4: Demo Shell & Legibility** - Composed coherent shell, cross-view consistency, plain-prose decision traces, and production build registration

## Phase Details

### Phase 1: Foundation
**Goal**: The demo's shared world-state is live, the ABAC engine produces explainable decisions across all three domains, and role-based action availability is enforced — everything downstream views need
**Depends on**: Nothing (first phase)
**Requirements**: MODEL-01, MODEL-02, MODEL-03, ENGINE-01, ENGINE-02, ENGINE-03, ROLE-01, ROLE-02
**Success Criteria** (what must be TRUE):
  1. A `[DEMO / MOCK]` banner is visible and non-dismissable on every screen; every simulated trust signal is labelled `[MOCK]`
  2. Viewer can load the demo and see the 6 canonical units (2 military, intel, infra, industry, home guard) with their subjects and resources pre-seeded in a single shared in-memory world-state
  3. Viewer sees a live ALLOW/DENY decision for any subject/resource/domain triple, with a per-rule trace explaining which attribute passed or failed
  4. Viewer observes that a computer-tier failure and a clearance failure produce distinct explanations — domain tiers evaluate independently
  5. Viewer can switch to any of the 8 operating roles and observe that available actions change accordingly; Approver can grant/revoke attributes, Manager can only request, Security Officer can place holds
**Plans**: 4 plans
Plans:
- [ ] 01-01-PLAN.md — Isolated demo island entry (demo.html + main.tsx + placeholder DemoRoot + Vite build input) [MODEL-03]
- [ ] 01-02-PLAN.md — Frozen unified model + verbatim ABAC engine + rich 6-unit seed + ported tests [MODEL-01, ENGINE-01/02/03, ROLE-02]
- [ ] 01-03-PLAN.md — Single shared world-state store (useReducer + split-context + 6 actions, event-sourced) [MODEL-02]
- [ ] 01-04-PLAN.md — Persistent [DEMO/MOCK] chrome + role switcher + Decision Explorer + final DemoRoot [ROLE-01, ROLE-02, ENGINE-01/02/03, MODEL-03]
**UI hint**: yes

### Phase 2: Federation Hub
**Goal**: The hub shows which entities hold authorization info about a subject without exposing any details; typed-contract message exchange is traceable end-to-end; signed credentials are verified before trust; release is gated by holder policy
**Depends on**: Phase 1
**Requirements**: FED-01, FED-02, FED-03, FED-04
**Success Criteria** (what must be TRUE):
  1. Viewer can query the hub for a subject and see a pointer list (which entities hold info, in which domains) with an explicit callout of what the hub does NOT store
  2. Viewer can watch the full inter-entity message transcript — publish, discover, request, response — driven by the typed interchange contract
  3. Viewer sees that a request carrying a forged or untrusted-issuer credential is rejected and labelled `[MOCK]`; a valid signed credential passes verification and unlocks evaluation
  4. Viewer observes that a requester discovering a pointer cannot read the held details until the holder's own ABAC policy authorizes release
**Plans**: TBD
**UI hint**: yes

### Phase 3: Audit & Context
**Goal**: The audit log is the live system of record; point-in-time access reconstruction works; per-entity policy divergence is observable; deployment-driven support-obligation grants turn on and off; directional shielding blocks non-allowlisted access
**Depends on**: Phase 1
**Requirements**: AUDIT-01, AUDIT-02, CTX-01, CTX-02, CTX-03
**Success Criteria** (what must be TRUE):
  1. Viewer can see the append-only event log grow in real-time as actions are taken, and can query current access state without replaying every event (O(1) materialized projection)
  2. Viewer can reconstruct "who can access resource R as of time T" on a timeline, and observe that a revocation or hold applied at time T′ changes the answer for T′+ without altering prior entries
  3. Viewer can send the same request from two different entities and observe different outcomes driven by each entity's distinct release policy
  4. Viewer can toggle a subunit's deployment status from HOME to ABROAD and observe that support-obligation access turns on; toggling back to HOME turns it off — no stored grant is created
  5. Viewer can observe that a request for shielded intel or industry data from a non-allowlisted entity is denied even when that requester holds standing access, while an allowlisted entity succeeds
**Plans**: TBD
**UI hint**: yes

### Phase 4: Demo Shell & Legibility
**Goal**: The four views (Hub, Entity Console, Audit, Context/Policy) are composed into one coherent navigable shell; cross-view consistency is enforced; every decision trace reads as plain prose; the demo builds in production
**Depends on**: Phase 2, Phase 3
**Requirements**: DEMO-01, DEMO-02, DEMO-03, DEMO-04
**Success Criteria** (what must be TRUE):
  1. Viewer navigates a single shell with Hub, Entity Console, Audit, and Context/Policy as distinct views — no isolated per-mechanism tabs; all views share the same world-state
  2. Viewer performs an Approver attribute-grant in the Entity Console, then opens the Audit view and sees that event reflected there, while the hub pointer index remains unchanged
  3. A non-developer can read any decision trace on screen and narrate the mechanism — why access was allowed or denied — without coaching (legibility gate)
  4. Running the production build (`vite build`) succeeds and the demo entry is accessible in the built output
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

Note: Phase 3 depends on Phase 1 (not Phase 2) — Phases 2 and 3 may be planned in parallel, but
Phase 4 depends on both Phase 2 and Phase 3 completing.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 0/4 | Planned | - |
| 2. Federation Hub | 0/? | Not started | - |
| 3. Audit & Context | 0/? | Not started | - |
| 4. Demo Shell & Legibility | 0/? | Not started | - |
