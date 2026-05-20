---
spike: 004
name: role-sod
type: standard
validates: "Given the 8 operating roles, when acting as Approver vs Manager vs Auditor vs others, then available actions over a shared decision differ per role (separation of duties)"
verdict: VALIDATED
related: [001]
tags: [rbac, sod]
---

# Spike 004: Role separation of duties

## What This Validates
The 8 operating roles are distinct and coherent: over ONE shared access decision, each role's available
actions differ — Approver decides, Manager only requests, Security Officer can hold, Auditor is read-only,
Admin/Sponsor/Subject hold no decision authority.

## How to Run
`cd frontend && npm run dev`, open `/spikes.html`, tab **004 · Role SoD**.

## What to Expect
Scenario: Dana → "Project Aurora Brief" (DATA·RESTRICTED·needs BLACKWING), initially DENY (missing
BLACKWING). Switch roles to see action sets change:
- **Access Approver** — grant/revoke BLACKWING → flips DENY↔ALLOW.
- **Security Officer** — place a hold → deny override flips ALLOW→DENY.
- **Manager** — request only (logged, no effect).
- **Auditor** — read-only; sees the evaluation/action log.
- **Admin / Sponsor / Subject** — "no access-decision authority (separation of duties)".

## Investigation Trail
- Reused the 001 engine; role → allowed-ops mapping drives which mutations are offered.
- Confirmed the strict-SoD decision (Admin has NO grant power) renders as a locked-out state.

## Results
**VALIDATED.** Separation of duties is legible and the 8 roles each have a clear, non-overlapping place.
The deny-override (Security Officer hold) demonstrates revocation under pure-ABAC without stored grants.

**Signal:** 8 roles did not feel like overkill in this scenario — each maps to a distinct action set.
The action/evaluation log doubles as the audit system-of-record (ties to 001's audit signal).
