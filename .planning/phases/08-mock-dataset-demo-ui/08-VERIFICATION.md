---
phase: 08-mock-dataset-demo-ui
verified: 2026-05-23T22:00:00Z
status: passed
score: 17/17
overrides_applied: 0
re_verification: true
human_verification_completed: true
human_verification:
  - test: "Open demo, click Physical Access tab, verify Zone Browser renders collapsible tree"
    expected: "6 tab buttons visible; clicking Physical Access shows sub-nav with 3 buttons; Zone Browser renders tree with 3 root sites, each with zone_type Pill badges; expand/collapse toggling works per node"
    why_human: "DOM interaction and visual rendering cannot be verified by grep"
  - test: "Zone Browser: click a zone node and verify detail panel"
    expected: "Detail panel populates with zone name, level, zone_type Pill, admin org name, asset owner org name, requires_explicit_auth value, active grants list, and delegates list"
    why_human: "State-to-DOM wiring requires browser rendering to confirm; note that grant list shows person_id (e.g., 'subj-1') rather than person name — verify this is acceptable per product requirements"
  - test: "Access Resolution Explorer: valid grant + clearance gives ALLOW; toggling off the sole grant gives DENY"
    expected: "Selecting Dana Reyes + Block A shows ALLOW with 'Grant found' trace; unchecking grant-dana-block-a in Relevant Grants changes result to DENY with 'No grant' trace; re-checking restores ALLOW"
    why_human: "TOGGLE_GRANT behavioral round-trip requires interactive UI state changes"
  - test: "Access Resolution Explorer: escort selection affects RESTRICTED zone results"
    expected: "Selecting Lee Park (CONFIDENTIAL) + SIGINT Suite (SECURED) + no escort shows DENY; selecting Sam Okafor (TOP_SECRET) as escort adds an 'Escort holds a valid grant' note; clearance is still the blocking gate for SECURED zones"
    why_human: "Multi-dropdown interaction with live trace recomputation requires browser"
  - test: "Zone Entry Log: filters work; ESCORT rows show visitor pass status badge"
    expected: "All 4 entry log entries visible by default; filtering by zone or person reduces the list; ESCORT rows (log-escort-1, log-escort-2) show a Pill badge ('Expired' or 'Active pass') indicating visitor pass status; CARD rows show no badge"
    why_human: "Filter interaction and conditional badge rendering require visual inspection"
---

# Phase 8: Mock Dataset & Demo UI — Verification Report

**Phase Goal:** A developer or reviewer can open the demo, browse the 6-unit zone hierarchy, resolve any person/zone combination with an explained trace, toggle grants interactively to observe inheritance and deny fallback, and inspect zone entry log history — all from a new "Physical Access" tab in DemoRoot.

