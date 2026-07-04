# Feature Research — v2.3 Dataset Access (demo)

**Domain:** Dataset/entitlement-level authorization (innermost access layer) — modeled on Exchange mailbox permissions, records-management archive roles (Noark 5), and SharePoint permission levels
**Researched:** 2026-07-03
**Confidence:** MEDIUM (cross-checked against official Microsoft Learn docs and Arkivverket/Noark 5 material via web search; project-context claims HIGH — grounded in `.planning/PROJECT.md` and v2.3-REQUIREMENTS.md)

---

## How Real Systems Do This (research findings)

Findings that shape the feature categories below:

1. **Exchange mailbox permissions are ORTHOGONAL, not a ladder.** Full Access, Send As, and
   Send on Behalf are three independent permissions. Full Access = open the mailbox and
   read/manage everything, but **cannot send**; sending requires an explicit Send As or Send
   on Behalf grant. "Full Access implies Send As" is a documented common misconception
   (Microsoft publishes a troubleshooting article specifically for it).
   → The v2.3 vocab `READ < SEND_AS < FULL_ACCESS` as a total order with "highest wins" is a
   **deliberate simplification** of real Exchange semantics, not a mirror of them. Fine for a
   demo — but it must be a recorded decision, not an accident (see Anti-Features).

2. **SharePoint permission levels ARE cumulative supersets.** Full Control includes all
   permissions; Contribute includes Read's rights. A user in multiple groups gets the **union**
   of permissions — for linearly-ordered levels this collapses to **highest wins**, exactly
   matching DATA-GRANT-03. Inheritance (site → library → item) with per-item permission breaks
   is SharePoint's biggest governance pain point — already out of scope for v2.3 (correct call).

3. **Archive roles (Noark 5 / Public 360) are broadly cumulative and org-administered.**
   Reader → case handler (saksbehandler) → archivist/admin form an escalating capability
   ladder; the archive service (an organizational function, not the asset owner) administers
   permanent access groups plus ad-hoc ones. This maps cleanly onto `admin_org` (archive
   service) vs `asset_owner_org` (the unit whose records they are) — validating DATA-04.
   Note: ADMIN in real archive systems adds *administrative* capability (manage structure and
   access groups), not just "more read/write" — a good trace-explanation detail.

4. **Time-limited entitlements with delegation are the industry pattern** (Microsoft Entra
   entitlement management): assignments expire on a date / after N days / never (= nullable
   `valid_until`), and **delegation runs through resource owners** (catalog owner / access
   package manager roles), not central admins. A delegate can grant any level defined for the
   resource — delegation authority is **not capped at the delegate's own access level**. This
   answers an open question in v2.3-REQUIREMENTS.md: *delegate grants up to the maximum
   defined for the dataset*, matching both Entra and the v2.1/v2.2 precedent (delegation
   confers granting authority, not personal-access transfer).

---

## Feature Landscape

### Table Stakes (A Demo of This Model Must Have These)

Features whose absence makes the dataset layer unable to tell its story. All map to v2.3 requirement IDs.

