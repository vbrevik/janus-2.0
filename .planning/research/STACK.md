# Stack Research

**Domain:** Dataset-level authorization (innermost access layer) — TypeScript in-memory demo extension for Janus 2.0 v2.3
**Researched:** 2026-07-03
**Confidence:** HIGH (verdict grounded in direct codebase inspection; no external sources needed — no new library is proposed)

---

## Verdict: Zero stack additions needed

v2.3 is a pure extension of the v2.1/v2.2 pattern that already exists in `frontend/src/demo/`.
Every new capability (Dataset model, per-type access-level vocabularies, prerequisite gate chain,
time-limited grants with highest-active resolution, admin/asset-owner orgs + delegation, mock
seed, demo UI) maps 1:1 to a mechanism the demo already implements twice with the current
dependencies. **Do not run `npm install` for this milestone.**

Verified against the codebase (2026-07-03):

| New v2.3 capability | Existing mechanism it reuses | Where it lives today |
|---------------------|------------------------------|----------------------|
| `Dataset` model + `dataset_type` | Plain TS interfaces + string-literal unions (same as `ApplicationNode`, `ZoneNode`) | `frontend/src/demo/lib/model.ts` (1,183 lines; all v2.1/v2.2 types + resolvers) |
| Per-type access-level vocabularies (MAILBOX/ARCHIVE_ROLE/DOCUMENT_SITE) | String-literal unions / discriminated unions — exhaustiveness checking for free | `model.ts` pattern (e.g. `ZoneAccessGate`, gate-kind unions) |
| Gate-chain resolution: clearance → app grant → dataset grant (DATA-ACCESS-03) | `resolveResourceAccess()` gate-loop dispatcher — pure function, explainable trace, fails closed on unknown gate kinds | `model.ts:1084` |
| Time-limited `DatasetAccessGrant`; effective level = highest active (DATA-GRANT-01..03) | `isGrantActive(grant, now)` point-in-time check + `resolveGrant()`; "highest active" is a trivial pure reduction over active grants | `model.ts:232`, `model.ts:243` |
| Admin/asset-owner orgs + delegation (DATA-04, DATA-DELEG-01) | `ZoneAccessDelegate` / `ResourceAccessDelegate` + `isDelegateActive()` — third instantiation of a twice-proven pattern | `model.ts:219`, `model.ts:315` |
| Mock dataset (DATA-SEED-01..05) | Seed-data module | `frontend/src/demo/lib/seed.ts` (51.6K — extend, don't replace) |
| Derived views: tree + reverse lookup "who has access at what level" (DATA-UI-03) | Pure selector functions | `frontend/src/demo/lib/digital-resource-selectors.ts` (`buildResourceTree`, `activeGrantsForResource`, `resolveResourceAt`) — add a sibling `dataset-selectors.ts` |
| Demo UI: datasets in Resource Browser + extended Access Resolution Explorer (DATA-UI-01..02) | Existing demo panels + hand-rolled `ui.tsx` primitives (`Card`, `Pill`, `Field`, `Select`, `MockTag`) | `frontend/src/demo/components/resource-browser.tsx`, `resource-access-explorer.tsx`, `ui.tsx` |
| Demo state | React context + reducer world-state store (`useWorldDispatch`) | `frontend/src/demo/store/world-state.tsx` |
| Tests | Vitest unit tests; one blocking test per acceptance criterion; exactly-named pitfall tests | `digital-resource.test.ts` (40K) is the template to mirror |

---

## Current Stack (already installed — versions from `frontend/package.json`)

### Core Technologies

| Technology | Version | Purpose | Why it suffices for v2.3 |
|------------|---------|---------|--------------------------|
| TypeScript | ~5.9.3 | Types + pure resolver logic | Discriminated unions model per-type access-level vocabularies natively; the entire authorization model is types + pure functions |
| React | ^19.1.1 | Demo UI | Dataset browser/explorer extensions are new panels in the existing 7-tab shell (`DemoRoot.tsx`) |
| Vite | ^7.1.7 | Build; demo is a separate entry (`demo/main.tsx` / `demo.html`) | Demo-island isolation constraint already satisfied; no config change |
| Tailwind CSS | ^3.4.17 | All layout and color | Reuse the existing demo tone system; no new UI primitives needed |
| Vitest | ^4.0.3 (dev) | Unit tests for resolver + selectors | Same jsdom environment and inline-fixture pattern as `digital-resource.test.ts` |

### Supporting Libraries (already present, use as-is)

| Library | Version | Role in v2.3 |
|---------|---------|--------------|
| @tanstack/react-query | ^5.90.5 | ONLY as the existing source of v2.2 Application-grant data (see integration seam below); dataset data itself is in-memory, never queried |
| clsx + tailwind-merge | ^2.1.1 / ^3.3.1 | Conditional class composition — same usage as existing demo components |
| lucide-react | ^0.548.0 | Optional dataset-type glyphs (mailbox/archive/file icons) — zero cost, already installed |
| zod | ^4.1.12 | Optional: seed-shape validation in tests; not required |

---

## Installation

```bash
# Nothing. Zero new packages for v2.3.
```

---

## The One Real Integration Seam (flag for architecture/planning)

**v2.2 digital-resource data is API-backed; v2.3 dataset data is in-memory. The DATA-ACCESS-01
prerequisite check must join across that boundary.**

Since Phase 11, `frontend/src/demo/hooks/use-digital-resources.ts` fetches the Network/Platform/
Application world **and ResourceAccessGrants from the backend** (`/api/digital-resources/world`
via React Query, `retry: false`, explicitly **no seedWorld() fallback** — the file's own header
comment says so). But DATA-ACCESS-01 makes an *active Application grant* a hard prerequisite for
any dataset grant, and v2.3 is demo-only (no backend work permitted).

Consequence: the dataset gate-chain resolver must take the Application-grant list as a
**parameter** (pure function, same style as `resolveResourceAccess`), and the caller wires in
grants that came from the API-backed hook. Options for planning to weigh:

1. **Recommended:** keep the resolver pure — `resolveDatasetAccess(person, dataset, appGrants, datasetGrants, now)` — and let the UI layer pass API-fetched Application grants + in-memory dataset grants/seed. No stack change; matches the proven pattern; a future Rust port via golden fixtures stays trivial.
2. Alternative: seed mock Application grants alongside datasets so the dataset tab works fully offline. Simpler demo, but diverges from the v2.2 "Postgres as source of truth" decision — needs an explicit decision record if chosen.

Also note: Applications live in the API payload while Datasets live in seed data, so dataset
records reference parent Applications **by id string**; the seed must use ids that exist in the
Postgres fixture set (or the mapper must tolerate orphans and fail closed). Either way this is an
architecture/plan decision, **not** a stack addition.

---

## Alternatives Considered

| Recommended | Alternative | When the alternative would make sense |
|-------------|-------------|----------------------------------------|
| Extend `model.ts` + sibling `dataset-selectors.ts` | New standalone `dataset/` sub-package inside demo | Only if `model.ts` (1,183 lines) is judged too large — a `dataset.ts` sibling module in `demo/lib/` is fine; a new package/aliasing setup is not |
| Discriminated union for the 3 dataset types | Data-driven type registry (`Record<string, string[]>`) | If the open question "dataset_type: open vs closed" resolves to OPEN — mirrors v2.2's open gate/role vocab; still zero dependencies |
| Highest-active-grant as a pure reduction | A ranking/lattice library | Never — 3 ordered levels per type is a `levelRank` map + `Math.max`, exactly like `CLEARANCE_RANK` |
| Reuse `ui.tsx` primitives | Pull shadcn/Radix components into demo | Never for the demo island — shadcn depends on main-app CSS tokens; the demo deliberately uses its own `ui.tsx` primitives (established v2.1/v2.2 rule) |

---

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| State libraries (zustand, jotai, redux) | `world-state.tsx` context+reducer store already handles demo state across 7 tabs; a second store fragments state and violates the "no new frameworks" constraint | Extend `store/world-state.tsx` (new fields + `TOGGLE_*` action, same immutable-Set pattern) |
| Date libraries (date-fns, dayjs, luxon) | All temporal logic is `valid_from`/`valid_until` interval checks against `now: Date` — `isGrantActive` already does this with native `Date` | Native `Date` comparisons, same as v2.1/v2.2 |
| Access-control libraries (casl, casbin, oso, permit.io) | The hand-built explainable pure-computed ABAC engine **is the artifact being demonstrated** (and has byte-exact Rust parity); a library replaces the point of the project | `model.ts` resolver pattern |
| Backend / sqlx / migration work | Explicitly out of scope for v2.3 ("demo/mock only — backend defers"); Phase 11's scope expansion was the exception, not the rule | In-memory seed + pure resolvers |
| shadcn/Radix inside `demo/components/` | Couples the demo island to main-app CSS variable tokens; breaks the extraction-friendly isolation held since v2.0 | `demo/components/ui.tsx` primitives |
| Tree/table/graph libraries (react-arborist, react-flow, d3) | The dataset list nests one level under Applications in an already-working recursive tree; the trace is a gate list (`ul`), not a graph | Extend `buildResourceTree` / the existing browser + trace components |
| Storing computed resolution results in `WorldState` | Derived data in state causes stale-result bugs (documented pitfall from v2.1 spikes) | `useMemo` in the component, same as existing explorers |

---

## Stack Patterns by Variant

**If "dataset_type: open enum vs closed set" resolves to OPEN:**
- Model access-level vocabularies as data (a registry mapping type → ordered level list), mirroring v2.2's open gate/role vocab decision.
- The resolver must fail closed on unknown types/levels — mirror the exactly-named `unknown-gate-kind-errors` pitfall-test pattern from `digital-resource.test.ts`.

**If it resolves to CLOSED:**
- TS discriminated union with `never` exhaustiveness checks. Cheapest and safest for 3 types.

**If a future milestone ports datasets to the backend (already listed under Future Requirements):**
- Keep `resolveDatasetAccess` pure and side-effect-free now so the TS→Rust golden-fixture parity approach (proven in Phase 11 via `digital-resource-golden-export.test.ts`) applies unchanged. That test file is the template for a future `dataset-golden-export.test.ts`.

---

## Version Compatibility

No dependency changes → no new compatibility surface; the existing lockfile is the compatibility
statement. Vitest 4 + jsdom 28 + Testing Library 16 + React 19 are already proven together by the
228-test suite; new dataset tests inherit that setup verbatim. New types import `Clearance`,
`CLEARANCE_RANK`, org/unit ids, and the Application types from `model.ts` — stable exports with
no external dependencies.

---

## Sources

- `frontend/package.json` — installed versions read directly — HIGH confidence
- `frontend/src/demo/lib/model.ts` — resolver/grant/delegate patterns at lines 232, 243, 315, 1084 — HIGH (direct inspection)
- `frontend/src/demo/lib/digital-resource-selectors.ts`, `digital-resource.test.ts`, `seed.ts` — selector/test/seed patterns — HIGH (direct inspection)
- `frontend/src/demo/hooks/use-digital-resources.ts` — API-backed data source with no seed fallback — HIGH (direct inspection; this is the integration-seam evidence)
- `.planning/PROJECT.md`, `.planning/milestones/v2.3-REQUIREMENTS.md` — scope and constraints — HIGH
- Prior v2.2 STACK research (2026-06-02, superseded by this file) — demo-island UI rules (`ui.tsx` not shadcn; no derived data in state) carried forward — HIGH
- No external/web/Context7 sources: no new library is proposed, so no version research applies (quality gate satisfied vacuously)

---

*Stack research for: Janus 2.0 v2.3 Dataset Access (demo)*
*Researched: 2026-07-03*
