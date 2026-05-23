// access-resolution-explorer.tsx — Person/zone/escort selection + live ALLOW/DENY trace + TOGGLE_GRANT checkboxes. Per 08-UI-SPEC §Access Resolution Explorer Layout.
import { useMemo, useState } from "react";
import {
  getAncestors,
  isGrantActive,
  resolveGrant,
  resolveZoneAccess,
  unitName,
  type Clearance,
  type PhysicalAccessGrant,
  type ZoneAccessResult,
  type ZoneNode,
  type ZoneType,
} from "../lib/model";
import { useWorld, useWorldDispatch } from "../store/world-state";
import { Card, Field, MockTag, Pill, Select } from "./ui";

const ZONE_TYPE_TONE: Record<ZoneType, "slate" | "amber" | "red"> = {
  CONTROLLED: "slate",
  RESTRICTED: "amber",
  SECURED: "red",
};

const CLEARANCE_TONE: Record<
  Clearance,
  "slate" | "green" | "red" | "blue" | "amber"
> = {
  UNCLASSIFIED: "slate",
  RESTRICTED: "blue",
  CONFIDENTIAL: "slate",
  SECRET: "amber",
  TOP_SECRET: "red",
};

// Local component — renders ZoneAccessResult as a gate-by-gate trace.
// Kept local: the ui.tsx trace component is typed to the abac.ts Decision type,
// which is incompatible with ZoneAccessResult. This component handles ZoneAccessResult only.
function ZoneResolutionTrace({
  result,
  escortId,
  escortHasGrant,
  selectedZone,
}: {
  result: ZoneAccessResult;
  escortId: string;
  escortHasGrant: boolean;
  selectedZone: ZoneNode | null;
}) {
  const grantFound = result.reason !== "NO_GRANT";
  const insufficientClearance = result.reason === "INSUFFICIENT_CLEARANCE";
  const showEscortRow =
    selectedZone !== null &&
    (selectedZone.zone_type === "RESTRICTED" ||
      selectedZone.zone_type === "SECURED");

  return (
    <div
      className={`rounded-lg border p-4 ${result.allow ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}
    >
      <div className="text-lg font-semibold">
        {result.allow ? "✓ ALLOW" : "✗ DENY"}
      </div>
      <ul className="mt-3 space-y-1.5">
        {/* Row 1 — Grant gate */}
        <li className="flex gap-2 text-sm">
          <span className={grantFound ? "text-green-600" : "text-red-600"}>
            {grantFound ? "✓" : "✗"}
          </span>
          <span className="w-28 shrink-0 font-medium">
            {grantFound ? "Grant found" : "No grant"}
          </span>
          <span className="text-slate-600">
            {result.reason === "NO_GRANT"
              ? "No active grant for this zone or matching ancestor."
              : "Grant resolved via zone ancestry."}
          </span>
        </li>

        {/* Row 2 — Zone type rule */}
        <li className="flex gap-2 text-sm">
          <span
            className={
              result.allow || result.gate === "GRANT_LOOKUP"
                ? "text-green-600"
                : "text-red-600"
            }
          >
            {result.allow || result.gate === "GRANT_LOOKUP" ? "✓" : "✗"}
          </span>
          <span className="w-28 shrink-0 font-medium">Zone type rule</span>
          <span className="text-slate-600">
            {result.detail ??
              (insufficientClearance
                ? "Clearance below required level."
                : "Zone type requirement satisfied.")}
          </span>
        </li>

        {/* Row 3 — Clearance */}
        <li className="flex gap-2 text-sm">
          <span
            className={
              result.allow || !insufficientClearance
                ? "text-green-600"
                : "text-red-600"
            }
          >
            {result.allow || !insufficientClearance ? "✓" : "✗"}
          </span>
          <span className="w-28 shrink-0 font-medium">Clearance</span>
          <span className="text-slate-600">
            {insufficientClearance
              ? (result.detail ?? "Clearance insufficient for this zone type.")
              : "Clearance sufficient."}
          </span>
        </li>

        {/* Row 4 — Escort (only for RESTRICTED or SECURED zones) */}
        {showEscortRow && (
          <li className="flex gap-2 text-sm">
            <span
              className={escortHasGrant ? "text-green-600" : "text-red-600"}
            >
              {escortHasGrant ? "✓" : "✗"}
            </span>
            <span className="w-28 shrink-0 font-medium">Escort</span>
            <span className="text-slate-600">
              {escortId === "none"
                ? "No escort selected."
                : escortHasGrant
                  ? "Escort holds a valid grant."
                  : "Escort does not hold an active grant for this zone — escort check fails."}
            </span>
          </li>
        )}
      </ul>
    </div>
  );
}

export function AccessResolutionExplorer() {
  const world = useWorld();
  const dispatch = useWorldDispatch();

  // Stable now — once per mount, no re-evaluation drift (Pitfall 4 guard)
  const now = useMemo(() => new Date(), []);

  const [personId, setPersonId] = useState<string>(world.subjects[0]?.id ?? "");
  const [zoneId, setZoneId] = useState<string>(world.zones[0]?.id ?? "");
  const [escortId, setEscortId] = useState<string>("none");

  // Stage 1 — active grants: exclude disabled and expired
  const activeGrants = useMemo(
    () =>
      world.grants.filter(
        (g) => !world.disabledGrantIds.has(g.id) && isGrantActive(g, now),
      ),
    [world.grants, world.disabledGrantIds, now],
  );

  // Stage 2 — selected zone, person, escort validity
  const selectedZone = useMemo(
    () => world.zones.find((z) => z.id === zoneId) ?? null,
    [world.zones, zoneId],
  );

  const person = useMemo(
    () => world.subjects.find((s) => s.id === personId) ?? null,
    [world.subjects, personId],
  );

  const escortHasGrant = useMemo(() => {
    if (escortId === "none" || selectedZone === null) return false;
    return (
      resolveGrant(escortId, selectedZone, world.zones, activeGrants, now) !==
      null
    );
  }, [escortId, selectedZone, world.zones, activeGrants, now]);

  // Stage 3 — full resolution result
  const result = useMemo((): ZoneAccessResult | null => {
    if (!person || !selectedZone) return null;
    return resolveZoneAccess(
      personId,
      selectedZone,
      person.clearance as Clearance,
      escortHasGrant,
      world.zones,
      activeGrants,
      now,
    );
  }, [
    personId,
    selectedZone,
    person,
    escortHasGrant,
    world.zones,
    activeGrants,
    now,
  ]);

  // Relevant zone IDs for the grant toggle panel (selected zone + all ancestors)
  const relevantZoneIds = useMemo(
    () =>
      selectedZone
        ? new Set([
            selectedZone.id,
            ...getAncestors(selectedZone.id, world.zones).map((z) => z.id),
          ])
        : new Set<string>(),
    [selectedZone, world.zones],
  );

  // Grants relevant to the current person + zone context
  const relevantGrants: PhysicalAccessGrant[] = useMemo(
    () =>
      world.grants.filter(
        (g) => g.person_id === personId && relevantZoneIds.has(g.zone_id),
      ),
    [world.grants, personId, relevantZoneIds],
  );

  // Helper lookups
  const zoneName = (id: string) =>
    world.zones.find((z) => z.id === id)?.name ?? id;

  // Build escort name for "no grant" prose
  const escortName =
    escortId !== "none"
      ? (world.subjects.find((s) => s.id === escortId)?.name ?? escortId)
      : "";

  return (
    <div className="space-y-4">
      {/* Intro prose */}
      <p className="text-sm text-slate-500">
        Select a person and zone to compute an access decision. Toggle grants to
        see how inheritance and explicit-auth rules change the result.
      </p>

      {/* Selector grid — 3 columns */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Person card */}
        <Card>
          <Field label="Person">
            <Select
              value={personId}
              onChange={setPersonId}
              options={world.subjects.map((s) => ({
                value: s.id,
                label: s.name,
              }))}
            />
          </Field>
          {person && (
            <div className="mt-2 flex items-center gap-2">
              <Field label="Clearance">
                <div className="mt-1 flex items-center gap-2">
                  <Pill tone={CLEARANCE_TONE[person.clearance as Clearance]}>
                    {person.clearance}
                  </Pill>
                  <MockTag />
                </div>
              </Field>
            </div>
          )}
          <p className="mt-2 text-xs text-slate-400">[MockTag: demo data]</p>
        </Card>

        {/* Zone card */}
        <Card>
          <Field label="Zone">
            <Select
              value={zoneId}
              onChange={setZoneId}
              options={world.zones.map((z) => ({
                value: z.id,
                label: z.name,
              }))}
            />
          </Field>
          {selectedZone && (
            <div className="mt-2 space-y-1">
              <Field label="Zone type">
                <div className="mt-1">
                  <Pill tone={ZONE_TYPE_TONE[selectedZone.zone_type]}>
                    {selectedZone.zone_type}
                  </Pill>
                </div>
              </Field>
              {selectedZone.requires_explicit_auth && (
                <div className="mt-1">
                  <Pill tone="amber">Requires explicit grant</Pill>
                </div>
              )}
              {selectedZone.admin_org_id && (
                <p className="text-xs text-slate-400">
                  Admin: {unitName(selectedZone.admin_org_id)}
                </p>
              )}
            </div>
          )}
        </Card>

        {/* Escort card */}
        <Card>
          <Field label="Escort (optional)">
            <Select
              value={escortId}
              onChange={setEscortId}
              options={[
                { value: "none", label: "None" },
                ...world.subjects.map((s) => ({ value: s.id, label: s.name })),
              ]}
            />
          </Field>
          {escortId !== "none" && !escortHasGrant && escortName && (
            <p className="mt-2 text-xs text-red-500">
              Escort ({escortName}) does not hold an active grant for this zone
              — escort check fails.
            </p>
          )}
          {escortId !== "none" && escortHasGrant && (
            <p className="mt-2 text-xs text-green-600">
              Escort holds a valid grant for this zone.
            </p>
          )}
        </Card>
      </div>

      {/* Resolution trace — full width */}
      {result !== null && (
        <ZoneResolutionTrace
          result={result}
          escortId={escortId}
          escortHasGrant={escortHasGrant}
          selectedZone={selectedZone}
        />
      )}

      {/* Bottom grid — grant toggles + explanation */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Relevant grants toggle panel */}
        <Card title="Relevant grants (toggle to simulate)">
          {relevantGrants.length === 0 ? (
            <p className="text-sm text-slate-400">
              No relevant grants for this selection.
            </p>
          ) : (
            <ul>
              {relevantGrants.map((grant) => {
                const disabled = world.disabledGrantIds.has(grant.id);
                const grantZoneName = zoneName(grant.zone_id);
                const grantPersonName =
                  world.subjects.find((s) => s.id === grant.person_id)?.name ??
                  grant.person_id;
                return (
                  <li
                    key={grant.id}
                    className="flex items-center gap-2 py-1 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={!disabled}
                      onChange={() =>
                        dispatch({ type: "TOGGLE_GRANT", grantId: grant.id })
                      }
                    />
                    <span
                      className={disabled ? "line-through text-slate-400" : ""}
                    >
                      {grantZoneName} — {grantPersonName}
                    </span>
                    {disabled && (
                      <span className="text-xs text-slate-400">(disabled)</span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* Static explanation card */}
        <Card title="About this decision">
          <p className="text-sm text-slate-600">
            Access is resolved in two gates: (1) does an active grant exist for
            this zone or a matching ancestor? (2) does the zone&apos;s security
            type allow entry given the person&apos;s clearance? CONTROLLED zones
            require only a grant. RESTRICTED zones require a grant plus
            RESTRICTED clearance or a valid escort. SECURED zones require a
            grant plus SECRET clearance — escort is noted but does not
            substitute for clearance.
          </p>
        </Card>
      </div>
    </div>
  );
}
