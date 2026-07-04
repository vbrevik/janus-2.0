// demo/lib/dataset-selectors.ts — Pure read selectors over the Phase 14 dataset
// fixtures. All functions take explicit `now: Date`; none read the system clock
// internally. Unlike digital-resource-selectors.ts's single `world` param, these
// take individual array params (D-11): the application_id join spans two separate
// WorldState sub-objects (`state.datasets` and `state.digitalResources`), so a
// single sub-object parameter can't cleanly express it.

import {
  resolveDatasetAccess,
  isWindowActive,
  type DatasetNode,
  type DatasetAccessGrant,
  type DatasetAccessResult,
  type Clearance,
  type ApplicationNode,
  type PlatformNode,
  type ResourceAccessGrant,
} from "./model";

// --- Selector 1: datasetsForApplication ---
// Returns only the DatasetNodes whose application_ids includes the given id.
export function datasetsForApplication(
  datasets: DatasetNode[],
  applicationId: string,
): DatasetNode[] {
  return datasets.filter((d) => d.application_ids.includes(applicationId));
}

// --- Selector 2: activeDatasetGrantsForPerson ---
// Returns only grants matching person_id AND currently window-active at now.
export function activeDatasetGrantsForPerson(
  grants: DatasetAccessGrant[],
  personId: string,
  now: Date,
): DatasetAccessGrant[] {
  return grants.filter(
    (g) =>
      g.person_id === personId &&
      isWindowActive(g.valid_from, g.valid_until, now),
  );
}

// --- Selector 3: resolveDatasetAt ---
// Thin wrapper over resolveDatasetAccess. Finds the dataset by id; if not
// found, returns a closed result without throwing. Otherwise delegates
// directly to resolveDatasetAccess and returns its result verbatim — no
// post-processing of allow/visible/gates.
export function resolveDatasetAt(
  datasets: DatasetNode[],
  applications: ApplicationNode[],
  platforms: PlatformNode[],
  appGrants: ResourceAccessGrant[],
  datasetGrants: DatasetAccessGrant[],
  subject: string,
  subjectClearance: Clearance,
  datasetId: string,
  requiredLevel: string,
  now: Date,
): DatasetAccessResult {
  const dataset = datasets.find((d) => d.id === datasetId);
  if (!dataset) {
    return { allow: false, visible: false, gates: [] };
  }
  return resolveDatasetAccess(
    subject,
    subjectClearance,
    dataset,
    applications,
    platforms,
    appGrants,
    datasetGrants,
    requiredLevel,
    now,
  );
}
