# Phase 2: Federation Hub - Research

**Researched:** 2026-05-21
**Domain:** Frontend demo-island extension — in-memory federated hub discovery, typed interchange contract, mock HMAC credential verification, holder-gated ABAC release
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D2-01:** Fold federation exchange state into the single Phase-1 `useReducer` world-state (`demo/store/world-state.tsx`) as new state slices/actions: published pointers, the active-run transcript, and each unit's request inbox/outbox. Honors MODEL-02 (single source of truth). Rejected: lifting the spike `Network` class verbatim (creates a second source of truth).
- **D2-02:** Lift the spike `contract.ts` and `credential.ts` logic as PURE helpers into `demo/lib/` (e.g. `demo/lib/contract.ts`, `demo/lib/credential.ts`) — envelope builders, release check, `issueCredential`/`verifyCredential`, `ISSUER_KEYS`/`TRUSTED_ISSUERS`. Re-key to `UnitId`. Do NOT port the stateful `Network` class.
- **D2-03:** Single scrolling Federation surface organized top→bottom: Hub Discovery → Exchange Transcript → Credential Verify (side-by-side reject/accept) → Unit Console (one unit at a time via dropdown). Low density, no per-mechanism tabs.
- **D2-04:** Interim view switch = a simple local `useState` toggle in `DemoRoot` between Decision Explorer and Federation surface, placed in/near the existing header. NOT added to world-state, NOT the router, NOT `routeTree.gen.ts`. Throwaway — Phase 4's shell replaces it.
- **D2-05:** Four separate stage triggers (Publish / Discover / Request / Respond), each enabled only when it's that stage's turn (a 4-step state machine). Current stage highlighted; each trigger appends its typed `Envelope` to the transcript.
- **D2-06:** Transcript scope = per-exchange pane + persisted to consoles. The transcript pane shows only the 4 envelopes of the current run (clears on a new run). Each REQUEST_DETAIL/DETAIL_RESPONSE also lands permanently in the holder unit's inbox and the requester unit's outbox.
- **D2-07:** ABAC auto-decides release; the inbox surfaces the outcome + trace. On REQUEST_DETAIL, the holder unit's ABAC computes ALLOW/DENY live (reuse `demo/lib/abac.ts` `evaluate` + `releaseRequirementFor`); inbox shows decision with per-rule `DecisionTrace`. No free human override.
- **D2-08:** Record-level deny override still forces DENY at release even if the requester clears — mirror the spike rule (`spikes/lib/contract.ts:120-134`): a held/revoked target record cannot be released.
- **D2-09:** Fixed credential set, signed once at demo load. One valid `NATIONAL-CLEARANCE-AUTHORITY`-signed credential per requester unit, plus the seeded FW-5 `ROGUE-ISSUER` fixture. Real-HMAC-signed once at init via the lifted `issueCredential` (async; signing happens at app load).
- **D2-10:** Verify-before-trust in the live exchange AND a side-by-side comparison. Holder runs `verifyCredential` on the presented credential BEFORE any ABAC evaluation. The Credential Verify panel shows both outcomes side by side.

### Claude's Discretion

- **Async/crypto plumbing:** how the async `crypto.subtle` HMAC verify (`credential.ts`) is surfaced through the otherwise-synchronous reducer/UI (await in the handler, dispatch the result into state) — constrained only by D2-01 (single store) and the spike's real-HMAC approach.
- **Reducer action shape & state slicing** for the new federation slices — internal detail, constrained by MODEL-02 + D-05 (frozen schema).
- **Exact placement/styling of the interim toggle** within "in/near the existing header, throwaway."
- **Console internal layout** (how holdings / inbox / outbox are arranged within the single unit console).

### Deferred Ideas (OUT OF SCOPE)

- Scenario presets / curated subject·requester·holder triples for legibility — legibility polish proper is Phase 4.
- Real wire protocol / identity federation / key distribution — AUTH-MODEL open questions; demo proves the flow.
- Delete `frontend/src/spikes/` — cleanup is a later phase.
- Exchange events feeding audit reconstruction / point-in-time replay — Phase 3.

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FED-01 | Discovery without disclosure — viewer queries hub for a subject, sees pointer list (holding unit + domain) with "hub does NOT store" callout and zero sensitive detail | Hub logic is pure filter over `HUB_INDEX` (already seeded); `Spike002Hub.tsx` is the reference UI; no new data model work needed |
| FED-02 | Typed-contract exchange with interactive transcript — viewer steps publish → discover → request → response via typed `Envelope`; each message rendered; run ends in DETAIL_RESPONSE carrying record (ALLOW) or null (DENY) | Pure helper functions extracted from `contract.ts`; 4-step state machine in new reducer actions; `Spike005Contract.tsx` is the reference UI |
| FED-03 | Signed-credential verification — forged/untrusted-issuer credential is rejected and labelled `[MOCK]`; valid trusted-issuer credential passes — both paths shown side by side | `verifyCredential` lifted from `credential.ts`; async via `crypto.subtle`; FW-5 rogue fixture already seeded; `Spike006Trust.tsx` is the reference |
| FED-04 | Holder-gated detail release — discovery does not imply disclosure; REQUEST_DETAIL → DETAIL_RESPONSE gated by holder's ABAC; ALLOW returns record, DENY withholds with reason; per-unit consoles show incoming/outgoing requests | `releaseRequirementFor` + `evaluate` already in `demo/lib/abac.ts`; record-hold override from `contract.ts:120-134`; `DecisionTrace` reusable |

</phase_requirements>

---

## Summary

