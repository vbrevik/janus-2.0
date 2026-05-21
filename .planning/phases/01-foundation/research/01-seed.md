# Phase 1 Research — Full Scenario Seed + Canonical Data Schema (6 units)

**Researched:** 2026-05-21
**Angle:** The seed + unified world-state schema for the 6 canonical units (D-04/D-05/D-06).
**Confidence:** HIGH — every claim grounded in the spike substrate (`frontend/src/spikes/lib/*`) and the locked AUTH-MODEL §12 / CONTEXT decisions. No external lookups needed; this is a pure schema/seed design over an in-memory mock.

> All data is `[DEMO / MOCK]`. Clearance values are `[MOCK]` external imports (read-only). No persistence, no backend.

---

## 0. The single most important finding (read this first)

The spikes carry the 6-unit world in **two disconnected modeling planes** that the Phase-1 store MUST fuse, or Phase 2/3 will force a reshape (the exact thing D-05 exists to prevent):

| Plane | Where | Identity type | Subject type | Resource type | Used by |
|-------|-------|---------------|--------------|---------------|---------|
| **ABAC engine plane** | `abac.ts`, `data.ts`, `policy.ts`, `auditlog.ts`, `credential.ts` | `EntityId` = `ENTITY_A/B/C` | `Subject` (clearance, per-domain tiers, compartments, flags) | `Resource` (domain, requiredTier, minClearance, requiredCompartments, ownerEntity) | ENGINE-01/02/03, FED-*, AUDIT-*, CTX-01 |
| **Context plane** | `obligations.ts` | `UnitId` = `MILITARY_1/2/INTEL/INFRA/INDUSTRY/HOME_GUARD` | `Subunit` (unit, deployment HOME/ABROAD) | `ContextResource` (ownerUnit, shielded, allowlist) | CTX-02 (obligations), CTX-03 (shielding), AUDIT-03 |

These never share an ID space in the spikes. **D-05's job is to collapse the entity axis: the 6 `UnitId`s become the canonical entity set, and `Subject`/`Resource` carry the context-plane fields (deployment, territory, shielding) inline.** Get this fusion right in Phase 1 and the store schema is frozen for the whole milestone. Miss it and Phase 3 has to re-key every record.

`spikes/lib/data.ts:26` uses 3 generic entities; `obligations.ts:4-19` uses 6 units. **The unified store keys everything off the 6 units.** `ENTITY_A/B/C` and `ENTITY_*` agreements are spike scaffolding to be retired, NOT carried forward.

---

## 1. Full Field Inventory — the frozen unified schema

Below: every field, its source spike, the requirement that consumes it, and whether Phase 1 *evaluates* it or merely *seeds* it (D-05). "Seed-only" fields are inert in Phase 1 but MUST be present and realistically valued so the store is never reshaped.

### 1a. Entity (the 6 units) — replaces `ENTITIES` + `UNITS` + `POLICIES`

| Field | Type | Source | Req | P1 status |
|-------|------|--------|-----|-----------|
| `id` | `UnitId` (6 enum) | `obligations.ts:4` | MODEL-01 | evaluated (scoping/affiliation) |
| `name` / `label` | string | `obligations.ts:12-19` | MODEL-01 | display |
| `accessProfile` | `"BROAD" \| "READ_MOST" \| "INFRA_ONLY" \| "OWN_ONLY" \| "TERRITORIAL"` | §12 + `standingAccess` `obligations.ts:74` | CTX-01/03 | seed-only (drives standing-access in P3) |
| `policy` (per-entity release policy ref) | `{ rules:{clearance,domainTier,needToKnow,affiliation}, minClearanceFloor? }` | `policy.ts:12-22` (`EntityPolicy`) | CTX-01 | **seed-only** (P3 evaluates) |
| `agreements` | `UnitId[]` (who this unit shares with) | `AGREEMENTS` `data.ts:35` reframed onto units | ENGINE (affiliation), FED-04 | evaluated |

> **Schema decision (recommend):** store agreements as undirected pairs at the world level (as `data.ts:35` does) OR per-entity lists. Pairs are simpler and match the proven `hasAgreement` (`abac.ts:50`). Keep that. **Affiliation among the 6 military/state units is "all agreed" by default** — model the interesting denials via *shielding* and *strict need-to-know*, not by withholding agreements. (Cross-entity DENY is still demonstrable via a deliberately isolated unit pair if wanted — see §3.)

### 1b. Subject — extends spike `Subject` with context-plane + identity fields

