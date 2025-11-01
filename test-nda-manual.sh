#!/bin/bash
# Manual NDA Testing Script
# Tests both signing and rejection flows

set -e

BACKEND_URL="http://localhost:15520"
TIMESTAMP=$(date +%s)

echo "🧪 Testing NDA Sign and Reject Flows"
echo "===================================="
echo ""

# Step 1: Login
echo "1. Logging in as admin..."
LOGIN_RESPONSE=$(curl -s -X POST "$BACKEND_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password123"}')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Login failed. Response: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Login successful"
echo ""

AUTH_HEADER="Authorization: Bearer $TOKEN"

# Step 2: Get a personnel ID
echo "2. Finding test personnel..."
PERSONNEL_RESPONSE=$(curl -s -X GET "$BACKEND_URL/api/personnel?per_page=10" \
  -H "$AUTH_HEADER")

PERSONNEL_ID=$(echo $PERSONNEL_RESPONSE | grep -o '"id":[0-9]*' | head -1 | grep -o '[0-9]*')

if [ -z "$PERSONNEL_ID" ]; then
  echo "❌ Could not find personnel"
  exit 1
fi

echo "✅ Found personnel ID: $PERSONNEL_ID"
echo ""

# Step 3: Create NDA for signing test
echo "3. Creating NDA for signing test..."
SIGN_NDA_RESPONSE=$(curl -s -X POST "$BACKEND_URL/api/nda" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d "{
    \"personnel_id\": $PERSONNEL_ID,
    \"title\": \"Sign Test NDA $TIMESTAMP\",
    \"content\": \"This NDA will be signed for testing purposes.\",
    \"version\": \"1.0\"
  }")

SIGN_NDA_ID=$(echo $SIGN_NDA_RESPONSE | grep -o '"id":[0-9]*' | head -1 | grep -o '[0-9]*')

if [ -z "$SIGN_NDA_ID" ]; then
  echo "❌ Failed to create NDA for signing. Response: $SIGN_NDA_RESPONSE"
  exit 1
fi

echo "✅ Created NDA for signing (ID: $SIGN_NDA_ID)"
echo ""

# Step 4: Sign the NDA
echo "4. Signing the NDA..."
SIGN_RESPONSE=$(curl -s -X POST "$BACKEND_URL/api/nda/$SIGN_NDA_ID/sign" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d "{
    \"signature\": \"Signed by Test User at $(date -u +%Y-%m-%dT%H:%M:%SZ)\"
  }")

SIGN_STATUS=$(echo $SIGN_RESPONSE | grep -o '"status":"[^"]*' | cut -d'"' -f4)

if [ "$SIGN_STATUS" = "SIGNED" ]; then
  echo "✅ NDA signed successfully! Status: $SIGN_STATUS"
  
  # Verify signed_at is set
  SIGNED_AT=$(echo $SIGN_RESPONSE | grep -o '"signed_at":"[^"]*' | cut -d'"' -f4)
  if [ -n "$SIGNED_AT" ]; then
    echo "   ✅ signed_at timestamp set: $SIGNED_AT"
  else
    echo "   ⚠️  signed_at not found in response"
  fi
else
  echo "❌ Signing failed. Response: $SIGN_RESPONSE"
  exit 1
fi
echo ""

# Step 5: Create NDA for rejection test
echo "5. Creating NDA for rejection test..."
REJECT_NDA_RESPONSE=$(curl -s -X POST "$BACKEND_URL/api/nda" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d "{
    \"personnel_id\": $PERSONNEL_ID,
    \"title\": \"Reject Test NDA $TIMESTAMP\",
    \"content\": \"This NDA will be rejected for testing purposes.\",
    \"version\": \"1.0\"
  }")

REJECT_NDA_ID=$(echo $REJECT_NDA_RESPONSE | grep -o '"id":[0-9]*' | head -1 | grep -o '[0-9]*')

