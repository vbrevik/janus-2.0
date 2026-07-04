# Phase 13: Dataset Model & Access Resolver — Specification

**Created:** 2026-07-04
**Ambiguity score:** 0.14 (gate: ≤ 0.20)
**Requirements:** 13 locked (DATA-01..05, DATA-ACCESS-01..04, DATA-GRANT-01..03, DATA-DELEG-01)

## Goal

The dataset type system and 3-gate access resolver are defined, tested, and safe to build on: per-type level mechanisms are rank-safe or containment-safe (no false cross-type or cross-role substitution), the Application-grant prerequisite is an OR-gate across a dataset's linked Applications enforced at resolution time (not just issue time), dataset existence-visibility is gated independently from content access, classification-override validation prevents privilege escalation, and delegated issuing authority is capped at the delegate's own held access.

## Background

`frontend/src/demo/lib/model.ts` (1183 lines) has zero dataset-related code today (`grep -rin dataset` across `lib/`, `store/`, `components/` returns only unrelated comments about the v2.2 "digital resource dataset"). The file already carries the exact extension points this phase composes:

- `ResourceTier = "NETWORK" | "PLATFORM" | "APPLICATION"` (line 664) — frozen; Dataset must NOT be added to this union (byte-exact TS↔Rust golden-fixture parity contract)
- `CLEARANCE_RANK` (line 15), `isWindowActive(valid_from, valid_until, now)` (line 822, inclusive/null-unbounded semantics), `effectiveClassification(node, allPlatforms)` (line 855, single-hop fail-closed derivation) — all reusable as-is
- `ApplicationNode` (line 744) has no `classification` field by design — Dataset's own classification-override logic must mirror this derive-with-override pattern, not copy it

No Dataset code exists in `seed.ts`, `world-state.tsx`, or any component — this phase is the first to introduce the type.

## Requirements

1. **Dataset entity, multi-Application**: A `Dataset` links to one or more Applications.
   - Current: No `DatasetNode` type exists.
   - Target: `DatasetNode` carries `application_ids: string[]` (non-empty), `dataset_type: "MAILBOX" | "ARCHIVE_ROLE" | "DOCUMENT_SITE"`, `admin_org_id`, `asset_owner_org_id`, `classification_override: Clearance | null`.
   - Acceptance: Constructing/validating a `DatasetNode` with an empty `application_ids` array is rejected; a dataset with 2 `application_ids` is representable and both are recognized by the resolver (DATA-01, DATA-02, DATA-04).

2. **Per-type level mechanism**: `MAILBOX`/`DOCUMENT_SITE` use total-ordered rank tables; `ARCHIVE_ROLE` uses an explicit containment map.
   - Current: No level/role vocabulary exists.
   - Target: `MAILBOX`: `READ < SEND_AS < FULL_ACCESS`. `DOCUMENT_SITE`: `READ < CONTRIBUTE < FULL_CONTROL`. `ARCHIVE_ROLE`: a containment map — `ADMIN` contains `{CASE_HANDLER, READER}`, `CASE_HANDLER` contains `{READER}`, `READER` contains `{}`; a held role covers a required role only if identical or contained (directly/transitively); no containment relation ⇒ no substitution.
   - Acceptance: Comparing a `MAILBOX` level against a `DOCUMENT_SITE` or `ARCHIVE_ROLE` value is not representable at the type level (TypeScript rejects it). Resolving a required level/role not present in the type's own vocabulary fails closed (throws). A `READER`-only grant does not cover a `CASE_HANDLER`-gated action; an `ADMIN` grant covers both (DATA-03).

3. **Classification derive-with-override**: Dataset classification inherits from its parent Application(s) unless explicitly overridden, never lower.
   - Current: No classification derivation exists for datasets.
   - Target: `effectiveDatasetClassification(dataset, applications, platforms)` returns `classification_override` when set, else the (single, since all linked Applications share one classification tier in practice) effective classification of the parent Application via the existing `effectiveClassification()`. A constructor/validator rejects any override strictly lower than the derived base.
   - Acceptance: An override equal to the parent's classification is accepted (not just strictly higher); an override strictly lower than the parent's classification is rejected (DATA-05).

