#!/bin/bash
# Test script for Relations API endpoints
# Usage: ./test-relations-api.sh

BASE_URL="http://localhost:15520"
PERSONNEL_ID=1
VENDOR_ID=1
VENDOR_ID_2=2

echo "=== Relations API Test Suite ==="
echo ""

echo "1. GET /api/relations (generic - vendor)"
curl -s "${BASE_URL}/api/relations?entity_type=vendor&entity_id=${VENDOR_ID}&direction=outgoing" | jq '.' 2>/dev/null || echo "Failed"
echo ""

echo "2. GET /api/relations (generic - personnel)"
curl -s "${BASE_URL}/api/relations?entity_type=personnel&entity_id=${PERSONNEL_ID}&direction=outgoing" | jq '.' 2>/dev/null || echo "Failed"
echo ""

echo "3. GET /api/personnel/${PERSONNEL_ID}/relations"
curl -s "${BASE_URL}/api/personnel/${PERSONNEL_ID}/relations?direction=outgoing" | jq '.' 2>/dev/null || echo "Failed"
echo ""

echo "4. GET /api/vendors/${VENDOR_ID}/relations"
curl -s "${BASE_URL}/api/vendors/${VENDOR_ID}/relations?direction=outgoing" | jq '.' 2>/dev/null || echo "Failed"
echo ""

echo "5. POST /api/relations (create personnel-vendor relation)"
RELATION_ID=$(curl -s -X POST "${BASE_URL}/api/relations" \
  -H "Content-Type: application/json" \
  -d "{
    \"entity_type\": \"personnel\",
    \"entity_id\": ${PERSONNEL_ID},
    \"related_entity_type\": \"vendor\",
    \"related_entity_id\": ${VENDOR_ID_2},
    \"relation_type\": \"consultant\",
    \"notes\": \"Test relation created via curl\",
    \"valid_from\": \"2025-01-15\"
  }" | jq -r '.data.id' 2>/dev/null)
echo "Created relation ID: ${RELATION_ID}"
echo ""

if [ ! -z "$RELATION_ID" ] && [ "$RELATION_ID" != "null" ]; then
  echo "6. GET /api/relations/${RELATION_ID} (verify created)"
  curl -s "${BASE_URL}/api/personnel/${PERSONNEL_ID}/relations?direction=outgoing" | jq ".data[] | select(.id == ${RELATION_ID})" 2>/dev/null || echo "Failed"
  echo ""
  
  echo "7. PUT /api/relations/${RELATION_ID} (update)"
  curl -s -X PUT "${BASE_URL}/api/relations/${RELATION_ID}" \
    -H "Content-Type: application/json" \
    -d '{
      "notes": "Updated note via curl",
      "valid_until": "2025-12-31"
    }' | jq '.' 2>/dev/null || echo "Failed"
  echo ""
  
  echo "8. DELETE /api/relations/${RELATION_ID}"
  curl -s -X DELETE "${BASE_URL}/api/relations/${RELATION_ID}" | jq '.' 2>/dev/null || echo "Failed"
  echo ""
fi

echo "9. GET /api/relations/hierarchy (vendor)"
curl -s "${BASE_URL}/api/relations/hierarchy?entity_type=vendor&entity_id=${VENDOR_ID}" | jq '.' 2>/dev/null || echo "Failed"
echo ""

echo "10. GET /api/relations/hierarchy (personnel)"
curl -s "${BASE_URL}/api/relations/hierarchy?entity_type=personnel&entity_id=${PERSONNEL_ID}" | jq '.' 2>/dev/null || echo "Failed"
echo ""

echo "=== Test Suite Complete ==="

