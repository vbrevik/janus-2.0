---
phase: 12
phase_name: "demo-ui-tab-integration"
project: "Janus 2.0"
generated: "2026-07-03"
counts:
  decisions: 7
  lessons: 5
  patterns: 5
  surprises: 4
missing_artifacts: []
---

# Phase 12 Learnings: demo-ui-tab-integration

## Decisions

### Seed-apply script carries zero idempotency logic of its own
The checked-in psql wrapper (`apply-digital-resource-seed.sh`) does no row-count pre-checks and uses no lock files — all idempotency lives in the seed migration's own `ON CONFLICT DO NOTHING` / `WHERE NOT EXISTS` guards, verified empirically (second run produced `INSERT 0 0` on every statement).

**Rationale:** One source of truth for idempotency; the script stays a thin transport that can't drift from the SQL's guarantees.
**Source:** 12-01-SUMMARY.md

### All date parsing happens once, at the mapper boundary
Raw-response interfaces mirror the backend snake_case field-for-field with every date typed `string | null`; `mapWorldResponse`/`parseNullableDate` convert to `Date | null` exactly once. Downstream code never parses dates.

**Rationale:** A single fail-closed denormalization point (which also throws on dangling `policy_id` references) keeps the rest of the UI free of defensive parsing.
**Source:** 12-02-SUMMARY.md, 12-02-PLAN.md

### Test pure helpers only — no hook-render harness
The React Query hooks file was tested via its pure helpers (`hasStoredToken`, `getStoredUserRole`, `classifyLoaderState`) with no `QueryClientProvider`+`WorldProvider` render harness, per 12-CONTEXT.md Claude's-Discretion.

**Rationale:** Mirrors the demo `lib/` test discipline; the hook wiring itself was covered by live UAT rather than a heavy render-test setup.
**Source:** 12-03-SUMMARY.md

### Reuse the window primitive, not the wrong-typed helper
Delegate validity was checked via `isWindowActive(valid_from, valid_until, now)` directly — `model.ts`'s `isDelegateActive` is typed to `ZoneAccessDelegate` (zone_id) and was deliberately not called. Similarly, the vestigial `granted_by_org_id` field was filled with the delegate person's own `.unit`, not an invented magic org string.

**Rationale:** Type-correct reuse over name-similar reuse; no fabricated data in requests.
**Source:** 12-04-SUMMARY.md

### Plan corrections override UI-SPEC pseudocode
`resolveResourceAt` is called with `person.unit` — 12-UI-SPEC's `person.org_id` pseudocode references a field that does not exist and would not compile. The plan carried an explicit IMPORTANT-CORRECTION and the executor followed it. Likewise the policy row renders window bounds only, because the trace result carries no `label` field the SPEC's variant assumed.

**Rationale:** The type system is the authority; design-doc pseudocode is illustrative, not contractual.
**Source:** 12-05-SUMMARY.md

### Loader gate: unmemoized token check, structural typing, hooks before early returns
`hasStoredToken()` is computed per render (no login flow in the demo, value stable per session); the `UseQueryResult` is passed straight into `classifyLoaderState` (structurally compatible, no adapter); the sub-nav `useState` is declared before the six-state early-return chain so hooks run unconditionally.

**Rationale:** Simplicity where the data is stable, and Rules-of-Hooks safety in a component that renders six mutually exclusive states.
**Source:** 12-06-SUMMARY.md

