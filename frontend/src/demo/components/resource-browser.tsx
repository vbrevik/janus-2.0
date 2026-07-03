// resource-browser.tsx — Collapsible Network→Platform→Application tree (left)
// + resource detail panel (right). Per 12-UI-SPEC §Resource Browser Layout /
// §Resource Detail Panel. Rendered by 12-06's DigitalResourcesPanel only in the
// loader "success" state — assumes world.digitalResources always has data.
import { useMemo, useState } from "react";
import {
  effectiveClassification,
  isWindowActive,
  selectActivePolicy,
  unitName,
  type ApplicationNode,
  type NetworkNode,
  type PlatformNode,
  type UnitId,
} from "../lib/model";
import {
  activeGrantsForResource,
  buildResourceTree,
  type ResourceTreeNode,
} from "../lib/digital-resource-selectors";
import { useWorld } from "../store/world-state";
import { CLEARANCE_TONE } from "./access-resolution-explorer";
import { Card, Field, Pill } from "./ui";

// Module-local tone map, mirroring the per-file pattern (ZONE_TYPE_TONE etc.).
const TIER_TONE: Record<
  "NETWORK" | "PLATFORM" | "APPLICATION",
  "slate" | "blue" | "green"
> = {
  NETWORK: "slate",
  PLATFORM: "blue",
  APPLICATION: "green",
};

type ResourceNode = NetworkNode | PlatformNode | ApplicationNode;

// --- Tree ---

interface ResourceTreeNodeRowProps {
  node: ResourceTreeNode;
  depth: number;
  expandedIds: Set<string>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
}

function ResourceTreeNodeRow({
  node,
  depth,
  expandedIds,
  selectedId,
  onSelect,
  onToggle,
}: ResourceTreeNodeRowProps) {
  const isExpanded = expandedIds.has(node.id);
  const isSelected = selectedId === node.id;

  return (
    <div style={{ marginLeft: depth * 16 }}>
      <button
        className={`flex w-full items-center gap-2 rounded px-2 py-1 text-left text-sm ${isSelected ? "bg-slate-200" : "hover:bg-slate-100"}`}
        onClick={() => onSelect(node.id)}
      >
        {node.children.length > 0 ? (
          <span
            className="w-4 text-xs text-slate-400"
            onClick={(e) => {
              e.stopPropagation();
              onToggle(node.id);
            }}
          >
            {isExpanded ? "▼" : "▶"}
          </span>
        ) : (
          <span className="w-4" />
        )}
        <Pill tone={TIER_TONE[node.tier]}>{node.tier}</Pill>
        <span
          className={`text-sm${isSelected ? " font-semibold text-slate-900" : ""}`}
        >
          {node.name}
        </span>
      </button>
      {isExpanded &&
        node.children.map((child) => (
          <ResourceTreeNodeRow
            key={child.id}
            node={child}
            depth={depth + 1}
            expandedIds={expandedIds}
            selectedId={selectedId}
            onSelect={onSelect}
            onToggle={onToggle}
          />
        ))}
    </div>
  );
}

// --- Detail panel ---

function windowBound(date: Date | null): string {
  return date ? date.toISOString().slice(0, 10) : "open";
}

