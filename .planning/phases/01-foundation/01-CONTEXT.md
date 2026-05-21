# Phase 1: Foundation - Context

**Gathered:** 2026-05-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Stand up the demo's shared base that every downstream view consumes:

1. **One in-memory world-state** — the 6 canonical units (2 military, intelligence, infra/inventory, industry, home guard) with their subjects, resources, and an append-only event log, behind a single `useReducer` store (single source of truth, no new library).
2. **The pure-computed ABAC engine** — live ALLOW/DENY from attributes, conjunctive base rules + explicit deny overrides, per-domain tiers, with a per-rule explanation trace.
3. **The 8 operating roles** — action availability gated by role (SoD): Approver grants/revokes attributes, Manager only requests, Security Officer places holds, Admin/others hold no access-decision authority.
4. **The persistent `[DEMO / MOCK]` banner** — non-dismissable on every screen; every simulated/external trust signal labelled `[MOCK]`.

Requirements covered: MODEL-01, MODEL-02, MODEL-03, ENGINE-01, ENGINE-02, ENGINE-03, ROLE-01, ROLE-02.

**Not in this phase** (later phases, do not build now): the pointer hub / typed contract / signed credentials / holder-gated release (Phase 2); append-only audit *views* + point-in-time reconstruction, per-entity policy divergence, support-obligation grants, directional shielding *mechanics* (Phase 3); the composed coherent shell + cross-view consistency + production build registration (Phase 4). Phase 3 fields are *modelled and seeded* now (see D-05) but their *evaluation mechanics* are not wired in Phase 1.

</domain>

<decisions>
## Implementation Decisions

### Code Strategy
- **D-01:** Consolidate/refactor the spike lib into the demo foundation — lift the *proven logic verbatim* (especially `abac.ts` — keep per-domain tiers distinct, every rule emits a `detail`, deny overrides for revocation) but unify the fragmented per-spike data files into ONE world-state model + reducer. Honors MODEL-02 (single source of truth). Do NOT rebuild the engine from scratch (risks reintroducing bugs the spikes fixed).
- **D-02:** Build the consolidated code under a new `frontend/src/demo/` tree (lib + store + components) served by its own dev/build entry (e.g. `demo.html`, mirroring the isolated `spikes.html` pattern — NO `routeTree.gen.ts` changes). Treat `frontend/src/spikes/` as historical/reference; stop maintaining it (delete later, not part of this phase).
- **D-03:** Port the proven Vitest engine tests (spike `abac.test.ts` and siblings) alongside the consolidated engine so the foundation stays green.

### Data Model — Entity Taxonomy
- **D-10:** Fuse the two spike entity taxonomies onto the 6 canonical units. The spikes carry two un-unified "owner" types: the engine plane (`EntityId = ENTITY_A/B/C`, used by `Subject.homeEntity`, `Resource.ownerEntity`, `AGREEMENTS`, `HUB_INDEX`) and the context plane (`UnitId` = the 6 units, used by deployment/shielding/obligations). Unify them into ONE entity-id type — the 6 units — in Phase 1. Re-key all engine records onto the units (`homeEntity`→`unit`, `ownerEntity`→`ownerUnit`, re-seed `AGREEMENTS`/`HUB_INDEX`); retire `ENTITY_A/B/C` as scaffolding. **Rejected:** keeping both types with a mapping table — contradicts MODEL-02 (single source of truth) and D-01. **Why now:** doing this in Phase 1 freezes the store schema for the whole milestone; deferring forces a Phase 3 re-key of every subject/resource (the reshape D-05 exists to prevent). Surfaced independently by all 4 research angles as their R1 — see `01-RESEARCH.md` ⚑ and `research/01-seed.md §0`.

