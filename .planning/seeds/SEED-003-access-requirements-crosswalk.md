---
id: SEED-003
status: dormant
planted: 2026-05-22
planted_during: v2.0 Authorization Hub (demo), Phase 2 complete (deferred — finish v2.0 first)
trigger_when: when building the access-decision / requirements engine, when defining the clearance↔classification mapping, or alongside the POB ([[SEED-001]]) and autorisasjonssamtale ([[SEED-002]]) forms
scope: Large
---

# SEED-003: Access requirements crosswalk — clearance + authorization → classified IS

A **requirements model** for what a subject needs to ACCESS a classified information system at each
classification level, reconciled across **NSM (Norway)**, **NIST/US federal**, and **ISO/IEC 27000**.
Every source below was fetched and verified (2026-05-22) by parallel research; verification status is
marked per source — do not treat UNVERIFIED items as fact without re-checking.

## Why This Matters

- This is the **decision logic** at the heart of the system: given a system classified at level L
  (+ caveats/compartments), what does a person need to be granted access? All three regimes converge
  on the same triad: **clearance level ≥ classification + authorization/approval + need-to-know.**
- Cross-standard so the model isn't NSM-only — maps cleanly onto NIST control families and ISO/IEC
  27002:2022 controls for orgs operating under those frameworks.

## Relationship to v2.0 (note: LESS contradictory than SEED-001/002)

Unlike the intake forms, this seed is **close to the v2.0 ABAC hub's actual purpose**. "clearance ≥
classification AND authorized AND need-to-know" is precisely an ABAC rule over subject/resource
attributes — it could **feed/inform the v2.0 engine** rather than reverse the "clearance external"
pivot (clearance stays an external read-only attribute; this seed defines how it's *consumed* in the
access decision). Consider whether part of this belongs in v2.0 directly vs a later milestone.

## The cross-standard model (all three converge)

| Gate | NSM (Norway) | NIST / US federal | ISO/IEC 27002:2022 |
|------|--------------|-------------------|--------------------|
| Classify the asset | sikkerhetsgrad (§5-3) | E.O. 13526 levels + FIPS 199 impact | 5.12 Classification, 5.13 Labelling |
| Clearance/eligibility ≥ level | sikkerhetsklarering (§8-2) | SEAD 4 eligibility, ICD 704 for SCI (ODNI, **not NIST**) | (org maps own scheme — ISO defines no levels) |
| Authorization/approval | autorisasjon by autorisasjonsansvarlig (§8-1, §8-9) | access approval / briefing / indoctrination | 5.18 Access rights, 8.2 Privileged access |
| Need-to-know | tjenstlig behov (§5-4) | need-to-know | 5.15 need-to-know / need-to-use |
| Screen the person | personkontroll (POB) | PS-3 screening, PS-6 access agreements | 6.1 Screening |
| System enforces it | godkjent informasjonssystem (§6-3) | 800-53 AC-2/AC-3/AC-6; CNSSI 1253 for NSS | 8.3 Information access restriction |

**Classification-level crosswalk** (national ↔ NATO ↔ US ↔ ISO):

| Norway | NATO | US (E.O. 13526) | ISO |
|--------|------|-----------------|-----|
| BEGRENSET (authz only, no clearance) | NATO RESTRICTED | (no direct US equiv; ~CUI) | org-defined |
| KONFIDENSIELT | NATO CONFIDENTIAL | Confidential | org-defined |
| HEMMELIG | NATO SECRET | Secret | org-defined |
| STRENGT HEMMELIG | COSMIC TOP SECRET | Top Secret | org-defined |

> NSM rule: clearance issued only from KONFIDENSIELT and up; BEGRENSET needs **authorization only**.
> US split: clearance LEVELS = E.O. 13526; eligibility ADJUDICATION = SEAD 4 (ODNI); system controls
> = NIST/CNSS. FIPS 199 L/M/H is **system risk**, orthogonal to clearance level.

## Verified sources — NSM (Norway)

| Instrument | § | Requires | URL | Status |
|---|---|---|---|---|
| Sikkerhetsloven (2018-06-01-24) | §5-3 | 4 grades by harm criteria | https://lovdata.no/lov/2018-06-01-24 | VERIFIED |
| Sikkerhetsloven | §5-4 | classified info only to authorized + tjenstlig behov | https://lovdata.no/lov/2018-06-01-24 | VERIFIED |
| Sikkerhetsloven | §6-1/§6-2/§6-3 | define protected IS; forsvarlig nivå; system must be godkjent before processing classified info | https://lovdata.no/lov/2018-06-01-24 | VERIFIED |
| Sikkerhetsloven | §8-1/§8-2/§8-9 | access needs authorization; clearance for KONF+; level must match; entity head = autorisasjonsansvarlig | https://lovdata.no/dokument/NL/lov/2018-06-01-24/KAPITTEL_8 | VERIFIED |
| Virksomhetsikkerhetsforskriften (2018-12-20-2053) | §26 | NSM sets foreign/NATO↔national grade equivalence | https://lovdata.no/dokument/SF/forskrift/2018-12-20-2053/KAPITTEL_5 | VERIFIED |
| Virksomhetsikkerhetsforskriften | §§67–69 | taushetserklæring + autorisasjonssamtale before authorization | https://lovdata.no/dokument/SF/forskrift/2018-12-20-2053/KAPITTEL_12 | VERIFIED |
| NSM veileder i personellsikkerhet | §8-2 | clearance levels K/H/SH; NATO NC/NS/CTS | https://nsm.no/regelverk-og-hjelp/veiledere-og-handboker/veileder-i-personellsikkerhet/sikkerhetslovens-kapittel-8/8-2-sikkerhetsklarering/ | VERIFIED |

