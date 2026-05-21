# Architecture Research

**Domain:** Federated ABAC authorization-hub demo (in-memory, simulated transport, React SPA)
**Researched:** 2026-05-21
**Confidence:** HIGH — derived directly from 9 validated spikes; no external sources needed

---

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                       DEMO SHELL  (React SPA)                        │
│  ┌────────────────┐  ┌─────────────────┐  ┌───────────────────────┐  │
│  │  Hub Console   │  │  Entity Console │  │  Audit / Log Console  │  │
│  │  (god-view)    │  │  (per-entity)   │  │  (time-slider view)   │  │
│  └───────┬────────┘  └────────┬────────┘  └──────────┬────────────┘  │
│          │                   │                       │               │
├──────────┴───────────────────┴───────────────────────┴───────────────┤
│                    DEMO CONTEXT  (React context / store)             │
│  ┌───────────────────────────────────────────────────────────────┐   │
│  │  WorldState: subjects, resources, units, subunits, hubIndex,  │   │
│  │             auditLog, unitPolicies, deploymentCtx             │   │
│  └─────────────────────────┬─────────────────────────────────────┘   │
│                            │ dispatch(WorldAction)                    │
├────────────────────────────┼─────────────────────────────────────────┤
│                    PURE LOGIC LAYER  (framework-free)                │
│  ┌──────────┐  ┌─────────┐  ┌───────────┐  ┌──────┐  ┌──────────┐   │
│  │ abac.ts  │  │contract │  │credential │  │audit │  │ policy/  │   │
│  │          │  │  .ts    │  │   .ts     │  │log.ts│  │obligs.ts │   │
│  └──────────┘  └─────────┘  └───────────┘  └──────┘  └──────────┘   │
├────────────────────────────┬─────────────────────────────────────────┤
│                    WORLD DATA  (seeded, in-memory)                   │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │  world.ts: Subject[], Resource[], Unit[], Subunit[],         │    │
│  │            HubPointer[], EntityPolicy[], SupportObligation[] │    │
│  └──────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Location |
|-----------|----------------|----------|
| `WorldState` context | Single source of truth for all mutable demo state; dispatches actions that append to the audit log and update subject attributes | `demo/context/world.tsx` |
| `world.ts` | Seeded initial data; the unified mock dataset reconciling both data models | `demo/lib/world.ts` |
| `abac.ts` | Pure ABAC evaluator — `evaluate()`, `evaluateWithPolicy()`, `evaluateSubunitAccess()`, `evaluateResourceAccess()` | `demo/lib/abac.ts` (merged from spikes) |
| `contract.ts` | `Network` class — typed envelope routing, transcript recording, the only inter-entity channel | `demo/lib/contract.ts` (reused) |
| `credential.ts` | `issueCredential` / `verifyCredential` — HMAC signing + trusted-issuer check | `demo/lib/credential.ts` (reused) |
| `auditlog.ts` | `reconstructSubject`, `whoCanAccess`, `AttrEvent` log — append-only, time-indexed | `demo/lib/auditlog.ts` (reused) |
| `policy.ts` + `obligations.ts` | Per-entity policy evaluation; obligation grants + directional shielding | `demo/lib/policy.ts`, `obligations.ts` (reused) |
| Hub Console view | God-view: pointer index, who-holds-what, no sensitive detail visible; also shows the Network transcript | `demo/views/HubView.tsx` |
| Entity Console view | Per-entity perspective: operate as one entity, request detail from others, see ABAC trace, manage role SoD actions | `demo/views/EntityView.tsx` |
| Audit Console view | Timeline slider, point-in-time reconstruction, who-can-access queries, leak/anomaly indicator | `demo/views/AuditView.tsx` |
| Context Console view | 6-unit deployment scenario, subunit deployment toggle, obligation grants, directional shielding traces | `demo/views/ContextView.tsx` |
| `DecisionTrace` | Shared UI: renders rule list + overrides for any `Decision` object | `demo/components/DecisionTrace.tsx` (from spike `ui.tsx`) |

---

## Unified Mock-World Data Model

### The Reconciliation Problem

The spike dataset has two separate namespaces that must coexist in the demo:

**Spike 001–008 model** (`lib/data.ts`): `Subject` + `Resource` + `EntityId` (`ENTITY_A/B/C`) — used by ABAC engine, hub, handshake, contract, credential, audit, policy.

