# Phase 13: Dataset Model & Access Resolver - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-04 (original) + 2026-07-04 (updated with 4 new discussion decisions)
**Phase:** 13-dataset-model-access-resolver
**Areas discussed:** Test/fixture organization, ARCHIVE_ROLE containment shape, Gate-trace shape for `visible`, Resolver output shape, admin_org delegation exemption, Missing application reference, Effective access aggregation for ARCHIVE_ROLE

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

## Resolver output shape

| Option | Description | Selected |
|--------|-------------|----------|
| (a) Single flat shape `{ allow, gates, visible, reason? }` | All fields on one object, mirrors ResourceAccessResult | ✓ |
| (b) Wrapped shape `{ result, visible }` | Two objects, keeps v2.2 shape untouched | |

**User's choice:** Single flat shape (a)
**Notes:** Chosen for Phase 15 UI simplicity — one trace + one boolean rendered directly. The v2.2 `ResourceAccessResult` shape is extended, not duplicated.

---

## Delegate authority — admin_org exemption

| Option | Description | Selected |
|--------|-------------|----------|
| (a) admin_org fully exempt | Can always issue, matches "unrestricted" literally | ✓ |
| (b) Must hold personal grant | Stricter, mirrors delegate pattern | |
| (c) Must hold admin_org role on dataset | No personal grant needed but role-gated | |

**User's choice:** Fully exempt (a)
**Notes:** DATA-DELEG-01 says "admin_org itself retains unrestricted issuing authority regardless of whether it holds a personal grant" — this was the literal interpretation confirmed. The cap applies ONLY to delegates, not to admin_org.

---

## Missing application reference handling

| Option | Description | Selected |
|--------|-------------|----------|
| (a) Soft fail, log in trace | Same treatment as expired/missing gate | ✓ |
| (b) Silent fail | No trace entry | |
| (c) Throw error | Data integrity problem | |

**User's choice:** Soft fail, log in trace (a)
**Notes:** Invalid reference is an access problem, not data integrity. Phase 14's seed won't produce this case, but the resolver must handle it gracefully so DATA-SEED-06's deny-matrix tests can exercise the "Application grant expired with live dataset grant" scenario through the same gate path.

---

## Effective access aggregation for ARCHIVE_ROLE (DATA-GRANT-03)

| Option | Description | Selected |
|--------|-------------|----------|
| (a) Union of coverage | Transitive union of all held roles' containment trees | ✓ |
| (b) Highest single role | Pick deepest containment tree | |
| (c) Set-based, compute on-fly | No pre-computation | |

**User's choice:** Union of coverage (a)
**Notes:** A person holding both CASE_HANDLER and READER gets the transitive union `{CASE_HANDLER, READER, ADMIN} ∪ {READER} = {CASE_HANDLER, READER, ADMIN}`. Compute at resolution time, not pre-computed. Keeps the mechanism correct for future non-linear role additions without special-casing.

---

## Claude's Discretion

- Exact function/type naming beyond what SPEC.md and decisions specify — follow existing v2.2 naming conventions (`resolveResourceAccess`, `ResourceGateResult`, etc.)
- Whether `visible` gate's trace entry uses same reason string format as other gates — follow existing `ResourceGateResult.reason` pattern

---

## Deferred Ideas

None — discussion stayed within phase scope.

## Reviewed Todos (not folded)

- **fix-non-admin-login-redirect** (`.planning/todos/pending/fix-non-admin-login-redirect.md`) — matched with weak keyword-only score (0.6). Reviewed and NOT folded — unrelated frontend auth-routing bug with zero connection to the pure TypeScript dataset resolver. Remains in `.planning/todos/pending/` for a future phase.
