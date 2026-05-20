import { describe, it, expect } from "vitest";
import {
  evaluateSubunitAccess,
  evaluateResourceAccess,
  SUBUNITS,
  RESOURCES_CTX,
  type Subunit,
} from "./obligations";

const su = (id: string): Subunit => SUBUNITS.find((s) => s.id === id)!;
const res = (id: string) => RESOURCES_CTX.find((r) => r.id === id)!;

describe("context access: support obligations (deployment-driven grants)", () => {
  it("DENY when a subunit is at HOME and the requester has no standing access", () => {
    const home: Subunit = { ...su("su-1"), deployment: "HOME" }; // MILITARY_1 subunit
    expect(evaluateSubunitAccess("INFRA", home).decision).toBe("DENY");
  });

  it("GRANTs when the same subunit deploys ABROAD and requester has a support obligation", () => {
    const abroad: Subunit = { ...su("su-1"), deployment: "ABROAD" };
    const d = evaluateSubunitAccess("INFRA", abroad); // INFRA → MILITARY_1 obligation exists
    expect(d.decision).toBe("ALLOW");
    expect(d.rules.find((r) => r.name === "Support obligation")?.active).toBe(
      true,
    );
  });

  it("still DENY abroad when the requester has NO support obligation", () => {
    const abroad: Subunit = { ...su("su-1"), deployment: "ABROAD" };
    expect(evaluateSubunitAccess("INDUSTRY", abroad).decision).toBe("DENY"); // no INDUSTRY→MILITARY_1 obligation
  });

  it("access turns OFF again when the subunit returns HOME (context is dynamic)", () => {
    const abroad: Subunit = { ...su("su-1"), deployment: "ABROAD" };
    const home: Subunit = { ...su("su-1"), deployment: "HOME" };
    expect(evaluateSubunitAccess("INFRA", abroad).decision).toBe("ALLOW");
    expect(evaluateSubunitAccess("INFRA", home).decision).toBe("DENY");
  });
});

describe("context access: directional shielding (deny override on shielded data)", () => {
  it("allowlisted requester reaches shielded data", () => {
    expect(evaluateResourceAccess("MILITARY_1", res("cr-1")).decision).toBe(
      "ALLOW",
    ); // MILITARY_1 on allowlist
  });

  it("shields data from a requester with standing access but not on the allowlist", () => {
    const d = evaluateResourceAccess("MILITARY_2", res("cr-1")); // broad standing, NOT allowlisted
    expect(d.decision).toBe("DENY");
    expect(
      d.rules.find((r) => r.name === "Directional shielding")?.active,
    ).toBe(true);
  });

  it("owner always reaches its own shielded data", () => {
    expect(evaluateResourceAccess("INDUSTRY", res("cr-2")).decision).toBe(
      "ALLOW",
    );
  });
});
