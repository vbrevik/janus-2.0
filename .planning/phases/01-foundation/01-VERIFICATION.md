---
phase: 01-foundation
verified: 2026-05-21T19:52:01Z
status: passed
score: 5/5
overrides_applied: 0
human_verification_resolved: "The 3 visual items below were confirmed on screen by the user in the approved 01-04 Task 4 human-verify checkpoint (banner pin, tier-vs-clearance rows, 8-role action set with live grant->ALLOW and hold->DENY flips). Code is 5/5 verified; the human gate already occurred."
human_verification:
  - test: "Load /demo.html and scroll — confirm [DEMO / MOCK] banner pins to top and has no close button"
    expected: "Sticky amber banner at top of every screen with no dismiss control"
    why_human: "Structural stickiness and absence of close control confirmed by code, but on-screen pin behavior under scroll is visual only"
  - test: "With default selection confirm live ALLOW trace; pick the tier-DENY contrast actor and confirm Clearance row shows checkmark and Domain tier row shows X"
    expected: "Clearance passes, Domain tier fails, these are rendered as distinct rows in DecisionTrace"
    why_human: "Row rendering logic verified in code but visual distinctiveness at the pixel level requires human eyes"
  - test: "Cycle all 8 roles and confirm each sees its correct action set: Approver=grant+revoke, Manager=request-only, Security Officer=hold-toggle, Admin/Sponsor/Subject/Personnel-Mgr=SoD empty state"
    expected: "Action panel contents change with role switch; human confirms labels match spec"
    why_human: "Op-gating logic verified by code but role-switch UX and label rendering requires visual confirmation — this was the approved human-verify checkpoint (01-04 Task 4)"
---

# Phase 01: Foundation — Verification Report

**Phase Goal:** The demo's shared world-state is live, the ABAC engine produces explainable decisions across all three domains, and role-based action availability is enforced — everything downstream views need.
**Verified:** 2026-05-21T19:52:01Z
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `[DEMO / MOCK]` banner is non-dismissable on every screen; every simulated trust signal labelled `[MOCK]` | VERIFIED | `DemoBanner.tsx`: `sticky top-0`, no `useState`, no close handler. `ui.tsx` exports `MockTag` with amber palette. `DecisionExplorer.tsx` line 153 places `<MockTag />` adjacent to every clearance `Pill`. Grep for `useState\|dismiss\|onClose\|close` in `DemoBanner.tsx` → empty. |
| 2 | 6 canonical units (2 military, intel, infra, industry, home guard) with subjects+resources pre-seeded in ONE shared in-memory world-state | VERIFIED | `seed.ts`: 30 subjects, 26 resources across all 6 `UnitId` values (MILITARY_1, MILITARY_2, INTEL, INFRA, INDUSTRY, HOME_GUARD). `world-state.tsx`: single `useReducer` holding the entire world from seed arrays. No `ENTITY_A`/`EntityId` found. SUBJECTS.length ≥ 24, RESOURCES.length ≥ 24. |
| 3 | Live ALLOW/DENY for any subject/resource/domain triple with a per-rule trace | VERIFIED | `DecisionExplorer.tsx` line 82: `useMemo(() => evaluate(principalFromSubject(subject), requirementFromResource(resource)), [subject, resource])`. `abac.ts`: returns `{ decision, rules, overrides, failed }` with 4 named rules each carrying `{ name, pass, detail }`. `DecisionTrace` in `ui.tsx` renders all rows. 6 tests green in `abac.test.ts`. |
| 4 | Computer/data tier failure and clearance failure produce distinct explanations (per-domain tiers independent) | VERIFIED | `abac.ts` lines 51-52: `tierRank = (domain, tier) => TIERS[domain].indexOf(tier)` — per-domain ladder, never collapsed. `abac.test.ts` line 26-29: tier-DENY test asserts `clearance.pass === true && tier.pass === false`. Both rules render as separate rows in `DecisionTrace`. `captionFor()` in `DecisionExplorer` produces distinct prose for tier-only vs clearance failure. |
| 5 | Switch to any of 8 operating roles → available actions change; Approver grant/revoke, Manager request-only, Security Officer place holds | VERIFIED | `model.ts` defines 8 `RoleId` values. `RoleSwitcherHeader.tsx` dispatches `SET_ROLE` on change. `DecisionExplorer.tsx` line 103: `can = (op) => ROLES[currentRole].ops.includes(op)` — no `role ===` check anywhere. `ACCESS_APPROVER.ops` = `[approve_attribute, revoke_attribute, view_eval]`. `MANAGER.ops` = `[request_attribute, view_team, AUTHORIZE_SUBJECT, WITHDRAW_AUTHORIZATION]` (no `approve_attribute`). `SECURITY_OFFICER.ops` = `[flag_risk, manage_annotations, view_eval]`. SoD empty state rendered when `!can(approve_attribute) && !can(flag_risk) && !can(request_attribute)`. |