4. **3-gate resolver with resolution-time Application-grant OR-gate**: `resolveDatasetAccess` chains clearance → Application-grant (OR across `application_ids`) → dataset-grant.
   - Current: No resolver exists.
   - Target: `resolveDatasetAccess(person, dataset, applications, platforms, appGrants, datasetGrants, now)` returns `{ allow, visible, gates, reason? }`. Gate 1: clearance ≥ effective dataset classification. Gate 2: an active `ResourceAccessGrant` (v2.2 primitive) on ≥1 of `dataset.application_ids`, evaluated at `now` via `isWindowActive` — not merely "was ever issued". Gate 3: an active `DatasetAccessGrant` covering the required level/role, evaluated at `now`.
   - Acceptance: `allow: true` requires all 3 gates to pass in order; if the person's only qualifying Application grant expired before `now` while a `DatasetAccessGrant` for the same dataset is still nominally active at `now`, `resolveDatasetAccess` returns `allow: false` with gate 2 as the failing gate (DATA-ACCESS-01, DATA-ACCESS-02, DATA-ACCESS-03). A dataset referencing a non-existent Application id fails closed (throws a seed-integrity error), mirroring `effectiveClassification`'s existing pattern. A `DatasetAccessGrant` recording a level/role outside its dataset's own type vocabulary is treated as invalid (denied), not silently accepted.

5. **Effective access aggregation**: highest-active-grant for ranked types; containment-union for `ARCHIVE_ROLE`.
   - Current: No aggregation logic exists.
   - Target: For `MAILBOX`/`DOCUMENT_SITE`, effective level = the highest-ranked currently-active grant. For `ARCHIVE_ROLE`, effective access = the union of containment coverage across all currently-active role grants (a person holding both `CASE_HANDLER` and a future unrelated role has the coverage of both).
   - Acceptance: A person with concurrent active `READ` and `FULL_ACCESS` `MAILBOX` grants resolves to `FULL_ACCESS`. A person with only a `CASE_HANDLER` `ARCHIVE_ROLE` grant covers `CASE_HANDLER`- and `READER`-gated actions but not `ADMIN`-gated ones (DATA-GRANT-01, DATA-GRANT-02, DATA-GRANT-03).

6. **Existence-visibility gate, independent of content access**: `visible` is driven solely by the Application-grant gate.
   - Current: No visibility concept exists — v2.2's Resource Browser shows all resources unconditionally.
   - Target: `resolveDatasetAccess`'s `visible: boolean` = true iff gate 2 (Application-grant OR-gate) passes, regardless of clearance (gate 1) or the dataset-grant (gate 3). No exemption for `admin_org` or active delegates — they follow the same rule as anyone else.
   - Acceptance: A person with an active Application grant but no `DatasetAccessGrant` gets `visible: true, allow: false` — a distinct, reachable state, proving the dataset "is known to exist" without content access. A person with zero qualifying Application grants (even if they hold a `DatasetAccessGrant` directly — an orphan case) gets `visible: false` (DATA-ACCESS-04).

7. **Delegate-capped issuing authority**: `canIssueDatasetGrant` grants `admin_org` unrestricted authority; delegates are capped at their own held grant.
   - Current: No issuing-authority check exists for datasets.
   - Target: `canIssueDatasetGrant(actor, dataset, requestedLevel, datasetGrants, delegates, now)` returns `true` for an active `admin_org` actor unconditionally, and for an active delegate ONLY when the delegate holds their own active `DatasetAccessGrant` on that exact dataset AND `requestedLevel` is at/below what their own grant covers (rank ≤ for ranked types, containment-covers for `ARCHIVE_ROLE`); `false` for a delegate with no personal grant on the dataset, a non-admin/no-delegate actor, or an expired-delegate actor.
   - Acceptance: A delegate holding only `CASE_HANDLER` cannot issue an `ADMIN` grant to anyone (including themselves); a delegate with zero grants on the dataset can issue nothing; `admin_org` can issue any level regardless of its own grant state (DATA-DELEG-01).