## Verified sources — NIST / US federal

| Doc | Control/§ | Requires | URL | Status | Owner |
|---|---|---|---|---|---|
| NIST SP 800-53 Rev.5 | AC-2/AC-3/AC-6 | account mgmt; enforce approved authz; least privilege | https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final | VERIFIED | NIST |
| NIST SP 800-53 Rev.5 | PS-3/PS-6 | personnel screening; access agreements (incl. NDA) | https://csf.tools/reference/nist-sp-800-53/r5/ps/ps-3/ | VERIFIED | NIST |
| FIPS 199 | categorization | system C/I/A → Low/Moderate/High | https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.199.pdf | VERIFIED | NIST |
| FIPS 200 | min requirements | mandates minimum controls + risk-based selection | https://csrc.nist.gov/pubs/fips/200/final | VERIFIED | NIST |
| CNSSI No. 1253 (29 Jul 2022) | categorization for NSS | overlays 800-53 for classified National Security Systems | https://www.cnss.gov | VERIFIED (search; cnss.gov canonical) | CNSS |
| E.O. 13526 | Sec.1.2 | defines Confidential/Secret/Top Secret | https://www.archives.gov/isoo/policy-documents/cnsi-eo.html | VERIFIED | President/ISOO |
| SEAD 4 | adjudicative guidelines | common clearance-eligibility criteria | https://www.dni.gov/files/NCSC/documents/Regulations/SEAD-4-Adjudicative-Guidelines-U.pdf | VERIFIED (live; 403 to fetcher) | ODNI |
| ICD 704 | SCI personnel standards | eligibility for SCI access | https://www.dni.gov/files/documents/ICD/ICD-704-Personnel-Security-Standards-and-Procedures-for-Access-to-SCI-2018-06-20.pdf | VERIFIED (live; 403 to fetcher) | ODNI |
| NIST SP 800-60 | info-type → impact mapping | guidance mapping info types to FIPS 199 | https://csrc.nist.gov/pubs/sp/800/60/v1/r1/final | UNVERIFIED (not fetched) | NIST |

## Verified sources — ISO/IEC 27002:2022 (2022 numbering, corroborated ≥2 sources each)

| No. | Title | Requires | Status |
|---|---|---|---|
| 5.12 | Classification of information | classify by sensitivity/value/legal | VERIFIED |
| 5.13 | Labelling of information | attach classification labels (implements 5.12) | VERIFIED |
| 5.15 | Access control | topic-specific policy; need-to-know / need-to-use | VERIFIED |
| 5.16 | Identity management | identity lifecycle ("one entity, one identity") | VERIFIED |
| 5.18 | Access rights | provision/review/modify/revoke (JML lifecycle) | VERIFIED |
| 6.1 | Screening | background verification before + during employment | VERIFIED |
| 8.2 | Privileged access rights | restrict/manage privileged access | VERIFIED |
| 8.3 | Information access restriction | technically restrict access per policy | VERIFIED |

ISO 27001:2022 linkage (VERIFIED): Annex A = 93 reference controls (same numbering as 27002,
groups 5.x/6.x/8.x); clause 6.1.3 requires comparison vs Annex A + a Statement of Applicability
(6.1.3 d). Sources: isms.online, hightable.io, sprinto.com (ISO catalogue 75652 paywalled, 403 to
fetch — confirmed via search). Principle names *need-to-know* + *need-to-use* VERIFIED against 5.15.

## Could not verify (flagged honestly per the verify-each-source mandate)

- NSM: a single page printing the full 4-row NATO↔national equivalence TABLE (the legal *mechanism*,
  virksomhetsikkerhetsforskriften §26, is VERIFIED; pairings corroborated via NSM level listings;
  the explicit table likely in NSM "Veileder i håndtering og beskyttelse av sikkerhetsgradert
  informasjon" PDF — not fetched). Klareringsforskriften specific §§ — UNVERIFIED. "Higher clearance
  auto-covers lower" — common in practice, exact wording UNVERIFIED.
- NIST SP 800-60 — not directly fetched. SEAD 4 / ICD 704 / CNSSI 1253 — live + attribution
  confirmed via search, but servers 403 the fetcher so bodies not read byte-for-byte.
- ISO — paywalled; control numbers+titles corroborated by 2+ secondary sources, but verbatim
  standard text not confirmed.

## Breadcrumbs

- [[SEED-001]] POB (personkontroll/screening input) · [[SEED-002]] autorisasjonssamtale (authorization gate)
- `.planning/AUTH-MODEL.md` + `frontend/src/spikes/` — the v2.0 ABAC engine this requirements model could feed.
- `.planning/PROJECT.md` — "clearance external" pivot (this seed consumes clearance as an attribute; minimal contradiction).

## Notes

Captured 2026-05-22 via 3 parallel verified-research agents (NSM / NIST / ISO). Re-verify the
UNVERIFIED items (esp. the NATO mapping table PDF and the 403-blocked US PDFs) before relying on them.
