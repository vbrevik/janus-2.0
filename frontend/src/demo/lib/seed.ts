// demo/lib/seed.ts — seeded 6-unit world for the Authorization Hub demo.
// SEED HEAD (subj-1..4 / res-1..4): re-keyed from spikes/lib/data.ts onto UnitId (D-10).
// Seed-head invariant (R9): do NOT modify records above the Task-3 boundary comment —
// the 6 ported abac.test.ts fixture assertions depend on these exact records.

import type {
  Subject,
  Resource,
  HubPointer,
  UnitId,
  AttrEvent,
  Subunit,
  EntityPolicy,
  ZoneNode,
  PhysicalAccessGrant,
  ZoneAccessDelegate,
  ZoneEntryLog,
  ZoneVisitorPass,
  GateDescriptor,
  ResourcePolicy,
  NetworkNode,
  PlatformNode,
  ApplicationNode,
  OrgLink,
  PolicyAssignment,
  ResourceAccessGrant,
  ResourceAccessDelegate,
} from "./model";
export { ROLES, TIERS, UNITS } from "./model";
export type { Subject, Resource, HubPointer, UnitId } from "./model";

// Cross-unit sharing agreements (affiliation attribute).
// Default: most units mutually agreed. EXCEPTION: MILITARY_1 ↔ INTEL has no agreement
// so the Affiliation-DENY fixture (subj-1@MILITARY_1 vs res-3@INTEL) stays green (R9).
export const AGREEMENTS: [UnitId, UnitId][] = [
  ["MILITARY_1", "MILITARY_2"],
  ["MILITARY_1", "INFRA"],
  ["MILITARY_1", "HOME_GUARD"],
  ["MILITARY_1", "INDUSTRY"],
  ["MILITARY_2", "INTEL"],
  ["MILITARY_2", "INFRA"],
  ["MILITARY_2", "HOME_GUARD"],
  ["MILITARY_2", "INDUSTRY"],
  ["INTEL", "INFRA"],
  ["INTEL", "HOME_GUARD"],
  ["INTEL", "INDUSTRY"],
  ["INFRA", "HOME_GUARD"],
  ["INFRA", "INDUSTRY"],
  ["HOME_GUARD", "INDUSTRY"],
  // MILITARY_1 ↔ INTEL intentionally ABSENT → Affiliation DENY for subj-1 vs res-3 (R9)
];

// --- Seed head: original 4 subjects (re-keyed onto UnitId, D-10) ---
// subj-1: Dana Reyes — CA-1 clean ALLOW actor (MILITARY_1, SECRET, DATA:RESTRICTED, AURORA)
// subj-2: Sam Okafor — cross-entity release target (MILITARY_2, TOP_SECRET, full tiers, AURORA+BLACKWING)
// subj-3: Lee Park — CA-2 tier-DENY actor (INTEL, CONFIDENTIAL, COMPUTER:STANDARD only)
// subj-4: Mara Vance — CA-4 NTK-DENY actor (MILITARY_1, TOP_SECRET, CITADEL not AURORA)

const BASE_SUBJECTS: Subject[] = [
  {
    id: "subj-1",
    name: "Dana Reyes",
    unit: "MILITARY_1", // was homeEntity: "ENTITY_A"
    clearance: "SECRET",
    domainAuth: { COMPUTER: "PRIVILEGED", DATA: "RESTRICTED" },
    compartments: ["AURORA"],
    flags: { revoked: false, securityHold: false },
  },
  {
    id: "subj-2",
    name: "Sam Okafor",
    unit: "MILITARY_2", // was homeEntity: "ENTITY_B"
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
    unit: "INTEL", // was homeEntity: "ENTITY_C" — no agreement with MILITARY_1 (Affiliation-DENY R9)
    clearance: "CONFIDENTIAL",
    domainAuth: { COMPUTER: "STANDARD" },
    compartments: [],
    flags: { revoked: false, securityHold: false },
  },
  {
    id: "subj-4",
    name: "Mara Vance",
    unit: "MILITARY_1", // was homeEntity: "ENTITY_A"
    clearance: "TOP_SECRET",
    domainAuth: { DATA: "CLASSIFIED", PHYSICAL: "SECURE_VAULT" },
    compartments: ["CITADEL"],
    flags: { revoked: false, securityHold: false },
  },
];

// --- Seed head: original 4 resources (re-keyed onto UnitId, D-10) ---
// res-1: Classified File Share — DATA RESTRICTED, needs AURORA, owned by MILITARY_1
// res-2: SCIF Door 4 — PHYSICAL SECURE_VAULT, needs BLACKWING, owned by MILITARY_2
// res-3: Dev Jump Host — COMPUTER PRIVILEGED, no compartments, owned by INTEL
// res-4: Crypto Vault — DATA CLASSIFIED, needs CITADEL, owned by MILITARY_1

const BASE_RESOURCES: Resource[] = [
  {
    id: "res-1",
    name: "Classified File Share",
    domain: "DATA",
    requiredTier: "RESTRICTED",
    minClearance: "SECRET",
    requiredCompartments: ["AURORA"],
    ownerUnit: "MILITARY_1", // was ownerEntity: "ENTITY_A"
  },
  {
    id: "res-2",
    name: "SCIF Door 4",
    domain: "PHYSICAL",
    requiredTier: "SECURE_VAULT",
    minClearance: "TOP_SECRET",
    requiredCompartments: ["BLACKWING"],
    ownerUnit: "MILITARY_2", // was ownerEntity: "ENTITY_B"
  },
  {
    id: "res-3",
    name: "Dev Jump Host",
    domain: "COMPUTER",
    requiredTier: "PRIVILEGED",
    minClearance: "CONFIDENTIAL",
    requiredCompartments: [],
    ownerUnit: "INTEL", // was ownerEntity: "ENTITY_C" — MILITARY_1 has no agreement → Affiliation DENY
  },
  {
    id: "res-4",
    name: "Crypto Vault",
    domain: "DATA",
    requiredTier: "CLASSIFIED",
    minClearance: "TOP_SECRET",
    requiredCompartments: ["CITADEL"],
    ownerUnit: "MILITARY_1", // was ownerEntity: "ENTITY_A"
  },
];

// Hub discovery index: WHO holds authz info about WHOM, in WHICH domain.
// No details (no clearance, compartments, tiers, or decision) — pointers only.
const BASE_HUB_INDEX: HubPointer[] = [
  { subjectId: "subj-1", holdingUnit: "MILITARY_1", domain: "DATA" },
  { subjectId: "subj-1", holdingUnit: "MILITARY_2", domain: "PHYSICAL" },
  { subjectId: "subj-2", holdingUnit: "MILITARY_2", domain: "PHYSICAL" },
  { subjectId: "subj-2", holdingUnit: "MILITARY_1", domain: "DATA" },
  { subjectId: "subj-3", holdingUnit: "INTEL", domain: "COMPUTER" },
  { subjectId: "subj-4", holdingUnit: "MILITARY_1", domain: "DATA" },
];

// --- rich seed expansion appended in Task 3 ---
// D-04/D-06: ~5 subjects + ~5 resources per unit across all 6 units (~30/30 total).
// Per-unit profiles per AUTH-MODEL §12:
//   MILITARY_1/2: broad access, wide tiers
//   INTEL: reads broad but own data shielded; SIGINT compartment
//   INFRA: physical/infrastructure focus
//   INDUSTRY: strict NTK + STOCKWATCH; leak-target resources shielded
//   HOME_GUARD: territorial; HOMELAND compartment

// ============================================================
// NAMED CONTRAST ACTORS (acceptance fixtures — stable ids)
// ============================================================

// CA-3a: override-DENY via revoked (flags.revoked: true — SO revoke action target)
// CA-3b: override-DENY via securityHold (flags.securityHold: true — SO hold action target)
// CA-4: NTK-DENY — cleared/tiered INDUSTRY subject missing STOCKWATCH
// CA-5: authorization-gap DENY (seed-only, Phase 1) — base rules all pass but authorization WITHDRAWN
// CA-5: authorization-gap DENY is seed-only in Phase 1; rule wired in Phase 3 (OQ-B).

// ============================================================
// MILITARY_1 expansion (subj-5..8 / res-5..7)
// ============================================================

