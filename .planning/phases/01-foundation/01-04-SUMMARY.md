---
phase: 01-foundation
plan: "04"
subsystem: demo-ui
tags: [react, ui, abac, sod, role-gating, decision-explorer, mock-banner]

requires:
  - "world-state store (useWorld/useWorldDispatch, 6 actions) — 01-03"
  - "abac.ts (evaluate/principalFromSubject/requirementFromResource) — 01-02"
  - "model.ts (ROLES, unitName, RoleId, Domain, Compartment, Op) + seed.ts — 01-02"
  - "demo island entry (demo.html, main.tsx, placeholder DemoRoot) — 01-01"
provides:
  - "ui.tsx: spike presentational helpers lifted verbatim (Pill/Card/Field/Select/DecisionTrace) + MockTag"
  - "DemoBanner.tsx: non-dismissable [DEMO / MOCK] banner (no state, no hide control, sticky)"
  - "RoleSwitcherHeader.tsx: 8-role operating-role switcher bound to store currentRole (SET_ROLE)"
  - "DecisionExplorer.tsx: pickers (unit-grouped) -> live useMemo trace -> op-gated action panel + event log"
  - "DemoRoot.tsx: final composition — WorldProvider + banner/header outside the swappable region"
affects: [phase-2, phase-3, phase-4]

tech-stack:
  added: []
  patterns:
    - "Verbatim UI lift: spike ui.tsx copied; only import rebase + MockTag added"
    - "Op-membership gating: ROLES[currentRole].ops.includes(op) — never role identity (R8)"
    - "Derived-not-stored decision: useMemo(evaluate) keyed on store subject/resource refs (R2)"
    - "Persistent chrome outside swappable <main> so no view can omit it (R7)"
    - "Verbatim locked copy kept as single-line constants so the formatter can't split it"

key-files:
  created:
    - frontend/src/demo/components/ui.tsx
    - frontend/src/demo/components/DemoBanner.tsx
    - frontend/src/demo/components/RoleSwitcherHeader.tsx
    - frontend/src/demo/components/DecisionExplorer.tsx
  modified:
    - frontend/src/demo/DemoRoot.tsx

key-decisions:
  - "Subject/resource pickers use native <select> with <optgroup> (unit grouping, R10); the lifted Select helper has no optgroup support so the domain picker uses it and the grouped pickers use raw selects"
  - "Domain picker binds to abacTarget.domain but the evaluated decision uses the resource's own domain/tier (requirementFromResource) — domain is a target-triple seam, captioned as such; not a decision input in Phase 1"
  - "grant/revoke/request target compartment is derived from the resource's required-vs-held compartment diff (dynamic), not a hardcoded BLACKWING like the spike"
  - "Verbatim copy strings extracted to SOD_EMPTY/LOG_EMPTY constants to survive prettier line-wrapping while staying greppable (UI-SPEC contract)"

patterns-established:
  - "Component comments must avoid the literal forbidden tokens used by grep gates (close/dismiss/useState/react-router/routeTree) to keep contract greps clean"

requirements: [ROLE-01, ROLE-02, ENGINE-01, ENGINE-02, ENGINE-03, MODEL-03]
status: complete
---

## What was built

The visible surface of the Foundation phase at `/demo.html`: a non-dismissable
`[DEMO / MOCK]` banner, an 8-role operating-role switcher bound to the shared store, and a
single **Decision Explorer** (subject/resource/domain pickers → live ALLOW/DENY
`DecisionTrace` → role-gated action panel + append-only event log). The placeholder
`DemoRoot` is replaced with the final `WorldProvider` composition; banner + header sit
outside the swappable region (R7). The decision is derived via `useMemo` and never stored
(R2); actions are gated purely by op membership (R8).

## Verification

- grep contracts: MockTag + DecisionTrace present; banner non-dismissable (no state/hide control, sticky); role switcher store-bound (SET_ROLE, useWorld, no useState); DecisionExplorer op-gated (ROLES[..].ops.includes, no `role ===`); verbatim copy present; optgroups + MockTag present; DemoRoot composed; router-isolated (no app router / route tree import).
- `npx tsc --noEmit -p tsconfig.app.json` → no errors under `src/demo/`.
- `npx vite build` → demo bundle builds (demo-*.js ~27 kB) alongside main; `npx vitest run` → 44/44 pass.
- **Human-verify checkpoint (Task 4): APPROVED.** The viewer confirmed all five Phase 1 success criteria on screen (#1 banner + [MOCK]; #3 live trace; #4 tier-vs-clearance distinction; #5 role-driven action set with live grant→ALLOW and hold→DENY flips, plus the ENGINE-03 deny-override line).

## Commits

- `9953f64` feat(01-04): persistent chrome — UI helpers + MockTag, non-dismissable banner, store-bound role switcher
- `c95111d` feat(01-04): Decision Explorer — live trace + op-gated action panel + event log
- `7611a40` feat(01-04): compose final DemoRoot — banner + header outside swappable region

## Notes / forward risk

- The domain picker is a target-triple seam in Phase 1 (the resource carries its own domain/tier, which drives evaluation). If Phase 2/3 needs domain to actually scope/filter resources, wire it into the requirement or the picker's resource list.
- Inherited from 01-03: REQUEST_ATTRIBUTE logs a GRANT_COMPARTMENT-style event; Phase 3 audit replay must distinguish request entries so SoD is preserved on reconstruction.
