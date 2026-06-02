// demo/lib/model.ts — FROZEN unified world schema for the Authorization Hub demo.
// D-05: field set is frozen here for the whole milestone; do NOT reshape in P2/P3.
// D-10: UnitId (6 canonical units) is the single entity-id type; spike 3-entity scaffolding retired.
// D-11: authorization lifecycle fields are present (seed-only; evaluated in Phase 3, OQ-B).

// --- Clearance ladder (lifted verbatim from data.ts:4-14) ---

export type Clearance =
  | "UNCLASSIFIED"
  | "RESTRICTED"
  | "CONFIDENTIAL"
  | "SECRET"
  | "TOP_SECRET";

export const CLEARANCE_RANK: Record<Clearance, number> = {
  UNCLASSIFIED: 0,
  RESTRICTED: 1,
  CONFIDENTIAL: 2,
  SECRET: 3,
  TOP_SECRET: 4,
};

// --- Authorization domains (lifted verbatim from data.ts:16-23) ---

export type Domain = "COMPUTER" | "DATA" | "PHYSICAL";

// Per-domain tier scales (A7: each domain has its own ladder, ordered low→high).
// NEVER collapse into a single ladder — per-domain tiers evaluate independently (ENGINE-02, R3).
// PHYSICAL domain: tier ladder retained so seed resources/subjects with domain:"PHYSICAL" evaluate
// correctly via tierRank. Zone-type rules (see ZoneType below) govern zone-level physical access
// independently; the PHYSICAL tier ladder governs resource-level ABAC for PHYSICAL-domain resources.
export const TIERS: Partial<Record<Domain, string[]>> = {
  COMPUTER: ["STANDARD", "PRIVILEGED", "ROOT"],
  DATA: ["INTERNAL", "RESTRICTED", "CLASSIFIED"],
  PHYSICAL: ["LOBBY", "RESTRICTED_AREA", "SECURE_VAULT"],
};

// --- Phase 5: Zone hierarchy model (v2.1 Physical Access Zones) ---

// Zone hierarchy levels: SITE is broadest scope, ROOM is narrowest.
export type ZoneLevel = "SITE" | "AREA" | "BUILDING" | "ZONE" | "ROOM";

// Zone security classification. Note: ZoneType "RESTRICTED" is distinct from
// TIERS.DATA["RESTRICTED"] (a data-domain tier string) and Clearance "RESTRICTED"
// (a clearance level). These are three separate contexts in the type system.
export type ZoneType = "CONTROLLED" | "RESTRICTED" | "SECURED";

// A node in the zone tree. parent_id is null at the root (SITE level).
// admin_org_id: the org that controls/delegates access grants for this zone.
// asset_owner_org_id: the org that owns the protected assets inside the zone.
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

// --- Zone access result types (D-01) ---

// Gate discriminator: GRANT_LOOKUP (Phase 6, did a grant exist?) vs ZONE_TYPE_RULE (Phase 5, does the zone type allow?).
export type ZoneAccessGate = "GRANT_LOOKUP" | "ZONE_TYPE_RULE";

// ESCORT_REQUIRED and ENTRY_LOG_REQUIRED removed: no evaluator returns them.
// Escort and entry-log semantics are carried in the detail string instead.
export type ZoneAccessReason =
  | "GRANT_FOUND"
  | "NO_GRANT"
  | "INSUFFICIENT_CLEARANCE";

export interface ZoneAccessResult {
  allow: boolean;
  gate: ZoneAccessGate;
  reason: ZoneAccessReason;
  detail?: string;
}

// --- ZONE-03 ceiling rule ---
// SECURED zone_type is only valid at BUILDING, ZONE, or ROOM level.
// SITE and AREA are too broad for SECURED classification.
export function isValidZoneTypeCombination(
  level: ZoneLevel,
  zone_type: ZoneType,
): boolean {
  if (zone_type === "SECURED" && (level === "SITE" || level === "AREA")) {
    return false;
  }
  return true;
}

// --- ACCESS-02: CONTROLLED zone access rule ---
// CONTROLLED zones require explicit authorization only — no clearance check.
export function evaluateControlledAccess(hasGrant: boolean): ZoneAccessResult {
  return hasGrant
    ? { allow: true, gate: "ZONE_TYPE_RULE", reason: "GRANT_FOUND" }
    : { allow: false, gate: "ZONE_TYPE_RULE", reason: "NO_GRANT" };
}

// --- ACCESS-03: RESTRICTED zone access rule ---
// RESTRICTED zones require a grant AND (RESTRICTED clearance or above, OR a valid escort).
// hasValidEscort: the caller (Phase 6 resolver) has already verified the escort holds an active grant.
export function evaluateRestrictedAccess(
  hasGrant: boolean,
  clearance: Clearance,
  hasValidEscort: boolean,
): ZoneAccessResult {
  if (!hasGrant)
    return { allow: false, gate: "ZONE_TYPE_RULE", reason: "NO_GRANT" };
  if (
    CLEARANCE_RANK[clearance] >= CLEARANCE_RANK["RESTRICTED"] ||
    hasValidEscort
  ) {
    return { allow: true, gate: "ZONE_TYPE_RULE", reason: "GRANT_FOUND" };
  }
  return {
    allow: false,
    gate: "ZONE_TYPE_RULE",
    reason: "INSUFFICIENT_CLEARANCE",
    detail: `clearance: ${clearance}, required: RESTRICTED`,
  };
}

