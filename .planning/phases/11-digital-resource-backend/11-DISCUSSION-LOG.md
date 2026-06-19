# Phase 11: Digital Resource Backend & Resolver Port - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-19
**Phase:** 11-digital-resource-backend
**Areas discussed:** Migration strategy, DB seeding mechanism, Resolver port & parity test, API surface shape

---

## Migration strategy

| Option | Description | Selected |
|--------|-------------|----------|
| One additive migration | Single migration creating all 8 tables, authored against the live drifted DB only; doesn't fix the broken chain | |
| Per-entity migrations | 8 separate migration files | |
| Fix the chain first | Repair the broken clean-DB migration history, then add tables on a clean baseline | ✓ |

**User's choice:** Fix the chain first.
**Notes:** Flagged as a scope expansion contradicting the locked 11-SPEC "additive-only" constraint. On the follow-up scope question (separate prerequisite phase / include in 11 / revert), the user chose **Include chain-fix in Phase 11**. SPEC amendment pending (new constraint + acceptance criterion: clean DB migrates end-to-end).

### FK approach (org_links / grant issuers)

| Option | Description | Selected |
|--------|-------------|----------|
| FK to existing organizations/person | Reference real organizations.id / person.id | |
| Standalone string IDs (match seed) | Store seed string IDs, no DB FK | |
| You decide during planning | Verify against live DB, then choose | ✓ |

**User's choice:** Decide during planning (verify live DB first).

---

## DB seeding mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| Embedded seed migration | INSERTs in a seed migration, matching seed_enduser_official_users.sql; idempotent | ✓ |
| Separate seed binary/script | cargo bin / manual SQL | |
| Startup seeding | Seed on boot if empty | |

**User's choice:** Embedded seed migration (idempotent ON CONFLICT).

### Seed parity to seed.ts

| Option | Description | Selected |
|--------|-------------|----------|
| Hand-port now, document the mapping | Translate fixtures to SQL by hand, cite seed.ts | ✓ |
| Generate SQL from seed.ts | Tooling emits SQL so they can't diverge | |
| You decide during planning | Lock the outcome, defer mechanism | |

**User's choice:** Hand-port now, document the mapping.

---

## Resolver port & parity test

| Option | Description | Selected |
|--------|-------------|----------|
| In the digital_resources domain | resolver.rs alongside models/handlers | ✓ |
| In shared/ | Cross-cutting infra | |
| You decide during planning | Lock purity, defer placement | |

**User's choice:** In the digital_resources domain (pure module, explicit timestamp).

### Parity test mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| Golden fixtures from TS → JSON | TS exports outputs to committed JSON; Rust asserts byte-equal | ✓ |
| Hand-mirrored Rust cases | Rust hardcodes expected results | |
| You decide during planning | Lock coverage, defer mechanism | |

**User's choice:** Golden fixtures from TS → JSON (byte-equal assertion).

---

## API surface shape

| Option | Description | Selected |
|--------|-------------|----------|
| One aggregate GET | /api/digital-resources/world returns whole payload | ✓ |
| Per-entity REST endpoints | Separate GETs per entity | |
| Both | Per-entity + aggregate | |

**User's choice:** One aggregate GET.

### Response wrapper + issue-endpoint actor identity

| Option | Description | Selected |
|--------|-------------|----------|
| ApiResponse + AuthGuard person→org | Existing wrapper; actor from authenticated person, re-validated server-side | ✓ |
| Raw JSON + explicit actor in body | Bare JSON; actor in request body | |
| You decide during planning | Lock conventions, defer mechanics | |

**User's choice:** ApiResponse + AuthGuard person→org.

---

## Claude's Discretion

- FK vs standalone IDs for org_links/grant-issuers — verify live `organizations`/`person` schema, then choose
- Resolver file placement within `src/digital_resources/` and module decomposition

## Deferred Ideas

- Migration-chain repair as a separate prerequisite phase (Phase 10.5) — offered but folded into Phase 11 at the user's choice; recorded for re-split if the planner finds Phase 11 too large
- All Phase 12 UI/loader/issuing-form work — out of scope by SPEC
