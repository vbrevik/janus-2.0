import { describe, it, expect } from "vitest";
import { Network } from "./contract";
import { SUBJECTS } from "./data";
import { principalFromSubject } from "./abac";

const sam = SUBJECTS.find((s) => s.id === "subj-2")!; // held by B (PHYSICAL) and A (DATA)

describe("interchange contract: entities exchange only via typed envelopes", () => {
  it("discovery returns published pointers and records the message sequence", () => {
    const net = new Network();
    net.publishAll();
    const pointers = net.discover("ENTITY_A", "subj-2");
    expect(pointers.map((p) => p.holder).sort()).toEqual([
      "ENTITY_A",
      "ENTITY_B",
    ]);
    const kinds = net.transcript.map((e) => e.kind);
    expect(kinds).toContain("DISCOVER");
    expect(kinds).toContain("DISCOVER_RESULT");
  });

  it("grants detail through the contract when the requester satisfies the holder policy", () => {
    const net = new Network();
    net.publishAll();
    const requester = {
      entity: "ENTITY_A" as const,
      clearance: "TOP_SECRET" as const,
      domainAuth: {},
      compartments: ["AURORA" as const, "BLACKWING" as const],
    };
    const res = net.requestDetail("ENTITY_A", "ENTITY_B", "subj-2", requester);
    expect(res.granted).toBe(true);
    expect(res.record?.id).toBe("subj-2");
    expect(net.transcript.at(-1)?.kind).toBe("DETAIL_RESPONSE");
  });

  it("withholds detail through the contract when the requester is under-cleared", () => {
    const net = new Network();
    net.publishAll();
    const weak = principalFromSubject(sam);
    weak.clearance = "SECRET";
    weak.compartments = ["AURORA"];
    weak.entity = "ENTITY_A";
    const res = net.requestDetail("ENTITY_A", "ENTITY_B", "subj-2", weak);
    expect(res.granted).toBe(false);
    expect(res.record).toBeNull();
    expect(res.decision?.decision).toBe("DENY");
  });

  it("returns not-found (granted=false) when the holder does not hold the subject", () => {
    const net = new Network();
    net.publishAll();
    const requester = {
      entity: "ENTITY_A" as const,
      clearance: "TOP_SECRET" as const,
      domainAuth: {},
      compartments: [],
    };
    const res = net.requestDetail("ENTITY_A", "ENTITY_C", "subj-2", requester); // C holds no subj-2
    expect(res.granted).toBe(false);
    expect(res.decision).toBeNull();
  });
});
