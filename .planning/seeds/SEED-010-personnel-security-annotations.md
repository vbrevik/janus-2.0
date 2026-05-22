---
id: SEED-010
status: dormant
planted: 2026-05-22
planted_during: v2.0 Authorization Hub (demo), Phase 2 complete (deferred — finish v2.0 first)
trigger_when: when modeling Security-Officer annotations/holds on persons, when wiring reported-change (§8-11) capture, or when defining how non-clearance security observations affect the access decision
scope: Medium
---

# SEED-010: Personnel security annotations

Security-relevant annotations a **Security Officer** attaches to a person — risk flags, security
**holds**, concerns, and reported-change records — distinct from the externally-determined clearance
(read-only) and from identity/affiliation (Personnel/Org roles). Some annotations are
**decision-affecting** (holds), some are informational (feed human review).

## Relationship to v2.0 (ALIGNED — partly validated)

This is part of the v2.0 model, not a contradiction. AUTH-MODEL: **Security Officer owns "personnel
security annotations"**, can **Annotate** persons and **Flag** domain-authz risk, but **cannot grant**
access (strict SoD). The **hold** mechanism is already **validated** (spike 004 deny-override; spike
007 audit). Consider whether annotations belong **inside v2.0** (the engine already supports holds).

## Already validated / designed

- **AUTH-MODEL role matrix:** Security Officer → Personnel = **Annotate**, Domain Authz = **Flag**;
  "Security Officer flags risk but cannot grant"; owns security annotations + clearance import mapping.
- **Spike 004 (role-sod, VALIDATED):** "Security Officer — place a hold → **deny override flips
  ALLOW→DENY**." Demonstrates revocation under pure-ABAC without stored grants.
- **Spike 007 (audit, VALIDATED):** **SET/CLEAR hold** events in the append-only log; reconstruction
  shows access dropping at a hold and returning when cleared.

## Requirements (to formalize)

1. **Annotation types.** (a) **Security hold** — decision-affecting deny-override; (b) **risk flag**
   — surfaced to deciders, non-binding; (c) **concern/note** — free-text observation; (d)
   **reported-change record** — captures §8-11 notifications; (e) optional behavioral/foreign-contact
   observations.
2. **Authorship + SoD.** Only the **Security Officer** writes annotations; cannot grant access (flags
   risk only). Approver decides; clearance stays external/read-only ([[SEED-008]]).
3. **Decision effect.** Holds = **deny override** in the ABAC engine (spike 004); flags = surfaced
   for human review (do not auto-deny). Make the effect explicit per annotation type.
4. **Lifecycle.** Set/clear with actor, timestamp, reason; reversible (clear hold); effective dates.
5. **Audit + provenance.** Every set/clear logged to the audit log ([[SEED-005]], spike 007) —
   annotations are part of the reconstructable history.
6. **Reporting linkage (§8-11).** A subject's duty to report changes during the clearance period is
   captured as annotations; material changes may trigger re-assessment by the **external** clearance
   authority ([[SEED-008]]) — Janus records, does not adjudicate.
7. **Visibility/confidentiality.** Define who sees annotations (Auditor: view; Subject: likely not).

## Standards anchors

- **NSM / NO — VERIFIED:** sikkerhetsloven **§8-11** (duty to notify autorisasjonsansvarlig of
  changes throughout the clearance period) — confirmed in the POB *veiledning* (read 2026-05-22) and
  the POB §3 sivilstatus note. Ongoing personellsikkerhet follow-up by autorisasjonsansvarlig.
- **NIST — VERIFIED (in [[SEED-003]]):** SP 800-53 **PS family** (PS-3 screening). **Continuous
  vetting / SEAD 3 reporting requirements (ODNI) — UNVERIFIED** (not fetched; the US analogue to
  ongoing reporting/annotation).
- **ISO — VERIFIED (in [[SEED-003]]):** 27002:2022 **6.1 Screening** (before + ongoing); access-rights
  review (5.18).

## Open questions

- Taxonomy of annotation types + which are decision-affecting vs informational only.
- Retention/visibility of sensitive annotations (esp. concerns) — tie to audit/evidence ([[SEED-005]]).
- Boundary with clearance: annotations never edit clearance (external) — confirm holds are the only
  Janus-side decision lever besides need-to-know/compartments.

## Breadcrumbs

- `.planning/AUTH-MODEL.md` — Security Officer Annotate/Flag rights + SoD.
- `.planning/spikes/004-role-sod/README.md` (hold → deny override) · `.planning/spikes/007-audit-reconstruction/README.md` (SET/CLEAR hold).
- `backend/src/person/` — person module the annotations attach to.
- [[SEED-008]] clearance import (read-only; annotations are the editable Janus-side security layer) ·
  [[SEED-005]] audit log · [[SEED-003]] access requirements (need-to-know/compartments).

## Notes

Captured 2026-05-22. Grounded in AUTH-MODEL + spikes 004/007 (validated). §8-11 verified via POB
veiledning; NIST PS / ISO 6.1 carried from SEED-003; US continuous-vetting (SEAD 3) flagged
UNVERIFIED. Aligned with v2.0 — holds already work in the engine.
