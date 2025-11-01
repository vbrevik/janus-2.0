# Janus 2.0 - API Design & Endpoints

## Document Purpose

This document provides API design guidelines and conventions. **For the complete list of all endpoints, see [README.md](../README.md#api-endpoints-50-total)**.

---

## API Design Principles

### RESTful Conventions
- **GET**: Read operations (idempotent, no side effects)
- **POST**: Create operations
- **PUT**: Update operations (full or partial replacement)
- **DELETE**: Delete operations

### URL Structure
```
/api/<resource>           # List/create
/api/<resource>/:id        # Get/update/delete specific item
/api/<resource>/:id/<action>  # Specific actions (e.g., /sign, /reject)
```

### Response Format

**Success Response**:
```json
{
  "id": 1,
  "name": "Example",
  "created_at": "2025-01-30T12:00:00Z"
}
```

**Error Response**:
```json
{
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

---

## Authentication

All endpoints (except `/api/auth/login` and `/api/health`) require authentication:

```
Authorization: Bearer <jwt_token>
```

**Token Format**: JWT with 8-hour expiry

---

## Pagination

List endpoints support pagination:
```
GET /api/<resource>?page=1&per_page=20
```

**Response**:
```json
{
  "items": [...],
  "total": 100,
  "page": 1,
  "per_page": 20,
  "total_pages": 5
}
```

---

## Complete API Reference

**See main [README.md](../README.md#api-endpoints-50-total)** for complete list of 50+ endpoints organized by category:

- Core (health, stats)
- Authentication
- Personnel
- Vendors
- Vendor Relations
- Access Control
- Information Systems
- Audit Logs
- Roles & Permissions
- NDAs
- Discussions
- Document References

---

## Endpoint Conventions

### Resource Naming
- Plural nouns: `/api/personnel`, `/api/vendors`
- Lowercase with hyphens: `/api/info-systems`, `/api/vendor-relations`

### Query Parameters
- `page` - Page number (default: 1)
- `per_page` - Items per page (default: 20, max: 100)
- Filter parameters vary by resource

### Status Codes
- `200 OK` - Success
- `201 Created` - Resource created
- `204 No Content` - Success (no body)
- `400 Bad Request` - Invalid input
- `401 Unauthorized` - Missing/invalid token
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

---

## API Client Usage

**Frontend API Client** (`lib/api.ts`):
```typescript
import { api } from '@/lib/api'

// GET request
const data = await api.get<Personnel>('/personnel/1')

// POST request
const created = await api.post<Personnel>('/personnel', { 
  first_name: 'John',
  last_name: 'Doe'
})

// PUT request
const updated = await api.put<Personnel>('/personnel/1', {
  position: 'Updated Position'
})

// DELETE request
await api.delete('/personnel/1')
```

---

## Testing APIs

**Using curl**:
```bash
# Login
curl -X POST http://localhost:15520/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password123"}'

# Use token in subsequent requests
curl http://localhost:15520/api/personnel \
  -H "Authorization: Bearer <token>"
```

---

**Last Updated**: 2025-01-30  
**Total Endpoints**: 50+  
**Documentation**: Complete list in main README.md

