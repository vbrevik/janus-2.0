# Phase 14: Mock Dataset & WorldState - Context

**Gathered:** 2026-07-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Seed a realistic mock dataset (mailboxes, an archiving system, document sites) into `WorldState` as static fixtures joinable to existing Application data by `application_id`, with a deny-matrix fixture proving every gate in Phase 13's 3-gate chain as the deciding gate at least once, plus a minimal grant-issuing action (`issueDatasetGrant`) that reuses Phase 13's `canIssueDatasetGrant` gate and produces an audit trail. Pure frontend mock — no backend calls, no new Application/Platform/Network fixtures. No UI (Phase 15).

</domain>

<spec_lock>
## Requirements (locked via SPEC.md)

**7 requirements are locked.** See `14-SPEC.md` for full requirements, boundaries, and acceptance criteria.

Downstream agents MUST read `14-SPEC.md` before planning or implementing. Requirements are not duplicated here.

**In scope (from SPEC.md):**
- New dataset fixtures in `seed.ts` (mailboxes, archive roles, document sites) — 2–3 people, 1–2 reused Applications, small hand-curated scale
- `WorldState.datasets` sub-object + initial state
- `dataset-selectors.ts` — pure read selectors mirroring `digital-resource-selectors.ts`
- One minimal `issueDatasetGrant` mutation action + its audit-log wiring
- Deny-matrix fixture + scenario-success/denial fixtures (DATA-SEED-04/05/06)
- 1–2 new Person fixtures IF the existing cast can't cleanly support the story — fictional data only

**Out of scope (from SPEC.md):**
- Any UI/component work — Phase 15
- WebSocket wiring for dataset events
- Modifying v2.2's existing digital-resource seed, selectors, or tests (they must remain unmodified and green) — **note:** this discussion resolved additive-only extension of v2.2's `RESOURCE_GRANTS` array as compatible with this constraint; see D-01
- Full CRUD reducer actions beyond the one minimal `issueDatasetGrant` — Phase 15 adds the rest
- Rich temporal variety across all fixtures — only the deny-matrix's expired-grant case needs a non-active window

</spec_lock>

<decisions>
## Implementation Decisions