Phase 2 wires behaviour to the federation type substrate that Phase 1 declared but left inert. All the ingredients are already in the codebase — `model.ts` has the types, `seed.ts` has the fixture data, `abac.ts` has the release engine, and the spike components demonstrate every mechanism. The work is: (1) extract the stateful Network class from `spikes/lib/contract.ts` into stateless pure helper functions in `demo/lib/contract.ts`, (2) lift `credential.ts` verbatim (adjusting the `EntityId → UnitId` type), (3) add three new state slices and ~6 new action types to the world-state reducer, (4) implement the credential bootstrap (async signing at app init), (5) build the single scrolling FederationHub component, and (6) wire the interim view toggle in DemoRoot.

The highest-complexity concern is the async/sync boundary: `crypto.subtle` signing and verification are Promise-based, but the `useReducer` dispatch function is synchronous. The established pattern in the spikes (`Spike006Trust.tsx:24-48`) shows the correct plumbing: async event handlers `await` the crypto operation then call `setState`/`dispatch` with the resolved result. This same pattern must be applied at two points — initial credential bootstrapping (sign once at mount, store results in state) and per-exchange verification (await verify in the handler, dispatch the `VerifyResult` into the store).

The No-Second-Source-of-Truth invariant (MODEL-02 / D2-01) is the critical architectural constraint. The spike's `Network` class maintained its own `transcript`, `pointers`, and `records` Maps as mutable internal state. Phase 2 must NOT port that class. Instead, the reducer owns all state; the pure helper functions from `contract.ts` are called by the reducer (for synchronous work) or by async event handlers (for crypto), and the results are dispatched as immutable action payloads.

**Primary recommendation:** Model the new federation state as three named slices inside `WorldState` — `fedTranscript: Envelope[]`, `fedInbox: Record<UnitId, InboxEntry[]>`, `fedOutbox: Record<UnitId, OutboxEntry[]>` — and a 4-step current-run cursor. All federation views read exclusively from `useWorld()`; the FederationHub component dispatches actions and invokes async handlers that dispatch results.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Hub discovery (FED-01) | Demo island (browser, in-memory) | — | Pure filter over seeded `HUB_INDEX`; no backend |
| Typed exchange transcript (FED-02) | Demo island — reducer | Demo island — view | State machine lives in reducer; view reads transcript slice |
| Credential signing at init (FED-03, async) | Demo island — bootstrap/mount effect | Reducer (receives signed credentials) | `crypto.subtle` is browser API; must be outside reducer |
| Credential verification (FED-03, async) | Demo island — event handler | Reducer (receives VerifyResult) | Same async pattern as signing |
| Holder-gated release / ABAC eval (FED-04) | Demo island — reducer | Demo lib (`abac.ts`, `releaseRequirementFor`) | ABAC is pure/sync; called from inside reducer action |
| Per-unit consoles | Demo island — view | Reducer (inbox/outbox slices) | Read-only projection of store slices |
| Interim view toggle | DemoRoot local `useState` | — | Throwaway; must NOT enter world-state (D2-04) |

---

## Standard Stack

No new runtime dependencies are permitted (SPEC constraint). Every library below is already present in the project.

### Core (already present)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React 19 | 19.1.1 | UI rendering, `useReducer`, `useState` | Project stack |
| TypeScript ~5.9 | project baseline | Type safety for new state slices | Project stack |
| Web Crypto API | browser built-in | `crypto.subtle` HMAC-SHA256 sign/verify | Used verbatim in `credential.ts` |
| Tailwind CSS 3.4 | project baseline | Utility styling for new components | Project stack |

### No New Packages

`[VERIFIED: direct codebase inspection]` — the SPEC constraint "no new runtime dependency added" is an acceptance criterion (`02-SPEC.md` line 73). All federation logic is lifted from existing spike files in `frontend/src/spikes/lib/`.

---

## Package Legitimacy Audit

Not applicable — this phase installs zero new packages.

---

## Architecture Patterns

### System Architecture Diagram

```
DemoRoot (useState: activeView)
├── DemoBanner (sticky, permanent, [DEMO/MOCK])
├── RoleSwitcherHeader (reads currentRole from store)
├── [view toggle button — interim, throwaway]
└── <main>
    ├── DecisionExplorer (existing — unchanged)
    └── FederationHub (new — Federation surface)
        │
        ├── HubDiscoveryPanel
        │   └── reads: worldState.hubIndex (filter by subjectId)
        │
        ├── ExchangeTranscriptPanel
        │   ├── reads: worldState.fedTranscript, worldState.fedRunStage
        │   └── dispatches: FEDERATION_PUBLISH, FEDERATION_DISCOVER,
        │                   FEDERATION_REQUEST_DETAIL, FEDERATION_RESPOND
        │       (REQUEST_DETAIL + RESPOND are async-dispatched: await verify → dispatch)
        │
        ├── CredentialVerifyPanel
        │   ├── reads: worldState.fedCredentials (signed at mount)
        │   ├── dispatches: async handler → await verifyCredential → dispatch CREDENTIAL_VERIFIED
        │   └── shows: rogue reject | valid accept side by side
        │
        └── UnitConsolePanel
            ├── unit picker (local select → no store)
            ├── reads: worldState.hubIndex (filter by unit = holdings)
            ├── reads: worldState.fedInbox[selectedUnit]
            └── reads: worldState.fedOutbox[selectedUnit]
```

**Async boundary detail:**

```
Event handler (async fn)
  │
  ├── await issueCredential(payload, secret)    ← at init (useEffect once)
  │       └─→ dispatch({ type: 'CREDENTIALS_READY', credentials: {...} })
  │
  └── await verifyCredential(cred)              ← on REQUEST_DETAIL trigger
          └─→ dispatch({ type: 'FEDERATION_RESPOND', verifyResult, ... })
```

