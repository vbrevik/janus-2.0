# Phase 13: Dataset Model & Access Resolver - Research

**Researched:** 2026-07-04
**Domain:** TypeScript type design for a multi-vocabulary authorization resolver (pure functions, no runtime deps) extending an existing tiered ABAC demo
**Confidence:** HIGH — grounded in direct reads of `frontend/src/demo/lib/model.ts` (the exact file this phase extends), the sibling test file establishing test conventions, milestone-level `ARCHITECTURE.md`/`PITFALLS.md` (already HIGH confidence, produced 2026-07-03), and the project's own `tsconfig.app.json`. One MEDIUM-confidence external check (TypeScript's `satisfies` operator, confirmed against the official TypeScript docs).

## Summary

Phase 13 is a pure, standalone addition to `frontend/src/demo/lib/model.ts`: three new dataset types, two level-comparison mechanisms (rank tables for `MAILBOX`/`DOCUMENT_SITE`, a containment map for `ARCHIVE_ROLE`), a 3-gate resolver (`resolveDatasetAccess`), a classification-override validator (`effectiveDatasetClassification`), and a delegate-capped issuing-authority check (`canIssueDatasetGrant`). No UI, no world-state wiring, no seed changes beyond this phase's own inline test fixtures (D-01) — those are Phase 14/15.

The codebase already contains the exact structural precedent this phase needs: `GateDescriptor` (a discriminated union keyed by `kind`) dispatched through `evaluateGate`'s `switch`, closed by `assertNeverGateKind`'s compile-time exhaustiveness guard (model.ts:686-1070). This is precisely the "discriminated union + switch + `never`-exhaustiveness" pattern that TypeScript's own documentation recommends for making variant-specific logic type-safe, and it is the pattern to mirror for `DatasetType`-dispatched level comparison — not a novel branded-type or nominal-typing scheme, which has zero precedent anywhere in this codebase and would be a needless deviation (CLAUDE.md Rule 2/3: simplicity, surgical, match existing style).

The one genuinely new design problem this phase introduces (not present in v2.2) is: two *different* comparison mechanisms (rank vs. containment) must coexist behind one resolver, and the three level vocabularies share literal values (`"READ"` appears in both `MAILBOX` and `DOCUMENT_SITE`). Bare string-literal typing alone does not prevent a `"READ"` value with no type-tag from being accepted by the wrong vocabulary's comparator — TypeScript's structural typing treats an untagged `"READ"` literal as assignable to either union. The fix is not "more clever types" on the open `DatasetAccessGrant.level: string` field (which must stay open, exactly like the existing `OrgLink.role: BaselineOrgRole | (string & {})` precedent, because a single grant array is heterogeneous across dataset types) — the fix is that every *internal* comparison function must take `dataset.dataset_type` as an explicit, unavoidable input and switch on it before touching a level value, never comparing two levels without that tag in scope. This is D-02's containment map already locked correctly; the same discipline extends to the two rank tables and the dispatch functions around them.

**Primary recommendation:** Reuse the existing `GateDescriptor`/`evaluateGate`/`assertNeverGateKind` pattern verbatim in shape: define `MailboxLevel`, `DocumentSiteLevel`, `ArchiveRole` as three *separate* (non-unioned) string-literal types; scope every rank/containment table and comparator to exactly one `DatasetType` via a switch keyed on `dataset.dataset_type`, closed with a `never`-exhaustiveness check; validate the open-string `DatasetAccessGrant.level`/`requiredLevel` fields against the dataset's own vocabulary at the point they enter a typed comparison, throwing on a caller-supplied bad `requiredLevel` (programmer error) and denying (not throwing) on a bad stored grant (data error) — these are two different failure classes and Requirements 2 and 4 of `13-SPEC.md` deliberately specify different behavior for each.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**D-01 (Test/fixture organization):** New `frontend/src/demo/lib/dataset.test.ts` uses hand-written INLINE fixtures only — mirrors the established "D3-13 pattern" already used by `digital-resource.test.ts` and `physical-access.test.ts` (no `seed.ts` import at the model-test level, avoids circular-import risk). `seed.ts` stays untouched in Phase 13 — the real mock dataset is Phase 14's job. This supersedes SPEC.md's boundary note about touching seed.ts for minimal fixtures.

**D-02 (ARCHIVE_ROLE containment shape):** The containment map is a descendant-list `Record`: `const ARCHIVE_ROLE_CONTAINS: Record<ArchiveRole, ArchiveRole[]> = { ADMIN: ["CASE_HANDLER", "READER"], CASE_HANDLER: ["READER"], READER: [] }`. Directly greppable and easy to extend with a new non-linear role later, versus hiding the structure behind a `covers()` function's internal logic.