**Score:** 5/5 truths verified by code inspection

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `frontend/src/demo/lib/model.ts` | Frozen unified world schema (UnitId-keyed, D-05/D-11 fields) | VERIFIED | 291 lines. All 6 `UnitId` values, `CLEARANCE_RANK`, `TIERS` (per-domain), `Compartment` ≥6 values (AURORA, BLACKWING, CITADEL, SIGINT, STOCKWATCH, HOMELAND), `Subject` with D-11 `authorization?` field, `Resource`, `HubPointer`, 8-role `ROLES`, `AttrOp`, `AttrEvent`. No `ENTITY_A`/`EntityId` in functional code. |
| `frontend/src/demo/lib/abac.ts` | Pure-computed ABAC evaluator lifted verbatim | VERIFIED | 170 lines. Imports from `./model`. Per-domain `tierRank` using `TIERS[domain].indexOf`. Exports `evaluate`, `principalFromSubject`, `requirementFromResource`, `releaseRequirementFor`. No `ENTITY_A`, `homeEntity`, `ownerEntity` in functional code. |
| `frontend/src/demo/lib/seed.ts` | Rich 6-unit seed with named contrast and forward actors | VERIFIED | 815 lines. 30 subjects, 26 resources. All 6 units seeded. `ca3a-subj` (revoked), `ca3b-subj` (securityHold), `ca4-subj` (NTK-DENY missing STOCKWATCH), `ca5-subj` (authorization WITHDRAWN with OQ-B comment). Shielded resources: `fw1-res`, `res-11`, `fw3-res`, `res-20`. `AGREEMENTS`, `HUB_INDEX` present. |
| `frontend/src/demo/lib/abac.test.ts` | Ported engine tests (6 it-blocks green) | VERIFIED | 6 tests passing. Includes tier-DENY locking assertion (`clearance.pass === true` and `tier.pass === false`), override-DENY assertion (`overridden.rules.every(r => r.pass) === true`), NTK-DENY, affiliation-DENY, cross-entity release ALLOW, and Security Officer hold flip. |
| `frontend/src/demo/store/world-state.tsx` | Single useReducer world-state store + split-context | VERIFIED | 251 lines. `useReducer` present. `WorldStateContext` + `WorldDispatchContext`. 6 actions: SET_ROLE, SET_TARGET, APPROVE_ATTRIBUTE, REVOKE_ATTRIBUTE, TOGGLE_SECURITY_HOLD, REQUEST_ATTRIBUTE. No `decision` field. No `RECOMPUTE` action. `WorldProvider`, `useWorld`, `useWorldDispatch` exported. `REQUEST_ATTRIBUTE` mutates zero subjects (verified by test). |
| `frontend/src/demo/store/world-state.test.tsx` | Reducer unit tests (6 it-blocks) | VERIFIED | 6 tests passing. Covers new-ref immutability (`not.toBe`), event-append, SoD-crux zero-mutation, SET_ROLE/SET_TARGET no-event, and APPROVE→DENY-flips-to-ALLOW live-recompute proof. |
| `frontend/src/demo/components/ui.tsx` | Pill, Card, Field, Select, DecisionTrace + MockTag | VERIFIED | 130 lines. All 6 exports confirmed. `DecisionTrace` renders `✓ ALLOW`/`✗ DENY` verdict and `⛔ … (deny override)` lines. `MockTag` uses amber palette distinct from green/red. |
| `frontend/src/demo/components/DemoBanner.tsx` | Non-dismissable [DEMO / MOCK] banner | VERIFIED | 18 lines. `sticky top-0 z-50`. Renders literal `[DEMO / MOCK]`. No `useState`, no close/dismiss handler. |
| `frontend/src/demo/components/RoleSwitcherHeader.tsx` | Store-bound 8-role switcher | VERIFIED | 33 lines. `useWorld()` reads `currentRole`. Dispatches `SET_ROLE`. No `useState` for role. Displays active role's op pills. |
| `frontend/src/demo/components/DecisionExplorer.tsx` | Subject/resource/domain pickers → live trace → role-gated actions | VERIFIED | 318 lines. `useMemo` keyed on `[subject, resource]`. `optgroup` for picker grouping. `ROLES[currentRole].ops.includes` gate (no `role ===`). Verbatim copy: "separation of duties", "(cannot grant)", "No actions yet.", "Approve: grant", "Place security hold". `MockTag` next to clearance. |
| `frontend/src/demo/DemoRoot.tsx` | Final composition: WorldProvider + DemoBanner + RoleSwitcherHeader + DecisionExplorer | VERIFIED | 22 lines. `WorldProvider` wraps all. `DemoBanner` and `RoleSwitcherHeader` are siblings of `<main>`, outside the swappable region. No `@tanstack/react-router` imports. No "mounts here" placeholder. |
| `frontend/demo.html` | Dev/build entry HTML for demo island | VERIFIED | References `/src/demo/main.tsx` in module script. |
| `frontend/vite.config.ts` | Build input map with main + demo | VERIFIED | `rollupOptions.input = { main: resolve('index.html'), demo: resolve('demo.html') }`. Both `dist/index.html` and `dist/demo.html` present in pre-built dist. |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `demo.html` | `src/demo/main.tsx` | `<script type="module">` | VERIFIED | `demo.html` contains `/src/demo/main.tsx` script src |
| `DemoRoot.tsx` | `world-state.tsx` | `WorldProvider` import + render | VERIFIED | Line 5: `import { WorldProvider }`, rendered at root |
| `DecisionExplorer.tsx` | `lib/abac.ts` | `useMemo(evaluate(...))` | VERIFIED | Line 82 confirms useMemo keyed on subject/resource refs |
| `DecisionExplorer.tsx` | `store/world-state.tsx` | `useWorld` + `useWorldDispatch` | VERIFIED | Lines 74-75 read state; line 75 gets dispatch |
| `RoleSwitcherHeader.tsx` | `store/world-state.tsx` | `dispatch SET_ROLE` on change | VERIFIED | Line 18: `dispatch({ type: "SET_ROLE", role })` |
| `abac.ts` | `lib/model.ts` | type + TIERS import | VERIFIED | Line 8-18: `from "./model"` |
| `seed.ts` | `lib/model.ts` | type imports | VERIFIED | Line 6: `from "./model"` |
| `world-state.tsx` | `lib/model.ts` | type imports | VERIFIED | Lines 14-26: `from "../lib/model"` |
| `world-state.tsx` | `lib/seed.ts` | seed arrays as initial state | VERIFIED | Line 27: `import { AGREEMENTS, HUB_INDEX, RESOURCES, SUBJECTS } from "../lib/seed"` |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `DecisionExplorer.tsx` | `result` (Decision) | `useMemo(() => evaluate(...), [subject, resource])` | Yes — derived live from subject/resource refs from store | FLOWING |
| `DecisionExplorer.tsx` | `subjects`, `resources`, `events` | `useWorld()` → `world-state.tsx` → `seedWorld()` → `seed.ts` arrays | Yes — 30 subjects, 26 resources from seed | FLOWING |
| `world-state.tsx` | `WorldState` | `useReducer(reducer, undefined, seedWorld)` — lazy init from `seed.ts` | Yes — real seeded world with all 6 units | FLOWING |

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| 12 demo tests pass (6 engine + 6 store) | `npx vitest run src/demo/` | 12/12 passing | PASS |
| Per-domain tier independence (clearance.pass=true, tier.pass=false) | `abac.test.ts` line 26-29 | assertion verified green | PASS |
| Override-DENY with all base rules passing | `abac.test.ts` line 65-66 | assertion verified green | PASS |
| REQUEST_ATTRIBUTE zero-mutation (SoD crux) | `world-state.test.tsx` line 82-83 | `next.subjects === state.subjects` verified green | PASS |
| new-ref-drives-recompute (DENY→ALLOW) | `world-state.test.tsx` line 103-124 | APPROVE flips decision verified green | PASS |
| No router imports in demo tree | `grep -rl 'react-router\|routeTree' src/demo/` | empty output | PASS |
| TypeScript clean in demo tree | `tsc --noEmit -p tsconfig.app.json \| grep src/demo/` | no errors | PASS |
| Build produces both dist entries | `ls dist/demo.html dist/index.html` | both present | PASS |

