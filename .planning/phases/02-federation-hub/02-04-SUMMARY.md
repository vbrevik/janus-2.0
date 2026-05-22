---
phase: "02"
plan: "04"
subsystem: demo-federation
tags: [federation, credential-verify, transcript, abac, security]
dependency_graph:
  requires:
    - "02-02"  # world-state with federation slices
    - "02-01"  # demo lib (contract.ts, credential.ts, abac.ts, model.ts)
  provides:
    - ExchangeTranscriptPanel  # FED-02: four-step interactive transcript
    - CredentialVerifyPanel    # FED-03: side-by-side rogue/valid outcomes
  affects:
    - "02-06"  # FederationHub.tsx wires imports from these panels
tech_stack:
  added: []
  patterns:
    - verify-before-trust (D2-10): await verifyCredential before computeDetailResponse; Principal built from credential claims only on verifyResult.valid===true
    - stage-machine UI: fedRunStage gates each button; enabled only on its turn; solid-slate active / disabled:opacity-40 inactive
    - cleanup guard: alive boolean in useEffect to prevent setState after unmount
key_files:
  created:
    - frontend/src/demo/components/ExchangeTranscriptPanel.tsx
    - frontend/src/demo/components/CredentialVerifyPanel.tsx
  modified: []
decisions:
  - "verify-before-trust enforced in handleRespond: verifyCredential called first, Principal built from credential claims only if verifyResult.valid===true, otherwise UNCLASSIFIED fallback (D2-10 / T-02-10)"
  - "envLine helper uses unitName() for display (not raw UnitId), matching UI-SPEC envelope format"
  - "MockTag rendered only on the rogue/rejected card (never on valid/trusted), as required by D2-10 and MODEL-03"
  - "useEffect dependency array on [fedCredentials.valid, fedCredentials.rogue] for idempotent re-verify on credential change"
metrics:
  duration_minutes: 15
  completed_date: "2026-05-22"
  tasks_completed: 2
  files_created: 2
  files_modified: 0
---

# Phase 2 Plan 04: Exchange Transcript Panel and Credential Verify Panel Summary

**One-liner:** FED-02 four-step stage machine with verify-before-trust RESPOND handler and FED-03 side-by-side rogue-reject/valid-accept credential verification panels.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create ExchangeTranscriptPanel — FED-02 four-step interactive transcript | fe8b616 | frontend/src/demo/components/ExchangeTranscriptPanel.tsx |
| 2 | Create CredentialVerifyPanel — FED-03 side-by-side rogue/valid outcomes | aca2e58 | frontend/src/demo/components/CredentialVerifyPanel.tsx |

## What Was Built

### ExchangeTranscriptPanel (FED-02)

Four-step interactive stage machine (`IDLE → PUBLISHED → DISCOVERED → REQUESTED → RESPONDED`) for demonstrating the typed envelope contract. Key features:

- **Stage buttons**: Publish / Discover / Request detail / Respond — each enabled only on its turn; others are `disabled:opacity-40`. Active stage uses solid slate (`bg-slate-800 text-white`).
- **Exchange parameters** (requester unit, holder unit, subject, domain) locked via disabled selects once `fedRunStage !== 'IDLE'`.
- **Async `handleRespond`** (D2-10 verify-before-trust):
  1. `await verifyCredential(fedCredentials.valid)` — verify FIRST
  2. `Principal` built from credential claims **only if** `verifyResult.valid === true`; otherwise fallback to UNCLASSIFIED principal
  3. `computeDetailResponse(principal, subject, holderUnit)` — ABAC runs on verified claims only
  4. `dispatch(FEDERATION_RESPOND)` carries verified `requester: Principal`
- **"New run" button** shown only at `RESPONDED` stage; dispatches `FEDERATION_RESET` (clears transcript only, inbox/outbox preserved per D2-06)
- **`envLine` helper** formats all 5 Envelope kinds in `font-mono text-xs` per UI-SPEC
- **Default selections**: `MILITARY_1` requester, `MILITARY_2` holder, `subj-2` subject, `DATA` domain — the guaranteed-ALLOW triple

### CredentialVerifyPanel (FED-03)

Auto-verifying side-by-side credential verification panel. Key features:

- **Auto-verify `useEffect`** keyed on `[fedCredentials.valid, fedCredentials.rogue]` — fires when credentials are ready (after `CREDENTIALS_READY`), verifies both, dispatches `CREDENTIAL_VERIFY_RESULTS`
- **`alive` cleanup guard** prevents dispatch after unmount
- **Loading state**: renders `"Signing credentials…"` until `fedCredentials.valid` is populated and verify results arrive
- **Rogue card (left, red)**: `✗ REJECTED` verdict + `verifyResult.reason` + `MockTag [MOCK]` + ABAC footnote
- **Valid card (right, green)**: `✓ TRUSTED` verdict + `verifyResult.reason`
- `MockTag` appears only on the rogue/rejected card (MODEL-03 invariant)

## Deviations from Plan

None — plan executed exactly as written.

## Threat Mitigations Applied

| Threat ID | Mitigation |
|-----------|------------|
| T-02-10 | `handleRespond` calls `verifyCredential` before `computeDetailResponse`; Principal built from claims only if `verifyResult.valid === true`; unverified path uses UNCLASSIFIED principal (which DENY-s in ABAC) |
| T-02-11 | `CredentialVerifyPanel` auto-verifies both ROGUE-ISSUER and valid-issuer credentials on mount; rogue path always shown with `MockTag [MOCK]` |
| T-02-12 | `FEDERATION_REQUEST_DETAIL` carries intentional minimal/UNCLASSIFIED principal (records intent); real verified principal dispatched in `FEDERATION_RESPOND` |

## Known Stubs

None. Both panels wire real data from world-state: `fedTranscript`, `fedRunStage`, `fedCredentials`, `fedVerifyResults`, `subjects` — all populated by the reducer from seed and async operations.

## Self-Check: PASSED

- [x] `frontend/src/demo/components/ExchangeTranscriptPanel.tsx` exists
- [x] `frontend/src/demo/components/CredentialVerifyPanel.tsx` exists
- [x] Commit `fe8b616` exists (Task 1)
- [x] Commit `aca2e58` exists (Task 2)
- [x] `npx tsc --noEmit --project tsconfig.app.json` exits 0
- [x] `await verifyCredential` appears before `computeDetailResponse` in `handleRespond`
- [x] `MockTag` appears only in the rogue/rejected block of `CredentialVerifyPanel`