// --- ACCESS-04: SECURED zone access rule ---
// SECURED zones require a grant AND SECRET clearance or above.
// isEscorted does NOT substitute for clearance in SECURED zones (D-03); it only annotates the detail field.
export function evaluateSecuredAccess(
  hasGrant: boolean,
  clearance: Clearance,
  isEscorted: boolean,
): ZoneAccessResult {
  if (!hasGrant)
    return { allow: false, gate: "ZONE_TYPE_RULE", reason: "NO_GRANT" };
  if (CLEARANCE_RANK[clearance] >= CLEARANCE_RANK["SECRET"]) {
    return {
      allow: true,
      gate: "ZONE_TYPE_RULE",
      reason: "GRANT_FOUND",
      detail: isEscorted
        ? "escort noted — entry log mandatory"
        : "entry log mandatory",
    };
  }
  return {
    allow: false,
    gate: "ZONE_TYPE_RULE",
    reason: "INSUFFICIENT_CLEARANCE",
    detail: `clearance: ${clearance}, required: SECRET`,
  };
}

// --- D-02: Zone tree traversal helpers ---

// Returns parent-first ancestor chain: [direct-parent, grandparent, ..., root].
// Phase 6 uses this for grant resolution (leaf-first = most specific wins).
export function getAncestors(zoneId: string, allZones: ZoneNode[]): ZoneNode[] {
  const nodeMap = new Map(allZones.map((z) => [z.id, z]));
  const ancestors: ZoneNode[] = [];
  const visited = new Set<string>();
  let currentId: string | null | undefined = nodeMap.get(zoneId)?.parent_id;
  while (currentId != null) {
    if (visited.has(currentId)) break; // cycle guard on the node being arrived at
    visited.add(currentId);
    const node = nodeMap.get(currentId);
    if (!node) break;
    ancestors.push(node);
    currentId = node.parent_id;
  }
  return ancestors;
}

// Returns all transitive descendants (not just direct children) via breadth-first walk.
// Phase 8 uses this for full subtree rendering in the Zone Browser UI.
export function getDescendants(
  zoneId: string,
  allZones: ZoneNode[],
): ZoneNode[] {
  if (!allZones.some((z) => z.id === zoneId)) {
    // Ghost zone ID — data integrity error; fail visibly in development
    if (import.meta.env.DEV) {
      console.warn(`getDescendants: zone "${zoneId}" not found in allZones`);
    }
    return [];
  }
  const result: ZoneNode[] = [];
  const visited = new Set<string>();
  const queue: string[] = [zoneId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue; // cycle guard
    visited.add(current);
    const children = allZones.filter((z) => z.parent_id === current);
    result.push(...children);
    queue.push(...children.map((c) => c.id));
  }
  return result;
}

// --- Phase 6: Grant and delegation types ---

/**
 * A grant linking a person to a zone with an optional time window.
 * Null boundaries are unbounded on that side.
 */
export interface PhysicalAccessGrant {
  id: string;
  person_id: string;
  zone_id: string;
  valid_from: Date | null; // null = valid immediately (no start boundary)
  valid_until: Date | null; // null = permanent (no end boundary)
}

/**
 * Delegation record granting authority to issue PhysicalAccessGrants for a zone.
 * Supports both person delegates (delegate_type: PERSON) and org delegates (delegate_type: ORG).
 */
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

// --- GRANT-01: isGrantActive — time-window check ---
// Both boundaries are inclusive. Null on either side means that boundary is unbounded.
export function isGrantActive(grant: PhysicalAccessGrant, now: Date): boolean {
  return (
    (grant.valid_from === null || grant.valid_from <= now) &&
    (grant.valid_until === null || grant.valid_until >= now)
  );
}

// --- GRANT-04: resolveGrant — ancestor walk, most-specific active grant ---
// Checks target zone first (most specific), then getAncestors() order (leaf → root).
// Ancestor grants only count if ancestor.zone_type === zone.zone_type.
// If zone.requires_explicit_auth is true, skips ancestor walk entirely.
export function resolveGrant(
  personId: string,
  zone: ZoneNode,
  allZones: ZoneNode[],
  allGrants: PhysicalAccessGrant[],
  now: Date,
): PhysicalAccessGrant | null {
  // requires_explicit_auth: skip ancestor walk entirely — only direct zone grants count
  const searchZones: ZoneNode[] = zone.requires_explicit_auth
    ? [zone]
    : [zone, ...getAncestors(zone.id, allZones)];

  for (const searchZone of searchZones) {
    // ancestor grants only count if zone_type matches target zone
    // (filter applied to ancestors only, never to the target zone itself)
    if (searchZone.id !== zone.id && searchZone.zone_type !== zone.zone_type) {
      continue;
    }
    const grant = allGrants.find(
      (g) =>
        g.person_id === personId &&
        g.zone_id === searchZone.id &&
        isGrantActive(g, now),
    );
    if (grant) return grant;
  }
  return null;
}

// Exhaustive helper — TS will error if ZoneType grows and the switch isn't updated
function assertNever(x: never): never {
  throw new Error(`Unhandled zone_type: ${String(x)}`);
}

// --- ACCESS-05: resolveZoneAccess — two-gate entry point ---
// Gate 1: resolveGrant() — null → DENY {gate:"GRANT_LOOKUP", reason:"NO_GRANT"}.
// Gate 2: dispatch by zone_type to Phase 5 evaluate functions with hasGrant=true.
// NOTE: For SECURED zones, hasValidEscort maps to isEscorted (annotation-only per D-03;
//       escort does not substitute for clearance in SECURED zones).
export function resolveZoneAccess(
  personId: string,
  zone: ZoneNode,
  clearance: Clearance,
  hasValidEscort: boolean, // unlocks RESTRICTED; annotation-only in SECURED (D-03)
  allZones: ZoneNode[],
  allGrants: PhysicalAccessGrant[],
  now: Date,
): ZoneAccessResult {
  const grant = resolveGrant(personId, zone, allZones, allGrants, now);
  if (grant === null) {
    return { allow: false, gate: "GRANT_LOOKUP", reason: "NO_GRANT" };
  }
  // Gate 2: zone-type rule (hasGrant=true — grant was found above)
  switch (zone.zone_type) {
    case "CONTROLLED":
      return evaluateControlledAccess(true);
    case "RESTRICTED":
      return evaluateRestrictedAccess(true, clearance, hasValidEscort);
    case "SECURED":
      // isEscorted is annotation-only in SECURED zones (D-03); does not affect allow/deny
      return evaluateSecuredAccess(
        true,
        clearance,
        /* isEscorted */ hasValidEscort,
      );
    default:
      return assertNever(zone.zone_type);
  }
}

