# Phase 1: Foundation — Research (Synthesis)

**Researched:** 2026-05-21
**Method:** 4 parallel research angles (engine, store, entry/build, seed). Detailed notes in `research/01-{engine,store,entry,seed}.md` — this file synthesizes them and sequences the plan.
**Confidence:** HIGH overall — every claim is grounded in the in-repo spike substrate (`frontend/src/spikes/`), Vitest-green, and the locked decisions in `01-CONTEXT.md` / `AUTH-MODEL.md`.

---

## ⚑ THE one cross-cutting decision (read first)

**The spike substrate carries the world in TWO un-unified "owner" taxonomies, and Phase 1 must fuse them onto the 6 units.** Flagged independently by the engine, store, AND seed angles (each as their R1).

| Plane | File | Identity type | Carries |
|-------|------|---------------|---------|
| ABAC engine plane | `data.ts`, `abac.ts`, `policy.ts`, `auditlog.ts`, `credential.ts` | `EntityId` = `ENTITY_A/B/C` (3 abstract entities) | clearance, per-domain tiers, compartments, flags, agreements, hub index |
| Context plane | `obligations.ts` | `UnitId` = `MILITARY_1/2, INTEL, INFRA, INDUSTRY, HOME_GUARD` (the 6 units) | deployment (home/abroad), shielding, allowlist, support obligations, standing access |

They never share an ID space in the spikes. MODEL-01/D-04 require the **6 units** as the canonical entities; MODEL-02/D-01 require **one** model (no fragmentation).

**Recommendation (near-unanimous across angles):** make the 6 `UnitId` values the single entity-id type; re-key `AGREEMENTS`, `HUB_INDEX`, `Subject.homeEntity`→`unit`, `Resource.ownerEntity`→`ownerUnit` onto the 6 units; retire `ENTITY_A/B/C` as spike scaffolding. Carry the context-plane fields (`deployment`, `territory`, `shielded`, `allowlist`, per-entity `policy`) **inline on the unified Subject/Resource/Entity, seeded but not evaluated in Phase 1** (D-05). Get this right in Phase 1 and the store schema is frozen for the whole milestone; miss it and Phase 3 re-keys every record.

This is an architectural choice with a (small) tradeoff — alternative is "keep both types + a mapping table", but that re-introduces exactly the fragmentation MODEL-02/D-01 forbid. **LOCKED as CONTEXT decision D-10 (2026-05-21) — unify on the 6 units.**

---

## Recommended build sequence (what the plan should do)

The four angles compose into a clean wave order. Each wave is independently verifiable.

