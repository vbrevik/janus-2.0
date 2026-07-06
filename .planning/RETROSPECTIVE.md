# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v2.0 — Authorization Hub (demo)

**Shipped:** 2026-05-22
**Phases:** 4 | **Plans:** 16 | **Timeline:** 2 days (2026-05-21 – 2026-05-22)

### What Was Built

- Pure-computed ABAC engine with live per-rule traces, deny overrides, domain-independent tiers
- Pointer-only discovery hub: typed interchange contract, signed credential verify-before-trust, holder-gated release
- Append-only audit log with O(1) projection and point-in-time access reconstruction
- Per-entity policy divergence, deployment-driven support obligations, directional shielding
- Coherent 5-tab demo shell — all mechanisms composed, plain-prose traces, production build clean

### What Worked

- **Spike-first validation.** 9 spikes proven before any composition work; Phase 1 had zero rework because the ABAC engine design was already validated.
- **Wave-based parallel planning.** Phases 2 and 3 ran in parallel (Phase 3 depends on Phase 1, not Phase 2); reduced wall-clock time significantly.
- **Demo island isolation.** Keeping demo code in `frontend/src/demo/` separate from the TanStack router meant zero routing complexity and zero `routeTree.gen.ts` conflicts.
- **Plain-prose legibility as a phase gate.** Phase 4 required non-developer-readable traces — this forced clear `captionFor`/`proseSentence` helpers rather than leaving it as an afterthought.
- **Audit-first milestone close.** Running `/gsd-audit-milestone` before `/gsd-complete-milestone` surfaced the `proseSentence` CTX-02/03 gap early enough to fix inline (2 named branches added during audit).

### What Was Inefficient

- **Stale comment debt.** `DemoRoot.tsx` stale comment ("Interim view toggle — throwaway") survived all 4 phases. Small cost but indicates comments aren't on the review checklist.
- **`buildPublishEnvelope` orphaned export.** `contract.ts` has a dead export that was never wired; the reducer inlines the envelope construction instead. Would have been cleaner to remove during Phase 2 rather than leaving it for later.
- **REQUIREMENTS.md checkbox drift.** 17 of 21 checkboxes showed `[ ]` even though all were verified complete; only the traceability table was accurate. Checkbox state should be updated at phase close, not milestone close.
- **CTX-01 policy grid prose gap.** The 6-column policy grid uses `<DecisionTrace>` without the `prose` prop — flagged as a warning in the audit. Low priority but represents a DEMO-03 partial gap that slipped Phase 4 review.

### Patterns Established

- **`lib/` + `store/` separation.** Pure functions in `lib/` (abac.ts, auditlog.ts, policy.ts, obligations.ts, contract.ts, credential.ts) with Vitest coverage; React/side-effect code in `store/` and `components/`. Clean boundary.
- **WorldProvider + split contexts.** `useWorld()` for reads, `useWorldDispatch()` for writes — prevents unnecessary re-renders from dispatch reference changes.
- **Verbatim spike lift + import rebase.** Phase 1 copied spike code verbatim then only changed imports — no logic drift, no guessing.
- **Verify-before-trust enforcement at integration point.** `verifyCredential` runs in `handleRespond` before `principalFromSubject` — the only place the policy can be enforced.

### Key Lessons

1. **Spike first, compose second.** The entire 6-unit scenario was validated in isolation before Phase 1. This made Phase 1 a straight lift, not a design session. For the next milestone (demo→fullstack), spike the Rust ABAC integration before writing the migration plan.
2. **Legibility is a first-class requirement, not a finish.** DEMO-03 was a gate — if traces weren't readable, the phase wasn't done. This discipline is reusable: any feature that produces output should have a legibility criterion.
3. **Audit gaps before archiving, not after.** The audit found 2 additional warning-level items (orphaned export, CTX-01 grid prose gap) on re-check. Running audit earlier in the milestone cycle — not just at close — would catch these while they're cheaper to fix.
4. **Dead code at phase boundaries is tech debt.** `buildPublishEnvelope` was orphaned at the Phase 2/3 boundary. A simple "is every export used?" check per phase would prevent this accumulation.

### Cost Observations

- Model mix: sonnet-4-6 primary throughout
- Sessions: ~6–8 across 4 phases
- Notable: 2-day completion for 4 phases, 16 plans, 21 requirements — spike pre-validation compressed the planning cycle dramatically

