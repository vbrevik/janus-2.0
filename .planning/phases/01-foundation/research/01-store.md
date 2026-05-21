# Phase 1 Research — Shared World-State Store (single `useReducer`)

**Researched:** 2026-05-21
**Angle:** Store shape, reducer action set, live recompute, Context exposure, role→ops gating, risks
**Domain:** React 19 in-memory state management for the ABAC demo foundation
**Confidence:** HIGH (substrate is in-repo and Vitest-green; pattern is the official React.dev split-context recipe)

## User Constraints (from CONTEXT.md — LOCKED)

- **MODEL-02:** ONE shared in-memory world-state store, single source of truth. `useReducer` only. NO new state library (no Redux/Zustand/Jotai/etc.). `[VERIFIED: 01-CONTEXT.md, REQUIREMENTS.md]`
- **D-01:** Lift the proven engine (`abac.ts`) *verbatim*; unify the fragmented per-spike data files into ONE world-state model + reducer. Do NOT rebuild the engine. `[CITED: 01-CONTEXT.md D-01]`
- **D-05:** Model the FULL 6-unit schema now (base ABAC fields + Phase 2/3 fields) so the store is never reshaped later. Phase 1 only *evaluates* base ABAC rules. `[CITED: D-05]`
- **D-07:** TWO separate selectors — operating-role (1 of 8, governs ACTION set) ≠ ABAC target (subject + resource + domain). `[CITED: D-07]`
- **D-08:** Operating-role switcher lives in a persistent global header; `currentRole` held in the shared store. `[CITED: D-08]`
- **D-09:** Single Decision Explorer view; role-driven action panel mutates attributes in the store and recomputes live. `[CITED: D-09]`
- **Claude's discretion:** internal reducer action shape + store slicing (constrained only by MODEL-02 + D-05); reuse spike `TIERS`.
- **Anti-pattern (locked, abac-engine.md):** never store the computed decision; never collapse per-domain tiers; revocation = deny override, not a deleted grant.

## Phase Requirements (this angle supports)

| ID | Description | Store support |
|----|-------------|---------------|
| MODEL-02 | One shared in-memory world-state store (useReducer, no new lib) | The entire store design below |
| ROLE-01 | Act as any of 8 roles; available actions change by role | `currentRole` slice + `roleDef.ops.includes(op)` gating |
| ROLE-02 | Approver grants/revokes, Manager only requests, Sec Officer holds, others none | Action set mapping (§Action Set) + SoD empty state |

---

## Summary

The spikes already proved every primitive (engine, role-ops map, deny overrides, event-replay log). The Phase 1 store work is **consolidation, not invention**: collapse the fragmented per-component `useState` (`compartments`, `hold`, `log` scattered across `Spike001Abac.tsx` / `Spike004Sod.tsx`) into ONE `useReducer` that owns world data, `currentRole`, and `abacTarget`, then expose it via the official React.dev split-context pattern (state context + dispatch context). The decision stays **derived** — computed inside the Decision Explorer with `useMemo` over the store slices — never written back into state.

The single most important shape decision: subject attributes (`compartments`, `flags.securityHold`, `flags.revoked`) live in the store as **mutable subject records**, and the engine is called against the *current* store snapshot every render. Mutations (grant/revoke/hold) edit the subject record AND append an event to the log. The log entry should match the spike `AttrEvent` shape (`seq`, `subjectId`, `op`, `value`, `actor`) so Phase 3 audit-reconstruction (`reconstructSubject` / `whoCanAccess` already in `auditlog.ts`) plugs in unchanged.

**Primary recommendation:** ONE `useReducer` + split Context (StateContext + DispatchContext); reducer holds `{ subjects, resources, units/entities, eventLog, currentRole, abacTarget }`; six core actions (`SET_ROLE`, `SET_TARGET`, `APPROVE_ATTRIBUTE`, `REVOKE_ATTRIBUTE`, `REQUEST_ATTRIBUTE`, `TOGGLE_SECURITY_HOLD`); decision derived via `useMemo(evaluate(...))` in the Explorer, never stored.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| World data ownership (subjects/resources/entities/log) | Store (reducer state) | — | Single source of truth per MODEL-02 |
| Operating role selection | Store (`currentRole`) | Global header (UI) | D-08: role held in store, switched from header |
| ABAC target selection | Store (`abacTarget`) | Decision Explorer (UI) | D-09: target selector inside decision surface |
| Decision computation | Derived (`evaluate()` + `useMemo`) | — | Pure-computed; storing it is the documented anti-pattern |
| Action availability (SoD) | Derived (`roleDef.ops.includes(op)`) | UI (button render) | Role gating is read-only over store + static ROLES map |
| Event log append | Store (reducer, on every mutation) | — | Eventual system-of-record (Phase 3) |