### Wave 0 — Isolated demo entry (island, off the router)
- Create `frontend/demo.html` (copy of `spikes.html:1-12`, re-point `<script>` to `/src/demo/main.tsx`, title "Janus — Authorization Hub (DEMO/MOCK)").
- Create `frontend/src/demo/main.tsx` (copy of `spikes/main.tsx:1-10`; keep `import "../index.css"`; render `<DemoRoot/>`, not `<Shell/>`).
- **Router isolation is automatic** — the demo chain never imports `routeTree.gen.ts` / `@tanstack/react-router`; the TanStack plugin only scans `./src/routes` (`vite.config.ts:11`). No `routeTree.gen.ts` change (D-02 ✓).
- **Vite build input:** `vite.config.ts` has NO `build.rollupOptions.input` today → `vite build` bundles ONLY `index.html`; `demo.html` is dev-only. Dev needs zero config. Recommend landing the 4-line `build.rollupOptions.input` map (`main: index.html` + `demo: demo.html`) NOW even though prod-build registration is formally DEMO-04/Phase 4 — it removes a "works in dev, vanishes in prod" footgun. **Once `input` is an object you MUST list `main` or the app build breaks.** Leave `spikes.html` unlisted (it's being retired).
- Verify: `npm run build && ls dist/demo.html` (if the input map is landed); demo loads at `/demo.html` in dev.

### Wave 1 — Unified type model + verbatim engine
- New tree `frontend/src/demo/lib/` split as: `model.ts` (ALL world types — base ABAC + forward fields), `abac.ts` (engine **lifted verbatim** from `spikes/lib/abac.ts`, only the import line rebased), `seed.ts` (the 6-unit world arrays), `abac.test.ts` (ported, D-03). Splitting types from seed keeps the schema stable while the rich D-06 seed grows.
- **Lift `evaluate()` byte-for-byte.** Preserve the contract `evaluate(principal, requirement) -> { decision, rules[], overrides[], failed[] }`; 4 conjunctive base rules (Clearance, Domain tier, Need-to-know, Affiliation) each emitting a human-readable `detail`; per-domain tier compare via `TIERS[domain].indexOf`; deny overrides (`revoked`, `securityHold`) force DENY; `decision = basePass && overrides.length === 0`. **Never collapse per-domain tiers** (the #1 forbidden regression — kills ENGINE-02 / success criterion #4).
- Fold the forward types (per-entity `EntityPolicy` from `policy.ts`, `shielded`/`allowlist`/`Deployment` from `obligations.ts`, `AttrEvent` from `auditlog.ts`, `Envelope` from `contract.ts`, `Credential` claims from `credential.ts`) into `model.ts` as **types only** — their *functions* stay in `spikes/` as Phase 2/3 reference; do NOT lift them.
- Test split already works: `vite.config.ts:24-29` excludes `e2e/**`; Playwright `testDir: ./e2e`. New `demo/lib/*.test.ts` auto-run under `vitest run`. Port ONLY `abac.test.ts`; **preserve the original 4 subjects/4 resources as the seed head** so the 6 hard-coded fixture assertions stay green.

### Wave 2 — Shared world-state store (single `useReducer`, MODEL-02)
- ONE `useReducer` holding `{ units, subjects, resources, events, hubIndex, currentRole, abacTarget, seq }`. NO new state library.
- Expose via the official React.dev **split-context** pattern (`WorldStateContext` + `WorldDispatchContext`), mirroring the repo's existing `AuthContext`. No prop-drilling.
- **The decision is DERIVED, never stored** — computed in the Decision Explorer via `useMemo(() => evaluate(...), [subject, resource])`. Storing it (or a `RECOMPUTE` action) is the locked anti-pattern. Reducer MUST return NEW subject objects (immutable updates) or the `useMemo` won't invalidate.
- **6 core actions:** `SET_ROLE`, `SET_TARGET` (no log), `APPROVE_ATTRIBUTE` / `REVOKE_ATTRIBUTE` (Approver — mutate compartments, flip DENY↔ALLOW), `TOGGLE_SECURITY_HOLD` (Security Officer — deny override), `REQUEST_ATTRIBUTE` (Manager — **log-only, zero mutation**; this is the SoD crux). Every mutation appends an event.
- Event entry is a **superset of the spike `AttrEvent` { seq, subjectId, op, value?, actor }** so Phase 3 `reconstructSubject`/`whoCanAccess` plug in unchanged; `actor` = the operating role that fired the action.

### Wave 3 — Persistent chrome + Decision Explorer (the visible surface)
- `DemoRoot` renders, ABOVE the swappable view: `<DemoBanner/>` (non-dismissable `[DEMO / MOCK]`, `sticky top-0`, no close button/state — structural, so MODEL-03 holds by construction) and `<RoleSwitcherHeader/>` (operating-role `<select>` of the 8 `ROLES`, bound to the store's `currentRole` via `SET_ROLE` — NOT `useState`; D-08). Keep both as standalone components so Phase 4's shell **re-hosts** them. Do NOT copy the spike `Shell` tab nav (DEMO-01 forbids per-mechanism tabs).
- One reusable `<MockTag/>` (modeled on `ui.tsx` `Pill`) is the single `[MOCK]` convention for simulated trust signals (Phases 2–3 lean on it).
- **Decision Explorer** (D-09): subject + resource + domain pickers → live ALLOW/DENY via the shared `DecisionTrace` (`spikes/components/ui.tsx`, reuse — don't fork) → role-driven action panel rendering buttons purely from `ROLES[currentRole].ops.includes(op)`, with the explicit "no access-decision authority — separation of duties" empty state for Admin/Sponsor/Subject/Personnel-Mgr. Actions dispatch to the store and the trace recomputes live.

---

## Unified schema (frozen in Phase 1, D-05)

Seed-only fields are inert in Phase 1 but MUST be present + realistically valued so the store is never reshaped. Full field-by-field inventory with `file:line` provenance in `research/01-engine.md §1` and `research/01-seed.md §1`.

- **Entity (6 units):** `id: UnitId`, `name`, `accessProfile` (BROAD/READ_MOST/INFRA_ONLY/OWN_ONLY/TERRITORIAL — seed-only), `policy` (per-entity release policy — seed-only, P3), `agreements` (evaluated). Default all 6 units mutually-agreed; demonstrate denial via tier / need-to-know / shielding / overrides, not by withholding agreements.
- **Subject:** `id`, `name`, `unit` (was `homeEntity`), `clearance` ([MOCK] external, read-only, evaluated), `domainAuth` (per-domain tier, evaluated), `compartments` (evaluated), `flags.{revoked,securityHold}` (evaluated), `subunit`/`deployment`/`territory` (seed-only, P3).
- **Resource:** `id`, `name`, `domain`, `requiredTier`, `minClearance`, `requiredCompartments` (all evaluated), `ownerUnit` (was `ownerEntity`), `shielded`/`allowlist` (seed-only, P3), `assetKind` (display).
- **Widen the `Compartment` union** additively (add `SIGINT`, `STOCKWATCH`, `HOMELAND`, etc.) so need-to-know reads realistically across ~30 subjects. Add values, don't rename (referenced by abac/policy/credential/auditlog).
- **Extend `AttrOp`** with `SET_REVOKED`/`CLEAR_REVOKED` so the Approver revoke action is event-sourced and replay-reconstructable in P3 (today revocation is flag-only).
- **TIERS / clearance — reuse spike scales verbatim:** Clearance `UNCLASSIFIED<CONFIDENTIAL<SECRET<TOP_SECRET`; COMPUTER `STANDARD<PRIVILEGED<ROOT`; DATA `INTERNAL<RESTRICTED<CLASSIFIED`; PHYSICAL `LOBBY<RESTRICTED_AREA<SECURE_VAULT`.

### Seed volume + named contrast actors
~6 units × ~5 subjects + ~5 resources ≈ 30/30 (rich, D-06). Per-unit profiles per AUTH-MODEL §12 (Mil A/B broad; Intel reads-broad/shielded-out; Infra physical-read; Industry strict-NTK+leak-target; Home Guard territorial). Hard-name these acceptance fixtures (assert in ported tests):
- **CA-1 clean ALLOW** (ENGINE-01) — same-unit subject/resource, all 4 rules pass.
- **CA-2 tier-only DENY** (ENGINE-02) — TOP_SECRET clearance but PHYSICAL tier too low vs a SECURE_VAULT facility; clearance ✓, tier ✗ (the headline "clearance fine, tier too low").
- **CA-3 override DENY** (ENGINE-03) — CA-1 profile but `revoked` OR `securityHold`; seed BOTH so the Security Officer hold action has a live target and the two override kinds render distinctly.
- **CA-4 need-to-know DENY** (ENGINE-01) — cleared, correctly-tiered outsider vs `requiredCompartments:[STOCKWATCH]`.
- Forward actors seeded now for P2/P3: FW-1 intel shielded brief, FW-2 deployed "Field Hospital" subunit + support obligations, FW-3 industry stock-secret leak target, FW-4 hub pointers, FW-5 rogue-issuer credential.

---

## Consolidated risk register

| # | Risk | Sev | Mitigation | Source note |
|---|------|-----|------------|-------------|
| R1 | **Two owner taxonomies not fused** (`EntityId` vs the 6 `UnitId`s) ⇒ Phase 3 re-keys every record | HIGH | Unify on the 6 units in Phase 1 (the ⚑ decision above); carry context fields inline seed-only | engine R1, store OQ1, seed R1 |
| R2 | **Storing the computed decision** / in-place subject mutation ⇒ stale UI, second source of truth | HIGH | Decision is `useMemo(evaluate(...))` only; forbid any `decision` field / `RECOMPUTE` action; reducer returns new objects; add a test asserting new ref + flipped decision | store §3/§6 |
| R3 | **Collapsing per-domain tiers** into one ladder ⇒ kills ENGINE-02 / criterion #4 | HIGH | Verbatim lift preserves `TIERS` + per-domain `indexOf`; do not "tidy" | engine R3, seed §4 |
| R4 | **Demo "works in dev, vanishes in prod"** (no `rollupOptions.input` today) | MED | Land the `input` map (with `main`!) in Phase 1; verify `dist/demo.html` | entry R1/R3 |
| R5 | **Demo leaks into the main app bundle / onto the router** | MED | Keep the demo an island; grep `src/routes src/main.tsx src/components` for `src/demo` imports = empty | entry R2 |
| R6 | **Revocation is flag-only, not an event op** ⇒ AUDIT-02 replay gap | MED | Add `SET_REVOKED`/`CLEAR_REVOKED` to `AttrOp` now; route reducer revoke through an event | seed R2 |
| R7 | **Banner placed per-view** (the spike `Shell.tsx:37` mistake) ⇒ a future view omits it | MED | Mount banner/header in `DemoRoot` outside the swappable region | entry R6 |
| R8 | **SoD violation** — grant button exposed to wrong role (Admin/Manager) | MED | Gate ONLY via `ROLES[role].ops.includes(op)`; never inline `role === ...`; test rendered op-set per role | store §6 |
| R9 | **Ported tests break** from seed-id drift | MED | Preserve original 4+4 fixtures as the seed head, or inline them in the test | engine R4 |
| R10 | **Rich seed crowds the pickers** (NOT the trace — trace is one triple) | MED | Group pickers by unit (`optgroup`); default to the CA-1 triple; each contrast actor reachable in ≤2 picks. Do NOT thin data (D-06) | seed R4 |

---

## What is explicitly NOT in Phase 1 (deferred, per CONTEXT)
- The functions behind the forward types — `evaluateWithPolicy` (policy.ts), obligation/shielding eval (obligations.ts), `Network` contract (contract.ts), `issueCredential`/`verifyCredential` (credential.ts), `reconstructSubject`/`whoCanAccess` (auditlog.ts). Types modelled now; functions land in Phase 2/3.
- A second evaluator: `policy.ts:65 evaluateWithPolicy` is a divergent evaluator with shorter `detail` strings — do NOT lift into Phase 1; if promoted later it must reuse the same `Rule`/`Decision` types.
- Deleting `frontend/src/spikes/` (retired, removed in a later cleanup).
- Legibility affordances for the rich seed (filtering/search/curated default) — Phase 4 / ui-phase.

---

## Detail notes
- `research/01-engine.md` — unified type model, verbatim-lift map, engine contract invariants, test porting.
- `research/01-store.md` — store shape, 6 actions, live-recompute, split-context exposure, role gating, SoD empty state.
- `research/01-entry.md` — `demo.html`/`main.tsx` recipe, exact vite.config diff, router-isolation proof, banner/header/MockTag structure.
- `research/01-seed.md` — full field inventory, per-unit seed design, named contrast + forward actors, TIERS.

## Resolved decisions
1. **Entity-taxonomy fusion (⚑ above)** — RESOLVED: unify on the 6 units. Locked as CONTEXT **D-10** (2026-05-21).