---

## Milestone: v2.1 — Physical Access Zones (demo)

*(Backfilled 2026-07-03 at v2.2 close — the retrospective step was skipped at v2.1's own close on 2026-05-23. Written from MILESTONES.md, phase 5–8 artifacts, and the v2.1 audit; leaner than a same-day retro would have been.)*

**Shipped:** 2026-05-23
**Phases:** 4 (5–8) | **Plans:** 9 | **Timeline:** 1 day

### What Was Built

- Hierarchical zone model (SITE→ROOM) with CONTROLLED/RESTRICTED/SECURED types, dual org ownership, and the SECURED-not-at-SITE/AREA ceiling rule
- 5-tier clearance ladder + NSM-grounded access rules; escort explicitly never substitutes for SECURED clearance
- Time-windowed PhysicalAccessGrant with zone-type-scoped inheritance, two-gate resolution, and admin-org delegation (ZoneAccessDelegate)
- Escort-tracked entry logging (mandatory for SECURED) + visitor passes
- 6-unit mock dataset and three demo views (Zone Browser, Access Resolution Explorer, Entry Log) in a 6th demo tab

### What Worked

- **TDD RED/GREEN as the default rhythm.** Phase 7's test plan was fully delivered by the RED commit of the preceding plan (07-01) — the pattern established in v2.0 held under a 1-day milestone pace (116 tests passing at Phase 7 close, tsc clean).
- **Appending to `model.ts` as pure functions.** All zone/grant/log logic landed as pure, Vitest-covered functions in `lib/`, continuing the v2.0 `lib/`+`store/` boundary. This paid off again in v2.2, which reused `resolveZoneAccess` unchanged for the advisory zone-prerequisite.
- **One-day milestone.** 38/38 requirements across 4 phases in a single day, audit passed — the spike-first + demo-island patterns from v2.0 kept compounding.

### What Was Inefficient

- **Deferred enforcement resurfaced as a security hole.** `canIssueGrant()` enforcement was deferred to "UI" at v2.1 close (the one deferred item, 38/38 otherwise). Its digital-resource sibling (`canIssueResourceGrant`) then became v2.2's confirmed IDOR in 11-03, forcing a mid-phase authz-model decision (Option B role gate; org-based model re-deferred to SEED-012). Lesson: an enforcement gap deferred at one milestone tends to be rediscovered as a vulnerability in the next.
- **This retrospective itself.** The v2.1 close skipped the retrospective step entirely — discovered only at v2.2 close. Milestone-close checklists exist precisely to prevent this.

### Patterns Established

- **NSM grounding as data, not prose.** Regulatory concepts (sikkerhetsgodkjenning, escort rules, clearance ladder) encoded as typed model values with named tests — the pattern v2.2's NSM annotation badges then reused.
- **Zone-type-scoped grant inheritance with explicit-auth short-circuit** — the two-gate resolution shape that v2.2's gate-chain resolver generalized.

### Key Lessons

1. **Defer features, not enforcement.** Anything access-control-shaped that ships unenforced should carry a tracking artifact with a trigger, not a one-line "deferred" note.
2. **Reuse compounds when logic stays pure.** `resolveZoneAccess` crossing into v2.2 unchanged validated the pure-`lib/` discipline for the third milestone running.

### Cost Observations

- Model mix: sonnet-4-6 primary (same as v2.0)
- Sessions: ~3–4 across 4 phases (single day)
- Notable: fastest milestone to date; retro step skipped — process gap, not a cost win

---

## Milestone: v2.2 — Platform, Network & Application Access (demo)

**Shipped:** 2026-07-03
**Phases:** 4 (9–12) | **Plans:** 17 (16 planned + 12-07 gap closure) | **Timeline:** 2026-06-02 → 2026-07-03 (~1 month wall-clock with a mid-June pause; ~5 active build days)

### What Was Built

- Data-driven, time-versioned per-resource policy engine with explainable gate-chain traces — Network → Platform → Application hierarchy, no cross-tier inheritance, advisory zone prerequisite, point-in-time resolution
- 6-unit mock dataset covering every required data shape (policy shift, non-baseline policy, zone-prereq, active/expired/future grants)
- **First real backend slice:** 8 Postgres tables, gate-chain resolver ported to Rust with byte-exact TS↔Rust golden-fixture parity, AuthGuard read + issue endpoints, repaired migration chain, Postgres as fixture source of truth, SEC-01..04 hardening (JWT fail-loud, per-role RBAC, CORS pinning)
- Digital Resources demo tab: Resource Browser, Access Resolution Explorer, six-state fail-loud loader, interactive grant toggle, admin-gated issuing forms

### What Worked

- **Golden-fixture parity as the cross-engine contract.** TS exports fixed-clock fixtures to JSON; Rust asserts byte-equal output. Caught drift deterministically and survived a mid-plan `NaiveDateTime→DateTime<Utc>` migration without loosening.
- **Live browser UAT caught what build/grep verification could not.** The zone-advisory row passed every automated check (JSX present, tests green) while being permanently dead code — a selector hardcoded empty zone arrays. Only driving the real app found it (12-07 fixed it same-day with a regression test on the exact wrapper that was broken).
- **Safe-resume discipline.** Two session interruptions (mid-11-03, mid-12-02) both recovered cleanly via HANDOFF.json / commit-vs-SUMMARY reconciliation — no duplicated or lost work across context resets.
- **Fixing the migration chain first (RSRC-BE-06) unblocked everything.** Making a fresh DB migrate end-to-end was prerequisite work that had been dodged for two milestones; doing it as Phase 11 wave 1 removed a standing source of drift.

### What Was Inefficient

- **`npm run build` was silently broken for two phases.** 27 tsc errors accumulated from Phase 10 onward because vitest transpiles without type-checking and no phase gate ran `tsc -b`. Discovered only when 12-02's acceptance criteria demanded a clean build. Same class of failure on the backend: full-crate `cargo test` broke (missing struct field in a test fixture) and stayed broken until milestone close.
- **Verification-artifact drift.** Phase 10 was executed, UAT'd, and marked complete in ROADMAP — but its canonical VERIFICATION.md was never written, so tooling reported it as unverified three weeks later. Same-day artifacts (checkboxes, retro sections, audit files) kept needing retroactive backfill.
- **The IDOR arrived via a requirement written against a data model that didn't exist.** RSRC-BE-04 assumed org-based issue authority, but no person→org linkage exists in the schema — the gap surfaced as a live vulnerability mid-phase and forced an unplanned authz-model decision (Option B role gate; org model → SEED-012).

### Patterns Established

- **Coverage blocks in SUMMARY frontmatter** (deliverable → requirement → verification refs) — made UAT generation partially deterministic; the `kind:` vocabulary needs tightening (non-standard values like `build+unit` fell back to human checkpoints).
- **Six-state fail-loud loader** (missing-token / loading / unauthorized / error / empty / success, no silent fallback) — the template for every future API-backed demo panel.
- **Seed-apply script over broken `sqlx migrate run`** — checked-in idempotent psql wrapper, all idempotency in the SQL itself (`ON CONFLICT DO NOTHING`).

### Key Lessons

1. **A verification gate that never runs is indistinguishable from passing.** Both build breaks lived exactly where no phase gate looked. Every phase's verify step should include the full typecheck/compile commands, not only the test runner.
2. **Grep-verification proves presence, not life.** The zone-advisory bug is the canonical case: every static check passed while the data path was dead. Requirements that exist to *exercise* something (RSRC-SEED-04) need a behavioral assertion at the integration point, not just at the unit under it.
3. **Requirements must be validated against the data model before they become security assumptions.** RSRC-BE-04's org-based authority was unimplementable as written; the mismatch surfaced as an IDOR instead of a planning-time finding.
4. **Milestone-close artifacts decay fast.** The v2.1 retro was never written; Phase 10's VERIFICATION.md never created; REQUIREMENTS checkboxes drifted twice (also a v2.0 lesson — still recurring). Close-time checklists only work when actually executed at close time.

### Cost Observations

- Model mix: opus/sonnet primary through phases 9–11; fable-5 for phase 12 execution, UAT, audit, and close
- Sessions: ~10–12 across 4 phases (two recovered interruptions)
- Notable: wave-based executor fan-out (12-03→12-06 in one session) and adversarial live UAT both paid for themselves — the UAT found the only real post-verification bug of the milestone

---

## Milestone: v2.3 — Dataset Access (demo)

**Shipped:** 2026-07-06
**Phases:** 3 (13–15) | **Plans:** 9 | **Timeline:** 2026-07-04 → 2026-07-06 (2 days)

### What Was Built

- Dataset model (`MAILBOX`/`ARCHIVE_ROLE`/`DOCUMENT_SITE`) spanning ≥1 Applications via OR-gated `application_ids`, with a per-type level mechanism — ranked ladder for MAILBOX/DOCUMENT_SITE, containment map for ARCHIVE_ROLE
- Standalone 3-gate `resolveDatasetAccess` resolver (clearance → Application-grant OR-gate → dataset-grant) with an independent existence/visibility gate, plus delegate-capped `canIssueDatasetGrant`
- Full seed fixture set (5 datasets, 10 grants, 1 new denial-narrative subject) + `dataset-selectors.ts` read path + `WorldState.datasets` wiring + `ISSUE_DATASET_GRANT` write-path action, with a deny-matrix fixture proving every resolver gate as sole decider
- Demo UI: dataset-level Access Resolution Explorer (4-gate trace), reverse-lookup view, admin-gated issuing form, all wired into a new "Datasets" top-level tab

### What Worked

- **Reuse-verbatim discipline held across all 3 phases.** Phase 15's UI calls Phase 13's `resolveDatasetAccess`/`canIssueDatasetGrant` through a thin pass-through selector — confirmed by the integration checker (12/12 exports wired, 0 orphans, 0 re-derived logic). The `lib/`+`store/`+`components/` boundary from v2.0 held for a third domain running.
- **Spec-phase live-confirmation caught 4 research defaults that were wrong.** ARCHIVE_ROLE-as-containment (not rank), delegate-capped-at-own-grant (not dataset max), multi-Application OR-gate (not 1:1), and the new independent-visibility-gate requirement were all live-confirmed with the user during `/gsd-spec-phase 13` before any code was written — avoiding a repeat of v2.2's RSRC-BE-04 mismatch (a requirement written against a data model that didn't exist).
- **Live UAT caught a real backend seed gap, again.** Phase 15's live UAT surfaced a pre-existing backend seed-data gap (2 missing grants) that no automated test caught — same class of bug as v2.2's dead zone-advisory row (Lesson 2, v2.2). Fixed same-day, closing all 4 DATA-UI requirements.
- **Known-limitation-as-code-comment pattern.** The delegate-cap deny path (WR-02) has no reachable UI path in the demo (the only actor is always `admin_org`-equivalent) — instead of silently leaving this undocumented, Phase 15's authors wrote it directly into `dataset-access-explorer.tsx`'s file header. The milestone audit's integration checker treated it as an accepted note, not a gap, precisely because it was self-documented.

