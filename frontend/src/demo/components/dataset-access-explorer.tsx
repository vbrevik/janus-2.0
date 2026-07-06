// dataset-access-explorer.tsx — Person/dataset/required-level/timestamp
// selection + live 4-gate ALLOW/DENY trace, plus the admin-gated dataset
// grant-issuing form docked directly beneath it. Sibling to
// resource-access-explorer.tsx (SPEC R2 — NOT an extension of it). Per
// 15-UI-SPEC §Dataset Access Resolution Explorer / §Admin-gated issuing form.
//
// KNOWN LIMITATION (WR-02): the issuing form always issues as
// dataset.admin_org_id (there is no "logged in as a delegate Subject"
// concept in this UI — see the comment in handleIssueGrant below). Because
// canIssueDatasetGrant's admin-org path unconditionally allows any
// in-vocabulary level, the delegate-cap deny branch (and the "Not
// authorized to issue this grant" banner) can never be reached through real
// user interaction in this demo surface — it is exercised only by unit
// tests that call the hook directly with a mismatched actorOrgId. This is
// intentionally out of scope for this phase.
import { useEffect, useMemo, useState } from "react";
import { resolveDatasetAt } from "../lib/dataset-selectors";
import {
  effectiveDatasetClassification,
  MAILBOX_LEVELS,
  DOCUMENT_SITE_LEVELS,
  assertNeverDatasetType,
  type DatasetNode,
  type DatasetType,
  type DatasetAccessResult,
} from "../lib/model";
import { useWorld } from "../store/world-state";
import {
  useIssueDatasetGrant,
  type IssueDatasetGrantVariables,
} from "../hooks/use-datasets";
import { getStoredUserRole } from "../hooks/use-digital-resources";
import { CLEARANCE_TONE } from "./access-resolution-explorer";
import { Card, Field, MockTag, Pill, Select } from "./ui";

// Gate label copy for the dataset domain — per-file copy convention (does not
// import resource-access-explorer.tsx's own GATE_LABEL).
const GATE_LABEL: Record<string, string> = {
  CLEARANCE: "Clearance",
  APP_GRANT_OR: "Application grant",
  DATASET_GRANT: "Dataset grant",
  VISIBILITY: "Visibility",
};

// Low-to-high display order per dataset_type. ARCHIVE_ROLE's literal array is
// NOT sourced from ARCHIVE_ROLE_CONTAINS (that map's key order isn't low-to-high) —
// a fresh, correctly-ordered literal instead.
function levelVocabularyFor(datasetType: DatasetType): readonly string[] {
  switch (datasetType) {
    case "MAILBOX":
      return MAILBOX_LEVELS;
    case "DOCUMENT_SITE":
      return DOCUMENT_SITE_LEVELS;
    case "ARCHIVE_ROLE":
      return ["READER", "CASE_HANDLER", "ADMIN"];
    default:
      return assertNeverDatasetType(datasetType);
  }
}

