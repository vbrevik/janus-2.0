---
phase: 12-demo-ui-tab-integration
verified: 2026-07-03T09:55:00Z
status: human_needed
score: 8/12 must-haves verified
behavior_unverified: 4
overrides_applied: 0
behavior_unverified_items:
  - truth: "On mount with backend up + token present, the loader populates WorldState.digitalResources and the Browser renders it; missing token / 401 / unreachable each show a cause-naming error state"
    test: "Log in to the main app (admin), open the demo entry, click the Digital Resources tab; then repeat with localStorage token removed, and with the backend stopped"
    expected: "Success renders the sub-nav + Browser from live data; each failure mode renders its distinct cause-naming block (missing-token has no Retry button)"
    why_human: "classifyLoaderState's 6 states are unit-tested (17 tests) and wiring is grep-verified, but the mount→dispatch→render path under real auth/network conditions is not exercised by any test"
  - truth: "The Resource Browser renders the tree with correct nesting, inherited Application classification, and the detail-panel sections per 12-UI-SPEC.md"
    test: "Expand the tree, select a Network, a Platform, and an Application"
    expected: "Correct 3-tier nesting; Application badge shows Platform classification + ' (inherited)'; detail shows org-links-by-role, policy summary, grants, delegates, slate NSM badges on Platforms"
    why_human: "Inheritance logic is selector-tested and copy/tones are grep-exact, but visual layout/appearance cannot be verified statically"
  - truth: "Disabling the sole grant behind an ALLOW flips the Explorer verdict to DENY live; re-enabling restores ALLOW; with two covering grants, disabling one keeps ALLOW"
    test: "In the Explorer, pick a subject/resource with ALLOW, toggle its grant checkbox off, then on; find a two-grant case and disable only one"
    expected: "Verdict flips DENY and back live (no submit button); two-grant case stays ALLOW until both disabled"
    why_human: "resolveResourceAt-with-disabled-grant computation is unit-tested, but the dispatch→re-render round trip (TOGGLE_RESOURCE_GRANT → useMemo recompute) has no component test; the two-grant case is not explicitly unit-tested"
  - truth: "Issuing a grant/delegate persists via the Phase 11 API (visible on later GET) and appears in WorldState; duplicate submit leaves exactly one copy; 403 surfaces inline; controls hidden for non-admin"
    test: "As admin, issue a grant via the Explorer form and a delegate via the Browser form; submit the same grant twice; re-GET /world; log in as viewer and re-open the tab"
    expected: "New rows persist server-side and render from WorldState; duplicate submit leaves one copy (server dedupe + UPSERT); non-admin sees 'Issuing controls require an admin login.'; a 403 renders bg-destructive/10 inline"
    why_human: "Reducer upsert-by-id and role helpers are unit-tested and form wiring is grep-verified, but the POST→persist→dispatch round trip against the live backend is not exercised by any test"
human_verification:
  - test: "Live walkthrough of the four behavior-unverified items above against the running dev stack (backend :15520, frontend :15510, seeded janus2) — per 12-CONTEXT.md this is explicitly deferred to /gsd-verify-work conversational UAT"
    expected: "All four flows behave as specified in 12-SPEC.md acceptance criteria"
    why_human: "Stateful UI round-trips, real auth/network error conditions, and visual conformance to 12-UI-SPEC.md require a live browser session"
  - test: "Judgment-tier prohibition review (non-authoritative LLM-judge verdicts, flagged per policy): (a) loader never silently falls back to stale data; (b) no seed credentials under src/demo/"
    expected: "Human confirms: (a) every non-success loader state renders an explicit cause-naming block (retry:false, zero seedWorld references in the panel — grep-verified); (b) grep for password123/login literals under src/demo/ is empty — grep-verified"
    why_human: "Both prohibitions are judgment-tier; autonomous verification records them as satisfied (strong deterministic evidence) but flags them for human sign-off — never a silent pass"
---

# Phase 12: Demo UI, Loader & Tab Integration — Verification Report

