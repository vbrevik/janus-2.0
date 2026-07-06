---
phase: 15-demo-ui-access-explorer
plan: 01
subsystem: ui
tags: [react, typescript, useReducer, error-boundary, vitest, renderHook]

requires:
  - phase: 14-mock-dataset-worldstate
    provides: "WorldState.datasets (nodes/grants/delegates/auditLog eager-seed), ISSUE_DATASET_GRANT action/reducer with silent-on-denial contract"
  - phase: 13-dataset-model-access-resolver
    provides: "canIssueDatasetGrant, DatasetAccessGrant model with valid_from/valid_until fields"
provides:
  - "ISSUE_DATASET_GRANT action/reducer accepting validFrom/validUntil, backward-compatible"
  - "ErrorBoundary class component in demo/components/ui.tsx (first error boundary in the codebase)"
  - "useIssueDatasetGrant hook with isPending/isError API-mutation-shape parity, denial-safe via dual effect+timeout pattern"
affects: [15-02, 15-03]

tech-stack:
  added: []
  patterns:
    - "Dual useEffect+setTimeout(0)-fallback pattern for detecting a useReducer denial bailout (no new state reference emitted)"
    - "Class-field-only React class component (no constructor) to satisfy erasableSyntaxOnly:true"

key-files:
  created:
    - frontend/src/demo/hooks/use-datasets.ts
    - frontend/src/demo/hooks/use-datasets.test.ts
  modified:
    - frontend/src/demo/store/world-state.tsx
    - frontend/src/demo/store/world-state.test.tsx
    - frontend/src/demo/components/ui.tsx

key-decisions:
  - "componentDidCatch drops the unused ErrorInfo second parameter entirely rather than underscore-prefixing it (plan's literal instruction) — this project's eslint config has no argsIgnorePattern exemption for @typescript-eslint/no-unused-vars, so underscore-prefixing satisfies tsc's noUnusedParameters but still fails lint; dropping the param satisfies both with identical runtime behavior"

patterns-established:
  - "Denial-safe hook pattern for silent-on-denial reducers: record a beforeLen + settled guard in a ref, resolve via an effect keyed on the observable length AND a setTimeout(0) fallback, whichever fires first wins"

requirements-completed: [DATA-UI-02, DATA-UI-04]

coverage:
  - id: D1
    description: "ISSUE_DATASET_GRANT action + reducer accept validFrom/validUntil and wire them into the constructed grant's valid_from/valid_until fields (reference-equal to the passed Date objects); omitting them still defaults to null (backward compatible)"
    requirement: "DATA-UI-04"
    verification:
      - kind: unit
        ref: "frontend/src/demo/store/world-state.test.tsx#ISSUE_DATASET_GRANT action > wires validFrom/validUntil into the constructed grant when provided"
        status: pass
      - kind: unit
        ref: "frontend/src/demo/store/world-state.test.tsx#ISSUE_DATASET_GRANT action > creates a grant and an audit entry when the actor is the dataset's admin_org"
        status: pass
      - kind: unit
        ref: "frontend/src/demo/store/world-state.test.tsx#ISSUE_DATASET_GRANT action > creates neither a grant nor an audit entry when canIssueDatasetGrant returns false"
        status: pass
    human_judgment: false
  - id: D2
    description: "ErrorBoundary class component exported from ui.tsx, compiles cleanly under erasableSyntaxOnly:true, matches the Copywriting Contract's exact fallback text"
    requirement: "DATA-UI-02"
    verification:
      - kind: unit
        ref: "npx tsc -b --noEmit (zero errors)"
        status: pass
      - kind: other
        ref: "grep -c 'export class ErrorBoundary' frontend/src/demo/components/ui.tsx == 1"
        status: pass
    human_judgment: false
  - id: D3
    description: "useIssueDatasetGrant resolves isPending=false/isError=false on the allow path and isPending=false/isError=true on the deny path, proving the fallback timer survives the useReducer bailout"
    requirement: "DATA-UI-04"
    verification:
      - kind: unit
        ref: "frontend/src/demo/hooks/use-datasets.test.ts#useIssueDatasetGrant > resolves isPending=false, isError=false on the allow path"
        status: pass
      - kind: unit
        ref: "frontend/src/demo/hooks/use-datasets.test.ts#useIssueDatasetGrant > resolves isPending=false, isError=true on the deny path (Pitfall 1 fallback)"
        status: pass
    human_judgment: false

duration: 4min
completed: 2026-07-05
status: complete
---

# Phase 15 Plan 01: Store/Hook/ErrorBoundary Foundation Summary

