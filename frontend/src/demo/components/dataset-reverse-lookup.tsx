// dataset-reverse-lookup.tsx — Dataset (pre-filled) -> list of persons with
// active access + effective level (DATA-UI-03). One row per person, computed
// by calling resolveDatasetAt per person against world.subjects — never a
// separately computed shortcut, and never one row per raw grant record.
import { useMemo } from "react";
import { resolveDatasetAt } from "../lib/dataset-selectors";
import {
  effectiveArchiveCoverage,
  effectiveRankedLevel,
  isWindowActive,
  MAILBOX_LEVELS,
  DOCUMENT_SITE_LEVELS,
  assertNeverDatasetType,
  type ArchiveRole,
  type DatasetAccessGrant,
  type DatasetNode,
} from "../lib/model";
import { useWorld } from "../store/world-state";
import { Card, Pill } from "./ui";

// Used ONLY to pick a requiredLevel that lets resolveDatasetAt answer "does
// this person have ANY active access at all" — holding any active grant's
// coverage/rank always includes the lowest vocabulary entry, so passing it as
// requiredLevel makes gate 3 pass iff the person has at least one active,
// in-vocabulary DatasetAccessGrant on this dataset.
function lowestLevelFor(datasetType: DatasetNode["dataset_type"]): string {
  switch (datasetType) {
    case "MAILBOX":
      return MAILBOX_LEVELS[0];
    case "DOCUMENT_SITE":
      return DOCUMENT_SITE_LEVELS[0];
    case "ARCHIVE_ROLE":
      return "READER";
    default:
      return assertNeverDatasetType(datasetType);
  }
}

function effectiveLevelFor(
  dataset: DatasetNode,
  grants: DatasetAccessGrant[],
  personId: string,
  now: Date,
): string | null {
  const filtered = grants.filter(
    (g) =>
      g.dataset_id === dataset.id &&
      g.person_id === personId &&
      isWindowActive(g.valid_from, g.valid_until, now),
  );
  if (filtered.length === 0) return null;

  switch (dataset.dataset_type) {
    case "MAILBOX":
      return effectiveRankedLevel(
        MAILBOX_LEVELS,
        filtered.map((g) => g.level),
      );
    case "DOCUMENT_SITE":
      return effectiveRankedLevel(
        DOCUMENT_SITE_LEVELS,
        filtered.map((g) => g.level),
      );
    case "ARCHIVE_ROLE": {
      const coverage = effectiveArchiveCoverage(
        filtered.map((g) => g.level as ArchiveRole),
      );
      // Fresh, per-file-copy literal order (not imported from
      // dataset-access-explorer.tsx) — walk low-to-high, tracking the last
      // (maximal) role present in the coverage set.
      const order = ["READER", "CASE_HANDLER", "ADMIN"] as const;
      let best: string | null = null;
      for (const role of order) {
        if (coverage.has(role)) best = role;
      }
      return best;
    }
    default:
      return assertNeverDatasetType(dataset.dataset_type);
  }
}

export function DatasetReverseLookup({ dataset }: { dataset: DatasetNode }) {
  const world = useWorld();
  const now = useMemo(() => new Date(), []);

  const rows = useMemo(() => {
    const lowest = lowestLevelFor(dataset.dataset_type);
    return world.subjects
      .map((s) => {
        const result = resolveDatasetAt(
          world.datasets.nodes,
          world.digitalResources.applications,
          world.digitalResources.platforms,
          world.digitalResources.grants,
          world.datasets.grants,
          s.id,
          s.clearance,
          dataset.id,
          lowest,
          now,
        );
        if (!result.allow) return null;
        const level = effectiveLevelFor(
          dataset,
          world.datasets.grants,
          s.id,
          now,
        );
        return { personId: s.id, personName: s.name, level };
      })
      .filter(
        (
          r,
        ): r is {
          personId: string;
          personName: string;
          level: string | null;
        } => r !== null,
      );
  }, [
    world.subjects,
    world.datasets.nodes,
    world.datasets.grants,
    world.digitalResources,
    dataset,
    now,
  ]);

  return (
    <Card title="Who has access">
      {rows.length === 0 ? (
        <p className="text-sm text-slate-400">
          No one currently has access to this dataset.
        </p>
      ) : (
        <ul className="space-y-1">
          {rows.map((r) => (
            <li key={r.personId} className="flex items-center gap-2 text-sm">
              <span>{r.personName}</span>
              {r.level && <Pill tone="slate">{r.level}</Pill>}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
