---
phase: 12-demo-ui-tab-integration
plan: 05
subsystem: frontend
tags: [react, gate-chain-trace, role-gating, mutation-form, demo-ui]

requires:
  - plan: 12-02
    provides: "CLEARANCE_TONE export from access-resolution-explorer, TOGGLE_RESOURCE_GRANT-compatible world state, UPSERT_RESOURCE_GRANT reducer action"
  - plan: 12-03
    provides: "useIssueGrant mutation, getStoredUserRole helper, IssueGrantVariables type"
provides:
  - "ResourceAccessExplorer (exported): person + resource + datetime-local selectors driving a live resolveResourceAt gate-chain trace — verdict banner, always-shown policy-version row (fail-closed 'No active policy at this time.'), GATE_LABEL-mapped gate rows, amber-only non-blocking zone-advisory block"
  - "Interactive grant-toggle list dispatching TOGGLE_RESOURCE_GRANT (resourceGrantId field) — flips ALLOW/DENY live because resolveResourceAt filters disabledResourceGrantIds per D-06"
  - "Admin-gated Issue Grant form (D-01 admin-only): collapsible '+ Issue new grant', sentinel-default Selects, isPending-disabled submit, inline 403/generic errors, success flows through WorldState upsert (no optimistic local append)"
affects: [12-06]

tech-stack:
  added: []
  patterns:
    - "Evaluation timestamp = useState over a datetime-local input seeded from a once-per-mount useMemo(() => new Date(), []) — evalTime derives via useMemo(new Date(timestampInput)) so every selector change recomputes resolution with no submit button"

key-files:
  created:
    - frontend/src/demo/components/resource-access-explorer.tsx
  modified: []

key-decisions:
  - "resolveResourceAt called with person.unit (verified Subject field) — 12-UI-SPEC's person.org_id pseudocode is wrong and would not compile; plan's IMPORTANT CORRECTION followed"
  - "Policy row renders window bounds only (`Policy: {from} – {until}`) per the plan's pinned format — result.policyVersion carries no label field, so UI-SPEC's `[policy.label]` variant is unimplementable from the trace result"
  - "Grant-toggle rows labeled person — valid_from – valid_until: all rows in the filtered list share person+resource, so the validity window is the only distinguishing datum"

requirements-completed: [RSRC-UI-03, RSRC-UI-05, RSRC-UI-06 (grant-issuing UI)]

coverage:
  - id: D1
    description: "Selecting person/resource or moving the timestamp recomputes the gate-chain trace live via resolveResourceAt (person.unit, never org_id); trace never re-derives ALLOW/DENY; policy-version row always shown with fail-closed no-policy copy"
    requirement: "RSRC-UI-03"
    verification:
      - kind: build+grep
        ref: "npm run build; grep person.org_id==0, person.unit==1, resolveResourceAt imported from digital-resource-selectors"
        status: pass
    human_judgment: false
  - id: D2
    description: "Zone-advisory block renders amber-only (bg-green/bg-red confined to the verdict banner) with the mandatory 'Advisory (non-blocking)' Pill and explanatory note; grant toggle dispatches TOGGLE_RESOURCE_GRANT with resourceGrantId (never grantId)"
    requirement: "RSRC-UI-05"
    verification:
      - kind: build+grep
        ref: "grep 'Advisory (non-blocking)'==1, resourceGrantId>=1, ': \"TOGGLE_RESOURCE_GRANT\", grantId'==0, bg-green/bg-red only at the verdict banner line"
        status: pass
    human_judgment: false
  - id: D3
    description: "Issue Grant trigger visible only for getStoredUserRole()==='admin' (never admin||manager); non-admin sees the exact admin-login note; submit disabled+'Issuing…' through mutation.isPending; success collapses+resets and grant arrives via WorldState"
    requirement: "RSRC-UI-06"
    verification:
      - kind: build+grep
        ref: "grep '\"admin\" ||'==0, '+ Issue new grant'==1, 'Issuing controls require an admin login.'==1, 'Leave blank for permanent grant.'==1"
        status: pass
    human_judgment: false
  - id: D4
    description: "Full build + suite green: npm run build zero TS errors; 17 files / 225 tests pass (baseline unchanged — this plan adds a component, no new unit tests)"
    requirement: "RSRC-UI-03"
    verification:
      - kind: build+unit
        ref: "npm run build && npm run test"
        status: pass
    human_judgment: false

