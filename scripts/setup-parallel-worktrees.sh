#!/bin/bash
# Setup script for parallel agent work using Git worktrees
# Based on WORKTREES-PARALLEL-WORK-PROPOSAL.md

BASE_DIR="/Users/vidarbrevik/projects/janus-2.0"
WT_DIR="../janus-2.0-worktrees"

cd "$BASE_DIR" || exit 1

# Create worktree directory
mkdir -p "$WT_DIR"

echo "🚀 Setting up Git worktrees for parallel agent work..."
echo ""

# Phase 1: Backend Completion Worktrees
echo "📦 Phase 1: Creating backend completion worktrees..."

# NDA Backend
if git worktree add -b feature/nda-backend-complete "$WT_DIR/nda-backend" 2>/dev/null; then
  echo "  ✅ Created: NDA Backend (feature/nda-backend-complete)"
else
  echo "  ⚠️  NDA Backend worktree already exists"
fi

# Discussions Backend
if git worktree add -b feature/discussions-backend-complete "$WT_DIR/discussions-backend" 2>/dev/null; then
  echo "  ✅ Created: Discussions Backend (feature/discussions-backend-complete)"
else
  echo "  ⚠️  Discussions Backend worktree already exists"
fi

# Document References Backend
if git worktree add -b feature/doc-ref-backend-complete "$WT_DIR/doc-ref-backend" 2>/dev/null; then
  echo "  ✅ Created: Document References Backend (feature/doc-ref-backend-complete)"
else
  echo "  ⚠️  Document References Backend worktree already exists"
fi

echo ""

# Phase 2: Frontend Worktrees
echo "🎨 Phase 2: Creating frontend worktrees..."

# Roles Frontend
if git worktree add -b feature/roles-frontend "$WT_DIR/roles-frontend" 2>/dev/null; then
  echo "  ✅ Created: Roles Frontend (feature/roles-frontend)"
else
  echo "  ⚠️  Roles Frontend worktree already exists"
fi

# NDA Frontend
if git worktree add -b feature/nda-frontend "$WT_DIR/nda-frontend" 2>/dev/null; then
  echo "  ✅ Created: NDA Frontend (feature/nda-frontend)"
else
  echo "  ⚠️  NDA Frontend worktree already exists"
fi

# Info Systems Frontend
if git worktree add -b feature/info-systems-frontend "$WT_DIR/info-systems-frontend" 2>/dev/null; then
  echo "  ✅ Created: Info Systems Frontend (feature/info-systems-frontend)"
else
  echo "  ⚠️  Info Systems Frontend worktree already exists"
fi

echo ""
echo "📋 Summary:"
git worktree list

echo ""
echo "✨ Next steps:"
echo "  1. Check each worktree directory for agent instructions"
echo "  2. Start working in parallel!"
echo "  3. Use 'git worktree list' to see all worktrees"
echo ""

