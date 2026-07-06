# Janus 2.0

## What This Is

Janus 2.0 is a **completed DEMO / MOCK of a federated authorization-exchange hub**. It instantiates a
6-unit deployment scenario (2 military, intelligence, infrastructure, industry, home guard) where multiple
entities share *authorization* information across three access domains — **computer, data, physical** —
without exposing the underlying details. Access decisions are **pure-computed ABAC** (attribute-based,
evaluated live, no stored grants), fully explainable and reconstructable from an append-only audit log.
**Clearance is determined externally** and consumed as a read-only attribute.

Four demo milestones are **shipped and archived** (v2.0 hub, v2.1 physical zones, v2.2 digital
resources, v2.3 dataset access), and the fullstack transition has begun: v2.2's Phase 11 put the
digital-resource domain on the real Rust/Rocket + PostgreSQL substrate with a parity-proven Rust
resolver and hardened API.

The design contract is `.planning/AUTH-MODEL.md`; the model was validated end-to-end by 9 spikes
(`.planning/spikes/`, skill `spike-findings-janus-2.0`).

## Core Value

Multiple entities can **discover and exchange authorization information without exposing details**, with
every access decision **computed live from attributes** and **fully explainable and auditable** — the
federated ABAC model is proven. The next milestone transitions this from demo to real build.

## Current State

**Shipped:** v2.3 Dataset Access (demo) — 2026-07-06 (Phases 13–15, audit passed; 23/23 requirements). Adds the innermost access layer — fine-grained authorization for named datasets (`MAILBOX`/`ARCHIVE_ROLE`/`DOCUMENT_SITE`) nested within Applications, each with its own per-type level mechanism (ranked ladder or containment map). A standalone 3-gate `resolveDatasetAccess` resolver (clearance → Application-grant OR-gate → dataset-grant) adds an independent existence-visibility gate on top of the v2.2 access stack, plus delegate-capped issuing authority. Demo UI: new "Datasets" top-level tab with dataset-level Access Resolution Explorer (4-gate trace), reverse-lookup view, and an admin-gated issuing form — live-UAT'd, closing all 4 DATA-UI requirements. One accepted tech-debt item: the delegate-cap deny path is unit-tested but has no reachable UI path in the demo (documented, not a gap).

See `.planning/MILESTONES.md` and `.planning/milestones/v2.3-*` for the archived record. Prior milestones: v2.0 (2026-05-22), v2.1 (2026-05-23), v2.2 (2026-07-03).

## Current Milestone: Not yet started

No active milestone. Run `/gsd-new-milestone` to scope the next one — candidates already on record in Future Milestones below (demo→fullstack transition, physical/digital-resource backends, real data-level ownership scoping) and in the dormant seed backlog (`.planning/seeds/`, 12 items, see STATE.md Deferred Items).

<details>
<summary>v2.3 goal (shipped 2026-07-06)</summary>

**Goal:** Establish fine-grained authorization for named datasets within applications — the innermost access layer. Application access (v2.2) does not grant access to everything inside; each dataset (mailbox, archive role, document site) requires its own authorization with its own access level vocabulary.

- Dataset model: named authorizable resource within an Application (`MAILBOX` / `ARCHIVE_ROLE` / `DOCUMENT_SITE` types), spanning ≥1 Applications via OR-gated `application_ids`
- Access levels per type: Mailbox (READ/SEND_AS/FULL_ACCESS), Archive (READER/CASE_HANDLER/ADMIN containment map), Document site (READ/CONTRIBUTE/FULL_CONTROL)
- Active Application grant (v2.2) is a hard prerequisite for any dataset grant, enforced at resolution time
- Admin org + asset-owner org per dataset; delegation capped at the delegate's own held grant (not the dataset's max)
- Time-limited `DatasetAccessGrant` with effective level = highest active grant (or containment-union for ARCHIVE_ROLE)
- Mock dataset + demo UI showing prerequisite chain, denied-access cases, and a full deny-matrix

**Scope constraint:** Demo/mock only — backend deferred. Phase numbering continued from v2.2 (Phases 13–15).

</details>

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

### Validated (v2.3)

