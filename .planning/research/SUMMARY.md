# Project Research Summary

**Project:** Janus 2.0 — v2.3 Dataset Access (demo)
**Domain:** Dataset-level (entitlement) authorization — the innermost layer of a tiered Network→Platform→Application ABAC demo
**Researched:** 2026-07-03
**Confidence:** HIGH

## Executive Summary

v2.3 adds a fourth, innermost authorization layer — Dataset (mailboxes, archive roles, document sites) nested inside existing v2.2 Applications — to the TypeScript-only demo in frontend/src/demo/. This is a pure extension of a pattern the codebase has proven twice (zones in v2.1, digital resources in v2.2): typed models + pure resolver functions + a React context/reducer world-state store + hand-rolled UI primitives. No new dependencies are needed and none should be added.

The recommended approach is strict composition, not extension: build a standalone resolveDatasetAccess (3-gate chain: clearance → active Application grant (hard) → active dataset grant at required level) that reuses v2.2 primitives but never modifies the frozen v2.2 ResourceTier union or resolveResourceAccess (byte-exact TS↔Rust golden-fixture parity contract). Real-world research (Exchange, SharePoint, Noark 5, Microsoft Entra) validates most requirements but flags one deliberate simplification: real Exchange permissions are orthogonal, not a ladder, so the demo's total-ordered vocabulary must be a recorded decision.

