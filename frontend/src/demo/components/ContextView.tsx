// demo/components/ContextView.tsx — Context tab: policy divergence, deployment toggle, directional shielding.
// Implements CTX-01 (policy divergence), CTX-02 (deployment-driven obligation), CTX-03 (directional shielding).
// ContextTrace is local only — not exported. DecisionTrace (from ui.tsx) used for policy divergence grid.

import { useMemo, useState } from "react";
import { principalFromSubject, requirementFromResource } from "../lib/abac";
import type { Decision } from "../lib/abac";
import { evaluateWithPolicy } from "../lib/policy";
import {
  evaluateSubunitAccess,
  evaluateResourceAccess,
} from "../lib/obligations";
import { POLICIES, SUBUNITS, SUPPORT_OBLIGATIONS } from "../lib/seed";
import { useWorld } from "../store/world-state";
import { Card, DecisionTrace, Field, Pill, Select } from "./ui";
import type { Deployment, UnitId } from "../lib/model";
import { UNITS } from "../lib/model";

const UNIT_IDS: UnitId[] = [
  "MILITARY_1",
  "MILITARY_2",
  "INTEL",
  "INFRA",
  "INDUSTRY",
  "HOME_GUARD",
];

const UNIT_OPTIONS = UNIT_IDS.map((id) => ({
  value: id,
  label: UNITS[id].label,
}));

function proseSentence(decision: Decision): string {
  if (decision.overrides.length > 0)
    return "Access is denied because this subject is under a security hold.";
  if (decision.decision === "ALLOW")
    return "Access is allowed because this subject holds all required attributes for this resource.";
  const first = decision.rules.find((r) => !r.pass);
  if (!first) return `Access is denied.`;
  if (first.name === "Clearance")
    return "Access is denied because this subject's clearance is below the required level.";
  if (first.name === "Domain tier")
    return "Access is denied because this subject lacks the required domain tier.";
  if (first.name === "Need-to-know")
    return "Access is denied because this subject is missing a required compartment.";
  if (first.name === "Affiliation")
    return "Access is denied because this subject's entity has no agreement with the resource owner.";
  if (
    first.name === "Deployment (ABROAD)" ||
    first.name === "Support obligation"
  )
    return "Access is denied because no support obligation exists between these units for this deployment status.";
  if (first.name === "Directional shielding")
    return "Access is denied because this resource is shielded — only allowlisted entities may access it.";
  return `Access is denied: ${first.detail}`;
}

