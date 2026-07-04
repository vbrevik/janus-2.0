# Pitfalls Research

**Domain:** Adding dataset-level (entitlement) authorization — the innermost access layer — to an existing tiered Network→Platform→Application ABAC demo (v2.3)
**Researched:** 2026-07-03
**Confidence:** HIGH for codebase-grounded pitfalls (verified against `frontend/src/demo/lib/model.ts`, v2.2 gate-chain resolver, `RETROSPECTIVE.md` lessons); MEDIUM/LOW for web-sourced industry patterns (tagged inline).

> **Scope note:** Covers pitfalls specific to v2.3 (Phases 13+): Dataset model inside Applications,
> per-type access-level vocabularies (MAILBOX / ARCHIVE_ROLE / DOCUMENT_SITE), hard Application-grant
> prerequisite, delegation, time-limited grants with effective level = highest active. Demo/mock only,
> TypeScript world-state in `frontend/src/demo/`. The v2.2 pitfall record lives in the git history of
> this file (commit before this one).

## Ground Truth: What v2.2 Actually Gives You (verified in `model.ts`)

These facts constrain every pitfall below — verify against them before planning:

1. **Prereqs are resolution-time, not issue-time.** `evaluateParentTierGrantGate` checks the parent-tier grant's activity *at resolution time t*, inside the gate chain. Nothing is "locked in" at issue.
2. **Time windows have one shared helper.** `isWindowActive` — inclusive boundaries, `null` = unbounded — is used by org_links, policy_assignments, and grants. Any new window check that doesn't reuse it will drift.
3. **Roles are unordered open-vocab strings.** `OrgLink.role` is `BaselineOrgRole | (string & {})`; checks are exact string matches. **There is no precedent anywhere in the model for ranked/ordered levels except `CLEARANCE_RANK`.** v2.3's highest-wins levels are the first ordered vocabulary since clearance.
4. **Delegation is issue-time only.** `canIssueResourceGrant` (active ADMIN org_link OR active ORG delegate) gates issuing; the resolver never re-checks who issued a grant. A grant outlives its issuer's delegation — deliberately.
5. **Application deliberately carries NO classification field.** `effectiveClassification` derives it from the parent Platform; a missing platform throws. v2.3's "inherit unless overridden" is a *different* semantic — see Pitfall 5.
6. **The gate switch fails closed on unknown kinds.** `GateDescriptor` is an open union, but the evaluator switch is exhaustive over known kinds and denies unknowns. New dataset gates must be added to the descriptor union, the evaluator, AND the trace renderer, or they silently deny.
7. **Advisory zone-prereq never changes `allow`** — and it shipped as dead code (hardcoded empty zone array) caught only by live UAT (v2.2 lesson, fixed 12-07).

---

## Critical Pitfalls

### Pitfall 1: One global level ordering across three incompatible vocabularies

**What goes wrong:**
`MAILBOX.READ`, `DOCUMENT_SITE.READ` share a string; `ARCHIVE_ROLE` has none of them. A single rank table (`READ=1, SEND_AS=2, ...`) or a shared `AccessLevel` string union lets a MAILBOX grant compare against a DOCUMENT_SITE level, lets `SEND_AS` accidentally rank against `CONTRIBUTE`, and makes "highest active" silently well-typed but semantically meaningless. Worse: a grant carrying `level: 'READ'` with the wrong `dataset_type` validates fine.

**Why it happens:**
TypeScript unions of string literals across types collapse into one big union unless deliberately discriminated. The v2.2 codebase's only precedent (`OrgLink.role`) is an *unordered open vocabulary* — copying that pattern gives you strings with no ordering; inventing a global rank gives you ordering with no type scoping. Both are one refactor away.

