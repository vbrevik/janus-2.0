---
phase: 15
slug: demo-ui-access-explorer
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-05
---

# Phase 15 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.0.3, jsdom environment [VERIFIED: `frontend/vite.config.ts`] |
| **Config file** | `frontend/vite.config.ts` (`test` block); `frontend/src/test-setup.ts` |
| **Quick run command** | `cd frontend && npx vitest run src/demo/store/world-state.test.tsx src/demo/hooks/use-datasets.test.ts` (second file created in Wave 0) |
| **Full suite command** | `cd frontend && npm run test` (→ `vitest run`, excludes `e2e/**`) |
| **Estimated runtime** | ~2 seconds (baseline: 314/314 passing, 20 files, confirmed this session) |

---

## Sampling Rate

- **After every task commit:** `cd frontend && npx vitest run` (full run is already ~2s locally — no need to scope to a subset)
- **After every plan wave:** same full run + `cd frontend && npx tsc -b --noEmit`
- **Before `/gsd-verify-work`:** Full suite green (314+ tests) + `tsc -b --noEmit` clean + live UAT of the non-admin block
- **Max feedback latency:** ~5 seconds

---

## Per-Task Verification Map

*Task IDs are assigned during planning (not yet run as of this VALIDATION.md's creation). The requirement-to-test mapping below is confirmed against real source (see `15-RESEARCH.md` § Validation Architecture) — the planner should attach these test targets to whichever task IDs implement each requirement.*

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | TBD | TBD | DATA-UI-04 (reducer) | — | `ISSUE_DATASET_GRANT` payload with `validFrom`/`validUntil` produces a grant with those dates, not `null` | unit | `npx vitest run src/demo/store/world-state.test.tsx -t "ISSUE_DATASET_GRANT"` | ✅ existing file — extend describe block | ⬜ pending |
| TBD | TBD | TBD | DATA-UI-04 (hook) | — | `useIssueDatasetGrant` resolves `isPending`/`isError` correctly on both allow and deny paths (denial detected via audit-log-length comparison, D-11) | unit (`renderHook`) | `npx vitest run src/demo/hooks/use-datasets.test.ts` | ❌ W0 — new file | ⬜ pending |
| TBD | TBD | TBD | DATA-UI-04 (non-admin block) | T-15-01 (enforcement-gap/IDOR, canon per SPEC.md Prohibitions) | Non-admin/non-delegate identity cannot produce a grant/audit entry even if the UI gate were bypassed — `canIssueDatasetGrant` enforced inside the reducer itself | unit (existing, regression) | `npx vitest run src/demo/store/world-state.test.tsx -t "ISSUE_DATASET_GRANT"` (covers `world-state.test.tsx:373-389` denial case) | ✅ existing | ⬜ pending |
| TBD | TBD | TBD | DATA-UI-01/02/03 (panel/explorer/reverse-lookup/admin-block rendering, empty states) | — | Datasets tab browses/resolves/reverse-looks-up correctly; empty states render explicit messages; non-admin sees blocked form | manual-only (live UAT) | — | N/A — see Manual-Only Verifications below | ⬜ pending |
| TBD | TBD | TBD | v2.2/Phase 13/14 regression guard | — | Full existing suite remains green after UI wiring, zero modified assertions | full suite | `cd frontend && npm run test` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `frontend/src/demo/hooks/use-datasets.test.ts` — covers DATA-UI-04's hook-level `isPending`/`isError` behavior on both the allow and deny paths (the one piece of genuinely new logic this phase adds; `useReducer` bailout on denial means a naive effect-only implementation would leave `isPending` stuck `true` — see 15-RESEARCH.md Pitfall 1 for the fix)
- [ ] No new shared fixtures needed — reuse `seedWorld()` and existing `DATASET_NODES`/`DATASET_GRANTS` from `seed.ts` (Phase 14), matching `world-state.test.tsx`'s existing `ISSUE_DATASET_GRANT` describe block's own pattern
- [ ] Framework install: none — Vitest and `@testing-library/react` are already dependencies

*Wave 0 does not need to introduce component-level render tests — see Manual-Only Verifications below.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|--------------------|
| Datasets tab browsing, dataset explorer ALLOW/DENY trace, reverse-lookup list, empty states | DATA-UI-01, DATA-UI-02, DATA-UI-03 | This demo module has zero existing component-level render tests anywhere [VERIFIED: no `@testing-library/react` import in any `.tsx` file under `frontend/src/demo/`] — every prior phase (12, 14) verified UI behavior via live UAT, not React Testing Library render tests. Following existing convention; don't introduce the demo module's first render-test file unless a specific reason to diverge arises during planning. | Log in as each seed user; open the Datasets tab; select `rsrc-milapp-1` (expect 4 datasets) and `rsrc-intapp-1` (expect 1 dataset) and an Application with zero datasets (expect empty message); select `ds-archive-caserecords` and confirm all 3 deny-matrix scenarios render DENY with the correct failing gate, and 2 passing scenarios render ALLOW; confirm reverse-lookup lists exactly the allowed persons once each at correct effective level with zero-match empty state |
| Admin-gated issuing form blocked for non-admin | DATA-UI-04 | UI-level gate is a `getStoredUserRole()` string check with no automated render-test precedent in this module (same rationale as above); SPEC.md's own acceptance criteria say "confirmed via live UAT" for this exact behavior | Log in as a non-admin seed user (`viewer`/`operator`/`manager`); open Datasets tab, select a dataset; confirm the issuing form area shows only the block message (`Issuing controls require an admin login.`), never the `+ Issue new grant` toggle; log in as `admin`, confirm the toggle appears and a submitted grant carries the entered Valid-from/Valid-until dates |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (`use-datasets.test.ts`)
- [ ] No watch-mode flags (`vitest run`, not `vitest watch`)
- [ ] Feedback latency < 5s (baseline: ~2s for full 314-test suite; expected to stay well under 5s after Phase 15's additions)
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending — plan-checker + execution verify this after planning/execution complete.
