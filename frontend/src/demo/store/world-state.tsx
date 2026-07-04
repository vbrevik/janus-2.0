// demo/store/world-state.tsx — the single shared in-memory world-state store (MODEL-02).
// ONE useReducer holds the entire world behind the React.dev split-context pattern.
// Mutating actions return NEW subject objects (immutable update) so a downstream
// useMemo(evaluate) in the view invalidates (R2). Every mutation appends an AttrEvent
// (event-sourced, R6). The decision is DERIVED in the view, NEVER stored here.

import {
  createContext,
  useContext,
  useReducer,
  type Dispatch,
  type ReactNode,
} from "react";
import {
  ROLES,
  UNITS,
  canIssueDatasetGrant,
  type AttrEvent,
  type AttrOp,
  type Compartment,
  type Credential,
  type DatasetAccessDelegate,
  type DatasetAccessGrant,
  type DatasetAuditEntry,
  type DatasetNode,
  type Domain,
  type Envelope,
  type HubPointer,
  type PhysicalAccessGrant,
  type Resource,
  type ResourceAccessDelegate,
  type ResourceAccessGrant,
  type RoleId,
  type Subject,
  type UnitId,
  type ZoneAccessDelegate,
  type ZoneEntryLog,
  type ZoneNode,
  type ZoneVisitorPass,
} from "../lib/model";
import {
  AGREEMENTS,
  DATASET_DELEGATES,
  DATASET_GRANTS,
  DATASET_NODES,
  DELEGATES,
  ENTRY_LOGS,
  GRANTS,
  HUB_INDEX,
  INITIAL_EVENTS,
  RESOURCES,
  SUBJECTS,
  VISITOR_PASSES,
  ZONES,
} from "../lib/seed";
import { buildDiscoverEnvelopes, type DetailResult } from "../lib/contract";
import type { VerifyResult } from "../lib/credential";
import type { Principal } from "../lib/abac";
import type { DigitalResourceWorld } from "../lib/model";

export interface AbacTarget {
  subjectId: string;
  resourceId: string;
  domain: Domain;
}

export interface InboxEntry {
  seq: number;
  from: UnitId;
  subjectId: string;
  requester: Principal;
  verifyResult: VerifyResult;
  detailResult: DetailResult;
}

export interface OutboxEntry {
  seq: number;
  to: UnitId;
  subjectId: string;
  granted: boolean;
  record: Subject | null;
}

export interface WorldState {
  units: typeof UNITS;
  subjects: Subject[];
  resources: Resource[];
  agreements: [UnitId, UnitId][];
  events: AttrEvent[];
  hubIndex: HubPointer[];
  currentRole: RoleId;
  abacTarget: AbacTarget;
  seq: number;
  fedCredentials: { valid: Credential | null; rogue: Credential | null };
  fedRunStage: "IDLE" | "PUBLISHED" | "DISCOVERED" | "REQUESTED" | "RESPONDED";
  fedTranscript: Envelope[];
  fedInbox: Partial<Record<UnitId, InboxEntry[]>>;
  fedOutbox: Partial<Record<UnitId, OutboxEntry[]>>;
  fedVerifyResults: { valid: VerifyResult | null; rogue: VerifyResult | null };
  zones: ZoneNode[];
  grants: PhysicalAccessGrant[];
  delegates: ZoneAccessDelegate[];
  entryLogs: ZoneEntryLog[];
  visitorPasses: ZoneVisitorPass[];
  disabledGrantIds: Set<string>;
  digitalResources: DigitalResourceWorld;
  datasets: {
    nodes: DatasetNode[];
    grants: DatasetAccessGrant[];
    delegates: DatasetAccessDelegate[];
    auditLog: DatasetAuditEntry[];
  };
}