**Spike 009 model** (`lib/obligations.ts`): `Subunit` + `ContextResource` + `UnitId` (`MILITARY_1/2`, `INTEL`, `INFRA`, `INDUSTRY`, `HOME_GUARD`) — used by the 6-unit deployment scenario.

These are not contradictory — they are two lenses on the same entities at different abstraction levels. The reconciliation is straightforward:

**Each `UnitId` maps to one `EntityId`.** The 6-unit scenario IS the real deployment; the 3-entity ABAC model was a simplified spike dataset. In the demo, promote the 6-unit model as the canonical entity set and retire the 3-entity simplification.

### Unified Entity Mapping

```
UnitId (obligations.ts)  →  EntityId (world.ts)       →  Entity label
─────────────────────────────────────────────────────────────────────
MILITARY_1               →  "UNIT_MILITARY_1"          Military Unit 1
MILITARY_2               →  "UNIT_MILITARY_2"          Military Unit 2
INTEL                    →  "UNIT_INTEL"               Intelligence
INFRA                    →  "UNIT_INFRA"               Inventory / Infrastructure
INDUSTRY                 →  "UNIT_INDUSTRY"            Industry
HOME_GUARD               →  "UNIT_HOME_GUARD"          Home Guard
```

The old `ENTITY_A/B/C` are replaced. All spike libs that take `EntityId` still work — only the seed values change.

### Unified `world.ts` Schema

```typescript
// All types that world.ts must export:

// -- Identifiers (replace ENTITY_A/B/C with the 6-unit set) --
export type UnitId = "UNIT_MILITARY_1" | "UNIT_MILITARY_2" | "UNIT_INTEL"
                   | "UNIT_INFRA" | "UNIT_INDUSTRY" | "UNIT_HOME_GUARD";
export type EntityId = UnitId;  // alias so abac.ts and contract.ts still compile

// -- From obligations.ts (expanded) --
export type Deployment = "HOME" | "ABROAD";
export interface Subunit { id: string; name: string; unit: UnitId; deployment: Deployment; }

// -- From data.ts (unchanged types, re-seeded for 6 units) --
export type Clearance = "UNCLASSIFIED" | "CONFIDENTIAL" | "SECRET" | "TOP_SECRET";
export type Domain = "COMPUTER" | "DATA" | "PHYSICAL";
export type Compartment = "AURORA" | "BLACKWING" | "CITADEL" | "HARVEST" | "SCREEN";
  // HARVEST = intel program; SCREEN = industry stock data — new compartments for the 6-unit scenario

export interface Subject {
  id: string; name: string;
  homeEntity: EntityId;             // which unit owns this person's record
  clearance: Clearance;             // external, read-only
  domainAuth: Partial<Record<Domain, string>>;
  compartments: Compartment[];
  flags: { revoked: boolean; securityHold: boolean; };
}

export interface Resource {
  id: string; name: string;
  domain: Domain;
  requiredTier: string;
  minClearance: Clearance;
  requiredCompartments: Compartment[];
  ownerEntity: EntityId;
  shielded?: boolean;              // NEW: merges ContextResource.shielded into Resource
  shieldAllowlist?: EntityId[];    // NEW: merges ContextResource.allowlist into Resource
}

export interface HubPointer {
  subjectId: string; holdingEntity: EntityId; domain: Domain;
}

// -- Support obligations (from obligations.ts, same shape) --
export interface SupportObligation { from: UnitId; to: UnitId; }

// -- Per-entity policy (from policy.ts, EntityPolicy already references EntityId) --
// EntityPolicy is imported from policy.ts unchanged.

// -- Cross-entity agreements (from data.ts, re-seeded) --
export type Agreement = [EntityId, EntityId];
// Military units agree with each other; intel reads-all; infra domain-scoped; industry isolated
```

### Resource Model Merge

`Resource` and `ContextResource` are the same concept. Merge them: add optional `shielded` and `shieldAllowlist` fields directly onto `Resource`. The ABAC engine already has `ownerEntity`; the policy/obligations code checks shielded. This lets `evaluateResourceAccess` in `obligations.ts` operate on the same `Resource` type as the ABAC engine, eliminating the parallel `RESOURCES_CTX` array.