const mil1Subjects: Subject[] = [
  {
    // CA-3a: override DENY via revoked
    id: "ca3a-subj",
    name: "Viktor Novak (Revoked)",
    unit: "MILITARY_1",
    clearance: "SECRET",
    domainAuth: { COMPUTER: "PRIVILEGED", DATA: "RESTRICTED" },
    compartments: ["AURORA"],
    flags: { revoked: true, securityHold: false }, // CA-3a: access revoked
  },
  {
    // CA-3b: override DENY via securityHold
    id: "ca3b-subj",
    name: "Ingrid Holm (On Hold)",
    unit: "MILITARY_1",
    clearance: "TOP_SECRET",
    domainAuth: {
      COMPUTER: "ROOT",
      DATA: "CLASSIFIED",
      PHYSICAL: "SECURE_VAULT",
    },
    compartments: ["AURORA", "BLACKWING", "CITADEL"],
    flags: { revoked: false, securityHold: true }, // CA-3b: Security Officer hold
  },
  {
    id: "subj-5",
    name: "Bjorn Eriksen",
    unit: "MILITARY_1",
    clearance: "TOP_SECRET",
    domainAuth: {
      COMPUTER: "ROOT",
      DATA: "CLASSIFIED",
      PHYSICAL: "RESTRICTED_AREA",
    },
    compartments: ["AURORA", "CITADEL"],
    flags: { revoked: false, securityHold: false },
    subunit: "1st Recon Coy",
    deployment: "HOME",
  },
  {
    id: "subj-6",
    name: "Astrid Larsen",
    unit: "MILITARY_1",
    clearance: "CONFIDENTIAL",
    domainAuth: { COMPUTER: "STANDARD", PHYSICAL: "LOBBY" },
    compartments: [],
    flags: { revoked: false, securityHold: false },
    subunit: "Logistics",
    deployment: "HOME",
  },
];

const mil1Resources: Resource[] = [
  {
    id: "res-5",
    name: "Operations Planning DB",
    domain: "DATA",
    requiredTier: "CLASSIFIED",
    minClearance: "TOP_SECRET",
    requiredCompartments: ["AURORA", "CITADEL"],
    ownerUnit: "MILITARY_1",
    assetKind: "database",
  },
  {
    id: "res-6",
    name: "Barracks Access Gate",
    domain: "PHYSICAL",
    requiredTier: "RESTRICTED_AREA",
    minClearance: "CONFIDENTIAL",
    requiredCompartments: [],
    ownerUnit: "MILITARY_1",
    assetKind: "physical_access",
  },
  {
    id: "res-7",
    name: "Tactical Comms Network",
    domain: "COMPUTER",
    requiredTier: "ROOT",
    minClearance: "SECRET",
    requiredCompartments: ["AURORA"],
    ownerUnit: "MILITARY_1",
    assetKind: "network",
  },
];

// ============================================================
// MILITARY_2 expansion (subj-7..9 / res-8..10)
// ============================================================

const mil2Subjects: Subject[] = [
  {
    id: "subj-7",
    name: "Erik Strand",
    unit: "MILITARY_2",
    clearance: "TOP_SECRET",
    domainAuth: {
      COMPUTER: "ROOT",
      DATA: "CLASSIFIED",
      PHYSICAL: "SECURE_VAULT",
    },
    compartments: ["AURORA", "BLACKWING", "CITADEL"],
    flags: { revoked: false, securityHold: false },
    subunit: "2nd Armoured",
    deployment: "HOME",
  },
  {
    // FW-2: deployed "Field Hospital" — support obligation context (from obligations.ts)
    id: "fw2-subj",
    name: "Dr. Karin Moe (Field Hospital)",
    unit: "MILITARY_1",
    clearance: "SECRET",
    domainAuth: {
      COMPUTER: "STANDARD",
      DATA: "RESTRICTED",
      PHYSICAL: "RESTRICTED_AREA",
    },
    compartments: ["AURORA"],
    flags: { revoked: false, securityHold: false },
    subunit: "Field Hospital",
    deployment: "ABROAD", // FW-2: deployed abroad — triggers support obligation for INFRA/MILITARY_2
    territory: "OPERATION_ZONE_NORTH",
  },
  {
    id: "subj-8",
    name: "Lars Dahl",
    unit: "MILITARY_2",
    clearance: "SECRET",
    domainAuth: { COMPUTER: "PRIVILEGED", DATA: "RESTRICTED" },
    compartments: ["BLACKWING"],
    flags: { revoked: false, securityHold: false },
    deployment: "HOME",
  },
  {
    id: "subj-9",
    name: "Sigrid Haug",
    unit: "MILITARY_2",
    clearance: "CONFIDENTIAL",
    domainAuth: { COMPUTER: "STANDARD", PHYSICAL: "LOBBY" },
    compartments: [],
    flags: { revoked: false, securityHold: false },
    deployment: "HOME",
  },
];

const mil2Resources: Resource[] = [
  {
    id: "res-8",
    name: "Joint Ops Command Center",
    domain: "PHYSICAL",
    requiredTier: "SECURE_VAULT",
    minClearance: "TOP_SECRET",
    requiredCompartments: ["BLACKWING"],
    ownerUnit: "MILITARY_2",
    assetKind: "physical_access",
  },
  {
    id: "res-9",
    name: "Intel Fusion Terminal",
    domain: "COMPUTER",
    requiredTier: "PRIVILEGED",
    minClearance: "SECRET",
    requiredCompartments: ["BLACKWING"],
    ownerUnit: "MILITARY_2",
    assetKind: "terminal",
  },
  {
    id: "res-10",
    name: "Logistics Manifest DB",
    domain: "DATA",
    requiredTier: "RESTRICTED",
    minClearance: "SECRET",
    requiredCompartments: [],
    ownerUnit: "MILITARY_2",
    assetKind: "database",
  },
];

// ============================================================
// INTEL expansion (subj-10..13 / res-11..14)
// INTEL profile: reads broadly, own data shielded, SIGINT compartment
// ============================================================

const intelSubjects: Subject[] = [
  {
    // FW-1: INTEL shielded brief — analyst with SIGINT who can access shielded intel resources
    id: "fw1-subj",
    name: "Alex Strand (Intel Analyst)",
    unit: "INTEL",
    clearance: "TOP_SECRET",
    domainAuth: {
      COMPUTER: "ROOT",
      DATA: "CLASSIFIED",
      PHYSICAL: "RESTRICTED_AREA",
    },
    compartments: ["AURORA", "SIGINT", "BLACKWING"],
    flags: { revoked: false, securityHold: false },
  },
  {
    id: "subj-10",
    name: "Nora Viken",
    unit: "INTEL",
    clearance: "TOP_SECRET",
    domainAuth: { COMPUTER: "PRIVILEGED", DATA: "CLASSIFIED" },
    compartments: ["SIGINT", "AURORA"],
    flags: { revoked: false, securityHold: false },
  },
  {
    id: "subj-11",
    name: "Tor Hansen",
    unit: "INTEL",
    clearance: "SECRET",
    domainAuth: { COMPUTER: "STANDARD", DATA: "RESTRICTED" },
    compartments: ["SIGINT"],
    flags: { revoked: false, securityHold: false },
  },
  {
    id: "subj-12",
    name: "Eva Holm",
    unit: "INTEL",
    clearance: "CONFIDENTIAL",
    domainAuth: { COMPUTER: "STANDARD" },
    compartments: [],
    flags: { revoked: false, securityHold: false },
  },
];