**How to avoid:**
- Define per-type ordered rank arrays in ONE place in `model.ts`: `const DATASET_LEVEL_RANK: Record<DatasetType, readonly string[]>` (index = rank). Derive the level unions from these arrays, not the other way round.
- Make `DatasetAccessGrant` validation reject a level not in its dataset's type vocabulary — a `validateDatasetGrant` pure function, called by seed validators AND the issuing form.
- `effectiveDatasetLevel(grants, datasetType, at)` compares ranks only within one type; make cross-type comparison unrepresentable (function takes a single dataset, never a grant list spanning datasets).
- Write a test that asserts each vocabulary is closed and each grant level is a member of its dataset's vocabulary across the whole seed.

**Warning signs:**
A single `AccessLevel` type or single `LEVEL_RANK` map; a grant type where `level: string` with no link to `dataset_type`; any function comparing levels that doesn't take the dataset type as input.

**Phase to address:**
Model/resolver phase (Phase 13) — this is a type-design decision that cannot be retrofitted cheaply after the seed and UI consume it.

---

### Pitfall 2: "Highest wins" assumed to be a total superset order — ARCHIVE_ROLE probably isn't

**What goes wrong:**
Highest-wins is only well-defined when each level strictly supersets the levels below it (permission-set dominance — MEDIUM confidence, standard hierarchical-access theory). `MAILBOX: READ < SEND_AS < FULL_ACCESS` and `DOCUMENT_SITE: READ < CONTRIBUTE < FULL_CONTROL` plausibly are supersets. `ARCHIVE_ROLE: READER < CASE_HANDLER < ADMIN` is *role-shaped*, not level-shaped — in real archive systems a CASE_HANDLER may see only their own cases while a READER sees everything read-only. If highest-wins picks CASE_HANDLER over READER, the demo asserts a superset relation the requirements never established. The requirements file itself flags this open question ("Is archive role a dataset within an application, or a role assignment? Roles vs. access levels distinction").

**Why it happens:**
DATA-GRANT-03 says "effective level = highest active grant" as if it's a property of all types; nobody re-derives it per vocabulary. The name `ARCHIVE_ROLE` (vs `MAILBOX`, `DOCUMENT_SITE` — resource names) is a smell that it's a different kind of thing.

**How to avoid:**
- Resolve the open question **in discuss-phase, before planning**: either (a) decide ARCHIVE_ROLE levels ARE a total superset order in this demo (record the decision + rationale in PROJECT.md Key Decisions), or (b) exempt ARCHIVE_ROLE from highest-wins and show all active roles.
- If (a): the resolution trace should say "effective level FULL_ACCESS (supersedes READ)" so the superset assumption is *visible and demoable*, not buried.
- Since DATA-GRANT-02 allows multiple simultaneous grants, seed a person with two active grants at different levels on the same dataset and make a test pin the effective level.

**Warning signs:**
The word "role" used interchangeably with "level" in plans; a demo reviewer asking "so CASE_HANDLER can do everything READER can?" and nobody being sure.

**Phase to address:**
Discuss/spec of Phase 13 (decision); Phase 13 tests (pinning).

---

### Pitfall 3: Application prerequisite validated at issue time only — orphaned-but-live dataset grants

**What goes wrong:**
The canonical temporal edge case: Application grant valid until 2026-08-01, DatasetAccessGrant valid until 2026-12-31. If the prereq was checked only when the dataset grant was issued, from August the person has *dataset access with no application access* — the entitlement is orphaned but live. Industry pattern confirms: issue-time-only prerequisite checks are the classic source of orphaned entitlements when parent access expires or is revoked (MEDIUM confidence — IGA/JIT-access literature).

**Why it happens:**
Issue-time validation *feels* like enforcement ("we checked the prerequisite"). It also happens accidentally: the resolver checks the app grant, but a *selector* (e.g. the reverse-lookup for DATA-UI-03, or an effective-level badge) reads only dataset grants and forgets the prereq — so the UI shows access the resolver would deny.

