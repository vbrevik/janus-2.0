# Phase 1: Foundation - Pattern Map

**Mapped:** 2026-05-21
**Files analyzed:** 11 new files (1 modified: `vite.config.ts`)
**Analogs found:** 11 / 11 (every new file has an in-repo spike analog — this phase consolidates the validated spike substrate, it does not invent)

> **Phase nature:** Frontend-only demo island under a NEW `frontend/src/demo/` tree, served by a `demo.html` entry (mirrors `spikes.html`). No Rust/backend work. No `routeTree.gen.ts` changes (router isolation is automatic — the demo chain never imports `@tanstack/react-router`). The dominant pattern is **lift-from-spike**: most files copy a spike file with surgical edits, NOT a from-scratch rebuild (D-01 forbids rebuilding the engine).

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `frontend/src/demo/lib/abac.ts` | engine (pure fn) | transform (pure compute) | `frontend/src/spikes/lib/abac.ts` | exact (lift verbatim, rebase imports only) |
| `frontend/src/demo/lib/model.ts` | model / types | n/a (type defs) | `frontend/src/spikes/lib/data.ts` (types) + `policy.ts`/`obligations.ts`/`auditlog.ts`/`contract.ts`/`credential.ts` (forward types) | exact (types) + fold (forward) |
| `frontend/src/demo/lib/seed.ts` | model / fixtures | n/a (seed data) | `frontend/src/spikes/lib/data.ts` (SUBJECTS/RESOURCES/AGREEMENTS/HUB_INDEX/TIERS/ROLES) | role-match (re-keyed onto 6 units, volume grown ~30/30) |
| `frontend/src/demo/lib/abac.test.ts` | test | n/a | `frontend/src/spikes/lib/abac.test.ts` | exact (port; D-03) |
| `frontend/src/demo/store/world-state.tsx` | store / context (useReducer + split-context) | event-driven (dispatch→reduce→append event) | `frontend/src/contexts/auth-context.tsx` (context shape) + `frontend/src/spikes/lib/auditlog.ts` (AttrEvent/op replay shape) | role-match (context) + exact (event shape) |
| `frontend/src/demo/components/ui.tsx` | component (presentational helpers) | request-response (props→render) | `frontend/src/spikes/components/ui.tsx` (`DecisionTrace`, `Card`, `Field`, `Select`, `Pill`) | exact (reuse, add `MockTag`) |
| `frontend/src/demo/components/DemoBanner.tsx` | component (chrome) | static render | `frontend/src/spikes/components/Shell.tsx:31-46` (header + DEMO/MOCK badge) | partial (extract badge, drop tab nav) |
| `frontend/src/demo/components/RoleSwitcherHeader.tsx` | component (chrome) | event-driven (select→SET_ROLE) | `frontend/src/spikes/components/Spike004Sod.tsx:85-94` (role `<Select>`) | role-match (bind to store not useState) |
| `frontend/src/demo/components/DecisionExplorer.tsx` | component (view) | event-driven + transform (pickers→useMemo(evaluate)→action panel→dispatch) | `frontend/src/spikes/components/Spike001Abac.tsx` + `Spike004Sod.tsx` (combined) | role-match (composite of two spikes) |
| `frontend/src/demo/DemoRoot.tsx` | component (app root) | composition | `frontend/src/spikes/components/Shell.tsx` (root composition) | partial (banner+header outside swappable region; NO tab nav) |
| `frontend/src/demo/main.tsx` | entry | bootstrap | `frontend/src/spikes/main.tsx` | exact (copy, re-point to `<DemoRoot/>`) |
| `frontend/demo.html` | config (vite entry) | n/a | `frontend/spikes.html` | exact (copy, re-point script + title) |
| `frontend/vite.config.ts` (MODIFIED) | config | n/a | self (add `build.rollupOptions.input`) | self-modify |

---

## Pattern Assignments

### `frontend/src/demo/lib/abac.ts` (engine, pure-compute transform)

**Analog:** `frontend/src/spikes/lib/abac.ts` — **LIFT VERBATIM (D-01).** The ONLY change is the import line: `from "./data"` → `from "./model"` (and `EntityId`/`ownerEntity` renamed to the unified `UnitId`/`ownerUnit` per D-10). Do NOT "tidy" or refactor — the spike is Vitest-green and the #1 forbidden regression is collapsing per-domain tiers (R3, ENGINE-02, success criterion #4).