| Feature | Why Expected | Complexity | Req | Notes |
|---------|--------------|------------|-----|-------|
| Dataset entity: named resource within an Application, typed (`MAILBOX` / `ARCHIVE_ROLE` / `DOCUMENT_SITE`) | Real systems (mailboxes, archive roles, doc sites) are exactly this shape | LOW | DATA-01, DATA-02 | Belongs to exactly one Application (FK); mirrors v2.2 resource shape |
| Per-type ordered access-level vocabulary with explicit rank | "Highest active grant" (DATA-GRANT-03) is undefined without a declared total order per type | LOW | DATA-03 | Store rank alongside level name (e.g., `{level, rank}` map per type); keeps vocab extensible |
| Level implication in resolution: level N satisfies any requirement ≤ N | SharePoint/archive semantics — Full Control covers Contribute covers Read | LOW | DATA-03 | Falls out of rank comparison; make it explicit in the trace ("FULL_CONTROL satisfies READ") |
| Hard prerequisite gate: active Application grant required | Carries the v2.2 prerequisite-chain contract inward; matches Entra "identity before entitlement" | LOW | DATA-ACCESS-01 | Reuse the v2.2 gate-chain step; **hard DENY** — unlike the advisory zone link |
| Time-windowed `DatasetAccessGrant` (`valid_from`, nullable `valid_until`) | Entra assignments: expire on date / never; identical to v2.1/v2.2 grant shape | LOW | DATA-GRANT-01 | Reuse `isGrantActive` verbatim (same nullable-date semantics) |
| Multiple concurrent grants per person+dataset; effective level = highest active | SharePoint union-of-groups behavior; different time windows at different levels is the realistic case | MEDIUM | DATA-GRANT-02/03 | "Active" is point-in-time; effective level can *drop* when a high grant expires — a good demo moment |
| Clearance gate: clearance ≥ dataset classification, inherited from Application unless overridden equal-or-higher | Consistent with v2.2 platform-classification inheritance | MEDIUM | DATA-05, DATA-ACCESS-03 | Override-only-upward needs a validation rule + "(inherited)"/"(overridden)" badge like v2.2 |
| `admin_org` + `asset_owner_org` per dataset, with delegation | Noark: archive service administers access; asset owner owns content; mirrors v2.1/v2.2 | LOW | DATA-04, DATA-DELEG-01 | Copy the v2.1/v2.2 dual-org + delegate pattern verbatim (`isDelegateActive` reuse) |
| Full gate-chain trace at dataset level: clearance → application grant → dataset grant + level | Explainability is the project's core value; every prior layer has it | MEDIUM | DATA-UI-02 | Extend the existing Access Resolution Explorer; trace must show WHICH grant won and why |
| Denied-access demo cases: no dataset grant / level too low / grant expired | The milestone's whole point: application access ≠ dataset access | LOW | DATA-SEED-04/05 | Seed data + Explorer scenarios; "DENY at dataset gate" must render distinctly |
| Reverse lookup: dataset → who has access at what effective level | Standard admin view in Exchange ("mailbox permissions") and SharePoint ("site permissions") | MEDIUM | DATA-UI-03 | Compute effective level per person at a point in time — not just a raw grant list |
| Mock dataset: ≥2 mailboxes, ≥1 archive system with 3 roles, ≥2 doc sites | Without type variety the per-type vocab claim is invisible | MEDIUM | DATA-SEED-01..03 | Attach to existing v2.2 Applications in the 6-unit scenario |

### Differentiators (What Makes This Demo Distinctive)

Where the demo outshines the real systems it models. Aligned with Core Value: explainable, reconstructable decisions.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| "Why this level" explanation: trace lists ALL grants (active, expired, superseded) and shows which one determined the effective level | Real systems show *that* you have access, almost never *why*; SharePoint's "Check Permissions" is notoriously opaque | MEDIUM | Natural extension of highest-wins: render losing grants greyed with reason (expired / lower rank / not yet active) |
| Four-layer prerequisite chain in one trace (Network → Platform → Application → Dataset) | No real product shows the whole stack in one explainable chain — this is the demo's signature | MEDIUM | The v2.2 Explorer already renders three tiers; append the dataset gate + level check |
| Point-in-time dataset resolution ("what could X access on date D at what level?") | Reuses v2.2 time-versioned machinery; real-system auditors can't do this without log archaeology | LOW | Machinery exists (v2.0 audit reconstruction, v2.2 point-in-time policies) — wire the dataset layer in |
| Per-type level semantics surfaced in UI (what each level permits, incl. "ADMIN adds administrative capability, not just more read") | Grounds the demo in recognizable real-world vocabulary; makes the typed-vocab design legible | LOW | Static description per (type, level); tooltip or legend in the Dataset view |
| Expiry-aware effective level ("FULL_ACCESS until 2026-08-01, then READ") | Entra sends expiry warnings; showing the *future* effective level is one better | MEDIUM | Derivable from the grant set; nice demo beat, cuttable if time-boxed |

