---
phase: 01-foundation
reviewed: 2026-05-21T22:00:00Z
depth: standard
files_reviewed: 10
files_reviewed_list:
  - frontend/src/demo/lib/model.ts
  - frontend/src/demo/lib/abac.ts
  - frontend/src/demo/lib/seed.ts
  - frontend/src/demo/store/world-state.tsx
  - frontend/src/demo/components/ui.tsx
  - frontend/src/demo/components/DemoBanner.tsx
  - frontend/src/demo/components/RoleSwitcherHeader.tsx
  - frontend/src/demo/components/DecisionExplorer.tsx
  - frontend/src/demo/DemoRoot.tsx
  - frontend/src/demo/main.tsx
findings:
  critical: 0
  warning: 5
  info: 4
  total: 9
status: issues_found
---

# Phase 01: Code Review Report

**Reviewed:** 2026-05-21T22:00:00Z
**Depth:** standard
**Files Reviewed:** 10
**Status:** issues_found

## Summary

Reviewed the frontend-only, in-memory ABAC demonstrator (Foundation phase). Scope was judged against the stated mock-demo context: no backend, no network, no persistence, pure-computed decisions over seeded data. "No API auth" / "no input sanitisation" / "no transport security" findings are correctly N/A here and were not raised. The verbatim spike lift (`abac.ts`) and the documented zero-mutation `REQUEST_ATTRIBUTE` SoD caveat were excluded from style/correctness flagging per the review brief.

No Critical findings: there is no exploitable security surface, no data-loss path, and no crash-on-load. The evaluator logic is sound and well-tested by the two co-located test files.

The most consequential finding is a **dead/misleading UI control**: the Domain `<Select>` in `DecisionExplorer` writes to `abacTarget.domain` but that value is never consumed by the evaluation (the decision is derived entirely from the selected `resource.domain`/`requiredTier`). In a demonstrator whose entire value proposition is "every decision is explainable and live," a live-looking picker that silently does nothing — and is accompanied by caption copy claiming it "scopes the target triple" — is a credibility defect (WR-01).

Secondary themes: shared-mutable seed state aliased into the store and mutated at import time (WR-02, WR-03), declared model surface (`Op`s, `AttrOp`s) with no reducer wiring that can mislead readers about what the demo actually does (WR-04), and a brittle `as Compartment` cast in the request path (WR-05).

## Structural Findings (fallow)

No `<structural_findings>` block was provided with this review. No structural pre-pass to reconcile.

## Narrative Findings (AI reviewer)

## Warnings

### WR-01: Domain picker is a live control with zero effect on the decision (and is described as functional)

**File:** `frontend/src/demo/components/DecisionExplorer.tsx:202-214`, `frontend/src/demo/lib/abac.ts:149-157`
**Issue:** The Domain `<Select>` dispatches `SET_TARGET` to update `abacTarget.domain`, but the decision is computed by `evaluate(principalFromSubject(subject), requirementFromResource(resource))`. `requirementFromResource` (abac.ts:149-157) builds the requirement's `domain`/`requiredTier` from `resource.domain`/`resource.requiredTier` — `abacTarget.domain` is never read in the evaluation path. The caption (`captionFor`) is likewise fed `resource.domain` (line 222), not `abacTarget.domain`.

The result: changing the Domain dropdown updates store state but produces no observable change in the trace. Worse, the helper copy on lines 210-213 states "this picker scopes the target triple," implying it influences the result. For a tool whose stated purpose is making every authorization decision explainable and live, a dead input that claims to be functional undermines the core demo claim. It also invites a future maintainer to "fix" the decision by changing the domain, with no feedback.

`abacTarget.domain` is part of the persisted store shape (`WorldState`) and the reducer's `SET_TARGET` handler, so this is wired end-to-end except for the one place it should matter.

**Fix:** Either (a) remove the Domain picker and the "scopes the target triple" copy so the UI only exposes controls that affect the trace, or (b) make it functional by mismatch-checking the selected domain against the resource and surfacing it in the trace — e.g.:
```tsx
// In DecisionExplorer, before useMemo:
const domainMismatch = abacTarget.domain !== resource.domain;
// then show a non-evaluating note when the picker disagrees with the resource:
{domainMismatch && (
  <p className="text-xs text-amber-700">
    Selected domain ({abacTarget.domain}) differs from this resource's domain
    ({resource.domain}); the trace evaluates the resource's own domain.
  </p>
)}
```
Option (a) is the simpler, lower-risk choice given the "minimum code" project principle.

### WR-02: `seedWorld()` returns aliases of the live module-level seed arrays, sharing mutable state across all instances

**File:** `frontend/src/demo/store/world-state.tsx:48-67`
**Issue:** `seedWorld()` assigns the imported `SUBJECTS`, `RESOURCES`, `AGREEMENTS`, and `HUB_INDEX` references directly into the returned `WorldState` (lines 53-57). These are the same singleton arrays exported from `seed.ts` and imported by both test files. Every `seedWorld()` call (StrictMode double-invokes the lazy initializer; each test calls it repeatedly) hands back the *same* array references and the *same* `Subject`/`Resource` objects.

