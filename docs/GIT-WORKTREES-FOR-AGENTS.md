# Git Worktrees for Parallel Agent Work

**Purpose**: Enable multiple agents to work simultaneously on different features without branch switching conflicts.

**Context**: Janus 2.0 has 5 agents that could work in parallel on different features/tasks.

---

## 🎯 What Are Git Worktrees?

**Git worktrees** allow you to have **multiple working directories** for the **same repository**, each on a **different branch**.

**Traditional Approach** (one working directory):
```bash
# Agent 1 working on feature A
git checkout feature/personnel-crud
# ... work ...

# Agent 2 needs to work - must wait OR stash/switch
git stash
git checkout feature/organization-crud
# ... Agent 2 works ...
```

**With Worktrees** (multiple working directories):
```bash
# Agent 1 in main directory
git checkout feature/personnel-crud
# ... works in /janus-2.0 ...

# Agent 2 in separate worktree
git worktree add ../janus-2.0-organization feature/organization-crud
cd ../janus-2.0-organization
# ... works simultaneously, no conflicts ...
```

---

## 🚀 How Worktrees Help Multiple Agents

### Problem: Sequential Workflow Limits Parallelism

**Current Workflow** (from AGENTS.md):
```
Coordinator → Full-Stack Developer → Tester → DevOps
```

**Limitation**: Only one agent can work at a time in the same directory.

**With Worktrees**:
```
Coordinator (main) + Full-Stack Dev (worktree-1) + Tester (worktree-2) + DevOps (worktree-3)
```
All working **simultaneously** on different features/branches!

---

## 📋 Practical Setup for Janus 2.0 Agents

### 1. Base Setup (One-Time)

```bash
# In your main project directory
cd /Users/vidarbrevik/projects/janus-2.0

# Verify you're on main
git checkout main
git pull

# Create worktree base directory (optional, keeps things organized)
mkdir -p ../janus-2.0-worktrees
```

### 2. Agent-Specific Worktrees

Each agent can have their own worktree for their current task:

```bash
# Full-Stack Developer: Feature work
git worktree add ../janus-2.0-worktrees/developer feature/personnel-crud

# Tester: Testing another feature
git worktree add ../janus-2.0-worktrees/tester feature/audit-tests

# DevOps: Infrastructure work
git worktree add ../janus-2.0-worktrees/devops feature/docker-optimization

# Coordinator: Documentation
git worktree add ../janus-2.0-worktrees/coordinator feature/docs-update
```

### 3. Workflow Example

**Scenario**: Multiple features in progress

```bash
# Main directory (Coordinator/Architect uses this)
cd /Users/vidarbrevik/projects/janus-2.0
git checkout main

# Full-Stack Developer worktree
cd ../janus-2.0-worktrees/developer
git checkout feature/personnel-crud
# ... implements backend, commits, etc. ...

# Tester worktree (testing completed feature)
cd ../janus-2.0-worktrees/tester
git checkout feature/organization-crud  # Already merged to main
# ... writes E2E tests ...

# DevOps worktree (infrastructure improvement)
cd ../janus-2.0-worktrees/devops
git checkout feature/performance-optimization
# ... optimizes Docker configs ...
```

**All three working simultaneously!** ✅

---

## 🔧 Common Worktree Commands

### Creating Worktrees

```bash
# Create worktree on existing branch
git worktree add <path> <branch>

# Create worktree with new branch
git worktree add -b <new-branch> <path>

# Example: Full-Stack Developer starts new feature
git worktree add -b feature/nda-crud ../janus-2.0-worktrees/developer
```

### Managing Worktrees

```bash
# List all worktrees
git worktree list

# Remove worktree (after merging/deleting branch)
git worktree remove <path>
# OR
git worktree prune  # Removes stale worktrees

# Move worktree to different location
git worktree move <old-path> <new-path>
```

### Switching Between Worktrees

```bash
# Just cd to the worktree directory
cd /Users/vidarbrevik/projects/janus-2.0-worktrees/developer

# Check status
git status  # Shows branch and changes for THIS worktree

# Commit normally
git add .
git commit -m "feat: implement personnel list endpoint"
```

---

## 💡 Use Cases for Janus 2.0 Agents

### Use Case 1: Full-Stack Developer + Tester (Parallel)

**Situation**: Developer working on Feature A, Tester testing Feature B

```bash
# Developer worktree
git worktree add ../janus-2.0-worktrees/dev feature/nda-crud
cd ../janus-2.0-worktrees/dev
# ... implements NDA CRUD ...

# Tester worktree (different feature)
git worktree add ../janus-2.0-worktrees/test feature/personnel-tests
cd ../janus-2.0-worktrees/test
# ... writes E2E tests for completed personnel feature ...

# Both work simultaneously, no conflicts!
```

**Benefit**: Tester doesn't block Developer (or vice versa)

---

### Use Case 2: DevOps + Developer (Parallel)

**Situation**: Developer implementing feature, DevOps optimizing infrastructure

