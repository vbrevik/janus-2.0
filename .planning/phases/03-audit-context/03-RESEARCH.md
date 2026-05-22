# Phase 3: Audit & Context — Research

**Researched:** 2026-05-22
**Domain:** Demo island — audit-log reconstruction + per-entity policy + context-driven access rules
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Audit View Architecture**
- D3-01: Pre-seed ~4 baseline `AttrEvent` entries in the initial world-state (same pattern as spike 007 — ensures AUDIT-01 baseline content from load). The existing `events: AttrEvent[]` slice in `world-state.tsx` is the source of truth; Phase 3 only reads it.
- D3-02: Point-in-time UI = a sequence-number range slider (min=0, max=events.length). Dragging to T replays events with `seq ≤ T` to reconstruct subject state; "who can access R as of T?" is recomputed from that reconstruction.
- D3-03: Slider defaults to max (= current state / "now"). A "Current state" chip labels the default O(1) projection explicitly.
- D3-04 (OQ-B resolved): Wire the authorization lifecycle rule (D-11) in Phase 3. `AUTHORIZE_SUBJECT` / `WITHDRAW_AUTHORIZATION` events already in `AttrOp`. Add "Authorization valid" as a new base rule in the audit reconstruction evaluator — a subject's `authorization.status !== AUTHORIZED` triggers a DENY distinct from tier/override/clearance failures.

**Context & Policy View Architecture**
- D3-05: Two separate tabs ("Audit" and "Context") — cleaner separation.
- D3-06: Per-entity policy (CTX-01): assign 3 distinct policy flavors to the 6 demo units: `MILITARY_1`: standard (all rules); `INTEL`: strict (TOP_SECRET clearance floor); `INDUSTRY`: relaxed (no NTK / no affiliation checks); `MILITARY_2`, `INFRA`, `HOME_GUARD`: inherit standard.
- D3-07: Deployment toggle (CTX-02) = local component `useState<Deployment>` — sufficient for the success criterion; does NOT dispatch into world-state.
- D3-08: Directional shielding (CTX-03): source shielded resources from `world-state.subjects` / `world-state.resources` where `shielded=true` and `allowlist` is set (D-05 forward fields already present).

**Demo Navigation**
- D3-09: Extend the Phase 2 `DemoRoot.tsx` toggle from a boolean to a 4-tab `useState<'decisions' | 'federation' | 'audit' | 'context'>`.
- D3-10: No cross-links from Decision Explorer to Audit. Cross-view linking is a Phase 4 concern.
- D3-11: No role gate on the Audit tab in Phase 3. Add a small on-screen note: "In production, Auditor role required."

**Lift Strategy**
- D3-12: Three separate lib files: `demo/lib/auditlog.ts`, `demo/lib/policy.ts`, `demo/lib/obligations.ts`. Matches D-01/D-02 "lift proven spike logic verbatim."
- D3-13: `reconstructSubject` and `whoCanAccess` (and equivalents) take a `subjects: Subject[]` parameter — NOT imported from seed directly. Components pass `worldState.subjects`. Makes functions testable in isolation.
- D3-14: Port Vitest tests alongside each lifted file (`auditlog.test.ts`, `policy.test.ts`, `obligations.test.ts`), adapted to UnitId and the demo model.

### Claude's Discretion
- Exact tab bar styling/placement within "in/near existing header, throwaway" — reuse the same shadcn/Tailwind patterns as the existing Phase 2 view toggle.
- The pre-seeded baseline events in D3-01: choose a narratively interesting set (one GRANT_COMPARTMENT, one SET_HOLD, one CLEAR_HOLD, one AUTHORIZE_SUBJECT minimum).
- Internal layout of Audit panels and Context panels — keep legible; Phase 4 owns final polish.
- How the authorization rule integrates with the existing `evaluate` fn in `abac.ts` vs. a parallel evaluator in `auditlog.ts` — planner's choice, constrained by D3-13 (injectable subjects, testable).

### Deferred Ideas (OUT OF SCOPE)
- AUDIT-03 (leak/anomaly indicator) — deferred.
- Dispatching deployment changes to world-state — local-only (D3-07).
- Role-gating the Audit tab — Phase 4 shell concern.
- Cross-view links from Decision Explorer — Phase 4 cross-view consistency.
- Delete `frontend/src/spikes/` — cleanup deferred.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUDIT-01 | The append-only event log is the system of record; current access is a materialized projection answering current-state queries in O(1) | `reconstructSubject` + `whoCanAccess` lifted from spike 007; `events[]` already in world-state; pre-seeded baseline events added to `seed.ts` |
| AUDIT-02 | Viewer can reconstruct "who can access resource R as of time T" via a timeline, including the effect of revocations and holds | Range slider drives `asOf` → replay up to `seq ≤ asOf` → authorization rule (D3-04 / D-11) wired as additional evaluator rule |
| CTX-01 | Each entity has its own release policy; the same request can resolve differently depending on the holding entity | `evaluateWithPolicy` lifted from spike 008; 6-unit POLICIES mapped from MILITARY_1/INTEL/INDUSTRY flavors (D3-06); side-by-side 6-column grid |
| CTX-02 | A subunit deployed ABROAD triggers a support-obligation grant to obligated units; access turns OFF when it returns HOME (dynamic, not a stored grant) | `evaluateSubunitAccess` lifted from spike 009; deployment = local `useState<Deployment>` (D3-07); SUBUNITS seeded in `seed.ts` |
| CTX-03 | Directional shielding denies protected intel/industry data to non-allowlisted requesters even with standing access | `evaluateResourceAccess` lifted from spike 009; shielded resources sourced from `worldState.resources` where `shielded===true` (D3-08) |
</phase_requirements>

