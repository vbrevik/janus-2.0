---
phase: 14
slug: mock-dataset-worldstate
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-04
---

# Phase 14 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.0.3, jsdom environment, `globals: true` (`frontend/vite.config.ts:32-37`) |
| **Config file** | `frontend/vite.config.ts` (test block) — no separate `vitest.config.ts` |
| **Quick run command** | `cd frontend && npx vitest run src/demo/lib/dataset-selectors.test.ts src/demo/store/world-state.test.tsx` |
| **Full suite command** | `cd frontend && npm run test` |
| **Estimated runtime** | ~1 second (baseline: 883ms / 123 tests across the 3 files this phase touches) |

---

## Sampling Rate

- **After every task commit:** Run `cd frontend && npx vitest run <touched-test-file>`
- **After every plan wave:** Run `cd frontend && npm run test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** ~5 seconds

---

## Per-Task Verification Map

*Task IDs are assigned during planning (not yet run as of this VALIDATION.md's creation). The requirement-to-test mapping below is confirmed against real source (see `14-RESEARCH.md` § Validation Architecture) — the planner should attach these test targets to whichever task IDs implement each requirement.*

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | TBD | TBD | DATA-SEED-01 | — | ≥2 mailboxes/person (own + shared) resolvable via selector | unit (seed-integration) | `npx vitest run src/demo/lib/dataset-selectors.test.ts -t "mailbox"` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | DATA-SEED-02 | — | Archive dataset covers READER/CASE_HANDLER/ADMIN across seeded grants | unit (seed-integration) | `npx vitest run src/demo/lib/dataset-selectors.test.ts -t "archive"` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | DATA-SEED-03 | — | ≥2 document sites, ≥2 distinct levels represented | unit (seed-integration) | `npx vitest run src/demo/lib/dataset-selectors.test.ts -t "document"` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | DATA-SEED-04 | — | Prerequisite-chain success scenario, real seed data | unit (seed-integration, gate-trace) | `npx vitest run src/demo/lib/dataset-selectors.test.ts -t "prerequisite"` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | DATA-SEED-05 | — | Dataset-gate-denial scenario, real seed data | unit (seed-integration, gate-trace) | `npx vitest run src/demo/lib/dataset-selectors.test.ts -t "denied"` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | DATA-SEED-06 | T-14-01 (gate-bypass class, canon-dropped to Phase 13 threat model) | 3-case deny-matrix: each case's sole target gate fails AND the other two independently pass | unit (seed-integration, gate-trace) | `npx vitest run src/demo/lib/dataset-selectors.test.ts -t "deny-matrix"` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | WorldState/selectors wiring (R6) | — | `datasets` sub-object populated; `application_id` join selector; no orphan refs | unit | `npx vitest run src/demo/lib/dataset-selectors.test.ts -t "join"` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | `issueDatasetGrant` action (R7) | T-14-01 | Permitted issuance creates grant+audit; gate-failing issuance creates neither (canIssueDatasetGrant checked first, silent refusal) | unit (reducer) | `npx vitest run src/demo/store/world-state.test.tsx -t "ISSUE_DATASET_GRANT"` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | v2.2/Phase 13 regression guard | — | All pre-existing digital-resource/dataset/world-state tests remain green, zero modified assertions | full suite | `npm run test` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `frontend/src/demo/lib/dataset-selectors.ts` — module under test doesn't exist yet; must be created before its test file
- [ ] `frontend/src/demo/lib/dataset-selectors.test.ts` — covers DATA-SEED-01..06 + join selector test
- [ ] `frontend/src/demo/store/world-state.test.tsx` new describe block — covers the `issueDatasetGrant` requirement (R7)
- [ ] No new test framework/config needed — Vitest is fully configured and proven working (123-test baseline confirmed passing)

---

## Manual-Only Verifications

*All phase behaviors have automated verification.* Phase 14 is pure fixture data + selectors + one reducer action (no UI wiring — Phase 15's scope) — there is no human-observable surface to test manually.

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (dataset-selectors.ts + its test file + world-state.test.tsx addition)
- [ ] No watch-mode flags (`vitest run`, not `vitest watch`)
- [ ] Feedback latency < 5s (baseline: ~1s for full 123-test suite; expected to stay well under 5s after Phase 14's additions)
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending — plan-checker + execution verify this after planning/execution complete.