// --- DELEG-01: isDelegateActive — delegate time-window check ---
// Identical null-boundary logic to isGrantActive but operating on ZoneAccessDelegate fields.
export function isDelegateActive(
  delegate: ZoneAccessDelegate,
  now: Date,
): boolean {
  return (
    (delegate.valid_from === null || delegate.valid_from <= now) &&
    (delegate.valid_until === null || delegate.valid_until >= now)
  );
}

// --- Phase 7: Entry log and visitor pass types ---

/**
 * Records a single zone access event: who entered, which zone, when, and how.
 * ESCORT entries require escort_person_id; CARD entries must not have one.
 */
export interface ZoneEntryLog {
  id: string;
  person_id: string;
  zone_id: string;
  entry_at: Date;
  exit_at: Date | null;
  method: "CARD" | "ESCORT";
  escort_person_id: string | null;
}

/**
 * Visitor pass issued when an escort accompanies a person into a zone.
 * Linked to its ZoneEntryLog by entry_log_id. valid_from and valid_until
 * are both required (caller-supplied); neither is nullable.
 */
export interface ZoneVisitorPass {
  id: string;
  entry_log_id: string;
  escort_person_id: string;
  zone_id: string;
  valid_from: Date;
  valid_until: Date;
}

// --- LOG-02: validateEntryLog — ESCORT/CARD method constraint ---
export function validateEntryLog(entry: ZoneEntryLog): string | null {
  if (entry.method === "ESCORT" && entry.escort_person_id === null) {
    return "ESCORT entry requires escort_person_id";
  }
  if (entry.method === "CARD" && entry.escort_person_id !== null) {
    return "CARD entry must not have escort_person_id";
  }
  return null;
}

// --- LOG-03: validateSecuredZoneEntry — SECURED zone mandatory logging ---
export function validateSecuredZoneEntry(
  zone: ZoneNode,
  entry: ZoneEntryLog | null,
): string | null {
  if (zone.zone_type !== "SECURED") return null;
  if (entry !== null) return null;
  return "SECURED zone requires a ZoneEntryLog entry";
}

// --- VISIT-03: getActiveVisitorPasses — active pass query ---
export function getActiveVisitorPasses(
  zoneId: string,
  allPasses: ZoneVisitorPass[],
  now: Date,
): ZoneVisitorPass[] {
  return allPasses.filter(
    (pass) =>
      pass.zone_id === zoneId &&
      pass.valid_from <= now &&
      pass.valid_until >= now,
  );
}

// --- D-10: UnitId (the 6 canonical units) is the single entity-id type ---
// Lifted from obligations.ts:4-19.

export type UnitId =
  | "MILITARY_1"
  | "MILITARY_2"
  | "INTEL"
  | "INFRA"
  | "INDUSTRY"
  | "HOME_GUARD";

export const UNITS: Record<UnitId, { label: string }> = {
  MILITARY_1: { label: "Military Unit 1" },
  MILITARY_2: { label: "Military Unit 2" },
  INTEL: { label: "Intelligence" },
  INFRA: { label: "Inventory / Infrastructure" },
  INDUSTRY: { label: "Industry" },
  HOME_GUARD: { label: "Home Guard" },
};

/** Get the display label for a unit (UnitId-keyed analog of the spike entityName). */
export function unitName(id: UnitId): string {
  return UNITS[id]?.label ?? id;
}

// --- Compartments (widened additively; existing values kept — R from RESEARCH) ---
// Original: AURORA, BLACKWING, CITADEL (from data.ts:25).
// Added: SIGINT (intel), STOCKWATCH (industry), HOMELAND (home guard) for realistic NTK reads.

export type Compartment =
  | "AURORA"
  | "BLACKWING"
  | "CITADEL"
  | "SIGINT"
  | "STOCKWATCH"
  | "HOMELAND";

// --- Subject flags (lifted verbatim from data.ts:37-40) ---

export interface SubjectFlags {
  revoked: boolean;
  securityHold: boolean; // set by Security Officer → deny override (A4)
}

// --- D-05 forward types (seed-only in Phase 1; evaluated in Phase 3) ---

export type Deployment = "HOME" | "ABROAD"; // from obligations.ts:21

export interface Subunit {
  // from obligations.ts:23-28 (sans eval fns)
  id: string;
  name: string;
  unit: UnitId;
  deployment: Deployment;
}

// --- Subject (D-10 + D-05 + D-11 fields) ---

export interface Subject {
  id: string;
  name: string;
  unit: UnitId; // was homeEntity (D-10)
  clearance: Clearance; // [MOCK] external, read-only in Janus (evaluated)
  domainAuth: Partial<Record<Domain, string>>; // authorized tier per domain (evaluated)
  compartments: Compartment[]; // need-to-know (evaluated)
  flags: SubjectFlags; // revoked/securityHold (evaluated)
  // --- D-05 forward fields (seed-only; evaluated in Phase 3 context rules) ---
  subunit?: string;
  deployment?: Deployment;
  territory?: string;
  // --- D-11 authorization lifecycle (seed-only; rule wired in Phase 3, OQ-B) ---
  authorization?: {
    status: "AUTHORIZED" | "WITHDRAWN" | "PENDING";
    byRole: string;
    conversationDate: string;
    validUntil: string;
    reauthDue: string;
  };
  clearanceValidUntil?: string;
  clearanceGrantedBy?: string;
}

