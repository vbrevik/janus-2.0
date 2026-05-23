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
  admin_org_id: string;
  asset_owner_org_id: string;
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
  let current = nodeMap.get(zoneId);
  while (current?.parent_id != null) {
    if (visited.has(current.id)) break; // cycle guard
    visited.add(current.id);
    const parent = nodeMap.get(current.parent_id);
    if (!parent) break;
    ancestors.push(parent);
    current = parent;
  }
  return ancestors;
}

// Returns all transitive descendants (not just direct children) via breadth-first walk.
// Phase 8 uses this for full subtree rendering in the Zone Browser UI.
export function getDescendants(
  zoneId: string,
  allZones: ZoneNode[],
): ZoneNode[] {
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