```bash
# Developer worktree
git worktree add ../janus-2.0-worktrees/dev feature/organization-relations
cd ../janus-2.0-worktrees/dev
# ... implements organization relations feature ...

# DevOps worktree (separate concern)
git worktree add ../janus-2.0-worktrees/devops feature/docker-m2-optimization
cd ../janus-2.0-worktrees/devops
# ... optimizes Docker for Mac M2 ...

# Both work simultaneously!
```

**Benefit**: Infrastructure work doesn't block feature development

---

### Use Case 3: Coordinator + Developer (Parallel)

**Situation**: Coordinator updating docs, Developer implementing feature

```bash
# Developer worktree
git worktree add ../janus-2.0-worktrees/dev feature/info-systems
cd ../janus-2.0-worktrees/dev
# ... implements info systems feature ...

# Coordinator worktree (documentation)
git worktree add ../janus-2.0-worktrees/docs feature/user-stories-docs
cd ../janus-2.0-worktrees/docs
# ... updates user stories documentation ...

# Both work simultaneously!
```

**Benefit**: Documentation updates don't block development

---

## ⚠️ Important Considerations

### 1. Same Repository, Same Git History

All worktrees share the **same Git repository**:
- ✅ All see the same commits
- ✅ All share the same `.git` directory
- ✅ All share the same refs
- ✅ Merges in one worktree visible in all

**This is GOOD** - keeps everything in sync!

### 2. Branch Conflicts Still Apply

If two agents try to work on the **same branch**, you still have conflicts:

```bash
# ❌ BAD: Two worktrees on same branch
git worktree add ../wt1 feature/personnel
git worktree add ../wt2 feature/personnel  # ERROR: branch already checked out
```

**Solution**: Each agent should work on **different branches**

### 3. File Conflicts Are Still Possible

If two agents edit the **same file** in **different branches**, merge conflicts happen when merging:

```bash
# Agent 1 in worktree-1 modifies backend/src/main.rs (branch feature/A)
# Agent 2 in worktree-2 modifies backend/src/main.rs (branch feature/B)
# Both merge to main → merge conflict (normal Git behavior)

# This is expected - resolve conflicts normally
```

**Not a worktree problem** - this is normal Git behavior

### 4. Shared Files/Directories

Some files are **shared** across worktrees:
- `.git/` - Shared repository
- `node_modules/` - If symlinked (be careful)
- Build artifacts in `target/` (Rust) - Consider separate builds

**Best Practice**: Each worktree has its own build outputs

---

## 🎯 Recommended Workflow for Janus 2.0

### Agent Assignment Strategy

**Rule**: Each agent works on **one branch per worktree**

```
Agent              | Worktree Path                          | Typical Branch
-------------------|----------------------------------------|-------------------
Full-Stack Dev     | ../janus-2.0-worktrees/developer       | feature/*-implementation
Tester             | ../janus-2.0-worktrees/tester          | feature/*-tests OR test/*
DevOps             | ../janus-2.0-worktrees/devops          | feature/*-infrastructure
Coordinator        | ../janus-2.0-worktrees/coordinator    | feature/*-docs OR docs/*
Architect          | (uses main directory)                  | (usually just reviews)
```

### Daily Workflow

**Morning Setup** (each agent):

```bash
# Agent checks if worktree exists, creates if needed
if [ ! -d "../janus-2.0-worktrees/developer" ]; then
  git worktree add ../janus-2.0-worktrees/developer feature/my-current-task
fi

cd ../janus-2.0-worktrees/developer
git pull  # Get latest changes
```

**During Work**:

```bash
# Work normally in the worktree
cd ../janus-2.0-worktrees/developer
# ... edit files, run tests, etc. ...

# Commit normally
git add .
git commit -m "feat: implement NDA creation endpoint"

# Push when ready
git push origin feature/my-current-task
```

**End of Day**:

```bash
# Clean up if branch is merged
cd /Users/vidarbrevik/projects/janus-2.0
git worktree remove ../janus-2.0-worktrees/developer
# OR keep it for next day if still working
```

---

## 🔍 Advantages for Janus 2.0

### ✅ Enables True Parallelism

**Before worktrees**:
- Agent A works → must finish or stash
- Agent B waits → blocked
- Sequential work only

**With worktrees**:
- Agent A works in worktree-1
- Agent B works in worktree-2
- Agent C works in worktree-3
- **All parallel!**

### ✅ No Branch Switching Overhead

**Before**:
```bash
git stash
git checkout feature/B
# ... work ...
git stash pop  # Conflicts possible
```

**With worktrees**:
```bash
cd ../worktree-B  # Already on feature/B
# ... work ...
```

### ✅ Clean Separation

Each agent has their own workspace:
- Clean working directory
- No interference from other agents
- Easy to clean up when done

### ✅ Still Simple (Fits Philosophy)

Worktrees are **simple**:
- No complex merge strategies
- No special Git knowledge needed
- Just `cd` to different directory
- Works with your simple branch strategy

---

## ⚠️ Limitations & When NOT to Use

### When Worktrees DON'T Help

1. **Same Branch** - Two agents can't use same branch (Git limitation)
   - **Solution**: Use different branches