### Anti-Features (Scope Traps for This Milestone)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Faithful Exchange semantics: orthogonal capability sets (Full Access ⊉ Send As), union of capabilities | "That's how Exchange actually works" — and it is | Breaks DATA-GRANT-03 ("highest" is undefined on a partial order); forces per-capability resolution and a different trace shape for one dataset type; complexity explosion for zero model insight | Keep the total-ordered ladder per type; **record a Key Decision** that v2.3 MAILBOX levels are cumulative by definition (FULL_ACCESS ⊇ SEND_AS ⊇ READ), deviating deliberately from real Exchange |
| Send on Behalf as a fourth mailbox level | Completes the Exchange picture | It's a *presentation* distinction (From-line rendering), not an authorization tier; wedging it into a ladder is false precision | Mention in per-type level descriptions if desired; don't model it |
| Content-level permissions (per-document / per-folder, inheritance breaks) | SharePoint does it; "more fine-grained = better" | SharePoint's broken-inheritance sprawl is its single biggest governance pain point; unbounded scope | Already excluded — dataset stays the atomic unit; keep it that way |
| Group/distribution-list membership as a grant path | Real systems grant mostly via groups | Adds a second resolution dimension (membership expansion + union) duplicating what direct grants already demonstrate; no person→org linkage exists in the demo model anyway | Already excluded — direct person→dataset grants only; groups are fullstack-milestone territory (SEED-012 adjacent) |
| Grant renewal / extension / expiry-notification workflow (Entra-style lifecycle) | Industry standard for entitlement hygiene | Workflow machinery (requests, approvals, notifications) is a milestone of its own; the demo has no inbox | Show expiry in the trace and (optionally) the future-level indicator; defer lifecycle to fullstack |
| Dataset spanning multiple Applications (shared mailbox reachable from two clients) | Open question in v2.3-REQUIREMENTS.md | Breaks the strict-tree invariant v2.2 established (no multi-homing); "reachable from two clients" is a client concern, not an authorization one — the mailbox lives in ONE system | 1 dataset : 1 application, hard rule; answer the open question "no" |
| Archive role as a role-assignment on the Application (instead of a dataset) | Open question; arguably closer to Noark reality | Introduces a second authorization mechanism (roles vs. datasets) at the same layer: two code paths, two trace shapes | Model the archive role AS a dataset of type `ARCHIVE_ROLE` — uniform mechanism, one resolver; note the abstraction in docs |
| Full CRUD UI for datasets and grants | "It's a demo — make it editable" | Same trap v2.2 dodged; balloons the UI phase | Reuse the established TOGGLE_GRANT pattern from the v2.2 Explorer for interactive grant toggling |

---

## Feature Dependencies

```
[v2.2 Application entities + grants]                    (exist — hard substrate)
    └──required by──> [Dataset model (FK application_id)]
    └──required by──> [Prerequisite gate: active Application grant]

[Per-type level ladder + rank]  (DATA-03)
    └──required by──> [Highest-active-grant resolution]  (DATA-GRANT-03)
                          └──required by──> [Reverse lookup at effective level]  (DATA-UI-03)
                          └──required by──> ["Why this level" trace]  (differentiator)

[v2.2 platform-classification inheritance pattern]      (exists)
    └──pattern for──> [Dataset classification inherit/override]  (DATA-05)

[v2.1/v2.2 delegation pattern + isDelegateActive]       (exists)
    └──pattern for──> [Dataset delegation]  (DATA-DELEG-01)

[Dataset model + ladder + DatasetAccessGrant]
    └──required by──> [resolveDatasetAccess gate chain]  (DATA-ACCESS-01..03)
                          └──required by──> [Explorer extension]  (DATA-UI-02)

[Mock dataset]  (DATA-SEED-01..05)
    └──required by──> [Explorer scenarios incl. deny cases]
    └──required by──> [Resource Browser dataset view]  (DATA-UI-01)

[Point-in-time dataset resolution] ──enhances──> [Gate chain]  (reuses v2.2 machinery)
[Expiry-aware future level] ──enhances──> [Highest-active-grant resolution]
```

### Dependency Notes

