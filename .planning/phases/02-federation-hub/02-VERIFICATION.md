---
phase: 02-federation-hub
verified: 2026-05-22T13:55:00Z
status: human_needed
score: 13/13 must-haves verified
overrides_applied: 0
re_verification: false
human_verification:
  - test: "Switch to Federation Hub and select a seeded subject; confirm pointer list shows holding unit + domain only with NO clearance, tier, compartment, or decision rendered, and the 'What the hub does NOT store' callout is visible with struck-through items"
    expected: "One or more HubPointer rows appear (unit name pill + domain pill); no clearance/tier/compartment/decision text anywhere in the panel; four struck-through items visible"
    why_human: "Rendering of JSX nodes, visual struck-through text, and absence of sensitive fields in the actual DOM can't be confirmed by grep alone"
  - test: "Step through all four exchange stages (Publish → Discover → Request detail → Respond); confirm each stage button is active only on its turn, all four typed envelopes appear in the transcript, and the DETAIL_RESPONSE shows RELEASED or WITHHELD"
    expected: "Publish button active at IDLE; Discover active after Publish; Request detail active after Discover; Respond active after Request detail; four typed envelopes (PUBLISH/DISCOVER/RESULT/REQUEST/RESPONSE) in font-mono list; final envelope reads RELEASED or WITHHELD"
    why_human: "Interactive stage-gating and sequential button state changes require a running browser session; transcript rendering is visual"
  - test: "On the Credential Verification panel (auto-loads after hub mount): confirm rogue card shows '✗ REJECTED' in red with [MOCK] label and 'The holder will not evaluate ABAC on claims it cannot verify.' footnote; valid card shows '✓ TRUSTED' in green with no [MOCK] label"
    expected: "Two side-by-side cards: left red/rejected with [MOCK] tag, right green/trusted without [MOCK]; both appear without any click"
    why_human: "Side-by-side visual layout, color styling (red/green), and auto-display without user click are visual/behavioral; the [MOCK]-on-rogue-only constraint requires viewing the actual rendered DOM"
  - test: "After completing a RESPOND step with MILITARY_1 → MILITARY_2, subj-2 (guaranteed-ALLOW path): open Unit Console for MILITARY_2 and confirm inbox shows the request with 'verified' pill and a DecisionTrace with ALLOW verdict and record pills on the outbox entry; then run again with MILITARY_1 → INTEL (no agreement, guaranteed-DENY path) and confirm inbox shows WITHHELD / outbox shows WITHHELD"
    expected: "MILITARY_2 inbox: verified pill + ALLOW DecisionTrace + released record pills in outbox. INTEL inbox: DENY trace / no record; WITHHELD in outbox — demonstrating FED-04 holder-gated release"
    why_human: "Requires interactive multi-step user flow across two panels; ABAC decision trace readability and ALLOW/DENY visual differentiation need human judgment"
  - test: "Confirm the [DEMO / MOCK] banner is visible on both the Decision Explorer view and the Federation Hub view (switching between them via the toggle)"
    expected: "DemoBanner persists at the top in both views; the model-03 non-dismissable banner is never hidden when toggling views"
    why_human: "Visual persistence of a top-level banner across view switches requires a browser session"
---

# Phase 2: Federation Hub Verification Report

**Phase Goal:** The hub shows which entities hold authorization info about a subject without exposing any details; typed-contract message exchange is traceable end-to-end; signed credentials are verified before trust; release is gated by holder policy

