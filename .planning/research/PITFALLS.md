# Pitfalls Research

**Domain:** Adding Network→Platform→Application digital-resource access to an existing demo with a parallel Physical Access Zone model (v2.1)
**Researched:** 2026-06-02
**Confidence:** HIGH — grounded in the actual v2.1 source files (`model.ts`, `physical-access.test.ts`, `world-state.tsx`, `seed.ts`, `access-resolution-explorer.tsx`), requirements (`v2.2-REQUIREMENTS.md`), and project decisions (`PROJECT.md`).

> **Scope note:** This file covers pitfalls specific to v2.2 (Phases 9–11). The v2.0/v2.1 pitfall record
> (over-engineering toward production, hollow mock, audit replay, mock HMAC conflation, etc.) was
> written 2026-05-21 and remains valid for the full demo. This file focuses on the incremental risks
> introduced by adding a parallel digital-resource model to an already-shipped zone model.

---

## Critical Pitfalls

### Pitfall 1: Cross-Tier Inheritance Confusion — Grant on Network Silently Satisfies Platform Check

**What goes wrong:**
The v2.1 zone resolver (`resolveGrant` in `model.ts`) walks up the ancestor tree and inherits grants
from matching-zone-type ancestors. If the v2.2 `resolveResourceGrant` copies this pattern naively, a
Network grant propagates down to Platform and Application. RSRC-GRANT-02 forbids this explicitly:
"each tier always requires explicit authorization — no automatic inheritance across tiers." The
demo would pass a Platform access check whenever a Network grant exists, without the person holding
a Platform-specific grant.

**Why it happens:**
`resolveGrant` is the most prominent resolver in `model.ts` with a clear, readable loop. It looks like
the natural template. The v2.1 zone-type-matching guard (`ancestor.zone_type === zone.zone_type`) is
what blocks cross-type inheritance there; but for digital resource tiers there is no analogous "same
tier type" check that can be applied — Network and Platform are different tiers, not the same type
at different levels.

**How to avoid:**
Write `resolveResourceGrant` without any ancestor-walk. It simply finds an active grant for the
exact resource ID. The tier prerequisite chain (Network grant required before Platform resolution
proceeds) is evaluated as an independent gate inside `resolveResourceAccess`, not by walking the
hierarchy in the grant-lookup step. Enforce with a unit test: person holds only a Network grant →
`resolveResourceAccess(person, platform, ...)` returns `allow: false`, reason
`PREREQUISITE_NOT_MET` — this test must exist and pass before any UI is built.

**Warning signs:**
- `resolveResourceGrant` contains a loop that iterates over `parent_id` chain.
- No Vitest test named something like `cross-tier-inheritance-blocked` or `network-grant-does-not-satisfy-platform`.
- The resolution trace says "Grant resolved" for a Platform when only a Network grant exists in the seed.

**Phase to address:** Phase 9 (model + engine). Define the function and the blocking test before any
resolver logic is written.

---

### Pitfall 2: Advisory Zone-Prerequisite Rendered as a Hard Gate in the UI Trace

**What goes wrong:**
PROJECT.md records the decision: "zone-prerequisite link is advisory — non-blocking warning in trace."
If the digital resource resolution trace renders the zone-prerequisite check as a standard gate row
(red X = failure that contributes to DENY), the demo will show DENY when a person lacks zone access,
contradicting the model decision. A demo audience cannot distinguish "advisory warning rendered amber"
from "hard gate rendered red" unless the UI makes the distinction explicit.

**Why it happens:**
The existing `ZoneResolutionTrace` component in `access-resolution-explorer.tsx` uses a two-symbol
pass/fail pattern: green check or red X. It is typed to `ZoneAccessResult`. When building the digital
resource trace, a developer copies this pattern and adds the zone-prerequisite as a third row using
the same styling. The `allow` flag then gets set to `false` when the zone check fails, because that
is how every other gate row works.

**How to avoid:**
The `resolveResourceAccess` return type must separate the advisory from the gates. Use a shape like:

