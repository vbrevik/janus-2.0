---
phase: 15-demo-ui-access-explorer
reviewed: 2026-07-06T12:31:40Z
depth: standard
files_reviewed: 9
files_reviewed_list:
  - frontend/src/demo/hooks/use-datasets.ts
  - frontend/src/demo/hooks/use-datasets.test.ts
  - frontend/src/demo/store/world-state.tsx
  - frontend/src/demo/store/world-state.test.tsx
  - frontend/src/demo/components/ui.tsx
  - frontend/src/demo/components/dataset-access-explorer.tsx
  - frontend/src/demo/components/dataset-reverse-lookup.tsx
  - frontend/src/demo/components/datasets-panel.tsx
  - frontend/src/demo/DemoRoot.tsx
findings:
  critical: 1
  warning: 4
  info: 4
  total: 9
status: issues_found
---

# Phase 15: Code Review Report

**Reviewed:** 2026-07-06T12:31:40Z
**Depth:** standard
**Files Reviewed:** 9
**Status:** issues_found

## Summary

Reviewed the full Datasets tab slice added in phase 15 (`use-datasets.ts`/`.test.ts`,
`world-state.tsx`/`.test.tsx` dataset-grant additions, `ui.tsx`'s new `MockTag`/
`ErrorBoundary`, the two dataset explorer components, the panel orchestrator, and the
`DemoRoot` wiring). All nine files are wholly new or minimally-extended for this phase
(confirmed via `git diff 08d28d3^..HEAD --stat`), so the whole diff was reviewed, not just
a delta.

The reducer, the mutation-hook's pending/error resolution dance, and the gate-tracing UI
are all carefully commented and internally consistent with their own stated invariants
(immutable updates, append-only audit log, Object.is bailout handling). The one clear
correctness defect is in the issuing form: an emptied "Valid from" date silently produces
a permanently-inactive grant while the UI reports success. Several other findings are
about fragility/dead-code in the new mutation-resolution plumbing and about
timezone-naive date handling in the issuing form.

## Critical Issues

### CR-01: Clearing "Valid from" silently issues a grant that can never become active, while the UI reports success

**File:** `frontend/src/demo/components/dataset-access-explorer.tsx:139-147`

**Issue:** `handleIssueGrant` builds `validFrom: new Date(validFrom)` unconditionally —
unlike `validUntil`, which is guarded (`validUntil ? new Date(validUntil) : null`), there is
no guard and no `required` validation on the "Valid from" `<input type="date">`
(`dataset-access-explorer.tsx:178-185`). A user can clear that field (native date inputs
allow this) and click "Issue grant" with `validFrom === ""`.

`new Date("")` is an `Invalid Date` (its numeric value is `NaN`). That value flows straight
into the `ISSUE_DATASET_GRANT` action and is stored as `grant.valid_from`
(`world-state.tsx:592`). `isWindowActive` (`lib/model.ts:803-812`) then evaluates
`valid_from <= now`, which is `NaN <= <number>` — always `false` — so the grant is
permanently outside its own validity window and can never grant access, for any `now`,
forever.

Crucially, none of this is surfaced to the user: `canIssueDatasetGrant`'s admin path never
inspects `valid_from`, so the grant + audit entry are created, `auditLog.length` grows, the
success effect in `useIssueDatasetGrant` fires, `isPending`/`isError` both resolve to
`false`, and the form collapses and resets as if the action succeeded. An operator believes
they granted a person dataset access; the grant is inert and no error is ever shown.

**Fix:** Validate before dispatch (mirror the `validUntil` guard, and reject empty/invalid
dates instead of silently coercing them):
```tsx
const handleIssueGrant = () => {
  if (!validFrom) return; // or surface an inline "Valid from is required" message
  const parsedFrom = new Date(validFrom);
  if (Number.isNaN(parsedFrom.getTime())) return;

  setSubmitted(true);
  const vars: IssueDatasetGrantVariables = {
    actorOrgId: dataset.admin_org_id,
    actorPersonId: "ui-admin",
    datasetId: dataset.id,
    personId: formPersonId,
    level: formLevel,
    validFrom: parsedFrom,
    validUntil: validUntil ? new Date(validUntil) : null,
  };
  mutate(vars);
};
```
Also consider adding the native `required` attribute to the "Valid from" input so the
browser blocks submission of an empty value in the first place.

## Warnings

