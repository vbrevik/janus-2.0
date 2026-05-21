---
phase: 01-foundation
plan: "03"
subsystem: demo-store
tags: [react, usereducer, split-context, event-sourcing, sod, vitest]

requires:
  - "model.ts types (Subject, Resource, AttrEvent, AttrOp, RoleId, Domain, Compartment, HubPointer, ROLES, UNITS, UnitId)"
  - "seed.ts arrays (SUBJECTS, RESOURCES, AGREEMENTS, HUB_INDEX)"
provides:
  - "world-state.tsx: single useReducer world-state store (MODEL-02) — one source of truth"
  - "Split-context (WorldStateContext + WorldDispatchContext) + guarded hooks useWorld/useWorldDispatch"
  - "6 actions (SET_ROLE, SET_TARGET, APPROVE_ATTRIBUTE, REVOKE_ATTRIBUTE, TOGGLE_SECURITY_HOLD, REQUEST_ATTRIBUTE)"
  - "Exported reducer + seedWorld for headless tests; selector helpers useCurrentRole/useAbacTarget"
  - "world-state.test.tsx: 6-test Vitest suite (immutability, event-append, SoD crux, new-ref-flips-decision)"
affects: [01-04, phase-2, phase-3]

tech-stack:
  added: []
  patterns:
    - "React.dev split-context: separate state + dispatch contexts, no prop-drilling"
    - "Immutable update: cloneSubject idiom returns new subject/compartments/flags refs (R2)"
    - "Event-sourced mutation: every mutating action appends one AttrEvent with actor = role label (R6)"
    - "Lazy useReducer init via seedWorld (third-arg initializer)"
    - "Guarded hooks throw 'must be used within a WorldProvider' (mirrors auth-context idiom)"

key-files:
  created:
    - frontend/src/demo/store/world-state.tsx
    - frontend/src/demo/store/world-state.test.tsx
  modified: []

key-decisions:
  - "Decision is DERIVED in the view (01-04) via useMemo, NEVER stored — no decision field, no RECOMPUTE action (R2)"
  - "abacTarget default = CA-1 clean-ALLOW triple, derived from SUBJECTS[0]/RESOURCES[0] (subj-1/res-1/DATA) rather than hardcoded ids"
  - "currentRole defaults to ACCESS_APPROVER"
  - "REQUEST_ATTRIBUTE returns the SAME subjects array reference (zero mutation) — only events + seq advance (SoD crux)"
  - "DENY->ALLOW test uses an inline-crafted Requirement (subj-1 missing BLACKWING) rather than depending on a specific seed scenario id — robust to seed churn"

patterns-established:
  - "Reducer + actions are the single mutation path; the view dispatches, never mutates"
  - "appendEvent(state, subjectId, op, value?) stamps seq+1 and ROLES[currentRole].label"

deviations:
  - "Model AttrOp is frozen (D-05) and has no REQUEST op. Per plan guidance, REQUEST_ATTRIBUTE logs a GRANT_COMPARTMENT-style entry (value + Manager actor) with zero subject mutation. FORWARD RISK for Phase 3: a naive reconstructSubject replay would apply this request as a grant. Phase 3 must distinguish request entries (e.g. skip Manager-actor compartment events, or add a dedicated request op when the model is unfrozen) so audit replay preserves SoD. Flagged, not yet mitigated — out of Phase 1 scope (replay is Phase 3)."

requirements: [MODEL-02]
status: complete
---

## What was built

The single shared in-memory world-state store (MODEL-02): ONE `useReducer` holding the
entire world (units, subjects, resources, agreements, events, hubIndex, currentRole,
abacTarget, seq) behind the React.dev split-context pattern, exposed via guarded
`useWorld()` / `useWorldDispatch()` hooks. Six actions; the three mutating actions return
new subject references (immutable clone) and append one append-only `AttrEvent` stamped
with the acting role's label. `REQUEST_ATTRIBUTE` logs an event but mutates nothing — the
separation-of-duties crux. No decision is stored and there is no RECOMPUTE action; the
decision is derived in the view (01-04).

## Verification

- `npx vitest run src/demo/store/world-state.test.tsx` → 6/6 passing.
- grep confirms `useReducer` + both contexts + `REQUEST_ATTRIBUTE`; no `decision:` / `RECOMPUTE` on non-comment lines (R2).
- `npx tsc --noEmit -p tsconfig.app.json` → no errors in `src/demo/store/`.
- No new state-management dependency added (React useReducer/createContext only).

## Commits

- `765d7e3` feat(01-03): single useReducer world-state store + split-context
- `d50ca9a` test(01-03): reducer tests — immutability, event-append, SoD crux, no stored decision

## Notes for 01-04

The Decision Explorer consumes `useWorld()` (read state) + `useWorldDispatch()` (dispatch
actions). Compute the live decision in the view with `useMemo(() => evaluate(...))` keyed on
the target subject/resource — the reducer's new-ref-on-mutation contract is what invalidates
that memo. Op-gate the action panel by `ROLES[currentRole].ops` (Manager sees REQUEST only).
