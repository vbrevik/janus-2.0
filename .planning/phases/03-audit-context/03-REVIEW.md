---
phase: 03-audit-context
reviewed: 2026-05-22T00:00:00Z
depth: standard
files_reviewed: 8
files_reviewed_list:
  - frontend/src/demo/lib/auditlog.ts
  - frontend/src/demo/lib/policy.ts
  - frontend/src/demo/lib/obligations.ts
  - frontend/src/demo/lib/seed.ts
  - frontend/src/demo/components/AuditView.tsx
  - frontend/src/demo/store/world-state.tsx
  - frontend/src/demo/components/ContextView.tsx
  - frontend/src/demo/DemoRoot.tsx
findings:
  critical: 3
  warning: 4
  info: 2
  total: 9
status: issues_found
---

# Phase 03: Code Review Report

**Reviewed:** 2026-05-22T00:00:00Z
**Depth:** standard
**Files Reviewed:** 8
**Status:** issues_found

## Summary

Phase 3 delivers the Audit and Context tabs — event-sourced state reconstruction (`auditlog.ts`), per-unit policy evaluation (`policy.ts`), deployment/shielding context rules (`obligations.ts`), a rich 30-subject seed world (`seed.ts`), and the two React views that wire these together.

The core ABAC logic is sound and well-tested. The critical defects are concentrated in three areas: (1) the `REQUEST_ATTRIBUTE` reducer emits a `GRANT_COMPARTMENT` event that, when replayed by the audit log, will silently grant access to the subject — breaking the SoD crux the code explicitly documents; (2) the `AUTHORIZE_SUBJECT` / `WITHDRAW_AUTHORIZATION` AttrOps exist in the model and are handled by the audit replay engine, but there is no corresponding Action type or reducer case in `world-state.tsx`, making those paths unreachable from the UI; and (3) `whoCanAccess` uses a non-null assertion (`!`) on a value that can legitimately be null when `subjects` contains only a subset of ids referenced by `events`.

---

## Critical Issues

### CR-01: REQUEST_ATTRIBUTE emits GRANT_COMPARTMENT — SoD bypass via audit replay

**File:** `frontend/src/demo/store/world-state.tsx:261-276`

**Issue:** The `REQUEST_ATTRIBUTE` reducer case is documented as "LOGGED but mutates NOTHING" (SoD crux). However, the event it appends uses `op: "GRANT_COMPARTMENT"` — the same op used by `APPROVE_ATTRIBUTE`. When `reconstructSubject` in `auditlog.ts` replays the event log, it will apply this event and add the compartment to the reconstructed subject state, granting access in the audit view even though the Access Approver never approved the request. The SoD invariant is enforced in the live subjects array but silently violated in the reconstructed audit timeline.

```
// world-state.tsx line 271 — current (wrong):
appendEvent(state, action.subjectId, "GRANT_COMPARTMENT", action.value)

// auditlog.ts line 37-39 — replays it unconditionally:
case "GRANT_COMPARTMENT":
  if (e.value && !state.compartments.includes(e.value))
    state.compartments.push(e.value);
```

**Fix:** Introduce a distinct `REQUEST_COMPARTMENT` AttrOp in `model.ts` and emit that instead. Add a corresponding `case "REQUEST_COMPARTMENT":` in `reconstructSubject` that is a no-op (or records a log entry without mutating state). The audit view can display the request event in a distinct style without applying it.

```typescript
// model.ts — add to AttrOp union:
| "REQUEST_COMPARTMENT" // Manager request — logged only, not applied (SoD)

// world-state.tsx — REQUEST_ATTRIBUTE case:
appendEvent(state, action.subjectId, "REQUEST_COMPARTMENT", action.value)

// auditlog.ts — reconstructSubject switch:
case "REQUEST_COMPARTMENT":
  // SoD: request is audit-only; no state mutation.
  break;
```

---

### CR-02: AUTHORIZE_SUBJECT / WITHDRAW_AUTHORIZATION ops are unreachable — dead event path

**File:** `frontend/src/demo/store/world-state.tsx:109-151` (Action type union) and `frontend/src/demo/lib/auditlog.ts:57-69`

**Issue:** `auditlog.ts` handles `AUTHORIZE_SUBJECT` and `WITHDRAW_AUTHORIZATION` ops in `reconstructSubject` (lines 57–68). `model.ts` declares them in `AttrOp`. However, the `Action` union in `world-state.tsx` contains no action type that emits either op, and the `reducer` has no case for triggering them. The only way these ops appear in the event log today is through the hard-coded `INITIAL_EVENTS` seed. No UI action can generate them at runtime, so the Manager's AUTHORIZE / WITHDRAW flow described in the model (D-11 / OQ-A) is entirely inoperable.

The INITIAL_EVENTS seed pre-populates seq 4 (`AUTHORIZE_SUBJECT` for `ca5-subj`), which means the audit view will show `ca5-subj` as AUTHORIZED at T=4 without any actor having triggered the action — potentially misleading the demo audience about causality.

