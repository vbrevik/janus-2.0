# Phase 12: Demo UI, Loader & Tab Integration - Context

**Gathered:** 2026-07-02
**Status:** Ready for planning

<domain>
## Phase Boundary

The demo's "Digital Resources" tab (7th tab, no route file) loads digital-resource data from the Phase 11 API into `WorldState` at mount via a hybrid loader, then lets a user browse the Network→Platform→Application hierarchy, resolve access for the current identity at any evaluation timestamp, toggle grants, and issue new grants/delegates through the backend. First task: apply the already-committed seed migration to the drifted `janus2` dev DB (currently empty) so everything else has data to render against.

**Note:** This discussion round asked 3 implementation-rigor questions (test coverage scope, seed-apply mechanism, verification method) but received no user response within the session window. Per workflow guidance, proceeded on best judgment — see `<decisions>` § Claude's Discretion below. These are NOT locked user preferences; the planner/executor may deviate if a better-grounded reason surfaces during research or planning.

</domain>

<spec_lock>
## Requirements (locked via SPEC.md)

**7 requirements are locked.** See `12-SPEC.md` for full requirements, boundaries, and acceptance criteria.

Downstream agents MUST read `12-SPEC.md` before planning or implementing. Requirements are not duplicated here.

**In scope (from SPEC.md):**
- Applying the committed digital-resource seed migration to `janus2` (first task — everything else renders against it)
- Hybrid loader populating `WorldState.digitalResources` from the Phase 11 API at mount (React Query hooks; main-app token reuse; snake_case→camelCase mapping)
- `DigitalResourcesPanel`: Resource Browser (tree + detail) + Access Resolution Explorer (identity/resource/timestamp + trace) + grant toggle + grant/delegate issuing forms (role-gated)
- "Digital Resources" tab wired into `DemoRoot` with no route-file changes

**Out of scope (from SPEC.md):**
- Any backend change — endpoints, guards, migrations beyond applying the already-committed seed; especially NO relaxation of AuthGuard/RBAC/CORS
- Editing/creating policies, org-links, resources, or the hierarchy — only grant toggle + grant/delegate issuing are mutations
- New TanStack route files — tab-only; `routeTree.gen.ts` must stay byte-identical
- Org-based issuing authority (SEED-012) — UI mirrors the server's role-based Option B model
- A demo-local login flow — token comes from the main app; absent token is an explicit error state, not a login form

**UI design contract:** `12-UI-SPEC.md` is approved (6/6 dimensions, 2026-07-02) and governs every visual/copy/interaction detail — spacing, typography, color tokens, exact copy strings, component names, loader state machine, role-gating placement. Downstream agents treat it as equally locked as SPEC.md.

</spec_lock>

<decisions>
## Implementation Decisions

No user-adjudicated decisions this round (question unanswered — see domain note). The 3 questions posed, with the default judgment applied, are recorded under Claude's Discretion so the planner knows these are open to revisit, not locked.

### Claude's Discretion

- **Test coverage for new UI code:** Precedent is split — `demo/lib/` and `demo/store/` carry heavy Vitest coverage; `demo/components/` has zero `.test.tsx` files (no prior component-test pattern to match either way). Default: unit-test the loader hook's pure logic (envelope unwrap, snake_case→camelCase mapping, the four loader-state classification rules) since that mirrors the existing lib-level testing discipline and is cheap/high-value; do NOT add component-render tests for `DigitalResourcesPanel`/`ResourceBrowser`/`ResourceAccessExplorer` (no existing pattern, disproportionate for a demo island whose acceptance criteria are UI-behavioral anyway — see next point). Planner may revise if research finds a cheap way to cover the interactive criteria (toggle round-trip, timestamp-boundary trace change) with logic-only tests.
- **Seed-apply mechanism (R7):** Default to a small checked-in idempotent script (e.g. `backend/scripts/apply-digital-resource-seed.sh` or similar, following whatever pattern the researcher finds for the existing `20260601120200_seed_enduser_official_users.sql` psql-apply path) rather than a one-off manual command — makes the SPEC's "re-running the apply step is a no-op" acceptance criterion trivially re-runnable by anyone (including CI/future devs), for near-zero extra cost over a manual command.
- **Verification method:** Default to including a live walkthrough against the running dev stack (backend :15520 + frontend :15510 + seeded `janus2`) for the stateful acceptance criteria that don't reduce to a pure-function assertion — toggle round-trip, timestamp-boundary policy-shift, issuing flow (success + 403 + duplicate-submit silence), role-gated affordance visibility. This matches the project's established `/gsd-verify-work` conversational-UAT convention (Phase 11 closed UAT 8/8 the same way). Loader error states (missing-token/401/unreachable/empty) are also best confirmed live since they depend on real auth/network conditions.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase requirements & design contract
- `.planning/phases/12-demo-ui-tab-integration/12-SPEC.md` — 7 locked requirements, boundaries, acceptance criteria, prohibitions, edge coverage. MUST read before planning.
- `.planning/phases/12-demo-ui-tab-integration/12-UI-SPEC.md` — Approved UI design contract (6/6). Governs spacing/typography/color/copy/component names/interaction contracts/loader state machine/role-gating. MUST read before planning — treat as co-equal with SPEC.md.
- `.planning/ROADMAP.md` §"Phase 12: Demo UI, Loader & Tab Integration" — goal + success criteria
- `.planning/REQUIREMENTS.md` §"Digital Resource UI (RSRC-UI)" — requirement text + traceability