---

## 1. Store Shape

### What lives IN the store (mutable, single source of truth)

```ts
interface WorldState {
  // --- World data (MODEL-01, D-04/D-05/D-06 — full 6-unit schema, seeded) ---
  units: Unit[];            // 6 canonical units (the EntityId set, expanded from 3→6+)
  subjects: Subject[];      // ~5+/unit; compartments + flags MUTATE here
  resources: Resource[];    // ~5+/unit; incl. Phase 2/3 shielding fields (seeded, unevaluated in P1)
  eventLog: EventEntry[];   // append-only; the eventual system-of-record (Phase 3)

  // --- UI/selection state (D-07: two SEPARATE selectors) ---
  currentRole: RoleId;      // operating role — governs ACTION set (D-08, in header)
  abacTarget: {             // ABAC evaluation target (D-09, in Explorer)
    subjectId: string | null;
    resourceId: string | null;
    domain: Domain | null;  // can derive from resource; explicit per D-07 wording
  };
}
```

### What is DERIVED (never stored)

| Derived value | How computed | Where |
|---------------|--------------|-------|
| **The decision** (`Decision`) | `evaluate(principalFromSubject(subject), requirementFromResource(resource))` | Decision Explorer, `useMemo` |
| `DecisionTrace` rows | inside the `Decision` object | Explorer render |
| Which action buttons render | `ROLES[currentRole].ops.includes(op)` | Action panel render |
| Resolved subject/resource objects | `subjects.find(s => s.id === abacTarget.subjectId)` | selectors / `useMemo` |
| "who can access R as of T" | `whoCanAccess(req, eventLog, asOf)` (Phase 3) | not Phase 1, but log shape must support it |

**Rule:** the decision is a *function of* `(subject snapshot, resource snapshot)`. Both are already in the store. Caching the decision in the store creates a second source of truth that drifts — this is the locked anti-pattern (abac-engine.md "What to Avoid"). `[CITED: abac-engine.md]`

### D-05 schema-now note (forward-compat, do NOT reshape later)

Seed these fields on `Subject`/`Resource`/`Unit` in Phase 1 even though the engine ignores them until Phase 2/3 (so the store is never re-shaped): resource shielding flags, deployment status (home/abroad), territory, per-entity policy refs, entity affiliation, deny-override flags. The current spike `Subject`/`Resource` interfaces are the *base*; extend them, don't replace. `[CITED: D-05]`

> **Schema note for the planner:** the spike substrate hard-codes `EntityId = ENTITY_A|B|C` and only 3 entities. Phase 1 must expand this to the 6 canonical units (2 military, intelligence, infra/inventory, industry, home guard) per MODEL-01/D-04. Keep `AGREEMENTS` and `entityName()` driven off the expanded set. `[VERIFIED: spikes/lib/data.ts vs MODEL-01]`

---

## 2. Action Set (reducer actions)

Six actions cover all of ROLE-01/02 + the two selectors. Each mutation **also appends to `eventLog`** (do this *inside* the reducer so the log can never drift from state).

| Action | Payload | State mutated | Logs? | Authorized role (SoD) |
|--------|---------|---------------|-------|----------------------|
| `SET_ROLE` | `{ role: RoleId }` | `currentRole` | no (UI selection, not a world event) | any viewer |
| `SET_TARGET` | `{ subjectId?, resourceId?, domain? }` | `abacTarget` (partial merge) | no | any viewer |
| `APPROVE_ATTRIBUTE` | `{ subjectId, compartment }` | adds compartment to subject → flips DENY→ALLOW | **yes** (`GRANT_COMPARTMENT`) | Approver only (`approve_attribute`) |
| `REVOKE_ATTRIBUTE` | `{ subjectId, compartment }` | removes compartment from subject | **yes** (`REVOKE_COMPARTMENT`) | Approver only (`revoke_attribute`) |
| `REQUEST_ATTRIBUTE` | `{ subjectId, compartment }` | **none** — log only | **yes** (request, "awaiting Approver") | Manager only (`request_attribute`) |
| `TOGGLE_SECURITY_HOLD` | `{ subjectId }` | toggles `subject.flags.securityHold` → deny override flips ALLOW→DENY | **yes** (`SET_HOLD`/`CLEAR_HOLD`) | Security Officer only (`flag_risk`) |