### What Was Inefficient

- **REQUIREMENTS.md checkbox drift, a fourth time.** 13-VERIFICATION.md flagged DATA-01..05 and DATA-GRANT-01..03 as unchecked (`[ ]`) despite being fully implemented and tested — the same class of drift called out in v2.0 (Lesson, "checkbox state should be updated at phase close") and repeated in v2.2. This is now a 3-for-3 recurrence across all shipped milestones; worth a mechanical fix (auto-check on VERIFICATION `passed`) rather than a fourth retrospective note.
- **`summary-extract --fields one_liner` mis-extracted 13-01's one-liner.** It pulled a "[Pre-existing implementation]" deviation note instead of the actual accomplishment, and the bad text made it verbatim into the auto-generated MILESTONES.md entry — caught and hand-fixed only because the milestone-close review read the output before committing. SUMMARY.md files that predate a frontmatter convention (13-01 has no `requirements-completed` field, unlike every later plan) are the files most likely to confuse field-based extraction; worth backfilling the convention retroactively, or hardening the extractor's fallback.
- **The pre-close artifact audit still surfaces the same 12 dormant seeds every milestone.** They were correctly re-acknowledged (not a new problem), but a milestone-close gate that always shows the same 12 items trains the operator to click through it — a genuinely new blocking item could get the same reflexive "acknowledge all".