```typescript
interface ResourceAccessResult {
  allow: boolean;
  gates: ResourceGateResult[];       // clearance + tier grants — these determine allow
  zoneAdvisory?: {                   // zone-prereq: present only when applicable
    satisfied: boolean;
    detail: string;
  };
}
```

The `allow` flag must never be influenced by `zoneAdvisory.satisfied`. Build a distinct
`ZonePrerequisiteAdvisory` sub-component with amber/yellow styling that explicitly labels itself
"Advisory (non-blocking)." Write the test before the UI: `resolveResourceAccess` where zone prereq is
unsatisfied must return `allow: true`.

**Warning signs:**
- `resolveResourceAccess` return type has zone check inside the same `gates` array as clearance and grant gates.
- Resolution trace renders the zone row in red (same tone as a hard gate failure) when zone access is missing.
- No Vitest test covering "zone prerequisite unsatisfied → still ALLOW."
- The `allow` flag is `false` in any case where only the zone advisory is unsatisfied.

**Phase to address:** Phase 9 (define return type and write test) and Phase 11 (render advisory
distinctly from hard gates). Both phases must hold the same contract.

---

### Pitfall 3: Application Classification Override — App's minClearance Diverges from Its Platform

**What goes wrong:**
PROJECT.md records the decision: "Application inherits its Platform's classification." The `Resource`
interface in `model.ts` carries `minClearance` as a field set per-resource. If the v2.2 seed or type
definition allows an Application to carry an independently-authored `minClearance` that differs from
its Platform, the resolution engine silently evaluates clearance against the wrong threshold. A seed
author writing `minClearance: "CONFIDENTIAL"` on an Application whose Platform is `SECRET` creates a
scenario the model explicitly forbids — and the demo will show someone with CONFIDENTIAL clearance
accessing a resource that should require SECRET.

