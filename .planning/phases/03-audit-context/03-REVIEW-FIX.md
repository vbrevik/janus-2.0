---
phase: 03-audit-context
fixed_at: 2026-05-22T15:57:00Z
review_path: .planning/phases/03-audit-context/03-REVIEW.md
iteration: 1
findings_in_scope: 7
fixed: 7
skipped: 0
status: all_fixed
---

# Phase 03: Code Review Fix Report

**Fixed at:** 2026-05-22T15:57:00Z
**Source review:** .planning/phases/03-audit-context/03-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 7 (3 Critical + 4 Warning; IN-01 and IN-02 excluded per instructions)
- Fixed: 7
- Skipped: 0

## Fixed Issues

### CR-01: REQUEST_ATTRIBUTE emits GRANT_COMPARTMENT — SoD bypass via audit replay

**Files modified:** `frontend/src/demo/lib/model.ts`, `frontend/src/demo/store/world-state.tsx`, `frontend/src/demo/lib/auditlog.ts`
**Commit:** e71695b
**Applied fix:** Added `"REQUEST_COMPARTMENT"` to the `AttrOp` union in model.ts. Changed the `REQUEST_ATTRIBUTE` reducer case in world-state.tsx to emit `"REQUEST_COMPARTMENT"` instead of `"GRANT_COMPARTMENT"`. Added a no-op `case "REQUEST_COMPARTMENT": break;` in `reconstructSubject` in auditlog.ts so audit replay does not apply the request as a grant.

---

### CR-02: AUTHORIZE_SUBJECT / WITHDRAW_AUTHORIZATION unreachable from UI

**Files modified:** `frontend/src/demo/store/world-state.tsx`
**Commit:** e71695b
**Applied fix:** Added `AUTHORIZE_SUBJECT_ACTION` and `WITHDRAW_AUTHORIZATION_ACTION` to the `Action` union. Added reducer cases following the `TOGGLE_SECURITY_HOLD` pattern: each clones the subject, updates `authorization.status`, appends the corresponding `AUTHORIZE_SUBJECT` or `WITHDRAW_AUTHORIZATION` event, and increments seq.

---

### CR-03: Non-null assertion crash in whoCanAccess

**Files modified:** `frontend/src/demo/lib/auditlog.ts`
**Commit:** e71695b
**Applied fix:** Replaced `reconstructSubject(base.id, subjects, events, asOf)!` with an explicit null check: `const state = reconstructSubject(...); if (state === null) continue;` — eliminating the crash path on partial subject lists.

---

### WR-01: Suppressed exhaustive-deps in ContextView

**Files modified:** `frontend/src/demo/components/ContextView.tsx`
**Commit:** e71695b
**Applied fix:** Removed the `eslint-disable-next-line` suppression from `obligationDecision`; updated its dep array to `[obligRequester, subunitWithDeployment]` with an inline comment explaining the derived-value relationship. Removed the redundant `shieldResId` from the `shieldingDecision` dep array (kept only `selectedShieldedResource`).

---

### WR-02: seed.ts HUB_INDEX contains fw3-res (a resource id, not a subject id)

**Files modified:** `frontend/src/demo/lib/seed.ts`
**Commit:** e71695b
**Applied fix:** Removed the `{ subjectId: "fw3-res", holdingUnit: "INDUSTRY", domain: "DATA" }` entry from the HUB_INDEX push block. No fw3-subj subject exists in the seed; the entry was semantically incorrect (resource id in a subject id field).

---

### WR-03: AuditView asOf doesn't track live events

**Files modified:** `frontend/src/demo/components/AuditView.tsx`
**Commit:** e71695b
**Applied fix:** Replaced `const [asOf, setAsOf] = useState(events.length)` with a two-variable pattern: `const [manualAsOf, setManualAsOf] = useState<number | null>(null)` and `const asOf = manualAsOf ?? events.length`. The slider `onChange` now calls `setManualAsOf`. When `manualAsOf` is null (user has not moved the slider), `asOf` automatically tracks `events.length` as new events are appended. The "Current state" pill check `asOf === events.length` continues to work correctly with the derived value.

---

### WR-04: evaluateWithPolicy override denies not reflected in failed array

**Files modified:** `frontend/src/demo/lib/policy.ts`
**Commit:** e71695b
**Applied fix:** Replaced `failed: rules.filter((r) => !r.pass).map((r) => r.name)` with a spread that also includes `overrides.map((r) => r.name)`, matching the behaviour of `evaluateWithAuth` in auditlog.ts. Override-triggered denies are now visible to callers inspecting `decision.failed`.

---

_Fixed: 2026-05-22T15:57:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