// --- Resource (D-10 + seed-only forward fields) ---

export interface Resource {
  id: string;
  name: string;
  domain: Domain;
  requiredTier: string; // (evaluated)
  minClearance: Clearance; // (evaluated)
  requiredCompartments: Compartment[]; // (evaluated)
  ownerUnit: UnitId; // was ownerEntity (D-10)
  // --- seed-only forward fields (evaluated in Phase 3) ---
  shielded?: boolean; // directional shielding (obligations.ts:34)
  allowlist?: UnitId[]; // only these units bypass shielding (obligations.ts:35)
  assetKind?: string; // display label
}

// --- Hub discovery pointer (lifted from data.ts:146-150; holdingEntity → UnitId, D-10) ---

export interface HubPointer {
  subjectId: string;
  holdingUnit: UnitId; // was holdingEntity (D-10); seed-only in Phase 1 (P2 hub)
  domain: Domain;
}

// --- Operating roles and ops (lifted from data.ts:161-215 + D-11/OQ-A additions) ---
// SCOPE-01 simplified for demo: flat roles approximate scoped roles
// (authorization is scoped to the manager's own team in production).

export type RoleId =
  | "SYS_ADMIN"
  | "SECURITY_OFFICER"
  | "ACCESS_APPROVER"
  | "PERSONNEL_MGR"
  | "AUDITOR"
  | "MANAGER"
  | "SPONSOR"
  | "SUBJECT";

export type Op =
  | "manage_users"
  | "view_config"
  | "flag_risk"
  | "manage_annotations"
  | "view_eval"
  | "approve_attribute"
  | "revoke_attribute"
  | "edit_identity"
  | "view_all_readonly"
  | "request_attribute"
  | "view_team"
  | "view_own_org"
  | "view_self"
  | "AUTHORIZE_SUBJECT" // D-11 / OQ-A: Manager gains authorize/withdraw
  | "WITHDRAW_AUTHORIZATION"; // D-11 / OQ-A: Manager gains authorize/withdraw

export interface Role {
  label: string;
  ops: Op[];
}

export const ROLES: Record<RoleId, Role> = {
  SYS_ADMIN: {
    label: "System Administrator",
    ops: ["manage_users", "view_config"],
  },
  SECURITY_OFFICER: {
    label: "Security Officer",
    ops: ["flag_risk", "manage_annotations", "view_eval"],
  },
  ACCESS_APPROVER: {
    label: "Access Approver / AO",
    ops: ["approve_attribute", "revoke_attribute", "view_eval"],
    // NOTE: approve_attribute / revoke_attribute intentionally NOT on MANAGER (SoD crux).
  },
  PERSONNEL_MGR: { label: "Personnel / Org Mgr", ops: ["edit_identity"] },
  AUDITOR: {
    label: "Auditor / Compliance",
    ops: ["view_eval", "view_all_readonly"],
  },
  MANAGER: {
    label: "Manager / Supervisor",
    // D-11/OQ-A: Manager gains AUTHORIZE_SUBJECT + WITHDRAW_AUTHORIZATION (autoriserende leder).
    // SoD crux: MANAGER does NOT have approve_attribute (cannot grant compartments).
    ops: [
      "request_attribute",
      "view_team",
      "AUTHORIZE_SUBJECT",
      "WITHDRAW_AUTHORIZATION",
    ],
  },
  SPONSOR: { label: "Org / Vendor Sponsor", ops: ["view_own_org"] },
  SUBJECT: { label: "End User / Subject", ops: ["view_self"] },
};

// --- Event sourcing: attribute operation log (D-11 + R6) ---
// Lifted from auditlog.ts:11-15 + R6 (SET_REVOKED/CLEAR_REVOKED) + D-11 (AUTHORIZE_SUBJECT/WITHDRAW).

export type AttrOp =
  | "GRANT_COMPARTMENT" // auditlog.ts:11
  | "REVOKE_COMPARTMENT" // auditlog.ts:12
  | "SET_HOLD" // auditlog.ts:13
  | "CLEAR_HOLD" // auditlog.ts:14
  | "SET_REVOKED" // R6: make revoke event-sourced (not just flag)
  | "CLEAR_REVOKED" // R6: make revoke event-sourced (not just flag)
  | "AUTHORIZE_SUBJECT" // D-11: Manager authorizes a subject
  | "WITHDRAW_AUTHORIZATION" // D-11: Manager withdraws authorization
  | "REQUEST_COMPARTMENT"; // SoD: Manager request — logged only, not applied (audit trail)

export interface AttrEvent {
  // Lifted from auditlog.ts:17-23; extended for D-11
  seq: number; // logical timestamp (append-only, increasing)
  subjectId: string;
  op: AttrOp;
  value?: Compartment;
  actor: string; // which operating role made the change (audit trail)
}

// --- Forward types (types only; functions stay in spikes/ for Phase 2/3 reference) ---

// EntityPolicy — from policy.ts:12-22, re-keyed onto UnitId (seed-only, P3).
export interface EntityPolicy {
  id: UnitId;
  label: string;
  rules: {
    clearance: boolean;
    domainTier: boolean;
    needToKnow: boolean;
    affiliation: boolean;
  };
  minClearanceFloor?: Clearance;
}

