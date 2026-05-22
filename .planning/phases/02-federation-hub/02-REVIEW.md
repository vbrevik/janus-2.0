---
phase: 02-federation-hub
reviewed: 2026-05-22T00:00:00Z
depth: standard
files_reviewed: 9
files_reviewed_list:
  - frontend/src/demo/lib/contract.ts
  - frontend/src/demo/lib/credential.ts
  - frontend/src/demo/store/world-state.tsx
  - frontend/src/demo/DemoRoot.tsx
  - frontend/src/demo/components/FederationHub.tsx
  - frontend/src/demo/components/HubDiscoveryPanel.tsx
  - frontend/src/demo/components/ExchangeTranscriptPanel.tsx
  - frontend/src/demo/components/CredentialVerifyPanel.tsx
  - frontend/src/demo/components/UnitConsolePanel.tsx
findings:
  critical: 0
  warning: 3
  info: 3
  total: 6
status: issues_found
---

# Phase 02: Code Review Report

**Reviewed:** 2026-05-22
**Depth:** standard
**Files Reviewed:** 9
**Status:** issues_found

## Summary

Reviewed the Phase 2 Federation Hub demo island — nine files comprising the contract helpers, credential HMAC layer, world-state reducer, and four panel components. The demo-island isolation invariant holds (no TanStack Router / routeTree imports). The critical security invariant for this demo — verify-before-trust (D2-10) — holds correctly: `handleRespond` in `ExchangeTranscriptPanel` builds an `UNCLASSIFIED` principal when `verifyResult.valid === false`, and ABAC is only evaluated with verified claims. The FED-01 discovery-without-disclosure invariant holds: `HubDiscoveryPanel` renders only `holdingUnit + domain` from the `hubIndex`, never clearance, tiers, compartments, or decisions. The D2-08 record-hold force-DENY in `computeDetailResponse` is correctly implemented. The StrictMode `cancelled` guard in `FederationHub` and the `alive` guard in `CredentialVerifyPanel` are both correct.

Three warnings and three info items found, all fixable without architectural change.

---

## Warnings

### WR-01: `REQUEST_ATTRIBUTE` reducer logs wrong `AttrOp` — audit trail shows a grant that never happened

**File:** `frontend/src/demo/store/world-state.tsx:264`

**Issue:** The `REQUEST_ATTRIBUTE` case calls `appendEvent(state, action.subjectId, "GRANT_COMPARTMENT", action.value)`. The comment correctly states "a request is LOGGED but mutates NOTHING", yet the logged op is `"GRANT_COMPARTMENT"` — the same op used for an actual approved grant. An auditor reading the event log cannot distinguish a Manager's request from an Access Approver's grant. `AttrOp` has no `"REQUEST_COMPARTMENT"` variant, so either the type needs a new member or a different existing op should be used.

**Fix:** Add `"REQUEST_COMPARTMENT"` to `AttrOp` in `frontend/src/demo/lib/model.ts` and update the reducer:

```typescript
// model.ts — AttrOp union
export type AttrOp =
  | "GRANT_COMPARTMENT"
  | "REVOKE_COMPARTMENT"
  | "REQUEST_COMPARTMENT"   // ← add this
  | "SET_HOLD"
  | "CLEAR_HOLD"
  // ...

// world-state.tsx — REQUEST_ATTRIBUTE case
appendEvent(state, action.subjectId, "REQUEST_COMPARTMENT", action.value)
```

---

### WR-02: `CredentialVerifyPanel` `useEffect` missing `dispatch` in dependency array

**File:** `frontend/src/demo/components/CredentialVerifyPanel.tsx:29`

**Issue:** The `useEffect` closes over `dispatch` but lists only `[fedCredentials.valid, fedCredentials.rogue]` as dependencies:

```typescript
useEffect(() => {
  // ... uses `dispatch`
}, [fedCredentials.valid, fedCredentials.rogue]);  // dispatch missing
```