---

## Summary

Phase 3 adds two new demo views — Audit and Context — to the demo island. Every mechanism is already proven in spikes 007, 008, and 009. The work is almost entirely a lift-and-adapt exercise: copy the spike library functions, re-key them from the spike's 3-entity scaffolding onto the demo's 6-unit `UnitId` type, inject dependencies via parameters instead of hardcoded imports, and wire them into two new React components (`AuditView.tsx`, `ContextView.tsx`).

The single genuinely new piece of logic is D3-04: adding an "Authorization valid" rule that reads `subject.authorization.status` and returns DENY when status is not `AUTHORIZED`. The `ca5-subj` fixture (Maja Vik, `authorization.status: 'WITHDRAWN'`) is already seeded and waiting. The `AttrOp` types `AUTHORIZE_SUBJECT` and `WITHDRAW_AUTHORIZATION` are already declared in `model.ts`. No new store slices, no new npm packages, no route tree changes.

Navigation extends the Phase 2 `DemoRoot.tsx` `useState<ActiveView>` from a 2-choice to a 4-choice type; the tab button pattern is already established and can be copied verbatim.

**Primary recommendation:** Lift spike libs verbatim, swap imports to demo paths, inject `subjects` as a parameter per D3-13, add the authorization-status rule for D3-04, seed baseline events and policies in `seed.ts`, wire two new view components, extend `DemoRoot.tsx`. All in `frontend/src/demo/` only — no backend changes, no route tree changes.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Audit event log storage | Demo world-state (useReducer) | — | `events: AttrEvent[]` and `seq` already live in `WorldState`; Phase 3 reads, does not extend |
| Point-in-time reconstruction (`reconstructSubject`, `whoCanAccess`) | `demo/lib/auditlog.ts` (pure function) | `AuditView.tsx` (caller) | Pure functions make the logic testable in isolation (D3-13) |
| Authorization lifecycle rule (D3-04) | `demo/lib/auditlog.ts` evaluator | `demo/lib/abac.ts` (for reference) | Wired in the audit reconstruction evaluator, not in the base `evaluate` fn |
| Per-entity policy evaluation | `demo/lib/policy.ts` (pure function) | `ContextView.tsx` (caller) | Lifted from spike 008; keyed to UnitId |
| Support-obligation evaluation | `demo/lib/obligations.ts` (pure function) | `ContextView.tsx` (caller) | Local deployment state drives the context; no world-state dispatch |
| Directional shielding evaluation | `demo/lib/obligations.ts` (pure function) | `ContextView.tsx` (caller) | Resources sourced from world-state; function is pure |
| 4-tab navigation | `demo/DemoRoot.tsx` | — | Throwaway `useState` toggle extending Phase 2 pattern |
| Seed data (events, policies, subunits) | `demo/lib/seed.ts` | — | INITIAL_EVENTS, POLICIES, SUBUNITS added here |

---

## Standard Stack

No new npm packages are required for this phase. [VERIFIED: codebase grep]

### Core (all already installed)
| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| React | 19.1.1 | UI rendering, `useState`, `useMemo` | Already in use across demo island |
| TypeScript ~5.9 | ~5.9.3 | Type safety on lifted libs | Strict mode enabled |
| Vitest 4.0.x | 4.0.x | Unit tests for lifted libs | Already configured; `nyquist_validation: false` in config but tests still authored |

### Already-present demo infrastructure
| Asset | File | Phase 3 use |
|-------|------|-------------|
| `Card`, `Pill`, `Field`, `Select`, `DecisionTrace`, `MockTag` | `demo/components/ui.tsx` | All reused as-is |
| `DemoBanner`, `RoleSwitcherHeader` | `demo/components/*.tsx` | Unchanged |
| `useWorld()` | `demo/store/world-state.tsx` | Provides `events`, `resources`, `subjects`, `seq` |
| `WorldProvider` | `demo/store/world-state.tsx` | Already wraps the tree in `DemoRoot.tsx` |
| `evaluate`, `principalFromSubject`, `requirementFromResource` | `demo/lib/abac.ts` | May be imported by lifted libs |

### No new packages
**Installation:** None required.

---

## Package Legitimacy Audit

No external packages are installed in this phase. All logic is lifted from internal spike files.

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

---

## Architecture Patterns

### System Architecture Diagram

