import { describe, it, expect } from "vitest";
import { evaluateWithPolicy, POLICIES } from "./policy";
import { SUBJECTS, RESOURCES } from "./data";
import { principalFromSubject, requirementFromResource } from "./abac";

const dana = principalFromSubject(SUBJECTS.find((s) => s.id === "subj-1")!); // SECRET, DATA:RESTRICTED, [AURORA], A
const fileShare = requirementFromResource(
  RESOURCES.find((r) => r.id === "res-1")!,
); // DATA/RESTRICTED, SECRET, [AURORA], A

describe("per-entity policy: same request, divergent decisions by holder policy", () => {
  it("ENTITY_A standard policy → ALLOW (all rules pass)", () => {
    expect(
      evaluateWithPolicy(dana, fileShare, POLICIES.ENTITY_A).decision,
    ).toBe("ALLOW");
  });

  it("ENTITY_B strict policy (TOP_SECRET floor) → DENY for a SECRET subject", () => {
    const d = evaluateWithPolicy(dana, fileShare, POLICIES.ENTITY_B);
    expect(d.decision).toBe("DENY");
    expect(d.failed).toContain("Clearance floor");
  });

  it("ENTITY_C relaxed policy ignores need-to-know + affiliation", () => {
    // A requester with NO compartments and a foreign entity would fail A/B on NTK/affiliation,
    // but C does not enforce those rules.
    const foreigner = {
      entity: "ENTITY_B" as const,
      clearance: "SECRET" as const,
      domainAuth: { DATA: "RESTRICTED" },
      compartments: [],
    };
    expect(
      evaluateWithPolicy(foreigner, fileShare, POLICIES.ENTITY_A).decision,
    ).toBe("DENY"); // missing AURORA
    expect(
      evaluateWithPolicy(foreigner, fileShare, POLICIES.ENTITY_C).decision,
    ).toBe("ALLOW"); // NTK + affiliation skipped
  });
});