**Fix:** Add Action variants and a reducer case:

```typescript
// world-state.tsx — add to Action union:
| { type: "AUTHORIZE_SUBJECT_ACTION"; subjectId: string }
| { type: "WITHDRAW_AUTHORIZATION_ACTION"; subjectId: string }

// reducer — new cases (alongside TOGGLE_SECURITY_HOLD pattern):
case "AUTHORIZE_SUBJECT_ACTION": {
  const subjects = state.subjects.map((s) => {
    if (s.id !== action.subjectId || !s.authorization) return s;
    const clone = cloneSubject(s);
    clone.authorization = { ...s.authorization!, status: "AUTHORIZED" };
    return clone;
  });
  return {
    ...state,
    subjects,
    events: [...state.events, appendEvent(state, action.subjectId, "AUTHORIZE_SUBJECT")],
    seq: state.seq + 1,
  };
}
```

---

### CR-03: Non-null assertion on reconstructSubject result inside whoCanAccess — crash on partial subject list

**File:** `frontend/src/demo/lib/auditlog.ts:118`

**Issue:** `whoCanAccess` iterates over `subjects` and calls `reconstructSubject(base.id, subjects, events, asOf)!` with a non-null assertion. `reconstructSubject` returns `null` when the subject id is not found in the provided `subjects` array. Because `whoCanAccess` passes `subjects` as both the iteration source and the lookup source, the assertion holds in the current codebase. However, the function signature accepts `subjects: Subject[]` as an injectable parameter (D3-13) — a caller could pass a filtered or partial list as the second argument while still iterating a different list externally. In that case `reconstructSubject` returns `null`, the `!` de-references it, and `evaluateWithAuth(null!, req)` crashes.

Additionally, `HUB_INDEX` in `seed.ts` contains a pointer with `subjectId: "fw3-res"` (line 818) — a resource id, not a subject id. If any future code passes `HUB_INDEX` subject ids as the iteration source, it will call `reconstructSubject("fw3-res", ...)` which returns null and triggers this crash path.

**Fix:** Guard the null result explicitly:

```typescript
export function whoCanAccess(...): AccessRow[] {
  const rows: AccessRow[] = [];
  for (const base of subjects) {
    const state = reconstructSubject(base.id, subjects, events, asOf);
    if (state === null) continue;          // guard — never dereference null
    const decision = evaluateWithAuth(state, req);
    if (decision.decision === "ALLOW")
      rows.push({ subjectId: base.id, name: base.name, decision });
  }
  return rows;
}
```

---

## Warnings

### WR-01: Suppressed exhaustive-deps lint warning masks stale closure in ContextView

**File:** `frontend/src/demo/components/ContextView.tsx:120-129`

**Issue:** `obligationDecision` is computed inside a `useMemo` that passes `subunitWithDeployment` as an argument but lists only `[obligRequester, obligSubunitId, deployment]` in the dependency array. The ESLint exhaustive-deps rule correctly flags `subunitWithDeployment` as a missing dependency; the developer suppressed it with `// eslint-disable-next-line react-hooks/exhaustive-deps`. The suppression is safe _today_ because `subunitWithDeployment` is always rebuilt from the three listed primitives and carries no other state. But the inline comment provides no explanation, so future readers cannot distinguish intentional suppression from accidental one.

`shieldingDecision` at line 147–151 lists both `shieldResId` and `selectedShieldedResource` in deps; `shieldResId` is redundant because `selectedShieldedResource` already depends on it — minor, but contributes to confusion.

**Fix:** Either remove the suppression and add `subunitWithDeployment` to the dep array (which is structurally derived and changes correctly), or replace the comment with a precise rationale. Remove the redundant `shieldResId` from the `shieldingDecision` dep array:

```typescript
// Replace suppressed deps comment with derived-value form:
const obligationDecision = useMemo(
  () => evaluateSubunitAccess(obligRequester, subunitWithDeployment, SUPPORT_OBLIGATIONS),
  [obligRequester, subunitWithDeployment],  // subunitWithDeployment derived from obligSubunitId+deployment
);
```

---

### WR-02: seed.ts mutates module-level exported const arrays at module load time

**File:** `frontend/src/demo/lib/seed.ts:793-823`

**Issue:** `SUBJECTS`, `RESOURCES`, and `HUB_INDEX` are declared as `export const` arrays at lines 45, 94, and 135. The module then calls `.push(...)` on all three at lines 793–823. Any module that imports these arrays before the push statements have executed (e.g., in a test that imports a specific item directly, or if tree-shaking or module evaluation order shifts) will see the truncated seed-head-only data. In practice, ES module evaluation is top-to-bottom and the pushes run as part of module init, so this works currently. However it violates the principle that `export const` arrays are stable references — the exported binding _is_ the same array, but its _contents_ change after export. This is a latent ordering hazard: if any future test does `import { SUBJECTS } from './seed'` and accesses it before the expansion runs, it silently gets 4 subjects instead of the full 30+.