```
DemoRoot.tsx
  useState<'decisions'|'federation'|'audit'|'context'>
  ├── DecisionExplorer (unchanged)
  ├── FederationHub (unchanged)
  ├── AuditView ────────────────────────────────────────────────────────────
  │     useWorld() → { events, subjects, resources, seq }
  │     useState(asOf = events.length)
  │     ├── Timeline Card
  │     │     <input type="range" min=0 max=events.length>
  │     │     event list: seq ≤ asOf → applied; seq > asOf → future
  │     ├── reconstructSubject(subjectId, events, asOf)  ← demo/lib/auditlog.ts
  │     │     ↳ clones subject from subjects[], replays ops up to asOf
  │     │     ↳ authorization rule: status !== AUTHORIZED → DENY (D3-04)
  │     ├── Reconstructed State Card
  │     │     Pill: clearance, compartments, securityHold, authorizationStatus
  │     └── whoCanAccess(req, events, subjects, asOf)  ← demo/lib/auditlog.ts
  │           ↳ for each subject: reconstructSubject → evaluate → ALLOW list
  │
  └── ContextView ───────────────────────────────────────────────────────────
        Section 0: Policy Divergence (CTX-01)
          useWorld() → { subjects, resources }
          pickers: subject + resource (Select from demo/components/ui.tsx)
          evaluateWithPolicy(principal, req, policy) × 6 units  ← demo/lib/policy.ts
          6-unit grid (3-col × 2-row) of DecisionTrace
        Section A: Deployment / Support Obligation (CTX-02)
          useState<UnitId>(requester), useState<string>(subunitId)
          useState<Deployment>('HOME')  ← LOCAL, no world-state dispatch (D3-07)
          SUBUNITS from demo/lib/seed.ts
          evaluateSubunitAccess(requester, {...subunit, deployment})  ← demo/lib/obligations.ts
          ContextTrace (local component, not exported)
        Section B: Directional Shielding (CTX-03)
          useState<UnitId>(requester), useState<string>(resourceId)
          resources filtered from worldState.resources where shielded===true
          evaluateResourceAccess(requester, resource)  ← demo/lib/obligations.ts
          ContextTrace
```

### Recommended Project Structure

New files only — all under `frontend/src/demo/`:

```
frontend/src/demo/
├── DemoRoot.tsx            [EXTEND] ActiveView type + 2 new tab buttons
├── lib/
│   ├── auditlog.ts         [NEW] reconstructSubject, whoCanAccess — lifted from spikes/lib/auditlog.ts
│   ├── auditlog.test.ts    [NEW] ported from spikes/lib/auditlog.test.ts
│   ├── policy.ts           [NEW] evaluateWithPolicy, POLICIES — lifted from spikes/lib/policy.ts
│   ├── policy.test.ts      [NEW] ported from spikes/lib/policy.test.ts
│   ├── obligations.ts      [NEW] evaluateSubunitAccess, evaluateResourceAccess, SUBUNITS — lifted from spikes/lib/obligations.ts
│   ├── obligations.test.ts [NEW] ported from spikes/lib/obligations.test.ts
│   └── seed.ts             [EXTEND] add INITIAL_EVENTS, POLICIES export, SUBUNITS export
└── components/
    ├── AuditView.tsx       [NEW] audit tab root
    └── ContextView.tsx     [NEW] context tab root
```

### Pattern 1: Lift Verbatim, Swap Imports, Inject Parameters

The proven spike pattern (D-01): copy the lib file content, change only:
1. Import paths: `./data` → `./model` (types) and `./seed` (AGREEMENTS, SUBJECTS etc.)
2. Field names per D-10: `homeEntity` → `unit`, `ownerEntity` → `ownerUnit`, `EntityId` → `UnitId`
3. Parameters: replace module-level import of `SUBJECTS` with a `subjects: Subject[]` parameter (D3-13)

```typescript
// Source: spikes/lib/auditlog.ts (lift verbatim, then adapt)

// BEFORE (spike):
import { SUBJECTS, type Subject } from "./data";
export function reconstructSubject(subjectId: string, events: AttrEvent[], asOf: number): Subject | null {
  const base = SUBJECTS.find((s) => s.id === subjectId);
  // ...
}

// AFTER (demo/lib/auditlog.ts — D3-13 adaptation):
import type { Subject } from "./model";
export function reconstructSubject(
  subjectId: string,
  subjects: Subject[],      // ← injected, not imported
  events: AttrEvent[],
  asOf: number,
): Subject | null {
  const base = subjects.find((s) => s.id === subjectId);
  // ... rest verbatim
}
```

### Pattern 2: Authorization Rule Integration (D3-04)

The spike `auditlog.ts` calls `evaluate()` from `abac.ts`. Phase 3 must add the authorization-status check. The planner's choice per Claude's Discretion: the cleanest approach is a thin wrapper in `auditlog.ts` that calls `evaluate()` first and then applies the authorization check as a second pass — keeping `abac.ts` frozen (D-01 verbatim-lift guard).