Key risks: (1) a single global level-rank comparator letting incompatible per-type vocabularies compare against each other; (2) checking the Application-grant prerequisite only at issue time instead of resolution time, producing orphaned-but-live dataset access; (3) shipping trace/UI rows wired to no real data (v2.2's zone-advisory row did exactly this, caught only in live UAT). All three are addressed by writing the resolver first with exhaustive tests, and requiring a seed deny-matrix exercising every gate as the deciding gate before UI work begins.

## Key Findings

### Recommended Stack

Zero stack additions. Existing versions already installed: TypeScript ~5.9.3, React ^19.1.1, Vite ^7.1.7, Tailwind ^3.4.17, Vitest ^4.0.3, @tanstack/react-query ^5.90.5, clsx/tailwind-merge, lucide-react, zod (optional). No npm install needed.

**Core technologies (reused, not added):**
- TypeScript discriminated unions — model per-type access-level vocabularies with exhaustiveness checking
- React context/reducer (world-state.tsx) — extend with a local datasets sub-object
- Vitest + existing fixture/test patterns — mirror digital-resource.test.ts

**Explicitly rejected additions:** state libraries (zustand/jotai/redux), date libraries, access-control libraries (casl/casbin/oso), shadcn/Radix inside the demo island, tree/graph libraries, backend/sqlx work.

### Expected Features

**Must have (table stakes):**
- Dataset entity (MAILBOX/ARCHIVE_ROLE/DOCUMENT_SITE) nested under one Application (DATA-01/02)
- Per-type ranked level vocabulary (DATA-03)
- Hard prerequisite: active Application grant, evaluated at resolution time (DATA-ACCESS-01)
- Time-windowed DatasetAccessGrant, multiple concurrent grants, effective level = highest active (DATA-GRANT-01..03)
- Classification inherit-unless-overridden-equal-or-higher (DATA-05)
- admin_org/asset_owner_org + delegation mirroring v2.1/v2.2 (DATA-04, DATA-DELEG-01)
- Full gate-chain trace, deny-case seed scenarios, reverse lookup (dataset → who has access at what level)

**Should have (differentiators):** "why this level" trace with losing grants, four-layer chain in one trace, point-in-time dataset resolution, expiry-aware future effective level.

**Defer (v2+):** faithful Exchange orthogonal semantics, "Send on Behalf" level, content-level permissions, group/distribution-list grants, grant lifecycle workflows, Rust/Postgres backend, real connector integration.

### Architecture Approach

Datasets slot into the existing Digital Resources tab as a new UI section + explorer, backed by a locally-seeded DatasetWorld joined at selector time to the backend-fetched Application world by application_id. The dataset resolver is a standalone pure function, not a widened ResourceTier union member — it composes v2.2 primitives without touching frozen v2.2 code.

**Major components:**
1. lib/model.ts (extend, append-only) — DatasetType, rank tables, DatasetNode, grants/delegates, resolveDatasetAccess, effectiveDatasetClassification, canIssueDatasetGrant
2. lib/seed.ts (extend) + new lib/dataset-selectors.ts — fixtures FK'd to existing Application ids; selectors do the cross-source join
3. store/world-state.tsx (extend) — new datasets sub-object seeded locally, 3 new reducer actions
4. New components/dataset-access-explorer.tsx + extended resource-browser.tsx/digital-resources-panel.tsx — 3-gate trace UI, reverse-lookup view; DemoRoot stays untouched

Suggested build order: Phase 13 (model + pure engine) → Phase 14 (seed + world-state + selectors) → Phase 15 (demo UI, live UAT).

### Critical Pitfalls

1. **Single global level-rank comparator across incompatible per-type vocabularies** — define per-type ordered rank arrays; make cross-type comparison unrepresentable.
2. **Application-grant prerequisite checked only at issue time** — must be a gate evaluated at resolution time t; every surface (incl. reverse lookup) goes through the one resolver.
3. **Trace/UI rows wired to no real data** — require a seed deny-matrix where every gate is the deciding gate at least once, verified by live UAT criteria per gate.
4. **Classification override as a copied field instead of derive-with-override** — must be `classification_override: Clearance | null` with a validator rejecting lower-than-base overrides.
5. **Bolting Dataset into the ResourceTier union** — breaks the byte-exact TS↔Rust golden-fixture parity contract; must remain a standalone composed resolver; v2.2 suites must stay green.

## Implications for Roadmap

### Phase 1 (Phase 13): Dataset Model + Pure Resolver
**Rationale:** Zero UI/state dependencies; everything downstream needs the types and resolver. Also where the two open questions (ARCHIVE_ROLE superset validity, delegation level-bound) must be decided and recorded.
**Delivers:** DatasetType, rank tables, DatasetNode/Grant/Delegate, resolveDatasetAccess, effectiveDatasetClassification, canIssueDatasetGrant, exhaustive Vitest coverage.
**Addresses:** DATA-01..05, DATA-ACCESS-01..03, DATA-GRANT-01..03, DATA-DELEG-01
**Avoids:** Pitfalls 1, 2, 3, 5, 6, 8, 9

### Phase 2 (Phase 14): Seed + World State + Selectors
**Rationale:** Needs Phase 1's model/resolver; UI needs seeded data and selectors. Deny-matrix and app-expiry-crossover fixture belong here.
**Delivers:** DATASETS/DATASET_GRANTS/DELEGATES fixtures (all 5 DATA-SEED cases incl. 3 deny shapes + crossover), DatasetWorld sub-object + 3 reducer actions, dataset-selectors.ts.
**Uses:** Existing world-state.tsx reducer pattern, existing seed.ts builder-function pattern
**Implements:** Local mock data joined at selector time to backend-fetched Application data

### Phase 3 (Phase 15): Demo UI
**Rationale:** Depends on both prior phases; last since it's where all gates converge into one trace and where live-UAT verification happens.
**Delivers:** Resource Browser dataset section (DATA-UI-01), DatasetAccessExplorer with 3-gate trace + grant toggle (DATA-UI-02), reverse-lookup view (DATA-UI-03), issuing form gated by canIssueDatasetGrant.
**Addresses:** DATA-UI-01..03, differentiator features
**Avoids:** Pitfall 4 (dead trace rows) via per-gate live UAT; Pitfall 7 (delegation enforcement gap) via form gating tested with a non-admin persona

### Phase Ordering Rationale

- Strict model→seed→UI dependency chain — rank must exist before any resolution or reverse lookup.
- Delegation and classification-override are low-risk pattern reuse from v2.1/v2.2, folded into Phase 1/2.
- The two open decisions (ARCHIVE_ROLE superset semantics, delegation level-bound) need resolution in a discuss/spec step before Phase 13 planning locks in type design.
- v2.2 regression (golden-export + digital-resource suites green and untouched) is a standing success criterion across all three phases.

### Research Flags

- **Phase 13 (model):** No external research needed — patterns proven in-repo. Two decisions need explicit recording (ARCHIVE_ROLE superset validity; delegation level-bound) but these are project decisions, not research gaps.
- **Phase 15 (UI):** Re-read resource-access-explorer.tsx:52-106 (ResourceResolutionTrace) before building the dataset trace to reuse row-rendering style.
- **Phase 14 (seed/selectors):** Standard pattern, skip research-phase — mirrors digital-resource-selectors.ts and seed.ts conventions.

All three phases have well-documented in-repo precedent; none require `--research-phase` treatment during `/gsd-plan-phase`.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Direct package.json/codebase inspection; no external library proposed |
| Features | MEDIUM | Cross-checked against Microsoft Learn (Exchange/SharePoint/Entra) and Arkivverket/Noark 5 via web search; project-context requirements mapping is HIGH |
| Architecture | HIGH | Direct reads of model.ts, world-state.tsx, selectors, hooks, components with line-level citations |
| Pitfalls | HIGH for codebase-grounded items (model.ts, RETROSPECTIVE.md); MEDIUM/LOW for web-sourced industry-pattern pitfalls |

**Overall confidence:** HIGH

### Gaps to Address

- **ARCHIVE_ROLE superset validity:** requirements' own open question — whether ARCHIVE_ROLE levels form a true total-order superset or are role-shaped and shouldn't use highest-wins. Resolve and record as a Key Decision during `/gsd-discuss-phase` for Phase 13.
- **Delegation level-bound:** whether a delegate can issue up to the dataset's max level (Entra-style, recommended) or only up to their own level. Needs an explicit Key Decision, not silent inheritance of "mirrors v2.1/v2.2."
- **Dataset-spans-multiple-Applications question:** research recommends "no" (1 dataset : 1 application) — should be confirmed as a recorded decision.

## Sources

### Primary (HIGH confidence)
- frontend/package.json, frontend/src/demo/lib/model.ts, seed.ts, world-state.tsx, digital-resource-selectors.ts, digital-resource.test.ts, digital-resource-golden-export.test.ts, use-digital-resources.ts, resource-browser.tsx, resource-access-explorer.tsx, digital-resources-panel.tsx, DemoRoot.tsx — direct codebase inspection
- .planning/PROJECT.md, .planning/milestones/v2.3-REQUIREMENTS.md, .planning/RETROSPECTIVE.md — project scope and prior-milestone lessons

### Secondary (MEDIUM confidence)
- Microsoft Learn — Exchange Online mailbox permissions, SharePoint permission levels, Entra ID entitlement management
- Arkivverket — Noark 5 standard; Public 360 løsningsbeskrivelse
- Practical365 — Exchange shared mailbox permissions
- IGA/JIT-access and IDPro/AD-delegation literature on issue-time-vs-runtime validation and delegation pitfalls

### Tertiary (LOW confidence)
- General fine-grained-authorization framing (Oso, FusionAuth) — background only

---
*Research completed: 2026-07-03*
*Ready for roadmap: yes*
