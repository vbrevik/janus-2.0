// Spike 008 — per-entity policy authorship. Each entity enables/disables rules and can set a
// stricter clearance floor. Same request can resolve differently depending on the holder's policy.
import { CLEARANCE_RANK, TIERS, type Clearance, type EntityId } from "./data";
import {
  hasAgreement,
  type Decision,
  type Principal,
  type Requirement,
  type Rule,
} from "./abac";

export interface EntityPolicy {
  id: EntityId;
  label: string;
  rules: {
    clearance: boolean;
    domainTier: boolean;
    needToKnow: boolean;
    affiliation: boolean;
  };
  minClearanceFloor?: Clearance;
}

// Three entities, three deliberately different release policies.
export const POLICIES: Record<EntityId, EntityPolicy> = {
  ENTITY_A: {
    id: "ENTITY_A",
    label: "Standard (all rules)",
    rules: {
      clearance: true,
      domainTier: true,
      needToKnow: true,
      affiliation: true,
    },
  },
  ENTITY_B: {
    id: "ENTITY_B",
    label: "Strict (floor TOP_SECRET)",
    rules: {
      clearance: true,
      domainTier: true,
      needToKnow: true,
      affiliation: true,
    },
    minClearanceFloor: "TOP_SECRET",
  },
  ENTITY_C: {
    id: "ENTITY_C",
    label: "Relaxed lab (no NTK / no affiliation)",
    rules: {
      clearance: true,
      domainTier: true,
      needToKnow: false,
      affiliation: false,
    },
  },
};

const rank = (c: Clearance): number => CLEARANCE_RANK[c] ?? -1;
const tierRank = (
  domain: NonNullable<Requirement["domain"]>,
  tier: string,
): number => TIERS[domain].indexOf(tier);

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
    const ok = hasAgreement(principal.entity, req.ownerEntity);
    rules.push({
      name: "Affiliation",
      pass: ok,
      detail: ok
        ? "agreement present"
        : `no agreement ${principal.entity}↔${req.ownerEntity}`,
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