### Patterns Established

- **Containment-map vocabulary for non-linear role hierarchies.** `ARCHIVE_ROLE_CONTAINS` (a `Record<Role, Role[]>` transitive-coverage map) instead of a numeric rank table — the model for any future access-level vocabulary that isn't strictly linear.
- **Independent visibility gate as a first-class resolver output.** `resolveDatasetAccess` returns `visible` and `allow` as two genuinely independent booleans (not derived from each other), with `visible` computed from exactly one gate and no admin/delegate exemption anywhere in the function. Reusable shape for "does this exist to you" vs "can you use it" wherever that distinction matters.
- **Integration-checker as a milestone-audit stage, not just a phase-verify stage.** Explicitly re-verifying cross-phase wiring (not just each phase's own VERIFICATION.md) at milestone-close caught nothing broken here, but is now the standing check that would catch a Phase-15-imports-nothing-from-Phase-13 regression before it shipped.

### Key Lessons

1. **Spec-phase live-confirmation is cheap insurance against v2.2-style requirement/data-model mismatches.** All 4 of v2.3's flipped research defaults were confirmed with the user in one sitting before Phase 13 started, at effectively zero cost compared to discovering them as a mid-phase IDOR.
2. **A documented known-limitation survives an audit; an undocumented one becomes a "gap".** WR-02's file-header comment is the difference between the integration checker filing it as a WARNING-for-awareness versus a BLOCKER. Any deliberately-scoped-out enforcement path should get the same treatment going forward (this generalizes v2.1's Lesson 1, "defer features, not enforcement" — deferring is fine if it's written down where the next auditor will find it).
3. **REQUIREMENTS.md checkbox drift is now a confirmed pattern across 3/3 milestones, not a one-off.** Worth fixing mechanically (e.g., auto-checking boxes when the assigned phase's VERIFICATION.md flips to `passed`) rather than continuing to catch it by hand at milestone audit.

### Cost Observations

- Model mix: sonnet-5 throughout (planning, execution, and this close)
- Sessions: ~2–3 across 3 phases (fastest multi-phase milestone since v2.1)
- Notable: zero re-plans, zero reverted commits; the only rework was the same-day backend-seed fix surfaced by live UAT (Phase 15) — consistent with v2.2's finding that live UAT remains the one verification tier that catches what build/grep cannot

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Plans | Key Change |
|-----------|--------|-------|------------|
| v2.0 | 4 | 16 | Spike-first validation before any composition work |
| v2.1 | 4 | 9 | NSM concepts encoded as typed model values with named tests; TDD RED/GREEN held at 1-day pace |
| v2.2 | 4 | 17 | First real backend slice; golden-fixture TS↔Rust parity; live-browser UAT as a verification tier |
| v2.3 | 3 | 9 | Spec-phase live-confirmation of research-flipped decisions before build; documented-known-limitation pattern for unenforceable UI paths |

### Cumulative Quality

| Milestone | Tests | TS Errors | Build |
|-----------|-------|-----------|-------|
| v2.0 | 80/80 Vitest | 0 | Clean |
| v2.1 | 116/116 Vitest (at Phase 7 close) | 0 | Clean |
| v2.2 | 228/228 Vitest + 22/22 cargo unit + parity/integration suites | 0 | Clean (repaired at close — was silently broken 2 phases) |
| v2.3 | 317/317 Vitest | 0 | Clean (demo-only, no backend touched) |

### Top Lessons (To Verify Across Milestones)

1. Spike-first validation compresses planning cycles — HELD for v2.2's backend phase (golden fixtures acted as the spike)
2. Demo island isolation (separate Vite entry) eliminates router complexity — HELD through v2.3 (routeTree.gen.ts byte-identical)
3. Verification gates that never execute are indistinguishable from passing — add full typecheck/compile to every phase verify step (v2.2)
4. Defer features, not enforcement — unenforced access-control gaps resurface as vulnerabilities next milestone (v2.1 → v2.2 IDOR); v2.3's WR-02 delegate-cap path shows the fix — document the deferral inline so the next audit can tell "deferred" from "forgotten"
5. Live UAT remains the one verification tier that catches what build/grep/unit-tests cannot — HELD a third time (v2.2 zone-advisory dead code, v2.3 backend seed gap)
6. REQUIREMENTS.md checkbox drift at phase close — recurring in 3/3 milestones (v2.0, v2.2, v2.3); needs a mechanical fix, not another retrospective note
