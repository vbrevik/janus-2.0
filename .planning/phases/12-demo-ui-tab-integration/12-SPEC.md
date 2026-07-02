# Phase 12: Demo UI, Loader & Tab Integration — Specification

**Created:** 2026-06-19 · **Updated:** 2026-07-02 (post-Phase-11 reconciliation)
**Ambiguity score:** 0.16 (gate: ≤ 0.20)
**Requirements:** 7 locked

> **Split note.** Split out of the original Phase 11 on 2026-06-19. The backend domain,
> Rust resolver port, and read/issue API live in **Phase 11** (`11-digital-resource-backend`, complete
> 2026-07-02, verification 16/16 + UAT 8/8); this phase is the demo frontend that consumes them.
> The approved UI design contract is `12-UI-SPEC.md`.
>
> **2026-07-02 update.** Reconciled against Phase 11 as-built: (1) all endpoints now require a
> Bearer JWT (SEC-01) and the demo is a standalone entry — token acquisition pinned to
> *reuse the main-app localStorage token*; (2) backend serializes **snake_case**
> (`org_links`, `valid_from`) vs the camelCase TS model — a mapping layer is required;
> (3) the dev DB `janus2` has schema but **no seed data** — applying it is now in scope (R7);
> (4) issuing authority is **role-based (Option B)**, not the org-based can-issue (deferred to SEED-012).

## Goal

The demo's "Digital Resources" tab loads the digital-resource data from the Phase 11 API into `WorldState` at mount, then lets a user browse the Network→Platform→Application hierarchy, resolve access for the current identity at any evaluation timestamp, toggle grants, and issue new grants/delegates through the backend — all without touching the TanStack route tree.

## Background

The demo shell `DemoRoot.tsx` renders tabs via `useState<ActiveView>` + a button row + conditional render in `<main>` — no route file; the demo is its own entry (`src/demo/main.tsx`), outside the authenticated app shell. Selectors exist in `demo/lib/digital-resource-selectors.ts` (`buildResourceTree`, `activeGrantsForResource`, `resolveResourceAt`); `world-state.tsx` carries `DigitalResourceWorld` + `TOGGLE_RESOURCE_GRANT`. No `DigitalResourcesPanel`, no loader, no fetch anywhere under `src/demo/`. `seedWorld()` no longer hardcodes digital-resource arrays (11-03). The API is live: `GET /api/digital-resources/world` returns `{success, data: {networks, platforms, applications, org_links, policies, policy_assignments, grants, delegates}}` (snake_case, `ApiResponse` envelope) behind AuthGuard; issue endpoints re-validate role server-side; duplicate grants are DB-deduped (`uq_grant UNIQUE NULLS NOT DISTINCT`, 4fd2ec9). Closest analogs: `zone-browser.tsx` (tree), `access-resolution-explorer.tsx` (trace), `ui.tsx` primitives.

## Requirements

1. **Hybrid loader** (`RSRC-UI-04`): On demo mount, a loader fetches from the Phase 11 API and populates `WorldState`.
   - Current: `WorldState.digitalResources` arrays initialise empty; no fetch exists in `src/demo/`
   - Target: On mount, a loader reads the main-app JWT from `localStorage`, calls `GET /api/digital-resources/world`, unwraps the `ApiResponse` envelope, maps snake_case→camelCase into the TS model, and populates `WorldState.digitalResources`
   - Acceptance: With the backend up, seeded (R7), and a token present, mounting the demo populates `WorldState.digitalResources` from the API and the Browser renders the API-sourced hierarchy; missing token, 401, or unreachable API each surface an explicit error state naming the cause (no silent stale fallback)

2. **Resource Browser** (`RSRC-UI-01`): Hierarchy tree + detail panel.
   - Current: No resource UI
   - Target: A tree renders Network→Platform→Application with classification badges (Application badge shows inherited Platform classification); selecting a resource shows org links grouped by role, active policy summary, active grants, delegates, and (platforms) NSM annotation badges as static slate annotations
   - Acceptance: The tree renders all resources with correct tier nesting; an Application badge displays its Platform's classification suffixed `(inherited)`; selecting each tier populates the detail panel sections per `12-UI-SPEC.md`