// Envelope / Pointer — from contract.ts:17-45 (hub interchange contract, P2).
// Note: Principal/Requirement references are to the abac.ts types (not imported here to avoid circularity).
export type Envelope =
  | { kind: "PUBLISH"; from: UnitId; subjectId: string; domain: Domain }
  | { kind: "DISCOVER"; from: UnitId; subjectId: string }
  | {
      kind: "DISCOVER_RESULT";
      to: UnitId;
      subjectId: string;
      pointers: Pointer[];
    }
  | {
      kind: "REQUEST_DETAIL";
      from: UnitId;
      to: UnitId;
      subjectId: string;
      requester: unknown; // Principal type from abac.ts — avoid circular import
    }
  | {
      kind: "DETAIL_RESPONSE";
      to: UnitId;
      subjectId: string;
      granted: boolean;
      decision: unknown | null; // Decision type from abac.ts — avoid circular import
      record: Subject | null;
    };

export interface Pointer {
  // from contract.ts:42-45
  holder: UnitId;
  domain: Domain;
}

// AttrClaims / Credential — from credential.ts:5-16 (signed credentials, P2).
export interface AttrClaims {
  subject: string;
  entity: UnitId; // D-10 unification: spike used 3-entity scaffolding; demo uses 6 UnitIds
  clearance: Clearance;
  compartments: Compartment[];
  issuer: string;
}

export interface Credential {
  payload: AttrClaims;
  sig: string; // base64 HMAC-SHA256 over canonical(payload)
}

// --- Phase 9: Digital Resource hierarchy model (v2.2) ---
//
// Append-only. Mirrors the v2.1 zone model exactly: flat interfaces, string-FK
// links, the inclusive/null active-window rule (isGrantActive), and structured
// {allow, gate, reason}-style results. Resolver + tests live in Plans 02/03.
//
// Strict tree (RSRC-05): NetworkNode -> PlatformNode (one network_id) ->
// ApplicationNode (one platform_id). NetworkNode/PlatformNode carry a
// `classification: Clearance`; ApplicationNode deliberately carries NONE — an
// Application's effective classification is DERIVED from its host Platform at
// resolution time (RSRC-02, req 2), never stored on the node.

// Resource-tier discriminator for the three-tier hierarchy.
export type ResourceTier = "NETWORK" | "PLATFORM" | "APPLICATION";

// Baseline org-link roles. The role vocabulary is OPEN (RSRC-04, D-discretion):
// `(string & {})` keeps the union open at the type edge while preserving
// autocomplete on the four baseline values.
export type BaselineOrgRole =
  | "ADMIN"
  | "ASSET_OWNER"
  | "OPERATOR"
  | "SECURITY_APPROVAL";

// A time-windowed role-tagged org association on a resource node (RSRC-04, req 3).
// Generalizes v2.1's fixed admin_org_id/asset_owner_org_id into a list. `org_id`
// is a plain string and accepts UnitId values (e.g. "MILITARY_1", "INTEL").
// Window semantics are the v2.1 inclusive/null rule (see isWindowActive).
export interface OrgLink {
  org_id: string;
  role: BaselineOrgRole | (string & {});
  valid_from: Date | null;
  valid_until: Date | null;
}

// Parameterized gate descriptor (D-01/D-02). Baseline kinds carry no params;
// REQUIRED_ROLE carries a role param. The union is kept OPEN at the type edge
// via `{ kind: string & {}; [k: string]: unknown }` so a runtime-injected unknown
// kind is representable (req 5) — the Plan 02 resolver fails closed on it.
//
// Param-pattern example (NOT in the union; deferred per A2 — SEED-06/07 do not
// need it): `{ kind: 'CLEARANCE_FLOOR'; min: Clearance }`. Add a member + one
// evaluator function only if a future seed fixture requires it.
export type GateDescriptor =
  | { kind: "CLEARANCE" }
  | { kind: "OWN_TIER_GRANT" }
  | { kind: "PARENT_TIER_GRANT" }
  | { kind: "REQUIRED_ROLE"; role: string }
  | { kind: string & {}; [k: string]: unknown };

// A named, ordered gate list. `zone_prereq_id` declares the OPTIONAL advisory
// zone prerequisite on the POLICY (req 8, A1: policy-level, not node-level);
// null = no advisory zone. The advisory never changes the allow boolean.
export interface ResourcePolicy {
  id: string;
  label: string;
  gates: GateDescriptor[];
  zone_prereq_id: string | null;
}

// A time-versioned policy binding (RSRC-POLICY-02/03/05). Reuses the grant
// window shape; the active assignment is selected by timestamp (selectActivePolicy).
export interface PolicyAssignment {
  policy: ResourcePolicy;
  valid_from: Date | null;
  valid_until: Date | null;
}

// Network — top of the tree. Carries its own classification (req 1).
export interface NetworkNode {
  id: string;
  name: string;
  tier: "NETWORK";
  classification: Clearance;
  org_links: OrgLink[];
  policy_assignments: PolicyAssignment[];
}

// Platform — one parent Network (network_id, single-valued strict tree, RSRC-05).
// Carries its own classification (req 1).
export interface PlatformNode {
  id: string;
  name: string;
  tier: "PLATFORM";
  classification: Clearance;
  network_id: string;
  org_links: OrgLink[];
  policy_assignments: PolicyAssignment[];
}

// Application — one parent Platform (platform_id, single-valued strict tree).
// NO `classification` field (RSRC-02, req 2): effective classification is derived
// from the host Platform via effectiveClassification(), never stored here.
export interface ApplicationNode {
  id: string;
  name: string;
  tier: "APPLICATION";
  platform_id: string;
  org_links: OrgLink[];
  policy_assignments: PolicyAssignment[];
}