### Seed Data
- **D-04:** Seed all 6 canonical units with subjects + resources now (required by success criterion #2 — minimal-units is not an option).
- **D-05:** Model the FULL 6-unit scenario schema now — base ABAC fields (clearance, per-domain tiers, compartments/need-to-know, entity affiliation, deny-override flags) PLUS the fields Phases 2–3 need (resource shielding flags, deployment status home/abroad, territory, per-entity policy refs). Seed realistic values. Phase 1 only *evaluates* the base ABAC rules; the extra fields are present so the shared store never gets reshaped in Phase 2/3.
- **D-06:** Rich, realistic seed volume — ~5+ subjects/resources per unit for an immersive world. (User chose this over a leaner curated set.) Legibility (DEMO-03) is handled later via UI affordances — NOT by thinning the data. Planner/UI should keep this in mind: busy screens must not bury decision traces.

### Selectors & Roles
- **D-07:** Two separate selectors (operating-role ≠ ABAC target — AUTH-MODEL §6). One control picks the operating role (1 of 8) and governs which ACTIONS appear; a separate control picks the ABAC evaluation target (subject + resource + domain). Mirrors spike 004: vary the action set by role, reuse one shared decision/`DecisionTrace`.
- **D-08:** The operating-role switcher lives in a persistent global header from Phase 1, co-located with the `[DEMO / MOCK]` banner; current role is held in the shared world-state. Phase 4's shell ABSORBS this bar rather than rebuilding it. The ABAC-target selector lives inside the decision surface (D-09).

### Decision Surface
- **D-09:** Phase 1 ships a single **Decision Explorer** view: pick subject + resource + domain → live ALLOW/DENY with the per-rule `DecisionTrace` (✓/✗ per rule + override lines); a role-driven action panel (grant / revoke / request / hold) mutates attributes in the store and re-computes live. This single screen covers ENGINE-01/02/03 + ROLE-01/02. Phase 4 later embeds/links it into the coherent shell. Do NOT reuse the spike per-mechanism tab Shell (DEMO-01 forbids per-mechanism tabs).

### Claude's Discretion
- **Banner / `[MOCK]` mechanics (MODEL-03):** implement the `[DEMO / MOCK]` banner as a non-dismissable component mounted at the demo app root (so it's structurally on every screen, not per-route), and establish a single reusable `[MOCK]` label convention/component for simulated trust signals. Not discussed in detail — Claude has flexibility on exact styling/placement within "non-dismissable, on every screen".
- **Reducer action shape & store slicing:** internal shape of the `useReducer` state and action types is an implementation detail for the planner, constrained only by MODEL-02 (single store) and D-05 (full schema).
- **Exact tier scales per domain:** AUTH-MODEL §5 leaves concrete computer/data/physical tier values "TBD in build"; reuse the spike `TIERS` definitions unless the planner finds a reason to adjust.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design Contract & Requirements
- `.planning/AUTH-MODEL.md` — the authoritative model. §3 pure-computed ABAC, §4 attributes, §5 domains, §6 operating roles, §7 permission matrix, §8 separation of duties (locked), §12 6-unit deployment scenario.
- `.planning/REQUIREMENTS.md` — MODEL-01/02/03, ENGINE-01/02/03, ROLE-01/02 (Phase 1 rows).
- `.planning/ROADMAP.md` § "Phase 1: Foundation" — goal + 5 success criteria.
- `.planning/PROJECT.md` — DEMO/MOCK framing, constraints, key decisions.

### Proven Patterns (spike findings — read SKILL.md then the two Phase-1-relevant references)
- `.claude/skills/spike-findings-janus-2.0/SKILL.md` — index of validated mechanisms.
- `.claude/skills/spike-findings-janus-2.0/references/abac-engine.md` — engine build recipe: `evaluate(principal, requirement) -> { decision, rules[], overrides[], failed[] }`; per-domain tiers; deny overrides; one shared `DecisionTrace`. Includes "What to Avoid".
- `.claude/skills/spike-findings-janus-2.0/references/roles-sod.md` — 8 roles → allowed-ops map; gate UI actions by `roleDef.ops.includes(op)`; SoD legibility via varying action set only.

### Source Code to Lift From (the substrate)
- `frontend/src/spikes/lib/` — `abac.ts` (engine, lift verbatim), `data.ts` (`TIERS`, `ROLES`, clearance ladder, AGREEMENTS, seed), plus `policy.ts`, `obligations.ts`, `contract.ts`, `credential.ts`, `auditlog.ts` (later phases — consult for the unified schema in D-05). Tests: `*.test.ts`.
- `frontend/src/spikes/components/ui.tsx` — `DecisionTrace` component (reuse).
- `frontend/src/spikes/components/Spike001Abac.tsx`, `Spike004Sod.tsx` — reference UI for the Decision Explorer + role action panel.
- `frontend/src/spikes/main.tsx` + `frontend/spikes.html` — the isolated-entry pattern to mirror for `frontend/src/demo/` + `demo.html`.

### Codebase Maps (for conventions / integration)
- `.planning/codebase/CONVENTIONS.md`, `.planning/codebase/STRUCTURE.md`, `.planning/codebase/STACK.md` — frontend naming/style/stack the demo must match.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **ABAC engine (`spikes/lib/abac.ts`):** proven, Vitest-green evaluator — the core of D-01. Lift verbatim into `demo/lib/`.
- **`DecisionTrace` (`spikes/components/ui.tsx`):** the single shared trace renderer — reuse for the Decision Explorer (D-09).
- **`ROLES` ops map + `TIERS` + clearance ladder (`spikes/lib/data.ts`):** seed + role-gating substrate.
- **Isolated Vite entry pattern (`spikes.html` + `spikes/main.tsx`):** the template for `demo.html` + `demo/main.tsx` — keeps the demo off the TanStack router (no `routeTree.gen.ts` changes).

### Established Patterns
- **No new frameworks / match existing patterns** (PROJECT.md constraint): React 19 + TanStack + Vite + Tailwind + shadcn/ui. State via `useReducer` only (MODEL-02) — no Redux/Zustand/etc.
- **Per-domain tiers kept distinct** (abac-engine.md "What to Avoid") — do NOT collapse into one clearance ladder; a tier failure must read differently from a clearance failure (ENGINE-02, success criterion #4).
- **Pure-computed, no stored grants** — "grant" = approving an attribute; revocation = deny override (revoked / securityHold). The event log is the eventual system-of-record (Phase 3).

### Integration Points
- New `frontend/src/demo/` tree + `frontend/spikes.html`-style `demo.html` entry registered in `frontend/vite.config.ts` build inputs (DEMO-04 is Phase 4, but the dev entry exists from Phase 1).
- The shared store (D-02) is the integration seam every later phase plugs into — get its schema (D-05) right now.

</code_context>

<specifics>
## Specific Ideas

- Decision Explorer = one screen, three pickers (subject / resource / domain) + live trace + role-conditioned action buttons that mutate-and-recompute. Modeled on spike 001 + 004 combined.
- Persistent top bar: `[DEMO / MOCK]` banner + operating-role switcher together; Phase 4 shell extends this bar, doesn't replace it.
- User explicitly wants the world to feel full/immersive (rich seed), accepting busier screens — prioritize realism, solve legibility in the UI layer.

</specifics>

<deferred>
## Deferred Ideas

- **Delete `frontend/src/spikes/`** — retired as of D-02 but kept as historical reference; actual removal is a later cleanup, not Phase 1.
- **Wiring the extra schema fields (shielding / deployment / territory / per-entity policy):** modelled + seeded in Phase 1 (D-05) but their evaluation mechanics belong to Phases 2–3.
- **Legibility affordances for the rich seed** (filtering, curated default view, search): a UI concern for Phase 4 / `gsd-ui-phase`, surfaced by the D-06 choice.

None of these are scope creep — they are explicit downstream-phase handoffs.

</deferred>

---

*Phase: 1-Foundation*
*Context gathered: 2026-05-21*