3. **Access Resolution Explorer** (`RSRC-UI-03`): Identity + resource + timestamp → labeled gate-chain trace.
   - Current: No resolution UI for digital resources
   - Target: Uses the current role-switcher identity as the subject, plus a resource selector and an evaluation-timestamp picker (default now); renders the full gate-chain trace with the amber non-blocking zone-advisory row and an applied-policy-version label
   - Acceptance: The trace shows each gate's pass/fail and the ALLOW/DENY verdict; the zone-advisory row renders amber labeled "Advisory (non-blocking)" and does not change the verdict; sliding the timestamp across a policy-shift boundary (inclusive at the boundary instant) changes the displayed applied-policy-version label; a timestamp with no covering policy renders the fail-closed DENY/no-active-policy state

4. **Grant toggle** (`RSRC-UI-05`): Interactive enable/disable.
   - Current: `TOGGLE_RESOURCE_GRANT` exists but is surfaced in no UI
   - Target: A control toggles a resource grant's enabled state; the Explorer verdict updates live
   - Acceptance: Disabling an active grant that was the sole basis for an ALLOW flips the verdict to DENY; re-enabling restores ALLOW (round-trip stable); when two grants independently cover the same subject→resource, disabling one keeps ALLOW — only disabling both flips DENY

5. **Delegation issuing UI** (`RSRC-UI-06`): Issue grant/delegate via the Phase 11 API.
   - Current: No issuing UI; only `TOGGLE_RESOURCE_GRANT` mutates `WorldState`
   - Target: Forms issue a new grant/delegate by calling the POST endpoints (backend persist), then update `WorldState` from the server response/refetch; issuing controls are shown/enabled only when the logged-in JWT role holds the server-side write permission (admin, manager — Option B role model)
   - Acceptance: An authorized actor issues a grant via the form; the new grant is persisted (visible on a subsequent GET) and appears in `WorldState`; the submit button is disabled while `mutation.isPending`; after a duplicate submit `WorldState` contains exactly one copy of the grant (server-deduped; state from response/refetch, never blind append); the control is disabled/hidden for a role without the permission; a server 403 surfaces inline (`bg-destructive/10 text-destructive`)

6. **Tab integration, no route file** (`RSRC-UI-02`): A "Digital Resources" tab in `DemoRoot`.
   - Current: `DemoRoot` has 6 tabs; no digital-resources tab
   - Target: A 7th "Digital Resources" tab renders `DigitalResourcesPanel`
   - Acceptance: Clicking the tab renders the panel; `git diff frontend/src/routeTree.gen.ts` is empty; `npm run build` produces zero TypeScript errors

7. **Seed data applied to the dev DB** (`RSRC-SEED-06`, new): The demo runs against real data on `janus2`.
   - Current: `janus2` has the 8 resource tables but zero rows; seed migration `20260601130001` applied only to `janus2_fresh`; `sqlx migrate run` remains broken on the drifted `janus2`
   - Target: The committed seed migration is applied to `janus2` via direct psql (the 11-01/11-03 path); the apply step is idempotent/guarded
   - Acceptance: `GET /api/digital-resources/world` against `janus2` returns the 6-network seeded hierarchy with 18 grants; re-running the apply step is a no-op (guards on non-empty tables or `ON CONFLICT DO NOTHING`; row counts unchanged after a second run)

## Boundaries

**In scope:**
- Applying the committed digital-resource seed migration to `janus2` (first task — everything else renders against it)
- Hybrid loader populating `WorldState.digitalResources` from the Phase 11 API at mount (React Query hooks; main-app token reuse; snake_case→camelCase mapping)
- `DigitalResourcesPanel`: Resource Browser (tree + detail) + Access Resolution Explorer (identity/resource/timestamp + trace) + grant toggle + grant/delegate issuing forms (role-gated)
- "Digital Resources" tab wired into `DemoRoot` with no route-file changes

**Out of scope:**
- Any backend change — endpoints, guards, migrations beyond applying the already-committed seed; especially NO relaxation of AuthGuard/RBAC/CORS (see Prohibitions)
- Editing/creating policies, org-links, resources, or the hierarchy — only grant toggle + grant/delegate issuing are mutations; everything else is read-only
- New TanStack route files — tab-only; `routeTree.gen.ts` must stay byte-identical (hard criterion)
- Org-based issuing authority (SEED-012) — UI mirrors the server's role-based Option B model
- A demo-local login flow — token comes from the main app; absent token is an explicit error state, not a login form

