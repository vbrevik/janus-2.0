# Phase 11: Demo UI & Tab Integration — Specification

**Created:** 2026-06-19
**Ambiguity score:** 0.20 (gate: ≤ 0.20)
**Requirements:** 11 locked

> ⚠ **SCOPE DIVERGENCE FROM ROADMAP — read first.** The ROADMAP defines Phase 11 as a
> frontend-only demo tab (Resource Browser + Access Resolution Explorer over the in-memory
> `WorldState`). During this spec interview the user deliberately and repeatedly expanded it
> into a **full-stack vertical**: a new digital-resource backend domain (8 Postgres tables +
> migrations + sqlx models + Rocket handlers + read/issue API), the **entire** gate-chain
> resolver re-implemented in Rust with parity to the TS resolver, Postgres as the single
> source of truth (the demo loader replaces the hardcoded `seedWorld()` digital-resource
> init), plus frontend delegation-issuing flows. This is milestone-scale and contradicts the
> Phase 9/10/11 framing. **Action required:** ROADMAP Phase 11 and the approved `11-UI-SPEC.md`
> must be re-synced to this scope (consider splitting via `/gsd-phase` before execution).
> Migration hazard is live — see Constraints.

## Goal

The Janus digital-resource model becomes a persisted, server-authoritative full-stack feature: eight new Postgres tables back the Network→Platform→Application domain, the complete gate-chain resolver (clearance + own-tier grant + parent-tier prerequisite + advisory zone + time-versioned policy selection) runs in Rust behind AuthGuard-protected read/issue endpoints, and the demo's "Digital Resources" tab loads that data from the API into `WorldState` at mount, lets a user browse the hierarchy, resolve access at any evaluation timestamp, toggle grants, and issue new grants/delegates — with the demo's TanStack route tree untouched.

## Background

The entire v2.2 digital-resource model currently lives **only in the frontend**: `demo/lib/model.ts` (types + `resolveResourceAccess`, `canIssueResourceGrant`, gate evaluators, `effectiveClassification`, `isWindowActive`), `demo/lib/seed.ts` (the 6-unit fixtures: `RESOURCE_NODES`, `RSRC_POLICIES`, `RESOURCE_GRANTS`, `RSRC_DELEGATES`), `demo/lib/digital-resource-selectors.ts` (`buildResourceTree`, `activeGrantsForResource`, `resolveResourceAt`), and `demo/store/world-state.tsx` (`DigitalResourceWorld`, `seedWorld()`, `TOGGLE_RESOURCE_GRANT`). There is **no backend domain** for digital resources — no tables, no `/api` routes, no sqlx structs. Phases 9–10 are verified (193 tests pass).

The demo shell `DemoRoot.tsx` renders tabs via `useState<ActiveView>` + a button row + conditional render in `<main>` — no route file. No `DigitalResourcesPanel` exists; no `useWorld()`-based hooks wrap the selectors. The backend follows flat domain modules (`mod.rs`/`models.rs`/`handlers.rs`, no service layer, inline sqlx on `PgPool`), with `AuthGuard` Bearer-JWT on every non-login handler. Migrations are known-broken on a clean DB and the live dev DB drifts from code (CLAUDE.md gotchas).

## Requirements

1. **Backend domain + schema**: A new digital-resource backend domain persists all 8 entities.
   - Current: No tables, models, or routes exist for networks/platforms/applications/org_links/resource_policies/policy_assignments/resource_access_grants/resource_access_delegates
   - Target: 8 tables created via migration with sqlx models + Rocket handlers mounted under `/api/...`, mirroring the `model.ts` shapes (exact columns/FKs decided in plan-phase against the live DB)
   - Acceptance: A fresh-applied migration creates all 8 tables; `cargo build` compiles the new domain; each table is reachable via its handler

