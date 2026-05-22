// demo/lib/policy.test.ts — Vitest tests for per-entity policy evaluation.
// Ported from spikes/lib/policy.test.ts, adapted to UnitId and demo model (D3-14).

import { describe, it, expect } from "vitest";
import { evaluateWithPolicy } from "./policy";
import type { EntityPolicy } from "./model";
import type { Principal, Requirement } from "./abac";

// Inline fixtures (D3-13 pattern — no seed.ts imports in tests).

const STANDARD_POLICY: EntityPolicy = {
  id: "MILITARY_1",
  label: "Standard (all rules)",
  rules: {
    clearance: true,
    domainTier: true,
    needToKnow: true,
    affiliation: true,
  },
};

const STRICT_POLICY: EntityPolicy = {
  id: "INTEL",
  label: "Strict (TOP_SECRET floor)",
  rules: {
    clearance: true,
    domainTier: true,
    needToKnow: true,
    affiliation: true,
  },
  minClearanceFloor: "TOP_SECRET",
};

const RELAXED_POLICY: EntityPolicy = {
  id: "INDUSTRY",
  label: "Relaxed (no NTK / no affiliation)",
  rules: {
    clearance: true,
    domainTier: true,
    needToKnow: false,
    affiliation: false,
  },
};

// Dana-equivalent: SECRET, DATA:RESTRICTED, [AURORA], MILITARY_1
const danaPrincipal: Principal = {
  entity: "MILITARY_1",
  clearance: "SECRET",
  domainAuth: { DATA: "RESTRICTED" },
  compartments: ["AURORA"],
};

// Resource: DATA/RESTRICTED, SECRET, [AURORA], owned by MILITARY_1
const fileShareReq: Requirement = {
  minClearance: "SECRET",
  requiredCompartments: ["AURORA"],
  ownerUnit: "MILITARY_1",
  domain: "DATA",
  requiredTier: "RESTRICTED",
};

// Foreigner: no compartments, INDUSTRY entity (no agreement with MILITARY_1 in demo seed)
const foreignPrincipal: Principal = {
  entity: "INDUSTRY",
  clearance: "SECRET",
  domainAuth: { DATA: "RESTRICTED" },
  compartments: [],
};

describe("evaluateWithPolicy — standard policy", () => {
  it("ALLOW when all base rules pass for a standard policy", () => {
    const d = evaluateWithPolicy(danaPrincipal, fileShareReq, STANDARD_POLICY);
    expect(d.decision).toBe("ALLOW");
  });

  it("DENY when clearance is insufficient under standard policy", () => {
    const lowClearance: Principal = {
      ...danaPrincipal,
      clearance: "UNCLASSIFIED",
    };
    const d = evaluateWithPolicy(lowClearance, fileShareReq, STANDARD_POLICY);
    expect(d.decision).toBe("DENY");
    expect(d.failed).toContain("Clearance");
  });
});

describe("evaluateWithPolicy — INTEL strict policy (TOP_SECRET floor)", () => {
  it("DENY for a SECRET subject — fails the TOP_SECRET clearance floor", () => {
    const d = evaluateWithPolicy(danaPrincipal, fileShareReq, STRICT_POLICY);
    expect(d.decision).toBe("DENY");
    expect(d.failed).toContain("Clearance floor");
  });

  it("ALLOW for a TOP_SECRET subject — meets the clearance floor", () => {
    const topSecret: Principal = { ...danaPrincipal, clearance: "TOP_SECRET" };
    const d = evaluateWithPolicy(topSecret, fileShareReq, STRICT_POLICY);
    expect(d.decision).toBe("ALLOW");
  });
});

describe("evaluateWithPolicy — INDUSTRY relaxed policy (no NTK / no affiliation)", () => {
  it("DENY for foreigner under standard policy (missing compartment + no affiliation)", () => {
    const d = evaluateWithPolicy(
      foreignPrincipal,
      fileShareReq,
      STANDARD_POLICY,
    );
    expect(d.decision).toBe("DENY");
  });

  it("ALLOW for foreigner under relaxed policy (NTK and affiliation rules skipped)", () => {
    const d = evaluateWithPolicy(
      foreignPrincipal,
      fileShareReq,
      RELAXED_POLICY,
    );
    expect(d.decision).toBe("ALLOW");
  });

  it("relaxed policy does not include Need-to-know or Affiliation in rule list", () => {
    const d = evaluateWithPolicy(
      foreignPrincipal,
      fileShareReq,
      RELAXED_POLICY,
    );
    const ruleNames = d.rules.map((r) => r.name);
    expect(ruleNames).not.toContain("Need-to-know");
    expect(ruleNames).not.toContain("Affiliation");
  });
});

describe("evaluateWithPolicy — override flags propagate", () => {
  it("DENY when subject is revoked, even if all rules pass", () => {
    const revoked: Principal = {
      ...danaPrincipal,
      flags: { revoked: true, securityHold: false },
    };
    const d = evaluateWithPolicy(revoked, fileShareReq, STANDARD_POLICY);
    expect(d.decision).toBe("DENY");
  });
});
