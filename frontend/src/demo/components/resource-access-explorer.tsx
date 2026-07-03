// resource-access-explorer.tsx — Person/resource/timestamp selection + live
// gate-chain trace (with amber non-blocking zone advisory + policy-version
// label) + TOGGLE_RESOURCE_GRANT checkboxes. Per 12-UI-SPEC §Access Resolution
// Explorer Layout / §ResourceResolutionTrace component.
import { useMemo, useState } from "react";
import {
  effectiveClassification,
  type ApplicationNode,
  type NetworkNode,
  type PlatformNode,
  type ResourceAccessResult,
} from "../lib/model";
import { resolveResourceAt } from "../lib/digital-resource-selectors";
import { useWorld, useWorldDispatch } from "../store/world-state";
import { CLEARANCE_TONE } from "./access-resolution-explorer";
import { Card, Field, MockTag, Pill, Select } from "./ui";

// Module-local tone map, mirroring the per-file pattern (resource-browser.tsx
// carries its own copy — do not import cross-component).
const TIER_TONE: Record<
  "NETWORK" | "PLATFORM" | "APPLICATION",
  "slate" | "blue" | "green"
> = {
  NETWORK: "slate",
  PLATFORM: "blue",
  APPLICATION: "green",
};

// Gate label copy per 12-UI-SPEC §Gate label copy (must match exactly).
const GATE_LABEL: Record<string, string> = {
  CLEARANCE: "Clearance",
  OWN_TIER_GRANT: "Own-tier grant",
  PARENT_TIER_GRANT: "Parent-tier grant",
  REQUIRED_ROLE: "Required role",
};

type ResourceNode = NetworkNode | PlatformNode | ApplicationNode;

function windowBound(date: Date | null): string {
  return date ? date.toISOString().slice(0, 10) : "open";
}

