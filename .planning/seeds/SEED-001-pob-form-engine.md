---
id: SEED-001
status: dormant
planted: 2026-05-22
planted_during: v2.0 Authorization Hub (demo), Phase 2 complete (deferred — finish v2.0 first)
trigger_when: when adding a clearance-intake / data-capture form capability, OR when reversing the v2.0 "clearance is external" scope decision, OR when a schema-driven form engine is needed for any NSM form
scope: Large
---

# SEED-001: POB Form Engine — schema-driven NSM personopplysningsblankett

A **data-driven (schema-first) form system** for the NSM *personopplysningsblankett (POB) for
sikkerhetsklarering* (desember 2020, 26 punkter, bokmål), with the official *veiledning* support
text built in, dependent forking (yes → follow-up), and live feedback.

## Why This Matters

- The POB is the canonical Norwegian security-clearance intake form. Modeling it as a **generic,
  reusable schema engine** (not a hand-coded form) lets the same renderer drive future NSM forms
  (AK/UAK adgangsklarering, fornyelse, etc.).
- Demonstrates dependent forking, conditional required-fields by clearance level, embedded
  guidance, and instant validation/risk feedback — a strong reusable capability.

## ⚠ Scope Contradiction — resolve before adopting

The current **v2.0 pivot (PROJECT.md, 2026-05-20/21)** explicitly scoped clearance OUT:
> "Clearance is determined externally and consumed as a read-only attribute … clearance
> determination belongs to external authorities."

POB is a **clearance-determination intake form** — i.e. the thing v2.0 declared external/out-of-scope.
Adopting this seed is therefore a **deliberate scope reversal/extension**, not a clean add-on. When
this surfaces, first confirm: does clearance intake now belong in Janus, is it a separate product,
or does it relate to the ABAC hub (e.g. POB output feeds clearance attributes consumed by the hub)?

## When to Surface

**Trigger:** when adding clearance-intake / form-capture capability, when reversing "clearance
external", or when any NSM form needs a schema-driven renderer.

Deferred 2026-05-22: user chose to **finish v2.0 first** (Phase 3 Audit & Context, Phase 4 Demo
Shell) before starting a POB milestone.

## Scope Estimate

**Large** — a full milestone. Proposed phase breakdown (user-approved during capture):

- **P1 — Schema engine + vertical slice.** Generic `FormEngine` + declarative schema covering
  pkt 2 Personalia, 3 Sivilstatus, 7 Strafferettslige forhold (yes-forks), 8 Økonomi. Proves
  engine + forking + support text + all 4 feedback types end-to-end. Frontend only.
- **P2 — Full form coverage.** All 26 punkter incl. repeating person blocks (13–20) and
  K/NC, H/NS, SH/CTS clearance-level gating.
- **P3 — Feedback hardening.** Risk model/scoring, completeness across full form, full
  cross-field rule set.
- **P4 — Persistence.** Postgres tables + Rocket handlers to save/load draft + submitted POB
  (draft autosave, resume).

## Locked Design Decisions (from prompt contract, 2026-05-22)

- **Architecture:** GENERIC schema engine — one declarative TS/JSON schema is the single source
  of truth (punkter, fields, conditional forking, yes→follow-up, support/help text). A generic
  renderer walks it. Reusable across NSM forms. (NOT hardcoded JSX; NOT POB-specific renderer.)
- **Live feedback — ALL FOUR:**
  1. Format validation: fødselsnummer mod-11 checksum, D-nummer, dates mm/åå, required fields.
  2. Risk/security flagging: highlight clearance-relevant answers (Ja on strafferettslig /
     økonomi / utland, etc.).
  3. Completeness/progress: derived from selected clearance level (K/NC, H/NS need pkt 2–13 +
     ev. 14; SH/CTS also need 15–20) and current values.
  4. Cross-field consistency: e.g. sivilstatus=samboer ⇒ pkt 13 required; Ja on 11.9 ⇒ pkt 14
     person required; any 7.x Ja ⇒ pkt 7 redegjørelse required; 8.4 ∈ {Håndterbar, Vanskelig,
     Vet ikke} ⇒ pkt 8 redegjørelse required.
