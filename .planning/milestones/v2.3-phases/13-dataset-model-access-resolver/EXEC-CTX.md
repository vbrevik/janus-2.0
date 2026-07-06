# Phase 13 Execution Context

## Phase Identity
- **Phase:** 13 — Dataset Model & Access Resolver
- **Milestone:** v2.3
- **Status:** In execution
- **Last updated:** 2026-07-04

## Phase Files (read before any plan)
- `.planning/phases/13-dataset-model-access-resolver/13-SPEC.md`
- `.planning/phases/13-dataset-model-access-resolver/13-RESEARCH.md`
- `.planning/phases/13-dataset-model-access-resolver/13-CONTEXT.md`

## Plan 13-01 (Wave 1)
- **File:** `.planning/phases/13-dataset-model-access-resolver/13-01-PLAN.md`
- **Tasks:** 3 (all `auto` type)
- **Dependencies:** none
- **Files modified:** `frontend/src/demo/lib/model.ts` (append), `frontend/src/demo/lib/dataset.test.ts` (new)
- **Autonomous:** true

## Plan 13-02 (Wave 2)
- **File:** `.planning/phases/13-dataset-model-access-resolver/13-02-PLAN.md`
- **Tasks:** 3 (all `auto` type)
- **Dependencies:** 13-01 complete
- **Files modified:** `frontend/src/demo/lib/model.ts` (append to Phase 13 section), `frontend/src/demo/lib/dataset.test.ts` (extend)
- **Autonomous:** true

## Global Constraints (both plans)
- Single quotes, trailing commas, ESLint flat config
- Use `@/` for internal imports in TS
- strict TS: noUnusedLocals, noUnusedParameters
- All code goes in `frontend/src/demo/lib/model.ts` in the Phase 13 section (after the Phase 9 section)
- Tests in `frontend/src/demo/lib/dataset.test.ts` — inline fixtures only, NO seed import
- Verify: `cd frontend && npx vitest run src/demo/lib/dataset.test.ts` after each task
- Build verify: `cd frontend && npm run build` (tsc -b && vite build)
- Only model.ts and dataset.test.ts may be touched by this phase