## Boundaries

**In scope:**
- `frontend/src/demo/lib/model.ts` (append-only): `DatasetNode`, `DatasetAccessGrant`, `DatasetAccessDelegate`, per-type level/containment tables, `resolveDatasetAccess`, `effectiveDatasetClassification`, `canIssueDatasetGrant`
- `frontend/src/demo/lib/seed.ts`: minimal inline test fixtures needed to exercise the resolver in this phase's own test suite (a handful of datasets/grants/delegates) — NOT the full Phase 14 mock dataset (≥2 mailboxes, archive system, ≥2 document sites, deny-matrix)
- Exhaustive Vitest coverage for every requirement and every locked edge/prohibition below

**Out of scope:**
- `world-state.tsx` reducer/actions, `DatasetWorld` sub-object, or any WorldState wiring — that is Phase 14
- Full mock dataset (DATA-SEED-01..06) — that is Phase 14
- Any UI component (Resource Browser extension, Access Explorer, issuing form) — that is Phase 15
- Backend/Postgres/Rust — out of scope for the entire v2.3 milestone (demo/mock only)
- Modifying the v2.2 `ResourceTier` union, `resolveResourceAccess`, or any existing digital-resource code — the dataset resolver is a standalone composition, never a union member

## Constraints

- Must not modify the frozen v2.2 `ResourceTier` union or `resolveResourceAccess` — preserves the byte-exact TS↔Rust golden-fixture parity contract (Pitfall 5).
- Every time-dependent function takes an explicit `now: Date` parameter; none call `Date.now()`/`new Date()` internally (matches the existing Phase 9 convention, keeps tests deterministic).
- The existing v2.2 golden-fixture and digital-resource Vitest suites must remain green and untouched.
- Zero new npm dependencies (per research/STACK.md — TypeScript discriminated unions, existing Vitest patterns are sufficient).

## Acceptance Criteria

- [ ] `DatasetNode` construction/validation rejects an empty `application_ids` array
- [ ] Cross-type level/role comparison (e.g. a `MAILBOX` level vs. an `ARCHIVE_ROLE` role) is not representable at the TypeScript type level
- [ ] Resolving a level/role not in the dataset's own type vocabulary fails closed (throws), for both the rank-table types and the containment type
- [ ] `ARCHIVE_ROLE` containment: `ADMIN` covers `CASE_HANDLER` and `READER`; `CASE_HANDLER` covers `READER` but not `ADMIN`; `READER` covers only itself — asserted by passing tests for each pair
- [ ] `effectiveDatasetClassification` accepts an override equal to the parent's classification and rejects one strictly lower
- [ ] A dataset referencing a non-existent Application id fails closed (throws) rather than silently resolving
- [ ] `resolveDatasetAccess` returns `allow: false` when the Application-grant gate fails at evaluation time `t`, even with a nominally-active `DatasetAccessGrant` at `t`
- [ ] `resolveDatasetAccess`'s Application-grant gate is an OR across `application_ids` — an active grant on any one linked Application suffices
- [ ] `resolveDatasetAccess` returns `visible: true, allow: false` as a distinct, reachable state for a person with an Application grant but no `DatasetAccessGrant`
- [ ] `resolveDatasetAccess` returns `visible: false` for a person with zero qualifying Application grants, even if they hold a `DatasetAccessGrant` directly (orphan case) — with no exemption for `admin_org` or delegates
- [ ] Effective access = highest-active-grant for `MAILBOX`/`DOCUMENT_SITE`; containment-union of active role grants for `ARCHIVE_ROLE`
- [ ] `canIssueDatasetGrant` returns `true` unconditionally for an active `admin_org` actor
- [ ] `canIssueDatasetGrant` returns `false` for a delegate attempting to issue above what their own active `DatasetAccessGrant` on that dataset covers, and for a delegate with no personal grant on the dataset
- [ ] `visible=true` is never read/used as `allow=true` anywhere in this phase's code (no downstream logic treats visibility as access) — verified by test asserting both fields are independently controllable
- [ ] `admin_org`'s own access to a dataset's content still goes through the full 3-gate `resolveDatasetAccess` — an `admin_org` actor with no clearance/Application-grant/dataset-grant is denied content access despite unrestricted issuing authority
- [ ] `npm run test` passes with zero failures and zero TypeScript errors after these additions
- [ ] The existing v2.2 golden-fixture and digital-resource Vitest suites remain green and unmodified