**D-03 (Gate-trace shape for `visible`):** The visibility check is added as a 4th entry in the `gates: ResourceGateResult[]` trace array (alongside clearance, Application-grant, dataset-grant), NOT as a separate top-level-only field. Chosen for UI consistency with the existing `ResourceResolutionTrace` row-rendering pattern that Phase 15 will reuse. **`resolveDatasetAccess` must still expose `visible: boolean` as its own top-level field too** (SPEC.md DATA-ACCESS-04 requires this explicitly, and Phase 15's dataset-listing filter needs a direct boolean, not a trace-array scan) — the gates[] entry is an ADDITIONAL trace representation of the same check, not a replacement for the top-level field.

### Claude's Discretion
- Exact function/type naming beyond what SPEC.md and the decisions above specify (e.g. internal helper names, parameter ordering within `resolveDatasetAccess`'s signature) — no strong preference expressed, follow existing v2.2 naming conventions (`resolveResourceAccess`, `ResourceGateResult`, etc.) as the closest analog.

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope. (One reviewed-but-not-folded todo, `fix-non-admin-login-redirect`, is unrelated to this phase and remains in `.planning/todos/pending/`.)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DATA-01 | `DatasetNode` links to ≥1 Application via non-empty `application_ids: string[]` | Model shape in Code Examples; empty-array rejection is a constructor/validator check, mirrored on `validatePolicyWindows`'s `string \| null` seed-validator contract |
| DATA-02 | `dataset_type: "MAILBOX" \| "ARCHIVE_ROLE" \| "DOCUMENT_SITE"`, open-vocabulary-extensible | `DatasetType` union + per-type table pattern in Architecture Patterns; exhaustiveness via `never`-closed switch, mirroring `assertNeverGateKind` |
| DATA-03 | Per-type level mechanism: rank tables for MAILBOX/DOCUMENT_SITE, containment map for ARCHIVE_ROLE; cross-type comparison unrepresentable; unknown level/role fails closed | Core of this research — see "TypeScript Patterns for the Two-Mechanism Problem" and Pitfall 1/2 below |
| DATA-04 | `admin_org_id` + `asset_owner_org_id` fixed fields (v2.1 dual-org pattern, NOT `org_links`) | Confirmed against REQUIREMENTS.md; `canIssueDatasetGrant`'s admin check is a direct field-equality test, not an `activeOrgLinksForRole` lookup (no window on this field — it isn't time-boxed like `OrgLink`) |
| DATA-05 | `classification_override: Clearance \| null`; override must be ≥ parent's effective classification, never lower | `effectiveDatasetClassification` in Code Examples, directly extends `effectiveClassification`'s single-hop derive pattern (model.ts:855) |
| DATA-ACCESS-01 | Application-grant prerequisite is an OR-gate across `application_ids`, enforced at resolution time (not issue time) | Gate 2 design in Architecture Patterns; direct extension of `evaluateParentTierGrantGate`'s flat-lookup semantics (model.ts:981), OR'd across the list |
| DATA-ACCESS-02 | Dataset access requires an explicit `DatasetAccessGrant` at/covering the required level | Gate 3 design; dispatch-by-`dataset_type` pattern |
| DATA-ACCESS-03 | 3-gate ordered chain: clearance → Application-grant OR-gate → dataset-grant; standalone resolver, does not modify `ResourceTier`/`resolveResourceAccess` | Full resolver shape in Code Examples; Anti-Pattern warnings against tier-union widening (already covered in PITFALLS.md Pitfall 9, reinforced here for the type-design angle) |
| DATA-ACCESS-04 | `visible: boolean` gated solely by gate 2, independent of clearance/dataset-grant, surfaced as its own field AND a trace row (D-03) | `DatasetAccessResult` shape in Code Examples; ordering discipline note (compute visible before/independently of gates 1 and 3) |
| DATA-GRANT-01 | `DatasetAccessGrant` links person→dataset→level, with nullable `valid_from`/`valid_until` | Reuses `isWindowActive` verbatim; shape in Code Examples |
| DATA-GRANT-02 | Multiple simultaneous grants per dataset at different levels are valid | Aggregation functions in Architecture Patterns (`effectiveRankedLevel`, `effectiveArchiveCoverage`) |
| DATA-GRANT-03 | Effective access = highest-active-grant (ranked types) / containment-union (ARCHIVE_ROLE) | Same aggregation functions; two distinct algorithms, not one generic "highest wins" |
| DATA-DELEG-01 | `canIssueDatasetGrant`: `admin_org` unrestricted; delegate capped at own held grant; no personal grant ⇒ issue nothing | `canIssueDatasetGrant` design in Code Examples; flags an open question on delegate shape (person-only vs person+org) — see Open Questions |
</phase_requirements>

## Architectural Responsibility Map

This phase has no browser/SSR/API/DB tiers in the generic web-app sense — it is a pure, demo-only TypeScript module (per PROJECT constraints: Rust/Postgres backend is out of scope for all of v2.3). The project's own layering (confirmed in `ARCHITECTURE.md`) is the correct substitute framework:

| Capability | Primary Tier (this project) | Secondary Tier | Rationale |
|------------|-----------------------------|----------------|-----------|
| `DatasetNode`/`DatasetAccessGrant`/`DatasetAccessDelegate` type definitions | Pure Engine (`lib/model.ts`) | — | Append-only, mirrors every prior milestone's engine-in-model.ts precedent (avoids circular imports with seed.ts/world-state.tsx) |
| Per-type level/containment tables (`MAILBOX`/`DOCUMENT_SITE` rank arrays, `ARCHIVE_ROLE_CONTAINS`) | Pure Engine (`lib/model.ts`) | — | Type-design decision that cannot be retrofitted after seed/UI consume it (PITFALLS.md Pitfall 1) |
| `effectiveDatasetClassification` | Pure Engine (`lib/model.ts`) | — | Direct extension of `effectiveClassification`; must NOT live in a selector (would violate the pure-computed-ABAC / no-denormalized-derived-fields invariant, Anti-Pattern 4) |
| `resolveDatasetAccess` (3-gate chain) | Pure Engine (`lib/model.ts`) | — | Fixed-chain resolver, standalone from `resolveResourceAccess`'s data-driven gate-dispatch engine (Anti-Pattern 1/9) |
| `canIssueDatasetGrant` | Pure Engine (`lib/model.ts`) | — | Mirrors `canIssueResourceGrant`; pure, explicit `now`, no I/O |
| Test fixtures for all of the above | Test (`lib/dataset.test.ts`, NEW) | — | D-01: inline-only, no seed.ts import, sibling of `digital-resource.test.ts` |
| World-state wiring, selectors, cross-source join to backend-fetched Applications | — (explicitly OUT of Phase 13) | Phase 14 | This phase's `resolveDatasetAccess` takes plain arrays as parameters; joining/filtering happens one phase later |
| UI rendering of the trace/visibility/effective-level | — (explicitly OUT of Phase 13) | Phase 15 | `ResourceResolutionTrace` row-reuse is a Phase 15 concern; Phase 13 only needs to shape `DatasetAccessResult` so that reuse is possible later |

**Sanity check for the planner:** every capability in this phase resolves to exactly one tier (Pure Engine) — if any plan task proposes touching `world-state.tsx`, `seed.ts` (beyond this phase's own test fixtures per D-01), or any `.tsx` component, that is a scope violation per `13-SPEC.md`'s explicit out-of-scope list.

## Standard Stack

### Core

No new libraries. This phase is 100% TypeScript language features + Vitest, both already present.

| Tool | Version (confirmed in repo) | Purpose | Why Standard |
|------|------|---------|---------------|
| TypeScript | `~5.9.3` (`frontend/package.json`) `[VERIFIED: npm view via package.json + npx tsc --version, both confirm 5.9.3]` | Discriminated unions, `satisfies`, `never`-exhaustiveness, `strict` mode | Already the project's only type-checking mechanism; `tsconfig.app.json` has `"strict": true` and `"noFallthroughCasesInSwitch": true` — both required for the exhaustiveness pattern below to actually catch mistakes |
| Vitest | `^4.0.3` (`frontend/package.json`) `[VERIFIED: package.json]` | Test runner | Existing convention (`digital-resource.test.ts`, `physical-access.test.ts`); no new config needed |

### Supporting

None. Zero new npm dependencies is an explicit SPEC.md constraint, and nothing here needs one — everything is native `Record`, union types, and pure functions.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Discriminated union + `switch` + `never`-exhaustiveness (recommended) | Branded/nominal types (e.g. `type MailboxLevel = string & { __brand: "MailboxLevel" }`) | Branding would ALSO make cross-type comparison a compile error, but has zero precedent anywhere in this codebase, requires a cast at every construction site (seed data, test fixtures), and buys nothing extra here — the discriminated-union approach already achieves the same guarantee for the actual comparison functions this phase needs. Rejected as unnecessary complexity (CLAUDE.md Rule 2). |
| Discriminated union + `switch` (recommended) | Generic conditional types tying `requiredLevel`'s type to a type-parameter narrowed from `dataset.dataset_type` (e.g. `resolveDatasetAccess<T extends DatasetType>(dataset: DatasetNode & {dataset_type: T}, requiredLevel: RequiredLevelFor<T>, ...)`) | Only pays off if call sites pass a dataset whose `dataset_type` is statically narrowed to a literal at the call site. In practice datasets come from a runtime array (`DatasetNode[]`) with `dataset_type: DatasetType` — an un-narrowed union — so TypeScript cannot infer `T` as anything but the full union, and the generic constraint provides no real protection over a runtime check. Not recommended as the primary mechanism; the runtime throw-on-mismatch (already required by DATA-03's acceptance criteria, which explicitly says "fails closed (**throws**)" — a runtime behavior, not a compile error) is simpler and equally safe. |
| `satisfies` for the rank/containment tables | Plain `: Record<K, V>` type annotation (what D-02 already specifies) | A plain `Record<ArchiveRole, ArchiveRole[]>` annotation ALREADY forces every `ArchiveRole` key to be present (TypeScript errors on a missing property) — this is full compile-time exhaustiveness with zero extra syntax. `satisfies` only adds value if the plan later needs literal-narrowed inference on the *values* (e.g. `typeof ARCHIVE_ROLE_CONTAINS.ADMIN` as a specific tuple instead of `ArchiveRole[]`) — not needed for anything DATA-01..DELEG-01 asks for. **D-02's exact literal syntax is correct and sufficient as locked; do not "upgrade" it to `satisfies`.** |

**Installation:** none — no `npm install` needed for this phase.

**Version verification:** `frontend/package.json` pins `"typescript": "~5.9.3"`; `npx tsc --version` in the repo confirms `Version 5.9.3` is actually installed (not just declared). `"vitest": "^4.0.3"` confirmed the same way against `package.json`. Both are current-enough for every pattern recommended below (`satisfies` shipped in TS 4.9, well before 5.9; discriminated unions and `never`-exhaustiveness are long-stable TS features).

## Package Legitimacy Audit

Not applicable — this phase installs zero new packages (explicit SPEC.md constraint: "Zero new npm dependencies"). No packages to audit.

## Architecture Patterns

### System Architecture Diagram

```
                    resolveDatasetAccess(person, dataset, applications, platforms,
                                         appGrants, datasetGrants, requiredLevel, now)
                                          │
                    ┌─────────────────────┼─────────────────────┐
                    │                     │                     │
                    ▼                     ▼                     ▼
         Gate 1: CLEARANCE      Gate 2: APP_GRANT_OR       Gate 3: DATASET_GRANT
         subjectClearance ≥     active ResourceAccessGrant  active DatasetAccessGrant
         effectiveDataset       on ANY id in                covering requiredLevel,
         Classification(...)    dataset.application_ids     dispatched by dataset_type:
         (reuses                (flat lookup × N ids,       ┌─────────────┬──────────────┐
          effectiveClassification,  OR'd — Anti-Pattern 3:   │ MAILBOX /   │ ARCHIVE_ROLE │
          CLEARANCE_RANK)        no ancestor walk, no        │ DOCUMENT_   │ containment- │
                                 "would resolveResourceAccess │ SITE rank-  │ union over   │
                                 pass" check — flat grant     │ max over    │ active role  │
                                 existence only, mirrors      │ active      │ grants       │
                                 evaluateParentTierGrantGate) │ grants      │              │
                    │                     │                     │
                    │            visible = gate 2 alone      │
                    │            (independent of gates 1, 3) │
                    └─────────────────────┼─────────────────────┘
                                          ▼
                     allow = gate1.pass && gate2.pass && gate3.pass
                     gates = [gate1, gate2, gate3, visibilityGateEntry]  (D-03: all 4 in trace)
                     visible = gate2.pass                                (D-03: ALSO top-level)
                                          │
                                          ▼
                          DatasetAccessResult { allow, visible, gates, reason? }

    ─────────────────────────────────────────────────────────────────────────

    canIssueDatasetGrant(actorOrgId, dataset, requestedLevel, datasetGrants, delegates, now)
                    │
        actorOrgId === dataset.admin_org_id ? ──yes──► true (unrestricted, no grant check)
                    │no
                    ▼
        active DatasetAccessDelegate for (actor, dataset.id) at `now`? ──no──► false
                    │yes
                    ▼
        delegate's OWN active DatasetAccessGrant on this exact dataset?  ──no──► false
                    │yes
                    ▼
        requestedLevel ≤ delegate's own covered level?     (rank ≤ for ranked types,
                    │                                        containment-covers for ARCHIVE_ROLE)
              yes ──┴── no ──► false
                    ▼
                   true
```

A reader following the arrows sees: dataset access always evaluates all 3 gates (full trace, v2.2 style — never short-circuits the trace even though `allow` short-circuits logically), `visible` is computed from gate 2 alone and surfaces in two places, and issuing authority is a completely separate function with its own (org-field-equality + delegate-cap) chain that never touches `resolveDatasetAccess`.

### Recommended Project Structure

```
frontend/src/demo/lib/
├── model.ts             # APPEND ONLY: new "// --- Phase 13: Dataset model & access
│                         #   resolver (v2.3) ---" section, mirroring the existing
│                         #   "// --- Phase 9: Digital Resource hierarchy model (v2.2) ---"
│                         #   header convention (model.ts:651)
└── dataset.test.ts      # NEW: sibling of digital-resource.test.ts, inline fixtures only (D-01)
```

Nothing else moves. `seed.ts`, `world-state.tsx`, and every `.tsx` component are untouched this phase (confirmed against `13-SPEC.md`'s Boundaries section and `ARCHITECTURE.md`'s Suggested Build Order).

### Pattern 1: `DatasetType`-dispatched level comparison (the discriminated-union-and-switch idiom)

**What:** Three separate literal-union types, never merged into one `DatasetLevel` union, plus a switch on `dataset.dataset_type` closed with a `never`-check — the exact shape of the existing `GateDescriptor`/`evaluateGate`/`assertNeverGateKind` trio (model.ts:686-1070), applied to level comparison instead of gate dispatch.

**When to use:** Any function that needs to compare a *held* level/role against a *required* level/role for a specific dataset. This is the mechanism that makes DATA-03's "cross-type comparison is not representable at the type level" acceptance criterion true for the actual comparator functions (the caller-facing `requiredLevel: string` entry point is necessarily open — see Pitfall 1 below for why that's fine).

