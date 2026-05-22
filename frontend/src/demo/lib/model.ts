// demo/lib/model.ts — FROZEN unified world schema for the Authorization Hub demo.
// D-05: field set is frozen here for the whole milestone; do NOT reshape in P2/P3.
// D-10: UnitId (6 canonical units) is the single entity-id type; spike 3-entity scaffolding retired.
// D-11: authorization lifecycle fields are present (seed-only; evaluated in Phase 3, OQ-B).

// --- Clearance ladder (lifted verbatim from data.ts:4-14) ---

export type Clearance =
  | "UNCLASSIFIED"
  | "CONFIDENTIAL"
  | "SECRET"
  | "TOP_SECRET";

export const CLEARANCE_RANK: Record<Clearance, number> = {
  UNCLASSIFIED: 0,
  CONFIDENTIAL: 1,
  SECRET: 2,
  TOP_SECRET: 3,
};

// --- Authorization domains (lifted verbatim from data.ts:16-23) ---

export type Domain = "COMPUTER" | "DATA" | "PHYSICAL";

// Per-domain tier scales (A7: each domain has its own ladder, ordered low→high).
// NEVER collapse into a single ladder — per-domain tiers evaluate independently (ENGINE-02, R3).
export const TIERS: Record<Domain, string[]> = {
  COMPUTER: ["STANDARD", "PRIVILEGED", "ROOT"],
  DATA: ["INTERNAL", "RESTRICTED", "CLASSIFIED"],
  PHYSICAL: ["LOBBY", "RESTRICTED_AREA", "SECURE_VAULT"],
};

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