**Extended ISSUE_DATASET_GRANT with validFrom/validUntil, added the demo's first ErrorBoundary class component, and shipped a denial-safe useIssueDatasetGrant hook that survives React's useReducer Object.is bailout on a silent-denial dispatch.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-07-05T17:12:07Z
- **Completed:** 2026-07-05T17:15:35Z
- **Tasks:** 3
- **Files modified:** 5 (2 new, 3 edited)

## Accomplishments
- `ISSUE_DATASET_GRANT`'s Action union and reducer case now accept optional `validFrom`/`validUntil`, passing the exact Date objects through by reference (not reconstructing them) while staying fully backward-compatible (omitting them still yields `null`/`null`)
- New `ErrorBoundary` class component in `ui.tsx` — a plain class-field-only implementation (no constructor) that compiles cleanly under `erasableSyntaxOnly: true`, with the exact fallback copy locked in the UI-SPEC (heading, body, "Try again" reset button)
- New `useIssueDatasetGrant` hook (`hooks/use-datasets.ts`) wraps the reducer dispatch with `isPending`/`isError` API-mutation-shape parity, using a dual `useEffect` (keyed on `auditLog.length`) + `setTimeout(0)` fallback so denial (which returns the identical state reference and therefore never fires React effects) still resolves `isPending` to `false` and `isError` to `true`
- New `renderHook`-based test file proves both the allow and deny paths resolve correctly under fake timers — the one piece of genuinely new logic this phase's foundation adds

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend ISSUE_DATASET_GRANT payload + reducer with validFrom/validUntil** - `05bcf71` (feat)
2. **Task 2: Add ErrorBoundary to ui.tsx** - `8e1324a` (feat)
3. **Task 3: Add useIssueDatasetGrant hook (denial-safe, Pitfall 1 fix)** - `f4e114e` (feat)

**Plan metadata:** (this commit)

## Files Created/Modified
- `frontend/src/demo/store/world-state.tsx` - `ISSUE_DATASET_GRANT` Action member + reducer case gain `validFrom`/`validUntil`
- `frontend/src/demo/store/world-state.test.tsx` - new test asserting reference-equal `valid_from`/`valid_until` wiring
- `frontend/src/demo/components/ui.tsx` - new `ErrorBoundary` named export
- `frontend/src/demo/hooks/use-datasets.ts` - new `IssueDatasetGrantVariables` interface + `useIssueDatasetGrant` hook
- `frontend/src/demo/hooks/use-datasets.test.ts` - new `renderHook`-based allow/deny test suite

## Decisions Made
- `componentDidCatch` drops the unused `ErrorInfo` second parameter entirely rather than underscore-prefixing it as the plan's action text specified — see Deviations below.
- No other deviations; the hook, reducer extension, and ErrorBoundary all match the plan's exact code shape (verified against 15-RESEARCH.md's Code Examples section, which the plan's action text quotes near-verbatim).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `componentDidCatch(error, _info)` failed ESLint despite satisfying tsc**
- **Found during:** Task 2 (Add ErrorBoundary to ui.tsx)
- **Issue:** The plan's action text instructs prefixing the unused `ErrorInfo` parameter with an underscore, citing `noUnusedParameters:true`'s underscore exemption. That exemption is real for `tsc`, but this project's `eslint.config.js` uses `tseslint.configs.recommended` with no `argsIgnorePattern` override, so `@typescript-eslint/no-unused-vars` still flagged `_info` as unused (`npx eslint` reported 1 error).
- **Fix:** Dropped the second parameter entirely — `componentDidCatch(error: Error): void` — since TypeScript permits a method override to accept fewer parameters than the base lifecycle signature. Removed the now-unused `ErrorInfo` type import.
- **Files modified:** `frontend/src/demo/components/ui.tsx`
- **Verification:** `npx tsc -b --noEmit` (0 errors) and `npx eslint src/demo/components/ui.tsx` (0 errors) both clean after the fix; identical runtime behavior (the caught error is still logged via `console.error`).
- **Committed in:** `8e1324a` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking-lint fix)
**Impact on plan:** No behavior change — same fallback UI, same `componentDidCatch` logging. No scope creep.

## Issues Encountered
None beyond the lint deviation documented above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `useIssueDatasetGrant`, `ErrorBoundary`, and the extended `ISSUE_DATASET_GRANT` action are all in place for Wave 2's `dataset-access-explorer.tsx` (which wraps its issuing form's dispatch in `useIssueDatasetGrant` per D-10) and Wave 3's `DatasetsPanel` (which wraps the explorer/reverse-lookup subtree in `ErrorBoundary` per D-12/D-15).
- Full suite: 317/317 Vitest passing (314 baseline + 3 new), `npx tsc -b --noEmit` clean, `npx eslint` clean on all touched files.
- No blockers for 15-02/15-03.

---
*Phase: 15-demo-ui-access-explorer*
*Completed: 2026-07-05*

## Self-Check: PASSED

All created/modified files and all 3 task commits verified present.