---

### Probe Execution

No probe scripts declared or found for this phase. Step 7c: SKIPPED.

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| MODEL-01 | 01-02 | Unified 6-unit world model, UnitId-keyed | SATISFIED | `model.ts` exports `UnitId` (6 values), `UNITS`, unified schema. No `ENTITY_A` in functional code. `seed.ts` has all 6 units. |
| MODEL-02 | 01-03 | One shared in-memory world-state store (useReducer; no new library) | SATISFIED | `world-state.tsx`: single `useReducer`, split-context, no Redux/Zustand. All views consume via `useWorld()`/`useWorldDispatch()`. |
| MODEL-03 | 01-01, 01-04 | Persistent `[DEMO / MOCK]` banner on every screen; `[MOCK]` tag on simulated signals | SATISFIED | `DemoBanner.tsx`: sticky, non-dismissable, renders `[DEMO / MOCK]`. `MockTag` component renders `[MOCK]` in amber. Clearance pill accompanied by `MockTag` in `DecisionExplorer`. |
| ENGINE-01 | 01-02, 01-04 | Live ALLOW/DENY with per-rule explanation trace | SATISFIED | `evaluate()` returns `{ decision, rules }` with 4 named rules. `DecisionTrace` renders them. `useMemo` in `DecisionExplorer` computes live. |
| ENGINE-02 | 01-02, 01-04 | Per-domain tiers evaluate independently from clearance | SATISFIED | `TIERS[domain].indexOf` per-domain compare. Test locks `clearance.pass=true && tier.pass=false`. `captionFor()` distinguishes tier-only from clearance failure in prose. |
| ENGINE-03 | 01-02, 01-04 | Deny overrides (revoked/hold) force DENY even when base rules pass | SATISFIED | Override block in `evaluate()`. `DecisionTrace` renders `⛔ … (deny override)`. Test: `overridden.rules.every(r => r.pass) === true`. CA-3a (revoked) and CA-3b (hold) seeded. |
| ROLE-01 | 01-04 | Viewer can act as any of 8 operating roles; available actions change | SATISFIED | `RoleSwitcherHeader` dispatches `SET_ROLE` to store. `DecisionExplorer` re-renders action panel based on `ROLES[currentRole].ops`. 8 roles in model. |
| ROLE-02 | 01-02, 01-04 | Approver grants/revokes, Manager request-only, SO holds, others no authority | SATISFIED | `ACCESS_APPROVER.ops = [approve_attribute, revoke_attribute, ...]`. `MANAGER.ops = [request_attribute, view_team, AUTHORIZE_SUBJECT, WITHDRAW_AUTHORIZATION]` (no `approve_attribute`). `SECURITY_OFFICER.ops = [flag_risk, ...]`. SoD empty state for Admin/Sponsor/Subject/Personnel-Mgr. |

