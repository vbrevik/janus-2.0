# Phase 9: Digital Resource Model & Policy Engine - Pattern Map

**Mapped:** 2026-06-02
**Files analyzed:** 3 (2 modified, 1 created)
**Analogs found:** 3 / 3 (all in-repo v2.1 templates)

All Phase 9 work is **append-only TypeScript** in the demo island (`frontend/src/demo/lib/`). Every new symbol has a direct v2.1 analog in the same files. No backend, no UI, no new deps. Mirror the existing conventions exactly — do not invent divergent shapes.

## File Classification

| New/Modified File | Op | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|-----|------|-----------|----------------|---------------|
| `frontend/src/demo/lib/model.ts` | MODIFY (append) | model + resolver (pure-fn library) | transform / request-response | self (Phase 5/6 zone block, lines 38-323) | exact |
| `frontend/src/demo/lib/seed.ts` | MODIFY (append) | fixtures / data | static data | self (`ZONES`/`GRANTS`/`DELEGATES`, lines 1100-1195) | exact |
| `frontend/src/demo/lib/digital-resource.test.ts` | CREATE | test | request-response (assert) | `physical-access.test.ts` (969 lines) | exact (sibling template) |

### Per-symbol classification (within `model.ts`)

| New Symbol | Role | Data Flow | Closest Analog (model.ts) |
|-----------|------|-----------|---------------------------|
| `NetworkNode` / `PlatformNode` / `ApplicationNode` | model (interface) | static | `ZoneNode` (51-60) |
| `org_links` field shape | model (inline type) | static | `ZoneNode.admin_org_id`/`asset_owner_org_id` (57-58) — generalized to a list |
| `ResourcePolicy` + gate descriptors | model (interface + union) | static | `EntityPolicy` (592-602) conceptual ancestor; `ZoneAccessGate` (65) for the discriminator idea |
| `policy_assignments` window shape | model (inline type) | static | grant time-window shape (`valid_from`/`valid_until`, 211-212) |
| `ResourceAccessGrant` | model (interface) | static | `PhysicalAccessGrant` (207-213) |
| `ResourceAccessDelegate` | model (interface) | static | `ZoneAccessDelegate` (219-228) |
| `ResourceAccessResult` (trace) | model (interface) | static | `ZoneAccessResult` (74-79) — extended to gates[] + zoneAdvisory + policyVersion |
| active-org-link helpers | utility (pure fn) | transform | `isGrantActive` (232-237) reused as the boundary rule |
| active-policy selector | utility (pure fn) | transform | `isGrantActive` boundary rule + `getActiveVisitorPasses` filter shape (377-388) |
| gate evaluators (`CLEARANCE`/`OWN_TIER_GRANT`/`PARENT_TIER_GRANT`/`REQUIRED_ROLE`) | service (pure fn) | transform | `evaluateRestrictedAccess`/`evaluateSecuredAccess` (105-152) |
| `resolveResourceAccess` (dispatch) | service (pure fn) | transform / request-response | `resolveZoneAccess` (282-311) — but loop-over-gates, not a single switch |
| Application classification derivation | utility (pure fn) | transform | none structural; trivial parent lookup (see note) |
| `canIssueResourceGrant` | service (pure fn) | transform | `isDelegateActive` (315-323) + DELEG-03 gap (was never implemented in v2.1) |
| overlapping-window seed validator | utility (pure fn) | transform | `validateEntryLog`/`validateSecuredZoneEntry` (356-374) — return `string \| null` |

## Pattern Assignments

### Resource node interfaces (`NetworkNode` / `PlatformNode` / `ApplicationNode`)

**Analog:** `ZoneNode` (`model.ts:51-60`).

Mirror the flat interface + `id`/`name`/string-FK style. Critical req-1/req-2 difference: **`ApplicationNode` carries NO `classification` field** (it inherits from its Platform). Single-valued parent links (`network_id`, `platform_id`), not arrays.

```typescript
// ZoneNode analog (51-60):
export interface ZoneNode {
  id: string;
  name: string;
  level: ZoneLevel;
  zone_type: ZoneType;
  parent_id: string | null;
  admin_org_id: UnitId;
  asset_owner_org_id: UnitId;
  requires_explicit_auth: boolean;
}
```