**How to avoid:**
- Follow the v2.2 pattern exactly: the Application-grant prerequisite is a **gate in the dataset resolution chain, evaluated at resolution time t** (DATA-ACCESS-03 already orders it: clearance → app grant → dataset grant). Reuse/compose `evaluateParentTierGrantGate` semantics or call `resolveResourceAccess` for the parent Application.
- Every surface that answers "does/can this person access this dataset" must go through the one resolver — including the reverse lookup (DATA-UI-03). Reverse lookup = "for each person with any dataset grant, run the resolver at t," not "list dataset grants."
- Seed the exact edge case: app grant expiring *before* a still-active dataset grant, and a demo date range where the flip is observable in the explorer (DATA-SEED-05 covers no-dataset-grant deny; add an expired-app-grant deny).
- Issue-time prereq checking is fine as a *courtesy warning* in the issuing form ("this person has no active Application grant") — but label it advisory, never treat it as the enforcement point.

**Warning signs:**
Any function returning access/level from dataset grants alone; issuing-form validation described as "ensures the prerequisite"; no seed row where the app grant expires first.

**Phase to address:**
Phase 13 (resolver gate + test with the expiry crossover); seed phase (the crossover fixture); UI phase (reverse lookup goes through resolver).

---

### Pitfall 4: Trace/advisory rows shipped as dead code — the zone-prereq bug, again

**What goes wrong:**
v2.2's advisory zone-prereq row rendered in the trace UI but was wired to a hardcoded empty zone array — grep-verified as "present," dead in reality, caught only by live UAT. v2.3 adds a *fourth* gate row (dataset grant) plus per-type level displays plus an effective-level computation. Any of these can render plausibly while being wired to nothing: an effective-level badge that always shows the first grant, a clearance gate that reads the app's classification instead of the dataset's effective classification, a deny row that never fires because the seed has no case exercising it.

**Why it happens:**
"Grep-verification proves presence, not life" (v2.2 retro, verbatim). UI rows are visually complete before they're semantically wired, and build/type checks pass either way.

**How to avoid:**
- **Every gate must be the deciding gate in at least one seed case.** Minimum deny matrix: (a) clearance too low for dataset, (b) app grant missing, (c) app grant expired while dataset grant active, (d) dataset grant missing (DATA-SEED-05), (e) dataset grant at insufficient level, (f) full ALLOW chain (DATA-SEED-04).
- Live UAT criteria written per gate row: "select person X + dataset Y at date Z → row N shows DENY with reason R." Not "trace renders."
- A world-state test that runs the resolver over the full seed and asserts the deny-reason distribution is non-degenerate (every gate kind appears as a failure reason at least once).

**Warning signs:**
UAT checklist items phrased as "trace displays correctly"; seed data where everyone who has an app grant also has every dataset grant; a gate evaluator whose failure branch has no test.

**Phase to address:**
Seed phase (deny matrix); UI phase live UAT (per-gate criteria). This maps directly to the project's "defer features, not enforcement" and live-UAT lessons.

---

### Pitfall 5: Classification inheritance-with-override implemented as a copied field

**What goes wrong:**
DATA-05: dataset classification inherits from the Application *unless explicitly overridden* (same or higher, never lower). v2.2's pattern is **derive-only** — Application deliberately has NO classification field; `effectiveClassification` walks to the Platform. If v2.3 instead stores a `classification` field on every dataset (copied at seed time), it drifts silently when the platform classification differs from what was copied, and "never lower" is only true at the moment of copying. Conversely, if the developer copies the v2.2 pattern verbatim (no field at all), overrides are unrepresentable and DATA-05 fails.

**Why it happens:**
"Inherits unless overridden" reads like "has a field with a default." The v2.2 precedent (derive-only) and the v2.3 requirement (override allowed) genuinely differ, and the difference is easy to blur.

**How to avoid:**
- Model as `classification_override: Classification | null` on the dataset; extend `effectiveClassification` (or add `effectiveDatasetClassification`) so `null` → derive from the Application → Platform chain; non-null → use override.
- Add a pure validator: `override !== null && CLEARANCE_RANK[override] < CLEARANCE_RANK[effectiveClassification(parentApp)]` → error. Run it over the entire seed in a test (the v2.2 seed-validator pattern).
- The clearance gate in the dataset chain must read the *effective dataset* classification, not the application's — otherwise an overridden-higher dataset is reachable with app-level clearance.
- UI: reuse the v2.2 "(inherited)" badge convention; show "(override)" when non-null.