All 8 required IDs (MODEL-01, MODEL-02, MODEL-03, ENGINE-01, ENGINE-02, ENGINE-03, ROLE-01, ROLE-02) are SATISFIED.

No orphaned requirements: REQUIREMENTS.md traceability table maps MODEL-01 through ROLE-02 to Phase 1, and all 8 are claimed in the 4 plans.

---

### Anti-Patterns Found

No debt markers (TBD, FIXME, XXX) found in any demo source file. No stub patterns found — all files are substantive with real implementations. Grep for `return null`, `return {}`, `return []`, or `=> {}` in demo components: none found in user-visible code paths.

Note: CA-5 subject (`authorization.status: "WITHDRAWN"`) carries an inline comment `// CA-5: authorization-gap DENY is seed-only in Phase 1; rule wired in Phase 3 (OQ-B).` — this is an intentional and correctly-labelled deferred item, not an unresolved TODO.

---

### Human Verification Required

These items require a running browser and human eyes. The code mechanics are verified above; what follows tests rendered behavior.

#### 1. Banner non-dismissable on-screen

**Test:** Run `cd frontend && npm run dev`, open `http://localhost:15510/demo.html`, scroll down.
**Expected:** Amber `[DEMO / MOCK]` banner stays pinned at top; there is no way to close or dismiss it.
**Why human:** `DemoBanner.tsx` has `sticky top-0` and no close/state — confirmed by code. Visual pin-while-scrolling requires a browser.

#### 2. Tier-vs-clearance distinction on screen

**Test:** With the default CA-1 selection confirm `✓ ALLOW`. Then pick the CA-2 actor (Lee Park / Dev Jump Host) and confirm the Clearance row shows a green checkmark while the Domain tier row shows a red X.
**Expected:** Two distinct trace rows; one green (Clearance passes), one red (Domain tier fails).
**Why human:** `captionFor()` and `DecisionTrace` rows verified in code. Visual rendering of the color-coded rows requires human confirmation.

#### 3. Role-driven action set and live mutations

**Test:** Cycle through all 8 roles using the Operating Role selector. Confirm: Access Approver shows green "Approve: grant …" and amber "Revoke: remove …"; Manager shows only slate "Request … (cannot grant)"; Security Officer shows "Place security hold"; Admin, Sponsor, Subject, Personnel Mgr all show "This role holds no access-decision authority — separation of duties."
**Expected:** Exactly the action sets described, with labels matching the spec.
**Why human:** Code verified op-gating and verbatim copy. The human-verify checkpoint (01-04 Task 4) was previously approved by the user on screen, so this is a confirmation regression check.

---

### Gaps Summary

No gaps found. All 5 phase-level success criteria are verified in the codebase. All 8 requirement IDs are satisfied. No blocking anti-patterns.

The `human_needed` status reflects three items that require a running browser for final visual confirmation. The underlying code for all three is verified.

---

_Verified: 2026-05-21T19:52:01Z_
_Verifier: Claude (gsd-verifier)_