**Mutation semantics (lifted verbatim from `Spike004Sod.tsx`):**
- Approve = `compartments.includes(c) ? c : [...c, comp]` (idempotent add).
- Revoke = `compartments.filter(x => x !== comp)` — does **not** delete a grant row (there are none); the engine's need-to-know rule recomputes to DENY. `[CITED: abac-engine.md]`
- Hold = toggle `flags.securityHold`; the engine's deny-override branch (`abac.ts` L114-120) forces DENY even when base rules pass (ENGINE-03). `[VERIFIED: spikes/lib/abac.ts]`
- Request = pure log append, zero state change — this is the SoD crux (Manager cannot mutate). `[CITED: roles-sod.md]`

### Event log entry shape (align with Phase 3 `auditlog.ts`)

The store's `eventLog` should be a superset of the spike `AttrEvent` so `reconstructSubject`/`whoCanAccess` work unchanged in Phase 3:

```ts
interface EventEntry {
  seq: number;          // monotonic, append-only (reducer increments)
  t: string;            // human time HH:MM:SS for the live log UI (from Spike004)
  actor: string;        // ROLES[currentRole].label — who acted (audit trail)
  op: AttrOp | "REQUEST"; // GRANT_COMPARTMENT | REVOKE_COMPARTMENT | SET_HOLD | CLEAR_HOLD | REQUEST
  subjectId: string;
  value?: Compartment;  // present for compartment ops
  detail: string;       // prose line for the live log ("approved attribute: BLACKWING granted to Dana")
}
```

> `seq` is the field Phase 3 needs (`reconstructSubject(... asOf)`); add it now even though Phase 1 only renders the live log. `[VERIFIED: spikes/lib/auditlog.ts AttrEvent]`

### Reducer skeleton (illustrative — planner owns final shape)

```ts
function worldReducer(state: WorldState, action: Action): WorldState {
  switch (action.type) {
    case "SET_ROLE":
      return { ...state, currentRole: action.role };
    case "SET_TARGET":
      return { ...state, abacTarget: { ...state.abacTarget, ...action.patch } };
    case "APPROVE_ATTRIBUTE":
      return appendLog(mutateSubject(state, action.subjectId,
        s => ({ ...s, compartments: addOnce(s.compartments, action.compartment) })),
        { op: "GRANT_COMPARTMENT", subjectId: action.subjectId, value: action.compartment,
          detail: `approved attribute: ${action.compartment} granted` });
    // REVOKE_ATTRIBUTE / TOGGLE_SECURITY_HOLD mirror this; REQUEST_ATTRIBUTE = appendLog only
  }
}
```

Helpers (`mutateSubject`, `appendLog`, `addOnce`) keep each case ~3 lines and prevent reducer bloat (see Risks). The reducer must be a **pure function** (no `Date.now()` side effects inline if you want it testable — pass `t`/`seq` via a small clock or compute deterministically; spike used `new Date().toISOString().slice(11,19)`). `[VERIFIED: Spike004Sod.tsx]`

---

## 3. Live Recompute Pattern (React 19)

The decision is recomputed from store slices on every relevant change — **never** cached in state.

```tsx
// Inside DecisionExplorer (D-09)
const { subjects, resources, abacTarget } = useWorldState();
const subject  = subjects.find(s => s.id === abacTarget.subjectId);
const resource = resources.find(r => r.id === abacTarget.resourceId);

const result = useMemo(
  () => (subject && resource)
    ? evaluate(principalFromSubject(subject), requirementFromResource(resource))
    : null,
  [subject, resource]   // recompute when either snapshot changes
);
// render <DecisionTrace result={result} />
```

**Why this is correct & current (React 19):**
- `useMemo` here is a *legibility/clarity* optimization, not correctness — `evaluate()` is pure and cheap, so even calling it inline every render is fine. The dependency array `[subject, resource]` recomputes whenever a grant/revoke/hold action replaces the subject object (reducers return new objects → new reference → memo invalidates). `[VERIFIED: Spike001Abac.tsx, Spike004Sod.tsx use this exact pattern]`
- React 19 does NOT change this idiom. (The React Compiler can auto-memoize, but it is opt-in and not assumed here; manual `useMemo` is still the documented baseline.) `[CITED: react.dev/learn/scaling-up-with-reducer-and-context]`
- **Reducer purity matters:** because mutating actions return *new* subject objects (spread, not in-place mutation), the `find()` result is a new reference and `useMemo` re-fires. If the reducer mutated subjects in place, the memo would NOT invalidate — a subtle bug. The planner must enforce immutable updates in `mutateSubject`. `[VERIFIED: derived from useMemo reference-equality semantics]`