// Person↔resource grant (RSRC-GRANT-01). Mirrors PhysicalAccessGrant field-for-
// field, swapping zone_id -> resource_id. Window = inclusive/null (isWindowActive).
export interface ResourceAccessGrant {
  id: string;
  person_id: string;
  resource_id: string;
  valid_from: Date | null;
  valid_until: Date | null;
}

// Delegation of authority to issue ResourceAccessGrants (RSRC-DELEG-01). Mirrors
// ZoneAccessDelegate exactly, swapping zone_id -> resource_id. Feeds
// canIssueResourceGrant (Plan 02).
export interface ResourceAccessDelegate {
  id: string;
  resource_id: string;
  delegate_type: "PERSON" | "ORG";
  delegate_person_id: string | null;
  delegate_org_id: string | null;
  granted_by_org_id: string;
  valid_from: Date | null;
  valid_until: Date | null;
}

// Per-gate trace entry (req 9): one per evaluated gate, in policy list order.
export interface ResourceGateResult {
  kind: string;
  pass: boolean;
  reason: string;
}

// Explainable resolver result (req 9). `gates` records each gate's outcome;
// `zoneAdvisory` carries the unchanged v2.1 ZoneAccessResult (advisory only —
// never affects `allow`); `policyVersion` is the selected assignment's window,
// or null when no policy covered the timestamp; the optional top-level `reason`
// carries 'NO_ACTIVE_POLICY' on the fail-closed no-policy DENY (D-03).
export interface ResourceAccessResult {
  allow: boolean;
  gates: ResourceGateResult[];
  zoneAdvisory: ZoneAccessResult | null;
  policyVersion: { valid_from: Date | null; valid_until: Date | null } | null;
  reason?: string;
}

// --- Phase 9 pure helpers (v2.2) ---
// Every time-dependent helper takes an explicit `now: Date`; NONE call
// Date.now()/new Date() internally (Constraint, PITFALLS #5) so point-in-time
// tests stay deterministic.

// The SINGLE shared active-window helper for ALL Phase 9 time windows
// (org_links, policy_assignments, and Plan 02's grant/delegate checks).
// Reproduces isGrantActive's rule EXACTLY: both boundaries inclusive, null =
// unbounded on that side. Do NOT introduce a divergent <,> convention.
export function isWindowActive(
  valid_from: Date | null,
  valid_until: Date | null,
  now: Date,
): boolean {
  return (
    (valid_from === null || valid_from <= now) &&
    (valid_until === null || valid_until >= now)
  );
}

// Active org-role links at `now` (RSRC-04, req 3) — windowed via isWindowActive.
export function activeOrgLinks(orgLinks: OrgLink[], now: Date): OrgLink[] {
  return orgLinks.filter((link) =>
    isWindowActive(link.valid_from, link.valid_until, now),
  );
}

// Active org-role links matching an exact role at `now` (RSRC-04, req 3).
export function activeOrgLinksForRole(
  orgLinks: OrgLink[],
  role: string,
  now: Date,
): OrgLink[] {
  return activeOrgLinks(orgLinks, now).filter((link) => link.role === role);
}

// Effective classification (RSRC-02, req 2). Network/Platform return their own
// stored classification. Application has NO stored classification — derive it via
// a SINGLE-HOP app -> platform lookup (NOT the multi-hop getAncestors walk, which
// would leak cross-tier inheritance, req 7 / T-09-01). Fail closed if the host
// Platform is missing: throw a clear seed-config error rather than returning a
// permissive default.
export function effectiveClassification(
  node: NetworkNode | PlatformNode | ApplicationNode,
  allPlatforms: PlatformNode[],
): Clearance {
  if (node.tier === "APPLICATION") {
    const platform = allPlatforms.find((p) => p.id === node.platform_id);
    if (!platform) {
      // Fail closed: an Application with no resolvable host Platform is a seed
      // integrity error; never silently treat it as low-classification.
      throw new Error(
        `effectiveClassification: platform "${node.platform_id}" not found for application "${node.id}"`,
      );
    }
    return platform.classification;
  }
  return node.classification;
}

// Select the single policy assignment whose window contains `now`
// (RSRC-POLICY-02; boundary rule consistent with isGrantActive). Returns null
// when no assignment covers the timestamp — the Plan 02 resolver turns null into
// the fail-closed NO_ACTIVE_POLICY DENY (D-03 / T-09-02). Selector itself never
// throws and never returns a baseline default.
export function selectActivePolicy(
  policy_assignments: PolicyAssignment[],
  now: Date,
): PolicyAssignment | null {
  return (
    policy_assignments.find((a) =>
      isWindowActive(a.valid_from, a.valid_until, now),
    ) ?? null
  );
}

// Seed-config validator (req 4 / T-09-04): returns a descriptive error string if
// any two policy-assignment windows overlap (using the inclusive boundary rule),
// else null. Mirrors validateEntryLog's `string | null` contract — never throws.
// This is a seed-data check, NOT a resolver path.
export function validatePolicyWindows(
  policy_assignments: PolicyAssignment[],
): string | null {
  for (let i = 0; i < policy_assignments.length; i++) {
    for (let j = i + 1; j < policy_assignments.length; j++) {
      const a = policy_assignments[i];
      const b = policy_assignments[j];
      // Inclusive overlap: a.from <= b.until && b.from <= a.until, with null =
      // unbounded on the respective side.
      const aStartsBeforeBEnds =
        a.valid_from === null ||
        b.valid_until === null ||
        a.valid_from <= b.valid_until;
      const bStartsBeforeAEnds =
        b.valid_from === null ||
        a.valid_until === null ||
        b.valid_from <= a.valid_until;
      if (aStartsBeforeBEnds && bStartsBeforeAEnds) {
        return `overlapping policy windows: "${a.policy.id}" and "${b.policy.id}"`;
      }
    }
  }
  return null;
}

