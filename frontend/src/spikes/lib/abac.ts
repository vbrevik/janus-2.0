// Janus spike — pure-computed ABAC evaluator.
// Conjunctive base rules + explicit deny overrides (A4). No stored grants — computed live.

import {
  CLEARANCE_RANK,
  TIERS,
  AGREEMENTS,
  type Subject,
  type Resource,
  type EntityId,
  type Domain,
  type Clearance,
  type Compartment,
  type SubjectFlags,
} from "./data";

export interface Rule {
  name: string;
  pass: boolean;
  detail: string;
}

export interface Decision {
  decision: "ALLOW" | "DENY";
  rules: Rule[]; // base conjunctive rules
  overrides: Rule[]; // active deny overrides (pass=false means an override fired)
  failed: string[]; // names of base rules that failed
}

export interface Principal {
  entity: EntityId;
  clearance: Clearance;
  domainAuth: Partial<Record<Domain, string>>;
  compartments: Compartment[];
  flags?: Partial<SubjectFlags>;
}

export interface Requirement {
  minClearance: Clearance;
  requiredCompartments: Compartment[];
  ownerEntity: EntityId;
  domain?: Domain; // domain+tier rule only applies when present
  requiredTier?: string;
}

const rank = (c: Clearance): number => CLEARANCE_RANK[c] ?? -1;
const tierRank = (domain: Domain, tier: string): number =>
  TIERS[domain].indexOf(tier);

export function hasAgreement(a: EntityId, b: EntityId): boolean {
  if (a === b) return true;
  return AGREEMENTS.some(
    ([x, y]) => (x === a && y === b) || (x === b && y === a),
  );
}

export function evaluate(principal: Principal, req: Requirement): Decision {
  const rules: Rule[] = [];

  const okClear = rank(principal.clearance) >= rank(req.minClearance);
  rules.push({
    name: "Clearance",
    pass: okClear,
    detail: `${principal.clearance} (${rank(principal.clearance)}) ${okClear ? "≥" : "<"} required ${req.minClearance} (${rank(req.minClearance)})`,
  });

  if (req.domain && req.requiredTier) {
    const held = principal.domainAuth[req.domain];
    const okTier =
      held != null &&
      tierRank(req.domain, held) >= tierRank(req.domain, req.requiredTier);
    rules.push({
      name: "Domain tier",
      pass: okTier,
      detail:
        held == null
          ? `no ${req.domain} authorization (requires ${req.requiredTier})`
          : `${req.domain}:${held} ${okTier ? "≥" : "<"} required ${req.requiredTier}`,
    });
  }

  const required = req.requiredCompartments ?? [];
  const holdComp = principal.compartments ?? [];
  const missing = required.filter((c) => !holdComp.includes(c));
  rules.push({
    name: "Need-to-know",
    pass: missing.length === 0,
    detail:
      missing.length === 0
        ? `holds all required [${required.join(", ") || "none"}]`
        : `missing [${missing.join(", ")}]`,
  });

  const okAff = hasAgreement(principal.entity, req.ownerEntity);
  rules.push({
    name: "Affiliation",
    pass: okAff,
    detail: okAff
      ? principal.entity === req.ownerEntity
        ? `same entity (${req.ownerEntity})`
        : `cross-entity agreement ${principal.entity}↔${req.ownerEntity}`
      : `no agreement between ${principal.entity} and ${req.ownerEntity}`,
  });

  // Deny overrides — fire regardless of base rules and force DENY.
  const overrides: Rule[] = [];
  if (principal.flags?.revoked) {
    overrides.push({
      name: "Revoked",
      pass: false,
      detail: "subject access has been revoked",
    });
  }
  if (principal.flags?.securityHold) {
    overrides.push({
      name: "Security hold",
      pass: false,
      detail: "flagged by Security Officer",
    });
  }

  const basePass = rules.every((r) => r.pass);
  const overridden = overrides.length > 0;
  const decision: Decision["decision"] =
    basePass && !overridden ? "ALLOW" : "DENY";

  return {
    decision,
    rules,
    overrides,
    failed: rules.filter((r) => !r.pass).map((r) => r.name),
  };
}

export function principalFromSubject(s: Subject): Principal {
  return {
    entity: s.homeEntity,
    clearance: s.clearance,
    domainAuth: s.domainAuth,
    compartments: s.compartments,
    flags: s.flags,
  };
}

export function requirementFromResource(r: Resource): Requirement {
  return {
    minClearance: r.minClearance,
    requiredCompartments: r.requiredCompartments,
    ownerEntity: r.ownerEntity,
    domain: r.domain,
    requiredTier: r.requiredTier,
  };
}

// Handshake (003): another entity requests B's record on subject X.
// Release sensitivity = X's own clearance + compartments; gated by agreement with the holder.
export function releaseRequirementFor(
  subject: Subject,
  holder: EntityId,
): Requirement {
  return {
    minClearance: subject.clearance,
    requiredCompartments: subject.compartments,
    ownerEntity: holder,
  };
}
