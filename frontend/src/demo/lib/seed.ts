// demo/lib/seed.ts — seeded 6-unit world for the Authorization Hub demo.
// SEED HEAD (subj-1..4 / res-1..4): re-keyed from spikes/lib/data.ts onto UnitId (D-10).
// Seed-head invariant (R9): do NOT modify records above the Task-3 boundary comment —
// the 6 ported abac.test.ts fixture assertions depend on these exact records.

import type { Subject, Resource, HubPointer, UnitId } from "./model";
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