2. **Rust resolver parity**: The full gate-chain resolver is ported to Rust and matches the TS resolver.
   - Current: `resolveResourceAccess` exists only in TS; no server-side resolution
   - Target: A Rust resolver implements clearance + own-tier grant + parent-tier prerequisite + advisory zone + time-versioned policy selection, producing the same `allow`/gate-set/`policyVersion` as the TS resolver for the seed fixtures
   - Acceptance: A parity test evaluates the seed fixtures at fixed timestamps and asserts the Rust output equals the TS output, **including** (a) a policy-window-boundary timestamp where `valid_from`/`valid_until` are inclusive on both sides, and (b) a timestamp with no covering policy returning a fail-closed DENY with `NO_ACTIVE_POLICY`

3. **Read API**: AuthGuard-protected GET endpoints expose the full domain.
   - Current: No endpoints
   - Target: GET endpoints return the network/platform/application hierarchy plus policies, grants, and delegates, behind `AuthGuard`
   - Acceptance: An authenticated GET returns the seeded hierarchy + policies/grants/delegates as JSON; an unauthenticated request is rejected by `AuthGuard`

4. **Issue API + server-side trust boundary**: POST endpoints issue a grant or delegate, re-validating authority server-side.
   - Current: No issue endpoints; `canIssueResourceGrant` exists only in TS (client-side)
   - Target: POST endpoints persist a new resource grant / delegate **only after** the ported Rust `canIssueResourceGrant` re-validates the actor's issuing authority
   - Acceptance: POST issue persists for an authorized actor (active ADMIN-org or active delegate); returns **403** for each of (i) a non-ADMIN actor with no delegate, (ii) an expired delegate, (iii) a delegate outside its validity window — mirroring the Phase 9 `canIssueResourceGrant` truth table

5. **Postgres is single source of truth**: Seed fixtures move into the DB; `seedWorld()` stops hardcoding resources.
   - Current: `seedWorld()` hardcodes the digital-resource arrays from `seed.ts`
   - Target: The `seed.ts` digital-resource fixtures are loaded into Postgres (migration vs script decided in plan-phase); `seedWorld()` no longer hardcodes the digital-resource arrays
   - Acceptance: `git grep` confirms `seedWorld()` no longer inlines the digital-resource fixtures; a GET against the seeded DB returns the same 6-unit dataset previously hardcoded

6. **Hybrid loader**: On demo mount, a loader fetches from the API and populates `WorldState`.
   - Current: `WorldState` initialises synchronously from `seedWorld()`
   - Target: On mount, a loader fetches digital-resource data from the API and populates the `digitalResources` sub-object of `WorldState`; the rest of the UI runs against `WorldState` unchanged
   - Acceptance: With the backend up and seeded, mounting the demo populates `WorldState.digitalResources` from the API; the Resource Browser renders the API-sourced hierarchy

7. **Resource Browser**: Hierarchy tree + detail panel.
   - Current: No resource UI
   - Target: A tree renders Network→Platform→Application with classification badges (Application badge shows the inherited Platform classification); selecting a resource shows org links grouped by role, the active policy summary, active grants, delegates, and (platforms) NSM annotation badges as static slate annotations
   - Acceptance: The tree renders all seeded resources with correct tier nesting; an Application badge displays its Platform's classification suffixed `(inherited)`; selecting each tier populates the detail panel sections per the approved `11-UI-SPEC.md`

8. **Access Resolution Explorer**: Identity + resource + timestamp → labeled gate-chain trace.
   - Current: No resolution UI for digital resources
   - Target: Uses the current role-switcher identity as the subject, plus a resource selector and an evaluation-timestamp picker (default now); renders the full gate-chain trace with the amber non-blocking zone-advisory row and an applied-policy-version label
   - Acceptance: For a chosen identity + resource, the trace shows each gate's pass/fail and the ALLOW/DENY verdict; the zone-advisory row renders amber labeled "Advisory (non-blocking)" and does not change the verdict; sliding the timestamp across a policy-shift boundary changes the displayed applied-policy-version label and may change the gate requirements

