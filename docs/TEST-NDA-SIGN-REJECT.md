# Testing NDA Sign and Reject Features

This document explains how to test both NDA signing and rejection flows.

---

## Prerequisites

1. **Start Backend**:
   ```bash
   cd backend
   cargo run
   # Backend should run on http://localhost:15520
   ```

2. **Start Database** (if not already running):
   ```bash
   docker-compose up -d postgres
   ```

3. **Run Migrations** (if not already applied):
   ```bash
   cd backend
   sqlx migrate run
   ```

4. **Verify Backend Health**:
   ```bash
   curl http://localhost:15520/api/health
   ```

---

## Test Method 1: Manual Script (Recommended)

Run the automated test script:

```bash
./test-nda-manual.sh
```

This script will:
1. ✅ Login as admin
2. ✅ Find a test personnel
3. ✅ Create an NDA for signing
4. ✅ Sign the NDA
5. ✅ Create an NDA for rejection
6. ✅ Reject the NDA with reason
7. ✅ Verify both via GET requests

**Expected Output**:
- Signed NDA: Status = `SIGNED`, `signed_at` timestamp set
- Rejected NDA: Status = `REVOKED`, `rejection_reason` stored

---

## Test Method 2: Manual API Testing

### Step 1: Login
```bash
curl -X POST http://localhost:15520/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password123"}'
```

Save the `token` from the response.

### Step 2: Get Personnel ID
```bash
TOKEN="your-token-here"

curl -X GET "http://localhost:15520/api/personnel?per_page=10" \
  -H "Authorization: Bearer $TOKEN"
```

Note the `id` of any personnel record.

### Step 3: Create NDA for Signing Test
```bash
PERSONNEL_ID=1  # Replace with actual ID

curl -X POST http://localhost:15520/api/nda \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"personnel_id\": $PERSONNEL_ID,
    \"title\": \"Test NDA - Sign Flow\",
    \"content\": \"This NDA will be signed for testing.\",
    \"version\": \"1.0\"
  }"
```

Save the `id` from the response (let's call it `NDA_ID_1`).

### Step 4: Sign the NDA
```bash
NDA_ID_1=1  # Replace with actual NDA ID

curl -X POST "http://localhost:15520/api/nda/$NDA_ID_1/sign" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"signature\": \"Signed by Test User at $(date -u +%Y-%m-%dT%H:%M:%SZ)\"
  }"
```

**Verify**:
- Response should show `"status": "SIGNED"`
- `signed_at` field should be set
- `signature` field should contain the signature text

### Step 5: Create NDA for Rejection Test
```bash
curl -X POST http://localhost:15520/api/nda \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"personnel_id\": $PERSONNEL_ID,
    \"title\": \"Test NDA - Reject Flow\",
    \"content\": \"This NDA will be rejected for testing.\",
    \"version\": \"1.0\"
  }"
```

Save the `id` from the response (let's call it `NDA_ID_2`).

### Step 6: Reject the NDA
```bash
NDA_ID_2=2  # Replace with actual NDA ID

curl -X POST "http://localhost:15520/api/nda/$NDA_ID_2/reject" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"reason\": \"Test rejection: NDA content is unclear and does not meet our requirements\"
  }"
```

**Verify**:
- Response should show `"status": "REVOKED"` (or `"REJECTED"`)
- `rejection_reason` field should contain the reason text

### Step 7: Verify Both NDAs
```bash
# Check signed NDA
curl -X GET "http://localhost:15520/api/nda/$NDA_ID_1" \
  -H "Authorization: Bearer $TOKEN"

# Check rejected NDA
curl -X GET "http://localhost:15520/api/nda/$NDA_ID_2" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Test Method 3: Playwright E2E Tests

Run Playwright tests (requires both frontend and backend running):

```bash
cd frontend
npx playwright test e2e/nda.spec.ts
```

**Prerequisites**:
- Backend running on `http://localhost:15520`
- Frontend dev server running on `http://localhost:15510`
- Database migrations applied

---

## Expected Test Results

### Signing Flow ✅
- NDA created with status `PENDING` or `ACTIVE`
- After signing:
  - Status changes to `SIGNED`
  - `signed_at` timestamp is set
  - `signature` field contains the signature
- GET request returns signed NDA with all metadata

### Rejection Flow ✅
- NDA created with status `PENDING` or `ACTIVE`
- After rejection:
  - Status changes to `REVOKED` (or `REJECTED`)
  - `rejection_reason` field contains the reason
  - `rejection_reason` is persisted in database
- GET request returns rejected NDA with rejection reason

---

## Troubleshooting

### Backend Not Running
```bash
# Check if backend is running
curl http://localhost:15520/api/health

# If not running, start it:
cd backend
cargo run
```

### Migration Errors
```bash
cd backend
sqlx migrate run
```

### Authentication Errors
- Verify credentials: `admin` / `password123`
- Check token is included in `Authorization: Bearer <token>` header
- Token expires after 8 hours - re-login if needed

### Database Connection Errors
```bash
# Check PostgreSQL is running
docker-compose ps

# Start if needed
docker-compose up -d postgres
```

---

## Quick Test Summary

**What Gets Tested**:
1. ✅ Admin can create NDA via API
2. ✅ Enduser (via API) can sign NDA
3. ✅ Enduser (via API) can reject NDA with reason
4. ✅ Metadata is stored correctly (signed_at, rejection_reason)
5. ✅ GET requests return correct status and metadata

**Manual Test Time**: ~2-3 minutes
**Automated Script Time**: ~30 seconds

---

**Status**: ✅ All test methods ready - Choose based on your preference!

