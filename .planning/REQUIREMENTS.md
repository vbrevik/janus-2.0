# Requirements — v2.2 Platform, Network & Application Access (demo)

**Milestone:** v2.2 (ACTIVE)
**Scope:** Demo/mock only — all data is in-memory TypeScript under `frontend/src/demo/`. No Rust/PostgreSQL backend, no `routeTree.gen.ts` changes (separate Vite demo entry).
**Grounding:** SEED-009 (NSM §6 info-system security — classification, sikkerhetsgodkjenning/approval-to-operate, forsvarlig sikkerhetsnivå). Mirrors and generalizes the v2.1 physical-zone model.

**Key decisions:**

- Application **inherits** its host Platform's classification (no independent field).
- Zone-prerequisite link is **advisory** — surfaced in the resolution trace as a non-blocking amber warning, never affects ALLOW/DENY.
- Access rules are **data-driven, per-resource policies** (not a hardcoded chain). Different resources/tiers may carry different policies. (Mirrors v2.0 per-entity policy divergence.)
- Policies are **time-versioned and mutable** — a resource's policy can shift to new values over time; each policy assignment carries `valid_from`/`valid_until`. Resolution evaluates the policy active at the evaluation timestamp (point-in-time, mirrors v2.0 audit reconstruction).
- Org-role and gate/rule-type vocabularies are **open and extensible** — new values added via data without code changes. v2.2 seeds a baseline set.

---

## Milestone v2.2 Requirements

### Digital Resource Model (RSRC)

- [x] **RSRC-01**: Digital resources are organized in a 3-tier hierarchy: **Network → Platform → Application**.
- [x] **RSRC-02**: Network and Platform each carry a classification from the 5-tier ladder (`UNCLASSIFIED → RESTRICTED → CONFIDENTIAL → SECRET → TOP_SECRET`). An **Application has no classification field** — it inherits its host Platform's, derived at resolution and display time.
- [x] **RSRC-03**: Network classification examples (indicative): National Restricted (`RESTRICTED`), National Secret (`SECRET`), Tactical Secure (`SECRET`), NATO Restricted (`RESTRICTED`), NATO Secret (`SECRET`), NATO Top Secret (`TOP_SECRET`).
- [x] **RSRC-04**: Each resource carries a list of org links `org_links: [{ org_id, role, valid_from, valid_until }]` (1–N, demo seeds up to ~5). `role` is an **open string vocabulary**; v2.2 seeds `ADMIN` (controls/delegates) · `ASSET_OWNER` (owns) · `OPERATOR` (runs/maintains) · `SECURITY_APPROVAL` (authorizing authority, ties to the NSM sikkerhetsgodkjenning badge). At least one active `ADMIN` link is required; a role may repeat (e.g. two operators); links are time-windowed.
- [x] **RSRC-05**: Strict tree — a Platform belongs to exactly one Network; an Application belongs to exactly one Platform. No multi-homing in demo scope.

### Access Policy (RSRC-POLICY)

- [x] **RSRC-POLICY-01**: A resource's access rules are defined by a data-driven `ResourcePolicy` — not hardcoded. A policy specifies: the clearance requirement (default: derive from the resource's classification), which org-role authorizations are required, the ordered gate sequence, the prerequisite-tier requirement, and whether a zone prerequisite is advisory. Rules are values, not code branches.
- [x] **RSRC-POLICY-02**: Policies are **time-versioned**. A resource carries policy assignments each with `valid_from`/`valid_until` (nullable `valid_until` = open/current). Resolution selects the single policy whose validity window contains the evaluation timestamp.
- [x] **RSRC-POLICY-03**: A resource's policy can **shift to a new value over time** (policy A expires, policy B takes effect). Point-in-time resolution reproduces the decision under whichever policy was active at the chosen timestamp.
- [x] **RSRC-POLICY-04**: Org-role and gate/rule-type vocabularies are **open and extensible** — new roles or rule types can be introduced as data without code changes. v2.2 seeds the baseline (4 roles above; gates = clearance + own-tier explicit grant + parent-tier prerequisite + advisory zone).
- [x] **RSRC-POLICY-05**: Different resources — and different tiers — may carry **different policies**. Network, Platform, Application, and individual instances need not share the same rule set.

