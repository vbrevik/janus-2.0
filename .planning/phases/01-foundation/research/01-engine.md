# Phase 1 — Engine Consolidation + Unified World Type-Model (Research)

**Researched:** 2026-05-21
**Angle:** ABAC engine consolidation + the single canonical world type-model under `frontend/src/demo/lib/`
**Confidence:** HIGH (substrate is in-repo and read line-by-line; no external dependencies introduced)

## Scope guardrails (from `01-CONTEXT.md`)

- **D-01** Lift the proven `abac.ts` engine *verbatim*; do NOT rebuild. Per-domain tiers stay distinct; every rule emits a `detail`; deny overrides handle revocation.
- **D-02** New tree `frontend/src/demo/lib/` (+ store + components), isolated dev/build entry `demo.html` mirroring `spikes.html`. No `routeTree.gen.ts` changes. Treat `spikes/` as read-only reference.
- **D-03** Port the Vitest engine tests alongside the consolidated engine; keep them green.
- **D-05** Model the FULL 6-unit schema NOW (base ABAC + the Phase 2–3 forward fields), seed realistic values; Phase 1 only *evaluates* the base ABAC rules.
- **Discretion:** reuse the spike `TIERS` definitions verbatim unless a concrete reason to change.

> Phase 1 evaluates base ABAC only. The forward fields (policy refs, shielding, deployment, territory, support obligations, audit events, contract envelopes, credential claims) are **typed and seeded but not wired into the engine** this phase. The reason they belong in `model.ts` now: D-05 says the shared store must never be reshaped in Phase 2/3.

---

## 1. Unified Type Model — what to consolidate and from where

The spikes already define every type the demo needs, but **fragmented and partially duplicated** across 6 lib files. The risk is re-fragmentation. Below is the complete inventory with `file:line` provenance so nothing is missed and nothing forks.

### 1a. Base ABAC primitives — lift verbatim from `data.ts` [VERIFIED: read in-repo]

| Type / const | Source | Notes |
|---|---|---|
| `Clearance` union + `CLEARANCE_RANK` | `spikes/lib/data.ts:4-14` | external, read-only attribute (AUTH-MODEL §4) |
| `Domain` union | `spikes/lib/data.ts:16` | `COMPUTER \| DATA \| PHYSICAL` |
| `TIERS: Record<Domain, string[]>` | `spikes/lib/data.ts:19-23` | **per-domain ladders — keep distinct (the headline "What to Avoid")** |
| `Compartment` union | `spikes/lib/data.ts:25` | need-to-know (`AURORA \| BLACKWING \| CITADEL`) |
| `EntityId` union + `ENTITIES` | `spikes/lib/data.ts:26-32` | affiliation scoping |
| `AGREEMENTS: [EntityId, EntityId][]` | `spikes/lib/data.ts:35` | cross-entity sharing edges |
| `SubjectFlags { revoked, securityHold }` | `spikes/lib/data.ts:37-40` | the two deny-override flags (ENGINE-03) |
| `Subject` interface | `spikes/lib/data.ts:42-50` | the principal source-of-truth shape |
| `Resource` interface | `spikes/lib/data.ts:95-103` | the requirement source-of-truth shape |
| `HubPointer` + `HUB_INDEX` | `spikes/lib/data.ts:146-159` | pointers-only discovery index (Phase 2, but type modelled now) |
| `RoleId`, `Op`, `Role`, `ROLES`, `entityName` | `spikes/lib/data.ts:161-217` | 8-role ops map (ROLE-01/02) |

### 1b. Engine-internal types — lift verbatim from `abac.ts` [VERIFIED: read in-repo]

| Type | Source | Notes |
|---|---|---|
| `Rule { name, pass, detail }` | `spikes/lib/abac.ts:17-21` | one trace row |
| `Decision { decision, rules[], overrides[], failed[] }` | `spikes/lib/abac.ts:23-28` | **the contract to preserve** (§3 below) |
| `Principal` | `spikes/lib/abac.ts:30-36` | derived view of a `Subject` |
| `Requirement` | `spikes/lib/abac.ts:38-44` | derived view of a `Resource`; `domain`+`requiredTier` optional |

