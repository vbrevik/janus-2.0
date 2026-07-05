// demo/hooks/use-datasets.ts — useIssueDatasetGrant (15-01, DATA-UI-04).
//
// Wraps the synchronous, in-memory ISSUE_DATASET_GRANT reducer dispatch
// (Phase 14 D-10: no backend for the dataset domain this milestone) with
// isPending/isError API-mutation-shape parity, matching v2.2's
// useIssueGrant/useIssueDelegate mutation-hook shape (15-CONTEXT D-10) —
// NOT wrapped in TanStack Query's useMutation, since a synchronous dispatch
// inside a mutationFn would resolve on the next microtick regardless of
// allow/deny and cannot naturally expose the denial signal below.
//
// canIssueDatasetGrant denial is silent by design (reducer returns the exact
// same state reference, `return state;` — proven by the existing passing
// test at world-state.test.tsx:373-389 asserting `toBe(state)`). Per React's
// documented useReducer bailout, an Object.is-equal returned state means
// React skips re-rendering AND skips firing effects — so a bare useEffect
// keyed on auditLog.length would hang isPending at true forever on denial
// (15-RESEARCH.md Pitfall 1). This hook uses the dual effect+timeout-fallback
// pattern to correctly resolve isPending/isError on both the allow and deny
// paths.

import { useEffect, useRef, useState } from "react";
import { useWorld, useWorldDispatch } from "../store/world-state";

export interface IssueDatasetGrantVariables {
  actorOrgId: string;
  actorPersonId: string;
  datasetId: string;
  personId: string;
  level: string;
  validFrom?: Date | null;
  validUntil?: Date | null;
}

export function useIssueDatasetGrant() {
  const world = useWorld();
  const dispatch = useWorldDispatch();
  const [isPending, setIsPending] = useState(false);
  const [isError, setIsError] = useState(false);

  // Tracks an in-flight call's "before" length + a settle guard so both the
  // success-effect and the fallback timer can't both resolve the same call.
  const pendingRef = useRef<{ beforeLen: number; settled: boolean } | null>(
    null,
  );

  // Success path: fires only when a NEW state commits (auditLog grew).
  useEffect(() => {
    const pending = pendingRef.current;
    if (
      pending &&
      !pending.settled &&
      world.datasets.auditLog.length > pending.beforeLen
    ) {
      pending.settled = true;
      setIsError(false);
      setIsPending(false);
    }
  }, [world.datasets.auditLog.length]);

  function mutate(vars: IssueDatasetGrantVariables): void {
    const beforeLen = world.datasets.auditLog.length;
    pendingRef.current = { beforeLen, settled: false };
    setIsPending(true);
    setIsError(false);

    dispatch({
      type: "ISSUE_DATASET_GRANT",
      actorOrgId: vars.actorOrgId,
      actorPersonId: vars.actorPersonId,
      datasetId: vars.datasetId,
      personId: vars.personId,
      level: vars.level,
      now: new Date(),
      validFrom: vars.validFrom,
      validUntil: vars.validUntil,
    });

    // Denial path: if the reducer bailed out (Object.is-equal state), React
    // never re-renders and the effect above never fires. This fallback marks
    // the call as denied once the current event-loop turn has fully flushed.
    setTimeout(() => {
      const pending = pendingRef.current;
      if (pending && !pending.settled) {
        pending.settled = true;
        setIsError(true);
        setIsPending(false);
      }
    }, 0);
  }

  return { mutate, isPending, isError };
}