The reducer is never `async`. It receives fully resolved values via dispatch.

### Recommended Project Structure

```
frontend/src/demo/
├── lib/
│   ├── model.ts          (existing — types already declared)
│   ├── abac.ts           (existing — evaluate, releaseRequirementFor)
│   ├── seed.ts           (existing — HUB_INDEX, AGREEMENTS, fw5Subjects)
│   ├── contract.ts       (NEW — pure helpers lifted from spikes/lib/contract.ts)
│   └── credential.ts     (NEW — lifted from spikes/lib/credential.ts, UnitId re-key)
├── store/
│   └── world-state.tsx   (EXTEND — new federation state slices + actions)
└── components/
    ├── DecisionExplorer.tsx    (existing — unchanged)
    ├── DemoBanner.tsx          (existing — unchanged)
    ├── RoleSwitcherHeader.tsx  (existing — possibly extend with view toggle)
    ├── ui.tsx                  (existing — Pill, Card, DecisionTrace, MockTag)
    ├── FederationHub.tsx       (NEW — top-level scrolling Federation surface)
    ├── HubDiscoveryPanel.tsx   (NEW — FED-01)
    ├── ExchangeTranscriptPanel.tsx  (NEW — FED-02)
    ├── CredentialVerifyPanel.tsx    (NEW — FED-03)
    └── UnitConsolePanel.tsx         (NEW — per-unit holdings/inbox/outbox)
```

Note: `_component.tsx` naming convention (underscore prefix) applies to route files co-located with route directories. Demo components are not route files, so plain `PascalCase.tsx` names are correct here, consistent with existing demo components.

---

## Pattern 1: Lifting Pure Helpers from the Spike Network Class

**What:** The spike `Network` class (contract.ts:54-152) bundles three things: a transcript array, a pointers list, and a records Map, plus methods that mutate them. Phase 2 must NOT port the class. Instead, extract only the business logic of each method as a pure function.

**When to use:** Any time the spike has stateful logic the demo must replicate.

**Example — the pure extract pattern:**

```typescript
// demo/lib/contract.ts
// Source: spikes/lib/contract.ts — pure logic extracted, Network class NOT ported

import type { UnitId, Domain, Subject } from './model';
import { evaluate, releaseRequirementFor, type Decision, type Principal } from './abac';

// Re-export the Envelope/Pointer types (already declared in model.ts — import from there)
export type { Envelope, Pointer } from './model';

export interface DetailResult {
  granted: boolean;
  decision: Decision | null;
  record: Subject | null;
}

/** Pure: compute the DETAIL_RESPONSE result for a single holder's ABAC evaluation. */
export function computeDetailResponse(
  requester: Principal,
  subject: Subject | undefined,
  holder: UnitId,
): DetailResult {
  if (!subject) return { granted: false, decision: null, record: null };

  const base = evaluate(requester, releaseRequirementFor(subject, holder));
  // D2-08: record hold forces DENY even if requester clears (spike contract.ts:120-134)
  const blocked = subject.flags.securityHold || subject.flags.revoked;
  const decision: Decision = blocked
    ? {
        ...base,
        decision: 'DENY',
        overrides: [
          ...base.overrides,
          { name: 'Record hold', pass: false, detail: 'target record is held/revoked' },
        ],
      }
    : base;

  return {
    granted: decision.decision === 'ALLOW',
    decision,
    record: decision.decision === 'ALLOW' ? subject : null,
  };
}
```

**Key insight:** The spike's `Network.discover()` method does two things: filters `this.pointers` and pushes two envelopes to `this.transcript`. In the demo, filtering the pointers is a pure computation over `worldState.hubIndex`; pushing envelopes is a reducer action. These are separate operations.

---

## Pattern 2: Async Crypto Outside the Reducer

**What:** `crypto.subtle` operations return Promises. `useReducer` dispatch is synchronous. The pattern is: async handler `await`s the crypto op, then calls `dispatch` with the resolved value. The reducer receives fully computed values only.

**When to use:** `issueCredential` at app init; `verifyCredential` during an exchange step.

**Example — bootstrap signing at mount:**

```typescript
// Inside FederationHub.tsx or a dedicated useEffect in the component that mounts it

import { useEffect } from 'react';
import { issueCredential, ISSUER_KEYS } from '../lib/credential';
import { useWorldDispatch } from '../store/world-state';

function useFederationBootstrap() {
  const dispatch = useWorldDispatch();

  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      // Sign one credential per requesting unit at mount.
      // The rogue credential uses ROGUE-ISSUER key (will fail verifyCredential — untrusted issuer).
      const validCred = await issueCredential(
        { subject: 'subj-1', entity: 'MILITARY_1', clearance: 'SECRET',
          compartments: ['AURORA'], issuer: 'NATIONAL-CLEARANCE-AUTHORITY' },
        ISSUER_KEYS['NATIONAL-CLEARANCE-AUTHORITY'],
      );
      const rogueCred = await issueCredential(
        { subject: 'fw5-subj', entity: 'INDUSTRY', clearance: 'TOP_SECRET',
          compartments: ['STOCKWATCH'], issuer: 'ROGUE-ISSUER' },
        ISSUER_KEYS['ROGUE-ISSUER'],
      );
      if (!cancelled) {
        dispatch({ type: 'CREDENTIALS_READY', valid: validCred, rogue: rogueCred });
      }
    }
    bootstrap();
    return () => { cancelled = true; };
  }, []); // run once at mount
}
```