```typescript
// demo/lib/auditlog.ts — authorization gate wrapper (D3-04)
// [ASSUMED] — planner may choose alternate integration approach

import { evaluate, principalFromSubject } from "./abac";
import type { Subject } from "./model";

function evaluateWithAuthorizationRule(subject: Subject, req: Requirement): Decision {
  const base = evaluate(principalFromSubject(subject), req);
  const auth = subject.authorization;
  if (auth && auth.status !== "AUTHORIZED") {
    return {
      ...base,
      decision: "DENY",
      rules: [
        ...base.rules,
        {
          name: "Authorization valid",
          pass: false,
          detail: `authorization.status=${auth.status} (requires AUTHORIZED)`,
        },
      ],
      failed: [...base.failed, "Authorization valid"],
    };
  }
  return base;
}
```

### Pattern 3: POLICIES Record for 6 Units (D3-06)

```typescript
// demo/lib/policy.ts — 6-unit POLICIES (lift + re-key from spike policy.ts)
// [ASSUMED] — exact policy flavor assignment per D3-06

import type { UnitId } from "./model";
import type { EntityPolicy } from "./model";

export const POLICIES: Record<UnitId, EntityPolicy> = {
  MILITARY_1: { id: "MILITARY_1", label: "Standard (all rules)", rules: { clearance: true, domainTier: true, needToKnow: true, affiliation: true } },
  MILITARY_2: { id: "MILITARY_2", label: "Standard (all rules)", rules: { clearance: true, domainTier: true, needToKnow: true, affiliation: true } },
  INTEL:      { id: "INTEL",      label: "Strict (TOP_SECRET floor)", rules: { clearance: true, domainTier: true, needToKnow: true, affiliation: true }, minClearanceFloor: "TOP_SECRET" },
  INFRA:      { id: "INFRA",      label: "Standard (all rules)", rules: { clearance: true, domainTier: true, needToKnow: true, affiliation: true } },
  INDUSTRY:   { id: "INDUSTRY",   label: "Relaxed (no NTK / no affiliation)", rules: { clearance: true, domainTier: true, needToKnow: false, affiliation: false } },
  HOME_GUARD: { id: "HOME_GUARD", label: "Standard (all rules)", rules: { clearance: true, domainTier: true, needToKnow: true, affiliation: true } },
};
```

### Pattern 4: SUBUNITS in seed.ts (D3-07, D3-08)

The spike `obligations.ts` defines `SUBUNITS` with 3 entries keyed to spike unit IDs. `seed.ts` must export a `SUBUNITS` array using the demo seed's subjects/units. The `fw2-subj` (Dr. Karin Moe, `unit: MILITARY_1`, `deployment: ABROAD`) is already seeded in `seed.ts` and is the natural deployment-contrast actor.

```typescript
// demo/lib/seed.ts — SUBUNITS export (adapt from obligations.ts, use demo subjects)
// [ASSUMED] — exact subunit IDs should mirror the spike structure for test porting

export const SUBUNITS: Subunit[] = [
  { id: "su-1", name: "1st Recon Coy",   unit: "MILITARY_1", deployment: "HOME" },
  { id: "su-2", name: "Field Hospital",  unit: "MILITARY_1", deployment: "ABROAD" },
  { id: "su-3", name: "2nd Armoured",    unit: "MILITARY_2", deployment: "HOME" },
];

export const SUPPORT_OBLIGATIONS: { from: UnitId; to: UnitId }[] = [
  { from: "INFRA",      to: "MILITARY_1" },
  { from: "MILITARY_2", to: "MILITARY_1" },
  { from: "INFRA",      to: "MILITARY_2" },
];
```

### Pattern 5: Baseline Events (D3-01)

```typescript
// demo/lib/seed.ts — INITIAL_EVENTS export (pre-seeded for AUDIT-01 baseline)
// Narrative: Dana (subj-1) gets AURORA (grant), a hold fires, hold clears, auth confirmed.

export const INITIAL_EVENTS: AttrEvent[] = [
  { seq: 1, subjectId: "subj-1",  op: "GRANT_COMPARTMENT",    value: "AURORA",   actor: "Access Approver / AO" },
  { seq: 2, subjectId: "subj-1",  op: "SET_HOLD",                                actor: "Security Officer" },
  { seq: 3, subjectId: "subj-1",  op: "CLEAR_HOLD",                              actor: "Security Officer" },
  { seq: 4, subjectId: "ca5-subj",op: "AUTHORIZE_SUBJECT",                        actor: "Manager / Supervisor" },
];
```

`world-state.tsx` must be extended so `seedWorld()` returns `events: INITIAL_EVENTS` instead of `events: []`. `seq` must be initialized to `INITIAL_EVENTS.length` (= 4) so subsequent actions continue the sequence without collision.

### Pattern 6: 4-Tab DemoRoot Extension (D3-09)