**Example:**
```typescript
// --- Phase 13: Dataset model & access resolver (v2.3) ---

export type DatasetType = "MAILBOX" | "ARCHIVE_ROLE" | "DOCUMENT_SITE";

// Three SEPARATE literal unions — never merged. Sharing the literal "READ" between
// MailboxLevel and DocumentSiteLevel is fine; what matters is that no function
// EVER holds a bare level value without also holding the dataset_type it belongs to.
export type MailboxLevel = "READ" | "SEND_AS" | "FULL_ACCESS";
export type DocumentSiteLevel = "READ" | "CONTRIBUTE" | "FULL_CONTROL";
export type ArchiveRole = "READER" | "CASE_HANDLER" | "ADMIN";

// Rank tables — ONE place per ranked type (mirrors PITFALLS.md Pitfall 1's fix).
// Array order low -> high; index = rank, same convention as the existing TIERS
// precedent (model.ts:32-36).
export const MAILBOX_LEVELS: readonly MailboxLevel[] = ["READ", "SEND_AS", "FULL_ACCESS"];
export const DOCUMENT_SITE_LEVELS: readonly DocumentSiteLevel[] = ["READ", "CONTRIBUTE", "FULL_CONTROL"];

// D-02, locked verbatim. Plain `Record<K,V>` annotation ALREADY forces every
// ArchiveRole key present — TypeScript errors on a missing key with no extra syntax.
export const ARCHIVE_ROLE_CONTAINS: Record<ArchiveRole, ArchiveRole[]> = {
  ADMIN: ["CASE_HANDLER", "READER"],
  CASE_HANDLER: ["READER"],
  READER: [],
};

// Transitive containment check — walks the descendant list so a FUTURE non-linear
// role (where a direct-children-only map wouldn't already be flattened) still
// resolves correctly. For the current 3-role linear chain this is equivalent to a
// direct membership check, but the walk is what actually implements "directly or
// transitively" per DATA-03's wording, not an accident of the current data shape.
export function archiveRoleCovers(held: ArchiveRole, required: ArchiveRole): boolean {
  if (held === required) return true;
  const stack: ArchiveRole[] = [...ARCHIVE_ROLE_CONTAINS[held]];
  const seen = new Set<ArchiveRole>();
  while (stack.length > 0) {
    const role = stack.pop()!;
    if (role === required) return true;
    if (seen.has(role)) continue;
    seen.add(role);
    stack.push(...ARCHIVE_ROLE_CONTAINS[role]);
  }
  return false;
}

// Compile-time exhaustiveness guard — IDENTICAL shape to assertNeverGateKind
// (model.ts:1032). If DatasetType ever grows a 4th member, every switch closed
// with this function fails to compile until a new case is added.
function assertNeverDatasetType(x: never): never {
  throw new Error(`Unhandled dataset type: ${String(x)}`);
}

// Runtime vocabulary check for an OPEN string coming from a grant or a caller
// parameter (DatasetAccessGrant.level / requiredLevel are typed `string`, exactly
// like the existing OrgLink.role precedent — they must stay open because a single
// array/parameter is used across all three dataset types).
export function isLevelInVocabulary(datasetType: DatasetType, level: string): boolean {
  switch (datasetType) {
    case "MAILBOX":
      return (MAILBOX_LEVELS as readonly string[]).includes(level);
    case "DOCUMENT_SITE":
      return (DOCUMENT_SITE_LEVELS as readonly string[]).includes(level);
    case "ARCHIVE_ROLE":
      return level in ARCHIVE_ROLE_CONTAINS;
    default:
      return assertNeverDatasetType(datasetType);
  }
}
```