### WR-01: `todayStr()` computes the UTC calendar date, not the user's local date

**File:** `frontend/src/demo/components/dataset-access-explorer.tsx:80-82`

**Issue:**
```ts
function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}
```
`toISOString()` always renders in UTC. For any user in a timezone ahead of UTC (e.g.
UTC+5 through UTC+14) during the hours between local midnight and UTC midnight, this
returns *yesterday's* date rather than today's — so the "Valid from" field defaults to a
date the user does not recognize as "today." This compounds with the fact that
`<input type="date">` values are parsed by `new Date(str)` as UTC midnight (not local
midnight), so the effective grant start instant can differ from what the operator intended
by several hours in either direction depending on their offset.

**Fix:** Build the string from local date components instead of an ISO/UTC round-trip:
```ts
function todayStr(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
```

### WR-02: The `canIssueDatasetGrant` delegate-cap deny path is unreachable from the UI — dead code and untestable error state

**File:** `frontend/src/demo/components/dataset-access-explorer.tsx:131-149`

**Issue:** `handleIssueGrant` always passes `actorOrgId: dataset.admin_org_id` (per the
comment at line 133-138, there is no concept of "logged in as a delegate Subject" in this
UI). Since `canIssueDatasetGrant`'s admin-org path (`actorOrgId === dataset.admin_org_id`)
unconditionally returns true whenever the requested level is in-vocabulary — and
`formLevel` is always populated from the same vocabulary the admin path checks against —
the delegate-cap path and its `false` (deny) result can never actually be reached through
real user interaction. The `isError` branch and its "Not authorized to issue this grant"
banner (`dataset-access-explorer.tsx:204-208`) are consequently dead code in the shipped
UI; they are only exercised by directly calling the hook in unit tests with a mismatched
`actorOrgId`. This means the feature this phase's DATA-DELEG-01 groundwork was meant to
demonstrate (delegate-capped issuing authority) has no way to be shown or verified through
the actual demo surface.

**Fix:** If demonstrating the deny path is in scope for this UI, either let the admin form
issue as a chosen delegate (a person selector for "acting as"), or add a small explicit
toggle/test-fixture path that exercises the delegate branch. If it is intentionally out of
scope for this phase, note the limitation in the component's header comment (it currently
only explains the always-admin-path choice, not that it makes the deny UI unreachable).

### WR-03: `useIssueDatasetGrant`'s pending/success correlation is a single shared ref keyed on a global counter — no per-call identity

**File:** `frontend/src/demo/hooks/use-datasets.ts:42-58, 60-89`

**Issue:** `pendingRef.current = { beforeLen, settled: false }` is overwritten on every
`mutate()` call, and the success effect resolves whenever `auditLog.length` grows past
`beforeLen` — regardless of whether that growth was caused by *this* call. Two problems
follow:
1. If `mutate()` is invoked again before the previous call settles (e.g. a rapid
   double-click before React re-renders to apply `disabled={isPending}`, or a future screen
   that mounts a second `useIssueDatasetGrant()` instance), the second call's
   `pendingRef.current` silently replaces the first's. The first call's `isPending` state
   is orphaned — it can still be resolved by the *second* call's `setTimeout` fallback or
   success effect, attributing the wrong outcome (allow vs. deny) to the wrong `mutate()`
   invocation.
2. Any unrelated growth of `world.datasets.auditLog` (not necessarily from this hook
   instance) would satisfy the `length > beforeLen` check and incorrectly resolve a
   still-pending call as successful.

**Fix:** Tag each in-flight call with a unique id (e.g. an incrementing ref counter) and
have both the effect and the timeout check that id instead of relying purely on a length
comparison:
```ts
const callIdRef = useRef(0);
function mutate(vars) {
  const callId = ++callIdRef.current;
  pendingRef.current = { callId, beforeLen: world.datasets.auditLog.length, settled: false };
  ...
}
```
and gate both resolution paths on `pendingRef.current?.callId === callId`.

### WR-04: `setTimeout` fallback in `mutate()` is not cleared on unmount

**File:** `frontend/src/demo/hooks/use-datasets.ts:81-88`

**Issue:** The denial-fallback `setTimeout(..., 0)` scheduled inside `mutate()` is never
tracked or cleared via a `useEffect` cleanup. If the component using this hook unmounts
while a call is still pending (e.g. the operator navigates away from the Datasets tab right
after clicking "Issue grant"), the timeout still fires later and calls `setIsError`/
`setIsPending` against state setters belonging to the unmounted instance. React 18 makes
this a silent no-op rather than a crash, but it is an uncleared timer and inconsistent with
the "fail loud" / cleanup hygiene expected elsewhere in this codebase.

