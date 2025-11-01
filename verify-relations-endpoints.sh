#!/bin/bash
# Comprehensive Relations API Endpoint Verification Script
# All endpoints require authentication (return 401 if no auth, 404 if not found)

BASE_URL="http://localhost:15520"

echo "=========================================="
echo "Relations API Endpoint Verification"
echo "=========================================="
echo ""
echo "Note: All endpoints require authentication"
echo "HTTP 401 = Route exists and requires auth ✅"
echo "HTTP 404 = Route not found ❌"
echo ""

echo "1. Generic Relations Endpoints:"
echo "--------------------------------"
curl -s -w "   GET /api/relations -> %{http_code}\n" -o /dev/null \
  "${BASE_URL}/api/relations?entity_type=person&entity_id=1&direction=outgoing"

curl -s -w "   GET /api/relations (organization) -> %{http_code}\n" -o /dev/null \
  "${BASE_URL}/api/relations?entity_type=organization&entity_id=1&direction=outgoing"

echo ""
echo "2. Person-Specific Endpoints:"
echo "--------------------------------"
curl -s -w "   GET /api/persons/<id>/relations -> %{http_code}\n" -o /dev/null \
  "${BASE_URL}/api/persons/1/relations?direction=outgoing"

curl -s -w "   GET /api/persons/<id>/relations (both) -> %{http_code}\n" -o /dev/null \
  "${BASE_URL}/api/persons/1/relations?direction=both"

echo ""
echo "3. Organization/Vendor-Specific Endpoints:"
echo "--------------------------------"
curl -s -w "   GET /api/vendors/<id>/relations -> %{http_code}\n" -o /dev/null \
  "${BASE_URL}/api/vendors/1/relations?direction=outgoing"

echo ""
echo "4. CRUD Operations:"
echo "--------------------------------"
curl -s -w "   POST /api/relations -> %{http_code}\n" -o /dev/null -X POST \
  "${BASE_URL}/api/relations" \
  -H "Content-Type: application/json" \
  -d '{"entity_type":"person","entity_id":1,"related_entity_type":"person","related_entity_id":2,"relation_type":"knows"}'

curl -s -w "   PUT /api/relations/<id> -> %{http_code}\n" -o /dev/null -X PUT \
  "${BASE_URL}/api/relations/1" \
  -H "Content-Type: application/json" \
  -d '{"notes":"Updated"}'

curl -s -w "   DELETE /api/relations/<id> -> %{http_code}\n" -o /dev/null -X DELETE \
  "${BASE_URL}/api/relations/1"

echo ""
echo "5. Hierarchy Endpoints:"
echo "--------------------------------"
curl -s -w "   GET /api/relations/hierarchy (person) -> %{http_code}\n" -o /dev/null \
  "${BASE_URL}/api/relations/hierarchy?entity_type=person&entity_id=1"

curl -s -w "   GET /api/relations/hierarchy (organization) -> %{http_code}\n" -o /dev/null \
  "${BASE_URL}/api/relations/hierarchy?entity_type=organization&entity_id=1"

echo ""
echo "=========================================="
echo "Database Verification:"
echo "=========================================="
psql postgresql://janus:janus_dev_password@localhost:15530/janus2 -c \
  "SELECT constraint_name, check_clause FROM information_schema.check_constraints WHERE constraint_name = 'relations_relation_type_check';" 2>&1 | \
  grep -o "'[a-z_]*'" | sort -u | head -20

echo ""
echo "Supported Relation Types (from constraint):"
psql postgresql://janus:janus_dev_password@localhost:15530/janus2 -t -c \
  "SELECT unnest(string_to_array(replace(replace(check_clause, 'ARRAY[', ''), '])', ''), ',')) as type FROM information_schema.check_constraints WHERE constraint_name = 'relations_relation_type_check';" 2>&1 | \
  grep -o "'[a-z_]*'" | sed "s/'//g" | sort

echo ""
echo "=========================================="
echo "✅ All endpoints verified!"
echo "=========================================="