**Trade-offs:** This is more code than one shared `LEVEL_RANK` map, but the extra ~15 lines is exactly what PITFALLS.md Pitfall 1 calls out as "never [acceptable to skip] — per-type ranks are ~10 extra lines." The `noFallthroughCasesInSwitch` and `strict` compiler flags (confirmed on in `tsconfig.app.json`) are what make the `never`-exhaustiveness guard actually bite — without `strict`, a bare `switch` without the `default: assertNever(...)` call would silently compile even with a missing case.

### Pattern 2: Two-mechanism gate 3 (rank-max vs. containment-union), dispatched once

**What:** `resolveDatasetAccess`'s gate 3 and the effective-level aggregation used by DATA-GRANT-03 are NOT one generic "highest wins" function — they are two genuinely different algorithms selected by a single `switch (dataset.dataset_type)`, matching PITFALLS.md Pitfall 2's finding that `ARCHIVE_ROLE` is role-shaped, not level-shaped (a decision already re-confirmed live in this phase's own discuss-phase — see D-02).

**Example:**
```typescript
// Ranked-type effective level: highest-ranked ACTIVE grant, or null if none.
// Shared by MAILBOX and DOCUMENT_SITE via the SAME function — they differ only
// in which levels array is passed, never in comparison logic.
export function effectiveRankedLevel(
  levels: readonly string[],
  activeGrantLevels: string[], // already filtered by isWindowActive(..., now) by the caller
): string | null {
  let best: string | null = null;
  let bestRank = -1;
  for (const level of activeGrantLevels) {
    const rank = levels.indexOf(level);
    if (rank > bestRank) {
      bestRank = rank;
      best = level;
    }
  }
  return best;
}

// ARCHIVE_ROLE effective coverage: containment-UNION across every active role
// grant, not a single "highest" role — a person holding CASE_HANDLER plus an
// unrelated future role has the coverage of BOTH (DATA-GRANT-03).
export function effectiveArchiveCoverage(activeGrantRoles: ArchiveRole[]): Set<ArchiveRole> {
  const covered = new Set<ArchiveRole>();
  for (const role of activeGrantRoles) {
    covered.add(role);
    for (const contained of ARCHIVE_ROLE_CONTAINS[role]) covered.add(contained);
  }
  return covered;
}
```

**When to use:** `resolveDatasetAccess`'s gate 3, and anywhere Phase 14/15 needs "what can this person currently do on this dataset" (e.g. the reverse-lookup selector) — Phase 14/15 should call these same functions rather than re-deriving aggregation logic (PITFALLS.md Pitfall 3's "every surface that answers 'does/can this person access' must go through the one resolver" applies to aggregation too).
**Trade-offs:** Two functions instead of one is more surface area, but a single function trying to handle both rank-max and containment-union would need a runtime branch anyway — separating them makes the branch a type-safe dispatch at the call site instead of an internal `if`.

### Pattern 3: Fail-closed on unrecognized level — two different failure classes

**What:** DATA-03's acceptance criteria specify two *different* fail-closed behaviors depending on WHO produced the bad value:

1. **Caller-supplied `requiredLevel` not in the dataset's vocabulary → THROW.** This is a programmer/config error (a test or a future selector asking `resolveDatasetAccess` "does this person have `CONTRIBUTE` on this `MAILBOX`?" — `CONTRIBUTE` isn't a `MailboxLevel`). Mirrors `effectiveClassification`'s existing fail-closed-throw pattern for a missing parent Platform (model.ts:862-867) — a clear seed/config integrity error, never a silent deny.
2. **Stored `DatasetAccessGrant.level` not in its dataset's vocabulary → DENY that grant (do not throw).** This is bad *data*, not a bad *call* — a single malformed fixture (Phase 14's seed, or a live-UAT-injected bad grant) must not crash the whole resolution for every other grant/dataset in the system. The grant is simply excluded from the "active, in-vocabulary" set that gate 3 and the aggregation functions consider.