- **Everything hangs off the v2.2 Application layer.** Dataset FK → Application; the
  prerequisite gate calls the existing application-grant resolution. Model-first phase
  ordering is forced: no dataset feature is buildable before the model + level ladder exist.
- **Rank must exist before resolution.** "Highest active grant" and the reverse lookup both
  compare levels; the rank field is a day-one schema decision, not a later add.
- **Delegation and classification-override are pattern reuse,** not new design — v2.1/v2.2
  shipped both shapes. Budget as LOW-risk copy-adapt work.
- **The Explorer extension conflicts with nothing but depends on everything** — it can only
  come last. v2.2's lesson applies directly: the advisory-row dead-code bug shipped and was
  only caught in live UAT. The dataset gate must be exercised against real seed scenarios
  (including all three deny shapes), not fixtures only.
- **Dataset gate is HARD, zone prerequisite stays ADVISORY.** Two different gate strengths now
  coexist in one trace — the UI must visually distinguish "advisory warning" from "hard DENY".

---

## v2.3 Scope Definition

### Must Have (launch)

- [ ] Dataset model: 3 types, per-type ranked level vocab, dual orgs, classification inherit/override — DATA-01..05
- [ ] `DatasetAccessGrant` (time-windowed, multiple per person+dataset) + highest-active-grant resolution — DATA-GRANT-01..03
- [ ] `resolveDatasetAccess`: clearance → active Application grant (hard) → active dataset grant at required level — DATA-ACCESS-01..03
- [ ] Delegation mirroring v2.1/v2.2 — DATA-DELEG-01
- [ ] Mock dataset covering DATA-SEED-01..05 incl. all three deny shapes (no grant / level too low / expired)
- [ ] Resource Browser dataset view + Explorer extension with winning-grant trace — DATA-UI-01/02
- [ ] Reverse lookup: dataset → persons at effective level — DATA-UI-03
- [ ] Vitest coverage of the resolver: every gate outcome, highest-wins with mixed windows, level implication

### Add After Core Works (within v2.3 if time allows)

- [ ] "Why this level" losing-grant rendering (greyed expired/superseded grants) — once the basic trace passes UAT
- [ ] Point-in-time dataset resolution control in the Explorer — machinery exists in v2.2
- [ ] Expiry-aware future effective level — if seed data already contains an expiring high grant

### Future Consideration (fullstack milestones)

- [ ] Rust/PostgreSQL backend for datasets + grants — explicitly deferred by milestone scope
- [ ] Group-based grants and membership expansion — needs person→org/group data model (SEED-012 territory)
- [ ] Grant lifecycle (renewal, expiry notifications, approvals) — Entra-style governance, a milestone of its own
- [ ] Real Exchange/SharePoint/archive connector integration — deferred per requirements
- [ ] Capability-set semantics for MAILBOX (real Exchange fidelity) — only if the fullstack build needs it

---

## Feature Prioritization Matrix

| Feature | Demo Value | Implementation Cost | Priority |
|---------|-----------|---------------------|----------|
| Dataset model + ranked level vocab | HIGH | LOW | P1 |
| DatasetAccessGrant + highest-wins resolution | HIGH | MEDIUM | P1 |
| Three-gate dataset chain (hard app-grant prerequisite) | HIGH | MEDIUM | P1 |
| Deny-case seed scenarios (3 shapes) | HIGH | LOW | P1 |
| Explorer/Browser extension with winning-grant trace | HIGH | MEDIUM | P1 |
| Dual orgs + delegation | MEDIUM | LOW | P1 |
| Reverse lookup (dataset → persons @ effective level) | MEDIUM | MEDIUM | P1 |
| Classification override (equal-or-higher only) | MEDIUM | LOW | P1 |
| Per-type level semantics in UI | MEDIUM | LOW | P2 |
| "Why this level" losing-grant rendering | MEDIUM | LOW | P2 |
| Point-in-time dataset resolution | MEDIUM | LOW | P2 |
| Expiry-aware future level | LOW | MEDIUM | P3 |

---

## Real-System Feature Comparison