### Subjects Seeded for 6-Unit Scenario

Seed at least one `Subject` per unit with representative clearance + compartments. Suggested seed (6 subjects, one per unit):

| Name | homeEntity | clearance | domainAuth | compartments |
|------|-----------|-----------|------------|--------------|
| Alice Strand | UNIT_MILITARY_1 | SECRET | COMPUTER:PRIVILEGED, PHYSICAL:RESTRICTED_AREA | AURORA |
| Ben Holt | UNIT_MILITARY_2 | TOP_SECRET | COMPUTER:ROOT, DATA:CLASSIFIED | AURORA, BLACKWING |
| Cara Moen | UNIT_INTEL | TOP_SECRET | DATA:CLASSIFIED | AURORA, BLACKWING, HARVEST |
| Dan Sørby | UNIT_INFRA | CONFIDENTIAL | PHYSICAL:RESTRICTED_AREA | — |
| Eva Krog | UNIT_INDUSTRY | CONFIDENTIAL | DATA:RESTRICTED | SCREEN |
| Finn Laug | UNIT_HOME_GUARD | SECRET | PHYSICAL:RESTRICTED_AREA | AURORA |

---

## Recommended Demo Structure

```
frontend/src/demo/
├── lib/
│   ├── world.ts          # unified seed data + all shared types
│   ├── abac.ts           # merged evaluate() + evaluateWithPolicy() + evaluateSubunit/Resource()
│   ├── contract.ts       # Network class (reused unchanged)
│   ├── credential.ts     # issueCredential / verifyCredential (reused unchanged)
│   ├── auditlog.ts       # reconstructSubject / whoCanAccess (reused, base = WorldState subjects)
│   ├── policy.ts         # EntityPolicy + evaluateWithPolicy (reused unchanged)
│   └── obligations.ts    # evaluateSubunitAccess / evaluateResourceAccess (reused, types updated)
├── context/
│   └── world.tsx         # WorldStateContext + useWorld() + dispatch(WorldAction)
├── views/
│   ├── HubView.tsx       # Hub Console (god-view)
│   ├── EntityView.tsx    # Entity Console (per-entity perspective)
│   ├── AuditView.tsx     # Audit Console (time-slider, reconstruction)
│   └── ContextView.tsx   # Context Console (6-unit deployment, obligations)
├── components/
│   ├── DecisionTrace.tsx # shared rule/override renderer (from spike ui.tsx)
│   ├── SubjectCard.tsx   # subject attributes + flags display
│   ├── ResourceCard.tsx  # resource requirements display
│   └── NetworkLog.tsx    # contract envelope transcript viewer
└── DemoShell.tsx         # top-level nav + view switcher (replaces spikes/Shell.tsx)
```

The `demo/` tree is a **sibling of `spikes/`** — spike code is not deleted, just not imported. The new demo mounts via the existing `spikes.html` entry point, replacing the `Shell` import with `DemoShell`.

---

## Architecture Patterns

### Pattern 1: WorldState as Single Append-Only Store

**What:** One React context holds all mutable demo state. Every user action dispatches a `WorldAction` that: (a) appends an `AttrEvent` to the audit log, (b) updates the materialized subject/resource state. The audit log is the system of record; the materialized state is a performance projection.

**When to use:** Always in this demo — this is the core invariant of the pure-ABAC model.

**Trade-offs:** All views share one store, so any view can show "current world" state without prop drilling. The cost is that the context is wide; fine for a demo.

**Example:**
```typescript
type WorldAction =
  | { type: 'GRANT_COMPARTMENT'; subjectId: string; value: Compartment; actor: string }
  | { type: 'SET_HOLD'; subjectId: string; actor: string }
  | { type: 'SET_DEPLOYMENT'; subunitId: string; deployment: Deployment }
  | { type: 'RESET' };

function worldReducer(state: WorldState, action: WorldAction): WorldState {
  if (action.type === 'GRANT_COMPARTMENT') {
    const event: AttrEvent = { seq: state.nextSeq, subjectId: action.subjectId,
                                op: 'GRANT_COMPARTMENT', value: action.value, actor: action.actor };
    // update materialized subjects + append to log in one atomic step
    return { ...state, nextSeq: state.nextSeq + 1,
             auditLog: [...state.auditLog, event],
             subjects: applyEvent(state.subjects, event) };
  }
  // ...
}
```

