// datasets-panel.tsx — Datasets tab orchestrator. Performs its own independent
// Digital Resources fetch (D-04) so the Application picker works regardless of
// tab-visit order, renders a flat Application-only picker + Datasets list
// (D-01/D-02/D-06), and — once a dataset is selected — the explorer +
// reverse-lookup render together as a single stacked view (D-05), wrapped in a
// dataset-keyed ErrorBoundary (D-12/D-15).
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  hasStoredToken,
  useDigitalResourcesWorld,
  classifyLoaderState,
  type LoaderState,
} from "../hooks/use-digital-resources";
import { useWorld, useWorldDispatch } from "../store/world-state";
import { datasetsForApplication } from "../lib/dataset-selectors";
import type { ApplicationNode, DatasetNode, DatasetType } from "../lib/model";
import { Card, ErrorBoundary, Pill } from "./ui";
import { DatasetAccessExplorer } from "./dataset-access-explorer";
import { DatasetReverseLookup } from "./dataset-reverse-lookup";

// Module-local tone map (per-file copy convention, not shared) — deliberately
// avoids "green" (reserved for the Application tier's own TIER_TONE one level
// up) and "red" (reserved for DENY).
const DATASET_TYPE_TONE: Record<DatasetType, "blue" | "amber" | "slate"> = {
  MAILBOX: "blue",
  ARCHIVE_ROLE: "amber",
  DOCUMENT_SITE: "slate",
};

function ApplicationRow({
  app,
  selected,
  onSelect,
}: {
  app: ApplicationNode;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      className={`flex w-full items-center gap-2 rounded px-2 py-1 text-left text-sm ${selected ? "bg-slate-200" : "hover:bg-slate-100"}`}
      onClick={() => onSelect(app.id)}
    >
      <Pill tone="green">APPLICATION</Pill>
      <span
        className={`text-sm${selected ? " font-semibold text-slate-900" : ""}`}
      >
        {app.name}
      </span>
    </button>
  );
}

function DatasetRow({
  dataset,
  selected,
  onSelect,
}: {
  dataset: DatasetNode;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      className={`flex w-full items-center gap-2 rounded px-2 py-1 text-left text-sm ${selected ? "bg-slate-200" : "hover:bg-slate-100"}`}
      onClick={() => onSelect(dataset.id)}
    >
      <Pill tone={DATASET_TYPE_TONE[dataset.dataset_type]}>
        {dataset.dataset_type}
      </Pill>
      <span
        className={`text-sm${selected ? " font-semibold text-slate-900" : ""}`}
      >
        {dataset.name}
      </span>
    </button>
  );
}

export function DatasetsPanel() {
  const hasToken = hasStoredToken();
  const query = useDigitalResourcesWorld(hasToken);
  const dispatch = useWorldDispatch();
  const world = useWorld();
  const state: LoaderState = classifyLoaderState(hasToken, query);
  const [selectedApplicationId, setSelectedApplicationId] = useState<
    string | null
  >(null);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (query.isSuccess && query.data) {
      dispatch({ type: "SET_DIGITAL_RESOURCES", world: query.data });
    }
  }, [query.isSuccess, query.data, dispatch]);

  if (state === "missing-token") {
    return (
      <div className="rounded-md bg-destructive/10 p-4 text-destructive text-sm space-y-1">
        <p className="font-semibold">Not logged in.</p>
        <p>
          The demo reuses your main-app session. Log in to the main app first,
          then reload this page.
        </p>
      </div>
    );
  }

  if (state === "loading") {
    return (
      <div className="flex items-center gap-3 py-12 text-sm text-slate-500">
        <Loader2 className="animate-spin h-4 w-4 text-slate-400" />
        Loading digital resource data…
      </div>
    );
  }

  if (state === "unauthorized") {
    return (
      <div className="rounded-md bg-destructive/10 p-4 text-destructive text-sm space-y-1">
        <p className="font-semibold">Session invalid or expired.</p>
        <p>
          The backend rejected your main-app session. Log in to the main app
          again, then reload this page.
        </p>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="rounded-md bg-destructive/10 p-4 text-destructive text-sm space-y-1">
        <p className="font-semibold">Could not load digital resource data.</p>
        <p>
          The backend API is unreachable or returned an error. Check that the
          backend is running on :15520 and retry.
        </p>
        <button
          className="underline text-xs mt-1"
          onClick={() => query.refetch()}
        >
          Retry
        </button>
      </div>
    );
  }

  if (state === "empty") {
    return (
      <div className="py-12 text-sm text-slate-400 text-center">
        No digital resources found. Seed the database and refresh.
      </div>
    );
  }

  // state === "success"
  const datasets = selectedApplicationId
    ? datasetsForApplication(world.datasets.nodes, selectedApplicationId)
    : [];
  const selectedDataset = selectedDatasetId
    ? (datasets.find((d) => d.id === selectedDatasetId) ?? null)
    : null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <Card title="Applications">
          <div className="space-y-1">
            {world.digitalResources.applications.map((app) => (
              <ApplicationRow
                key={app.id}
                app={app}
                selected={app.id === selectedApplicationId}
                onSelect={(id) => {
                  setSelectedApplicationId(id);
                  setSelectedDatasetId(null);
                }}
              />
            ))}
          </div>
        </Card>
        <div className="col-span-2">
          <Card title="Datasets">
            {!selectedApplicationId ? (
              <p className="text-sm text-slate-400">
                Select an Application to see its datasets.
              </p>
            ) : datasets.length === 0 ? (
              <p className="text-sm text-slate-400">
                No datasets for this Application.
              </p>
            ) : (
              <div className="space-y-1">
                {datasets.map((d) => (
                  <DatasetRow
                    key={d.id}
                    dataset={d}
                    selected={d.id === selectedDatasetId}
                    onSelect={setSelectedDatasetId}
                  />
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
      {selectedDataset && (
        <ErrorBoundary key={selectedDataset.id}>
          <DatasetAccessExplorer dataset={selectedDataset} />
          <DatasetReverseLookup dataset={selectedDataset} />
        </ErrorBoundary>
      )}
    </div>
  );
}
