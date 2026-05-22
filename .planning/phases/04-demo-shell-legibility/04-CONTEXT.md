# Phase 4: Demo Shell & Legibility — Context

**Gathered:** 2026-05-22
**Status:** Ready for planning
**Mode:** Discuss (2 decisions captured)

<domain>
## Phase Boundary

Compose all four views into one coherent 5-tab navigable shell; enforce cross-view consistency; add plain-prose decision summaries; confirm production build passes. No new mechanisms — this is composition and legibility polish.

</domain>

<decisions>
## Implementation Decisions

### D-01: Tab structure — 5 tabs
Split the current "Federation Hub" tab into two distinct tabs:

| Tab | Content | Current state |
|-----|---------|---------------|
| Decision Explorer | ABAC decision engine + role switcher | Unchanged |
| Federation Hub | HubDiscoveryPanel + ExchangeTranscriptPanel + CredentialVerifyPanel | Extract from FederationHub.tsx |
| Entity Console | UnitConsolePanel (per-unit holdings, inbox, outbox) | Extract from FederationHub.tsx |
| Audit | AuditView | Unchanged |
| Context | ContextView | Unchanged |

- `type ActiveView = "decisions" | "federation" | "entity-console" | "audit" | "context"`
- Default active tab stays "decisions" (unchanged)
- FederationHub.tsx currently renders all 4 panels; after this phase, it renders only 3 (Hub, Exchange, Credentials). UnitConsolePanel is rendered directly in DemoRoot when view === "entity-console".

### D-02: Legibility gate — plain-prose summary sentence
Add one plain-prose summary sentence under each ALLOW/DENY verdict in the decision trace components. The sentence explains WHY in plain English, not rule names.

**Placement:** Immediately below the verdict badge (before the per-rule list), in slate-600 text, italic.

**Pattern:**
- ALLOW: "Access is allowed because [subject] holds all required attributes for [resource]."
- DENY (clearance): "Access is denied because [subject]'s clearance ([level]) is below the required [level]."
- DENY (hold): "Access is denied because [subject] is under a security hold."
- DENY (domain tier): "Access is denied because [subject] lacks the required [domain] tier ([required])."
- DENY (NTK): "Access is denied because [subject] is missing required compartment(s): [list]."
- DENY (affiliation): "Access is denied because [subject]'s entity ([entity]) has no agreement with [owner]."

**Components to update:**
- The inline decision display in `DecisionExplorer` section of DemoRoot/Decision Explorer view
- `ContextView.tsx` policy divergence grid — each cell's ContextTrace
- Possibly `AuditView.tsx` whoCanAccess — already shows ✓/✗ per subject, can add a line tooltip or skip if too verbose

Scope: Decision Explorer and ContextView are the primary legibility targets. AuditView who-can-access is a list (not a trace) — skip prose there; it's already clear from ✓/✗ names.

### D-03: Cross-view consistency (already satisfied by architecture)
All views share the same `WorldProvider` context. Actions taken in any view dispatch to the same reducer. The Audit view reads from the same `state.events` and `state.subjects`. No additional wiring is required — verify only.

### D-04: Production build gate
`npm run build` already passes (verified in Phase 3). Phase 4 must re-verify after tab restructure and legibility changes. `ls dist/ | grep demo` confirms demo entry present.

</decisions>

<code_context>
## Existing Code Insights

Key files:
- `frontend/src/demo/DemoRoot.tsx` — 4-tab shell, ActiveView type, WorldProvider wrapper
- `frontend/src/demo/components/FederationHub.tsx` — renders HubDiscoveryPanel, ExchangeTranscriptPanel, CredentialVerifyPanel, UnitConsolePanel
- `frontend/src/demo/components/AuditView.tsx` — no changes needed
- `frontend/src/demo/components/ContextView.tsx` — add prose to policy divergence ContextTrace
- Decision trace rendering is inline in DemoRoot.tsx (the Decision Explorer section)

The UnitConsolePanel is a named export from FederationHub.tsx (or possibly from its own file — read before planning).

</code_context>

<specifics>
## Specific Ideas

- Plain-prose summary should use actual subject/resource names from props, not generic placeholders
- 5th tab label: "Entity Console" (not "Unit Console" or "Holdings")
- Active tab styling must match existing pattern exactly: `bg-slate-800 text-white rounded px-3 py-2 text-sm`
- Inactive: `border border-slate-300 text-slate-600 hover:bg-slate-50 rounded px-3 py-2 text-sm`

</specifics>

<deferred>
## Deferred Ideas

None raised during discussion.

</deferred>