**Phase Goal:** The demo's "Digital Resources" tab loads Phase 11 API data into `WorldState` at mount, lets a user browse the Network→Platform→Application hierarchy, resolve access at any evaluation timestamp, toggle grants, and issue grants/delegates — all without touching the TanStack route tree.
**Verified:** 2026-07-03 (commit 826c1ce, branch `exit`, working tree clean)
**Status:** human_needed — zero gaps; 4 truths present + wired but deferred to live UAT per 12-CONTEXT.md
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Seed applied to `janus2`: 6 networks / 4 platforms / 4 applications / 18 org_links / 3 policies / 15 policy_assignments / 18 grants / 1 delegate; re-apply is a no-op | ✓ VERIFIED | Read-only psql counts match exactly; ran `apply-digital-resource-seed.sh` a second time — counts byte-identical before/after (`6/4/4/18/3/15/18/1` → same). Seed file has 43 `ON CONFLICT DO NOTHING`/`WHERE NOT EXISTS` guards on 39 INSERTs |
| 2 | Loader populates `WorldState.digitalResources` on mount; missing-token/401/unreachable/empty each surface cause-naming error states | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | `classifyLoaderState` 6-state discrimination fully unit-tested (use-digital-resources.test.ts, 14 tests incl. missing-token/loading/401/error/empty/success); `enabled: hasToken` + `retry: false` grep-verified; panel dispatches `SET_DIGITAL_RESOURCES` in useEffect on success. Live mount/error rendering not exercised — human item |
| 3 | `mapWorldResponse` denormalizes snake_case flat arrays onto network/platform/application nodes by resource_id + tier, resolving policy_id | ✓ VERIFIED | digital-resource-mapper.ts (254 lines) + 11 passing tests in digital-resource-mapper.test.ts |
| 4 | `SET_DIGITAL_RESOURCES` preserves `disabledResourceGrantIds` across refetch; `UPSERT_RESOURCE_GRANT/DELEGATE` replace-if-exists, never blind-append | ✓ VERIFIED | world-state.test.tsx: "preserves disabledResourceGrantIds… across a dispatch", "replaces in place (same length) when the id already exists" — all pass |
| 5 | Any component under DemoRoot can use React Query (QueryClientProvider ancestor) | ✓ VERIFIED | demo/main.tsx wraps `<DemoRoot />` in `QueryClientProvider` (staleTime 5min, refetchOnWindowFocus false) |
| 6 | Browser renders the 3-tier tree, inherited Application classification badge, detail-panel sections (org-links-by-role, policy, grants, delegates, slate NSM badges) | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | resource-browser.tsx (459 lines): `buildResourceTree` memo, ` (inherited)` suffix at line 339, NSM Pills `tone="slate"` (lines 430/433); inheritance logic selector-tested ("app-classification-inherited"). Visual conformance — human item |
| 7 | Explorer renders the gate-chain trace; amber "Advisory (non-blocking)" row never changes the ALLOW/DENY verdict | ✓ VERIFIED | Behavioral test "explainable-trace — … advisory separate, policyVersion matches window" passes; component renders exact `<Pill tone="amber">Advisory (non-blocking)</Pill>` and derives the verdict solely from `resolveResourceAt` (never recombines zoneAdvisory) |
| 8 | Timestamp across a policy-shift boundary (inclusive) changes the applied-policy-version label; no covering policy → fail-closed DENY | ✓ VERIFIED | Behavioral tests pass: "seed-06-shift-resolves: ALLOW before / DENY after", "isWindowActive honours the inclusive boundary", "no-active-policy-denies"; explorer renders `result.policyVersion` window label and recomputes live via `useMemo` on a `datetime-local` input |
| 9 | Grant toggle flips the Explorer verdict live (sole grant → DENY; two covering grants → one disabled keeps ALLOW) | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | Computation behaviorally tested ("activeGrantsForResource excludes disabled grant IDs", "resolveResourceAt with disabled grant returns different result"); component dispatches `TOGGLE_RESOURCE_GRANT` with `resourceGrantId`. UI dispatch→re-render round trip + explicit two-grant case — human item |
| 10 | Issuing persists via POST endpoints, updates WorldState from response (never blind append), pending-disabled submit, admin-only gating, 403 inline | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | `useIssueGrant`/`useIssueDelegate` POST + dispatch UPSERT on success; both forms gate on `getStoredUserRole() === "admin"` with the exact fallback note; `disabled={mutation.isPending}` + "Issuing…" in both forms. Live POST→persist→GET round trip and 403 rendering — human item |
| 11 | "Digital Resources" 7th tab renders the panel; `routeTree.gen.ts` untouched; build and tests green | ✓ VERIFIED | DemoRoot.tsx: 7th `ActiveView` variant + button + `{activeView === "digital-resources" && <DigitalResourcesPanel />}`; `git log eae6fb0..HEAD -- frontend/src/routeTree.gen.ts` empty; `npm run build` zero TS errors; `npm run test` 17 files / 225 tests passed |
| 12 | Issuing affordances are admin-only (D-01 corrected Option B), never admin+manager | ✓ VERIFIED | Both forms check `getStoredUserRole() === "admin"` (resource-browser.tsx:117, resource-access-explorer.tsx:116); `getStoredUserRole` null-safety unit-tested; zero `manager` references in the gate |

