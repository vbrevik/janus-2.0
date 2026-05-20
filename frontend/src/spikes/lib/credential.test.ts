import { describe, it, expect } from "vitest";
import {
  issueCredential,
  verifyCredential,
  ISSUER_KEYS,
  type AttrClaims,
} from "./credential";

const baseClaims: AttrClaims = {
  subject: "officer-1",
  entity: "ENTITY_A",
  clearance: "SECRET",
  compartments: ["AURORA"],
  issuer: "NATIONAL-CLEARANCE-AUTHORITY",
};

describe("attribute trust: verify-before-trust on signed credentials", () => {
  it("accepts a credential signed by a trusted issuer", async () => {
    const cred = await issueCredential(
      baseClaims,
      ISSUER_KEYS["NATIONAL-CLEARANCE-AUTHORITY"],
    );
    const res = await verifyCredential(cred);
    expect(res.valid).toBe(true);
  });

  it("rejects a tampered payload (clearance escalated after signing)", async () => {
    const cred = await issueCredential(
      baseClaims,
      ISSUER_KEYS["NATIONAL-CLEARANCE-AUTHORITY"],
    );
    cred.payload.clearance = "TOP_SECRET"; // forge an escalation, keep old sig
    const res = await verifyCredential(cred);
    expect(res.valid).toBe(false);
    expect(res.reason).toMatch(/signature mismatch/);
  });

  it("rejects an untrusted issuer even if its own signature is internally valid", async () => {
    const rogue = await issueCredential(
      { ...baseClaims, issuer: "ROGUE-ISSUER" },
      ISSUER_KEYS["ROGUE-ISSUER"],
    );
    const res = await verifyCredential(rogue);
    expect(res.valid).toBe(false);
    expect(res.reason).toMatch(/not trusted/);
  });

  it("rejects a credential signed with the wrong key for a trusted issuer", async () => {
    const cred = await issueCredential(baseClaims, "attacker-guessed-key");
    const res = await verifyCredential(cred);
    expect(res.valid).toBe(false);
  });
});