// Renders DatasetAccessResult as a gate-by-gate trace — matches
// ResourceResolutionTrace's visual contract exactly (DATA-UI-02): rounded-lg
// border p-4, green/red verdict background, text-lg font-semibold verdict
// line, and an UNCONDITIONAL list of all 4 gates (never filtered/short-circuited).
function DatasetResolutionTrace({ result }: { result: DatasetAccessResult }) {
  return (
    <div
      className={`rounded-lg border p-4 ${result.allow ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}
    >
      <div className="text-lg font-semibold">
        {result.allow ? "✓ ALLOW" : "✗ DENY"}
      </div>
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
    </div>
  );
}

function todayStr(): string {
  // Build from local date components rather than an ISO/UTC round-trip —
  // toISOString() always renders in UTC, which returns yesterday's date for
  // any user in a timezone ahead of UTC during the hours between local
  // midnight and UTC midnight (WR-01).
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Admin-gated issuing form (D-08/D-09/D-10) — mirrors IssueGrantSection
// field-for-field, collapsed-by-default "+ Issue new grant" toggle.
function IssueDatasetGrantSection({ dataset }: { dataset: DatasetNode }) {
  const world = useWorld();
  const { mutate, isPending, isError } = useIssueDatasetGrant();
  // Issuing is gated on the single role string "admin" — never widened.
  const isAdmin = getStoredUserRole() === "admin";

  const vocab = levelVocabularyFor(dataset.dataset_type);
  const defaultPersonId = world.subjects[0]?.id ?? "";

  const [expanded, setExpanded] = useState(false);
  const [formPersonId, setFormPersonId] = useState(defaultPersonId);
  const [formLevel, setFormLevel] = useState(vocab[0]);
  const [validFrom, setValidFrom] = useState(todayStr);
  const [validUntil, setValidUntil] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const resetFields = () => {
    setFormPersonId(defaultPersonId);
    setFormLevel(vocab[0]);
    setValidFrom(todayStr());
    setValidUntil("");
  };

  // useIssueDatasetGrant's mutate() is not awaitable — mirror
  // IssueGrantSection's reset-on-success/collapse behavior by watching the
  // hook's own isPending/isError flags instead of an awaited promise.
  useEffect(() => {
    if (submitted && !isPending) {
      setSubmitted(false);
      if (!isError) {
        setExpanded(false);
        resetFields();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitted, isPending, isError]);

  if (!isAdmin) {
    return (
      <p className="text-xs text-slate-400">
        Issuing controls require an admin login.
      </p>
    );
  }

  const handleIssueGrant = () => {
    // Guard against an emptied "Valid from" (native date inputs allow this):
    // new Date("") is an Invalid Date whose valid_from would forever fail
    // isWindowActive's valid_from <= now check, silently issuing a grant
    // that can never become active while the UI reports success (CR-01).
    if (!validFrom) return;
    const parsedFrom = new Date(validFrom);
    if (Number.isNaN(parsedFrom.getTime())) return;

    setSubmitted(true);
    // The only reachable authority path from this UI is the admin_org
    // exemption — there is no demo concept of "logged in as a specific
    // delegate Subject" — so dataset.admin_org_id is always passed, and
    // "ui-admin" is a fixed sentinel documenting that provenance (the audit
    // log's actor_person_id is write-only this phase — nothing renders it
    // back).
    const vars: IssueDatasetGrantVariables = {
      actorOrgId: dataset.admin_org_id,
      actorPersonId: "ui-admin",
      datasetId: dataset.id,
      personId: formPersonId,
      level: formLevel,
      validFrom: parsedFrom,
      validUntil: validUntil ? new Date(validUntil) : null,
    };
    mutate(vars);
  };

  return (
    <div>
      <button
        className="text-sm text-slate-600 underline hover:text-slate-800"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? "Cancel" : "+ Issue new grant"}
      </button>
      {expanded && (
        <div className="mt-2 space-y-3">
          <Field label="Person">
            <Select
              value={formPersonId}
              onChange={setFormPersonId}
              options={world.subjects.map((s) => ({
                value: s.id,
                label: s.name,
              }))}
            />
          </Field>
          <Field label="Level">
            <Select
              value={formLevel}
              onChange={setFormLevel}
              options={vocab.map((l) => ({ value: l, label: l }))}
            />
          </Field>
          <Field label="Valid from">
            <input
              type="date"
              required
              className="mt-1 w-full rounded border border-slate-300 p-2 text-sm"
              value={validFrom}
              onChange={(e) => setValidFrom(e.target.value)}
            />
          </Field>
          <Field label="Valid until (optional)">
            <input
              type="date"
              className="mt-1 w-full rounded border border-slate-300 p-2 text-sm"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
            />
            <p className="text-xs text-slate-400">
              Leave blank for permanent grant.
            </p>
          </Field>
          <button
            className="rounded px-3 py-1.5 text-sm bg-slate-800 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isPending}
            onClick={handleIssueGrant}
          >
            {isPending ? "Issuing…" : "Issue grant"}
          </button>
          {isError && (
            <div className="rounded bg-destructive/10 p-3 text-sm text-destructive mt-2">
              Not authorized to issue this grant.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function DatasetAccessExplorer({ dataset }: { dataset: DatasetNode }) {
  const world = useWorld();

  const [personId, setPersonId] = useState<string>(world.subjects[0]?.id ?? "");
  // This initializer naturally re-runs per dataset because the parent wraps
  // this component in <ErrorBoundary key={dataset.id}>, remounting it fresh
  // on every dataset change (D-15).
  const [requiredLevel, setRequiredLevel] = useState<string>(
    levelVocabularyFor(dataset.dataset_type)[0],
  );

  const initialNow = useMemo(() => new Date(), []);
  const [timestampInput, setTimestampInput] = useState(
    initialNow.toISOString().slice(0, 16),
  );
  const evalTime = useMemo(() => new Date(timestampInput), [timestampInput]);

  const vocab = levelVocabularyFor(dataset.dataset_type);

  const person = world.subjects.find((s) => s.id === personId) ?? null;

  // Let this throw naturally — the parent's ErrorBoundary catches it.
  const effectiveClass = effectiveDatasetClassification(
    dataset,
    world.digitalResources.applications,
    world.digitalResources.platforms,
  );

  const result = useMemo<DatasetAccessResult | null>(() => {
    if (!person) return null;
    return resolveDatasetAt(
      world.datasets.nodes,
      world.digitalResources.applications,
      world.digitalResources.platforms,
      world.digitalResources.grants,
      world.datasets.grants,
      personId,
      person.clearance,
      dataset.id,
      requiredLevel,
      evalTime,
    );
  }, [
    world.datasets.nodes,
    world.datasets.grants,
    world.digitalResources,
    personId,
    person,
    dataset,
    requiredLevel,
    evalTime,
  ]);

  return (
    <div className="space-y-4">
      {/* Intro prose */}
      <p className="text-sm text-slate-500">
        Select a person and required level, then slide the timestamp to evaluate
        dataset access at any point in time.
      </p>

      {/* Selector grid — Person + Dataset/Required level */}
      <div className="grid gap-4 sm:grid-cols-2">
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

        <Card>
          <p className="text-sm font-medium text-slate-700">{dataset.name}</p>
          <div className="mt-1">
            <Pill tone={CLEARANCE_TONE[effectiveClass]}>{effectiveClass}</Pill>
          </div>
          <div className="mt-2">
            <Field label="Required level">
              <Select
                value={requiredLevel}
                onChange={setRequiredLevel}
                options={vocab.map((l) => ({ value: l, label: l }))}
              />
            </Field>
          </div>
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
      </Card>

      {/* Gate-chain trace — full width */}
      {result !== null && <DatasetResolutionTrace result={result} />}

      {/* Admin-gated issuing form, docked directly under the explorer (D-08) */}
      <IssueDatasetGrantSection dataset={dataset} />
    </div>
  );
}
