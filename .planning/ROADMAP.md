# Roadmap: Janus 2.0

## Milestones

- ✅ **v2.0 Authorization Hub (demo)** — Phases 1–4 (shipped 2026-05-22)
- **v2.1 Physical Access Zones (demo)** — Phases 5–8 (active)

## Phases

<details>
<summary>✅ v2.0 Authorization Hub (demo) — Phases 1–4 — SHIPPED 2026-05-22</summary>

- [x] Phase 1: Foundation (4/4 plans) — completed 2026-05-21
- [x] Phase 2: Federation Hub (6/6 plans) — completed 2026-05-22
- [x] Phase 3: Audit & Context (4/4 plans) — completed 2026-05-22
- [x] Phase 4: Demo Shell & Legibility (2/2 plans) — completed 2026-05-22

See `.planning/milestones/v2.0-ROADMAP.md` for full phase details.

</details>

### v2.1 Physical Access Zones (demo)

- [ ] **Phase 5: Zone Model & Access Rules** — Zone hierarchy types, dual org ownership, explicit-auth flag, 5-tier clearance ladder, and NSM-grounded zone-type rules
- [ ] **Phase 6: Grants, Resolution & Delegation** — PhysicalAccessGrant with time windows, zone-type-scoped inheritance, explicit-auth overrides, two-gate access resolution, and admin-org delegation
- [ ] **Phase 7: Entry Log & Visitor Passes** — ZoneEntryLog with CARD/ESCORT methods, escort person reference, mandatory-for-SECURED enforcement, and ZoneVisitorPass tied to escort entries
- [ ] **Phase 8: Mock Dataset & Demo UI** — Rich 6-unit mock dataset exercising all model features, Zone Browser tab, Access Resolution Explorer, and Zone Entry Log view

---

## Phase Details

### Phase 5: Zone Model & Access Rules
**Goal**: The demo has a working zone hierarchy and clearance model that all downstream work can build on
**Depends on**: Nothing (first phase of v2.1)
**Requirements**: ZONE-01, ZONE-02, ZONE-03, ZONE-04, ZONE-05, ACCESS-01, ACCESS-02, ACCESS-03, ACCESS-04
**Success Criteria** (what must be TRUE):
  1. A zone tree with Site → Area → Building → Zone → Room levels can be constructed in TypeScript, with each node carrying zone_type (CONTROLLED / RESTRICTED / SECURED) and the ZONE-03 ceiling rule enforced (SECURED only at BUILDING, ZONE, or ROOM)
  2. Each zone node holds admin_org_id and asset_owner_org_id, and the requires_explicit_auth flag can be set independently per node
  3. The 5-tier clearance ladder (UNCLASSIFIED → RESTRICTED → CONFIDENTIAL → SECRET → TOP_SECRET) is defined as an ordered enum and replaces the old 4-tier ladder throughout the demo
  4. Zone-type access rules are codified as functions: CONTROLLED returns allow on authz-only, RESTRICTED checks clearance >= RESTRICTED or escort, SECURED checks clearance >= SECRET and explicit grant and logged entry
**Plans**: TBD

### Phase 6: Grants, Resolution & Delegation
**Goal**: Access decisions can be computed for any person + zone combination, and admin orgs can delegate granting authority
**Depends on**: Phase 5
**Requirements**: GRANT-01, GRANT-02, GRANT-03, GRANT-04, ACCESS-05, DELEG-01, DELEG-02, DELEG-03
**Success Criteria** (what must be TRUE):
  1. A PhysicalAccessGrant links a person to a zone with valid_from / valid_until (nullable = permanent), and only grants whose time window covers the query moment are considered active
  2. Grant resolution walks the zone ancestor chain (leaf → root) and returns the most-specific active grant whose zone_type matches the requested zone; parent grants cover same-type children, never higher-type children
  3. Nodes with requires_explicit_auth = true require their own explicit grant even when a parent grant of matching zone_type exists
  4. Two-gate resolution (grant lookup, then zone_type rule check) produces an ALLOW or DENY with both gates evaluated and surfaced
  5. A ZoneAccessDelegate record can be created for a zone, assigning granting authority to a named person or another org, with its own valid_from / valid_until window
**Plans**: TBD

### Phase 7: Entry Log & Visitor Passes
**Goal**: Zone entry events are recordable with the correct method and escort tracking, and escorted visitors have queryable passes
**Depends on**: Phase 6
**Requirements**: LOG-01, LOG-02, LOG-03, VISIT-01, VISIT-02, VISIT-03
**Success Criteria** (what must be TRUE):
  1. A ZoneEntryLog entry can be created for any zone access event, recording person_id, zone_id, entry_at, exit_at (nullable), and method (CARD or ESCORT)
  2. ESCORT entries carry escort_person_id; attempts to create an ESCORT entry without an escort_person_id are rejected by the model
  3. Access resolution for a SECURED zone produces a denial trace indicating that entry logging is mandatory; the log model enforces this at write time
  4. A ZoneVisitorPass is created alongside every ESCORT ZoneEntryLog entry, recording escort_person_id, zone_id, valid_from, and valid_until; active passes for a zone are queryable
**Plans**: TBD

### Phase 8: Mock Dataset & Demo UI
**Goal**: A developer or reviewer can open the demo, browse the 6-unit zone hierarchy, resolve any person/zone combination with an explained trace, and inspect entry log history
**Depends on**: Phase 7
**Requirements**: SEED-01, SEED-02, SEED-03, SEED-04, SEED-05, SEED-06, SEED-07, SEED-08, SEED-09, UI-01, UI-02, UI-03, UI-04, UI-05, UI-06
**Success Criteria** (what must be TRUE):
  1. The mock dataset contains ≥3 root Sites from the 6-unit scenario, each with a subtree including all three zone_type values; SECURED nodes appear only at BUILDING, ZONE, or ROOM level
  2. The dataset demonstrates zone_type-scoped inheritance (a CONTROLLED-building grant covering its CONTROLLED rooms) and explicit exclusion (a RESTRICTED/SECURED node inside a CONTROLLED parent requiring its own grant)
  3. The dataset includes ≥1 person delegate, ≥1 org delegate, both CARD and ESCORT entry log examples, ≥1 ZoneVisitorPass, and a realistic mix of active / expired / future grants
  4. The Zone Browser tab renders the full zone hierarchy with zone_type badges; selecting any node reveals its admin_org, asset_owner_org, active grants, and delegates
  5. The Access Resolution Explorer allows selecting a person and zone, then displays an ALLOW or DENY result with a plain-prose trace covering grant found, zone_type rule, clearance check, and escort note
  6. The Zone Entry Log view lists entry events filterable by zone and person; ESCORT rows show visitor pass status
**Plans**: TBD
**UI hint**: yes

---

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation | v2.0 | 4/4 | Complete | 2026-05-21 |
| 2. Federation Hub | v2.0 | 6/6 | Complete | 2026-05-22 |
| 3. Audit & Context | v2.0 | 4/4 | Complete | 2026-05-22 |
| 4. Demo Shell & Legibility | v2.0 | 2/2 | Complete | 2026-05-22 |
| 5. Zone Model & Access Rules | v2.1 | 0/? | Not started | - |
| 6. Grants, Resolution & Delegation | v2.1 | 0/? | Not started | - |
| 7. Entry Log & Visitor Passes | v2.1 | 0/? | Not started | - |
| 8. Mock Dataset & Demo UI | v2.1 | 0/? | Not started | - |
