# User Stories Management Guide

**Purpose**: Simple, practical approach to managing EARS-compatible user stories over time in Janus 2.0.

---

## Core Principles

1. **Git as Single Source of Truth** - All user stories tracked in Git, versioned naturally
2. **One File Per Feature** - Keep related stories together (e.g., `ROLES-PERMISSIONS-USER-STORIES.md`)
3. **Status Tracking** - Simple status indicators at story and document level
4. **No Complex Tools** - Markdown files in `/docs`, tracked in Git
5. **Clear Traceability** - Link stories to implementation commits

---

## File Organization

### Current Structure

```
docs/
├── ROLES-PERMISSIONS-USER-STORIES.md  (Feature: RBAC)
├── USER-STORIES-MANAGEMENT.md          (This guide)
└── [future feature stories...]
```

### Naming Convention

- `[FEATURE-NAME]-USER-STORIES.md` (e.g., `ROLES-PERMISSIONS-USER-STORIES.md`)
- Use uppercase with hyphens for clarity
- One file per major feature domain

---

## Document Structure Template

Each user story document should follow this structure:

```markdown
# [Feature Name] - User Stories (EARS Format)

**Feature**: [Brief description]  
**Created**: YYYY-MM-DD  
**Status**: Draft | In Progress | Implemented | Deprecated

---

## Overview

[Feature description and context]

---

## User Stories

### US-XXX: [Story Title]

**Status**: ✅ Implemented | 🚧 In Progress | 📋 Planned | ❌ Deprecated

**AS A** [user/role]  
**WHEN** [trigger condition]  
**IF** [condition]  
**THE SYSTEM SHALL** [expected behavior]  
**OTHERWISE THE SYSTEM SHALL** [alternative behavior]

**EARS Format:**
```
[EARS syntax if applicable]
```

**Acceptance Criteria:**
- [ ] Criteria 1
- [ ] Criteria 2

**Implementation:**
- Backend: `backend/src/[module]/` (commit: `abc123`)
- Frontend: `frontend/src/[component]/` (commit: `def456`)
- Tests: E2E test `frontend/e2e/[test].spec.ts` (commit: `ghi789`)

**Related Stories**: US-XXX, US-YYY

---

## Test Scenarios

[Test scenarios for the feature]

---

## Change Log

### YYYY-MM-DD
- Added US-XXX: [Story title]
- Updated US-YYY: [What changed]
- Deprecated US-ZZZ: [Why deprecated]

---
```

---

## Status Management

### Document-Level Status

At the top of each user story document:

| Status | Meaning | When to Use |
|--------|---------|-------------|
| **Draft** | Stories being written | Initial creation, before implementation starts |
| **In Progress** | Currently being implemented | Some stories implemented, others pending |
| **Implemented** | All stories complete | All user stories implemented and tested |
| **Deprecated** | Feature replaced/removed | Feature superseded or no longer needed |

### Story-Level Status

For each individual story:

| Status | Meaning | Symbol |
|--------|---------|--------|
| **Implemented** | Code written, tested, deployed | ✅ |
| **In Progress** | Currently being implemented | 🚧 |
| **Planned** | Not yet started | 📋 |
| **Deprecated** | Removed/replaced | ❌ |
| **Blocked** | Waiting on dependency | ⏸️ |

---

## Lifecycle Management

### Adding New Stories

1. **Create or Update Document**
   - Add new story with next available number (US-XXX)
   - Set status to `📋 Planned`
   - Add to appropriate section

2. **Commit to Git**
   ```bash
   git add docs/[FEATURE]-USER-STORIES.md
   git commit -m "docs: add US-XXX - [Story title]"
   ```

3. **Update Document Status**
   - If document becomes mixed status (some implemented, some not), set document status to `In Progress`

### Implementing Stories

1. **Update Story Status**
   - Change from `📋 Planned` to `🚧 In Progress` when starting
   - Add implementation details as you go