## Edge Coverage

**Coverage:** 6/18 applicable edges resolved as new criteria · 4 covered by existing criteria/Phase-14 backstop · 9 dismissed (not applicable to this domain) · 0 unresolved

| Category | Requirement | Status | Resolution / Reason |
|----------|-------------|--------|---------------------|
| empty | DATA-01 | ✅ covered | Empty `application_ids` rejected — Acceptance Criteria row 1 |
| encoding | DATA-01 | ⛔ dismissed | IDs are opaque string keys, not user-facing text requiring normalization |
| adjacency | DATA-02 | ⛔ dismissed | `dataset_type` is a fixed discriminated-union tag, not an interval |
| empty | DATA-02 | ⛔ dismissed | `dataset_type` is a required single-value field, not a collection |
| ordering | DATA-02 | ⛔ dismissed | No list-ordering operation exists over `dataset_type` values |
| unclassified | DATA-03 | ✅ covered | Unrecognized level/role fails closed — Acceptance Criteria row 3 |
| adjacency | DATA-04 | ⛔ dismissed | `admin_org_id`/`asset_owner_org_id` are two fixed string fields, not a collection |
| empty | DATA-04 | ⛔ dismissed | Same as above — not a collection |
| ordering | DATA-04 | ⛔ dismissed | Same as above — not a collection |
| unclassified | DATA-05 | ✅ covered | Override-equal-to-parent accepted — Acceptance Criteria row 5 |
| unclassified | DATA-ACCESS-01 | ✅ covered | Non-existent Application id fails closed — Acceptance Criteria row 6 |
| unclassified | DATA-ACCESS-02 | ✅ covered | Grant recording an out-of-vocabulary level/role treated as invalid — folded into Acceptance Criteria row 3 |
| unclassified | DATA-ACCESS-03 | 🧪 backstop | Gate-order short-circuit already covered by Phase 14's DATA-SEED-06 deny-matrix (held-out test); no new Phase-13 criterion needed beyond the 3-gate-order description in Requirement 4 |
| unclassified | DATA-ACCESS-04 | ✅ covered | Orphan dataset-grant-without-app-grant is the requirement's own defining case — Acceptance Criteria row 10 |
| unclassified | DATA-GRANT-01 | ⛔ dismissed | `valid_from > valid_until` inherits `isWindowActive`'s existing semantics (naturally always-inactive, no `now` satisfies both bounds) — matches v2.1/v2.2 precedent of not special-casing this |
| unclassified | DATA-GRANT-02 | ⛔ dismissed | Duplicate grants at the same level are idempotent under both rank-max and containment-union aggregation |
| unclassified | DATA-GRANT-03 | ✅ covered | All-grants-expired ⇒ no effective access — already implicit in "active grant" language throughout Requirement 5 |
| unclassified | DATA-DELEG-01 | ✅ covered | Delegate grant expiring exactly at `now` — governed by the inclusive `isWindowActive` convention reused throughout; no new criterion needed |

## Prohibitions (must-NOT)

**Coverage:** 3/3 applicable prohibitions resolved · 0 unresolved

| Prohibition (must-NOT statement) | Requirement | Status | Verification / Reason |
|----------------------------------|-------------|--------|------------------------|
| `visible=true` must never be read/used downstream as `allow=true` — they are independent fields with independent meanings | DATA-ACCESS-04 | resolved | test — Acceptance Criteria row 15 |
| A delegate must not be able to issue a grant exceeding what their OWN held `DatasetAccessGrant` covers (no self- or other-escalation via delegation) | DATA-DELEG-01 | resolved | test — Acceptance Criteria row 13 |
| `admin_org`'s unrestricted ISSUING authority must not be conflated with unrestricted ACCESS — admin_org's own content access still goes through the full 3-gate resolver | DATA-DELEG-01, DATA-ACCESS-03 | resolved | test — Acceptance Criteria row 16 |

