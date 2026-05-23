// demo/components/AuditView.tsx — Audit tab root.
// Renders the point-in-time audit reconstruction view (AUDIT-01, AUDIT-02).
// Slider drives asOf; reconstructed subject state and who-can-access panel update live.
// D3-11: no role gate in Phase 3 — note rendered inline instead.
// D3-13: reconstructSubject and whoCanAccess receive subjects/events as parameters.

import { useMemo, useState } from "react";
import { reconstructSubject, whoCanAccess } from "../lib/auditlog";
import { requirementFromResource } from "../lib/abac";
import { useWorld } from "../store/world-state";
import { Card, Field, Pill, Select } from "./ui";
import type { Subject } from "../lib/model";

export function AuditView() {
  const { events, subjects, resources } = useWorld();

  // D3-03: slider defaults to events.length (= current state / "now").
  // manualAsOf is null until the user moves the slider; derived asOf tracks live events when null.
  const [manualAsOf, setManualAsOf] = useState<number | null>(null);
  const asOf = manualAsOf ?? events.length;
  const [subjId, setSubjId] = useState(subjects[0].id);
  const [resId, setResId] = useState(resources[0].id);

  // Memoized derived values — whoCanAccess is O(n_subjects) so must be memoized
  // on [asOf, resId, events] to prevent redundant recomputation (RESEARCH Pitfall 3).
  const reconstructed = useMemo(
    () => reconstructSubject(subjId, subjects, events, asOf),
    [subjId, subjects, events, asOf],
  );

  const req = useMemo(() => {
    const res = resources.find((r) => r.id === resId);
    return res ? requirementFromResource(res) : null;
  }, [resId, resources]);

  const canAccess = useMemo(
    () => (req ? whoCanAccess(req, events, subjects, asOf) : []),
    [req, events, subjects, asOf],
  );

  const subjectOptions = subjects.map((s: Subject) => ({
    value: s.id,
    label: s.name,
  }));

  const subjectNameById = useMemo(
    () => new Map(subjects.map((s: Subject) => [s.id, s.name])),
    [subjects],
  );

  // Subjects whose clearance is claimed via an untrusted issuer — ABAC engine
  // evaluates the attribute value, not the issuer; flag these in who-can-access
  // so the distinction between attribute-based access and credential trust is visible.
  const unverifiedClearanceIds = useMemo(
    () =>
      new Set(
        subjects
          .filter((s: Subject) => s.clearanceGrantedBy === "ROGUE-ISSUER")
          .map((s: Subject) => s.id),
      ),
    [subjects],
  );

  const resourceOptions = resources.map((r) => ({
    value: r.id,
    label: `${r.name} (${r.domain})`,
  }));

  const auth = reconstructed?.authorization;

  return (
    <div className="space-y-4">
      {/* D3-11: inline production role note — no role gate in Phase 3 */}
      <p className="text-xs text-slate-400">
        In production, Auditor role required.
      </p>

      {/* Timeline card with subject picker + range slider + event list */}
      <Card title={`Timeline — as of T = ${asOf}`}>
        <Field label="Subject">
          <Select<string>
            value={subjId}
            onChange={setSubjId}
            options={subjectOptions}
          />
        </Field>

        <div className="mt-3 flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={events.length}
            value={asOf}
            onChange={(e) => setManualAsOf(Number(e.target.value))}
            className="w-full"
          />
          {/* D3-03: "Current state" pill visible only at slider max */}
          {asOf === events.length && <Pill tone="blue">Current state</Pill>}
        </div>

        {/* Event list: filtered to selected subject; asOf computation uses full events array */}
        <div className="mt-3 space-y-1">
          {events.filter((e) => e.subjectId === subjId).length === 0 ? (
            <p className="text-sm text-slate-400">
              No events for this subject.
            </p>
          ) : (
            events
              .filter((e) => e.subjectId === subjId)
              .map((e) => (
                <p
                  key={e.seq}
                  className={`font-mono text-xs ${e.seq <= asOf ? "text-slate-700" : "text-slate-300"}`}
                >
                  T={e.seq} {e.op}
                  {e.value ? ` ${e.value}` : ""} on{" "}
                  {subjectNameById.get(e.subjectId) ?? e.subjectId} by {e.actor}{" "}
                  {e.seq <= asOf ? "✓ applied" : "· future"}
                </p>
              ))
          )}
        </div>
      </Card>

      {/* Two-column grid: reconstructed state (left) + who-can-access (right) */}
      <div className="grid grid-cols-2 gap-4">
        {/* Left: Reconstructed State */}
        <Card title={`Reconstructed state — ${reconstructed?.name ?? subjId}`}>
          {reconstructed === null ? (
            <p className="text-sm text-slate-400">Unknown subject.</p>
          ) : (
            <div className="flex flex-wrap gap-1">
              <Pill tone="blue">{reconstructed.clearance}</Pill>
              {reconstructed.compartments.map((c) => (
                <Pill key={c} tone="slate">
                  {c}
                </Pill>
              ))}
              {reconstructed.flags.securityHold && (
                <Pill tone="red">SECURITY HOLD</Pill>
              )}
              {auth && (
                <Pill tone={auth.status === "AUTHORIZED" ? "green" : "red"}>
                  {auth.status === "AUTHORIZED"
                    ? "AUTHORIZED"
                    : "NOT AUTHORIZED"}
                </Pill>
              )}
            </div>
          )}
        </Card>

        {/* Right: Who-Can-Access */}
        <Card title={`Who can access — as of T=${asOf}`}>
          <Field label="Resource">
            <Select<string>
              value={resId}
              onChange={setResId}
              options={resourceOptions}
            />
          </Field>
          <div className="mt-3">
            {canAccess.length === 0 ? (
              <p className="text-sm text-slate-400">
                Nobody can access this resource at this point in time.
              </p>
            ) : (
              <ul className="space-y-1 text-sm">
                {canAccess.map((row) => (
                  <li
                    key={row.subjectId}
                    className="flex items-center gap-1.5 text-green-700"
                  >
                    ✓ {row.name}
                    {unverifiedClearanceIds.has(row.subjectId) && (
                      <span className="rounded bg-amber-100 px-1 py-0.5 font-mono text-xs text-amber-700">
                        [MOCK — unverified issuer]
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