/** Build the initial world from the frozen seed (lazy-init for useReducer). */
export function seedWorld(): WorldState {
  const firstSubject = SUBJECTS[0];
  const firstResource = RESOURCES[0];
  return {
    units: UNITS,
    subjects: SUBJECTS,
    resources: RESOURCES,
    agreements: AGREEMENTS,
    events: INITIAL_EVENTS,
    hubIndex: HUB_INDEX,
    currentRole: "ACCESS_APPROVER",
    // CA-1 clean-ALLOW triple: the first same-unit subject + resource + its domain.
    abacTarget: {
      subjectId: firstSubject.id,
      resourceId: firstResource.id,
      domain: firstResource.domain,
    },
    seq: INITIAL_EVENTS.length,
    fedCredentials: { valid: null, rogue: null },
    fedRunStage: "IDLE",
    fedTranscript: [],
    fedInbox: {},
    fedOutbox: {},
    fedVerifyResults: { valid: null, rogue: null },
    zones: [...ZONES],
    grants: [...GRANTS],
    delegates: [...DELEGATES],
    entryLogs: [...ENTRY_LOGS],
    visitorPasses: [...VISITOR_PASSES],
    disabledGrantIds: new Set<string>(),
    // Backend is the source of truth (Phase 11). These start empty; Phase 12
    // populates them via GET /api/digital-resources/world. Do NOT re-inline the
    // seed fixtures here — the DB serves the same 6-unit dataset (RSRC-BE-05).
    digitalResources: {
      networks: [],
      platforms: [],
      applications: [],
      orgLinks: [],
      policies: [],
      policyAssignments: [],
      grants: [],
      delegates: [],
      disabledResourceGrantIds: new Set<string>(),
    },
    datasets: {
      nodes: [...DATASET_NODES],
      grants: [...DATASET_GRANTS],
      delegates: [...DATASET_DELEGATES],
      auditLog: [],
    },
  };
}

export type Action =
  | { type: "SET_ROLE"; role: RoleId }
  | {
      type: "SET_TARGET";
      subjectId?: string;
      resourceId?: string;
      domain?: Domain;
    }
  | { type: "APPROVE_ATTRIBUTE"; subjectId: string; value: Compartment }
  | { type: "REVOKE_ATTRIBUTE"; subjectId: string; value: Compartment }
  | { type: "TOGGLE_SECURITY_HOLD"; subjectId: string }
  | { type: "REQUEST_ATTRIBUTE"; subjectId: string; value: Compartment }
  | { type: "AUTHORIZE_SUBJECT_ACTION"; subjectId: string }
  | { type: "WITHDRAW_AUTHORIZATION_ACTION"; subjectId: string }
  | { type: "CREDENTIALS_READY"; valid: Credential; rogue: Credential }
  | {
      type: "CREDENTIAL_VERIFY_RESULTS";
      validResult: VerifyResult;
      rogueResult: VerifyResult;
    }
  | {
      type: "FEDERATION_PUBLISH";
      from: UnitId;
      subjectId: string;
      domain: Domain;
    }
  | { type: "FEDERATION_DISCOVER"; from: UnitId; subjectId: string }
  | {
      type: "FEDERATION_REQUEST_DETAIL";
      from: UnitId;
      to: UnitId;
      subjectId: string;
      requester: Principal;
    }
  | {
      type: "FEDERATION_RESPOND";
      verifyResult: VerifyResult;
      detailResult: DetailResult;
      requesterUnit: UnitId;
      holderUnit: UnitId;
      subjectId: string;
      requester: Principal;
    }
  | { type: "FEDERATION_RESET" }
  | { type: "TOGGLE_GRANT"; grantId: string }
  | { type: "TOGGLE_RESOURCE_GRANT"; resourceGrantId: string }
  | { type: "SET_DIGITAL_RESOURCES"; world: DigitalResourceWorld }
  | { type: "UPSERT_RESOURCE_GRANT"; grant: ResourceAccessGrant }
  | { type: "UPSERT_RESOURCE_DELEGATE"; delegate: ResourceAccessDelegate }
  | {
      type: "ISSUE_DATASET_GRANT";
      actorOrgId: string;
      actorPersonId: string;
      datasetId: string;
      personId: string;
      level: string;
      now: Date;
    };

/** Immutable subject clone — new object, new compartments array, new flags object. */
function cloneSubject(s: Subject): Subject {
  return { ...s, compartments: [...s.compartments], flags: { ...s.flags } };
}

