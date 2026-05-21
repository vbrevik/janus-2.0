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
  type AttrEvent,
  type AttrOp,
  type Compartment,
  type Domain,
  type HubPointer,
  type Resource,
  type RoleId,
  type Subject,
  type UnitId,
} from "../lib/model";
import { AGREEMENTS, HUB_INDEX, RESOURCES, SUBJECTS } from "../lib/seed";

export interface AbacTarget {
  subjectId: string;
  resourceId: string;
  domain: Domain;
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
    events: [],
    hubIndex: HUB_INDEX,
    currentRole: "ACCESS_APPROVER",
    // CA-1 clean-ALLOW triple: the first same-unit subject + resource + its domain.
    abacTarget: {
      subjectId: firstSubject.id,
      resourceId: firstResource.id,
      domain: firstResource.domain,
    },
    seq: 0,
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
  | { type: "REQUEST_ATTRIBUTE"; subjectId: string; value: Compartment };

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
      return {
        ...state,
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