**Score:** 8/12 truths verified (4 present, behavior-unverified — all deferred to live UAT per 12-CONTEXT.md)

### Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `backend/scripts/apply-digital-resource-seed.sh` | Idempotent psql seed-apply | ✓ VERIFIED | 29 lines; container guard, ON_ERROR_STOP, executed twice with identical row counts |
| `frontend/src/demo/lib/digital-resource-mapper.ts` | snake_case→model denormalizer | ✓ VERIFIED | 254 lines; imported by use-digital-resources.ts; 11 tests |
| `frontend/src/demo/hooks/use-digital-resources.ts` | Query/mutation hooks + auth/loader helpers | ✓ VERIFIED | 208 lines; consumed by panel + both forms; 14 tests |
| `frontend/src/demo/components/resource-browser.tsx` | Tree + detail + Issue Delegate form | ✓ VERIFIED | 459 lines; rendered by panel; imports CLEARANCE_TONE, buildResourceTree, useIssueDelegate |
| `frontend/src/demo/components/resource-access-explorer.tsx` | Trace + toggle + Issue Grant form | ✓ VERIFIED | 473 lines; rendered by panel; imports resolveResourceAt, useIssueGrant |
| `frontend/src/demo/components/digital-resources-panel.tsx` | 6-state loader gate + sub-nav | ✓ VERIFIED | 113 lines; wires hooks → SET_DIGITAL_RESOURCES → sub-views; rendered by DemoRoot |
| `frontend/src/demo/DemoRoot.tsx` 7th tab | Tab-only integration | ✓ VERIFIED | `digital-resources` ActiveView + button + conditional render |
| `frontend/src/demo/main.tsx` | QueryClientProvider | ✓ VERIFIED | Wraps DemoRoot |
| `frontend/src/demo/store/world-state.tsx` | 3 new reducer actions | ✓ VERIFIED | SET_DIGITAL_RESOURCES / UPSERT_RESOURCE_GRANT / UPSERT_RESOURCE_DELEGATE (lines 195-197, 495-524) |

### Key Link Verification

| From | To | Via | Status |
| --- | --- | --- | --- |
| digital-resources-panel.tsx | use-digital-resources.ts | `useDigitalResourcesWorld` + `classifyLoaderState` + `hasStoredToken` imports | ✓ WIRED |
| digital-resources-panel.tsx | world-state.tsx | `dispatch({ type: "SET_DIGITAL_RESOURCES", world: query.data })` in useEffect | ✓ WIRED |
| DemoRoot.tsx | digital-resources-panel.tsx | import + conditional render on 7th tab | ✓ WIRED |
| main.tsx | @tanstack/react-query | QueryClientProvider ancestor for all demo hooks | ✓ WIRED |
| use-digital-resources.ts | /api/digital-resources/world, /grants, /delegates | apiFetch with `/api/...` prefix (gotcha respected); UPSERT dispatch on mutation success | ✓ WIRED |
| resource-browser.tsx / resource-access-explorer.tsx | access-resolution-explorer.tsx | `CLEARANCE_TONE` export (12-02) imported by both | ✓ WIRED |
| resource-access-explorer.tsx | digital-resource-selectors.ts | `resolveResourceAt` — verdict never re-derived in the component | ✓ WIRED |
| apply-digital-resource-seed.sh | migrations/20260601130001_seed_digital_resources.sql | `docker exec … psql` against janus2-postgres-dev | ✓ WIRED |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Real Data | Status |
| --- | --- | --- | --- | --- |
| DigitalResourcesPanel | `query.data` | `GET /api/digital-resources/world` → `mapWorldResponse` → `SET_DIGITAL_RESOURCES` | janus2 seeded (6/4/4/18/3/15/18/1) | ✓ FLOWING |
| ResourceBrowser | `world.digitalResources` | `useWorldState()` (populated by panel dispatch) | Yes | ✓ FLOWING |
| ResourceAccessExplorer | `resolveResourceAt(...)` memo | WorldState + disabledResourceGrantIds | Yes | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| --- | --- | --- | --- |
| Build zero TS errors | `cd frontend && npm run build` | `✓ built in 1.86s`, no TS errors | ✓ PASS |
| Full unit suite (run once) | `cd frontend && npm run test` | 17 files / 225 tests passed | ✓ PASS |
| Seed present on janus2 | read-only psql counts | 6/4/4/18/3/15/18/1 — matches 12-01 truth exactly | ✓ PASS |
| Seed re-apply no-op | ran script, re-counted | counts byte-identical | ✓ PASS |
| No-relax security suite | `cargo test --test security_hardening_test -- --include-ignored` | 13 passed, 0 failed | ✓ PASS |
| routeTree untouched | `git log eae6fb0..HEAD -- frontend/src/routeTree.gen.ts` | empty | ✓ PASS |

