#!/bin/bash

# NDA Endpoints Verification Script
# Tests all 7 NDA endpoints with curl

BASE_URL="http://localhost:15520"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================="
echo "NDA Endpoints Verification Test"
echo "========================================="
echo ""

# Step 1: Login and get token
echo -e "${YELLOW}Step 1: Authenticating...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password123"}')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo -e "${RED}❌ Authentication failed${NC}"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✅ Authenticated successfully${NC}"
echo "Token: ${TOKEN:0:20}..."
echo ""

# Step 2: Get a personnel ID (needed for creating NDA)
echo -e "${YELLOW}Step 2: Getting personnel ID...${NC}"
PERSONNEL_RESPONSE=$(curl -s -X GET "$BASE_URL/api/personnel?per_page=1" \
  -H "Authorization: Bearer $TOKEN")

PERSONNEL_ID=$(echo $PERSONNEL_RESPONSE | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)

if [ -z "$PERSONNEL_ID" ]; then
  echo -e "${RED}❌ No personnel found, creating one...${NC}"
  # Try to create a test personnel
  CREATE_PERSONNEL=$(curl -s -X POST "$BASE_URL/api/personnel" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"first_name":"Test","last_name":"NDA","email":"test.nda@example.com","phone":"555-0000","department":"Testing","position":"Test","clearance_level":"SECRET"}')
  PERSONNEL_ID=$(echo $CREATE_PERSONNEL | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
fi

if [ -z "$PERSONNEL_ID" ]; then
  echo -e "${RED}❌ Could not get/create personnel ID${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Using personnel ID: $PERSONNEL_ID${NC}"
echo ""

# Step 3: Test GET /api/nda (List NDAs)
echo -e "${YELLOW}Step 3: Testing GET /api/nda (List NDAs)${NC}"
LIST_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X GET "$BASE_URL/api/nda" \
  -H "Authorization: Bearer $TOKEN")
