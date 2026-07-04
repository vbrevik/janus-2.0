# Phase 13: Dataset Model & Access Resolver - Context

**Gathered:** 2026-07-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Define the dataset type system and a standalone 3-gate access resolver (`resolveDatasetAccess`), tested and safe to build on — per-type level mechanisms, resolution-time Application-grant enforcement (OR across a dataset's linked Applications), an independent existence-visibility gate, classification-override validation, and delegate-capped issuing authority. Pure model + resolver only — no seed data, no WorldState wiring, no UI (those are Phases 14/15).

</domain>

<spec_lock>
## Requirements (locked via SPEC.md)

**13 requirements are locked.** See `13-SPEC.md` for full requirements, boundaries, and acceptance criteria.

Downstream agents MUST read `13-SPEC.md` before planning or implementing. Requirements are not duplicated here.

**In scope (from SPEC.md):**
- `frontend/src/demo/lib/model.ts` (append-only): `DatasetNode`, `DatasetAccessGrant`, `DatasetAccessDelegate`, per-type level/containment tables, `resolveDatasetAccess`, `effectiveDatasetClassification`, `canIssueDatasetGrant`
- Exhaustive Vitest coverage for every requirement and every locked edge/prohibition in SPEC.md

**Out of scope (from SPEC.md):**
- `world-state.tsx` reducer/actions, `DatasetWorld` sub-object, or any WorldState wiring — Phase 14
- Full mock dataset (DATA-SEED-01..06) — Phase 14
- Any UI component — Phase 15
- Backend/Postgres/Rust — out of scope for the entire v2.3 milestone
- Modifying the v2.2 `ResourceTier` union, `resolveResourceAccess`, or any existing digital-resource code

**Revision note:** during this discussion, SPEC.md's original "Also touch seed.ts for minimal fixtures" boundary answer was superseded by the Test/fixture organization decision below (D-01) — seed.ts stays untouched in Phase 13 after all.

</spec_lock>

<decisions>
## Implementation Decisions

### Test/fixture organization
- **D-01:** New `frontend/src/demo/lib/dataset.test.ts` uses hand-written INLINE fixtures only — mirrors the established "D3-13 pattern" already used by `digital-resource.test.ts` and `physical-access.test.ts` (no `seed.ts` import at the model-test level, avoids circular-import risk). `seed.ts` stays untouched in Phase 13 — the real mock dataset is Phase 14's job. This supersedes SPEC.md's boundary note about touching seed.ts for minimal fixtures.

### ARCHIVE_ROLE containment shape
- **D-02:** The containment map is a descendant-list `Record`: `const ARCHIVE_ROLE_CONTAINS: Record<ArchiveRole, ArchiveRole[]> = { ADMIN: ["CASE_HANDLER", "READER"], CASE_HANDLER: ["READER"], READER: [] }`. Directly greppable and easy to extend with a new non-linear role later, versus hiding the structure behind a `covers()` function's internal logic.

### Gate-trace shape for `visible`
- **D-03:** The visibility check is added as a 4th entry in the `gates: ResourceGateResult[]` trace array (alongside clearance, Application-grant, dataset-grant), NOT as a separate top-level-only field. Chosen for UI consistency with the existing `ResourceResolutionTrace` row-rendering pattern that Phase 15 will reuse — every gate (including visibility) shows up uniformly as a trace row. **Note for the resolver's design:** `resolveDatasetAccess` must still expose `visible: boolean` as its own top-level field too (SPEC.md DATA-ACCESS-04 requires this explicitly, and Phase 15's dataset-listing filter needs a direct boolean, not a trace-array scan) — the gates[] entry is an ADDITIONAL trace representation of the same check, not a replacement for the top-level field.