### 1c. FORWARD fields — Phase 2–3 types that MUST be modelled now (D-05)

These live in other spike files today. Per D-05 they belong in the unified `model.ts` (typed + seeded) so the store is never reshaped later. **NOT evaluated in Phase 1.**

| Forward concept | Type(s) to absorb | Source `file:line` | Phase | How to fold into the unified world |
|---|---|---|---|---|
| Per-entity policy refs (CTX-01) | `EntityPolicy`, `POLICIES` | `spikes/lib/policy.ts:12-57` | 3 | Add `policyRef: EntityId` (or inline `EntityPolicy`) on each entity record; seed the 3 distinct policies. **Do NOT pull `evaluateWithPolicy` into the Phase-1 engine** — keep it as future code. |
| Resource shielding / directional (CTX-03) | `shielded: boolean`, `allowlist: UnitId[]` | `spikes/lib/obligations.ts:30-36, 56-71` | 3 | Add `shielded` + `allowlist` fields to the unified `Resource`. Seed intel/industry resources as `shielded: true`. |
| Deployment status home/abroad (CTX-02) | `Deployment` (`HOME \| ABROAD`), `Subunit`, `SUBUNITS` | `spikes/lib/obligations.ts:21-47` | 3 | Add `deployment` to subunit-bearing entities; seed at least one `ABROAD` subunit. |
| Support obligations (CTX-02) | `SUPPORT_OBLIGATIONS` | `spikes/lib/obligations.ts:50-54` | 3 | Seed the obligation edges as world data. |
| Territory (CTX-04, stretch) | *(not yet typed in spikes)* | — | 3+ | Add a `territory?: string` field to Home-Guard-owned resources; seed a value. Greenfield — only field-shaping needed. |
| Unit taxonomy (the 6 units) | `UnitId`, `UNITS`, `standingAccess` | `spikes/lib/obligations.ts:4-19, 74-89` | 1 (entities) / 3 (eval) | **Reconcile with `EntityId`** — see Risk R1. The 6 canonical units are the demo entities; `standingAccess` is Phase-3 eval logic, keep as future code. |
| Append-only event log (MODEL-01, AUDIT) | `AttrOp`, `AttrEvent` | `spikes/lib/auditlog.ts:11-23` | 1 (type + empty/seed log) / 3 (reconstruction) | The event-log array IS part of MODEL-01's world model; type it now, seed an initial sequence. `reconstructSubject`/`whoCanAccess` are Phase-3 code. |
| Inter-entity contract (FED-02) | `Envelope`, `Pointer`, `DetailResult`, `Network` | `spikes/lib/contract.ts:17-152` | 2 | Type the envelopes in `model.ts`; `Network` class stays as Phase-2 code (do not lift into Phase 1). |
| Signed credential claims (FED-03) | `AttrClaims`, `Credential`, `ISSUER_KEYS`, `TRUSTED_ISSUERS` | `spikes/lib/credential.ts:5-16, 61-65` | 2 | Type now; the HMAC functions (`issueCredential`/`verifyCredential`) stay as Phase-2 code. |

**Key consolidation insight:** Phase 1 must reconcile **two parallel "owner" taxonomies** that the spikes never unified:
- The 001-engine substrate uses **`EntityId`** (`ENTITY_A/B/C`, abstract names "Northgate Agency" etc.) — `data.ts:26-32`.
- The 009-context substrate uses **`UnitId`** (`MILITARY_1/2, INTEL, INFRA, INDUSTRY, HOME_GUARD`) — `obligations.ts:4-19`.

The 6 canonical units (CONTEXT D-04, MODEL-01) are the `UnitId` set. The engine's affiliation rule and `Resource.ownerEntity` are typed against `EntityId`. **These must become one type.** See Risk R1 for the recommended resolution.

---

## 2. Recommended Module Layout — `frontend/src/demo/lib/`

Split by concern; keep the engine file isolated so the verbatim lift is auditable against the spike original.

