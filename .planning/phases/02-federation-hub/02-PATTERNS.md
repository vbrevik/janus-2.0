# Phase 2: Federation Hub - Pattern Map

**Mapped:** 2026-05-21
**Files analyzed:** 9 new/modified files
**Analogs found:** 9 / 9

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `frontend/src/demo/lib/contract.ts` | utility (pure helpers) | transform | `frontend/src/spikes/lib/contract.ts` (logic extracted, class NOT ported) | exact (lift) |
| `frontend/src/demo/lib/credential.ts` | utility (async crypto) | transform | `frontend/src/spikes/lib/credential.ts` | exact (lift + UnitId re-key) |
| `frontend/src/demo/store/world-state.tsx` | store (extend) | event-driven | self (existing reducer) | extend |
| `frontend/src/demo/DemoRoot.tsx` | component (modify) | request-response | self (existing DemoRoot) | extend |
| `frontend/src/demo/components/FederationHub.tsx` | component (top-level surface) | event-driven | `frontend/src/demo/components/DecisionExplorer.tsx` | role-match |
| `frontend/src/demo/components/HubDiscoveryPanel.tsx` | component | request-response | `frontend/src/spikes/components/Spike002Hub.tsx` | exact |
| `frontend/src/demo/components/ExchangeTranscriptPanel.tsx` | component | event-driven (4-step state machine) | `frontend/src/spikes/components/Spike005Contract.tsx` | exact |
| `frontend/src/demo/components/CredentialVerifyPanel.tsx` | component | async (crypto.subtle) | `frontend/src/spikes/components/Spike006Trust.tsx` | exact |
| `frontend/src/demo/components/UnitConsolePanel.tsx` | component | request-response | `frontend/src/spikes/components/Spike003Handshake.tsx` + `frontend/src/demo/components/DecisionExplorer.tsx` | role-match |

---

## Pattern Assignments

### `frontend/src/demo/lib/contract.ts` (utility, transform)

**Analog:** `frontend/src/spikes/lib/contract.ts`

**Constraint (D2-02):** Lift only the pure logic. Do NOT port the `Network` class (lines 54–152 of the spike). The class holds internal `transcript`, `pointers`, and `records` state — these become reducer slices.

**Imports pattern** (spike lines 1–15, adapted):
```typescript
// demo/lib/contract.ts — pure helpers lifted from spikes/lib/contract.ts (Network class NOT ported)
import type { UnitId, Domain, Subject, Envelope, Pointer } from './model';
import {
  evaluate,
  releaseRequirementFor,
  type Decision,
  type Principal,
} from './abac';
```

**Core pattern — pure DetailResult compute** (extracted from spike `Network.requestDetail` lines 113–140):
```typescript
export interface DetailResult {
  granted: boolean;
  decision: Decision | null;
  record: Subject | null;
}

/** Pure: evaluate whether the holder releases the subject record to the requester. */
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

**Envelope builder helpers** (extracted from spike `Network.discover` lines 87–98 and `Network.publishAll` lines 71–83):
```typescript
/** Pure: build a PUBLISH envelope for a given hub pointer. */
export function buildPublishEnvelope(
  from: UnitId, subjectId: string, domain: Domain,
): Envelope {
  return { kind: 'PUBLISH', from, subjectId, domain };
}

/** Pure: filter hub index and return the DISCOVER + DISCOVER_RESULT pair. */
export function buildDiscoverEnvelopes(
  from: UnitId,
  subjectId: string,
  hubIndex: { subjectId: string; holdingUnit: UnitId; domain: Domain }[],
): [Envelope, Envelope] {
  const pointers: Pointer[] = hubIndex
    .filter((p) => p.subjectId === subjectId)
    .map((p) => ({ holder: p.holdingUnit, domain: p.domain }));
  return [
    { kind: 'DISCOVER', from, subjectId },
    { kind: 'DISCOVER_RESULT', to: from, subjectId, pointers },
  ];
}
```

**Key re-key difference:** Spike uses `EntityId` / `holdingEntity`; demo uses `UnitId` / `holdingUnit` (per model.ts lines 133–136 and D-10).

---

### `frontend/src/demo/lib/credential.ts` (utility, async crypto)

**Analog:** `frontend/src/spikes/lib/credential.ts`

**Lift verbatim except:** change `EntityId` → `UnitId` in `AttrClaims.entity`. All other logic is identical.

**Imports pattern** (spike lines 1–3, adapted):
```typescript
// demo/lib/credential.ts — lifted verbatim from spikes/lib/credential.ts (UnitId re-key only)
import type { UnitId, Clearance, Compartment, AttrClaims, Credential } from './model';
// Note: AttrClaims and Credential are already declared in model.ts:280-291; re-export or import from there.
```

**Core async pattern** (spike lines 53–90 — copy verbatim):
```typescript
// canonical(), toBase64(), importKey(), sign() — copy verbatim from spike lines 19-51