**Verified:** 2026-05-22T13:55:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Hub query for a seeded subject shows HubPointer(s) (holdingUnit + domain) with NO sensitive fields | ✓ VERIFIED | `HubDiscoveryPanel` renders only `p.holdingUnit` and `p.domain` via Pill components; clearance/tiers/compartments/decision are never referenced in the component's render path (`HubDiscoveryPanel.tsx` lines 44–48) |
| 2 | "What the hub does NOT store" callout always visible with struck-through items | ✓ VERIFIED | Four `<li className="text-sm text-slate-500 line-through">` items in `HubDiscoveryPanel.tsx` lines 57–69; `Card` with title renders unconditionally alongside the pointer list |
| 3 | Viewer steps through all 4 exchange stages (Publish → Discover → Request detail → Respond); each stage's typed envelope appears | ✓ VERIFIED | `ExchangeTranscriptPanel.tsx`: four stage buttons with correct disabled guards (`fedRunStage !== 'IDLE'` etc.); `envLine()` covers all 5 envelope kinds (PUBLISH/DISCOVER/DISCOVER_RESULT/REQUEST_DETAIL/DETAIL_RESPONSE); `fedTranscript` rendered as `font-mono text-xs` list |
| 4 | "New run" clears only transcript (dispatches FEDERATION_RESET); fedInbox/fedOutbox preserved | ✓ VERIFIED | `ExchangeTranscriptPanel.tsx` line 197: dispatches `{ type: 'FEDERATION_RESET' }`. Reducer case (world-state.tsx line 378–381): `return { ...state, fedTranscript: [], fedRunStage: 'IDLE' }` — fedInbox and fedOutbox explicitly not touched; comment confirms invariant |
| 5 | ROGUE-ISSUER credential is rejected and labelled [MOCK]; valid NATIONAL-CLEARANCE-AUTHORITY credential passes — both paths visible side by side | ✓ VERIFIED | `CredentialVerifyPanel.tsx`: auto-verify useEffect fires on `fedCredentials` change; rogue card has `border-red-200 bg-red-50`, `✗ REJECTED`, `<MockTag />`, and ABAC footnote; valid card has `border-green-200 bg-green-50`, `✓ TRUSTED`, no MockTag; `ROGUE-ISSUER` excluded from `TRUSTED_ISSUERS` in `credential.ts` line 51 so `verifyCredential` returns `valid: false` |
| 6 | verifyCredential called BEFORE any ABAC evaluation; unverified claims never fed to ABAC | ✓ VERIFIED | `ExchangeTranscriptPanel.tsx` lines 48–62: `await verifyCredential(fedCredentials.valid)` first; `Principal` built from credential claims only if `verifyResult.valid === true`; otherwise UNCLASSIFIED fallback |
| 7 | Holder-gated release: DENY path withholds the record with a reason; ALLOW path releases the record | ✓ VERIFIED | `computeDetailResponse` in `contract.ts` lines 58–90 evaluates ABAC and returns `{ granted, decision, record }` where record is null on DENY; `FEDERATION_RESPOND` reducer case stores detailResult in InboxEntry and OutboxEntry; UnitConsolePanel renders RELEASED/WITHHELD with DecisionTrace |
| 8 | Each of the 6 units has a console showing holdings, inbox (with DecisionTrace), and outbox | ✓ VERIFIED | `UnitConsolePanel.tsx`: unit picker iterates `Object.keys(UNITS)` (6 units: MILITARY_1, MILITARY_2, INTEL, INFRA, INDUSTRY, HOME_GUARD); three Card sections; DecisionTrace rendered per inbox entry; RELEASED/WITHHELD rendered per outbox entry |
| 9 | Federation surface is reachable via interim view toggle alongside Decision Explorer; [DEMO/MOCK] banner remains visible in both views | ✓ VERIFIED | `DemoRoot.tsx`: `useState<ActiveView>('explorer')`; two-button toggle; `FederationHub` conditionally rendered in `<main>`; `DemoBanner` and `RoleSwitcherHeader` are siblings of `<main>` — never swapped out |
| 10 | No file under frontend/src/demo/ imports @tanstack/react-router or routeTree.gen | ✓ VERIFIED | `grep -r "tanstack/react-router\|routeTree.gen" frontend/src/demo/` returns zero matches (exit code 1 / no output) |
| 11 | No new runtime dependencies added | ✓ VERIFIED | `git diff HEAD -- frontend/package.json` shows no new dependency entries; `npm run build` exits 0 without installing new packages |
| 12 | Vite production build exits 0 with dist/demo.html present | ✓ VERIFIED | Build output: `dist/demo.html 0.50 kB`; `npm run build` exit code 0 |
| 13 | 44/44 Vitest unit tests pass with no regressions | ✓ VERIFIED | `npx vitest run` output: `Tests 44 passed (44)`, exit code 0 |