```
frontend/src/demo/
├── lib/
│   ├── model.ts        # ALL world types (base ABAC + forward fields). The single schema.
│   ├── abac.ts         # engine — LIFTED VERBATIM from spikes/lib/abac.ts (imports rebased to ./model)
│   ├── abac.test.ts    # ported from spikes/lib/abac.test.ts (D-03), green
│   ├── seed.ts         # the 6-unit world: subjects, resources, agreements, roles, empty/seed event log
│   └── roles.ts        # (optional) RoleId/Op/ROLES if model.ts gets large; otherwise keep in model.ts
├── store/              # useReducer world-state (other agent's angle / D-02, MODEL-02)
├── components/         # Decision Explorer, banner, role switcher (other agents)
├── main.tsx           # mirrors spikes/main.tsx
└── (frontend/demo.html at frontend root, mirrors frontend/spikes.html)
```

### Lift map — verbatim vs merge

| Spike source | Disposition in `demo/lib/` | Why |
|---|---|---|
| `abac.ts` (engine fns) | **VERBATIM → `abac.ts`** | D-01: do not rebuild; only rebase the import line (`./data` → `./model`). |
| `data.ts` types (1a, 1b consts) | **MERGE → `model.ts` + `seed.ts`** | Split *types/enums* (model.ts) from *seed data arrays* (seed.ts: `SUBJECTS`, `RESOURCES`, `AGREEMENTS`, `HUB_INDEX`, `ROLES`). |
| `policy.ts` / `obligations.ts` / `contract.ts` / `credential.ts` / `auditlog.ts` types | **TYPES ONLY → `model.ts`** | D-05: schema present; their *functions* are NOT lifted in Phase 1. |
| `policy.ts`/etc. *functions* | **DO NOT LIFT** (Phase 2/3) | CONTEXT "Not in this phase": evaluation mechanics deferred. Leave in `spikes/` as reference. |
| `abac.test.ts` | **PORT → `abac.test.ts`** | D-03. |
| other `*.test.ts` (policy/obligations/contract/credential/auditlog) | **DO NOT PORT in Phase 1** | They test functions not lifted this phase; porting them would force lifting Phase 2/3 logic. Re-port when those functions land. |

> **`data.ts` split rationale:** the spike crams types + seed into one file. Splitting `model.ts` (pure types/enums/ranks) from `seed.ts` (the world arrays) keeps the schema stable while the rich D-06 seed (~5+ subjects/resources × 6 units) grows large without churning the type file the store depends on.

---

## 3. Engine Contract to Preserve (the non-negotiable surface)

Lift `evaluate` and helpers **byte-for-byte** except the import path. The signature and behaviour below are the contract every downstream phase and test depends on.

```ts
// PRESERVE EXACTLY — spikes/lib/abac.ts:57
function evaluate(principal: Principal, req: Requirement): Decision
// returns: { decision: "ALLOW" | "DENY"; rules: Rule[]; overrides: Rule[]; failed: string[] }
```

Invariants that MUST survive consolidation (each maps to a requirement):

1. **Four conjunctive base rules**, each pushing a `{ name, pass, detail }` row — `Clearance`, `Domain tier` (only when `req.domain && req.requiredTier`), `Need-to-know`, `Affiliation` (`abac.ts:60-103`). → ENGINE-01 (per-rule trace).
2. **Per-domain tier comparison via `TIERS[domain].indexOf`** — distinct from clearance; "no `<domain>` authorization" reads differently from a clearance failure (`abac.ts:67-80`). → ENGINE-02, success criterion #4. **Collapsing tiers into one ladder is the #1 forbidden regression** (abac-engine.md "What to Avoid").
3. **Every rule carries a human-readable `detail`** (e.g. `SECRET (2) ≥ required CONFIDENTIAL (1)`, `missing [AURORA]`) — a bare allow/deny is unauditable. → ENGINE-01, DEMO-03 (prose legibility).
4. **Deny overrides force DENY regardless of base rules** — `flags.revoked` → "Revoked", `flags.securityHold` → "Security hold", appended to `overrides[]` with `pass:false` (`abac.ts:106-120`). → ENGINE-03 (revocation = override, NOT a removed stored grant).
5. **Decision formula:** `decision = basePass && overrides.length === 0 ? "ALLOW" : "DENY"` (`abac.ts:122-125`). Base-pass + override = DENY while `rules` still all show ✓ (the visible "override flipped it" story).
6. **`failed[]` lists names of failed base rules** (`abac.ts:131`) — used by tests and the trace UI.
7. **Helpers ride along:** `hasAgreement` (same-entity always true; `abac.ts:50-55`), `principalFromSubject`, `requirementFromResource`, `releaseRequirementFor` (`abac.ts:135-166`). `releaseRequirementFor` is Phase-2 fuel but is a pure helper — lifting it costs nothing and keeps the file whole.