### Person casting & Application-grant realism
- **D-01:** Only `subj-1` (Dana Reyes) currently holds ANY v2.2 `ResourceAccessGrant` — every other existing subject has zero. Add new, purely additive `ResourceAccessGrant` entries to v2.2's `RESOURCE_GRANTS` array in `seed.ts` for the other cast members. Verified no existing v2.2 test asserts array length or snapshots the array — additions don't break "unmodified and green." This is the most realistic option for Phase 15's live UI demo (real, resolvable grants rather than an all-invisible cast).
- **D-02:** The 2–3 person cast is **subj-1 (Dana Reyes, MILITARY_1, SECRET)**, **subj-2 (Sam Okafor, MILITARY_2, TOP_SECRET)**, **subj-3 (Lee Park, INTEL, CONFIDENTIAL)**. Spans 3 different units/clearances — good variety for archive-role tiers and gives a natural CONFIDENTIAL-clearance person for the clearance-fails deny-matrix case.
- **D-03:** New datasets attach to **`rsrc-milapp-1` (MilApp-1) + `rsrc-intapp-1` (IntelApp-1)** — the two existing Applications. subj-1 already has active grants on both; subj-2 and subj-3 get new additive grants per D-01.
- **D-04:** Mint **exactly 1 new Subject fixture** dedicated to denial narratives (DATA-SEED-05's "app grant present, no dataset grant" case and any "zero access" story), rather than overloading subj-1/2/3 (whose story is primarily about successful access) or reusing subj-4. Keeps the allow-cases and deny-cases cleanly separated across different people.

### Audit-log shape for `issueDatasetGrant`
- **D-05:** SPEC.md's "existing `AuditLogEntry` interface" does not exist anywhere in the repo (verified via full-repo grep). The only audit-like mechanism is `AttrEvent`/`AttrOp` (ABAC compartment domain: `{seq, subjectId, op, value?: Compartment, actor}`), whose `value` field is a closed 6-value `Compartment` enum that cannot hold `dataset_id`/`level`. v2.2's own grant-issuing action (`UPSERT_RESOURCE_GRANT`) has zero audit trail today — there is no real precedent to "reuse." Resolution: introduce a small new `DatasetAuditEntry` type mirroring `AttrEvent`'s PATTERN (seq/actor/append-only, not its literal shape), stored as `WorldState.datasets.auditLog: DatasetAuditEntry[]`. This is new (small, scoped) infrastructure, not a literal reuse of a nonexistent interface — flag this explicitly to the researcher/planner so they don't go hunting for `AuditLogEntry`.
- **D-06:** `DatasetAuditEntry` captures the issuer as **`actor_person_id` + `actor_org_id`** (raw IDs), matching `canIssueDatasetGrant`'s own parameters (`actorOrgId`, `actorPersonId`) exactly — not a single role-label string like `AttrEvent.actor`. Lets a future Phase 15 UI show "issued by Org X via delegate Person Y" without re-deriving anything.
- **D-07:** `DatasetAuditEntry` stores **both** `seq: number` (shares `WorldState.seq`, consistent ordering with `AttrEvent`) **and** `timestamp: Date` (the `now` passed into `issueDatasetGrant`) — not seq-only. Phase 15's UI needs a real date without correlating seq back to wall-clock time.
- Per SPEC.md R7 (unchanged): a gate-failing `issueDatasetGrant` call creates neither a grant nor an audit entry — `canIssueDatasetGrant` is checked first, and refusal is silent (no audit record for a rejected attempt).

### Scenario tests: real seed vs. standalone fixtures
- **D-08:** DATA-SEED-04/05/06 (prerequisite-success, dataset-gate-denial, 3-way deny-matrix) resolve against the **real seeded `seed.ts`/`WorldState` arrays**, mirroring `digital-resource.test.ts`'s existing "seed integration" `describe` block (lines 888+) — NOT Phase 13's standalone-inline-fixture convention. This proves the actual demo data resolves correctly; Phase 15's live UI will render exactly the data these tests exercise.
- **D-09:** These seed-integration scenario tests, plus the `application_id`-join selector tests, all live in one new file: **`dataset-selectors.test.ts`** — no separate `dataset-seed.test.ts`. Since `dataset-selectors.ts` is itself new this phase, one new test file covers both concerns.

### WorldState.datasets init pattern
- **D-10:** `WorldState.digitalResources` now starts EMPTY at `seedWorld()` (Phase 11 moved it to backend-fetch-populated — see `world-state.tsx:132-134`'s comment). Datasets stay pure frontend mock (no backend, per SPEC's interview resolution), so `WorldState.datasets` must NOT mirror the current `digitalResources` pattern. Instead mirror the **`zones`/`grants`/`delegates` pattern**: `datasets: { nodes: [...DATASET_NODES], grants: [...DATASET_GRANTS], delegates: [...DATASET_DELEGATES] }` populated eagerly and directly from new `seed.ts` constants inside `seedWorld()`. No new action needed to populate it.
- **D-11:** `dataset-selectors.ts`'s functions take **individual array params** (e.g. `(datasets: DatasetNode[], applications: ApplicationNode[], ...)`), matching `digital-resource-selectors.ts`'s existing pure-function signature style exactly — NOT a single `(state: WorldState)` parameter. Callers pass `state.datasets.nodes` and `state.digitalResources.applications` explicitly at call sites (the latter will be populated by the time the live UI runs, per the `SET_DIGITAL_RESOURCES` action from Phase 12's backend fetch).

### Claude's Discretion
- Exact fixture IDs/names for the new mailboxes, archive dataset, document sites, and the 1 new denial-narrative Subject — follow existing `seed.ts` section-comment convention and fictional-name hygiene (per SPEC.md Prohibitions).
- Exact distribution of which archive role (READER/CASE_HANDLER/ADMIN) each of subj-1/2/3 holds, and which document-site levels each holds — pick whatever tells the cleanest story once fixtures are drafted.
- Whether the new additive `ResourceAccessGrant` entries for subj-2/subj-3 are all "active," or one is deliberately the deny-matrix's "expired" case (per D-01's rationale, at least one should be expired to give the app-grant-expired deny scenario a real fixture, not just an absent one).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Roadmap
- `.planning/phases/14-mock-dataset-worldstate/14-SPEC.md` — locked requirements, boundaries, acceptance criteria, edge/prohibition coverage (MANDATORY, read first)
- `.planning/REQUIREMENTS.md` — DATA-SEED-01..06, DATA-ACCESS-01..04 (resolver gate order), DATA-DELEG-01 (delegate cap)
- `.planning/ROADMAP.md` §"Phase 14: Mock Dataset & WorldState" — goal, depends-on, success criteria. **Note:** its goal wording ("joinable to backend-fetched Application data") is stale relative to SPEC.md's interview-resolved "pure frontend mock" scope — SPEC.md wins per D-10/D-11's reasoning above (`state.digitalResources.applications` is populated live in the browser by Phase 12's fetch, but datasets themselves need no fetch).
- `.planning/phases/13-dataset-model-access-resolver/13-CONTEXT.md` — Phase 13's locked decisions (D-01..D-07 there): inline-fixture test convention (superseded for THIS phase's scenario tests by D-08 above — Phase 13's own `dataset.test.ts` stays inline-only, only Phase 14's new seed-integration tests differ), `ARCHIVE_ROLE_CONTAINS` shape, gate-trace shape, resolver output shape, admin_org exemption, missing-application soft-fail handling, ARCHIVE_ROLE union-of-coverage aggregation
- `.planning/phases/13-dataset-model-access-resolver/13-SPEC.md` — full Phase 13 requirement text for `resolveDatasetAccess`/`canIssueDatasetGrant`

### Codebase precedent (extension points)
- `frontend/src/demo/lib/model.ts:1166-1745` (Phase 13 section) — `DatasetNode`, `DatasetAccessGrant`, `DatasetAccessDelegate`, `DatasetType`, `MailboxLevel`/`ArchiveRole`/`DocumentSiteLevel`, `resolveDatasetAccess`, `canIssueDatasetGrant`, `effectiveDatasetClassification` — all the primitives Phase 14 seeds data for and wires into `WorldState`
- `frontend/src/demo/store/world-state.tsx:76-147` — `WorldState` interface + `seedWorld()`; note `zones`/`grants`/`delegates` (lines 126-130, eager seed-array pattern to mirror) vs `digitalResources` (lines 132-145, now empty-then-fetch-populated, NOT the pattern to mirror)
- `frontend/src/demo/store/world-state.tsx:149-197, 509-535` — `Action` union and `UPSERT_RESOURCE_GRANT`/`UPSERT_RESOURCE_DELEGATE` reducer cases — the closest existing precedent for a new `ISSUE_DATASET_GRANT`-style action, though note it has NO audit trail (see D-05)
- `frontend/src/demo/store/world-state.tsx:204-221, 564-571` — `appendEvent()` helper and `AttrEvent`/`AttrOp` types — the only existing "audit-log-like" mechanism in the codebase; per D-05, its shape doesn't fit and a new `DatasetAuditEntry` is needed instead
- `frontend/src/demo/lib/seed.ts:1680-1826` — `RESOURCE_GRANTS` array (v2.2), currently 100% `person_id: "subj-1"` — the array D-01 additively extends
- `frontend/src/demo/lib/seed.ts:53-101` — `BASE_SUBJECTS` (subj-1..4) with names/units/clearances — the cast pool D-02/D-04 draw from
- `frontend/src/demo/lib/digital-resource-selectors.ts` — sibling selectors file (`buildResourceTree`, `activeGrantsForResource`, `resolveResourceAt`) — the individual-array-params signature style D-11 mirrors
- `frontend/src/demo/lib/digital-resource.test.ts:888-944` (and surrounding "seed integration" describe block) — the seed-integration test pattern D-08/D-09 mirror for the new `dataset-selectors.test.ts`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `isWindowActive(valid_from, valid_until, now)` (model.ts:822) — reuse as-is for `DatasetAccessGrant`/`DatasetAccessDelegate` windows in fixtures and any new selector logic
- `RESOURCE_NODES`/`APPLICATIONS` (seed.ts) — `rsrc-milapp-1` and `rsrc-intapp-1` are the two Applications new dataset fixtures attach to (D-03); no new Application/Platform/Network fixtures needed
- `BASE_SUBJECTS` subj-1/2/3 (seed.ts:53-101) — the cast (D-02); their existing `clearance`/`unit` fields already give useful variety (SECRET/TOP_SECRET/CONFIDENTIAL) for the clearance-gate deny-matrix case without needing new clearance values

### Established Patterns
- Append-only additions to `seed.ts` with a clear section-header comment (matches Phase 9/10's `// --- Phase 9/10 — Digital Resource fixtures. ---` convention) — Phase 14 should add a matching `// --- Phase 14: Mock dataset fixtures (v2.3) ---` header
- `seedWorld()`'s eager array-spread pattern (`zones: [...ZONES], grants: [...GRANTS], delegates: [...DELEGATES]`) — the pattern D-10 mirrors for `datasets`
- Every time-dependent function/fixture-consumer takes an explicit `now: Date` — no internal `Date.now()`/`new Date()` calls (constraint carried from Phase 13, applies equally to `dataset-selectors.ts` and `issueDatasetGrant`)

### Integration Points
- `frontend/src/demo/store/world-state.tsx` — `WorldState` interface (add `datasets` field), `seedWorld()` (populate it), `Action` union (add `ISSUE_DATASET_GRANT` or similar), `reducer()` (add the case, mirroring `UPSERT_RESOURCE_GRANT`'s style but gated by `canIssueDatasetGrant` first per D-05/SPEC R7)
- `frontend/src/demo/lib/seed.ts` — new dataset fixture section (mailboxes/archive/document-sites) PLUS additive new entries in the existing `RESOURCE_GRANTS` array (D-01) and possibly one new `BASE_SUBJECTS`-adjacent entry for the denial-narrative person (D-04)
- New file `frontend/src/demo/lib/dataset-selectors.ts` — joins by `application_id`, individual-array-params style (D-11)
- New file `frontend/src/demo/lib/dataset-selectors.test.ts` — selector tests + seed-integration scenario tests (D-08/D-09)

</code_context>

<specifics>
## Specific Ideas

- The clearance-fails deny-matrix case should exploit subj-3 (Lee Park, CONFIDENTIAL, INTEL) against a dataset whose effective classification is higher than CONFIDENTIAL — while still ensuring subj-3 has an active Application grant AND an active dataset grant, per the edge-probe's "other two gates independently pass" requirement.
- The app-grant-expired deny-matrix case needs an actual EXPIRED `ResourceAccessGrant` record (not just an absent one) for whichever cast member plays that scenario, on `rsrc-milapp-1` or `rsrc-intapp-1` — see D-01's discretion note.
- The new denial-narrative Subject (D-04) should have a live dataset grant but no qualifying Application grant at all (or vice versa, depending which specific SEED-05 wording is exercised) — exact framing left to drafting time.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

### Reviewed Todos (not folded)
None — `todo.match-phase` returned zero matches for Phase 14.

</deferred>

---

*Phase: 14-mock-dataset-worldstate*
*Context gathered: 2026-07-04*