### Access Rules (RSRC-ACCESS)

- [x] **RSRC-ACCESS-01**: Access resolution evaluates the resource's **active policy** (per RSRC-POLICY-02) against the subject and the evaluation timestamp to produce ALLOW/DENY.
- [x] **RSRC-ACCESS-02**: The **seeded baseline policy** applies, in order: (1) clearance ≥ resource classification, (2) active explicit own-tier authorization, (3) active parent-tier prerequisite grant (Platform needs Network; Application needs Platform). Networks have no parent gate.
- [x] **RSRC-ACCESS-03**: Under the baseline policy there is **no cross-tier inheritance** — a Network grant does NOT confer Platform access; a Platform grant does NOT confer Application access. Each tier requires its own explicit authorization. (The trace states this at each gate.)
- [x] **RSRC-ACCESS-04**: A resource policy may declare a **zone prerequisite** (the room/building housing its terminal). The zone check is **advisory** — computed and shown in the trace but never changes ALLOW/DENY.
- [x] **RSRC-ACCESS-05**: Resolution produces an **explainable trace**: each gate's pass/fail with reason, the advisory zone result as a separate non-gating entry, and which policy version (and its validity window) was applied.

### Access Grants (RSRC-GRANT)

- [x] **RSRC-GRANT-01**: A `ResourceAccessGrant` links a person to a specific resource (Network, Platform, or Application) with `valid_from` and `valid_until` (nullable `valid_until` = permanent).
- [x] **RSRC-GRANT-02**: Grant active-window evaluation matches the v2.1 convention (inclusive boundary semantics consistent with `isGrantActive`); expired and future-dated grants do not satisfy a gate.
- [x] **RSRC-GRANT-03**: Time-limited grants model real-world temporary access (e.g. external contractor on National Restricted for 30 days).

### Delegation (RSRC-DELEG)

- [x] **RSRC-DELEG-01**: An org holding an active `ADMIN` org-link on a resource can delegate that resource's access-granting authority to a named person OR another org, time-bounded — mirrors v2.1 `ZoneAccessDelegate`. Only `ADMIN`-role orgs may delegate.

### Mock Dataset (RSRC-SEED)

- [x] **RSRC-SEED-01**: Dataset defines ≥3 Networks with realistic classification tiers from the 6-unit scenario.
- [x] **RSRC-SEED-02**: Dataset includes Platforms (terminals, servers, workstations) hosted on those networks.
- [x] **RSRC-SEED-03**: Dataset includes Applications hosted on those platforms.
- [x] **RSRC-SEED-04**: At least one Platform carries a zone prerequisite pointing to an existing v2.1 zone, so the advisory zone row is exercised (not dormant).
- [x] **RSRC-SEED-05**: Grants include active, expired, and future-dated examples across all three resource tiers.
- [x] **RSRC-SEED-06**: At least one resource demonstrates a **policy shift over time** — two policy assignments with adjacent validity windows — so point-in-time resolution at different timestamps yields different rules.
- [x] **RSRC-SEED-07**: At least one resource carries a **non-baseline policy** (e.g. an extra required org-role authorization or a different gate set) to exercise per-resource variation.

### Digital Resource Backend (RSRC-BE) — Phase 11

*Added 2026-06-19 when the original Phase 11 was expanded to a full-stack vertical and split into a backend phase (11) + a UI phase (12).*

