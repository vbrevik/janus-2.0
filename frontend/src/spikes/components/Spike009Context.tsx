// Spike 009 — context-driven access: support obligations (deployment) + directional shielding.
import { useState } from "react";
import {
  UNITS,
  SUBUNITS,
  RESOURCES_CTX,
  evaluateSubunitAccess,
  evaluateResourceAccess,
  type UnitId,
  type Deployment,
  type ContextDecision,
} from "../lib/obligations";
import { Card, Field, Pill, Select } from "./ui";

const UNIT_OPTS = (Object.keys(UNITS) as UnitId[]).map((id) => ({
  value: id,
  label: UNITS[id].label,
}));

function ContextTrace({ result }: { result: ContextDecision }) {
  const allow = result.decision === "ALLOW";
  const glyph = (e: string, active: boolean) =>
    e === "GRANT"
      ? active
        ? "➕"
        : "·"
      : e === "DENY"
        ? active
          ? "⛔"
          : "·"
        : active
          ? "✓"
          : "✗";
  return (
    <div
      className={`rounded-lg border p-4 ${allow ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}
    >
      <div className="text-lg font-bold">{allow ? "✓ ALLOW" : "✗ DENY"}</div>
      <ul className="mt-3 space-y-1.5">
        {result.rules.map((r) => (
          <li key={r.name} className="flex gap-2 text-sm">
            <span>{glyph(r.effect, r.active)}</span>
            <span className="w-36 shrink-0 font-medium">
              {r.name}
              <span className="text-slate-400">
                {" "}
                ({r.effect.toLowerCase()})
              </span>
            </span>
            <span className="text-slate-600">{r.detail}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Spike009Context() {
  // Panel A — support obligations
  const [reqA, setReqA] = useState<UnitId>("INFRA");
  const [subId, setSubId] = useState("su-1");
  const [deployment, setDeployment] = useState<Deployment>("HOME");
  const baseSub = SUBUNITS.find((s) => s.id === subId)!;
  const target = { ...baseSub, deployment };
  const obligationResult = evaluateSubunitAccess(reqA, target);

  // Panel B — directional shielding
  const [reqB, setReqB] = useState<UnitId>("MILITARY_2");
  const [resId, setResId] = useState("cr-1");
  const resource = RESOURCES_CTX.find((r) => r.id === resId)!;
  const shieldResult = evaluateResourceAccess(reqB, resource);

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-500">
        Two new context-driven rule classes for the 6-unit scenario: obligations{" "}
        <strong>grant</strong> access when a subunit deploys abroad; shielding{" "}
        <strong>denies</strong> access to protected owner data. Both turn on/off
        with context — not stored grants.
      </p>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold">
          A · Support obligation (deployment-driven grant)
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <Field label="Requesting unit">
              <Select value={reqA} onChange={setReqA} options={UNIT_OPTS} />
            </Field>
            <div className="mt-3">
              <Field label="Target subunit">
                <Select
                  value={subId}
                  onChange={setSubId}
                  options={SUBUNITS.map((s) => ({
                    value: s.id,
                    label: `${s.name} (${UNITS[s.unit].label})`,
                  }))}
                />
              </Field>
            </div>
            <div className="mt-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Deployment
              </span>
              <div className="mt-1 flex gap-2">
                {(["HOME", "ABROAD"] as Deployment[]).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDeployment(d)}
                    className={`rounded border px-3 py-1 text-xs ${deployment === d ? "border-blue-300 bg-blue-100 text-blue-800" : "border-slate-300 text-slate-500"}`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1">
              <Pill>{UNITS[reqA].label}</Pill>
              <span className="text-slate-400 text-xs self-center">→</span>
              <Pill tone="amber">{baseSub.name}</Pill>
              <Pill tone={deployment === "ABROAD" ? "red" : "slate"}>
                {deployment}
              </Pill>
            </div>
          </Card>
          <ContextTrace result={obligationResult} />
        </div>
        <p className="text-xs text-slate-400">
          Try: Inventory/Infrastructure → 1st Recon Coy. HOME → DENY; flip to
          ABROAD → ALLOW (support obligation). Switch requester to Industry →
          still DENY abroad (no obligation).
        </p>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold">
          B · Directional shielding (deny override on protected data)
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <Field label="Requesting unit">
              <Select value={reqB} onChange={setReqB} options={UNIT_OPTS} />
            </Field>
            <div className="mt-3">
              <Field label="Shielded resource">
                <Select
                  value={resId}
                  onChange={setResId}
                  options={RESOURCES_CTX.map((r) => ({
                    value: r.id,
                    label: `${r.name} (${UNITS[r.ownerUnit].label})`,
                  }))}
                />
              </Field>
            </div>
            <div className="mt-3 flex flex-wrap gap-1">
              <Pill tone="red">shielded</Pill>
              <span className="text-xs text-slate-400 self-center">
                allowlist:
              </span>
              {resource.allowlist.map((u) => (
                <Pill key={u}>{UNITS[u].label}</Pill>
              ))}
            </div>
          </Card>
          <ContextTrace result={shieldResult} />
        </div>
        <p className="text-xs text-slate-400">
          Try: Military Unit 1 → INTEL Threat Brief (allowlisted) → ALLOW.
          Military Unit 2 (broad standing, not allowlisted) → DENY by shielding.
        </p>
      </div>
    </div>
  );
}