**Warning signs:**
A required `classification` field on the dataset type; seed rows setting classification on every dataset; no test with an override both equal-to and higher-than the parent, and none asserting lower-than is rejected.

**Phase to address:**
Phase 13 (model + validator); seed phase (override fixtures).

---

### Pitfall 6: Cross-tier inheritance leaking back in via "default access"

**What goes wrong:**
Someone adds a convenience: "app grant holders get READ on the app's datasets by default," or "FULL_ACCESS on the application implies mailbox access," or the reverse lookup lists app-grant holders as dataset-accessors. This re-introduces exactly the cross-tier inheritance v2.2 explicitly rejected (no cross-tier inheritance; explicit per-tier grants) and breaks the milestone's core demo point: *application access does not grant access to anything inside it* (DATA-ACCESS-02).

**Why it happens:**
Dataset grants make seed data voluminous (every person needs explicit grants for every dataset they touch); defaults are the tempting shortcut. Also v2.1 zones DID have parent→child grant inheritance — a developer pattern-matching on the wrong prior milestone imports the wrong rule.

**How to avoid:**
- State it in the phase spec: **no default levels, no implied dataset access, ever** — v2.1 zone inheritance is explicitly the wrong precedent; v2.2 tier grants are the right one.
- Keep seed volume manageable with builder functions (v2.2 seed pattern) rather than defaults in the resolver.
- Test: person with an active app grant and zero dataset grants → DENY on every dataset in that app (this is DATA-SEED-05 as a *property test over the seed*, not one fixture).

**Warning signs:**
Words "default", "implied", "baseline level" in plans; resolver code that returns a level when the dataset-grant list is empty.

**Phase to address:**
Phase 13 spec + resolver tests.

---

### Pitfall 7: Delegation scope creep — level-unbounded delegates and unrecorded semantics

**What goes wrong:**
Two failure modes. (a) **Scope**: v2.3 delegation "mirrors v2.1/v2.2" but datasets add a new dimension — *level*. If a delegate can issue FULL_CONTROL/ADMIN grants, delegation is effectively admin-transfer; industry guidance is least-privilege delegation, and delegates exceeding source authority is the classic delegation failure (MEDIUM confidence — IDPro/AD-delegation literature; the requirements file itself asks "does a delegate grant up to their own level or up to the max?"). (b) **Enforcement**: v2.2's lesson — `canIssueGrant` existed but the enforcement was deferred, resurfacing as a live IDOR ("defer features, not enforcement"). If v2.3's issuing form renders for non-authorized personas, or `canIssueDatasetGrant` exists but the form doesn't call it, the same hole ships.

**Why it happens:**
"Mirrors v2.1/v2.2" reads like zero design work, but neither prior milestone had ordered levels, so the level-bound question has no precedent to mirror. And demo issuing forms feel like UI, not enforcement surfaces.

**How to avoid:**
- Decide the level-bound question explicitly in discuss-phase (recommend for demo scope: delegation grants full issuing authority for that dataset, unbounded by level — matches v2.2's simplicity — but **record it as a Key Decision** with the alternative noted, as done for v2.2's Option B).
- Also decide grant-outlives-delegation explicitly: v2.2 grants survive their issuer's delegation expiring (issue-time check only). Mirroring that is fine; leaving it implicit is not — it will look like a bug in UAT.
- `canIssueDatasetGrant(actorOrg, dataset, at)` as a pure function in `model.ts` (ADMIN org_link OR active delegate — mirror `canIssueResourceGrant`), called by the issuing form to gate rendering AND on submit. Tests for: delegate can issue, expired delegate cannot, non-admin non-delegate cannot.
- No sub-delegation (delegate cannot create delegates) — make it a stated non-feature, matching v2.1/v2.2.

