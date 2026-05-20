---
spike: 007
name: audit-reconstruction
type: integration
validates: "Given an append-only event log, when asked who can access R now / as of time T, then it reconstructs correctly including revocations and holds"
verdict: VALIDATED
related: [001, 004]
tags: [audit, abac]
---

# Spike 007: Audit reconstruction

## What This Validates
Pure-ABAC stores no grants — so "who has access?" must be answered by **replaying the append-only log**. Reconstructs subject attribute state and access decisions at any point in time. Closes the audit caveat surfaced by 001/004 (AUTH-MODEL Q#6).

## How to Run
- UI: `npm run dev`, `/spikes.html`, tab **007 · Audit**.
- Logic: `npx vitest run src/spikes/lib/auditlog.test.ts` (5 tests).

## What to Expect
Drag the timeline. Resource = Project Aurora Brief (needs BLACKWING). T0 nobody → T1 Dana (granted BLACKWING) → T2 nobody (security hold) → T3 Dana again (hold cleared). Reconstructed state + "who can access" recompute at each point.

## Investigation Trail
- Events: GRANT/REVOKE compartment, SET/CLEAR hold, each with `seq` + `actor`. `reconstructSubject` replays events ≤ asOf onto the base subject; `whoCanAccess` evaluates every reconstructed subject against the resource.

## Results
**VALIDATED** (5/5). Point-in-time and current access both reconstruct correctly, including revocations and holds. The eval/event log doubles as the audit system-of-record.

**Signal:** for scale, "current access" would be a materialized projection of the log rather than a full replay each query — but the log remains authoritative. Also the natural home for leak/anomaly detection (who accessed what, when).