HTTP_STATUS=$(echo "$LIST_RESPONSE" | grep "HTTP_STATUS" | cut -d':' -f2)
BODY=$(echo "$LIST_RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "200" ]; then
  echo -e "${GREEN}✅ GET /api/nda - SUCCESS${NC}"
  echo "Response preview: $(echo $BODY | cut -c1-100)..."
else
  echo -e "${RED}❌ GET /api/nda - FAILED (HTTP $HTTP_STATUS)${NC}"
  echo "Response: $BODY"
fi
echo ""

# Step 4: Test POST /api/nda (Create NDA)
echo -e "${YELLOW}Step 4: Testing POST /api/nda (Create NDA)${NC}"
CREATE_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$BASE_URL/api/nda" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"personnel_id\":$PERSONNEL_ID,\"title\":\"Test NDA - $(date +%s)\",\"content\":\"This is a test NDA content for endpoint verification.\",\"version\":\"1.0\",\"expires_at\":\"2025-12-31\"}")
HTTP_STATUS=$(echo "$CREATE_RESPONSE" | grep "HTTP_STATUS" | cut -d':' -f2)
BODY=$(echo "$CREATE_RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "200" ]; then
  echo -e "${GREEN}✅ POST /api/nda - SUCCESS${NC}"
  NDA_ID=$(echo $BODY | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
  echo "Created NDA ID: $NDA_ID"
else
  echo -e "${RED}❌ POST /api/nda - FAILED (HTTP $HTTP_STATUS)${NC}"
  echo "Response: $BODY"
  exit 1
fi
echo ""

# Step 5: Test GET /api/nda/:id (Get NDA by ID)
echo -e "${YELLOW}Step 5: Testing GET /api/nda/$NDA_ID${NC}"
GET_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X GET "$BASE_URL/api/nda/$NDA_ID" \
  -H "Authorization: Bearer $TOKEN")
HTTP_STATUS=$(echo "$GET_RESPONSE" | grep "HTTP_STATUS" | cut -d':' -f2)
BODY=$(echo "$GET_RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "200" ]; then
  echo -e "${GREEN}✅ GET /api/nda/$NDA_ID - SUCCESS${NC}"
  echo "Response preview: $(echo $BODY | cut -c1-150)..."
else
  echo -e "${RED}❌ GET /api/nda/$NDA_ID - FAILED (HTTP $HTTP_STATUS)${NC}"
  echo "Response: $BODY"
fi
echo ""

# Step 6: Test POST /api/nda/:id/sign (Sign NDA)
echo -e "${YELLOW}Step 6: Testing POST /api/nda/$NDA_ID/sign${NC}"
SIGN_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$BASE_URL/api/nda/$NDA_ID/sign" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"signature":"Test User Signature"}')
HTTP_STATUS=$(echo "$SIGN_RESPONSE" | grep "HTTP_STATUS" | cut -d':' -f2)
BODY=$(echo "$SIGN_RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "200" ]; then
  echo -e "${GREEN}✅ POST /api/nda/$NDA_ID/sign - SUCCESS${NC}"
  STATUS=$(echo $BODY | grep -o '"status":"[^"]*' | cut -d'"' -f4)
  echo "NDA Status after signing: $STATUS"
else
  echo -e "${RED}❌ POST /api/nda/$NDA_ID/sign - FAILED (HTTP $HTTP_STATUS)${NC}"
  echo "Response: $BODY"
fi
echo ""

# Step 7: Create another NDA for reject test
echo -e "${YELLOW}Step 7: Creating NDA for reject test...${NC}"
CREATE_NDA2=$(curl -s -X POST "$BASE_URL/api/nda" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"personnel_id\":$PERSONNEL_ID,\"title\":\"Test NDA Reject - $(date +%s)\",\"content\":\"This is a test NDA for rejection testing.\",\"version\":\"1.0\"}")
NDA_ID2=$(echo $CREATE_NDA2 | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
echo "Created NDA ID for reject: $NDA_ID2"
echo ""

# Step 8: Test POST /api/nda/:id/reject (Reject NDA)
echo -e "${YELLOW}Step 8: Testing POST /api/nda/$NDA_ID2/reject${NC}"
REJECT_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$BASE_URL/api/nda/$NDA_ID2/reject" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason":"Test rejection reason"}')
HTTP_STATUS=$(echo "$REJECT_RESPONSE" | grep "HTTP_STATUS" | cut -d':' -f2)
BODY=$(echo "$REJECT_RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "200" ]; then
  echo -e "${GREEN}✅ POST /api/nda/$NDA_ID2/reject - SUCCESS${NC}"
  STATUS=$(echo $BODY | grep -o '"status":"[^"]*' | cut -d'"' -f4)
  REASON=$(echo $BODY | grep -o '"rejection_reason":"[^"]*' | cut -d'"' -f4)
  echo "NDA Status after rejection: $STATUS"
  echo "Rejection reason: $REASON"
else
  echo -e "${RED}❌ POST /api/nda/$NDA_ID2/reject - FAILED (HTTP $HTTP_STATUS)${NC}"
  echo "Response: $BODY"
fi
echo ""

# Step 9: Create another NDA for status update test
echo -e "${YELLOW}Step 9: Creating NDA for status update test...${NC}"
CREATE_NDA3=$(curl -s -X POST "$BASE_URL/api/nda" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"personnel_id\":$PERSONNEL_ID,\"title\":\"Test NDA Status - $(date +%s)\",\"content\":\"This is a test NDA for status update testing.\",\"version\":\"1.0\"}")
NDA_ID3=$(echo $CREATE_NDA3 | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
echo "Created NDA ID for status update: $NDA_ID3"
echo ""

# Step 10: Test PUT /api/nda/:id/status (Update NDA Status)
echo -e "${YELLOW}Step 10: Testing PUT /api/nda/$NDA_ID3/status${NC}"
UPDATE_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X PUT "$BASE_URL/api/nda/$NDA_ID3/status" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"ACTIVE"}')
HTTP_STATUS=$(echo "$UPDATE_RESPONSE" | grep "HTTP_STATUS" | cut -d':' -f2)
BODY=$(echo "$UPDATE_RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "200" ]; then
  echo -e "${GREEN}✅ PUT /api/nda/$NDA_ID3/status - SUCCESS${NC}"
  STATUS=$(echo $BODY | grep -o '"status":"[^"]*' | cut -d'"' -f4)
  echo "NDA Status after update: $STATUS"
else
  echo -e "${RED}❌ PUT /api/nda/$NDA_ID3/status - FAILED (HTTP $HTTP_STATUS)${NC}"
  echo "Response: $BODY"
fi
echo ""

# Step 11: Create another NDA for delete test
echo -e "${YELLOW}Step 11: Creating NDA for delete test...${NC}"
CREATE_NDA4=$(curl -s -X POST "$BASE_URL/api/nda" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"personnel_id\":$PERSONNEL_ID,\"title\":\"Test NDA Delete - $(date +%s)\",\"content\":\"This is a test NDA for delete testing.\",\"version\":\"1.0\"}")
NDA_ID4=$(echo $CREATE_NDA4 | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
echo "Created NDA ID for delete: $NDA_ID4"
echo ""

# Step 12: Test DELETE /api/nda/:id (Delete NDA)
echo -e "${YELLOW}Step 12: Testing DELETE /api/nda/$NDA_ID4${NC}"
DELETE_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X DELETE "$BASE_URL/api/nda/$NDA_ID4" \
  -H "Authorization: Bearer $TOKEN")
HTTP_STATUS=$(echo "$DELETE_RESPONSE" | grep "HTTP_STATUS" | cut -d':' -f2)
BODY=$(echo "$DELETE_RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "200" ]; then
  echo -e "${GREEN}✅ DELETE /api/nda/$NDA_ID4 - SUCCESS${NC}"
else
  echo -e "${RED}❌ DELETE /api/nda/$NDA_ID4 - FAILED (HTTP $HTTP_STATUS)${NC}"
  echo "Response: $BODY"
fi
echo ""

# Step 13: Test with filters
echo -e "${YELLOW}Step 13: Testing GET /api/nda with filters${NC}"
FILTER_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X GET "$BASE_URL/api/nda?personnel_id=$PERSONNEL_ID&status=PENDING" \
  -H "Authorization: Bearer $TOKEN")
HTTP_STATUS=$(echo "$FILTER_RESPONSE" | grep "HTTP_STATUS" | cut -d':' -f2)
BODY=$(echo "$FILTER_RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "200" ]; then
  echo -e "${GREEN}✅ GET /api/nda?personnel_id=$PERSONNEL_ID&status=PENDING - SUCCESS${NC}"
  echo "Filtered response received"
else
  echo -e "${RED}❌ GET /api/nda with filters - FAILED (HTTP $HTTP_STATUS)${NC}"
  echo "Response: $BODY"
fi
echo ""

echo "========================================="
echo -e "${GREEN}✅ NDA Endpoints Verification Complete!${NC}"
echo "========================================="