| Field | Type | Source | Req | P1 status |
|-------|------|--------|-----|-----------|
| `id` | string | `data.ts:43` | MODEL-01 | evaluated |
| `name` | string | `data.ts:43` | MODEL-01 | display |
| `homeEntity` → rename **`unit`** | `UnitId` | `data.ts:45` (was `EntityId`) | ENGINE (affiliation) | evaluated |
| `clearance` | `Clearance` (4-level ladder) | `data.ts:46` | ENGINE-01 | **evaluated** — `[MOCK]` external, read-only |
| `domainAuth` | `Partial<Record<Domain,string>>` (tier per COMPUTER/DATA/PHYSICAL) | `data.ts:47` | ENGINE-02 | **evaluated** (per-domain, distinct from clearance) |
| `compartments` | `Compartment[]` (need-to-know) | `data.ts:48` | ENGINE-01 | evaluated |
| `flags.revoked` | bool (deny override) | `data.ts:38` | ENGINE-03 | **evaluated** |
| `flags.securityHold` | bool (deny override, Security Officer) | `data.ts:39` | ENGINE-03 | **evaluated** |
| `subunit` | `string \| null` (e.g. "Field Hospital") | `Subunit.name` `obligations.ts:23` | CTX-02 | seed-only |
| `deployment` | `"HOME" \| "ABROAD"` | `obligations.ts:21,26` | CTX-02 | **seed-only** (P3 obligation rule) |
| `territory` | `string` (e.g. "NORTH_SECTOR") | §12 home-guard / CTX-04 | CTX-04 (stretch) | seed-only |
| `title`/`role` (occupational) | string (optional flavor) | new — realism for D-06 | — | display |

> **Compartment set must grow.** Spike has 3 (`AURORA/BLACKWING/CITADEL`, `data.ts:25`). With 30+ subjects across 6 units, add unit-flavored compartments (e.g. `STOCKWATCH` for industry, `HOMELAND` for home guard, `SIGINT` for intel) so need-to-know reads as realistic and ENGINE-01 NTK-DENY traces are legible. Extend the `Compartment` union — it is referenced by `abac.ts`, `policy.ts`, `credential.ts`, `auditlog.ts`, so add values, don't rename.

### 1c. Resource — extends spike `Resource` with context-plane shielding fields

| Field | Type | Source | Req | P1 status |
|-------|------|--------|-----|-----------|
| `id` | string | `data.ts:96` | MODEL-01 | evaluated |
| `name` | string | `data.ts:96` | MODEL-01 | display |
| `domain` | `Domain` | `data.ts:98` | ENGINE-02 | evaluated |
| `requiredTier` | string (in `TIERS[domain]`) | `data.ts:99` | ENGINE-02 | evaluated |
| `minClearance` | `Clearance` | `data.ts:100` | ENGINE-01 | evaluated |
| `requiredCompartments` | `Compartment[]` | `data.ts:101` | ENGINE-01 | evaluated |
| `ownerEntity` → rename **`ownerUnit`** | `UnitId` | `data.ts:102` + `ContextResource.ownerUnit` `obligations.ts:33` | ENGINE/FED | evaluated |
| `shielded` | bool (directional default-deny) | `obligations.ts:34` | CTX-03 | **seed-only** (P3 shielding) |
| `allowlist` | `UnitId[]` (who pierces the shield) | `obligations.ts:35` | CTX-03 | seed-only |
| `assetKind` | `"FILE"\|"SYSTEM"\|"FACILITY"\|"FILING"\|"INVENTORY"` (flavor) | new — realism | — | display |

### 1d. World-state envelope (the `useReducer` store, MODEL-02)

| Slice | Type | Source | Req | P1 status |
|-------|------|--------|-----|-----------|
| `units` | `Record<UnitId, Entity>` | §1a | MODEL-01/02 | evaluated |
| `subjects` | `Subject[]` | §1b | MODEL-01/02 | evaluated |
| `resources` | `Resource[]` | §1c | MODEL-01/02 | evaluated |
| `events` | `AttrEvent[]` (append-only log) | `auditlog.ts:17` | MODEL-01, AUDIT-01/02 | **present + appended** in P1 (grant/revoke/hold mutate via events); replay/timeline UI is P3 |
| `hubIndex` | `HubPointer[]` (pointers only) | `data.ts:146-159` | FED-01 | seed-only (P2 reads) |
| `currentRole` | `RoleId` | `data.ts:161` | ROLE-01, D-08 | evaluated |
| `seq` | number (logical clock for events) | `auditlog.ts:18` | AUDIT-01 | evaluated |

