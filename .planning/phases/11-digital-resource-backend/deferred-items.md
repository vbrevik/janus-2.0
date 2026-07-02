# Deferred Items — Phase 11

Out-of-scope discoveries logged during execution (not fixed; see executor scope boundary).

## From 11-04 (security hardening)

- **`backend/tests/info_systems_test.rs` is one-shot / not persistent-DB-safe** (pre-existing, discovered 2026-07-02):
  - Fixed `system_name` fixtures with a `UNIQUE(system_name)` constraint and no cleanup — any second run against the same DB fails with duplicate-key 500s. `"Test System"` is shared by 4 tests; `test_update_info_system` leaves an `"Updated System Name"` row that breaks the next run.
  - `test_delete_info_system` expects `204 NoContent` but `delete_info_system` returns `200` with an `ApiResponse` body (`Ok(Json(ApiResponse::success("Deleted")))`) — deterministic mismatch; this test cannot pass against the current handler.
  - Verified NOT caused by 11-04: after clearing leftover fixture rows, 14/15 pass with the new `info_systems.write` gate in place; the one failure is the 200-vs-204 mismatch.
  - Suggested fix (future): unique-suffix fixture names + teardown, or run against an ephemeral DB; align delete handler/test on 204 vs 200.
- **Pre-existing build warnings** (34, unchanged by 11-04): dead resolver structs in `digital_resources`, `person/mod.rs:8` unused re-exports (bin target), `person/handlers.rs` unused `params`, `UpdateVendorRelationRequest` never constructed.
- **Lib unit-test target still broken** (carried from 11-03): `organizations/handlers.rs` inline test fixtures miss `department`.