const intelResources: Resource[] = [
  {
    // FW-1: shielded INTEL resource — directional shielding; only INTEL on allowlist
    id: "fw1-res",
    name: "INTEL Threat Brief",
    domain: "DATA",
    requiredTier: "CLASSIFIED",
    minClearance: "TOP_SECRET",
    requiredCompartments: ["SIGINT"],
    ownerUnit: "INTEL",
    shielded: true, // FW-1: directional shielding — default deny outside allowlist
    allowlist: ["INTEL", "MILITARY_1"], // MILITARY_1 on allowlist for joint ops
    assetKind: "brief",
  },
  {
    id: "res-11",
    name: "SIGINT Collection Terminal",
    domain: "COMPUTER",
    requiredTier: "ROOT",
    minClearance: "TOP_SECRET",
    requiredCompartments: ["SIGINT"],
    ownerUnit: "INTEL",
    shielded: true,
    allowlist: ["INTEL"],
    assetKind: "terminal",
  },
  {
    id: "res-12",
    name: "Open-Source Intelligence DB",
    domain: "DATA",
    requiredTier: "INTERNAL",
    minClearance: "UNCLASSIFIED",
    requiredCompartments: [],
    ownerUnit: "INTEL",
    assetKind: "database",
  },
  {
    id: "res-13",
    name: "INTEL Secure Vault",
    domain: "PHYSICAL",
    requiredTier: "SECURE_VAULT",
    minClearance: "TOP_SECRET",
    requiredCompartments: ["SIGINT"],
    ownerUnit: "INTEL",
    assetKind: "physical_access",
  },
];

// ============================================================
// INFRA expansion (subj-14..17 / res-15..17)
// INFRA profile: physical/infrastructure focus
// ============================================================

const infraSubjects: Subject[] = [
  {
    id: "subj-13",
    name: "Pål Nygaard",
    unit: "INFRA",
    clearance: "SECRET",
    domainAuth: { PHYSICAL: "RESTRICTED_AREA", COMPUTER: "PRIVILEGED" },
    compartments: [],
    flags: { revoked: false, securityHold: false },
  },
  {
    id: "subj-14",
    name: "Hilde Bakke",
    unit: "INFRA",
    clearance: "CONFIDENTIAL",
    domainAuth: { PHYSICAL: "LOBBY", COMPUTER: "STANDARD" },
    compartments: [],
    flags: { revoked: false, securityHold: false },
  },
  {
    id: "subj-15",
    name: "Trond Lund",
    unit: "INFRA",
    clearance: "TOP_SECRET",
    domainAuth: {
      PHYSICAL: "SECURE_VAULT",
      COMPUTER: "ROOT",
      DATA: "RESTRICTED",
    },
    compartments: [],
    flags: { revoked: false, securityHold: false },
  },
  {
    id: "subj-16",
    name: "Randi Solberg",
    unit: "INFRA",
    clearance: "UNCLASSIFIED",
    domainAuth: { PHYSICAL: "LOBBY" },
    compartments: [],
    flags: { revoked: false, securityHold: false },
  },
];

const infraResources: Resource[] = [
  {
    id: "res-14",
    name: "Building Management System",
    domain: "COMPUTER",
    requiredTier: "STANDARD",
    minClearance: "UNCLASSIFIED",
    requiredCompartments: [],
    ownerUnit: "INFRA",
    assetKind: "system",
  },
  {
    id: "res-15",
    name: "Secure Facility Entrance",
    domain: "PHYSICAL",
    requiredTier: "RESTRICTED_AREA",
    minClearance: "CONFIDENTIAL",
    requiredCompartments: [],
    ownerUnit: "INFRA",
    assetKind: "physical_access",
  },
  {
    id: "res-16",
    name: "Asset Inventory Ledger",
    domain: "DATA",
    requiredTier: "RESTRICTED",
    minClearance: "SECRET",
    requiredCompartments: [],
    ownerUnit: "INFRA",
    assetKind: "database",
  },
  {
    id: "res-17",
    name: "Critical Infrastructure Vault",
    domain: "PHYSICAL",
    requiredTier: "SECURE_VAULT",
    minClearance: "SECRET",
    requiredCompartments: [],
    ownerUnit: "INFRA",
    assetKind: "physical_access",
  },
];

// ============================================================
// INDUSTRY expansion (subj-18..21 / res-18..21)
// INDUSTRY profile: strict NTK + STOCKWATCH; leak-target resources shielded
// ============================================================

const industrySubjects: Subject[] = [
  {
    // CA-4: NTK-DENY — cleared, tiered, but missing STOCKWATCH
    id: "ca4-subj",
    name: "Finn Berg (No STOCKWATCH)",
    unit: "INDUSTRY",
    clearance: "SECRET",
    // Clearance OK (SECRET ≥ SECRET), tier OK (DATA:CLASSIFIED ≥ CLASSIFIED), but no STOCKWATCH → NTK-DENY
    domainAuth: { DATA: "CLASSIFIED", COMPUTER: "PRIVILEGED" },
    compartments: ["AURORA"], // missing STOCKWATCH → NTK-DENY against fw3-res
    flags: { revoked: false, securityHold: false },
  },
  {
    // CA-5: authorization-gap DENY (seed-only in Phase 1; rule wired in Phase 3, OQ-B)
    id: "ca5-subj",
    name: "Maja Vik (Auth Withdrawn)",
    unit: "INDUSTRY",
    clearance: "SECRET",
    // All 4 base rules PASS (clearance OK, tier OK, NTK OK, affiliation OK)
    // but authorization.status=WITHDRAWN → DENY in Phase 3 (OQ-B). Seed-only in Phase 1.
    domainAuth: { DATA: "CLASSIFIED", COMPUTER: "PRIVILEGED" },
    compartments: ["STOCKWATCH"],
    flags: { revoked: false, securityHold: false },
    // CA-5: authorization-gap DENY is seed-only in Phase 1; rule wired in Phase 3 (OQ-B).
    authorization: {
      status: "WITHDRAWN",
      byRole: "Manager / Supervisor",
      conversationDate: "2026-01-15",
      validUntil: "2026-03-01",
      reauthDue: "2026-06-01",
    },
    clearanceValidUntil: "2027-01-01",
    clearanceGrantedBy: "NATIONAL-CLEARANCE-AUTHORITY",
  },
  {
    id: "subj-17",
    name: "Camilla Voss",
    unit: "INDUSTRY",
    clearance: "TOP_SECRET",
    domainAuth: { DATA: "CLASSIFIED", COMPUTER: "ROOT" },
    compartments: ["STOCKWATCH", "AURORA"],
    flags: { revoked: false, securityHold: false },
    clearanceValidUntil: "2027-06-01",
    clearanceGrantedBy: "NATIONAL-CLEARANCE-AUTHORITY",
    authorization: {
      status: "AUTHORIZED",
      byRole: "Manager / Supervisor",
      conversationDate: "2025-11-20",
      validUntil: "2026-11-20",
      reauthDue: "2026-08-01",
    },
  },
  {
    id: "subj-18",
    name: "Ola Knutsen",
    unit: "INDUSTRY",
    clearance: "CONFIDENTIAL",
    domainAuth: { COMPUTER: "STANDARD" },
    compartments: [],
    flags: { revoked: false, securityHold: false },
  },
  {
    id: "subj-19",
    name: "Frida Dahl",
    unit: "INDUSTRY",
    clearance: "SECRET",
    domainAuth: { DATA: "INTERNAL", COMPUTER: "STANDARD" },
    compartments: ["STOCKWATCH"],
    flags: { revoked: false, securityHold: false },
    authorization: {
      status: "PENDING",
      byRole: "Manager / Supervisor",
      conversationDate: "2026-05-01",
      validUntil: "2026-08-01",
      reauthDue: "2026-07-01",
    },
  },
];

const industryResources: Resource[] = [
  {
    // FW-3: industry stock-secret leak target — shielded, STOCKWATCH required
    id: "fw3-res",
    name: "Industry Stock Filing",
    domain: "DATA",
    requiredTier: "CLASSIFIED",
    minClearance: "SECRET",
    requiredCompartments: ["STOCKWATCH"],
    ownerUnit: "INDUSTRY",
    shielded: true, // FW-3: directional shielding; only INDUSTRY on allowlist
    allowlist: ["INDUSTRY"],
    assetKind: "filing",
  },
  {
    id: "res-18",
    name: "R&D Patent Archive",
    domain: "DATA",
    requiredTier: "RESTRICTED",
    minClearance: "SECRET",
    requiredCompartments: ["STOCKWATCH"],
    ownerUnit: "INDUSTRY",
    assetKind: "archive",
  },
  {
    id: "res-19",
    name: "Production Floor Access",
    domain: "PHYSICAL",
    requiredTier: "RESTRICTED_AREA",
    minClearance: "CONFIDENTIAL",
    requiredCompartments: [],
    ownerUnit: "INDUSTRY",
    assetKind: "physical_access",
  },
  {
    id: "res-20",
    name: "Financial Reporting System",
    domain: "COMPUTER",
    requiredTier: "PRIVILEGED",
    minClearance: "SECRET",
    requiredCompartments: ["STOCKWATCH"],
    ownerUnit: "INDUSTRY",
    shielded: true,
    allowlist: ["INDUSTRY"],
    assetKind: "system",
  },
];