This is currently safe only because the reducer is disciplined: `APPROVE/REVOKE/TOGGLE` replace `state.subjects` via `.map()` and clone the touched subject (`cloneSubject`). But the safety is implicit and fragile — any future reducer path (or a test) that mutates a subject in place, or pushes/splices `state.subjects`/`state.agreements`/`state.hubIndex`, would corrupt the shared seed for every other consumer and across test cases (no per-test isolation). The comment block promises "immutable update" discipline but the initial state itself is shared mutable global state.

**Fix:** Defensively copy the seed arrays at the array level when building initial state, so each world owns its own array references:
```ts
export function seedWorld(): WorldState {
  const firstSubject = SUBJECTS[0];
  const firstResource = RESOURCES[0];
  return {
    units: UNITS,
    subjects: [...SUBJECTS],
    resources: [...RESOURCES],
    agreements: [...AGREEMENTS],
    events: [],
    hubIndex: [...HUB_INDEX],
    currentRole: "ACCESS_APPROVER",
    abacTarget: {
      subjectId: firstSubject.id,
      resourceId: firstResource.id,
      domain: firstResource.domain,
    },
    seq: 0,
  };
}
```
(Element objects remain shared, which is fine as long as the reducer keeps cloning before mutating — but the array-level copy removes the most likely corruption path.)

### WR-03: Seed arrays are mutated at import time via `.push()`, coupling module-load order to correctness

**File:** `frontend/src/demo/lib/seed.ts:785-815`
**Issue:** `SUBJECTS`, `RESOURCES`, and `HUB_INDEX` are declared with the seed-head records, then expanded by top-level `.push(...)` side effects at module evaluation time (lines 785-815). Any consumer that captures `SUBJECTS` before this module body finishes (e.g., a circular import, or `seedWorld()` reading `SUBJECTS[0]` from a partially evaluated module) would observe a different array length. With ES modules and the current import graph this happens to resolve correctly, but mutate-on-import is an avoidable hazard: it makes the exported value time-dependent and defeats `const`-as-immutable expectations.

It also interacts with WR-02: because the post-`push` arrays are the same references shared into every world, the import-time mutation is the only thing that makes the expansion records visible — there is no second source of truth.

**Fix:** Build the full arrays declaratively with spreads instead of mutating after declaration:
```ts
export const SUBJECTS: Subject[] = [
  ...seedHeadSubjects,
  ...mil1Subjects,
  ...mil2Subjects,
  ...intelSubjects,
  ...infraSubjects,
  ...industrySubjects,
  ...homeGuardSubjects,
  ...fw5Subjects,
];
```
This keeps the seed-head invariant (R9) intact (head records stay first) while removing the import-time side effect.

### WR-04: Declared `Op`/`AttrOp` surface (`AUTHORIZE_SUBJECT`, `WITHDRAW_AUTHORIZATION`) has no reducer or UI wiring — silent dead authority

**File:** `frontend/src/demo/lib/model.ts:167-168`, `frontend/src/demo/lib/model.ts:219-220`, `frontend/src/demo/components/DecisionExplorer.tsx:102-119`
**Issue:** `MANAGER` is granted `AUTHORIZE_SUBJECT` and `WITHDRAW_AUTHORIZATION` ops (model.ts:201-202), and matching `AttrOp` variants exist (model.ts:219-220), but there is no `Action` for them in the reducer and no button in `DecisionExplorer` (`can()` is only checked for `approve_attribute`, `flag_risk`, `request_attribute`). When operating as MANAGER, the only actionable op is `request_attribute`; the two authorize ops render only as informational pills in the role header. A reviewer or stakeholder reading the role table will reasonably expect a Manager to be able to authorize/withdraw in the demo, but the screen offers nothing.

This is explicitly acknowledged in code comments as Phase-3 (OQ-B) work and is consistent with the seed-only `authorization` fields. The risk is not incorrectness but **misleading legibility**: in a SoD-demonstration tool, advertising an op a role "has" while providing no way to exercise it (and no on-screen note that it is not yet wired) blurs exactly the separation the demo is meant to teach.

**Fix:** Add a brief inline note in the Actions card when the role holds authorize ops that are not yet exercisable, so the gap is explicit rather than silent. For example, in the Actions card:
```tsx
{(can("AUTHORIZE_SUBJECT") || can("WITHDRAW_AUTHORIZATION")) && (
  <p className="rounded bg-slate-50 p-2 text-xs text-slate-500">
    Authorize / withdraw is part of this role's authority but is evaluated in
    Phase 3 (OQ-B) — no live action in the Foundation demo.
  </p>
)}
```
If the seed-only intent is firm, this is documentation-grade; if not, wire the reducer cases. Either resolves the silent gap.

### WR-05: `as Compartment` cast in the request path can log a non-compartment value

