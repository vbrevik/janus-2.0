# Milestones — Janus 2.0

## v2.2 Platform, Network & Application Access (Shipped: 2026-07-03)

**Phases completed:** 4 phases, 17 plans, 11 tasks

**Key accomplishments:**

- Appended a `// --- Phase 9: Digital Resource hierarchy model (v2.2) ---` section defining `ResourceTier`, `BaselineOrgRole`, `OrgLink`, `GateDescriptor` (open-edge parameterized union), `ResourcePolicy`, `PolicyAssignment`, `NetworkNode`/`PlatformNode` (with `classification`), `ApplicationNode` (no `classification`), `ResourceAccessGrant`, `ResourceAccessDelegate`, `ResourceGateResult`, `ResourceAccessResult`.
- Added a `// --- Phase 9 gate-dispatch engine (v2.2, Plan 02) ---` section with a `GateContext` extension-point interface and four pure evaluators returning `ResourceGateResult { kind, pass, reason }`:
- Header coverage comment, `vitest` + Phase 9 symbol imports from `./model`, a fixed `NOW` and SEED-06 `NOW_A`/`NOW_B`/`SHIFT_BOUNDARY` constants, then the grep-able mitigations:
- DigitalResourceWorld type with 9 fields, TOGGLE_RESOURCE_GRANT reducer action, and 6-unit dataset (6 networks, 4 platforms, 4 applications) with temporal grant variety, policy-shift preservation, and zone-prereq wiring.
- The broken backend migration chain now migrates a fresh DB end-to-end with zero errors, the 8 digital-resource tables exist on that clean baseline, and the live janus2 dev DB was rebuilt clean (Option C) so it is migration-tracked and carries the new domain.
- The TS gate-chain resolver is ported to a pure, deterministic Rust module that produces byte-equal allow / gate-set / policy-version output to the TS engine, proven by committed golden fixtures (TS exporter -> JSON -> Rust assertion) including the inclusive policy-window boundary and the no-policy NO_ACTIVE_POLICY fail-closed DENY.
- The digital-resource domain is exposed through an AuthGuard-protected aggregate read and two issue endpoints whose write authority is derived server-side from the authenticated principal's role — closing a confirmed IDOR where any authenticated user could issue grants by naming an ADMIN org in the request body. The paused Plan-03 DB-wiring (resolver DateTime migration) was completed to a green, byte-parity-preserving compile, and seedWorld() was de-hardcoded so the backend is the source of truth.
- Every non-login handler now requires a valid JWT, every write and the audit read additionally require a seeded per-role permission key (403, never 500, on refusal), the server refuses to start without a real JWT secret, and CORS is pinned to the single dev origin with credentials — all asserted by a 12-test integration suite running green against the live dev DB.
- Wrote `backend/scripts/apply-digital-resource-seed.sh`, a checked-in idempotent psql wrapper, and used it to seed the live `janus2` dev DB with the 6-unit digital-resource dataset (6 networks/4 platforms/4 applications/18 grants/18 org_links/3 policies/15 policy_assignments/1 delegate), verified live through the existing `GET /api/digital-resources/world` integration test.
- Built the pure data layer every later Phase 12 plan consumes: `mapWorldResponse` denormalizing the backend's flat `/world` response into per-node `DigitalResourceWorld`, three new world-state reducer actions, a `QueryClientProvider` in the demo Vite entry, and the `CLEARANCE_TONE` export — plus a blocking-deviation repair of 27 pre-existing tsc errors that had silently broken `npm run build` since phase 10.
- Built the React Query data layer 12-04/12-05/12-06 consume: `useDigitalResourcesWorld` (token-gated, retry-free, mapWorldResponse-backed), `useIssueGrant`/`useIssueDelegate` mutations that dispatch their mapped server response into WorldState via 12-02's upsert actions, and three unit-tested pure helpers (`hasStoredToken`, `getStoredUserRole`, `classifyLoaderState`) implementing 12-UI-SPEC's six-state loader machine and the admin-only role gate.
- Built the Resource Browser — a collapsible Network→Platform→Application tree beside a full resource detail panel (tier, Platform-inherited classification for Applications, org-links-by-role with active/expired badges, active policy window, active grants, delegates, Platform-only NSM annotation badges) — plus the D-01 admin-only Issue Delegate form that submits through 12-03's `useIssueDelegate` and reflects the new delegate via WorldState, never an optimistic local append.
- Built the Access Resolution Explorer — person/resource/datetime-local selectors driving a live `resolveResourceAt` gate-chain trace (verdict banner, always-shown policy-version row with the fail-closed no-policy copy, GATE_LABEL-mapped gate rows, and the mandatory amber non-blocking zone-advisory block) plus an interactive TOGGLE_RESOURCE_GRANT checkbox list — and the D-01 admin-only Issue Grant form that submits through 12-03's `useIssueGrant` and reflects the new grant via WorldState, never an optimistic local append.
- Built `DigitalResourcesPanel` — the fail-loud 6-state loader gate (missing-token / loading / unauthorized / error / empty / success, exact 12-UI-SPEC copy and classes, Retry only in the error state, zero seed-fallback paths) that fetches the `/world` aggregate token-gated, dispatches `SET_DIGITAL_RESOURCES` via `useEffect` on success, and hosts the Resource Browser / Access Resolution sub-nav — then wired it into `DemoRoot` as the 7th "Digital Resources" tab, making every Phase 12 artifact reachable with `routeTree.gen.ts` byte-identical.
- Fixed `resolveResourceAt` in `digital-resource-selectors.ts`, which hardcoded empty `allZones`/`allPhysicalGrants` arrays when calling the core `resolveResourceAccess` resolver — making the amber "Advisory (non-blocking)" zone-prerequisite row permanently dead code in the running Access Resolution Explorer despite passing all prior build/grep/JSX checks — by threading the live `WorldState.zones`/`WorldState.grants` fields through the selector and its sole caller, backed by a new dedicated regression suite and confirmed live in the running app.

