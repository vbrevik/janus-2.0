# User Stories Management Tool Evaluation

**Purpose**: Evaluate tools for managing EARS-compatible user stories over time in Janus 2.0.

**Context**: You have user stories in markdown (`ROLES-PERMISSIONS-USER-STORIES.md`) and need to decide on a management system.

---

## 🎯 Core Requirements

Based on Janus 2.0 philosophy:

1. **Single Source of Truth** - Avoid synchronization overhead (Janus 1.0 wasted 20-30 min/day)
2. **Simple** - No complex workflows
3. **Version Controlled** - Track changes over time
4. **AI-Accessible** - Agents can read/write stories
5. **Traceability** - Link stories to implementation

---

## 🔍 Options Evaluation

### Option 1: Markdown Files + Git (Current Approach)

**How It Works**:
- User stories in markdown files (`docs/[FEATURE]-USER-STORIES.md`)
- Version controlled via Git
- Status tracked with emoji indicators
- Implementation linked via commit hashes

**Pros**:
- ✅ **Zero sync overhead** - Already in Git
- ✅ **Single source of truth** - Markdown is the source
- ✅ **Version history** - Git provides natural history
- ✅ **AI-friendly** - Markdown is easy for agents to parse
- ✅ **No tool dependencies** - Works anywhere
- ✅ **Searchable** - `grep` or codebase search works
- ✅ **Portable** - Files work with any tool
- ✅ **Free** - No cost
- ✅ **Aligns with philosophy** - "Git as single source of truth"

**Cons**:
- ❌ No visual board/Kanban
- ❌ No built-in filtering/querying
- ❌ Manual status updates (but simple)
- ❌ No automatic traceability (but commit hashes work)

**Maintenance Overhead**: **0 minutes/day** ✅

**Recommendation**: ✅ **Primary choice** - Best fit for Janus 2.0 philosophy

---

### Option 2: Linear via MCP

**How It Works**:
- User stories as Linear issues/epics
- Managed via Model Context Protocol (MCP)
- AI agents can create/update issues through MCP
- Can sync with markdown (but adds overhead)

**Pros**:
- ✅ **Visual board** - Kanban/List view
- ✅ **Filtering** - Query by status, assignee, label
- ✅ **Rich metadata** - Due dates, estimates, priorities
- ✅ **MCP integration** - AI agents can interact directly
- ✅ **Team collaboration** - If multiple people work on stories
- ✅ **Milestone tracking** - Good for high-level planning

**Cons**:
- ❌ **Sync overhead** - If keeping markdown + Linear in sync (20-30 min/day)
- ❌ **Tool dependency** - Requires Linear account/subscription
- ❌ **Not source of truth** - If markdown is source, Linear becomes duplicate
- ❌ **Complexity** - Goes against "single source of truth" principle
- ❌ **AI must learn MCP** - Additional API to use
- ❌ **Version control** - Changes not in Git (unless exported)

**Maintenance Overhead**: **20-30 minutes/day** if syncing with markdown ❌

**Recommendation**: ⚠️ **Only if used as single source** (replace markdown) OR **high-level milestones only**

---

### Option 3: GitHub Issues

**How It Works**:
- User stories as GitHub Issues
- Organized by labels/milestones
- Linked to code via commit messages
- Version controlled (issue history in Git)

**Pros**:
- ✅ **Integrated with Git** - Same repository
- ✅ **Version history** - Issue changes tracked
- ✅ **Code linking** - "Closes #123" in commits
- ✅ **Free** - For public/open-source repos
- ✅ **AI-friendly** - Can be accessed via GitHub API
- ✅ **Markdown support** - Issue descriptions in markdown

**Cons**:
- ❌ **Two places** - Issues + markdown (unless markdown is deprecated)
- ❌ **Limited structure** - Not ideal for EARS format
- ❌ **Sync overhead** - If keeping both (same problem as Linear)
- ❌ **Less structured** - Harder to maintain EARS format in issues

**Maintenance Overhead**: **10-15 minutes/day** if syncing ❌