/** Build one append-only event stamped with the next seq and the acting role's label. */
function appendEvent(
  state: WorldState,
  subjectId: string,
  op: AttrOp,
  value?: Compartment,
): AttrEvent {
  return {
    seq: state.seq + 1,
    subjectId,
    op,
    value,
    actor: ROLES[state.currentRole].label,
  };
}

export function reducer(state: WorldState, action: Action): WorldState {
  switch (action.type) {
    case "SET_ROLE":
      // View-selection only: no event, subjects referentially unchanged.
      return { ...state, currentRole: action.role };

    case "SET_TARGET": {
      // View-selection only: merge the defined fields; no event.
      const next: AbacTarget = { ...state.abacTarget };
      if (action.subjectId !== undefined) next.subjectId = action.subjectId;
      if (action.resourceId !== undefined) next.resourceId = action.resourceId;
      if (action.domain !== undefined) next.domain = action.domain;
      return { ...state, abacTarget: next };
    }

    case "APPROVE_ATTRIBUTE": {
      const subjects = state.subjects.map((s) => {
        if (s.id !== action.subjectId) return s;
        const clone = cloneSubject(s);
        if (!clone.compartments.includes(action.value))
          clone.compartments.push(action.value);
        return clone;
      });
      return {
        ...state,
        subjects,
        events: [
          ...state.events,
          appendEvent(
            state,
            action.subjectId,
            "GRANT_COMPARTMENT",
            action.value,
          ),
        ],
        seq: state.seq + 1,
      };
    }

    case "REVOKE_ATTRIBUTE": {
      const subjects = state.subjects.map((s) => {
        if (s.id !== action.subjectId) return s;
        const clone = cloneSubject(s);
        clone.compartments = clone.compartments.filter(
          (c) => c !== action.value,
        );
        return clone;
      });
      return {
        ...state,
        subjects,
        events: [
          ...state.events,
          appendEvent(
            state,
            action.subjectId,
            "REVOKE_COMPARTMENT",
            action.value,
          ),
        ],
        seq: state.seq + 1,
      };
    }

    case "TOGGLE_SECURITY_HOLD": {
      let turnedOn = false;
      const subjects = state.subjects.map((s) => {
        if (s.id !== action.subjectId) return s;
        const clone = cloneSubject(s);
        clone.flags.securityHold = !clone.flags.securityHold;
        turnedOn = clone.flags.securityHold;
        return clone;
      });
      return {
        ...state,
        subjects,
        events: [
          ...state.events,
          appendEvent(
            state,
            action.subjectId,
            turnedOn ? "SET_HOLD" : "CLEAR_HOLD",
          ),
        ],
        seq: state.seq + 1,
      };
    }

    case "REQUEST_ATTRIBUTE":
      // SoD crux: a request is LOGGED but mutates NOTHING. subjects array is the same
      // reference; only the event log + seq advance. The Manager cannot grant via the store.
      // REQUEST_COMPARTMENT (not GRANT_COMPARTMENT) ensures audit replay does NOT apply it.
      return {
        ...state,
        events: [
          ...state.events,
          appendEvent(
            state,
            action.subjectId,
            "REQUEST_COMPARTMENT",
            action.value,
          ),
        ],
        seq: state.seq + 1,
      };

    case "AUTHORIZE_SUBJECT_ACTION": {
      const subjects = state.subjects.map((s) => {
        if (s.id !== action.subjectId || !s.authorization) return s;
        const clone = cloneSubject(s);
        clone.authorization = { ...s.authorization, status: "AUTHORIZED" };
        return clone;
      });
      return {
        ...state,
        subjects,
        events: [
          ...state.events,
          appendEvent(state, action.subjectId, "AUTHORIZE_SUBJECT"),
        ],
        seq: state.seq + 1,
      };
    }

    case "WITHDRAW_AUTHORIZATION_ACTION": {
      const subjects = state.subjects.map((s) => {
        if (s.id !== action.subjectId || !s.authorization) return s;
        const clone = cloneSubject(s);
        clone.authorization = { ...s.authorization, status: "WITHDRAWN" };
        return clone;
      });
      return {
        ...state,
        subjects,
        events: [
          ...state.events,
          appendEvent(state, action.subjectId, "WITHDRAW_AUTHORIZATION"),
        ],
        seq: state.seq + 1,
      };
    }

    case "CREDENTIALS_READY":
      return {
        ...state,
        fedCredentials: { valid: action.valid, rogue: action.rogue },
      };

    case "CREDENTIAL_VERIFY_RESULTS":
      return {
        ...state,
        fedVerifyResults: {
          valid: action.validResult,
          rogue: action.rogueResult,
        },
      };

    case "FEDERATION_PUBLISH": {
      const envelope: Envelope = {
        kind: "PUBLISH",
        from: action.from,
        subjectId: action.subjectId,
        domain: action.domain,
      };
      return {
        ...state,
        fedTranscript: [...state.fedTranscript, envelope],
        fedRunStage: "PUBLISHED",
        seq: state.seq + 1,
      };
    }

    case "FEDERATION_DISCOVER": {
      const [discoverEnv, resultEnv] = buildDiscoverEnvelopes(
        action.from,
        action.subjectId,
        state.hubIndex,
      );
      return {
        ...state,
        fedTranscript: [...state.fedTranscript, discoverEnv, resultEnv],
        fedRunStage: "DISCOVERED",
        seq: state.seq + 1,
      };
    }

    case "FEDERATION_REQUEST_DETAIL": {
      const requestEnv: Envelope = {
        kind: "REQUEST_DETAIL",
        from: action.from,
        to: action.to,
        subjectId: action.subjectId,
        requester: action.requester as unknown,
      };
      return {
        ...state,
        fedTranscript: [...state.fedTranscript, requestEnv],
        fedRunStage: "REQUESTED",
        seq: state.seq + 1,
      };
    }

    case "FEDERATION_RESPOND": {
      const responseEnv: Envelope = {
        kind: "DETAIL_RESPONSE",
        to: action.requesterUnit,
        subjectId: action.subjectId,
        granted: action.detailResult.granted,
        decision: action.detailResult.decision as unknown,
        record: action.detailResult.record,
      };
      const inboxEntry: InboxEntry = {
        seq: state.seq + 1,
        from: action.requesterUnit,
        subjectId: action.subjectId,
        requester: action.requester,
        verifyResult: action.verifyResult,
        detailResult: action.detailResult,
      };
      const outboxEntry: OutboxEntry = {
        seq: state.seq + 1,
        to: action.holderUnit,
        subjectId: action.subjectId,
        granted: action.detailResult.granted,
        record: action.detailResult.record,
      };
      return {
        ...state,
        fedTranscript: [...state.fedTranscript, responseEnv],
        fedRunStage: "RESPONDED",
        fedInbox: {
          ...state.fedInbox,
          [action.holderUnit]: [
            ...(state.fedInbox[action.holderUnit] ?? []),
            inboxEntry,
          ],
        },
        fedOutbox: {
          ...state.fedOutbox,
          [action.requesterUnit]: [
            ...(state.fedOutbox[action.requesterUnit] ?? []),
            outboxEntry,
          ],
        },
        seq: state.seq + 1,
      };
    }

    case "FEDERATION_RESET":
      // D2-06 / Pitfall 7: ONLY clear fedTranscript + reset fedRunStage.
      // fedInbox and fedOutbox are append-only durable history — do NOT clear.
      return { ...state, fedTranscript: [], fedRunStage: "IDLE" };

    case "TOGGLE_GRANT": {
      // Immutable Set update — new Set() so React re-renders (Pitfall 2 guard).
      const next = new Set(state.disabledGrantIds);
      if (next.has(action.grantId)) next.delete(action.grantId);
      else next.add(action.grantId);
      return { ...state, disabledGrantIds: next };
    }

    case "TOGGLE_RESOURCE_GRANT": {
      // Immutable Set update — mirrors TOGGLE_GRANT pattern on the digital sub-object.
      const next = new Set(state.digitalResources.disabledResourceGrantIds);
      if (next.has(action.resourceGrantId)) next.delete(action.resourceGrantId);
      else next.add(action.resourceGrantId);
      return {
        ...state,
        digitalResources: {
          ...state.digitalResources,
          disabledResourceGrantIds: next,
        },
      };
    }

    case "SET_DIGITAL_RESOURCES":
      // Replace digitalResources wholesale, but preserve disabledResourceGrantIds:
      // it is client-only state, never sent by the server, and a fresh
      // mapWorldResponse() call always returns an empty Set — overwriting it here
      // would silently un-disable every previously-disabled grant on a refetch.
      return {
        ...state,
        digitalResources: {
          ...action.world,
          disabledResourceGrantIds:
            state.digitalResources.disabledResourceGrantIds,
        },
      };

    case "UPSERT_RESOURCE_GRANT": {
      const exists = state.digitalResources.grants.some(
        (g) => g.id === action.grant.id,
      );
      const grants = exists
        ? state.digitalResources.grants.map((g) =>
            g.id === action.grant.id ? action.grant : g,
          )
        : [...state.digitalResources.grants, action.grant];
      return {
        ...state,
        digitalResources: { ...state.digitalResources, grants },
      };
    }

    case "UPSERT_RESOURCE_DELEGATE": {
      const exists = state.digitalResources.delegates.some(
        (d) => d.id === action.delegate.id,
      );
      const delegates = exists
        ? state.digitalResources.delegates.map((d) =>
            d.id === action.delegate.id ? action.delegate : d,
          )
        : [...state.digitalResources.delegates, action.delegate];
      return {
        ...state,
        digitalResources: { ...state.digitalResources, delegates },
      };
    }

    case "ISSUE_DATASET_GRANT": {
      const dataset = state.datasets.nodes.find(
        (d) => d.id === action.datasetId,
      );
      if (!dataset) return state;

      const permitted = canIssueDatasetGrant(
        action.actorOrgId,
        action.actorPersonId,
        dataset,
        action.level,
        state.datasets.grants,
        state.datasets.delegates,
        action.now,
      );
      if (!permitted) return state;

      const grant: DatasetAccessGrant = {
        id: `ds-grant-${action.personId}-${action.datasetId}-${state.seq + 1}`,
        person_id: action.personId,
        dataset_id: action.datasetId,
        level: action.level,
        valid_from: null,
        valid_until: null,
      };
      const auditEntry: DatasetAuditEntry = {
        seq: state.seq + 1,
        timestamp: action.now,
        actor_person_id: action.actorPersonId,
        actor_org_id: action.actorOrgId,
        dataset_id: action.datasetId,
        person_id: action.personId,
        level: action.level,
      };
      return {
        ...state,
        datasets: {
          ...state.datasets,
          grants: [...state.datasets.grants, grant],
          auditLog: [...state.datasets.auditLog, auditEntry],
        },
        seq: state.seq + 1,
      };
    }

    default:
      return state;
  }
}

const WorldStateContext = createContext<WorldState | undefined>(undefined);
const WorldDispatchContext = createContext<Dispatch<Action> | undefined>(
  undefined,
);

export function WorldProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, seedWorld);
  return (
    <WorldStateContext.Provider value={state}>
      <WorldDispatchContext.Provider value={dispatch}>
        {children}
      </WorldDispatchContext.Provider>
    </WorldStateContext.Provider>
  );
}

export function useWorld(): WorldState {
  const context = useContext(WorldStateContext);
  if (context === undefined) {
    throw new Error("useWorld must be used within a WorldProvider");
  }
  return context;
}

export function useWorldDispatch(): Dispatch<Action> {
  const context = useContext(WorldDispatchContext);
  if (context === undefined) {
    throw new Error("useWorldDispatch must be used within a WorldProvider");
  }
  return context;
}

export function useCurrentRole(): RoleId {
  return useWorld().currentRole;
}

export function useAbacTarget(): AbacTarget {
  return useWorld().abacTarget;
}