### Prior-phase context (backend this phase consumes)
- `.planning/phases/11-digital-resource-backend/11-CONTEXT.md` — Phase 11 decisions (API shape D-07/D-08/D-09, `GET /api/digital-resources/world` aggregate endpoint, `ApiResponse<T>` envelope, AuthGuard on every endpoint)
- `.planning/phases/11-digital-resource-backend/11-SPEC.md` — as-built backend contract (endpoint list, snake_case field names, SEC-01..04 hardening)
- `.planning/phases/10-mock-dataset-worldstate/10-CONTEXT.md` — `DigitalResourceWorld` shape (D-01: flat arrays mirroring seed.ts), `TOGGLE_RESOURCE_GRANT`/`disabledResourceGrantIds` (D-06), selector module `digital-resource-selectors.ts` (D-04/D-05)
- `.planning/phases/09-digital-resource-model-policy-engine/09-CONTEXT.md` — gate descriptor shape (D-01/D-02), fail-closed `NO_ACTIVE_POLICY` DENY (D-03), the resolver/type source of truth this phase's Rust port must match

### Frontend source of truth (types, selectors, model)
- `frontend/src/demo/lib/model.ts` — `resolveResourceAccess`, `canIssueResourceGrant`, gate evaluators, `ResourceAccessResult`/`ResourceGateResult` shapes, `CLEARANCE_TONE`
- `frontend/src/demo/lib/digital-resource-selectors.ts` — `buildResourceTree`, `activeGrantsForResource`, `resolveResourceAt` (existing pure selectors to reuse, not reimplement)
- `frontend/src/demo/store/world-state.tsx` — `WorldState`, `DigitalResourceWorld`, `TOGGLE_RESOURCE_GRANT` reducer action, `seedWorld()` (no longer hardcodes digital-resource arrays per 11-03)
- `frontend/src/demo/DemoRoot.tsx` — tab shell (`ActiveView` union + button row + conditional render) to extend with the 7th tab
- `frontend/src/demo/components/ui.tsx` — `Card`, `Pill`, `Field`, `Select`, `MockTag` primitives (reuse, no new primitives per UI-SPEC)
- `frontend/src/demo/components/zone-browser.tsx` — closest analog for the Resource Browser tree pattern
- `frontend/src/demo/components/access-resolution-explorer.tsx` — closest analog for the Access Resolution Explorer + gate-chain trace pattern

### Auth/API conventions (main-app token reuse)
- `frontend/src/contexts/auth-context.tsx` — `User` interface (`role: string` field, line 7); localStorage keys `"token"` and `"user"` (JSON) — this is what the Phase 12 loader/role-gate reads
- `frontend/src/lib/api.ts` — `ApiError` class (`.status: number`, line 5-12); `apiFetch` reads `localStorage.getItem('token')` (line 23-24) — same convention the demo loader must follow
- `CLAUDE.md` §Gotchas — API prefix (`/api/...`), route double-prefix, empty `SelectItem` crash, clearance levels enum

### Project memory
- Memory `project_migrations_fresh_db_broken` — `sqlx migrate run` broken on drifted `janus2`; the direct-psql seed-apply path this phase's R7 must follow

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `digital-resource-selectors.ts` (Phase 10) — tree/active-grants/resolve-at-timestamp selectors, ready to wrap in hooks
- `model.ts` resolver + `canIssueResourceGrant` (Phase 9) — TS source of truth the Rust backend already ported; frontend can still call the TS version for local trace rendering if useful, or rely purely on selector output
- `zone-browser.tsx` / `access-resolution-explorer.tsx` — direct structural analogs (tree + detail panel; identity/resource/timestamp + gate-chain trace) for the two new components
- `ApiError{status}` + `apiFetch` (`lib/api.ts`) — existing error-shape convention the loader's 401-vs-other-error branching must key off
- `User.role: string` (`auth-context.tsx`) — the field the role-gate check (admin/manager) reads from the stored `"user"` localStorage JSON

### Established Patterns
- No service layer on the frontend for demo data — React Query hooks call selectors/APIs directly, matching `src/hooks/use-*.ts` conventions in the main app
- Inline errors render `bg-destructive/10 text-destructive`, never toasts — same pattern this phase's 4 loader states and inline 403s must use
- Demo island isolation: `frontend/src/demo/` never touches `routeTree.gen.ts`; separate Vite entry (`src/demo/main.tsx`)
- `demo/components/` currently has zero unit tests; `demo/lib/` and `demo/store/` are heavily unit-tested — asymmetry noted above under Claude's Discretion

### Integration Points
- New 7th button + `"digital-resources"` `ActiveView` variant in `DemoRoot.tsx`
- New `demo/hooks/` (or co-located) React Query hook(s) for `GET /api/digital-resources/world` + the two issue POSTs
- New seed-apply script/step against `janus2` (R7) — must run before the loader has anything to fetch
- `WorldState` dispatch: loader populates `digitalResources` on fetch success; issue-form mutations upsert-by-id into `grants`/`delegates` on success (never blind-append, per UI-SPEC duplicate-submit contract)

</code_context>

<specifics>
## Specific Ideas

- Nothing beyond what SPEC.md/UI-SPEC.md already lock — no additional "I want it like X" references surfaced (question round went unanswered).

</specifics>

<deferred>
## Deferred Ideas

- Org-based issuing authority (SEED-012) — explicitly deferred per SPEC.md; UI mirrors the server's role-based Option B model only.
- Component-level render tests for the three new UI components — deferred per Claude's Discretion above unless planner finds a low-cost way to cover the interactive acceptance criteria without them.

None else — discussion stayed within phase scope (the 3 questions posed were implementation-rigor calls within the phase, not new capabilities).

</deferred>

---

*Phase: 12-demo-ui-tab-integration*
*Context gathered: 2026-07-02*