```typescript
export function resolveDatasetAccess(
  subject: string,
  subjectClearance: Clearance,
  dataset: DatasetNode,
  applications: ApplicationNode[],
  platforms: PlatformNode[],
  appGrants: ResourceAccessGrant[],
  datasetGrants: DatasetAccessGrant[],
  requiredLevel: string,
  now: Date,
): DatasetAccessResult {
  // Fail closed on a CALLER error: requiredLevel must be a member of THIS
  // dataset's own vocabulary. Never silently deny — this is a config/test bug.
  if (!isLevelInVocabulary(dataset.dataset_type, requiredLevel)) {
    throw new Error(
      `resolveDatasetAccess: "${requiredLevel}" is not a valid level for dataset_type "${dataset.dataset_type}" (dataset "${dataset.id}")`,
    );
  }

  // Gate 2 first (visible depends ONLY on this — D-03/DATA-ACCESS-04), OR across
  // application_ids. Flat lookup per id, same semantics as
  // evaluateParentTierGrantGate — no ancestor walk, no recursive resolveResourceAccess.
  const appGrantPass = dataset.application_ids.some((appId) => {
    // Fail closed on a non-existent Application id (seed integrity error) —
    // mirrors effectiveClassification's throw-on-missing-platform pattern.
    const app = applications.find((a) => a.id === appId);
    if (!app) {
      throw new Error(
        `resolveDatasetAccess: application "${appId}" not found for dataset "${dataset.id}"`,
      );
    }
    return appGrants.some(
      (g) =>
        g.person_id === subject &&
        g.resource_id === appId &&
        isWindowActive(g.valid_from, g.valid_until, now),
    );
  });
  const visible = appGrantPass;

  // Gate 1: clearance vs. effective DATASET classification (never the app's raw
  // classification — Pitfall 5 precedent).
  const effectiveClass = effectiveDatasetClassification(dataset, applications, platforms);
  const clearancePass = CLEARANCE_RANK[subjectClearance] >= CLEARANCE_RANK[effectiveClass];

  // Gate 3: dispatched by dataset_type. Bad-vocabulary STORED grants are silently
  // excluded here (deny that grant, not a throw) — a data problem, not a call problem.
  const datasetGrantPass = evaluateDatasetGrantGate(dataset, subject, datasetGrants, requiredLevel, now);

  const gates: ResourceGateResult[] = [
    { kind: "CLEARANCE", pass: clearancePass, reason: clearancePass ? "CLEARANCE_OK" : "INSUFFICIENT_CLEARANCE" },
    { kind: "APP_GRANT_OR", pass: appGrantPass, reason: appGrantPass ? "APP_GRANT_FOUND" : "NO_APP_GRANT" },
    { kind: "DATASET_GRANT", pass: datasetGrantPass, reason: datasetGrantPass ? "DATASET_GRANT_FOUND" : "NO_DATASET_GRANT" },
    { kind: "VISIBILITY", pass: visible, reason: visible ? "VISIBLE" : "NOT_VISIBLE" }, // D-03: 4th trace row
  ];

  return {
    allow: clearancePass && appGrantPass && datasetGrantPass,
    visible, // D-03: ALSO a top-level field, same value as the VISIBILITY gate row
    gates,
  };
}
```

**Warning signs the planner should test for explicitly:** a `resolveDatasetAccess` call with a `requiredLevel` from the WRONG type's vocabulary must throw (not return `allow: false`); a seed/test fixture with a `DatasetAccessGrant.level` outside its own dataset's vocabulary must resolve to `allow: false` via gate 3 without throwing (the whole-array resolution must survive one bad grant).

### Anti-Patterns to Avoid

- **Sharing `"READ"` as a single type-level `AccessLevel` string union across all three dataset types:** PITFALLS.md Pitfall 1, restated at the type-design layer — a merged `type AccessLevel = "READ" | "SEND_AS" | "FULL_ACCESS" | "CONTRIBUTE" | "FULL_CONTROL" | "READER" | "CASE_HANDLER" | "ADMIN"` would let a `MAILBOX` grant's level compare against a `DOCUMENT_SITE` requirement and pass on the shared `"READ"` literal. Keep the three unions completely separate declarations.
- **A single global numeric rank map keyed by bare string:** e.g. `LEVEL_RANK: Record<string, number> = { READ: 0, SEND_AS: 1, ... }` — collapses `MAILBOX.READ` and `DOCUMENT_SITE.READ` onto the same rank entry and makes `ARCHIVE_ROLE` (which isn't rank-shaped at all) silently comparable too.
- **Branding/nominal-typing the level strings:** technically achieves the same unrepresentability as the discriminated-union approach, but has no precedent in this codebase (`OrgLink.role`, `GateDescriptor.kind` are both plain string unions), forces a cast at every seed/test fixture construction site, and is strictly more complexity for the same guarantee this phase already gets from Pattern 1. Reject per CLAUDE.md Rule 2 (simplicity first).
- **Recursively calling `resolveResourceAccess` for the parent Application inside gate 2** (instead of a flat grant lookup): re-introduces exactly the cross-tier-inheritance risk v2.2 explicitly blocked (Anti-Pattern 3 in `ARCHITECTURE.md`, T-09-06 precedent) — gate 2 checks "does an active grant exist on this Application id", not "would the person currently pass the full Application gate chain".
- **Computing `visible` from anything other than gate 2 alone:** DATA-ACCESS-04 is explicit — no `admin_org`/delegate exemption, no dependence on clearance or the dataset grant. A tempting shortcut ("show it if `allow` is true, or if they're an admin") silently reintroduces an exemption the requirement explicitly forbids.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Active-window checking for `DatasetAccessGrant`/`DatasetAccessDelegate` | A new "is this grant active" helper with its own `<`/`>` boundary convention | `isWindowActive` (model.ts:822, imported as-is) | Single shared helper for every window in the codebase (org_links, policy_assignments, v2.2 grants); a divergent convention is PITFALLS.md's #2 ground-truth fact and an explicit warning sign |
| Clearance-rank comparison | A new numeric map for dataset classification | `CLEARANCE_RANK` (model.ts:15, imported as-is) | Already the only ranked vocabulary precedent in the codebase pre-Phase-13; datasets reuse it directly via `effectiveDatasetClassification`, they don't reinvent it |
| Compile-time exhaustiveness over `DatasetType`/level unions | A custom runtime "did I forget a case" test or a manual list-audit | `switch` + `never`-closed `assertNeverDatasetType` (mirrors `assertNeverGateKind`, model.ts:1032) | The codebase already has this exact pattern proven; a hand-rolled runtime check is strictly weaker (only catches the miss at test-run time, not compile time) |
| Transitive containment walk for `ARCHIVE_ROLE` | A recursive-descent library or a graph package | The ~10-line `archiveRoleCovers` walk in Pattern 1 | The containment graph is a 3-node DAG at demo scale; a dependency here would violate the zero-new-npm-deps constraint for zero benefit |

**Key insight:** every "don't hand-roll" item above is actually "don't hand-roll something DIFFERENT from what's already in this file" — the risk in this phase isn't reaching for an external library (nobody would), it's silently drifting from `model.ts`'s own established conventions (a new window-check variant, a new rank convention, a runtime-only exhaustiveness check) because the three dataset types feel superficially like "a new small feature" rather than "an extension of an existing system with load-bearing precedent."

## Common Pitfalls

> The milestone-level `PITFALLS.md` (2026-07-03, HIGH confidence) already covers 9 pitfalls for this phase's domain in depth — Pitfall 1 (global level ordering), Pitfall 2 (ARCHIVE_ROLE superset assumption — already resolved by D-02's containment-map decision), Pitfall 3 (issue-time-only prereq), Pitfall 5 (classification-field-copy drift), Pitfall 8 (`Date.now()` vs. explorer-t), and Pitfall 9 (tier-union widening) are all directly relevant and are NOT re-derived here. The two pitfalls below are specific to the TypeScript type-design angle this research was asked to cover, sharpening PITFALLS.md Pitfall 1 into concrete implementation guidance.