### Pattern 2: Per-Entity Console View with Shared Engine

**What:** The Entity Console mounts in the context of one selected unit (`activeUnit`). It constructs a `Network` from the current `WorldState`, operates as that unit, and shows ABAC traces for every action. Role SoD is enforced by the active operating role (`activeRole`) checked against `ROLES[activeRole].ops`.

**When to use:** Any demo interaction that shows "what an entity sees / can do."

**Trade-offs:** The `Network` is constructed fresh from `WorldState` on each render; this is fine for a demo with ~10 subjects. The transcript accumulates in local component state so it doesn't pollute the global audit log.

**Example flow:**
```
User picks: activeUnit = UNIT_INTEL, activeRole = ACCESS_APPROVER
  → Entity Console shows INTEL's subject records
  → User clicks "Discover subject X" → Network.discover(UNIT_INTEL, subjectId)
  → Hub returns pointers (no detail)
  → User clicks "Request detail from UNIT_MILITARY_1"
      → Network.requestDetail(UNIT_INTEL, UNIT_MILITARY_1, subjectId, requester)
      → ABAC trace rendered via DecisionTrace
  → If ALLOW: user can see the record
```

### Pattern 3: Simulated Transport via Network Class

**What:** `contract.ts`'s `Network` is the ONLY inter-entity communication channel in the demo. No direct cross-entity function calls. Every `requestDetail` call applies the holder's ABAC policy before returning. The `Network.transcript` array gives the demo its "wire log" — the Network Log panel shows the envelope sequence.

**When to use:** Every federation interaction — publish, discover, request detail.

**Trade-offs:** In-process simulation means transport latency is zero; the demo uses `async` in credential verification but the Network itself is synchronous. A real build swaps `Network` for a real transport, keeping the `Envelope` types unchanged. That swap is explicit in the contract design.

### Pattern 4: ABAC Engine Merge (obligations.ts unifies into abac.ts)

**What:** The two evaluation paths (`abac.ts::evaluate` + `obligations.ts::evaluateSubunitAccess` / `evaluateResourceAccess`) are merged into a single `abac.ts` that handles both modes. `evaluateSubunitAccess` is the deployment-context path; `evaluateResourceAccess` applies shielding. Both use the same `Decision` / `Rule` / `ContextRule` return types.

**When to use:** Any access decision. The caller picks the evaluation path based on what it's checking: a standard resource → `evaluate`; a subunit (deployment context) → `evaluateSubunitAccess`; a shielded resource → `evaluateResourceAccess`.

**Trade-offs:** Keeping them separate (as in the spikes) is fine too. The advantage of merging is a single import and the ability to compose (e.g., standard ABAC check + shielding check in sequence for the same resource). Merge is recommended for the demo's single-file clarity; defer to separate files only if tests make the single file unwieldy.

---

## Data Flow

### ABAC Access Decision Flow

```
User selects: subject + resource (or subunit)
    ↓
WorldState.subjects → principalFromSubject(subject)
WorldState.resources → requirementFromResource(resource)
    ↓
abac.evaluate(principal, requirement)           ← for standard resource
abac.evaluateWithPolicy(p, req, policy)         ← for per-entity policy path
abac.evaluateSubunitAccess(requester, subunit)  ← for deployment context
abac.evaluateResourceAccess(requester, res)     ← for shielded resource
    ↓
Decision { decision, rules[], overrides[], failed[] }
    ↓
<DecisionTrace decision={d} /> — renders every rule + override with ✓/✗
```

### Federation Request Flow (typed contract)

```
Entity Console: user selects activeUnit, picks subject
    ↓
Network.discover(activeUnit, subjectId)
    → appends DISCOVER + DISCOVER_RESULT envelopes to transcript
    → returns Pointer[] (no sensitive data)
    ↓
User selects a holder from the pointer list
    ↓
credential.issueCredential(claims, issuerKey)   ← async, Web Crypto
    ↓
verifyCredential(cred)                          ← holder verifies before ABAC
    ↓ if valid:
Network.requestDetail(activeUnit, holder, subjectId, principal)
    → ABAC evaluation at holder's entity policy
    → appends REQUEST_DETAIL + DETAIL_RESPONSE envelopes
    → returns DetailResult { granted, decision, record | null }
    ↓
Decision rendered via DecisionTrace; record shown only if granted
```

