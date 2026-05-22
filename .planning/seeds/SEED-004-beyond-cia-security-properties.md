---
id: SEED-004
status: dormant
planted: 2026-05-22
planted_during: v2.0 Authorization Hub (demo), Phase 2 complete (deferred — finish v2.0 first)
trigger_when: when defining or refining the set of security properties Janus designs against, or when the "CIA + S" extension is raised again
scope: Small
---

# SEED-004: Beyond CIA — which extended security properties Janus adopts

A team discussion floated extending the **CIA triad** (Confidentiality, Integrity, **Availability** —
not "accessibility") with a fourth letter, **"S for Security."** This seed captures the verified
academic/standards leaning and a recommendation, so the discussion resumes from an informed base.

## Verdict (verified 2026-05-22)

**There is no recognized "CIA + S = Security" model.** "Security" as a 4th property on a security
model is circular and appears in no standard or paper. Academia/standards extend CIA via **named
properties**, not an "S".

- The only single-letter **"S"** with real standing is **Safety** (CIA + Safety, sometimes "CIAS"),
  used in **safety-critical / OT / cyber-physical** domains where integrity/availability failures
  cause physical harm. That is *Safety*, not *Security*. (Possible source of the "S" heard.)

## Established extensions (the real options)

| Model | Adds to CIA | Origin | Status |
|---|---|---|---|
| **ISO/IEC 27000 named properties** | Authenticity, Accountability, Non-repudiation, Reliability | ISO/IEC 27000 vocabulary | VERIFIED |
| **Five Pillars of Information Assurance** | Authentication + Non-repudiation | US DoD / IA doctrine | VERIFIED |
| **Parkerian Hexad** | Possession/Control, Authenticity, Utility | Donn B. Parker, 1998 | VERIFIED |
| **CIA + Safety ("CIAS")** | Safety (no harm to people/environment) | safety-critical / OT / ICS literature | VERIFIED (concept) |

ISO route is the authoritative one: ISO/IEC 27000 defines infosec as preserving C/I/A and states
other properties "can also be involved": **Authenticity, Accountability, Non-repudiation, Reliability.**

## Recommendation for Janus

**Do not invent "+S = Security"** (no standing, circular). If CIA feels incomplete, name the actual
property using the ISO-recognized set. For Janus the genuinely relevant additions are already central
to the design:

- **Accountability + Non-repudiation** → the append-only **audit log as system of record**
  (point-in-time reconstruction; spike 007).
- **Authenticity** → **verify-before-trust** signed attribute credentials (spike 006).

Adopting the ISO-named properties gives the same coverage with standards backing and zero invented
vocabulary. If a physical/operational-harm dimension is ever in scope, the correct term is **Safety**,
not Security.

**Open question for the team:** adopt the ISO four (Authenticity, Accountability, Non-repudiation,
Reliability) as Janus's stated properties? Or formally add **Safety** if cyber-physical consequences
become relevant? Resolve before baking any "+S" vocabulary into PROJECT.md / AUTH-MODEL.md.

## Verified sources

- ISO/IEC 27000 protection goals (authenticity, accountability, non-repudiation, reliability):
  https://blog.src-consulting.com/en/information-security/protection-goals-of-information-security — VERIFIED
- Information security (ISO 27000 properties), Wikipedia:
  https://en.wikipedia.org/wiki/Information_security — VERIFIED
- Five Pillars of Information Security (CIA + authentication + non-repudiation), DestCert:
  https://destcert.com/resources/five-pillars-information-security/ — VERIFIED
- Parkerian Hexad, Wikipedia: https://en.wikipedia.org/wiki/Parkerian_Hexad — VERIFIED
- The Parkerian Hexad (Pender-Bey, Lewis University):
  https://cs.lewisu.edu/mathcs/msisprojects/papers/georgiependerbey.pdf — VERIFIED

Could not verify: verbatim ISO/IEC 27000 standard text (paywalled — corroborated via secondary
sources); a single authoritative academic source defining "CIA + S = Security" (none found — that is
the finding).

## Breadcrumbs

- `.planning/AUTH-MODEL.md` — where adopted properties would be stated.
- `.planning/PROJECT.md` Key Decisions — verify-before-trust (authenticity), append-only audit
  (accountability/non-repudiation) already validated by spikes 006/007.
- [[SEED-003]] — access-requirements crosswalk (CIA appears there as FIPS 199 C/I/A categorization).

## Notes

Captured 2026-05-22. User heard "+S" for the first time and asked for the academic leaning before
adopting; finding is that the established move is ISO-named properties / five pillars, and the only
real "S" is Safety. Decision deferred to team discussion.
