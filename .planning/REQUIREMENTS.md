# Requirements — v2.1 Physical Access Zones (demo)

**Milestone:** v2.1  
**Status:** Active  
**Scope:** Demo/mock only — Rust/PostgreSQL backend defers to a later milestone  
**Grounding:** SEED-003 (NSM/NIST/ISO access requirements crosswalk)

---

## Zone Model (ZONE)

- [ ] **ZONE-01**: System represents physical locations as a flexible tree. Each node has: `id`, `name`, `zone_type`, `parent_id` (nullable = root), `level` (SITE / AREA / BUILDING / ZONE / ROOM). Any depth is supported; the 5-level enum provides semantic labels for logic rules.
- [ ] **ZONE-02**: Each zone node has a `zone_type`: CONTROLLED, RESTRICTED, or SECURED.
- [ ] **ZONE-03**: SECURED `zone_type` is only valid at BUILDING, ZONE, or ROOM level. SITE and AREA nodes are CONTROLLED or RESTRICTED only.
- [ ] **ZONE-04**: Each zone carries `admin_org_id` (the organization that controls the space and can delegate access-granting) and `asset_owner_org_id` (the organization whose assets are protected inside).
- [ ] **ZONE-05**: Each zone node can be flagged `requires_explicit_auth = true`, forcing an explicit per-person grant for that node even when a parent grant would otherwise apply.

---

## Clearance & Access Rules (ACCESS)

- [ ] **ACCESS-01**: Clearance ladder is 5-tier (ordered low → high): `UNCLASSIFIED → RESTRICTED → CONFIDENTIAL → SECRET → TOP_SECRET`. This replaces the previous 4-tier ladder.
- [ ] **ACCESS-02**: CONTROLLED zone — explicit authorization required; no clearance level required. (NSM equivalent: BEGRENSET — authorization only.)
- [ ] **ACCESS-03**: RESTRICTED zone — person must hold RESTRICTED clearance or above, OR be escorted by a person holding an active grant for the zone.
- [ ] **ACCESS-04**: SECURED zone — person must hold SECRET clearance or above AND have an explicit per-zone grant, OR be escorted by an authorized person; entry must always be logged.
- [ ] **ACCESS-05**: Access resolution applies two gates in sequence: (1) grant lookup (active grant found via zone ancestry), (2) zone_type rule check (clearance + escort requirements). Both must pass.

---

## Access Grants (GRANT)

- [ ] **GRANT-01**: A `PhysicalAccessGrant` links a person to a specific zone node with `valid_from` and `valid_until` (nullable = permanent). Each grant is independent with its own time window.
- [ ] **GRANT-02**: A parent grant covers descendant nodes that share the same `zone_type` (inheritance). Descendants with a higher `zone_type` (RESTRICTED or SECURED inside a CONTROLLED parent) never inherit and always require explicit grants.
- [ ] **GRANT-03**: Zone nodes with `requires_explicit_auth = true` always require their own explicit grant regardless of parent grants or `zone_type` matching.
- [ ] **GRANT-04**: Access resolution walks the zone ancestor chain (leaf → root) and returns the most-specific active grant whose `zone_type` matches the requested zone.

---

## Delegation (DELEG)

- [ ] **DELEG-01**: An `admin_org` can delegate access-granting authority for a zone to a named person OR to another organization via a `ZoneAccessDelegate` record.
- [ ] **DELEG-02**: `ZoneAccessDelegate` captures: `zone_id`, `delegate_type` (PERSON / ORG), `delegate_person_id` (nullable), `delegate_org_id` (nullable), `granted_by_org_id`, `valid_from`, `valid_until`.
- [ ] **DELEG-03**: A person or org that holds a `ZoneAccessDelegate` record for a zone can issue `PhysicalAccessGrant`s for that zone (and its descendants, subject to grant inheritance rules).

---

## Entry Log (LOG)

- [ ] **LOG-01**: A `ZoneEntryLog` records each zone access event: `person_id`, `zone_id`, `entry_at`, `exit_at` (nullable), `method` (CARD / ESCORT).
- [ ] **LOG-02**: ESCORT method entries require `escort_person_id` (the authorized escort who accompanied the visitor).
- [ ] **LOG-03**: Entry logging is mandatory for SECURED zones; optional for RESTRICTED; not required for CONTROLLED.

---

## Visitor Passes (VISIT)

- [ ] **VISIT-01**: An escorted person receives a `ZoneVisitorPass` tied to their `ZoneEntryLog` entry.
- [ ] **VISIT-02**: `ZoneVisitorPass` records: `entry_log_id`, `escort_person_id`, `zone_id`, `valid_from`, `valid_until` (authorized duration of stay).
- [ ] **VISIT-03**: Active visitor passes are queryable per zone, enabling security staff to see who is currently authorized to be inside.

---