// ============================================================
// HOME_GUARD expansion (subj-22..25 / res-22..24)
// HOME_GUARD profile: territorial; HOMELAND compartment
// ============================================================

const homeGuardSubjects: Subject[] = [
  {
    id: "subj-20",
    name: "Gunnar Moen",
    unit: "HOME_GUARD",
    clearance: "SECRET",
    domainAuth: {
      PHYSICAL: "RESTRICTED_AREA",
      COMPUTER: "STANDARD",
      DATA: "RESTRICTED",
    },
    compartments: ["HOMELAND"],
    flags: { revoked: false, securityHold: false },
    territory: "NORTHERN_DISTRICT",
    deployment: "HOME",
  },
  {
    id: "subj-21",
    name: "Bente Haugen",
    unit: "HOME_GUARD",
    clearance: "CONFIDENTIAL",
    domainAuth: { PHYSICAL: "LOBBY", COMPUTER: "STANDARD" },
    compartments: ["HOMELAND"],
    flags: { revoked: false, securityHold: false },
    territory: "COASTAL_DISTRICT",
    deployment: "HOME",
  },
  {
    id: "subj-22",
    name: "Olav Nesse",
    unit: "HOME_GUARD",
    clearance: "TOP_SECRET",
    domainAuth: {
      PHYSICAL: "SECURE_VAULT",
      COMPUTER: "PRIVILEGED",
      DATA: "CLASSIFIED",
    },
    compartments: ["HOMELAND", "CITADEL"],
    flags: { revoked: false, securityHold: false },
    territory: "CAPITAL_REGION",
    deployment: "HOME",
  },
  {
    id: "subj-23",
    name: "Silje Oyen",
    unit: "HOME_GUARD",
    clearance: "UNCLASSIFIED",
    domainAuth: { PHYSICAL: "LOBBY" },
    compartments: [],
    flags: { revoked: false, securityHold: false },
    territory: "EASTERN_DISTRICT",
    deployment: "HOME",
  },
];

const homeGuardResources: Resource[] = [
  {
    id: "res-21",
    name: "Territorial Defense Map",
    domain: "DATA",
    requiredTier: "RESTRICTED",
    minClearance: "SECRET",
    requiredCompartments: ["HOMELAND"],
    ownerUnit: "HOME_GUARD",
    assetKind: "map",
  },
  {
    id: "res-22",
    name: "District Armory",
    domain: "PHYSICAL",
    requiredTier: "RESTRICTED_AREA",
    minClearance: "CONFIDENTIAL",
    requiredCompartments: [],
    ownerUnit: "HOME_GUARD",
    assetKind: "physical_access",
  },
  {
    id: "res-23",
    name: "Civil Defense Coordination System",
    domain: "COMPUTER",
    requiredTier: "STANDARD",
    minClearance: "CONFIDENTIAL",
    requiredCompartments: ["HOMELAND"],
    ownerUnit: "HOME_GUARD",
    assetKind: "system",
  },
  {
    id: "res-24",
    name: "Regional Command Bunker",
    domain: "PHYSICAL",
    requiredTier: "SECURE_VAULT",
    minClearance: "TOP_SECRET",
    requiredCompartments: ["HOMELAND", "CITADEL"],
    ownerUnit: "HOME_GUARD",
    assetKind: "physical_access",
  },
];

// ============================================================
// FW-5: rogue-issuer credential placeholder subject
// Seeded for Phase 2 credential verification (spike 006 rogue issuer scenario).
// FW-5 subject carries no real clearance — the credential is from ROGUE-ISSUER and will
// fail signature verification in Phase 2.
// ============================================================

const fw5Subjects: Subject[] = [
  {
    id: "fw5-subj",
    name: "Unknown (Rogue Credential)",
    unit: "INDUSTRY",
    clearance: "TOP_SECRET", // [MOCK] — claimed via rogue credential, unverified
    domainAuth: { DATA: "CLASSIFIED", COMPUTER: "ROOT" },
    compartments: ["STOCKWATCH", "SIGINT", "AURORA"],
    flags: { revoked: false, securityHold: false },
    // FW-5: rogue-issuer credential placeholder — Phase 2 verifyCredential will reject
    clearanceGrantedBy: "ROGUE-ISSUER", // signals untrusted issuer in Phase 2
  },
];

// ============================================================
// Phase 14: dataset-denial narrative subject (v2.3 D-04)
// ============================================================

// ds-deny-subj: Priya Nair — dataset-denial narrative actor (v2.3 D-04): active
// Application grant, zero DatasetAccessGrants
const phase14DatasetSubjects: Subject[] = [
  {
    id: "ds-deny-subj",
    name: "Priya Nair",
    unit: "HOME_GUARD",
    clearance: "SECRET",
    domainAuth: { COMPUTER: "STANDARD" },
    compartments: [],
    flags: { revoked: false, securityHold: false },
  },
];

// ============================================================
// Merge all expansion records into the exported arrays
// ============================================================

export const SUBJECTS: Subject[] = [
  ...BASE_SUBJECTS,
  ...mil1Subjects,
  ...mil2Subjects,
  ...intelSubjects,
  ...infraSubjects,
  ...industrySubjects,
  ...homeGuardSubjects,
  ...fw5Subjects,
  ...phase14DatasetSubjects,
];

export const RESOURCES: Resource[] = [
  ...BASE_RESOURCES,
  ...mil1Resources,
  ...mil2Resources,
  ...intelResources,
  ...infraResources,
  ...industryResources,
  ...homeGuardResources,
];

// FW-4: hub index expansion — pointers for the forward actors
export const HUB_INDEX: HubPointer[] = [
  ...BASE_HUB_INDEX,
  { subjectId: "fw2-subj", holdingUnit: "MILITARY_1", domain: "DATA" },
  { subjectId: "fw2-subj", holdingUnit: "INFRA", domain: "PHYSICAL" },
  { subjectId: "fw1-subj", holdingUnit: "INTEL", domain: "COMPUTER" },
  { subjectId: "fw1-subj", holdingUnit: "INTEL", domain: "DATA" },
  // fw3-res removed: it is a resource id, not a subject id — wrong type for HUB_INDEX (WR-02)
  { subjectId: "ca5-subj", holdingUnit: "INDUSTRY", domain: "DATA" },
  { subjectId: "subj-17", holdingUnit: "INDUSTRY", domain: "DATA" },
  { subjectId: "subj-20", holdingUnit: "HOME_GUARD", domain: "PHYSICAL" },
  { subjectId: "subj-22", holdingUnit: "HOME_GUARD", domain: "DATA" },
];

// ============================================================
// Phase 3: Audit & Context seed additions (D3-01, D3-06, D3-07)
// ============================================================

// INITIAL_EVENTS — 4 baseline events pre-seeded in world-state (D3-01).
// Narrative: subj-1 (Dana Reyes) gains BLACKWING compartment (not already in base seed),
// a security hold fires and clears, then ca5-subj (Maja Vik) is re-authorized.
// Avoids the dedup no-op pitfall (RESEARCH Pitfall 2): subj-1 has only AURORA, not BLACKWING.
export const INITIAL_EVENTS: AttrEvent[] = [
  {
    seq: 1,
    subjectId: "subj-1",
    op: "GRANT_COMPARTMENT",
    value: "BLACKWING",
    actor: "Access Approver / AO",
  },
  {
    seq: 2,
    subjectId: "subj-1",
    op: "SET_HOLD",
    actor: "Security Officer",
  },
  {
    seq: 3,
    subjectId: "subj-1",
    op: "CLEAR_HOLD",
    actor: "Security Officer",
  },
  {
    seq: 4,
    subjectId: "ca5-subj",
    op: "AUTHORIZE_SUBJECT",
    actor: "Manager / Supervisor",
  },
];