- [x] **RSRC-BE-01**: A new backend digital-resource domain persists all 8 entities (networks, platforms, applications, org_links, resource_policies, policy_assignments, resource_access_grants, resource_access_delegates) via migration + sqlx models + Rocket handlers, mirroring the `model.ts` shapes; Application carries **no** classification column (derived from Platform).
- [x] **RSRC-BE-02**: The full gate-chain resolver is ported to Rust with parity to the TS `resolveResourceAccess` (clearance + own-tier grant + parent-tier prerequisite + advisory zone + time-versioned policy selection), taking an explicit evaluation timestamp; a parity test covers the inclusive policy-window boundary and the no-policy fail-closed `NO_ACTIVE_POLICY` DENY.
- [x] **RSRC-BE-03**: AuthGuard-protected GET endpoints expose the hierarchy plus policies, grants, and delegates; unauthenticated requests are rejected.
- [x] **RSRC-BE-04**: POST issue endpoints persist a new resource grant/delegate only after the ported Rust `canIssueResourceGrant` re-validates issuing authority server-side; 403 for non-ADMIN/no-delegate, expired-delegate, and out-of-window-delegate actors; duplicate issue creates no duplicate row.
- [x] **RSRC-BE-05**: The `seed.ts` digital-resource fixtures are loaded into Postgres as the single source of truth; `seedWorld()` no longer hardcodes the digital-resource arrays.
- [x] **RSRC-BE-06**: The broken migration chain is repaired so a freshly-created empty database migrates end-to-end with zero errors; the repair must not break the live dev DB. *(Added 2026-06-19 via discuss-phase — prerequisite to the 8-table create; supersedes the prior additive-only constraint.)*

### Security Hardening (SEC) — Phase 11

*Added 2026-06-23. Folded in from the cancelled Phase 13 after the codebase remap (`.planning/codebase/CONCERNS.md`) surfaced live server-side security holes. Scoped into Phase 11 because they share the backend trust boundary with RSRC-BE-04 and touch `rocket_setup.rs`, which Phase 11 already modifies for migration repair.*

- [x] **SEC-01**: Every backend handler across every domain is `AuthGuard`-protected; `messaging` and `vendor_relations` (currently unauthenticated) gain it. No endpoint except login is reachable without a valid Bearer JWT.
- [x] **SEC-02**: Every write/mutation handler and every sensitive read (audit) gates via `role_has_permission(&auth.claims.role, "<domain>.<action>")`; the required permission keys are seeded; an authenticated actor whose role lacks the permission gets **403** (not 500).
- [x] **SEC-03**: The hardcoded JWT-secret fallback (`rocket_setup.rs:22-23`) is removed; backend startup aborts before serving when `JWT_SECRET` is unset or empty; tests, `docker-compose.dev`, and `.env` supply it explicitly.
- [x] **SEC-04**: `CORS AllowedOrigins::all()` is replaced with `http://localhost:15510` (dev frontend); credentials remain allowed; a disallowed Origin is not granted CORS access.

### Demo UI (RSRC-UI) — Phase 12

- [ ] **RSRC-UI-01**: A Resource Browser renders the Network → Platform → Application hierarchy with classification badges (Application badge shown as inherited).
- [ ] **RSRC-UI-02**: Selecting a resource shows its org links grouped by role (ADMIN / ASSET_OWNER / OPERATOR / SECURITY_APPROVAL / …), classification, the active policy summary, active grants, and delegates. Platform detail shows NSM grounding badges (sikkerhetsgodkjenning / forsvarlig sikkerhetsnivå) as **static annotations**, not gates; the SECURITY_APPROVAL org names the authorizing authority behind the badge.
- [ ] **RSRC-UI-03**: An Access Resolution Explorer: select person + resource + **evaluation timestamp** (default "now"), compute ALLOW/DENY with the full gate-chain trace, the amber non-blocking zone advisory row, and a label for which policy version was applied. Changing the timestamp across a policy-shift boundary visibly changes the applied rules.
- [x] **RSRC-UI-04**: A hybrid loader fetches digital-resource data from the Phase 11 API on demo mount and populates `WorldState.digitalResources`; an unreachable API surfaces an explicit error/empty state (no silent stale fallback).
- [ ] **RSRC-UI-05**: A grant enable/disable toggle (`TOGGLE_RESOURCE_GRANT`) is interactive; disabling the grant behind an ALLOW flips the verdict to DENY and re-enabling restores it.
- [ ] **RSRC-UI-06**: Delegation-issuing forms issue a grant/delegate via the Phase 11 POST endpoints (backend persist) then update `WorldState`; controls are gated by the can-issue check and a server 403 surfaces inline.