**Verified:** 2026-05-23T21:49:45Z
**Status:** PASSED — 17/17 criteria verified (12 automated + 5 browser-confirmed). Person name fix applied (fix(demo): 8c84fd0).
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| SC1 | Mock dataset contains >=3 root Sites with subtrees covering all three zone_type values; SECURED nodes only at BUILDING/ZONE/ROOM level | VERIFIED | `ZONES` has 3 roots (zone-site-alpha, zone-site-intel, zone-site-logistics); SECURED zones at ZONE (zone-secure-lab, line 1014) and ROOM (zone-room-sigint, line 1047) levels only; all three zone_type values present |
| SC2 | Dataset demonstrates zone_type-scoped inheritance (CONTROLLED-building grant covering CONTROLLED rooms) and explicit exclusion (RESTRICTED/SECURED inside CONTROLLED requiring own grant) | VERIFIED | grant-dana-block-a covers zone-bldg-block-a (CONTROLLED), zone-room-sr1 is CONTROLLED child; zone-secure-lab is SECURED inside zone-bldg-block-a (CONTROLLED) — mismatched zone_type breaks inheritance |
| SC3 | Dataset includes >=1 person delegate, >=1 org delegate, both CARD and ESCORT entry logs, >=1 ZoneVisitorPass, and active/expired/future grants | VERIFIED | DELEGATES: deleg-person-1 (PERSON), deleg-org-1 (ORG); ENTRY_LOGS: 2 CARD + 2 ESCORT; VISITOR_PASSES: 2 passes; GRANTS: grant-expired-lee (expired 2026-03-01), grant-future-dana (valid_from 2026-08-01), grant-dana-block-a (permanent null/null) |
| SC4 | Zone Browser tab renders full zone hierarchy with zone_type badges; selecting a node reveals admin_org, asset_owner_org, active grants, and delegates | VERIFIED | ZoneBrowser renders collapsible tree with Pill badges; detail panel shows admin_org/asset_owner via `unitName()`, active grants show resolved person names (e.g. "Dana Reyes (active)") via `world.subjects` lookup, delegates show resolved names. Browser confirmed: Block A → "Dana Reyes (active)" grant, "Mara Vance (PERSON)" delegate. |
| SC5 | Access Resolution Explorer: person + zone selection produces ALLOW/DENY trace covering grant found, zone_type rule, clearance check, and escort note | VERIFIED | `resolveZoneAccess()` called via `useMemo` on selector change; `ZoneResolutionTrace` renders 4 gate rows (Grant, Zone type rule, Clearance, Escort for RESTRICTED/SECURED zones); TOGGLE_GRANT dispatched via checkbox onChange |
| SC6 | Zone Entry Log view lists entry events filterable by zone and person; ESCORT rows show visitor pass status | VERIFIED | `ZoneEntryLogView` filters `world.entryLogs` by zone/person dropdown; ESCORT rows invoke `getActiveVisitorPasses()` and show green/slate Pill badge; CARD rows render no badge |

**Score:** 6/6 ROADMAP success criteria verified

---

### Acceptance Criteria (08-SPEC.md — 17 items)