```typescript
// DemoRoot.tsx — extend ActiveView (D3-09)
type ActiveView = 'decisions' | 'federation' | 'audit' | 'context';
// Tab buttons: copy existing button JSX pattern × 2 additional buttons
// Labels: "Decision Explorer", "Federation Hub", "Audit", "Context"
// Default: 'decisions' (unchanged)
```

### Anti-Patterns to Avoid

- **Importing SUBJECTS directly in auditlog.ts** — breaks D3-13 testability. Always inject `subjects: Subject[]` as a parameter.
- **Dispatching `TOGGLE_DEPLOYMENT` to world-state** — explicitly out of scope per D3-07. Local `useState` only.
- **Hardcoding shielded resources in obligations.ts** — must source from `worldState.resources` filtered by `shielded===true` (D3-08).
- **Extending `abac.ts`** — it is frozen per D-01 (verbatim lift guard). Authorization rule goes in `auditlog.ts` evaluator wrapper.
- **Editing `routeTree.gen.ts`** — demo island is isolated, never touches the router (D-02).
- **Hand-editing `routeTree.gen.ts`** — it is auto-generated; the demo island uses a separate Vite entry (`demo/main.tsx`), not the app router.
- **Importing shadcn components into the demo island** — the UI-SPEC explicitly forbids this. Use `demo/components/ui.tsx` atoms only.
- **Resetting `seq` to 0 in seedWorld()** when INITIAL_EVENTS are pre-seeded — new events would collide with seq 1–4. Initialize seq to `INITIAL_EVENTS.length`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Point-in-time subject reconstruction | Custom replay engine | `reconstructSubject` from spike 007 (lift verbatim) | Already Vitest-green; handles all 4 `AttrOp`s correctly |
| Who-can-access query | Custom loop | `whoCanAccess` from spike 007 | Iterates all subjects with correct reconstructed state |
| Per-entity policy evaluation | Custom evaluator | `evaluateWithPolicy` from spike 008 | Handles clearance floor, toggleable rules, override ordering |
| Deployment obligation rule | Custom rule engine | `evaluateSubunitAccess` from spike 009 | Correct GRANT vs BASE vs DENY effect model |
| Directional shielding | Custom allowlist check | `evaluateResourceAccess` from spike 009 | Handles owner-always-passes edge case |
| Tab bar state management | Custom router | `useState<ActiveView>` in DemoRoot | Throwaway; Phase 4 shell absorbs it |
| UI atoms | Custom components | `Card`, `Pill`, `Field`, `Select`, `DecisionTrace` from `demo/components/ui.tsx` | UI-SPEC mandates reuse; no shadcn in demo island |

---

## Common Pitfalls

### Pitfall 1: `seq` initialization collision after pre-seeding events

**What goes wrong:** `seedWorld()` currently initializes `events: []` and `seq: 0`. If INITIAL_EVENTS (seq 1–4) are added but `seq` stays at 0, the first user action appends an event with `seq: 1`, which collides with the pre-seeded seq 1 entry. The slider replays in sequence order — duplicate seq values produce undefined replay order.

**Why it happens:** `appendEvent()` stamps `state.seq + 1` — it reads `state.seq`, not `events.length`. They must stay in sync.

**How to avoid:** In `seedWorld()`, set both `events: INITIAL_EVENTS` AND `seq: INITIAL_EVENTS.length`. If INITIAL_EVENTS has 4 entries, `seq` starts at 4.

**Warning signs:** The event list shows duplicate T-values; dragging slider to T=1 shows multiple entries as "applied."

### Pitfall 2: `reconstructSubject` base state is the current seed, not T=0 clean state

**What goes wrong:** The spike's `reconstructSubject` clones from `SUBJECTS` (the seed), which already has compartments applied (e.g., Dana has `["AURORA"]`). If `INITIAL_EVENTS` also grants AURORA (seq 1), the replay double-applies it. The dedup check in the spike (`if (!state.compartments.includes(e.value))`) prevents array duplication but may mislead the audit log display.

**Why it happens:** The baseline seed subjects are already in an "after-event" state for existing compartments (they represent Phase 1 initial world). Pre-seeded events should grant compartments that are NOT already in the base seed, OR the base seed should start from a clean state for the audited subject.

**How to avoid:** Choose INITIAL_EVENTS that tell a coherent narrative from a plausible pre-state. AURORA being already in subj-1's base seed means pre-seeding a GRANT_COMPARTMENT for AURORA creates a no-op (dedup prevents duplication). Better options: pre-seed BLACKWING (not in Dana's base), SET_HOLD/CLEAR_HOLD (always meaningful), AUTHORIZE_SUBJECT for ca5-subj.

**Warning signs:** The "Reconstructed state" card at T=0 already shows AURORA; the event list shows a GRANT_COMPARTMENT for AURORA at T=1; the panel looks identical at T=0 and T=1.

### Pitfall 3: `whoCanAccess` is O(n_subjects) — runs on every slider drag

**What goes wrong:** The demo has ~30 subjects. `whoCanAccess` reconstructs all of them on every slider tick. This is fine for the demo; but if wrapped in a React component without `useMemo`, it re-runs on every render (not just slider changes), which can cause UI lag.

