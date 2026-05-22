---
phase: 02-federation-hub
plan: "03"
subsystem: ui
tags: [react, typescript, federation, demo-island, abac, credentials]

# Dependency graph
requires:
  - phase: 02-01
    provides: credential.ts (issueCredential, ISSUER_KEYS)
  - phase: 02-02
    provides: world-state.tsx (useWorld, useWorldDispatch, CREDENTIALS_READY action, hubIndex slice)
provides:
  - DemoRoot interim view toggle (local useState) between Decision Explorer and Federation Hub
  - FederationHub top-level surface scaffold with async credential bootstrap (D2-09)
  - HubDiscoveryPanel implementing FED-01 discovery-without-disclosure
affects:
  - 02-04-PLAN (ExchangeTranscriptPanel + CredentialVerifyPanel render into FederationHub null slots)
  - 02-05-PLAN (UnitConsolePanel renders into FederationHub null slot)
  - 02-06-PLAN (final wiring replaces the null slots with real panel imports)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Interim view toggle = local useState in DemoRoot (D2-04) — not router, not world-state, throwaway for Phase 4"
    - "Async credential bootstrap useEffect with cancelled guard (D2-09) — Promise.all over issueCredential, dispatch CREDENTIALS_READY once at mount, StrictMode-safe"
    - "Discovery-without-disclosure (FED-01): hub renders only holdingUnit + domain; clearance/tiers/compartments/decision explicitly excluded"
    - "FederationHub renders {null} for not-yet-built sibling panels (no stub files) — disjoint Wave-3 file ownership"

key-files:
  created:
    - frontend/src/demo/components/FederationHub.tsx
    - frontend/src/demo/components/HubDiscoveryPanel.tsx
  modified:
    - frontend/src/demo/DemoRoot.tsx

key-decisions:
  - "Interim toggle is local useState in DemoRoot (D2-04); DemoBanner + RoleSwitcherHeader stay siblings of <main> so both views always show them (R7)"
  - "No stub files created for ExchangeTranscriptPanel/CredentialVerifyPanel/UnitConsolePanel — FederationHub renders {null} placeholders (checker fix for Wave-3 parallel safety / disjoint file ownership)"
  - "Credential error surfaced via bg-destructive/10 inline div per CLAUDE.md error pattern, with exact UI-SPEC copy"

patterns-established:
  - "Demo-island router isolation maintained — DemoRoot + FederationHub import no @tanstack/react-router and no routeTree.gen.ts (grep count 0)"

requirements-completed: [FED-01]

# Metrics
duration: closeout
completed: 2026-05-22
---

# Phase 2 Plan 03: DemoRoot Toggle + FederationHub Scaffold + Hub Discovery Summary

**Interim view toggle, the federation surface scaffold with async credential bootstrap (D2-09), and the FED-01 discovery-without-disclosure panel — the Wave-3 entry point that later panels render into.**

## Performance

- **Duration:** executor closeout (original executor agent created all files but lost API connection before commit/SUMMARY; orchestrator verified and closed out)
- **Completed:** 2026-05-22
- **Tasks:** 2
- **Files created:** 2, modified: 1

## Accomplishments
- `DemoRoot.tsx` — added a local `useState` interim toggle (D2-04) switching `<main>` between `DecisionExplorer` and `FederationHub`; `DemoBanner` + `RoleSwitcherHeader` remain siblings of `<main>` (R7), router-isolated by construction
- `FederationHub.tsx` — top-level federation surface; async credential-bootstrap `useEffect` with `cancelled` guard signs the valid + rogue credentials once at mount and dispatches `CREDENTIALS_READY` (D2-09); inline error path uses the CLAUDE.md `bg-destructive/10` pattern with the exact UI-SPEC copy; renders `HubDiscoveryPanel` + `{null}` for the three sibling panels not yet built
- `HubDiscoveryPanel.tsx` — FED-01: subject selector → hub pointer list rendering ONLY `holdingUnit` + `domain`; explicit "What the hub does NOT store" callout (clearance / tiers / compartments / decision struck through); contextual empty state
- TypeScript compiles cleanly (`npx tsc --noEmit` exits 0); demo-island router isolation verified (grep count 0)

## Task Commits

1. **Task 1: DemoRoot interim toggle + FederationHub scaffold** - `119b51b` (feat)
2. **Task 2: HubDiscoveryPanel (FED-01)** - `8a8c898` (feat)

## Files Created/Modified
- `frontend/src/demo/DemoRoot.tsx` - added interim view toggle + FederationHub mount
- `frontend/src/demo/components/FederationHub.tsx` - federation surface scaffold + credential bootstrap
- `frontend/src/demo/components/HubDiscoveryPanel.tsx` - FED-01 discovery-without-disclosure panel

## Decisions Made
- Interim toggle is a throwaway local `useState` (D2-04) — not added to world-state, not the router; Phase 4 shell replaces it
- No stub files for the sibling panels — `{null}` placeholders keep Wave-3 file ownership disjoint (the checker-required fix)

## Deviations from Plan

### Execution anomaly (infrastructure, not code)
**1. Executor API connection lost before commit/SUMMARY**
- **Found during:** orchestration of Wave 3
- **Issue:** the gsd-executor agent created all three files correctly but the API connection was refused before it could commit or write SUMMARY.md
- **Fix:** orchestrator verified the partial output against the plan acceptance criteria (tsc exit 0, router-isolation 0, all cross-file contracts present), then committed the two task chunks and wrote this SUMMARY (manual closeout per safe-resume gate)
- **Verification:** `npx tsc --noEmit` exits 0; `grep -c "from '@tanstack\|routeTree"` returns 0 for both files; `CREDENTIALS_READY` dispatch shape matches the world-state Action union
- **Committed in:** `119b51b`, `8a8c898`

---

**Total deviations:** 1 (infrastructure — executor connection loss, recovered via manual closeout). No code scope change.

## Threat Model Coverage

| Threat ID | Status | Notes |
|-----------|--------|-------|
| FED-01 hub-no-sensitive-fields | Mitigated | HubDiscoveryPanel renders only holdingUnit + domain; clearance/compartments/tiers/decision never rendered |
| D2-09 credential bootstrap | Mitigated | Credentials signed once at mount via Web Crypto; cancelled guard prevents StrictMode double-dispatch |
| Demo-island isolation | Mitigated | No @tanstack/react-router import, no routeTree.gen.ts change |
| [MOCK] credential | Accepted | Credentials are MOCK HMAC-signed demo fixtures; demo island only |

## Next Phase Readiness
- FederationHub exposes three `{null}` slots ready for 02-04 (ExchangeTranscriptPanel, CredentialVerifyPanel) and 02-05 (UnitConsolePanel); 02-06 swaps the placeholders for real imports
- No blockers

## Self-Check: PASSED

---
*Phase: 02-federation-hub*
*Completed: 2026-05-22*
