# Phase 13: Dataset Model & Access Resolver - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-04
**Phase:** 13-dataset-model-access-resolver
**Areas discussed:** Test/fixture organization, ARCHIVE_ROLE containment shape, Gate-trace shape for `visible`

---

## Test/fixture organization

| Option | Description | Selected |
|--------|-------------|----------|
| Inline-only, mirror D3-13 | New 13-*.test.ts uses hand-written inline fixtures like digital-resource.test.ts/physical-access.test.ts; seed.ts stays untouched in Phase 13 | ✓ |
| Add a few real fixtures to seed.ts now | Append a handful of Dataset/DatasetAccessGrant fixtures to seed.ts in Phase 13 | |

**User's choice:** Inline-only, mirror D3-13 (Recommended)
**Notes:** This reverses SPEC.md's spec-phase boundary answer ("Also touch seed.ts for minimal fixtures"), which was given before the sibling test files' established inline-fixtures convention was surfaced during codebase scouting. Superseded here.

---

## ARCHIVE_ROLE containment shape

| Option | Description | Selected |
|--------|-------------|----------|
| Descendant-list Record | `Record<ArchiveRole, ArchiveRole[]>` — simple, greppable, extensible | ✓ |
| Pure covers() function | Internal switch/lookup hidden behind a function boundary | |

**User's choice:** Descendant-list Record (Recommended)
**Notes:** Matches the literal phrasing from spec-phase's interview ("one role can contain another role... if not part of, then no substitution").

---

## Gate-trace shape for `visible`

| Option | Description | Selected |
|--------|-------------|----------|
| Separate top-level field only | visible is conceptually different from allow-gates, evaluated independently of gate order | |
| Add as a 4th gates[] entry | Keep everything in one trace array for UI consistency with the existing ResourceResolutionTrace pattern | ✓ |

**User's choice:** Add as a 4th gates[] entry
**Notes:** User chose the non-recommended option — wants UI-trace consistency now even though Phase 15 (UI) is later. CONTEXT.md clarifies this is an ADDITIONAL trace representation, not a replacement for the top-level `visible: boolean` field SPEC.md's DATA-ACCESS-04 already requires.

---

## Claude's Discretion

- Exact function/type naming beyond what SPEC.md and the 3 decisions above specify (internal helper names, parameter ordering) — follow existing v2.2 naming conventions as the closest analog.

## Deferred Ideas

None raised during this discussion — stayed within Phase 13's locked scope. One pending todo (`fix-non-admin-login-redirect`) was reviewed via the todo cross-reference check but not folded — unrelated frontend auth bug, weak keyword-only match score (0.6).