## Constraints

- **Stack locked** (CLAUDE.md): React 19 + TanStack + Vite + shadcn/ui. No new frameworks.
- **Design contract:** `12-UI-SPEC.md` (approved) governs spacing/typography/color/copy — amber-only advisory row with exact "Advisory (non-blocking)" string; NSM badges `tone="slate"` (never green); Application badge `(inherited)` suffix.
- **API shape (as-built):** `ApiResponse` envelope `{success, data, error}`; snake_case field names; Bearer JWT required on every endpoint; 403 (not 401) on permission refusal; duplicate grant POSTs return success with one persisted row.
- **Auth:** demo reuses the main-app JWT from `localStorage` (same origin :15510). No credentials in demo code.
- **Frontend gotchas:** `apiFetch` paths must start with `/api/...`; never empty `<SelectItem value="">` (use a sentinel); `TOGGLE_RESOURCE_GRANT` targets `digitalResources.disabledResourceGrantIds` via `resourceGrantId`.
- **Seed apply:** direct psql against `janus2` (`sqlx migrate run` broken there); must be idempotent/guarded.

## Acceptance Criteria

- [ ] Seed applied: `/world` against `janus2` returns 6 networks / 18 grants; re-running the apply step changes no row counts
- [ ] On mount with backend up + token present, the loader populates `WorldState.digitalResources` (snake_case mapped) and the Browser renders it; missing token / 401 / unreachable each show an explicit cause-naming error state (no silent stale fallback)
- [ ] Resource Browser renders the tree with correct nesting; Application badges show inherited Platform classification `(inherited)`; detail panel shows org-links-by-role, policy summary, grants, delegates, NSM badges
- [ ] Explorer renders the gate-chain trace; the amber zone-advisory row never changes the verdict; timestamp across a policy boundary (inclusive at the instant) changes the applied-policy-version label; no covering policy renders fail-closed DENY
- [ ] Disabling the sole grant behind an ALLOW flips it to DENY; re-enabling restores ALLOW; with two covering grants, disabling one keeps ALLOW
- [ ] Issuing: persisted on the server (visible on later GET) and in `WorldState`; submit disabled while pending; duplicate submit leaves exactly one grant in `WorldState`; controls hidden/disabled without the role permission; 403 surfaces inline
- [ ] "Digital Resources" tab renders the panel; `git diff frontend/src/routeTree.gen.ts` is empty; `npm run build` and `npm run test` pass with zero errors
- [ ] `cd backend && cargo test --test security_hardening_test -- --include-ignored` still 13 passed, 0 failed (no-relax prohibition)

## Edge Coverage

**Coverage:** 12/12 applicable edges resolved · 0 unresolved

| Category | Requirement | Status | Resolution / Reason |
|----------|-------------|--------|---------------------|
| boundary | RSRC-UI-03 | ✅ covered | Timestamp at the inclusive policy-window boundary instant changes the applied-policy-version label |
| empty | RSRC-UI-03 | ✅ covered | No covering policy at the chosen timestamp → fail-closed DENY/no-active-policy trace |
| precision | RSRC-UI-03 | ✅ covered | Same inclusive-boundary criterion pins instant-level precision semantics |
| encoding | RSRC-UI-03 | ⛔ dismissed | Timestamp via `datetime-local`; no string normalization semantics |
| boundary | RSRC-UI-05 | ✅ covered | Two covering grants: disabling one keeps ALLOW; only disabling both flips DENY |
| precision | RSRC-UI-05 | ⛔ dismissed | Toggle is boolean set-membership; no numeric semantics |
| idempotency | RSRC-UI-06 | ✅ covered | Duplicate submit → exactly one grant in `WorldState` (server-deduped; state from response/refetch) |
| concurrency | RSRC-UI-06 | ✅ covered | Submit disabled while `mutation.isPending` |
| concurrency | RSRC-UI-04 | ⛔ dismissed | Mount-once GET is idempotent; StrictMode double-mount harmless; single-user demo |
| concurrency | RSRC-UI-01 | ⛔ dismissed | Read-only render over in-memory state |
| concurrency | RSRC-SEED-06 | ✅ covered | Apply step idempotent/guarded — second run is a no-op with unchanged row counts |
| unclassified | RSRC-UI-02 | ⛔ dismissed | Pure tab wiring; routeTree byte-identity + zero-TS-error criteria gate it mechanically |