Each resource node also carries `org_links` (req 3) and `policy_assignments` (req 4) — these replace the single `admin_org_id`/`asset_owner_org_id` fields with time-windowed lists. `classification: Clearance` lives on `NetworkNode` and `PlatformNode` only (reuse the existing `Clearance` type at lines 8-13; do not redefine).

---

### `org_links` shape + active-link helpers (req 3)

**Analog:** `ZoneNode.admin_org_id` (`model.ts:57`) generalized; boundary rule from `isGrantActive` (`232-237`).

```typescript
// Boundary rule to REUSE verbatim — do NOT invent a divergent convention (Constraint, code_context):
export function isGrantActive(grant: PhysicalAccessGrant, now: Date): boolean {
  return (
    (grant.valid_from === null || grant.valid_from <= now) &&
    (grant.valid_until === null || grant.valid_until >= now)
  );
}
```

`org_links: { org_id: string; role: string; valid_from: Date | null; valid_until: Date | null }[]`. `role` is open string (D-01); baseline values `ADMIN | ASSET_OWNER | OPERATOR | SECURITY_APPROVAL`. Active-link helper applies the **same** `valid_from <= now <= valid_until` (inclusive, null = unbounded) check inline. A second helper filters active links by role. Note seed.ts uses `UnitId` for org IDs (e.g. `"MILITARY_1"`, `"INTEL"`) — `org_id: string` accepts those.

---

### `ResourceAccessGrant` and `ResourceAccessDelegate` (req 10)

**Analog:** `PhysicalAccessGrant` (`model.ts:207-213`) and `ZoneAccessDelegate` (`219-228`).

```typescript
// PhysicalAccessGrant (207-213) — mirror field-for-field, swap zone_id → resource_id:
export interface PhysicalAccessGrant {
  id: string;
  person_id: string;
  zone_id: string;
  valid_from: Date | null;
  valid_until: Date | null;
}

// ZoneAccessDelegate (219-228) — mirror exactly, swap zone_id → resource_id:
export interface ZoneAccessDelegate {
  id: string;
  zone_id: string;
  delegate_type: "PERSON" | "ORG";
  delegate_person_id: string | null;
  delegate_org_id: string | null;
  granted_by_org_id: string;
  valid_from: Date | null;
  valid_until: Date | null;
}
```

`ResourceAccessDelegate` adds nothing beyond the rename per SPEC req 10.

---

### `ResourcePolicy` + parameterized gate descriptors (req 4, req 5, D-01)

**Analog (conceptual):** `EntityPolicy` (`model.ts:592-602`) — the seed-only ABAC rule type. **Analog (discriminator idea):** `ZoneAccessGate` union (`65`).

```typescript
// EntityPolicy (592-602) — conceptual ancestor (NOT reused directly):
export interface EntityPolicy {
  id: UnitId;
  label: string;
  rules: { clearance: boolean; domainTier: boolean; needToKnow: boolean; affiliation: boolean; };
  minClearanceFloor?: Clearance;
}
```