---

## v2.1 Physical Access Zones (demo)

**Shipped:** 2026-05-23
**Phases:** 5–8 | **Plans:** 9 | **Track:** demo/mock (`frontend/src/demo/`)
**Timeline:** 2026-05-23 (1 day)

**Delivered:** An NSM-grounded physical-access model layered on the v2.0 demo — hierarchical named zones with three zone types, a 5-tier clearance ladder, time-windowed grants with zone-type-scoped inheritance and explicit-auth overrides, two-gate access resolution, admin-org delegation, escort-tracked entry logging, and visitor passes — exercised by a 6-unit mock dataset and three new demo views.

**Key Accomplishments:**

1. Zone model: hierarchy (SITE→ROOM) with CONTROLLED/RESTRICTED/SECURED types, dual org ownership, explicit-auth flag, and the SECURED-not-at-SITE/AREA ceiling rule (ZONE-01..05)
2. 5-tier clearance ladder + NSM-grounded access rules; escort never substitutes for SECURED clearance (ACCESS-01..05)
3. Time-windowed PhysicalAccessGrant with most-specific zone-type-scoped inheritance and explicit-auth short-circuit; two-gate resolution — grant lookup → zone-type rule (GRANT-01..04)
4. Admin-org delegation to a person or org via ZoneAccessDelegate (DELEG-01..03; `canIssueGrant()` enforcement deferred to UI)
5. ZoneEntryLog (CARD/ESCORT) with mandatory-for-SECURED logging + escort-tied ZoneVisitorPass query (LOG-01..03, VISIT-01..03)
6. 6-unit mock dataset + Zone Browser, Access Resolution Explorer (prose trace), and Entry Log views in a 6th demo tab (SEED-01..09, UI-01..06)

**Requirements:** 38/38 satisfied · 0 gaps · 1 deferred (`canIssueGrant()` enforcement → UI)

**Audit:** `.planning/milestones/v2.1-MILESTONE-AUDIT.md` (passed)

**Archive:**

- `.planning/milestones/v2.1-ROADMAP.md` — full phase details
- `.planning/milestones/v2.1-REQUIREMENTS.md` — requirements with outcomes

## v2.0 Authorization Hub (demo)

**Shipped:** 2026-05-22
**Phases:** 1–4 | **Plans:** 16 | **LOC:** ~4,779 TypeScript
**Timeline:** 2026-05-21 → 2026-05-22 (2 days)

**Delivered:** A fully interactive federated ABAC authorization-hub demo instantiating a 6-unit deployment scenario — every access decision computed live from attributes, explainable, and reconstructable from an append-only audit log; external integrations simulated.

**Key Accomplishments:**

1. Pure-computed ABAC engine — live ALLOW/DENY with per-rule traces, deny overrides, domain-independent tiers (MODEL, ENGINE, ROLE requirements)
2. Pointer-only discovery hub — entities discover who holds authorization info without exposing details; typed inter-entity exchange contract with full message transcript (FED-01, FED-02)
3. Signed-credential verify-before-trust — forged/untrusted-issuer credentials rejected; holder-gated detail release via ABAC policy (FED-03, FED-04)
4. Append-only audit log with O(1) materialized projection and point-in-time access reconstruction (AUDIT-01, AUDIT-02)
5. Per-entity policy divergence + deployment-driven support obligations + directional shielding (CTX-01, CTX-02, CTX-03)
6. Coherent 5-tab demo shell — all views share world-state; plain-prose decision traces pass legibility gate; production build clean (DEMO-01–04)

**Requirements:** 21/21 satisfied · 0 gaps · 3 deferred as future/stretch (AUDIT-03, CTX-04, SCOPE-01)

**Known Deferred Items:** 14 items acknowledged at close (11 seeds dormant, 3 stretch requirements) — see STATE.md Deferred Items

**Archive:**

- `.planning/milestones/v2.0-ROADMAP.md` — full phase details
- `.planning/milestones/v2.0-REQUIREMENTS.md` — requirements with outcomes
- `.planning/milestones/v2.0-MILESTONE-AUDIT.md` — audit report (passed)