### Claude's Discretion
- Exact function/type naming beyond what SPEC.md and the decisions above specify (e.g. internal helper names, parameter ordering within `resolveDatasetAccess`'s signature) — no strong preference expressed, follow existing v2.2 naming conventions (`resolveResourceAccess`, `ResourceGateResult`, etc.) as the closest analog.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Roadmap
- `.planning/phases/13-dataset-model-access-resolver/13-SPEC.md` — locked requirements, boundaries, acceptance criteria, edge/prohibition coverage (MANDATORY, read first)
- `.planning/REQUIREMENTS.md` — DATA-01..05, DATA-ACCESS-01..04, DATA-GRANT-01..03, DATA-DELEG-01, plus the "Resolved Decisions" table recording the 4 live-confirmed decisions
- `.planning/ROADMAP.md` — Phase 13 section (goal, depends-on, success criteria)
- `.planning/research/SUMMARY.md`, `.planning/research/ARCHITECTURE.md`, `.planning/research/PITFALLS.md` — HIGH-confidence research grounding the model→seed→UI build order and the 5 critical pitfalls (rank-comparator safety, resolution-time prerequisite, dead-trace rows, override drift, ResourceTier union isolation)

### Codebase precedent (extension points)
- `frontend/src/demo/lib/model.ts` lines 15, 664, 744, 822, 855 — `CLEARANCE_RANK`, `ResourceTier` (frozen union, do not extend), `ApplicationNode` (no classification field, derive-with-override precedent), `isWindowActive`, `effectiveClassification` — all directly reused by the dataset resolver
- `frontend/src/demo/lib/digital-resource.test.ts` — sibling test file; establishes the "D3-13" inline-fixtures-only convention (D-01 above) and the exactly-named pitfall-test pattern the verifier greps for
- `frontend/src/demo/lib/physical-access.test.ts` — second sibling confirming the same inline-fixtures convention

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `isWindowActive(valid_from, valid_until, now)` (model.ts:822) — the single shared active-window helper; reuse as-is for both Application grants and DatasetAccessGrant windows, do not introduce a divergent convention
- `CLEARANCE_RANK` (model.ts:15) and `effectiveClassification()` (model.ts:855) — reuse directly for the clearance gate and classification derivation; `effectiveDatasetClassification` should mirror `effectiveClassification`'s fail-closed-on-missing-parent pattern
- `ResourceAccessGrant` (model.ts:755) — the existing v2.2 Application-level grant type; `resolveDatasetAccess`'s gate 2 checks these directly, does not need a new Application-grant type

### Established Patterns
- Append-only additions to `model.ts` with a clear section-header comment (e.g. `// --- Phase 9: Digital Resource hierarchy model (v2.2) ---`) — Phase 13 should add a matching `// --- Phase 13: Dataset model & access resolver (v2.3) ---` header
- Every time-dependent function takes an explicit `now: Date` parameter — no internal `Date.now()`/`new Date()` calls, keeps tests deterministic
- Structured `{allow, gates, reason?}`-style resolver results, mirrored from `ResourceAccessResult` — `DatasetAccessResult` follows the same shape plus the new `visible` field (D-03)
- Sibling test files use ONE fixed `NOW` plus named boundary constants (e.g. `NOW_A`/`NOW_B`) for window-shift cases, and exactly-named pitfall-test functions the verifier greps for — Phase 13's test file should follow the same naming discipline for its 3 prohibition tests (D-01)

### Integration Points
- None yet with `world-state.tsx` or any UI component — Phase 13 is a pure, standalone addition to `model.ts` + its own test file; Phase 14 is the first phase to wire this into `WorldState`

</code_context>

<specifics>
## Specific Ideas

- The `ARCHIVE_ROLE_CONTAINS` map should be written as a `Record<ArchiveRole, ArchiveRole[]>` literal (D-02) — the user was explicit that "one role can contain another role... if not part of, then no substitution," which this shape represents directly and extensibly.
- The visibility gate must show up in the UI-facing trace array (D-03) even though Phase 15 owns the actual UI — the resolver's output shape should already anticipate that consumer.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

### Reviewed Todos (not folded)
- **fix-non-admin-login-redirect** (`.planning/todos/pending/fix-non-admin-login-redirect.md`) — matched Phase 13 with a weak keyword-only score (0.6, matched on generic terms "non/admin/after/phase"). Reviewed and NOT folded — it's an unrelated frontend auth-routing bug with zero connection to the pure TypeScript dataset resolver this phase builds. Remains in `.planning/todos/pending/` for a future phase to pick up.

</deferred>

---

*Phase: 13-dataset-model-access-resolver*
*Context gathered: 2026-07-04*
