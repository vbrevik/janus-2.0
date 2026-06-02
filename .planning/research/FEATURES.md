# Feature Research — v2.2 Digital Resource Access (Network → Platform → Application)

**Domain:** Classified digital-resource authorization model for a defense/government federated ABAC demo
**Researched:** 2026-06-02
**Confidence:** HIGH (grounded in existing codebase, v2.1 patterns, SEED-009/NSM anchors, and seeded RSRC requirements)

---

## Context and Constraints

This is a **DEMO/MOCK ONLY** milestone layering a digital-resource access model onto the existing v2.1
physical-access demo. All code lives in `frontend/src/demo/`; no backend is involved. The v2.2 model
must mirror v2.1 zone patterns as closely as possible to reduce novelty, maximize reuse of existing
types/helpers, and keep the demo coherent as a single world-state.

**Pre-existing features that v2.2 must NOT re-implement:**
- Pure-computed ABAC engine (`abac.ts`)
- 5-tier clearance ladder and `CLEARANCE_RANK` map in `model.ts`
- `UnitId` 6-unit scenario, subjects, and world-state store
- `PhysicalAccessGrant`, `ZoneAccessDelegate`, `isGrantActive`, `isDelegateActive`, `resolveGrant`, `resolveZoneAccess`
- v2.1 demo UI tabs (zone browser, access resolution explorer, entry log view)

**Decided before this research:**
- Application inherits its Platform's classification (no independent per-app classification in demo scope)
- Zone-prerequisite link is **advisory** (warning in trace, non-blocking — does not flip ALLOW to DENY)
- No multi-homing (Platform belongs to exactly one Network; Application belongs to exactly one Platform)

---

## How Classified Digital-Resource Access Works (Defense/Government Context)

In NSM/NATO practice, the access model for classified systems follows a strict layered structure:

**Tier 1 — Network:** A logically or physically segregated communications environment approved to carry
traffic at a given classification level. Examples from the Norwegian/NATO context:
- NORNet RESTRICTED (National Restricted, `RESTRICTED`)
- MilNet SECRET / FISFIS (Tactical Secure, `SECRET`)
- NATO-R (NATO Restricted, `RESTRICTED`)
- NATO-S (NATO Secret, `SECRET`)
- NATO-TS (NATO Top Secret, `TOP_SECRET`)