> **Event-sourcing handoff (critical for D-05 + AUDIT-01).** `auditlog.ts:30` reconstructs a subject by *replaying events over the immutable base seed*. So the Phase-1 reducer's grant/revoke/hold actions should append `AttrEvent`s (`auditlog.ts:17`: `seq, subjectId, op, value?, actor`) AND apply the projection to the live `subjects` slice — exactly the "append-only log is system-of-record + materialized projection" AUDIT-01 demands. Extend `AttrOp` (`auditlog.ts:11`) beyond compartment/hold to also cover **`SET_REVOKED`/`CLEAR_REVOKED`** (revocation is currently only an initial flag, not an event op) so ENGINE-03's revoke action is replay-reconstructable. The `actor` field already exists for the SoD audit trail — populate it with the operating role that fired the action (D-07/ROLE-02).

---

## 2. Concrete Seed Design — per unit (rich, ~5+ each, D-06)

Targets: **6 units, ~5 subjects + ~5 resources each ≈ 30 subjects / 30 resources.** Profiles below follow AUTH-MODEL §12 and `standingAccess` (`obligations.ts:74-89`). Tier names are the spike scales (§4). Example rows are illustrative — planner can adjust names/counts but must preserve the *characteristic profile* and the named contrast actors (§3).

### TIERS / clearance scales actually used (see §4)
- Clearance ladder: `UNCLASSIFIED < CONFIDENTIAL < SECRET < TOP_SECRET` (`data.ts:4-14`).
- `COMPUTER: STANDARD < PRIVILEGED < ROOT` · `DATA: INTERNAL < RESTRICTED < CLASSIFIED` · `PHYSICAL: LOBBY < RESTRICTED_AREA < SECURE_VAULT` (`data.ts:19-23`).

### MILITARY_A — broad access; high clearances; full domain spread
- **Subjects (5):** mix SECRET/TOP_SECRET, broad `domainAuth` across all three domains, compartments incl. `AURORA`. One subject has a **deployed subunit** ("Field Hospital", `deployment: ABROAD`) → support-obligation demo (CTX-02). All flags clean except the designated override actor (§3).
- **Resources (5):** owned by `MILITARY_A`, span COMPUTER/DATA/PHYSICAL, varied required tiers — incl. a `SECURE_VAULT`/`TOP_SECRET` facility and a `RESTRICTED`/`SECRET` file share. `shielded:false`, broad allowlist.

### MILITARY_B — broad; mirror of A; carries a support obligation TO MILITARY_A
- **Subjects (5):** similar clearance spread; `unit: MILITARY_B`. One is the **clean-ALLOW reference actor** for the canonical demo (§3) when paired with a MILITARY_A or B resource.
- **Resources (5):** owned by `MILITARY_B`, full domain spread. `MILITARY_B` is in `SUPPORT_OBLIGATIONS` toward `MILITARY_A` (`obligations.ts:51-52`) so its subjects can reach MILITARY_A's deployed subunit records in P3.

