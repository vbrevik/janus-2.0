# Phase 9: Digital Resource Model & Policy Engine — Research

**Researched:** 2026-06-02
**Domain:** Demo/mock TypeScript — time-versioned, data-driven access policy engine appended to `frontend/src/demo/lib/model.ts` + `seed.ts`
**Confidence:** HIGH — grounded in direct inspection of the actual v2.1 source (`model.ts`, `physical-access.test.ts`, `seed.ts`) and the LOCKED `09-SPEC.md` + `09-CONTEXT.md`.

## Summary

Phase 9 is **append-only TypeScript** to one file (`model.ts`) plus two seed fixtures (`seed.ts`) and one new test file (`digital-resource.test.ts`). No backend, no UI, no WorldState, no new deps. Every shape and decision is already locked in `09-SPEC.md` (11 reqs) and `09-CONTEXT.md` (D-01..D-05). This research does **not** re-derive the milestone-level architecture — it distills the phase-9-specific build order, the gate-dispatch mechanics, the exact named blocking tests, and the **one material discrepancy** the planner must resolve: the milestone `ARCHITECTURE.md` predates the SPEC and describes an **older, hardcoded-gate, fixed-org-field** design that the SPEC explicitly supersedes.

**Primary recommendation:** Build in three strictly-ordered, independently-testable units inside `model.ts` — (1) types, (2) pure helpers + gate evaluators + `resolveResourceAccess` dispatcher + `canIssueResourceGrant`, (3) `digital-resource.test.ts` with one blocking test per acceptance criterion — then add the two seed fixtures last. Follow SPEC/CONTEXT verbatim wherever they conflict with the milestone `ARCHITECTURE.md`.

<user_constraints>
## User Constraints (from 09-CONTEXT.md + 09-SPEC.md)