**File:** `frontend/src/demo/components/DecisionExplorer.tsx:275-289`
**Issue:** The request button computes `grantComp ?? subject.compartments[0]` and casts the result `as Compartment` (line 282-283). `grantComp` (line 106) is the first required compartment the subject lacks; `subject.compartments[0]` is the subject's first held compartment. The guard `(grantComp ?? subject.compartments[0]) && dispatch(...)` (line 278) prevents dispatch when both are `undefined`, so an `undefined` value will not be logged. However, the `as Compartment` assertion bypasses the type checker on a value that the guard only proves is truthy — if the surrounding logic ever changes (e.g., the button label uses `grantComp ?? "attribute"` on line 288, a string that is *not* a `Compartment`), the cast is the thing that would let a bad value through to the event log. The button label and the dispatched value are computed from different fallbacks, which is an easy source of drift.

This is low-impact in the current mock (the event log is display-only), but the cast is exactly the kind of `as`-assertion the project's strict-TS posture is meant to discourage, and it papers over a real "what compartment is actually being requested?" ambiguity.

**Fix:** Compute the requested compartment once, narrow it, and reuse it for both the dispatch and the label:
```tsx
{can("request_attribute") && (() => {
  const reqComp = grantComp ?? subject.compartments[0];
  return (
    <button
      onClick={() => reqComp && dispatch({
        type: "REQUEST_ATTRIBUTE", subjectId: subject.id, value: reqComp,
      })}
      disabled={!reqComp}
      className="rounded bg-slate-700 px-3 py-1.5 text-xs text-white disabled:opacity-40"
    >
      Request {reqComp ?? "attribute"} (cannot grant)
    </button>
  );
})()}
```
`reqComp` is `Compartment | undefined` with no cast; the disabled state and label now agree with the dispatched value.

## Info

### IN-01: `unitName` is null-safe but its lookup can never miss given the typed key

**File:** `frontend/src/demo/lib/model.ts:54-56`
**Issue:** `unitName(id: UnitId)` uses `UNITS[id]?.label ?? id`. Because `id` is typed `UnitId` and `UNITS` is a total `Record<UnitId, ...>`, the optional chain and fallback are dead defensiveness — the lookup is total. Not a bug; just notes that the `?? id` branch is unreachable under the type contract. Harmless and arguably good defensive style; flagged only for awareness.
**Fix:** No change required. If trimming, `return UNITS[id].label;` is sufficient.

### IN-02: `revokeComp` fallback can offer to "revoke" a compartment the resource does not require

**File:** `frontend/src/demo/components/DecisionExplorer.tsx:109-112`
**Issue:** `revokeComp` is `resource.requiredCompartments.find(held) ?? subject.compartments[0]`. When none of the subject's held compartments are required by the selected resource, the fallback offers to revoke the subject's *first arbitrary* compartment (e.g., a compartment unrelated to the current resource/decision). The revoke button then reads "Revoke: remove {revokeComp}" for a compartment that has no bearing on the displayed trace. This is a demo-UX rough edge, not a correctness defect — the reducer revokes exactly what it is told. It can confuse the SoD narrative ("why is the approver removing an unrelated attribute?").
**Fix:** Consider scoping the revoke action to compartments relevant to the current resource, or labelling it clearly as "remove any held compartment." Low priority for a mock.

### IN-03: Comment id-range annotations do not match the actual seeded ids

**File:** `frontend/src/demo/lib/seed.ts:156, 246, 338, 435, 526, 658`
**Issue:** Section headers annotate ranges that drift from the real ids — e.g., "MILITARY_1 expansion (subj-5..8 / res-5..7)" but the block contains `ca3a-subj`, `ca3b-subj`, `subj-5`, `subj-6`; "MILITARY_2 expansion (subj-7..9 / res-8..10)" actually contains `subj-7`, `fw2-subj` (whose `unit` is `MILITARY_1`, not MILITARY_2), `subj-8`, `subj-9`. The ids are unique (verified — no duplicates) and the data is internally consistent, but the comments misdescribe the contents and the unit grouping (fw2-subj sits under the MILITARY_2 header while belonging to MILITARY_1). Comments-as-documentation that contradict the code invite future edit mistakes.
**Fix:** Update the section-header ranges to reflect the actual ids, or drop the per-range counts and keep only the per-unit profile description.

### IN-04: `WorldState.units` typed as `typeof UNITS` couples store shape to a concrete constant

**File:** `frontend/src/demo/store/world-state.tsx:36`
**Issue:** `units: typeof UNITS` ties the state interface to the literal shape of the `UNITS` constant rather than a declared type (e.g., `Record<UnitId, { label: string }>`). It works, but `typeof`-on-a-value in an interface is an unusual coupling that makes the state contract depend on an implementation constant. Minor maintainability nit.
**Fix:** Prefer an explicit type: `units: Record<UnitId, { label: string }>` (export that type from model.ts if reuse is wanted).

---

_Reviewed: 2026-05-21T22:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
