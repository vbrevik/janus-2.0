// physical-access-panel.tsx — Physical Access tab: inner sub-nav + three zone views.
// Sub-nav pattern matches outer DemoRoot tab bar but uses px-4 py-2 (larger touch target per UI-SPEC).
// Zone data accessed via useWorld() inside child components, not passed as props.
import { useState } from "react";
import { ZoneBrowser } from "./zone-browser";
import { AccessResolutionExplorer } from "./access-resolution-explorer";
import { ZoneEntryLogView } from "./zone-entry-log-view";

type PhysicalView = "zone-browser" | "access-resolution" | "entry-log";

export function PhysicalAccessPanel() {
  const [activeView, setActiveView] = useState<PhysicalView>("zone-browser");

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          className={`rounded px-4 py-2 text-sm ${activeView === "zone-browser" ? "bg-slate-800 text-white" : "border border-slate-300 text-slate-600 hover:bg-slate-50"}`}
          onClick={() => setActiveView("zone-browser")}
        >
          Zone Browser
        </button>
        <button
          className={`rounded px-4 py-2 text-sm ${activeView === "access-resolution" ? "bg-slate-800 text-white" : "border border-slate-300 text-slate-600 hover:bg-slate-50"}`}
          onClick={() => setActiveView("access-resolution")}
        >
          Access Resolution
        </button>
        <button
          className={`rounded px-4 py-2 text-sm ${activeView === "entry-log" ? "bg-slate-800 text-white" : "border border-slate-300 text-slate-600 hover:bg-slate-50"}`}
          onClick={() => setActiveView("entry-log")}
        >
          Entry Log
        </button>
      </div>
      {activeView === "zone-browser" && <ZoneBrowser />}
      {activeView === "access-resolution" && <AccessResolutionExplorer />}
      {activeView === "entry-log" && <ZoneEntryLogView />}
    </div>
  );
}