// --- Phase 9 gate-dispatch engine (v2.2, Plan 02) ---
//
// Data-driven, time-versioned, fail-closed authorization with an explainable
// trace. Each baseline gate kind maps to ONE pure evaluator; resolveResourceAccess
// loops the active policy's gates in list order and dispatches by kind. Three
// structural invariants are enforced here (see PITFALLS / threat register):
//   - OWN_TIER_GRANT is a FLAT resource_id match — NO getAncestors/resolveGrant
//     ancestor walk (req 7 / T-09-06: no cross-tier inheritance leak).
//   - zoneAdvisory is attached separately and NEVER feeds `allow` (req 8 / T-09-07).
//   - unknown gate kind + no-active-policy both FAIL CLOSED (req 5 / D-03 / T-09-05/08).
// All functions are pure with an explicit `now: Date` — no Date.now()/new Date().

// Evaluation context (req 5 extension point): everything a gate evaluator needs.
// Adding a gate kind = adding one evaluator + one `case` in evaluateGate — no
// runtime plugin registry. `effectiveClassification` is pre-derived once by the
// resolver (single-hop app->platform for Applications) so evaluators never walk.
export interface GateContext {
  subject: string; // subject personId
  subjectClearance: Clearance;
  subjectOrgId: string; // subject's org, for REQUIRED_ROLE membership
  effectiveClassification: Clearance; // pre-derived resource classification
  resource: NetworkNode | PlatformNode | ApplicationNode;
  allNetworks: NetworkNode[];
  allPlatforms: PlatformNode[];
  grants: ResourceAccessGrant[];
  now: Date;
}

// CLEARANCE gate (req 6): subject clearance rank >= effective resource classification.
// Mirrors evaluateSecuredAccess's CLEARANCE_RANK comparison.
export function evaluateClearanceGate(ctx: GateContext): ResourceGateResult {
  const pass =
    CLEARANCE_RANK[ctx.subjectClearance] >=
    CLEARANCE_RANK[ctx.effectiveClassification];
  return {
    kind: "CLEARANCE",
    pass,
    reason: pass ? "CLEARANCE_OK" : "INSUFFICIENT_CLEARANCE",
  };
}

// OWN_TIER_GRANT gate (req 6, req 7): pass iff an active ResourceAccessGrant exists
// for THIS subject on THIS resource id. FLAT match only — deliberately NO ancestor
// walk (no getAncestors/resolveGrant): a Network grant must NOT satisfy a Platform's
// own-tier gate (cross-tier-inheritance-blocked, T-09-06).
export function evaluateOwnTierGrantGate(ctx: GateContext): ResourceGateResult {
  const grant = ctx.grants.find(
    (g) =>
      g.person_id === ctx.subject &&
      g.resource_id === ctx.resource.id &&
      isWindowActive(g.valid_from, g.valid_until, ctx.now),
  );
  return {
    kind: "OWN_TIER_GRANT",
    pass: grant !== undefined,
    reason: grant !== undefined ? "OWN_TIER_GRANT_FOUND" : "NO_OWN_TIER_GRANT",
  };
}

// PARENT_TIER_GRANT gate (req 6): a SEPARATE explicit check on the single parent id
// (Platform -> network_id, Application -> platform_id). Network has no parent and
// passes trivially. This is the parent prerequisite that the own-tier gate must NOT
// fold in (keeps cross-tier inheritance structurally impossible, req 7).
export function evaluateParentTierGrantGate(
  ctx: GateContext,
): ResourceGateResult {
  const resource = ctx.resource;
  if (resource.tier === "NETWORK") {
    // No parent — trivially satisfied.
    return {
      kind: "PARENT_TIER_GRANT",
      pass: true,
      reason: "NO_PARENT_TIER",
    };
  }
  const parentId =
    resource.tier === "PLATFORM" ? resource.network_id : resource.platform_id;
  const grant = ctx.grants.find(
    (g) =>
      g.person_id === ctx.subject &&
      g.resource_id === parentId &&
      isWindowActive(g.valid_from, g.valid_until, ctx.now),
  );
  return {
    kind: "PARENT_TIER_GRANT",
    pass: grant !== undefined,
    reason:
      grant !== undefined ? "PARENT_TIER_GRANT_FOUND" : "NO_PARENT_TIER_GRANT",
  };
}

// REQUIRED_ROLE gate (D-02, needed by SEED-06/07): pass iff the subject's org holds
// an active org_link on the resource with the descriptor's `role` (via
// activeOrgLinksForRole). Open-vocabulary role string per D-01.
export function evaluateRequiredRoleGate(
  gate: { kind: "REQUIRED_ROLE"; role: string },
  ctx: GateContext,
): ResourceGateResult {
  const matches = activeOrgLinksForRole(
    ctx.resource.org_links,
    gate.role,
    ctx.now,
  );
  const pass = matches.some((link) => link.org_id === ctx.subjectOrgId);
  return {
    kind: "REQUIRED_ROLE",
    pass,
    reason: pass ? "REQUIRED_ROLE_PRESENT" : "MISSING_REQUIRED_ROLE",
  };
}

// Compile-time exhaustiveness guard over the KNOWN baseline gate-kind union. This
// is the type-level layer (PATTERNS "two layers"); the runtime fail-closed layer is
// evaluateGate's `default` branch, which catches injected unknown string kinds.
function assertNeverGateKind(x: never): never {
  throw new Error(`Unhandled gate kind: ${String(x)}`);
}