| # | Criterion | Status | Evidence |
|---|-----------|--------|---------|
| AC1 | ZONES/GRANTS/DELEGATES/ENTRY_LOGS/VISITOR_PASSES exist in seed.ts and TS compiles | VERIFIED | All 5 constants present (lines 958, 1101, 1169, 1196, 1239); `npx tsc --noEmit` exits 0 |
| AC2 | SEED-HEAD records above boundary comment unmodified | VERIFIED | `git show 18a351a -- src/demo/lib/seed.ts` shows 0 deleted lines; only additions appended after Phase 8 boundary comment |
| AC3 | `ZONES.filter(z => z.parent_id === null).length >= 3` | VERIFIED | 3 nodes with `parent_id: null` at lines 965, 1028, 1061 (zone-site-alpha, zone-site-intel, zone-site-logistics) |
| AC4 | No SECURED zone has `level === "SITE"` or `level === "AREA"` | VERIFIED | Both SECURED nodes: zone-secure-lab at ZONE (line 1014), zone-room-sigint at ROOM (line 1047) |
| AC5 | GRANTS contains at least one expired, one future, and one permanent grant | VERIFIED | grant-expired-lee: valid_until new Date("2026-03-01"); grant-future-dana: valid_from new Date("2026-08-01"); grant-dana-block-a: valid_from null, valid_until null |
| AC6 | DELEGATES has >=1 PERSON delegate and >=1 ORG delegate | VERIFIED | deleg-person-1: `delegate_type: "PERSON"`; deleg-org-1: `delegate_type: "ORG"` |
| AC7 | `ENTRY_LOGS.every(e => validateEntryLog(e) === null)` | VERIFIED | CARD entries: escort_person_id null; ESCORT entries: escort_person_id set ("subj-2", "subj-1"); `validateEntryLog` is tested in physical-access.test.ts (74 tests pass) |
| AC8 | Each VISITOR_PASSES entry references an ENTRY_LOGS record with `method === "ESCORT"` | VERIFIED | pass-1: entry_log_id "log-escort-1" (ESCORT); pass-2: entry_log_id "log-escort-2" (ESCORT) |
| AC9 | WorldState includes zones/grants/delegates/entryLogs/visitorPasses | VERIFIED | All 5 fields declared in WorldState interface (lines 89–93 of world-state.tsx) |
| AC10 | seedWorld() initializes all 5 zone fields from seed constants | VERIFIED | seedWorld() assigns: zones: ZONES, grants: GRANTS, delegates: DELEGATES, entryLogs: ENTRY_LOGS, visitorPasses: VISITOR_PASSES, disabledGrantIds: new Set<string>() |
| AC11 | TOGGLE_GRANT action exists in Action union and is handled by reducer | VERIFIED | Action union: `{ type: "TOGGLE_GRANT"; grantId: string }` (line 175); reducer case at line 451 creates new Set() and toggles presence immutably |
| AC12 | DemoRoot renders 6 tabs; clicking Physical Access renders PhysicalAccessPanel | VERIFIED | ActiveView union has 6 values; 6 `onClick={() => setActiveView(...)}` button calls; `{activeView === "physical-access" && <PhysicalAccessPanel />}`; PhysicalAccessPanel imported from physical-access-panel.tsx |
| AC13 | Zone Browser shows all zones in a collapsible tree with zone_type badges | VERIFIED (code) | ZoneBrowser renders `roots` from `world.zones.filter(z => z.parent_id === null)`, recurses via ZoneTreeNode, Pill badge with `ZONE_TYPE_TONE` map | HUMAN NEEDED for rendering |
| AC14 | Clicking a zone node populates detail panel with grants and delegates | VERIFIED (code) | setSelectedId on click; ZoneDetailPanel reads world.grants/delegates filtered to zone | HUMAN NEEDED for UI |
| AC15 | Access Resolution Explorer: valid grant + clearance -> ALLOW; toggling grant off -> DENY | VERIFIED (code) | resolveZoneAccess called via useMemo; activeGrants excludes disabledGrantIds; TOGGLE_GRANT dispatched on checkbox change | HUMAN NEEDED for behavioral round-trip |
| AC16 | Escort person selection affects RESTRICTED zone results | VERIFIED (code) | escortHasGrant computed via resolveGrant for escort; passed to resolveZoneAccess; ZoneResolutionTrace shows escort row for RESTRICTED/SECURED zones | HUMAN NEEDED for interaction |
| AC17 | Entry Log view renders all entries; zone/person filters work; ESCORT rows show pass status badge | VERIFIED (code) | useMemo filtering on zoneFilter/personFilter; getActiveVisitorPasses called per ESCORT row; Pill badge conditional on hasActive | HUMAN NEEDED for rendering |

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `frontend/src/demo/lib/seed.ts` | ZONES/GRANTS/DELEGATES/ENTRY_LOGS/VISITOR_PASSES constants | VERIFIED | All 5 appended below Phase 8 boundary comment; no deletions above boundary |
| `frontend/src/demo/store/world-state.tsx` | Zone fields in WorldState, seedWorld() init, TOGGLE_GRANT | VERIFIED | 5 zone fields + disabledGrantIds; all seeded from constants; Action union + reducer case |
| `frontend/src/demo/DemoRoot.tsx` | 6 tabs including "Physical Access" | VERIFIED | ActiveView has 6 values; PhysicalAccessPanel rendered on physical-access |
| `frontend/src/demo/components/physical-access-panel.tsx` | PhysicalAccessPanel with 3-view sub-nav | VERIFIED | Named export; sub-nav with zone-browser/access-resolution/entry-log |
| `frontend/src/demo/components/zone-browser.tsx` | ZoneBrowser named export | VERIFIED | `export function ZoneBrowser()` with collapsible tree + detail panel |
| `frontend/src/demo/components/access-resolution-explorer.tsx` | AccessResolutionExplorer named export | VERIFIED | `export function AccessResolutionExplorer()` with selectors, TOGGLE_GRANT, ZoneResolutionTrace |
| `frontend/src/demo/components/zone-entry-log-view.tsx` | ZoneEntryLogView named export | VERIFIED | `export function ZoneEntryLogView()` with filters + visitor pass badges |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `DemoRoot.tsx` | `physical-access-panel.tsx` | import + conditional render | VERIFIED | `import { PhysicalAccessPanel }` + `activeView === "physical-access" && <PhysicalAccessPanel />` |
| `PhysicalAccessPanel` | `ZoneBrowser` / `AccessResolutionExplorer` / `ZoneEntryLogView` | sub-nav conditional render | VERIFIED | 3 child components conditionally rendered |
| `ZoneBrowser` | `world-state.tsx` | `useWorld()` | VERIFIED | Reads zones/grants/delegates/disabledGrantIds |
| `AccessResolutionExplorer` | `world-state.tsx` | `useWorld()` + `useWorldDispatch()` | VERIFIED | Reads state + dispatches TOGGLE_GRANT |
| `ZoneEntryLogView` | `world-state.tsx` | `useWorld()` | VERIFIED | Reads entryLogs/zones/subjects/visitorPasses |
| `AccessResolutionExplorer` | `model.ts` resolution functions | `resolveZoneAccess`, `resolveGrant`, `isGrantActive` | VERIFIED | All three imported and called with world state |
| `ZoneEntryLogView` | `model.ts` | `getActiveVisitorPasses` | VERIFIED | Imported and called per ESCORT row |
| `seed.ts` ZONES/GRANTS/etc | `world-state.tsx` | named imports | VERIFIED | `import { ZONES, GRANTS, DELEGATES, ENTRY_LOGS, VISITOR_PASSES }` |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| `ZoneBrowser` | `world.zones` | `useWorld()` → `seedWorld()` → ZONES constant | Yes — 14 zone nodes | FLOWING |
| `ZoneBrowser` | `activeGrants` | `world.grants.filter(isGrantActive)` | Yes — filtered from 8 GRANTS | FLOWING |
| `AccessResolutionExplorer` | `result` (ZoneAccessResult) | `resolveZoneAccess(...)` computed from live world state | Yes — real resolution logic from model.ts | FLOWING |
| `ZoneEntryLogView` | `filtered` | `world.entryLogs.filter(...)` | Yes — 4 ENTRY_LOGS records | FLOWING |
| `ZoneEntryLogView` | visitor pass badges | `getActiveVisitorPasses(zone_id, world.visitorPasses, now)` | Yes — 2 VISITOR_PASSES records | FLOWING |

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| TypeScript compilation | `npx tsc --noEmit` | exit 0 (no output) | PASS |
| Unit test suite | `npx vitest run --exclude "**/*.e2e.*"` | 154 passed / 13 test files | PASS |
| physical-access.test.ts (model coverage) | vitest | 74 tests passed | PASS |
| world-state.test.tsx | vitest | 6 tests passed | PASS |