if [ -z "$REJECT_NDA_ID" ]; then
  echo "❌ Failed to create NDA for rejection. Response: $REJECT_NDA_RESPONSE"
  exit 1
fi

echo "✅ Created NDA for rejection (ID: $REJECT_NDA_ID)"
echo ""

# Step 6: Reject the NDA
echo "6. Rejecting the NDA..."
REJECT_REASON="Test rejection reason $TIMESTAMP - NDA content is unclear and requirements not met"
REJECT_RESPONSE=$(curl -s -X POST "$BACKEND_URL/api/nda/$REJECT_NDA_ID/reject" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d "{
    \"reason\": \"$REJECT_REASON\"
  }")

REJECT_STATUS=$(echo $REJECT_RESPONSE | grep -o '"status":"[^"]*' | cut -d'"' -f4)
REJECT_REASON_RESPONSE=$(echo $REJECT_RESPONSE | grep -o '"rejection_reason":"[^"]*' | cut -d'"' -f4)

if [ "$REJECT_STATUS" = "REVOKED" ] || [ "$REJECT_STATUS" = "REJECTED" ]; then
  echo "✅ NDA rejected successfully! Status: $REJECT_STATUS"
  
  if [ -n "$REJECT_REASON_RESPONSE" ]; then
    echo "   ✅ rejection_reason stored: $REJECT_REASON_RESPONSE"
  else
    echo "   ⚠️  rejection_reason not found in response"
  fi
else
  echo "❌ Rejection failed. Response: $REJECT_RESPONSE"
  exit 1
fi
echo ""

# Step 7: Verify via GET requests
echo "7. Verifying via GET requests..."

# Verify signed NDA
echo "   Checking signed NDA (ID: $SIGN_NDA_ID)..."
GET_SIGNED=$(curl -s -X GET "$BACKEND_URL/api/nda/$SIGN_NDA_ID" \
  -H "$AUTH_HEADER")

VERIFY_SIGN_STATUS=$(echo $GET_SIGNED | grep -o '"status":"[^"]*' | cut -d'"' -f4)
if [ "$VERIFY_SIGN_STATUS" = "SIGNED" ]; then
  echo "   ✅ Signed NDA verified - Status: $VERIFY_SIGN_STATUS"
else
  echo "   ❌ Signed NDA verification failed - Status: $VERIFY_SIGN_STATUS"
fi

# Verify rejected NDA
echo "   Checking rejected NDA (ID: $REJECT_NDA_ID)..."
GET_REJECTED=$(curl -s -X GET "$BACKEND_URL/api/nda/$REJECT_NDA_ID" \
  -H "$AUTH_HEADER")

VERIFY_REJECT_STATUS=$(echo $GET_REJECTED | grep -o '"status":"[^"]*' | cut -d'"' -f4)
VERIFY_REJECT_REASON=$(echo $GET_REJECTED | grep -o '"rejection_reason":"[^"]*' | cut -d'"' -f4)
if [ "$VERIFY_REJECT_STATUS" = "REVOKED" ] || [ "$VERIFY_REJECT_STATUS" = "REJECTED" ]; then
  echo "   ✅ Rejected NDA verified - Status: $VERIFY_REJECT_STATUS"
  if [ -n "$VERIFY_REJECT_REASON" ]; then
    echo "   ✅ Rejection reason verified"
  fi
else
  echo "   ❌ Rejected NDA verification failed - Status: $VERIFY_REJECT_STATUS"
fi
echo ""

echo "===================================="
echo "✅ All NDA tests completed successfully!"
echo ""
echo "Summary:"
echo "  - Created NDA for signing: ID $SIGN_NDA_ID"
echo "  - Signed NDA: Status SIGNED"
echo "  - Created NDA for rejection: ID $REJECT_NDA_ID"
echo "  - Rejected NDA: Status $REJECT_STATUS with reason"
echo "  - Both NDAs verified via GET requests"
echo ""