### Locked Decisions
- **D-01 — Parameterized gate descriptors:** Gates are `{ kind: string; ...params }`. Baseline kinds carry no params: `{ kind: 'CLEARANCE' }`, `{ kind: 'OWN_TIER_GRANT' }`, `{ kind: 'PARENT_TIER_GRANT' }`. Richer gates carry params: `{ kind: 'REQUIRED_ROLE', role: 'SECURITY_APPROVAL' }`, `{ kind: 'CLEARANCE_FLOOR', min: 'SECRET' }`. This is the open-vocabulary mechanism (RSRC-POLICY-04).
- **D-02 — Implement baseline kinds + `REQUIRED_ROLE`.** `CLEARANCE_FLOOR` is documented as a pattern example; implement its evaluator ONLY if a seed fixture uses it (planner's call — SEED-06/07 as locked do NOT require it). Each `kind` → one evaluator function. Unknown `kind` → explicit error result, never a silent ALLOW.
- **D-03 — No-active-policy outcome is fail-closed DENY:** `{ allow: false, reason: 'NO_ACTIVE_POLICY', policyVersion: null, gates: [] }`. NOT a thrown error (uncovered timestamp is a normal time-versioned outcome).
- **D-04 — SEED-06 policy-shift narrative (LOCKED, values illustrative):** Network "MilNet"; policy A `valid_until 2026-03-01` = baseline; policy B `valid_from 2026-03-01` = baseline + `REQUIRED_ROLE: SECURITY_APPROVAL`. Same person → ALLOW at a Feb timestamp, DENY at an Apr timestamp.
- **D-05 — SEED-07 non-baseline:** one resource whose active policy = baseline + `REQUIRED_ROLE: SECURITY_APPROVAL`. Same mechanism as SEED-06's policy B (one shared mechanism, two examples).
- **Append-only:** No edits to any existing v2.1 type, function, or test. `resolveZoneAccess` is REUSED, not changed.
- **Reuse the v2.1 active-window boundary rule** (both boundaries inclusive, `null` = unbounded) for `ResourceAccessGrant`, `ResourceAccessDelegate`, `org_links`, AND `policy_assignments`. Do NOT invent a divergent convention.
- **Pure functions, explicit `now: Date`** — no `Date.now()` / `new Date()` inside any resolver or helper.
- **No `routeTree.gen.ts` changes; demo-island isolation preserved.** `npm run test` (Vitest) zero failures; `npm run build` / `tsc` zero errors.

### Claude's Discretion
- Code stays in `model.ts` (a separate `digital-resource.ts` would create a circular import with the reused `resolveZoneAccess` — confirmed by ARCHITECTURE.md).
- `resolveResourceAccess` signature mirrors `resolveZoneAccess` style (explicit `now`, explicit subject clearance/personId, arrays passed in).
- Test file layout mirrors `physical-access.test.ts`.
- Exact seed IDs, person references, dates for SEED-06/07 (within the locked narratives).
- Whether `org_links.role` is typed as bare `string` or `('ADMIN' | ...) | (string & {})` for baseline autocomplete while staying open.

### Deferred Ideas (OUT OF SCOPE)
- `CLEARANCE_FLOOR` evaluator (unless a fixture needs it).
- Full 6-unit dataset (RSRC-SEED-01..05) — Phase 10.
- `WorldState` / `DigitalResourceWorld` / `TOGGLE_RESOURCE_GRANT` — Phase 10.
- All demo UI (RSRC-UI-01..03) — Phase 11.
- Runtime gate-evaluator plugin registry; Rust/PostgreSQL backend; in-app policy authoring; multi-homing.
- Modifying any existing v2.1 symbol.
</user_constraints>

<phase_requirements>
## Phase Requirements

The `09-SPEC.md` enumerates 11 numbered requirements; the orchestrator passed the granular RSRC-* IDs. Mapping:

| RSRC ID(s) | SPEC req | Research support |
|------------|----------|------------------|
| RSRC-01..05 (node types) | 1 | `NetworkNode`/`PlatformNode`/`ApplicationNode` strict-tree shapes; `ApplicationNode` has NO `classification`. Mirror `ZoneNode` field style. |
| RSRC-POLICY-01..05 | 4, 5 | `ResourcePolicy` with ordered `gates[]`; `policy_assignments[]` + active selector (boundary rule = `isGrantActive`); overlap validator; data-driven dispatch with unknown-kind→error. |
| RSRC-ACCESS-01..05 | 2, 6, 7, 8, 9 | App-classification inheritance helper; baseline gate semantics (clearance → own-tier → parent-tier); no cross-tier inheritance; advisory zone (non-blocking) via reused `resolveZoneAccess`; explainable trace result `{ allow, gates[], zoneAdvisory, policyVersion }`. |
| RSRC-GRANT-01..03 | 6, 7, 10 | `ResourceAccessGrant`; own-tier explicit grant gate; parent-tier prerequisite gate; no cross-tier inheritance. |
| RSRC-DELEG-01 | 10 | `ResourceAccessDelegate` + `canIssueResourceGrant` (closes v2.1 DELEG-03 gap). |
| RSRC-SEED-06 | 11 | Policy-shift fixture (D-04). |
| RSRC-SEED-07 | 11 | Non-baseline fixture (D-05). |
</phase_requirements>

## CRITICAL: ARCHITECTURE.md predates the SPEC — SPEC/CONTEXT win

The milestone `.planning/research/ARCHITECTURE.md` was written before `09-SPEC.md`/`09-CONTEXT.md` and describes an **earlier, simpler design**. The planner MUST use the SPEC shapes, not the ARCHITECTURE.md code samples, wherever they differ. The differences are not cosmetic — they are the whole point of Phase 9:

| Concern | ARCHITECTURE.md (OBSOLETE) | SPEC/CONTEXT (AUTHORITATIVE) |
|---------|----------------------------|------------------------------|
| Org association | Fixed `admin_org_id` / `asset_owner_org_id` fields on each node | `org_links: { org_id; role: string; valid_from; valid_until }[]` — open vocab, time-windowed (req 3) |
| Gate logic | Hardcoded 3-gate `switch` in `resolveResourceAccess` (gates `CLEARANCE`/`GRANT_LOOKUP`/`PREREQUISITE_GRANT`) | Data-driven: resolver iterates the active policy's `gates[]` by `kind`, dispatches each to an evaluator; unknown kind → error (req 5) |
| Policy | None — gates baked into the resolver | `ResourcePolicy` with `gates[]`; `policy_assignments[]` selected by timestamp; overlap validator (req 4) |
| Zone prereq | `zone_prereq_id` field on the node | Policy may declare a zone prerequisite; result attaches `zoneAdvisory` (req 8). Storage location (node vs. policy) is planner's call — SPEC says "the active policy declares a zone prerequisite," so **prefer a policy-level zone-prereq descriptor**, not a node field. |
| Delegation | Not implemented in P9 by ARCHITECTURE.md build order | `canIssueResourceGrant` IS implemented in P9 (req 10, closes DELEG-03) |
| App classification | `validateResourceClassification` comparing stored `minClearance` literals | `ApplicationNode` has NO classification field at all — derive via `app → platform.classification` at eval time (req 2). No stored-literal validator needed; the field simply doesn't exist. |

**What from ARCHITECTURE.md still holds:** the "append to `model.ts`, one module" rule (Pattern 1, Anti-Pattern 1 circular-import rationale); the pure-function + explicit-`now` contract; the test-file-per-domain rule; the gate-trace-as-typed-result pattern. **PITFALLS.md remains fully valid** (its pitfalls 1, 2, 3, 5, 6 map directly onto P9; 4 and 7 are P10/P11).

## Standard Stack

No new packages. All tooling already present and verified in the repo:

| Tool | Version (verified) | Purpose |
|------|--------------------|---------|
| TypeScript | strict mode (repo `tsconfig`) | type-level enforcement (e.g., `ApplicationNode` has no `classification`) |
| Vitest | repo-pinned (jsdom env) | `digital-resource.test.ts` runs under `npm run test` |

**Installation:** none. (Confirmed: `grep` for `ResourcePolicy|NetworkNode|resolveResourceAccess|org_links` in `demo/lib/` returns zero matches — append-only is clean; nothing to collide with.)

## Architecture Patterns

### Existing reusable assets (verified by reading `model.ts`)

| Asset | Line | Reuse for P9 |
|-------|------|--------------|
| `Clearance` (5-tier) + `CLEARANCE_RANK` | 8–21 | clearance gate compares ranks. **NOTE: the demo ladder is 5-tier `UNCLASSIFIED \| RESTRICTED \| CONFIDENTIAL \| SECRET \| TOP_SECRET`** — NOT the 4-tier backend CHECK constraint in CLAUDE.md. Use the 5-tier ladder. |
| `isGrantActive(grant, now)` | 232–237 | **Boundary rule to reuse verbatim** (both inclusive, null=unbounded). For `org_links` / `policy_assignments` / `ResourceAccessGrant`, either pass a `{valid_from, valid_until}`-shaped object to a shared inline check or write a thin `isWindowActive(valid_from, valid_until, now)` helper with IDENTICAL semantics. Do NOT copy with `<`/`>` drift (PITFALLS #6). |
| `isDelegateActive(delegate, now)` | 315–323 | direct template for the resource-delegate active check feeding `canIssueResourceGrant`. |
| `resolveZoneAccess(personId, zone, clearance, hasValidEscort, allZones, allGrants, now)` | 282–311 | call AS-IS for the advisory zone prerequisite. Returns `{ allow, gate, reason, detail? }`. Attach its `.allow`/`.reason` to `zoneAdvisory`; NEVER let it touch the resource `allow`. |
| `UnitId` | 393–399 | the 6 canonical org ids for `org_links.org_id` and delegate org fields. |
| `// --- Phase N: ... ---` section-comment convention | throughout | append under `// --- Phase 9: Digital Resource hierarchy model (v2.2) ---`. |

### Do NOT reuse `resolveGrant` (line 243) as a template
`resolveGrant` does an **ancestor walk** (the zone inheritance mechanism). Copying it is the #1 pitfall — it would leak cross-tier inheritance. The own-tier grant check is a flat `allGrants.find(g => g.person_id === p && g.resource_id === r && isActive)`. The parent-tier check is a **separate, explicit** flat lookup against `platform.network_id` / `app.platform_id`. No walk anywhere.

### `assertNever` is private (line 273)
The existing `assertNever` is module-private (not exported, used only inside the zone switch). For the gate-dispatch you need exhaustiveness over a **string-keyed open vocabulary**, which is fundamentally different: an unknown `kind` is a *runtime data condition* (a seed/policy could carry any string), so it must produce an **explicit error result**, not a compile error. Use a `switch (gate.kind) { ... default: return { kind: gate.kind, pass: false, reason: 'UNKNOWN_GATE_KIND' } }`. Reserve a TS-level exhaustive check only for the *known baseline union* if you model kinds as `'CLEARANCE' | 'OWN_TIER_GRANT' | ... | (string & {})`.

### Resolver shape (from SPEC req 9 — authoritative)
```typescript
// --- Phase 9: Digital Resource hierarchy model (v2.2) ---
interface ResourceGateResult { kind: string; pass: boolean; reason: string; }
interface ResourceAccessResult {
  allow: boolean;
  gates: ResourceGateResult[];
  zoneAdvisory: { zoneId: string; satisfied: boolean; reason: string } | null;
  policyVersion: { valid_from: Date | null; valid_until: Date | null } | null;
  reason?: string; // e.g. 'NO_ACTIVE_POLICY' (D-03)
}
```
- `allow` = AND of all gate `pass` values (short-circuit semantics per req 6: stop / report the failing gate). `zoneAdvisory` is set independently and never feeds `allow`.
- Gate evaluation order = the policy's `gates[]` array order (req 5 acceptance: "baseline kinds evaluate in list order").

### Gate-dispatch extension point (the open-vocabulary deliverable)
A single `evaluateGate(gate, ctx)` switch maps `kind → evaluator(params, ctx)`. `ctx` carries everything an evaluator might need: subject clearance, personId, the resolved effective classification, the resource's active `org_links`, the grant arrays, `now`. Adding a kind = adding one `case`. Document this in a comment as the extension point. **No runtime plugin registry** (explicitly out of scope).

## Don't Hand-Roll

| Problem | Don't build | Use instead |
|---------|-------------|-------------|
| Time-window active check | A new `isResourceGrantActive` with fresh boundary logic | Reuse `isGrantActive`'s exact inclusive/null rule (one shared `isWindowActive` helper) |
| Zone prerequisite evaluation | A second zone resolver | Call existing `resolveZoneAccess` directly (same file, no import) |
| Clearance comparison | New rank map | `CLEARANCE_RANK` (line 15) |
| Org id type | New string enum | `UnitId` (line 393) |

## Suggested Build Order (Phase-9-specific)

Strictly ordered; each unit testable before the next depends on it.

1. **Types** (append to `model.ts`): `ResourceTier`, `NetworkNode`, `PlatformNode`, `ApplicationNode` (no `classification`), `OrgLink`, `ResourcePolicy` + gate-descriptor union, `PolicyAssignment`, `ResourceAccessGrant`, `ResourceAccessDelegate`, `ResourceGateResult`, `ResourceAccessResult`.
2. **Pure helpers + engine** (append to `model.ts`):
   - `isWindowActive(valid_from, valid_until, now)` — shared boundary rule.
   - `activeOrgLinks(orgLinks, now)` and `activeOrgLinksForRole(orgLinks, role, now)`.
   - `effectiveClassification(node, allPlatforms)` — Network/Platform: own; Application: parent platform's.
   - `selectActivePolicy(policy_assignments, now)` → single assignment | null; plus `validatePolicyWindows(policy_assignments)` → overlap error string | null.
   - Baseline evaluators: `CLEARANCE`, `OWN_TIER_GRANT`, `PARENT_TIER_GRANT`, plus `REQUIRED_ROLE` (D-02).
   - `evaluateGate(gate, ctx)` dispatcher (unknown kind → error result).
   - `resolveResourceAccess(...)` — select active policy (none → D-03 DENY), iterate gates in order, build trace, then attach `zoneAdvisory` via `resolveZoneAccess`.
   - `canIssueResourceGrant(actor, resource, allDelegates, now)`.
3. **Tests** (`digital-resource.test.ts`, new): inline fixtures only, no seed imports, `const NOW = new Date("...")` fixed constant — mirror `physical-access.test.ts` (lines 7–39). One blocking test per acceptance criterion (see below).
4. **Seed fixtures** (append to `seed.ts`): SEED-06 policy-shift resource (D-04), SEED-07 non-baseline resource (D-05). These reference real existing zone IDs (e.g. `zone-room-sr1`, line 1004) if a fixture exercises the advisory path. Add a test that resolves each fixture.

## Named Blocking Tests (from SPEC Acceptance Criteria)

Every one is a hard gate; name them so the verifier can grep:

| Test name | Asserts |
|-----------|---------|
| `cross-tier-inheritance-blocked` | person with only a Network grant → Platform `resolveResourceAccess` returns `allow: false` (req 7) |
| `advisory-non-blocking` | all access gates pass, zone prereq unsatisfied → `allow: true` with non-null `zoneAdvisory` (req 8) |
| `app-classification-inherited` | App on a SECRET Platform → clearance gate requires SECRET; `ApplicationNode` has no `classification` property (req 2; runtime + type-level) |
| `unknown-gate-kind-errors` | policy with synthetic unknown `kind` → explicit error result, NOT allow (req 5) |
| `gates-evaluate-in-list-order` | baseline kinds evaluate in the policy's array order (req 5) |
| `baseline-allow` + one `baseline-deny-<gate>` per gate | ALLOW (all pass) and a DENY for each gate individually, each naming the failing gate (req 6) |
| `policy-shift-window-A` / `policy-shift-window-B` | adjacent non-overlapping assignments → policy A in window 1, B in window 2 (req 4) |
| `no-active-policy-denies` | uncovered timestamp → `{ allow: false, reason: 'NO_ACTIVE_POLICY' }` (req 4 / D-03) |
| `overlapping-windows-validator` | overlapping assignments surfaced by the validator (req 4) |
| `org-links-active-by-role` | two active OPERATOR links + one expired ADMIN link → both operators active, admin inactive (req 3) |
| `can-issue-admin` / `can-issue-delegate` / `cannot-issue-non-admin` / `cannot-issue-expired-delegate` | `canIssueResourceGrant` matrix (req 10) |
| `seed-06-shift-resolves` / `seed-07-non-baseline-applied` | seed fixtures resolve as designed (req 11) |

## Common Pitfalls (phase-9 subset of PITFALLS.md — all HIGH confidence)

1. **Cross-tier inheritance** (PITFALLS #1): do not copy `resolveGrant`'s ancestor walk. Own-tier = flat find; parent-tier = separate flat find. Guarded by `cross-tier-inheritance-blocked`.
2. **Advisory rendered/treated as a gate** (PITFALLS #2): `zoneAdvisory` is a separate field; `allow` is the AND of `gates[]` only. Guarded by `advisory-non-blocking`.
3. **App classification divergence** (PITFALLS #3, adapted): the SPEC removes the field entirely, so divergence is *impossible by construction* — do NOT add a `classification` field "for convenience" to `ApplicationNode`. Derive it.
4. **Unstable `now`** (PITFALLS #5): no `Date.now()`/`new Date()` inside any resolver/helper; tests use fixed `NOW`.
5. **Pattern drift / boundary drift** (PITFALLS #6): reuse `isGrantActive` semantics exactly; don't rename `valid_from`/`valid_until`.
6. **Silent default on unknown gate** — the resolver must fail-closed (explicit error, never ALLOW) for both unknown `kind` and no-active-policy (D-03).

## Runtime State Inventory

N/A — Phase 9 is greenfield, append-only TypeScript to a demo island. No databases, no live services, no OS-registered state, no secrets/env vars, no build artifacts beyond the standard `tsc`/Vite build. **None — verified by grep (zero existing resource symbols) and the demo-island isolation constraint.**

## Environment Availability

Step skipped: no external dependencies. Phase 9 is pure in-repo TypeScript exercised by the already-present Vitest. `npm run test` and `npm run build` are the only commands.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (jsdom), repo-pinned |
| Config file | `frontend/vite.config.ts` / repo Vitest config; Playwright excluded from the Vitest run (per CLAUDE.md) |
| Quick run command | `cd frontend && npm run test` |
| Full suite command | `cd frontend && npm run test && npm run build` |

### Phase Requirements → Test Map
All blocking tests live in `frontend/src/demo/lib/digital-resource.test.ts` (new). See "Named Blocking Tests" above — each maps 1:1 to a SPEC acceptance criterion. Test type: unit (pure functions, inline fixtures). Automated command: `cd frontend && npm run test`.

### Sampling Rate
- **Per task commit:** `npm run test` (the new file is fast; pure functions).
- **Per wave / phase gate:** `npm run test && npm run build` (tsc must be clean — the `ApplicationNode`-has-no-`classification` assertion is partly type-level).

### Wave 0 Gaps
- [ ] `frontend/src/demo/lib/digital-resource.test.ts` — NEW file; covers all RSRC-* via the named tests above. No shared fixtures/conftest needed (inline-fixture pattern, mirrors `physical-access.test.ts`). Framework already installed — no install step.

## Security Domain

`security_enforcement` is not set in this repo's config for demo-island work, and this is **demo/mock-only TypeScript with no real authn/authz, no network, no persistence**. Standard ASVS web categories (V2/V3/V4 auth/session/access-control, V5 input validation, V6 crypto) do not apply — there is no live trust boundary. The "security" of this phase is **model correctness and non-misrepresentation** (per PITFALLS.md "Security Mistakes"): the advisory must not be shown as a denial, unknown gates must fail-closed, and no-active-policy must deny. Those are covered by the blocking tests above. No cryptography is introduced (`Credential`/HMAC at lines 637–649 are untouched).

## Assumptions Log

| # | Claim | Section | Risk if wrong |
|---|-------|---------|---------------|
| A1 | Zone-prerequisite should be declared on the **policy** (a gate-like descriptor), not as a node field, because SPEC req 8 says "the active policy declares a zone prerequisite." | ARCHITECTURE discrepancy table | LOW — planner can place it on the policy or node; only the *advisory, non-blocking* behavior is locked. Either location satisfies the SPEC; policy-level is the closer reading. |
| A2 | `CLEARANCE_FLOOR` evaluator is NOT needed because SEED-06/07 as locked use only `REQUIRED_ROLE`. | D-02 | LOW — if the planner chooses a fixture variant that needs it, add one evaluator (the pattern is documented). |
| A3 | `org_links.role` open-vocab baseline = `ADMIN | ASSET_OWNER | OPERATOR | SECURITY_APPROVAL` (from SPEC req 3); only `ADMIN` may delegate (req 10). | User Constraints | LOW — explicit in SPEC. |
| A4 | The 5-tier `Clearance` ladder in `model.ts` is the one to use (NOT the 4-tier backend CHECK constraint mentioned in CLAUDE.md "Gotchas"). | Reusable assets | LOW — verified by reading `model.ts:8–21`; the demo island is independent of the backend DB. |

## Open Questions

1. **Zone-prerequisite storage location** (A1) — node field vs. policy descriptor. Recommendation: policy-level descriptor (matches SPEC wording, keeps the zone link versioned with the policy). Planner decides; behavior (advisory, non-blocking) is locked either way.
2. **`canIssueResourceGrant` signature surface** — SPEC shows `(actor, resource, now)` but the active-ADMIN-org-link and active-delegate checks need the resource's `org_links` and the delegate array. Recommendation: pass them explicitly (`canIssueResourceGrant(actorOrgId, resource, allDelegates, now)`) consistent with the pure-function/arrays-in style; the "actor" is an org for the ADMIN-link path. Planner finalizes the exact param list within the pure-function contract.
3. **`org_links.role` typing** (Claude's discretion, D) — bare `string` vs. `(BaselineRole) | (string & {})`. Recommendation: the union-with-`(string & {})` form for baseline autocomplete while staying open. Trivial; planner's call.

## Sources

### Primary (HIGH confidence)
- `frontend/src/demo/lib/model.ts` (read in full, 649 lines) — `Clearance`/`CLEARANCE_RANK` (8–21), `isGrantActive` (232–237), `resolveGrant` ancestor walk (243–270), `assertNever` private (273), `resolveZoneAccess` (282–311), `isDelegateActive` (315–323), `UnitId` (393–399), `ZoneNode`/`PhysicalAccessGrant`/`ZoneAccessDelegate` shapes.
- `frontend/src/demo/lib/physical-access.test.ts` (lines 1–90) — inline-fixture pattern, fixed-`NOW` convention, per-branch test structure, "5-tier ladder" describe block.
- `frontend/src/demo/lib/seed.ts` (export inventory + `ZONES` shape, 961+) — seed array/export pattern; real zone IDs for advisory references.
- `.planning/phases/09-digital-resource-model-policy-engine/09-SPEC.md` — 11 locked requirements + acceptance criteria (authoritative).
- `.planning/phases/09-digital-resource-model-policy-engine/09-CONTEXT.md` — D-01..D-05, canonical refs, code insights.
- `.planning/research/PITFALLS.md` — phase-tagged pitfalls (1,2,3,5,6 apply to P9).

### Secondary (MEDIUM confidence — superseded in part)
- `.planning/research/ARCHITECTURE.md` — milestone build order, append-to-`model.ts` rationale, circular-import argument (still valid); its gate/org-field/zone-prereq code samples are OBSOLETE per the discrepancy table above.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new deps; all reused assets read directly from source.
- Architecture / shapes: HIGH for the SPEC-locked shapes; the one risk (ARCHITECTURE.md staleness) is explicitly flagged and resolved in favor of the SPEC.
- Pitfalls: HIGH — grounded in source + validated PITFALLS.md.

**Research date:** 2026-06-02
**Valid until:** 2026-07-02 (stable demo island; no fast-moving external deps)