2. **Same File Edits** - Still get merge conflicts when merging
   - **Solution**: This is normal - coordinate file ownership

3. **Quick Tasks** - Overhead not worth it for 5-minute tasks
   - **Solution**: Just use main directory with stash

4. **Single Agent** - No benefit if only one agent working
   - **Solution**: Use main directory normally

### When Regular Branches Are Better

If your workflow is already sequential (Agent A → Agent B → Agent C), worktrees don't add value:
- Current linear workflow works fine
- No need to parallelize if tasks are dependent

**Use worktrees when**:
- ✅ Multiple independent features
- ✅ Multiple agents available
- ✅ Tasks that can truly run in parallel

**Don't use worktrees when**:
- ❌ Tasks are dependent (must complete in sequence)
- ❌ Only one agent working
- ❌ Simple sequential workflow is sufficient

---

## 🎓 Practical Examples

### Example 1: Three Agents, Three Features

**Setup**:
```bash
# Main repo (Coordinator)
cd /Users/vidarbrevik/projects/janus-2.0

# Developer: NDA feature
git worktree add -b feature/nda-crud ../janus-2.0-worktrees/developer

# Tester: Audit log tests (already in main)
git worktree add ../janus-2.0-worktrees/tester main
cd ../janus-2.0-worktrees/tester
# Write tests for already-merged audit feature

# DevOps: Performance optimization
git worktree add -b feature/performance ../janus-2.0-worktrees/devops
```

**All three work simultaneously!**

### Example 2: Developer + Tester (Related Features)

**Setup**:
```bash
# Developer: Implements Feature A
git worktree add -b feature/personnel-details ../janus-2.0-worktrees/dev

# Tester: Tests Feature B (already merged)
git worktree add ../janus-2.0-worktrees/test main
cd ../janus-2.0-worktrees/test
# Write E2E tests for organization management (completed feature)
```

**Developer and Tester work in parallel on different features**

### Example 3: Cleanup After Completion

```bash
# Feature merged, clean up worktree
cd /Users/vidarbrevik/projects/janus-2.0

# Remove developer worktree
git worktree remove ../janus-2.0-worktrees/developer

# Branch deleted automatically if merged
git branch -d feature/nda-crud
```

---

## 📊 Comparison: With vs Without Worktrees

### Scenario: 3 Agents, 3 Features

**Without Worktrees** (Sequential):
```
Time: 0h ──────────────────────────────── 9h

Dev:   [========] Feature A (3h)
       Wait (3h)
Tester:         [======] Feature B (2h)
                Wait (4h)
DevOps:                  [====] Feature C (2h)

Total: 9 hours (sequential)
```

**With Worktrees** (Parallel):
```
Time: 0h ────── 3h

Dev:   [========] Feature A (3h)
Tester:[======] Feature B (2h)
DevOps:[====] Feature C (2h)

Total: 3 hours (parallel - limited by longest task)
```

**Time Saved**: 6 hours (66% faster) ✅

---

## 🛠️ Helper Scripts (Optional)

### Create Worktree for Agent

```bash
#!/bin/bash
# scripts/create-agent-worktree.sh

AGENT=$1  # developer, tester, devops, coordinator
BRANCH=$2 # branch name

WORKTREE_PATH="../janus-2.0-worktrees/$AGENT"

if [ -d "$WORKTREE_PATH" ]; then
  echo "Worktree already exists at $WORKTREE_PATH"
  exit 1
fi

git worktree add -b "$BRANCH" "$WORKTREE_PATH"
echo "Created worktree at $WORKTREE_PATH on branch $BRANCH"
```

**Usage**:
```bash
./scripts/create-agent-worktree.sh developer feature/nda-crud
```

### List All Agent Worktrees

```bash
#!/bin/bash
# scripts/list-worktrees.sh

echo "Active worktrees:"
git worktree list

echo ""
echo "Agent worktrees:"
ls -la ../janus-2.0-worktrees/ 2>/dev/null || echo "No agent worktrees directory"
```

---

## ✅ Summary

### When to Use Git Worktrees

**DO use worktrees when**:
- ✅ Multiple agents available
- ✅ Multiple independent features
- ✅ Tasks can run in parallel
- ✅ Want to avoid branch switching

**DON'T use worktrees when**:
- ❌ Sequential workflow is sufficient
- ❌ Only one agent working
- ❌ Tasks are dependent
- ❌ Quick tasks (< 1 hour)

### Integration with Janus 2.0 Philosophy

Worktrees **align perfectly** with your principles:
- ✅ **Simple** - Just `cd` to different directory
- ✅ **Git-based** - Uses Git, your single source of truth
- ✅ **No sync overhead** - No additional tools
- ✅ **Enables parallelism** - Multiple agents, faster progress

### Recommendation

**Start with worktrees for**:
- Full-Stack Developer (feature implementation)
- Tester (testing different features)
- DevOps (infrastructure work)

**Keep simple for**:
- Coordinator (can use main directory)
- Architect (usually just reviews)

---

**Document Version**: 1.0  
**Last Updated**: 2025-01-30  
**Purpose**: Enable parallel agent work with Git worktrees

