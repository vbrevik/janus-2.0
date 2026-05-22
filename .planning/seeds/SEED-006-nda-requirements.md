---
id: SEED-006
status: dormant
planted: 2026-05-22
planted_during: v2.0 Authorization Hub (demo), Phase 2 complete (deferred — finish v2.0 first)
trigger_when: when formalizing NDA / taushetserklæring handling, when wiring the access-agreement gate into authorization, or alongside the autorisasjonssamtale form ([[SEED-002]])
scope: Medium
---

# SEED-006: NDA requirements

Requirements for non-disclosure agreements / **taushetserklæring** (declarations of secrecy) in
Janus — the signed access-agreement gate that, in the Norwegian regime, must be in place before a
person is authorized for classified information. Grounded in the existing `nda` module and anchored
to verified standards controls.

## Why This Matters

- An NDA/taushetserklæring is a **precondition of authorization**: in NO security practice the person
  signs a taushetserklæring as part of the autorisasjonssamtale ([[SEED-002]]) before access is
  granted; taushetsplikt then persists beyond the engagement. It is the contractual leg of the
  access decision ([[SEED-003]] gates).
- Janus already ships an NDA module (substrate); this seed formalizes *what it must guarantee* and
  maps it to ISO/NIST/NSM so it isn't ad-hoc.

## Relationship to v2.0

The `nda` module is **existing substrate**, NOT a v2.0 active requirement (v2.0 active scope is
ABAC/federation/audit/context). NDA sits on the authorization/personnel-security side — same boundary
as [[SEED-001]]/[[SEED-002]]. Consuming a signed-NDA fact as an attribute in the access decision is
compatible with v2.0 ("clearance external"); building the full NDA lifecycle is later/real-build work.

## Existing implementation (substrate)

- Backend `backend/src/nda/` — `handlers.rs`, `models.rs`, `mod.rs`. Lifecycle per CLAUDE.md:
  **create, sign, reject, status**.
- Frontend `frontend/src/hooks/use-nda.ts`, types `frontend/src/types/nda.ts`.
- Roles (AUTH-MODEL.md): **Security Officer** owns NDAs; **Org/Vendor Sponsor** owns own-org NDAs;
  **End User/Subject** signs own NDAs. NDAs are a column in the role permission matrix.

## Requirements (to formalize)

1. **Parties + scope.** Identify the obligated person + the classification level / categories of
   information covered, intended use, and permitted access. [ISO 6.6]
2. **Obligations.** Duty of confidentiality (taushetsplikt), permitted-use limits, ownership of
   data/IP, no onward disclosure without authorization. [ISO 6.6; NSM taushetserklæring]
3. **Lifecycle + evidence.** Each access-holder has a fit-for-purpose NDA, **demonstrably signed,
   reviewed, tracked**, producible on demand. Map to module states (create/sign/reject/status).
   [ISO 6.6; NIST PS-6]
4. **Duration + survival.** Term of the agreement and obligations that **survive termination**
   (taushetsplikt persists after the engagement ends). [ISO 6.6]
5. **Termination handling.** Required steps on termination — return/destruction of information,
   revocation of access. [ISO 6.6]
6. **Breach + reporting.** Process for reporting unauthorized sharing; consequences/measures for
   breach. [ISO 6.6]
7. **Authorization linkage.** Signed NDA is a precondition of authorization; the signed-NDA fact
   should be available to the access decision and the audit log ([[SEED-005]]). [NIST PS-6; NSM]
8. **Re-confirmation.** Review/re-sign on material change (classification scope change, renewal).

## Standards anchors

- **ISO/IEC 27002:2022 — 6.6 Confidentiality or non-disclosure agreements — VERIFIED.** Terms set by
  info-security requirements: type/classification of info, intended use, permitted access; key
  elements = duration, termination steps, data/IP ownership, authorized-use rights, oversight,
  unauthorized-sharing reporting, return/destruction, breach measures; every access-holder needs a
  fit-for-purpose, signed, tracked agreement.
  Source: https://www.isms.online/iso-27002/control-6-6-confidentiality-or-non-disclosure-agreements/ — VERIFIED
- **NIST SP 800-53 Rev.5 — PS-6 Access Agreements (incl. nondisclosure) — VERIFIED** (in SEED-003).
  Source: https://csf.tools/reference/nist-sp-800-53/r5/ps/ps-3/ — VERIFIED
- **NSM / Norwegian — taushetserklæring — VERIFIED in [[SEED-003]]:** virksomhetsikkerhetsforskriften
  §§67–69 (taushetserklæring + autorisasjonssamtale before authorization); sikkerhetsloven §5-4
  (taushetsplikt — classified info only to authorized persons with tjenstlig behov).
  Source: https://lovdata.no/dokument/SF/forskrift/2018-12-20-2053/KAPITTEL_12 — VERIFIED

## Open questions

- Is the NDA a generic confidentiality agreement, the NSM taushetserklæring specifically, or both
  (per classification level / NATO)?
- Does v2.0 consume only a boolean "NDA signed" attribute, or the full lifecycle?
- Retention of signed NDAs — tie to audit/evidence retention ([[SEED-005]]).

## Breadcrumbs

- `backend/src/nda/` + `frontend/src/hooks/use-nda.ts` — existing NDA module.
- `.planning/AUTH-MODEL.md` — NDA ownership/sign roles + permission matrix.
- [[SEED-002]] autorisasjonssamtale (taushetserklæring is part of it) · [[SEED-003]] access
  requirements (PS-6 / NSM gate) · [[SEED-005]] audit log (signed-NDA evidence).

## Notes

Captured 2026-05-22. ISO 6.6 verified via search; NIST PS-6 + NSM taushetserklæring carried over as
VERIFIED from SEED-003. NDA module exists in substrate; this is the requirements/standards view.
