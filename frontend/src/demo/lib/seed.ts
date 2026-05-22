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

export const SUBJECTS: Subject[] = [
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

export const RESOURCES: Resource[] = [
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
export const HUB_INDEX: HubPointer[] = [
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
// Merge all expansion records into the exported arrays
// ============================================================

SUBJECTS.push(
  ...mil1Subjects,
  ...mil2Subjects,
  ...intelSubjects,
  ...infraSubjects,
  ...industrySubjects,
  ...homeGuardSubjects,
  ...fw5Subjects,
);

RESOURCES.push(
  ...mil1Resources,
  ...mil2Resources,
  ...intelResources,
  ...infraResources,
  ...industryResources,
  ...homeGuardResources,
);

// FW-4: hub index expansion — pointers for the forward actors
HUB_INDEX.push(
  { subjectId: "fw2-subj", holdingUnit: "MILITARY_1", domain: "DATA" },
  { subjectId: "fw2-subj", holdingUnit: "INFRA", domain: "PHYSICAL" },
  { subjectId: "fw1-subj", holdingUnit: "INTEL", domain: "COMPUTER" },
  { subjectId: "fw1-subj", holdingUnit: "INTEL", domain: "DATA" },
  // fw3-res removed: it is a resource id, not a subject id — wrong type for HUB_INDEX (WR-02)
  { subjectId: "ca5-subj", holdingUnit: "INDUSTRY", domain: "DATA" },
  { subjectId: "subj-17", holdingUnit: "INDUSTRY", domain: "DATA" },
  { subjectId: "subj-20", holdingUnit: "HOME_GUARD", domain: "PHYSICAL" },
  { subjectId: "subj-22", holdingUnit: "HOME_GUARD", domain: "DATA" },
);

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
