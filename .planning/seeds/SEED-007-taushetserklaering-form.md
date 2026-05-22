---
id: SEED-007
status: dormant
planted: 2026-05-22
planted_during: v2.0 Authorization Hub (demo), Phase 2 complete (deferred — finish v2.0 first)
trigger_when: when building the taushetserklæring document/form, alongside the autorisasjonssamtale ([[SEED-002]]) and NDA ([[SEED-006]]) work, or when the generic form engine ([[SEED-001]]) exists
scope: Small
---

# SEED-007: Taushetserklæring form (best-effort, schema-driven)

A schema-driven version of the NSM **Taushetserklæring / Teielovnad** (declaration of secrecy),
built on the same generic form engine as [[SEED-001]]/[[SEED-002]]. Best-effort: the form is short
(declaration + signature + legal-references attachment), so this is the simplest of the form seeds.

Note: Janus already has a taushetserklæring/NDA system (see [[SEED-006]] + `backend/src/nda/`).
This seed is the **document/form** version of that, for completeness.

## Why This Matters

- The taushetserklæring is signed during the autorisasjonssamtale ([[SEED-002]]) and is a precondition
  of authorization (sikkerhetsloven §5-4; [[SEED-006]]). It's the concrete artifact the person signs;
  rendering it from the same schema engine keeps the whole NSM form set consistent.

## Verified form structure (NSM, januar 2019 — read 2026-05-22)

Bilingual (bokmål + nynorsk, side-by-side). Two parts:

**Page 1 — the declaration:**
- **"Jeg forstår" (I understand)** — 4 statements: (1) work gives access to info significant for
  *rikets sikkerhet*, requiring responsibility + loyalty; (2) breach of taushetsplikt → *straffansvar
  og avskjed* (criminal liability + dismissal); (3) taushetsplikt persists **after** leaving service;
  (4) the laws in the attachment do not exhaustively regulate the duty.
- **"Jeg forplikter meg til" (I commit to)** — 5 commitments: (1) keep current on relevant laws/rules;
  (2) comply with legal provisions + security rules; (3) not disclose/give access to sikkerhetsgradert
  info except to those **cleared + authorized for the protection grade AND with tjenstlig behov**;
  (4) prevent unauthorized persons from learning graded info; (5) exercise care discussing ungraded
  service matters in/outside service.
- **Fields:** Navn (blokkskrift) · Stilling og virksomhet · Fødselsnummer (11 siffer) · Sted og dato
  · Underskrift.
- **Underskrift av foresatt/føresett** (guardian co-sign, for minors): witness confirms it was signed
  in their presence and that valid ID was checked.

**Page 2 — "Utdrag av de mest relevante lovbestemmelsene" (legal-references attachment / support text):**
- Sikkerhetsloven §5-4 (tilgang + taushetsplikt), §6-6 (kommunikasjons-/innholdskontroll), §11-4 (straff)
- Forvaltningsloven §13 (taushetsplikt)
- Straffeloven §§119–126 (landssvik, etterretning mot statshemmeligheter, avsløring), §201, §207,
  §§209–210 (brudd på taushetsplikt)
- Militær straffelov §§69–70

## Schema-engine notes (best-effort build)

- Mostly **static declaration + acknowledgement** (confirm "Jeg forstår" / "Jeg forplikter meg til")
  + a small personalia block (reuse the [[SEED-001]] "person personalia" type: navn, stilling/virksomhet,
  fødselsnummer, sted/dato, signatur).
- **Conditional forks (minimal):** guardian co-sign block IF signer is a minor; **COSMIC declaration**
  additionally required before COSMIC TOP SECRET authorization (per NSM autorisasjon guidance).
- **Bilingual rendering** (bokmål/nynorsk) — a good test of i18n in the engine.
- **Embedded support text** = the page-2 legal extract (the engine's help/attachment content).
- Feedback types from [[SEED-001]] mostly reduce to: fødselsnummer mod-11 validation + required
  acknowledgements + signature/date present.

## Reference

- NSM Taushetserklæring/Teielovnad (bokmål/nynorsk, januar 2019):
  https://nsm.no/getfile.php/133578-1592399571/NSM/Skjemaer/taushetserklaring-nb-nn-03-2019.pdf — VERIFIED (read)
- NSM Taushetsplikt (veileder): https://nsm.no/regelverk-og-hjelp/veiledere-og-handboker-til-sikkerhetsloven/veileder-i-sikkerhetsstyring/sikkerhetsorganisering/taushetsplikt/
- Legal basis (VERIFIED in [[SEED-003]]): sikkerhetsloven §5-4; virksomhetsikkerhetsforskriften §§67–69.

## Breadcrumbs

- `backend/src/nda/` + `frontend/src/hooks/use-nda.ts` — existing taushetserklæring/NDA system.
- [[SEED-001]] generic form engine · [[SEED-002]] autorisasjonssamtale (where this is signed) ·
  [[SEED-006]] NDA requirements (the requirements behind this document).

## Notes

Captured 2026-05-22 best-effort. Form structure VERIFIED by reading the NSM PDF; cached copy was
session-scoped (ephemeral) — re-fetch from the NSM URL at adoption.
