// demo/hooks/use-datasets.test.ts — Vitest renderHook tests for
// useIssueDatasetGrant (15-01, DATA-UI-04).
//
// Diverges from use-digital-resources.test.ts's "pure helpers only" style
// (15-VALIDATION.md Wave 0 requirement): this hook has internal
// useState/useEffect, so it needs a real render harness. Precedent:
// src/hooks/use-websocket.test.ts (the only existing renderHook+act usage
// in this codebase).
//
// Fixtures mirror the existing passing reducer tests in
// world-state.test.tsx's "ISSUE_DATASET_GRANT action" describe block:
// - allow: actorOrgId "MILITARY_1" / actorPersonId "subj-1" (admin_org match)
// - deny: actorOrgId "INTEL" / actorPersonId "subj-3" (canIssueDatasetGrant
//   returns false)

import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createElement, type ReactNode } from "react";
import { useIssueDatasetGrant } from "./use-datasets";
import { WorldProvider } from "../store/world-state";

function wrapper({ children }: { children: ReactNode }) {
  return createElement(WorldProvider, null, children);
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useIssueDatasetGrant", () => {
  it("resolves isPending=false, isError=false on the allow path", () => {
    const { result } = renderHook(() => useIssueDatasetGrant(), { wrapper });

    act(() => {
      result.current.mutate({
        actorOrgId: "MILITARY_1",
        actorPersonId: "subj-1",
        datasetId: "ds-archive-caserecords",
        personId: "subj-2",
        level: "READER",
      });
    });

    act(() => {
      vi.advanceTimersByTime(0);
    });

    expect(result.current.isPending).toBe(false);
    expect(result.current.isError).toBe(false);
  });

  it("resolves isPending=false, isError=true on the deny path (Pitfall 1 fallback)", () => {
    const { result } = renderHook(() => useIssueDatasetGrant(), { wrapper });

    act(() => {
      result.current.mutate({
        actorOrgId: "INTEL",
        actorPersonId: "subj-3",
        datasetId: "ds-archive-caserecords",
        personId: "subj-2",
        level: "READER",
      });
    });

    act(() => {
      vi.advanceTimersByTime(0);
    });

    expect(result.current.isPending).toBe(false);
    expect(result.current.isError).toBe(true);
  });
});
