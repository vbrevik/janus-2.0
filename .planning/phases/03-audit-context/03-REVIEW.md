---
phase: 03-audit-context
reviewed: 2026-05-22T12:00:00Z
depth: quick
files_reviewed: 9
files_reviewed_list:
  - frontend/src/demo/lib/auditlog.ts
  - frontend/src/demo/lib/policy.ts
  - frontend/src/demo/lib/obligations.ts
  - frontend/src/demo/lib/seed.ts
  - frontend/src/demo/components/AuditView.tsx
  - frontend/src/demo/store/world-state.tsx
  - frontend/src/demo/components/ContextView.tsx
  - frontend/src/demo/DemoRoot.tsx
  - frontend/src/demo/lib/model.ts
findings:
  critical: 0
  warning: 0
  info: 2
  total: 2
status: clean
---

# Phase 03: Code Review Report (Re-review after fixes)

**Reviewed:** 2026-05-22T12:00:00Z
**Depth:** quick (re-review; focused verification of CR-01..03 and WR-01..04 fixes)
**Files Reviewed:** 9
**Status:** issues_found

## Summary

All six originally reported critical and warning issues were addressed. CR-01, CR-02, CR-03, WR-02, WR-03, and WR-04 are fully resolved with correct implementations. However, the WR-01 fix introduced a new warning: the `obligationDecision` useMemo dependency array now lists `subunitWithDeployment` — an inline-constructed object that is a new reference on every render — which causes the memo to recompute on every render of ContextView, defeating its purpose. One additional warning is recorded for this regression.

The two original info items (IN-01, IN-02) remain unchanged and are carried forward below.

---

## Fix Verification

### CR-01 — RESOLVED

`REQUEST_ATTRIBUTE` reducer in `world-state.tsx` (line 275) now calls `appendEvent(state, action.subjectId, "REQUEST_COMPARTMENT", action.value)`. `auditlog.ts` handles `REQUEST_COMPARTMENT` with a no-op case (lines 70-72, comment: "SoD: request is audit-only; no state mutation"). The SoD crux is preserved.

### CR-02 — RESOLVED

`AUTHORIZE_SUBJECT_ACTION` and `WITHDRAW_AUTHORIZATION_ACTION` are present in the Action union (`world-state.tsx` lines 121-122) and have correct reducer cases (lines 281-315) that clone the subject, update `authorization.status`, and append the corresponding `AttrOp` event. The previously unreachable audit ops are now reachable from the UI.

### CR-03 — RESOLVED

`whoCanAccess` in `auditlog.ts` (line 122) now guards with `if (state === null) continue;` using strict equality, not a boolean coercion. The non-null assertion has been removed.

### WR-02 — RESOLVED (partial)

The `fw3-res` entry (a resource id in a subject-id field) has been removed from the `HUB_INDEX.push()` call in `seed.ts` (confirmed by comment at line 818). The broader mutable-push pattern for `SUBJECTS`, `RESOURCES`, and `HUB_INDEX` remains as-is, which is acceptable given this is a demo context.

### WR-03 — RESOLVED

`AuditView.tsx` now uses `const [manualAsOf, setManualAsOf] = useState<number | null>(null)` and `const asOf = manualAsOf ?? events.length` (lines 19-20). The slider now auto-tracks "current state" until the user manually moves it.

### WR-04 — RESOLVED

`evaluateWithPolicy` in `policy.ts` (lines 104-108) now includes `...overrides.map((r) => r.name)` in the `failed` array, making override-triggered denies visible to callers that inspect `decision.failed`.

---

## Warnings

### WR-05: obligationDecision useMemo deps include inline-constructed object — memo never hits

**File:** `frontend/src/demo/components/ContextView.tsx:116-129`

**Issue:** The WR-01 fix changed the dependency array from `[obligRequester, obligSubunitId, deployment]` (primitives) to `[obligRequester, subunitWithDeployment]` (derived object). `subunitWithDeployment` is constructed inline at line 118:

```typescript
const subunitWithDeployment = { ...selectedSubunit, deployment };
```

This creates a new object reference on every render. React's `useMemo` uses `Object.is` for dependency comparison — two distinct object references with identical contents are never `Object.is`-equal. As a result, `obligationDecision` recomputes on every render of `ContextView`, regardless of whether `obligRequester`, `obligSubunitId`, or `deployment` actually changed. The memo provides no memoization benefit.

The inline comment at lines 127-129 states "listing the derived object is correct — it changes whenever either primitive changes." This is incorrect: the object always changes (new reference each render), not only when the primitives change.

**Fix:** Replace the derived object in the dep array with the two primitives it comes from:

```typescript
const obligationDecision = useMemo(
  () =>
    evaluateSubunitAccess(
      obligRequester,
      subunitWithDeployment,
      SUPPORT_OBLIGATIONS,
    ),
  [obligRequester, obligSubunitId, deployment], // primitives, not the derived object
);
```

---

## Info

### IN-01: Dead `REVOKE_ATTRIBUTE` / `SET_REVOKED` mismatch — compartment revoke does not produce a revoke-flag event

**File:** `frontend/src/demo/store/world-state.tsx:212-235` and `frontend/src/demo/lib/auditlog.ts:51-56`

**Issue:** `model.ts` defines `SET_REVOKED` / `CLEAR_REVOKED` ops (R6) and `auditlog.ts` handles them in the replay engine (lines 51-56). However, the reducer has no action that emits these ops. The `REVOKE_ATTRIBUTE` action revokes a compartment, not `flags.revoked` — the naming is misleading relative to `SET_REVOKED`. The `ca3a-subj` (Viktor Novak, revoked) can only be in its revoked state via the seed; no runtime action can toggle it. Likely intentional for Phase 3 scope; flag for Phase 4.

---

### IN-02: DemoRoot uses sequential boolean rendering — all views share render path

**File:** `frontend/src/demo/DemoRoot.tsx:52-55`

**Issue:** Four `{activeView === "x" && <Component />}` expressions render sequentially. Components are not mounted when inactive (the `&&` short-circuits), so hooks do not run for inactive views. Behavior is correct. Using `{activeView === "audit" ? <AuditView /> : null}` form would make intent more explicit. No behavioral impact today.

---

_Reviewed: 2026-05-22T12:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: quick (re-review)_