**Contract to preserve byte-for-byte** (lines 17-44, 57): `evaluate(principal, req) -> { decision, rules[], overrides[], failed[] }`.

**Imports pattern to rebase** (lines 4-15) — only the source module changes:
```typescript
import {
  CLEARANCE_RANK, TIERS, AGREEMENTS,
  type Subject, type Resource, type EntityId, type Domain,
  type Clearance, type Compartment, type SubjectFlags,
} from "./data";   // <-- becomes "./model" (or "./model" + "./seed" for AGREEMENTS)
```

**Per-domain tier compare — NEVER collapse** (lines 47-48, 67-80):
```typescript
const tierRank = (domain: Domain, tier: string): number => TIERS[domain].indexOf(tier);
// ...inside evaluate, the Domain-tier rule only runs when req.domain && req.requiredTier present
```

**4 conjunctive base rules, each emitting a human-readable `detail`** (lines 60-103): Clearance, Domain tier, Need-to-know, Affiliation. Keep all four `rules.push({ name, pass, detail })` blocks intact — the `detail` strings are what make DENY explainable (ENGINE-02, DEMO-03).

**Deny overrides force DENY regardless of base rules** (lines 105-125):
```typescript
const overrides: Rule[] = [];
if (principal.flags?.revoked) overrides.push({ name: "Revoked", pass: false, detail: "subject access has been revoked" });
if (principal.flags?.securityHold) overrides.push({ name: "Security hold", pass: false, detail: "flagged by Security Officer" });
const basePass = rules.every((r) => r.pass);
const decision = basePass && overrides.length === 0 ? "ALLOW" : "DENY";
```

**Adapter helpers to keep** (lines 135-153): `principalFromSubject`, `requirementFromResource` — rename internal field reads `s.homeEntity`→`s.unit`, `r.ownerEntity`→`r.ownerUnit` per D-10. `releaseRequirementFor` (155-166) is a Phase-2 handshake helper — keep the type signatures but it is inert in Phase 1.

---

### `frontend/src/demo/lib/model.ts` (model / types — the FROZEN schema, D-05)

**Analog:** `frontend/src/spikes/lib/data.ts` (base types) + fold of forward types from `policy.ts`, `obligations.ts`, `auditlog.ts`, `contract.ts`, `credential.ts`. **Types only — do NOT lift the functions of the forward files (they stay in `spikes/` as Phase 2/3 reference).**

> This is the single most consequential file in the phase: D-05 + D-10 freeze the store schema for the WHOLE milestone here. Get the field set right now or Phase 3 re-keys every record (R1).

**Base ABAC type block — lift from `data.ts:4-50`, with the D-10 unification applied:**
```typescript
// from data.ts:4-23 — lift verbatim (clearance ladder + per-domain tier scales)
export type Clearance = "UNCLASSIFIED" | "CONFIDENTIAL" | "SECRET" | "TOP_SECRET";
export const CLEARANCE_RANK: Record<Clearance, number> = { UNCLASSIFIED: 0, CONFIDENTIAL: 1, SECRET: 2, TOP_SECRET: 3 };
export type Domain = "COMPUTER" | "DATA" | "PHYSICAL";
export const TIERS: Record<Domain, string[]> = {
  COMPUTER: ["STANDARD", "PRIVILEGED", "ROOT"],
  DATA: ["INTERNAL", "RESTRICTED", "CLASSIFIED"],
  PHYSICAL: ["LOBBY", "RESTRICTED_AREA", "SECURE_VAULT"],
};
```

**D-10 — retire `EntityId`/`ENTITY_A/B/C`; the 6 `UnitId` values become the single entity-id type.** Lift `UnitId`/`UNITS` from `obligations.ts:4-19`:
```typescript
// from obligations.ts:4-19 — this becomes THE entity id type (replaces data.ts:26 EntityId)
export type UnitId = "MILITARY_1" | "MILITARY_2" | "INTEL" | "INFRA" | "INDUSTRY" | "HOME_GUARD";
export const UNITS: Record<UnitId, { label: string }> = { /* 6 units */ };
```

