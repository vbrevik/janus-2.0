---
phase: 12-demo-ui-tab-integration
plan: 04
subsystem: frontend
tags: [react, tree-view, role-gating, mutation-form, demo-ui]

requires:
  - plan: 12-02
    provides: "CLEARANCE_TONE export from access-resolution-explorer, UPSERT_RESOURCE_DELEGATE reducer action"
  - plan: 12-03
    provides: "useIssueDelegate mutation, getStoredUserRole helper, IssueDelegateVariables type"
provides:
  - "ResourceBrowser (exported): Network→Platform→Application tree (roots expanded, apps collapsed) + full resource detail panel — tier, inherited-aware classification, org-links-by-role with active/expired badges, active policy window, active grants, delegates, Platform-only NSM annotation card"
  - "Admin-gated Issue Delegate form below the Delegates card (D-01 admin-only): collapsible, sentinel-default Selects, isPending-disabled submit, inline 403/generic errors, success flows through WorldState upsert (no optimistic local append)"
affects: [12-06]

tech-stack:
  added: []
  patterns:
    - "IssueDelegateSection keyed on selected.id — form state remounts per resource selection, so the Resource Select's default always tracks the currently browsed node"

key-files:
  created:
    - frontend/src/demo/components/resource-browser.tsx
  modified: []

key-decisions:
  - "Delegate windows checked via isWindowActive(valid_from, valid_until, now) directly — model.ts isDelegateActive is typed to ZoneAccessDelegate (zone_id) and never called here"
  - "granted_by_org_id (vestigial server-side per handlers.rs:151-152) filled with the delegate person's own .unit — no invented magic org string"

requirements-completed: [RSRC-UI-01, RSRC-UI-02, RSRC-UI-06 (delegate-issuing UI)]

coverage:
  - id: D1
    description: "Tree renders buildResourceTree's pre-nested children (no re-derived parent_id filter); root Networks seeded into expandedIds, Applications collapsed until Platform expands"
    requirement: "RSRC-UI-01"
    verification:
      - kind: build+grep
        ref: "npm run build; grep buildResourceTree/node.children resource-browser.tsx"
        status: pass
    human_judgment: false
  - id: D2
    description: "Detail panel shows tier, classification with ' (inherited)' suffix for Applications, org links grouped by role (all shown, Pill communicates active/expired), active policy, active grants, delegates, Platform-only NSM card with slate-only pills"
    requirement: "RSRC-UI-02"
    verification:
      - kind: build+grep
        ref: "grep '(inherited)'==1, tone=\"slate\" x3, 'not enforced as access gates in v2.2'==1, isDelegateActive==0"
        status: pass
    human_judgment: false
  - id: D3
    description: "Issue Delegate trigger visible only for getStoredUserRole()==='admin' (never admin||manager); non-admin sees the exact admin-login note; submit disabled+'Issuing…' through mutation.isPending; success collapses+resets and delegate arrives via WorldState"
    requirement: "RSRC-UI-06"
    verification:
      - kind: build+grep
        ref: "grep '\"admin\" ||'==0, '+ Issue new delegate'==1, 'Issuing controls require an admin login.'==1"
        status: pass
    human_judgment: false
  - id: D4
    description: "Full build + suite green: npm run build zero TS errors; 17 files / 225 tests pass (baseline unchanged — this plan adds a component, no new unit tests)"
    requirement: "RSRC-UI-01"
    verification:
      - kind: build+unit
        ref: "npm run build && npm run test"
        status: pass
    human_judgment: false

duration: ~4 min
completed: 2026-07-03
status: complete
---

# Phase 12 Plan 04: Resource Browser Summary

**Built the Resource Browser — a collapsible Network→Platform→Application tree beside a full resource detail panel (tier, Platform-inherited classification for Applications, org-links-by-role with active/expired badges, active policy window, active grants, delegates, Platform-only NSM annotation badges) — plus the D-01 admin-only Issue Delegate form that submits through 12-03's `useIssueDelegate` and reflects the new delegate via WorldState, never an optimistic local append.**

## Task Commits

1. **Task 1: Tree + detail panel** — `16f0967` (feat)
2. **Task 2: Issue Delegate form (admin-gated)** — `9eabd38` (feat)

## Accomplishments

- `ResourceTreeNodeRow` recursion consumes `buildResourceTree`'s pre-nested `node.children` directly (no parent_id re-derivation); `expandedIds` is seeded with every root Network id — the one deliberate divergence from zone-browser's empty-Set init, per UI-SPEC
- Detail lookup mirrors `resolveResourceAt`'s search-all-three-arrays pattern; Application classification computed via `effectiveClassification(selected, platforms)` and rendered with the " (inherited)" suffix
- Org links grouped by first-seen role order, ALL links shown with green "active" / slate "expired" Pills; delegate windows checked with `isWindowActive` directly (the zone-typed `isDelegateActive` is never imported)
- NSM annotations card (Platform only): two `tone="slate"` Pills (sikkerhetsgodkjenning / forsvarlig sikkerhetsnivå), the mandatory "Static annotations — not enforced as access gates in v2.2." note, and the SECURITY_APPROVAL authorizing-authority line when that org-link exists
- Issue Delegate form: trigger hidden (note shown) for non-admin; sentinel-default Selects (person → first subject, resource → currently selected node via `key={selected.id}` remount); `mutateAsync` in a try/catch with inline 403 ("Not authorized." bold) vs generic error blocks; submit `disabled={mutation.isPending}` reading "Issuing…"

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- `npm run build` — zero TS errors (both tasks)
- `npm run test` — 17 files / 225 tests, all pass (baseline preserved)
- `grep -c 'isDelegateActive' resource-browser.tsx` — 0
- `grep -c '"admin" ||' resource-browser.tsx` — 0 (D-01 admin-only, no manager fallback)
- Acceptance greps: `buildResourceTree` 2, `node.children` 2, `(inherited)` 1, `tone="slate"` 3, NSM note 1, `+ Issue new delegate` 1, admin-login note 1, open-delegation hint 1

## Self-Check: PASSED

- frontend/src/demo/components/resource-browser.tsx — FOUND
- Commit 16f0967 — FOUND
- Commit 9eabd38 — FOUND