---

## Future Requirements (deferred from v2.2)

- Rust/PostgreSQL backend implementation of the resource hierarchy, grants, policies, and delegation
- Real network/platform integration (actual network segments, AD/LDAP)
- Approval-to-operate (sikkerhetsgodkjenning) lifecycle for platforms as an *enforced* gate (NSM §6-3)
- Adequate-security-level assessment (forsvarlig sikkerhetsnivå) as an *enforced* gate (NSM §6-2)
- Independent per-Application classification (if a real build needs ATO-per-app)
- Policy authoring UI (creating/editing policies in-app); v2.2 policies are seeded data only

## Out of Scope (v2.2)

- **Backend implementation** — all data is mock/in-memory TypeScript
- **Real network topology** — simulated in mock data
- **Multi-homing** — a Platform on multiple Networks; strict tree only (RSRC-05)
- **Approval-to-operate / adequate-security-level as access gates** — static Platform badges only
- **Physical hardware inventory** — Platforms are logical records, not hardware management
- **Independent Application classification** — Applications inherit from Platform
- **Content / dataset-level access** — the innermost layer (mailbox/archive/doc-site) is the planned **v2.3 Dataset Access** milestone, not v2.2
- **In-app policy authoring** — policies are mutable/time-versioned in the data model, but v2.2 ships them as seed data; an editing UI is deferred

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| RSRC-01 | Phase 9 | Complete |
| RSRC-02 | Phase 9 | Complete |
| RSRC-03 | Phase 9 | Complete |
| RSRC-04 | Phase 9 | Complete |
| RSRC-05 | Phase 9 | Complete |
| RSRC-POLICY-01 | Phase 9 | Complete |
| RSRC-POLICY-02 | Phase 9 | Complete |
| RSRC-POLICY-03 | Phase 9 | Complete |
| RSRC-POLICY-04 | Phase 9 | Complete |
| RSRC-POLICY-05 | Phase 9 | Complete |
| RSRC-ACCESS-01 | Phase 9 | Complete |
| RSRC-ACCESS-02 | Phase 9 | Complete |
| RSRC-ACCESS-03 | Phase 9 | Complete |
| RSRC-ACCESS-04 | Phase 9 | Complete |
| RSRC-ACCESS-05 | Phase 9 | Complete |
| RSRC-GRANT-01 | Phase 9 | Complete |
| RSRC-GRANT-02 | Phase 9 | Complete |
| RSRC-GRANT-03 | Phase 9 | Complete |
| RSRC-DELEG-01 | Phase 9 | Complete |
| RSRC-SEED-01 | Phase 10 | Complete |
| RSRC-SEED-02 | Phase 10 | Complete |
| RSRC-SEED-03 | Phase 10 | Complete |
| RSRC-SEED-04 | Phase 10 | Complete |
| RSRC-SEED-05 | Phase 10 | Complete |
| RSRC-SEED-06 | Phase 9 | Complete |
| RSRC-SEED-07 | Phase 9 | Complete |
| RSRC-BE-01 | Phase 11 | Complete |
| RSRC-BE-02 | Phase 11 | Complete |
| RSRC-BE-03 | Phase 11 | Complete |
| RSRC-BE-04 | Phase 11 | Complete |
| RSRC-BE-05 | Phase 11 | Complete |
| RSRC-BE-06 | Phase 11 | Complete |
| SEC-01 | Phase 11 | Complete |
| SEC-02 | Phase 11 | Complete |
| SEC-03 | Phase 11 | Complete |
| SEC-04 | Phase 11 | Complete |
| RSRC-UI-01 | Phase 12 | Pending |
| RSRC-UI-02 | Phase 12 | Pending |
| RSRC-UI-03 | Phase 12 | Pending |
| RSRC-UI-04 | Phase 12 | Complete |
| RSRC-UI-05 | Phase 12 | Pending |
| RSRC-UI-06 | Phase 12 | Pending |
