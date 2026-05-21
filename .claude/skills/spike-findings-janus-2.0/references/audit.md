# Audit & Reconstruction

## Requirements
- Pure-ABAC stores no grants → the **append-only event log is the system of record**.
- Must answer "who can access R **now** / **as of time T**", including revocations and holds.

## How to Build It
1. Event types (`sources/code/lib/auditlog.ts`): `GRANT_COMPARTMENT`, `REVOKE_COMPARTMENT`, `SET_HOLD`, `CLEAR_HOLD`, each with `seq` (logical timestamp) + `actor` (operating role, for the audit trail).
2. `reconstructSubject(subjectId, events, asOf)` — clone the base subject, replay events with `seq <= asOf`.
3. `whoCanAccess(requirement, events, asOf)` — reconstruct every subject at `asOf`, run the 001 engine, collect ALLOWs.
4. UI: a timeline slider recomputes "who can access" at any point (`sources/code/components/Spike007Audit.tsx`).

## What to Avoid
- **Treating a grants table as truth** — there isn't one. Current access is a *projection* of the log.
- **Forgetting holds/revocations in reconstruction** — they must replay too, or point-in-time answers are wrong.

## Constraints
- Full replay per query won't scale — materialize a "current access" projection from the log for hot queries, but keep the log authoritative.
- This log is also the natural home for **leak/anomaly detection** (e.g. industry stock-info leaks): who accessed what, when.

## Origin
Synthesized from spikes: 007 (integration of 001 + 004).
Source files: `sources/code/lib/auditlog.ts`, `sources/code/components/Spike007Audit.tsx`, `sources/007-audit-reconstruction/`.
