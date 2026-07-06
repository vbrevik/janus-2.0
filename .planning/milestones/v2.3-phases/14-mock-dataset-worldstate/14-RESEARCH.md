# Phase 14: Mock Dataset & WorldState - Research

**Researched:** 2026-07-04
**Domain:** Frontend TypeScript fixture/seed data + Vitest gate-trace testing (no backend, no UI)
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Only `subj-1` (Dana Reyes) currently holds ANY v2.2 `ResourceAccessGrant` — every other existing subject has zero. Add new, purely additive `ResourceAccessGrant` entries to v2.2's `RESOURCE_GRANTS` array in `seed.ts` for the other cast members. Verified no existing v2.2 test asserts array length or snapshots the array — additions don't break "unmodified and green."
- **D-02:** The 2–3 person cast is **subj-1 (Dana Reyes, MILITARY_1, SECRET)**, **subj-2 (Sam Okafor, MILITARY_2, TOP_SECRET)**, **subj-3 (Lee Park, INTEL, CONFIDENTIAL)**.
- **D-03:** New datasets attach to **`rsrc-milapp-1` (MilApp-1) + `rsrc-intapp-1` (IntelApp-1)** — the two existing Applications. subj-1 already has active grants on both; subj-2 and subj-3 get new additive grants per D-01.
- **D-04:** Mint **exactly 1 new Subject fixture** dedicated to denial narratives (DATA-SEED-05's "app grant present, no dataset grant" case and any "zero access" story).
- **D-05:** SPEC.md's "existing `AuditLogEntry` interface" does not exist anywhere in the repo (verified via full-repo grep, re-confirmed in this research pass). Introduce a small new `DatasetAuditEntry` type mirroring `AttrEvent`'s PATTERN (seq/actor/append-only, not its literal shape), stored as `WorldState.datasets.auditLog: DatasetAuditEntry[]`.
- **D-06:** `DatasetAuditEntry` captures the issuer as **`actor_person_id` + `actor_org_id`** (raw IDs), matching `canIssueDatasetGrant`'s own parameters exactly — not a single role-label string like `AttrEvent.actor`.
- **D-07:** `DatasetAuditEntry` stores **both** `seq: number` (shares `WorldState.seq`) **and** `timestamp: Date` (the `now` passed into `issueDatasetGrant`) — not seq-only.
- Per SPEC.md R7 (unchanged): a gate-failing `issueDatasetGrant` call creates neither a grant nor an audit entry — `canIssueDatasetGrant` is checked first, and refusal is silent.
- **D-08:** DATA-SEED-04/05/06 resolve against the **real seeded `seed.ts`/`WorldState` arrays**, mirroring `digital-resource.test.ts`'s existing "seed integration" `describe` block (lines 888+) — NOT Phase 13's standalone-inline-fixture convention.
- **D-09:** These seed-integration scenario tests, plus the `application_id`-join selector tests, all live in one new file: **`dataset-selectors.test.ts`** — no separate `dataset-seed.test.ts`.
- **D-10:** `WorldState.digitalResources` now starts EMPTY at `seedWorld()` (backend-fetch-populated). Datasets stay pure frontend mock, so `WorldState.datasets` must NOT mirror the current `digitalResources` pattern. Instead mirror the **`zones`/`grants`/`delegates` pattern**: `datasets: { nodes: [...DATASET_NODES], grants: [...DATASET_GRANTS], delegates: [...DATASET_DELEGATES] }` populated eagerly inside `seedWorld()`. No new action needed to populate it.
- **D-11:** `dataset-selectors.ts`'s functions take **individual array params** (e.g. `(datasets: DatasetNode[], applications: ApplicationNode[], ...)`) — NOT a single `(state: WorldState)` parameter. Callers pass `state.datasets.nodes` and `state.digitalResources.applications` explicitly at call sites. **Research nuance (see "Confirm Zero Drift" below): the actual sibling file `digital-resource-selectors.ts` takes a single `world: DigitalResourceWorld` sub-object param, not individual arrays — D-11 is still the right call for datasets since the join spans two different sub-objects, but implement it as a deliberate divergence, not a literal mirror.**

### Claude's Discretion
- Exact fixture IDs/names for the new mailboxes, archive dataset, document sites, and the 1 new denial-narrative Subject — follow existing `seed.ts` section-comment convention and fictional-name hygiene (per SPEC.md Prohibitions).
- Exact distribution of which archive role (READER/CASE_HANDLER/ADMIN) each of subj-1/2/3 holds, and which document-site levels each holds — pick whatever tells the cleanest story once fixtures are drafted.
- Whether the new additive `ResourceAccessGrant` entries for subj-2/subj-3 are all "active," or one is deliberately the deny-matrix's "expired" case (per D-01's rationale, at least one should be expired to give the app-grant-expired deny scenario a real fixture, not just an absent one).

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope. No todos were folded (`todo.match-phase` returned zero matches for Phase 14).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DATA-SEED-01 | ≥2 mailboxes per relevant person (own + ≥1 shared) | `DatasetType: "MAILBOX"`, `MAILBOX_LEVELS` rank table, and `effectiveRankedLevel` all exist and are tested (model.ts:1201-1217, 1444-1466); seed-integration test pattern confirmed in Code Examples |
| DATA-SEED-02 | ≥1 archive dataset covering READER/CASE_HANDLER/ADMIN | `ArchiveRole`, `ARCHIVE_ROLE_CONTAINS`, `archiveRoleCovers`, `effectiveArchiveCoverage` all exist and are tested (model.ts:1203-1249, 1477-1488); subj-1/2/3's clearance/unit spread (D-02, verified) gives natural tier variety |
| DATA-SEED-03 | ≥2 document sites, ≥2 distinct levels | `DatasetType: "DOCUMENT_SITE"`, `DOCUMENT_SITE_LEVELS` rank table exist and are tested (model.ts:1202, 1213-1217) |
| DATA-SEED-04 | Prerequisite-chain-success scenario | `resolveDatasetAccess`'s 3-gate chain (model.ts:1521-1650) confirmed working via Phase 13's own 72 passing tests; seed-integration assertion idiom given in Code Examples |
| DATA-SEED-05 | Dataset-gate-denial scenario (app-grant present, no dataset-grant) | Confirmed distinct from DATA-SEED-06's app-grant-expired case: `visible: true, allow: false` (Pitfall 3 documents the distinction) |
| DATA-SEED-06 | 3-case deny-matrix, sole-deciding-gate proof | Exact gate-trace shape confirmed (`gates: ResourceGateResult[]`, kinds `CLEARANCE`/`APP_GRANT_OR`/`DATASET_GRANT`/`VISIBILITY`, model.ts:1494-1503, 1619-1641); classification math for the clearance-fail case worked out in Pitfall 2 (rsrc-milapp-1=SECRET, rsrc-intapp-1=TOP_SECRET, subj-3=CONFIDENTIAL) |
| WorldState + selectors wiring (R6 in SPEC.md) | `datasets` sub-object + `dataset-selectors.ts` join, no orphan `application_id` refs | Confirmed `WorldState`/`seedWorld()`/`Action` union/`reducer()` current shape (world-state.tsx, full file read); D-10's eager-array pattern confirmed exactly matching `zones`/`grants`/`delegates` (lines 126-131); D-11 nuance documented in Summary/Pitfall 1 |
| Minimal `issueDatasetGrant` + audit (R7 in SPEC.md) | Gated grant-issuing action + audit trail | `canIssueDatasetGrant` confirmed complete and tested (model.ts:1679-1743); confirmed NO `AuditLogEntry` interface exists (D-05's premise re-verified); reducer test pattern to mirror given in Code Examples; Open Questions 1-2 flag the two remaining implementation-detail decisions |

</phase_requirements>

## Summary

This phase is a pure "mirror an existing pattern into a parallel structure" exercise, not new architecture. Phase 13 (already executed, code read directly) delivered the complete dataset type system and `resolveDatasetAccess`/`canIssueDatasetGrant` resolver in `frontend/src/demo/lib/model.ts:1166-1743`. Zero dataset seed data, zero `WorldState` wiring, and zero `dataset-selectors.ts` exist yet — this phase's job is entirely additive: new fixtures in `seed.ts`, a new `datasets` sub-object on `WorldState`, a new `dataset-selectors.ts`, one new reducer action (`ISSUE_DATASET_GRANT`), and a new `dataset-selectors.test.ts`.

Every CONTEXT.md decision (D-01 through D-11) was verified directly against the current source in this research pass — **zero drift found**. `RESOURCE_GRANTS` is confirmed 100% `person_id: "subj-1"` (D-01's premise). `BASE_SUBJECTS` confirmed subj-1/2/3/4 with clearances SECRET/TOP_SECRET/CONFIDENTIAL/TOP_SECRET (D-02). `rsrc-milapp-1` (SECRET, via `rsrc-milpl-1`) and `rsrc-intapp-1` (TOP_SECRET, via `rsrc-intpl-1`) confirmed as the two existing Applications (D-03) — both classifications sit above subj-3's CONFIDENTIAL clearance, so the clearance-fails deny-matrix case is achievable against either. No `AuditLogEntry` interface exists anywhere in the repo (D-05's premise, re-verified by repo-wide grep) — the only audit-adjacent mechanism is `AttrEvent`/`appendEvent()` in `world-state.tsx:204-218`, whose shape does not fit dataset grants (confirmed: `value?: Compartment` is a closed 6-value enum). `zones`/`grants`/`delegates` eager-array seeding (`world-state.tsx:126-130`) vs. `digitalResources`'s empty-then-fetch pattern (`world-state.tsx:132-145`) are both confirmed exactly as CONTEXT.md describes (D-10).

**One nuance requiring planner attention (not drift, but a mischaracterization worth flagging):** D-11 describes `digital-resource-selectors.ts`'s existing style as "individual array params... matching exactly." The actual code (`digital-resource-selectors.ts:31-143`) takes a **single `world: DigitalResourceWorld` object parameter**, not individual arrays — `buildResourceTree(world)`, `activeGrantsForResource(world, resourceId, now)`, `resolveResourceAt(world, subject, ..., now)`. D-11's locked choice (individual array params for `dataset-selectors.ts`) is still the right call — it's necessitated by datasets needing to join across TWO different WorldState sub-objects (`state.datasets` and `state.digitalResources.applications`), which a single sub-object parameter can't cleanly express — but the planner should implement it as a deliberate divergence from the sibling file's actual object-param style, not as a literal mirror of it. See "Confirm Zero Drift" below for the full comparison.

**Primary recommendation:** Extend `seed.ts` additively (new `DATASET_NODES`/`DATASET_GRANTS`/`DATASET_DELEGATES` constants + additive `RESOURCE_GRANTS` entries for subj-2/subj-3 + one new denial-narrative Subject), wire `WorldState.datasets` via the eager-array `zones`-pattern, write `dataset-selectors.ts` with explicit multi-array params (datasets arrays + `applications: ApplicationNode[]` from the other sub-object), add one `ISSUE_DATASET_GRANT` reducer case tested in `world-state.test.tsx` (mirroring `UPSERT_RESOURCE_GRANT`'s existing describe block), and put every scenario/deny-matrix/join test in one new `dataset-selectors.test.ts` that imports real `seed.ts` constants (mirroring `digital-resource.test.ts:894-972`'s "seed integration" describe block, not the purely-inline `digital-resource-selectors.test.ts`).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Dataset fixture data (mailboxes, archive, doc sites) | Browser / Client (in-memory TS module) | — | Pure mock, no persistence layer this milestone (v2.3 is demo-only per REQUIREMENTS.md) |
| `WorldState.datasets` sub-object | Browser / Client (React reducer state) | — | Mirrors `zones`/`grants`/`delegates`, not `digitalResources` (which is backend-fetch-populated since Phase 11/12) |
| `dataset-selectors.ts` joins | Browser / Client (pure functions) | — | Joins two in-memory sub-objects (`datasets`, `digitalResources.applications`) client-side; no query/API layer involved |
| `issueDatasetGrant` gate + audit | Browser / Client (reducer action) | — | Mutates only client React state; Phase 13's resolver/gate logic is a pure function already in `model.ts`, reused as-is |
| Gate-trace test assertions | Test tier (Vitest, jsdom) | — | Runs entirely in the existing Vitest/jsdom harness, zero new infra |

There is no Frontend-SSR, API/Backend, CDN, or Database tier involvement in this phase — confirmed by SPEC.md's explicit "pure frontend mock" scope and by the absence of any backend dataset code (repo-wide grep for `dataset` outside `lib/`/`store/` returns nothing).

## Standard Stack

### Core
No new libraries. This phase extends existing project TypeScript modules only (`seed.ts`, `model.ts` — already complete from Phase 13, `world-state.tsx`, new `dataset-selectors.ts`) using the existing Vitest 4.0.3 test harness (`frontend/package.json`, confirmed via the local `npx vitest run` invocation below) and React 19 reducer patterns already in `world-state.tsx`.

### Supporting
None required.

### Alternatives Considered
Not applicable — CONTEXT.md's D-01..D-11 lock the approach; no framework/library choice exists in this phase's scope.

**Installation:** None. Zero new npm dependencies (matches Phase 13's own "Zero new npm dependencies" constraint, and nothing in this phase's scope introduces a new capability needing one).

## Package Legitimacy Audit

**Not applicable.** This phase installs no external packages — it is pure additive TypeScript within an existing, fully-configured Vitest/React project. No `package-legitimacy check` run was needed.

## Architecture Patterns

### System Architecture Diagram

```
seed.ts (new fixtures)                     seed.ts (existing, mostly untouched)
  DATASET_NODES ──┐                          APPLICATIONS (rsrc-milapp-1, rsrc-intapp-1)
  DATASET_GRANTS  ├─ application_ids[] ──────►  (joined by id, cross sub-object)
  DATASET_DELEGATES┘                          RESOURCE_GRANTS (+ additive subj-2/3 entries)
        │                                            │
        ▼ seedWorld() eager spread                   ▼ seedWorld() eager spread
  WorldState.datasets                         WorldState.digitalResources
  { nodes, grants, delegates }                 { ..., applications: [] at init;
        │                                        populated live by SET_DIGITAL_RESOURCES
        │                                        (Phase 12's backend fetch) }
        │                                            │
        └───────────────┬────────────────────────────┘
                         ▼
              dataset-selectors.ts (new, pure functions)
              (datasets: DatasetNode[], grants: DatasetAccessGrant[],
               applications: ApplicationNode[], platforms: PlatformNode[], now: Date)
                         │
                         ▼
              resolveDatasetAccess() / canIssueDatasetGrant()   <- Phase 13, model.ts, UNCHANGED
                         │
                         ▼
              DatasetAccessResult { allow, visible, gates: ResourceGateResult[] }
                         │
                         ▼
              dataset-selectors.test.ts
              (seed-integration scenarios A/B + 3-case deny-matrix,
               assert gates[].find(kind).pass on real seed data)

Reducer mutation path (separate from the read path above):
  UI/test dispatch { type: "ISSUE_DATASET_GRANT", ... , now }
        │
        ▼
  world-state.tsx reducer()
        │
        ├─ canIssueDatasetGrant(...) === false ──► return state unchanged (no grant, no audit)
        │
        └─ canIssueDatasetGrant(...) === true
                 │
                 ▼
        new DatasetAccessGrant appended to state.datasets.grants
                 │
                 ▼
        new DatasetAuditEntry appended to state.datasets.auditLog (new array, D-05/D-06/D-07 shape)
```

### Recommended Project Structure
```
frontend/src/demo/
├── lib/
│   ├── model.ts                     # UNCHANGED this phase (Phase 13 complete: DatasetNode, resolveDatasetAccess, canIssueDatasetGrant, DatasetAuditEntry type addition ONLY if planner puts the audit type here — see Open Question 1)
│   ├── seed.ts                      # + DATASET_NODES, DATASET_GRANTS, DATASET_DELEGATES; + additive RESOURCE_GRANTS entries; + 1 new Subject
│   ├── dataset-selectors.ts         # NEW — pure read selectors, mirrors digital-resource-selectors.ts's pure-function/explicit-now style
│   └── dataset-selectors.test.ts    # NEW — selector tests + seed-integration scenario/deny-matrix tests (D-08/D-09)
├── store/
│   ├── world-state.tsx              # + datasets field on WorldState, + seedWorld() population, + ISSUE_DATASET_GRANT Action/reducer case
│   └── world-state.test.tsx         # + describe block for ISSUE_DATASET_GRANT (mirrors UPSERT_RESOURCE_GRANT's existing block, lines 246-332)
```

### Pattern 1: Eager-array WorldState sub-object seeding (D-10)
**What:** A `WorldState` sub-object populated directly and synchronously from `seed.ts` constants inside `seedWorld()`, using the array-spread `[...ARRAY]` convention — as opposed to the empty-then-fetch pattern used for `digitalResources`.
**When to use:** Any WorldState sub-object whose source of truth is a frontend-only mock (no backend fetch involved) — applies to `datasets` per SPEC.md's pure-frontend-mock resolution.
**Example (verbatim from world-state.tsx:126-131, the pattern to mirror):**
```typescript
// Source: frontend/src/demo/store/world-state.tsx:126-131
zones: [...ZONES],
grants: [...GRANTS],
delegates: [...DELEGATES],
entryLogs: [...ENTRY_LOGS],
visitorPasses: [...VISITOR_PASSES],
disabledGrantIds: new Set<string>(),
```
Contrast — the pattern NOT to mirror for `datasets` (world-state.tsx:132-145):
```typescript
// Backend is the source of truth (Phase 11). These start empty; Phase 12
// populates them via GET /api/digital-resources/world. Do NOT re-inline the
// seed fixtures here — the DB serves the same 6-unit dataset (RSRC-BE-05).
digitalResources: {
  networks: [], platforms: [], applications: [], /* ... */
},
```

### Pattern 2: Reducer action gated by a pure permission-check function before mutating state
**What:** A reducer case that calls a pure gate function first and returns the unmodified `state` object (no new array entries, no seq increment) when the gate fails — never partially applies a mutation.
**When to use:** `ISSUE_DATASET_GRANT`, gated by `canIssueDatasetGrant` per SPEC R7/D-05's "refusal is silent, no audit record for a rejected attempt."
**Example — no existing reducer case in this codebase currently gates on a permission check before mutating (all current mutating cases like `UPSERT_RESOURCE_GRANT` are unconditional upserts).** This is genuinely new reducer shape, not a literal mirror. The closest structural precedent for "conditionally do nothing" is `WITHDRAW_AUTHORIZATION_ACTION`'s `.map()` no-op branch (`world-state.tsx:344-360`, `if (s.id !== action.subjectId || !s.authorization) return s;`), which the planner can reference for the "return unchanged" idiom, but the gate itself (`canIssueDatasetGrant`) is a whole-action gate, not a per-item filter — so the natural shape is:
```typescript
case "ISSUE_DATASET_GRANT": {
  const allowed = canIssueDatasetGrant(
    action.actorOrgId, action.actorPersonId, dataset,
    action.level, state.datasets.grants, state.datasets.delegates, action.now,
  );
  if (!allowed) return state; // silent refusal — no grant, no audit (SPEC R7)
  const grant: DatasetAccessGrant = { /* ... */ };
  const auditEntry: DatasetAuditEntry = {
    seq: state.seq + 1, timestamp: action.now,
    actor_person_id: action.actorPersonId, actor_org_id: action.actorOrgId,
    /* dataset_id, level, person_id per D-06 */
  };
  return {
    ...state,
    datasets: {
      ...state.datasets,
      grants: [...state.datasets.grants, grant],
      auditLog: [...state.datasets.auditLog, auditEntry],
    },
    seq: state.seq + 1,
  };
}
```

### Anti-Patterns to Avoid
- **Silently threading `visible` as `allow`:** `resolveDatasetAccess`'s `gates` array's 4th entry is `{ kind: "VISIBILITY", pass: appGrantPass, ... }` — it is NOT a 4th independent gate that affects `allow` (only `clearancePass && appGrantPass && datasetGrantPass` gates `allow`, confirmed at `model.ts:1646`). Fixture/scenario code must never read `gates[3].pass` as an access decision.
- **Comparing a bare level/role value without its `dataset_type`:** `MailboxLevel`/`DocumentSiteLevel`/`ArchiveRole` share the literal `"READ"` — fixture code must always know which vocabulary a stored `DatasetAccessGrant.level` belongs to via its parent dataset's `dataset_type`, never compare bare strings across dataset types (Pitfall A, already enforced by `resolveDatasetAccess` internally, but seed fixtures should still keep grants scoped to the correct dataset).
- **Snapshotting/asserting `RESOURCE_GRANTS.length`:** verified no existing v2.2 test does this (grep confirms none), so D-01's additive extension is safe — but the planner must NOT introduce a new test elsewhere that would break this invariant later.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Active-window check for any grant/delegate | A new `isDateInRange`-style helper | `isWindowActive(valid_from, valid_until, now)` (`model.ts`, imported already by `digital-resource-selectors.ts`) | Single shared semantics (inclusive both ends, null = unbounded) — a divergent helper would desync deny-matrix expectations from the resolver's own internal checks |
| Rank/containment comparison for dataset levels | A new comparator | `effectiveRankedLevel`, `effectiveArchiveCoverage`, `archiveRoleCovers`, `isLevelInVocabulary` (all in `model.ts:1234-1488`) | Already exhaustively tested by Phase 13's `dataset.test.ts` (72 tests, confirmed passing) — fixture/selector code should call these, never reimplement the rank/containment logic |
| 3-gate resolution logic | A selector-level re-derivation of allow/deny | `resolveDatasetAccess` (`model.ts:1521`) called directly from `dataset-selectors.ts` | The whole point of Phase 13 is that this is the single source of truth; duplicating gate logic in a selector would let the two drift |

**Key insight:** Every piece of "logic" this phase needs already exists and is tested in `model.ts`/`dataset.test.ts`. The only new logic in this phase is (a) fixture data shape and (b) the one `ISSUE_DATASET_GRANT` reducer wiring — everything else is glue.

## Common Pitfalls

### Pitfall 1: Treating D-11's "individual array params" as a literal mirror of `digital-resource-selectors.ts`
**What goes wrong:** A planner reads D-11 and CONTEXT.md's claim that this "matches `digital-resource-selectors.ts`'s existing pure-function signature style exactly," opens that file expecting individual array params, and is confused when it finds `buildResourceTree(world: DigitalResourceWorld)` — a single sub-object param.
**Why it happens:** CONTEXT.md's description of the existing pattern is imprecise (verified against source in this research pass).
**How to avoid:** Implement `dataset-selectors.ts` functions taking explicit params for BOTH cross-object pieces needed — e.g. `resolveDatasetAt(datasets: DatasetNode[], datasetGrants: DatasetAccessGrant[], applications: ApplicationNode[], platforms: PlatformNode[], subject: string, subjectClearance: Clearance, appGrants: ResourceAccessGrant[], datasetId: string, requiredLevel: string, now: Date)` (exact param list is Claude's Discretion per CONTEXT.md) — NOT `(world: DatasetWorld)` alone, since `applications`/`appGrants` live in the sibling `digitalResources` sub-object and must be passed in separately regardless of which style is chosen.
**Warning signs:** A selector function signature that only accepts `state.datasets` and nothing from `state.digitalResources` — it would have no way to perform the `application_id` join at all.

### Pitfall 2: Building the deny-matrix's "other two gates independently pass" fixtures without checking classification math first
**What goes wrong:** The clearance-fails case picks a person/dataset pair where clearance ALSO happens to make the Application-grant or dataset-grant gate irrelevant, or where the person has no live grants at all — producing a test that "passes" but doesn't actually isolate the clearance gate as sole decider.
**Why it happens:** Classification is derived (`effectiveDatasetClassification`), not stored directly on the dataset when no override is set — a rank mistake here silently changes which gate fails.
**How to avoid:** Confirmed math for this phase's actual data: `rsrc-milapp-1` → SECRET (rank 3, via `rsrc-milpl-1`), `rsrc-intapp-1` → TOP_SECRET (rank 4, via `rsrc-intpl-1`). subj-3 (Lee Park) holds CONFIDENTIAL (rank 2) — below both. So attaching the clearance-fail dataset to EITHER Application works; subj-3 additionally needs (a) a new additive active `ResourceAccessGrant` on that Application (D-01), and (b) an active `DatasetAccessGrant` on the target dataset at the required level — both gates 2 and 3 must independently resolve to `pass: true` in the trace while gate 1 (`CLEARANCE`) is `pass: false`, and `result.allow` must be `false`.
**Warning signs:** A deny-matrix test that only asserts `result.allow === false` without also asserting `gates.find(g => g.kind === "APP_GRANT_OR")?.pass === true` and `gates.find(g => g.kind === "DATASET_GRANT")?.pass === true` — SPEC.md's acceptance criteria explicitly require both assertions (edge-probe R5).

### Pitfall 3: Forgetting the `visible` field is driven ONLY by `APP_GRANT_OR`, with no exemption
**What goes wrong:** A fixture for the "application-grant-expired-with-live-dataset-grant" deny-matrix case might assume `visible: true` still holds because the person "used to" have access — but `resolveDatasetAccess` computes `visible: appGrantPass` at `now`, so an EXPIRED Application grant makes `visible: false` too (both `allow` and `visible` fail together in this specific deny-matrix case, unlike the DATA-SEED-05 scenario where only `allow` fails).
**Why it happens:** DATA-SEED-05 (app-grant-present, no-dataset-grant) and DATA-SEED-06's gate-2 case (app-grant-EXPIRED) look superficially similar but have opposite `visible` outcomes — DATA-SEED-05's scenario keeps `visible: true`; the deny-matrix's app-grant-expired case forces `visible: false`.
**How to avoid:** When writing the deny-matrix's app-grant-expired case, do NOT assert `visible: true` — assert `gates.find(g => g.kind === "APP_GRANT_OR")?.pass === false` (the sole target gate) and separately confirm `CLEARANCE` and `DATASET_GRANT` gates both independently pass, per the model.ts:560-588-style pattern already proven in Phase 13's own inline test (see Code Examples).
**Warning signs:** Any assertion mixing up which of the 3 deny-matrix cases is expected to leave `visible` true vs. false.

### Pitfall 4: Re-implementing an `AuditLogEntry` interface that SPEC.md's R7 wording implies exists
**What goes wrong:** SPEC.md's locked requirement 7 text says "appends an audit-log entry using the existing `AuditLogEntry` interface" — a planner following SPEC.md literally (without reading CONTEXT.md's D-05) would search for `AuditLogEntry`, not find it, and either invent a fictitious import or stall.
**Why it happens:** SPEC.md's wording predates CONTEXT.md's discuss-phase discovery that no such interface exists (verified again in this research pass: `grep -rn "AuditLogEntry"` across `frontend/src/` returns zero matches). CONTEXT.md D-05 already resolved this by introducing a new `DatasetAuditEntry` type — this is a SPEC.md-vs-CONTEXT.md conflict, and CONTEXT.md wins (it is the later, more specific, user-confirmed resolution).
**How to avoid:** The planner MUST follow D-05/D-06/D-07's resolution (a small new `DatasetAuditEntry { seq, timestamp, actor_person_id, actor_org_id, dataset_id, person_id, level }`-shaped type, stored at `WorldState.datasets.auditLog: DatasetAuditEntry[]`), not SPEC.md R7's literal "existing AuditLogEntry" wording.
**Warning signs:** Any task description or plan referencing `AuditLogEntry` (singular, pre-existing) rather than `DatasetAuditEntry` (new, this-phase).

## Code Examples

### Gate-trace "sole deciding gate" assertion idiom (already proven in Phase 13's own test suite — reuse this exact pattern against real seed data)
```typescript
// Source: frontend/src/demo/lib/dataset.test.ts:560-588 (Phase 13, inline fixtures)
// This is the EXACT idiom DATA-SEED-06's deny-matrix tests must reproduce,
// but against real seed.ts fixtures per D-08 instead of inline ones.
it("denies when the app grant expired before now, even with a still-active dataset grant (APP_GRANT_OR is the sole failing gate)", () => {
  const result = resolveDatasetAccess(
    "p1", "SECRET", ds, apps, platforms,
    [expiredAppGrant], [liveDatasetGrant], "READ", NOW,
  );

  expect(result.allow).toBe(false);
  const appGate = result.gates.find((g) => g.kind === "APP_GRANT_OR");
  expect(appGate?.pass).toBe(false);
  // The OTHER two substantive gates pass — the app-grant gate alone decides.
  expect(result.gates.find((g) => g.kind === "CLEARANCE")?.pass).toBe(true);
  expect(result.gates.find((g) => g.kind === "DATASET_GRANT")?.pass).toBe(true);
  expect(result.visible).toBe(false);
});
```

### Seed-integration test pattern to mirror (real seed.ts constants, not inline fixtures)
```typescript
// Source: frontend/src/demo/lib/digital-resource.test.ts:50-60, 894-897
// Seed integration tests — the ONE place this file imports real seed fixtures.
// Unit tests elsewhere in the same file stay inline (D3-13 pattern).
import {
  RESOURCE_NODES, RESOURCE_GRANTS, RSRC_DELEGATES, PLATFORMS, APPLICATIONS, ZONES, GRANTS,
} from "./seed";
import { buildResourceTree, activeGrantsForResource, resolveResourceAt } from "./digital-resource-selectors";

const NOW = new Date("2026-02-15T12:00:00Z"); // fixed clock convention

describe("seed integration: digital-resource fixtures", () => {
  const milnet = RESOURCE_NODES.find((n) => n.name === "MilNet")!;
  it("...", () => { /* resolveResourceAccess(..., RESOURCE_GRANTS, ..., NOW) */ });
});
```
Phase 14's `dataset-selectors.test.ts` should follow this exact shape: import `DATASET_NODES`, `DATASET_GRANTS`, `DATASET_DELEGATES`, `APPLICATIONS`, `PLATFORMS`, `RESOURCE_GRANTS` from `./seed`, define one fixed `NOW` (Phase 13's own `dataset.test.ts` uses `new Date("2026-07-01T12:00:00Z")` at line 513 — reusing this exact value keeps a single canonical "now" across the dataset test surface, though the planner may choose a different fixed date if the deny-matrix's expired-grant window needs adjusting).

### Reducer test pattern to mirror for `ISSUE_DATASET_GRANT`
```typescript
// Source: frontend/src/demo/store/world-state.test.tsx:246-283 (UPSERT_RESOURCE_GRANT block)
describe("UPSERT_RESOURCE_GRANT / UPSERT_RESOURCE_DELEGATE actions", () => {
  it("UPSERT_RESOURCE_GRANT appends when the id is novel", () => {
    const state = seedWorld();
    expect(state.digitalResources.grants).toHaveLength(0);
    const next = reducer(state, { type: "UPSERT_RESOURCE_GRANT", grant: grantFixture() });
    expect(next.digitalResources.grants).toHaveLength(1);
  });
});
```
`ISSUE_DATASET_GRANT`'s two required tests (SPEC R7 acceptance: permitted issuance creates grant+audit; gate-failing issuance creates neither) belong in `world-state.test.tsx`, in a new describe block following this exact shape — NOT in `dataset-selectors.test.ts` (that file is scoped to selectors + seed-integration scenarios per D-09, and `ISSUE_DATASET_GRANT` is a reducer action, structurally parallel to `UPSERT_RESOURCE_GRANT`'s existing home).

## State of the Art

Not applicable — this is an internal, project-specific pattern-mirroring phase with no external ecosystem evolution to track.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `dataset-selectors.test.ts`'s fixed `NOW` should reuse `dataset.test.ts`'s `2026-07-01T12:00:00Z` value | Code Examples | Low — if the planner picks a different fixed date, only the deny-matrix's expired-grant boundary constant needs to be recomputed relative to it; no functional risk |
| A2 | `ISSUE_DATASET_GRANT`'s test lives in `world-state.test.tsx` rather than a new file | Code Examples / Architecture | Low — CONTEXT.md doesn't explicitly say where this action's test goes (only D-09 pins the selector/scenario tests); if the planner instead puts it in `dataset-selectors.test.ts`, that's a defensible reading too, but it would mix reducer-action tests with pure-selector tests in one file, diverging from the `world-state.test.tsx`/`digital-resource-selectors.test.ts` file-per-concern precedent |
| A3 | The exact `DatasetAuditEntry` field list in the Pattern 2 code example (`seq, timestamp, actor_person_id, actor_org_id, dataset_id, person_id, level`) is illustrative, not authoritative | Architecture Patterns | Low — CONTEXT.md D-06/D-07 lock `actor_person_id`/`actor_org_id`/`seq`/`timestamp` as required fields; `dataset_id`/`person_id`/`level` are inferred as obviously-necessary but not explicitly enumerated by CONTEXT.md — the planner should confirm the full field list at plan time |

**All other claims in this research were verified directly against the current repository source in this session** (model.ts, world-state.tsx, seed.ts, digital-resource-selectors.ts, digital-resource.test.ts, dataset.test.ts, world-state.test.tsx, auditlog.ts, repo-wide grep for `AuditLogEntry`) — tagged `[VERIFIED: codebase]` throughout, not `[ASSUMED]`.

## Open Questions

1. **Where does the `DatasetAuditEntry` type live — `model.ts` or `world-state.tsx`?**
   - What we know: `AttrEvent`/`AttrOp` (the closest precedent) live in `model.ts` (lines 553-571); `InboxEntry`/`OutboxEntry` (WorldState-local, non-model, event-log-shaped types) live directly in `world-state.tsx` (lines 59-74).
   - What's unclear: CONTEXT.md doesn't pin a file for `DatasetAuditEntry`. Since it's referenced by both the reducer (`world-state.tsx`) and potentially by Phase 15's UI (which would import from wherever it lives), and since `model.ts` already holds every other Dataset-prefixed type, model.ts (Phase 13's `Dataset*` block, appended) is the more consistent choice.
   - Recommendation: Add `DatasetAuditEntry` to `model.ts` alongside `DatasetAccessGrant`/`DatasetAccessDelegate` (same file, appended in a clearly-marked "Phase 14" section) — keeps every Dataset-domain type in one place for Phase 15 to import from, consistent with how `ResourceAccessGrant`/`ResourceAccessDelegate` and `PhysicalAccessGrant`/`ZoneAccessDelegate` all live in `model.ts` rather than `world-state.tsx`.

2. **Does `ISSUE_DATASET_GRANT`'s `now` come from the action payload or is it read from `state`?**
   - What we know: Every dataset-domain pure function in `model.ts` takes explicit `now: Date` (Constraint, carried from Phase 13). The existing reducer has NO precedent for a "now"-carrying action — no current `Action` variant includes a `now`/`timestamp` field.
   - What's unclear: Whether `ISSUE_DATASET_GRANT`'s action type should carry `now: Date` explicitly (keeping the reducer itself free of `new Date()` calls, fully testable) or whether the reducer case should call `new Date()` internally (since reducers, unlike selectors, are not explicitly covered by the "no internal Date.now()" constraint in either SPEC.md).
   - Recommendation: Include `now: Date` explicitly on the `ISSUE_DATASET_GRANT` action payload — this is the only way `DatasetAuditEntry.timestamp` (D-07) can be deterministically tested in `world-state.test.tsx`, and it costs nothing (test call sites already pass an explicit fixed `now` everywhere else in this codebase).

## Environment Availability

Skipped — this phase has no external tool/service/runtime dependencies beyond the already-configured Vitest/Node/npm toolchain already in active use by this repo (confirmed working via the direct `npx vitest run` invocation in this research session).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.3 (confirmed via `npx vitest run` output), jsdom environment, `globals: true` (`frontend/vite.config.ts:32-37`) |
| Config file | `frontend/vite.config.ts` (test block) — no separate `vitest.config.ts` |
| Quick run command | `cd frontend && npx vitest run src/demo/lib/dataset-selectors.test.ts src/demo/store/world-state.test.tsx` |
| Full suite command | `cd frontend && npm run test` (= `vitest run`) |

**Baseline confirmed in this research session** (must remain green, zero modified assertions, after Phase 14's additions):
```
✓ src/demo/lib/dataset.test.ts (72 tests)
✓ src/demo/lib/digital-resource.test.ts (37 tests)
✓ src/demo/store/world-state.test.tsx (14 tests)
Test Files  3 passed (3)
     Tests  123 passed (123)
```

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DATA-SEED-01 | ≥2 mailboxes/person (own + shared) resolvable via selector | unit (seed-integration) | `npx vitest run src/demo/lib/dataset-selectors.test.ts -t "mailbox"` | ❌ Wave 0 (new file) |
| DATA-SEED-02 | Archive dataset covers READER/CASE_HANDLER/ADMIN across seeded grants | unit (seed-integration) | `npx vitest run src/demo/lib/dataset-selectors.test.ts -t "archive"` | ❌ Wave 0 |
| DATA-SEED-03 | ≥2 document sites, ≥2 distinct levels represented | unit (seed-integration) | `npx vitest run src/demo/lib/dataset-selectors.test.ts -t "document"` | ❌ Wave 0 |
| DATA-SEED-04 | Prerequisite-chain success scenario, real seed data | unit (seed-integration, gate-trace) | `npx vitest run src/demo/lib/dataset-selectors.test.ts -t "prerequisite"` | ❌ Wave 0 |
| DATA-SEED-05 | Dataset-gate-denial scenario, real seed data | unit (seed-integration, gate-trace) | `npx vitest run src/demo/lib/dataset-selectors.test.ts -t "denied"` | ❌ Wave 0 |
| DATA-SEED-06 | 3-case deny-matrix, sole-deciding-gate + other-two-pass assertions | unit (seed-integration, gate-trace) | `npx vitest run src/demo/lib/dataset-selectors.test.ts -t "deny-matrix"` | ❌ Wave 0 |
| WorldState/selectors wiring | `datasets` sub-object populated; `application_id` join selector; no orphan refs | unit | `npx vitest run src/demo/lib/dataset-selectors.test.ts -t "join"` | ❌ Wave 0 |
| `issueDatasetGrant` action | Permitted issuance creates grant+audit; gate-failing creates neither | unit (reducer) | `npx vitest run src/demo/store/world-state.test.tsx -t "ISSUE_DATASET_GRANT"` | ❌ Wave 0 |
| v2.2 regression guard | All pre-existing digital-resource/dataset/world-state tests remain green | full suite | `npm run test` | ✅ exists (123 tests, confirmed passing baseline above) |

### Sampling Rate
- **Per task commit:** targeted `npx vitest run <touched-test-file>` (sub-second per file, confirmed by baseline timing: 883ms total for 3 files/123 tests)
- **Per wave merge:** `npm run test` (full suite)
- **Phase gate:** Full suite green before `/gsd-verify-work`, with explicit visual confirmation that the 123-test baseline count only GROWS (never shrinks/changes) in the 3 pre-existing files touched by this phase area

### Wave 0 Gaps
- [ ] `frontend/src/demo/lib/dataset-selectors.ts` — the module under test doesn't exist yet; must be created before its test file
- [ ] `frontend/src/demo/lib/dataset-selectors.test.ts` — covers DATA-SEED-01..06 + join selector test
- [ ] `frontend/src/demo/store/world-state.test.tsx` new describe block — covers the `issueDatasetGrant` requirement (R7)
- [ ] No new test framework/config needed — Vitest is fully configured and proven working

## Security Domain

`security_enforcement` is not set to `false` in `.planning/config.json` (absent = enabled), so this section is included per protocol — but this phase's actual security surface is minimal: it adds no new user input path, no new network call, and no new externally-reachable code. All new code is fixture data plus a client-side reducer gated by an already-tested pure function.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | No auth surface touched — datasets are demo fixtures, not real credentials |
| V3 Session Management | No | Not touched |
| V4 Access Control | Yes | `issueDatasetGrant` MUST call `canIssueDatasetGrant` (Phase 13, already tested) before mutating state — no code path may create a `DatasetAccessGrant` bypassing this check (SPEC.md's own dropped-to-canon note already flags gate-bypass as an access-control-bypass class owned by code-review/Phase 13's threat model, not re-minted here) |
| V5 Input Validation | Partial | Seed fixtures are hand-authored constants, not user input — no validation needed for fixture data itself; `issueDatasetGrant`'s action payload (if ever wired to a future UI) would need validation, but that's explicitly Phase 15's scope, not this phase's |
| V6 Cryptography | No | Not touched |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Access-control bypass via a reducer path that skips the gate check | Elevation of Privilege | `ISSUE_DATASET_GRANT`'s reducer case must call `canIssueDatasetGrant` as its FIRST statement and `return state` unchanged on failure — the SPEC's own acceptance criterion (R7) is the test for this; no additional threat-modeling needed beyond what Phase 13 already covers |
| Fictional-data-resembling-real-individual leakage (bias/PII-adjacent) | Information Disclosure (soft) | SPEC.md's Prohibitions section already covers this (fictional names, no protected-attribute correlation) — code-review spot-check, not an automated test |
| Audit-log injection / insufficient logging for `DATASET_GRANT_ISSUED` | Repudiation | Explicitly dropped to canon by SPEC.md ("owned by code-review/`/gsd-secure-phase`, not minted here") — no new mitigation required this phase |

## Sources

### Primary (HIGH confidence — direct codebase read, this session)
- `frontend/src/demo/lib/model.ts:1-20, 550-777, 1160-1743` — Clearance/CLEARANCE_RANK, AttrEvent/AttrOp, ResourceAccessGrant/ResourceGateResult/ResourceAccessResult, full Phase 13 dataset section (DatasetNode, DatasetAccessGrant, DatasetAccessDelegate, resolveDatasetAccess, canIssueDatasetGrant)
- `frontend/src/demo/store/world-state.tsx` (full file, 583 lines) — WorldState interface, seedWorld(), Action union, reducer(), appendEvent()
- `frontend/src/demo/lib/digital-resource-selectors.ts` (full file, 143 lines) — actual selector signature style (single `world` param, not individual arrays)
- `frontend/src/demo/lib/seed.ts` — BASE_SUBJECTS (lines 59-100), APPLICATIONS (1531-1598), PLATFORMS (1450-1527), RESOURCE_GRANTS (1682-1826)
- `frontend/src/demo/lib/digital-resource.test.ts` — seed-integration describe block (894-972), imports (28-66)
- `frontend/src/demo/lib/dataset.test.ts` — gate-trace assertion idiom (551-660), NOW convention (513)
- `frontend/src/demo/store/world-state.test.tsx` — UPSERT_RESOURCE_GRANT reducer test pattern (246-332)
- `frontend/src/demo/lib/auditlog.ts` (full file) — confirms AttrEvent-replay mechanism, no AuditLogEntry interface
- Repo-wide `grep -rn "AuditLogEntry"` across `frontend/src/` — zero matches, confirms D-05's premise
- `npx vitest run` direct execution — confirms 123 baseline tests passing across the 3 files this phase touches
- `.planning/config.json` — confirms `nyquist_validation: true`, `security_enforcement` absent (enabled by default)

### Secondary (MEDIUM confidence)
- `.planning/phases/13-dataset-model-access-resolver/13-CONTEXT.md` and `13-SPEC.md` — Phase 13's locked decisions, cross-checked against actual code (found accurate)
- `.planning/phases/14-mock-dataset-worldstate/14-CONTEXT.md` and `14-SPEC.md` — this phase's locked decisions, cross-checked against actual code (found accurate except the D-11 nuance flagged above)

### Tertiary (LOW confidence)
None — no web/external research was needed for this internal-pattern-mirroring phase.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new stack, fully mirrors verified existing code
- Architecture: HIGH — every extension point read directly from source this session
- Pitfalls: HIGH — all four pitfalls derived from direct source comparison (SPEC.md vs. CONTEXT.md vs. actual code), not speculation

**Research date:** 2026-07-04
**Valid until:** Effectively indefinite for this internal pattern (no external dependency drift risk) — but re-verify against source if Phase 13's code changes before Phase 14 executes (unlikely, Phase 13 is complete and merged)
