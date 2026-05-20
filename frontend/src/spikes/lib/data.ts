// Janus spike — shared mock substrate (seeded, deterministic, in-memory only).
// DEMO/MOCK. Not production. No persistence, no backend.

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

export type Domain = "COMPUTER" | "DATA" | "PHYSICAL";

// Per-domain tier scales (A7: each domain has its own ladder, ordered low→high).
export const TIERS: Record<Domain, string[]> = {
  COMPUTER: ["STANDARD", "PRIVILEGED", "ROOT"],
  DATA: ["INTERNAL", "RESTRICTED", "CLASSIFIED"],
  PHYSICAL: ["LOBBY", "RESTRICTED_AREA", "SECURE_VAULT"],
};

export type Compartment = "AURORA" | "BLACKWING" | "CITADEL";
export type EntityId = "ENTITY_A" | "ENTITY_B" | "ENTITY_C";

export const ENTITIES: Record<EntityId, { id: EntityId; name: string }> = {
  ENTITY_A: { id: "ENTITY_A", name: "Northgate Agency" },
  ENTITY_B: { id: "ENTITY_B", name: "Helios Contractor" },
  ENTITY_C: { id: "ENTITY_C", name: "Vector Labs" },
};

// Cross-entity sharing agreements (affiliation attribute). A<->B share; C is isolated.
export const AGREEMENTS: [EntityId, EntityId][] = [["ENTITY_A", "ENTITY_B"]];

export interface SubjectFlags {
  revoked: boolean;
  securityHold: boolean; // set by Security Officer -> deny override (A4)
}

export interface Subject {
  id: string;
  name: string;
  homeEntity: EntityId;
  clearance: Clearance; // external attribute, read-only in Janus
  domainAuth: Partial<Record<Domain, string>>; // authorized tier per domain (absent = none)
  compartments: Compartment[]; // need-to-know
  flags: SubjectFlags;
}

export const SUBJECTS: Subject[] = [
  {
    id: "subj-1",
    name: "Dana Reyes",
    homeEntity: "ENTITY_A",
    clearance: "SECRET",
    domainAuth: { COMPUTER: "PRIVILEGED", DATA: "RESTRICTED" },
    compartments: ["AURORA"],
    flags: { revoked: false, securityHold: false },
  },
  {
    id: "subj-2",
    name: "Sam Okafor",
    homeEntity: "ENTITY_B",
    clearance: "TOP_SECRET",
    domainAuth: {
      COMPUTER: "ROOT",
      DATA: "CLASSIFIED",
      PHYSICAL: "SECURE_VAULT",
    },
    compartments: ["AURORA", "BLACKWING"],
    flags: { revoked: false, securityHold: false },
  },
  {
    id: "subj-3",
    name: "Lee Park",
    homeEntity: "ENTITY_C",
    clearance: "CONFIDENTIAL",
    domainAuth: { COMPUTER: "STANDARD" },
    compartments: [],
    flags: { revoked: false, securityHold: false },
  },
  {
    id: "subj-4",
    name: "Mara Vance",
    homeEntity: "ENTITY_A",
    clearance: "TOP_SECRET",
    domainAuth: { DATA: "CLASSIFIED", PHYSICAL: "SECURE_VAULT" },
    compartments: ["CITADEL"],
    flags: { revoked: false, securityHold: false },
  },
];

export interface Resource {
  id: string;
  name: string;
  domain: Domain;
  requiredTier: string;
  minClearance: Clearance;
  requiredCompartments: Compartment[];
  ownerEntity: EntityId;
}

export const RESOURCES: Resource[] = [
  {
    id: "res-1",
    name: "Classified File Share",
    domain: "DATA",
    requiredTier: "RESTRICTED",
    minClearance: "SECRET",
    requiredCompartments: ["AURORA"],
    ownerEntity: "ENTITY_A",
  },
  {
    id: "res-2",
    name: "SCIF Door 4",
    domain: "PHYSICAL",
    requiredTier: "SECURE_VAULT",
    minClearance: "TOP_SECRET",
    requiredCompartments: ["BLACKWING"],
    ownerEntity: "ENTITY_B",
  },
  {
    id: "res-3",
    name: "Dev Jump Host",
    domain: "COMPUTER",
    requiredTier: "PRIVILEGED",
    minClearance: "CONFIDENTIAL",
    requiredCompartments: [],
    ownerEntity: "ENTITY_C",
  },
  {
    id: "res-4",
    name: "Crypto Vault",
    domain: "DATA",
    requiredTier: "CLASSIFIED",
    minClearance: "TOP_SECRET",
    requiredCompartments: ["CITADEL"],
    ownerEntity: "ENTITY_A",
  },
];

// Central hub discovery index: WHO holds authz info about WHOM, in WHICH domain.
// Intentionally NO details (no clearance, compartments, tiers, or decision) — pointers only.
export interface HubPointer {
  subjectId: string;
  holdingEntity: EntityId;
  domain: Domain;
}

export const HUB_INDEX: HubPointer[] = [
  { subjectId: "subj-1", holdingEntity: "ENTITY_A", domain: "DATA" },
  { subjectId: "subj-1", holdingEntity: "ENTITY_B", domain: "PHYSICAL" },
  { subjectId: "subj-2", holdingEntity: "ENTITY_B", domain: "PHYSICAL" },
  { subjectId: "subj-2", holdingEntity: "ENTITY_A", domain: "DATA" },
  { subjectId: "subj-3", holdingEntity: "ENTITY_C", domain: "COMPUTER" },
  { subjectId: "subj-4", holdingEntity: "ENTITY_A", domain: "DATA" },
];

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
  | "view_self";

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
  },
  PERSONNEL_MGR: { label: "Personnel / Org Mgr", ops: ["edit_identity"] },
  AUDITOR: {
    label: "Auditor / Compliance",
    ops: ["view_eval", "view_all_readonly"],
  },
  MANAGER: {
    label: "Manager / Supervisor",
    ops: ["request_attribute", "view_team"],
  },
  SPONSOR: { label: "Org / Vendor Sponsor", ops: ["view_own_org"] },
  SUBJECT: { label: "End User / Subject", ops: ["view_self"] },
};

export const entityName = (id: EntityId): string => ENTITIES[id]?.name ?? id;
