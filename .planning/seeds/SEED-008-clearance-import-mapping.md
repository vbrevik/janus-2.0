---
id: SEED-008
status: dormant
planted: 2026-05-22
planted_during: v2.0 Authorization Hub (demo), Phase 2 complete (deferred — finish v2.0 first)
trigger_when: when building/hardening how external clearance is imported and mapped to the internal ABAC attribute, when defining the clearance level-equivalence table, or when replacing the mock clearance feed with real verifiable credentials
scope: Medium
---

# SEED-008: Clearance import mapping

The mechanism that takes an **externally-determined clearance** and maps it into the internal,
**read-only clearance attribute** the ABAC engine consumes — including issuer trust, level
normalization/equivalence, validity, and provenance.

## Relationship to v2.0 (ALIGNED — possibly in-scope, not deferred)

This is the *opposite* of the [[SEED-001]]/[[SEED-002]] contradiction: it is **exactly** the v2.0
model. PROJECT.md / AUTH-MODEL: "Clearance is determined externally and consumed as a **read-only
attribute**"; the **Security Officer owns the external-clearance import mapping" (AUTH-MODEL §roles).
Part of it is **already validated** (spike 006). Consider whether this belongs **inside v2.0**
(Foundation/Phase 1 already treats clearance as an imported attribute) rather than a later milestone.

## Already validated / designed

- **Clearance = external, read-only** (AUTH-MODEL: "Clearance level | External | Imported, read-only
  in Janus"; "no role edits it"). Need-to-know/compartments are Janus-side, layered on top.
- **Security Officer owns the import mapping** (and security annotations); Personnel/Org roles edit
  identity/affiliation but never clearance.
- **Mock feed:** external clearance feed is seeded JSON in the demo.
- **Spike 006 (attribute-trust, VALIDATED 4/4 + live):** clearance attributes ride in a **signed
  credential** issued by the **"National Clearance Authority"**; the holder **verifies signature +
  trusted issuer (TRUSTED_ISSUERS allowlist) BEFORE** evaluating ABAC. Forged escalation (e.g. forged
  TOP_SECRET) → REJECTED (signature mismatch); rogue issuer → REJECTED. Demo uses HMAC + mock key
  registry; a real build would use asymmetric/verifiable credentials + real key distribution.

## Requirements (to formalize)

1. **Ingestion.** Import clearance from the external authority — mock seeded JSON now; real =
   verifiable credential. Pull/push + re-import on change.
2. **Issuer trust (verify-before-trust).** Accept a clearance only after verifying signature + that
   the issuer is trusted (spike 006). Never trust self-asserted clearance. [ties [[SEED-003]] PS/NSM]
3. **Level mapping / normalization.** Map the external grade → internal clearance attribute, with
   **equivalence** across schemes: national (BEGRENSET/KONFIDENSIELT/HEMMELIG/STRENGT HEMMELIG) ↔
   NATO (NR/NC/NS/CTS) ↔ foreign. Legal basis for equivalence VERIFIED in [[SEED-003]]
   (virksomhetsikkerhetsforskriften §26: NSM sets which foreign/NATO grades correspond to national).
4. **Read-only enforcement.** No role can edit a person's clearance; Security Officer edits only the
   **mapping configuration**, not individual clearances.
5. **Validity & lifecycle.** Effective/expiry dates, revocation, supersession; expired/revoked
   clearance must drop out of the access decision (consistency with [[SEED-005]] reconstruction).
6. **Provenance + audit.** Record issuer + credential reference per imported clearance; log every
   import and mapping change to the audit log ([[SEED-005]]).
7. **Comparison semantics.** Define "clearance ≥ classification" using the normalized scale (incl.
   whether higher auto-covers lower — flagged UNVERIFIED in [[SEED-003]]).

## Standards anchors

- **Level equivalence — VERIFIED in [[SEED-003]]:** virksomhetsikkerhetsforskriften §26 (NSM sets
  foreign/NATO↔national correspondence); national + NATO level lists (NSM veileder personellsikkerhet).
- **Eligibility is external** — US: ODNI SEAD 4 / ICD 704; NO: NSM klareringsmyndighet. Janus does
  NOT adjudicate; it imports the result. [[SEED-003]]
- **ISO:** no clearance levels defined — org maps its own scheme (ISO 27002:2022 access-control
  controls consume the mapped attribute). [[SEED-003]]
- **Open/UNVERIFIED:** the explicit 4-row NATO↔national mapping TABLE (mechanism verified, printed
  table not yet fetched — see [[SEED-003]]); "higher clearance auto-covers lower".

## Open questions

- Source of truth for the mapping table — config owned by Security Officer, or a published NSM table?
- Multi-national subjects (dual schemes) — how to normalize?
- Demo (HMAC + mock registry) → real (verifiable credentials + key distribution): when/where?
- Does this ship inside v2.0 (it's the v2.0 mechanism) or a later milestone?

## Breadcrumbs

- `.planning/AUTH-MODEL.md` — clearance external/read-only; Security Officer owns import mapping; attribute table.
- `.planning/spikes/006-attribute-trust/README.md` — validated signed-credential + verify-before-trust import.
- [[SEED-003]] access-requirements crosswalk (level equivalence) · [[SEED-005]] audit log (import provenance)
  · spike 001 ABAC engine (consumer of the mapped attribute).

## Notes

Captured 2026-05-22. Grounded in AUTH-MODEL + spike 006 (validated). Most aligned of all seeds with
v2.0 — evaluate adopting into v2.0 rather than deferring. Level equivalence carried VERIFIED from SEED-003.