---

### Probe Execution

No phase-declared probes found in PLAN files. Conventional `scripts/*/tests/probe-*.sh` not present for this phase.

Step 7c: SKIPPED (no probe scripts declared or present)

---

### Requirements Coverage

| Requirement | Source Plans | Description | Status |
|-------------|-------------|-------------|--------|
| SEED-01..09 | 08-01-PLAN.md | Zone/grant/delegate/log seed data | SATISFIED — all seed constants created and verified |
| UI-01..06 | 08-02-PLAN.md, 08-03-PLAN.md | DemoRoot tab, ZoneBrowser, AccessResolutionExplorer, ZoneEntryLogView | SATISFIED (code) — human verification pending for UI behavior |

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `seed.ts` | 774, 789 | "placeholder" in comments | Info | Pre-existing FW-5 fixture from Phase 1 (above SEED-HEAD boundary) — not Phase 8 additions; comments describe the rogue-issuer test scenario |
| `zone-browser.tsx` | 138 | `{g.person_id}` in grant list | Warning | Shows raw ID (e.g., "subj-1") instead of person name; SPEC requirement 13 target text says "person name"; ROADMAP SC4 acceptance text says "active grants" without specifying name resolution. Functional, but cosmetically below spec intent |

No TBD/FIXME/XXX debt markers found in Phase 8 files.

