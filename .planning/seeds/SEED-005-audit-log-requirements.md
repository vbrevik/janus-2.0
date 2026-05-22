---
id: SEED-005
status: dormant
planted: 2026-05-22
planted_during: v2.0 Authorization Hub (demo), Phase 2 complete (deferred — finish v2.0 first)
trigger_when: when hardening the audit log toward production, when defining what must be logged/retained/protected, or alongside v2.0 Phase 3 (Audit & Context)
scope: Medium
---

# SEED-005: Audit log requirements

Requirements for Janus's audit log — the **system of record**. In pure-ABAC, no grants are stored,
so "who has access" is *computed*, and the append-only event/evaluation log is the only authoritative
history. This seed captures what that log must guarantee, grounded in the validated spike-007 design
and anchored to standards control families.

## Relationship to v2.0 (overlaps — coordinate, don't duplicate)

The audit log is **central to v2.0**, not a contradiction. v2.0 **Phase 3 (Audit & Context)** already
builds the demo audit + point-in-time reconstruction + leak/anomaly detection. This seed is the
**requirements / production-hardening** view (standards-grounded retention, tamper-evidence,
protection). When this surfaces, reconcile against whatever Phase 3 ships so they don't diverge.

## Already validated (spike 007 — VALIDATED 5/5)

- **Append-only event log** of GRANT/REVOKE compartment, SET/CLEAR hold — each with `seq` + `actor`.
- **Replay reconstruction:** `reconstructSubject` replays events ≤ asOf onto the base subject;
  `whoCanAccess` evaluates reconstructed subjects against a resource. Point-in-time AND current access
  both reconstruct correctly, including revocations and holds.
- **The eval/event log doubles as the audit system-of-record** (AUTH-MODEL.md: "Audit = logging
  policy *evaluations*; who has access right now is computed, not stored").
- **Scale signal:** "current access" should be a *materialized projection* of the log, but the log
  stays authoritative. The log is also the natural home for **leak/anomaly detection** (industry
  stock-info leaks — spike 007 / AUTH-MODEL).
- **Access:** Auditor/Compliance role = read-only everywhere, owns the audit/evaluation log.

## Requirements (to formalize)

1. **Completeness — what to log.** Every access decision (ALLOW/DENY + per-rule trace), every
   attribute change (grant/revoke/hold set/clear), authentication events, admin actions, and every
   cross-entity exchange (discovery, handshake, credential issue/verify, release). [NIST AU-2]
2. **Record content.** Each entry: what happened, when (trusted timestamp), which subject/actor,
   source, outcome, and the resource/attribute involved. [NIST AU-3, AU-8]
3. **Immutability / tamper-evidence.** Append-only; entries never mutated or deleted; tamper-evident
   (e.g. hash-chain / sequence integrity). Protect the log from unauthorized access + modification.
   [NIST AU-9; ISO 8.15]
4. **Non-repudiation.** Each logged action attributable to an actor such that they cannot plausibly
   deny it (ties to SEED-004 accountability/non-repudiation; spike 006 verify-before-trust for
   cross-entity actions). [NIST AU-10]
5. **Reconstruction / replay.** Answer "who can access R now / as of time T" by replaying the log —
   including revocations and holds (validated, spike 007). [point-in-time integrity]
6. **Retention.** Define retention period per classification/legal basis; ensure capacity + failure
   handling. [NIST AU-4, AU-5, AU-11]
7. **Review / monitoring / anomaly detection.** Support review/analysis and real-time monitoring;
   leak/anomaly detection over the log. [NIST AU-6, AU-13; ISO 8.16]
8. **Evidence handling.** Log data handled to remain admissible for investigations. [ISO 5.28]
9. **Cross-entity logging.** In the federation, log exchanges across entity boundaries coherently.
   [NIST AU-16]

## Standards anchors

**NIST SP 800-53 Rev.5 — AU (Audit & Accountability) family — VERIFIED:**
AU-2 Event Logging · AU-3 Content of Audit Records · AU-4 Storage Capacity · AU-5 Response to Logging
Failures · AU-6 Review/Analysis/Reporting · AU-8 Time Stamps · AU-9 Protection of Audit Information ·
AU-10 Non-repudiation · AU-11 Audit Record Retention · AU-12 Audit Record Generation · AU-13
Monitoring for Information Disclosure · AU-16 Cross-organizational Audit Logging.
Source: https://csf.tools/reference/nist-sp-800-53/r5/au/ · https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final — VERIFIED

**ISO/IEC 27002:2022 — VERIFIED:**
8.15 Logging · 8.16 Monitoring activities · 5.28 Collection of evidence (admissibility). Linked to
incident-management controls 5.25–5.28.
Source: https://www.isms.online/iso-27002/control-8-15-logging/ · https://hightable.io/iso-27001-annex-a-8-16-monitoring-activities/ — VERIFIED

**NSM / Norwegian legal — UNVERIFIED (verify at adoption like SEED-003):**
Logging/sporbarhet requirements for skjermingsverdige informasjonssystemer under sikkerhetsloven
kap. 6 + virksomhetsikkerhetsforskriften — not fetched this session. Fetch lovdata + NSM
grunnprinsipper for IKT-sikkerhet at adoption.

## Open questions

- Tamper-evidence mechanism: hash-chain vs signed entries vs append-only DB guarantees?
- Retention period(s) by classification — what does NSM/legal require?
- Demo vs production: how much of this is in v2.0 Phase 3 vs deferred to a real build (PROJECT.md
  scopes production persistence/hardening OUT of the demo)?

## Breadcrumbs

- `.planning/spikes/007-audit-reconstruction/README.md` — validated replay/reconstruction design.
- `backend/src/audit/` (handlers/middleware/models/mod) — existing audit module.
- `.planning/AUTH-MODEL.md` — audit = logging evaluations; Auditor role; leak/anomaly detection.
- [[SEED-004]] accountability/non-repudiation properties · [[SEED-003]] access-requirements crosswalk
  (the decisions this log records).

## Notes

Captured 2026-05-22. NIST AU family + ISO 27002:2022 logging controls verified via search; NSM/legal
logging requirements left to-verify. Coordinate with v2.0 Phase 3 (Audit & Context) at adoption.