**Fix:** Store the timeout id and clear it in a `useEffect` cleanup, or track a `mounted`
ref and check it before calling the setters:
```ts
const mountedRef = useRef(true);
useEffect(() => () => { mountedRef.current = false; }, []);
// inside the setTimeout callback:
if (!mountedRef.current) return;
```

## Info

### IN-01: `ARCHIVE_ROLE` display-order literal is hand-duplicated in two files

**File:** `frontend/src/demo/components/dataset-access-explorer.tsx:44-45`,
`frontend/src/demo/components/dataset-reverse-lookup.tsx:71`

**Issue:** Both files independently hardcode `["READER", "CASE_HANDLER", "ADMIN"]` as the
low-to-high display/aggregation order for `ARCHIVE_ROLE`, each with a comment explaining
it's deliberately not shared (per-file-copy convention). This is a real drift risk: if a new
archive role tier is ever introduced, both literals must be remembered and updated in
lockstep, and nothing enforces that.

**Fix:** Consider hoisting a single exported `ARCHIVE_ROLE_ORDER` constant from
`lib/model.ts` (next to `ARCHIVE_ROLE_CONTAINS`) even if each file still imports it directly
rather than through one another, to remove the duplicated literal while keeping the
"no cross-file component coupling" convention intact.

### IN-02: `level` is threaded through the dataset-grant issuing path as a bare `string`

**File:** `frontend/src/demo/components/dataset-access-explorer.tsx:96-97, 144`,
`frontend/src/demo/hooks/use-datasets.ts:29`

**Issue:** `IssueDatasetGrantVariables.level: string` and the `formLevel` state (inferred
`string` from `useState(vocab[0])`) carry no compile-time relationship to
`ArchiveRole | MailboxLevel | DocumentSiteLevel`. Runtime validation
(`isLevelInVocabulary`) catches invalid values, but a typo introduced anywhere upstream
would not be caught by the type system.

**Fix:** Not required for this phase, but worth a follow-up: type `level` as the union of
per-dataset-type level types, or at minimum as `dataset["dataset_type"]`-parameterized
generic, to get compile-time coverage.

### IN-03: `DatasetReverseLookup`'s "now" is frozen at mount, unlike the sibling explorer's time-travel input

**File:** `frontend/src/demo/components/dataset-reverse-lookup.tsx:85`

**Issue:** `const now = useMemo(() => new Date(), [])` captures the mount-time timestamp
once and never updates. `DatasetAccessExplorer`, rendered immediately above it in
`datasets-panel.tsx:212-213`, instead exposes an editable "Evaluation timestamp" input that
can move `evalTime` forward/back freely. The two sibling views therefore evaluate
"currently has access" against two different notions of "now" with no visual indication of
that difference — a grant whose window has expired in wall-clock time between mount and
the moment the operator looks at "Who has access" will still be reported as active until
the panel remounts (e.g. by navigating away and back).

**Fix:** Either recompute `now` on a low-frequency interval/visibility-refresh, or add a
brief note in the UI that "Who has access" reflects access as of page load. Low priority for
a demo surface, but worth flagging so it isn't mistaken for a live view.

### IN-04: Dataset-grant issuing authorization is entirely client-side/in-memory

**File:** `frontend/src/demo/components/dataset-access-explorer.tsx:89-90`

**Issue:** `const isAdmin = getStoredUserRole() === "admin"` gates the issuing form purely
by reading a locally-stored JSON blob, and `canIssueDatasetGrant`'s enforcement runs
entirely inside the client-side reducer (per the file-header comment, there is no backend
for the dataset domain this milestone). This is consistent with the documented Phase 14
D-10 decision and is not new to this phase, but is worth noting explicitly: nothing here
should be read as, or extended into, a real authorization boundary — any user can bypass
both the role check and the reducer's permission check via devtools since no server ever
sees or persists these actions.

**Fix:** No action needed as long as this remains an explicitly client-only demo domain;
flag prominently if a future phase wires this to a real backend so the authorization checks
are re-implemented server-side rather than assumed to already exist from this client code.

---

_Reviewed: 2026-07-06T12:31:40Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
