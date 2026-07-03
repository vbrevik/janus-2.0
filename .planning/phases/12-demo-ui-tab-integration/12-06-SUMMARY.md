---
phase: 12-demo-ui-tab-integration
plan: 06
subsystem: frontend
tags: [react, react-query, loader-state-machine, tab-integration, demo-ui]

requires:
  - plan: 12-02
    provides: "SET_DIGITAL_RESOURCES reducer action, QueryClientProvider in demo main.tsx"
  - plan: 12-03
    provides: "hasStoredToken, useDigitalResourcesWorld, classifyLoaderState, LoaderState"
  - plan: 12-04
    provides: "ResourceBrowser component"
  - plan: 12-05
    provides: "ResourceAccessExplorer component"
provides:
  - "DigitalResourcesPanel (exported): 6-state loader gate (missing-token/loading/unauthorized/error/empty/success) per 12-UI-SPEC's state-to-render map — exact copy, Retry only in error state, no seed fallback — dispatching SET_DIGITAL_RESOURCES via useEffect on query success and hosting the Resource Browser / Access Resolution internal sub-nav"
  - "DemoRoot 7th tab 'Digital Resources' (ActiveView 'digital-resources') rendering DigitalResourcesPanel — all Phase 12 artifacts now reachable from the demo UI"
affects: []

tech-stack:
  added: []
  patterns:
    - "Loader-state gate as early-return chain: one if-block per non-success LoaderState returning before the sub-nav renders — mutual exclusivity by construction; success dispatch via useEffect on [query.isSuccess, query.data] (React Query v5 has no useQuery onSuccess)"

key-files:
  created:
    - frontend/src/demo/components/digital-resources-panel.tsx
  modified:
    - frontend/src/demo/DemoRoot.tsx

key-decisions:
  - "hasStoredToken() computed directly per render (no memoization) — demo has no login flow, value stable per session, matches 12-RESEARCH's code example"
  - "query passed straight into classifyLoaderState — UseQueryResult is structurally compatible with LoaderSnapshot, no adapter"
  - "Sub-nav useState declared before the early-return chain so hooks run unconditionally in every loader state"

requirements-completed: [RSRC-UI-01, RSRC-UI-04]

coverage:
  - id: D1
    description: "Exactly one of six mutually-exclusive loader states renders; missing-token never fires GET /world (query enabled=hasToken) and shows no Retry; Retry appears only in error; loading copy uses the single Unicode ellipsis; no seedWorld fallback path exists"
    requirement: "RSRC-UI-04"
    verification:
      - kind: build+grep
        ref: "grep seedWorld==0, 'Loading digital resource data…'==1, Retry==1 (line 78, error branch only), onSuccess only in a comment (0 inside useQuery)"
        status: pass
    human_judgment: false
  - id: D2
    description: "On query success SET_DIGITAL_RESOURCES dispatches via useEffect and the Resource Browser / Access Resolution sub-nav renders; DemoRoot's 7th 'Digital Resources' tab renders DigitalResourcesPanel with the other six tabs unchanged"
    requirement: "RSRC-UI-01"
    verification:
      - kind: build+grep
        ref: "grep '\"digital-resources\"' DemoRoot.tsx==4 (>=3), 'Digital Resources' label==1; DemoRoot diff is +10/-1 (import, union member, button, main conditional only)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Phase-level bar: routeTree.gen.ts byte-identical, frontend build zero TS errors, full suite green with only additive test growth, Phase 11 security suite unrelaxed"
    requirement: "RSRC-UI-04"
    verification:
      - kind: build+unit+diff
        ref: "git diff --stat -- frontend/src/routeTree.gen.ts empty; npm run build clean; npm run test 17 files / 225 tests pass (>= 15/194 baseline); cargo test --test security_hardening_test -- --include-ignored: 13 passed, 0 failed"
        status: pass
    human_judgment: false

duration: ~5 min
completed: 2026-07-03
status: complete
---

# Phase 12 Plan 06: Digital Resources Tab Integration Summary

**Built `DigitalResourcesPanel` — the fail-loud 6-state loader gate (missing-token / loading / unauthorized / error / empty / success, exact 12-UI-SPEC copy and classes, Retry only in the error state, zero seed-fallback paths) that fetches the `/world` aggregate token-gated, dispatches `SET_DIGITAL_RESOURCES` via `useEffect` on success, and hosts the Resource Browser / Access Resolution sub-nav — then wired it into `DemoRoot` as the 7th "Digital Resources" tab, making every Phase 12 artifact reachable with `routeTree.gen.ts` byte-identical.**

## Task Commits

1. **Task 1: DigitalResourcesPanel — 6-state loader gate + sub-nav** — `70da250` (feat)
2. **Task 2: Wire Digital Resources tab into DemoRoot + phase verification** — `4a92443` (feat)

## Accomplishments

- `digital-resources-panel.tsx`: `hasStoredToken()` gates `useDigitalResourcesWorld(hasToken)` (missing-token never fires the request); `classifyLoaderState(hasToken, query)` drives an early-return chain — destructive-toned blocks for missing-token/unauthorized/error (Retry button only in error, calling `query.refetch()`), `Loader2` spinner + "Loading digital resource data…" for loading, centered slate note for empty
- Success state renders the internal sub-nav mirroring `physical-access-panel.tsx` (`px-4 py-2`, active `bg-slate-800 text-white`) with exact labels "Resource Browser" / "Access Resolution" conditionally rendering `<ResourceBrowser />` / `<ResourceAccessExplorer />` — first compile-time exercise of both 12-04/12-05 exports
- Dispatch follows 12-RESEARCH Pitfall 3: `useEffect` watching `[query.isSuccess, query.data, dispatch]`, never `useQuery({ onSuccess })`
- `DemoRoot.tsx`: `"digital-resources"` appended to `ActiveView`, 7th button copying the exact existing-tab template, `{activeView === "digital-resources" && <DigitalResourcesPanel />}` after the physical-access line — no other line touched

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- `npm run build` — zero TS errors (both tasks)
- `npm run test` — 17 files / 225 tests, all pass (>= pre-phase baseline of 15 files / 194 tests; only additive growth across the phase)
- `git diff --stat -- frontend/src/routeTree.gen.ts` — empty (byte-identical, zero route impact from the phase)
- `cargo test --test security_hardening_test -- --include-ignored` — 13 passed; 0 failed (Phase 11 guards unrelaxed; Phase 12 touched zero files under `backend/src/`)
- Acceptance greps: `seedWorld` 0, exact-ellipsis loading copy 1, `Retry` 1 (error branch only), `onSuccess` 0 inside `useQuery(` (single occurrence is an explanatory comment), `"digital-resources"` 4 in DemoRoot, `Digital Resources` label 1
- Live walkthrough (toggle round-trip, policy-shift, issuing flows, role-gated affordances) deferred to `/gsd-verify-work` conversational UAT per 12-CONTEXT.md

## Self-Check: PASSED

- frontend/src/demo/components/digital-resources-panel.tsx — FOUND
- Commit 70da250 — FOUND
- Commit 4a92443 — FOUND