### Prohibitions (must-NOT)

| Prohibition | Tier | Status | Evidence |
| --- | --- | --- | --- |
| Zone-advisory row must not change the verdict | test | ✓ VERIFIED | "explainable-trace" selector test passes; component renders zoneAdvisory as a separate non-gating block only |
| No relaxation of Phase 11 server guards | test | ✓ VERIFIED | security_hardening_test 13/13 green; `git log eae6fb0..HEAD -- backend/src/ backend/migrations/` both empty — zero backend changes in the phase |
| NSM badges never green | test/judgment | ✓ VERIFIED | Both NSM Pills `tone="slate"` (resource-browser.tsx:430,433); the only `tone="green"` in the file is the org-link "active" badge, not NSM |
| Loader must not silently fall back to stale data | judgment | ✓ satisfied (flagged) | Non-authoritative: `retry: false`, no seedWorld reference in panel (grep 0), every non-success state renders a cause-naming block — human sign-off recommended |
| No seed credentials under src/demo/ | judgment | ✓ satisfied (flagged) | Non-authoritative: `grep -rn password123 src/demo/` empty; hooks only READ localStorage token/user — human sign-off recommended |

### Requirements Coverage

| Requirement | Source Plans | Status | Evidence |
| --- | --- | --- | --- |
| RSRC-UI-01 (Resource Browser) | 12-04, 12-06 | ? NEEDS HUMAN | Implementation + inheritance logic verified (truths 6); visual conformance to 12-UI-SPEC deferred to UAT |
| RSRC-UI-02 (tab, no route file) | 12-04 | ✓ SATISFIED | Truth 11 — tab wired, routeTree byte-untouched, build/test green |
| RSRC-UI-03 (Access Resolution Explorer) | 12-05 | ? NEEDS HUMAN | Trace/advisory/boundary/fail-closed logic behaviorally tested (truths 7-8); live label rendering in UAT |
| RSRC-UI-04 (hybrid loader) | 12-01, 12-02, 12-03, 12-06 | ? NEEDS HUMAN | Loader logic fully unit-tested + seed applied (truths 1-5); live mount/error states in UAT. (REQUIREMENTS.md already marks this Complete) |
| RSRC-UI-05 (grant toggle) | 12-05 | ? NEEDS HUMAN | Toggle computation behaviorally tested (truth 9); UI round-trip + two-grant case in UAT |
| RSRC-UI-06 (issuing forms) | 12-02, 12-03, 12-04, 12-05 | ? NEEDS HUMAN | Forms, gating, upsert, isPending all verified statically/unit (truths 10, 12); live persist + 403 in UAT |
| RSRC-SEED-06 / SPEC R7 (seed applied) | 12-01 | ✓ SATISFIED | Truth 1 — counts exact, re-apply no-op verified by execution |

No orphaned requirements: REQUIREMENTS.md maps exactly RSRC-UI-01..06 to Phase 12; all are claimed by plans.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| --- | --- | --- | --- | --- |
| — | — | none | — | Zero TBD/FIXME/XXX/TODO/HACK/placeholder markers across all phase-modified files |

### Human Verification Required

Per 12-CONTEXT.md, the stateful acceptance criteria that don't reduce to pure-function assertions are explicitly deferred to `/gsd-verify-work` conversational UAT (the Phase 11 convention). The four behavior-unverified truths above form the UAT script:

1. **Loader states** — open the demo tab logged in (success), without a token, and with the backend down; each state must name its cause; missing-token shows no Retry.
2. **Browser visuals** — tree nesting, ` (inherited)` badge, detail-panel sections, slate NSM badges on Platforms.
3. **Toggle round-trip** — sole-grant ALLOW→DENY→ALLOW live; two-grant case stays ALLOW with one disabled.
4. **Issuing round-trip** — admin issues grant + delegate (persist visible on later GET, exactly one copy after duplicate submit), non-admin sees the gated note, 403 renders inline.
5. **Judgment-tier prohibition sign-off** — no-silent-fallback and no-embedded-creds (both grep-clean; flagged, not silently passed).

### Gaps Summary

None. Every artifact exists, is substantive, is wired, and carries real seeded data end to end. All test-tier prohibitions verified by execution (security suite 13/13; advisory-invariant selector test). The build, the full unit suite (17/225), the seed idempotency, and the routeTree byte-identity criterion all pass. The only open items are the live-browser behaviors 12-CONTEXT.md deliberately scheduled for `/gsd-verify-work` — no code gaps were found behind any of them.

---

_Verified: 2026-07-03T09:55:00Z_
_Verifier: Claude (gsd-verifier)_
