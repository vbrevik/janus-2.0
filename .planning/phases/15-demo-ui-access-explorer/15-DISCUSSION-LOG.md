# Phase 15: Demo UI & Access Explorer - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-05
**Phase:** 15-demo-ui-access-explorer
**Areas discussed:** Tab layout & tree reuse, Explorer/reverse-lookup arrangement, Issuing form placement, Error boundary implementation

---

## Tab layout & tree reuse

| Option | Description | Selected |
|--------|-------------|----------|
| Application-only flat list | New lightweight list, no Network/Platform rows | ✓ |
| Reuse full tree component | Import ResourceTreeNodeRow/buildResourceTree as-is | |
| You decide | Claude picks based on what's cleanest | |

**User's choice:** Application-only flat list

| Option | Description | Selected |
|--------|-------------|----------|
| Clickable row list | Same row style as ResourceTreeNodeRow, flat, no expand/collapse | ✓ |
| Select dropdown | Reuse ui/Select component | |

**User's choice:** Clickable row list

| Option | Description | Selected |
|--------|-------------|----------|
| dataset-panel.tsx | Singular, mirrors resource-browser.tsx naming | |
| datasets-panel.tsx | Plural, mirrors digital-resources-panel.tsx naming | ✓ |

**User's choice:** datasets-panel.tsx

| Option | Description | Selected |
|--------|-------------|----------|
| Datasets tab does its own fetch | Mounts useDigitalResourcesWorld + loader states independently | ✓ |
| Empty-state message, no fetch | Reads world.digitalResources.applications as-is; shows a message if empty | |

**User's choice:** Datasets tab does its own fetch
**Notes:** Surfaced as a real risk during scouting — `world.digitalResources.applications` is only populated by the existing Digital Resources tab's mount-time fetch, so a user visiting the new tab first would otherwise see an empty picker with no explanation.

---

## Explorer/reverse-lookup arrangement

| Option | Description | Selected |
|--------|-------------|----------|
| Inner sub-tabs | Browse/Explorer/Reverse-lookup as inner tabs, auto-switch on selection | |
| Single stacked view | Both rendered below the picker, no inner tab-switch | ✓ |

**User's choice:** Single stacked view

| Option | Description | Selected |
|--------|-------------|----------|
| Side-by-side columns | Application list left / Datasets list right, matches resource-browser.tsx grid | ✓ |
| Stacked full-width | Application picker strip, Datasets list card below it | |

**User's choice:** Side-by-side columns

| Option | Description | Selected |
|--------|-------------|----------|
| Placeholder prompt | "Select a dataset above..." shown until selection | |
| Hidden until selected | Sections don't render at all until a dataset is chosen | ✓ |

**User's choice:** Hidden until selected

---

## Issuing form placement

| Option | Description | Selected |
|--------|-------------|----------|
| Under the explorer | Mirrors v2.2's exact IssueGrantSection placement | ✓ |
| Under reverse-lookup | Groups with the list it adds a row to | |
| Standalone card | Own separate card | |

**User's choice:** Under the explorer

| Option | Description | Selected |
|--------|-------------|----------|
| Collapsed toggle (matches v2.2) | "+ Issue new grant" link expands the form | ✓ |
| Always expanded | Fields always visible | |

**User's choice:** Collapsed toggle (matches v2.2)

| Option | Description | Selected |
|--------|-------------|----------|
| Direct dispatch, no hook | dispatch() called directly, no mutation-shaped state | |
| Wrap in a hook anyway | New useIssueDatasetGrant() hook for API-shape parity | ✓ |

**User's choice:** Wrap in a hook anyway
**Notes:** Dispatch is synchronous/in-memory (Phase 14 D-10), so there's no real async boundary — user chose parity with v2.2's hook shape over the leaner direct-dispatch option.

| Option | Description | Selected |
|--------|-------------|----------|
| Compare audit log length | Hook diffs state.datasets.auditLog.length before/after dispatch | ✓ |
| Reducer throws on denial | Reducer or hook pre-checks canIssueDatasetGrant and throws | |

**User's choice:** Compare audit log length
**Notes:** Keeps the reducer's existing silent-denial contract (Phase 13/14) untouched; the hook infers failure indirectly.

---

## Error boundary implementation

| Option | Description | Selected |
|--------|-------------|----------|
| Wrap explorer + reverse-lookup only | Picker/list above stays usable if resolver throws | ✓ |
| Wrap the whole Datasets tab | Single boundary around the entire tab | |

**User's choice:** Wrap explorer + reverse-lookup only

| Option | Description | Selected |
|--------|-------------|----------|
| Generic, in demo/components/ui | Reusable alongside Card/Field/Pill/Select | ✓ |
| Local to dataset-access-explorer.tsx | Scoped to one file | |

**User's choice:** Generic, in demo/components/ui

| Option | Description | Selected |
|--------|-------------|----------|
| Static message, no retry | Error-card style, no button | |
| Message + reset button | Same message, plus a state-reset button | ✓ |

**User's choice:** Message + reset button

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, key on datasetId | Boundary remounts fresh on dataset switch | ✓ |
| No, only manual reset | Error persists across dataset switches until reset | |

**User's choice:** Yes, key on datasetId

---

## Claude's Discretion

- Exact reverse-lookup table/list column layout and styling not otherwise specified
- Exact naming of `dataset-access-explorer.tsx`'s internal helpers/types beyond SPEC/prior-CONTEXT locks
- Exact wording of empty-state messages (tone matched to existing copy)

## Deferred Ideas

None — discussion stayed within phase scope.