Connecting to a network requires personal clearance at or above the network's classification level AND
an explicit network-access grant (controlled by the network's admin org). Clearance alone is not
sufficient — the grant is need-to-know at the network level.

**Tier 2 — Platform:** A workstation, server, or terminal that is physically connected to a specific
network and is approved (sikkerhetsgodkjent) to process information at that network's classification
level. To use a platform, a person must hold an active network grant for that platform's host network
AND hold an explicit platform grant. An active network grant does not automatically grant platform
access — need-to-know is per-platform.

**Tier 3 — Application:** A software system (mission application, database client, messaging system)
running on a specific platform. Access requires an active platform grant for the host platform AND an
explicit application grant. Application classification is bounded by (and inherits from) its platform.

**Zone-prerequisite:** In practice, physical access to the room where the terminal resides is often an
administrative prerequisite before a digital grant is issued. In the demo model this link is advisory:
if the person lacks an active zone grant for the platform's terminal room, the resolution trace shows a
warning but the digital access result is not flipped to DENY. This mirrors real-world cases where
remote access removes the physical dependency.

**Time-windowing:** Temporary network access (contractor on NATO-R for 30 days, visiting exchange
officer on MilNet SECRET for an exercise) is standard practice. Every grant carries `valid_from` /
`valid_until` with the same null-boundary semantics as v2.1 zone grants.

**Delegation:** The admin org controlling a network, platform, or application can delegate
access-granting authority to a named person (e.g., a unit security officer) or another org (e.g., a
subordinate unit). The delegate can then issue grants for that resource on behalf of the admin org.

---

## Feature Landscape

### Table Stakes (A Demo of This Model Must Have These)

Features whose absence makes the demo unable to tell its story. Maps directly to RSRC / RSRC-ACCESS /
RSRC-GRANT / RSRC-DELEG / RSRC-SEED / RSRC-UI requirement groups.

| Feature | Why Expected | Complexity | RSRC Req | Notes |
|---------|--------------|------------|----------|-------|
| 3-tier resource hierarchy (Network → Platform → Application) types | Core model claim; without it there is no v2.2 | LOW | RSRC-01, RSRC-05 | Strict tree enforced in seed data; no multi-homing in demo |
| Classification per resource from 5-tier ladder | Every resource must carry a grade for the clearance gate to fire | LOW | RSRC-02, RSRC-03 | Application inherits Platform's classification (decided); platform holds the `classification` field; application reads from parent |
| Dual org ownership per resource (admin_org_id + asset_owner_org_id) | Mirrors v2.1 `ZoneNode` exactly; expected by any reviewer who has seen the zone model | LOW | RSRC-04 | Same field names as `ZoneNode`; reuse `UnitId` type |
| Strict parent-child references (Platform.network_id, Application.platform_id) | Without parent refs the tier-chain access gate cannot walk the tree | LOW | RSRC-05 | Enforced in seed data; no runtime enforcement needed in mock |
| `ResourceAccessGrant` with valid_from / valid_until | Time-windowing is a core model claim | LOW | RSRC-GRANT-01 | Null-boundary semantics identical to `PhysicalAccessGrant`; reuse `isGrantActive` verbatim |
| Per-resource grants, no cross-tier inheritance | Each tier always requires explicit authorization; this is the key security property | LOW | RSRC-GRANT-02 | Resolution trace must state "Network grant active — Platform grant still required" explicitly |
| Access resolution gate chain (clearance → explicit grant per tier → prerequisite tier grant active) | The three-gate chain is the demo's main claim about how digital access works | MEDIUM | RSRC-ACCESS-01 to RSRC-ACCESS-05 | Gate 1: clearance ≥ resource classification. Gate 2: active grant for this resource. Gate 3: active grant for parent resource |
| Zone-prerequisite advisory link | Without this, v2.1 and v2.2 are completely disconnected worlds | MEDIUM | RSRC-ACCESS-04 | Advisory only; warning in trace but does not flip ALLOW to DENY; uses existing `resolveZoneAccess` infrastructure; requires Platform to carry optional `terminal_zone_id` |
| `ResourceAccessDelegate` type and delegation display | Mirrors v2.1 `ZoneAccessDelegate` exactly; expected once zone delegation is shown | LOW | RSRC-DELEG-01 | Reuse `isDelegateActive` verbatim; add `resource_id + resource_type` instead of `zone_id` |
| Mock dataset: 3+ Networks, 2-3 Platforms per network, 1-2 Applications per platform | A demo with one network and one platform tells no story | MEDIUM | RSRC-SEED-01 to RSRC-SEED-04 | 6-unit scenario supports: NORNet RESTRICTED (INFRA-owned), MilNet SECRET (MILITARY_1), NATO-R (INTEL-hosted); 2-3 platforms each; 1-2 apps per platform |
| Grants spanning active / expired / future states | Without temporal variety the demo cannot show time-windowed access behavior | LOW | RSRC-SEED-05 | Same pattern as v2.1 seed: `valid_until` in the past for expired, future date for pending |
| Resource Browser UI (Network → Platform → Application tree with classification badges) | Without a visual tree the hierarchy is invisible to a demo audience | MEDIUM | RSRC-UI-01, RSRC-UI-02 | Mirrors `zone-browser.tsx` structure; expand/collapse tree; detail panel shows admin_org, asset_owner_org, active grants, delegates |
| Digital Access Resolution Explorer (person + resource selectors + gate trace) | The resolution trace is the demo's payoff — seeing ALLOW/DENY with gate-by-gate explanation | MEDIUM | RSRC-UI-03 | Mirrors `access-resolution-explorer.tsx`; gate trace shows each step with pass/fail; zone-prerequisite advisory appears as a warning row when relevant |

### Differentiators (What Makes This Demo Distinctive)

Features that go beyond basic correctness and make the model legible and compelling to a defense/government audience.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Inline zone-prerequisite warning in the digital resolution trace | Shows the physical/digital access intersection in one view — reviewer sees "platform access ALLOWED BUT no zone grant for the terminal room" in a single trace | MEDIUM | Requires at least one Platform in the seed to have `terminal_zone_id` pointing to a v2.1 zone; advisory check calls existing `resolveZoneAccess` |
| Realistic classification tier names in the UI (NORNet RESTRICTED, MilNet SECRET, NATO-R) | Defense/government audience recognises the names immediately; abstract labels like "Network A" undercut credibility | LOW | Pure labelling; no model change; names go in the resource `name` / `description` fields |
| Expired-grant DENY case with clear trace explanation | Showing a person whose temporary access has lapsed is more convincing than always-ALLOW cases | LOW | One or two expired grants in the seed; trace says "grant expired [date]" |
| Pending-grant DENY case (future-dated access) | Shows that access is time-bounded from both sides | LOW | One future-dated grant; trace says "grant not yet active, activates [date]" |
| Cross-unit access scenario (MILITARY_2 subject accessing INTEL-administered platform) | Demonstrates the federated aspect — authorization crosses unit boundaries | LOW | Seed data choice only; no model change |
| ATO and security-level annotations on Platform detail panel | Grounds the demo in NSM §6-3 / §6-2 without building the full lifecycle; gives reviewers familiar landmarks | LOW | Static boolean fields `approved_to_operate` and `security_level_assessed` on Platform; displayed as badges; not wired as access gates |

### Anti-Features (Scope Traps for This Demo Milestone)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Approval-to-operate (sikkerhetsgodkjenning) as an access gate | SEED-009 §6-3 explicitly mentions it; seems like a natural fit | Modelling the ATO lifecycle (initial approval, re-approval on change, revocation) adds a state machine with no access-decision payoff. A third gate in the resolution chain adds noise without insight for a demo audience | Static boolean `approved_to_operate` on Platform for visual realism. Do NOT wire it as a resolution gate in v2.2. Defer lifecycle to real-build milestone |
| Adequate security level (forsvarlig sikkerhetsnivå) as an access gate | Also in SEED-009 §6-2 | Requires modelling control baselines, risk assessment outputs, and periodic review — none are access decisions. Wiring this into the gate chain makes the trace unexplainable in a demo session | Static boolean `security_level_assessed` on Platform as an annotation badge. Not a gate |
| Multi-homing (Platform on two networks simultaneously) | Some real workstations are dual-homed (SECRET/RESTRICTED bridged) | Breaks the strict-tree invariant; requires modelling which network the grant path uses; adds a network-selection step to the resolution explorer; model decision already made | Already decided out of scope. If a dual-homed case is essential for the story, model it as two separate Platform records on separate networks |
| Grant inheritance across tiers (network grant cascades to platform) | Might seem like a time-saving UX convenience | Directly contradicts the core security property the demo is proving. "You need a grant at EVERY tier" is the message — inheritance makes the demo self-defeating | State the no-inheritance rule explicitly in the resolution trace: "Network grant active — Platform grant still required (no cross-tier inheritance)" |
| Full CRUD UI for resources and grants inside the demo | It's a demo — might as well make it editable | Moves scope from proof-of-concept to prototype; balloons the phase; the existing TOGGLE_GRANT checkbox pattern is sufficient to show grant manipulation | Use the TOGGLE_GRANT checkbox pattern already established in `access-resolution-explorer.tsx` for toggling grants on/off within a demo session |
| Application-level classification independent of its Platform | Allows finer-grained labelling | Already decided against. The model is simpler and more defensible (application is bounded by platform). Independently classifying an app creates cases where an app is classified higher than its host platform, which breaks the clearance gate logic | Application classification is always derived from its Platform record; no separate field; the resolution trace notes this derivation |
| NSM §6-6 communications/content control | SEED-009 cites it | Out of scope for an access-management demo; requires modelling content inspection or data-loss prevention, which is a separate domain | Note as a future real-build concern in the resource detail panel tooltip if desired |

---

## Feature Dependencies

```
[5-tier clearance ladder + CLEARANCE_RANK]      [already in model.ts — reuse verbatim]
    └──consumed by──> [Gate 1: clearance ≥ resource classification]

[isGrantActive(grant, now)]                     [already in model.ts — reuse verbatim]
    └──reused by──> [ResourceAccessGrant time-window check]

[isDelegateActive(delegate, now)]               [already in model.ts — reuse verbatim]
    └──reused by──> [ResourceAccessDelegate time-window check]

[resolveZoneAccess + PhysicalAccessGrant]       [already in model.ts — advisory call only]
    └──advisory-link-from──> [Zone-prerequisite warning in digital trace]

[DigitalNetwork / DigitalPlatform / DigitalApplication types]
    └──required by──> [ResourceAccessGrant (grant must ref a typed resource)]
    └──required by──> [ResourceAccessDelegate (delegate must ref a typed resource)]
    └──required by──> [resolveDigitalAccess gate chain]
    └──required by──> [Resource Browser UI]
    └──required by──> [Digital Access Resolution Explorer UI]

[ResourceAccessGrant]
    └──required by──> [Gate 2: active own-tier grant check]
    └──required by──> [Gate 3: active parent-tier grant check]
    └──displayed by──> [Resource detail panel (active grants list)]

[ResourceAccessDelegate]
    └──required by──> [Delegation display in resource detail panel]

[resolveDigitalAccess (three-gate chain + advisory)]
    └──required by──> [Digital Access Resolution Explorer UI]

[Mock dataset (networks + platforms + apps + grants + delegates)]
    └──required by──> [Resource Browser UI]
    └──required by──> [Digital Access Resolution Explorer UI]
    └──required by──> [Zone-prerequisite advisory] (dataset must include Platform with terminal_zone_id)
    └──required by──> [Expired / future-dated DENY cases]

[Resource Browser UI]
    └──enhances──> [Digital Access Resolution Explorer] (user picks resource in browser, opens resolver)
```

### Dependency Notes

- **Gate 3 depends on Gate 2, Gate 2 depends on Gate 1:** The resolution walks clearance → own-tier grant → parent-tier grant in sequence. All three are separate steps in the trace; a failure at any step short-circuits the remaining gates.
- **Zone-prerequisite advisory requires a zone_id on at least one Platform in the seed:** Without the link, the advisory warning never fires and the v2.1/v2.2 cross-domain connection is invisible. At minimum one Platform should carry `terminal_zone_id` pointing to an existing v2.1 zone.
- **Resource Browser and Digital Access Resolution Explorer share world-state:** Both read from the same in-memory demo world-state store (mirrors how `zone-browser.tsx` and `access-resolution-explorer.tsx` both use `useWorld()`). No separate state slice needed.
- **Application classification is derived, not stored independently:** Application records reference their Platform; the resolution gate reads `classification` from the Platform. The trace must make this derivation explicit to avoid confusion.
- **`isGrantActive` and `isDelegateActive` are reused without modification:** Both functions operate on `valid_from / valid_until: Date | null` and the `ResourceAccessGrant` / `ResourceAccessDelegate` types carry the same nullable date fields.

---

## v2.2 Scope Definition

### Must Have — Phase 9 (Model and Data)

Establishes typed model and seed data without which Phases 10 and 11 have nothing to render.

- [ ] `DigitalNetwork`, `DigitalPlatform`, `DigitalApplication` types in `model.ts` — RSRC-01 to RSRC-05
- [ ] `ResourceAccessGrant` type (id, person_id, resource_id, resource_type, valid_from, valid_until) — RSRC-GRANT-01
- [ ] `ResourceAccessDelegate` type mirroring `ZoneAccessDelegate` field-for-field — RSRC-DELEG-01
- [ ] `resolveDigitalAccess(...)` — three-gate chain with zone-prerequisite advisory — RSRC-ACCESS-01 to RSRC-ACCESS-05
- [ ] Mock dataset: 3 networks, 2-3 platforms each, 1-2 apps per platform, grants covering active/expired/future, at least 1 platform with `terminal_zone_id` — RSRC-SEED-01 to RSRC-SEED-05
- [ ] Vitest unit tests for `resolveDigitalAccess` covering all gate outcomes (clearance fail, no own-tier grant, parent-tier grant missing, zone-advisory warning fires, full ALLOW)

### Must Have — Phase 10 (UI)

- [ ] Resource Browser component (expand/collapse tree: Network → Platform → Application, classification badges, detail panel with admin_org, asset_owner_org, active grants, delegates) — RSRC-UI-01, RSRC-UI-02
- [ ] Digital Access Resolution Explorer (person + resource selectors, gate-by-gate trace panel, zone-prerequisite advisory warning row) — RSRC-UI-03
- [ ] New demo tab wiring both components (mirrors Physical Access tab)

### Add After Core is Working — Phase 11 (Polish and Integration)

- [ ] TOGGLE_GRANT checkbox in resolution explorer for interactive grant toggling (matches v2.1 pattern)
- [ ] ATO and security-level annotation badges on Platform detail panel (static; not a gate)
- [ ] Cross-link from Platform detail panel to zone browser tab (click `terminal_zone_id` to navigate to corresponding zone)

### Future Consideration (v2.3+ or Real Build)

- [ ] ATO lifecycle state machine for Platforms (approval, re-approval, revocation) — SEED-009 §6-3
- [ ] Adequate security level assessment workflow — SEED-009 §6-2
- [ ] NSM §6-6 communications/content control
- [ ] Multi-homing (Platform on multiple networks) — decided out of scope for demo
- [ ] Rust/PostgreSQL backend for resource hierarchy, grants, delegation

---

## Feature Prioritization Matrix

| Feature | Demo Value | Implementation Cost | Priority |
|---------|-----------|---------------------|----------|
| DigitalNetwork / Platform / Application types | HIGH | LOW | P1 |
| ResourceAccessGrant + isGrantActive reuse | HIGH | LOW | P1 |
| resolveDigitalAccess three-gate chain | HIGH | MEDIUM | P1 |
| Mock dataset (3 networks, platforms, apps, grants) | HIGH | MEDIUM | P1 |
| Resource Browser UI | HIGH | MEDIUM | P1 |
| Digital Access Resolution Explorer | HIGH | MEDIUM | P1 |
| Zone-prerequisite advisory in trace | MEDIUM | MEDIUM | P1 |
| ResourceAccessDelegate + delegation display | MEDIUM | LOW | P1 |
| Expired / future-dated DENY cases in seed | MEDIUM | LOW | P1 |
| Realistic classification tier names in UI | MEDIUM | LOW | P2 |
| TOGGLE_GRANT checkbox in resolution explorer | MEDIUM | LOW | P2 |
| ATO / security-level annotation badges on Platform | LOW | LOW | P2 |
| Cross-link Platform detail → Zone Browser tab | LOW | LOW | P3 |
| ATO lifecycle state machine | LOW (demo) | HIGH | Deferred |

---

## v2.1 Pattern Reuse Map

Exact v2.1 constructs that v2.2 mirrors, to prevent re-invention.

| v2.1 Construct | v2.2 Mirror | Delta |
|----------------|-------------|-------|
| `ZoneNode` (id, name, zone_type, parent_id, admin_org_id, asset_owner_org_id, requires_explicit_auth) | `DigitalNetwork` / `DigitalPlatform` / `DigitalApplication` | Add `classification: Clearance`; Platform adds `network_id: string` and optional `terminal_zone_id: string \| null`; Application adds `platform_id: string`; drop `zone_type` / `requires_explicit_auth` (not applicable) |
| `PhysicalAccessGrant` (id, person_id, zone_id, valid_from, valid_until) | `ResourceAccessGrant` | Replace `zone_id: string` with `resource_id: string` + `resource_type: "NETWORK" \| "PLATFORM" \| "APPLICATION"` |
| `isGrantActive(grant, now)` | **Reuse verbatim** | None; function operates on compatible `valid_from / valid_until: Date \| null` fields |
| `ZoneAccessDelegate` (id, zone_id, delegate_type, delegate_person_id, delegate_org_id, granted_by_org_id, valid_from, valid_until) | `ResourceAccessDelegate` | Replace `zone_id: string` with `resource_id: string` + `resource_type` |
| `isDelegateActive(delegate, now)` | **Reuse verbatim** | None |
| `resolveZoneAccess` two-gate chain | `resolveDigitalAccess` three-gate chain | Gate 1: clearance ≥ classification. Gate 2: active own-tier grant. Gate 3: active parent-tier grant. Advisory: zone-prerequisite warning (non-blocking) |
| `ZoneAccessResult` (allow, gate, reason, detail?) | `DigitalAccessResult` | Extend to `gateChain: GateResult[]` for multi-step trace; add `zoneAdvisory: string \| null` |
| `zone-browser.tsx` (collapsible tree + detail panel) | `resource-browser.tsx` | Same expand/collapse tree pattern; replace `zone_type` badges with `classification` badges |
| `access-resolution-explorer.tsx` (person + zone selectors + trace) | `digital-access-resolution-explorer.tsx` | Same person selector + result trace; adds parent-tier gate steps; adds advisory warning row |
| `useWorld()` + world-state store | **Extend existing store** | Add `networks`, `platforms`, `applications`, `resourceGrants`, `resourceDelegates` collections to the existing world-state |

---

## NSM / SEED-009 Grounding

| SEED-009 Requirement | Standard Anchor | v2.2 Demo Treatment |
|---------------------|-----------------|---------------------|
| System classification (max grade approved to process) | sikkerhetsloven §6-1, FIPS 199 | `classification: Clearance` on each resource. Application inherits Platform's grade. |
| Approval to operate (sikkerhetsgodkjenning) | sikkerhetsloven §6-3, NIST RMF ATO | Static `approved_to_operate: boolean` on Platform. Displayed as badge in detail panel. NOT a resolution gate in v2.2. |
| Adequate security level (forsvarlig sikkerhetsnivå) | sikkerhetsloven §6-2, NSM Grunnprinsipper v2.1 | Static `security_level_assessed: boolean` on Platform. Displayed as badge. NOT a resolution gate in v2.2. |
| Access enforcement (clearance + authorized + need-to-know) | NIST AC family, ISO 8.3 | Enforced by the three-gate chain: clearance gate + per-tier grant gate + prerequisite tier grant gate. |
| Logging / audit | NIST AU family, ISO 8.15/8.16 | Access resolution events append to existing `auditlog.ts` patterns. No new infrastructure needed. |
| Communications/content control | sikkerhetsloven §6-6 | Out of demo scope; deferred to real-build milestone. |

---

## Sources

- `.planning/milestones/v2.2-REQUIREMENTS.md` — seeded RSRC requirements (primary specification)
- `.planning/seeds/SEED-009-info-system-security-requirements.md` — NSM §6 anchors (HIGH confidence for §6-1/§6-2/§6-3/§6-6; NIST RMF/ATO parallel flagged UNVERIFIED in seed)
- `frontend/src/demo/lib/model.ts` — v2.1 types and resolution functions (direct pattern source, HIGH confidence)
- `frontend/src/demo/lib/seed.ts` — 6-unit scenario subjects and grants structure (HIGH confidence)
- `frontend/src/demo/components/zone-browser.tsx` — UI tree browser pattern (HIGH confidence)
- `frontend/src/demo/components/access-resolution-explorer.tsx` — UI resolution explorer pattern (HIGH confidence)
- `.planning/PROJECT.md` — key decisions: Application inherits Platform classification; zone-prerequisite advisory only; no multi-homing (HIGH confidence)
- NSM sikkerhetsloven kap. 6 — verified in SEED-009 (HIGH confidence for Norwegian statutory requirements)
- NSM Grunnprinsipper for IKT-sikkerhet v2.1 — verified to exist in SEED-009 (MEDIUM confidence on specific content)
- NATO classification tier naming (NATO-R / NATO-S / NATO-TS) — standard practice (MEDIUM confidence; not independently verified against a current NATO document)

---

*Feature research for: v2.2 Digital Resource Access (Network → Platform → Application) demo*
*Researched: 2026-06-02*