**Anti-pattern to forbid in plan:** a `case "RECOMPUTE": return { ...state, decision }` action, or storing `result` via `useState` + `useEffect`. Both reintroduce the drift the model bans. `[CITED: abac-engine.md "What to Avoid"]`

---

## 4. Exposure Pattern (Context + reducer, no prop-drilling, no new lib)

Use the **official React.dev split-context pattern**: one provider, two contexts (state + dispatch). This is the canonical no-library approach and matches how the project already does `AuthContext`. `[CITED: react.dev/learn/scaling-up-with-reducer-and-context]`

```tsx
// demo/store/world-context.tsx
const WorldStateContext = createContext<WorldState | null>(null);
const WorldDispatchContext = createContext<React.Dispatch<Action> | null>(null);

export function WorldProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(worldReducer, undefined, initWorld); // initWorld = seed
  return (
    <WorldStateContext.Provider value={state}>
      <WorldDispatchContext.Provider value={dispatch}>
        {children}
      </WorldDispatchContext.Provider>
    </WorldStateContext.Provider>
  );
}

export function useWorldState() {
  const ctx = useContext(WorldStateContext);
  if (!ctx) throw new Error("useWorldState must be used within WorldProvider");
  return ctx;
}
export function useWorldDispatch() {
  const ctx = useContext(WorldDispatchContext);
  if (!ctx) throw new Error("useWorldDispatch must be used within WorldProvider");
  return ctx;
}
```

**Wiring (mirrors `spikes/main.tsx` isolated entry — D-02):**

```tsx
// demo/main.tsx → demo.html (NEW Vite input, no routeTree.gen.ts change)
createRoot(root).render(
  <StrictMode>
    <WorldProvider>
      <DemoBanner />        {/* [DEMO/MOCK] non-dismissable (MODEL-03) */}
      <GlobalHeader />      {/* role switcher → dispatch SET_ROLE (D-08) */}
      <DecisionExplorer />  {/* target selector + trace + action panel (D-09) */}
    </WorldProvider>
  </StrictMode>
);
```

- **Header** consumes `useWorldState()` (to show current role) + `useWorldDispatch()` (to `SET_ROLE`).
- **Explorer** consumes both (read slices, dispatch mutations). No props pass between header and explorer — they share state through context only (eliminates prop-drilling). `[VERIFIED: matches AuthContext pattern in repo]`
- **Why split dispatch from state:** components that only dispatch (e.g. action buttons) don't re-render on unrelated state changes; React.dev's documented perf benefit. Optional for a demo this size, but free and idiomatic. `[CITED: react.dev; blog.axlight.com]`
- `WorldProvider` registers `demo.html` as a Vite build input in `vite.config.ts` — same isolation as `spikes.html` (`build.rollupOptions.input`). DEMO-04 (prod build registration) is Phase 4, but the dev entry exists from Phase 1. `[CITED: 01-CONTEXT.md integration points; VERIFIED: spikes.html pattern]`

---

## 5. Role → Ops Gating (SoD)

The action panel renders buttons **purely** from `ROLES[currentRole].ops` — the exact `Spike004Sod.tsx` recipe, now reading `currentRole` from the store instead of local `useState`. `[VERIFIED: Spike004Sod.tsx L31-32, 105-151]`

```tsx
const role = useWorldState().currentRole;
const dispatch = useWorldDispatch();
const can = (op: Op) => ROLES[role].ops.includes(op);

{can("approve_attribute") && <button onClick={() => dispatch({ type:"APPROVE_ATTRIBUTE", ... })}>Approve: grant</button>}
{can("revoke_attribute")  && <button onClick={() => dispatch({ type:"REVOKE_ATTRIBUTE", ... })}>Revoke</button>}
{can("flag_risk")         && <button onClick={() => dispatch({ type:"TOGGLE_SECURITY_HOLD", ... })}>Place/clear hold</button>}
{can("request_attribute") && <button onClick={() => dispatch({ type:"REQUEST_ATTRIBUTE", ... })}>Request (cannot grant)</button>}

{/* SoD empty state — explicit, REQUIRED (roles-sod.md, ROLE-02) */}
{!can("approve_attribute") && !can("revoke_attribute") && !can("flag_risk") && !can("request_attribute") && (
  <p>This role holds no access-decision authority — separation of duties.
     {can("view_eval") || can("view_all_readonly") ? " Read-only visibility only." : ""}</p>
)}
```