// ContextTrace — local component for displaying a Decision result with ALLOW/DENY verdict.
// NOT exported. Used by the deployment and shielding panels where the rules shape from
// obligations.ts matches the standard Decision interface.
function ContextTrace({
  label,
  decision,
}: {
  label: string;
  decision: Decision;
}) {
  const allow = decision.decision === "ALLOW";
  return (
    <div
      className={`rounded-lg border p-4 ${allow ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}
    >
      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className="text-lg font-semibold">
        {allow ? "✓ ALLOW" : "✗ DENY"}
      </div>
      <p className="mt-2 text-sm italic text-slate-600">
        {proseSentence(decision)}
      </p>
      <ul className="mt-3 space-y-1.5">
        {decision.rules.map((r) => (
          <li key={r.name} className="flex gap-2 text-sm">
            <span className={r.pass ? "text-green-600" : "text-red-600"}>
              {r.pass ? "✓" : "✗"}
            </span>
            <span className="w-36 shrink-0 font-medium">{r.name}</span>
            <span className="text-slate-600">{r.detail}</span>
          </li>
        ))}
        {decision.overrides.map((o) => (
          <li key={o.name} className="flex gap-2 text-sm">
            <span className="text-red-600">⛔</span>
            <span className="w-36 shrink-0 font-medium text-red-700">
              {o.name}
            </span>
            <span className="text-red-700">{o.detail} (deny override)</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ContextView() {
  const { subjects, resources } = useWorld();

  // ── Section: Policy Divergence (CTX-01) ──────────────────────────────────

  const [policySubjId, setPolicySubjId] = useState(subjects[0].id);
  const [policyResId, setPolicyResId] = useState(resources[0].id);

  const principal = useMemo(() => {
    const subj = subjects.find((s) => s.id === policySubjId);
    return subj
      ? principalFromSubject(subj)
      : principalFromSubject(subjects[0]);
  }, [policySubjId, subjects]);

  const req = useMemo(() => {
    const res = resources.find((r) => r.id === policyResId);
    return res
      ? requirementFromResource(res)
      : requirementFromResource(resources[0]);
  }, [policyResId, resources]);

  const policyResults = useMemo(
    () =>
      UNIT_IDS.map((uid) => ({
        uid,
        policy: POLICIES[uid],
        decision: evaluateWithPolicy(principal, req, POLICIES[uid]),
      })),
    [principal, req],
  );

  // ── Section A: Deployment / Support Obligation (CTX-02) ──────────────────

  const [obligRequester, setObligRequester] = useState<UnitId>("INFRA");
  const [obligSubunitId, setObligSubunitId] = useState(SUBUNITS[0].id);
  const [deployment, setDeployment] = useState<Deployment>("HOME");

  const selectedSubunit =
    SUBUNITS.find((s) => s.id === obligSubunitId) ?? SUBUNITS[0];
  const subunitWithDeployment = { ...selectedSubunit, deployment };

  const obligationDecision = useMemo(
    () =>
      evaluateSubunitAccess(
        obligRequester,
        subunitWithDeployment,
        SUPPORT_OBLIGATIONS,
      ),
    // Use primitives, not the derived object (new ref each render → no memoization).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [obligRequester, obligSubunitId, deployment],
  );

  // ── Section B: Directional Shielding (CTX-03) ────────────────────────────

  const shieldedResources = useMemo(
    () => resources.filter((r) => r.shielded === true),
    [resources],
  );

  const [shieldRequester, setShieldRequester] = useState<UnitId>("MILITARY_1");
  const [shieldResId, setShieldResId] = useState(
    shieldedResources[0]?.id ?? "",
  );

  const selectedShieldedResource = shieldedResources.find(
    (r) => r.id === shieldResId,
  );

  const shieldingDecision = useMemo(() => {
    if (!selectedShieldedResource) return null;
    return evaluateResourceAccess(shieldRequester, selectedShieldedResource);
  }, [shieldRequester, selectedShieldedResource]);

  return (
    <div className="space-y-6">
      {/* ── Policy Divergence (CTX-01) ── */}
      <div className="space-y-3">
        <p className="text-sm text-slate-500">
          Each holding entity authors its own release policy —
          enabling/disabling rules or setting a stricter floor. The SAME request
          can resolve differently depending on whose policy runs.
        </p>

        <div className="grid grid-cols-2 gap-4">
          <Card>
            <Field label="Subject">
              <Select
                value={policySubjId}
                onChange={setPolicySubjId}
                options={subjects.map((s) => ({ value: s.id, label: s.name }))}
              />
            </Field>
          </Card>
          <Card>
            <Field label="Resource">
              <Select
                value={policyResId}
                onChange={setPolicyResId}
                options={resources.map((r) => ({
                  value: r.id,
                  label: `${r.name} (${r.domain})`,
                }))}
              />
            </Field>
          </Card>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-4">
          {policyResults.map(({ uid, policy, decision }) => (
            <Card key={uid}>
              <p className="text-sm font-semibold">{uid}</p>
              <p className="text-xs text-slate-400">{policy.label}</p>
              <div className="mt-2">
                <DecisionTrace
                  result={decision}
                  prose={proseSentence(decision)}
                />
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* ── Sections A + B ── */}
      <div className="space-y-6">
        {/* Section A: Support Obligation */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold">
            A · Support obligation (deployment-driven grant)
          </h2>
          <p className="text-sm text-slate-500">
            Two new context-driven rule classes for the 6-unit scenario:
            obligations grant access when a subunit deploys abroad; shielding
            denies access to protected owner data. Both turn on/off with context
            — not stored grants.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <Field label="Requester unit">
                <Select
                  value={obligRequester}
                  onChange={setObligRequester}
                  options={UNIT_OPTIONS}
                />
              </Field>
              <div className="mt-3">
                <Field label="Target subunit">
                  <Select
                    value={obligSubunitId}
                    onChange={setObligSubunitId}
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
                      className={`rounded border px-3 py-1 text-xs ${
                        deployment === d
                          ? "border-blue-300 bg-blue-100 text-blue-800"
                          : "border-slate-300 text-slate-500"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </Card>
            <div className="space-y-2">
              <ContextTrace
                label="Obligation grant"
                decision={obligationDecision}
              />
              <p className="text-xs text-slate-400">
                Try: Inventory/Infrastructure → 1st Recon Coy. HOME → DENY; flip
                to ABROAD → ALLOW (support obligation). Switch requester to
                Industry → still DENY abroad (no obligation).
              </p>
            </div>
          </div>
        </div>

        {/* Section B: Directional Shielding */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold">
            B · Directional shielding (deny override on protected data)
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <Field label="Requester unit">
                <Select
                  value={shieldRequester}
                  onChange={setShieldRequester}
                  options={UNIT_OPTIONS}
                />
              </Field>
              {shieldedResources.length === 0 ? (
                <p className="mt-3 text-sm text-slate-400">
                  No shielded resources in world state.
                </p>
              ) : (
                <>
                  <div className="mt-3">
                    <Field label="Protected resource">
                      <Select
                        value={shieldResId}
                        onChange={setShieldResId}
                        options={shieldedResources.map((r) => ({
                          value: r.id,
                          label: `${r.name} (${UNITS[r.ownerUnit].label})`,
                        }))}
                      />
                    </Field>
                  </div>
                  {selectedShieldedResource && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      <Pill tone="red">shielded</Pill>
                      <span className="self-center text-xs text-slate-400">
                        allowlist:
                      </span>
                      {(selectedShieldedResource.allowlist ?? []).map((u) => (
                        <Pill key={u}>{UNITS[u as UnitId]?.label ?? u}</Pill>
                      ))}
                    </div>
                  )}
                </>
              )}
            </Card>
            <div className="space-y-2">
              {shieldingDecision ? (
                <ContextTrace
                  label="Shielding gate"
                  decision={shieldingDecision}
                />
              ) : (
                <p className="text-sm text-slate-400">
                  Select a shielded resource to evaluate.
                </p>
              )}
              <p className="text-xs text-slate-400">
                Try: Military Unit 1 → INTEL Threat Brief (allowlisted) → ALLOW.
                Military Unit 2 (broad standing, not allowlisted) → DENY by
                shielding.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