Dropped as canon (owned by code-review/OWASP, not minted here): dataset-id spoofing/IDOR-shaped attacks on the delegate check; PII in audit logs.
Dropped as routine engineering (owned by tests, not minted here): fail-open on lookup errors; off-by-one/timezone bugs in window-active checks; silent default on unrecognized `dataset_type` (already covered by the DATA-03 edge above).

## Ambiguity Report

| Dimension          | Score | Min  | Status | Notes                              |
|--------------------|-------|------|--------|-------------------------------------|
| Goal Clarity       | 0.90  | 0.75 | ✓      | 3-gate resolver, per-mechanism rules, resolution-time enforcement all concretely specified |
| Boundary Clarity   | 0.85  | 0.70 | ✓      | Explicit in/out-of-scope list; touches model.ts + minimal seed.ts fixtures only |
| Constraint Clarity | 0.80  | 0.65 | ✓      | Parity-contract, explicit-`now`, zero-new-dependency constraints all named |
| Acceptance Criteria| 0.85  | 0.70 | ✓      | 16 pass/fail criteria incl. edge and prohibition rows |
| **Ambiguity**      | 0.14  | ≤0.20| ✓      |                                     |

Status: ✓ = met minimum, ⚠ = below minimum (planner treats as assumption)

## Interview Log

| Round | Perspective    | Question summary         | Decision locked                    |
|-------|----------------|--------------------------|-------------------------------------|
| 1     | Researcher     | Should Phase 13 touch only model.ts, or also seed.ts? | Also touch seed.ts for minimal inline test fixtures (not the full Phase 14 mock dataset) |
| 1     | Researcher     | Re-confirm 3 research-default decisions (ARCHIVE_ROLE ordering, delegation cap, dataset-Application relationship)? | User wanted to change all three — flagged for round 2 |
| 2     | Boundary Keeper | Which decision(s) to change? | All three: ARCHIVE_ROLE ordering, delegation cap, dataset-Application relationship |
| 3     | Failure Analyst | Precise semantics: ARCHIVE_ROLE exact-match or subsumption? Multi-app AND or OR gate? | ARCHIVE_ROLE: partial containment ("one role can contain another... if not part of, then no substitution"). Multi-app: OR-gate (any one qualifying Application suffices) |
| 4     | Failure Analyst | Delegation cap precise mechanism — own grant required, no grant = issue nothing? | Confirmed: delegate must hold own active DatasetAccessGrant on that exact dataset; no grant = can issue nothing |
| 5     | Seed Closer (unscheduled — user-initiated) | User raised a new requirement: dataset "parts" should be invisible, not merely denied, unless granted | New DATA-ACCESS-04 requirement: visibility gated solely by Application-grant, independent of clearance/dataset-grant, no admin/delegate exemption, surfaced as an explicit `visible` field |
| 5.5   | Edge probe (engine-driven) | 18 candidate edges surfaced across all 13 requirements | 5 specified as new acceptance criteria, 4 folded into existing/Phase-14-backstop criteria, 9 dismissed as inapplicable to this domain (enum/fixed-field false positives, inherited window semantics, idempotent aggregation) |
| 5.6   | Prohibition probe (adversarial recall) | ~10 raw candidates recalled; filtered to genuine values/safety-adjacent risks | 3 kept as test-tier prohibitions (visible/allow conflation, delegate self-escalation, admin_org issuing-vs-access conflation); 2 dropped as canon (IDOR-shaped/PII), 3 dropped as routine engineering |

REQUIREMENTS.md and ROADMAP.md were updated and committed mid-interview (commit `2612f2f`) to carry these decisions forward before this SPEC.md was written, since they superseded the milestone-level "Resolved Decisions" that had been taken from unconfirmed research defaults.

---

*Phase: 13-dataset-model-access-resolver*
*Spec created: 2026-07-04*
*Next step: /gsd-discuss-phase 13 — implementation decisions (exact TypeScript shape for the containment map, test file organization, etc.)*
