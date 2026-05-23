# Phase 8: Mock Dataset & Demo UI - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-23
**Phase:** 8-mock-dataset-demo-ui
**Areas discussed:** Seed data file, WorldState integration, UI tab structure, Access Resolution Explorer UX

---

## Seed Data File

| Option | Description | Selected |
|--------|-------------|----------|
| New zone-seed.ts | Separate file, keeps seed.ts clean, avoids SEED-HEAD invariant concerns | |
| Append to seed.ts | Below SEED-HEAD boundary comment, additive only | ✓ |

**User's choice:** Append to seed.ts (below SEED-HEAD boundary)
**Notes:** Confirmed understanding that SEED-HEAD records must not be modified — zone constants go below the boundary comment only.

## Seed Persons

| Option | Description | Selected |
|--------|-------------|----------|
| New zone-specific persons | 4–6 named persons with explicit clearances for realistic NSM scenario | |
| Reuse existing subj-1..4 | Dana Reyes (SECRET), Sam Okafor (TOP_SECRET), Lee Park (CONFIDENTIAL), Mara Vance (TOP_SECRET) | ✓ |

**User's choice:** Reuse existing subj-1..4
**Notes:** Keeps dataset minimal, avoids duplication.

---

## WorldState Integration

| Option | Description | Selected |
|--------|-------------|----------|
| Module-level constants only | Zone UI imports directly from seed.ts, no WorldState changes | |
| Add to WorldState reducer | Zones/grants/etc. as WorldState fields, consistent with existing pattern | ✓ |

**User's choice:** Add to WorldState reducer

| Option | Description | Selected |
|--------|-------------|----------|
| Static seed data sufficient | Fixed GRANTS/ZONES, no runtime mutation | |
| Runtime variation needed | User can toggle grants on/off, live trace recompute | ✓ |

**User's choice:** Runtime variation (TOGGLE_GRANT reducer action)
**Notes:** TOGGLE_GRANT lets the explorer show how resolution changes when a grant is disabled — makes inheritance and explicit-auth rules tangible.

---

## UI Tab Structure

| Option | Description | Selected |
|--------|-------------|----------|
| 1 Physical Access tab with internal sub-tabs | 6 tabs total, internal Zone Browser / Access Resolution / Entry Log | ✓ |
| 3 new top-level tabs | 8 tabs total, one per view | |

**User's choice:** 1 Physical Access tab with internal sub-navigation

## Zone Tree Rendering

| Option | Description | Selected |
|--------|-------------|----------|
| Flat indented list | All zones listed with depth indentation | |
| Collapsible tree | Left panel with expand/collapse, right panel for node details | ✓ |
| Nested card layout | Cards within cards | |

**User's choice:** Collapsible tree (left) + detail cards (right)
**Notes:** Initially selected options 2 and 3; clarified to mean collapsible tree for the list with Card components for the detail panel.

---

## Access Resolution Explorer UX

### Clearance sourcing

| Option | Description | Selected |
|--------|-------------|----------|
| Derived from selected person's clearance | Automatic from subject.clearance field | ✓ |
| Manual clearance dropdown | User picks separately | |

**User's choice:** Auto-derived from selected person

### Escort handling

| Option | Description | Selected |
|--------|-------------|----------|
| Checkbox toggle | Simple "Has valid escort" boolean | |
| Select an escort person | Second person dropdown | ✓ |
| Derived from entry log | Automatic from existing ESCORT entries | |

**User's choice:** Select an escort person

### Escort validity check

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-check escort's grant | Run resolveGrant(escortPersonId, zone) to derive hasValidEscort | ✓ |
| Manual toggle on top of selection | Pick person AND separately toggle validity | |

**User's choice:** Auto-check — resolveGrant result drives hasValidEscort

### Resolution trace format

| Option | Description | Selected |
|--------|-------------|----------|
| Plain prose rows | Per-gate labeled rows matching DecisionTrace style | ✓ |
| ALLOW/DENY banner only | Just the verdict | |
| JSON/debug dump | Raw ZoneAccessResult object | |

**User's choice:** Plain prose rows per gate

---

## Claude's Discretion

- Exact mechanism for disabled grant tracking in reducer (flag on grant vs. separate Set of IDs)
- Expand/collapse state management for zone tree (local useState, not in WorldState)
- Zone detail panel field ordering
- Entry Log view filter UI layout
- Zone tree node visual style (icons, indentation width)

## Deferred Ideas

None — discussion stayed within phase scope.
