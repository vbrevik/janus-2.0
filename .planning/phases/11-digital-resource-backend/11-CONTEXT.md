# Phase 11: Digital Resource Backend & Resolver Port - Context

**Gathered:** 2026-06-19
**Status:** Ready for planning

<domain>
## Phase Boundary

A persisted, server-authoritative digital-resource backend: 8 Postgres tables (Network→Platform→Application domain + org_links, policies, policy_assignments, grants, delegates), the full gate-chain resolver ported to Rust with TS-parity, AuthGuard read + issue endpoints (issue endpoints re-validate authority server-side), and the `seed.ts` fixtures loaded into Postgres as the single source of truth.

**⚠ Scope expanded during discussion:** the user elected to **include migration-chain repair** in this phase (see D-01). This contradicts the current `11-SPEC.md` "additive-only" constraint — `11-SPEC.md` MUST be updated before planning (new constraint + acceptance criterion: a clean DB migrates end-to-end). Flagged for the planner.

</domain>

<spec_lock>
## Requirements (locked via SPEC.md)

**5 requirements are locked.** See `11-SPEC.md` for full requirements, boundaries, and acceptance criteria. Downstream agents MUST read `11-SPEC.md` before planning or implementing — requirements are not duplicated here.

**In scope (from SPEC.md):**
- New backend digital-resource domain: 8 tables + migration, sqlx models, Rocket handlers
- Full gate-chain resolver ported to Rust with a TS-parity test
- Read API (GET hierarchy/policies/grants/delegates) + Issue API (POST grant, POST delegate) — all AuthGuard-protected
- Server-side re-validation of issuing authority (ported `canIssueResourceGrant`)
- Seeding the `seed.ts` digital-resource fixtures into Postgres; removing the hardcoded `seedWorld()` digital-resource init

**Out of scope (from SPEC.md):**
- All demo UI, hybrid loader, grant-toggle UI, issuing forms, tab — **Phase 12**
- Editing/creating policies, org-links, resources, the hierarchy — only grant/delegate *issuing* is a write path
- New TanStack route files; other backend domains; reworking the v2.1 physical-access/zone backend

**⚠ SPEC amendment pending (D-01):** migration-chain repair is now in scope and the additive-only constraint is superseded. Update `11-SPEC.md` Constraints + Acceptance Criteria before planning.

</spec_lock>

<decisions>
## Implementation Decisions

### Migration strategy
- **D-01:** **Repair the broken migration chain as part of Phase 11**, then add the 8 new tables on a clean baseline. The clean DB must migrate end-to-end (no ALTER-before-CREATE, no duplicate versions, resolve the zombie `rename_personnel_to_person` vs the authoritative unified-create). This expands the phase beyond the current SPEC's additive-only constraint — **SPEC must be updated**. Author/verify against the live drifted DB as well so the live environment is not broken.
- **D-02:** After the chain is repaired, create the 8 digital-resource tables (single additive create is fine on the clean baseline).

### DB seeding mechanism
- **D-03:** Seed the 6-unit fixtures via an **embedded seed migration** (INSERT statements), matching the existing `20260601120200_seed_enduser_official_users.sql` pattern. Make it **idempotent** (`ON CONFLICT DO NOTHING`/equivalent) so re-runs are safe.
- **D-04:** **Hand-port** the fixtures from `frontend/src/demo/lib/seed.ts` to SQL for this phase, with a comment block in the seed migration **citing `seed.ts` as the source of truth** and documenting the field mapping. (Generated-from-TS tooling judged overkill for fixed demo fixtures.)

### Resolver port & parity test
- **D-05:** The ported Rust resolver lives **in the `digital_resources` domain** (e.g. `src/digital_resources/resolver.rs`) — a **pure module**, taking an **explicit evaluation timestamp**, no `now()` inside, no Rocket types. Matches the flat per-domain convention.
- **D-06:** Prove parity via **golden fixtures exported from TS → committed JSON**: a TS test emits resolver outputs for the seed fixtures at fixed timestamps to a committed JSON file; a Rust test loads the same JSON and asserts **byte-equal** results. Single source of truth; catches drift on either side. Parity MUST cover the inclusive policy-window boundary and the no-policy `NO_ACTIVE_POLICY` fail-closed DENY.