// Gate dispatcher (req 5): switch on the descriptor kind, routing each baseline
// kind to its evaluator. The `default` branch FAILS CLOSED for any unknown/injected
// kind — { pass: false, reason: 'UNKNOWN_GATE_KIND' }, never a silent ALLOW
// (T-09-05). Adding a gate kind = adding one `case` + one evaluator.
export function evaluateGate(
  gate: GateDescriptor,
  ctx: GateContext,
): ResourceGateResult {
  switch (gate.kind) {
    case "CLEARANCE":
      return evaluateClearanceGate(ctx);
    case "OWN_TIER_GRANT":
      return evaluateOwnTierGrantGate(ctx);
    case "PARENT_TIER_GRANT":
      return evaluateParentTierGrantGate(ctx);
    case "REQUIRED_ROLE":
      return evaluateRequiredRoleGate(
        gate as { kind: "REQUIRED_ROLE"; role: string },
        ctx,
      );
    default: {
      // Runtime fail-closed for injected unknown kinds (req 5). The
      // assertNeverGateKind call documents compile-time exhaustiveness over the
      // baseline union; the open `string & {}` member makes `gate.kind` reachable
      // here at runtime, so we MUST return an explicit DENY (never pass: true).
      const known = gate as { kind: never };
      void assertNeverGateKind;
      return {
        kind: (known as unknown as { kind: string }).kind,
        pass: false,
        reason: "UNKNOWN_GATE_KIND",
      };
    }
  }
}

// resolveResourceAccess (req 5/7/8/9, D-03): the gate-loop dispatcher. Mirrors the
// resolveZoneAccess signature style — explicit `now: Date`, explicit subject
// personId/clearance/orgId, arrays passed in. Pure: no Date.now()/new Date().
//
// Steps:
//   1. selectActivePolicy(now) — null => fail-closed NO_ACTIVE_POLICY DENY (D-03).
//   2. effectiveClassification(resource) once (single-hop for Applications).
//   3. Loop policy.gates IN LIST ORDER, evaluateGate each, collect a trace entry;
//      allow = AND of every gate.pass.
//   4. If policy.zone_prereq_id !== null, call the REUSED resolveZoneAccess
//      UNCHANGED and attach to zoneAdvisory — which NEVER feeds `allow` (req 8).
//   5. policyVersion = the selected assignment's window (req 9).
export function resolveResourceAccess(
  subject: string,
  subjectClearance: Clearance,
  subjectOrgId: string,
  resource: NetworkNode | PlatformNode | ApplicationNode,
  allNetworks: NetworkNode[],
  allPlatforms: PlatformNode[],
  allGrants: ResourceAccessGrant[],
  allZones: ZoneNode[],
  allPhysicalGrants: PhysicalAccessGrant[],
  now: Date,
): ResourceAccessResult {
  // Step 1: select the active policy. Uncovered timestamp => fail-closed DENY (D-03).
  const assignment = selectActivePolicy(resource.policy_assignments, now);
  if (assignment === null) {
    return {
      allow: false,
      gates: [],
      zoneAdvisory: null,
      policyVersion: null,
      reason: "NO_ACTIVE_POLICY",
    };
  }
  const policy = assignment.policy;

  // Step 2: derive the effective classification once (single-hop for Applications).
  const effectiveClass = effectiveClassification(resource, allPlatforms);
  const ctx: GateContext = {
    subject,
    subjectClearance,
    subjectOrgId,
    effectiveClassification: effectiveClass,
    resource,
    allNetworks,
    allPlatforms,
    grants: allGrants,
    now,
  };

  // Step 3: evaluate gates in list order; allow = AND of all gate pass values.
  const gates: ResourceGateResult[] = policy.gates.map((gate) =>
    evaluateGate(gate, ctx),
  );
  const allow = gates.every((g) => g.pass);

  // Step 4: advisory zone prerequisite (req 8). Reuse resolveZoneAccess UNCHANGED;
  // attach independently. zoneAdvisory NEVER changes `allow`.
  let zoneAdvisory: ZoneAccessResult | null = null;
  if (policy.zone_prereq_id !== null) {
    const zone = allZones.find((z) => z.id === policy.zone_prereq_id);
    if (zone) {
      zoneAdvisory = resolveZoneAccess(
        subject,
        zone,
        subjectClearance,
        /* hasValidEscort */ false,
        allZones,
        allPhysicalGrants,
        now,
      );
    }
  }

  // Step 5: explainable trace with the applied policy version.
  return {
    allow,
    gates,
    zoneAdvisory,
    policyVersion: {
      valid_from: assignment.valid_from,
      valid_until: assignment.valid_until,
    },
  };
}

// canIssueResourceGrant (req 10 — closes the v2.1 DELEG-03 gap, which was type-only).
// True iff the actor org holds an active ADMIN org_link on the resource OR an active
// matching ResourceAccessDelegate (ORG delegate matching actorOrgId). Non-ADMIN /
// no-delegate actors and expired delegates => false. Pure, explicit `now`.
export function canIssueResourceGrant(
  actorOrgId: string,
  resource: NetworkNode | PlatformNode | ApplicationNode,
  allDelegates: ResourceAccessDelegate[],
  now: Date,
): boolean {
  // ADMIN path: an active ADMIN org_link held by the actor org.
  const adminLinks = activeOrgLinksForRole(resource.org_links, "ADMIN", now);
  if (adminLinks.some((link) => link.org_id === actorOrgId)) {
    return true;
  }
  // Delegate path: an active matching ResourceAccessDelegate for this resource and
  // actor org (ORG delegate). Expired delegates fail the isWindowActive check.
  return allDelegates.some(
    (d) =>
      d.resource_id === resource.id &&
      d.delegate_type === "ORG" &&
      d.delegate_org_id === actorOrgId &&
      isWindowActive(d.valid_from, d.valid_until, now),
  );
}