**Widen `Compartment` additively** (R from RESEARCH §"Unified schema") — keep `data.ts:25` values, ADD realistic ones (`SIGINT`, `STOCKWATCH`, `HOMELAND`, …) so need-to-know reads across ~30 subjects. Add, never rename (abac/policy/credential/auditlog reference it).

**`Subject` — extend the `data.ts:42-50` struct** (rename `homeEntity`→`unit`; add D-05 forward + D-11 lifecycle fields, seed-only in Phase 1):
```typescript
export interface SubjectFlags { revoked: boolean; securityHold: boolean; }   // data.ts:37-40 verbatim
export interface Subject {
  id: string; name: string;
  unit: UnitId;                                  // was homeEntity (D-10)
  clearance: Clearance;                          // [MOCK] external, read-only (evaluated)
  domainAuth: Partial<Record<Domain, string>>;   // per-domain tier (evaluated)
  compartments: Compartment[];                   // need-to-know (evaluated)
  flags: SubjectFlags;                           // revoked/securityHold (evaluated)
  // --- D-05 forward fields (seed-only, evaluated P3) ---
  subunit?: string; deployment?: Deployment; territory?: string;  // from obligations.ts Subunit/Deployment
  // --- D-11 authorization lifecycle (seed-only, evaluated later) ---
  authorization?: { status: "AUTHORIZED" | "WITHDRAWN" | "PENDING"; byRole: string; conversationDate: string; validUntil: string; reauthDue: string };
  clearanceValidUntil?: string; clearanceGrantedBy?: string;
}
```

**`Resource` — extend `data.ts:95-103`** (rename `ownerEntity`→`ownerUnit`; add shielding/allowlist from `obligations.ts:30-36`, seed-only):
```typescript
export interface Resource {
  id: string; name: string; domain: Domain;
  requiredTier: string; minClearance: Clearance; requiredCompartments: Compartment[];  // evaluated
  ownerUnit: UnitId;                             // was ownerEntity (D-10)
  shielded?: boolean; allowlist?: UnitId[];      // from obligations.ts:34-35 (seed-only, P3)
  assetKind?: string;                            // display
}
```

**`HubPointer` — lift `data.ts:146-150`, re-key `holdingEntity` onto `UnitId`** (seed-only, P2).

**Roles/ops — lift `data.ts:161-215` verbatim** (`RoleId`, `Op`, `Role`, `ROLES`). The 8-role op map is the SoD substrate. **D-11/OQ-A:** add `AUTHORIZE_SUBJECT`/`WITHDRAW_AUTHORIZATION` to the `MANAGER` op set (Manager gains authorize/withdraw but still cannot grant attributes — confirm in plan-phase per OQ-A).

**Event op union — lift `auditlog.ts:11-23` `AttrOp`/`AttrEvent`, extend** (R6 + D-11):
```typescript
export type AttrOp =
  | "GRANT_COMPARTMENT" | "REVOKE_COMPARTMENT" | "SET_HOLD" | "CLEAR_HOLD"  // auditlog.ts:11-15 verbatim
  | "SET_REVOKED" | "CLEAR_REVOKED"                                        // R6 — make revoke event-sourced
  | "AUTHORIZE_SUBJECT" | "WITHDRAW_AUTHORIZATION";                        // D-11 (actor = Manager/Supervisor)
export interface AttrEvent { seq: number; subjectId: string; op: AttrOp; value?: Compartment; actor: string; }  // auditlog.ts:17-23
```

**Forward types to FOLD AS TYPES ONLY (functions stay in spikes):**
- `EntityPolicy` — from `policy.ts:12-22` (per-entity release policy; seed-only P3).
- `Deployment` / `Subunit` (sans the eval fns) — from `obligations.ts:21-28`.
- `Envelope` / `Pointer` — from `contract.ts:17-45` (hub interchange, P2).
- `AttrClaims` / `Credential` — from `credential.ts:5-16` (signed credentials, P2).

---

### `frontend/src/demo/lib/seed.ts` (model / fixtures — rich 6-unit world, D-04/D-06)

**Analog:** `frontend/src/spikes/lib/data.ts` arrays (`SUBJECTS:52-93`, `RESOURCES:105-142`, `AGREEMENTS:35`, `HUB_INDEX:152-159`).

