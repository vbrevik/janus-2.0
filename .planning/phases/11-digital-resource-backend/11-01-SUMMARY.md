---
phase: 11-digital-resource-backend
plan: 01
subsystem: database
tags: [sqlx, postgres, migrations, digital-resources, schema, migration-repair]

requires:
  - phase: 10-mock-dataset-worldstate
    provides: DigitalResourceWorld shape (parity reference for the 8-table schema)
provides:
  - Repaired sqlx migration chain — a fresh empty Postgres DB migrates end-to-end with zero errors (RSRC-BE-06)
  - 8 digital-resource tables on the clean baseline (resource_networks, resource_platforms, resource_applications, resource_org_links, resource_policies, resource_policy_assignments, resource_access_grants, resource_access_delegates) (RSRC-BE-01)
  - Live janus2 dev DB rebuilt clean and now migration-tracked (30 migrations in _sqlx_migrations) with the 8 new tables + seed users
affects:
  - 11-02-resolver-models (sqlx models map 1:1 to these tables)
  - 11-03-handlers-integration (handlers query these tables; seed migration extends them)

tech-stack:
  added: []
  patterns:
    - Standalone TEXT primary keys for the 8 resource tables (NOT FKs to the SERIAL int organizations/person) — CONTEXT D-01
    - resource_applications has NO classification column — classification derived from parent platform at resolution time (anti-pattern 2)
    - 5-level classification CHECK (incl. RESTRICTED) on networks/platforms, distinct from the untouched person.clearance_level 4-level CHECK

key-files:
  created:
    - backend/migrations/20260601130000_create_digital_resource_tables.sql
  modified:
    - "backend/migrations/* (chain repair: renamed misdated Jan-2025 files, de-duplicated clashing version prefixes, deleted zombie rename_personnel_to_person, fixed buggy deleted_at INSERT)"

key-decisions:
  - "D-01/D-02: repair the broken migration chain on a clean baseline, then add the 8 tables additively"
  - "Live-DB strategy = Option C (clean rebuild) chosen by the user after Task 0 found a THIRD state the plan did not anticipate: live janus2 had NO _sqlx_migrations table at all yet was fully populated. Rename-in-place + live-baseline were both predicated on tracked versions that did not exist."
  - "Destructive DROP SCHEMA + re-migrate executed only after explicit, twice-given direct user approval (irreversible-action gate); pre-rebuild pg_dump retained as backup"

patterns-established:
  - "Migration-repair verified on a throwaway janus2_fresh DB before any live action"
  - "Latent person_pkey duplicate-key bug fixed (sequence not advanced after explicit-id seed inserts)"

requirements-completed: [RSRC-BE-06, RSRC-BE-01]

duration: ~45min
completed: 2026-06-23
status: complete
---

# Phase 11 / Plan 01: Migration-Chain Repair + 8 Digital-Resource Tables — Summary

**The broken backend migration chain now migrates a fresh DB end-to-end with zero errors, the 8 digital-resource tables exist on that clean baseline, and the live janus2 dev DB was rebuilt clean (Option C) so it is migration-tracked and carries the new domain.**

## Performance

- **Duration:** ~45 min (across one human-action checkpoint)
- **Completed:** 2026-06-23
- **Tasks:** 3 (Task 0 read-only investigation, Task 1 chain repair, Task 2 add 8 tables) + live rebuild
- **Files modified:** migration chain (renames/dedup/delete/fix) + 1 new migration

## What Was Built

- **Task 1 — chain repair (commit `e41bdad`, RSRC-BE-06):** renamed the misdated Jan-2025 migrations so they sort after the Oct-2025 creates they depend on; de-duplicated the clashing version prefixes (`20251026132437` ×3, `20251101190000` ×2); deleted the zombie `rename_personnel_to_person`; fixed the buggy `WHERE (deleted_at IS NULL OR deleted_at IS NOT NULL)` INSERT; added `IF NOT EXISTS` guards. Also fixed a latent `person_pkey` duplicate-key bug (sequence not advanced after explicit-id inserts). A fresh `janus2_fresh` DB migrates end-to-end with **0 error lines**.
- **Task 2 — 8 digital-resource tables (commit `e62f302`, RSRC-BE-01):** `20260601130000_create_digital_resource_tables.sql` adds all 8 tables on the repaired baseline. `resource_applications` has no `classification` column; 5-level RESTRICTED CHECK on networks/platforms; `uq_grant` uniqueness present.
- **Live rebuild (Option C):** `DROP SCHEMA public CASCADE` + full repaired chain re-applied + re-seed. Verified: `_sqlx_migrations` tracks 30 migrations; all 8 tables present; 6 login users in `person` (admin/manager/operator/viewer + enduser/official, all password_hash set); roles=4, permissions=8, role_permissions=13.

## Deviation From Plan

The plan front-loaded two live-DB modes (rename-in-place vs compensating-migration), both assuming `_sqlx_migrations` contents. Task 0 found a third, unanticipated state: **live janus2 had no `_sqlx_migrations` table at all** while being fully populated. The plan's "re-run migrations against the live drifted dev DB → no checksum error" acceptance criterion was therefore not achievable as written. Resolved by **Option C (clean rebuild)** under explicit, twice-given direct user approval, with a pre-rebuild `pg_dump` safety backup at `scratchpad/janus2-pre-rebuild.sql`. The prior 13 person / 13 org dev-fixture rows were intentionally discarded; the rebuild restored seed data (and added enduser/official, which previously did not exist).

## must_haves Status

- Fresh DB migrates empty→current, zero errors — ✅ (janus2_fresh)
- Live-DB verify (D-01) — ✅ satisfied via Option C: live is now a clean fresh-applied chain (30 tracked), no checksum drift possible
- 8 tables on repaired baseline (D-02) — ✅
- Zombie rename no longer in the authoritative person path — ✅ (deleted)
- resource_applications has no classification column — ✅
- Network/platform 5-level RESTRICTED CHECK; person 4-level CHECK untouched — ✅

## Notes For Downstream Plans

- 11-02: sqlx models map to these 8 tables; TEXT PKs, not int FKs.
- 11-03: the idempotent seed migration extends this chain; the backend serves from live janus2 (now tracked + carrying the 8 tables).
- Backend was not running during the rebuild; start it with `cd backend && RUST_LOG=info cargo run` against `:15530`.
