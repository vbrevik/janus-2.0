---
phase: 11
phase_name: "digital-resource-backend"
project: "Janus 2.0"
generated: "2026-07-03"
counts:
  decisions: 8
  lessons: 6
  patterns: 5
  surprises: 4
missing_artifacts: []
---

# Phase 11 Learnings: digital-resource-backend

## Decisions

### Live-DB migration strategy = Option C (clean rebuild), chosen when reality invalidated both planned options
The plan front-loaded rename-in-place vs compensating-migration, both predicated on `_sqlx_migrations` contents. Task 0's read-only investigation found a third state — live janus2 had NO `_sqlx_migrations` table at all while fully populated. The user chose a destructive `DROP SCHEMA` + full re-migrate, approved twice explicitly, with a pre-rebuild `pg_dump` retained.

**Rationale:** Both planned modes were unexecutable as written; a clean rebuild made the live DB migration-tracked for the first time, eliminating future checksum drift entirely.
**Source:** 11-01-SUMMARY.md (key-decisions, Deviation From Plan)

### Resource tables use standalone TEXT primary keys, not FKs into the SERIAL int world
The 8 resource tables carry TEXT PKs mirroring the TS model's string ids — deliberately NOT foreign keys to the integer `organizations`/`person` tables (CONTEXT D-01). `resource_applications` has no classification column (derived from parent platform at resolution time).

**Rationale:** Keeps the digital-resource domain shape-identical to the parity-reference TS model; the int-vs-text org-id split later became a documented reason Option A authz was a data-model build, not a code change.
**Source:** 11-01-SUMMARY.md, 11-03-SUMMARY.md

### Cross-engine parity proven via a committed golden JSON contract, with TS owning the on-disk format (D-06)
A Vitest exporter computes resolver outputs at three fixed timestamps and writes normalized JSON; a plain Rust `#[test]` loads it and asserts `serde_json::to_value` byte-equality. The TS side normalizes `Date` → chrono `NaiveDateTime`'s serde form and renames camelCase → snake_case, so Rust uses default serde untouched.

**Rationale:** The golden file is the contract; one side owns formatting so neither engine carries adapter code in production paths. Covers the inclusive window boundary and the NO_ACTIVE_POLICY fail-closed DENY.
**Source:** 11-02-SUMMARY.md (D-06, Parity Approach)

### GateDescriptor in Rust is a tagged enum with `#[serde(other)] Unknown` as the fail-closed sink
`#[serde(tag = "kind")]` over the four baseline kinds, with an Unknown arm that resolves to `UNKNOWN_GATE_KIND` / deny — the Rust twin of the TS open-edge union.

**Rationale:** Same two-layer philosophy as Phase 9: typed exhaustiveness for known kinds, fail-closed handling for injected unknowns.
**Source:** 11-02-SUMMARY.md

### Write authz = Option B (role-based JWT gate), org-based model deferred to SEED-012
Investigation against the live DB proved no person→org linkage exists (person has no org column; relations CHECK allows only person/vendor; `resource_org_links` empty; integer vs text org-id spaces disjoint) — so the resolver-aligned org-based authority (Option A) is a data-model build, not a code change. Both write endpoints gate on `auth.claims.role == "admin"`; body org fields are ignored for authorization.

**Rationale:** Closes the confirmed IDOR minimally, matches the codebase's role-based guard convention, and records the correct long-term model in a seed with its blocking preconditions.
**Source:** 11-03-SUMMARY.md (key-decisions), .planning/seeds/SEED-012

### PolicyVersion output stays NaiveDateTime after the DateTime<Utc> migration — parity over uniformity
When resolver internals and DB reads migrated to `DateTime<Utc>` (DB columns are TIMESTAMPTZ), the `PolicyVersion` serde output kept `NaiveDateTime`, converting at the output boundary via `.naive_utc()` — because `DateTime<Utc>` would emit a `Z` suffix and break golden-fixture byte-parity.

**Rationale:** The serialized contract is frozen by the golden file; internal types can modernize as long as the boundary preserves the bytes.
**Source:** 11-03-SUMMARY.md (key-decisions)