duration: ~6 min
completed: 2026-07-03
status: complete
---

# Phase 12 Plan 05: Access Resolution Explorer Summary

**Built the Access Resolution Explorer — person/resource/datetime-local selectors driving a live `resolveResourceAt` gate-chain trace (verdict banner, always-shown policy-version row with the fail-closed no-policy copy, GATE_LABEL-mapped gate rows, and the mandatory amber non-blocking zone-advisory block) plus an interactive TOGGLE_RESOURCE_GRANT checkbox list — and the D-01 admin-only Issue Grant form that submits through 12-03's `useIssueGrant` and reflects the new grant via WorldState, never an optimistic local append.**

## Task Commits

1. **Task 1: Selectors + live gate-chain trace + grant toggle** — `435b8b2` (feat)
2. **Task 2: Issue Grant form (admin-gated)** — `4cb6da4` (feat)

## Accomplishments

- `ResourceResolutionTrace` (local): green/red verdict banner from `result.allow` only; policy row always shown (`Policy: {from} – {until}` with `"open"` bounds, or exact "No active policy at this time." when `policyVersion` is null); one gate row per `result.gates` entry via the `GATE_LABEL` map with a `Gate: {kind}` fallback; zone-advisory block (only when `zoneAdvisory !== null`) uses amber classes exclusively — ⚠ glyph, "Zone prerequisite" label, `detail ?? reason` text, the mandatory `<Pill tone="amber">Advisory (non-blocking)</Pill>`, and the "does not affect the ALLOW/DENY verdict" note
- Resolution memo calls `resolveResourceAt(world.digitalResources, personId, person.clearance, person.unit, resourceId, evalTime)` — the plan's verified `person.unit` correction over UI-SPEC's non-compiling `person.org_id`; grants are never pre-filtered here (D-06 lives in the selector)
- Flat `[TIER] Name` resource Select across all three tiers with sentinel defaults; Person card shows clearance Pill + MockTag via 12-02's `CLEARANCE_TONE`; Resource card shows tier Pill + effective-classification Pill (Application inherits via `effectiveClassification`)
- Grant toggle filters `world.digitalResources.grants` to selected person × resource, checkbox dispatches `{ type: "TOGGLE_RESOURCE_GRANT", resourceGrantId }` — disabling the sole covering grant flips ALLOW→DENY live
- Issue Grant form mirrors 12-04's IssueDelegateSection: trigger hidden (exact note shown) for non-admin; `actor_org_id` filled with the grantee's own `.unit` (vestigial server-side per handlers.rs:151-152); `mutateAsync` in try/catch with inline 403 ("Not authorized." bold) vs generic error blocks; submit `disabled={mutation.isPending}` reading "Issuing…"

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- `npm run build` — zero TS errors (both tasks)
- `npm run test` — 17 files / 225 tests, all pass (baseline preserved)
- `grep -c 'person.org_id'` — 0; `grep -c 'person.unit'` — 1
- `grep -c '"admin" ||'` — 0 (D-01 admin-only, no manager fallback)
- Acceptance greps: `Advisory (non-blocking)` 1, `resourceGrantId` 1, wrong-field `grantId` 0, `+ Issue new grant` 1, admin-login note 1, permanent-grant hint 1; `bg-green`/`bg-red` appear only on the verdict-banner line, never in the advisory block

## Self-Check: PASSED

- frontend/src/demo/components/resource-access-explorer.tsx — FOUND
- Commit 435b8b2 — FOUND
- Commit 4cb6da4 — FOUND
