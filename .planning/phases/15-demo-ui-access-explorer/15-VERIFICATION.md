---
phase: 15-demo-ui-access-explorer
verified: 2026-07-06T15:40:00Z
status: passed
score: 15/15 must-haves verified
behavior_unverified: 0
overrides_applied: 0
---

# Phase 15: Demo UI & Access Explorer Verification Report

**Phase Goal:** A developer or stakeholder can browse datasets nested within an Application, resolve dataset access for a person/dataset/time with a full gate-chain trace, see who has access to a dataset at what level, and — if authorized — issue a new DatasetAccessGrant, all reusing the resolver and row-rendering style already proven in the Digital Resources tab.
**Verified:** 2026-07-06T15:40:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `ISSUE_DATASET_GRANT` accepts `validFrom`/`validUntil` and wires them through by reference, backward-compatible with omission | ✓ VERIFIED | `world-state.tsx:219-227` (Action union), `:592-593` (`valid_from: action.validFrom ?? null`); test `world-state.test.tsx:373-392` asserts `toBe` reference equality; 2 pre-existing tests (admin-org success, denial) unmodified and green |
| 2 | Denial of `ISSUE_DATASET_GRANT` resolves `useIssueDatasetGrant`'s `isPending`→false/`isError`→true via the setTimeout(0) fallback surviving the `useReducer` Object.is bailout | ✓ VERIFIED | `use-datasets.ts:64-108` dual effect+timeout pattern; `use-datasets.test.ts` "resolves isPending=false, isError=true on the deny path (Pitfall 1 fallback)" — a genuine renderHook+fake-timer test exercising the actual bailout, not a presence-only check |
| 3 | `ErrorBoundary` compiles cleanly under `erasableSyntaxOnly:true` (class-field-only, no constructor-parameter-property) | ✓ VERIFIED | `ui.tsx:144-176` — plain `state: {...} = {...}` field, no constructor; `npx tsc -b --noEmit` independently re-run: 0 errors |
| 4 | `DatasetAccessExplorer` renders all 4 gate-chain entries (CLEARANCE, APP_GRANT_OR, DATASET_GRANT, VISIBILITY) unconditionally, styled like `ResourceResolutionTrace` | ✓ VERIFIED | `dataset-access-explorer.tsx:65-88` `DatasetResolutionTrace` maps `result.gates` with no `.filter`/`.slice`; `rounded-lg border p-4`, green/red verdict bg, `text-lg font-semibold` verdict line all present verbatim |
| 5 | Required-level field always populated from the dataset's own vocabulary, defaulting to lowest | ✓ VERIFIED | `levelVocabularyFor` exhaustive switch (`assertNeverDatasetType` default) at `dataset-access-explorer.tsx:48-59`; `requiredLevel` initial state = `levelVocabularyFor(dataset.dataset_type)[0]` |
| 6 | Reverse-lookup shows exactly one row per person at combined effective level, via `resolveDatasetAt` per person (not a shortcut) | ✓ VERIFIED | `dataset-reverse-lookup.tsx:87-128` — `rows` built from `world.subjects.map(...)`, calling `resolveDatasetAt` per subject; `resolveDatasetAt` delegates directly to Phase 13's `resolveDatasetAccess` (`dataset-selectors.ts:48-75`, no post-processing) |
| 7 | Zero active grants renders explicit empty message, never a blank panel | ✓ VERIFIED | `dataset-reverse-lookup.tsx:132-135` verbatim "No one currently has access to this dataset." |
| 8 | Admin-gated issuing form gated on `getStoredUserRole() === "admin"`; non-admin sees only the block message | ✓ VERIFIED | `dataset-access-explorer.tsx:106,139-145` — early return before the toggle button is reachable |
| 9 | Selecting rsrc-milapp-1 shows 4 datasets (2 mailbox, 1 archive, 1 doc site); rsrc-intapp-1 shows 1; rsrc-tacapp-1 (0 datasets) shows explicit empty state | ✓ VERIFIED | Seed data (`seed.ts:1899-1944`) confirmed directly: 4 `DATASET_NODES` entries reference `rsrc-milapp-1` (MAILBOX×2, ARCHIVE_ROLE×1, DOCUMENT_SITE×1), 1 references `rsrc-intapp-1`, 0 reference `rsrc-tacapp-1`; unit test `dataset-selectors.test.ts:25-38` independently asserts these exact counts; `datasets-panel.tsx:191-194` renders "No datasets for this Application." when `datasets.length === 0` |
| 10 | A dataset spanning 2+ Applications would appear once per Application (no dedup) — structural correctness, no fixture yet | ✓ VERIFIED | `datasetsForApplication` (`dataset-selectors.ts:22-27`) is a plain `.filter(d => d.application_ids.includes(applicationId))` — generic, no dedup logic; SPEC.md explicitly defers the multi-app fixture (structural-only, matches documented boundary) |
| 11 | DatasetsPanel performs its own independent `useDigitalResourcesWorld` fetch, working regardless of tab-visit order | ✓ VERIFIED | `datasets-panel.tsx:82-98` — own `useDigitalResourcesWorld(hasToken)` call + `SET_DIGITAL_RESOURCES` dispatch on `query.isSuccess`; the 5 non-success loader branches are byte-identical to `digital-resources-panel.tsx`'s |
| 12 | Before any dataset is selected, explorer/reverse-lookup do not render at all | ✓ VERIFIED | `datasets-panel.tsx:210-215` — `{selectedDataset && (<ErrorBoundary>...)}`, no placeholder branch |
| 13 | Explorer/reverse-lookup subtree wrapped in `ErrorBoundary` keyed by dataset id, self-recovers on dataset switch | ✓ VERIFIED | `datasets-panel.tsx:211` `<ErrorBoundary key={selectedDataset.id}>` wraps only the two components, not the picker |
| 14 | All 3 deny-matrix scenarios on ds-archive-caserecords isolate to the single correct failing gate; ≥2 allow scenarios render ALLOW | ✓ VERIFIED | Unit-tested independently at the selector level: `dataset-selectors.test.ts:125-193` "deny-matrix (a/b/c)" each assert exactly one failing gate + two passing gates; `DATA-SEED-04` test asserts a full-chain ALLOW; corroborated by the plan's live-UAT (Task 3, approved 2026-07-06) which required a genuine backend seed-data fix (commit `9e3acbc`, verified present in `backend/migrations/20260601130001_seed_digital_resources.sql:397-398`) before the isolation held at the UI layer — the fix and re-verification are consistent with a real (not fabricated) UAT pass |
| 15 | Non-admin blocked from issuing; admin issuing round-trip flips a DENY to ALLOW and updates reverse-lookup; full regression suite + tsc stay green | ✓ VERIFIED | Code-level gate confirmed (truth #8); regression independently re-run by this verification: `317/317` tests passing across `21` test files, `npx tsc -b --noEmit` 0 errors; admin round-trip corroborated by live-UAT approval (2026-07-06) plus the code path (`handleIssueGrant` → `mutate` → reducer → `auditLog` growth → reverse-lookup `useMemo` recompute) |

**Score:** 15/15 truths verified (0 present-but-behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `frontend/src/demo/store/world-state.tsx` | `ISSUE_DATASET_GRANT` gains `validFrom`/`validUntil` | ✓ VERIFIED | Lines 219-227, 592-593; wired, tested |
| `frontend/src/demo/components/ui.tsx` | new `ErrorBoundary` export | ✓ VERIFIED | Lines 144-176; wired into `datasets-panel.tsx` |
| `frontend/src/demo/hooks/use-datasets.ts` | `IssueDatasetGrantVariables` + `useIssueDatasetGrant` | ✓ VERIFIED | Full file read; denial-safe dual-path pattern with `callId` tagging (WR-03 fix) and `mountedRef` cleanup (WR-04 fix) present |
| `frontend/src/demo/hooks/use-datasets.test.ts` | allow/deny renderHook tests | ✓ VERIFIED | Both tests present, passing, genuinely exercise the reducer bailout via fake timers |
| `frontend/src/demo/components/dataset-access-explorer.tsx` | `DatasetAccessExplorer` + internals | ✓ VERIFIED | Exports present (`grep -c` = 1); CR-01/WR-01/WR-02 fixes all present in source (guard on empty `validFrom`, local-date `todayStr`, KNOWN LIMITATION header comment) |
| `frontend/src/demo/components/dataset-reverse-lookup.tsx` | `DatasetReverseLookup` + internals | ✓ VERIFIED | Export present; per-person iteration confirmed |
| `frontend/src/demo/components/datasets-panel.tsx` | `DatasetsPanel` orchestrator | ✓ VERIFIED | Export present; wiring to explorer/reverse-lookup/ErrorBoundary confirmed |
| `frontend/src/demo/DemoRoot.tsx` | `ActiveView` gains `"datasets"`, nav button, `<main>` branch | ✓ VERIFIED | All 3 wiring points present (union member, button, main-swap) |
| `backend/migrations/20260601130001_seed_digital_resources.sql` | 2 missing deny-matrix grant rows added during live UAT | ✓ VERIFIED | Lines 397-398 confirmed present |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `dataset-access-explorer.tsx` / `dataset-reverse-lookup.tsx` | `resolveDatasetAccess` (Phase 13) | `resolveDatasetAt` thin wrapper | ✓ WIRED | `dataset-selectors.ts:48-75` delegates verbatim, no re-derived logic |
| `IssueDatasetGrantSection` | `useIssueDatasetGrant` | `mutate()` call | ✓ WIRED | Always passes `dataset.admin_org_id` per documented D-10/D-11 rationale |
| `datasets-panel.tsx` | `useDigitalResourcesWorld` | own independent fetch + `SET_DIGITAL_RESOURCES` dispatch | ✓ WIRED | Confirmed at lines 82-98 |
| `datasets-panel.tsx` | `DatasetAccessExplorer`/`DatasetReverseLookup` | `<ErrorBoundary key={selectedDataset.id}>` | ✓ WIRED | Scoped to exactly the two components, not the picker |
| `DemoRoot.tsx` | `DatasetsPanel` | `"datasets"` `ActiveView` branch | ✓ WIRED | Confirmed |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full Vitest suite passes | `cd frontend && npx vitest run` (rtk proxy, unfiltered) | 317 passed / 0 failed, 21 test files | ✓ PASS |
| Type-check clean | `cd frontend && npx tsc -b --noEmit` | 0 errors | ✓ PASS |
| ESLint clean on phase-15 files | `npx eslint` on all 7 modified/created files | 0 errors (world-state.tsx's 6 `react-refresh/only-export-components` errors are pre-existing — confirmed identical count against the pre-phase-15 file content) | ✓ PASS |
| Deny-matrix gate isolation (unit, not UI) | `dataset-selectors.test.ts` "deny-matrix (a/b/c)" | All 3 assert single-gate isolation | ✓ PASS (existence + logic confirmed via source read, part of the 317 passing) |
| Denial-safe hook state transition (behavior-dependent truth #2) | `use-datasets.test.ts` both tests | Both pass under fake timers | ✓ PASS — this is the behavioral evidence for truth #2 (a state-transition/cancellation-shaped truth), upgrading it from presence-only to VERIFIED |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|--------------|------------|-------------|--------|----------|
| DATA-UI-01 | 15-03 | Datasets tab shows datasets nested within selected Application | ✓ SATISFIED | Dedicated "Datasets" top-level tab (deliberate spec-phase decision, see note below) shows correct dataset counts per Application, verified against seed data directly |
| DATA-UI-02 | 15-01, 15-02, 15-03 | Access Resolution Explorer extended to dataset level, full 4-gate trace | ✓ SATISFIED | `DatasetAccessExplorer`/`DatasetResolutionTrace` render all 4 gates unconditionally |
| DATA-UI-03 | 15-02, 15-03 | Reverse-lookup, one row per person via the resolver | ✓ SATISFIED | `DatasetReverseLookup` confirmed |
| DATA-UI-04 | 15-01, 15-02, 15-03 | Admin-gated issuing form, non-admin blocked, regression green | ✓ SATISFIED | `IssueDatasetGrantSection` gate confirmed; live UAT approved; regression independently re-verified |

No orphaned requirements: `.planning/REQUIREMENTS.md`'s traceability table maps exactly DATA-UI-01..04 to Phase 15, and all 4 appear in at least one plan's `requirements:` frontmatter field.

**Note on DATA-UI-01 / ROADMAP wording:** ROADMAP.md's literal Success Criterion 1 text says "The Resource Browser shows a Datasets section within each selected Application" (implying embedding inside the existing Digital Resources/Resource Browser tab). The shipped implementation is a new, separate top-level "Datasets" tab instead. This is not a silent deviation — `15-SPEC.md` (line 19, and the resolved "Tab placement: inside Digital Resources or new tab?" open question at lines 120-123) explicitly reasoned through and locked this as the intended interpretation during spec-phase, before any code was written, and the phase's own goal statement (used as this verification's authority per the task) already reads "browse datasets nested within an Application" — satisfied functionally by the new tab. Not flagged as a gap.

### Anti-Patterns Found

None. Scanned all 7 phase-15-modified/created files for `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER`/stub patterns — zero matches. The one pre-existing lint category (`react-refresh/only-export-components` in `world-state.tsx`) predates this phase (confirmed identical against the pre-phase-15 file revision) and is unrelated to the 2 lines this phase added there.

### Code Review Fix Verification

`15-REVIEW.md` found 1 critical + 4 warnings (4 info items out of scope). `15-REVIEW-FIX.md` claims all 5 fixed. Independently re-read the current source and confirmed each fix is actually present (not just claimed):
- CR-01 (empty/invalid "Valid from" silently issuing a dead grant): `dataset-access-explorer.tsx:152-154` guards `!validFrom` and `Number.isNaN(parsedFrom.getTime())` before `mutate()`; `required` attribute added to the input (line 205).
- WR-01 (UTC vs local date): `todayStr()` now builds from local `getFullYear`/`getMonth`/`getDate` (lines 90-98).
- WR-02 (unreachable delegate-deny path): documented as a known limitation in the file header comment (lines 7-15).
- WR-03 (no per-call identity in `useIssueDatasetGrant`): `callIdRef`/`pendingRef.callId` tagging present (`use-datasets.ts:46-51, 79-81, 102-107`).
- WR-04 (uncleared timeout on unmount): `mountedRef` + cleanup effect present (`use-datasets.ts:57-62, 101`).

### Human Verification Required

None outstanding. The plan's blocking `checkpoint:human-verify` (15-03 Task 3) already occurred during execution — approved 2026-07-06 per `15-03-SUMMARY.md`'s coverage section, after all 8 `<how-to-verify>` steps were independently confirmed against the running stack (frontend/backend/Postgres), including a genuine data bug found and fixed mid-UAT (backend seed migration, commit `9e3acbc`) rather than a rubber-stamp approval. This verification independently corroborated the underlying data/logic (seed counts, deny-matrix gate isolation, gate-rendering code) rather than relying on the SUMMARY's narrative alone.

### Gaps Summary

No gaps. All 15 derived must-have truths verified against actual source code, seed data, and an independently re-run test/type-check suite (317/317 passing, 0 tsc errors) — not merely SUMMARY claims. All 5 code-review findings' fixes were confirmed present in the current source, not just claimed in 15-REVIEW-FIX.md. The one apparent ROADMAP-wording deviation (separate tab vs. embedded-in-Resource-Browser) was a documented, deliberate spec-phase decision made before implementation, not an unreviewed drift, and it satisfies the phase's own stated goal.

---

_Verified: 2026-07-06T15:40:00Z_
_Verifier: Claude (gsd-verifier)_
