// zone-browser.tsx — Collapsible zone tree (left) + zone detail panel (right). Per 08-UI-SPEC §Zone Browser Layout.
import { useMemo, useState } from "react";
import {
  getAncestors,
  isDelegateActive,
  isGrantActive,
  unitName,
  type PhysicalAccessGrant,
  type UnitId,
  type ZoneAccessDelegate,
  type ZoneNode,
  type ZoneType,
} from "../lib/model";
import { useWorld } from "../store/world-state";
import { Card, Field, Pill } from "./ui";

const ZONE_TYPE_TONE: Record<ZoneType, "slate" | "amber" | "red"> = {
  CONTROLLED: "slate",
  RESTRICTED: "amber",
  SECURED: "red",
};

// --- module scope ---

interface ZoneTreeNodeProps {
  zone: ZoneNode;
  depth: number;
  allZones: ZoneNode[];
  expandedIds: Set<string>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
}

function ZoneTreeNode({
  zone,
  depth,
  allZones,
  expandedIds,
  selectedId,
  onSelect,
  onToggle,
}: ZoneTreeNodeProps) {
  const children = allZones.filter((z) => z.parent_id === zone.id);
  const isExpanded = expandedIds.has(zone.id);
  const isSelected = selectedId === zone.id;

  return (
    <div style={{ marginLeft: depth * 16 }}>
      <button
        className={`flex w-full items-center gap-2 rounded px-2 py-1 text-left text-sm ${isSelected ? "bg-slate-200" : "hover:bg-slate-100"}`}
        onClick={() => onSelect(zone.id)}
      >
        {children.length > 0 ? (
          <span
            className="w-4 text-xs text-slate-400"
            onClick={(e) => {
              e.stopPropagation();
              onToggle(zone.id);
            }}
          >
            {isExpanded ? "▼" : "▶"}
          </span>
        ) : (
          <span className="w-4" />
        )}
        <Pill tone={ZONE_TYPE_TONE[zone.zone_type]}>{zone.zone_type}</Pill>
        <span
          className={`text-sm${isSelected ? " font-semibold text-slate-900" : ""}`}
        >
          {zone.name}
        </span>
      </button>
      {isExpanded &&
        children.map((child) => (
          <ZoneTreeNode
            key={child.id}
            zone={child}
            depth={depth + 1}
            allZones={allZones}
            expandedIds={expandedIds}
            selectedId={selectedId}
            onSelect={onSelect}
            onToggle={onToggle}
          />
        ))}
    </div>
  );
}

interface ZoneDetailPanelProps {
  zone: ZoneNode;
  allZones: ZoneNode[];
  allGrants: PhysicalAccessGrant[];
  allDelegates: ZoneAccessDelegate[];
  disabledGrantIds: Set<string>;
  subjects: { id: string; name: string }[];
  now: Date;
}

function ZoneDetailPanel({
  zone,
  allZones,
  allGrants,
  allDelegates,
  disabledGrantIds,
  subjects,
  now,
}: ZoneDetailPanelProps) {
  const ancestors = getAncestors(zone.id, allZones);
  const activeGrants: PhysicalAccessGrant[] = allGrants.filter(
    (g) =>
      g.zone_id === zone.id &&
      isGrantActive(g, now) &&
      !disabledGrantIds.has(g.id),
  );
  const activeDelegates: ZoneAccessDelegate[] = allDelegates.filter(
    (d) => d.zone_id === zone.id && isDelegateActive(d, now),
  );
  const personName = (id: string) =>
    subjects.find((s) => s.id === id)?.name ?? id;

  return (
    <div className="space-y-3">
      <Field label="Level">
        <span className="mt-1 block text-sm">{zone.level}</span>
      </Field>
      <Field label="Zone Type">
        <div className="mt-1">
          <Pill tone={ZONE_TYPE_TONE[zone.zone_type]}>{zone.zone_type}</Pill>
        </div>
      </Field>
      <Field label="Requires Explicit Grant">
        <span className="mt-1 block text-sm">
          {zone.requires_explicit_auth ? "Yes" : "No"}
        </span>
      </Field>
      <Field label="Admin Org">
        <span className="mt-1 block text-sm">
          {unitName(zone.admin_org_id as UnitId)}
        </span>
      </Field>
      <Field label="Asset Owner">
        <span className="mt-1 block text-sm">
          {unitName(zone.asset_owner_org_id as UnitId)}
        </span>
      </Field>
      {ancestors.length > 0 && (
        <Field label="Path">
          <span className="mt-1 block text-sm">
            {ancestors
              .map((a) => a.name)
              .reduce<React.ReactNode[]>((acc, name, i) => {
                if (i > 0)
                  acc.push(
                    <span key={`sep-${i}`} className="text-slate-400">
                      {" › "}
                    </span>,
                  );
                acc.push(<span key={name}>{name}</span>);
                return acc;
              }, [])}
          </span>
        </Field>
      )}
      <Card title="Active grants">
        {activeGrants.length > 0 ? (
          <ul className="space-y-1">
            {activeGrants.map((g) => (
              <li key={g.id} className="text-sm">
                {personName(g.person_id)}{" "}
                <span className="text-slate-400">(active)</span>
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
    </div>
  );
}

export function ZoneBrowser() {
  const world = useWorld();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const now = useMemo(() => new Date(), []);

  const roots = world.zones.filter((z) => z.parent_id === null);
  const selected = selectedId
    ? (world.zones.find((z) => z.id === selectedId) ?? null)
    : null;

  const handleToggle = (id: string) => {
    const next = new Set(expandedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedIds(next);
  };

  return (
    <div className="grid grid-cols-3 gap-4">
      <Card title="Zone Hierarchy">
        {roots.map((zone) => (
          <ZoneTreeNode
            key={zone.id}
            zone={zone}
            depth={0}
            allZones={world.zones}
            expandedIds={expandedIds}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onToggle={handleToggle}
          />
        ))}
      </Card>
      <div className="col-span-2">
        <Card title="Zone Detail">
          {selected ? (
            <ZoneDetailPanel
              zone={selected}
              allZones={world.zones}
              allGrants={world.grants}
              allDelegates={world.delegates}
              disabledGrantIds={world.disabledGrantIds}
              subjects={world.subjects}
              now={now}
            />
          ) : (
            <p className="text-sm text-slate-400">
              Select a zone to see details.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