**Warning signs:**
"Delegation: same as v2.2" as the entire plan line; an issuing form with no persona gating; no test where a delegation window has expired.

**Phase to address:**
Discuss-phase (two decisions); Phase 13 (`canIssueDatasetGrant` + tests); UI phase (form gating, UAT with a non-admin persona).

---

### Pitfall 8: Effective level computed at `Date.now()` while the resolver runs at explorer-time t

**What goes wrong:**
"Effective level = highest **active** grant" — active is a function of time. The v2.2 explorer resolves point-in-time (user picks the date; policy versions and grants are evaluated at t). If `effectiveDatasetLevel` defaults to `Date.now()` (or the UI badge computes it outside the resolver) while the trace resolves at explorer-selected t, the badge and the trace disagree exactly in the interesting demo cases — time-limited grants and the app-expiry crossover.

**Why it happens:**
Selectors written for browsing UI (resource browser, reverse lookup) naturally use "now"; the resolver takes t. Two call paths, one forgets the parameter. TypeScript won't catch a defaulted `at: Date = new Date()`.

**How to avoid:**
- `at: Date` is a **required** parameter (no default) on every new dataset function: `effectiveDatasetLevel`, `resolveDatasetAccess`, `activeDatasetGrants`, reverse lookup. Reuse `isWindowActive` for all windows.
- The effective level shown anywhere in the explorer must come out of the same resolution result object as the trace (put `effectiveLevel` on `DatasetAccessResult`), never computed separately by the component.
- Test: grant windows straddling t; assert effective level differs at t1 vs t2.

**Warning signs:**
`new Date()` inside `model.ts` or selectors; a UI badge component importing a grants array directly instead of a resolution result.

**Phase to address:**
Phase 13 (API shape); UI phase (single-source badge).

---

### Pitfall 9: Bolting Dataset into the ResourceNode tier union and breaking v2.2 invariants

**What goes wrong:**
The tempting move is `tier: 'NETWORK' | 'PLATFORM' | 'APPLICATION' | 'DATASET'`. But `resolveResourceAccess` is hard-coded to the 3-tier node union; datasets carry things no tier node has (dataset_type, per-type levels, admin/asset-owner orgs directly rather than org_links, classification override) and lack things tier nodes have (time-versioned policies — v2.3 defines no per-dataset policy engine). Widening the union forces every existing gate evaluator, selector, and test through a new case — and Phase 11 shipped **byte-exact TS↔Rust golden-fixture parity tests** (`digital-resource-golden-export.test.ts`) over the shared v2.2 types. Mutating those types or the resolver's input space can break golden exports and the Rust parity contract even though v2.3's backend is deferred.

**Why it happens:**
"It's the 4th layer of the same stack" — true conceptually, false structurally: datasets use fixed per-type gate chains (DATA-ACCESS-03), not data-driven policies.

**How to avoid:**
- New types (`Dataset`, `DatasetAccessGrant`, `DatasetAccessDelegate`, `DatasetAccessResult`) and a new `resolveDatasetAccess(person, dataset, at, world)` that *composes* the v2.2 resolver (calls `resolveResourceAccess` for the parent Application to evaluate the prereq gate, embedding that result in the dataset trace). Do not widen `ResourceNode` or touch v2.2 gate evaluators.
- Run the golden-export and digital-resource test suites unchanged as a regression gate for every v2.3 phase ("v2.2 suite untouched and green" as an explicit success criterion).
- Reuse by composition, not modification: `isWindowActive`, `CLEARANCE_RANK`, `effectiveClassification` are imports, not edit targets.

**Warning signs:**
Diffs inside `resolveResourceAccess` or the `GateDescriptor` evaluators; golden-fixture test failures; a `DATASET` string appearing in the tier union.

