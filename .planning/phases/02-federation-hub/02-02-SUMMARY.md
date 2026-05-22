---
phase: 02-federation-hub
plan: "02"
subsystem: ui
tags: [react, typescript, useReducer, federation, abac, credentials]

# Dependency graph
requires:
  - phase: 02-01
    provides: contract.ts (buildDiscoverEnvelopes, DetailResult), credential.ts (VerifyResult, issueCredential, verifyCredential), model.ts (Credential, Envelope), abac.ts (Principal)
provides:
  - Extended world-state.tsx single store with full federation state slices (fedCredentials, fedRunStage, fedTranscript, fedInbox, fedOutbox, fedVerifyResults)
  - InboxEntry and OutboxEntry exported interfaces for panel consumers
  - Seven new Action union members covering the complete federation protocol lifecycle
  - Seven new reducer cases implementing the federation state machine
affects:
  - 02-03-PLAN (CredentialPanel reads fedCredentials, dispatches CREDENTIALS_READY + CREDENTIAL_VERIFY_RESULTS)
  - 02-04-PLAN (ExchangeTranscriptPanel reads fedTranscript, dispatches FEDERATION_PUBLISH through FEDERATION_RESPOND)
  - 02-05-PLAN (InboxOutboxPanel reads fedInbox/fedOutbox)
  - 02-06-PLAN (integration test reads all federation slices from useWorld())

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Federation state machine via fedRunStage literal union IDLE->PUBLISHED->DISCOVERED->REQUESTED->RESPONDED"
    - "Append-only durable history: fedInbox/fedOutbox never cleared by FEDERATION_RESET (Pitfall 7 guard)"
    - "verify-before-trust: requester Principal carried on FEDERATION_RESPOND action; reducer stores action.requester directly in InboxEntry"
    - "Circular import avoidance: Envelope.requester typed as unknown in model.ts; cast at site with as unknown"

key-files:
  created: []
  modified:
    - frontend/src/demo/store/world-state.tsx

key-decisions:
  - "Credential type imported from model.ts (not credential.ts) — Credential interface lives in model.ts; VerifyResult lives in credential.ts"
  - "FEDERATION_RESET clears only fedTranscript and resets fedRunStage — fedInbox and fedOutbox are durable append-only history per Pitfall 7"
  - "requester: Principal carried on FEDERATION_RESPOND action so reducer stores it directly in InboxEntry.requester without re-deriving from credential"

patterns-established:
  - "Federation actions do not advance seq for bootstrap-only actions (CREDENTIALS_READY, CREDENTIAL_VERIFY_RESULTS)"
  - "All other federation actions advance seq to mark a user-driven mutation"

requirements-completed: [FED-01, FED-02, FED-03, FED-04]

# Metrics
duration: 15min
completed: 2026-05-22
---

# Phase 2 Plan 02: Federation Hub World-State Extension Summary

**Single-store useReducer extended with 6 federation slices, 2 entry interfaces (InboxEntry/OutboxEntry), 7 new Action members, and 7 reducer cases implementing the full ABAC federation state machine**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-05-22T05:12:49Z
- **Completed:** 2026-05-22T05:30:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Added `InboxEntry` and `OutboxEntry` as exported interfaces (Wave 3 panels consume these)
- Extended `WorldState` with 6 new federation fields all initialized to zero values in `seedWorld()`
- Added 7 `Action` union members covering the complete federation protocol (CREDENTIALS_READY, CREDENTIAL_VERIFY_RESULTS, FEDERATION_PUBLISH, FEDERATION_DISCOVER, FEDERATION_REQUEST_DETAIL, FEDERATION_RESPOND, FEDERATION_RESET)
- Implemented all 7 reducer cases including FEDERATION_RESET's append-only invariant (inbox/outbox preserved) and verify-before-trust pattern (requester Principal stored directly from action)
- TypeScript compiles cleanly (`npx tsc --noEmit` exits 0)

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend WorldState with federation slices and action handlers** - `7328516` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `frontend/src/demo/store/world-state.tsx` - Extended with 6 WorldState fields, 2 interfaces, 7 action members, 7 reducer cases; existing cases unmodified

## Decisions Made
- `Credential` type imported from `model.ts` not `credential.ts` — the interface lives in model.ts; credential.ts only exports async functions and `VerifyResult`
- `FEDERATION_RESET` clears only `fedTranscript` and resets `fedRunStage` to IDLE; `fedInbox` and `fedOutbox` are intentionally excluded (append-only durable audit history per Pitfall 7)
- `requester: Principal` carried on the `FEDERATION_RESPOND` action so the reducer stores it directly in `InboxEntry.requester` without re-deriving from credential claims (T-02-04 mitigation)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Corrected Credential import source**
- **Found during:** Task 1
- **Issue:** Plan's read_first listed `credential.ts` as source for `Credential` type but the interface lives in `model.ts`; `credential.ts` imports it from model and does not re-export it
- **Fix:** Added `type Credential` to the existing `../lib/model` import block instead of importing from `../lib/credential`
- **Files modified:** `frontend/src/demo/store/world-state.tsx`
- **Verification:** `npx tsc --noEmit` exits 0 after fix
- **Committed in:** `7328516` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug: wrong import source)
**Impact on plan:** Necessary correctness fix; no scope change.

## Issues Encountered
- Initial import of `Credential` from `credential.ts` failed TypeScript check with TS2459 "declares locally but not exported"; resolved by importing from `model.ts` where it is actually exported.

## Threat Model Coverage

| Threat ID | Status | Notes |
|-----------|--------|-------|
| T-02-04 | Mitigated | `requester: Principal` on FEDERATION_RESPOND; reducer stores `action.requester` directly in InboxEntry |
| T-02-05 | Mitigated | FEDERATION_RESET case does not touch fedInbox/fedOutbox |
| T-02-06 | Accepted | fedCredentials stores MOCK HMAC-signed demo credentials; demo island only |
| T-02-SC | Accepted | No new packages installed |

## Next Phase Readiness
- Wave 3 panels (02-03 CredentialPanel, 02-04 ExchangeTranscriptPanel, 02-05 InboxOutboxPanel) can now be built in parallel — all read from `useWorld()` and dispatch the typed actions defined here
- `InboxEntry` and `OutboxEntry` types are exported and ready for panel imports
- No blockers

---
*Phase: 02-federation-hub*
*Completed: 2026-05-22*
