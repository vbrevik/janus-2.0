# Janus 2.0

## What This Is

Janus 2.0 is a **completed DEMO / MOCK of a federated authorization-exchange hub**. It instantiates a
6-unit deployment scenario (2 military, intelligence, infrastructure, industry, home guard) where multiple
entities share *authorization* information across three access domains — **computer, data, physical** —
without exposing the underlying details. Access decisions are **pure-computed ABAC** (attribute-based,
evaluated live, no stored grants), fully explainable and reconstructable from an append-only audit log.
**Clearance is determined externally** and consumed as a read-only attribute.

The v2.0 demo is **shipped and archived**. The codebase substrate (Rust/Rocket + PostgreSQL backend,
React + TanStack SPA) is the foundation for the next build phase — transitioning from demo-mock to
production-grade fullstack authorization management.

The design contract is `.planning/AUTH-MODEL.md`; the model was validated end-to-end by 9 spikes
(`.planning/spikes/`, skill `spike-findings-janus-2.0`).

## Core Value

Multiple entities can **discover and exchange authorization information without exposing details**, with
every access decision **computed live from attributes** and **fully explainable and auditable** — the
federated ABAC model is proven. The next milestone transitions this from demo to real build.

## Current Milestone: v2.1 Physical Access Zones (demo)

**Goal:** Extend the v2.0 mock demo with a rich, NSM-grounded physical access model — hierarchical named zones, per-zone authorizations, time-limited grants with inheritance, dual org ownership, delegation, escort tracking, and entry audit logs.

**Target features:**
- Zone hierarchy: Site → Building → Room; each node has `zone_type` (CONTROLLED / RESTRICTED / SECURED)
- 5-tier clearance ladder: `UNCLASSIFIED → RESTRICTED → CONFIDENTIAL → SECRET → TOP_SECRET`
- NSM-grounded access rules per zone type (SEED-003): CONTROLLED = authz only; RESTRICTED = clearance req or escorted; SECURED = SECRET+ + explicit auth + entry logged or escorted + logged
- Per-zone grants with independent `valid_from`/`valid_until`; parent grant inherits to children; narrower child grant can further restrict
- Dual org ownership: `admin_org` (controls/delegates) + `asset_owner_org` (owns protected assets)
- Delegation: admin org can delegate access-granting authority to a named person OR another org
- `ZoneEntryLog`: method (CARD/ESCORT), escort person ref, timestamps; mandatory for SECURED zones
- Rich mock dataset demonstrating the full model + demo UI tab for interactive exploration

**Scope constraint:** Demo/mock only — Rust/PostgreSQL backend defers to a later milestone.

## Requirements

### Validated (v2.0)

- ✓ Pure-computed ABAC engine: per-domain tiers, deny overrides, explainable per-rule traces — v2.0 (Phase 1)
- ✓ Pointer-only discovery hub — "who knows what" without details — v2.0 (Phase 2)
- ✓ Inter-entity handshake — holder-gated detail release — v2.0 (Phase 2)
- ✓ Typed interchange contract between entities — v2.0 (Phase 2)
- ✓ Signed/verified attribute credentials — verify before trust — v2.0 (Phase 2)
- ✓ Audit reconstruction — append-only log, O(1) projection, point-in-time access — v2.0 (Phase 3)
- ✓ Per-entity policy divergence — same request, different outcomes — v2.0 (Phase 3)
- ✓ Context access — deployment-driven support obligations + directional shielding — v2.0 (Phase 3)
- ✓ Operating roles & separation of duties — 8 roles — v2.0 (Phase 1)
- ✓ Coherent demo shell — 5 tabs, shared world-state, plain-prose traces, production build — v2.0 (Phase 4)
- ✓ Existing substrate: JWT auth, Person/Org/InfoSystem CRUD, access grants, audit log, WebSocket, React/Vite/shadcn frontend

### Active (v2.1)

- [ ] Zone hierarchy model: Site → Building → Room with zone_type enum
- [ ] 5-tier clearance ladder replacing 4-tier (adds RESTRICTED between UNCLASSIFIED and CONFIDENTIAL)
- [ ] NSM-grounded zone access rules: CONTROLLED / RESTRICTED / SECURED with clearance + escort policies
- [ ] Per-zone PhysicalAccessGrant with valid_from/valid_until; inheritance (parent covers children)
- [ ] Dual org ownership: admin_org + asset_owner_org per zone
- [ ] Delegation: admin org → named person or org; delegates can grant access
- [ ] ZoneEntryLog with method (CARD/ESCORT), escort person ref, entry/exit timestamps
- [ ] Rich mock dataset instantiating the 6-unit scenario with zones, grants, entry log
- [ ] Demo UI tab: zone browser + access resolution explorer + entry log

### Planned: v2.2 Platform, Network & Application Access (demo)

**Goal:** Extend the demo with an access model for the full digital resource stack — classified networks, the platforms running on them, and the applications deployed on those platforms. Pre-registered as a capture target for digital-access topics that emerge during v2.1 physical zone work.

