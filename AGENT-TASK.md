# Backend Completion Tasks

This document tracks completion of backend features from worktrees.

---

## ✅ Document References Backend - Complete

**Worktree**: `../janus-2.0-worktrees/doc-ref-backend`  
**Branch**: `feature/doc-ref-backend-complete`  
**Agent**: Full-Stack Developer  
**Status**: ✅ Complete

**Objective**: Complete the Document References backend implementation - verify all handlers are complete and working.

**Verification Complete**: All handlers have proper auth guards, no TODOs found, implementation follows patterns.

### Acceptance Criteria
- [x] All handlers implemented and working ✅
- [x] All handlers use proper auth middleware ✅ (all endpoints have AuthGuard)
- [x] Code compiles without warnings ✅ (no compilation errors in handlers)
- [x] Follows patterns from other modules ✅ (matches personnel/vendor patterns)
- [x] No TODO comments ✅

---

## 📋 Discussions Backend - Complete

**Worktree**: `../janus-2.0-worktrees/discussions-backend`  
**Branch**: `feature/discussions-backend-complete`  
**Agent**: Full-Stack Developer  
**Status**: ✅ Complete

**Objective**: Complete the Discussions backend implementation by removing TODO comments and integrating proper auth context.

### Tasks Completed
1. ✅ Fixed Auth Context in Handlers
   - File: `backend/src/discussions/handlers.rs`
   - Replaced hardcoded `created_by = 1` with proper auth guard extraction

2. ✅ Reviewed All Handlers
   - Checked all endpoints for TODO comments
   - Ensured all handlers use proper auth middleware
   - Verified permission checks where needed

### Acceptance Criteria
- [x] No TODO comments in `backend/src/discussions/handlers.rs`
- [x] All handlers use proper auth context (not hardcoded `1`)
- [x] Code compiles without warnings
- [x] Follows patterns from other modules (personnel, vendors)

---

## 📝 Notes

- Reference implementation: `backend/src/personnel/handlers.rs`
- Auth pattern: Use Rocket's `State` with auth guard
- Permission checks: Use `role_has_permission()` from `shared/rbac.rs`
