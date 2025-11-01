#!/bin/bash
# Update all admin route paths to /admin/* prefix
find . -name "*.tsx" -type f -exec sed -i '' -E "s|createFileRoute\(['\"]/([^'\"]+)['\"]\)|createFileRoute('/admin/\1')|g" {} \;
find . -name "*.tsx" -type f -exec sed -i '' -E "s|ProtectedRoute>|<ProtectedRoute allowedRoles={['admin']}>|g" {} \;
find . -name "*.tsx" -type f -exec sed -i '' -E "s|protected-route|ProtectedRoute|g" {} \;