2. **Mark Complete**
   - Change to `✅ Implemented` when done
   - Add commit hashes for traceability:
     ```markdown
     **Implementation:**
     - Backend: `backend/src/personnel/` (commit: `abc123`)
     - Frontend: `frontend/src/routes/personnel/` (commit: `def456`)
     - Tests: `frontend/e2e/personnel.spec.ts` (commit: `ghi789`)
     ```

3. **Update Document Status**
   - If all stories are implemented, set document status to `Implemented`

### Deprecating Stories

1. **Mark Story as Deprecated**
   - Change status to `❌ Deprecated`
   - Add reason in story description or change log

2. **Update Change Log**
   - Document why story was deprecated and what replaced it (if anything)

3. **Keep in Document**
   - Don't delete deprecated stories (preserve history)
   - Keep them in the document for reference

---

## Version Control Best Practices

### Commit Messages

Follow this pattern when updating user stories:

```bash
# Adding new story
git commit -m "docs: add US-XXX - [Story title]"

# Updating story status
git commit -m "docs: update US-XXX status to implemented"

# Multiple story updates
git commit -m "docs: update user stories - mark US-XXX, US-YYY as implemented"

# Deprecating story
git commit -m "docs: deprecate US-XXX - replaced by US-ZZZ"
```

### Branch Strategy

- **Main/Master**: Always up-to-date user stories
- **Feature Branches**: Update stories as you implement
- **Documentation Branches**: Only if doing major story restructuring

---

## Traceability

### Linking Stories to Implementation

For each implemented story, include:

```markdown
**Implementation:**
- Backend: `backend/src/[module]/handlers.rs` (commit: `abc123`)
- Frontend: `frontend/src/routes/[route].tsx` (commit: `def456`)
- Tests: `frontend/e2e/[feature].spec.ts` (commit: `ghi789`)
- Migration: `backend/migrations/YYYYMMDD_*.sql` (if applicable)
```

### Finding Related Code

Use Git to trace:
```bash
# Find when story was implemented
git log --grep="US-XXX" --oneline

# Find all commits for a feature
git log --all --grep="roles.*permissions" --oneline

# View file changes for a story
git log --follow -p -- docs/ROLES-PERMISSIONS-USER-STORIES.md
```

---

## Review and Maintenance

### Regular Reviews

**Monthly Review** (recommended):
1. Review all user story documents
2. Update statuses that are stale
3. Check for stories that should be deprecated
4. Ensure implementation links are accurate
5. Update document status if all stories complete

**After Each Feature Completion**:
1. Mark all stories in the feature as `✅ Implemented`
2. Update document status to `Implemented`
3. Add implementation commit hashes
4. Update change log with completion date

### Keeping Stories Current

**Do**:
- ✅ Update status when implementation starts/completes
- ✅ Link stories to actual commit hashes
- ✅ Keep acceptance criteria aligned with implementation
- ✅ Document deviations from original story

**Don't**:
- ❌ Let stories become stale (status not updated)
- ❌ Create stories for features that aren't being built
- ❌ Delete implemented stories (preserve history)
- ❌ Mix unrelated features in one document

---

## Integration with Development Workflow

### During Development

1. **Before Starting Feature**
   - Review existing stories for the feature
   - Create new stories if needed (status: `📋 Planned`)

2. **During Implementation**
   - Update story status to `🚧 In Progress`
   - Update acceptance criteria if requirements change

3. **After Implementation**
   - Mark story as `✅ Implemented`
   - Add implementation details and commit hashes
   - Write/run tests to verify acceptance criteria
   - Update document status if all stories complete

### After Feature Complete

1. **Documentation Review**
   - Ensure all stories have implementation links
   - Verify acceptance criteria are met
   - Update change log

2. **Git Tag**
   - Consider creating a Git tag for major feature completion:
     ```bash
     git tag -a v1.0.0-feature-name -m "Feature: [Name] - All user stories implemented"
     ```

---

## Example: Complete Story Lifecycle

### 1. Initial Creation