**Trace rendering:** `DecisionTrace` (`spikes/components/ui.tsx`) is the single shared renderer of `Decision` (✓/✗ per rule + override lines). Reuse it — do not invent a second trace shape. (Owned by the Decision-Explorer angle, noted here because it's coupled to the `Decision` contract.)

---

## 4. Test Porting

The Vitest/Playwright split **already exists and works** — minimal action needed:

- `frontend/vite.config.ts:24-29`: Vitest config with `environment: "jsdom"`, `globals: true`, `setupFiles: ["./src/test-setup.ts"]`, and **`exclude: ["e2e/**", "node_modules/**"]`** — Playwright is excluded by directory. [VERIFIED: read in-repo]
- `frontend/playwright.config.ts:4`: `testDir: './e2e'` — Playwright only ever scans `e2e/`. [VERIFIED]
- `npm test` = `vitest run`; e2e is separate. New `demo/lib/*.test.ts` are picked up automatically (Vitest globs `src/**`, only `e2e/` excluded). **No config change required to keep the split.**

**Porting steps for `abac.test.ts` (D-03):**
1. Copy `spikes/lib/abac.test.ts` → `demo/lib/abac.test.ts`.
2. Rebase imports: `from "./data"` → `from "./seed"` (for `SUBJECTS`/`RESOURCES`) and `from "./model"` (for the `Subject`/`Resource` *types*); `from "./abac"` unchanged. (`abac.test.ts:2-8`)
3. The 6 existing cases (`abac.test.ts:15-67`) assert the exact invariants in §3: ALLOW-all, tier-only DENY (clearance passes, tier fails), missing-compartment DENY naming `AURORA`, cross-entity DENY on `Affiliation`, cross-entity release ALLOW, override flip. **They must stay green unchanged** — if any fails, the verbatim lift was not verbatim.
4. **Seed coupling caveat:** these tests reference `subj-1..4` / `res-1..4` by id and assert specific outcomes (e.g. `subj-3`+`res-3` = tier DENY). The D-06 rich seed will *add* subjects/resources but **must preserve those exact 8 fixtures** (or the planner ports the asserted fixtures into the test file as local constants). Recommend: keep the original 4 subjects + 4 resources as the first entries in the new `seed.ts` so ported tests pass untouched, then layer the additional D-06 volume on top.

**Do NOT port** `policy/obligations/contract/credential/auditlog` tests this phase — they exercise functions not lifted in Phase 1 (§2). Re-port each when its function lands in Phase 2/3.

**Recommended Wave-0 verification command:** `cd frontend && npx vitest run src/demo/lib/abac.test.ts` (fast, isolated to the ported engine).

---

## 5. Risks / Landmines (consolidation-specific)

**R1 — Two owner taxonomies (`EntityId` vs `UnitId`) [HIGH impact].** The engine's affiliation rule, `Resource.ownerEntity`, `AGREEMENTS`, and `HUB_INDEX` are typed against `EntityId` (`ENTITY_A/B/C`) — `data.ts`. The 6-unit scenario uses `UnitId` (`MILITARY_1...HOME_GUARD`) — `obligations.ts:4-19`. D-04 requires the 6 units as canonical entities. **Decision needed:** make the 6 `UnitId` values the single entity-id type and re-key `AGREEMENTS`/`HUB_INDEX`/seed against them, OR keep both with an explicit mapping. **Recommendation:** unify to the 6 units as the entity id (rename `EntityId` → `UnitId` semantics in `model.ts`, or alias), re-seed agreements between the 6 units, and adjust the ported test fixtures' `homeEntity`/`ownerEntity` accordingly. Leaving both types is the fragmentation D-01/MODEL-02 explicitly warns against. *Flag for planner — non-obvious tradeoff per the project Escalation Protocol.*

**R2 — Duplicate / divergent `evaluate` logic.** `policy.ts:65` (`evaluateWithPolicy`) is a *second, divergent* evaluator: it gates each rule behind a policy toggle and uses **shorter `detail` strings** (`policy.ts:77` `"X ≥ Y"` vs `abac.ts:64` `"X (2) ≥ required Y (1)"`). It is Phase-3 code (CTX-01) and must **NOT** be lifted into Phase 1. If it is later promoted, it must reuse the *same* `Rule`/`Decision` types and ideally the same base-rule functions, not re-implement them. Today's two-evaluator state is exactly the divergence to avoid re-introducing.

**R3 — Collapsing per-domain tiers [the headline].** Any "simplification" that maps all three `TIERS` ladders onto one clearance scale destroys ENGINE-02 and success criterion #4 ("tier failure distinct from clearance failure"). The verbatim lift preserves `TIERS` (`data.ts:19-23`) and the `indexOf`-per-domain compare (`abac.ts:67-80`) — do not "tidy" them.

**R4 — Seed-id drift breaking ported tests.** `abac.test.ts` hard-codes `subj-1..4`/`res-1..4` and exact attribute values. The D-06 rich seed could renumber/reshape these and silently break the lifted tests. Mitigation in §4 step 4 (preserve the original 8 fixtures as the seed head, or inline them in the test).

**R5 — Type/seed file coupling churn.** Keeping types + the large D-06 seed in one file (as `data.ts` does) means every seed edit touches the file the store imports its types from. Split `model.ts` (types) from `seed.ts` (data) — §2.

**R6 — Forward fields under-typed (territory).** `territory` (CTX-04) is not yet a spike type. It's the only forward field needing greenfield modelling rather than absorption — add `territory?: string` to Home-Guard resources and seed it, so Phase 3 doesn't reshape the store.

**R7 — `releaseRequirementFor` / hub / contract leakage.** Tempting to "finish" the engine by also wiring the Phase-2 contract `Network` (`contract.ts`) since it imports `evaluate`. Resist — CONTEXT "Not in this phase" defers it. Type the envelopes in `model.ts`; leave `Network` as reference.

---

## Sources

- **HIGH (read in-repo, line-cited):** `spikes/lib/abac.ts`, `data.ts`, `policy.ts`, `obligations.ts`, `credential.ts`, `contract.ts`, `auditlog.ts`, `abac.test.ts`; `spikes/main.tsx`; `frontend/spikes.html`; `frontend/vite.config.ts`; `frontend/playwright.config.ts` (testDir); `frontend/package.json` (scripts).
- **Design contract:** `.planning/phases/01-foundation/01-CONTEXT.md` (D-01..D-09); `.planning/AUTH-MODEL.md` §3–§5, §12; `.planning/REQUIREMENTS.md` (MODEL/ENGINE/ROLE rows); `.claude/skills/spike-findings-janus-2.0/references/abac-engine.md` ("What to Avoid").

## Assumptions Log

| # | Claim | Risk if wrong |
|---|---|---|
| A1 | Unifying `EntityId`↔`UnitId` into one 6-unit type is the right consolidation (R1) | If planner/user prefers keeping both with a mapping, seed + ported-test fixtures differ. **Needs planner/user confirmation — architectural tradeoff.** |
| A2 | Original 8 fixtures (subj/res 1–4) preserved as seed head keeps ported tests green without edits | If D-06 seed renumbers them, tests break (mitigation provided). |
| A3 | No `vite.config.ts` `rollupOptions.input` change needed in Phase 1 (only dev entry `demo.html`) | Multi-page *build* registration is DEMO-04/Phase 4; if a build smoke-test is wanted in Phase 1, add `build.rollupOptions.input` with both `index.html` + `demo.html`. [VERIFIED: no input block exists today] |
