import { describe, it, expect } from "vitest";
import { reconstructSubject, whoCanAccess, type AttrEvent } from "./auditlog";
import type { Requirement } from "./abac";

// Resource sensitivity: DATA/RESTRICTED, SECRET, needs BLACKWING, owner A (Dana's home entity).
const REQ: Requirement = {
  minClearance: "SECRET",
  requiredCompartments: ["BLACKWING"],
  ownerEntity: "ENTITY_A",
  domain: "DATA",
  requiredTier: "RESTRICTED",
};

// Dana (subj-1) starts SECRET, DATA:RESTRICTED, [AURORA] — lacks BLACKWING.
const events: AttrEvent[] = [
  {
    seq: 1,
    subjectId: "subj-1",
    op: "GRANT_COMPARTMENT",
    value: "BLACKWING",
    actor: "Access Approver",
  },
  { seq: 2, subjectId: "subj-1", op: "SET_HOLD", actor: "Security Officer" },
  { seq: 3, subjectId: "subj-1", op: "CLEAR_HOLD", actor: "Security Officer" },
];

const danaCanAccess = (asOf: number) =>
  whoCanAccess(REQ, events, asOf).some((r) => r.subjectId === "subj-1");

describe('audit reconstruction: replay the log to answer "who can access, as of T"', () => {
  it("before any grant (T=0): Dana cannot access (missing BLACKWING)", () => {
    expect(danaCanAccess(0)).toBe(false);
  });

  it("after the grant (T=1): Dana can access", () => {
    expect(danaCanAccess(1)).toBe(true);
  });

  it("after a security hold (T=2): Dana cannot access (deny override)", () => {
    expect(danaCanAccess(2)).toBe(false);
  });

  it("after the hold is cleared (T=3): Dana can access again", () => {
    expect(danaCanAccess(3)).toBe(true);
  });

  it("reconstructs the exact attribute state at a point in time", () => {
    const atT1 = reconstructSubject("subj-1", events, 1)!;
    expect(atT1.compartments).toContain("BLACKWING");
    expect(atT1.flags.securityHold).toBe(false);
    const atT2 = reconstructSubject("subj-1", events, 2)!;
    expect(atT2.flags.securityHold).toBe(true);
  });
});