**Why it happens:** Slider `onChange` triggers re-render; without memoization, derived computation re-runs.

**How to avoid:** Wrap `whoCanAccess` call in `useMemo([asOf, subjectId, resourceId, events])`. The resource picker add a second dependency dimension — `useMemo` must include the selected resource.

**Warning signs:** UI feels sluggish when mousing over other controls while slider is at an extreme.

### Pitfall 4: Policy evaluator uses spike's `EntityId` type, not demo's `UnitId`

**What goes wrong:** `policy.ts` from the spike imports `EntityId` from `./data`, which maps to `"ENTITY_A" | "ENTITY_B" | "ENTITY_C"`. Lifting verbatim without type-swapping causes TypeScript errors when keying `POLICIES` by `UnitId`.

**Why it happens:** The lift instruction says "verbatim" but `EntityId` is a spike-only type.

**How to avoid:** In `demo/lib/policy.ts`, replace `EntityId` → `UnitId` throughout, and import from `./model`. The POLICIES object changes from 3 keys to 6 UnitId keys (D3-06).

**Warning signs:** TypeScript compiler error on `POLICIES[unitId]` where `unitId: UnitId`.

### Pitfall 5: Shielded resources panel sources from hardcoded list instead of world-state

**What goes wrong:** If `ContextView.tsx` imports `RESOURCES_CTX` from `demo/lib/obligations.ts` (a local list), it won't reflect resources added via `RESOURCES.push(...)` in seed.ts expansion. The correct resources (`fw1-res`, `fw3-res`, `res-11`, `res-20`) are already in `worldState.resources`.

**Why it happens:** The spike's `evaluateResourceAccess` takes a `ContextResource` type which differs slightly from the demo's `Resource` type (spike has `ownerUnit` and `allowlist`; demo `Resource` also has these fields as optional).

**How to avoid:** Per D3-08, filter from `worldState.resources` where `shielded === true`. The `evaluateResourceAccess` function in `demo/lib/obligations.ts` should accept a `Resource` from `demo/lib/model.ts`, not the spike's `ContextResource` type. Adapter: `Resource` already has `shielded?: boolean` and `allowlist?: UnitId[]` — the function signature can accept `Resource` directly.

**Warning signs:** Shielding panel shows only 2 hardcoded resources; changing subjects in the Decision Explorer doesn't affect shielding panel options.

### Pitfall 6: `AUTHORIZE_SUBJECT` / `WITHDRAW_AUTHORIZATION` ops not handled in `reconstructSubject`

**What goes wrong:** The spike's `reconstructSubject` only handles 4 ops: `GRANT_COMPARTMENT`, `REVOKE_COMPARTMENT`, `SET_HOLD`, `CLEAR_HOLD`. The demo `AttrOp` has 4 additional ops including `AUTHORIZE_SUBJECT` and `WITHDRAW_AUTHORIZATION`. If these appear in `events[]` (from the pre-seeded baseline or from world-state actions) and `reconstructSubject` doesn't handle them, it silently ignores them — the authorization status panel won't update on slider drag.

**Why it happens:** The spike was written before D-11 was resolved. The lift is verbatim from the spike, which doesn't know about authorization lifecycle events.

**How to avoid:** In `demo/lib/auditlog.ts`, add cases for `AUTHORIZE_SUBJECT` and `WITHDRAW_AUTHORIZATION` to the `reconstructSubject` switch block. These ops must mutate `subject.authorization.status` in the cloned subject.

**Warning signs:** Dragging the slider past an `AUTHORIZE_SUBJECT` event doesn't change the Authorization pill in the Reconstructed State panel.

---

## Code Examples

### Reconstructed Subject — extended switch for D-11 ops

```typescript
// Source: adapted from spikes/lib/auditlog.ts + model.ts D-11 ops
// demo/lib/auditlog.ts — switch additions for authorization lifecycle

case "AUTHORIZE_SUBJECT":
  if (state.authorization) {
    state.authorization = { ...state.authorization, status: "AUTHORIZED" };
  }
  break;
case "WITHDRAW_AUTHORIZATION":
  if (state.authorization) {
    state.authorization = { ...state.authorization, status: "WITHDRAWN" };
  }
  break;
// SET_REVOKED / CLEAR_REVOKED already in AttrOp — add if needed:
case "SET_REVOKED":
  state.flags.revoked = true;
  break;
case "CLEAR_REVOKED":
  state.flags.revoked = false;
  break;
```

### AuditView — slider wiring skeleton