export async function issueCredential(
  payload: AttrClaims,
  issuerSecret: string,
): Promise<Credential> {
  return { payload, sig: await sign(payload, issuerSecret) };
}

export const ISSUER_KEYS: Record<string, string> = {
  'NATIONAL-CLEARANCE-AUTHORITY': 'nca-demo-secret-key',
  'ROGUE-ISSUER': 'rogue-secret',
};
export const TRUSTED_ISSUERS = ['NATIONAL-CLEARANCE-AUTHORITY'];

export interface VerifyResult {
  valid: boolean;
  reason: string;
}

export async function verifyCredential(cred: Credential): Promise<VerifyResult> {
  const issuer = cred.payload.issuer;
  if (!TRUSTED_ISSUERS.includes(issuer)) {
    return { valid: false, reason: `issuer "${issuer}" is not trusted` };
  }
  const key = ISSUER_KEYS[issuer];
  if (!key) return { valid: false, reason: `no key on file for issuer "${issuer}"` };
  const expected = await sign(cred.payload, key);
  if (expected !== cred.sig) {
    return { valid: false, reason: 'signature mismatch — payload tampered or wrong key' };
  }
  return { valid: true, reason: `verified signature from ${issuer}` };
}
```

**Only change from spike:** `AttrClaims.entity` type is `UnitId` (already the case in `model.ts:283`) instead of spike's `EntityId`.

---

### `frontend/src/demo/store/world-state.tsx` (store, extend)

**Analog:** Self — extend the existing file (`frontend/src/demo/store/world-state.tsx`)

**Existing state shape** (lines 35–45) — add new federation slices alongside existing fields:
```typescript
// Existing WorldState (lines 35-45) — DO NOT change existing fields:
export interface WorldState {
  units: typeof UNITS;
  subjects: Subject[];
  resources: Resource[];
  agreements: [UnitId, UnitId][];
  events: AttrEvent[];
  hubIndex: HubPointer[];
  currentRole: RoleId;
  abacTarget: AbacTarget;
  seq: number;
  // --- Phase 2: Federation slices (add below) ---
  fedCredentials: { valid: Credential | null; rogue: Credential | null };
  fedRunStage: 'IDLE' | 'PUBLISHED' | 'DISCOVERED' | 'REQUESTED' | 'RESPONDED';
  fedTranscript: Envelope[];        // ephemeral — current run only (cleared on FEDERATION_RESET)
  fedInbox: Partial<Record<UnitId, InboxEntry[]>>;
  fedOutbox: Partial<Record<UnitId, OutboxEntry[]>>;
  fedVerifyResults: { valid: VerifyResult | null; rogue: VerifyResult | null };
}
```

**New entry types** (add above WorldState interface):
```typescript
import type { Credential, VerifyResult } from '../lib/credential';
import type { DetailResult } from '../lib/contract';
import type { Principal } from '../lib/abac';
import type { Envelope } from '../lib/model';

export interface InboxEntry {
  seq: number;
  from: UnitId;
  subjectId: string;
  requester: Principal;
  verifyResult: VerifyResult;
  detailResult: DetailResult;
}

export interface OutboxEntry {
  seq: number;
  to: UnitId;
  subjectId: string;
  granted: boolean;
  record: Subject | null;
}
```

**New Action union members** (add to existing `Action` type at line 69):
```typescript
export type Action =
  // ... existing actions unchanged (lines 70-81) ...
  | { type: 'CREDENTIALS_READY'; valid: Credential; rogue: Credential }
  | { type: 'CREDENTIAL_VERIFY_RESULTS'; validResult: VerifyResult; rogueResult: VerifyResult }
  | { type: 'FEDERATION_PUBLISH'; from: UnitId; subjectId: string; domain: Domain }
  | { type: 'FEDERATION_DISCOVER'; from: UnitId; subjectId: string }
  | { type: 'FEDERATION_REQUEST_DETAIL'; from: UnitId; to: UnitId; subjectId: string; requester: Principal }
  | { type: 'FEDERATION_RESPOND'; verifyResult: VerifyResult; detailResult: DetailResult; requesterUnit: UnitId; holderUnit: UnitId; subjectId: string; requester: Principal }
  | { type: 'FEDERATION_RESET' };