### Audit Reconstruction Flow

```
Audit Console: user drags timeline slider to asOf = N
    ↓
WorldState.auditLog (AttrEvent[]) + WorldState.subjects (base state)
    ↓
reconstructSubject(subjectId, auditLog, asOf) for each subject
    ↓
evaluate(principalFromSubject(reconstructed), requirement)
    ↓
whoCanAccess(requirement, auditLog, asOf) → AccessRow[]
    ↓
Rendered as "who could access X at time N" table
```

### WorldState Mutation Flow

```
Role SoD action (e.g. Approver grants compartment):
    ↓
dispatch({ type: 'GRANT_COMPARTMENT', subjectId, value, actor: activeRole })
    ↓
worldReducer appends AttrEvent to auditLog
    ↓
materialized subjects updated (applyEvent)
    ↓
All views reading WorldState re-render with new state
    ↓
Audit Console can now replay up to the new seq to see the change
```

---

## Integration Points

### Module Dependency Graph

```
world.ts  (types + seed data)
    ↑
abac.ts   (depends on world.ts for types + CLEARANCE_RANK, TIERS, AGREEMENTS)
    ↑
contract.ts   (depends on world.ts + abac.ts)
auditlog.ts   (depends on world.ts + abac.ts)
policy.ts     (depends on world.ts + abac.ts)
obligations.ts (depends on world.ts + abac.ts)
credential.ts  (depends on world.ts for Clearance/Compartment/EntityId types only)
    ↑
context/world.tsx  (depends on all lib modules)
    ↑
views/  (depend on context/world.tsx + lib modules)
components/  (depend on lib types for prop types; no world.tsx dependency)
```

No cycles. `world.ts` is the leaf (no internal imports). `credential.ts` is nearly independent — only needs three types from `world.ts`.

### Internal Boundaries

| Boundary | Communication | Rule |
|----------|---------------|------|
| view → WorldState | `useWorld()` hook + `dispatch(WorldAction)` | Views never call lib functions directly that mutate world state; always go through dispatch |
| Entity Console → Network | Instantiate `new Network()` in a `useMemo` from current `WorldState`; network transcript is local view state | Network is never in WorldState — it's a simulation tool, not persistent state |
| credential verification → ABAC | ABAC is only called after `verifyCredential` returns `valid: true` | This is the trust boundary — never skip verification |
| auditlog → subjects | `reconstructSubject` reads `WorldState.subjects` as base; events replay on top | Base state is not the log; it's the initial seed |

### Spike Code Reuse vs. New Code

| Module | Status | Action |
|--------|--------|--------|
| `spikes/lib/abac.ts` | REUSE with merge | Copy to `demo/lib/abac.ts`; add `evaluateSubunitAccess` + `evaluateResourceAccess` from `obligations.ts` |
| `spikes/lib/contract.ts` | REUSE unchanged | Copy to `demo/lib/contract.ts`; update `EntityId` import to new 6-unit type |
| `spikes/lib/credential.ts` | REUSE unchanged | Copy to `demo/lib/credential.ts`; ISSUER_KEYS and TRUSTED_ISSUERS stay identical |
| `spikes/lib/auditlog.ts` | REUSE with one change | Copy to `demo/lib/auditlog.ts`; replace hardcoded `SUBJECTS` import with a passed-in `Subject[]` parameter so it works against WorldState instead of the spike seed |
| `spikes/lib/policy.ts` | REUSE unchanged | Copy to `demo/lib/policy.ts`; update EntityId imports |
| `spikes/lib/obligations.ts` | PARTIALLY REUSE | `evaluateSubunitAccess` + `evaluateResourceAccess` move into `demo/lib/abac.ts`; `UnitId` + `UNITS` + `SUPPORT_OBLIGATIONS` move into `world.ts` |
| `spikes/lib/data.ts` | REPLACE | Superseded by `demo/lib/world.ts` with the unified 6-unit dataset |
| `spikes/components/ui.tsx` (`DecisionTrace`) | REUSE | Extract `DecisionTrace` into `demo/components/DecisionTrace.tsx` |
| All `Spike00N*.tsx` components | REPLACE | Views in `demo/views/` replace individual spike tabs; each view combines what multiple spikes showed separately |
| `spikes/components/Shell.tsx` | REPLACE | `demo/DemoShell.tsx` replaces it; mounted from same `spikes.html` entry |