```typescript
// Source: adapted from spikes/components/Spike007Audit.tsx
// demo/components/AuditView.tsx

export function AuditView() {
  const { events, subjects, resources } = useWorld();
  const [asOf, setAsOf] = useState(events.length);  // D3-03: default = now
  const [subjId, setSubjId] = useState(subjects[0].id);
  const [resId, setResId] = useState(resources[0].id);

  const reconstructed = useMemo(
    () => reconstructSubject(subjId, subjects, events, asOf),
    [subjId, subjects, events, asOf]
  );
  const req = useMemo(
    () => requirementFromResource(resources.find((r) => r.id === resId)!),
    [resId, resources]
  );
  const canAccess = useMemo(
    () => whoCanAccess(req, events, subjects, asOf),
    [req, events, subjects, asOf]
  );

  return (
    // ... slider, event list, reconstructed state card, who-can-access card
    // See 03-UI-SPEC.md for exact class strings and copy
  );
}
```

### ContextView — policy divergence grid skeleton

```typescript
// Source: adapted from spikes/components/Spike008Policy.tsx
// demo/components/ContextView.tsx (policy divergence section)

const UNIT_IDS = Object.keys(UNITS) as UnitId[]; // 6 units

// Inside render:
const principal = principalFromSubject(subjects.find(s => s.id === subjId)!);
const req = requirementFromResource(resources.find(r => r.id === resId)!);
const results = UNIT_IDS.map(uid => ({
  unit: uid,
  policy: POLICIES[uid],
  decision: evaluateWithPolicy(principal, req, POLICIES[uid]),
}));

// grid-cols-3 gap-4 (two rows of 3)
// Each cell: unit label, policy label (text-xs text-slate-400), DecisionTrace
```

---

## Integration Points — Exact Files to Touch

| File | Action | What Changes |
|------|--------|--------------|
| `demo/DemoRoot.tsx` | EXTEND | `type ActiveView` gains `'audit' | 'context'`; 2 new tab buttons; render `<AuditView />` / `<ContextView />` |
| `demo/lib/seed.ts` | EXTEND | Export `INITIAL_EVENTS`, `POLICIES`, `SUBUNITS`, `SUPPORT_OBLIGATIONS` |
| `demo/store/world-state.tsx` | EXTEND | `seedWorld()`: `events: INITIAL_EVENTS`, `seq: INITIAL_EVENTS.length` |
| `demo/lib/auditlog.ts` | CREATE | Lift from `spikes/lib/auditlog.ts`; inject `subjects` param; add D-11 ops; add authorization-status rule |
| `demo/lib/auditlog.test.ts` | CREATE | Port from `spikes/lib/auditlog.test.ts`; adapt to UnitId + `subjects` param |
| `demo/lib/policy.ts` | CREATE | Lift from `spikes/lib/policy.ts`; re-key to UnitId; 6-entry POLICIES (D3-06) |
| `demo/lib/policy.test.ts` | CREATE | Port from `spikes/lib/policy.test.ts`; adapt entity IDs to UnitId |
| `demo/lib/obligations.ts` | CREATE | Lift from `spikes/lib/obligations.ts`; re-key UnitId; accept `Resource` from model.ts |
| `demo/lib/obligations.test.ts` | CREATE | Port from `spikes/lib/obligations.test.ts`; adapt UnitId fixtures |
| `demo/components/AuditView.tsx` | CREATE | Audit tab root: slider + event list + reconstructed state + who-can-access |
| `demo/components/ContextView.tsx` | CREATE | Context tab root: policy divergence + deployment toggle + shielding |

**Files that must NOT be touched:**
- `demo/lib/abac.ts` — frozen verbatim lift (D-01)
- `demo/lib/model.ts` — frozen schema (D-05)
- `frontend/src/routeTree.gen.ts` — never hand-edit; demo island uses separate Vite entry
- Any file in `frontend/src/spikes/` — historical reference only

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|-----------------|--------|
| Spike: `SUBJECTS` imported at module level | Demo: `subjects: Subject[]` injected as param (D3-13) | Functions testable without module-level side effects |
| Spike: 3-entity `EntityId` type | Demo: 6-unit `UnitId` type (D-10) | All POLICIES, SUBUNITS, SUPPORT_OBLIGATIONS re-keyed |
| Spike: `events: []` (no baseline) | Demo: `INITIAL_EVENTS` pre-seeded (D3-01) | Audit view has content on first load |
| Spike: no authorization rule | Demo: D3-04 authorization-status rule wired | `ca5-subj` fixture demonstrates authorization-gap DENY |
| Phase 2: 2-tab DemoRoot toggle | Phase 3: 4-tab DemoRoot toggle (D3-09) | Throwaway; Phase 4 shell absorbs |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Authorization rule integration: thin wrapper in `auditlog.ts` calling `evaluate()` then applying status check | Architecture Patterns § Pattern 2 | Low — Claude's Discretion; planner can choose alternate approach (parallel evaluator) |
| A2 | INITIAL_EVENTS uses BLACKWING grant for subj-1 (not AURORA, which is already seeded) to avoid dedup no-op | Common Pitfalls § Pitfall 2 | Low — narrative may need adjustment; the key constraint is events tell a coherent story |
| A3 | `evaluateResourceAccess` in `demo/lib/obligations.ts` accepts `Resource` from `demo/lib/model.ts` directly (not a separate `ContextResource` type) | Architecture Patterns § Anti-Patterns | Low — if type mismatch, a thin adapter is 2 lines |
| A4 | SUBUNITS in seed.ts uses `su-1`, `su-2`, `su-3` IDs matching spike (for test portability) | Code Examples § SUBUNITS | Low — IDs are internal; only matters for test fixture cross-referencing |