### Pitfall A: Trusting a plain string-literal union to prevent cross-type comparison

**What goes wrong:** A developer defines `MailboxLevel = "READ" | "SEND_AS" | "FULL_ACCESS"` and `DocumentSiteLevel = "READ" | "CONTRIBUTE" | "FULL_CONTROL"` as two separate types (correct so far), then writes one generic comparator `function rankOf<T extends string>(levels: readonly T[], level: T): number`. Calling `rankOf(DOCUMENT_SITE_LEVELS, "READ")` where the `"READ"` literal has no declared type (e.g. it came from a plain `string` variable narrowed by an `if` check, or a grant's open `level: string` field cast with `as MailboxLevel` somewhere upstream) compiles fine — TypeScript's structural typing sees the bare literal `"READ"` as assignable to whichever `T` the first argument's array pins.

**Why it happens:** String-literal unions are structurally, not nominally, typed. `"READ"` typed as `MailboxLevel` and `"READ"` typed as `DocumentSiteLevel` are indistinguishable once a bare `"READ"` literal is separated from its originating type annotation (e.g. passed through a generic, or read off `DatasetAccessGrant.level: string` and cast).

**How to avoid:** Never write a comparator that takes a bare level string without the `dataset.dataset_type` in the same call. Every function that resolves a grant's level must receive (or immediately look up) `dataset_type` and switch on it BEFORE touching `.level` as a typed value — Pattern 1/3 above. The open string field (`DatasetAccessGrant.level: string`) is fine to keep open (matches `OrgLink.role` precedent) as long as nothing ever compares two `.level` values from different grants without checking they share a `dataset_id` (hence a shared `dataset_type`) first.

**Warning signs:** A generic `<T extends string>` comparator function anywhere in the new code; any function signature taking two bare `level: string` parameters without a `datasetType`/`dataset` parameter alongside them; an `as MailboxLevel`/`as ArchiveRole` cast anywhere outside a vocabulary-membership check.

### Pitfall B: Conflating "bad caller input" with "bad stored data" fail-closed behavior

**What goes wrong:** A single `isLevelInVocabulary` check is wired to always throw (or always silently deny), collapsing DATA-03's two distinct acceptance criteria into one behavior. If it always throws: one malformed seed fixture in Phase 14 (or a live-UAT-injected bad grant) crashes the entire resolver for every dataset, not just the offending grant — a much worse blast radius than "that one grant is ignored." If it always silently denies: a test asking `resolveDatasetAccess(..., requiredLevel: "CONTRIBUTE", ...)` against a `MAILBOX` dataset (a genuine test-authoring bug — `CONTRIBUTE` is a `DOCUMENT_SITE` level) returns a quiet `allow: false` that looks like a correct deny instead of surfacing the bug.

**Why it happens:** Both cases look identical at first glance ("a level string that isn't in the vocabulary") — the distinction (caller-supplied parameter vs. stored data) is only visible if the developer reads DATA-03's two acceptance-criteria bullets side by side, which is easy to skim past.

**How to avoid:** Two call sites, two behaviors, as coded in Pattern 3: the `requiredLevel` check at the top of `resolveDatasetAccess` throws; the per-grant vocabulary check inside gate 3's grant-filtering loop silently excludes that grant from consideration. Write one test for each: a throw-test with a mismatched `requiredLevel`, and a deny-without-throw test with a deliberately malformed grant fixture inline (D-01 pattern) alongside otherwise-valid grants, asserting the OTHER valid grants still resolve normally.

**Phase to address:** Phase 13 (both the resolver logic and its own test file, `dataset.test.ts`) — this cannot be retrofitted once Phase 14's seed data and Phase 15's UI start assuming one behavior or the other.

## Code Examples

### `DatasetNode` and grant/delegate shapes

```typescript
// Source: pattern derived from ApplicationNode (model.ts:744) + v2.1 dual-org
// fields (DATA-04) + classification-override precedent (PITFALLS.md Pitfall 5)
export interface DatasetNode {
  id: string;
  name: string;
  dataset_type: DatasetType;
  application_ids: string[]; // non-empty — enforced by a constructor/seed validator, not the type system
  classification_override: Clearance | null; // null = inherit; see effectiveDatasetClassification
  admin_org_id: string; // DATA-04: fixed field, NOT an org_links list
  asset_owner_org_id: string;
}

// DATA-GRANT-01/02. `level` stays an OPEN string (mirrors OrgLink.role) because a
// single DatasetAccessGrant[] array spans all three dataset types; validity
// against the owning dataset's vocabulary is a runtime check (isLevelInVocabulary),
// not a type-level constraint on this field.
export interface DatasetAccessGrant {
  id: string;
  person_id: string;
  dataset_id: string;
  level: string;
  valid_from: Date | null;
  valid_until: Date | null;
}

// DATA-DELEG-01. Mirrors ResourceAccessDelegate's shape but PERSON-only is
// recommended — see Open Questions for why an ORG variant is ambiguous here.
export interface DatasetAccessDelegate {
  id: string;
  dataset_id: string;
  delegate_person_id: string;
  granted_by_org_id: string; // must equal the dataset's admin_org_id at issue time (not re-checked at resolution)
  valid_from: Date | null;
  valid_until: Date | null;
}

export interface DatasetAccessResult {
  allow: boolean;
  visible: boolean; // D-03: top-level field, ALSO mirrored as a gates[] row
  gates: ResourceGateResult[]; // D-03: 4 entries — CLEARANCE, APP_GRANT_OR, DATASET_GRANT, VISIBILITY
  reason?: string;
}
```

### `effectiveDatasetClassification` (DATA-05)

```typescript
// Source: direct extension of effectiveClassification (model.ts:855), applying
// the "derive-with-override, never lower" rule from PITFALLS.md Pitfall 5.
// NOTE: SPEC.md simplifies to "the (single, since all linked Applications share
// one classification tier in practice) effective classification of the parent
// Application" — this assumes all of a dataset's linked Applications resolve to
// the SAME classification. See Open Questions for the un-tested divergent case.
export function effectiveDatasetClassification(
  dataset: DatasetNode,
  applications: ApplicationNode[],
  allPlatforms: PlatformNode[],
): Clearance {
  const firstAppId = dataset.application_ids[0];
  const app = applications.find((a) => a.id === firstAppId);
  if (!app) {
    throw new Error(
      `effectiveDatasetClassification: application "${firstAppId}" not found for dataset "${dataset.id}"`,
    );
  }
  const base = effectiveClassification(app, allPlatforms);
  if (dataset.classification_override === null) return base;
  // Fail closed at the VALIDATOR (seed-time), not silently clamped here — an
  // override strictly below base should never have been constructible. This
  // function still returns the override value; validateDatasetClassification
  // (a seed-validator, mirroring validatePolicyWindows's string|null contract)
  // is what rejects the bad fixture before it reaches here.
  return dataset.classification_override;
}

// Seed-integrity validator — returns an error string or null, never throws.
// Mirrors validatePolicyWindows's contract (model.ts:893).
export function validateDatasetClassification(
  dataset: DatasetNode,
  applications: ApplicationNode[],
  allPlatforms: PlatformNode[],
): string | null {
  if (dataset.classification_override === null) return null;
  const base = effectiveClassification(
    applications.find((a) => dataset.application_ids.includes(a.id))!,
    allPlatforms,
  );
  if (CLEARANCE_RANK[dataset.classification_override] < CLEARANCE_RANK[base]) {
    return `dataset "${dataset.id}": classification_override "${dataset.classification_override}" is lower than derived base "${base}"`;
  }
  return null;
}
```

### `canIssueDatasetGrant` (DATA-DELEG-01)

```typescript
// Source: mirrors canIssueResourceGrant's two-path shape (model.ts:1163), adapted
// for DATA-04's fixed admin_org_id field (no time window on this field itself —
// unlike OrgLink, admin_org_id is not time-boxed) and the delegate cap (D-DELEG-01).
export function canIssueDatasetGrant(
  actorOrgId: string,
  actorPersonId: string,
  dataset: DatasetNode,
  requestedLevel: string,
  datasetGrants: DatasetAccessGrant[],
  delegates: DatasetAccessDelegate[],
  now: Date,
): boolean {
  // admin_org path: unrestricted, regardless of whether admin_org itself holds
  // a personal grant (DATA-DELEG-01 explicit: "the cap applies to delegates, not
  // to the org that originates the authority").
  if (actorOrgId === dataset.admin_org_id) return true;

  // Delegate path: must be an ACTIVE delegate for THIS exact dataset.
  const activeDelegate = delegates.find(
    (d) =>
      d.dataset_id === dataset.id &&
      d.delegate_person_id === actorPersonId &&
      isWindowActive(d.valid_from, d.valid_until, now),
  );
  if (!activeDelegate) return false;

  // The delegate's OWN active grant on this exact dataset — no personal grant
  // means "can issue nothing" (DATA-DELEG-01, no exceptions).
  const ownGrants = datasetGrants.filter(
    (g) =>
      g.dataset_id === dataset.id &&
      g.person_id === actorPersonId &&
      isWindowActive(g.valid_from, g.valid_until, now) &&
      isLevelInVocabulary(dataset.dataset_type, g.level),
  );
  if (ownGrants.length === 0) return false;

  // Cap: requestedLevel must be AT OR BELOW what the delegate's own grant(s) cover.
  if (dataset.dataset_type === "ARCHIVE_ROLE") {
    if (!isLevelInVocabulary("ARCHIVE_ROLE", requestedLevel)) return false;
    const coverage = effectiveArchiveCoverage(ownGrants.map((g) => g.level as ArchiveRole));
    return coverage.has(requestedLevel as ArchiveRole);
  }
  const levels = dataset.dataset_type === "MAILBOX" ? MAILBOX_LEVELS : DOCUMENT_SITE_LEVELS;
  if (!isLevelInVocabulary(dataset.dataset_type, requestedLevel)) return false;
  const ownBestRank = Math.max(...ownGrants.map((g) => levels.indexOf(g.level)));
  return levels.indexOf(requestedLevel) <= ownBestRank;
}
```

## State of the Art

| Old Approach (pre-`satisfies`, TS < 4.9) | Current Approach | When Changed | Impact |
|--------------------------------------------|-------------------|---------------|--------|
| `as const` + manual `Record<K,V>` type assertion to get both exhaustiveness and literal inference | `satisfies` operator | TypeScript 4.9 (Nov 2022) `[CITED: typescriptlang.org/docs/handbook/release-notes/typescript-4-9.html]` | Not needed for D-02's locked syntax (a plain `Record<ArchiveRole, ArchiveRole[]>` annotation already gives full exhaustiveness) — noted here only because the user's research brief explicitly asked about `satisfies`; it is a viable-but-unnecessary alternative for this specific table, not a required upgrade. |

**Not deprecated/outdated:** everything else in this research (discriminated unions, `switch` + `never` exhaustiveness, `Record<K,V>` exhaustiveness-by-missing-key) has been stable TypeScript behavior for many major versions and is already the codebase's own established idiom (`GateDescriptor`/`evaluateGate`/`assertNeverGateKind`) — there is no "old way this codebase used to do it" to contrast against; Phase 9 (v2.2) already used the current idiom.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `DatasetAccessDelegate` should be PERSON-only (dropping the `ORG` delegate-type variant that `ResourceAccessDelegate` has) | Code Examples (`DatasetAccessDelegate`), Open Questions | If the user actually wants ORG-type dataset delegates, the "delegate must hold their own active DatasetAccessGrant" cap (DATA-DELEG-01) needs a different mechanism for orgs, since `DatasetAccessGrant` is inherently person-scoped (DATA-GRANT-01: "links a **person** to a specific dataset"). Getting this wrong means either re-deriving the delegate shape mid-phase or shipping a cap that silently doesn't apply to org delegates. |
| A2 | `effectiveDatasetClassification` derives from `dataset.application_ids[0]` only (first linked Application), per SPEC.md's own parenthetical ("single, since all linked Applications share one classification tier in practice") | Code Examples (`effectiveDatasetClassification`) | If two linked Applications on the same dataset ever have DIFFERENT effective classifications (e.g. hosted on Platforms with different classification tiers), picking `[0]` arbitrarily under- or over-classifies the dataset. SPEC.md explicitly flags this as an assumption already, not a research finding — carried forward here, not newly introduced. |
| A3 | `admin_org_id` is a fixed, non-time-windowed field (no `valid_from`/`valid_until` on the admin relationship itself) — `canIssueDatasetGrant`'s admin-path check is a bare equality test, never an `isWindowActive` check | Code Examples (`canIssueDatasetGrant`), DATA-04 | DATA-04 says datasets "mirror the v2.1/v2.2 dual-org pattern" using fixed fields (not `org_links`) — v2.1/v2.2's own fixed dual-org fields (pre-`OrgLink`) were similarly non-windowed, so this reads as a correct precedent match, not a new assumption. Flagged anyway since a windowed admin relationship would change the function signature. |

## Open Questions

1. **Does `DatasetAccessDelegate` need an `ORG` delegate-type variant, mirroring `ResourceAccessDelegate`?**
   - What we know: `ResourceAccessDelegate` (v2.2) supports both `PERSON` and `ORG` delegate types. DATA-DELEG-01 says "`admin_org` can delegate... to a named person or org."
   - What's unclear: the delegate CAP mechanism ("must hold their own active DatasetAccessGrant") only makes sense for a `PERSON` delegate, since `DatasetAccessGrant` links a person, not an org, to a dataset. An `ORG`-type delegate has no natural "own grant" to check against.
   - Recommendation: default to `PERSON`-only for `DatasetAccessDelegate` in this phase (simplest reading consistent with the cap rule; A1 above), and surface this explicitly to the user/planner as a one-line confirmation rather than silently deciding — SPEC.md's own examples ("a delegate holding only CASE_HANDLER cannot issue an ADMIN grant to anyone, including themselves") are all phrased in terms of a person.

2. **What happens when a dataset's linked Applications have divergent effective classifications?**
   - What we know: SPEC.md assumes this doesn't happen in practice ("since all linked Applications share one classification tier in practice").
   - What's unclear: whether Phase 14's seed data will ever construct a multi-Application dataset where the Applications sit on Platforms of different classifications, and if so, whether the resolver should take the MAX (fail-safe: never under-classify) or the Application actually used to satisfy gate 2's OR.
   - Recommendation: Phase 13's implementation may safely take `application_ids[0]` (matches SPEC.md's stated assumption) as long as a seed-validator (mirroring `validateDatasetClassification` above) asserts all linked Applications DO share a classification, failing loud if a future seed ever violates the assumption — cheap insurance against Phase 14 silently breaking this invariant.