### API surface shape
- **D-07:** Expose **one aggregate GET** — `GET /api/digital-resources/world` — returning the whole tree + policies + assignments + grants + delegates in one payload (exactly what the Phase 12 hybrid loader needs to populate `WorldState.digitalResources`; mirrors the seed shape; one round-trip).
- **D-08:** Wrap reads in the existing **`ApiResponse<T>`** convention. The **issue POST derives the actor from `AuthGuard`'s authenticated person**, resolves that person's org-link, and re-validates issuing authority server-side (ported `canIssueResourceGrant`) — the client never asserts its own authority.
- **D-09:** Mount the new domain at `/api/digital-resources` in `shared/rocket_setup.rs` using relative handler paths (don't double-prefix).

### Claude's Discretion
- **FK vs standalone IDs** for org_links/grant-issuers: deferred to planning. Lock = "verify the actual `organizations`/`person` schema in the live DB first, then choose FK-to-existing vs standalone string IDs matching the seed." Planner decides after inspection.
- Exact placement of the resolver file within `src/digital_resources/` and module decomposition.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase requirements & contracts
- `.planning/phases/11-digital-resource-backend/11-SPEC.md` — Locked requirements (RSRC-BE-01..05), boundaries, acceptance criteria, prohibitions. **MUST read before planning. NOTE the pending SPEC amendment for migration-chain repair (D-01).**
- `.planning/ROADMAP.md` §"Phase 11: Digital Resource Backend & Resolver Port" — goal + success criteria
- `.planning/REQUIREMENTS.md` §"Digital Resource Backend (RSRC-BE)" — requirement text + traceability

### TS source of truth (the parity reference + fixture source)
- `frontend/src/demo/lib/model.ts` — `resolveResourceAccess`, `canIssueResourceGrant`, gate evaluators, `effectiveClassification`, `isWindowActive`, the 8 entity types, `ResourceAccessResult`/`ResourceGateResult` shapes (the Rust resolver must match these)
- `frontend/src/demo/lib/seed.ts` — `RESOURCE_NODES`, `RSRC_POLICIES`, `RESOURCE_GRANTS`, `RSRC_DELEGATES` (the 6-unit fixtures to hand-port to SQL)
- `frontend/src/demo/lib/digital-resource.test.ts` — existing TS resolver tests (basis for the golden-fixture export)
- `frontend/src/demo/store/world-state.tsx` — `seedWorld()` (the hardcoded digital-resource init to remove) + `DigitalResourceWorld` shape the aggregate GET must satisfy

### Backend conventions & integration
- `backend/src/shared/rocket_setup.rs` — route mounting pattern (mount new domain at `/api/digital-resources`)
- `backend/src/shared/response.rs` — `ApiResponse<T>` / `PaginatedResponse<T>` wrappers
- `backend/src/shared/auth/middleware.rs` — `AuthGuard` Bearer-JWT request guard (actor identity for issue endpoints)
- `backend/src/access/` — closest example domain (`mod.rs`/`models.rs`/`handlers.rs` layout) to mirror
- `backend/migrations/20260601120200_seed_enduser_official_users.sql` — the seed-migration pattern to follow (D-03)
- `CLAUDE.md` §Gotchas — migration drift, route double-prefix, clearance levels

### Project memory
- Memory `project_migrations_fresh_db_broken` — the broken-chain reconstruction recipe (directly relevant to D-01)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ApiResponse<T>` (`shared/response.rs`) — wrap the aggregate GET response (D-08)
- `AuthGuard` (`shared/auth/middleware.rs`) — actor identity + auth on every handler
- `access/` domain — copyable `mod.rs`/`models.rs`/`handlers.rs` skeleton for `digital_resources/`
- Seed-migration `20260601120200_seed_enduser_official_users.sql` — template for the idempotent seed migration

### Established Patterns
- Flat domain modules, no service layer, inline sqlx on `PgPool`; handlers return `Result<Json<T>, Status>` (never panic)
- Routes mount at `/api/<x>` with RELATIVE handler paths (don't hardcode `/api/...` in macros)
- DB string enums SCREAMING_SNAKE_CASE; clearance levels `UNCLASSIFIED|CONFIDENTIAL|SECRET|TOP_SECRET`

### Integration Points
- New mount line in `shared/rocket_setup.rs` (`/api/digital-resources`)
- New migration(s) appended to `backend/migrations/` (chain repair + create + seed)
- Aggregate GET payload must deserialize into the frontend's `DigitalResourceWorld` (Phase 12 loader contract)

</code_context>

<specifics>
## Specific Ideas

- Aggregate endpoint path: `GET /api/digital-resources/world` (D-07) — the single payload the Phase 12 loader maps to `WorldState.digitalResources`
- Golden-fixture file is committed and shared between the TS exporter and the Rust assertion (D-06)

</specifics>

<deferred>
## Deferred Ideas

- **Migration-chain repair as its own phase** — offered (Phase 10.5 "Migration Baseline Repair") but the user chose to fold it into Phase 11 (D-01). Recorded in case the planner finds it too large and wants to re-split.
- All Phase 12 UI/loader/issuing-form work — out of scope here by SPEC.

None other — discussion stayed within phase scope.

</deferred>

---

*Phase: 11-digital-resource-backend*
*Context gathered: 2026-06-19*