---

## Build Order

Build order follows the dependency graph: world data first, then engine, then simulation infrastructure, then views.

### Phase 1 — Foundation (no UI)

1. `demo/lib/world.ts` — unified seed data, all types, 6-unit dataset, `AGREEMENTS` and `SUPPORT_OBLIGATIONS` re-seeded. Reconciles both data models. This is the hardest data-design step; all downstream depends on it.
2. `demo/lib/abac.ts` — merged evaluator: copy `evaluate` + `evaluateWithPolicy` from spike; add `evaluateSubunitAccess` + `evaluateResourceAccess` from obligations.ts; unify return types.
3. `demo/context/world.tsx` — `WorldState`, `WorldAction`, `worldReducer`, `WorldStateContext`, `useWorld()`. Wire `GRANT_COMPARTMENT`, `REVOKE_COMPARTMENT`, `SET_HOLD`, `CLEAR_HOLD`, `SET_DEPLOYMENT` actions. Each action appends to `auditLog` + updates materialized state.

**Verify:** existing spike unit tests (`abac.test.ts`, `policy.test.ts`, `auditlog.test.ts`, `obligations.test.ts`, `contract.test.ts`, `credential.test.ts`) should all pass after the type updates.

### Phase 2 — Simulation Infrastructure + Shared Components

4. `demo/lib/contract.ts` — update `EntityId` type; otherwise unchanged.
5. `demo/lib/credential.ts` — update imports; otherwise unchanged.
6. `demo/lib/auditlog.ts` — change `reconstructSubject` to accept `subjects: Subject[]` instead of importing `SUBJECTS` directly; `whoCanAccess` receives subjects from caller.
7. `demo/lib/policy.ts` — update imports.
8. `demo/components/DecisionTrace.tsx` — extracted + lightly styled from spike `ui.tsx`.
9. `demo/components/SubjectCard.tsx`, `ResourceCard.tsx`, `NetworkLog.tsx`.

### Phase 3 — Views (in dependency order)

10. `demo/views/HubView.tsx` — god-view: render `WorldState.hubIndex` as a table (no sensitive fields); show per-subject pointer grouping; "what the hub does NOT store" panel from spike 002. Requires only Phase 1 + 2.
11. `demo/views/EntityView.tsx` — per-entity console: unit selector, role selector (8 roles), subject list for active unit, ABAC evaluation panel, federation panel (discover + request detail with credential verify + Network transcript). Combines spikes 001, 002, 003, 004, 005, 006, 008. Requires Phase 2 libs.
12. `demo/views/AuditView.tsx` — audit log table, timeline slider for `asOf`, "who can access X at T" reconstruction panel, anomaly/leak detection indicator for INDUSTRY resources. Combines spikes 007. Requires `auditlog.ts` from Phase 2.
13. `demo/views/ContextView.tsx` — 6-unit scenario: unit matrix, subunit deployment toggle (HOME/ABROAD), support obligation traces, directional shielding traces, `ContextDecision` renders via `DecisionTrace`. Combines spike 009. Requires Phase 1 merged `abac.ts`.

### Phase 4 — Shell and Integration

14. `demo/DemoShell.tsx` — top-level nav with four view tabs (Hub, Entity, Audit, Context). Wraps everything in `WorldStateProvider`. Replaces `spikes/Shell.tsx` as the mount point in `spikes.html` / `spikes/main.tsx`.

**Verify integration:** demonstrate the cross-view story: grant a compartment in Entity Console (SoD: Approver role) → audit log in Audit Console updates → reconstruction slider shows the change → hub pointers remain unchanged (no sensitive detail leaked into hub).

---

## Anti-Patterns

### Anti-Pattern 1: Sensitive Fields in WorldState Hub Index

**What people do:** Store clearance, tier, or compartment data on `HubPointer` for convenience when populating views.

**Why it's wrong:** Defeats the "discovery without disclosure" invariant. Any component reading hub state would trivially expose clearance data — the demo would no longer prove the model.