9. **Grant toggle**: Interactive enable/disable.
   - Current: `TOGGLE_RESOURCE_GRANT` action exists but is not surfaced in any UI
   - Target: A control toggles a resource grant's enabled state; the Explorer verdict updates live
   - Acceptance: Disabling an active grant that was the basis for an ALLOW flips the verdict to DENY; re-enabling it restores ALLOW (toggle is round-trip stable)

10. **Delegation issuing UI**: Issue grant/delegate via the API.
    - Current: No issuing UI; only `TOGGLE_RESOURCE_GRANT` mutates `WorldState`
    - Target: Forms issue a new grant/delegate by calling the POST endpoints (backend persist), then update `WorldState`; issuing controls are gated by the can-issue check
    - Acceptance: An authorized actor issues a grant via the form; the new grant is persisted (visible on a subsequent GET) and appears in `WorldState`; issuing the **same** grant/delegate twice does not create a duplicate row (rejected or de-duplicated); the control is disabled/hidden for an actor who cannot issue

11. **Tab integration, no route file**: A "Digital Resources" tab in `DemoRoot`.
    - Current: `DemoRoot` has 6 tabs; no digital-resources tab
    - Target: A 7th "Digital Resources" tab renders `DigitalResourcesPanel`
    - Acceptance: Clicking the tab renders the panel; `git diff frontend/src/routeTree.gen.ts` is empty; `npm run build` produces zero TypeScript errors

## Boundaries

**In scope:**
- New backend digital-resource domain: 8 tables + migration, sqlx models, Rocket handlers
- Full gate-chain resolver ported to Rust with TS-parity test
- Read API (GET hierarchy/policies/grants/delegates) + Issue API (POST grant, POST delegate) — all AuthGuard-protected
- Server-side re-validation of issuing authority (ported `canIssueResourceGrant`)
- Seeding the `seed.ts` digital-resource fixtures into Postgres; removing the hardcoded `seedWorld()` digital-resource init
- Hybrid loader populating `WorldState.digitalResources` from the API at demo mount
- `DigitalResourcesPanel`: Resource Browser (tree + detail) + Access Resolution Explorer (identity/resource/timestamp + trace) + grant toggle + grant/delegate issuing forms
- "Digital Resources" tab wired into `DemoRoot` with no route-file changes

**Out of scope:**
- Editing/creating policies, org-links, resources, or the hierarchy itself — only grant/delegate *issuing* and grant toggling are mutations; everything else is read-only (user decision)
- New TanStack route files — tab-only; `routeTree.gen.ts` must stay byte-identical (hard ROADMAP criterion)
- Other backend domains (person, orgs, nda, physical access, etc.) — untouched
- Reworking the v2.1 physical-access or zone backend — the advisory zone link is resolved from existing data only
- A separate `restore`/admin console for the new domain — not requested

## Constraints