**Score:** 13/13 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `frontend/src/demo/lib/contract.ts` | Pure interchange helpers (computeDetailResponse, buildPublishEnvelope, buildDiscoverEnvelopes, DetailResult) | ✓ VERIFIED | All 4 exports present; no class definitions; imports from `./abac` and `./model` only; 91 lines of substantive pure functions |
| `frontend/src/demo/lib/credential.ts` | Async HMAC helpers (issueCredential, verifyCredential, ISSUER_KEYS, TRUSTED_ISSUERS, VerifyResult) | ✓ VERIFIED | All 5 exports present; AttrClaims/Credential imported from model.ts not redefined; ROGUE-ISSUER in ISSUER_KEYS, NOT in TRUSTED_ISSUERS |
| `frontend/src/demo/store/world-state.tsx` | Extended store with 6 federation fields, InboxEntry, OutboxEntry, 7 Action members, 7 reducer cases | ✓ VERIFIED | All 6 WorldState fields present and zero-initialized in seedWorld(); InboxEntry and OutboxEntry exported; 7 Action members and 7 reducer cases present |
| `frontend/src/demo/DemoRoot.tsx` | Interim view toggle with local useState; FederationHub conditional render | ✓ VERIFIED | `useState<ActiveView>('explorer')`; no dispatch calls; conditional render in `<main>`; comment `// Interim view toggle (D2-04) — throwaway` |
| `frontend/src/demo/components/FederationHub.tsx` | All 4 panels wired; async credential bootstrap; cancelled guard | ✓ VERIFIED | Imports and renders HubDiscoveryPanel, ExchangeTranscriptPanel, CredentialVerifyPanel, UnitConsolePanel; useEffect with `let cancelled = false`; dispatches CREDENTIALS_READY |
| `frontend/src/demo/components/HubDiscoveryPanel.tsx` | FED-01 pointer hub with "not stored" callout | ✓ VERIFIED | hubIndex read from useWorld(); pointer rows render only holdingUnit+domain; "What the hub does NOT store" card with 4 struck-through items; footnote present |
| `frontend/src/demo/components/ExchangeTranscriptPanel.tsx` | FED-02 4-step stage machine with verify-before-trust | ✓ VERIFIED | 4 stage buttons with correct disabled guards; handleRespond: verifyCredential before computeDetailResponse; FEDERATION_RESET on "New run"; envLine handles all 5 envelope kinds; font-mono transcript |
| `frontend/src/demo/components/CredentialVerifyPanel.tsx` | FED-03 side-by-side rogue/valid auto-verify | ✓ VERIFIED | useEffect on fedCredentials; dispatches CREDENTIAL_VERIFY_RESULTS; rogue=red+REJECTED+MockTag; valid=green+TRUSTED; MockTag once (rogue only) |
| `frontend/src/demo/components/UnitConsolePanel.tsx` | FED-04 per-unit holdings/inbox/outbox; read-only | ✓ VERIFIED | All 6 units selectable; 3 card sections; DecisionTrace per inbox entry; RELEASED/WITHHELD in outbox; zero dispatch calls (comment-only occurrence) |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `contract.ts` | `abac.ts` | `evaluate` + `releaseRequirementFor` imports | ✓ WIRED | Lines 10–15: `from "./abac"` import of both functions |
| `credential.ts` | `model.ts` | `AttrClaims` + `Credential` type imports | ✓ WIRED | Line 2: `import type { AttrClaims, Credential } from "./model"` |
| `world-state.tsx` | `contract.ts` | `buildDiscoverEnvelopes` used in FEDERATION_DISCOVER | ✓ WIRED | Line 30: import; lines 303–308: called in reducer case |
| `DemoRoot.tsx` | `FederationHub.tsx` | Conditional render on `activeView === 'federation'` | ✓ WIRED | Lines 10, 38: import and conditional JSX render |
| `FederationHub.tsx` | `credential.ts` | `issueCredential` + `ISSUER_KEYS` in bootstrap useEffect | ✓ WIRED | Line 4: import; lines 22–43: both called in Promise.all |
| `HubDiscoveryPanel.tsx` | `world-state.tsx` | `hubIndex` + `subjects` read via `useWorld()` | ✓ WIRED | Lines 5, 9: import and destructure |
| `ExchangeTranscriptPanel.tsx` | `credential.ts` | `verifyCredential` in async handleRespond | ✓ WIRED | Line 12: import; line 48: `await verifyCredential(fedCredentials.valid)` |
| `ExchangeTranscriptPanel.tsx` | `contract.ts` | `computeDetailResponse` in handleRespond after verify | ✓ WIRED | Line 11: import; line 64: called with verified principal |
| `CredentialVerifyPanel.tsx` | `world-state.tsx` | `fedCredentials` read; `CREDENTIAL_VERIFY_RESULTS` dispatched | ✓ WIRED | Lines 4–5: imports; lines 8, 20–23: read and dispatch |
| `UnitConsolePanel.tsx` | `world-state.tsx` | `fedInbox`, `fedOutbox`, `hubIndex` read | ✓ WIRED | Lines 5–8: import; line 12: all three destructured from useWorld() |
| `UnitConsolePanel.tsx` | `ui.tsx` | `DecisionTrace` and `MockTag` components | ✓ WIRED | Line 9: import; lines 81, 74–78: both rendered |
| `FederationHub.tsx` | `ExchangeTranscriptPanel.tsx` | Import and render | ✓ WIRED | Lines 7, 71: import and `<ExchangeTranscriptPanel />` |
| `FederationHub.tsx` | `CredentialVerifyPanel.tsx` | Import and render | ✓ WIRED | Lines 8, 72: import and `<CredentialVerifyPanel />` |
| `FederationHub.tsx` | `UnitConsolePanel.tsx` | Import and render | ✓ WIRED | Lines 9, 73: import and `<UnitConsolePanel />` |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `HubDiscoveryPanel` | `pointers` (from `hubIndex`) | `useWorld()` → `seedWorld()` → `HUB_INDEX` from `seed.ts` | Yes — `HUB_INDEX` is populated in `seed.ts` with seeded HubPointer entries | ✓ FLOWING |
| `ExchangeTranscriptPanel` | `fedTranscript` | `useWorld()` → reducer FEDERATION_PUBLISH/DISCOVER/etc. actions | Yes — appended by reducer cases from user dispatch | ✓ FLOWING |
| `CredentialVerifyPanel` | `fedVerifyResults` | `useWorld()` ← `CREDENTIAL_VERIFY_RESULTS` dispatch ← `verifyCredential()` HMAC result | Yes — real Web Crypto HMAC verification result | ✓ FLOWING |
| `UnitConsolePanel` | `inboxEntries`, `outboxEntries` | `fedInbox[selectedUnit]` / `fedOutbox[selectedUnit]` via reducer FEDERATION_RESPOND | Yes — populated by reducer from real ABAC evaluation in handleRespond | ✓ FLOWING |

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| TypeScript compiles entire frontend | `npx tsc --noEmit --project tsconfig.app.json` | exit 0, no output | ✓ PASS |
| Vite production build succeeds | `npm run build` | exit 0, `dist/demo.html 0.50 kB` present | ✓ PASS |
| 44 Vitest unit tests pass | `npx vitest run --exclude "**/*.e2e.*"` | `Tests 44 passed (44)`, exit 0 | ✓ PASS |
| No router imports in demo island | `grep -r "tanstack/react-router\|routeTree.gen" frontend/src/demo/` | zero matches | ✓ PASS |
| ROGUE-ISSUER rejected by verifyCredential | source: `TRUSTED_ISSUERS = ['NATIONAL-CLEARANCE-AUTHORITY']`; verifyCredential checks this first | returns `{ valid: false, reason: 'issuer "ROGUE-ISSUER" is not trusted' }` | ✓ PASS |