## Mock Dataset (SEED)

- [x] **SEED-01**: Dataset defines ≥3 root Sites from the 6-unit scenario, each with a subtree of Areas, Buildings, Zones, and/or Rooms as appropriate.
- [x] **SEED-02**: Dataset includes zones of all three types (CONTROLLED, RESTRICTED, SECURED); SECURED nodes appear only at BUILDING, ZONE, or ROOM level.
- [x] **SEED-03**: Access grants are primarily at BUILDING or ROOM level; Site-level grants are rare (≤2 examples, reserved for high-authority roles).
- [x] **SEED-04**: Dataset demonstrates zone_type-scoped inheritance: a CONTROLLED-Building grant that covers CONTROLLED Rooms inside it.
- [x] **SEED-05**: Dataset demonstrates explicit exclusion: a RESTRICTED or SECURED node inside a CONTROLLED parent, requiring its own grant.
- [x] **SEED-06**: Dataset includes delegation examples: ≥1 person delegate and ≥1 org delegate.
- [x] **SEED-07**: `ZoneEntryLog` entries include both CARD and ESCORT method examples.
- [x] **SEED-08**: Dataset includes ≥1 `ZoneVisitorPass` example tied to an ESCORT entry.
- [x] **SEED-09**: Grants include a realistic mix of active, expired, and future-dated records.

---

## Demo UI (UI)

- [ ] **UI-01**: Demo includes a Zone Browser tab rendering the Site → … → Room hierarchy with `zone_type` badges (CONTROLLED / RESTRICTED / SECURED).
- [ ] **UI-02**: Selecting a zone node shows its `admin_org`, `asset_owner_org`, active grants, and delegates.
- [ ] **UI-03**: Demo includes an Access Resolution Explorer: select a person + zone, compute ALLOW / DENY with a plain-prose trace.
- [ ] **UI-04**: Resolution trace shows: grant found (or not), zone_type rule evaluated, clearance check result, escort requirement noted if applicable.
- [ ] **UI-05**: Demo includes a Zone Entry Log view, filterable by zone and by person.
- [ ] **UI-06**: Entry Log rows show visitor pass status for ESCORT entries.

---

## Future Requirements (deferred)

- Rust/PostgreSQL backend implementation of zone model, grants, entry log, delegation
- Real card-system integration for CARD-method entry logging
- Physical access zones wired into the ABAC engine as resource attributes

## Out of Scope (v2.1)

- **Backend implementation** — all data is mock/in-memory TypeScript; no Rust/PostgreSQL changes
- **Real card reader / hardware integration** — CARD method is simulated in mock data
- **Cross-entity federation of zone access** — zone data stays within a single entity's demo view
- **NDA or screening prerequisites** as gates on zone authorization (deferred to SEED-001/002/006)

---

## Traceability

| REQ-ID | Phase | Status |
|--------|-------|--------|
| ZONE-01 | Phase 5 | Pending |
| ZONE-02 | Phase 5 | Pending |
| ZONE-03 | Phase 5 | Pending |
| ZONE-04 | Phase 5 | Pending |
| ZONE-05 | Phase 5 | Pending |
| ACCESS-01 | Phase 5 | Pending |
| ACCESS-02 | Phase 5 | Pending |
| ACCESS-03 | Phase 5 | Pending |
| ACCESS-04 | Phase 5 | Pending |
| ACCESS-05 | Phase 6 | Pending |
| GRANT-01 | Phase 6 | Pending |
| GRANT-02 | Phase 6 | Pending |
| GRANT-03 | Phase 6 | Pending |
| GRANT-04 | Phase 6 | Pending |
| DELEG-01 | Phase 6 | Pending |
| DELEG-02 | Phase 6 | Pending |
| DELEG-03 | Phase 6 | Pending |
| LOG-01 | Phase 7 | Pending |
| LOG-02 | Phase 7 | Pending |
| LOG-03 | Phase 7 | Pending |
| VISIT-01 | Phase 7 | Pending |
| VISIT-02 | Phase 7 | Pending |
| VISIT-03 | Phase 7 | Pending |
| SEED-01 | Phase 8 | Complete |
| SEED-02 | Phase 8 | Complete |
| SEED-03 | Phase 8 | Complete |
| SEED-04 | Phase 8 | Complete |
| SEED-05 | Phase 8 | Complete |
| SEED-06 | Phase 8 | Complete |
| SEED-07 | Phase 8 | Complete |
| SEED-08 | Phase 8 | Complete |
| SEED-09 | Phase 8 | Complete |
| UI-01 | Phase 8 | Pending |
| UI-02 | Phase 8 | Pending |
| UI-03 | Phase 8 | Pending |
| UI-04 | Phase 8 | Pending |
| UI-05 | Phase 8 | Pending |
| UI-06 | Phase 8 | Pending |
