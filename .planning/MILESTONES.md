# Milestones — Janus 2.0

## v2.1 Physical Access Zones (demo)

**Shipped:** 2026-05-23
**Phases:** 5–8 | **Plans:** 9 | **Track:** demo/mock (`frontend/src/demo/`)
**Timeline:** 2026-05-23 (1 day)

**Delivered:** An NSM-grounded physical-access model layered on the v2.0 demo — hierarchical named zones with three zone types, a 5-tier clearance ladder, time-windowed grants with zone-type-scoped inheritance and explicit-auth overrides, two-gate access resolution, admin-org delegation, escort-tracked entry logging, and visitor passes — exercised by a 6-unit mock dataset and three new demo views.

**Key Accomplishments:**
1. Zone model: hierarchy (SITE→ROOM) with CONTROLLED/RESTRICTED/SECURED types, dual org ownership, explicit-auth flag, and the SECURED-not-at-SITE/AREA ceiling rule (ZONE-01..05)
2. 5-tier clearance ladder + NSM-grounded access rules; escort never substitutes for SECURED clearance (ACCESS-01..05)
3. Time-windowed PhysicalAccessGrant with most-specific zone-type-scoped inheritance and explicit-auth short-circuit; two-gate resolution — grant lookup → zone-type rule (GRANT-01..04)
4. Admin-org delegation to a person or org via ZoneAccessDelegate (DELEG-01..03; `canIssueGrant()` enforcement deferred to UI)
5. ZoneEntryLog (CARD/ESCORT) with mandatory-for-SECURED logging + escort-tied ZoneVisitorPass query (LOG-01..03, VISIT-01..03)
6. 6-unit mock dataset + Zone Browser, Access Resolution Explorer (prose trace), and Entry Log views in a 6th demo tab (SEED-01..09, UI-01..06)

**Requirements:** 38/38 satisfied · 0 gaps · 1 deferred (`canIssueGrant()` enforcement → UI)

**Audit:** `.planning/v2.1-MILESTONE-AUDIT.md` (passed)

**Archive:**
- `.planning/milestones/v2.1-ROADMAP.md` — full phase details
- `.planning/milestones/v2.1-REQUIREMENTS.md` — requirements with outcomes

## v2.0 Authorization Hub (demo)

**Shipped:** 2026-05-22
**Phases:** 1–4 | **Plans:** 16 | **LOC:** ~4,779 TypeScript
**Timeline:** 2026-05-21 → 2026-05-22 (2 days)

**Delivered:** A fully interactive federated ABAC authorization-hub demo instantiating a 6-unit deployment scenario — every access decision computed live from attributes, explainable, and reconstructable from an append-only audit log; external integrations simulated.

**Key Accomplishments:**
1. Pure-computed ABAC engine — live ALLOW/DENY with per-rule traces, deny overrides, domain-independent tiers (MODEL, ENGINE, ROLE requirements)
2. Pointer-only discovery hub — entities discover who holds authorization info without exposing details; typed inter-entity exchange contract with full message transcript (FED-01, FED-02)
3. Signed-credential verify-before-trust — forged/untrusted-issuer credentials rejected; holder-gated detail release via ABAC policy (FED-03, FED-04)
4. Append-only audit log with O(1) materialized projection and point-in-time access reconstruction (AUDIT-01, AUDIT-02)
5. Per-entity policy divergence + deployment-driven support obligations + directional shielding (CTX-01, CTX-02, CTX-03)
6. Coherent 5-tab demo shell — all views share world-state; plain-prose decision traces pass legibility gate; production build clean (DEMO-01–04)

**Requirements:** 21/21 satisfied · 0 gaps · 3 deferred as future/stretch (AUDIT-03, CTX-04, SCOPE-01)

**Known Deferred Items:** 14 items acknowledged at close (11 seeds dormant, 3 stretch requirements) — see STATE.md Deferred Items

**Archive:**
- `.planning/milestones/v2.0-ROADMAP.md` — full phase details
- `.planning/milestones/v2.0-REQUIREMENTS.md` — requirements with outcomes
- `.planning/milestones/v2.0-MILESTONE-AUDIT.md` — audit report (passed)