// POLICIES — per-unit release policy (D3-06).
// Three flavors: standard (all rules), strict (INTEL: TOP_SECRET floor), relaxed (INDUSTRY: no NTK/affiliation).
// MILITARY_2, INFRA, HOME_GUARD inherit standard.
export const POLICIES: Record<UnitId, EntityPolicy> = {
  MILITARY_1: {
    id: "MILITARY_1",
    label: "Standard (all rules)",
    rules: {
      clearance: true,
      domainTier: true,
      needToKnow: true,
      affiliation: true,
    },
  },
  MILITARY_2: {
    id: "MILITARY_2",
    label: "Standard (all rules)",
    rules: {
      clearance: true,
      domainTier: true,
      needToKnow: true,
      affiliation: true,
    },
  },
  INTEL: {
    id: "INTEL",
    label: "Strict (TOP_SECRET floor)",
    rules: {
      clearance: true,
      domainTier: true,
      needToKnow: true,
      affiliation: true,
    },
    minClearanceFloor: "TOP_SECRET",
  },
  INFRA: {
    id: "INFRA",
    label: "Standard (all rules)",
    rules: {
      clearance: true,
      domainTier: true,
      needToKnow: true,
      affiliation: true,
    },
  },
  INDUSTRY: {
    id: "INDUSTRY",
    label: "Relaxed (no NTK / no affiliation)",
    rules: {
      clearance: true,
      domainTier: true,
      needToKnow: false,
      affiliation: false,
    },
  },
  HOME_GUARD: {
    id: "HOME_GUARD",
    label: "Standard (all rules)",
    rules: {
      clearance: true,
      domainTier: true,
      needToKnow: true,
      affiliation: true,
    },
  },
};

// SUBUNITS — 3 entries using MILITARY_1 and MILITARY_2 units (D3-07, adapted from obligations.ts).
export const SUBUNITS: Subunit[] = [
  { id: "su-1", name: "1st Recon Coy", unit: "MILITARY_1", deployment: "HOME" },
  {
    id: "su-2",
    name: "Field Hospital",
    unit: "MILITARY_1",
    deployment: "ABROAD",
  },
  { id: "su-3", name: "2nd Armoured", unit: "MILITARY_2", deployment: "HOME" },
];

// SUPPORT_OBLIGATIONS — which units have a standing obligation to support another unit's deployed subunits.
export const SUPPORT_OBLIGATIONS: { from: UnitId; to: UnitId }[] = [
  { from: "INFRA", to: "MILITARY_1" },
  { from: "MILITARY_2", to: "MILITARY_1" },
  { from: "INFRA", to: "MILITARY_2" },
];

// ============================================================
// Phase 8: Physical Access Zone Seed Data
// ============================================================

// ZONES — 3 root Sites, covering all three zone_type values.
// SECURED nodes only at BUILDING/ZONE/ROOM level (never SITE or AREA).
export const ZONES: ZoneNode[] = [
  // --- Site 1: Alpha Command (MILITARY_1, CONTROLLED) ---
  {
    id: "zone-site-alpha",
    name: "Alpha Command",
    level: "SITE",
    zone_type: "CONTROLLED",
    parent_id: null,
    admin_org_id: "MILITARY_1",
    asset_owner_org_id: "MILITARY_1",
    requires_explicit_auth: false,
  },
  {
    id: "zone-area-north",
    name: "North Wing",
    level: "AREA",
    zone_type: "CONTROLLED",
    parent_id: "zone-site-alpha",
    admin_org_id: "MILITARY_1",
    asset_owner_org_id: "MILITARY_1",
    requires_explicit_auth: false,
  },
  {
    id: "zone-bldg-block-a",
    name: "Block A",
    level: "BUILDING",
    zone_type: "CONTROLLED",
    parent_id: "zone-area-north",
    admin_org_id: "MILITARY_1",
    asset_owner_org_id: "MILITARY_1",
    requires_explicit_auth: false,
  },
  {
    id: "zone-corr-c1",
    name: "Corridor C1",
    level: "ZONE",
    zone_type: "CONTROLLED",
    parent_id: "zone-bldg-block-a",
    admin_org_id: "MILITARY_1",
    asset_owner_org_id: "MILITARY_1",
    requires_explicit_auth: false,
  },
  {
    id: "zone-room-sr1",
    name: "Server Room 1",
    level: "ROOM",
    zone_type: "CONTROLLED",
    parent_id: "zone-corr-c1",
    admin_org_id: "MILITARY_1",
    asset_owner_org_id: "MILITARY_1",
    requires_explicit_auth: false,
  },
  // SEED-05 explicit exclusion: SECURED zone inside CONTROLLED building — parent grant does NOT cover it.
  {
    id: "zone-secure-lab",
    name: "Secure Lab",
    level: "ZONE",
    zone_type: "SECURED",
    parent_id: "zone-bldg-block-a",
    admin_org_id: "MILITARY_1",
    asset_owner_org_id: "INTEL",
    requires_explicit_auth: true,
  },

  // --- Site 2: Intel Campus (INTEL, RESTRICTED) ---
  {
    id: "zone-site-intel",
    name: "Intel Campus",
    level: "SITE",
    zone_type: "RESTRICTED",
    parent_id: null,
    admin_org_id: "INTEL",
    asset_owner_org_id: "INTEL",
    requires_explicit_auth: false,
  },
  {
    id: "zone-bldg-analysis",
    name: "Analysis Wing",
    level: "BUILDING",
    zone_type: "RESTRICTED",
    parent_id: "zone-site-intel",
    admin_org_id: "INTEL",
    asset_owner_org_id: "INTEL",
    requires_explicit_auth: false,
  },
  // SEED-02: SECURED at ROOM level only (never SITE or AREA).
  {
    id: "zone-room-sigint",
    name: "SIGINT Suite",
    level: "ROOM",
    zone_type: "SECURED",
    parent_id: "zone-bldg-analysis",
    admin_org_id: "INTEL",
    asset_owner_org_id: "INTEL",
    requires_explicit_auth: true,
  },

  // --- Site 3: Logistics Hub (INFRA, CONTROLLED) ---
  {
    id: "zone-site-logistics",
    name: "Logistics Hub",
    level: "SITE",
    zone_type: "CONTROLLED",
    parent_id: null,
    admin_org_id: "INFRA",
    asset_owner_org_id: "INFRA",
    requires_explicit_auth: false,
  },
  {
    id: "zone-area-yard",
    name: "Yard",
    level: "AREA",
    zone_type: "CONTROLLED",
    parent_id: "zone-site-logistics",
    admin_org_id: "INFRA",
    asset_owner_org_id: "INFRA",
    requires_explicit_auth: false,
  },
  {
    id: "zone-bldg-warehouse-a",
    name: "Warehouse A",
    level: "BUILDING",
    zone_type: "CONTROLLED",
    parent_id: "zone-area-yard",
    admin_org_id: "INFRA",
    asset_owner_org_id: "MILITARY_2",
    requires_explicit_auth: false,
  },
  // SEED-04 inheritance target: grant at Warehouse A covers this room (same zone_type).
  {
    id: "zone-room-supply",
    name: "Supply Room",
    level: "ROOM",
    zone_type: "CONTROLLED",
    parent_id: "zone-bldg-warehouse-a",
    admin_org_id: "INFRA",
    asset_owner_org_id: "MILITARY_2",
    requires_explicit_auth: false,
  },
];

