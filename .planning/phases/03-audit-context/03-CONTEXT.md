# Phase 3: Audit & Context - Context

**Gathered:** 2026-05-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Add two new demo views (Audit and Context) to the demo island (`frontend/src/demo/`), extending the 4-tab nav bar alongside the existing Decision Explorer and Federation Hub. Phase 3 delivers:

1. **Audit view (AUDIT-01, AUDIT-02)** — live append-only event log (grows from pre-seeded baseline + real user actions); O(1) materialized projection of current access state (slider at max = now); point-in-time reconstruction via a sequence-number range slider; "who can access resource R as of T?" recomputed by replaying the log. Wires the authorization lifecycle rule (D-11 / OQ-B) as a new ABAC rule dimension in the reconstructed access evaluation.
2. **Context view (CTX-01, CTX-02, CTX-03)** — three panels, top→bottom: per-entity policy divergence (same request, different outcomes by holding unit's policy); deployment-driven support-obligation toggle (HOME/ABROAD flips obligation-grant on/off, local state, no stored grant); directional shielding (shielded resources deny non-allowlisted requesters even with standing access).
3. **4-view tab bar** — extends the Phase 2 interim `DemoRoot` toggle to a `useState<'decisions' | 'federation' | 'audit' | 'context'>` tab bar; still throwaway; Phase 4 shell absorbs it.

Requirements covered: AUDIT-01, AUDIT-02, CTX-01, CTX-02, CTX-03.

**Not in this phase:** coherent shell + cross-view consistency + production build (Phase 4); real-time leak/anomaly detection (AUDIT-03, deferred/stretch); role-gating the Audit tab (Phase 4 shell concern); dispatching deployment changes into world-state (local-only).

</domain>

<decisions>
## Implementation Decisions

### Audit View Architecture
- **D3-01:** Pre-seed ~4 baseline `AttrEvent` entries in the initial world-state (same pattern as spike 007 — ensures AUDIT-01 baseline content from load), PLUS the real events appended by existing Decision Explorer actions. The existing `events: AttrEvent[]` slice in `world-state.tsx` is the source of truth; Phase 3 only reads it.
- **D3-02:** Point-in-time UI = a sequence-number range slider (min=0, max=events.length). Dragging to T replays events with `seq ≤ T` to reconstruct subject state; "who can access R as of T?" is recomputed from that reconstruction. Mirrors spike 007's proven interaction.
- **D3-03:** Slider defaults to max (= current state / "now"). A "Current state" chip labels the default O(1) projection explicitly, making the distinction visible without extra panels.
- **D3-04 (OQ-B resolved):** Wire the authorization lifecycle rule (D-11) in Phase 3. `AUTHORIZE_SUBJECT` / `WITHDRAW_AUTHORIZATION` events already in `AttrOp` (model.ts). Add "Authorization valid" as a new base rule in the audit reconstruction evaluator — a subject's `authorization.status !== AUTHORIZED` triggers a DENY distinct from tier/override/clearance failures. This satisfies AUDIT-02 success criterion (point-in-time replay captures the authorization gate) and resolves Phase 1 OQ-B ("seed now, evaluate Phase 3").

### Context & Policy View Architecture
- **D3-05:** Two separate tabs ("Audit" and "Context") — cleaner separation; gives Phase 4 shell granular control. No combined "Audit & Context" view.
- **D3-06:** Per-entity policy (CTX-01): assign 3 distinct policy flavors to the 6 demo units and seed in `demo/lib/seed.ts`:
  - `MILITARY_1`: standard (all rules)
  - `INTEL`: strict (TOP_SECRET clearance floor)
  - `INDUSTRY`: relaxed (no NTK / no affiliation checks)
  - `MILITARY_2`, `INFRA`, `HOME_GUARD`: inherit standard
  The Context policy panel picks a subject + resource, then shows all 6 units' verdicts side-by-side — divergence visible at a glance (mirrors spike 008's grid layout).
- **D3-07:** Deployment toggle (CTX-02) = local component `useState<Deployment>` — sufficient for the success criterion (toggle shows rule effect on/off); does NOT dispatch into world-state. Avoids adding a TOGGLE_DEPLOYMENT action and scope-creeping into audit events. Subunits sourced from the demo seed (adapt from `obligations.ts` `SUBUNITS` — same units, add to `seed.ts`).
- **D3-08:** Directional shielding (CTX-03): source shielded resources from `world-state.subjects` / `world-state.resources` where `shielded=true` and `allowlist` is set (D-05 forward fields already present in model.ts). Context evaluator (`demo/lib/obligations.ts`) receives the resource from world-state; requester is a UnitId picker.