---

### Human Verification Required

#### 1. Physical Access Tab Navigation

**Test:** Open the demo in browser (http://localhost:15510), observe the tab bar, click "Physical Access"
**Expected:** 6 tab buttons visible; clicking Physical Access renders sub-nav with "Zone Browser", "Access Resolution", "Entry Log" buttons; Zone Browser is the default active sub-view
**Why human:** Tab rendering and click navigation cannot be verified by static analysis

#### 2. Zone Browser Collapsible Tree

**Test:** In Zone Browser, expand/collapse zone nodes; click individual zones
**Expected:** 3 root site nodes visible; clicking the expand/collapse arrow toggles children; clicking any node populates the detail panel with name, level, zone_type Pill, admin org name, asset owner org name, requires_explicit_auth, active grants, and delegates. Grant list shows person identifier — confirm if "subj-1" IDs are acceptable or name resolution is required.
**Why human:** Visual tree rendering and panel population require browser; name vs ID in grant list needs product decision

#### 3. TOGGLE_GRANT Round-Trip (ALLOW → DENY → ALLOW)

**Test:** In Access Resolution Explorer, select Dana Reyes + Block A zone. Observe ALLOW. Uncheck "Block A — Dana Reyes" in Relevant Grants panel. Re-check.
**Expected:** Initial state shows ALLOW with "Grant found" row; unchecking changes trace to "No grant" and result to DENY; re-checking restores ALLOW
**Why human:** Multi-step UI interaction with live state recomputation

#### 4. Escort Affects RESTRICTED Zone Resolution

**Test:** Select Lee Park (CONFIDENTIAL clearance) + Analysis Wing (RESTRICTED zone); observe DENY. Then set escort to Sam Okafor (TOP_SECRET with grant on Analysis Wing).
**Expected:** Without escort: DENY with clearance row showing insufficient; with Sam as escort: escort row shows "Escort holds a valid grant" — verify whether this changes ALLOW/DENY given that Lee has CONFIDENTIAL and Analysis Wing is RESTRICTED
**Why human:** Clearance + escort interaction in RESTRICTED zone resolution logic requires live trace observation

#### 5. Entry Log Filters and Visitor Pass Badges

**Test:** Open Entry Log view; filter by zone "SIGINT Suite"; observe entries; observe ESCORT rows
**Expected:** Unfiltered: 4 entries; filtered to SIGINT Suite: 1 ESCORT entry; ESCORT rows show a Pill badge ("Expired" for pass-1 since valid_until was 2026-05-17, "Active pass" for pass-2 if still within valid_until 2026-12-31); CARD rows show no badge; current date is 2026-05-23 so pass-1 should show "Expired"
**Why human:** Filter dropdown interaction and date-relative badge logic require running state

---

### Gaps Summary

No automated gaps found. All 12 verifiable criteria pass static and compilation checks.

One minor spec deviation identified: ZoneBrowser grant list renders `g.person_id` (e.g., "subj-1") instead of resolving the person name. The SPEC requirement 13 target text specifies "person name + active/expired status". This is not a blocker — the ROADMAP SC4 acceptance criterion does not explicitly require name resolution and the data displayed is accurate. Human verification item 2 asks the developer to decide whether this is acceptable.

---

_Verified: 2026-05-23T21:49:45Z_
_Verifier: Claude (gsd-verifier)_
