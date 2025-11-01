#!/bin/bash
# Frontend Verification Script

set -e

FRONTEND_URL="http://localhost:15510"
API_URL="http://localhost:15520/api"

echo "=== FRONTEND VERIFICATION ==="
echo ""

# Check if frontend is running
echo "1. Checking Frontend Server..."
FRONTEND_STATUS=$(curl -s -w '%{http_code}' -o /dev/null "$FRONTEND_URL" 2>/dev/null || echo "000")
if [ "$FRONTEND_STATUS" == "200" ]; then
  echo "✅ Frontend server running on port 15510"
else
  echo "❌ Frontend server not responding (HTTP $FRONTEND_STATUS)"
  echo "   Is the frontend dev server running? (npm run dev)"
  exit 1
fi
echo ""

# Check if we can access the login page
echo "2. Checking Login Page..."
LOGIN_CONTENT=$(curl -s "$FRONTEND_URL/login" 2>/dev/null | grep -i "login\|username\|password" | head -1)
if [ ! -z "$LOGIN_CONTENT" ]; then
  echo "✅ Login page accessible"
else
  echo "⚠️  Login page may not be accessible (redirected or different structure)"
fi
echo ""

# Verify backend connectivity from frontend perspective
echo "3. Verifying Backend Connectivity..."
# Get token first
TOKEN=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password123"}' | jq -r '.token')

if [ -z "$TOKEN" ] || [ "$TOKEN" == "null" ]; then
  echo "❌ Cannot connect to backend for authentication"
  exit 1
fi

# Test if frontend can reach roles endpoint (simulating what frontend would do)
ROLES_STATUS=$(curl -s -w '%{http_code}' -o /dev/null -H "Authorization: Bearer $TOKEN" "$API_URL/roles")
if [ "$ROLES_STATUS" == "200" ]; then
  echo "✅ Backend roles endpoint accessible (simulating frontend API call)"
  ROLES_COUNT=$(curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/roles" | jq -r '. | length')
  echo "   Available roles: $ROLES_COUNT"
else
  echo "❌ Backend roles endpoint returned HTTP $ROLES_STATUS"
fi
echo ""

# Check if roles route exists in frontend build
echo "4. Checking Frontend Routes..."
if [ -f "/Users/vidarbrevik/projects/janus-2.0/frontend/src/routes/roles/index.tsx" ]; then
  echo "✅ Roles route exists: /routes/roles/index.tsx"
else
  echo "❌ Roles route not found"
fi

if [ -f "/Users/vidarbrevik/projects/janus-2.0/frontend/src/hooks/use-roles.ts" ]; then
  echo "✅ Roles hooks exist: /hooks/use-roles.ts"
else
  echo "❌ Roles hooks not found"
fi

if [ -f "/Users/vidarbrevik/projects/janus-2.0/frontend/src/types/roles.ts" ]; then
  echo "✅ Roles types exist: /types/roles.ts"
else
  echo "❌ Roles types not found"
fi
echo ""

# Check navigation integration
echo "5. Checking Navigation Integration..."
if grep -q "Roles.*Permissions\|roles" /Users/vidarbrevik/projects/janus-2.0/frontend/src/components/layout.tsx 2>/dev/null; then
  echo "✅ Roles link in navigation menu"
else
  echo "❌ Roles link not found in navigation"
fi
echo ""

echo "=== FRONTEND VERIFICATION COMPLETE ==="
echo ""
echo "To fully test the frontend UI:"
echo "  1. Navigate to: $FRONTEND_URL"
echo "  2. Login with: admin / password123"
echo "  3. Click 'Roles & Permissions' in navigation"
echo "  4. Verify you can see roles, create/edit roles, and assign permissions"

