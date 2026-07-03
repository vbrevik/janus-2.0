// digital-resources-panel.tsx — Digital Resources tab: 6-state loader gate + inner sub-nav.
// Fetches the /world aggregate on mount (token-gated), dispatches SET_DIGITAL_RESOURCES
// on success, and renders exactly ONE of the six mutually-exclusive loader states per
// 12-UI-SPEC.md. No seed/hardcoded fallback: every non-success state names its cause.
// Dispatch happens via useEffect (React Query v5 useQuery has no onSuccess — 12-RESEARCH Pitfall 3).
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  hasStoredToken,
  useDigitalResourcesWorld,
  classifyLoaderState,
  type LoaderState,
} from "../hooks/use-digital-resources";
import { useWorldDispatch } from "../store/world-state";
import { ResourceBrowser } from "./resource-browser";
import { ResourceAccessExplorer } from "./resource-access-explorer";

type DigitalView = "resource-browser" | "access-resolution";

export function DigitalResourcesPanel() {
  const hasToken = hasStoredToken();
  const query = useDigitalResourcesWorld(hasToken);
  const dispatch = useWorldDispatch();
  const state: LoaderState = classifyLoaderState(hasToken, query);
  const [activeView, setActiveView] = useState<DigitalView>("resource-browser");

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
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          className={`rounded px-4 py-2 text-sm ${activeView === "resource-browser" ? "bg-slate-800 text-white" : "border border-slate-300 text-slate-600 hover:bg-slate-50"}`}
          onClick={() => setActiveView("resource-browser")}
        >
          Resource Browser
        </button>
        <button
          className={`rounded px-4 py-2 text-sm ${activeView === "access-resolution" ? "bg-slate-800 text-white" : "border border-slate-300 text-slate-600 hover:bg-slate-50"}`}
          onClick={() => setActiveView("access-resolution")}
        >
          Access Resolution
        </button>
      </div>
      {activeView === "resource-browser" && <ResourceBrowser />}
      {activeView === "access-resolution" && <ResourceAccessExplorer />}
    </div>
  );
}
