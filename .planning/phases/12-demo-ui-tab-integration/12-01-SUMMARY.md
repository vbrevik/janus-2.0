---
phase: 12-demo-ui-tab-integration
plan: 01
subsystem: database
tags: [postgres, psql, sqlx, seed-data, digital-resources]

requires:
  - phase: 11-digital-resource-backend
    provides: "resource_* tables + GET /api/digital-resources/world endpoint + committed seed migration 20260601130001"
provides:
  - "Live janus2 dev DB seeded with the 6-unit digital-resource dataset (6 networks/4 platforms/4 applications/18 grants/18 org_links/3 policies/15 policy_assignments/1 delegate)"
  - "backend/scripts/apply-digital-resource-seed.sh — checked-in, idempotent, re-runnable psql apply wrapper"
affects: [12-02, 12-03, 12-04, 12-05, 12-06]

tech-stack:
  added: []
  patterns:
    - "psql-direct seed apply via docker exec (bypasses broken sqlx migrate run on drifted dev DB) — same pattern as 11-04's permission seed"

key-files:
  created:
    - backend/scripts/apply-digital-resource-seed.sh
  modified: []

key-decisions:
  - "Script is a thin apply wrapper only — no row-count pre-checks or lock files; all idempotency comes from the seed migration's own ON CONFLICT DO NOTHING / WHERE NOT EXISTS guards, verified empirically (second run produced INSERT 0 0 on every statement)"

requirements-completed: [RSRC-UI-04]

coverage:
  - id: D1
    description: "janus2 seeded with the 6-unit digital-resource dataset (6/4/4/18/18/3/15/1) via checked-in apply script"
    requirement: "RSRC-UI-04"
    verification:
      - kind: integration
        ref: "backend/tests/digital_resources_api_test.rs#test_get_world_authenticated"
        status: pass
      - kind: other
        ref: "docker exec psql row-count check on all 8 resource_* tables — 6/4/4/18/18/3/15/1"
        status: pass
    human_judgment: false
  - id: D2
    description: "Re-running the apply script a second time is a no-op (idempotent)"
    requirement: "RSRC-UI-04"
    verification:
      - kind: other
        ref: "manual: resource_access_grants count before/after second run — 18 → 18, every statement in second run reported INSERT 0 0"
        status: pass
    human_judgment: false

duration: ~5min
completed: 2026-07-02
status: complete
---

# Phase 12 Plan 01: Digital-Resource Seed Apply Summary

**Wrote `backend/scripts/apply-digital-resource-seed.sh`, a checked-in idempotent psql wrapper, and used it to seed the live `janus2` dev DB with the 6-unit digital-resource dataset (6 networks/4 platforms/4 applications/18 grants/18 org_links/3 policies/15 policy_assignments/1 delegate), verified live through the existing `GET /api/digital-resources/world` integration test.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-07-02T22:21:46Z
- **Completed:** 2026-07-02T22:24:53Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- Created `backend/scripts/apply-digital-resource-seed.sh` — container/DB-name-parameterized psql apply wrapper with fail-loud guards (container not running, seed file missing)
- Seeded live `janus2` from empty (`resource_*` tables were all 0 rows) to the full 6-unit dataset: 6 networks, 4 platforms, 4 applications, 18 org_links, 3 policies, 15 policy_assignments, 18 grants, 1 delegate
- Proved idempotency empirically: second script run produced `INSERT 0 0` on all 38 statements; `resource_access_grants` count unchanged at 18
- Confirmed live API parity: `cargo test --test digital_resources_api_test test_get_world_authenticated -- --exact --include-ignored` → 1 passed, 0 failed, against the now-seeded `janus2`

## Task Commits

Each task was committed atomically:

1. **Task 1: Write the idempotent seed-apply script** - `d3d3518` (feat)
2. **Task 2: Apply the seed to janus2 and prove idempotency + live API parity** - no commit (execution-only task, no files modified)

**Plan metadata:** committed separately (docs: complete plan)

## Files Created/Modified
- `backend/scripts/apply-digital-resource-seed.sh` - Idempotent psql-apply wrapper for the seed migration; parameterized on DB name (defaults `janus2`), fixed container name `janus2-postgres-dev` from `docker-compose.dev.yml`

## Decisions Made
- Script contains zero extra idempotency logic (no `SELECT COUNT` pre-check, no lock file) — relies entirely on the seed migration's own `ON CONFLICT DO NOTHING` / `WHERE NOT EXISTS` guards, per the plan's explicit constraint. Verified by inspection and by the empirical second-run test (all `INSERT 0 0`).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. The Postgres container (`janus2-postgres-dev`) was already running at execution start, so no `docker compose up -d` was needed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

`janus2` now has real seeded data for every remaining Phase 12 plan to render and mutate against (loader, tab UI, grant issuance flows). The apply script is checked in and safe to re-run against a fresh DB or after a reset. No blockers for 12-02 onward.

---
*Phase: 12-demo-ui-tab-integration*
*Completed: 2026-07-02*

## Self-Check: PASSED

- FOUND: backend/scripts/apply-digital-resource-seed.sh
- FOUND: commit d3d3518