## Security Domain

> `security_enforcement` is absent from `.planning/config.json` (treated as enabled per protocol). `workflow.nyquist_validation` is explicitly `false` in config, so the Validation Architecture section above is intentionally omitted.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-------------------|
| V2 Authentication | No | Out of scope — this phase touches no login/session flow |
| V3 Session Management | No | Out of scope — pure functions, no session state |
| V4 Access Control | **Yes — this phase IS the access-control mechanism** | 3-gate ordered chain (`resolveDatasetAccess`), fail-closed on unknown vocabulary/missing Application, no cross-tier inheritance (flat grant lookups only), delegate-capped issuing authority (`canIssueDatasetGrant`) — never a data-driven/pluggable policy that could be misconfigured to bypass a gate |
| V5 Input Validation | Yes | `classification_override` validated ≥ parent at seed-time (`validateDatasetClassification`); `application_ids` non-empty validated at construction; grant `level` validated against its dataset's own vocabulary before being trusted by any comparator (`isLevelInVocabulary`) |
| V6 Cryptography | No | No crypto in this phase (credential signing, if any, belongs to the existing `Credential`/`AttrClaims` machinery elsewhere in `model.ts`, untouched) |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|----------------------|
| Delegate self- or other-escalation beyond their own held grant | Elevation of Privilege | `canIssueDatasetGrant`'s cap check — delegate path always compares `requestedLevel` against the delegate's OWN active grant coverage, never against the dataset's max level (DATA-DELEG-01, already a locked prohibition in `13-SPEC.md`) |
| Classification-override underflow (dataset appears less classified than its parent Application) | Tampering / Elevation of Privilege | `validateDatasetClassification` rejects any override strictly below the derived base at seed-integrity-check time; the clearance gate always reads the DATASET's effective classification, never the raw Application's (Pitfall 5 precedent) |
| Orphaned-but-live entitlement (Application grant expired, DatasetAccessGrant still nominally active) | Elevation of Privilege | Gate 2 (Application-grant OR-gate) is evaluated at resolution time `t`, inside the same gate chain as gate 3 — not checked only at grant-issue time (DATA-ACCESS-01/03, PITFALLS.md Pitfall 3) |
| Cross-type vocabulary confusion (a grant's level compared against the wrong dataset type's rank/containment table) | Tampering | `isLevelInVocabulary` gate before any comparator touches a level value; malformed stored grants are excluded (denied), not trusted (Pitfall A/B above) |
| Silent `admin_org`/delegate exemption from the visibility or content-access gates | Elevation of Privilege | DATA-ACCESS-04 explicit: no exemption for `admin_org` or delegates on `visible`; `admin_org`'s own content access still goes through the full 3-gate resolver (SPEC.md Acceptance Criteria row 16) — `canIssueDatasetGrant`'s unrestricted ISSUING authority must never be read as unrestricted ACCESS |

