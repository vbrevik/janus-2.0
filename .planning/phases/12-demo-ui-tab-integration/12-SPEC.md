# Phase 12: Demo UI, Loader & Tab Integration — Specification

**Created:** 2026-06-19
**Ambiguity score:** 0.18 (gate: ≤ 0.20)
**Requirements:** 6 locked

> **Split note.** Split out of the original Phase 11 on 2026-06-19. The backend domain,
> Rust resolver port, and read/issue API live in **Phase 11** (`11-digital-resource-backend`);
> this phase (Phase 12) is the demo frontend that consumes them. **Depends on Phase 11.**
> The approved UI design contract is `12-UI-SPEC.md` (moved here from the original Phase 11).

## Goal

The demo's "Digital Resources" tab loads the digital-resource data from the Phase 11 API into `WorldState` at mount, then lets a user browse the Network→Platform→Application hierarchy, resolve access for the current identity at any evaluation timestamp, toggle grants, and issue new grants/delegates through the backend — all without touching the TanStack route tree.

## Background

The demo shell `DemoRoot.tsx` renders tabs via `useState<ActiveView>` + a button row + conditional render in `<main>` — no route file. Selectors exist in `demo/lib/digital-resource-selectors.ts` (`buildResourceTree`, `activeGrantsForResource`, `resolveResourceAt`); `world-state.tsx` carries `DigitalResourceWorld` + `TOGGLE_RESOURCE_GRANT`. No `DigitalResourcesPanel`, no `useWorld()`-based hooks wrapping the selectors, no loader. Closest analogs: `zone-browser.tsx` (tree), `access-resolution-explorer.tsx` (gate-chain trace + selector cards), `ui.tsx` primitives. The approved `12-UI-SPEC.md` locks spacing/typography/color/copy. After Phase 11, Postgres is the source of truth and `seedWorld()` no longer hardcodes the digital-resource arrays.

## Requirements

1. **Hybrid loader** (`RSRC-UI-04`): On demo mount, a loader fetches from the Phase 11 API and populates `WorldState`.
   - Current: `WorldState` initialised synchronously from `seedWorld()`; after Phase 11 the digital-resource arrays are no longer hardcoded
   - Target: On mount, a loader fetches digital-resource data from the API and populates `WorldState.digitalResources`; the rest of the UI runs against `WorldState`
   - Acceptance: With the backend up and seeded, mounting the demo populates `WorldState.digitalResources` from the API and the Browser renders the API-sourced hierarchy; if the API is unreachable the loader surfaces an explicit error/empty state (no silent stale fallback)

2. **Resource Browser** (`RSRC-UI-01`): Hierarchy tree + detail panel.
   - Current: No resource UI
   - Target: A tree renders Network→Platform→Application with classification badges (Application badge shows inherited Platform classification); selecting a resource shows org links grouped by role, active policy summary, active grants, delegates, and (platforms) NSM annotation badges as static slate annotations
   - Acceptance: The tree renders all resources with correct tier nesting; an Application badge displays its Platform's classification suffixed `(inherited)`; selecting each tier populates the detail panel sections per `12-UI-SPEC.md`

3. **Access Resolution Explorer** (`RSRC-UI-03`): Identity + resource + timestamp → labeled gate-chain trace.
   - Current: No resolution UI for digital resources
   - Target: Uses the current role-switcher identity as the subject, plus a resource selector and an evaluation-timestamp picker (default now); renders the full gate-chain trace with the amber non-blocking zone-advisory row and an applied-policy-version label
   - Acceptance: The trace shows each gate's pass/fail and the ALLOW/DENY verdict; the zone-advisory row renders amber labeled "Advisory (non-blocking)" and does not change the verdict; sliding the timestamp across a policy-shift boundary changes the displayed applied-policy-version label and may change the gate requirements

