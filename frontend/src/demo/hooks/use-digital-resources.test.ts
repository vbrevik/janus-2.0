// demo/hooks/use-digital-resources.test.ts — Vitest unit tests for the three
// pure helpers (hasStoredToken, getStoredUserRole, classifyLoaderState).
//
// Scope (per 12-CONTEXT.md Claude's Discretion): pure helpers ONLY — no
// render tests for useDigitalResourcesWorld/useIssueGrant/useIssueDelegate
// (those would need a QueryClientProvider + WorldProvider harness, out of
// scope). jsdom provides a real localStorage; cleared in beforeEach.

import { describe, it, expect, beforeEach } from "vitest";
import { ApiError } from "@/lib/api";
import {
  hasStoredToken,
  getStoredUserRole,
  classifyLoaderState,
} from "./use-digital-resources";
import type { DigitalResourceWorld } from "../lib/model";

beforeEach(() => {
  localStorage.clear();
});

function emptyWorld(): DigitalResourceWorld {
  return {
    networks: [],
    platforms: [],
    applications: [],
    orgLinks: [],
    policies: [],
    policyAssignments: [],
    grants: [],
    delegates: [],
    disabledResourceGrantIds: new Set(),
  };
}

// Idle snapshot: nothing loading, no error, no data.
function idleSnapshot() {
  return {
    isLoading: false,
    isError: false,
    error: null as unknown,
    isSuccess: false,
    data: undefined as DigitalResourceWorld | undefined,
  };
}

describe("hasStoredToken", () => {
  it("returns false with an empty localStorage", () => {
    expect(hasStoredToken()).toBe(false);
  });

  it("returns true after a token is stored", () => {
    localStorage.setItem("token", "abc");
    expect(hasStoredToken()).toBe(true);
  });
});

describe("getStoredUserRole", () => {
  it("returns null with an empty localStorage", () => {
    expect(getStoredUserRole()).toBeNull();
  });

  it("returns null on malformed user JSON (never throws)", () => {
    localStorage.setItem("user", "not-json{");
    expect(getStoredUserRole()).toBeNull();
  });

  it("returns null when parsed user has no role field", () => {
    localStorage.setItem("user", JSON.stringify({ id: "1" }));
    expect(getStoredUserRole()).toBeNull();
  });

  it("returns the role string from a valid stored user", () => {
    localStorage.setItem(
      "user",
      JSON.stringify({ id: "1", username: "a", role: "admin" }),
    );
    expect(getStoredUserRole()).toBe("admin");
  });
});

describe("classifyLoaderState", () => {
  it("returns missing-token when hasToken is false, regardless of snapshot", () => {
    expect(classifyLoaderState(false, idleSnapshot())).toBe("missing-token");
    expect(
      classifyLoaderState(false, { ...idleSnapshot(), isLoading: true }),
    ).toBe("missing-token");
  });

  it("returns loading while the query is loading", () => {
    expect(
      classifyLoaderState(true, { ...idleSnapshot(), isLoading: true }),
    ).toBe("loading");
  });

  it("returns unauthorized on an ApiError with status 401", () => {
    expect(
      classifyLoaderState(true, {
        ...idleSnapshot(),
        isError: true,
        error: new ApiError("x", 401),
      }),
    ).toBe("unauthorized");
  });

  it("returns error on an ApiError with a non-401 status", () => {
    expect(
      classifyLoaderState(true, {
        ...idleSnapshot(),
        isError: true,
        error: new ApiError("x", 500),
      }),
    ).toBe("error");
  });

  it("returns error on a plain Error with no status", () => {
    expect(
      classifyLoaderState(true, {
        ...idleSnapshot(),
        isError: true,
        error: new Error("boom"),
      }),
    ).toBe("error");
  });

  it("returns empty when all three entity arrays are empty", () => {
    expect(
      classifyLoaderState(true, {
        ...idleSnapshot(),
        isSuccess: true,
        data: emptyWorld(),
      }),
    ).toBe("empty");
  });

  it("returns success when at least one network exists", () => {
    const world = emptyWorld();
    world.networks.push({
      id: "net-1",
      name: "MilNet",
      tier: "NETWORK",
      classification: "SECRET",
      org_links: [],
      policy_assignments: [],
    });
    expect(
      classifyLoaderState(true, {
        ...idleSnapshot(),
        isSuccess: true,
        data: world,
      }),
    ).toBe("success");
  });

  it("falls back to loading in the pre-start window (no flags set)", () => {
    expect(classifyLoaderState(true, idleSnapshot())).toBe("loading");
  });
});