Additionally, the `HUB_INDEX` push at line 818 pushes `{ subjectId: "fw3-res", ... }` — a resource id in a field typed `subjectId: string`. While `HubPointer.subjectId` is typed as `string` (not enforced to be a real subject id), mixing resource ids into a "who holds info about a subject" index is semantically incorrect and will cause silent mismatches in any code that cross-references `HUB_INDEX` against `SUBJECTS`.

**Fix:** Collect all records up front and export as a single frozen array:

```typescript
export const SUBJECTS: Subject[] = [
  ...seedHeadSubjects,
  ...mil1Subjects,
  ...mil2Subjects,
  // ...
];
// Do not push after export
```

For the HUB_INDEX resource pointer, either remove `fw3-res` from the index or add a separate `resourcePointers` export with a distinct type.

---

### WR-03: AuditView initializes asOf to events.length from closed-over seed, not live state

**File:** `frontend/src/demo/components/AuditView.tsx:18`

**Issue:** `useState(events.length)` captures `events.length` as the initial value once, at component mount. The `events` array in `useWorld()` can grow when the user dispatches APPROVE_ATTRIBUTE, REVOKE_ATTRIBUTE, TOGGLE_SECURITY_HOLD, or REQUEST_ATTRIBUTE actions. After a new event is appended, the slider `max` advances to `events.length` but `asOf` stays at its initial value — it does not auto-track "current state" when events are added after mount.

In practice this means: user mounts AuditView with 4 events (asOf=4, slider at max, "Current state" pill visible). User grants a compartment — event 5 appended. Slider max becomes 5, but asOf=4, so the "Current state" pill disappears and the reconstructed view shows the state _before_ the new event. This is confusing for a demo that shows live event appending.

**Fix:** Track whether the user has manually moved the slider. If not, keep asOf pinned to events.length:

```typescript
const [manualAsOf, setManualAsOf] = useState<number | null>(null);
const asOf = manualAsOf ?? events.length;
```

Or accept the current behavior but document it explicitly in the component.

---

### WR-04: evaluateWithPolicy ignores deny overrides in the failed array

**File:** `frontend/src/demo/lib/policy.ts:105`

**Issue:** `evaluateWithPolicy` returns `failed: rules.filter((r) => !r.pass).map((r) => r.name)` at line 105. When a deny override fires (revoked or securityHold), the override entries are in `overrides` but are NOT added to `failed`. The base `evaluate` function in `abac.ts` behaves the same way (failed only includes base rules). This is consistent with the base evaluator, but `evaluateWithAuth` in `auditlog.ts` (line 87) _does_ add `"Authorization valid"` to `failed` when it fires as an override-equivalent rule.

The inconsistency means callers that check `decision.failed` to explain a deny will silently miss override-triggered denies in `evaluateWithPolicy` results — the returned `failed` array will be empty even though the subject is DENY'd by the override. This can produce a confusing "DENY: no rules failed" state in the ContextView DecisionTrace.

**Fix:** Either add override names to `failed` consistently across both evaluators, or document the invariant that `failed` only covers base rules and that callers must also inspect `overrides`.

---

## Info

### IN-01: Dead `REVOKE_ATTRIBUTE` / `SET_REVOKED` mismatch — compartment revoke does not produce a revoke-flag event

**File:** `frontend/src/demo/store/world-state.tsx:212-235` and `frontend/src/demo/lib/auditlog.ts:51-56`

**Issue:** `model.ts` defines `SET_REVOKED` / `CLEAR_REVOKED` ops (R6) and `auditlog.ts` handles them in the replay engine (lines 51–56). However, the reducer has no action that emits these ops. The `REVOKE_ATTRIBUTE` action (line 212) revokes a _compartment_, not the subject's `flags.revoked` field — the naming is misleading relative to the `SET_REVOKED` audit op. There is also no UI action for toggling `flags.revoked` (analogous to `TOGGLE_SECURITY_HOLD`). The `ca3a-subj` (Viktor Novak, revoked) can only be in its revoked state via the seed; no runtime action can toggle it. This is likely intentional for Phase 3 scope but is worth flagging for Phase 4.

---

### IN-02: DemoRoot uses sequential boolean rendering instead of conditional mounting — all views evaluate simultaneously

**File:** `frontend/src/demo/DemoRoot.tsx:52-55`

**Issue:** The view switcher uses four separate `{activeView === "x" && <Component />}` expressions. All four components are in the same render tree during every render pass; only the falsy branch short-circuits rendering. This is fine for correctness. However, `AuditView` and `ContextView` both contain `useMemo` hooks that run on every render of `DemoRoot` even when their view is not active, because React evaluates hooks of _mounted_ components — but since the `&&` short-circuits before the JSX is evaluated, the components are not mounted when inactive, so hooks do not run. This pattern is correct. The note is that switching to a single `{activeView === "audit" ? <AuditView /> : null}` form would be more explicit about the intent. No behavioral impact today.

---

_Reviewed: 2026-05-22T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