export function ResourceBrowser() {
  const world = useWorld();
  const now = useMemo(() => new Date(), []);
  const tree = useMemo(
    () => buildResourceTree(world.digitalResources),
    [world.digitalResources],
  );
  // Root Networks start expanded; Platforms/Applications start collapsed
  // (deliberate divergence from zone-browser's empty-Set init, per UI-SPEC).
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    () => new Set(tree.map((n) => n.id)),
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Search-all-three-arrays lookup, same pattern as resolveResourceAt.
  const selected: ResourceNode | null = selectedId
    ? (world.digitalResources.networks.find((n) => n.id === selectedId) ??
      world.digitalResources.platforms.find((p) => p.id === selectedId) ??
      world.digitalResources.applications.find((a) => a.id === selectedId) ??
      null)
    : null;

  const handleToggle = (id: string) => {
    const next = new Set(expandedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedIds(next);
  };

  const classification = selected
    ? selected.tier === "APPLICATION"
      ? effectiveClassification(selected, world.digitalResources.platforms)
      : selected.classification
    : null;
  const orgLinkRoles = selected
    ? Array.from(new Set(selected.org_links.map((l) => l.role)))
    : [];
  const activePolicy = selected
    ? selectActivePolicy(selected.policy_assignments, now)
    : null;
  const activeGrants = selected
    ? activeGrantsForResource(world.digitalResources, selected.id, now)
    : [];
  const activeDelegates = selected
    ? world.digitalResources.delegates.filter(
        (d) =>
          d.resource_id === selected.id &&
          isWindowActive(d.valid_from, d.valid_until, now),
      )
    : [];
  const personName = (id: string) =>
    world.subjects.find((s) => s.id === id)?.name ?? id;
  const securityApprovalLink = selected
    ? (selected.org_links.find((l) => l.role === "SECURITY_APPROVAL") ?? null)
    : null;

  return (
    <div className="grid grid-cols-3 gap-4">
      <Card title="Resource Hierarchy">
        {tree.map((node) => (
          <ResourceTreeNodeRow
            key={node.id}
            node={node}
            depth={0}
            expandedIds={expandedIds}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onToggle={handleToggle}
          />
        ))}
      </Card>
      <div className="col-span-2">
        <Card title="Resource Detail">
          {selected && classification ? (
            <div className="space-y-3">
              <Field label="Tier">
                <div className="mt-1">
                  <Pill tone={TIER_TONE[selected.tier]}>{selected.tier}</Pill>
                </div>
              </Field>
              <Field label="Classification">
                <div className="mt-1">
                  <Pill tone={CLEARANCE_TONE[classification]}>
                    {classification}
                  </Pill>
                  {selected.tier === "APPLICATION" && (
                    <span className="text-slate-400 text-xs"> (inherited)</span>
                  )}
                </div>
              </Field>
              <Card title="Org links">
                {orgLinkRoles.length > 0 ? (
                  <div className="space-y-2">
                    {orgLinkRoles.map((role) => (
                      <div key={role}>
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          {role}
                        </div>
                        <ul className="space-y-1">
                          {selected.org_links
                            .filter((l) => l.role === role)
                            .map((link, i) => (
                              <li
                                key={`${link.org_id}-${i}`}
                                className="text-sm"
                              >
                                {unitName(link.org_id as UnitId)}{" "}
                                {isWindowActive(
                                  link.valid_from,
                                  link.valid_until,
                                  now,
                                ) ? (
                                  <Pill tone="green">active</Pill>
                                ) : (
                                  <Pill tone="slate">expired</Pill>
                                )}
                              </li>
                            ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">No org links.</p>
                )}
              </Card>
              <Card title="Active policy">
                {activePolicy ? (
                  <p className="text-sm">
                    {activePolicy.policy.label}{" "}
                    <span className="text-slate-400">
                      {windowBound(activePolicy.valid_from)} –{" "}
                      {windowBound(activePolicy.valid_until)}
                    </span>
                  </p>
                ) : (
                  <p className="text-sm text-slate-400">
                    No active policy at this time.
                  </p>
                )}
              </Card>
              <Card title="Active grants">
                {activeGrants.length > 0 ? (
                  <ul className="space-y-1">
                    {activeGrants.map((g) => (
                      <li key={g.id} className="text-sm">
                        {personName(g.person_id)}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-400">No active grants.</p>
                )}
              </Card>
              <Card title="Delegates">
                {activeDelegates.length > 0 ? (
                  <ul className="space-y-1">
                    {activeDelegates.map((d) => (
                      <li key={d.id} className="text-sm">
                        {d.delegate_type === "PERSON"
                          ? personName(d.delegate_person_id ?? "")
                          : unitName(d.delegate_org_id as UnitId)}
                        <span className="ml-1 text-slate-400">
                          ({d.delegate_type})
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-400">No delegates.</p>
                )}
              </Card>
              {selected.tier === "PLATFORM" && (
                <Card title="NSM annotations">
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      <Pill tone="slate">
                        sikkerhetsgodkjenning (approval-to-operate)
                      </Pill>
                      <Pill tone="slate">
                        forsvarlig sikkerhetsnivå (adequate security level)
                      </Pill>
                    </div>
                    <p className="text-xs text-slate-400">
                      Static annotations — not enforced as access gates in v2.2.
                    </p>
                    {securityApprovalLink && (
                      <p className="text-sm">
                        Authorizing authority:{" "}
                        {unitName(securityApprovalLink.org_id as UnitId)}
                      </p>
                    )}
                  </div>
                </Card>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-400">
              Select a resource to see details.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
