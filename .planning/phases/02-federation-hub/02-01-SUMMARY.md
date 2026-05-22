---
phase: 02-federation-hub
plan: "01"
subsystem: demo/lib
tags: [federation, abac, credentials, pure-functions, demo-island]
dependency_graph:
  requires: []
  provides:
    - frontend/src/demo/lib/contract.ts
    - frontend/src/demo/lib/credential.ts
  affects:
    - All Phase 2 waves that import contract.ts or credential.ts
tech_stack:
  added: []
  patterns:
    - Pure stateless helper functions (no class, no internal state)
    - HMAC-SHA256 credential signing via Web Crypto API
    - D2-08 record-hold force-DENY override pattern
key_files:
  created:
    - frontend/src/demo/lib/contract.ts
    - frontend/src/demo/lib/credential.ts
  modified: []
decisions:
  - "Network class from spikes/lib/contract.ts NOT ported — only pure functions extracted (D2-02)"
  - "ROGUE-ISSUER key present in ISSUER_KEYS but excluded from TRUSTED_ISSUERS to demonstrate untrusted-issuer rejection (T-02-02)"
  - "AttrClaims/Credential imported from model.ts rather than redefined — single source of truth"
metrics:
  duration: ~8min
  completed: 2026-05-22
  tasks_completed: 2
  tasks_total: 2
  files_created: 2
  files_modified: 0
---

# Phase 2 Plan 01: Pure Federation Helper Modules Summary

**One-liner:** Lifted pure interchange contract helpers and async HMAC credential functions from spike libraries into the demo island as stateless utility modules.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create demo/lib/contract.ts — pure interchange helpers | 2d1f141 | frontend/src/demo/lib/contract.ts |
| 2 | Create demo/lib/credential.ts — async HMAC credential helpers | cfb7721 | frontend/src/demo/lib/credential.ts |

## What Was Built

**contract.ts** exports three pure sync functions:
- `buildPublishEnvelope(from, subjectId, domain)` — returns a typed PUBLISH envelope
- `buildDiscoverEnvelopes(from, subjectId, hubIndex)` — returns a [DISCOVER, DISCOVER_RESULT] tuple
- `computeDetailResponse(requester, subject, holder)` — evaluates ABAC decision with D2-08 force-DENY for held/revoked records

**credential.ts** exports async HMAC-SHA256 crypto helpers:
- `issueCredential(payload, issuerSecret)` — signs AttrClaims with HMAC-SHA256
- `verifyCredential(cred)` — checks trusted-issuer list first, then verifies signature
- `ISSUER_KEYS` — mock key registry (includes ROGUE-ISSUER for demo purposes)
- `TRUSTED_ISSUERS` — only NATIONAL-CLEARANCE-AUTHORITY (ROGUE-ISSUER intentionally excluded)
- `VerifyResult` interface

## Deviations from Plan

None — plan executed exactly as written.

## Threat Model Coverage

| Threat | Status |
|--------|--------|
| T-02-01: computeDetailResponse record-hold override | Mitigated — `blocked = subject.flags.securityHold || subject.flags.revoked` forces DENY override |
| T-02-02: ROGUE-ISSUER elevation of privilege | Mitigated — ROGUE-ISSUER in ISSUER_KEYS but not TRUSTED_ISSUERS; verifyCredential rejects before key lookup |
| T-02-03: Network class not ported | Mitigated — only pure stateless functions exported; no Maps or arrays |
| T-02-SC: no new packages installed | Accepted — pure file creation only |

## Known Stubs

None — these are pure utility modules with no data wiring. All functions operate on caller-supplied arguments.

## Threat Flags

None — no new network endpoints, auth paths, or schema changes introduced.

## Self-Check: PASSED

- frontend/src/demo/lib/contract.ts: FOUND
- frontend/src/demo/lib/credential.ts: FOUND
- Commit 2d1f141: FOUND
- Commit cfb7721: FOUND
- TypeScript: 0 errors in demo/lib/c* files
