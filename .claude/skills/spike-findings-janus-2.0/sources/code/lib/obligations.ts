// Spike 009 — context-driven access: support obligations (deployment) + directional shielding.
// New rule classes layered on a standing-access base. Models the 6-unit deployment scenario.

export type UnitId =
  | "MILITARY_1"
  | "MILITARY_2"
  | "INTEL"
  | "INFRA"
  | "INDUSTRY"
  | "HOME_GUARD";

export const UNITS: Record<UnitId, { label: string }> = {
  MILITARY_1: { label: "Military Unit 1" },
  MILITARY_2: { label: "Military Unit 2" },
  INTEL: { label: "Intelligence" },
  INFRA: { label: "Inventory / Infrastructure" },
  INDUSTRY: { label: "Industry" },
  HOME_GUARD: { label: "Home Guard" },
};

export type Deployment = "HOME" | "ABROAD";

export interface Subunit {
  id: string;
  name: string;
  unit: UnitId;
  deployment: Deployment;
}

export interface ContextResource {
  id: string;
  name: string;
  ownerUnit: UnitId;
  shielded: boolean;
  allowlist: UnitId[];
}

export const SUBUNITS: Subunit[] = [
  { id: "su-1", name: "1st Recon Coy", unit: "MILITARY_1", deployment: "HOME" },
  {
    id: "su-2",
    name: "Field Hospital",
    unit: "MILITARY_1",
    deployment: "ABROAD",
  },
  { id: "su-3", name: "2nd Armoured", unit: "MILITARY_2", deployment: "HOME" },
];

// Other units' standing obligation to support a unit's deployed subunits.
export const SUPPORT_OBLIGATIONS: { from: UnitId; to: UnitId }[] = [
  { from: "INFRA", to: "MILITARY_1" },
  { from: "MILITARY_2", to: "MILITARY_1" },
  { from: "INFRA", to: "MILITARY_2" },
];

export const RESOURCES_CTX: ContextResource[] = [
  {
    id: "cr-1",
    name: "INTEL Threat Brief",
    ownerUnit: "INTEL",
    shielded: true,
    allowlist: ["MILITARY_1"],
  },
  {
    id: "cr-2",
    name: "Industry Stock Filing",
    ownerUnit: "INDUSTRY",
    shielded: true,
    allowlist: ["INDUSTRY"],
  },
];

// Simplified standing-access matrix (the "access profile" per unit type).
export function standingAccess(requester: UnitId, owner: UnitId): boolean {
  if (requester === owner) return true;
  switch (requester) {
    case "MILITARY_1":
    case "MILITARY_2":
      return true; // broad access to most
    case "INTEL":
      return true; // reads almost all
    case "INFRA":
      return owner === "INFRA"; // infrastructure only
    case "INDUSTRY":
      return owner === "INDUSTRY"; // own business only
    case "HOME_GUARD":
      return owner === "HOME_GUARD"; // territorial
  }
}

export function hasObligation(requester: UnitId, targetUnit: UnitId): boolean {
  return SUPPORT_OBLIGATIONS.some(
    (o) => o.from === requester && o.to === targetUnit,
  );
}

export interface ContextRule {
  name: string;
  effect: "BASE" | "GRANT" | "DENY";
  active: boolean;
  detail: string;
}

export interface ContextDecision {
  decision: "ALLOW" | "DENY";
  rules: ContextRule[];
}

// Subunit access — the obligation rule can GRANT (turn a DENY into ALLOW) when the subunit is
// deployed abroad and the requester carries a support obligation.
export function evaluateSubunitAccess(
  requester: UnitId,
  target: Subunit,
): ContextDecision {
  const rules: ContextRule[] = [];
  const standing = standingAccess(requester, target.unit);
  rules.push({
    name: "Standing access",
    effect: "BASE",
    active: standing,
    detail: standing
      ? `${requester} has standing access to ${target.unit}`
      : `${requester} has no standing access to ${target.unit}`,
  });

  let decision: ContextDecision["decision"] = standing ? "ALLOW" : "DENY";

  if (decision === "DENY") {
    const abroad = target.deployment === "ABROAD";
    const obliged = hasObligation(requester, target.unit);
    const grant = abroad && obliged;
    rules.push({
      name: "Support obligation",
      effect: "GRANT",
      active: grant,
      detail: grant
        ? `${target.name} deployed ABROAD + ${requester} has a support obligation → access granted`
        : !abroad
          ? `${target.name} is at HOME — obligation does not trigger`
          : `${requester} has no support obligation to ${target.unit}`,
    });
    if (grant) decision = "ALLOW";
  }

  return { decision, rules };
}

// Resource access — directional shielding can DENY (turn an ALLOW into DENY) for shielded
// owner data unless the requester is on the allowlist.
export function evaluateResourceAccess(
  requester: UnitId,
  res: ContextResource,
): ContextDecision {
  const rules: ContextRule[] = [];
  const standing = standingAccess(requester, res.ownerUnit);
  rules.push({
    name: "Standing access",
    effect: "BASE",
    active: standing,
    detail: standing
      ? `${requester} has standing access to ${res.ownerUnit}`
      : `${requester} has no standing access to ${res.ownerUnit}`,
  });

  let decision: ContextDecision["decision"] = standing ? "ALLOW" : "DENY";

  if (decision === "ALLOW" && res.shielded) {
    const allow =
      requester === res.ownerUnit || res.allowlist.includes(requester);
    rules.push({
      name: "Directional shielding",
      effect: "DENY",
      active: !allow,
      detail: allow
        ? `${requester} is allowlisted for shielded ${res.ownerUnit} data`
        : `${res.ownerUnit} data is shielded; ${requester} not on allowlist → denied`,
    });
    if (!allow) decision = "DENY";
  }

  return { decision, rules };
}