**Phase to address:**
Phase 13 architecture decision — first plan of the milestone.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Single global level rank map | One table, less code | Cross-type level comparison bugs; wrong "highest" | Never — per-type ranks are ~10 extra lines |
| Prereq checked only in issuing form | Simpler resolver | Orphaned-live grants after app expiry; demo's core claim false | Never (this IS the milestone's point) |
| `at` defaulting to `new Date()` | Convenient call sites | Badge/trace divergence on time-limited grants | Never in `model.ts`; OK in a top-level demo-page default that passes t down |
| Skipping the app-expiry-crossover seed case | Smaller seed | Temporal edge case undemoable and untested | Never — it's the headline temporal case |
| Delegation semantics "same as v2.2" without recording level-bound + outlives-delegation decisions | No discussion needed | UAT confusion, re-litigated later (SEED-012 pattern) | Only if both decisions are explicitly recorded |
| Storing copied classification per dataset | No derivation logic | Drift from platform reclassification; "never lower" unenforced | Never — `override \| null` is the same effort |
| Deferring reverse-lookup (DATA-UI-03) through-resolver correctness | Faster UI | UI shows access the resolver denies | MVP-only, if flagged as known-wrong in the plan |

## Integration Gotchas

v2.3 integrates with internal v2.2/v2.1 surfaces, not external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| v2.2 resolver (`resolveResourceAccess`) | Editing it to know about datasets | Compose it from `resolveDatasetAccess`; embed its result as the prereq gate row |
| `isWindowActive` | Re-implementing window logic for dataset grants ("active until end of day", exclusive bounds) | Import and reuse; inclusive bounds, `null` = unbounded, everywhere |
| `effectiveClassification` | Reading the Application's classification field (it has none — throws pattern) | Call the derivation; extend for dataset override |
| World-state store (`world-state.tsx`) | Datasets/grants added outside the store, invisible to the audit log & toggles | Extend the store the way v2.2 grants were added; grant-toggle parity |
| Resource Browser (DATA-UI-01) | New parallel browser tree instead of extending Application nodes | Datasets render *inside* the Application node — the nesting IS the message |
| Golden-export / Rust parity tests | Touching shared v2.2 types "harmlessly" | Treat v2.2 type files as frozen; new types in new declarations; keep suite green |
| Seed (`seed.ts`, already 1,842 lines) | Hand-writing every dataset grant inline | Builder functions + whole-seed validators (v2.2 pattern); validators enforce vocab membership, override ≥ parent, prereq-crossover presence |

## Performance Traps

Demo scale (6 units, tens of datasets, hundreds of grants) makes real performance moot; these are correctness-adjacent traps.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Reverse lookup running the full resolver per person × per dataset on every render | Sluggish dataset view | Memoize per (dataset, t); recompute on world-state change | ~100s of persons — unlikely in demo, cheap to avoid |
| Resolving the parent Application chain redundantly for every dataset in a list view | N× repeated gate chains | Resolve app access once per (person, app, t), share across its datasets | Cosmetic at demo scale |
| Six-state loader (v2.2 UI pattern) re-fetch storms | Console noise, flicker | Reuse v2.2's loader/hook pattern (`use-digital-resources.ts`) as-is | N/A — mock data, but pattern drift costs review time |

## Security Mistakes

Demo/mock, but v2.2 proved demo enforcement gaps become real holes when the backend arrives ("defer features, not enforcement").