### Manager deliberately NOT granted access.write; NDA self-sign gated the same as all NDA writes
The permission seed gives admin all 7 `<domain>.write` keys, manager 6 (issuing/revoking access grants is a privileged security operation), operator/viewer none. `sign_nda`/`reject_nda` gate on `nda.write` — with the documented consequence that a future end-user role can't self-sign until a self-service permission exists (no enduser seed users exist yet, so nothing breaks today).

**Rationale:** Least privilege now, with the future decision recorded rather than silently pre-empted.
**Source:** 11-04-SUMMARY.md (key-decisions)

### Idempotency gap fixed at the constraint level, not the handler level
The verifier found `uq_grant` treated NULLs as distinct (Postgres default), so `ON CONFLICT DO NOTHING` never fired for null-window grants — duplicates accumulated. Fix: a migration deduping existing rows then recreating the constraint as `UNIQUE NULLS NOT DISTINCT` (PG 15), rather than a handler-side `WHERE NOT EXISTS`.

**Rationale:** The constraint protects the data layer against ANY writer (future handlers, scripts), not just this code path, and restores the original constraint-backed natural-key design intent.
**Source:** 11-04-SUMMARY.md (Gap Closure)

---

## Lessons

### A read-only investigation task before destructive DB work earns its cost
Plan 01's Task 0 (pure investigation) is what discovered the unanticipated third live-DB state before any change was made — turning "run the planned repair" into an informed user decision with a backup, instead of a mid-flight failure.

**Context:** The migration repair was also rehearsed on a throwaway `janus2_fresh` DB before any live action.
**Source:** 11-01-SUMMARY.md

### Client-supplied identity in an authz check is an IDOR, even when the check itself is correct
The first committed handlers authorized `can_issue_resource_grant(&data.actor_org_id, …)` — a correct authority function fed a **client-chosen org**, so any authenticated caller could name an ADMIN org and issue grants. The authorizing identity must derive from the authenticated principal (JWT), never the request body.

**Context:** Found and fixed in-phase (commit 5e7bcb5); the resolver function itself was retained (`#[allow(dead_code)]`) for SEED-012.
**Source:** 11-03-SUMMARY.md (Security — the IDOR)

### Requirements that assume nonexistent data models surface as security holes, not planning findings
RSRC-BE-04's org-based server-side re-validation was unimplementable as written because the person→org linkage it presumed doesn't exist in the schema. The mismatch was discovered as a live IDOR mid-phase, forcing an unplanned authz-model decision under pressure.

**Context:** Recorded as an accepted override in 11-VERIFICATION.md; the milestone retrospective generalized it as "validate requirements against the data model before they become security assumptions."
**Source:** 11-03-SUMMARY.md, 11-VERIFICATION.md (overrides)

### Rocket's `Result<_, String>` responder makes errors look like success
`vendor_relations` write handlers returned `Result<Json<T>, String>` — Rocket's String responder emits **200 OK with the error text as the body**, so DB failures masqueraded as success and 403 was unrepresentable. Handlers must use `Status` (or a mapped error enum) as the error type.

**Context:** Also required adding an `AppError::Forbidden` variant — the existing `Unauthorized` mapped to 401, and 403-for-authenticated-but-unauthorized was unrepresentable in AppError-based modules.
**Source:** 11-04-SUMMARY.md (Auto-fixed Issues)

### Postgres UNIQUE treats NULLs as distinct — idempotency keys with nullable columns need `NULLS NOT DISTINCT`
The default-shape request (both window fields null) silently bypassed `uq_grant` for every insert. Any natural key including nullable columns must either exclude them, coalesce them, or use PG 15's `UNIQUE NULLS NOT DISTINCT`.

**Context:** Caught by the verifier's idempotency check, not by the handler tests — the duplicate rows were only visible by counting.
**Source:** 11-04-SUMMARY.md (Gap Closure)

### Paused executors can leave a non-compiling tree spanning two plans
The 11-03 interruption left a half-done `NaiveDateTime→DateTime<Utc>` migration plus a prematurely-started 11-04 CORS change (wrong rocket_cors API). Recovery required completing the in-scope migration and backing the out-of-scope change out to HEAD — a judgment call about which half-work belonged to which plan.

**Context:** The HANDOFF.json's context notes were what made the two workstreams distinguishable on resume.
**Source:** 11-03-SUMMARY.md (key-decisions)

---

## Patterns