**Why it happens:**
TypeScript cannot enforce cross-record constraints at the type level. Seed records are written by
hand. Without an explicit validator (like v2.1's `isValidZoneTypeCombination`), nothing prevents
the inconsistency from being seeded.

**How to avoid:**
Add a `validateResourceClassification(resource: DigitalResource, allResources: DigitalResource[])` 
function to `model.ts` that returns an error string when an Application's `minClearance` differs from
its parent Platform. Call it from the seed test file for every Application in the seed.
Consider a builder function `makeApplication(platform: Platform, name: string, ...)` that sets
`minClearance` by reference from the Platform record, making manual override require deliberate
circumvention. Document the constraint in a seed comment: "Application minClearance MUST equal
parent Platform minClearance — do not set independently."

**Warning signs:**
- Application seed records have `minClearance` literals typed by hand rather than derived from parent.
- No test asserting `app.minClearance === platform.minClearance` for every Application.
- Resolution trace shows different clearance requirements for Platform vs Application in the same hierarchy.

**Phase to address:** Phase 9 (define validation function in model.ts) and Phase 10 (seed authoring —
use builder functions, run validators against every Application record).

---

### Pitfall 4: WorldState Explosion — Six New Top-Level Arrays Added Without Grouping

**What goes wrong:**
`WorldState` in `world-state.tsx` currently has `zones`, `grants`, `delegates`, `entryLogs`,
`visitorPasses`, and `disabledGrantIds` for the physical access model. If v2.2 adds `networks`,
`platforms`, `applications`, `resourceGrants`, `resourceDelegates`, and `disabledResourceGrantIds`
as six more top-level fields, the reducer grows proportionally: `seedWorld()` becomes ~80+ lines, the
`Action` union accumulates 4–6 more cases, and the reducer switch is harder to read. `Set<string>`
fields (the `disabledGrantIds` pattern) are not serializable; doubling them doubles the fragility.
v2.3 (datasets) will apply the same pressure again.

**Why it happens:**
v2.1 was added incrementally and each type was appended to `WorldState` across phases. The same
incremental pattern applied to v2.2 has more entity types and produces proportionally more sprawl.

**How to avoid:**
Group v2.2 additions into a `DigitalResourceWorld` sub-object:
```typescript
interface DigitalResourceWorld {
  networks: Network[];
  platforms: Platform[];
  applications: Application[];
  resourceGrants: ResourceAccessGrant[];
  resourceDelegates: ResourceAccessDelegate[];
  disabledResourceGrantIds: Set<string>;
}
```
The reducer handles `SET_DIGITAL_RESOURCE_WORLD` and `TOGGLE_RESOURCE_GRANT` as targeted actions on
this sub-object. `seedWorld()` initializes it from a single `SEED_DIGITAL_RESOURCES` import.
v2.3 can add a `DatasetWorld` sub-object without touching `zones` or resource fields.

**Warning signs:**
- `WorldState` interface has more than 20 top-level fields.
- `Action` union has more than 25 cases.
- `seedWorld()` function body exceeds ~50 lines.
- A `TOGGLE_RESOURCE_GRANT` action reuses the `grantId` field name also used by `TOGGLE_GRANT`
  (name collision risk across two different grant collections).

**Phase to address:** Phase 9 (WorldState structure design, before writing any reducer cases).

---

### Pitfall 5: Prerequisite Chain Uses Unstable `now` — Interactive Explorer Shows Inconsistent Decisions

**What goes wrong:**
The v2.2 gate chain (RSRC-ACCESS-05) evaluates: (1) clearance, (2) explicit grant per tier,
(3) prerequisite tier grants active. Step 3 means calling `isGrantActive(networkGrant, now)` when
resolving Platform access. If `now` is computed as `new Date()` at call time inside the resolver —
rather than from a stable `useMemo(() => new Date(), [])` at the component level — a grant expiring
at midnight causes inconsistent ALLOW/DENY flickers during interactive exploration. Worse, test
fixtures that do not use a fixed constant will become non-deterministic on grant-boundary dates.

**Why it happens:**
The existing `AccessResolutionExplorer` has a comment `// Stable now — once per mount, no
re-evaluation drift (Pitfall 4 guard)`. This is easy to miss when writing a new
`DigitalResourceExplorer` component from scratch. The resolver function itself is stateless and
correct; the problem is always in the caller.

**How to avoid:**
Keep the pattern already established in v2.1: all resolver and grant-check functions take `now: Date`
as an explicit parameter (this is already true for `isGrantActive`, `resolveGrant`,
`resolveZoneAccess`, `isDelegateActive` in `model.ts`). In the new explorer component, use
`const now = useMemo(() => new Date(), [])`. Unit tests use a fixed constant (as
`physical-access.test.ts` uses `const NOW = new Date("2026-01-15T12:00:00Z")`).

**Warning signs:**
- Any resolver or grant-check function calls `new Date()` internally instead of receiving `now`.
- The digital resource explorer component does not have a `useMemo(() => new Date(), [])` call.
- Test fixtures use `new Date()` without a fixed date string.

**Phase to address:** Phase 9 (resolver function signatures and test fixture pattern) and Phase 11
(explorer component).

---

### Pitfall 6: Pattern Drift — Parallel Abstractions for the Same Concept

**What goes wrong:**
v2.1 established precise names for its patterns: `PhysicalAccessGrant`, `ZoneAccessDelegate`,
`isGrantActive`, `isDelegateActive`, `resolveGrant`. If v2.2 introduces parallel types and functions
with slightly different names or semantics for the same concept — for example, `ResourceGrant` vs
`ResourceAccessGrant`, or `isActive` vs `isGrantActive` — the codebase accumulates conceptual
synonyms. A future developer reading `model.ts` cannot tell which functions are the canonical
implementation and which are the variant. This is especially acute for the time-window logic: if
`isGrantActive` is duplicated as a slightly different `isResourceGrantActive` with different boundary
semantics (e.g., exclusive `<` instead of inclusive `<=`), the two models will disagree on boundary
cases.

**Why it happens:**
Developers naturally rename concepts when they feel the domain is "different enough." The physical
and digital resource models are structurally parallel but vocabulary-distinct, encouraging fresh
naming. Boundary semantics are particularly easy to accidentally diverge — the `<=` boundary
comparison in `isGrantActive` is a deliberate, tested choice that is invisible in a copy-paste.

**How to avoid:**
Before Phase 9 begins, write a one-page naming convention that explicitly maps v2.1 concepts to v2.2
equivalents: `PhysicalAccessGrant → ResourceAccessGrant`, `ZoneNode → DigitalResource (with tier
discriminator)`, `isGrantActive` (reuse, do not copy). Prefer reusing `isGrantActive` directly for
`ResourceAccessGrant` if the interface is compatible, rather than writing a separate function.
If a new function is necessary, name it explicitly to distinguish it (e.g.,
`isResourceGrantActive`) and document which v2.1 function it parallels.

**Warning signs:**
- `model.ts` has two functions with similar signatures but different names for the same time-window check.
- The `<=` boundary in `isGrantActive` is changed to `<` in a v2.2-specific copy.
- TypeScript interfaces for `ResourceAccessGrant` and `PhysicalAccessGrant` have the same fields with
  different field names (`resource_id` vs `zone_id` is intentional; `grantedUntil` instead of
  `valid_until` is drift).

**Phase to address:** Phase 9 (define naming convention and type shapes before writing implementations).

---

### Pitfall 7: Demo Isolation Breach — Adding a New Route Instead of a New DemoRoot Tab

**What goes wrong:**
A developer, wanting to surface the new digital resource panel quickly, adds a new file to
`frontend/src/routes/` (or creates a new `_component.tsx` under an existing route). TanStack file-based
routing regenerates `routeTree.gen.ts` the moment any route file changes, which is a generated file
that must never be hand-edited. This breaks the demo isolation constraint established from v2.0 and
held through v2.1: "Demo stays isolated — demo in `frontend/src/demo/`; no `routeTree.gen.ts`
changes until fullstack integration."

**Why it happens:**
The demo's `DemoRoot.tsx` tab-based navigation is not obvious to a developer who joins mid-milestone.
The TanStack routes directory pattern is the canonical app navigation pattern and the first thing
developers reach for. The existing Physical Access tab in `DemoRoot.tsx` is the only prior example
of the correct approach, and it may not be seen before a new route file is created.

**How to avoid:**
The correct pattern is: add a `"digital-access"` entry to the `ActiveView` type in `DemoRoot.tsx`,
add a button to the tab bar, add a branch in the conditional render. Do not create any file under
`frontend/src/routes/`. Document this in the Phase 11 UI spec task description. Add a pre-flight
check in the phase review: `git diff frontend/src/routeTree.gen.ts` must be empty.

**Warning signs:**
- Any new file appears under `frontend/src/routes/` during Phases 9–11.
- `routeTree.gen.ts` has a diff after Phase 11 completes.
- A developer runs `npm run dev` and sees a new route in the TanStack router tree for the digital resource panel.

**Phase to address:** Phase 11 (UI). The spec for the new tab must explicitly call out the `DemoRoot.tsx`
pattern and prohibit route files.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Copy `resolveGrant` and rename to `resolveResourceGrant` without removing ancestor-walk | Faster scaffolding | Silently enables cross-tier inheritance (Pitfall 1) — broken model | Never |
| Put Networks/Platforms/Applications in the flat `Resource[]` array with a `tier` discriminator | Reuses existing `Resource` type | Loses strict tree; parent/child queries become O(n) scans; tree browser UI cannot be built cleanly | Never — strict tree requires typed nodes with typed parent refs |
| `new Date()` inside resolver for `now` | One fewer function parameter | Non-deterministic tests; explorer flickers on grant-boundary dates (Pitfall 5) | Never in test code; never in resolver internals |
| Inline zone-advisory as a boolean flag inside the main gate chain | One return type instead of two | Flag gets lost across refactors; UI renders advisory as hard gate (Pitfall 2) | Never — the advisory/hard distinction is a model decision |
| Share `ZoneResolutionTrace` for digital resources by adding a prop | Reuse existing component | Component is typed to `ZoneAccessResult`; the `zoneAdvisory` field gets dropped; trace is structurally different | Acceptable to extract a shared `GateRow` primitive; never to reuse the whole trace component |
| Seed Application `minClearance` as hand-typed literals | Simple seed authoring | App can diverge from Platform classification silently (Pitfall 3) | Never — derive from Platform or validate at seed load |
| Add resource data as 6 new top-level `WorldState` fields | Straightforward to write | Reducer sprawl; `seedWorld()` bloat; v2.3 worsens it (Pitfall 4) | Never — use sub-object grouping |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| v2.1 zone model → zone-prerequisite link | Importing `resolveZoneAccess` directly inside `resolveResourceAccess` | Pass the zone grant result in as a computed parameter; keep zone and resource resolvers independent; zone result becomes `zoneAdvisory` on the resource result |
| `WorldState` `TOGGLE_GRANT` vs `TOGGLE_RESOURCE_GRANT` | Reusing the `grantId` field name in the new action type | Use distinct field names: `grantId` for physical, `resourceGrantId` for digital — same `Set<string>` pattern but named separately |
| `seed.ts` → adding digital resource exports | Appending more named exports to `seed.ts` forces all current `seed.ts` importers to re-evaluate | Group digital resource seed into `SEED_DIGITAL_RESOURCES` or a dedicated `seed-digital.ts` imported separately by `world-state.tsx` |
| `DemoRoot.tsx` → surfacing the new panel | Adding a route file under `src/routes/` | Add `"digital-access"` to `ActiveView`, add tab button, add conditional render branch — no route file (Pitfall 7) |
| `isGrantActive` reuse for `ResourceAccessGrant` | Writing a separate `isResourceGrantActive` with subtly different boundary logic | If `ResourceAccessGrant` has the same `valid_from`/`valid_until: Date \| null` shape, pass it directly to the existing `isGrantActive` — do not copy |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Recomputing full 3-gate prerequisite chain on every keystroke | Perceptible lag in the explorer | All resolution is O(n) over in-memory arrays; at demo scale (~30 resources, ~50 grants) this is negligible — no optimization needed | Not applicable at demo scale |
| Building the resource tree from flat arrays on every render | Minor flicker during tree expansion | `useMemo` over `getChildren` analog keyed on the typed resource arrays | Not applicable at demo scale |
| Resolving zone prerequisites by importing `resolveZoneAccess` into render code (not a `useMemo`) | Re-runs zone resolution on every parent render, not just when selections change | Keep zone advisory in the same `useMemo` block as the resource resolution result | Minimal impact at demo scale, but architectural correctness matters |

---

## Security Mistakes

This is a demo-only milestone — "security mistakes" means model correctness and non-misrepresentation.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Advisory rendered as denial in the UI (Pitfall 2) | Demo audience concludes the model is wrong; zone access appears to block network access when it should not | Test first: `resolveResourceAccess` returns `allow: true` with unsatisfied zone advisory before UI is built |
| Seeding Application `minClearance` below its parent Network's classification | Demonstrates an impossible scenario — a SECRET network accessible from a CONFIDENTIAL platform | Validation function in `model.ts` (Pitfall 3); seed test asserts the invariant |
| Omitting expired/future grant examples from the mock seed | RSRC-GRANT-03 (time-limited grants) is invisible in the demo; the time-window mechanism appears unvalidated | RSRC-SEED-05 requires active + expired + future grants across all three resource tiers; at least 2 seed grants per tier must fail `isGrantActive(g, NOW)` |
| Presenting the zone-advisory as "zone access required" in the trace label | Viewer concludes zone access is mandatory for all digital resources | Label the advisory row: "Zone access (advisory)" with a clear non-blocking annotation |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Advisory zone row styled identically to hard gate failure (Pitfall 2) | Viewer is confused: "why DENY when no zone requirement applies to this scenario?" | Amber/yellow "warning" row with explicit "Advisory (non-blocking)" label vs. red for hard gates |
| Flat dropdown listing all Networks/Platforms/Applications | Viewer cannot tell which Platform belongs to which Network | Tree-indented select or cascaded selectors: selecting Network first filters Platform dropdown (mirrors zone browser depth-indented pattern) |
| Resolution trace gate rows unlabelled per tier | 3-tier chain produces 3×3 gates; which clearance check is for which tier? | Group trace rows by tier: "Network gate", "Platform gate", "Application gate" as labeled sections |
| Grant toggle panel listing all resource grants across all tiers | Overwhelming; ~50 grants makes the panel unreadable | Filter to grants relevant to selected resource and its prerequisite chain (mirrors `relevantZoneIds` pattern from `access-resolution-explorer.tsx`) |
| No visual distinction between expired/future grants and active grants in the detail panel | Viewer cannot tell which grants are currently active | Show expired grants with strikethrough or gray; future grants with a clock icon and "Starts: [date]" |

---

## "Looks Done But Isn't" Checklist

- [ ] **Cross-tier inheritance blocked:** Vitest test exists: person has only a Network grant → Platform resolution = DENY with reason `PREREQUISITE_NOT_MET`. Test passes.
- [ ] **Advisory rendered as advisory:** `resolveResourceAccess` test asserts `allow: true` when zone prerequisite is unsatisfied. UI renders it amber/yellow with "advisory" label. Overall verdict is ALLOW.
- [ ] **Application classification validated:** Seed test calls `validateResourceClassification` for every Application record. Every Application's `minClearance` equals its parent Platform's.
- [ ] **Time-window coverage in seed:** At least one expired grant and one future grant exist per resource tier (RSRC-SEED-05). `isGrantActive(g, NOW)` returns `false` for at least 2 seed grants per tier.
- [ ] **Stable `now`:** Digital resource explorer uses `const now = useMemo(() => new Date(), [])`. No resolver function calls `new Date()` internally.
- [ ] **No `routeTree.gen.ts` changes:** `git diff frontend/src/routeTree.gen.ts` is empty after Phase 11.
- [ ] **Full prerequisite chain in trace:** Resolution trace for an Application shows clearance gate, Network grant gate, Platform grant gate, Application grant gate — not only the final tier.
- [ ] **Zone advisory never causes DENY:** Manually check the explorer: select a person with no zone grants, select a Network terminal resource with a zone prerequisite → verdict must be ALLOW with amber advisory row.
- [ ] **WorldState sub-object clean:** `WorldState` interface has a `digitalResources: DigitalResourceWorld` field, not 6 new top-level fields.
- [ ] **Demo builds clean:** `npm run build` produces zero TypeScript errors after Phase 11.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Cross-tier inheritance (discovered late in Phase 11) | HIGH | Rewrite `resolveResourceGrant` (trivial — remove loop); rewrite affected tests; manually verify all seed grant scenarios produce the correct tier verdicts |
| Advisory rendered as hard gate (discovered in demo review) | MEDIUM | Extract `ZonePrerequisiteAdvisory` component; change `resolveResourceAccess` return type to separate `zoneAdvisory`; update all callers |
| Application classification diverged in seed | LOW | Fix seed literals or introduce builder functions; run validator; no model change needed |
| WorldState sprawl already in reducer | MEDIUM | Introduce `DigitalResourceWorld` sub-object; refactor `seedWorld()` and reducer `digitalResources.*` access; update all `useWorld()` callsites |
| Unstable `now` causing test flicker | LOW | Remove `new Date()` from resolver internals; add `useMemo` to explorer component |
| Route isolation breach | MEDIUM | Delete the route file; move component to `DemoRoot.tsx` tab pattern; regenerate `routeTree.gen.ts`; verify clean diff |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Cross-tier inheritance | Phase 9: `resolveResourceGrant` defined without ancestor-walk; failing test before passing impl | Test named `cross-tier-inheritance-blocked` is green |
| Advisory vs hard gate | Phase 9: `ResourceAccessResult` type has `zoneAdvisory` separate field; test `allow: true` with unsatisfied zone; Phase 11: amber rendering, no DENY when only zone unsatisfied | Both test and visual check pass |
| Application classification override | Phase 9: `validateResourceClassification` in `model.ts`; Phase 10: seed test calls it for all Applications | Seed test green; no Application with mismatched `minClearance` |
| WorldState explosion | Phase 9: `DigitalResourceWorld` sub-object defined before any reducer cases | `WorldState` interface review at Phase 9 review gate; field count check |
| Unstable `now` | Phase 9: resolver signatures take explicit `now: Date`; test fixtures use fixed constant; Phase 11: explorer component has `useMemo` | All resolver tests use fixed `NOW`; explorer component reviewed |
| Pattern drift (naming/boundary) | Phase 9: naming convention documented before types are written | No duplicate time-window function exists in `model.ts`; no `valid_until` renamed to something else |
| Route isolation breach | Phase 11: UI spec explicitly prohibits route files; review gate includes `git diff routeTree.gen.ts` check | `routeTree.gen.ts` diff is empty |
| Seed missing expired/future grants | Phase 10: RSRC-SEED-05 checklist item with explicit count | At least 2 grants per tier where `isGrantActive(g, NOW)` is `false` |

---

## Sources

- `/Users/vidarbrevik/projects/janus-2.0/frontend/src/demo/lib/model.ts` — v2.1 model: `resolveGrant` ancestor-walk pattern, `isValidZoneTypeCombination`, `isGrantActive` boundary semantics (`<=`), `ZoneAccessResult` type, `PhysicalAccessGrant`/`ZoneAccessDelegate` interface shapes
- `/Users/vidarbrevik/projects/janus-2.0/frontend/src/demo/lib/physical-access.test.ts` — v2.1 test suite: `const NOW` fixed constant pattern, D3-13 inline-fixture pattern, cross-type-inheritance-blocked tests, boundary-inclusive tests
- `/Users/vidarbrevik/projects/janus-2.0/frontend/src/demo/store/world-state.tsx` — `WorldState` interface current shape, `seedWorld()` function, `Action` union, stable `now` pattern comment in `AccessResolutionExplorer`
- `/Users/vidarbrevik/projects/janus-2.0/frontend/src/demo/components/access-resolution-explorer.tsx` — "Stable now — once per mount" comment, `ZoneResolutionTrace` gate rendering pattern, `relevantZoneIds` filter pattern
- `/Users/vidarbrevik/projects/janus-2.0/frontend/src/demo/components/physical-access-panel.tsx` — sub-tab navigation pattern inside a parent panel
- `/Users/vidarbrevik/projects/janus-2.0/frontend/src/demo/DemoRoot.tsx` — `ActiveView` type, tab-button navigation, `WorldProvider` wrapping — the correct pattern for adding a new demo panel
- `/Users/vidarbrevik/projects/janus-2.0/.planning/milestones/v2.2-REQUIREMENTS.md` — RSRC-ACCESS-05 (gate chain), RSRC-GRANT-02 (no cross-tier inheritance), RSRC-ACCESS-04 (zone-prerequisite), RSRC-SEED-05 (time-window coverage)
- `/Users/vidarbrevik/projects/janus-2.0/.planning/PROJECT.md` — Key Decisions: "Application inherits Platform classification" and "zone-prerequisite is advisory non-blocking"; demo isolation constraint
- `/Users/vidarbrevik/projects/janus-2.0/CLAUDE.md` — Demo stays isolated (`frontend/src/demo/`); no `routeTree.gen.ts` changes until fullstack integration

---
*Pitfalls research for: v2.2 Network→Platform→Application digital-resource access added to Janus 2.0 demo*
*Researched: 2026-06-02*