**Example — async verify in an event handler:**

```typescript
// Inside ExchangeTranscriptPanel.tsx — the RESPOND stage button handler

async function handleRespond() {
  if (!credential) return;
  const verifyResult = await verifyCredential(credential);
  // Now we have a synchronous value — dispatch it
  const requester = buildPrincipalFromCredentialOrNull(verifyResult, credential);
  const detailResult = computeDetailResponse(requester, subject, holderUnit);
  dispatch({
    type: 'FEDERATION_RESPOND',
    verifyResult,
    detailResult,
    requesterUnit,
    holderUnit,
    subjectId,
  });
}
```

**Critical rule:** Never `await` inside the reducer. The reducer must remain a pure synchronous function `(WorldState, Action) => WorldState`. [VERIFIED: React 19 docs — useReducer dispatch is synchronous by design]

---

## Pattern 3: Federation State Slices in WorldState

**What:** Three new named slices added to the existing `WorldState` interface. The `seq` counter advances for each exchange event (audit trail consistency).

**When to use:** Any component reading federation state uses `useWorld()` — no local state for federation data.

**Recommended state shape:**

```typescript
// Additions to demo/store/world-state.tsx

export interface InboxEntry {
  seq: number;
  from: UnitId;
  subjectId: string;
  requester: Principal;       // the requester's principal at time of request
  verifyResult: VerifyResult; // result of credential verification
  detailResult: DetailResult; // ALLOW/DENY + trace
}

export interface OutboxEntry {
  seq: number;
  to: UnitId;
  subjectId: string;
  granted: boolean;
  record: Subject | null;
}

// Add to WorldState:
export interface WorldState {
  // ... existing fields unchanged ...
  // --- Phase 2: Federation slices ---
  fedCredentials: { valid: Credential | null; rogue: Credential | null };
  fedRunStage: 'IDLE' | 'PUBLISHED' | 'DISCOVERED' | 'REQUESTED' | 'RESPONDED';
  fedTranscript: Envelope[];        // ephemeral — current run only (cleared on reset)
  fedInbox: Partial<Record<UnitId, InboxEntry[]>>;
  fedOutbox: Partial<Record<UnitId, OutboxEntry[]>>;
}
```

**New actions:**

```typescript
// Add to Action union:
| { type: 'CREDENTIALS_READY'; valid: Credential; rogue: Credential }
| { type: 'FEDERATION_PUBLISH'; from: UnitId; subjectId: string; domain: Domain }
| { type: 'FEDERATION_DISCOVER'; from: UnitId; subjectId: string }
| { type: 'FEDERATION_REQUEST_DETAIL'; from: UnitId; to: UnitId; subjectId: string; requester: Principal }
| { type: 'FEDERATION_RESPOND'; verifyResult: VerifyResult; detailResult: DetailResult; requesterUnit: UnitId; holderUnit: UnitId; subjectId: string }
| { type: 'FEDERATION_RESET' }  // clears transcript + resets stage to IDLE
```

**`fedTranscript` is cleared on `FEDERATION_RESET`** (starting a new run) — this satisfies D2-06: "transcript pane shows only the 4 envelopes of the current run." The inbox/outbox are append-only and never cleared (durable console history).

---

## Pattern 4: Four-Step State Machine

**What:** `fedRunStage` is an explicit cursor. Each trigger button is enabled only at the correct stage. The progression is linear: IDLE → PUBLISHED → DISCOVERED → REQUESTED → RESPONDED → (reset → IDLE).

**Stage transitions driven by action types:**

| Current Stage | Enabled Action | Next Stage | Envelope Appended |
|--------------|----------------|------------|-------------------|
| IDLE | FEDERATION_PUBLISH | PUBLISHED | PUBLISH |
| PUBLISHED | FEDERATION_DISCOVER | DISCOVERED | DISCOVER + DISCOVER_RESULT |
| DISCOVERED | FEDERATION_REQUEST_DETAIL | REQUESTED | REQUEST_DETAIL |
| REQUESTED | FEDERATION_RESPOND | RESPONDED | DETAIL_RESPONSE |
| RESPONDED | FEDERATION_RESET (manual) | IDLE | — |

DISCOVER appends two envelopes in one action (DISCOVER + DISCOVER_RESULT), matching the spike `Network.discover()` behaviour which pushes both in one call. This is fine because the reducer handles one action but produces two envelope entries.

---

## Pattern 5: Credential Verify Panel (Side-by-Side)

**What:** The Credential Verify panel (FED-03) shows both the rogue-reject path and the valid-accept path side by side without user-triggered async. Since credentials are signed at mount (D2-09) and stored in `fedCredentials`, the panel can run `verifyCredential` on each via button click (or auto-verify on mount after credentials are ready).

**Auto-verify approach (recommended for legibility):** When `fedCredentials` transitions from null to populated (i.e., `CREDENTIALS_READY` is dispatched), a `useEffect` in the panel fires two verify calls and dispatches the results. This ensures both outcomes are visible without a "click to verify" step.

```typescript
// In CredentialVerifyPanel or FederationHub

const { fedCredentials } = useWorld();
const dispatch = useWorldDispatch();

useEffect(() => {
  if (!fedCredentials.valid || !fedCredentials.rogue) return;
  let alive = true;
  Promise.all([
    verifyCredential(fedCredentials.valid),
    verifyCredential(fedCredentials.rogue),
  ]).then(([validResult, rogueResult]) => {
    if (alive) dispatch({ type: 'CREDENTIAL_VERIFY_RESULTS', validResult, rogueResult });
  });
  return () => { alive = false; };
}, [fedCredentials.valid, fedCredentials.rogue]);
```