| Mistake | Risk | Prevention |
|---------|------|------------|
| Issuing form rendered/functional for non-authorized personas | Repeat of the v2.2 IDOR-shaped gap; wrong model demoed to stakeholders | Gate form on `canIssueDatasetGrant`; UAT with viewer/non-admin persona |
| Delegate can self-issue ADMIN/FULL_CONTROL with no recorded decision | Silent privilege escalation baked into the model that the future backend will faithfully implement | Explicit Key Decision on level-bounding (Pitfall 7) |
| Clearance gate checks app classification, not effective dataset classification | Overridden-higher datasets reachable below their classification | Gate reads `effectiveDatasetClassification`; test with an overridden dataset |
| Grants not written to the append-only audit log | Breaks the project's core invariant (audit log = system of record, reconstructable decisions) | Dataset grant issue/expiry events follow the v2.2 audit-event pattern |
| Effective level leaking across datasets of the same type | Person's FULL_ACCESS on mailbox A displayed/used for mailbox B | `effectiveDatasetLevel` keyed by dataset id, not (person, type) |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Four-gate trace becomes an unreadable wall | The explainability demo value dies at its deepest layer | Reuse v2.2 trace row idiom; collapse the embedded Application sub-chain to one summarizable row, expandable |
| Same label "READ" meaning different things per type | Stakeholders assume one vocabulary; archive levels misread | Always render level WITH type context ("Mailbox: READ"); distinct badge styling per type |
| Highest-wins invisible when multiple grants overlap | "Why does it say FULL_ACCESS when I granted READ?" confusion in UAT | Show all active grants + which one is effective ("effective: FULL_ACCESS — supersedes READ") |
| App-expiry crossover not surfaced in the date picker flow | The best temporal demo case exists in seed but nobody finds it | Seed notes/guided-scenario hint (v2.2 had canonical demo walkthrough cases); UAT script includes the crossover date |
| Reverse lookup showing raw grants (incl. inactive/superseded) | "Who has access" list is wrong — the one view auditors care about | Reverse lookup = resolver output at t: person, effective level, via-which-grant |

## "Looks Done But Isn't" Checklist

- [ ] **Dataset gate chain:** every one of the 4+ gates is the *deciding* gate in ≥1 seed case — verify by running the resolver over the seed and counting deny reasons per gate kind (the zone-prereq dead-code test).
- [ ] **App-expiry crossover:** a seed person whose Application grant expires *before* their dataset grant, and the explorer flips ALLOW→DENY across that date — verified live, not by grep.
- [ ] **Per-type vocabularies:** a grant with a level from the wrong type's vocabulary is *unrepresentable or rejected* — verify the seed validator throws on a deliberately bad fixture.
- [ ] **Classification override:** seed contains same-level override, higher override, and a test proving lower-than-parent is rejected.
- [ ] **Highest-wins:** a person with ≥2 simultaneous active grants on one dataset (DATA-GRANT-02), effective level pinned by test AND visible in UI.
- [ ] **Delegation:** expired-delegation fixture exists; issuing form denies for that persona at that date; both delegation decisions (level-bound, grant-outlives-delegation) recorded in PROJECT.md Key Decisions.
- [ ] **Reverse lookup (DATA-UI-03):** goes through the resolver — verify a person with a dataset grant but expired app grant does NOT appear.
- [ ] **v2.2 regression:** digital-resource + golden-export test suites pass unmodified; no diff inside `resolveResourceAccess` or v2.2 type declarations.
- [ ] **Audit events:** issuing a dataset grant in the demo UI produces an audit-log entry (project invariant).

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Global level ordering shipped | MEDIUM | Introduce per-type rank arrays; add dataset_type discrimination to grant validation; sweep call sites of the comparator (contained if effectiveDatasetLevel is the only comparator) |
| Issue-time-only prereq shipped | LOW–MEDIUM | Add the app-grant gate to the resolver chain + crossover test; audit selectors (reverse lookup) for direct grant reads |
| Dead trace rows shipped | LOW (if caught in UAT) | v2.2's 12-07 fix pattern: wire the real data source, add the deny-matrix seed cases, re-run live UAT |
| Dataset bolted into tier union | HIGH | Effectively a Phase-13 redo: extract dataset types, restore v2.2 resolver, rebuild composition — this is why it's an architecture gate up front |
| Copied classification field shipped | MEDIUM | Migrate seed to `override \| null`; add derivation + validator; re-check clearance gate reads |
| Delegation decisions never recorded | LOW | Record retroactively in Key Decisions before milestone close (v2.2 SEED-012 pattern) — but expect one UAT round of confusion first |

## Pitfall-to-Phase Mapping

