# Janus 2.0

## What This Is

Janus 2.0 is a **completed DEMO / MOCK of a federated authorization-exchange hub**. It instantiates a
6-unit deployment scenario (2 military, intelligence, infrastructure, industry, home guard) where multiple
entities share *authorization* information across three access domains — **computer, data, physical** —
without exposing the underlying details. Access decisions are **pure-computed ABAC** (attribute-based,
evaluated live, no stored grants), fully explainable and reconstructable from an append-only audit log.
**Clearance is determined externally** and consumed as a read-only attribute.

Three demo milestones are **shipped and archived** (v2.0 hub, v2.1 physical zones, v2.2 digital
resources), and the fullstack transition has begun: v2.2's Phase 11 put the digital-resource domain
on the real Rust/Rocket + PostgreSQL substrate with a parity-proven Rust resolver and hardened API.

The design contract is `.planning/AUTH-MODEL.md`; the model was validated end-to-end by 9 spikes
(`.planning/spikes/`, skill `spike-findings-janus-2.0`).

## Core Value

Multiple entities can **discover and exchange authorization information without exposing details**, with
every access decision **computed live from attributes** and **fully explainable and auditable** — the
federated ABAC model is proven. The next milestone transitions this from demo to real build.

## Current State

**Shipped:** v2.2 Platform, Network & Application Access (demo) — 2026-07-03 (Phases 9–12, audit tech_debt with all items resolved or accepted; 31/31 requirements). Adds the digital-resource access stack: a Network → Platform → Application hierarchy with data-driven, **time-versioned per-resource policies**, explicit per-tier grants with a prerequisite chain (no cross-tier inheritance), the advisory zone-prerequisite link back to v2.1, and delegation. **First milestone with a real backend slice:** 8 Postgres tables, the gate-chain resolver ported to Rust with byte-exact TS↔Rust golden-fixture parity, AuthGuard-protected read/issue endpoints (IDOR closed, SEC-01..04 hardening), a repaired migration chain (fresh DB migrates end-to-end), and Postgres as the single source of truth for the digital-resource dataset. Demo UI: 7th "Digital Resources" tab with Resource Browser, Access Resolution Explorer, six-state loader, and admin-gated issuing forms — live-UAT'd 13/13.

See `.planning/MILESTONES.md` and `.planning/milestones/v2.2-*` for the archived record. Prior milestones: v2.0 (2026-05-22), v2.1 (2026-05-23).

## Next Milestone

Not yet started — run `/gsd-new-milestone`. The pre-registered candidate is **v2.3 Dataset Access** (see Planned below and `.planning/milestones/v2.3-REQUIREMENTS.md` placeholder).

<details>
<summary>v2.2 goal (shipped 2026-07-03)</summary>

**Goal:** Extend the demo with a digital-resource access model — Network → Platform → Application hierarchy, classification tiers, multi-org ownership, per-resource grants with a prerequisite tier chain, zone-prerequisite link, and delegation.

- Digital resource hierarchy: Network → Platform → Application (strict tree, no multi-homing)
- Application inherits its Platform's classification (no independent classification field)
- Multi-org ownership via time-windowed role-tagged `org_links` (open role vocab)
- Data-driven, time-versioned per-resource policies; point-in-time resolution
- Explainable gate-chain trace labeled with the applied policy version; advisory (non-blocking) zone prerequisite
- Delegation by active ADMIN-role orgs; 6-unit mock dataset; Resource Browser + Access Resolution Explorer demo views
- Scope expanded mid-milestone: Phase 11 added the real backend slice (8 tables, Rust resolver port with golden-fixture parity, AuthGuard/issue API, SEC-01..04) — the first departure from demo-only

</details>

<details>
<summary>v2.1 goal (shipped)</summary>

**Goal:** Extend the v2.0 mock demo with a rich, NSM-grounded physical access model — hierarchical named zones, per-zone authorizations, time-limited grants with inheritance, dual org ownership, delegation, escort tracking, and entry audit logs.

- Zone hierarchy: Site → Building → Room; each node has `zone_type` (CONTROLLED / RESTRICTED / SECURED)
- 5-tier clearance ladder: `UNCLASSIFIED → RESTRICTED → CONFIDENTIAL → SECRET → TOP_SECRET`
- NSM-grounded access rules per zone type (SEED-003): CONTROLLED = authz only; RESTRICTED = clearance req or escorted; SECURED = SECRET+ + explicit auth + entry logged or escorted + logged
- Per-zone grants with independent `valid_from`/`valid_until`; parent grant inherits to children
- Dual org ownership: `admin_org` (controls/delegates) + `asset_owner_org` (owns protected assets)
- Delegation: admin org can delegate access-granting authority to a named person OR another org
- `ZoneEntryLog`: method (CARD/ESCORT), escort person ref, timestamps; mandatory for SECURED zones
- Rich mock dataset + demo UI tab for interactive exploration

**Scope constraint:** Demo/mock only — Rust/PostgreSQL backend defers to a later milestone.

</details>

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

### Validated (v2.1)