**Role → action mapping (from `ROLES` map, MODEL §7/§8):** `[VERIFIED: spikes/lib/data.ts ROLES]`

| Role | ops | Action buttons | Decision authority |
|------|-----|----------------|--------------------|
| Access Approver | `approve_attribute, revoke_attribute, view_eval` | Grant / Revoke | **YES** (only grantor) |
| Security Officer | `flag_risk, manage_annotations, view_eval` | Place/clear hold | Flag only (deny override) |
| Manager/Supervisor | `request_attribute, view_team` | Request (no mutation) | Request only |
| Auditor | `view_eval, view_all_readonly` | none | Read-only log |
| System Admin | `manage_users, view_config` | none | **NONE** (strict SoD) |
| Personnel/Org Mgr | `edit_identity` | none | NONE |
| Sponsor | `view_own_org` | none | NONE |
| Subject | `view_self` | none | NONE |

The SoD legibility comes from **varying the action set only** — one shared decision, one `DecisionTrace`. Do not fork the engine or the trace per role. `[CITED: roles-sod.md step 3]`

---

## 6. Risks

| Risk | Why it bites | Mitigation |
|------|-------------|------------|
| **Storing the computed decision** (locked anti-pattern) | Second source of truth drifts from attributes; "current access is not stored" is core to the model | Decision is `useMemo(evaluate(...))` in the Explorer only; forbid any `decision` field in `WorldState` and any `RECOMPUTE` action. `[CITED: abac-engine.md]` |
| **In-place subject mutation** breaks recompute | `useMemo([subject])` won't invalidate if reducer mutates the existing object; UI shows stale ALLOW/DENY | Reducer returns NEW subject objects (spread). Add a Vitest test: dispatch APPROVE → assert new subject reference + flipped decision. |
| **Reducer bloat** (D-06 rich seed × full schema) | A fat switch with inline log construction becomes unreadable and untestable | Keep ≤6 actions; extract `mutateSubject`/`appendLog`/`addOnce` helpers; keep the reducer pure (deterministic `seq`); unit-test the reducer separately from React. |
| **SoD violation — exposing grant to wrong role** | Wiring a button outside its `can(op)` guard, or giving Admin/Manager `approve_attribute` | Enforce gating ONLY via `ROLES[role].ops.includes(op)`; never inline `role === "..."` checks; keep the `ROLES` map the single authority. Test: for each role, assert the rendered op set == `ROLES[role].ops`. `[CITED: roles-sod.md "What to Avoid"]` |
| **Manager mutation leak** | Accidentally mutating state in `REQUEST_ATTRIBUTE` | `REQUEST_ATTRIBUTE` MUST be log-append only — assert in a reducer test that `subjects` is reference-unchanged after a request. |
| **Editing clearance in-app** | Clearance is external/read-only; no action should write it | No `SET_CLEARANCE` action exists; clearance is a seeded, immutable attribute. `[CITED: AUTH-MODEL §4/§8]` |
| **Two-selector confusion** (D-07) | Conflating `currentRole` with `abacTarget.subjectId` (acting-as-role vs subject-under-evaluation) | Separate store slices + separate UI surfaces (header vs Explorer); never derive one from the other. The role you *act as* ≠ the subject you *evaluate*. `[CITED: D-07, AUTH-MODEL §6]` |
| **Single context re-render storms** | One combined context value re-renders every consumer on any change | Split state/dispatch contexts (above). Demo-scale impact is small, but it's free and idiomatic. `[CITED: react.dev]` |

## Don't Hand-Roll

| Problem | Don't build | Use instead | Why |
|---------|-------------|-------------|-----|
| State container | Custom store/Zustand/Redux | `useReducer` + split Context | MODEL-02 forbids new libs; React.dev pattern is sufficient |
| ABAC evaluation | New evaluator | `evaluate()` from `abac.ts` verbatim | D-01; Vitest-green; rebuilding risks reintroducing fixed bugs |
| Decision trace UI | New trace renderer | `DecisionTrace` from `spikes/components/ui.tsx` | One shared trace = SoD legibility (roles-sod.md) |
| Audit reconstruction | New replay logic | Phase 3 reuses `auditlog.ts`; just match `EventEntry`⊇`AttrEvent` now | Forward-compat; don't reshape the log later |

## Code Examples (verified sources)