- **Build order:** frontend prototype first (no backend), persistence later.
- **Stack (reuse, do not add frameworks):** React 19 + TanStack Router/Query + Vite + shadcn/ui;
  react-hook-form + zod + @hookform/resolvers; @/ imports; kebab-case routes + co-located
  _component.tsx; routeTree.gen.ts is generated; Vitest (jsdom), Playwright excluded from Vitest.
  Backend (P4): Rust 1.87 + Rocket 0.5 + sqlx/Postgres, flat domain module, AuthGuard.
- **Prototype-without-disruption option:** the spikes pattern (`frontend/src/spikes/` behind a
  dev-only `/spikes.html`, isolated from the router) is a viable home for a P1 prototype that
  touches neither the milestone nor routeTree.

## Reference Material (NSM — authoritative source of the form structure)

- POB form (bokmål, desember 2020, 9 pages):
  https://nsm.no/getfile.php/1312569-1676541370/NSM/Skjemaer/POB%20for%20sikkerhetsklarering%20bokm%C3%A5l%20desember%202020.pdf
- Veiledning til utfylling (28. juni 2019, 8 pages):
  https://nsm.no/getfile.php/133488-1592225719/NSM/Skjemaer/veiledning-til-utfylling-av-pob-for-sikkerhetsklarering---28.-juni-2019--.doc%20(1).pdf
- NSM skjemaer index: https://nsm.no/regelverk-og-hjelp/skjemaer/

### Structure captured (full form + veiledning read 2026-05-22)

26 punkter: 1 Info/samtykke + klareringsnivå gate · 2 Personalia (2.1–2.28, incl. utenlandsk
bostedsadresse siste 10 år) · 3 Sivilstatus · 4 Familieforhold · 5 Utdanning · 6 Arbeidserfaring
(10 år) · 7 Strafferettslige forhold (8 ja/nei, *noen gang*) · 8 Økonomi · 9 Rus- og dopingmidler ·
10 Helseopplysninger (10 år) · 11 Tilknytning til andre stater (15 ja/nei: 11.1–11.8 self,
11.9–11.15 nærstående) · 12 Andre sikkerhetsmessige opplysninger · 13 Nåværende
samboer/ektefelle/partner (alle nivåer) · 14 Nærstående (conditional) · 15–20 utvidet nærstående
(KUN SH/CTS): 15/16 Forelder, 17/18 Steforelder/fosterforelder, 19 Barn (A–D), 20 Søsken (A–D) ·
21 Referanser (2) · 22 Merknader · 23 Antall vedlegg · 24 Samtykke/underskrift · 25
Klareringsavgjørelse (KM only) · 26 Samtykke ny personkontroll.

Key modeling facts: person blocks 13–20 share one ~10-field "person personalia" type; clearance
level gates which sections are required (conditional-required, not separate forms); time windows
differ per section (10 år vs *noen gang*); "nærstående" is a legal term (klareringsforskriften §2);
every Ja → free-text redegjørelse + tidsangivelse, overflow → pkt 22 / numbered vedlegg.

## Breadcrumbs

- `.planning/PROJECT.md` — the "clearance external" pivot this seed contradicts.
- `frontend/src/spikes/` + `/spikes.html` — isolated-prototype precedent for a P1 home.
- Existing `person` domain (backend `backend/src/person/`, frontend `use-person.ts`) — closest
  analog for P4 persistence and for the "person personalia" block.
- Full structured breakdown of all 26 punkter exists in the capture conversation (2026-05-22).

## Notes

Captured 2026-05-22 after reading the full POB form + veiledning from NSM. Deferred behind v2.0
completion at user request. A full prompt contract (GOAL/CONTEXT/CONSTRAINTS/FORMAT/FAILURE
CONDITIONS) was drafted for the P1 vertical slice and can be reconstructed from the decisions above.