This requires one additional action `CREDENTIAL_VERIFY_RESULTS` and two fields in WorldState (or derived local state — Claude's discretion).

---

## Pattern 6: Per-Unit Console Layout

**What:** A single `UnitConsolePanel` with a unit-picker `<select>` (local `useState` — not world-state; purely display selection). Shows three sub-sections for the selected unit.

**Holdings (published pointers):** `worldState.hubIndex.filter(p => p.holdingUnit === selectedUnit)` — a pure derivation with no new state.

**Inbox:** `worldState.fedInbox[selectedUnit] ?? []` — each entry shows subject name, requester unit, `verifyResult` (trusted/untrusted label), and `<DecisionTrace result={entry.detailResult.decision!} />` when a decision exists.

**Outbox:** `worldState.fedOutbox[selectedUnit] ?? []` — each entry shows subject name, holder unit, whether granted, and the released record pills (if ALLOW).

**The unit-picker dropdown does NOT dispatch to the store** (view-only selection, exactly like the spike's local `useState`-driven pickers). This is consistent with `abacTarget` in the Decision Explorer where target selection does dispatch (because the target affects the decision), but the unit console selection is purely a display choice.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| ABAC release evaluation | Custom clearance/compartment check | `demo/lib/abac.ts` `evaluate` + `releaseRequirementFor` | Already verified against 15+ fixture cases; verbatim lift invariant (D-01) |
| Hub pointer filtering | Ad-hoc array scan | `worldState.hubIndex.filter(p => p.subjectId === id)` | One-liner over already-seeded data |
| Credential HMAC signing | Any alternative crypto | `crypto.subtle` via `issueCredential` from `demo/lib/credential.ts` | Real HMAC-SHA256; deterministic; browser built-in |
| Envelope rendering | Custom format strings | Adapt the `envLine()` function from `Spike005Contract.tsx:22-35` | Already handles all 5 envelope kinds |
| Decision trace UI | Custom rule-row rendering | `<DecisionTrace result={...} />` from `demo/components/ui.tsx` | Already styled to the UI-SPEC visual contract |
| `[MOCK]` labels | Custom amber badge | `<MockTag />` from `demo/components/ui.tsx` | MODEL-03 compliance; consistent amber treatment |
| State containers | Redux, Zustand, second store | Extend `worldState.tsx` reducer + existing split-context | MODEL-02 single source of truth |

---

## Common Pitfalls

### Pitfall 1: Await in the Reducer
**What goes wrong:** Calling `verifyCredential(cred)` directly inside a reducer case — TypeScript may not catch this but the return value will be a Promise, not a `VerifyResult`. The reducer returns `{ ..., verifyResult: Promise<VerifyResult> }`, breaking all downstream reads.
**Why it happens:** `verifyCredential` looks like a normal function call; its async nature is not obvious at the call site.
**How to avoid:** The reducer is synchronous by contract. All async work happens in event handlers or `useEffect`, resolved before dispatch. Use `async function handler() { const result = await ...; dispatch({..., result}); }`.
**Warning signs:** TypeScript shows `VerifyResult | Promise<VerifyResult>` at a use site; runtime shows `[object Promise]` in the UI.

### Pitfall 2: Porting the Network Class (Violates D2-01 / MODEL-02)
**What goes wrong:** Instantiating `Network` inside a component or hook and reading `network.transcript` as the source of truth alongside `worldState`. Two sources of truth means a console opened for unit B cannot see transcripts initiated by a panel for unit A.
**Why it happens:** The spike's Network class works end-to-end and is tempting to reuse wholesale.
**How to avoid:** D2-02 is explicit: lift only the pure helpers (envelope construction, ABAC eval call), NOT the stateful class. The reducer is the router.
**Warning signs:** Any `new Network()` call outside of a test file is a red flag.

### Pitfall 3: Routing to `demo.html` via TanStack Router
**What goes wrong:** Adding the FederationHub to `routeTree.gen.ts` (by creating a file in `src/routes/`) — breaks demo-island isolation (D-02/SPEC constraint).
**Why it happens:** TanStack Router's Vite plugin auto-scans `src/routes/`; a file placed there will be picked up.
**How to avoid:** All new files live under `frontend/src/demo/`, never `src/routes/`. The acceptance criterion (`02-SPEC.md` line 73) explicitly checks this: "No file under `frontend/src/demo/` imports the app router or generated route tree."
**Warning signs:** Any `import ... from '@tanstack/react-router'` or `import ... from '../routeTree.gen'` in a demo file.

### Pitfall 4: Evaluating ABAC on Unverified Claims (D2-10)
**What goes wrong:** Passing the credential payload's `clearance`/`compartments` directly to `evaluate()` before `verifyCredential()` returns `valid: true`. A rogue credential with escalated claims would be treated as trusted.
**Why it happens:** ABAC evaluation and credential verification are separate steps; it is easy to call them in the wrong order.
**How to avoid:** In the `FEDERATION_RESPOND` action (which carries a resolved `verifyResult`), the reducer only builds the `Principal` from the credential if `verifyResult.valid === true`. If invalid, the decision is DENY with reason "credential not verified."
**Warning signs:** A rogue credential's claimed `TOP_SECRET` clearance causing an ALLOW decision.

### Pitfall 5: Hub Index Expansion Breaking Pointer Lookups
**What goes wrong:** `HUB_INDEX.push(...)` at the bottom of `seed.ts` adds entries after module evaluation. The pointers array is mutated in place, which is fine for the runtime, but test snapshots based on the initial `HUB_INDEX` value at import time could diverge.
**Why it happens:** The seed file uses `Array.push()` mutations on a `const` (the array reference is constant, not the contents). This is the established Phase 1 pattern (seed-head invariant R9).
**How to avoid:** This is known and acceptable per R9. Do not re-export `HUB_INDEX` as immutable; hub queries always read `worldState.hubIndex` which is initialized from the full post-mutation `HUB_INDEX` via `seedWorld()`. The Phase 2 HUB_INDEX entries for `fw2-subj`, `fw1-subj`, `subj-17`, `subj-20`, `subj-22` are already in place (seed.ts:804-815).
**Warning signs:** Hub discovery panel showing zero pointers for forward-actor subjects (fw2-subj, fw1-subj) that have seeded index entries.

### Pitfall 6: The FW-5 Rogue Credential Is Not the Same as the `fw5-subj` ROGUE-ISSUER Subject
**What goes wrong:** Confusing the rogue-issuer path (D2-09/D2-10 FED-03: a credential issued by `ROGUE-ISSUER` will fail `verifyCredential` because `ROGUE-ISSUER` is not in `TRUSTED_ISSUERS`) with a "rogue subject" scenario. The key rejection path is the issuer check in `verifyCredential`, not the `clearanceGrantedBy` field on the Subject model.
**Why it happens:** `fw5-subj` has `clearanceGrantedBy: "ROGUE-ISSUER"` as a field, which is seed decoration. The actual credential rejection logic lives in `credential.ts:75`: `if (!TRUSTED_ISSUERS.includes(issuer)) return { valid: false, ... }`.
**How to avoid:** The acceptance path for FED-03 requires issuing credentials via `issueCredential` at init (D2-09), not reading `clearanceGrantedBy` from the subject record. The rogue credential is the one signed with `ISSUER_KEYS['ROGUE-ISSUER']`; the valid credential is signed with `ISSUER_KEYS['NATIONAL-CLEARANCE-AUTHORITY']`.

### Pitfall 7: Clearing the Entire fedTranscript on Reset vs. Preserving Inbox/Outbox
**What goes wrong:** Dispatching `FEDERATION_RESET` clears `fedInbox` and `fedOutbox` along with `fedTranscript`. Consoles lose history.
**Why it happens:** Copy-paste from transcript clear logic into the inbox/outbox reset.
**How to avoid:** `FEDERATION_RESET` clears ONLY `fedTranscript` and resets `fedRunStage` to `IDLE`. Inbox and outbox are append-only; they survive resets (D2-06: "durable console history").

---

## Code Examples

### Hub Discovery — Pure filter over seeded index

```typescript
// Source: pattern from spikes/components/Spike002Hub.tsx:9
// In HubDiscoveryPanel.tsx

const { hubIndex } = useWorld();
const pointers = hubIndex.filter(p => p.subjectId === selectedSubjectId);

// "What the hub does NOT store" — callout is static markup (see Spike002Hub:50-64)
// Items: clearance level, domain tiers, need-to-know compartments, the decision itself
```

### Envelope Line Rendering

```typescript
// Source: spikes/components/Spike005Contract.tsx:22-35 — adapt for UnitId (not EntityId)
// In ExchangeTranscriptPanel.tsx

function envLine(e: Envelope): string {
  switch (e.kind) {
    case 'PUBLISH':
      return `PUBLISH  ${unitName(e.from)} → hub: holds ${e.subjectId} (${e.domain})`;
    case 'DISCOVER':
      return `DISCOVER ${unitName(e.from)} → hub: who holds ${e.subjectId}?`;
    case 'DISCOVER_RESULT':
      return `RESULT   hub → ${unitName(e.to)}: [${e.pointers.map(p => unitName(p.holder)).join(', ') || 'none'}]`;
    case 'REQUEST_DETAIL':
      return `REQUEST  ${unitName(e.from)} → ${unitName(e.to)}: detail for ${e.subjectId}`;
    case 'DETAIL_RESPONSE':
      return `RESPONSE → ${unitName(e.to)}: ${e.granted ? 'RELEASED' : 'WITHHELD'}`;
  }
}
```

### Release Gate — Record-Hold Override (D2-08)

```typescript
// Source: spikes/lib/contract.ts:119-134 — pure extracted form for demo/lib/contract.ts

export function computeDetailResponse(
  requester: Principal,
  subject: Subject | undefined,
  holder: UnitId,
): DetailResult {
  if (!subject) return { granted: false, decision: null, record: null };

  const base = evaluate(requester, releaseRequirementFor(subject, holder));
  const blocked = subject.flags.securityHold || subject.flags.revoked;
  const decision: Decision = blocked
    ? {
        ...base,
        decision: 'DENY',
        overrides: [
          ...base.overrides,
          { name: 'Record hold', pass: false, detail: 'target record is held/revoked' },
        ],
      }
    : base;

  return {
    granted: decision.decision === 'ALLOW',
    decision,
    record: decision.decision === 'ALLOW' ? subject : null,
  };
}
```

### Credential Verification Result Display

```typescript
// Source: spikes/components/Spike006Trust.tsx:129-142 — adapted for side-by-side

// Rogue panel (left):
<div className={`rounded-lg border p-4 border-red-200 bg-red-50`}>
  <div className="font-bold">✗ REJECTED</div>
  <div className="mt-1 text-sm text-slate-600">{rogueResult.reason}</div>
  <MockTag>[MOCK]</MockTag>
  <div className="mt-1 text-xs text-slate-500">
    The holder will not evaluate ABAC on claims it cannot verify.
  </div>
</div>

// Valid panel (right):
<div className={`rounded-lg border p-4 border-green-200 bg-green-50`}>
  <div className="font-bold">✓ TRUSTED</div>
  <div className="mt-1 text-sm text-slate-600">{validResult.reason}</div>
</div>
```

---

## Async/Sync Boundary — Resolved Design

This is the "Claude's Discretion" open question from CONTEXT.md. The research confirms the established pattern from the spikes.

### How the Spike Handled It

`Spike006Trust.tsx` shows the exact pattern (lines 24-48):
- `issue()` is `async function` — calls `await issueCredential(...)`, then `setCred(result)`.
- `verify()` is `async function` — calls `await verifyCredential(cred)`, then `setResult(result)`.
- Both are button `onClick` handlers — React batches the state update after the async resolves.

### Adaptation for the Reducer

Since Phase 2 uses `useReducer` (not local `useState`), the adaptation is:
- Replace `setCred(result)` with `dispatch({ type: 'CREDENTIALS_READY', ... result })`.
- Replace `setResult(result)` with `dispatch({ type: 'FEDERATION_RESPOND', verifyResult: result, ... })`.

The handler remains `async`; only the state-write changes from local state to the reducer dispatch.

### Demo Bootstrap (D2-09)

`issueCredential` is async (requires `crypto.subtle`). The seeded `fw5-subj` credential already exists as a `Subject` record but has no `Credential` object. The bootstrap creates one valid credential (NATIONAL-CLEARANCE-AUTHORITY signed) and one rogue credential (ROGUE-ISSUER signed) at mount.

**Placement:** A `useEffect` in `FederationHub` (or a dedicated `useFederationBootstrap` hook called from it) that runs once (`deps: []`). It dispatches `CREDENTIALS_READY` when both credentials are ready. The `fedCredentials` state starts as `{ valid: null, rogue: null }` — the CredentialVerifyPanel shows a loading state until populated.

**Why not in `seedWorld()`:** `seedWorld` is synchronous (it is passed as the lazy initializer to `useReducer`). `crypto.subtle` is async and cannot be called there. [VERIFIED: MDN Web Crypto API docs — all `crypto.subtle` operations are Promise-based]

### StrictMode Double-Invoke

React 19 `StrictMode` double-invokes effects in development. The bootstrap `useEffect` must guard against double-dispatch via a `cancelled` flag (standard cleanup pattern). The `CREDENTIALS_READY` action is idempotent — receiving it twice with the same credentials is harmless (reducer just overwrites the same values). [ASSUMED: React StrictMode behaviour with useEffect — well-known pattern]

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Spike: stateful `Network` class owns transcript/pointers/records | Demo: reducer owns all federation state; pure helpers only | Phase 2 decision (D2-02) | Single source of truth; consoles read the same data across panels |
| Spike: `EntityId` (3 entities) | Demo: `UnitId` (6 units) | D-10, Phase 1 | All lifted helpers must re-key entity → unit |
| Spike: credential type used spike `EntityId` | Demo: `AttrClaims.entity: UnitId` (already in `model.ts:283`) | D-10, Phase 1 | Types already updated in model.ts; credential.ts lift needs import path change only |
| Spike006: interactive sign/forge/verify (3 clicks) | Demo: fixed credential set, auto-sign at init, auto-verify to display (D2-09) | Phase 2 decision | Deterministic acceptance paths; both rogue-reject and valid-accept always visible |

---

## Open Questions

1. **Which subject and requester unit to pre-select for FED-02 demo transcript**
   - What we know: `subj-2` (Sam Okafor, MILITARY_2) has pointers in both `MILITARY_2` (PHYSICAL) and `MILITARY_1` (DATA) — a cross-unit request is richer to demonstrate.
   - What's unclear: Whether to default to a guaranteed-ALLOW path (MILITARY_2 requesting from itself) or a guaranteed-DENY path (no-agreement pair) or let the user pick freely.
   - Recommendation: Default to a guaranteed-ALLOW (demonstrable FED-04 accept path) as the initial selection; user can change via dropdowns. A guaranteed-DENY is possible by picking `MILITARY_1` requesting from `INTEL` (no agreement per `seed.ts:28`).

2. **Where exactly to place the interim view toggle button**
   - What we know: D2-04 says "in/near the existing header." `RoleSwitcherHeader` is a separate component. `DemoRoot` renders `DemoBanner + RoleSwitcherHeader + <main>`.
   - What's unclear: Whether the toggle is inside `RoleSwitcherHeader` (requires prop/callback down or moving toggle state up) or in `DemoRoot` (cleanest, toggle state stays local there).
   - Recommendation: Keep `activeView` state in `DemoRoot`; render a simple two-button toggle between `RoleSwitcherHeader` and `<main>` — no prop drilling, throwaway per D2-04.

3. **Whether auto-verify credentials on mount or on user click**
   - What we know: D2-09 says credentials are signed at init; D2-10 says the side-by-side panel shows both outcomes.
   - What's unclear: Whether auto-verify runs immediately after CREDENTIALS_READY or waits for a "Verify" button.
   - Recommendation: Auto-verify (useEffect on `fedCredentials`) so the panel is immediately populated — better for a demo where the viewer just scrolls to see both outcomes. A "Re-verify" button can be offered for interactivity.

---

## Environment Availability

Step 2.6: SKIPPED — this phase is purely demo-island code/UI work with no external service dependencies. No CLI tools, databases, or runtime services are required beyond the existing Node.js/npm toolchain (already verified in Phase 1).

---

## Validation Architecture

`nyquist_validation` is set to `false` in `.planning/config.json`. This section is omitted per config.

---

## Security Domain

This is a frontend-only demo island with no backend, no real crypto keys, no user data, no authentication, and no network transport. All values are seeded/mock. ASVS categories V2/V3/V4/V6 do not apply. V5 (Input Validation) is not applicable (no user-submitted data enters a backend). The `[DEMO / MOCK]` banner (MODEL-03) is the security control for this surface — it labels the entire system as simulated so no viewer can mistake mock outputs for real authorization decisions.

---

## Project Constraints (from CLAUDE.md)

| Directive | Applies to Phase 2? | Note |
|-----------|---------------------|------|
| No new frameworks — match existing stack | YES | No new dependencies; lift from spikes only |
| TanStack file-based router — `routeTree.gen.ts` must be regenerated, not hand-edited | YES (negatively) | Demo must NOT touch `routeTree.gen.ts` at all |
| Testing: Vitest (unit, jsdom) + Playwright (e2e) | PARTIAL | No nyquist_validation; existing tests must remain green |
| Security: do not regress role-aware UI guards | N/A | Demo island is isolated from app auth |
| Naming: route files `kebab-case.tsx`, component files `PascalCase.tsx` | YES | New demo components: `PascalCase.tsx` (not route files) |
| No barrel `index.ts` files | YES | Import specific files directly |
| Named exports for all hooks/components | YES | Exception: default export only for route `_component.tsx` files (not applicable here) |
| `@/` prefix for internal imports | DEMO ONLY | Demo files may use relative imports within `demo/` (no TanStack alias needed); use `../lib/` etc. |
| `mutateAsync` + try/catch for mutations | N/A | No React Query in demo island |
| Error display pattern: destructive div | N/A | Demo uses `Card` + inline error text |
| No toast notifications — errors rendered inline | YES | Consistent with demo's existing pattern |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | React 19 StrictMode double-invokes `useEffect` in development; the `cancelled` guard prevents double-dispatch | Async/Sync Boundary | If StrictMode behaviour differs, bootstrap could dispatch twice with slightly different credential objects (harmless since credentials are deterministic HMAC) |
| A2 | `crypto.subtle` is available in the jsdom test environment (Node 20+ ships `globalThis.crypto`) | Async/Sync Boundary | If unavailable in test, credential bootstrap tests will throw — isolate bootstrap from reducer unit tests |
| A3 | The interim view toggle is most cleanly placed as local `useState` in `DemoRoot` (not in `RoleSwitcherHeader`) | Open Questions #2 | If the toggle is placed inside `RoleSwitcherHeader`, a prop or callback must be threaded; functional either way |
| A4 | The 6 FW-4 hub index entries pushed in `seed.ts:804-815` cover the forward actors needed for FED-01 demos; no additional index entries are needed for Phase 2 | Pattern 5 / Pitfall 5 | If forward actors lack pointers for the demo exchange, the FED-02 scenario must use seed-head subjects (subj-1..4) only |

---

## Sources

### Primary (HIGH confidence)

- `frontend/src/spikes/lib/contract.ts` — full source read; `Network` class design, pure logic extracted
- `frontend/src/spikes/lib/credential.ts` — full source read; `issueCredential`/`verifyCredential`/`ISSUER_KEYS`/`TRUSTED_ISSUERS`
- `frontend/src/demo/lib/model.ts` — full source read; `Envelope`/`Pointer`/`AttrClaims`/`Credential`/`HubPointer` types confirmed at lines 246-291
- `frontend/src/demo/lib/abac.ts` — full source read; `evaluate`, `releaseRequirementFor`, `principalFromSubject`, `hasAgreement`
- `frontend/src/demo/lib/seed.ts` — read to line 816; `HUB_INDEX`, `AGREEMENTS`, `fw5Subjects` at lines 760-815
- `frontend/src/demo/store/world-state.tsx` — full source read; existing state shape, reducer pattern, split-context
- `frontend/src/demo/DemoRoot.tsx` — full source read; existing composition structure
- `frontend/src/demo/components/ui.tsx` — full source read; `DecisionTrace`, `MockTag`, `Card`, `Pill`
- `frontend/src/spikes/components/Spike002Hub.tsx` — full source read; reference UI for FED-01
- `frontend/src/spikes/components/Spike003Handshake.tsx` — full source read; holder-gated release reference
- `frontend/src/spikes/components/Spike005Contract.tsx` — full source read; typed transcript reference
- `frontend/src/spikes/components/Spike006Trust.tsx` — full source read; async credential flow reference
- `.planning/phases/02-federation-hub/02-CONTEXT.md` — locked decisions D2-01..D2-10
- `.planning/phases/02-federation-hub/02-SPEC.md` — locked requirements FED-01..FED-04, acceptance criteria
- `frontend/vite.config.ts` — confirmed `demo.html` as second build entry; no `routeTree` conflict

### Secondary (MEDIUM confidence)

- MDN Web Crypto API (training knowledge, August 2025 cutoff) — `crypto.subtle.sign`/`importKey` are Promise-based; all operations async. [ASSUMED: specific API surface; consistent with credential.ts implementation which is the ground truth for this phase]

### Tertiary (LOW confidence)

- None.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries; everything verified by direct codebase read
- Architecture: HIGH — existing patterns are clear; new slices follow established reducer conventions
- Pitfalls: HIGH — most pitfalls derived from direct code inspection of spike vs. demo divergences
- Async/crypto plumbing: HIGH — spike components provide working implementation; pattern is direct adaptation

**Research date:** 2026-05-21
**Valid until:** 2026-06-20 (stable domain — no external dependencies to drift)