**Seed-head invariant (R9):** Keep the **original 4 subjects + 4 resources as the seed head** (re-keyed onto units) so the 6 ported `abac.test.ts` fixture assertions stay green, THEN grow to ~30/30.

**Subject seed shape — lift `data.ts:52-61`, apply D-10 rename:**
```typescript
{ id: "subj-1", name: "Dana Reyes",
  unit: "MILITARY_1",            // was homeEntity: "ENTITY_A"
  clearance: "SECRET",
  domainAuth: { COMPUTER: "PRIVILEGED", DATA: "RESTRICTED" },
  compartments: ["AURORA"],
  flags: { revoked: false, securityHold: false } }
```

**AGREEMENTS / HUB_INDEX — re-seed onto the 6 units** (`data.ts:35`, `152-159`). RESEARCH §"Unified schema": default all 6 units mutually-agreed; demonstrate denial via tier / need-to-know / shielding / overrides, NOT by withholding agreements.

**Named contrast actors to seed (assert in ported tests; RESEARCH §"Seed volume"):**
- **CA-1 clean ALLOW** (ENGINE-01) — same-unit subject/resource, all 4 rules pass.
- **CA-2 tier-only DENY** (ENGINE-02) — TOP_SECRET clearance but PHYSICAL tier < SECURE_VAULT; clearance ✓, tier ✗.
- **CA-3 override DENY** (ENGINE-03) — seed BOTH `revoked` AND `securityHold` so the SO hold action has a live target.
- **CA-4 need-to-know DENY** — cleared/tiered outsider vs `requiredCompartments:[STOCKWATCH]`.
- **CA-5 authorization-gap DENY** (D-11) — clearance ✓, tier ✓, NTK ✓, but `authorization` missing/withdrawn/expired (seed-only DENY-reason; rule wired later per OQ-B).
- **Forward actors** FW-1..FW-5 (intel shielded, deployed field hospital, industry leak target, hub pointers, rogue-issuer credential) — seeded now for P2/P3.

**Picker legibility (R10):** group pickers by unit (`<optgroup>`), default to the CA-1 triple, each contrast actor reachable in ≤2 picks. Do NOT thin data (D-06).

---

### `frontend/src/demo/lib/abac.test.ts` (test — D-03)

**Analog:** `frontend/src/spikes/lib/abac.test.ts` — **PORT (D-03).** Rebase imports `from "./data"`→`from "./model"`/`from "./seed"`. The 6 `it(...)` blocks assert on hard-coded fixture ids (`subj-1..4`, `res-1..4`) — they stay green BECAUSE the seed head preserves those records (R9).

**Test structure to preserve** (lines 10-14, the decide helper):
```typescript
const decide = (sId: string, rId: string) =>
  evaluate(principalFromSubject(subj(sId)), requirementFromResource(res(rId)));
```

**Two assertions that lock ENGINE-02 (do not lose these):**
```typescript
// per-domain tier DENY even when clearance passes (lines 23-30)
expect(clearance.pass).toBe(true);  // clearance is fine...
expect(tier.pass).toBe(false);      // ...but domain tier is the blocker
// deny override flips ALLOW→DENY while base rules still pass (lines 56-67)
expect(overridden.rules.every((r) => r.pass)).toBe(true);
```

**Test infra already works:** `vite.config.ts:24-29` runs `*.test.ts` under jsdom, excludes `e2e/**`. `frontend/src/test-setup.ts` (just `import "@testing-library/jest-dom"`) is already the configured setup file — no test-config changes needed.

---

### `frontend/src/demo/store/world-state.tsx` (store — single `useReducer` + split-context, MODEL-02)

**Analog (context shape):** `frontend/src/contexts/auth-context.tsx` — the repo's established context pattern. **Analog (event shape):** `frontend/src/spikes/lib/auditlog.ts` `AttrEvent`/`AttrOp` + replay switch.

