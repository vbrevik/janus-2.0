# Phase 12: Demo UI, Loader & Tab Integration - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-02
**Phase:** 12-demo-ui-tab-integration
**Areas discussed:** Automated test coverage, Seed-apply mechanism, Live browser verification (question posed, no user response received)

---

## Gray areas presented (unanswered)

`12-SPEC.md` (7 locked requirements) and `12-UI-SPEC.md` (approved 6/6, exact copy/color/layout/interaction contracts) already resolve nearly every implementation ambiguity for this phase. Three implementation-rigor questions remained genuinely open — not covered by either spec — and were presented as a multiSelect AskUserQuestion. No response arrived within the session window.

| Option | Description | Selected |
|--------|-------------|----------|
| Automated test coverage | SPEC.md only requires `npm run build` + `npm run test` to stay green — doesn't mandate new tests. `demo/lib/`/`demo/store/` are heavily tested; `demo/components/` has zero `.test.tsx` files. | (no response) |
| Seed-apply mechanism | R7 requires applying the committed seed migration via direct psql, idempotently. One-off manual command vs. a checked-in repeatable script. | (no response) |
| Live browser verification | Most acceptance criteria are UI-behavioral (toggle round-trip, timestamp-boundary trace, issuing flow, role-gating). Live walkthrough via browser automation vs. code review + Vitest only. | (no response) |

**User's choice:** None — question timed out with no reply.
**Notes:** Proceeded per workflow guidance ("use your best judgment... re-ask later if still relevant"). Defaults recorded in CONTEXT.md under Claude's Discretion, explicitly flagged as non-locked and revisable by the planner.

---

## Claude's Discretion

- Unit-test the loader hook's pure logic (envelope unwrap, snake_case→camelCase mapping, loader-state classification) — matches the lib-level testing precedent. Skip component-render tests for the three new UI components — no existing precedent, and the interactive acceptance criteria are better covered live.
- Seed-apply as a small checked-in idempotent script rather than a one-off manual command, so the SPEC's "re-run is a no-op" criterion is trivially repeatable.
- Include a live dev-stack walkthrough in phase verification for the stateful/interactive acceptance criteria and the four loader error states, following the project's existing `/gsd-verify-work` conversational-UAT convention (used to close Phase 11 UAT 8/8).

## Deferred Ideas

- Org-based issuing authority (SEED-012) — already explicitly out of scope per SPEC.md, reaffirmed, not new.
- Component-level render tests — deferred, revisable if planner finds a cheap logic-only way to cover the interactive criteria.