All patterns above are lifted from in-repo, Vitest-green sources:
- `evaluate()` + deny overrides — `frontend/src/spikes/lib/abac.ts` `[VERIFIED]`
- Role-ops gating + grant/revoke/hold/request handlers + SoD empty state — `frontend/src/spikes/components/Spike004Sod.tsx` `[VERIFIED]`
- Live `useMemo(evaluate(...))` recompute — `frontend/src/spikes/components/Spike001Abac.tsx` `[VERIFIED]`
- `ROLES`/`TIERS`/`Subject`/`Resource`/`AttrEvent` shapes — `frontend/src/spikes/lib/data.ts`, `auditlog.ts` `[VERIFIED]`
- Isolated Vite entry — `frontend/spikes.html` + `frontend/src/spikes/main.tsx` `[VERIFIED]`

## State of the Art

| Old (spikes) | New (Phase 1 store) | Why |
|--------------|---------------------|-----|
| Per-component `useState` (`compartments`, `hold`, `log` in each spike) | ONE `useReducer` world-state | MODEL-02 single source of truth; cross-view consistency (DEMO-02 later) |
| `role` in local `useState` (Spike004) | `currentRole` in store, switched from global header | D-07/D-08 |
| 3 hard-coded entities (A/B/C) | 6 canonical units (full schema, D-05) | MODEL-01/D-04 |
| Local `LogEntry {t, actor, action}` | `EventEntry` ⊇ spike `AttrEvent {seq, op, value, ...}` | Phase 3 reconstruction reuse |

## Assumptions Log

| # | Claim | Section | Risk if wrong |
|---|-------|---------|---------------|
| A1 | Split state/dispatch contexts (vs one combined context) — recommended but optional at demo scale | §4 Exposure | LOW: a single context also works; perf only |
| A2 | `domain` belongs in `abacTarget` even though derivable from the resource | §1 Store shape | LOW: D-07 lists domain as a target dimension; keeping it explicit matches the wording. Planner may derive it instead. |
| A3 | Reducer should compute `seq`/`t` deterministically for testability (spike used `new Date()` inline) | §2/§3 | LOW: cosmetic; impacts only how reducer tests are written |

## Open Questions

1. **6-unit `EntityId` / `AGREEMENTS` expansion** — the spike hard-codes 3 entities. *What we know:* MODEL-01/D-04 require 6 units seeded. *Unclear:* the cross-entity agreement matrix for 6 units (directional shielding is Phase 3, but base affiliation agreements are Phase 1). *Recommendation:* the seed-data research angle owns this; the store just consumes whatever `units`/`AGREEMENTS` the seed defines. (Out of scope for THIS angle — flagged for the seed-data agent.)
2. **Compartment set for actions** — Spike004 hard-codes `BLACKWING`. *Recommendation:* the action payload carries `{ subjectId, compartment }` so the UI can offer the resource's `requiredCompartments` as the grantable set, not a hard-coded one. Planner decides UI affordance.

## Sources

### Primary (HIGH)
- `frontend/src/spikes/lib/abac.ts`, `data.ts`, `auditlog.ts` — engine, role/tier/subject/event shapes (in-repo, Vitest-green)
- `frontend/src/spikes/components/Spike001Abac.tsx`, `Spike004Sod.tsx`, `main.tsx` — recompute + gating + entry patterns
- `.claude/skills/spike-findings-janus-2.0/references/abac-engine.md`, `roles-sod.md` — locked patterns + "What to Avoid"
- `.planning/phases/01-foundation/01-CONTEXT.md`, `.planning/AUTH-MODEL.md`, `.planning/REQUIREMENTS.md` — locked decisions
- [Scaling Up with Reducer and Context — react.dev](https://react.dev/learn/scaling-up-with-reducer-and-context) — official split-context pattern (current, React 19)

### Secondary (MEDIUM)
- [4 options to prevent extra rerenders with React context — Daishi Kato](https://blog.axlight.com/posts/4-options-to-prevent-extra-rerenders-with-react-context/) — split-context perf rationale

## Metadata

**Confidence breakdown:**
- Store shape / action set: HIGH — derived directly from in-repo Vitest-green spike substrate + locked decisions
- Live recompute: HIGH — exact pattern already used in two spikes; React.dev confirms current
- Exposure (split context): HIGH — official React.dev pattern, matches existing `AuthContext`
- Role gating: HIGH — verbatim from `Spike004Sod.tsx` + `roles-sod.md`

**Research date:** 2026-05-21
**Valid until:** ~2026-06-20 (stable; substrate is in-repo and React 19 idioms are settled)
