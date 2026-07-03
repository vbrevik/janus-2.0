// DemoRoot — final composition of the Foundation demo island (plan 01-04).
// WorldProvider wraps the whole tree; DemoBanner + RoleSwitcherHeader are SIBLINGS of
// <main> (outside the swappable region) so a future swapped view can never omit them (R7).
// Router-isolated by construction: imports no app router / generated route tree (D-02/R5).
import { useState } from "react";
import { WorldProvider } from "./store/world-state";
import { DemoBanner } from "./components/DemoBanner";
import { RoleSwitcherHeader } from "./components/RoleSwitcherHeader";
import { DecisionExplorer } from "./components/DecisionExplorer";
import { FederationHub } from "./components/FederationHub";
import { UnitConsolePanel } from "./components/UnitConsolePanel";
import { AuditView } from "./components/AuditView";
import { ContextView } from "./components/ContextView";
import { PhysicalAccessPanel } from "./components/physical-access-panel";
import { DigitalResourcesPanel } from "./components/digital-resources-panel";

type ActiveView =
  | "decisions"
  | "federation"
  | "entity-console"
  | "audit"
  | "context"
  | "physical-access"
  | "digital-resources";

export function DemoRoot() {
  const [activeView, setActiveView] = useState<ActiveView>("decisions");

  return (
    <WorldProvider>
      <div className="min-h-screen bg-slate-50 text-slate-800">
        <DemoBanner />
        <RoleSwitcherHeader />
        <div className="mx-auto max-w-5xl px-6 py-2 flex gap-2">
          <button
            className={`rounded px-3 py-1.5 text-sm ${activeView === "decisions" ? "bg-slate-800 text-white" : "border border-slate-300 text-slate-600 hover:bg-slate-50"}`}
            onClick={() => setActiveView("decisions")}
          >
            Decision Explorer
          </button>
          <button
            className={`rounded px-3 py-1.5 text-sm ${activeView === "federation" ? "bg-slate-800 text-white" : "border border-slate-300 text-slate-600 hover:bg-slate-50"}`}
            onClick={() => setActiveView("federation")}
          >
            Federation Hub
          </button>
          <button
            className={`rounded px-3 py-1.5 text-sm ${activeView === "entity-console" ? "bg-slate-800 text-white" : "border border-slate-300 text-slate-600 hover:bg-slate-50"}`}
            onClick={() => setActiveView("entity-console")}
          >
            Entity Console
          </button>
          <button
            className={`rounded px-3 py-1.5 text-sm ${activeView === "audit" ? "bg-slate-800 text-white" : "border border-slate-300 text-slate-600 hover:bg-slate-50"}`}
            onClick={() => setActiveView("audit")}
          >
            Audit
          </button>
          <button
            className={`rounded px-3 py-1.5 text-sm ${activeView === "context" ? "bg-slate-800 text-white" : "border border-slate-300 text-slate-600 hover:bg-slate-50"}`}
            onClick={() => setActiveView("context")}
          >
            Context
          </button>
          <button
            className={`rounded px-3 py-1.5 text-sm ${activeView === "physical-access" ? "bg-slate-800 text-white" : "border border-slate-300 text-slate-600 hover:bg-slate-50"}`}
            onClick={() => setActiveView("physical-access")}
          >
            Physical Access
          </button>
          <button
            className={`rounded px-3 py-1.5 text-sm ${activeView === "digital-resources" ? "bg-slate-800 text-white" : "border border-slate-300 text-slate-600 hover:bg-slate-50"}`}
            onClick={() => setActiveView("digital-resources")}
          >
            Digital Resources
          </button>
        </div>
        <main className="mx-auto max-w-5xl px-6 py-6">
          {activeView === "decisions" && <DecisionExplorer />}
          {activeView === "federation" && <FederationHub />}
          {activeView === "entity-console" && <UnitConsolePanel />}
          {activeView === "audit" && <AuditView />}
          {activeView === "context" && <ContextView />}
          {activeView === "physical-access" && <PhysicalAccessPanel />}
          {activeView === "digital-resources" && <DigitalResourcesPanel />}
        </main>
      </div>
    </WorldProvider>
  );
}