// GRANTS — temporal variety (active/expired/future/permanent) for TOGGLE_GRANT interactivity.
// ≤2 site-level grants per SEED-03; majority at BUILDING/ROOM level.
export const GRANTS: PhysicalAccessGrant[] = [
  // Permanent grant: covers CONTROLLED children of Block A via inheritance (SEED-04 demo).
  {
    id: "grant-dana-block-a",
    person_id: "subj-1",
    zone_id: "zone-bldg-block-a",
    valid_from: null,
    valid_until: null,
  },
  // Active explicit grant: required for SECURED zone (SEED-05 toggle demo — toggling off shows DENY).
  {
    id: "grant-dana-secure-lab",
    person_id: "subj-1",
    zone_id: "zone-secure-lab",
    valid_from: new Date("2026-01-01"),
    valid_until: null,
  },
  // Site-level grant #1 of ≤2 (SEED-03): Sam has site-wide access to Alpha Command.
  {
    id: "grant-sam-alpha-site",
    person_id: "subj-2",
    zone_id: "zone-site-alpha",
    valid_from: null,
    valid_until: null,
  },
  // Active explicit grant for SECURED SIGINT Suite (TOP_SECRET person).
  {
    id: "grant-sam-sigint",
    person_id: "subj-2",
    zone_id: "zone-room-sigint",
    valid_from: new Date("2026-01-01"),
    valid_until: null,
  },
  // Permanent grant: Lee has access to Warehouse A (covers Supply Room via inheritance).
  {
    id: "grant-lee-warehouse",
    person_id: "subj-3",
    zone_id: "zone-bldg-warehouse-a",
    valid_from: null,
    valid_until: null,
  },
  // Permanent grant: Mara has access to Analysis Wing.
  {
    id: "grant-mara-analysis",
    person_id: "subj-4",
    zone_id: "zone-bldg-analysis",
    valid_from: null,
    valid_until: null,
  },
  // EXPIRED grant (SEED-09): valid_until is 2026-03-01, before the demo date 2026-06-01.
  {
    id: "grant-expired-lee",
    person_id: "subj-3",
    zone_id: "zone-site-logistics",
    valid_from: new Date("2025-01-01"),
    valid_until: new Date("2026-03-01"),
  },
  // FUTURE grant (SEED-09): valid_from is 2026-08-01, after the demo date 2026-06-01.
  {
    id: "grant-future-dana",
    person_id: "subj-1",
    zone_id: "zone-bldg-analysis",
    valid_from: new Date("2026-08-01"),
    valid_until: null,
  },
];

// DELEGATES — one PERSON delegate and one ORG delegate (SEED-06).
export const DELEGATES: ZoneAccessDelegate[] = [
  // PERSON delegate: Mara (subj-4) can issue grants for Block A on behalf of MILITARY_1.
  {
    id: "deleg-person-1",
    zone_id: "zone-bldg-block-a",
    delegate_type: "PERSON",
    delegate_person_id: "subj-4",
    delegate_org_id: null,
    granted_by_org_id: "MILITARY_1",
    valid_from: null,
    valid_until: null,
  },
  // ORG delegate: MILITARY_2 can issue grants for Intel Campus on behalf of INTEL.
  {
    id: "deleg-org-1",
    zone_id: "zone-site-intel",
    delegate_type: "ORG",
    delegate_person_id: null,
    delegate_org_id: "MILITARY_2",
    granted_by_org_id: "INTEL",
    valid_from: new Date("2026-01-01"),
    valid_until: null,
  },
];

// ENTRY_LOGS — both CARD and ESCORT entries; all pass validateEntryLog (SEED-07).
// ESCORT entries must have escort_person_id set; CARD entries must have escort_person_id null.
export const ENTRY_LOGS: ZoneEntryLog[] = [
  {
    id: "log-card-1",
    person_id: "subj-1",
    zone_id: "zone-bldg-block-a",
    entry_at: new Date("2026-05-15T09:00:00Z"),
    exit_at: new Date("2026-05-15T17:00:00Z"),
    method: "CARD",
    escort_person_id: null,
  },
  {
    id: "log-card-2",
    person_id: "subj-4",
    zone_id: "zone-bldg-analysis",
    entry_at: new Date("2026-05-16T08:30:00Z"),
    exit_at: null,
    method: "CARD",
    escort_person_id: null,
  },
  // ESCORT entry: Lee (CONFIDENTIAL) escorted by Sam (TOP_SECRET) into SIGINT Suite.
  {
    id: "log-escort-1",
    person_id: "subj-3",
    zone_id: "zone-room-sigint",
    entry_at: new Date("2026-05-17T10:00:00Z"),
    exit_at: new Date("2026-05-17T12:00:00Z"),
    method: "ESCORT",
    escort_person_id: "subj-2",
  },
  // ESCORT entry: Lee escorted by Dana into Block A.
  {
    id: "log-escort-2",
    person_id: "subj-3",
    zone_id: "zone-bldg-block-a",
    entry_at: new Date("2026-05-20T14:00:00Z"),
    exit_at: null,
    method: "ESCORT",
    escort_person_id: "subj-1",
  },
];

// VISITOR_PASSES — each pass references an ESCORT entry_log_id (SEED-08).
// pass-1 is EXPIRED relative to demo date 2026-06-01; pass-2 is ACTIVE.
export const VISITOR_PASSES: ZoneVisitorPass[] = [
  {
    id: "pass-1",
    entry_log_id: "log-escort-1",
    escort_person_id: "subj-2",
    zone_id: "zone-room-sigint",
    valid_from: new Date("2026-05-17T10:00:00Z"),
    valid_until: new Date("2026-05-17T12:00:00Z"),
  },
  {
    id: "pass-2",
    entry_log_id: "log-escort-2",
    escort_person_id: "subj-1",
    zone_id: "zone-bldg-block-a",
    valid_from: new Date("2026-05-20T14:00:00Z"),
    valid_until: new Date("2026-12-31T23:59:59Z"),
  },
];

// ============================================================
// Phase 9/10 — Digital Resource fixtures.
// 6-unit restructured dataset (RSRC-SEED-01..05, Plan 01 Wave 1).
// Two legacy fixtures preserved: MilNet (policy-shift, SEED-06) and
// IntelNet (non-baseline, SEED-07) — both still resolvable by name
// via RESOURCE_NODES.find(n => n.name === "MilNet"/"IntelNet").
// ============================================================

// --- Resource policies ---

// Shared baseline gate list: clearance + own-tier grant + parent-tier grant.
const RESOURCE_BASELINE_GATES: GateDescriptor[] = [
  { kind: "CLEARANCE" },
  { kind: "OWN_TIER_GRANT" },
  { kind: "PARENT_TIER_GRANT" },
];

const RESOURCE_BASELINE_POLICY: ResourcePolicy = {
  id: "rsrc-pol-baseline",
  label: "Baseline access policy",
  gates: RESOURCE_BASELINE_GATES,
  zone_prereq_id: null,
};

const RESOURCE_RESTRICTED_POLICY: ResourcePolicy = {
  id: "rsrc-pol-restricted",
  label: "Post-incident policy",
  gates: [
    ...RESOURCE_BASELINE_GATES,
    { kind: "REQUIRED_ROLE", role: "SECURITY_APPROVAL" },
  ],
  zone_prereq_id: null,
};

const RESOURCE_NON_BASELINE_POLICY: ResourcePolicy = {
  id: "rsrc-pol-non-baseline",
  label: "Enhanced access policy",
  gates: [
    ...RESOURCE_BASELINE_GATES,
    { kind: "REQUIRED_ROLE", role: "SECURITY_APPROVAL" },
  ],
  zone_prereq_id: "zone-room-sr1", // RSRC-SEED-04: zone-prereq link
};

// --- 6 Networks (RSRC-SEED-01) ---