## Prohibitions (must-NOT)

**Coverage:** 5/5 applicable prohibitions resolved · 0 unresolved

| Prohibition (must-NOT statement) | Requirement | Status | Verification / Reason |
|----------------------------------|-------------|--------|------------------------|
| The zone-advisory row MUST NOT change the ALLOW/DENY verdict in the UI trace | RSRC-UI-03 | resolved | test — a fixture where only the zone prereq fails still renders the gate-chain verdict; advisory row is amber, informational |
| The loader MUST NOT silently fall back to stale/hardcoded data and present it as live when the API is unreachable or unauthorized | RSRC-UI-04 | resolved | judgment — loader surfaces an explicit cause-naming error state; no hidden seed fallback |
| NSM annotation badges MUST NOT render as a gate pass (green) — static annotations, never gates | RSRC-UI-01 | resolved | test/judgment — badges use `Pill tone="slate"` per `12-UI-SPEC.md` |
| Phase 12 MUST NOT relax any Phase 11 server-side guard (AuthGuard, per-role RBAC, CORS) to accommodate the demo | all | resolved | test — `check_kind: node-test`, `check_target: backend/tests/security_hardening_test.rs`; suite (13 tests) must stay green through the phase |
| Demo frontend code MUST NOT embed seed credentials (no auto-login literals like `password123` under `src/demo/`) | RSRC-UI-04 | resolved | judgment — reviewer verifies no credential literals in `src/demo/`; locks the reuse-main-app-token decision |

## Ambiguity Report

| Dimension          | Score | Min  | Status | Notes                                                        |
|--------------------|-------|------|--------|--------------------------------------------------------------|
| Goal Clarity       | 0.86  | 0.75 | ✓      | UI outcome fully specified + approved UI-SPEC                |
| Boundary Clarity   | 0.86  | 0.70 | ✓      | Seed apply in scope; backend changes + org-authz explicitly out |
| Constraint Clarity | 0.80  | 0.65 | ✓      | As-built API shape, token reuse, snake_case mapping, psql seed path |
| Acceptance Criteria| 0.84  | 0.70 | ✓      | 8 pass/fail criteria incl. edges + no-relax backstop         |
| **Ambiguity**      | 0.16  | ≤0.20| ✓      | Gate passed                                                  |

## Interview Log

| Round | Perspective     | Question summary                          | Decision locked                                              |
|-------|-----------------|-------------------------------------------|--------------------------------------------------------------|
| 0     | Boundary Keeper | Grant toggle? Person source?              | Include toggle; reuse role-switcher identity as subject      |
| 0     | Boundary Keeper | Delegation UI in scope?                   | Delegation-issuing UI IN scope (frontend forms → Phase 11 API) |
| 1     | Researcher      | UI data source?                           | Hybrid loader — backend persists; loader seeds WorldState at mount |
| 3     | Seed Closer     | Source of truth?                          | DB replaces `seedWorld()` init; loader fetches from API      |
| 5.5   | Failure Analyst | Edge cases to pin?                        | Policy-boundary + no-policy in trace; toggle idempotency     |
| 5.6   | Prohibition     | must-NOT statements?                      | Advisory-never-flips; loader-fails-loud; NSM-never-green     |
| U1    | Researcher (update, 2026-07-02) | Demo auth? Seed data? Issue gating? | Reuse main-app token; seed apply in scope (R7); JWT-role gating (Option B) |
| U5.5  | Edge probe (update) | Two-grant toggle, double-submit, seed re-apply, tab | All specified; tab dismissed edge-free |
| U5.6  | Prohibition (update) | Guard relaxation, embedded creds       | No-relax (test tier, security suite); no-creds (judgment)    |

---

*Phase: 12-demo-ui-tab-integration*
*Spec created: 2026-06-19 · updated 2026-07-02 (post-Phase-11 reconciliation)*
*Next step: /gsd-discuss-phase 12 — implementation decisions. Phase 11 complete (verification 16/16, UAT 8/8).*
