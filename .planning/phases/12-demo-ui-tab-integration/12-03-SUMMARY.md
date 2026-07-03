---
phase: 12-demo-ui-tab-integration
plan: 03
subsystem: frontend
tags: [react-query, hooks, loader-state, typescript, demo-ui]

requires:
  - plan: 12-02
    provides: "mapWorldResponse + parseNullableDate mapper, UPSERT_RESOURCE_GRANT/UPSERT_RESOURCE_DELEGATE reducer actions, QueryClientProvider in demo entry"
provides:
  - "useDigitalResourcesWorld(hasToken): React Query hook fetching+mapping GET /api/digital-resources/world, enabled only when a token exists, retry:false (fail-loud, no stale fallback)"
  - "useIssueGrant/useIssueDelegate: mutations POSTing to /api/digital-resources/grants|delegates, dispatching UPSERT_RESOURCE_GRANT/UPSERT_RESOURCE_DELEGATE into WorldState on success"
  - "hasStoredToken/getStoredUserRole pure helpers reading the main app's localStorage token/user keys (role gate source of truth for 12-04/12-05, D-01 admin-only)"
  - "classifyLoaderState + LoaderState: the six-state loader discriminator (missing-token/loading/unauthorized/error/empty/success) 12-06's DigitalResourcesPanel keys off"
  - "IssueGrantVariables/IssueDelegateVariables mutation-variables types mirroring backend IssueGrantRequest/IssueDelegateRequest field-for-field"
affects: [12-04, 12-05, 12-06]

tech-stack:
  added: []
  patterns:
    - "loader-state classification is a pure function over (hasToken, UseQueryResult-shaped snapshot) — structurally compatible, no adapter, so components pass the query result straight through"

key-files:
  created:
    - frontend/src/demo/hooks/use-digital-resources.ts
    - frontend/src/demo/hooks/use-digital-resources.test.ts
  modified: []

key-decisions:
  - "Tested pure helpers only (no hook-render tests) per 12-CONTEXT.md Claude's Discretion — mirrors demo/lib test discipline without a QueryClientProvider+WorldProvider harness"

requirements-completed: [RSRC-UI-04 (query/mutation hooks), RSRC-UI-06 (upsert dispatch on issue success)]

coverage:
  - id: D1
    description: "hasStoredToken/getStoredUserRole read exactly the token/user localStorage keys auth-context writes; role read never throws on malformed JSON"
    requirement: "RSRC-UI-04"
    verification:
      - kind: unit
        ref: "frontend/src/demo/hooks/use-digital-resources.test.ts"
        status: pass
    human_judgment: false
  - id: D2
    description: "classifyLoaderState discriminates all six loader states incl. ApiError-401 vs other-error vs plain Error, empty (all three entity arrays zero) vs success, and the pre-start loading fallback"
    requirement: "RSRC-UI-04"
    verification:
      - kind: unit
        ref: "frontend/src/demo/hooks/use-digital-resources.test.ts"
        status: pass
    human_judgment: false
  - id: D3
    description: "Full build + suite green: npm run build zero TS errors; 17 files / 225 tests pass (baseline 16/211 + this plan's 14, none lost)"
    requirement: "RSRC-UI-04"
    verification:
      - kind: build+unit
        ref: "npm run build && npm run test"
        status: pass
    human_judgment: false

duration: ~4 min
completed: 2026-07-03
status: complete
---

# Phase 12 Plan 03: Digital-Resource Hooks & Loader-State Helpers Summary

**Built the React Query data layer 12-04/12-05/12-06 consume: `useDigitalResourcesWorld` (token-gated, retry-free, mapWorldResponse-backed), `useIssueGrant`/`useIssueDelegate` mutations that dispatch their mapped server response into WorldState via 12-02's upsert actions, and three unit-tested pure helpers (`hasStoredToken`, `getStoredUserRole`, `classifyLoaderState`) implementing 12-UI-SPEC's six-state loader machine and the admin-only role gate.**

## Task Commits

1. **Task 2/1 (TDD): pure-helper tests** — `57d2e50` (test, RED)
2. **Task 1 (TDD): use-digital-resources.ts** — `df86ce5` (feat, GREEN)

## Accomplishments

- `useDigitalResourcesWorld(hasToken)`: `queryKey ["digital-resources","world"]`, unwraps the `ApiResponse` envelope and maps via 12-02's `mapWorldResponse`; `enabled: hasToken` guarantees no request fires without a token (never a guaranteed-401); `retry: false` + no seed fallback keeps the loader fail-loud
- `useIssueGrant`/`useIssueDelegate`: POST `/api/digital-resources/grants|delegates` with variables types mirroring backend `IssueGrantRequest`/`IssueDelegateRequest` (incl. vestigial-but-required `actor_org_id`/`granted_by_org_id`, 12-RESEARCH Pitfall 4); response mapped through `parseNullableDate` and dispatched as `UPSERT_RESOURCE_GRANT`/`UPSERT_RESOURCE_DELEGATE` — duplicate-submit silence rides on 12-02's replace-or-append reducer
- `classifyLoaderState`: check order missing-token → loading → unauthorized(`ApiError` 401)/error → empty(all three entity arrays zero)/success → loading fallback; structurally accepts a `UseQueryResult` directly
- 14 unit tests over the three pure helpers (jsdom's real localStorage, `beforeEach` clear); no hook-render tests per discretion call

## Deviations from Plan

None - plan executed exactly as written. (Tasks executed in TDD order — test file RED first, implementation GREEN second — so the commit sequence inverts the plan's task numbering, matching 12-02's convention.)

## Verification

- `npx vitest run src/demo/hooks/use-digital-resources.test.ts` — 14/14 pass
- `npm run build` — zero TS errors
- `npm run test` — 225 tests pass (baseline 211 + 14 new, none lost)
- `grep -c 'password123' use-digital-resources.ts` — 0 (no embedded seed credentials)

## Self-Check: PASSED

- frontend/src/demo/hooks/use-digital-resources.ts — FOUND
- frontend/src/demo/hooks/use-digital-resources.test.ts — FOUND
- Commit 57d2e50 — FOUND
- Commit df86ce5 — FOUND