// Local component — renders ResourceAccessResult as a gate-by-gate trace.
// The verdict comes from result.allow only; the zone advisory block below is
// advisory-only (amber, never green/red) and NEVER feeds the verdict.
function ResourceResolutionTrace({ result }: { result: ResourceAccessResult }) {
  return (
    <div
      className={`rounded-lg border p-4 ${result.allow ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}
    >
      <div className="text-lg font-semibold">
        {result.allow ? "✓ ALLOW" : "✗ DENY"}
      </div>

      {/* Policy version row — always shown */}
      <p className="text-xs text-slate-400">
        {result.policyVersion
          ? `Policy: ${windowBound(result.policyVersion.valid_from)} – ${windowBound(result.policyVersion.valid_until)}`
          : "No active policy at this time."}
      </p>

      {/* Gate rows — one per evaluated gate, in policy list order */}
      <ul className="mt-3 space-y-1.5">
        {result.gates.map((g, i) => (
          <li key={`${g.kind}-${i}`} className="flex gap-2 text-sm">
            <span className={g.pass ? "text-green-600" : "text-red-600"}>
              {g.pass ? "✓" : "✗"}
            </span>
            <span className="w-28 shrink-0 font-medium">
              {GATE_LABEL[g.kind] ?? `Gate: ${g.kind}`}
            </span>
            <span className="text-slate-600">{g.reason}</span>
          </li>
        ))}
      </ul>

      {/* Zone advisory block — amber only, never green/red, never gates allow */}
      {result.zoneAdvisory !== null && (
        <div className="bg-amber-50 border border-amber-200 rounded p-3 mt-2 flex gap-2 text-sm">
          <span className="text-amber-700">⚠</span>
          <div>
            <span className="font-medium text-amber-900">
              Zone prerequisite
            </span>{" "}
            <span className="text-amber-800">
              {result.zoneAdvisory.detail ?? result.zoneAdvisory.reason}
            </span>{" "}
            <Pill tone="amber">Advisory (non-blocking)</Pill>
            <span className="text-xs text-amber-700 block mt-1">
              This zone requirement is advisory — it does not affect the
              ALLOW/DENY verdict.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export function ResourceAccessExplorer() {
  const world = useWorld();
  const dispatch = useWorldDispatch();

  // Flat resource list across all three tiers (Select-sentinel rule: first
  // entry is the default — never an empty value).
  const flatResources: ResourceNode[] = useMemo(
    () => [
      ...world.digitalResources.networks,
      ...world.digitalResources.platforms,
      ...world.digitalResources.applications,
    ],
    [world.digitalResources],
  );

  const [personId, setPersonId] = useState<string>(world.subjects[0]?.id ?? "");
  const [resourceId, setResourceId] = useState<string>(
    flatResources[0]?.id ?? "",
  );

  // Stable initial now — once per mount; the datetime-local input drives all
  // subsequent evaluation timestamps.
  const initialNow = useMemo(() => new Date(), []);
  const [timestampInput, setTimestampInput] = useState(
    initialNow.toISOString().slice(0, 16),
  );
  const evalTime = useMemo(() => new Date(timestampInput), [timestampInput]);

  const person = useMemo(
    () => world.subjects.find((s) => s.id === personId) ?? null,
    [world.subjects, personId],
  );

  const selectedResource = useMemo(
    () => flatResources.find((r) => r.id === resourceId) ?? null,
    [flatResources, resourceId],
  );

  const selectedClassification = selectedResource
    ? selectedResource.tier === "APPLICATION"
      ? effectiveClassification(
          selectedResource,
          world.digitalResources.platforms,
        )
      : selectedResource.classification
    : null;

  // Live resolution — resolveResourceAt filters disabled grants itself (D-06);
  // never pre-filter world.digitalResources.grants here. Verdict comes from
  // the selector only; this component never re-derives ALLOW/DENY.
  const result = useMemo((): ResourceAccessResult | null => {
    if (!person || !selectedResource) return null;
    return resolveResourceAt(
      world.digitalResources,
      personId,
      person.clearance,
      person.unit,
      resourceId,
      evalTime,
    );
  }, [
    world.digitalResources,
    personId,
    person,
    selectedResource,
    resourceId,
    evalTime,
  ]);

  // Grants for the current person × resource selection (toggle panel).
  const relevantGrants = useMemo(
    () =>
      world.digitalResources.grants.filter(
        (g) => g.person_id === personId && g.resource_id === resourceId,
      ),
    [world.digitalResources.grants, personId, resourceId],
  );

  const personName = (id: string) =>
    world.subjects.find((s) => s.id === id)?.name ?? id;

  return (
    <div className="space-y-4">
      {/* Intro prose */}
      <p className="text-sm text-slate-500">
        Select a person and resource, then slide the timestamp to evaluate
        access at any point in time.
      </p>

      {/* Selector grid — Person + Resource */}
      <div className="grid gap-4 sm:grid-cols-2">
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
            <div className="mt-2">
              <Field label="Clearance">
                <div className="mt-1 flex items-center gap-2">
                  <Pill tone={CLEARANCE_TONE[person.clearance]}>
                    {person.clearance}
                  </Pill>
                  <MockTag />
                </div>
              </Field>
            </div>
          )}
        </Card>

        {/* Resource card */}
        <Card>
          <Field label="Resource">
            <Select
              value={resourceId}
              onChange={setResourceId}
              options={flatResources.map((r) => ({
                value: r.id,
                label: `[${r.tier}] ${r.name}`,
              }))}
            />
          </Field>
          {selectedResource && selectedClassification && (
            <div className="mt-2 flex items-center gap-2">
              <Pill tone={TIER_TONE[selectedResource.tier]}>
                {selectedResource.tier}
              </Pill>
              <Pill tone={CLEARANCE_TONE[selectedClassification]}>
                {selectedClassification}
              </Pill>
            </div>
          )}
        </Card>
      </div>

      {/* Evaluation timestamp — full-width card */}
      <Card title="Evaluation Timestamp">
        <Field label="Evaluation timestamp">
          <input
            type="datetime-local"
            className="mt-1 w-full rounded border border-slate-300 p-2 text-sm"
            value={timestampInput}
            onChange={(e) => setTimestampInput(e.target.value)}
          />
        </Field>
        <p className="text-xs text-slate-400">
          Slide across 2026-03-01 to see MilNet policy shift.
        </p>
      </Card>

      {/* Gate-chain trace — full width */}
      {result !== null && <ResourceResolutionTrace result={result} />}

      {/* Bottom grid — grant toggles + explanation */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card title="Resource grants (toggle to simulate)">
          {relevantGrants.length === 0 ? (
            <p className="text-sm text-slate-400">
              No grants for this person and resource.
            </p>
          ) : (
            <ul>
              {relevantGrants.map((grant) => {
                const disabled =
                  world.digitalResources.disabledResourceGrantIds.has(grant.id);
                return (
                  <li
                    key={grant.id}
                    className="flex items-center gap-2 py-1 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={!disabled}
                      onChange={() =>
                        dispatch({
                          type: "TOGGLE_RESOURCE_GRANT",
                          resourceGrantId: grant.id,
                        })
                      }
                    />
                    <span
                      className={disabled ? "line-through text-slate-400" : ""}
                    >
                      {personName(grant.person_id)} —{" "}
                      {windowBound(grant.valid_from)} –{" "}
                      {windowBound(grant.valid_until)}
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
            Access is resolved through an ordered gate chain: the person&apos;s
            clearance must meet the resource&apos;s effective classification, an
            active grant must exist on the resource&apos;s own tier (or, for
            child resources, a covering grant on the parent tier), and any
            required role named by the active policy must be held. Every gate
            must pass for ALLOW. A zone prerequisite, when present, is checked
            separately and shown as an amber advisory — it never changes the
            verdict.
          </p>
        </Card>
      </div>
    </div>
  );
}
