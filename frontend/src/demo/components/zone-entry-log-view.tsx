// zone-entry-log-view.tsx — Zone entry log with zone/person filters and visitor pass badges on ESCORT rows. Per 08-UI-SPEC §Zone Entry Log Layout.
import { useMemo, useState } from "react";
import { getActiveVisitorPasses } from "../lib/model";
import { useWorld } from "../store/world-state";
import { Card, Field, Pill, Select } from "./ui";

export function ZoneEntryLogView() {
  const world = useWorld();

  // Stable now — once per mount, no drift during filter interactions
  const now = useMemo(() => new Date(), []);

  // Helper lookups
  const zoneName = (id: string) =>
    world.zones.find((z) => z.id === id)?.name ?? id;
  const personName = (id: string) =>
    world.subjects.find((s) => s.id === id)?.name ?? id;

  // Local filter state
  const [zoneFilter, setZoneFilter] = useState<string>("all");
  const [personFilter, setPersonFilter] = useState<string>("all");

  // Filtered + sorted entries (descending entry_at)
  const filtered = useMemo(
    () =>
      world.entryLogs
        .filter(
          (e) =>
            (zoneFilter === "all" || e.zone_id === zoneFilter) &&
            (personFilter === "all" || e.person_id === personFilter),
        )
        .sort((a, b) => b.entry_at.getTime() - a.entry_at.getTime()),
    [world.entryLogs, zoneFilter, personFilter],
  );

  return (
    <div className="space-y-4">
      {/* Filters row */}
      <div className="flex gap-4 items-end">
        <Field label="Zone">
          <Select
            value={zoneFilter}
            onChange={setZoneFilter}
            options={[
              { value: "all", label: "All zones" },
              ...world.zones.map((z) => ({ value: z.id, label: z.name })),
            ]}
          />
        </Field>
        <Field label="Person">
          <Select
            value={personFilter}
            onChange={setPersonFilter}
            options={[
              { value: "all", label: "All persons" },
              ...world.subjects.map((s) => ({ value: s.id, label: s.name })),
            ]}
          />
        </Field>
      </div>

      {/* Entry list */}
      <Card title="Entry Log">
        {filtered.length === 0 ? (
          <p className="text-sm text-slate-400">
            No entry log records match the current filters.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {filtered.map((entry) => {
              // Visitor pass badge for ESCORT rows
              const activePasses =
                entry.method === "ESCORT"
                  ? getActiveVisitorPasses(
                      entry.zone_id,
                      world.visitorPasses,
                      now,
                    ).filter((p) => p.entry_log_id === entry.id)
                  : [];
              const hasActive = activePasses.length > 0;

              return (
                <li
                  key={entry.id}
                  className="py-3 flex items-start gap-3 text-sm"
                >
                  {/* Timestamp */}
                  <span className="text-slate-400 font-mono text-xs w-36 shrink-0">
                    {entry.entry_at
                      .toISOString()
                      .slice(0, 16)
                      .replace("T", " ")}
                  </span>

                  {/* Method badge: CARD → slate, ESCORT → blue */}
                  <Pill tone={entry.method === "CARD" ? "slate" : "blue"}>
                    {entry.method}
                  </Pill>

                  {/* Person */}
                  <span>{personName(entry.person_id)}</span>

                  {/* Arrow */}
                  <span className="text-slate-400">→</span>

                  {/* Zone */}
                  <span>{zoneName(entry.zone_id)}</span>

                  {/* Exit time */}
                  <span className="text-slate-400 text-xs">
                    exit:{" "}
                    {entry.exit_at
                      ? entry.exit_at
                          .toISOString()
                          .slice(0, 16)
                          .replace("T", " ")
                      : "–"}
                  </span>

                  {/* Visitor pass badge (ESCORT rows only) */}
                  {entry.method === "ESCORT" && (
                    <Pill tone={hasActive ? "green" : "slate"}>
                      {hasActive ? "Active pass" : "Expired"}
                    </Pill>
                  )}

                  {/* Escort person note */}
                  {entry.method === "ESCORT" && entry.escort_person_id && (
                    <span className="text-xs text-slate-500">
                      escorted by {personName(entry.escort_person_id)}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