4. **Grant toggle** (`RSRC-UI-05`): Interactive enable/disable.
   - Current: `TOGGLE_RESOURCE_GRANT` exists but is surfaced in no UI
   - Target: A control toggles a resource grant's enabled state; the Explorer verdict updates live
   - Acceptance: Disabling an active grant that was the basis for an ALLOW flips the verdict to DENY; re-enabling restores ALLOW (toggle is round-trip stable)

5. **Delegation issuing UI** (`RSRC-UI-06`): Issue grant/delegate via the Phase 11 API.
   - Current: No issuing UI; only `TOGGLE_RESOURCE_GRANT` mutates `WorldState`
   - Target: Forms issue a new grant/delegate by calling the POST endpoints (backend persist), then update `WorldState`; issuing controls are gated by the can-issue check
   - Acceptance: An authorized actor issues a grant via the form; the new grant is persisted (visible on a subsequent GET) and appears in `WorldState`; the control is disabled/hidden for an actor who cannot issue; a server 403 surfaces inline (`bg-destructive/10 text-destructive`)

6. **Tab integration, no route file** (`RSRC-UI-02`): A "Digital Resources" tab in `DemoRoot`.
   - Current: `DemoRoot` has 6 tabs; no digital-resources tab
   - Target: A 7th "Digital Resources" tab renders `DigitalResourcesPanel`
   - Acceptance: Clicking the tab renders the panel; `git diff frontend/src/routeTree.gen.ts` is empty; `npm run build` produces zero TypeScript errors

## Boundaries

**In scope:**
- Hybrid loader populating `WorldState.digitalResources` from the Phase 11 API at mount (React Query hooks)
- `DigitalResourcesPanel`: Resource Browser (tree + detail) + Access Resolution Explorer (identity/resource/timestamp + trace) + grant toggle + grant/delegate issuing forms
- "Digital Resources" tab wired into `DemoRoot` with no route-file changes

**Out of scope:**
- The backend domain, migrations, Rust resolver, read/issue API — **Phase 11** (this phase consumes them)
- Editing/creating policies, org-links, resources, or the hierarchy — only grant toggle + grant/delegate issuing are mutations; everything else is read-only
- New TanStack route files — tab-only; `routeTree.gen.ts` must stay byte-identical (hard criterion)
- Server-side authorization logic — issuing authority is re-validated by the Phase 11 endpoint; the UI only gates affordances

## Constraints

- **Stack locked** (CLAUDE.md): React 19 + TanStack + Vite + shadcn/ui. No new frameworks.
- **Design contract:** `12-UI-SPEC.md` (approved) governs spacing/typography/color/copy — amber-only advisory row with exact "Advisory (non-blocking)" string; NSM badges `tone="slate"` (never green); Application badge `(inherited)` suffix.
- **Frontend gotchas:** `apiFetch` paths must start with `/api/...`; never empty `<SelectItem value="">` (use a sentinel); `TOGGLE_RESOURCE_GRANT` targets `digitalResources.disabledResourceGrantIds` via `resourceGrantId`.
- **Depends on Phase 11** — the API and seeded DB must exist before this phase's loader and issuing forms work end-to-end.

## Acceptance Criteria

- [ ] On mount with backend up, the loader populates `WorldState.digitalResources` from the API and the Browser renders it; API-unreachable surfaces an explicit error/empty state (no silent stale fallback)
- [ ] Resource Browser renders the tree with correct nesting; Application badges show inherited Platform classification `(inherited)`; detail panel shows org-links-by-role, policy summary, grants, delegates, NSM badges
- [ ] Access Resolution Explorer renders the gate-chain trace; the amber zone-advisory row never changes the verdict; the timestamp picker across a policy boundary changes the applied-policy-version label
- [ ] Disabling the grant behind an ALLOW flips it to DENY; re-enabling restores ALLOW
- [ ] Issuing a grant/delegate persists it (visible on a later GET) and updates `WorldState`; the control is hidden/disabled when the actor cannot issue; a 403 surfaces inline
- [ ] "Digital Resources" tab renders the panel; `git diff frontend/src/routeTree.gen.ts` is empty; `npm run build` and `npm run test` pass with zero errors

