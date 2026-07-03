// demo/hooks/use-digital-resources.ts — React Query data layer for the
// Digital Resources tab (12-03).
//
// One tested place that knows how to: fetch+map the /world aggregate, issue a
// grant/delegate and reflect the server response back into WorldState, and
// decide token-presence / stored-role / loader-state for 12-04..12-06's UI.
//
// Auth convention: apiFetch reads localStorage.getItem("token") itself and
// injects the Bearer header — the hooks only need to know whether a token
// EXISTS (to gate `enabled`), never the token value. localStorage keys
// ("token" raw string, "user" JSON {id, username, role}) mirror exactly what
// auth-context.tsx writes.
//
// Fail-loud loader contract (12-UI-SPEC state machine): the query sets
// retry: false and there is no seedWorld()-derived fallback — when the API is
// unreachable or unauthorized, classifyLoaderState resolves to an explicit
// non-success state; stale/hardcoded data is never presented as live.

import { useQuery, useMutation } from "@tanstack/react-query";
import { apiFetch, ApiError } from "@/lib/api";
import type { ApiResponse } from "@/types/api";
import {
  mapWorldResponse,
  parseNullableDate,
  type DigitalResourceWorldResponse,
  type RawResourceAccessGrant,
  type RawResourceAccessDelegate,
} from "../lib/digital-resource-mapper";
import type {
  DigitalResourceWorld,
  ResourceAccessGrant,
  ResourceAccessDelegate,
} from "../lib/model";
import { useWorldDispatch } from "../store/world-state";

// --- Pure helpers (unit-tested; no React dependency) ---

// True iff the main app has a stored auth token (same "token" key apiFetch reads).
export function hasStoredToken(): boolean {
  return !!localStorage.getItem("token");
}

// Reads the main app's stored "user" JSON and returns its .role, or null on
// missing/malformed/role-less values — never throws. Single source of truth
// for the admin-only issuing gate (12-CONTEXT D-01).
export function getStoredUserRole(): string | null {
  const raw = localStorage.getItem("user");
  if (raw === null) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof (parsed as { role?: unknown }).role === "string"
    ) {
      return (parsed as { role: string }).role;
    }
    return null;
  } catch {
    return null;
  }
}

// The six mutually-exclusive loader states 12-UI-SPEC.md's state machine pins.
export type LoaderState =
  "missing-token" | "loading" | "unauthorized" | "error" | "empty" | "success";

// Structurally compatible with UseQueryResult — callers pass the query result
// straight through, no adapter.
export interface LoaderSnapshot {
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  isSuccess: boolean;
  data: DigitalResourceWorld | undefined;
}

export function classifyLoaderState(
  hasToken: boolean,
  snapshot: LoaderSnapshot,
): LoaderState {
  if (!hasToken) return "missing-token";
  if (snapshot.isLoading) return "loading";
  if (snapshot.isError) {
    return snapshot.error instanceof ApiError && snapshot.error.status === 401
      ? "unauthorized"
      : "error";
  }
  if (snapshot.isSuccess && snapshot.data) {
    const d = snapshot.data;
    return d.networks.length === 0 &&
      d.platforms.length === 0 &&
      d.applications.length === 0
      ? "empty"
      : "success";
  }
  // Brief window before the query has started when `enabled` just flipped true.
  return "loading";
}

// --- World query ---

export function useDigitalResourcesWorld(hasToken: boolean) {
  return useQuery({
    queryKey: ["digital-resources", "world"],
    queryFn: async () =>
      mapWorldResponse(
        (
          await apiFetch<ApiResponse<DigitalResourceWorldResponse>>(
            "/api/digital-resources/world",
          )
        ).data,
      ),
    enabled: hasToken,
    retry: false,
    refetchOnWindowFocus: false,
  });
}

// --- Issue mutations ---
// Variables mirror the backend's Rocket request structs field-for-field
// (backend/src/digital_resources/models.rs IssueGrantRequest /
// IssueDelegateRequest). actor_org_id / granted_by_org_id are vestigial for
// authz server-side (12-RESEARCH Pitfall 4) but REQUIRED by JSON
// deserialization, so they stay in the variables types even though no form
// field maps to them directly.

export interface IssueGrantVariables {
  resource_id: string;
  person_id: string;
  actor_org_id: string;
  valid_from: string | null;
  valid_until: string | null;
}

export interface IssueDelegateVariables {
  resource_id: string;
  delegate_type: "PERSON";
  delegate_person_id: string;
  delegate_org_id: null;
  granted_by_org_id: string;
  valid_from: string | null;
  valid_until: string | null;
}

function mapGrantResponse(raw: RawResourceAccessGrant): ResourceAccessGrant {
  return {
    id: raw.id,
    person_id: raw.person_id,
    resource_id: raw.resource_id,
    valid_from: parseNullableDate(raw.valid_from),
    valid_until: parseNullableDate(raw.valid_until),
  };
}

function mapDelegateResponse(
  raw: RawResourceAccessDelegate,
): ResourceAccessDelegate {
  return {
    id: raw.id,
    resource_id: raw.resource_id,
    delegate_type: raw.delegate_type,
    delegate_person_id: raw.delegate_person_id,
    delegate_org_id: raw.delegate_org_id,
    granted_by_org_id: raw.granted_by_org_id,
    valid_from: parseNullableDate(raw.valid_from),
    valid_until: parseNullableDate(raw.valid_until),
  };
}

// POSTs a new grant; on success upserts the server's response into WorldState
// (reducer's replace-or-append by id guarantees duplicate-submit silence).
export function useIssueGrant() {
  const dispatch = useWorldDispatch();
  return useMutation({
    mutationFn: async (variables: IssueGrantVariables) =>
      mapGrantResponse(
        (
          await apiFetch<ApiResponse<RawResourceAccessGrant>>(
            "/api/digital-resources/grants",
            { method: "POST", body: JSON.stringify(variables) },
          )
        ).data,
      ),
    onSuccess: (grant) => {
      dispatch({ type: "UPSERT_RESOURCE_GRANT", grant });
    },
  });
}

// Mirrors useIssueGrant for delegates.
export function useIssueDelegate() {
  const dispatch = useWorldDispatch();
  return useMutation({
    mutationFn: async (variables: IssueDelegateVariables) =>
      mapDelegateResponse(
        (
          await apiFetch<ApiResponse<RawResourceAccessDelegate>>(
            "/api/digital-resources/delegates",
            { method: "POST", body: JSON.stringify(variables) },
          )
        ).data,
      ),
    onSuccess: (delegate) => {
      dispatch({ type: "UPSERT_RESOURCE_DELEGATE", delegate });
    },
  });
}