---

### Probe Execution

Step 7c: SKIPPED — no `scripts/*/tests/probe-*.sh` files declared for this phase; verification is build-gate + unit tests as specified in the phase instructions.

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| FED-01 | 02-03 | Discovery without disclosure (pointer hub) | ✓ SATISFIED | `HubDiscoveryPanel` renders holdingUnit+domain only; "What hub does NOT store" callout with 4 struck-through items; reads from world-state (not direct HUB_INDEX import) |
| FED-02 | 02-04 | Typed-contract exchange with interactive transcript | ✓ SATISFIED | `ExchangeTranscriptPanel`: 4-step stage machine; all 5 Envelope kinds formatted by `envLine()`; buttons disabled until their stage; New run dispatches FEDERATION_RESET |
| FED-03 | 02-04 | Signed-credential verification (reject forged, accept valid) | ✓ SATISFIED | `CredentialVerifyPanel`: auto-verify on mount; rogue card (red, [MOCK], REJECTED); valid card (green, TRUSTED); MockTag on rogue only; `credential.ts` logic correct |
| FED-04 | 02-05 | Holder-gated detail release | ✓ SATISFIED | `computeDetailResponse` gates on ABAC + record hold; `FEDERATION_RESPOND` reducer stores detailResult in InboxEntry/OutboxEntry; UnitConsolePanel shows DecisionTrace and RELEASED/WITHHELD |

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `contract.ts` | 1 | Comment text contains "class" in "Network class NOT ported" — grep-c false positive (not a class definition) | ℹ️ Info | Not a code smell; comment-only, no structural impact |