**Planned scope:**
- Digital resource hierarchy: Network → Platform → Application
- Network classification tiers (National Restricted, Tactical Secure, NATO Restricted/Secret, etc.)
- Clearance + authorization required per resource tier
- Admin org + asset owner org per resource (mirrors v2.1 zone model)
- Time-limited access grants per resource
- Physical zone ↔ network/platform prerequisite link (being in a zone may be required to access a network)
- Mock dataset + demo UI (carries v2.1 patterns)
- SEED-009 activated (info-system security requirements: NSM §6, approval-to-operate, adequate security level)

**Seeds:** SEED-009 active · Demo/mock only (backend defers to later milestone)

### Planned: v2.3 Dataset Access (demo)

**Goal:** Establish fine-grained authorization for named datasets within applications — the innermost access layer. Application access (v2.2) does not grant access to everything inside; each dataset (mailbox, archive role, document site) requires its own authorization with its own access level vocabulary.

**Planned scope:**
- Dataset model: named authorizable resource within an application (`MAILBOX` / `ARCHIVE_ROLE` / `DOCUMENT_SITE` types)
- Access levels per type: Mailbox (READ/SEND_AS/FULL_ACCESS), Archive (READER/CASE_HANDLER/ADMIN), Document site (READ/CONTRIBUTE/FULL_CONTROL)
- Active Application grant is prerequisite for any dataset grant (carries forward from v2.2)
- Admin org + asset owner org per dataset; delegation mirrors v2.1/v2.2 pattern
- Time-limited `DatasetAccessGrant` with effective level = highest active grant
- Mock dataset + demo UI showing prerequisite chain and denied-access cases

**Seeds:** None yet · Demo/mock only (backend defers to later milestone)

### Future milestones

- [ ] Demo → fullstack: wire ABAC engine into the Rust/Rocket backend (real enforcement, not mock)
- [ ] Physical access zones → real Rust/PostgreSQL backend (backend deferred from v2.1)
- [ ] Platform/network/application access → real backend (backend deferred from v2.2)
- [ ] Real data-level ownership scoping for 3 scoped roles (Manager→team, Sponsor→org, Subject→self)
- [ ] Leak/anomaly indicator for shielded industry data (AUDIT-03)
- [ ] Home Guard territorial scoping via location/territory attribute (CTX-04)
- [ ] POB form engine and NSM personnel-security forms (SEED-001–010)
- [ ] NDA lifecycle tied to real authorization grants

### Out of Scope

- **Real identity federation / IdP / asymmetric verifiable credentials + key distribution** — demo used mock HMAC; production needs a real decision
- **Real inter-entity network transport** — simulated in-process; architecture decision needed for production
- **The abandoned v1.0 frontend-consolidation cleanup** (GUARD/ROUTE/TEST/CLEAN) — superseded by the pivot; archived in `.planning/archive/v1.0-frontend-consolidation/`

## Context

- **v2.0 shipped (2026-05-22).** 4 phases · 16 plans · 21/21 requirements · ~4,779 LOC TypeScript demo code · 80/80 Vitest · 0 TypeScript errors · production build clean.
- **Proven model.** Every mechanism validated: ABAC engine, pointer hub, typed contract, signed credentials, audit reconstruction, policy divergence, contextual obligations, directional shielding.
- **Next direction.** SEED-011 (`demo-to-fullstack-transition`) captures the transition strategy. The demo is the spec; the substrate backend is the build target.
- **Brownfield substrate.** Codebase map in `.planning/codebase/`. Existing Rust/React app is the base.

## Constraints

- **Stack** — React 19 + TanStack + Vite + Tailwind + shadcn/ui (frontend); Rust 1.87 + Rocket + sqlx/Postgres (backend substrate). Match existing patterns; no new frameworks.
- **Pure-computed ABAC** — no stored grants; audit log is the system of record.
- **Demo stays isolated** — spike code in `frontend/src/spikes/`; demo in `frontend/src/demo/`; no `routeTree.gen.ts` changes until fullstack integration.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Pivot to a federated ABAC authorization-hub demo (v2.0) | Real-world need clarified: manage authorizations + exchange between entities, clearance external | ✓ Proven |
| DEMO/MOCK, not production | Prove the model and surface failure modes before a real build | ✓ Model validated in 2 days |
| Supersede incomplete v1.0 frontend-consolidation | The pivot replaces the direction entirely; old artifacts archived, not deleted | ✓ Done |
| Pure-computed ABAC + append-only audit log | No stored grants; explainable decisions; reconstructable access | ✓ Validated (spikes 001/007, Phase 1/3) |
| Discovery without disclosure (pointer hub + handshake) | Entities share *that* they hold info, not the details; release is policy-gated | ✓ Validated (spikes 002/003/005, Phase 2) |
| Verify-before-trust on signed credentials | Cross-entity ABAC must not trust self-asserted attributes | ✓ Validated (spike 006, Phase 2) |
| Demo island isolation (`frontend/src/demo/`) | No `routeTree.gen.ts` changes; demo builds as separate Vite entry | ✓ Held throughout all 4 phases |
| 5-tab shell in Phase 4 (not 4-tab) | UnitConsolePanel extracted as standalone Entity Console tab for clarity | ✓ Passed legibility gate |
| Defer AUDIT-03, CTX-04, SCOPE-01 | Infrastructure supports them; not critical for model proof | → Active/next milestone |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-23 — Milestone v2.1 Physical Access Zones (demo) started*