### Demo Navigation
- **D3-09:** Extend the Phase 2 `DemoRoot.tsx` toggle from a boolean to a 4-tab `useState<'decisions' | 'federation' | 'audit' | 'context'>`. Simple tab button bar in/near the existing persistent header. Throwaway — Phase 4 shell absorbs it.
- **D3-10:** No cross-links from Decision Explorer to Audit. Cross-view linking is a Phase 4 consistency concern.
- **D3-11:** No role gate on the Audit tab in Phase 3 — available to all roles for demo visibility. Add a small note on-screen: "In production, Auditor role required." Role-gating is a Phase 4 shell concern.

### Lift Strategy
- **D3-12:** Three separate lib files mirroring spike naming: `demo/lib/auditlog.ts`, `demo/lib/policy.ts`, `demo/lib/obligations.ts`. Matches D-01/D-02 "lift proven spike logic verbatim, adapt to UnitId" pattern.
- **D3-13:** `reconstructSubject` and `whoCanAccess` (and equivalents) take a `subjects: Subject[]` parameter — NOT imported from seed directly. Components pass `worldState.subjects`. Makes functions testable in isolation.
- **D3-14:** Port Vitest tests alongside each lifted file (`auditlog.test.ts`, `policy.test.ts`, `obligations.test.ts`), adapted to UnitId and the demo model. Matches D-03 from Phase 1.

### Claude's Discretion
- Exact tab bar styling/placement within "in/near existing header, throwaway" — reuse the same shadcn/Tailwind patterns as the existing Phase 2 view toggle.
- The pre-seeded baseline events in D3-01: choose a narratively interesting set (one GRANT_COMPARTMENT, one SET_HOLD, one CLEAR_HOLD, one AUTHORIZE_SUBJECT minimum) that exercises every `AttrOp` visible in the log.
- Internal layout of Audit panels (event list formatting, slider placement, reconstructed-state display) and Context panels (grid vs column for the 6-unit policy divergence view) — keep legible per D-06 rich-seed note; Phase 4 owns final polish.
- How the authorization rule integrates with the existing `evaluate` fn in `abac.ts` vs. a parallel evaluator in `auditlog.ts` — planner's choice, constrained by D3-13 (injectable subjects, testable).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design contract & requirements
- `.planning/AUTH-MODEL.md` — authoritative model; §3 pure-computed ABAC, §4 attributes, §10–11 audit/context mechanics.
- `.planning/REQUIREMENTS.md` — AUDIT-01, AUDIT-02, CTX-01, CTX-02, CTX-03 rows.
- `.planning/ROADMAP.md` § "Phase 3: Audit & Context" — goal + 5 success criteria.
- `.planning/PROJECT.md` — DEMO/MOCK framing; constraints; key decisions.

### Carried-forward decisions (Phases 1 & 2)
- `.planning/phases/01-foundation/01-CONTEXT.md` — D-01/D-02 (lift spike logic into `demo/`, isolated entry, no router), D-03 (port tests), D-05 (frozen schema — shielding/deployment/policy seeded), D-09 (single Decision Explorer), D-10 (UnitId), D-11 (authorization lifecycle — OQ-B now resolved: wire in Phase 3), MODEL-02 (single store).
- `.planning/phases/02-federation-hub/02-CONTEXT.md` — D2-01/D2-04 (single world-state store, interim toggle pattern in DemoRoot).

### Proven patterns (spike findings)
- `.claude/skills/spike-findings-janus-2.0/SKILL.md` — index of validated mechanisms.
- `.claude/skills/spike-findings-janus-2.0/references/abac-engine.md` — engine conventions.