- [x] Dataset model: named authorizable resource within an Application, spanning ≥1 Applications via OR-gated `application_ids`; open `dataset_type` vocabulary (`MAILBOX`/`ARCHIVE_ROLE`/`DOCUMENT_SITE`) with per-type access-level mechanism — ranked ladder or containment map (DATA-01..05) — Validated in Phase 13
- [x] 3-gate access resolution (clearance → Application-grant prerequisite → DatasetAccessGrant), plus an independent existence-visibility gate — `visible` driven solely by the Application-grant gate, no admin_org/delegate exemption (DATA-ACCESS-01..04) — Validated in Phase 13
- [x] Time-windowed `DatasetAccessGrant` with effective-level union/highest-rank resolution; delegate authority capped at the delegate's own held grant (DATA-GRANT-01..03, DATA-DELEG-01) — Validated in Phase 13
- [x] Mock dataset demonstrating the prerequisite chain, denied-access cases, and a 3-scenario deny-matrix isolating each resolver gate (DATA-SEED-01..06) — Validated in Phase 14
- [x] Demo UI: dedicated "Datasets" tab (Application picker + Datasets list), dataset-level Access Resolution Explorer with full gate-chain trace, reverse-lookup ("who has access"), and an admin-gated issuing form — live-UAT'd, including a non-admin block and an issued-grant round trip (DATA-UI-01..04) — Validated in Phase 15

All 23/23 v2.3 requirements validated (`.planning/REQUIREMENTS.md` Traceability table). Phase 15 was the milestone's final phase.

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

- **v2.3 shipped (2026-07-06).** 3 phases · 9 plans · 23/23 requirements · 67 commits · 60 files (+9,531/−92) · 317/317 Vitest · 0 TypeScript errors · integration audit 12/12 wired, 0 orphans. Demo-only, no backend changes.
- **v2.2 shipped (2026-07-03).** 4 phases · 17 plans · 31/31 requirements · 119 commits · 178 files (+20,334/−2,460) · 228/228 Vitest · 0 TypeScript errors · full-crate `cargo test` green (fixed at close) · TS↔Rust resolver parity byte-exact.
- **Cumulative:** v2.0 (2026-05-22, 21/21 reqs) → v2.1 (2026-05-23, 38/38 reqs) → v2.2 (2026-07-03, 31/31 reqs) → v2.3 (2026-07-06, 23/23 reqs). Every mechanism validated: ABAC engine, pointer hub, signed credentials, audit reconstruction, policy divergence, physical zones, digital-resource policy engine, dataset-level access resolution.
- **Fullstack transition has begun, but v2.3 stayed demo-only.** Phase 11 (v2.2) was the first real backend build (Postgres persistence + Rust resolver + hardened API); v2.3's dataset model deliberately deferred its own backend port. SEED-011 (`demo-to-fullstack-transition`) captures the broader strategy; SEED-012 holds the deferred org-based issue-authorization model.
- **Brownfield substrate.** Tech-debt inventory in `.planning/TECH-DEBT-SCAN.md` (superseded `.planning/codebase/`). Known open item: non-admin login redirect bug (`.planning/todos/pending/`). New accepted item: `canIssueDatasetGrant`'s delegate-cap deny path (DATA-DELEG-01) has no reachable demo-UI path, unit-tested only — documented in `dataset-access-explorer.tsx` file header.

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
| v2.3: ARCHIVE_ROLE is a containment map, not a numeric rank | User explicitly wants a coverage model extensible to non-linear roles later, even though the 3-role vocabulary today produces the same chain as a linear order | ✓ Validated (Phase 13; live-confirmed at spec-phase, superseding the research-recommended rank-table default) |
| v2.3: delegate issuing authority capped at the delegate's own held grant, not the dataset's max | User flipped the research default — a delegate with no personal grant on the dataset can issue nothing; `admin_org` itself stays unrestricted | ✓ Validated (Phase 13; live-confirmed at spec-phase) |
| v2.3: dataset can span ≥1 Applications (OR-gated `application_ids`), not strictly 1:1 | User flipped the research default — shared-mailbox-across-clients is real scope, not deferred | ✓ Validated (Phase 13; live-confirmed at spec-phase) |
| v2.3: existence-visibility (`visible`) is an independent gate, driven solely by the Application-grant check | New requirement surfaced during spec-phase: datasets with no Application-level relationship shouldn't appear to exist at all, not merely read-denied. No admin_org/delegate exemption | ✓ Validated (Phase 13) |
| v2.3: "Datasets" shipped as a new top-level tab, not nested inside the existing Digital Resources tab | ROADMAP wording implied nesting, but 15-SPEC.md explicitly reasoned through and locked the separate-tab interpretation before code was written | ✓ Validated (Phase 15) — not a silent deviation, resolved at spec-phase |
| v2.3: delegate-cap deny path (DATA-DELEG-01) left unreachable via the demo UI, proven only by unit tests | The demo's only actor is always `admin_org`-equivalent; building a second non-admin-delegate persona was out of scope for this milestone | ⚠️ Accepted — documented as a known limitation in `dataset-access-explorer.tsx`'s file header, not a silent gap |

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
*Last updated: 2026-07-06 after v2.3 milestone (Dataset Access, shipped) — full evolution review complete*
