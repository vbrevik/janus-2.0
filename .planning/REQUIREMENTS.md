# Requirements — v2.3 Dataset Access (demo)

**Milestone:** v2.3 (ACTIVE)
**Scope:** Demo/mock only — Rust/PostgreSQL backend defers to a later milestone
**Layer:** Innermost access layer — fine-grained authorization within Applications

> Refined from the `.planning/milestones/v2.3-REQUIREMENTS.md` placeholder using
> `.planning/research/SUMMARY.md` (Stack/Features/Architecture/Pitfalls, HIGH confidence).

---

## The Access Stack

```
Network → Platform → Application → Dataset
(v2.2)                              (v2.3)
```

Each layer requires explicit authorization. v2.3 adds the innermost layer.

---

## Dataset Model (DATA)

- [ ] **DATA-01**: A `Dataset` is a named, authorizable resource within exactly one Application (from v2.2). Examples: a mailbox, an archive role, a document site. A dataset belongs to a single parent Application — no multi-homing (mirrors v2.2's strict-tree invariant).
- [ ] **DATA-02**: Each dataset has a `dataset_type` indicating the access level vocabulary it uses. Initial types: `MAILBOX`, `ARCHIVE_ROLE`, `DOCUMENT_SITE`. Open vocabulary — additional types can be added without a schema change.
- [ ] **DATA-03**: Access levels per dataset type, each a total-ordered ladder (higher level implies all capabilities of lower levels — validated against Exchange/SharePoint/Noark-5 archive-role patterns):
  - `MAILBOX`: `READ` < `SEND_AS` < `FULL_ACCESS`
  - `ARCHIVE_ROLE`: `READER` < `CASE_HANDLER` < `ADMIN`
  - `DOCUMENT_SITE`: `READ` < `CONTRIBUTE` < `FULL_CONTROL`

  Per-type rank tables — cross-type level comparison is not representable (Pitfall 1).
- [ ] **DATA-04**: Each dataset carries `admin_org_id` (controls the dataset, delegates access) and `asset_owner_org_id` (owns the content) — mirrors v2.1/v2.2 dual-org pattern.
- [ ] **DATA-05**: Dataset classification inherits from its parent Application unless explicitly overridden via `classification_override`; an override must be equal to or higher than the parent's effective classification, never lower (validated at construction, mirrors v2.2's inheritance pattern).

---

## Access Rules (DATA-ACCESS)