### INTEL — reads broad; **its own data shielded asymmetrically**
- **Subjects (5):** high clearance (TOP_SECRET-heavy), `SIGINT` compartment; `accessProfile: READ_MOST` → standing read into other units (`standingAccess` returns true, `obligations.ts:80`).
- **Resources (5):** owned by `INTEL`, `shielded:true`, narrow `allowlist` (e.g. `[INTEL, MILITARY_A]` per spike `cr-1` `obligations.ts:62`). At least the **"INTEL Threat Brief"** equivalent (`obligations.ts:57-63`) — the asymmetric-shielding showcase for CTX-03 (intel reads out, others can't read in).

### INFRA / Inventory — physical/asset read; `INFRA_ONLY` standing
- **Subjects (5):** lower clearance (CONFIDENTIAL/SECRET), `domainAuth` weighted to PHYSICAL + DATA(inventory), little/no COMPUTER root. `accessProfile: INFRA_ONLY` (`standingAccess` → only owner==INFRA, `obligations.ts:84`). **INFRA carries support obligations to MILITARY_A and MILITARY_B** (`obligations.ts:51,53`) for the deployment demo.
- **Resources (5):** PHYSICAL facilities + DATA inventory/real-estate records (`assetKind: FACILITY`/`INVENTORY`). Mostly `LOBBY`/`RESTRICTED_AREA`. Good source of **TIER-only DENY** targets for outsiders (high physical tier, modest clearance) — §3.

### INDUSTRY — strict need-to-know; leak-detection target
- **Subjects (5):** moderate clearance; `STOCKWATCH` compartment held only by insiders. `accessProfile: OWN_ONLY` (`obligations.ts:86`).
- **Resources (5):** owned by `INDUSTRY`; the **"Industry Stock Filing"** shielded + `allowlist:[INDUSTRY]` (`obligations.ts:64-70`) — the **leak-detection target** (AUDIT-03 stretch): non-allowlisted access to this resource is the anomaly. Plus business-secret DATA resources with `requiredCompartments:[STOCKWATCH]` so a non-insider trips a clean **need-to-know DENY** (ENGINE-01).

### HOME_GUARD — territorial
- **Subjects (5):** CONFIDENTIAL/SECRET; each carries a `territory` (e.g. `NORTH_SECTOR`, `COAST`); `accessProfile: TERRITORIAL` (`obligations.ts:88`).
- **Resources (5):** owned by `HOME_GUARD`, tagged with the same `territory` values (CTX-04 stretch scoping). Mostly PHYSICAL/DATA, modest tiers.

> **Volume vs. legibility (D-06 tension):** ~30×30 is "immersive" but the Decision Explorer evaluates **one (subject × resource × domain)** triple at a time (D-09), so raw count never crowds a single trace. The crowding risk is the *pickers*, not the trace — see §5.

---

## 3. Phase-1 Contrast Actors (named seed rows that produce required demos)

These specific rows are the acceptance fixtures. The planner should hard-name them and the ported Vitest tests (D-03) should assert on them. Each maps to a Phase-1 success criterion / requirement.

| # | Demo | Requirement | Seed recipe (subject → resource, domain) |
|---|------|-------------|------------------------------------------|
| **CA-1** | **Clean ALLOW** | ENGINE-01 | A MILITARY_B subject, TOP_SECRET, `domainAuth.DATA=CLASSIFIED`, holds `AURORA`, vs a MILITARY_B `DATA`/`CLASSIFIED`/`AURORA` resource (same unit ⇒ affiliation ✓). All 4 base rules pass, no override. |
| **CA-2** | **TIER-only DENY** (clearance fine, domain tier too low — the headline ENGINE-02 case) | ENGINE-02 | A subject with TOP_SECRET clearance but `domainAuth.PHYSICAL=LOBBY` (or absent) vs an INFRA `PHYSICAL`/`SECURE_VAULT` facility with `minClearance=SECRET`. Clearance rule ✓, **Domain-tier rule ✗** — trace must say "clearance fine, PHYSICAL tier too low", distinct from a clearance failure (`abac.ts:67-80`). |
| **CA-3** | **OVERRIDE DENY** (base rules pass, override forces DENY) | ENGINE-03 | A subject that *would* ALLOW (matches CA-1 profile) but with `flags.revoked=true` **or** `flags.securityHold=true`. Base rules all ✓, override line fires, decision flips to DENY (`abac.ts:106-125`). Seed BOTH a `revoked` subject and a `securityHold` subject so the role-driven hold action (Security Officer, ROLE-02) has a live target and the two override kinds render distinctly. |
| CA-4 | Need-to-know DENY (supporting ENGINE-01 legibility) | ENGINE-01 | A cleared, correctly-tiered INDUSTRY-outsider vs a `requiredCompartments:[STOCKWATCH]` resource → only the NTK rule ✗. |

### Cross-unit forward actors (seed now; evaluated in P2/P3 — D-05)
| # | For phase | Seed |
|---|-----------|------|
| FW-1 | P3 CTX-03 directional shielding | INTEL Threat Brief: `shielded:true, allowlist:[INTEL, MILITARY_A]` (`obligations.ts:57-63`). A MILITARY_B subject = "standing access but shielded-out". |
| FW-2 | P3 CTX-02 support obligation | A MILITARY_A subject with `subunit:"Field Hospital", deployment:"ABROAD"` (`obligations.ts:42-46`) + INFRA & MILITARY_B in `SUPPORT_OBLIGATIONS` to MILITARY_A (`obligations.ts:51-53`). |
| FW-3 | P3 AUDIT-03 / CTX-03 industry | Industry Stock Filing: `shielded:true, allowlist:[INDUSTRY], requiredCompartments:[STOCKWATCH]` (`obligations.ts:64-70`) + a non-insider subject who can reach it = the leak anomaly. |
| FW-4 | P2 FED-01/04 | `hubIndex` pointers for several subjects across multiple holding units (mirror `data.ts:152-159`, re-keyed to the 6 units, pointers-only). |
| FW-5 | P2 FED-03 | Reuse `ISSUER_KEYS`/`TRUSTED_ISSUERS` (`credential.ts:61-65`) incl. the `ROGUE-ISSUER` row so the forged-credential rejection is seeded. Clearance values are issued by `NATIONAL-CLEARANCE-AUTHORITY` `[MOCK]`. |

---

## 4. TIERS / Clearance Ladder — reuse spike scales verbatim

Per D-05's discretion note ("reuse the spike `TIERS` unless the planner finds a reason to adjust") — **reuse them as-is.** They are proven (`abac.test.ts` green) and consumed by `abac.ts`, `policy.ts`, `auditlog.ts`.

```
Clearance (data.ts:4-14):   UNCLASSIFIED(0) < CONFIDENTIAL(1) < SECRET(2) < TOP_SECRET(3)
COMPUTER  (data.ts:20):     STANDARD < PRIVILEGED < ROOT
DATA      (data.ts:21):     INTERNAL < RESTRICTED < CLASSIFIED
PHYSICAL  (data.ts:22):     LOBBY < RESTRICTED_AREA < SECURE_VAULT
```

- Keep the three domain ladders **distinct** (abac-engine.md "What to Avoid" — collapsing them loses the ENGINE-02 "clearance fine, tier too low" message).
- **Only refinement recommended:** widen the `Compartment` union (§1b) — add unit-flavored caveats (`SIGINT`, `STOCKWATCH`, `HOMELAND`) for realistic NTK across 30 subjects. This is additive (extend the union); the engine's `requiredCompartments ⊆ held` logic (`abac.ts:82-92`) is unchanged.

---

## 5. Risks

### R1 — Two-plane fusion not done in P1 ⇒ Phase 3 reshape (HIGH, the central D-05 risk)
If the store keys subjects/resources off `ENTITY_A/B/C` (spike `data.ts`) instead of the 6 `UnitId`s, then Phase 3's obligation/shielding fields (`obligations.ts`, keyed by `UnitId`) can't attach without re-keying every record. **Mitigation:** §0/§1 — unify on `UnitId`; carry `deployment`/`territory`/`shielded`/`allowlist`/per-entity `policy` inline now (seed-only). This is the single most important schema decision in Phase 1.

### R2 — Revocation modeled as flag-only, not as an event op ⇒ AUDIT-02 gap (MEDIUM)
`auditlog.ts:11` has `SET_HOLD/CLEAR_HOLD` but **no revoke op**; revocation is only the initial `flags.revoked`. ENGINE-03's *revoke action* (Approver, ROLE-02) won't be replay-reconstructable in P3 unless P1 adds `SET_REVOKED/CLEAR_REVOKED` to `AttrOp` and routes the reducer's revoke through an event. **Mitigation:** extend `AttrOp` in P1 (§1d) even though replay UI is P3.

### R3 — Compartment scarcity ⇒ unrealistic NTK / thin traces (LOW)
3 compartments across 30 subjects makes need-to-know feel arbitrary. **Mitigation:** §4 — widen the union additively.

### R4 — D-06 legibility tension: rich seed crowds the pickers, not the trace (MEDIUM)
The trace evaluates one triple (D-09), so the *trace* stays readable; the risk is 30-item subject/resource dropdowns. **Mitigation (flag to planner/UI — DEMO-03/Phase-4 concern, NOT a reason to thin data per D-06):** group pickers by unit (the `unit`/`ownerUnit` field already supports `optgroup`-style grouping); seed a **sensible default triple = CA-1 (clean ALLOW)** so the screen opens on a coherent story, not an arbitrary pair; ensure each contrast actor (§3) is reachable in ≤2 picks. Do not reduce counts to fix this.

### R5 — Affiliation/agreement axis ambiguous when fused onto 6 units (LOW)
The spike's `AGREEMENTS` (`data.ts:35`) is A↔B-only with C isolated — designed to produce a cross-entity DENY. On the 6 cooperating units, "no agreement" is less natural. **Mitigation:** default all 6 units to mutually-agreed (affiliation rule passes intra-government), and demonstrate access *denial* through **tier / need-to-know / shielding / overrides** instead — those are the model's real differentiators. Keep `hasAgreement` (`abac.ts:50`) intact; just seed a complete agreement set. (Optionally retain one deliberately non-agreed external pairing if a cross-entity-DENY trace is wanted, but it is not required by any Phase-1 row.)

---

## Sources
- **HIGH (codebase, cited file:line):** `frontend/src/spikes/lib/data.ts`, `abac.ts`, `policy.ts`, `obligations.ts`, `auditlog.ts`, `credential.ts`.
- **HIGH (locked design):** `.planning/AUTH-MODEL.md` §4/§5/§12; `.planning/REQUIREMENTS.md` (MODEL/ENGINE/ROLE/FED/AUDIT/CTX rows); `.planning/phases/01-foundation/01-CONTEXT.md` (D-04/05/06, MODEL-01).
- **HIGH (spike findings):** `.claude/skills/spike-findings-janus-2.0/references/abac-engine.md`, `policy-and-context.md`, `federation.md`.