### Fix wiring bugs by adding parameters, not static imports
The zone-advisory fix threaded `allZones`/`allPhysicalGrants` as explicit parameters (inserted to mirror `resolveResourceAccess`'s own parameter order), with the caller passing live `WorldState.zones`/`WorldState.grants` — a static `seed.ts` import inside the selector was explicitly prohibited.

**Rationale:** Preserves the file's pure-read-selectors/explicit-inputs contract, keeps the regression test on inline fixtures, and keeps future physical-grant mutations in sync with the advisory computation.
**Source:** 12-07-SUMMARY.md, 12-07-PLAN.md

---

## Lessons

### Grep/JSX verification proves presence, not life
The amber zone-advisory row (RSRC-UI-05) passed every automated check — the JSX conditional existed, the Pill copy grep-matched, unit tests on the underlying resolver were green — while being permanently dead code in the running app, because a selector wrapper hardcoded `[]` for the zone inputs. Only live-browser UAT found it.

**Context:** The resolver's own tests passed because they call it directly with real zone data, bypassing the broken wrapper. The missing piece was a test on the wrapper — the exact integration point.
**Source:** 12-UAT.md (Gap 1), 12-07-SUMMARY.md

### Vitest green ≠ compilable: type-check gates must actually run
27 tsc errors accumulated invisibly from Phase 10 onward because vitest transpiles without type-checking and no phase gate ran `tsc -b`. 12-02's "zero TypeScript errors" acceptance criterion was unmeetable until the pre-existing breakage was repaired as a blocking deviation.

**Context:** The same failure class hit the backend (`cargo test` broken by a test-fixture field). A verification gate that never executes is indistinguishable from one that passes.
**Source:** 12-02-SUMMARY.md (Deviations)

### Coverage-block `kind:` vocabulary must match the validator
SUMMARY coverage entries using compound kinds (`build+unit`, `build+grep`, `build+unit+diff`) failed `uat.classify-coverage` validation (`invalid_kind`) and fell back to human checkpoints instead of auto-passing — even though the underlying verifications were real and green.

**Context:** The classifier accepts only `unit | integration | e2e | automated_ui | manual_procedural | other`. Compound checks should be split into multiple entries or use `other` with a descriptive ref.
**Source:** 12-UAT.md (test 5 reason), classify-coverage errors on 12-02..12-06 SUMMARYs

### Session interruptions recover cleanly when commits are the source of truth
12-02 was interrupted mid-task-3 (QueryClientProvider applied but uncommitted, `CLEARANCE_TONE` export missing). The safe-resume gate reconciled commits-vs-SUMMARY, identified the exact half-applied state, and closed out manually with no duplicated work.

**Context:** Atomic per-task commits plus the PLAN/SUMMARY convention made "where exactly did this die?" answerable from git alone.
**Source:** 12-02-SUMMARY.md (Deviations)

### Real wall-clock time will expire JWTs mid-UAT — and that's a test, not a bug
A viewer token expired during the long-running UAT session, rendering "Session invalid or expired." An initial bug suspicion was disproven by comparing the token's `exp` claim to the epoch clock — and the incident incidentally verified a third loader state live.

**Context:** Long conversational UAT sessions span real hours; distinguish environmental effects from regressions before diagnosing.
**Source:** 12-UAT.md (Notes)

---

## Patterns

### Six-state fail-loud loader machine
`classifyLoaderState` discriminates missing-token / loading / unauthorized(401) / error / empty / success as a pure function over the query snapshot; exactly one state renders; missing-token never fires the fetch (`enabled: hasToken`); Retry exists only in the error state; no silent seed/stale fallback exists.

**When to use:** Every API-backed panel where showing stale or fabricated data would misrepresent live authorization state.
**Source:** 12-06-SUMMARY.md, 12-03-SUMMARY.md

### Server response as the only write path into client state
`useIssueGrant`/`useIssueDelegate` dispatch the *mapped server response* into WorldState via `UPSERT_RESOURCE_*` on success — never an optimistic local append. Client-only state (`disabledResourceGrantIds`) is preserved wholesale across `SET_DIGITAL_RESOURCES` refetches.

**When to use:** Any mutation whose authoritative result (IDs, windows, server-computed fields) comes from the backend; keeps UI and DB from diverging.
**Source:** 12-04-SUMMARY.md, 12-05-SUMMARY.md, 12-02-SUMMARY.md

### Structured coverage blocks in SUMMARY frontmatter
Each deliverable maps to a requirement and concrete verification refs (`coverage: [{id, description, requirement, verification[], human_judgment}]`), letting UAT generation deterministically auto-pass machine-verified deliverables and present only human-judgment items.

**When to use:** Every executed plan; combine with the strict `kind:` vocabulary lesson above so entries actually classify.
**Source:** 12-01..12-07 SUMMARY.md frontmatter, 12-UAT.md

### TDD RED/GREEN commit pairs per behavioral task
Behavior-adding tasks commit a failing test first (`test(NN-MM): ... (RED)`) then the implementation (`feat(NN-MM): ... (GREEN)`) — held across 12-02, 12-03, and the 12-07 gap fix, where the RED commit demonstrably failed before the fix.

**When to use:** Any task whose acceptance is expressible as a test; the RED commit is the proof the test can fail.
**Source:** 12-02-SUMMARY.md, 12-03-SUMMARY.md, 12-07-SUMMARY.md

### Pure selectors take explicit inputs (D3-13)
Selector/lib modules never import production seed data; all world inputs arrive as parameters, and their tests use inline fixtures. The 12-07 fix codified this as a grep-verifiable prohibition (`from "./seed"` count must be 0 in the selectors file).

**When to use:** Any pure derivation layer meant to be unit-testable in isolation — and note the corollary: a wrapper that "simplifies" by dropping inputs (hardcoding `[]`) is exactly how the zone-advisory bug was born.
**Source:** 12-07-PLAN.md (prohibitions), 12-07-SUMMARY.md

---

## Surprises

### The build had been broken for two phases and nobody noticed
12-02's routine "npm run build passes" criterion uncovered 27 pre-existing tsc errors dating back to Phase 10 — missing type imports, `NONE` keys on a `ClearanceLevel` record with no such variant, unused vars — none of which any test run had surfaced.

**Impact:** One-time blocking-deviation repair (`beef07e`); every later plan's build gate became meaningful again.
**Source:** 12-02-SUMMARY.md (Deviations)

### The dataset requirement built to exercise a feature couldn't prove the feature was dead
RSRC-SEED-04 existed specifically so the advisory zone row would be "exercised (not dormant)" — yet the row was dormant in the running app anyway, because the data path (not the data) was severed. The seeded fixture, the resolver logic, and the JSX were all individually correct.

**Impact:** Major-severity UAT gap → same-day 12-07 fix with a regression test on the previously untested wrapper; "grep proves presence, not life" recorded as the milestone's canonical verification lesson.
**Source:** 12-UAT.md (test 10, Gap 1)

### Live UAT found a pre-existing bug outside the phase entirely
Logging in as any non-admin seed user succeeds but never redirects off `/login` — a main-app auth-flow bug that predates Phase 12, discovered only because role-gating tests required a real non-admin login.

**Impact:** Not a Phase 12 gap; captured as `.planning/todos/pending/fix-non-admin-login-redirect.md` so it survives phase archival. Adversarial UAT audits neighboring code for free.
**Source:** 12-UAT.md (Notes)

### One plan spanned two sessions and an interruption without losing a commit
12-02 died mid-task-3 and was found later as "4 commits, no SUMMARY, half-applied working tree" — the safe-resume protocol reconstructed the exact position and finished the remaining one-line edit rather than re-executing anything.

**Impact:** ~zero rework; validated the commits-plus-SUMMARY bookkeeping as interruption insurance.
**Source:** 12-02-SUMMARY.md (Deviations, duration field)
