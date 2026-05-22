// demo/lib/policy.ts — per-entity policy evaluation for the Authorization Hub demo.
// Lifted from spikes/lib/policy.ts (D-01/D3-12) with adaptations:
//   - EntityId → UnitId (D-10)
//   - EntityPolicy imported from model.ts (D-05 forward type, already defined there)
//   - POLICIES NOT exported here — it lives in seed.ts (D3-06)
//   - evaluateWithPolicy applies rule toggles and optional clearance floor

import { CLEARANCE_RANK, TIERS } from "./model";
import type { EntityPolicy, UnitId } from "./model";
import { hasAgreement } from "./abac";
import type { Decision, Principal, Requirement, Rule } from "./abac";
import type { Clearance } from "./model";

const rank = (c: Clearance): number => CLEARANCE_RANK[c] ?? -1;
const tierRank = (
  domain: NonNullable<Requirement["domain"]>,
  tier: string,
): number => TIERS[domain].indexOf(tier);

// Evaluate a request against a principal using a specific entity's release policy.
// Policy rules are toggleable — needToKnow: false skips NTK; affiliation: false skips affiliation.
// minClearanceFloor adds an entity-level clearance floor rule independent of the resource minimum.
export function evaluateWithPolicy(
  principal: Principal,
  req: Requirement,
  policy: EntityPolicy,
): Decision {
  const rules: Rule[] = [];

  if (policy.rules.clearance) {
    const ok = rank(principal.clearance) >= rank(req.minClearance);
    rules.push({
      name: "Clearance",
      pass: ok,
      detail: `${principal.clearance} ${ok ? "≥" : "<"} ${req.minClearance}`,
    });
  }

  if (policy.minClearanceFloor) {
    const ok = rank(principal.clearance) >= rank(policy.minClearanceFloor);
    rules.push({
      name: "Clearance floor",
      pass: ok,
      detail: `${principal.clearance} ${ok ? "≥" : "<"} entity floor ${policy.minClearanceFloor}`,
    });
  }

  if (policy.rules.domainTier && req.domain && req.requiredTier) {
    const held = principal.domainAuth[req.domain];
    const ok =
      held != null &&
      tierRank(req.domain, held) >= tierRank(req.domain, req.requiredTier);
    rules.push({
      name: "Domain tier",
      pass: ok,
      detail:
        held == null
          ? `no ${req.domain} auth`
          : `${req.domain}:${held} ${ok ? "≥" : "<"} ${req.requiredTier}`,
    });
  }

  if (policy.rules.needToKnow) {
    const missing = (req.requiredCompartments ?? []).filter(
      (c) => !(principal.compartments ?? []).includes(c),
    );
    rules.push({
      name: "Need-to-know",
      pass: missing.length === 0,
      detail:
        missing.length === 0
          ? "all compartments held"
          : `missing [${missing.join(", ")}]`,
    });
  }

  if (policy.rules.affiliation) {
    const ok = hasAgreement(principal.entity as UnitId, req.ownerUnit);
    rules.push({
      name: "Affiliation",
      pass: ok,
      detail: ok
        ? "agreement present"
        : `no agreement ${principal.entity}↔${req.ownerUnit}`,
    });
  }

  const overrides: Rule[] = [];
  if (principal.flags?.revoked)
    overrides.push({ name: "Revoked", pass: false, detail: "access revoked" });
  if (principal.flags?.securityHold)
    overrides.push({
      name: "Security hold",
      pass: false,
      detail: "flagged by Security Officer",
    });

  const decision: Decision["decision"] =
    rules.every((r) => r.pass) && overrides.length === 0 ? "ALLOW" : "DENY";

  return {
    decision,
    rules,
    overrides,
    failed: rules.filter((r) => !r.pass).map((r) => r.name),
  };
}