```markdown
### US-050: View Personnel List

**Status**: 📋 Planned

**AS A** authenticated user  
**WHEN** I navigate to the personnel page  
**IF** I have the `personnel.read` permission  
**THE SYSTEM SHALL** display a paginated list of all personnel  
**OTHERWISE THE SYSTEM SHALL** show an access denied message

**Acceptance Criteria:**
- [ ] List supports pagination (page, per_page)
- [ ] List filters by active/inactive status
- [ ] Permission check enforced at API level
```

### 2. Implementation Started

```markdown
### US-050: View Personnel List

**Status**: 🚧 In Progress

[Same content, but status changed]
```

### 3. Implementation Complete

```markdown
### US-050: View Personnel List

**Status**: ✅ Implemented

**AS A** authenticated user  
**WHEN** I navigate to the personnel page  
**IF** I have the `personnel.read` permission  
**THE SYSTEM SHALL** display a paginated list of all personnel  
**OTHERWISE THE SYSTEM SHALL** show an access denied message

**Acceptance Criteria:**
- [x] List supports pagination (page, per_page)
- [x] List filters by active/inactive status
- [x] Permission check enforced at API level

**Implementation:**
- Backend: `backend/src/personnel/handlers.rs` (commit: `a1b2c3d`)
- Frontend: `frontend/src/routes/personnel/index.tsx` (commit: `e4f5g6h`)
- Tests: `frontend/e2e/personnel-list.spec.ts` (commit: `i7j8k9l`)
```

---

## Multi-Feature Coordination

### When Stories Span Features

If a user story affects multiple features:

1. **Create Story in Primary Feature Document**
   - Place where the main functionality lives

2. **Reference in Related Documents**
   ```markdown
   **Related Stories**: See US-XXX in `ROLES-PERMISSIONS-USER-STORIES.md`
   ```

3. **Keep Implementation Links in One Place**
   - Primary feature document has full details
   - Related documents have reference only

---

## Reporting and Metrics

### Quick Status Check

```bash
# Count implemented stories
grep -c "Status.*✅ Implemented" docs/*-USER-STORIES.md

# Count in-progress stories
grep -c "Status.*🚧 In Progress" docs/*-USER-STORIES.md

# Count planned stories
grep -c "Status.*📋 Planned" docs/*-USER-STORIES.md
```

### Generate Summary

Create a simple status summary document (optional):

```markdown
# User Stories Status Summary

**Last Updated**: YYYY-MM-DD

## By Feature

| Feature | Total | ✅ Implemented | 🚧 In Progress | 📋 Planned |
|---------|-------|----------------|---------------|------------|
| Roles & Permissions | 22 | 22 | 0 | 0 |
| Personnel Management | 15 | 12 | 2 | 1 |
| [Next Feature] | X | Y | Z | W |

**Total**: XX stories (YY% complete)
```

---

## Troubleshooting

### Story Number Conflicts

If you need to renumber stories:
1. Update all references in the document
2. Update any references in other documents
3. Document the renumbering in change log
4. Commit with clear message

### Lost Implementation Links

If commit hashes are missing:
1. Use `git log` to find related commits
2. Search commit messages for story number or feature name
3. Update story with correct commit hashes

### Outdated Stories

If a story doesn't match implementation:
1. Update story to match reality OR
2. Mark story as deprecated and create new one
3. Document decision in change log

---

## Summary

**Simple Rules**:
1. ✅ One markdown file per feature in `/docs`
2. ✅ Track status with emoji symbols
3. ✅ Link to implementation via commit hashes
4. ✅ Update status as you implement
5. ✅ Use Git for version control (natural history)
6. ✅ Keep change log for major updates

**No Need For**:
- ❌ Complex project management tools
- ❌ Separate tracking systems
- ❌ Automated status sync
- ❌ Complex workflows

**Git is your project management tool. Markdown is your documentation format. Keep it simple.**

---

**Document Version**: 1.0  
**Last Updated**: 2025-01-30  
**Maintained By**: Full-Stack Developer / Coordinator Agent

