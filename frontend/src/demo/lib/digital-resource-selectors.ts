// demo/lib/digital-resource-selectors.ts — Pure read selectors over DigitalResourceWorld.
// All functions take explicit `now: Date`; none call Date.now()/new Date() internally.
// Phase 11 wraps these with thin useWorld()-based hooks (not built here).

import {
  resolveResourceAccess,
  isWindowActive,
  effectiveClassification,
  type NetworkNode,
  type PlatformNode,
  type ApplicationNode,
  type ResourceAccessGrant,
  type ResourceAccessResult,
  type ZoneNode,
  type PhysicalAccessGrant,
  type Clearance,
} from "./model";
import type { DigitalResourceWorld } from "./model";

// --- Return types ---

// A leaf node in the resource tree.
export interface ResourceTreeNode {
  id: string;
  name: string;
  tier: "NETWORK" | "PLATFORM" | "APPLICATION";
  classification: Clearance;
  children: ResourceTreeNode[];
}

// --- Selector 1: buildResourceTree ---
// Builds the Network → Platform → Application hierarchy from flat arrays.
// Each node carries its effective classification (Applications derive from Platform).
export function buildResourceTree(
  world: DigitalResourceWorld,
): ResourceTreeNode[] {
  const networkMap = new Map<string, ResourceTreeNode>();
  for (const net of world.networks) {
    networkMap.set(net.id, {
      id: net.id,
      name: net.name,
      tier: "NETWORK",
      classification: net.classification,
      children: [],
    });
  }
  for (const plat of world.platforms) {
    const parent = networkMap.get(plat.network_id);
    if (!parent) continue; // orphan platform — skip
    const node: ResourceTreeNode = {
      id: plat.id,
      name: plat.name,
      tier: "PLATFORM",
      classification: plat.classification,
      children: [],
    };
    parent.children.push(node);
  }
  for (const app of world.applications) {
    // Find parent platform across all networks
    let parentPlatform: ResourceTreeNode | undefined;
    for (const net of world.networks) {
      const treeNet = networkMap.get(net.id);
      if (!treeNet) continue;
      for (const child of treeNet.children) {
        if (child.id === app.platform_id) {
          parentPlatform = child;
          break;
        }
      }
      if (parentPlatform) break;
    }
    if (!parentPlatform) continue; // orphan application — skip
    const node: ResourceTreeNode = {
      id: app.id,
      name: app.name,
      tier: "APPLICATION",
      classification: effectiveClassification(app, world.platforms),
      children: [],
    };
    parentPlatform.children.push(node);
  }
  return Array.from(networkMap.values());
}

// --- Selector 2: activeGrantsForResource ---
// Returns grants for a resource that are active at `now` AND NOT in disabledResourceGrantIds.
// D-06: disabled grants are excluded from resolution.
export function activeGrantsForResource(
  world: DigitalResourceWorld,
  resourceId: string,
  now: Date,
): ResourceAccessGrant[] {
  const disabled = world.disabledResourceGrantIds;
  return world.grants.filter(
    (g) =>
      g.resource_id === resourceId &&
      !disabled.has(g.id) &&
      isWindowActive(g.valid_from, g.valid_until, now),
  );
}

// --- Selector 3: resolveResourceAt ---
// Thin wrapper over resolveResourceAccess that takes an explicit timestamp
// and filters out disabled grants BEFORE resolving (D-06).
export function resolveResourceAt(
  world: DigitalResourceWorld,
  subject: string,
  subjectClearance: Clearance,
  subjectOrgId: string,
  resourceId: string,
  now: Date,
): ResourceAccessResult {
  // Filter disabled grants before resolution (D-06 contract).
  const filteredGrants = world.grants.filter(
    (g) => !world.disabledResourceGrantIds.has(g.id),
  );
  // Find the resource by ID (any tier).
  const resource =
    world.networks.find((n) => n.id === resourceId) ??
    world.platforms.find((p) => p.id === resourceId) ??
    world.applications.find((a) => a.id === resourceId);
  if (!resource) {
    return {
      allow: false,
      gates: [],
      zoneAdvisory: null,
      policyVersion: null,
      reason: "RESOURCE_NOT_FOUND",
    };
  }
  return resolveResourceAccess(
    subject,
    subjectClearance,
    subjectOrgId,
    resource,
    world.networks,
    world.platforms,
    filteredGrants,
    [], // no v2.1 zones passed in — advisory resolves via policy.zone_prereq_id
    [], // no physical grants
    now,
  );
}