- **Stack locked** (CLAUDE.md): Rust 1.87 + Rocket 0.5 + sqlx/PostgreSQL backend; React 19 + TanStack + Vite + shadcn/ui frontend. No new frameworks.
- **Migration hazard (live risk):** `sqlx migrate run` is known-broken on a clean DB and the live dev DB drifts from code (ALTER-before-CREATE, dup versions, dead `users` FK, `personnel_id`/`issued_by` vs `person_id`). New migrations must be authored against the **live** DB state; verify column/FK names before writing SQL.
- **Backend conventions:** flat domain module (`mod.rs`/`models.rs`/`handlers.rs`), no service layer, inline sqlx on `PgPool`; handlers return `Result<Json<T>, Status>` (never panic); `AuthGuard` on every handler. Relative handler paths under the `/api/<x>` mount (don't double-prefix).
- **Auth on new endpoints:** `AuthGuard` (Bearer-JWT) on all, consistent with convention; per-route role gating on the issue POSTs deferred to plan-phase.
- **DB seeding mechanism** (migration vs seed script) deferred to plan-phase; the requirement (fixtures must reach Postgres) is locked.
- **Determinism:** the Rust resolver, like the TS one, must take an explicit evaluation timestamp — no `now()` inside resolution — so parity tests are reproducible.
- **Frontend gotchas:** `apiFetch` paths must start with `/api/...`; never empty `<SelectItem value="">` (use a sentinel); `TOGGLE_RESOURCE_GRANT` targets `digitalResources.disabledResourceGrantIds` via `resourceGrantId`.

## Acceptance Criteria

- [ ] A fresh-applied migration creates all 8 digital-resource tables; `cargo build` compiles the new domain
- [ ] Rust resolver parity test asserts equality with the TS resolver on the seed fixtures, including the inclusive policy-window boundary and the no-policy `NO_ACTIVE_POLICY` DENY
- [ ] AuthGuard-protected GET returns the seeded hierarchy + policies/grants/delegates; unauthenticated GET is rejected
- [ ] POST issue persists for an authorized actor and returns 403 for non-ADMIN/no-delegate, expired-delegate, and out-of-window-delegate actors
- [ ] `seedWorld()` no longer hardcodes the digital-resource fixtures; the seeded DB serves the same 6-unit dataset
- [ ] On mount with backend up, the loader populates `WorldState.digitalResources` from the API and the Browser renders it
- [ ] Resource Browser renders the tree with correct nesting; Application badges show inherited Platform classification `(inherited)`; detail panel shows org-links-by-role, policy summary, grants, delegates, NSM badges
- [ ] Access Resolution Explorer renders the gate-chain trace; the amber zone-advisory row never changes the verdict; the timestamp picker across a policy boundary changes the applied-policy-version label
- [ ] Disabling the grant behind an ALLOW flips it to DENY; re-enabling restores ALLOW
- [ ] Issuing a grant/delegate persists it (visible on a later GET) and updates `WorldState`; a duplicate issue creates no duplicate row; the control is hidden/disabled when the actor cannot issue
- [ ] "Digital Resources" tab renders the panel; `git diff frontend/src/routeTree.gen.ts` is empty; `npm run build` and `npm run test` pass with zero errors

## Edge Coverage

**Coverage:** 6/18 applicable edges resolved · 0 unresolved (12 dismissed)

| Category | Requirement | Status | Resolution / Reason |
|----------|-------------|--------|---------------------|
| boundary | R2, R8 | ✅ covered | Policy window inclusive at both `valid_from`/`valid_until`; parity + trace assert it (AC R2, R8) |
| empty | R2, R8 | ✅ covered | No covering policy → fail-closed DENY `NO_ACTIVE_POLICY` (AC R2, R8) |
| boundary | R4 | ✅ covered | Issue 403 for non-ADMIN/no-delegate, expired delegate, out-of-window delegate (AC R4) |
| idempotency | R9 | ✅ covered | Toggle is round-trip stable: twice → original verdict (AC R9) |
| idempotency | R10 | ✅ covered | Duplicate issue creates no duplicate row (AC R10) |
| concurrency | R10 | ✅ covered | Server-side re-validation gates every issue persist (AC R4/R10) |
| concurrency | R3, R6, R7 | ⛔ dismissed | In-memory single-user demo; read endpoints/loader have no concurrent-writer contract |
| concurrency | R9 | ⛔ dismissed | Single-user demo; no parallel toggle path |
| adjacency | R5 | ⛔ dismissed | Seeding is a one-shot load of fixed fixtures; no merge/touch semantics |
| empty | R5 | ⛔ dismissed | Fixtures are fixed and non-empty; no empty-input path |
| ordering | R5 | ⛔ dismissed | Hierarchy ordering is derived per tier by `buildResourceTree`; not a seed concern |
| encoding | R8 | ⛔ dismissed | Timestamp via `datetime-local`; no string-length/normalization semantics |
| precision | R8 | ⛔ dismissed | Date comparison only; no rounding/overflow contract |
| unclassified | R1, R11 | ⛔ dismissed | Infra/wiring reqs (schema, tab mount) carry no data-edge; covered by build/migration ACs |

## Prohibitions (must-NOT)

**Coverage:** 5/5 applicable prohibitions resolved · 0 unresolved

| Prohibition (must-NOT statement) | Requirement | Status | Verification / Reason |
|----------------------------------|-------------|--------|------------------------|
| The zone-advisory row MUST NOT change the ALLOW/DENY verdict — in the TS resolver, the ported Rust resolver, and the UI | R2, R8 | resolved | test — parity + a fixture where only the zone prereq fails still resolves per the gate chain |
| Application classification MUST NOT be stored or editable independently of its Platform (no column, no API field, no UI input that lets it diverge) | R1, R7 | resolved | test — schema has no app classification column; `effectiveClassification` derives it; UI shows `(inherited)` only |
| The issue endpoint MUST NOT persist a grant/delegate on the client's say-so — the server re-validates issuing authority on every call | R4, R10 | resolved | test — issue with a forged/insufficient actor returns 403 server-side regardless of client state |
| The loader MUST NOT silently fall back to stale hardcoded data and present it as live when the API is unreachable — DB is the source of truth, so failure must surface | R5, R6 | resolved | judgment — loader surfaces an explicit error/empty state on fetch failure; no hidden seed fallback |
| NSM annotation badges MUST NOT render as a gate pass (green) — they are static annotations, never gates | R7 | resolved | test/judgment — badges use `Pill tone="slate"` per `11-UI-SPEC.md`; never green/red |

## Ambiguity Report

| Dimension          | Score | Min  | Status | Notes                                             |
|--------------------|-------|------|--------|---------------------------------------------------|
| Goal Clarity       | 0.85  | 0.75 | ✓      | Full-stack outcome fully specified                |
| Boundary Clarity   | 0.80  | 0.70 | ✓      | In/out explicit; deferrals bounded                |
| Constraint Clarity | 0.72  | 0.65 | ✓      | AuthGuard + migration hazard + determinism locked |
| Acceptance Criteria| 0.80  | 0.70 | ✓      | 11 pass/fail criteria + negatives                 |
| **Ambiguity**      | 0.20  | ≤0.20| ✓      | Gate passed; scope large but clear                |

Status: ✓ = met minimum, ⚠ = below minimum (planner treats as assumption)

## Interview Log

| Round | Perspective     | Question summary                          | Decision locked                                              |
|-------|-----------------|-------------------------------------------|--------------------------------------------------------------|
| 0     | Researcher      | What exists today for digital resources?  | Frontend-only model/seed/selectors; no backend; tab pattern in DemoRoot |
| 0     | Boundary Keeper | Grant toggle? Person source? Out of scope?| Include toggle; reuse role-switcher identity; no policy/grant editing; no route files |
| 0     | Boundary Keeper | Delegation UI? Backend?                   | Delegation-issuing IN scope; **backend IN scope** (scope expansion — flagged) |
| 1     | Researcher      | UI data source? Which entities? Issue persistence? | Hybrid loader; all 8 entities; backend POST + WorldState |
| 2     | Boundary Keeper | Issue authz? Endpoint auth? DB seeding?   | Port `canIssueResourceGrant` to Rust; AuthGuard (role-gating deferred); seed→DB (mechanism deferred) |
| 3     | Seed Closer     | Source of truth? Resolver port boundary?  | DB replaces `seedWorld()` init; **full** resolver ported to Rust |
| 5.5   | Failure Analyst | Edge cases to pin?                        | Policy-boundary + no-policy DENY; three 403 cases; toggle + issue idempotency |
| 5.6   | Prohibition     | must-NOT statements?                       | Advisory-never-flips; classification-inherited; no client-trusted issuing; loader-fails-loud; NSM-never-green |

---

*Phase: 11-demo-ui-tab-integration*
*Spec created: 2026-06-19*
*Next step: /gsd-discuss-phase 11 — implementation decisions (how to build what's specified above). NOTE: re-sync ROADMAP + 11-UI-SPEC.md to the expanded full-stack scope first.*
