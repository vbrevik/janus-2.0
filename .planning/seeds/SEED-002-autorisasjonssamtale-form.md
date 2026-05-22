---
id: SEED-002
status: dormant
planted: 2026-05-22
planted_during: v2.0 Authorization Hub (demo), Phase 2 complete (deferred — finish v2.0 first)
trigger_when: when adding clearance/authorization-intake forms, when the POB form engine ([[SEED-001]]) is built (reuse the engine), or when reversing the v2.0 "clearance external" scope decision
scope: Medium
---

# SEED-002: Autorisasjonssamtale form + documentation (schema-driven)

A schema-driven version of the NSM **autorisasjonssamtale** (authorization conversation/interview)
form and its documentation — the companion to the POB clearance form ([[SEED-001]]). Built on the
**same generic form engine** as SEED-001.

## Why This Matters

- In the Norwegian personnel-security process, **autorisasjon** is the step *after*
  sikkerhetsklarering: before a person gets access to classified info, the *autorisasjonsansvarlig*
  conducts an **autorisasjonssamtale** to ensure the person knows the relevant security threats,
  security requirements, and their role in the org's security work. It must be conducted *before*
  authorization is granted (virksomhetsikkerhetsforskriften § 68).
- POB ([[SEED-001]]) covers the *clearance* side; this seed covers the *authorization* side. Together
  they model the full intake → authorization flow. Reusing the SEED-001 generic engine makes this
  largely a new schema + content, not a new system.

## ⚠ Same scope contradiction as SEED-001 — resolve before adopting

This is part of the **clearance/personnel-security process**, which v2.0's pivot scoped OUT
("clearance is determined externally … belongs to external authorities", PROJECT.md). Note the
naming trap: "authorization" here = NSM personnel-security authorization (granting a person access to
classified material), **not** the v2.0 ABAC authorization-exchange hub. Adopting this is a deliberate
scope extension, same decision as SEED-001. Decide both together.

## When to Surface

**Trigger:** alongside [[SEED-001]] — when adding clearance/authorization-intake form capability, or
once the generic form engine exists (this becomes a second schema on top of it).

Deferred 2026-05-22: user chose to finish v2.0 first.

## Scope Estimate

**Medium** — if the [[SEED-001]] generic form engine already exists, this is mostly a new schema +
the autorisasjonssamtale content/checkpoints + documentation rendering. Standalone (without the
engine) it would be Large.

## Structural Difference from POB (important)

POB is a **self-fill** personopplysningsblankett (applicant answers ~150 fields). The
autorisasjonssamtale is an **interview/briefing conducted by the autorisasjonsansvarlig** — a
template of **checkpoints/topics** to cover, confirmation that the person understood, plus
documentation/evaluation of the conversation and the final authorization decision. So the schema
model needs:
- topic/checkpoint nodes (briefing items to cover + "covered/understood" confirmation)
- interviewer-side documentation fields (notes, evaluation, decision)
- embedded guidance text (NSM's advice on how to conduct the conversation)
- **per-level variants** (the form differs by classification level — see references)

This validates the generic-engine design: same engine, different schema shape (checklist/interview
vs self-fill). Good second test case for reusability.

## Reference Material (NSM — authoritative)

- Håndbok i autorisasjon (handbook; includes "Vedlegg 2: Skjema for gjennomføring av
  autorisasjonssamtale — KONFIDENSIELT eller høyere", + advice attachment on conducting the talk):
  https://nsm.no/getfile.php/1314578-1743622116/NSM/Filer/Dokumenter/Veiledere/H%C3%A5ndbok%20i%20autorisasjon.PDF
- Skjema for autorisasjonssamtale — BEGRENSET / NATO RESTRICTED (standalone form, 2024-11-19):
  https://nsm.no/getfile.php/1314200-1734605191/NSM/Skjemaer/2024-11-19-SKM-Skjema-for-autorisasjonssamtale-BEGRENSET-NR.pdf
- § 68 Autorisasjonssamtale (regulation/veileder):
  https://nsm.no/regelverk-og-hjelp/veiledere-og-handboker/veileder-i-personellsikkerhet/virksomhetsikkerhetsforskriften/68-autorisasjonssamtale/
- Autorisasjon (overview): https://nsm.no/fagomrader/personellsikkerhet/sikkerhetsklarering/autorisasjon/
- NSM skjemaer index: https://nsm.no/regelverk-og-hjelp/skjemaer/

Note: full form structure NOT yet extracted (only POB was read in detail, 2026-05-22). When
adopting, fetch the handbook + level forms and structure them like the POB breakdown.

## Breadcrumbs

- [[SEED-001]] — POB form engine; this seed reuses its generic schema engine + 4-feedback design.
- `.planning/PROJECT.md` — the "clearance external" pivot both seeds contradict.

## Notes

Captured 2026-05-22 as the authorization-side companion to the POB seed. NSM references gathered;
detailed form structure to be extracted at adoption time.