**Recommendation**: ⚠️ **Only if replacing markdown files** (don't maintain both)

---

### Option 4: Hybrid Approach (Markdown + Linear)

**How It Works**:
- **Markdown files** = Source of truth for detailed stories
- **Linear** = High-level milestones/epics only (no individual stories)
- No synchronization - Linear references markdown, not duplicates

**Pros**:
- ✅ **Keeps markdown as source** - Detailed stories stay in Git
- ✅ **Visual planning** - Linear for milestones/epics
- ✅ **Minimal sync** - Only milestone updates (5 min/week)
- ✅ **Best of both** - Detailed docs + visual planning

**Cons**:
- ❌ **Two places to check** - But clear separation (details vs milestones)
- ❌ **Tool dependency** - Still need Linear for planning view

**Maintenance Overhead**: **5 minutes/week** (milestone updates only) ✅

**Recommendation**: ✅ **Best hybrid** - If you need visual planning

---

## 📊 Comparison Table

| Criteria | Markdown + Git | Linear via MCP | GitHub Issues | Hybrid |
|----------|---------------|----------------|---------------|--------|
| **Sync Overhead** | 0 min/day ✅ | 20-30 min/day ❌ | 10-15 min/day ❌ | 5 min/week ✅ |
| **Single Source** | Yes ✅ | If replaces markdown | If replaces markdown | Partial ⚠️ |
| **Version Control** | Git ✅ | No ❌ | GitHub ✅ | Git (markdown) ✅ |
| **AI-Friendly** | Yes ✅ | Via MCP ✅ | Via API ✅ | Yes ✅ |
| **Visual Board** | No ❌ | Yes ✅ | Yes ✅ | Yes (milestones) ✅ |
| **EARS Format** | Excellent ✅ | Good ⚠️ | Poor ❌ | Excellent (markdown) ✅ |
| **Cost** | Free ✅ | Paid ❌ | Free ✅ | Paid (Linear) ❌ |
| **Aligns with Philosophy** | Perfect ✅ | No ❌ | Partial ⚠️ | Good ✅ |

---

## 🎯 Recommendation

### **Primary Choice: Markdown Files + Git**

**Why**:
1. **Zero sync overhead** - Matches your "single source of truth" principle
2. **Already working** - You have stories in markdown
3. **Perfect for EARS format** - Markdown supports structured documentation
4. **AI-friendly** - Agents can easily read/update markdown
5. **Version controlled** - Git provides natural history
6. **Free** - No tool dependencies

**When to Use**:
- ✅ Managing detailed user stories
- ✅ Tracking implementation status
- ✅ Maintaining documentation
- ✅ AI agents working with stories

**Workflow**:
```bash
# Create/update story in markdown
vim docs/ROLES-PERMISSIONS-USER-STORIES.md

# Commit with story reference
git commit -m "docs: update US-050 - mark as implemented"

# Git history shows all changes
git log --follow docs/ROLES-PERMISSIONS-USER-STORIES.md
```

---

### **Optional Addition: Linear for High-Level Planning Only**

**When to Use**:
- ✅ You need visual milestone planning
- ✅ Managing project phases/releases
- ✅ Team collaboration on priorities

**How It Works**:
- **Markdown files** = Detailed user stories (US-001, US-002, etc.)
- **Linear** = High-level epics/milestones (e.g., "RBAC System", "Personnel Management")
- **No sync** - Linear just references markdown files, doesn't duplicate stories

**Example Structure**:
```
Linear Epic: "Roles & Permissions Feature"
  → Description: "See docs/ROLES-PERMISSIONS-USER-STORIES.md for 22 detailed user stories (US-001 through US-022)"
  → Status: Implemented
  → No individual story tracking in Linear
```

**Maintenance**: Update Linear when milestone completes (5 min/week)

---

## 🚫 What NOT to Do

Based on Janus 1.0 lessons:

❌ **Don't sync Linear with Markdown** - Choose one as source
❌ **Don't track individual stories in Linear** - Use for milestones only
❌ **Don't maintain both Issues and Markdown** - Pick one
❌ **Don't create elaborate sync workflows** - Adds overhead

---

## 💡 Practical Implementation

### If Choosing Markdown Only (Recommended)

**Current Setup** (already working):
```
docs/
├── ROLES-PERMISSIONS-USER-STORIES.md
├── USER-STORIES-MANAGEMENT.md (guidelines)
└── [future features]-USER-STORIES.md
```

**Enhancements** (optional):
1. **Status script** - Quick status check:
   ```bash
   # Count implemented stories
   grep -c "Status.*✅ Implemented" docs/*-USER-STORIES.md
   ```

2. **Search** - Find stories easily:
   ```bash
   # Find story by number
   grep "US-050" docs/*-USER-STORIES.md
   
   # Find by keyword
   grep -i "permission" docs/*-USER-STORIES.md
   ```

3. **Git workflow** - Commit with story references:
   ```bash
   git commit -m "feat: implement US-050 - View Personnel List
   
   User story US-050 implemented:
   - Backend: backend/src/personnel/handlers.rs
   - Frontend: frontend/src/routes/personnel/index.tsx
   - Tests: frontend/e2e/personnel-list.spec.ts"
   ```

---

### If Choosing Linear via MCP (Not Recommended)

**Only if you replace markdown with Linear**:

1. **Create Linear project** for user stories
2. **Import existing stories** as issues/epics
3. **Use MCP** for AI agents to manage stories
4. **Delete markdown files** (make Linear the source)
5. **Track in Git** via Linear export or API

**Problem**: Loses version control, requires Linear subscription, goes against philosophy

---

### If Choosing Hybrid (Best Compromise)

**Structure**:
```
Markdown (Source of Truth):
  docs/ROLES-PERMISSIONS-USER-STORIES.md
    → 22 detailed user stories (US-001 through US-022)
    → Status tracked in markdown
    → Implementation links in markdown

Linear (Planning Only):
  Epic: "Roles & Permissions"
    → Status: Implemented
    → Description: "See docs/ROLES-PERMISSIONS-USER-STORIES.md"
    → No individual story tracking
```

**Workflow**:
1. Create/update stories in markdown (source of truth)
2. Create Linear epic for feature
3. Update Linear epic status when feature complete
4. No daily sync - only milestone updates

**MCP Usage**:
- Use MCP to create/update Linear epics only
- Don't sync individual stories
- Reference markdown files in Linear descriptions

---

## 🎯 Final Recommendation

### **Start with Markdown Only**

1. **Continue using markdown files** - They're working
2. **Enhance with management guidelines** - Already created
3. **Use Git for version control** - Natural fit
4. **Add status tracking** - Simple emoji indicators

### **Add Linear Later Only If Needed**

Only if you need:
- Visual milestone planning
- Team collaboration on priorities
- Release planning

**If adding Linear**:
- Use for **epics/milestones only** (not individual stories)
- Reference markdown files (don't duplicate)
- Update **weekly** (not daily)
- Keep markdown as **source of truth**

---

## 📝 Decision Framework

Ask yourself:

1. **Do I need visual boards?** 
   - No → Markdown only ✅
   - Yes → Consider Linear (milestones only)

2. **Do I work alone or with a team?**
   - Alone → Markdown only ✅
   - Team → Consider Linear (collaboration)

3. **Do I need automatic traceability?**
   - Git commit hashes work → Markdown ✅
   - Need more automation → Consider Linear API

4. **Am I willing to sync tools daily?**
   - No → Markdown only ✅
   - Yes → Could use Linear (but not recommended)

5. **Do I value simplicity over features?**
   - Yes → Markdown only ✅
   - No → Consider Linear

---

## ✅ Summary

**Best Choice**: **Markdown Files + Git** (current approach)

- ✅ Zero sync overhead
- ✅ Single source of truth
- ✅ Perfect for EARS format
- ✅ AI-friendly
- ✅ Version controlled
- ✅ Aligns with Janus 2.0 philosophy

**If Needed**: **Add Linear for milestones only** (hybrid approach)

- Use markdown for detailed stories
- Use Linear for visual milestone planning
- Minimal sync (weekly updates)

**Avoid**: **Syncing Linear with Markdown**

- Goes against "single source of truth" principle
- Adds 20-30 min/day overhead (Janus 1.0 problem)
- Creates information duplication

---

**Document Version**: 1.0  
**Last Updated**: 2025-01-30  
**Purpose**: Help decide on user story management tool for Janus 2.0