**Context creation + provider + typed hook with guard** (from `auth-context.tsx:19,21,90-96` — mirror this, but use the React.dev **split-context** pattern: `WorldStateContext` + `WorldDispatchContext` per RESEARCH Wave 2):
```typescript
const WorldStateContext = createContext<WorldState | undefined>(undefined);     // cf auth-context.tsx:19
const WorldDispatchContext = createContext<Dispatch<Action> | undefined>(undefined);

export function WorldProvider({ children }: { children: React.ReactNode }) {     // cf auth-context.tsx:21
  const [state, dispatch] = useReducer(reducer, seedWorld());                    // useReducer, NOT useState
  return (
    <WorldStateContext.Provider value={state}>
      <WorldDispatchContext.Provider value={dispatch}>{children}</WorldDispatchContext.Provider>
    </WorldStateContext.Provider>
  );
}
export function useWorld() {                                                       // cf auth-context.tsx:90-96 (guard)
  const ctx = useContext(WorldStateContext);
  if (ctx === undefined) throw new Error("useWorld must be used within a WorldProvider");
  return ctx;
}
```

**Store shape (RESEARCH Wave 2):** `{ units, subjects, resources, events, hubIndex, currentRole, abacTarget, seq }`. NO `decision` field — the decision is DERIVED via `useMemo` in the Decision Explorer, never stored (R2, locked anti-pattern).

**6 core actions** (`SET_ROLE`, `SET_TARGET` no-log, `APPROVE_ATTRIBUTE`/`REVOKE_ATTRIBUTE` Approver, `TOGGLE_SECURITY_HOLD` SO, `REQUEST_ATTRIBUTE` Manager log-only-zero-mutation = the SoD crux). Mutating actions append an `AttrEvent` (superset of the spike shape so P3 `reconstructSubject`/`whoCanAccess` plug in unchanged).

**Immutable update — reducer MUST return NEW subject objects** (cf `auditlog.ts:25-27` `cloneSubject` shows the clone idiom) or `useMemo(evaluate)` won't invalidate (R2):
```typescript
function cloneSubject(s: Subject): Subject { return { ...s, compartments: [...s.compartments], flags: { ...s.flags } }; }  // auditlog.ts:25-27
```

**Event-append shape** — model the entry on the spike `Spike004Sod.tsx:49-58` `logAction` pattern but persist into the reducer's `events[]` with `actor = ROLES[currentRole].label`.

---

### `frontend/src/demo/components/ui.tsx` (presentational helpers — REUSE)

**Analog:** `frontend/src/spikes/components/ui.tsx` — **lift verbatim** (`Pill`, `Card`, `Field`, `Select`, `DecisionTrace`). Do NOT fork `DecisionTrace` (RESEARCH Wave 3). These ARE the UI-SPEC's declared visual vocabulary.

**`DecisionTrace` — the single shared trace renderer** (lines 88-117). Carries UI-SPEC verdict copy (`✓ ALLOW`/`✗ DENY`, line 94), green/red rule rows (98-99), and the `⛔ … (deny override)` line (105-113). Reuse exactly — the off-grid `space-y-1.5` (line 95) is a UI-SPEC-sanctioned exception.

**`Pill` tone map = the UI-SPEC semantic color contract** (lines 12-18): `blue` clearance/info, `amber` tier values, `slate` neutral, `green`/`red` decision. The `px-2 py-0.5` is a UI-SPEC-sanctioned off-grid exception (line 21 / UI-SPEC §Spacing).