- [ ] **DATA-ACCESS-01**: Access to a Dataset requires an active Application grant for the dataset's parent Application. This is a **hard prerequisite evaluated at resolution time** (not just at grant-issue time) — an expired Application grant must deny dataset access even if a DatasetAccessGrant is still nominally active (Pitfall 2).
- [ ] **DATA-ACCESS-02**: Dataset access also requires an explicit `DatasetAccessGrant` for the specific dataset at or above the required access level.
- [ ] **DATA-ACCESS-03**: Access resolution is a 3-gate chain, in order: (1) clearance ≥ effective dataset classification, (2) active Application grant (hard prerequisite, gate 1's failure denies outright), (3) active DatasetAccessGrant at required level. The resolver is a standalone `resolveDatasetAccess` function — it composes v2.2 primitives (`isWindowActive`, `CLEARANCE_RANK`, `effectiveClassification`) but does **not** modify the v2.2 `ResourceTier` union or `resolveResourceAccess` (byte-exact TS↔Rust golden-fixture parity contract; Pitfall 5).

---

## Access Grants (DATA-GRANT)

- [ ] **DATA-GRANT-01**: A `DatasetAccessGrant` links a person to a specific dataset at a specific access level, with `valid_from` and `valid_until` (nullable = permanent).
- [ ] **DATA-GRANT-02**: A person may hold multiple grants for the same dataset at different access levels (e.g., READ and CONTRIBUTE on the same SharePoint site).
- [ ] **DATA-GRANT-03**: Effective access level = highest active grant, using the per-type rank table from DATA-03.

---

## Delegation (DATA-DELEG)

- [ ] **DATA-DELEG-01**: `admin_org` can delegate dataset access-granting authority to a named person or org — mirrors v2.1/v2.2 delegation model. A delegate may issue grants at **any level defined for the dataset**, not capped at the delegate's own held level (matches Microsoft Entra entitlement-management delegation behavior; delegation is an org-level authority grant, not a personal-level cap).

---

## Mock Dataset (DATA-SEED)

- [ ] **DATA-SEED-01**: Dataset includes ≥2 Mailboxes (own mailbox + ≥1 shared mailbox) per relevant entity.
- [ ] **DATA-SEED-02**: Dataset includes ≥1 archiving system with multiple roles demonstrating READER / CASE_HANDLER / ADMIN grants.
- [ ] **DATA-SEED-03**: Dataset includes ≥2 document sites (e.g., SharePoint) with varying permission levels per person.
- [ ] **DATA-SEED-04**: Dataset demonstrates the prerequisite chain: person has Application grant → has DatasetAccessGrant → can access specific dataset.
- [ ] **DATA-SEED-05**: Dataset demonstrates denied access: person has Application grant but no DatasetAccessGrant → denied at dataset level.
- [ ] **DATA-SEED-06**: A deny-matrix fixture exercises every gate in DATA-ACCESS-03 as the deciding gate at least once (clearance-fails, Application-grant-expired-with-live-dataset-grant, dataset-grant-missing) — prevents shipping trace rows wired to no real data (Pitfall 3, the v2.2 dead-advisory-row lesson).

---

## Demo UI (DATA-UI)

- [ ] **DATA-UI-01**: Demo shows Datasets within the Application view (extending v2.2 Resource Browser).
- [ ] **DATA-UI-02**: Access Resolution Explorer extended to Dataset level: person + dataset + datetime → ALLOW/DENY with full gate-chain trace (clearance, Application grant, dataset grant), reusing the row-rendering style of `resource-access-explorer.tsx`'s `ResourceResolutionTrace`.
- [ ] **DATA-UI-03**: Dataset view shows who has access at what level (reverse lookup: dataset → authorized persons), going through the same resolver as DATA-UI-02.
- [ ] **DATA-UI-04**: Admin-gated form for issuing DatasetAccessGrant, enforcing `canIssueDatasetGrant` (delegate/admin-org authority per DATA-DELEG-01) — live-UAT'd with a non-admin persona to confirm the gate holds (Pitfall enforcement-gap lesson from v2.2's IDOR).

---

## Resolved Decisions (from research, no response received on live confirmation — proceeding with researched recommendations)

| Question | Decision | Rationale |
|----------|----------|-----------|
| ARCHIVE_ROLE: total order or role-shaped? | Total order, highest-wins applies | Validated against Noark 5 / Public 360: leser→saksbehandler→arkivar/admin is an escalating ladder, not independent roles |
| Delegation level-bound? | Delegate can issue up to dataset max, not capped at own level | Matches Entra entitlement-management delegation; consistent with v1/v2 org-level (not personal-level) delegation authority |
| Dataset spans multiple Applications? | No — one dataset : one parent Application | Preserves v2.2's strict-tree invariant; multi-client reachability is a client concern, not a data-model concern |

**Note:** These were presented to the user via AskUserQuestion but received no response within the session window; the "Recommended" (research-backed) option was taken for each. Revisit at `/gsd-discuss-phase 13` if this doesn't match intent — flagged as a check item for that phase's context gathering.

---

## Open Questions (fully resolved above — none remaining)

---

## Future Requirements (deferred from v2.3)

- Rust/PostgreSQL backend implementation of dataset model and grants
- Real integration with Exchange/SharePoint/archive APIs
- Role-based access within archiving systems (more complex than simple level grants)
- Faithful Exchange orthogonal permission semantics (Full Access ≠ Send As) — v2.3 deliberately simplifies to a total-ordered ladder for the demo
- "Send on Behalf" mailbox level, content-level (document-by-document) permissions, group/distribution-list membership grants, grant lifecycle workflows (renewal/expiry notifications)

## Out of Scope (v2.3)

- **Backend implementation** — all data is mock/in-memory TypeScript
- **Real Exchange / SharePoint / archive integration** — simulated in mock data
- **Content-level access control** (e.g., document-by-document permissions) — dataset is the atomic unit
- **Group/distribution list membership** — out of scope for access grants in this model

---

## Traceability

_Filled by the roadmapper when phases are assigned._

| Requirement | Phase |
|-------------|-------|
