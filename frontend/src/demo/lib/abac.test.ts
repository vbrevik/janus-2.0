import { describe, it, expect } from "vitest";
import { SUBJECTS, RESOURCES, type Subject, type Resource } from "./seed";
import {
  evaluate,
  principalFromSubject,
  requirementFromResource,
  releaseRequirementFor,
} from "./abac";

const subj = (id: string): Subject => SUBJECTS.find((s) => s.id === id)!;
const res = (id: string): Resource => RESOURCES.find((r) => r.id === id)!;
const decide = (sId: string, rId: string) =>
  evaluate(principalFromSubject(subj(sId)), requirementFromResource(res(rId)));

describe("pure-computed ABAC: per-domain tiers + deny overrides", () => {
  it("ALLOWs when clearance, domain tier, need-to-know, and affiliation all pass", () => {
    const d = decide("subj-1", "res-1"); // Dana@MILITARY_1 SECRET/DATA:RESTRICTED/[AURORA] -> File Share
    expect(d.decision).toBe("ALLOW");
    expect(d.rules.every((r) => r.pass)).toBe(true);
    expect(d.overrides).toHaveLength(0);
  });

  it("DENYs on the per-domain tier rule even when clearance passes (A7)", () => {
    const d = decide("subj-3", "res-3"); // Lee@INTEL CONFIDENTIAL/COMPUTER:STANDARD -> Dev Jump Host needs PRIVILEGED
    expect(d.decision).toBe("DENY");
    const clearance = d.rules.find((r) => r.name === "Clearance")!;
    const tier = d.rules.find((r) => r.name === "Domain tier")!;
    expect(clearance.pass).toBe(true); // clearance is fine...
    expect(tier.pass).toBe(false); // ...but domain tier is the blocker
  });

  it("DENYs and names the missing compartment", () => {
    const d = decide("subj-4", "res-1"); // Mara has CITADEL, File Share needs AURORA
    const ntk = d.rules.find((r) => r.name === "Need-to-know")!;
    expect(d.decision).toBe("DENY");
    expect(ntk.pass).toBe(false);
    expect(ntk.detail).toContain("AURORA");
  });

  it("DENYs cross-entity access with no sharing agreement", () => {
    const d = decide("subj-1", "res-3"); // Dana@MILITARY_1 -> INTEL-owned host (no agreement pair)
    expect(d.failed).toContain("Affiliation");
  });

  it("ALLOWs cross-entity record release when requester clears and agreement exists", () => {
    const reqParty = principalFromSubject(subj("subj-1")); // subj-1 requests B's record on subj-2
    reqParty.clearance = "TOP_SECRET";
    reqParty.compartments = ["AURORA", "BLACKWING"];
    const d = evaluate(
      reqParty,
      releaseRequirementFor(subj("subj-2"), "MILITARY_2"),
    );
    expect(d.decision).toBe("ALLOW");
  });

  it("lets a deny override flip an otherwise-ALLOW to DENY (A4: Security Officer hold)", () => {
    const principal = principalFromSubject(subj("subj-1"));
    const baseline = evaluate(principal, requirementFromResource(res("res-1")));
    expect(baseline.decision).toBe("ALLOW");

    const held = { ...principal, flags: { securityHold: true } };
    const overridden = evaluate(held, requirementFromResource(res("res-1")));
    expect(overridden.decision).toBe("DENY");
    expect(overridden.overrides.map((o) => o.name)).toContain("Security hold");
    // base rules still pass — only the override caused the DENY
    expect(overridden.rules.every((r) => r.pass)).toBe(true);
  });
});
