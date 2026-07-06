---
phase: 15-demo-ui-access-explorer
fixed_at: 2026-07-06T13:31:42Z
review_path: .planning/phases/15-demo-ui-access-explorer/15-REVIEW.md
iteration: 1
findings_in_scope: 5
fixed: 5
skipped: 0
status: all_fixed
---

# Phase 15: Code Review Fix Report

**Fixed at:** 2026-07-06T13:31:42Z
**Source review:** .planning/phases/15-demo-ui-access-explorer/15-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 5 (fix_scope: critical_warning — 1 critical + 4 warnings; the 4 Info findings were out of scope)
- Fixed: 5
- Skipped: 0

**Note on commit grouping:** the commit helper (`gsd-tools query commit`) restages
the full working-tree state of each listed file rather than an explicit git index,
so findings that touch the same file could not be split into one-commit-per-finding
once more than one fix had been applied to that file. CR-01, WR-01, and WR-02 all
land in `dataset-access-explorer.tsx` and were captured together in a single commit;
WR-03 and WR-04 both land in `use-datasets.ts` and were captured together in a
second commit. Each commit message lists every finding ID it contains, and each
finding's fix was individually verified (Tier 1 re-read + Tier 2 scoped `tsc
--noEmit`) before being folded into its file's commit.

## Fixed Issues

### CR-01: Clearing "Valid from" silently issues a grant that can never become active, while the UI reports success

**Files modified:** `frontend/src/demo/components/dataset-access-explorer.tsx`
**Commit:** `73d2d4a`
**Applied fix:** `handleIssueGrant` now returns early if `validFrom` is empty or
parses to an `Invalid Date` (`Number.isNaN(parsedFrom.getTime())`), before
`setSubmitted(true)`/`mutate()` are called — matching the existing guard already
applied to `validUntil`. The parsed `Date` is reused (`parsedFrom`) instead of
re-parsing `validFrom` a second time when building `IssueDatasetGrantVariables`.
Also added the native `required` attribute to the "Valid from" `<input
type="date">` as a first line of defense, per the review's fix suggestion.

### WR-01: `todayStr()` computes the UTC calendar date, not the user's local date

**Files modified:** `frontend/src/demo/components/dataset-access-explorer.tsx`
**Commit:** `73d2d4a`
**Applied fix:** `todayStr()` now builds the `YYYY-MM-DD` string from local
`Date` components (`getFullYear`/`getMonth`/`getDate`, zero-padded) instead of an
`toISOString()` UTC round-trip, so the default "Valid from" value matches the
operator's local calendar date regardless of timezone offset.

### WR-02: The `canIssueDatasetGrant` delegate-cap deny path is unreachable from the UI — dead code and untestable error state

**Files modified:** `frontend/src/demo/components/dataset-access-explorer.tsx`
**Commit:** `73d2d4a`
**Applied fix:** Per the review's stated fallback ("if it is intentionally out of
scope for this phase, note the limitation in the component's header comment"),
added a "KNOWN LIMITATION (WR-02)" block to the file's header comment explaining
that the issuing form always issues as `dataset.admin_org_id`, that the
delegate-cap deny branch can never be reached through real user interaction, and
that this is intentionally out of scope for this phase. No behavioral change —
adding a full "acting as a delegate" selector was judged out of scope for a fix
pass (feature-sized, not a bug fix) per Rule 2 (Simplicity First) / Rule 3
(Surgical Changes).

### WR-03: `useIssueDatasetGrant`'s pending/success correlation is a single shared ref keyed on a global counter — no per-call identity

**Files modified:** `frontend/src/demo/hooks/use-datasets.ts`
**Commit:** `3aac828`
**Applied fix:** Added a `callIdRef` incrementing counter; `pendingRef.current`
is now tagged with `{ callId, beforeLen, settled }`, and the `setTimeout`
fallback closure captures its own call's `callId` and only resolves
`pendingRef.current` if `pending.callId === callId` — so a stale timeout from an
earlier, superseded `mutate()` call can no longer misattribute or steal
resolution of a later call.

### WR-04: `setTimeout` fallback in `mutate()` is not cleared on unmount

**Files modified:** `frontend/src/demo/hooks/use-datasets.ts`
**Commit:** `3aac828`
**Applied fix:** Added a `mountedRef` ref (set `true` initially, flipped to
`false` in a `useEffect` cleanup on unmount) and an early `return` at the top of
the `setTimeout` callback when `!mountedRef.current`, so the fallback timer is a
no-op against an unmounted hook instance instead of calling `setIsError`/
`setIsPending` on stale setters.

## Skipped Issues

None — all in-scope findings were fixed.

---

_Fixed: 2026-07-06T13:31:42Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