Phase numbering continues from v2.2 (v2.3 starts at Phase 13). Assumed shape: model/resolver → seed → UI (roadmap may merge/split; the mapping is by concern).

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| 1. Global level ordering | Phase 13 (model design) | Type-level: cross-type comparison unrepresentable; seed validator rejects wrong-vocab level |
| 2. ARCHIVE_ROLE superset assumption | Pre-Phase-13 discuss/spec (decision) | Decision recorded; multi-grant effective-level test pinned |
| 3. Issue-time-only prereq | Phase 13 (resolver) + seed phase (crossover fixture) | Resolver test: DENY after app expiry with active dataset grant |
| 4. Dead trace rows | Seed phase (deny matrix) + UI phase (live UAT) | Every gate kind appears as a deciding deny in seed; per-gate UAT criteria pass live |
| 5. Classification override drift | Phase 13 (model + validator) | Lower-than-parent rejected in test; "(override)" badge live |
| 6. Cross-tier inheritance leak | Phase 13 (spec + resolver tests) | Property test: app grant + zero dataset grants ⇒ DENY on all datasets |
| 7. Delegation scope creep | Discuss-phase (decisions) + Phase 13 (`canIssueDatasetGrant`) + UI phase (form gating) | Expired-delegate deny test; non-admin persona UAT; decisions in PROJECT.md |
| 8. `Date.now()` vs explorer-t | Phase 13 (required `at` param) + UI phase | Effective level comes from resolution result; t1≠t2 test |
| 9. Tier-union widening | Phase 13 first plan (architecture gate) | v2.2 suites green and untouched; no `DATASET` in tier union |

## Sources

**HIGH confidence (primary — codebase & project record):**
- `frontend/src/demo/lib/model.ts` — gate-chain resolver, `evaluateParentTierGrantGate`, `isWindowActive`, `canIssueResourceGrant`, `effectiveClassification`, open-vocab roles, fail-closed gate switch (analyzed via local delegation, line-referenced)
- `.planning/RETROSPECTIVE.md` — "defer features, not enforcement"; "grep-verification proves presence, not life"; zone-advisory dead-code post-mortem; deferred-enforcement→IDOR lesson
- `.planning/PROJECT.md` Key Decisions — no cross-tier inheritance; advisory-not-gate; Application classification inheritance; Option B / SEED-012
- `.planning/milestones/v2.3-REQUIREMENTS.md` — DATA-* requirements and its own Open Questions (roles-vs-levels, delegation level-bound)
- `frontend/src/demo/lib/digital-resource-golden-export.test.ts` — TS↔Rust parity constraint

**MEDIUM confidence (web, cross-consistent with primary):**
- Permission-set dominance / hierarchical level ordering: [Privilege Level — ScienceDirect](https://www.sciencedirect.com/topics/computer-science/privilege-level), [BOLA empirical taxonomy (arXiv)](https://arxiv.org/pdf/2605.25865)
- Issue-time vs runtime validation, orphaned entitlements: [Palo Alto — IGA](https://www.paloaltonetworks.com/cyberpedia/what-is-identity-governance-and-administration-iga), [Palo Alto — JIT access](https://www.paloaltonetworks.com/cyberpedia/what-is-just-in-time-access-jit), [Pre-commit consent validation (arXiv)](https://arxiv.org/pdf/2603.07004)
- Delegation pitfalls: [IDPro — The Art of Delegation](https://idpro.org/the-art-of-delegation-in-identity-access-management-empowering-efficiency-and-security/), [Semperis — AD delegation gotchas](https://www.semperis.com/blog/ad-security-delegation-user-management-and-windows-password-options/), [Microsoft Entra — entitlement-management delegation](https://learn.microsoft.com/en-us/entra/id-governance/entitlement-management-delegate)

**LOW confidence (web, general framing only):**
- Coarse-vs-fine-grained layering: [Oso — fine-grained authorization](https://www.osohq.com/learn/what-is-fine-grained-authorization), [FusionAuth — FGA explained](https://fusionauth.io/blog/fine-grained-authorization)

---
*Pitfalls research for: v2.3 Dataset Access (demo) — dataset/entitlement layer on a tiered ABAC model*
*Researched: 2026-07-03*