```

**New reducer cases** (add to existing `reducer` switch at line 103 — copy the existing case shape):
```typescript
// Pattern: each existing case returns { ...state, changedField, seq: state.seq + 1 }
// for seq-advancing mutations, or { ...state, changedField } for view-selection only.

case 'CREDENTIALS_READY':
  // View-selection equivalent: no seq advance (credentials are bootstrap-only, not mutations)
  return { ...state, fedCredentials: { valid: action.valid, rogue: action.rogue } };

case 'CREDENTIAL_VERIFY_RESULTS':
  return { ...state, fedVerifyResults: { valid: action.validResult, rogue: action.rogueResult } };

case 'FEDERATION_PUBLISH': {
  const envelope: Envelope = {
    kind: 'PUBLISH', from: action.from, subjectId: action.subjectId, domain: action.domain,
  };
  return {
    ...state,
    fedTranscript: [...state.fedTranscript, envelope],
    fedRunStage: 'PUBLISHED',
    seq: state.seq + 1,
  };
}

case 'FEDERATION_DISCOVER': {
  const [discoverEnv, resultEnv] = buildDiscoverEnvelopes(action.from, action.subjectId, state.hubIndex);
  return {
    ...state,
    fedTranscript: [...state.fedTranscript, discoverEnv, resultEnv],
    fedRunStage: 'DISCOVERED',
    seq: state.seq + 1,
  };
}

case 'FEDERATION_RESPOND': {
  const { verifyResult, detailResult, requesterUnit, holderUnit, subjectId } = action;
  const responseEnv: Envelope = {
    kind: 'DETAIL_RESPONSE',
    to: requesterUnit,
    subjectId,
    granted: detailResult.granted,
    decision: detailResult.decision,
    record: detailResult.record,
  };
  const inboxEntry: InboxEntry = {
    seq: state.seq + 1,
    from: requesterUnit,
    subjectId,
    requester: action.requester,  // Principal carried in action (see Action union FEDERATION_RESPOND)
    verifyResult,
    detailResult,
  };
  const outboxEntry: OutboxEntry = {
    seq: state.seq + 1,
    to: holderUnit,
    subjectId,
    granted: detailResult.granted,
    record: detailResult.record,
  };
  return {
    ...state,
    fedTranscript: [...state.fedTranscript, responseEnv],
    fedRunStage: 'RESPONDED',
    fedInbox: {
      ...state.fedInbox,
      [holderUnit]: [...(state.fedInbox[holderUnit] ?? []), inboxEntry],
    },
    fedOutbox: {
      ...state.fedOutbox,
      [requesterUnit]: [...(state.fedOutbox[requesterUnit] ?? []), outboxEntry],
    },
    seq: state.seq + 1,
  };
}

case 'FEDERATION_RESET':
  // D2-06/Pitfall 7: ONLY clears transcript + resets stage. Inbox/outbox are append-only, preserved.
  return { ...state, fedTranscript: [], fedRunStage: 'IDLE' };
```

**seedWorld extension** (add federation initial values to the return at line 51):
```typescript
// Add to the seedWorld() return object (line 51):
fedCredentials: { valid: null, rogue: null },
fedRunStage: 'IDLE',
fedTranscript: [],
fedInbox: {},
fedOutbox: {},
fedVerifyResults: { valid: null, rogue: null },
```

**Import pattern for reducer helpers** (import at top of file):
```typescript
import { buildDiscoverEnvelopes } from '../lib/contract';
import type { Credential, VerifyResult } from '../lib/credential';
import type { DetailResult } from '../lib/contract';
import type { Principal } from '../lib/abac';
import type { Envelope } from '../lib/model';
```

---

### `frontend/src/demo/DemoRoot.tsx` (component, modify)

**Analog:** Self — extend the existing file (`frontend/src/demo/DemoRoot.tsx`)

**Existing composition** (lines 1–22) — add `useState` toggle and conditional render:
```typescript
// DemoRoot — existing structure (lines 10-22):
export function DemoRoot() {
  return (
    <WorldProvider>
      <div className="min-h-screen bg-slate-50 text-slate-800">
        <DemoBanner />
        <RoleSwitcherHeader />
        <main className="mx-auto max-w-5xl px-6 py-6">
          <DecisionExplorer />
        </main>
      </div>
    </WorldProvider>
  );
}
```

**D2-04 pattern — add local `useState`, insert toggle row between header and main:**
```typescript
import { useState } from 'react';
import { FederationHub } from './components/FederationHub';