export const RESOURCE_NODES: NetworkNode[] = [
  // Network 1: MILITARY_1 — keeps policy-shift story (former MilNet)
  {
    id: "rsrc-milnet",
    name: "MilNet",
    tier: "NETWORK",
    classification: "SECRET",
    org_links: [
      {
        org_id: "MILITARY_1",
        role: "ADMIN",
        valid_from: null,
        valid_until: null,
      },
    ],
    policy_assignments: [
      {
        policy: RESOURCE_BASELINE_POLICY,
        valid_from: null,
        valid_until: new Date("2026-02-28T23:59:59Z"),
      },
      {
        policy: RESOURCE_RESTRICTED_POLICY,
        valid_from: new Date("2026-03-01T00:00:00Z"),
        valid_until: null,
      },
    ],
  },
  // Network 2: MILITARY_2
  {
    id: "rsrc-milnet-tac",
    name: "TacNet-Mil2",
    tier: "NETWORK",
    classification: "SECRET",
    org_links: [
      {
        org_id: "MILITARY_2",
        role: "ADMIN",
        valid_from: null,
        valid_until: null,
      },
      {
        org_id: "MILITARY_2",
        role: "OPERATOR",
        valid_from: null,
        valid_until: null,
      },
    ],
    policy_assignments: [
      { policy: RESOURCE_BASELINE_POLICY, valid_from: null, valid_until: null },
    ],
  },
  // Network 3: INTEL — keeps non-baseline story (former IntelNet)
  {
    id: "rsrc-intelnet",
    name: "IntelNet",
    tier: "NETWORK",
    classification: "TOP_SECRET",
    org_links: [
      { org_id: "INTEL", role: "ADMIN", valid_from: null, valid_until: null },
      {
        org_id: "MILITARY_1",
        role: "SECURITY_APPROVAL",
        valid_from: null,
        valid_until: null,
      },
    ],
    policy_assignments: [
      {
        policy: RESOURCE_NON_BASELINE_POLICY,
        valid_from: null,
        valid_until: null,
      },
    ],
  },
  // Network 4: INFRA
  {
    id: "rsrc-infrastructure",
    name: "InfraNet",
    tier: "NETWORK",
    classification: "CONFIDENTIAL",
    org_links: [
      { org_id: "INFRA", role: "ADMIN", valid_from: null, valid_until: null },
      {
        org_id: "INFRA",
        role: "OPERATOR",
        valid_from: null,
        valid_until: null,
      },
    ],
    policy_assignments: [
      { policy: RESOURCE_BASELINE_POLICY, valid_from: null, valid_until: null },
    ],
  },
  // Network 5: INDUSTRY
  {
    id: "rsrc-industry",
    name: "IndusNet",
    tier: "NETWORK",
    classification: "RESTRICTED",
    org_links: [
      {
        org_id: "INDUSTRY",
        role: "ADMIN",
        valid_from: null,
        valid_until: null,
      },
    ],
    policy_assignments: [
      { policy: RESOURCE_BASELINE_POLICY, valid_from: null, valid_until: null },
    ],
  },
  // Network 6: HOME_GUARD
  {
    id: "rsrc-homeguard",
    name: "HomeGuardNet",
    tier: "NETWORK",
    classification: "UNCLASSIFIED",
    org_links: [
      {
        org_id: "HOME_GUARD",
        role: "ADMIN",
        valid_from: null,
        valid_until: null,
      },
    ],
    policy_assignments: [
      { policy: RESOURCE_BASELINE_POLICY, valid_from: null, valid_until: null },
    ],
  },
];

// --- Platforms (RSRC-SEED-02) ---

export const PLATFORMS: PlatformNode[] = [
  // Platform 1: on MilNet — policy-shift narrative, zone_prereq (RSRC-SEED-04)
  {
    id: "rsrc-milpl-1",
    name: "MilPlatform-1",
    tier: "PLATFORM",
    classification: "SECRET",
    network_id: "rsrc-milnet",
    org_links: [
      {
        org_id: "MILITARY_1",
        role: "ADMIN",
        valid_from: null,
        valid_until: null,
      },
      {
        org_id: "MILITARY_1",
        role: "ASSET_OWNER",
        valid_from: null,
        valid_until: null,
      },
    ],
    policy_assignments: [
      { policy: RESOURCE_BASELINE_POLICY, valid_from: null, valid_until: null },
    ],
  },
  // Platform 2: on TacNet-Mil2
  {
    id: "rsrc-tacpl-1",
    name: "TacPlatform-1",
    tier: "PLATFORM",
    classification: "SECRET",
    network_id: "rsrc-milnet-tac",
    org_links: [
      {
        org_id: "MILITARY_2",
        role: "ADMIN",
        valid_from: null,
        valid_until: null,
      },
    ],
    policy_assignments: [
      { policy: RESOURCE_BASELINE_POLICY, valid_from: null, valid_until: null },
    ],
  },
  // Platform 3: on IntelNet — non-baseline policy
  {
    id: "rsrc-intpl-1",
    name: "IntelPlatform-1",
    tier: "PLATFORM",
    classification: "TOP_SECRET",
    network_id: "rsrc-intelnet",
    org_links: [
      { org_id: "INTEL", role: "ADMIN", valid_from: null, valid_until: null },
    ],
    policy_assignments: [
      {
        policy: RESOURCE_NON_BASELINE_POLICY,
        valid_from: null,
        valid_until: null,
      },
    ],
  },
  // Platform 4: on InfraNet
  {
    id: "rsrc-infrapl-1",
    name: "InfraPlatform-1",
    tier: "PLATFORM",
    classification: "CONFIDENTIAL",
    network_id: "rsrc-infrastructure",
    org_links: [
      { org_id: "INFRA", role: "ADMIN", valid_from: null, valid_until: null },
    ],
    policy_assignments: [
      { policy: RESOURCE_BASELINE_POLICY, valid_from: null, valid_until: null },
    ],
  },
];

// --- Applications (RSRC-SEED-03, NO classification field) ---

export const APPLICATIONS: ApplicationNode[] = [
  // App 1: on MilPlatform-1
  {
    id: "rsrc-milapp-1",
    name: "MilApp-1",
    tier: "APPLICATION",
    platform_id: "rsrc-milpl-1",
    org_links: [
      {
        org_id: "MILITARY_1",
        role: "ADMIN",
        valid_from: null,
        valid_until: null,
      },
    ],
    policy_assignments: [
      { policy: RESOURCE_BASELINE_POLICY, valid_from: null, valid_until: null },
    ],
  },
  // App 2: on TacPlatform-1
  {
    id: "rsrc-tacapp-1",
    name: "TacApp-1",
    tier: "APPLICATION",
    platform_id: "rsrc-tacpl-1",
    org_links: [
      {
        org_id: "MILITARY_2",
        role: "ADMIN",
        valid_from: null,
        valid_until: null,
      },
    ],
    policy_assignments: [
      { policy: RESOURCE_BASELINE_POLICY, valid_from: null, valid_until: null },
    ],
  },
  // App 3: on IntelPlatform-1
  {
    id: "rsrc-intapp-1",
    name: "IntelApp-1",
    tier: "APPLICATION",
    platform_id: "rsrc-intpl-1",
    org_links: [
      { org_id: "INTEL", role: "ADMIN", valid_from: null, valid_until: null },
    ],
    policy_assignments: [
      {
        policy: RESOURCE_NON_BASELINE_POLICY,
        valid_from: null,
        valid_until: null,
      },
    ],
  },
  // App 4: on InfraPlatform-1
  {
    id: "rsrc-infraapp-1",
    name: "InfraApp-1",
    tier: "APPLICATION",
    platform_id: "rsrc-infrapl-1",
    org_links: [
      { org_id: "INFRA", role: "ADMIN", valid_from: null, valid_until: null },
    ],
    policy_assignments: [
      { policy: RESOURCE_BASELINE_POLICY, valid_from: null, valid_until: null },
    ],
  },
];

// --- Flat org links (for selectors) ---

export const ORG_LINKS: OrgLink[] = [
  { org_id: "MILITARY_1", role: "ADMIN", valid_from: null, valid_until: null }, // MilNet
  { org_id: "MILITARY_1", role: "ADMIN", valid_from: null, valid_until: null }, // MilPlat-1
  {
    org_id: "MILITARY_1",
    role: "ASSET_OWNER",
    valid_from: null,
    valid_until: null,
  },
  { org_id: "MILITARY_2", role: "ADMIN", valid_from: null, valid_until: null }, // TacNet
  {
    org_id: "MILITARY_2",
    role: "OPERATOR",
    valid_from: null,
    valid_until: null,
  },
  { org_id: "MILITARY_2", role: "ADMIN", valid_from: null, valid_until: null }, // TacPlat-1
  { org_id: "INTEL", role: "ADMIN", valid_from: null, valid_until: null }, // IntelNet
  {
    org_id: "MILITARY_1",
    role: "SECURITY_APPROVAL",
    valid_from: null,
    valid_until: null,
  },
  { org_id: "INTEL", role: "ADMIN", valid_from: null, valid_until: null }, // IntelPlat-1
  { org_id: "INFRA", role: "ADMIN", valid_from: null, valid_until: null }, // InfraNet
  { org_id: "INFRA", role: "OPERATOR", valid_from: null, valid_until: null },
  { org_id: "INFRA", role: "ADMIN", valid_from: null, valid_until: null }, // InfraPlat-1
  { org_id: "INDUSTRY", role: "ADMIN", valid_from: null, valid_until: null }, // Industry
  { org_id: "HOME_GUARD", role: "ADMIN", valid_from: null, valid_until: null }, // HomeGuard
  { org_id: "MILITARY_1", role: "ADMIN", valid_from: null, valid_until: null }, // MilApp-1
  { org_id: "MILITARY_2", role: "ADMIN", valid_from: null, valid_until: null }, // TacApp-1
  { org_id: "INTEL", role: "ADMIN", valid_from: null, valid_until: null }, // IntelApp-1
  { org_id: "INFRA", role: "ADMIN", valid_from: null, valid_until: null }, // InfraApp-1
];