Key divergence (this is the phase's whole point): replace the fixed `rules` booleans with an **ordered open-vocabulary gate list**. Gate descriptor = `{ kind: string; ...params }` (D-01). Baseline kinds carry no params; `REQUIRED_ROLE` carries `{ kind: 'REQUIRED_ROLE', role: 'SECURITY_APPROVAL' }`. `ResourcePolicy` holds `gates: GateDescriptor[]` and may declare a `zone prerequisite` (req 8). `policy_assignments: { policy: ResourcePolicy; valid_from: Date | null; valid_until: Date | null }[]` reuses the grant window shape (211-212).

---

### Active-policy selector + overlapping-window validator (req 4)

**Analog:** boundary rule `isGrantActive` (`232-237`); filter shape `getActiveVisitorPasses` (`377-388`); validator return-shape `validateEntryLog` (`356-364`).

```typescript
// getActiveVisitorPasses (377-388) — inline window-filter pattern to mirror:
export function getActiveVisitorPasses(zoneId: string, allPasses: ZoneVisitorPass[], now: Date): ZoneVisitorPass[] {
  return allPasses.filter(
    (pass) => pass.zone_id === zoneId && pass.valid_from <= now && pass.valid_until >= now,
  );
}

// validateEntryLog (356-364) — validator returns `string | null` (null = OK), NOT a throw:
export function validateEntryLog(entry: ZoneEntryLog): string | null {
  if (entry.method === "ESCORT" && entry.escort_person_id === null) {
    return "ESCORT entry requires escort_person_id";
  }
  ...
  return null;
}
```

Selector returns the single assignment whose window contains `now` (inclusive boundary, null = unbounded). **No covering window → return the fail-closed DENY result, not a throw** (D-03: `{ allow: false, gates: [], zoneAdvisory: null, policyVersion: null, reason: 'NO_ACTIVE_POLICY' }`). Overlapping windows are a **seed config error** surfaced by the validator (`string | null` like `validateEntryLog`), not by the resolver.

---

### Gate evaluators (`CLEARANCE` / `OWN_TIER_GRANT` / `PARENT_TIER_GRANT` / `REQUIRED_ROLE`) (req 6)

**Analog:** `evaluateRestrictedAccess` / `evaluateSecuredAccess` (`model.ts:105-152`).

```typescript
// evaluateSecuredAccess (129-152) — clearance-rank comparison + structured result pattern:
export function evaluateSecuredAccess(hasGrant: boolean, clearance: Clearance, isEscorted: boolean): ZoneAccessResult {
  if (!hasGrant) return { allow: false, gate: "ZONE_TYPE_RULE", reason: "NO_GRANT" };
  if (CLEARANCE_RANK[clearance] >= CLEARANCE_RANK["SECRET"]) {
    return { allow: true, gate: "ZONE_TYPE_RULE", reason: "GRANT_FOUND", detail: ... };
  }
  return { allow: false, gate: "ZONE_TYPE_RULE", reason: "INSUFFICIENT_CLEARANCE", detail: ... };
}
```

Each evaluator is one pure function returning `{ pass: boolean; reason: string }` (the per-gate trace entry, req 9). The `CLEARANCE` gate reuses `CLEARANCE_RANK` (15-21) exactly as `evaluateSecuredAccess` does. `OWN_TIER_GRANT` checks for an active `ResourceAccessGrant` on the **resource itself only** — see cross-tier note below. `PARENT_TIER_GRANT` checks an active grant on the single parent (`platform.network_id` / `app.platform_id`). `REQUIRED_ROLE` checks the subject against the resource's active `org_links` for the named role.

---

### `resolveResourceAccess` — gate-loop dispatch (req 5, req 7, req 8, req 9)

**Analog:** `resolveZoneAccess` (`model.ts:282-311`) — but the structural divergence is the core deliverable.

```typescript
// resolveZoneAccess (282-311) — v2.1 HARDCODES the gate sequence in a switch:
export function resolveZoneAccess(personId, zone, clearance, hasValidEscort, allZones, allGrants, now): ZoneAccessResult {
  const grant = resolveGrant(personId, zone, allZones, allGrants, now);
  if (grant === null) return { allow: false, gate: "GRANT_LOOKUP", reason: "NO_GRANT" };
  switch (zone.zone_type) {
    case "CONTROLLED": return evaluateControlledAccess(true);
    case "RESTRICTED": return evaluateRestrictedAccess(true, clearance, hasValidEscort);
    case "SECURED":    return evaluateSecuredAccess(true, clearance, hasValidEscort);
    default:           return assertNever(zone.zone_type);
  }
}
```

Divergences required by SPEC:
1. **Signature style:** mirror `resolveZoneAccess` (explicit `now: Date`, explicit subject clearance/personId, arrays passed in — pure, no `Date.now()`). D-03 / Constraint.
2. **Loop, don't switch:** select active policy, then iterate `policy.gates` **in list order**, dispatching each `kind` to its evaluator. Accumulate one trace entry per gate.
3. **Unknown kind → explicit error result** (req 5), never a silent ALLOW. Use an `assertNever`-style exhaustive switch over *known* baseline kinds (the `assertNever` helper is at `273-275`) **plus** a runtime guard that returns `{ allow: false, ... reason: 'UNKNOWN_GATE_KIND' }` for injected unknown kinds. (Two layers: compile-time exhaustiveness + runtime fail-closed.)
4. **No ancestor walk (req 7, `cross-tier-inheritance-blocked`):** Do NOT copy `resolveGrant`'s `getAncestors` walk (243-270) for the own-tier gate — that would leak cross-tier inheritance. `OWN_TIER_GRANT` matches only `grant.resource_id === resource.id`. Parent is a separate explicit `PARENT_TIER_GRANT` gate.
5. **Advisory zone (req 8):** if the active policy declares a zone prereq, call the existing `resolveZoneAccess` **unchanged** and attach its `ZoneAccessResult` to a separate `zoneAdvisory` field. `zoneAdvisory` NEVER mutates `allow`.

Result shape (req 9): `{ allow: boolean; gates: { kind: string; pass: boolean; reason: string }[]; zoneAdvisory: ZoneAccessResult | null; policyVersion: { valid_from: Date | null; valid_until: Date | null } | null }`.

---

### `canIssueResourceGrant` (req 10 — closes the DELEG-03 gap)

**Analog:** `isDelegateActive` (`model.ts:315-323`).

```typescript
// isDelegateActive (315-323) — the active-window check feeding the authority test:
export function isDelegateActive(delegate: ZoneAccessDelegate, now: Date): boolean {
  return (
    (delegate.valid_from === null || delegate.valid_from <= now) &&
    (delegate.valid_until === null || delegate.valid_until >= now)
  );
}
```

`canIssueResourceGrant(actor, resource, now)` → `true` iff actor holds an **active `ADMIN` `org_link`** on the resource (active-link helper from req 3) OR an **active matching `ResourceAccessDelegate`** (filter delegates by `resource_id` + actor match, then `isDelegateActive`-equivalent check). Only `ADMIN`-role orgs may delegate. v2.1 shipped this as type-only (`canIssueGrant` was never implemented) — Phase 9 must implement and test it.

---

### Application classification derivation (req 2)

**Analog:** none structural — a trivial single-hop parent lookup (NOT the `getAncestors` multi-hop walk at 158-172). Resolve `app.platform_id → platform.classification`. The resolver's `CLEARANCE` gate uses this derived value; the value is never stored on `ApplicationNode`.

---

### `digital-resource.test.ts` (all reqs)

**Analog:** `physical-access.test.ts` (969 lines) — sibling template, copy its structure.

Conventions to mirror:
- Header comment listing coverage; `import { describe, it, expect } from "vitest";` (line 7).
- **Inline fixtures, NOT `seed.ts` imports** for the unit-logic tests ("D3-13 pattern", line 30). Define `const NOW = new Date("...Z")` once (line 214) and per-fixture grants/nodes as `const` literals.
- Time-window fixtures cover permanent / active / expired / future / **exact boundary** (lines 217-259) — replicate for `ResourceAccessGrant`, `ResourceAccessDelegate`, `policy_assignments`.
- One `describe` block per function; `it` names state the exact branch + expected outcome (e.g. lines 311-360 for `isGrantActive`).
- Required named tests: **`cross-tier-inheritance-blocked`** (req 7 — person holds only a Network grant, evaluate Platform → `allow: false`; structural analog: line 530 "cross-type inheritance blocked"), and an **advisory-non-blocking** test (req 8 — all gates pass, zone prereq fails → `allow: true` with non-null `zoneAdvisory`).
- SEED-06/07 tests DO import from `seed.ts` (req 11 acceptance: "resolves the policy-shift resource at two timestamps"). These are the integration cases; everything else stays inline.

---

### `seed.ts` — SEED-06 / SEED-07 fixtures (req 11)

**Analog:** `ZONES` / `GRANTS` / `DELEGATES` top-level exports (`seed.ts:1100-1195`).

```typescript
// GRANTS (1104-1120) — top-level `export const`, inline object literals, new Date(...) windows:
export const GRANTS: PhysicalAccessGrant[] = [
  { id: "grant-dana-block-a", person_id: "subj-1", zone_id: "zone-bldg-block-a", valid_from: null, valid_until: null },
  { id: "grant-dana-secure-lab", person_id: "subj-1", zone_id: "zone-secure-lab", valid_from: new Date("2026-01-01"), valid_until: null },
  ...
];
```

Mirror the exact style: new top-level `export const` arrays (e.g. `RESOURCE_NODES`, `RESOURCE_GRANTS`, `RESOURCE_DELEGATES`), inline literals, `new Date("YYYY-MM-DD")` windows, `UnitId` strings (`"MILITARY_1"` etc.) for org IDs, `subj-N` person IDs reused from existing subjects. Append only — do not touch existing exports.

- **RSRC-SEED-06 (D-04, policy-shift "tighten after incident"):** Network (working name `MilNet`) with TWO adjacent non-overlapping `policy_assignments`: policy A `valid_until: new Date("2026-03-01")` = baseline; policy B `valid_from: new Date("2026-03-01")` = baseline + `{ kind: 'REQUIRED_ROLE', role: 'SECURITY_APPROVAL' }`. Test resolves the same person at a Feb timestamp (ALLOW) and Apr timestamp (DENY).
- **RSRC-SEED-07 (D-05, non-baseline):** one resource whose active policy = baseline + `{ kind: 'REQUIRED_ROLE', role: 'SECURITY_APPROVAL' }` (same mechanism as SEED-06 policy B). Exact IDs/dates are the planner's call within these locked narratives.

## Shared Patterns

### Active-window boundary rule (apply to ALL time-windowed types)
**Source:** `isGrantActive` (`model.ts:232-237`), `isDelegateActive` (`315-323`).
**Apply to:** `ResourceAccessGrant`, `ResourceAccessDelegate`, `org_links`, `policy_assignments`.
Both boundaries **inclusive**; `null` = unbounded on that side. Do NOT invent a divergent rule (Constraint + code_context explicit).
```typescript
(from === null || from <= now) && (until === null || until >= now)
```

### Pure functions with explicit `now: Date`
**Source:** every resolver/helper in model.ts (e.g. `resolveZoneAccess` 282, `getActiveVisitorPasses` 377).
**Apply to:** every new function. No `Date.now()` / `new Date()` inside — point-in-time tests (D-03/D-04) depend on determinism.

### Structured result with explicit gate/reason
**Source:** `ZoneAccessResult` (`74-79`).
**Apply to:** `resolveResourceAccess` result — extended to `{ allow, gates[], zoneAdvisory, policyVersion }` (req 9). Per-gate entries carry `{ kind, pass, reason }`.

### Exhaustive switch / fail-closed unknown
**Source:** `assertNever` (`273-275`), used in `resolveZoneAccess` default (`309`).
**Apply to:** gate-kind dispatch — `assertNever` for compile-time exhaustiveness over baseline kinds, PLUS a runtime guard returning an explicit error result for injected unknown kinds (req 5: never silent ALLOW).

### Validator returns `string | null`
**Source:** `validateEntryLog` / `validateSecuredZoneEntry` (`356-374`).
**Apply to:** overlapping-policy-window seed validator — `null` = OK, error string = config problem. Not a throw.

### Clearance comparison
**Source:** `CLEARANCE_RANK` (`15-21`), used in `evaluateRestrictedAccess`/`evaluateSecuredAccess`.
**Apply to:** the `CLEARANCE` gate (and `CLEARANCE_FLOOR` if a fixture needs it — D-02, otherwise deferred). Reuse the existing map; do not redefine.

## No Analog Found

| Symbol | Role | Reason | Planner guidance |
|--------|------|--------|------------------|
| Application classification derivation | utility | No single-hop "derive from parent" helper exists; `getAncestors` is a multi-hop walk that must NOT be reused (would leak cross-tier inheritance, req 7) | Write a trivial `app → platform.classification` lookup; see RESEARCH PITFALLS (App-classification) |
| Gate-loop dispatch in `resolveResourceAccess` | service | v2.1's `resolveZoneAccess` hardcodes a `switch`; no data-driven gate-list iterator exists yet | This IS the phase deliverable (req 5); see RESEARCH/ARCHITECTURE gate-chain composition. The signature/result-shape still mirror `resolveZoneAccess`. |

Both are "no structural analog" only — the *conventions* (pure fn, explicit `now`, structured result, fail-closed) still come from the shared patterns above.

## Metadata

**Analog search scope:** `frontend/src/demo/lib/` (model.ts, physical-access.test.ts, seed.ts) — the entire demo island; SPEC/CONTEXT named all analogs and they are confined to this directory.
**Files scanned:** 3 (model.ts 650 lines, physical-access.test.ts 969 lines, seed.ts 1259 lines — windowed reads on seed.ts).
**Pattern extraction date:** 2026-06-02