**Do this instead:** `HubPointer` contains only `{ subjectId, holdingEntity, domain }`. Sensitive data lives only in `WorldState.subjects`, accessible only via the handshake path (Network.requestDetail + ABAC evaluation).

### Anti-Pattern 2: Calling Spike Libs Directly from Views (Bypassing WorldState)

**What people do:** Import `evaluate()` directly in a view component and call it with hardcoded spike data instead of WorldState.

**Why it's wrong:** Mutations (GRANT_COMPARTMENT, SET_HOLD) made via WorldState dispatch will not be reflected in direct spike-data calls. The audit log and materialized state diverge. The demo becomes inconsistent.

**Do this instead:** All evaluations in views use data from `useWorld()`. Pass `WorldState.subjects`, `WorldState.resources`, `WorldState.auditLog` to lib functions.

### Anti-Pattern 3: Modeling Obligations as Static Attributes

**What people do:** Add a `hasObligation: boolean` flag to `Subject` or pre-compute obligation grants into `domainAuth` during seeding.

**Why it's wrong:** Obligations are dynamic — they turn ON when a subunit deploys ABROAD and OFF when it returns HOME. Baking them into subject attributes prevents demonstrating context-driven access and collapses the whole point of spike 009.

**Do this instead:** `evaluateSubunitAccess` always reads `subunit.deployment` from `WorldState.subunits` live. The deployment toggle in Context Console dispatches `SET_DEPLOYMENT` → obligation grant activates/deactivates in real time.

### Anti-Pattern 4: Skipping Credential Verification Before ABAC

**What people do:** Call `evaluate(principal, requirement)` directly with claims from the requester without running `verifyCredential` first.

**Why it's wrong:** Spike 006's core finding: self-asserted attributes must never be trusted. The demo is specifically designed to show ROGUE-ISSUER rejection. Skipping verification makes the federation flow indistinguishable from the insecure baseline.

**Do this instead:** The Entity Console federation flow always: (1) `issueCredential`, (2) `verifyCredential` → show verify result, (3) only if `valid: true` proceed to `Network.requestDetail`.

### Anti-Pattern 5: Reconciling Data Models by Adding Two Separate Entity Sets

**What people do:** Keep `ENTITY_A/B/C` for the ABAC/federation spikes and `MILITARY_1/INTEL/...` for the context spike, bridged by a mapping table.

**Why it's wrong:** Two parallel entity namespaces in the same demo are confusing for a viewer and make cross-view consistency impossible (the hub view shows ENTITY_A, the context view shows MILITARY_1 — they appear unrelated).

**Do this instead:** Use the 6-unit `UnitId` set everywhere. Update `EntityId` to be an alias for `UnitId`. Re-seed subjects and resources for the 6-unit scenario. The ABAC engine and contract don't care about the specific string values — only the types.

---

## Scaling Considerations

This is a DEMO — scale is not a concern. The relevant constraint is demo clarity:

| Scale | Note |
|-------|------|
| Subjects | 6–12 subjects (one or two per unit); enough to show interesting ABAC cases; small enough that all are visible in one table |
| Resources | 6–10 resources across the three domains; at least one shielded (INTEL), one stock-data (INDUSTRY) |
| Audit log | 10–20 seeded events; enough to show meaningful reconstruction + at least one anomaly |
| Units / subunits | 6 units; 3–4 subunits with at least one ABROAD (MILITARY_1's deployed subunit) |

Full replay of the audit log per query is fine at this scale. Materialization in `worldReducer` is an optimization included by design (to demonstrate that the architecture supports it) not a performance requirement.

---

## Sources

- `frontend/src/spikes/lib/` — all 7 validated spike libs (direct inspection, HIGH confidence)
- `frontend/src/spikes/components/` — 9 spike UI components (direct inspection, HIGH confidence)
- `.planning/AUTH-MODEL.md` — design contract, §4 ABAC attributes, §6 operating roles, §12 deployment scenario
- `.planning/PROJECT.md` — demo scope, constraints, requirements
- `.claude/skills/spike-findings-janus-2.0/references/` — synthesized findings for all 5 feature areas

---
*Architecture research for: Janus 2.0 — Authorization Hub demo (consolidating 9 spikes into coherent app)*
*Researched: 2026-05-21*
