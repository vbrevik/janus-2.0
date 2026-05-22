---
plan: 03-03
phase: 03-audit-context
status: complete
completed: 2026-05-22
tasks_total: 2
tasks_completed: 2
commits: 1
subsystem: demo-island
tags: [context-view, policy-divergence, deployment-toggle, shielding, CTX-01, CTX-02, CTX-03]
dependency_graph:
  requires:
    - 03-01 (lib foundations — evaluateWithPolicy, evaluateSubunitAccess, evaluateResourceAccess, POLICIES, SUBUNITS, SUPPORT_OBLIGATIONS)
  provides:
    - frontend/src/demo/components/ContextView.tsx (ContextView named export)
  affects:
    - DemoRoot.tsx (wired in 03-04)
tech_stack:
  added: []
  patterns:
    - local ContextTrace component (not exported) — standard Decision interface via obligations.ts
    - useMemo for derived policy/principal/req computations — deps on picker state + subjects/resources
    - shielded resources sourced exclusively from worldState.resources where shielded===true (D3-08)
    - deployment toggle as local useState — no world-state dispatch (D3-07)
key_files:
  created:
    - frontend/src/demo/components/ContextView.tsx
  modified: []
decisions:
  - Built full component in one pass (Tasks 1+2 in single file creation, per plan's explicit allowance)
  - ContextTrace uses standard Decision interface (not spike's ContextDecision with effect/active fields) — obligations.ts returns standard Decision shape
  - shieldResId initializes from shieldedResources[0]?.id — guards empty array gracefully
  - allowlist cast as UnitId for UNITS lookup with fallback to raw string for unknown ids
metrics:
  duration_minutes: 15
  files_created: 1
  files_modified: 0
---

# Phase 03 Plan 03: ContextView — Policy Divergence, Deployment Toggle, Shielding

## One-Liner

ContextView with 3-section layout: 6-unit policy divergence grid (CTX-01), deployment-driven support obligation toggle (CTX-02), and worldState-sourced directional shielding panel (CTX-03).

## What Was Built

Single new file: `frontend/src/demo/components/ContextView.tsx` — named export `ContextView`.

**Policy Divergence section (CTX-01):**
- Subject and resource pickers in a 2-column Card grid
- 6-unit results grid (`grid-cols-3 gap-4 mt-4`) — one Card per UnitId with unit name, policy label, and `DecisionTrace result={decision}` cell
- Derived via `evaluateWithPolicy(principal, req, POLICIES[uid])` for each of the 6 UNIT_IDS
- `principal` and `req` computed via `principalFromSubject` / `requirementFromResource` from `lib/abac`

**Deployment Toggle section (CTX-02):**
- `ContextTrace` local component (not exported) — takes `{ label: string; decision: Decision }`, renders ALLOW/DENY with rules list
- Requester picker + subunit picker + HOME/ABROAD toggle buttons (blue=active, slate=inactive)
- `evaluateSubunitAccess(obligRequester, {...selectedSubunit, deployment}, SUPPORT_OBLIGATIONS)`
- Local `useState<Deployment>('HOME')` — no world-state dispatch (D3-07)

**Directional Shielding section (CTX-03):**
- `shieldedResources = useMemo(() => resources.filter(r => r.shielded === true), [resources])` — sourced exclusively from `worldState.resources` (D3-08)
- Allowlist display: `<Pill tone="red">shielded</Pill>` + `allowlist:` + one `<Pill>` per allowlisted unit
- Empty shielded-resources guard renders fallback prose
- `evaluateResourceAccess(shieldRequester, selectedShieldedResource)` — null-guarded

**All intro and hint copy from UI-SPEC Copywriting Contract present verbatim:**
- Policy panel intro: "Each holding entity authors its own release policy..."
- Obligation panel intro: "Two new context-driven rule classes for the 6-unit scenario..."
- Obligation hint: "Try: Inventory/Infrastructure → 1st Recon Coy..."
- Shielding hint: "Try: Military Unit 1 → INTEL Threat Brief..."

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Tasks 1+2 (single pass) | 3ff25f4 | feat(03-03): create ContextView — policy divergence section (CTX-01) |

## Deviations from Plan

### Combined Task Execution

The plan explicitly allowed building the full component in one pass: "you can build the full component in one pass since it is a single file." Tasks 1 and 2 were executed together, resulting in one commit covering both CTX-01 and CTX-02/CTX-03.

### ContextTrace Decision Shape Adaptation

The spike's `ContextTrace` used a `ContextDecision` type with `effect`/`active` fields (spike-specific). The demo `obligations.ts` returns the standard `Decision` interface (`rules: Rule[]` with `name, pass, detail`). The local `ContextTrace` was adapted to render the standard `Decision` shape — consistent with how `DecisionTrace` in `ui.tsx` works.

No functional difference — the rule evaluation logic is identical; only the rendering prop names differ.

## Verification

TypeScript: `npx tsc --noEmit --project tsconfig.app.json` — 0 errors.

Manual smoke (after DemoRoot wired in Plan 03-04):
- Policy panel: select Dana Reyes (SECRET) + Classified File Share → INTEL column shows DENY (TOP_SECRET floor), INDUSTRY shows ALLOW (relaxed)
- Deployment: INFRA requester + 1st Recon Coy, HOME → DENY; ABROAD → ALLOW
- Shielding: MILITARY_1 → INTEL Threat Brief → ALLOW; MILITARY_2 → DENY

## Known Stubs

None — all data sourced from worldState.resources and worldState.subjects (live world-state), POLICIES/SUBUNITS/SUPPORT_OBLIGATIONS from seed.ts.

## Threat Flags

No new network endpoints, auth paths, or trust boundaries introduced. All evaluation is pure in-memory function calls over demo seed data.

## Self-Check: PASSED

- [x] frontend/src/demo/components/ContextView.tsx exists
- [x] Commit 3ff25f4 exists in git log
- [x] 0 TypeScript errors
- [x] ContextView named export present
- [x] ContextTrace not exported
- [x] DecisionTrace used for policy divergence grid
- [x] shielded === true filter in place
- [x] All 6 UNIT_IDS in UNIT_IDS constant