### Source code to lift from / build against
- `frontend/src/spikes/lib/auditlog.ts` — `reconstructSubject`, `whoCanAccess`, `AttrEvent`, `AccessRow` (lift verbatim, inject subjects param, adapt to UnitId).
- `frontend/src/spikes/lib/policy.ts` — `evaluateWithPolicy`, `EntityPolicy`, `POLICIES` (lift, re-key to UnitId, seed for 6 demo units).
- `frontend/src/spikes/lib/obligations.ts` — `evaluateSubunitAccess`, `evaluateResourceAccess`, `SUBUNITS`, `RESOURCES_CTX`, `standingAccess`, `hasObligation` (lift, re-key to UnitId, source resources from demo seed).
- `frontend/src/spikes/components/Spike007Audit.tsx` — reference UI: range slider + event list + reconstructed state + who-can-access panel.
- `frontend/src/spikes/components/Spike008Policy.tsx` — reference UI: subject/resource pickers + 3-column policy grid + DecisionTrace per policy.
- `frontend/src/spikes/components/Spike009Context.tsx` — reference UI: obligation panel (requester + subunit + HOME/ABROAD toggle) + shielding panel (requester + shielded resource).
- `frontend/src/spikes/lib/auditlog.test.ts`, `policy.test.ts`, `obligations.test.ts` — tests to port.
- `frontend/src/demo/store/world-state.tsx` — already has `events: AttrEvent[]`, `seq: number`. Phase 3 reads these; no new store slices needed.
- `frontend/src/demo/lib/model.ts` — `AttrEvent`, `AttrOp`, `EntityPolicy`, `Subunit`, `Deployment` forward types; `Resource.shielded`, `Resource.allowlist` fields.
- `frontend/src/demo/lib/seed.ts` — add: per-unit `POLICIES` (6 units, 3 flavors), `SUBUNITS` (adapted from obligations.ts), pre-seeded baseline `INITIAL_EVENTS`.
- `frontend/src/demo/components/DemoRoot.tsx` (or equivalent root) — extend to 4-tab nav.

### Codebase maps (conventions)
- `.planning/codebase/CONVENTIONS.md`, `.planning/codebase/STRUCTURE.md`, `.planning/codebase/STACK.md` — frontend naming/style/stack the demo must match.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`events: AttrEvent[]` and `seq` in world-state** — already present; Phase 3 reads and displays them. No new store slices.
- **`DecisionTrace` (`demo/components/ui.tsx`)** — reuse for the per-policy divergence traces in the Context view.
- **Spike 007/008/009 libs** — proven, Vitest-green; lift verbatim with UnitId adaptation.
- **Spike 007/008/009 UI components** — reference shapes for all three panels.

### Established Patterns
- **Single `useReducer` world-state, no new libraries** (MODEL-02) — Phase 3 reads but does not extend the store (events are already there).
- **Lift proven spike logic, don't rebuild** (D-01) — inject subjects as param (D3-13), not hardcode from seed.
- **Demo-island isolation** (D-02) — `frontend/src/demo/` only, no `routeTree.gen.ts` change.
- **Port tests alongside lifted libs** (D-03) — `auditlog.test.ts`, `policy.test.ts`, `obligations.test.ts`.

### Integration Points
- `DemoRoot.tsx` — extend 4-tab nav (replace Phase 2 boolean toggle).
- `demo/lib/seed.ts` — add `POLICIES`, `SUBUNITS`, `INITIAL_EVENTS` exports.
- New component files: `AuditView.tsx`, `ContextView.tsx` (and sub-panels as needed).
- New lib files: `demo/lib/auditlog.ts`, `demo/lib/policy.ts`, `demo/lib/obligations.ts` + their test siblings.

</code_context>

<specifics>
## Specific Ideas

- Audit view: drag the slider, watch the event list highlight which events are "applied vs future," and the reconstructed state + who-can-access panel recompute live. The authorization status shows as an additional row in the ALLOW/DENY rule trace when OQ-B is wired.
- Context view: policy divergence panel = 6-column (or 3+3 grid) showing MILITARY_1 (standard), INTEL (strict, TOP_SECRET floor), INDUSTRY (relaxed, no NTK/affiliation), and 3 standard clones — divergence visible when same subject+resource returns ALLOW from some units and DENY from others.
- Deployment toggle: exact interaction matches spike 009 — two tab-style buttons (HOME / ABROAD), immediate re-evaluation of obligation rule, result panel updates.

</specifics>

<deferred>
## Deferred Ideas

- **AUDIT-03 (leak/anomaly indicator)** — stretch requirement; not in Phase 3 scope. Deferred.
- **Dispatching deployment changes to world-state** — decided local-only (D3-07); if desired for the full shell experience, Phase 4 can promote it.
- **Role-gating the Audit tab** — Phase 4 shell concern (D3-11).
- **Cross-view links from Decision Explorer** — Phase 4 cross-view consistency (D3-10).
- **Delete `frontend/src/spikes/`** — carried from Phase 1; historical reference, cleanup later.

None of these are scope creep — they are explicit downstream-phase handoffs.

</deferred>

---

*Phase: 3-audit-context*
*Context gathered: 2026-05-22*