| Aspect | Exchange Online | SharePoint | Noark 5 / Public 360 | Entra Entitlement Mgmt | Our Approach (v2.3) |
|--------|----------------|------------|----------------------|------------------------|---------------------|
| Level semantics | Orthogonal permissions (Full Access ⊉ Send As); union of independent capabilities | Cumulative levels (Full Control ⊇ Contribute ⊇ Read); union across groups ⇒ highest wins | Escalating role ladder (leser → saksbehandler → arkivar/admin); admin adds administrative capability | N/A (packages bundle resources) | Total-ordered ladder per type; highest active grant wins — matches SharePoint/archive exactly; documented deviation from Exchange |
| Prerequisite gating | Mailbox permission presumes Exchange account | Site access presumes tenant identity | System role presumes system account | Assignment presumes directory identity | Explicit, explainable **hard gate**: active Application grant required — stronger and more legible than any of them |
| Expiry | No native grant expiry (manual removal) | No native expiry on permission levels | Ad-hoc access groups time-bounded in practice | First-class: on-date / N-days / never, with extension | First-class `valid_from`/`valid_until` (nullable = permanent) — Entra-grade |
| Delegation | Admin-only permission management | Site owners manage their own site | Archive service administers access groups | Catalog owner / access-package manager; delegate NOT capped at own level | `admin_org` delegates to person/org (v2.1/v2.2 pattern); delegate grants up to dataset's max level (Entra-style answer to the open question) |
| Explainability | None (troubleshooting KBs instead) | "Check Permissions" (opaque) | Journal/audit trail, not decision traces | Assignment history | Full gate-chain trace with winning grant — the differentiator |

---

## Sources

- Microsoft Learn — [Manage permissions for recipients in Exchange Online](https://learn.microsoft.com/en-us/exchange/recipients-in-exchange-online/manage-permissions-for-recipients); [Can't send email when Full Access is granted](https://learn.microsoft.com/en-us/troubleshoot/exchange/mailflow/cannot-send-email-with-full-access); [Shared mailboxes in Exchange Online](https://learn.microsoft.com/en-us/exchange/collaboration-exo/shared-mailboxes) — MEDIUM (official docs via web search, cross-corroborated)
- Microsoft Learn — [Understanding permission levels in SharePoint](https://learn.microsoft.com/en-us/sharepoint/understanding-permission-levels); [Determine permission levels and groups](https://learn.microsoft.com/en-us/sharepoint/sites/determine-permission-levels-and-groups-in-sharepoint-server); [Understand groups and permissions on a SharePoint site](https://support.microsoft.com/en-us/office/understand-groups-and-permissions-on-a-sharepoint-site-258e5f33-1b5a-4766-a503-d86655cf950d) — MEDIUM
- Arkivverket — [Noark 5](https://www.arkivverket.no/forvaltning-og-utvikling/noark-standarden/noark-5); Public 360 løsningsbeskrivelse (sund.arkivplan.no PDF); [Documaster — Noark 5 overview](https://www.documaster.com/blogg/alt-du-trenger-a-vite-om-noark-5-standarden) — MEDIUM
- Microsoft Learn — [What is entitlement management?](https://learn.microsoft.com/en-us/entra/id-governance/entitlement-management-overview); [Access package lifecycle policy](https://learn.microsoft.com/en-us/entra/id-governance/entitlement-management-access-package-lifecycle-policy); [Access package assignments](https://learn.microsoft.com/en-us/entra/id-governance/entitlement-management-access-package-assignments) — MEDIUM
- Practical365 — [Understanding Exchange Shared Mailbox Permissions](https://practical365.com/understanding-exchange-shared-mailbox-permissions/) — MEDIUM (corroborates Microsoft docs)
- `.planning/PROJECT.md`, `.planning/milestones/v2.3-REQUIREMENTS.md` — HIGH (primary specification)
- v2.1/v2.2 pattern sources: `frontend/src/demo/lib/model.ts` (`isGrantActive`, `isDelegateActive`, gate-chain resolver), v2.2 Explorer/Browser components — HIGH (existing codebase)

---

*Feature research for: v2.3 Dataset Access (demo) — dataset-level authorization*
*Researched: 2026-07-03*
