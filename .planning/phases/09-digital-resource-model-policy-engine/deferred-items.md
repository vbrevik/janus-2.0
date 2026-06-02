# Deferred Items — Phase 09

Out-of-scope issues discovered during execution. NOT fixed (SCOPE BOUNDARY: only auto-fix issues directly caused by the current task).

## Pre-existing TypeScript errors (20 total, present before Phase 9 work)

Confirmed present on baseline `model.ts` (count identical with/without the Phase 9 append). None are in files modified by Plan 09-01.

| File | Count | Error | Note |
|------|-------|-------|------|
| `src/demo/lib/physical-access.test.ts` | 18 | TS2322 — `"org-a"`/`"org-b"`/`"org-intel"` not assignable to `UnitId` | v2.1 test fixtures use non-UnitId org strings; `granted_by_org_id` typed as `UnitId` somewhere upstream. Pre-existing. |
| `src/routes/admin/organizations/index.tsx` | 1 | TS2353 — `'NONE'` not in `Record<ClearanceLevel, ...>` | Stale clearance enum (`NONE` vs UNCLASSIFIED). Pre-existing. |
| `src/routes/organizations/index.tsx` | 1 | TS2353 — `'NONE'` not in `Record<ClearanceLevel, ...>` | Deprecated flat route (per CLAUDE.md gotchas). Pre-existing. |

These do not block Phase 9: zero errors originate from `model.ts` or any Phase 9 symbol.
