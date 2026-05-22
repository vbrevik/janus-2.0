// demo/lib/obligations.ts — context-driven access rules for the Authorization Hub demo.
// Lifted from spikes/lib/obligations.ts (D-01/D3-12) with adaptations:
//   - EntityId → UnitId (D-10)
//   - SUBUNITS / SUPPORT_OBLIGATIONS NOT exported here — they live in seed.ts (D3-06)
//   - Functions accept obligations/subunit as parameters (D3-13 injectable pattern)

import type { UnitId, Subunit, Resource } from "./model";
import type { Decision } from "./abac";

/** Deployment-driven support-obligation access grant.
 * ALLOW only when the subunit is ABROAD and the requester has a support obligation
 * toward the subunit's parent unit. No stored grant is created — access is fully
 * attribute-computed at evaluation time.
 */
export function evaluateSubunitAccess(
  requester: UnitId,
  subunit: Subunit,
  obligations: { from: UnitId; to: UnitId }[],
): Decision {
  const isAbroad = subunit.deployment === "ABROAD";
  const hasObligation = obligations.some(
    (o) => o.from === requester && o.to === subunit.unit,
  );
  const pass = isAbroad && hasObligation;

  const rules = [
    {
      name: "Deployment (ABROAD)",
      pass: isAbroad,
      detail: isAbroad ? "subunit is deployed ABROAD" : "subunit is at HOME",
    },
    {
      name: "Support obligation",
      pass: hasObligation,
      detail: hasObligation
        ? `${requester} has obligation toward ${subunit.unit}`
        : `${requester} has no obligation toward ${subunit.unit}`,
    },
  ];

  return {
    decision: pass ? "ALLOW" : "DENY",
    rules,
    overrides: [],
    failed: rules.filter((r) => !r.pass).map((r) => r.name),
  };
}

/** Directional shielding gate.
 * Non-shielded resources: always ALLOW.
 * Shielded resources: ALLOW only for ownerUnit or explicitly allowlisted units.
 */
export function evaluateResourceAccess(
  requester: UnitId,
  resource: Resource,
): Decision {
  if (!resource.shielded) {
    return {
      decision: "ALLOW",
      rules: [
        {
          name: "Directional shielding",
          pass: true,
          detail: "resource is not shielded",
        },
      ],
      overrides: [],
      failed: [],
    };
  }

  const isOwner = requester === resource.ownerUnit;
  const isAllowlisted = (resource.allowlist ?? []).includes(requester);
  const pass = isOwner || isAllowlisted;

  const rules = [
    {
      name: "Directional shielding",
      pass,
      detail: isOwner
        ? `${requester} is the ownerUnit`
        : isAllowlisted
          ? `${requester} is on the allowlist`
          : `${requester} is not ownerUnit (${resource.ownerUnit}) and not allowlisted`,
    },
  ];

  return {
    decision: pass ? "ALLOW" : "DENY",
    rules,
    overrides: [],
    failed: rules.filter((r) => !r.pass).map((r) => r.name),
  };
}