No TBD, FIXME, XXX, or HACK markers found in any phase-2 demo file. No stub components, empty return stubs, or unconnected state variables found.

---

### Human Verification Required

#### 1. FED-01: Hub pointer display — visual confirmation of disclosure-free rendering

**Test:** Open `http://localhost:15510/demo.html`, switch to "Federation Hub", select any seeded subject from the dropdown.
**Expected:** One or more rows appear showing unit name pill + domain pill; NO clearance level, tier value, compartment name, or ALLOW/DENY decision visible anywhere in the Hub index card; "What the hub does NOT store" card is visible with four struck-through items and the footnote.
**Why human:** Absence of sensitive fields in the rendered DOM, visual struck-through styling, and presence of a companion callout require visual inspection.

#### 2. FED-02: Exchange transcript interactive walkthrough

**Test:** Press Publish → Discover → Request detail → Respond in sequence; observe each stage button state and the transcript list.
**Expected:** Each button is solid-slate (active) only on its corresponding stage; inactive buttons are visibly dimmed; all four typed envelopes appear in the font-mono transcript ending with RELEASED or WITHHELD; after RESPONDED, "New run" appears and clears the transcript.
**Why human:** Sequential interactive button state changes, visual active/inactive distinction, and transcript accumulation must be observed in a running browser.

#### 3. FED-03: Side-by-side credential verification visual confirmation

**Test:** On the Credential Verification panel (appears below Exchange Transcript when hub loads), observe both cards without clicking anything.
**Expected:** Left card: red background, "✗ REJECTED", reason text, [MOCK] label, ABAC footnote. Right card: green background, "✓ TRUSTED", reason text, no [MOCK] label. Both appear automatically within a second of loading.
**Why human:** Color styling, auto-display (no click required), and [MOCK]-on-rogue-only constraint require visual DOM inspection.

#### 4. FED-04: Holder-gated release — ALLOW and DENY paths

**Test:** Step through Publish→Discover→Request detail→Respond with defaults (MILITARY_1 requester, MILITARY_2 holder, subj-2, DATA); open Unit Console for MILITARY_2 and inspect inbox DecisionTrace and outbox. Then reset and repeat with INTEL as holder to get a DENY path.
**Expected:** ALLOW path: MILITARY_2 inbox shows "verified" pill, ALLOW DecisionTrace, outbox shows RELEASED with clearance/compartment pills. DENY path: INTEL inbox shows WITHHELD/DENY trace, outbox shows WITHHELD — demonstrating that discovery (pointer visible) does not imply disclosure.
**Why human:** Multi-step interactive flow across two panels; ABAC trace prose legibility; ALLOW/DENY visual differentiation must be confirmed in a running demo.

#### 5. [DEMO / MOCK] banner persistence across view toggle

**Test:** Toggle between "Decision Explorer" and "Federation Hub" twice; confirm the banner at the top is visible in both views.
**Expected:** The DemoBanner component never disappears; the `[DEMO / MOCK]` text (or equivalent MODEL-03 banner content) remains at the top of the page in both views.
**Why human:** Visual persistence of a DOM element across React view switches requires browser-level inspection.

---

### Gaps Summary

No gaps found. All 13 must-haves are verified against the codebase. The 5 human verification items above are visual/interactive behaviors inherent to a React demo island — they cannot be confirmed by static analysis but there are no code-level blockers to them working correctly.

---

_Verified: 2026-05-22T13:55:00Z_
_Verifier: Claude (gsd-verifier)_