`useReducer` dispatch is referentially stable across renders, so there is no stale-closure bug in practice. However the project enables `react-hooks/exhaustive-deps` (per `eslint.config.js`), so this produces a lint error. If a future refactor replaces `useWorldDispatch` with a non-stable dispatch source, the stale-closure bug would silently surface.

**Fix:**
```typescript
}, [fedCredentials.valid, fedCredentials.rogue, dispatch]);
```

---

### WR-03: `UnitConsolePanel` inbox footnote incorrectly states ABAC was not evaluated

**File:** `frontend/src/demo/components/UnitConsolePanel.tsx:83-89`

**Issue:** The footnote rendered when `detailResult.decision?.decision === "DENY" && !entry.verifyResult.valid` reads:

> "Credential not verified — ABAC was not evaluated on unverified claims."

This is factually wrong. ABAC *is* evaluated — `computeDetailResponse` always calls `evaluate()` — but it runs on a downgraded `UNCLASSIFIED` principal, not on the unverified claims. The current message implies ABAC was skipped entirely, which could mislead demo viewers about the actual security mechanism.

**Fix:** Correct the message to describe what actually happens:
```tsx
<p className="text-xs text-slate-500 mt-1">
  Credential not verified — ABAC ran on a downgraded UNCLASSIFIED
  principal, not on the untrusted claims.
</p>
```

---

## Info

### IN-01: `as unknown` casts in reducer are necessary but untested at the type boundary

**File:** `frontend/src/demo/store/world-state.tsx:322, 338`

**Issue:** Two casts silence TypeScript at Envelope construction:
- Line 322: `requester: action.requester as unknown` (storing a `Principal`)
- Line 338: `decision: action.detailResult.decision as unknown` (storing a `Decision | null`)

These exist because `Envelope` types in `model.ts` declare `requester: unknown` and `decision: unknown | null` to avoid a circular import. The casts are intentional, but they create a silent type hole: nothing prevents passing a wrong type here, and downstream consumers of `fedTranscript` envelopes must do their own narrowing before use.

**Fix:** No structural change needed for the demo. If transcript entries are ever consumed for more than display (the `envLine` formatter never reads `requester` or `decision`), add a runtime assertion or a branded-type helper at the boundary.

---

### IN-02: `key={i}` (array-index keys) on list items in two components

**File:** `frontend/src/demo/components/HubDiscoveryPanel.tsx:44`, `frontend/src/demo/components/ExchangeTranscriptPanel.tsx:214`

**Issue:** Both `HubDiscoveryPanel` and `ExchangeTranscriptPanel` use the loop index `i` as the React `key` for list items. For these specific lists the data is either static (`hubIndex` pointers, never reordered) or append-only (`fedTranscript`, never reordered or removed), so no diffing bug occurs today. The pattern is nonetheless flagged by React's reconciliation guidance and creates fragility if the lists ever gain delete/reorder capability.

**Fix:** Use a stable identifier where available:
```tsx
// HubDiscoveryPanel — combine holdingUnit + domain for uniqueness
<li key={`${p.holdingUnit}-${p.domain}`} ...>

// ExchangeTranscriptPanel — use transcript position + kind
<li key={`${i}-${e.kind}`} ...>
```

---

### IN-03: `CredentialVerifyPanel` loading state checks `!fedCredentials.valid` but not `!fedCredentials.rogue`

**File:** `frontend/src/demo/components/CredentialVerifyPanel.tsx:33-36`

**Issue:** The loading guard is:
```typescript
if (!fedCredentials.valid || !fedVerifyResults.valid || !fedVerifyResults.rogue) {
  return <Card>…loading…</Card>
}
```

It does not check `!fedCredentials.rogue`. In practice this is safe because `CREDENTIALS_READY` dispatches both `valid` and `rogue` atomically, so if `valid` is non-null, `rogue` is also non-null. The guard is logically incomplete, however, and could silently pass when only one credential is set if the dispatch logic ever changes.

**Fix:**
```typescript
if (
  !fedCredentials.valid ||
  !fedCredentials.rogue ||
  !fedVerifyResults.valid ||
  !fedVerifyResults.rogue
) {
```

---

_Reviewed: 2026-05-22_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
