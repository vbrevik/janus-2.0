---
phase: 10
slug: mock-dataset-worldstate
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-05
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.0.3 |
| **Config file** | `frontend/vitest.config.ts` (jsdom environment, `globals: true`, setupFiles: `./src/test-setup.ts`) |
| **Quick run command** | `cd frontend && npx vitest run --reporter=verbose digital-resource.test.ts -t "seed-validation\|TOGGLE_RESOURCE\|selectors"` |
| **Full suite command** | `cd frontend && npx vitest run` |
| **Estimated runtime** | ~10-15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd frontend && npx vitest run --reporter=verbose`
- **After every plan wave:** Run `cd frontend && npx vitest run` (all tests)
- **Before `/gsd:verify-work`:** Full suite must be green (202+ tests) AND `cd frontend && npm run build` (zero new tsc errors beyond documented baseline)
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 10-01-01 | 10-01 | 1 | RSRC-SEED-01 | — | DigitalResourceWorld type declared, imported by world-state.tsx | Type check | `npx tsc -b` (zero new errors) | ✅ W0 | ⬜ pending |
| 10-01-02 | 10-01 | 1 | RSRC-SEED-01..05, RSRC-01 | — | seedWorld().digitalResources defined, seeded with 6+3+3 nodes | Seed validation | `npx vitest run -t "seed-validation"` | ✅ W0 | ⬜ pending |
| 10-01-03 | 10-01 | 1 | RSRC-SEED-01..05 | — | ≥3 networks (≥2 classification tiers), ≥3 platforms, ≥3 apps; org_links on 6 units; zone_prereq; temporal variety; policy-shift + non-baseline preserved | Seed validation + tsc | `npx vitest run --reporter=verbose digital-resource.test.ts -t "seed-validation"` + `npx tsc -b` | ✅ W0 | ⬜ pending |
| 10-01-04 | 10-01 | 1 | RSRC-02 | — | TOGGLE_RESOURCE_GRANT action toggles disabledResourceGrantIds, leaves disabledGrantIds untouched | Reducer test | `npx vitest run --reporter=verbose world-state.test.tsx -t "TOGGLE_RESOURCE"` | ❌ W0 | ⬜ pending |
| 10-02-01 | 10-02 | 2 | RSRC-03 | — | Three pure selectors: buildResourceTree, activeGrantsForResource, resolveResourceAt | Unit tests | `npx vitest run --reporter=verbose digital-resource.test.ts -t "selectors"` | ❌ W0 | ⬜ pending |
| 10-02-02 | 10-02 | 2 | RSRC-SEED-01..05, RSRC-01 | — | Seed-validation describe block validates all dataset criteria | Seed validation | `npx vitest run --reporter=verbose digital-resource.test.ts -t "seed-validation"` | ❌ W0 | ⬜ pending |
| 10-02-03 | 10-02 | 2 | RSRC-SEED-04, RSRC-SEED-05 | — | Updated seed-resolution tests pass (seed-06-shift-resolves, seed-07-non-baseline-applied) | Integration test | `npx vitest run --reporter=verbose digital-resource.test.ts -t "seed-06\|seed-07"` | ✅ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `digital-resource.test.ts` — seed-validation describe block (NEW, covers RSRC-SEED-01..05)
- [ ] `digital-resource.test.ts` — updated seed-resolution tests (seed-06-shift-resolves, seed-07-non-baseline-applied)
- [ ] `world-state.test.tsx` — TOGGLE_RESOURCE_GRANT reducer test
- [ ] `digital-resource-selectors.ts` — unit tests for all three selectors (buildResourceTree, activeGrantsForResource, resolveResourceAt)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `routeTree.gen.ts` stays untouched | Out of scope (Phase 11) | No automated check — verify git diff is empty for this file | `git diff frontend/src/routeTree.gen.ts` — must be empty |
| Zero new TypeScript errors | Constraints | Baseline has 20 pre-existing errors; Phase 10 must not add new ones | `cd frontend && npm run build` — compare error count to baseline |
| No new runtime dependencies | Constraints | Check package.json/package-lock.json | `grep "digital-resource\|resource-node\|resource-world" frontend/package.json` — must be empty |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
