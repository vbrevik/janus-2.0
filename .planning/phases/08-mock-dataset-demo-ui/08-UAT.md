---
status: complete
phase: 08-mock-dataset-demo-ui
source: 08-01-SUMMARY.md, 08-02-SUMMARY.md, 08-03-SUMMARY.md
started: 2026-05-24T00:13:00Z
updated: 2026-06-05T12:00:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Physical Access tab appears and switches view
expected: |
  Tab bar shows 6 tabs. Click "Physical Access" — main content area changes.
  The active tab button should turn dark (bg-slate-800 text-white).
result: pass

### 2. ZoneBrowser sub-nav visible with 3 sub-tabs
expected: |
  Inside Physical Access view, a secondary nav shows 3 buttons:
  "Zone Browser", "Access Resolution", "Entry Log".
  Zone Browser is active by default (dark background).
result: pass

### 3. Zone tree shows 3 root Sites
expected: |
  Left panel "Zone Hierarchy" shows 3 root nodes:
  - Alpha Command (CONTROLLED pill, grey)
  - Intel Campus (RESTRICTED pill, amber/yellow)
  - Logistics Hub (CONTROLLED pill, grey)
  Each has an expand arrow (▶) next to it.
result: pass

### 4. Zone tree expand/collapse works
expected: |
  Click ▶ next to "Alpha Command" — it expands to show child zones
  (North Wing, Secure Lab, etc.). Arrow changes to ▼.
  Click ▼ again — collapses back.
result: pass

### 5. Zone detail panel shows on click
expected: |
  Click a zone node (e.g. "Alpha Command") — right panel shows:
  Level, Zone Type (with CONTROLLED/RESTRICTED/SECURED pill), Requires Explicit Grant,
  Admin Org, Asset Owner. Empty state "Select a zone to see details." is gone.
result: pass

### 6. SECURED zone shows "Requires Explicit Grant: Yes"
expected: |
  Expand Alpha Command → expand Block A → click "Secure Lab".
  Detail panel shows "Requires Explicit Grant: Yes" and zone type pill is SECURED (red).
result: pass

### 7. Active grants show person names
expected: |
  In Zone Detail, "Active grants" card shows person names (e.g. "Dana Reyes (active)"),
  NOT raw IDs like "subj-1 (active)".
result: pass

### 8. Delegates section shows in detail panel
expected: |
  Click "Block A" zone — "Delegates" card shows at least one delegate entry
  (Mara Vance as PERSON delegate, or similar). Not empty.
result: pass

### 9. Access Resolution tab renders selectors
expected: |
  Click "Access Resolution" sub-tab. Page shows:
  - Intro text about live resolution
  - 3 selector cards: Person, Zone, Escort
  - Each has a dropdown
result: pass

### 10. Access resolution computes ALLOW for valid grant
expected: |
  In Access Resolution: select person "Dana Reyes", zone "Block A" (has grant for Dana).
  Result box shows "✓ ALLOW" in green. Gate rows show grant found.
result: pass

### 11. Access resolution computes DENY for no grant
expected: |
  Select person "Lee Park", zone "Secure Lab" (Lee has no grant there, and it requires explicit auth).
  Result shows "✗ DENY" in red.
result: pass

### 12. Toggle grant changes ALLOW→DENY
expected: |
  With an ALLOW result showing, find the grant checkbox in "Relevant grants" panel
  and uncheck it. Result switches from ALLOW to DENY.
  Re-check → switches back to ALLOW.
result: pass

### 13. Entry Log tab shows entries
expected: |
  Click "Entry Log" sub-tab. Shows a list of entries with:
  - Timestamps (ISO format)
  - Method badge: slate-grey "CARD" or blue "ESCORT"
  - Person → Zone layout
result: pass

### 14. ESCORT entries show visitor pass badge
expected: |
  Find an ESCORT entry in the log. It shows either:
  - Green "Active pass" badge, OR
  - Grey "Expired" badge
  (depending on which escort entry is selected)
result: pass

### 15. Entry log zone filter works
expected: |
  In the Zone dropdown filter (above entry list), select a specific zone.
  Entry list filters to only show entries for that zone.
  Selecting "All zones" restores the full list.
result: pass

### 16. Entry log is sorted newest-first
expected: |
  The most recent entry appears at the top. Timestamps decrease as you scroll down.
result: pass

### 17. Other tabs still work after switching back
expected: |
  Click "Decision Explorer" tab — Decision Explorer content appears normally.
  No blank screen or error.
result: pass

## Summary

total: 17
passed: 17
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

- truth: "Zones in Access Resolution dropdown shown as hierarchy tree, not flat list"
  status: won't_fix
  reason: "Minor enhancement suggestion — flat list works, hierarchy would be nicer UX"
  severity: minor
  test: 9
  root_cause: "Zone list rendered as flat array in dropdown select component"
  artifacts:
    - path: "frontend/src/demo/components/physical-access/AccessResolutionView.tsx"
      issue: "Zone list not building parent-child hierarchy for dropdown display"
  missing:
    - "Build zone hierarchy tree and use it in zone dropdown in Access Resolution panel"
  debug_session: ""
