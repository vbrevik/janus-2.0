---
id: SEED-009
status: dormant
planted: 2026-05-22
planted_during: v2.0 Authorization Hub (demo), Phase 2 complete (deferred — finish v2.0 first)
trigger_when: when defining security requirements for classified information systems (classification, approval-to-operate, adequate security level), or when hardening the info_systems module toward compliance
scope: Medium
---

# SEED-009: Info-system security requirements

Security requirements for **skjermingsverdige informasjonssystemer** (classified information systems)
in Janus — what level a system is approved to handle, the approval-to-operate gate, the adequate
security level, and how the system enforces the access decision. Grounded in the existing
`info_systems` module and anchored to verified NSM/NIST/ISO sources.

## Relationship to v2.0

Info systems are **resources** in the v2.0 ABAC model (the thing access is computed *to*). The
`info_systems` module is existing substrate; classification + environment/deployment are resource
attributes the engine consumes. Security Officer owns "info-system security" (AUTH-MODEL §roles).
The full *compliance* posture (approval-to-operate, adequate-security-level) is real-build work;
the demo treats classification/context as resource attributes.

## Existing implementation (substrate)

- Backend `backend/src/info_systems/` — `handlers.rs`, `models.rs`, `mod.rs` (CRUD).
- Frontend `frontend/src/hooks/use-info-systems.ts`, types `frontend/src/types/info-system.ts`.
- Per CLAUDE.md: info systems carry **environment**, **status** (ACTIVE/INACTIVE/MAINTENANCE), and a
  classification level (SCREAMING_SNAKE_CASE enums, e.g. TOP_SECRET).
- AUTH-MODEL: Info Systems are a column in the role matrix; **Security Officer owns info-system
  security**; environment/context attributes (location/territory, deployment status) feed the engine.

## Requirements (to formalize)

1. **System classification.** Each system has the max grade it is approved to process; resources
   inherit/are bounded by it. [sikkerhetsloven §6-1; FIPS 199 + CNSSI 1253]
2. **Approval to operate (sikkerhetsgodkjenning).** A system must be **approved before processing**
   classified information. [sikkerhetsloven §6-3] — cross-standard parallel: NIST RMF (SP 800-37)
   **Authorization to Operate (ATO)**.
3. **Adequate security level (forsvarlig sikkerhetsnivå).** Protection proportionate to the grade.
   [sikkerhetsloven §6-2; NSM Grunnprinsipper for IKT-sikkerhet; NIST 800-53 baselines via FIPS 200]
4. **Access enforcement.** Only subjects who are cleared ≥ system grade + authorized + need-to-know
   may access ([[SEED-003]]); enforced technically. [NIST AC family; ISO 8.3]
5. **Communications/content control.** Capability to check a system isn't processing beyond its
   approval. [sikkerhetsloven §6-6]
6. **Logging/audit.** System actions + access decisions logged to the audit log ([[SEED-005]]).
   [NIST AU family; ISO 8.15/8.16]
7. **Lifecycle.** ACTIVE/MAINTENANCE/INACTIVE states; **re-approval** on material change; secure
   decommissioning.
8. **Context/deployment attributes.** Location/territory + deployment status as resource/environment
   attributes (spike 009 obligations + directional shielding; per-entity policy spike 008).

## Standards anchors

- **NSM / NO — VERIFIED:** sikkerhetsloven **kap. 6** — §6-1 (defines protected info system), §6-2
  (forsvarlig sikkerhetsnivå), §6-3 (sikkerhetsgodkjenning before processing classified), §6-6
  (kommunikasjons-/innholdskontroll). (Verified in [[SEED-003]] + taushetserklæring extract.)
  https://lovdata.no/lov/2018-06-01-24
- **NSM Grunnprinsipper for IKT-sikkerhet v2.1 — VERIFIED (exists/purpose):** NSM's ICT-security
  baseline; the Security Act is *stricter* and sits above it (principles = a building block, not
  compliance with the Act). https://nsm.no/getfile.php/1313975-1717589722/NSM/Filer/Dokumenter/Veiledere/NSMs%20Grunnprinsipper%20for%20IKT-sikkerhet%20v2.1.pdf
  (Its 4 top categories — identify/protect/detect/handle-recover — to verify at adoption.)
- **NIST — VERIFIED (in [[SEED-003]]):** SP 800-53 Rev.5 control set; FIPS 199/200 categorization;
  CNSSI 1253 for National Security Systems. **NIST SP 800-37 (RMF / ATO) — UNVERIFIED** (not fetched;
  cited as the ATO parallel to §6-3).
- **ISO/IEC 27001/27002:2022 — VERIFIED (in [[SEED-003]]/[[SEED-005]]):** ISMS + technological
  controls (access restriction 8.3, logging 8.15, monitoring 8.16).

## Open questions

- Demo vs real: does v2.0 model approval-to-operate / adequate-security-level at all, or only
  classification + context as attributes?
- Mapping NSM sikkerhetsgodkjenning ↔ NIST ATO ↔ ISO ISMS scope — keep as a crosswalk like [[SEED-003]]?
- Where do environment/deployment attributes live (spikes 008/009) vs this system-security model?

## Breadcrumbs

- `backend/src/info_systems/` + `frontend/src/hooks/use-info-systems.ts` — existing module.
- `.planning/AUTH-MODEL.md` — Security Officer owns info-system security; context attributes.
- `.planning/spikes/008-per-entity-policy/`, `.planning/spikes/009-obligations-context/` — policy +
  deployment-context layers over systems.
- [[SEED-003]] access requirements · [[SEED-005]] audit log · [[SEED-008]] clearance import (subject side).

## Notes

Captured 2026-05-22. sikkerhetsloven kap. 6 + NIST/ISO carried VERIFIED from SEED-003/005; NSM
Grunnprinsipper v2.1 verified to exist; NIST RMF/ATO parallel flagged UNVERIFIED. Info systems are
resources in the v2.0 ABAC model; full compliance posture is real-build scope.