---

## Open Questions

1. **Authorization rule: wrapper vs. augmented `evaluate` signature**
   - What we know: `abac.ts` is frozen; authorization rule must live in `auditlog.ts`; Claude's Discretion.
   - What's unclear: Whether a thin wrapper (call `evaluate()` then apply authorization check) or a separate exported function `evaluateForAudit()` is cleaner for testing.
   - Recommendation: Thin wrapper is simpler and keeps tests focused on the new rule. Export it as `evaluateWithAuth(subject, req)` from `auditlog.ts`.

2. **Subject picker scope in AuditView**
   - What we know: Spike 007 hardcodes to Dana (subj-1). Phase 3 should allow picking any subject (per the richer seed).
   - What's unclear: Whether to show all ~30 subjects or filter to a narratively interesting subset.
   - Recommendation: Show all subjects from `worldState.subjects`. The dropdown is filterable by the viewer; the ca5-subj contrast actor is specifically worth finding.

---

## Environment Availability

Step 2.6: SKIPPED — Phase 3 is entirely within the frontend demo island. No external services, CLIs, databases, or build tools beyond what is already confirmed present (Node.js, npm, Vite). No new tool dependencies introduced.

---

## Validation Architecture

`workflow.nyquist_validation` is `false` in `.planning/config.json`. This section is skipped per config.

Tests are still authored per D3-14 (project convention), but the nyquist sampling protocol does not gate plan steps. Tests run via `npm test` in the frontend directory.

---

## Security Domain

This phase adds no authentication, authorization endpoints, user input processing, cryptography, or network calls. It is a pure frontend demo island with in-memory seeded data. The demo island already carries a `[DEMO / MOCK]` banner per MODEL-03.

ASVS categories: not applicable to this phase. No security domain section required.

---

## Sources

### Primary (HIGH confidence)
- `frontend/src/spikes/lib/auditlog.ts` — source of truth for `reconstructSubject`, `whoCanAccess`, `AttrEvent`, `AccessRow` — read in full
- `frontend/src/spikes/lib/policy.ts` — source of truth for `evaluateWithPolicy`, `EntityPolicy`, `POLICIES` — read in full
- `frontend/src/spikes/lib/obligations.ts` — source of truth for `evaluateSubunitAccess`, `evaluateResourceAccess`, `SUBUNITS`, `RESOURCES_CTX` — read in full
- `frontend/src/spikes/lib/auditlog.test.ts`, `policy.test.ts`, `obligations.test.ts` — test fixtures to port — read in full
- `frontend/src/demo/store/world-state.tsx` — confirmed `events: AttrEvent[]`, `seq`, `seedWorld()` shape — read in full
- `frontend/src/demo/lib/model.ts` — confirmed `AttrOp` extensions (D-11 ops), `EntityPolicy`, `Subunit`, `Deployment`, `Resource.shielded`, `Resource.allowlist` — read in full
- `frontend/src/demo/lib/seed.ts` — confirmed existing subjects, resources, `ca5-subj` authorization fixture — read in full
- `frontend/src/demo/lib/abac.ts` — confirmed `evaluate`, `principalFromSubject`, `requirementFromResource` API — read in full
- `frontend/src/demo/components/ui.tsx` — confirmed all atom component APIs — read in full
- `frontend/src/demo/DemoRoot.tsx` — confirmed Phase 2 tab toggle pattern — read in full
- `frontend/src/spikes/components/Spike007Audit.tsx`, `Spike008Policy.tsx`, `Spike009Context.tsx` — confirmed UI reference patterns — read in full
- `.planning/phases/03-audit-context/03-CONTEXT.md` — all locked decisions D3-01 through D3-14 — read in full
- `.planning/phases/03-audit-context/03-UI-SPEC.md` — interaction contracts, color/spacing/typography — read in full
- `.planning/AUTH-MODEL.md` — §3 pure-computed ABAC, §10–11 audit/context mechanics — read in full
- `.planning/config.json` — `nyquist_validation: false` confirmed — read in full

### Secondary (MEDIUM confidence)
- `frontend/src/demo/lib/seed.ts` — `INITIAL_EVENTS` narrative choice (A2) is a researcher recommendation, not a locked decision

---

## Metadata

**Confidence breakdown:**
- Lift targets (spike libs, demo libs): HIGH — all files read, APIs confirmed
- Integration points (what to extend): HIGH — all files read, exact field names confirmed
- Authorization rule integration pattern: MEDIUM — Claude's Discretion; two valid approaches exist (A1)
- INITIAL_EVENTS narrative: MEDIUM — constrained by Pitfall 2 reasoning; exact events are researcher recommendation

**Research date:** 2026-05-22
**Valid until:** Stable for milestone duration — no external dependencies; all source is in-repo