### Pure resolver module with explicit time injection — the backend's first
`resolver.rs` imports no Rocket/PgPool, every time-dependent function takes explicit `now`, zero `Utc::now()` (grep-asserted). Handlers assemble plain input shapes (`ResolverResource` etc.) from flat sqlx rows and call the pure core.

**When to use:** Any decision logic that must be deterministic, parity-testable, and reusable outside HTTP context — mirrors the demo's `lib/` discipline on the Rust side.
**Source:** 11-02-SUMMARY.md

### Permission gate idiom that denies on infrastructure failure
`if !role_has_permission(...).await.unwrap_or(false) { return Err(Status::Forbidden) }` — the `.unwrap_or(false)` converts a DB error during the permission check into a deny (403), never a 500 or an accidental allow.

**When to use:** Every authorization check backed by a fallible lookup; fail-closed applies to the check's own failure modes, not just its answer.
**Source:** 11-04-SUMMARY.md (patterns)

### Side-effect-free gate-passage proof in tests
To prove an authz gate *passes* for an authorized role without mutating state, hit a post-gate validation error: a 400 response proves the gate was cleared, while 403 proves rejection — no test data is written either way.

**When to use:** Integration-testing write-endpoint authorization against a live/persistent DB.
**Source:** 11-04-SUMMARY.md (patterns), 11-03-SUMMARY.md (admin→404-clears-gate)

### Pure, unit-testable env validation with fail-loud startup
`validate_jwt_secret(Option<String>) -> Result` is pure (testable without env-var races); `read_jwt_secret` wraps env access; `create_rocket` prints FATAL and exits 1 **before** creating the DB pool or binding the port.

**When to use:** Any mandatory secret/config — validate before acquiring resources, and split the pure predicate from the env read for testability.
**Source:** 11-04-SUMMARY.md (SEC-03)

### Existence probe instead of full object assembly when authz no longer needs it
Once the role gate replaced org-based authority, the full `ResolverResource` build on the write path became dead code — replaced by `assert_resource_exists`, a single EXISTS-over-UNION query used purely for 404 validation.

**When to use:** After an authz-model change, re-derive what the handler actually needs; don't keep assembling rich objects whose only consumer was the removed check.
**Source:** 11-03-SUMMARY.md (patterns)

---

## Surprises

### The live dev DB was fully populated but had never been migration-tracked
No `_sqlx_migrations` table existed at all — a state neither planned mode anticipated, and the reason `sqlx migrate run` behavior on the "drifted DB" had been unpredictable for two milestones.

**Impact:** Forced the Option C rebuild decision (user-approved, backed up); also flushed out a latent `person_pkey` duplicate-key bug (sequence never advanced past explicit-id seed inserts).
**Source:** 11-01-SUMMARY.md

### The golden fixture's own "no policy" case initially resolved ALLOW
The NO_ACTIVE_POLICY fixture used `valid_from: null` (unbounded start), so the "before the policy" timestamp fell *inside* the window — the parity harness's first run caught the test data being wrong, not the engines.

**Impact:** Window start bounded; a reminder that fail-closed tests must verify their preconditions actually trigger the fail path.
**Source:** 11-02-SUMMARY.md (Auto-fixed Issues)

### Delegated UAT found a convention breach the 12-test suite missed
The user delegated UAT execution ("you run the tests for me"); live probing found the roles module returned **401 instead of 403** at all 7 permission-gate sites (`AppError::Unauthorized`) — a module the SEC-02 sweep had deliberately left untouched as pre-existing behavior.

**Impact:** Fixed in-session (ac6b57b, all 7 sites → Forbidden, regression test added, suite 13/13); showed that convention-conformance bugs hide precisely in the code carved out as "surgical scope."
**Source:** 11-UAT.md (test 4)

### Idempotent-by-design inserts silently weren't — for the endpoint's default input
The most common request shape (permanent grant, both window fields null) was exactly the shape that bypassed the uniqueness constraint. Four identical rows accumulated before the verifier counted them.

**Impact:** Constraint-level fix + dedup migration applied to both DBs; grants restored to the 18 seed rows. Idempotency claims need a duplicate-count assertion, not just an `ON CONFLICT` clause in the SQL.
**Source:** 11-04-SUMMARY.md (Gap Closure)