type ActiveView = 'explorer' | 'federation';

export function DemoRoot() {
  const [activeView, setActiveView] = useState<ActiveView>('explorer');

  return (
    <WorldProvider>
      <div className="min-h-screen bg-slate-50 text-slate-800">
        <DemoBanner />
        <RoleSwitcherHeader />
        {/* Interim view toggle (D2-04) — throwaway; Phase 4 replaces this */}
        <div className="mx-auto max-w-5xl px-6 py-2 flex gap-2">
          <button
            onClick={() => setActiveView('explorer')}
            className={`rounded px-3 py-1.5 text-sm ${activeView === 'explorer' ? 'bg-slate-800 text-white' : 'border border-slate-300 text-slate-600'}`}
          >
            Decision Explorer
          </button>
          <button
            onClick={() => setActiveView('federation')}
            className={`rounded px-3 py-1.5 text-sm ${activeView === 'federation' ? 'bg-slate-800 text-white' : 'border border-slate-300 text-slate-600'}`}
          >
            Federation Hub
          </button>
        </div>
        <main className="mx-auto max-w-5xl px-6 py-6">
          {activeView === 'explorer' ? <DecisionExplorer /> : <FederationHub />}
        </main>
      </div>
    </WorldProvider>
  );
}
```

**Key constraint:** `activeView` is local `useState` only — NOT dispatched to world-state (D2-04). The toggle is placed between `RoleSwitcherHeader` and `<main>` so the banner/header are never omitted (R7).

---

### `frontend/src/demo/components/FederationHub.tsx` (component, event-driven)

**Analog:** `frontend/src/demo/components/DecisionExplorer.tsx` (top-level composition reading from store)

**Imports pattern** (DecisionExplorer lines 6–21 as template):
```typescript
// FederationHub.tsx — top-level federation surface (D2-03)
import { useEffect } from 'react';
import { issueCredential, verifyCredential, ISSUER_KEYS } from '../lib/credential';
import { useWorld, useWorldDispatch } from '../store/world-state';
import { HubDiscoveryPanel } from './HubDiscoveryPanel';
import { ExchangeTranscriptPanel } from './ExchangeTranscriptPanel';
import { CredentialVerifyPanel } from './CredentialVerifyPanel';
import { UnitConsolePanel } from './UnitConsolePanel';
```

**Async bootstrap pattern** (adapted from Spike006Trust.tsx lines 24–48; replaces local `setState` with `dispatch`):
```typescript
export function FederationHub() {
  const dispatch = useWorldDispatch();
  const { fedCredentials } = useWorld();

  // D2-09: sign credentials once at mount via async useEffect (crypto.subtle is Promise-based)
  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      const [valid, rogue] = await Promise.all([
        issueCredential(
          { subject: 'subj-1', entity: 'MILITARY_1', clearance: 'SECRET',
            compartments: ['AURORA'], issuer: 'NATIONAL-CLEARANCE-AUTHORITY' },
          ISSUER_KEYS['NATIONAL-CLEARANCE-AUTHORITY'],
        ),
        issueCredential(
          { subject: 'fw5-subj', entity: 'INDUSTRY', clearance: 'TOP_SECRET',
            compartments: ['STOCKWATCH'], issuer: 'ROGUE-ISSUER' },
          ISSUER_KEYS['ROGUE-ISSUER'],
        ),
      ]);
      if (!cancelled) dispatch({ type: 'CREDENTIALS_READY', valid, rogue });
    }
    bootstrap().catch(() => {
      if (!cancelled) {
        // crypto.subtle unavailable — render inline error (UI-SPEC copywriting contract)
      }
    });
    return () => { cancelled = true; };  // StrictMode double-invoke guard
  }, []);  // run once at mount (dep array intentionally empty — bootstrap is idempotent)

  // D2-03: single scrolling surface, four panels stacked top→bottom
  return (
    <div className="space-y-6">
      <HubDiscoveryPanel />
      <ExchangeTranscriptPanel />
      <CredentialVerifyPanel />
      <UnitConsolePanel />
    </div>
  );
}
```

**Critical rule:** The `useEffect` callback uses the `cancelled` flag (standard React cleanup) to prevent double-dispatch in StrictMode.

---

### `frontend/src/demo/components/HubDiscoveryPanel.tsx` (component, request-response)

**Analog:** `frontend/src/spikes/components/Spike002Hub.tsx` (lines 1–66)

**Imports pattern** (Spike002Hub lines 1–4, adapted to demo paths):
```typescript
// HubDiscoveryPanel.tsx — FED-01 discovery without disclosure
import { useState } from 'react';
import { unitName, type UnitId } from '../lib/model';
import { useWorld } from '../store/world-state';
import { Card, Field, Pill, Select } from './ui';
```

**Core pattern** (Spike002Hub lines 7–65, adapted for UnitId):
```typescript
export function HubDiscoveryPanel() {
  const { subjects, hubIndex } = useWorld();
  const [subjId, setSubjId] = useState(subjects[0]?.id ?? '');

  const pointers = hubIndex.filter((p) => p.subjectId === subjId);

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        {/* UI-SPEC locked copy */}
      </p>
      <Card>
        <Field label="Look up a subject in the hub">
          <Select
            value={subjId}
            onChange={setSubjId}
            options={subjects.map((s) => ({ value: s.id, label: s.name }))}
          />
        </Field>
      </Card>
      <div className="grid grid-cols-2 gap-4">
        <Card title={`Hub index`}>
          {pointers.length === 0 ? (
            <p className="text-sm text-slate-400">No unit has published a pointer for this subject.</p>
          ) : (
            <ul className="space-y-2">
              {pointers.map((p, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  {/* Spike002Hub line 41: Pill tone="blue" for holding unit, tone="amber" for domain */}
                  <Pill tone="blue">{unitName(p.holdingUnit)}</Pill>
                  <span className="text-slate-400">holds</span>
                  <Pill tone="amber">{p.domain}</Pill>
                  <span className="text-slate-400">authz info</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="What the hub does NOT store">
          {/* Spike002Hub lines 51-63: struck-through list pattern */}
          <ul className="space-y-1.5 text-sm text-slate-500">
            <li className="line-through">clearance level</li>
            <li className="line-through">domain tiers</li>
            <li className="line-through">need-to-know compartments</li>
            <li className="line-through">the access decision itself</li>
          </ul>
          <p className="mt-3 rounded bg-slate-50 p-2 text-xs text-slate-500">
            {/* UI-SPEC locked footnote copy */}
          </p>
        </Card>
      </div>
    </div>
  );
}
```

**Key difference from spike:** Reads `hubIndex` from `useWorld()` (store) instead of direct `HUB_INDEX` import. Uses `p.holdingUnit` not `p.holdingEntity`. Uses `unitName()` not `entityName()`.

---

### `frontend/src/demo/components/ExchangeTranscriptPanel.tsx` (component, event-driven)

**Analog:** `frontend/src/spikes/components/Spike005Contract.tsx` (lines 1–177)

**Imports pattern** (Spike005Contract lines 1–12, adapted):
```typescript
// ExchangeTranscriptPanel.tsx — FED-02 four-step typed contract
import { useState } from 'react';
import { unitName, type UnitId, type Envelope } from '../lib/model';
import { type Principal } from '../lib/abac';
import { buildDiscoverEnvelopes, computeDetailResponse } from '../lib/contract';
import { verifyCredential } from '../lib/credential';
import { useWorld, useWorldDispatch } from '../store/world-state';
import { Card, DecisionTrace, Field, Pill, Select } from './ui';
```

**`envLine` helper** (Spike005Contract lines 22–35, adapted for `unitName`):
```typescript
function envLine(e: Envelope): string {
  switch (e.kind) {
    case 'PUBLISH':
      return `PUBLISH  ${unitName(e.from)} → hub: holds ${e.subjectId} (${e.domain})`;
    case 'DISCOVER':
      return `DISCOVER ${unitName(e.from)} → hub: who holds ${e.subjectId}?`;
    case 'DISCOVER_RESULT':
      return `RESULT   hub → ${unitName(e.to)}: [${e.pointers.map((p) => unitName(p.holder)).join(', ') || 'none'}]`;
    case 'REQUEST_DETAIL':
      return `REQUEST  ${unitName(e.from)} → ${unitName(e.to)}: detail for ${e.subjectId}`;
    case 'DETAIL_RESPONSE':
      return `RESPONSE → ${unitName(e.to)}: ${e.granted ? 'RELEASED' : 'WITHHELD'}`;
  }
}
```

**4-step state machine pattern** (D2-05 — each button enabled only on its turn):
```typescript
// Inside ExchangeTranscriptPanel — stage-gate trigger buttons
// Pattern: disabled={stage !== 'IDLE'} / disabled={stage !== 'PUBLISHED'} etc.
// Current-stage button: bg-slate-800 text-white; others: disabled:opacity-40

const stageOrder: Record<typeof stage, number> = { IDLE: 0, PUBLISHED: 1, DISCOVERED: 2, REQUESTED: 3, RESPONDED: 4 };

<button
  disabled={fedRunStage !== 'IDLE'}
  onClick={() => dispatch({ type: 'FEDERATION_PUBLISH', from: requesterUnit, subjectId, domain })}
  className={`rounded px-3 py-1.5 text-sm ${fedRunStage === 'IDLE' ? 'bg-slate-800 text-white' : 'border border-slate-300 text-slate-400 disabled:opacity-40'}`}
>
  Publish
</button>
```

**Async RESPOND handler** (adapted from Spike006Trust.tsx `verify()` function lines 46–48; the critical async/sync boundary):
```typescript
async function handleRespond() {
  if (!fedCredentials.valid) return;
  // D2-10: verify BEFORE any ABAC evaluation
  const verifyResult = await verifyCredential(fedCredentials.valid);
  const subject = subjects.find((s) => s.id === subjectId);
  const requester: Principal = verifyResult.valid
    ? { entity: fedCredentials.valid.payload.entity,
        clearance: fedCredentials.valid.payload.clearance,
        compartments: fedCredentials.valid.payload.compartments,
        domainAuth: {} }
    : { entity: requesterUnit, clearance: 'UNCLASSIFIED', compartments: [], domainAuth: {} };
  const detailResult = computeDetailResponse(requester, subject, holderUnit);
  dispatch({
    type: 'FEDERATION_RESPOND',
    verifyResult,
    detailResult,
    requesterUnit,
    holderUnit,
    subjectId,
    requester: principal,  // verified-or-minimal Principal (D2-10); stored in InboxEntry by reducer
  });
}
```

**Transcript render** (Spike005Contract lines 144–148):
```typescript
<Card title="Transcript (typed envelopes)">
  {fedTranscript.length === 0 ? (
    <p className="text-sm text-slate-400">No exchange yet. Press <strong>Publish</strong> to start a run.</p>
  ) : (
    <ul className="space-y-0.5 font-mono text-xs">
      {fedTranscript.map((e, i) => (
        <li key={i} className="text-slate-600">{envLine(e)}</li>
      ))}
    </ul>
  )}
</Card>
```

---

### `frontend/src/demo/components/CredentialVerifyPanel.tsx` (component, async crypto)

**Analog:** `frontend/src/spikes/components/Spike006Trust.tsx` (lines 1–152)

**Imports pattern** (Spike006Trust lines 1–12, adapted):
```typescript
// CredentialVerifyPanel.tsx — FED-03 signed-credential verification, side-by-side
import { useEffect } from 'react';
import { verifyCredential, type VerifyResult } from '../lib/credential';
import { useWorld, useWorldDispatch } from '../store/world-state';
import { Card, MockTag } from './ui';
```

**Auto-verify on mount pattern** (D2-09 / RESEARCH Pattern 5 — adapted from Spike006Trust async `verify()` line 46):
```typescript
export function CredentialVerifyPanel() {
  const { fedCredentials, fedVerifyResults } = useWorld();
  const dispatch = useWorldDispatch();

  // Auto-verify both credentials when CREDENTIALS_READY populates fedCredentials (D2-09)
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
  // ...
}
```

**Side-by-side verdict cards** (Spike006Trust lines 129–142 adapted for fixed side-by-side layout):
```typescript
<div className="grid grid-cols-2 gap-4">
  {/* Rogue — left (Spike006Trust lines 131-140 structure) */}
  <div className="rounded-lg border border-red-200 bg-red-50 p-4">
    <div className="font-bold text-xl">✗ REJECTED</div>
    <div className="mt-1 text-sm text-slate-600">{rogueResult.reason}</div>
    <div className="mt-2"><MockTag>[MOCK]</MockTag></div>
    <div className="mt-1 text-xs text-slate-500">
      The holder will not evaluate ABAC on claims it cannot verify.
    </div>
  </div>
  {/* Valid — right */}
  <div className="rounded-lg border border-green-200 bg-green-50 p-4">
    <div className="font-bold text-xl">✓ TRUSTED</div>
    <div className="mt-1 text-sm text-slate-600">{validResult.reason}</div>
  </div>
</div>
```

**Loading state** (while `fedCredentials.valid === null`):
```typescript
if (!fedCredentials.valid || !fedCredentials.rogue) {
  return <Card><p className="text-sm text-slate-400">Signing credentials…</p></Card>;
}
```

---

### `frontend/src/demo/components/UnitConsolePanel.tsx` (component, request-response)

**Analog:** `frontend/src/spikes/components/Spike003Handshake.tsx` + `frontend/src/demo/components/DecisionExplorer.tsx`

**Imports pattern**:
```typescript
// UnitConsolePanel.tsx — FED-04 per-unit holdings/inbox/outbox console
import { useState } from 'react';
import { UNITS, unitName, type UnitId } from '../lib/model';
import { useWorld } from '../store/world-state';
import { Card, DecisionTrace, Field, MockTag, Pill, Select } from './ui';
```

**Local unit-picker pattern** (D2-04 spirit — view-only selection, does NOT dispatch; same as Spike003Handshake `useState` for entity selections):
```typescript
export function UnitConsolePanel() {
  const { hubIndex, fedInbox, fedOutbox } = useWorld();
  const unitIds = Object.keys(UNITS) as UnitId[];
  const [selectedUnit, setSelectedUnit] = useState<UnitId>(unitIds[0]);
  // selectedUnit is local state ONLY — no dispatch (display selection, not a decision input)
```

**Holdings section** (pure derivation, pattern from Spike002Hub line 9 and DecisionExplorer `groupByUnit`):
```typescript
const holdings = hubIndex.filter((p) => p.holdingUnit === selectedUnit);
```

**Inbox render with DecisionTrace** (D2-07 — reuse `DecisionTrace` verbatim from `demo/components/ui.tsx` lines 101–129):
```typescript
{(fedInbox[selectedUnit] ?? []).map((entry, i) => (
  <div key={i} className="space-y-2 border-b border-slate-100 pb-3">
    <div className="flex items-center gap-2 text-sm">
      <Pill tone="blue">{unitName(entry.from)}</Pill>
      <span className="text-slate-400">→ {entry.subjectId}</span>
      {entry.verifyResult.valid
        ? <Pill tone="green">verified</Pill>
        : <><Pill tone="red">unverified</Pill><MockTag>[MOCK]</MockTag></>
      }
    </div>
    {entry.detailResult.decision && (
      <DecisionTrace result={entry.detailResult.decision} />
    )}
  </div>
))}
```

**Outbox render** (Spike005Contract lines 162–171 for released record pills):
```typescript
{(fedOutbox[selectedUnit] ?? []).map((entry, i) => (
  <div key={i} className="flex flex-wrap items-center gap-2 text-sm border-b border-slate-100 pb-2">
    <Pill tone="blue">{unitName(entry.to)}</Pill>
    <span className="text-slate-400">{entry.subjectId}</span>
    {entry.granted ? (
      <>
        <Pill tone="green">RELEASED</Pill>
        {entry.record && <Pill tone="blue">{entry.record.clearance}</Pill>}
        {entry.record?.compartments.map((c) => <Pill key={c}>{c}</Pill>)}
      </>
    ) : (
      <Pill tone="red">WITHHELD</Pill>
    )}
  </div>
))}
```

---

## Shared Patterns

### Split-Context Store Access
**Source:** `frontend/src/demo/store/world-state.tsx` lines 213–251
**Apply to:** All new components that read from or dispatch to the store
```typescript
// Read state:
const { fedTranscript, fedRunStage, fedCredentials } = useWorld();
// Dispatch actions:
const dispatch = useWorldDispatch();
```
Two separate contexts (state and dispatch) follow React split-context pattern — prevents re-renders of dispatch-only children.

### Async Handler Then Dispatch (never await in reducer)
**Source:** `frontend/src/spikes/components/Spike006Trust.tsx` lines 24–48 + RESEARCH Pattern 2
**Apply to:** `FederationHub.tsx` (bootstrap), `ExchangeTranscriptPanel.tsx` (handleRespond)
```typescript
// The pattern: async fn, await crypto op, then dispatch with resolved value
async function handleSomething() {
  const result = await verifyCredential(cred);  // async outside reducer
  dispatch({ type: 'SOME_ACTION', result });     // dispatch synchronous resolved value
}
```
The reducer is NEVER async. It receives fully resolved values.

### Cancelled Flag for useEffect Cleanup
**Source:** RESEARCH Async/Sync Boundary section + React StrictMode behavior
**Apply to:** `FederationHub.tsx` (bootstrap useEffect), `CredentialVerifyPanel.tsx` (auto-verify useEffect)
```typescript
useEffect(() => {
  let cancelled = false;
  async function run() {
    const result = await someAsyncOp();
    if (!cancelled) dispatch({ type: '...', result });
  }
  run();
  return () => { cancelled = true; };
}, []);
```

### Immutable Reducer State Updates
**Source:** `frontend/src/demo/store/world-state.tsx` lines 118–139 (APPROVE_ATTRIBUTE case)
**Apply to:** All new reducer cases in world-state.tsx
```typescript
// Pattern: spread existing state, replace only changed slices
return {
  ...state,
  changedSlice: newValue,
  seq: state.seq + 1,  // advance seq for mutations; omit for view-selection
};
```
Inbox/outbox use spread-and-append: `[...(state.fedInbox[unit] ?? []), newEntry]`.

### Plain-Tailwind UI Primitives (no new shadcn blocks)
**Source:** `frontend/src/demo/components/ui.tsx` lines 7–130
**Apply to:** All new components
```typescript
// Import from demo's own ui.tsx — NOT from @/components/ui/
import { Card, Field, Pill, Select, MockTag, DecisionTrace } from './ui';
// Tone convention: blue=holding unit/info, amber=domain/MOCK, green=ALLOW/trusted, red=DENY/rejected, slate=neutral
```

### Verify-Before-Trust (D2-10)
**Source:** `frontend/src/spikes/lib/credential.ts` lines 72–90 + RESEARCH Pitfall 4
**Apply to:** `ExchangeTranscriptPanel.tsx` `handleRespond`, `CredentialVerifyPanel.tsx`
```typescript
// ALWAYS: verify credential first, build Principal only if valid
const verifyResult = await verifyCredential(cred);
const principal: Principal = verifyResult.valid
  ? buildPrincipalFromClaims(cred.payload)
  : /* treat as UNCLASSIFIED — ABAC will DENY */ minimalPrincipal(cred.payload.entity);
```

### No Router Imports in Demo Files
**Source:** `frontend/src/demo/DemoRoot.tsx` line 1 comment (D-02)
**Apply to:** ALL new files under `frontend/src/demo/`
```typescript
// FORBIDDEN in any demo/ file:
// import { ... } from '@tanstack/react-router';
// import { ... } from '../routeTree.gen';
// These break demo-island isolation (acceptance criterion 02-SPEC.md line 73)
```

---

## No Analog Found

All files have analogs. No entries.

---

## Metadata

**Analog search scope:** `frontend/src/demo/`, `frontend/src/spikes/`
**Files read:** 13 source files
**Pattern extraction date:** 2026-05-21

### Critical Invariants for Planner

1. **D2-02 lift boundary:** `demo/lib/contract.ts` exports ONLY pure functions. Zero classes, zero internal state arrays/maps. The `Network` class (spike lines 54–152) is explicitly NOT ported.

2. **D2-01 single store:** Every federation panel reads via `useWorld()`. No component holds federation data in local state except view-selection choices (unit-picker dropdown, subject-picker dropdowns).

3. **UnitId re-key table:** All spike `EntityId` / `holdingEntity` / `entity` references become `UnitId` / `holdingUnit` / `entity: UnitId` in demo code. The types in `model.ts:246–291` already reflect this — no new type declarations needed.

4. **`model.ts` Envelope type has `requester: unknown` and `decision: unknown`** (lines 262, 269) to avoid circular imports. The reducer's `FEDERATION_REQUEST_DETAIL` action carries a typed `Principal`; the reducer must cast when building the envelope, or the `ExchangeTranscriptPanel` can type-assert at render. The planner should choose: either widen the model.ts types to accept `Principal`/`Decision` imports, or keep `unknown` and cast in components.

5. **`fedOutbox` requester tracking:** The `FEDERATION_REQUEST_DETAIL` action must carry enough data to build the `InboxEntry.requester: Principal`. The planner should ensure the `ExchangeTranscriptPanel` dispatches the constructed `Principal` (built from `fedCredentials.valid.payload` or a minimal unverified principal) in the `FEDERATION_REQUEST_DETAIL` action, so the reducer can store it in the inbox without re-deriving.
