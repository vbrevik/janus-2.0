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

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Plans | Key Change |
|-----------|--------|-------|------------|
| v2.0 | 4 | 16 | Spike-first validation before any composition work |
| v2.1 | 4 | 9 | NSM concepts encoded as typed model values with named tests; TDD RED/GREEN held at 1-day pace |

### Cumulative Quality

| Milestone | Tests | TS Errors | Build |
|-----------|-------|-----------|-------|
| v2.0 | 80/80 Vitest | 0 | Clean |
| v2.1 | 116/116 Vitest (at Phase 7 close) | 0 | Clean |

### Top Lessons (To Verify Across Milestones)

1. Spike-first validation compresses planning cycles — verify this holds for backend integration phases
2. Demo island isolation (separate Vite entry) eliminates router complexity — may not apply when integrating into the main app
