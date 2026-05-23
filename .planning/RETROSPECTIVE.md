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

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Plans | Key Change |
|-----------|--------|-------|------------|
| v2.0 | 4 | 16 | Spike-first validation before any composition work |

### Cumulative Quality

| Milestone | Tests | TS Errors | Build |
|-----------|-------|-----------|-------|
| v2.0 | 80/80 Vitest | 0 | Clean |

### Top Lessons (To Verify Across Milestones)

1. Spike-first validation compresses planning cycles — verify this holds for backend integration phases
2. Demo island isolation (separate Vite entry) eliminates router complexity — may not apply when integrating into the main app