// --- Flat policies ---

export const RSRC_POLICIES: ResourcePolicy[] = [
  RESOURCE_BASELINE_POLICY,
  RESOURCE_RESTRICTED_POLICY,
  RESOURCE_NON_BASELINE_POLICY,
];

// --- Flat policy assignments ---

export const POLICY_ASSIGNMENTS: PolicyAssignment[] = [
  // MilNet — policy shift
  {
    policy: RESOURCE_BASELINE_POLICY,
    valid_from: null,
    valid_until: new Date("2026-02-28T23:59:59Z"),
  },
  {
    policy: RESOURCE_RESTRICTED_POLICY,
    valid_from: new Date("2026-03-01T00:00:00Z"),
    valid_until: null,
  },
  // TacNet — baseline permanent
  { policy: RESOURCE_BASELINE_POLICY, valid_from: null, valid_until: null },
  // IntelNet — non-baseline permanent
  { policy: RESOURCE_NON_BASELINE_POLICY, valid_from: null, valid_until: null },
  // InfraNet, Industry, HomeGuard
  { policy: RESOURCE_BASELINE_POLICY, valid_from: null, valid_until: null },
  { policy: RESOURCE_BASELINE_POLICY, valid_from: null, valid_until: null },
  { policy: RESOURCE_BASELINE_POLICY, valid_from: null, valid_until: null },
  // Platforms (4)
  { policy: RESOURCE_BASELINE_POLICY, valid_from: null, valid_until: null },
  { policy: RESOURCE_BASELINE_POLICY, valid_from: null, valid_until: null },
  { policy: RESOURCE_NON_BASELINE_POLICY, valid_from: null, valid_until: null },
  { policy: RESOURCE_BASELINE_POLICY, valid_from: null, valid_until: null },
  // Applications (4)
  { policy: RESOURCE_BASELINE_POLICY, valid_from: null, valid_until: null },
  { policy: RESOURCE_BASELINE_POLICY, valid_from: null, valid_until: null },
  { policy: RESOURCE_NON_BASELINE_POLICY, valid_from: null, valid_until: null },
  { policy: RESOURCE_BASELINE_POLICY, valid_from: null, valid_until: null },
];

// --- Grants (RSRC-SEED-05: temporal variety per tier) ---

export const RESOURCE_GRANTS: ResourceAccessGrant[] = [
  // === NETWORK grants ===
  // Expired network grant
  {
    id: "rsrc-grant-milnet-expired",
    person_id: "subj-1",
    resource_id: "rsrc-milnet",
    valid_from: null,
    valid_until: new Date("2025-01-01"),
  },
  // Active network grant
  {
    id: "rsrc-grant-milnet-active",
    person_id: "subj-1",
    resource_id: "rsrc-milnet",
    valid_from: null,
    valid_until: null,
  },
  // Future network grant
  {
    id: "rsrc-grant-milnet-future",
    person_id: "subj-1",
    resource_id: "rsrc-milnet",
    valid_from: new Date("2027-01-01"),
    valid_until: null,
  },
  // Active grant on TacNet
  {
    id: "rsrc-grant-tacnet-active",
    person_id: "subj-1",
    resource_id: "rsrc-milnet-tac",
    valid_from: null,
    valid_until: null,
  },
  // Active grant on IntelNet
  {
    id: "rsrc-grant-intelnet-active",
    person_id: "subj-1",
    resource_id: "rsrc-intelnet",
    valid_from: null,
    valid_until: null,
  },
  // === PLATFORM grants ===
  // Expired platform grant
  {
    id: "rsrc-grant-milpl-expired",
    person_id: "subj-1",
    resource_id: "rsrc-milpl-1",
    valid_from: null,
    valid_until: new Date("2025-06-01"),
  },
  // Active platform grant
  {
    id: "rsrc-grant-milpl-active",
    person_id: "subj-1",
    resource_id: "rsrc-milpl-1",
    valid_from: null,
    valid_until: null,
  },
  // Future platform grant
  {
    id: "rsrc-grant-milpl-future",
    person_id: "subj-1",
    resource_id: "rsrc-milpl-1",
    valid_from: new Date("2027-06-01"),
    valid_until: null,
  },
  // Active grants on other platforms
  {
    id: "rsrc-grant-tacpl-active",
    person_id: "subj-1",
    resource_id: "rsrc-tacpl-1",
    valid_from: null,
    valid_until: null,
  },
  {
    id: "rsrc-grant-intpl-active",
    person_id: "subj-1",
    resource_id: "rsrc-intpl-1",
    valid_from: null,
    valid_until: null,
  },
  // === APPLICATION grants ===
  // Expired application grant
  {
    id: "rsrc-grant-milapp-expired",
    person_id: "subj-1",
    resource_id: "rsrc-milapp-1",
    valid_from: null,
    valid_until: new Date("2025-09-01"),
  },
  // Active application grant
  {
    id: "rsrc-grant-milapp-active",
    person_id: "subj-1",
    resource_id: "rsrc-milapp-1",
    valid_from: null,
    valid_until: null,
  },
  // Future application grant
  {
    id: "rsrc-grant-milapp-future",
    person_id: "subj-1",
    resource_id: "rsrc-milapp-1",
    valid_from: new Date("2027-09-01"),
    valid_until: null,
  },
  // Active grants on other apps
  {
    id: "rsrc-grant-tacapp-active",
    person_id: "subj-1",
    resource_id: "rsrc-tacapp-1",
    valid_from: null,
    valid_until: null,
  },
  {
    id: "rsrc-grant-intapp-active",
    person_id: "subj-1",
    resource_id: "rsrc-intapp-1",
    valid_from: null,
    valid_until: null,
  },
  // Grant on Infra resources
  {
    id: "rsrc-grant-infra-active",
    person_id: "subj-1",
    resource_id: "rsrc-infrastructure",
    valid_from: null,
    valid_until: null,
  },
  {
    id: "rsrc-grant-infrapl-active",
    person_id: "subj-1",
    resource_id: "rsrc-infrapl-1",
    valid_from: null,
    valid_until: null,
  },
  {
    id: "rsrc-grant-infraapp-active",
    person_id: "subj-1",
    resource_id: "rsrc-infraapp-1",
    valid_from: null,
    valid_until: null,
  },
  // === Phase 14: additive Application-grant entries for dataset access stories (D-01) ===
  // Sam's ONLY grant on this Application, deliberately expired (deny-matrix case-b fixture)
  {
    id: "rsrc-grant-subj2-milapp-expired",
    person_id: "subj-2",
    resource_id: "rsrc-milapp-1",
    valid_from: null,
    valid_until: new Date("2026-05-01T00:00:00Z"),
  },
  // Lee's active grant (deny-matrix case-a fixture)
  {
    id: "rsrc-grant-subj3-milapp-active",
    person_id: "subj-3",
    resource_id: "rsrc-milapp-1",
    valid_from: null,
    valid_until: null,
  },
  // DATA-SEED-05 / deny-matrix-case-c fixture: active app grant, paired with zero
  // DatasetAccessGrant records (see Task 2's DATASET_GRANTS)
  {
    id: "rsrc-grant-dsdenysubj-milapp-active",
    person_id: "ds-deny-subj",
    resource_id: "rsrc-milapp-1",
    valid_from: null,
    valid_until: null,
  },
];

// --- Delegates ---

export const RSRC_DELEGATES: ResourceAccessDelegate[] = [
  // MILITARY_1 delegates IntelNet access authority to subject-2
  {
    id: "rsrc-delegate-subj2",
    resource_id: "rsrc-intelnet",
    delegate_type: "PERSON",
    delegate_person_id: "subj-2",
    delegate_org_id: null,
    granted_by_org_id: "INTEL",
    valid_from: null,
    valid_until: null,
  },
];