## Sources

### Primary (HIGH confidence)
- `frontend/src/demo/lib/model.ts` (full read of lines 1-30, 640-960, 960-1183) — `CLEARANCE_RANK`, `ResourceTier`, `ApplicationNode`, `OrgLink`, `GateDescriptor`/`evaluateGate`/`assertNeverGateKind`, `isWindowActive`, `effectiveClassification`, `validatePolicyWindows`, `ResourceAccessGrant`/`ResourceAccessDelegate`, `resolveResourceAccess`, `canIssueResourceGrant` — read directly this session
- `frontend/src/demo/lib/digital-resource.test.ts` (full read) — confirms the "D3-13" inline-fixtures convention, exactly-named pitfall-test pattern, fixed-`NOW`-plus-named-boundary-constants convention
- `.planning/phases/13-dataset-model-access-resolver/13-SPEC.md`, `13-CONTEXT.md` — locked requirements, decisions (D-01/D-02/D-03), acceptance criteria
- `.planning/REQUIREMENTS.md`, `.planning/STATE.md` — DATA-* requirement text, resolved-decisions table, milestone status
- `.planning/research/ARCHITECTURE.md`, `.planning/research/PITFALLS.md` (2026-07-03, HIGH confidence, produced by prior research pass) — build order, all 9 milestone-level pitfalls, anti-patterns; this document builds on top of these, does not re-derive them
- `frontend/tsconfig.app.json`, `frontend/package.json` — `strict: true`, `noFallthroughCasesInSwitch: true`, `typescript: ~5.9.3`, `vitest: ^4.0.3`, confirmed live via `npx tsc --version` (`Version 5.9.3`)

### Secondary (MEDIUM confidence)
- [TypeScript 4.9 Release Notes — the `satisfies` operator](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-9.html) `[CITED]` — confirmed `satisfies` preserves literal inference while validating shape; used to support the "D-02's plain annotation is already sufficient" finding, not to recommend a change

### Tertiary (LOW confidence)
- General web search results on discriminated unions / exhaustiveness checking (dev.to, Medium, oneuptime.com aggregator posts) — used only to confirm this is the standard, widely-documented idiom (not a novel invention of this research), not as a source of any specific claim in this document. All concrete claims trace to the Primary sources above.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero new dependencies, versions confirmed live against the installed toolchain
- Architecture: HIGH — direct extension of an already-HIGH-confidence milestone `ARCHITECTURE.md`, cross-checked against the actual `model.ts` source
- Type-design patterns (the specific ask): HIGH for the discriminated-union/switch/never idiom (directly precedented in `model.ts`), MEDIUM for the `satisfies`-operator framing (confirmed against official docs but not previously used in this codebase)
- Pitfalls: HIGH — both new pitfalls (A, B) are directly derived from re-reading DATA-03's two acceptance-criteria bullets side by side against the actual function signatures being designed, not speculative

**Research date:** 2026-07-04
**Valid until:** 30 days (stable TypeScript-language-feature research; no fast-moving external dependency)