**ADD `MockTag` here** (Claude's Discretion / RESEARCH Wave 3) — model on `Pill` (lines 5-26); the single `[MOCK]` convention for simulated trust signals, amber/yellow caution treatment **visually distinct from the green/red decision palette** (UI-SPEC §Color line 93) so a mock signal is never confused with a real ALLOW/DENY.

---

### `frontend/src/demo/components/DecisionExplorer.tsx` (view — composite of spike 001 + 004, D-09)

**Analogs:** `frontend/src/spikes/components/Spike001Abac.tsx` (pickers + live trace) FUSED with `Spike004Sod.tsx` (role-gated action panel + log). One screen, do NOT split into per-mechanism tabs (DEMO-01).

**Live-recompute via `useMemo` — the load-bearing pattern** (`Spike001Abac.tsx:17-24`; decision is derived, never stored, R2):
```typescript
const result = useMemo(
  () => evaluate(principalFromSubject(subject), requirementFromResource(resource)),
  [subject, resource],   // re-runs when reducer hands back new subject ref
);
```

**Pickers — three `<Select>` (subject / resource / domain)** modeled on `Spike001Abac.tsx:36-69`. Bind selection to the store's `abacTarget` via `SET_TARGET` (not local `useState`). Group subject/resource options by unit (`<optgroup>`, R10).

**Subject/resource attribute pills** (`Spike001Abac.tsx:43-56, 70-81`) — reuse the `Pill` tone mapping (blue clearance, amber `domain:tier`, slate compartments).

**Role-gated action panel — gate PURELY by op membership, never inline `role === ...`** (`Spike004Sod.tsx:31-32, 105-151`; R8):
```typescript
const can = (op: string) => ROLES[currentRole].ops.includes(op as never);   // Spike004Sod.tsx:31-32
{can("approve_attribute") && (/* green grant + amber revoke buttons */)}
{can("flag_risk") && (/* red Place/Clear security hold toggle */)}
{can("request_attribute") && (/* slate Request (cannot grant) — logs only */)}
{!can("approve_attribute") && !can("flag_risk") && !can("request_attribute") && (
  /* SoD empty state */
)}
```

**Button copy + colors — UI-SPEC Copywriting Contract is verbatim-locked**, and matches `Spike004Sod.tsx:105-151` exactly:
- Approver grant `bg-green-700` "Approve: grant {COMPARTMENT}" / revoke `bg-amber-700` "Revoke: remove {COMPARTMENT}" (lines 107-118).
- SO toggle `bg-red-700` "Place security hold" / "Clear security hold" (lines 121-128).
- Manager `bg-slate-700` "Request {COMPARTMENT} (cannot grant)" — log-only (lines 129-140).
- SoD empty state `bg-slate-50` "This role holds no access-decision authority — separation of duties." + "Read-only visibility only." when role has a `view_*` op (lines 141-151).

**Action handlers dispatch to the store** (not local `setState` as the spike does at `Spike004Sod.tsx:59-72`) — each fires the reducer action + appends the event; the trace recomputes from the new store state.

**Event/audit log render** (`Spike004Sod.tsx:160-176`) — `font-mono text-xs`, empty-state copy "No actions yet." + "Auditor sees this log read-only; it is the system of record under pure-ABAC." (UI-SPEC locks this string).

**Decision-trace caption** (UI-SPEC §Copywriting) — plain-prose one-liner under the trace, modeled on the spike try-hint (`Spike001Abac.tsx:87-91`), e.g. "Clearance passes but the COMPUTER tier is too low — per-domain tiers evaluate independently."

---

### `frontend/src/demo/components/DemoBanner.tsx` (chrome — non-dismissable `[DEMO / MOCK]`, MODEL-03)

**Analog:** `frontend/src/spikes/components/Shell.tsx:31-46` (the DEMO/MOCK badge + header) — EXTRACT the badge into a standalone, structural, non-dismissable component (no close button, no state, so MODEL-03 holds by construction — R7). Do NOT carry over the tab `<nav>` (Shell.tsx:48-60, DEMO-01 forbids per-mechanism tabs).

**Badge treatment to lift** (`Shell.tsx:37-39`) — amber/yellow caution, UI-SPEC §Color line 93 mandates it stay visually distinct from green/red decision colors:
```typescript
<span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">DEMO / MOCK</span>
```
Make it `sticky top-0` (RESEARCH Wave 3) and mount it in `DemoRoot` ABOVE the swappable region. Copy string locked by UI-SPEC: `"[DEMO / MOCK]"`.

---

### `frontend/src/demo/components/RoleSwitcherHeader.tsx` (chrome — operating-role switcher, D-08)

**Analog:** `frontend/src/spikes/components/Spike004Sod.tsx:85-94` (the role `<Select>`). Standalone component, co-located with the banner in the persistent header. Phase 4's shell RE-HOSTS it.

**Role `<Select>` over the 8 ROLES** (lines 85-94) — bind value to the store's `currentRole` via `SET_ROLE` dispatch, **NOT `useState`** (D-08; the spike used local state, the demo uses the shared store):
```typescript
<Select
  value={currentRole}
  onChange={(r) => dispatch({ type: "SET_ROLE", role: r })}   // store, not useState (D-08)
  options={(Object.keys(ROLES) as RoleId[]).map((r) => ({ value: r, label: ROLES[r].label }))}
/>
```

---

### `frontend/src/demo/DemoRoot.tsx` (app root — composition, R7)

**Analog:** `frontend/src/spikes/components/Shell.tsx` (root layout `min-h-screen bg-slate-50`, line 30) — but the structure differs: render `<DemoBanner/>` + `<RoleSwitcherHeader/>` ABOVE a SINGLE swappable view (`<DecisionExplorer/>`), wrapped in `<WorldProvider/>`. NO tab state, NO tab nav (DEMO-01). Banner/header live outside the swappable region so a future view can never omit them (R7).

```typescript
export function DemoRoot() {
  return (
    <WorldProvider>
      <div className="min-h-screen bg-slate-50 text-slate-800">   {/* Shell.tsx:30 */}
        <DemoBanner />            {/* sticky, non-dismissable, structural */}
        <RoleSwitcherHeader />    {/* persistent operating-role switcher */}
        <main className="mx-auto max-w-5xl px-6 py-6"><DecisionExplorer /></main>   {/* Shell.tsx:62 */}
      </div>
    </WorldProvider>
  );
}
```

---

### `frontend/src/demo/main.tsx` (entry — bootstrap)

**Analog:** `frontend/src/spikes/main.tsx` — **copy verbatim**, two edits: `import { Shell }` → `import { DemoRoot }`, and render `<DemoRoot/>` not `<Shell/>`. Keep `import "../index.css"` (line 3) — pulls in the shadcn/Tailwind tokens.

```typescript
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../index.css";                              // keep — Tailwind/shadcn tokens
import { DemoRoot } from "./DemoRoot";              // was ./components/Shell
createRoot(document.getElementById("root")!).render(<StrictMode><DemoRoot /></StrictMode>);
```

---

### `frontend/demo.html` (config — Vite entry)

**Analog:** `frontend/spikes.html` — **copy verbatim**, two edits: `<title>` → "Janus — Authorization Hub (DEMO/MOCK)", `<script src>` → `/src/demo/main.tsx`.

```html
<title>Janus — Authorization Hub (DEMO/MOCK)</title>
<div id="root"></div>
<script type="module" src="/src/demo/main.tsx"></script>   <!-- was /src/spikes/main.tsx -->
```

---

### `frontend/vite.config.ts` (MODIFIED — Vite build input, R4)

**Self-modify.** Today there is NO `build.rollupOptions.input` (lines 7-30) → `vite build` bundles ONLY `index.html` and `demo.html` would "work in dev, vanish in prod" (R4). Land a 4-line input map NOW (RESEARCH Wave 0):
```typescript
build: {
  rollupOptions: {
    input: {
      main: path.resolve(__dirname, "index.html"),   // MUST list main or the app build breaks
      demo: path.resolve(__dirname, "demo.html"),
    },
  },
},
```
**Critical:** once `input` is an object you MUST list `main`. Leave `spikes.html` unlisted (it is being retired). Do NOT touch the `TanStackRouterVite` plugin (lines 10-13) or `test` block (24-29) — router isolation is automatic because the demo chain never imports `routeTree.gen.ts`.

---

## Shared Patterns

### Pure-computed decision (NEVER stored) — the cardinal invariant
**Source:** `frontend/src/spikes/components/Spike001Abac.tsx:17-24` (the `useMemo(evaluate(...))` pattern).
**Apply to:** `DecisionExplorer.tsx`, and as a NEGATIVE constraint on `world-state.tsx` (no `decision` field, no `RECOMPUTE` action — R2).
```typescript
const result = useMemo(() => evaluate(principalFromSubject(subject), requirementFromResource(resource)), [subject, resource]);
```

### Role-gating by op membership (SoD legibility, ROLE-02 / R8)
**Source:** `frontend/src/spikes/components/Spike004Sod.tsx:31-32`.
**Apply to:** `DecisionExplorer.tsx` action panel, `RoleSwitcherHeader.tsx`. Never inline `role === "..."`.
```typescript
const can = (op: string) => ROLES[currentRole].ops.includes(op as never);
```

### Semantic decision color contract (UI-SPEC §Color — load-bearing, not decorative)
**Source:** `frontend/src/spikes/components/ui.tsx:12-18` (`Pill` tones) + `Spike004Sod.tsx:107-128` (button colors).
**Apply to:** all action buttons + pills + verdict. green=ALLOW/grant, red=DENY/override/hold, amber=tier/revoke, slate=neutral/request, blue=clearance/info, **amber-distinct=`[DEMO]`/`[MOCK]`** (must not collide with green/red).

### Immutable subject update on mutation (R2)
**Source:** `frontend/src/spikes/lib/auditlog.ts:25-27` (`cloneSubject`).
**Apply to:** every mutating reducer case in `world-state.tsx` — return new subject objects so `useMemo` invalidates.

### Append-only event log = system of record (MODEL-02 → P3 replay)
**Source:** `frontend/src/spikes/lib/auditlog.ts:11-23` (`AttrOp`/`AttrEvent`) + `Spike004Sod.tsx:49-58, 160-176` (log entry + render).
**Apply to:** `world-state.tsx` (append on every mutation, `actor = role label`) and the log panel in `DecisionExplorer.tsx`. Event entry must be a SUPERSET of the spike `AttrEvent` so P3's `reconstructSubject`/`whoCanAccess` plug in unchanged.

### Repo context idiom (provider + guarded hook)
**Source:** `frontend/src/contexts/auth-context.tsx:19,21,90-96`.
**Apply to:** `world-state.tsx` — `createContext`, `<Provider>` wrapping `children`, and a `useXxx` hook that throws if used outside the provider. (Demo uses split-context + `useReducer`; auth-context uses `useState` — the SHAPE is the analog, the state primitive differs per MODEL-02.)

### Isolated dev-entry island (router isolation by construction, D-02)
**Source:** `frontend/spikes.html` + `frontend/src/spikes/main.tsx`.
**Apply to:** `demo.html` + `demo/main.tsx`. The demo chain must NEVER import `@tanstack/react-router` or `routeTree.gen.ts`; the TanStack plugin only scans `./src/routes` (`vite.config.ts:11`). Verify isolation (R5): grep `src/routes src/main.tsx src/components` for `src/demo` imports = empty.

---

## No Analog Found

None. Every Phase-1 file maps to an in-repo spike (this phase is a consolidation of the validated spike substrate per D-01). The only "new construction" is the **fusion** of two existing patterns (Spike001 + Spike004 → `DecisionExplorer`) and the **store wrapper** (`auth-context` shape + `auditlog` event shape → `world-state.tsx`); both compose existing analogs rather than introducing un-precedented code.

> Where RESEARCH.md still helps the planner: the unified-schema field inventory (RESEARCH §"Unified schema (frozen in Phase 1, D-05)") and the seed-volume / contrast-actor design (RESEARCH §"Seed volume + named contrast actors") — these prescribe field set and seed content that no single spike file fully contains.

---

## Open Questions Forwarded to Planner (from CONTEXT D-11)

These are NOT pattern questions but they gate `model.ts`/`seed.ts`/`world-state.tsx` content — surfaced here so the planner does not silently default:
- **OQ-A (Manager op-set):** Confirm `MANAGER` gains `AUTHORIZE_SUBJECT`/`WITHDRAW_AUTHORIZATION` (mutating authorization state) while still unable to `approve_attribute`. Add a "simplified for demo — flat roles approximate scoped roles (SCOPE-01)" note.
- **OQ-B (evaluate now vs defer):** Recommended default = seed the D-11 authorization fields now, EVALUATE in Phase 3 (preserves D-01's byte-for-byte engine lift; keeps Phase 1 evaluation = the 4 base rules only). If confirmed, the CA-5 authorization-gap DENY is seed-only in Phase 1 (the rule is not wired into `abac.ts`).

---

## Metadata

**Analog search scope:** `frontend/src/spikes/lib/` (all 13 files), `frontend/src/spikes/components/` (ui.tsx, Shell.tsx, Spike001Abac.tsx, Spike004Sod.tsx), `frontend/src/spikes/main.tsx`, `frontend/spikes.html`, `frontend/src/contexts/auth-context.tsx`, `frontend/vite.config.ts`, `frontend/src/test-setup.ts`.
**Files scanned:** 12 read in full.
**Pattern extraction date:** 2026-05-21
