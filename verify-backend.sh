#!/bin/bash
# Backend API Verification Script

set -e

API_URL="http://localhost:15520/api"
echo "=== BACKEND API VERIFICATION ==="
echo ""

# Get authentication token
echo "1. Authentication..."
TOKEN=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password123"}' | jq -r '.token')

if [ -z "$TOKEN" ] || [ "$TOKEN" == "null" ]; then
  echo "❌ FAILED: Could not obtain token"
  exit 1
fi
echo "✅ Authentication: Token obtained"
echo ""

# Core endpoints
echo "2. Core Endpoints..."
HEALTH=$(curl -s "http://localhost:15520/api/health" | jq -r '.status')
if [ "$HEALTH" == "healthy" ]; then
  echo "✅ GET /api/health"
else
  echo "❌ GET /api/health: $HEALTH"
fi

PROFILE=$(curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/auth/profile" | jq -r '.username')
if [ "$PROFILE" == "admin" ]; then
  echo "✅ GET /api/auth/profile"
else
  echo "❌ GET /api/auth/profile"
fi

STATS=$(curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/stats" | jq -r '.success')
if [ "$STATS" == "true" ]; then
  echo "✅ GET /api/stats"
else
  echo "❌ GET /api/stats"
fi
echo ""

# Personnel endpoints
echo "3. Personnel Endpoints..."
PERSONNEL_COUNT=$(curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/personnel?page=1&per_page=5" | jq -r '.items | length')
if [ "$PERSONNEL_COUNT" -gt 0 ] 2>/dev/null; then
  echo "✅ GET /api/personnel: $PERSONNEL_COUNT items"
  PERSONNEL_ID=$(curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/personnel?page=1&per_page=1" | jq -r '.items[0].id')
  PERSONNEL_STATUS=$(curl -s -w '%{http_code}' -o /dev/null -H "Authorization: Bearer $TOKEN" "$API_URL/personnel/$PERSONNEL_ID")
  if [ "$PERSONNEL_STATUS" == "200" ]; then
    echo "✅ GET /api/personnel/$PERSONNEL_ID"
  else
    echo "❌ GET /api/personnel/$PERSONNEL_ID: HTTP $PERSONNEL_STATUS"
  fi
else
  echo "❌ GET /api/personnel"
fi
echo ""

# Vendor endpoints
echo "4. Vendor Endpoints..."
VENDOR_COUNT=$(curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/vendors?page=1&per_page=5" | jq -r '.items | length')
if [ "$VENDOR_COUNT" -gt 0 ] 2>/dev/null; then
  echo "✅ GET /api/vendors: $VENDOR_COUNT items"
  VENDOR_ID=$(curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/vendors?page=1&per_page=1" | jq -r '.items[0].id')
  VENDOR_STATUS=$(curl -s -w '%{http_code}' -o /dev/null -H "Authorization: Bearer $TOKEN" "$API_URL/vendors/$VENDOR_ID")
  if [ "$VENDOR_STATUS" == "200" ]; then
    echo "✅ GET /api/vendors/$VENDOR_ID"
  else
    echo "❌ GET /api/vendors/$VENDOR_ID: HTTP $VENDOR_STATUS"
  fi
else
  echo "❌ GET /api/vendors"
fi
echo ""

# Audit endpoints
echo "5. Audit Endpoints..."
AUDIT_STATUS=$(curl -s -w '%{http_code}' -o /dev/null -H "Authorization: Bearer $TOKEN" "$API_URL/audit?page=1&per_page=5")
if [ "$AUDIT_STATUS" == "200" ]; then
  echo "✅ GET /api/audit: HTTP 200"
else
  echo "❌ GET /api/audit: HTTP $AUDIT_STATUS"
fi
echo ""

# Roles & Permissions endpoints
echo "6. Roles & Permissions Endpoints..."
ROLES_COUNT=$(curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/roles" | jq -r '. | length')
if [ "$ROLES_COUNT" -gt 0 ] 2>/dev/null; then
  echo "✅ GET /api/roles: $ROLES_COUNT roles"
  ROLE_ID=$(curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/roles" | jq -r '.[0].id')
  ROLE_PERMS=$(curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/roles/$ROLE_ID/permissions" | jq -r '. | length')
  if [ "$ROLE_PERMS" -ge 0 ] 2>/dev/null; then
    echo "✅ GET /api/roles/$ROLE_ID/permissions: $ROLE_PERMS permissions"
  else
    echo "❌ GET /api/roles/$ROLE_ID/permissions"
  fi
else
  echo "❌ GET /api/roles"
fi

PERMS_COUNT=$(curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/roles/permissions" | jq -r '. | length')
if [ "$PERMS_COUNT" -gt 0 ] 2>/dev/null; then
  echo "✅ GET /api/roles/permissions: $PERMS_COUNT permissions"
else
  echo "❌ GET /api/roles/permissions"
fi
echo ""

# Test CREATE operation
echo "7. Testing CREATE Role..."
TIMESTAMP=$(date +%s)
CREATE_RESPONSE=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"test-role-$TIMESTAMP\",\"description\":\"Test verification\"}" \
  -X POST "$API_URL/roles")
CREATE_CODE=$(echo "$CREATE_RESPONSE" | tail -1)
CREATE_BODY=$(echo "$CREATE_RESPONSE" | sed '$d')

if [ "$CREATE_CODE" == "200" ] || [ "$CREATE_CODE" == "201" ]; then
  echo "✅ POST /api/roles: HTTP $CREATE_CODE"
  TEST_ROLE_ID=$(echo "$CREATE_BODY" | jq -r '.id')
  echo "   Created role ID: $TEST_ROLE_ID"
  
  # Test DELETE
  DELETE_CODE=$(curl -s -w '%{http_code}' -o /dev/null -H "Authorization: Bearer $TOKEN" \
    -X DELETE "$API_URL/roles/$TEST_ROLE_ID")
  if [ "$DELETE_CODE" == "200" ]; then
    echo "✅ DELETE /api/roles/$TEST_ROLE_ID: HTTP 200"
  else
    echo "⚠️  DELETE /api/roles/$TEST_ROLE_ID: HTTP $DELETE_CODE"
  fi
else
  echo "❌ POST /api/roles: HTTP $CREATE_CODE"
  echo "$CREATE_BODY" | jq '.' || echo "$CREATE_BODY"
fi

echo ""
echo "=== BACKEND VERIFICATION COMPLETE ==="