## Edge Coverage

**Coverage:** 3/3 applicable edges resolved · 0 unresolved

| Category | Requirement | Status | Resolution / Reason |
|----------|-------------|--------|---------------------|
| boundary | RSRC-UI-03 | ✅ covered | Timestamp picker at inclusive policy window boundary changes applied-policy-version label |
| empty | RSRC-UI-03 | ✅ covered | No covering policy at the chosen timestamp → trace shows the fail-closed DENY/no-active-policy state |
| idempotency | RSRC-UI-05 | ✅ covered | Toggle is round-trip stable: twice → original verdict |
| concurrency | RSRC-UI-01/04 | ⛔ dismissed | Single-user in-memory demo; loader/render have no concurrent path |
| encoding | RSRC-UI-03 | ⛔ dismissed | Timestamp via `datetime-local`; no string-length/normalization semantics |

## Prohibitions (must-NOT)

**Coverage:** 3/3 applicable prohibitions resolved · 0 unresolved

| Prohibition (must-NOT statement) | Requirement | Status | Verification / Reason |
|----------------------------------|-------------|--------|------------------------|
| The zone-advisory row MUST NOT change the ALLOW/DENY verdict in the UI trace | RSRC-UI-03 | resolved | test — a fixture where only the zone prereq fails still renders the gate-chain verdict; advisory row is amber, informational |
| The loader MUST NOT silently fall back to stale hardcoded data and present it as live when the API is unreachable | RSRC-UI-04 | resolved | judgment — loader surfaces an explicit error/empty state on fetch failure; no hidden seed fallback |
| NSM annotation badges MUST NOT render as a gate pass (green) — they are static annotations, never gates | RSRC-UI-01 | resolved | test/judgment — badges use `Pill tone="slate"` per `12-UI-SPEC.md`; never green/red |

## Ambiguity Report

| Dimension          | Score | Min  | Status | Notes                                          |
|--------------------|-------|------|--------|------------------------------------------------|
| Goal Clarity       | 0.86  | 0.75 | ✓      | UI outcome fully specified + approved UI-SPEC  |
| Boundary Clarity   | 0.84  | 0.70 | ✓      | Backend explicitly deferred to Phase 11        |
| Constraint Clarity | 0.74  | 0.65 | ✓      | UI-SPEC + frontend gotchas + Phase 11 dependency |
| Acceptance Criteria| 0.82  | 0.70 | ✓      | 6 pass/fail criteria + negatives               |
| **Ambiguity**      | 0.18  | ≤0.20| ✓      | Gate passed                                    |

## Interview Log

| Round | Perspective     | Question summary                          | Decision locked                                              |
|-------|-----------------|-------------------------------------------|--------------------------------------------------------------|
| 0     | Boundary Keeper | Grant toggle? Person source?              | Include toggle; reuse role-switcher identity as subject      |
| 0     | Boundary Keeper | Delegation UI in scope?                   | Delegation-issuing UI IN scope (frontend forms → Phase 11 API) |
| 1     | Researcher      | UI data source?                           | Hybrid loader — backend persists; loader seeds WorldState at mount |
| 3     | Seed Closer     | Source of truth?                          | DB replaces `seedWorld()` init; loader fetches from API      |
| 5.5   | Failure Analyst | Edge cases to pin?                        | Policy-boundary + no-policy in trace; toggle idempotency     |
| 5.6   | Prohibition     | must-NOT statements?                       | Advisory-never-flips; loader-fails-loud; NSM-never-green     |

---

*Phase: 12-demo-ui-tab-integration*
*Spec created: 2026-06-19 (split from original Phase 11)*
*Next step: /gsd-discuss-phase 12 — implementation decisions. Depends on Phase 11 (backend + API).*
