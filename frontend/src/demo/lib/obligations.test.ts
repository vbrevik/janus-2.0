// demo/lib/obligations.test.ts — Vitest tests for context-driven access rules.
// Ported from spikes/lib/obligations.test.ts, adapted to UnitId and demo model (D3-14).
// Inline fixtures — no seed.ts imports (D3-13 pattern).

import { describe, it, expect } from "vitest";
import { evaluateSubunitAccess, evaluateResourceAccess } from "./obligations";
import type { Subunit } from "./model";
import type { Resource } from "./model";

// Inline subunit fixtures (D3-13 — not imported from seed.ts).
const su1: Subunit = {
  id: "su-1",
  name: "1st Recon Coy",
  unit: "MILITARY_1",
  deployment: "HOME",
};
const su2: Subunit = {
  id: "su-2",
  name: "Field Hospital",
  unit: "MILITARY_1",
  deployment: "ABROAD",
};

// Inline support obligations.
const OBLIGATIONS: {
  from: import("./model").UnitId;
  to: import("./model").UnitId;
}[] = [
  { from: "INFRA", to: "MILITARY_1" },
  { from: "MILITARY_2", to: "MILITARY_1" },
  { from: "INFRA", to: "MILITARY_2" },
];

// Inline shielded resource fixtures.
const intelBrief: Resource = {
  id: "cr-1",
  name: "INTEL Threat Brief",
  domain: "DATA",
  requiredTier: "CLASSIFIED",
  minClearance: "TOP_SECRET",
  requiredCompartments: [],
  ownerUnit: "INTEL",
  shielded: true,
  allowlist: ["INTEL", "MILITARY_1"],
};

const industryFiling: Resource = {
  id: "cr-2",
  name: "Industry Stock Filing",
  domain: "DATA",
  requiredTier: "CLASSIFIED",
  minClearance: "SECRET",
  requiredCompartments: [],
  ownerUnit: "INDUSTRY",
  shielded: true,
  allowlist: ["INDUSTRY"],
};

const openResource: Resource = {
  id: "cr-3",
  name: "Open Resource",
  domain: "DATA",
  requiredTier: "INTERNAL",
  minClearance: "UNCLASSIFIED",
  requiredCompartments: [],
  ownerUnit: "INFRA",
  shielded: false,
};

describe("evaluateSubunitAccess — deployment-driven support obligation grants", () => {
  it("DENY when subunit is at HOME and requester has no obligation", () => {
    const home = { ...su1, deployment: "HOME" as const };
    expect(evaluateSubunitAccess("INFRA", home, OBLIGATIONS).decision).toBe(
      "DENY",
    );
  });

  it("ALLOW when subunit is ABROAD and requester has a support obligation", () => {
    const abroad = { ...su1, deployment: "ABROAD" as const };
    const d = evaluateSubunitAccess("INFRA", abroad, OBLIGATIONS);
    expect(d.decision).toBe("ALLOW");
  });

  it("DENY when subunit is ABROAD but requester has NO obligation", () => {
    const abroad = { ...su2, deployment: "ABROAD" as const };
    expect(
      evaluateSubunitAccess("INDUSTRY", abroad, OBLIGATIONS).decision,
    ).toBe("DENY");
  });

  it("access turns OFF when the subunit returns HOME (context is dynamic)", () => {
    const abroad = { ...su1, deployment: "ABROAD" as const };
    const home = { ...su1, deployment: "HOME" as const };
    expect(evaluateSubunitAccess("INFRA", abroad, OBLIGATIONS).decision).toBe(
      "ALLOW",
    );
    expect(evaluateSubunitAccess("INFRA", home, OBLIGATIONS).decision).toBe(
      "DENY",
    );
  });

  it("returns a Decision-shaped object with decision, rules, and failed fields", () => {
    const home = { ...su1, deployment: "HOME" as const };
    const d = evaluateSubunitAccess("INFRA", home, OBLIGATIONS);
    expect(d).toHaveProperty("decision");
    expect(d).toHaveProperty("rules");
    expect(d).toHaveProperty("failed");
    expect(Array.isArray(d.rules)).toBe(true);
    expect(Array.isArray(d.failed)).toBe(true);
  });
});

describe("evaluateResourceAccess — directional shielding", () => {
  it("ALLOW for allowlisted requester on shielded resource", () => {
    expect(evaluateResourceAccess("MILITARY_1", intelBrief).decision).toBe(
      "ALLOW",
    );
  });

  it("DENY for a non-allowlisted requester on shielded resource", () => {
    const d = evaluateResourceAccess("MILITARY_2", intelBrief);
    expect(d.decision).toBe("DENY");
    expect(
      d.rules.find((r) => r.name === "Directional shielding"),
    ).toBeDefined();
    expect(d.failed).toContain("Directional shielding");
  });

  it("owner always reaches its own shielded data", () => {
    expect(evaluateResourceAccess("INDUSTRY", industryFiling).decision).toBe(
      "ALLOW",
    );
  });

  it("non-shielded resource always ALLOW (no shielding rule applied)", () => {
    expect(evaluateResourceAccess("MILITARY_2", openResource).decision).toBe(
      "ALLOW",
    );
  });

  it("returns a Decision-shaped object with decision, rules, and failed fields", () => {
    const d = evaluateResourceAccess("MILITARY_2", intelBrief);
    expect(d).toHaveProperty("decision");
    expect(d).toHaveProperty("rules");
    expect(d).toHaveProperty("failed");
    expect(Array.isArray(d.rules)).toBe(true);
    expect(Array.isArray(d.failed)).toBe(true);
  });
});