- [x] Zone hierarchy model: Site → Building → Room with zone_type enum — Validated in Phase 5
- [x] 5-tier clearance ladder replacing 4-tier (adds RESTRICTED between UNCLASSIFIED and CONFIDENTIAL) — Validated in Phase 5
- [x] NSM-grounded zone access rules: CONTROLLED / RESTRICTED / SECURED with clearance + escort policies — Validated in Phase 5
- [x] Per-zone PhysicalAccessGrant with valid_from/valid_until; inheritance (parent covers children) — Validated in Phase 6
- [x] Dual org ownership: admin_org + asset_owner_org per zone — Validated in Phase 5
- [x] Delegation: admin org → named person or org; delegates can grant access — Validated in Phase 6
- [x] ZoneEntryLog with method (CARD/ESCORT), escort person ref, entry/exit timestamps — Validated in Phase 7
- [x] ZoneVisitorPass linked to escort entries with time-bounded validity — Validated in Phase 7
- [x] Rich mock dataset instantiating the 6-unit scenario with zones, grants, entry log — Validated in Phase 8
- [x] Demo UI tab: zone browser + access resolution explorer + entry log — Validated in Phase 8

### Validated (v2.2)

- [x] Digital-resource hierarchy + data-driven, time-versioned per-resource policies (RSRC, RSRC-POLICY-01..05) — Validated in Phase 9
- [x] Gate-chain access resolution: explainable trace, no cross-tier inheritance, advisory zone prerequisite, policy-version label (RSRC-ACCESS-01..05) — Validated in Phase 9
- [x] Per-tier time-windowed grants + ADMIN-org delegation (RSRC-GRANT-01..03, RSRC-DELEG-01; server-side enforcement is role-based Option B, org-based model → SEED-012) — Validated in Phases 9/11
- [x] 6-unit mock dataset with policy-shift, non-baseline policy, zone-prereq, temporal grant variety (RSRC-SEED-01..07) — Validated in Phases 9/10
- [x] Backend slice: 8-table Postgres domain, Rust resolver port with byte-exact TS parity, AuthGuard read + issue endpoints, repaired migration chain, Postgres as fixture source of truth, SEC-01..04 hardening (RSRC-BE-01..06, SEC-01..04) — Validated in Phase 11
- [x] Digital Resources demo tab: Resource Browser, Access Resolution Explorer, six-state loader, grant toggle, admin-gated issuing forms (RSRC-UI-01..06) — Validated in Phase 12 (live UAT 13/13)

Full archived record: `.planning/milestones/v2.2-REQUIREMENTS.md`.

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

- **v2.2 shipped (2026-07-03).** 4 phases · 17 plans · 31/31 requirements · 119 commits · 178 files (+20,334/−2,460) · 228/228 Vitest · 0 TypeScript errors · full-crate `cargo test` green (fixed at close) · TS↔Rust resolver parity byte-exact.
- **Cumulative:** v2.0 (2026-05-22, 21/21 reqs) → v2.1 (2026-05-23, 38/38 reqs) → v2.2. Every mechanism validated: ABAC engine, pointer hub, signed credentials, audit reconstruction, policy divergence, physical zones, digital-resource policy engine.
- **Fullstack transition has begun.** Phase 11 was the first real backend build (Postgres persistence + Rust resolver + hardened API). SEED-011 (`demo-to-fullstack-transition`) captures the broader strategy; SEED-012 holds the deferred org-based issue-authorization model.
- **Brownfield substrate.** Tech-debt inventory in `.planning/TECH-DEBT-SCAN.md` (superseded `.planning/codebase/`). Known open item: non-admin login redirect bug (`.planning/todos/pending/`).

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
| v2.2: Application inherits its Platform's classification | Simpler model; an app's grade is bounded by the platform it runs on — no independent ATO-per-app in demo scope | ✓ Validated (Phase 9 tests; "(inherited)" badge live in Phase 12) |
| v2.2: zone-prerequisite link is advisory, not a hard gate | Lighter cross-domain coupling; the prereq surfaces in the resolution trace as a warning rather than forcing DENY | ✓ Validated — but the advisory row shipped as dead code (hardcoded empty zone array) and was only caught by live UAT; fixed in 12-07 |
| v2.2: access rules are data-driven per-resource policies, not a hardcoded chain | User need: rules/roles differ by platform/application; reuses v2.0 proven per-entity policy divergence | ✓ Validated (baseline vs non-baseline policies live) |
| v2.2: policies are time-versioned & mutable (valid_from/until); roles+gates are open vocab | User need: must be flexible, shift to new values over time; resolution is point-in-time (reuses v2.0 audit reconstruction). In-app authoring deferred — v2.2 ships seed data | ✓ Validated (MilNet policy-shift boundary, TS+Rust parity) |
| v2.2: multi-org per resource via role-tagged time-windowed org_links list | User need: up to ~5 orgs now, more later; generalizes v2.1 dual-org into an extensible list | ✓ Validated (18 org_links across 6 canonical units) |
| v2.2: Phase 11 scope expansion — real backend slice (Postgres + Rust resolver + hardened API) | Migration chain was already broken and security holes were live; sharing the trust boundary made backend work unavoidable | ✓ Shipped — first fullstack milestone slice; parity byte-exact |
| v2.2: server-side issue authz = flat role gate (Option B), not org-based delegate authority | No person→org linkage exists in the schema; Option A is a data-model build, not a code change. Closes the confirmed IDOR minimally | ⚠️ Revisit — deferred to SEED-012; "defer features, not enforcement" lesson recorded in retrospective |

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
*Last updated: 2026-07-03 after v2.2 milestone*
