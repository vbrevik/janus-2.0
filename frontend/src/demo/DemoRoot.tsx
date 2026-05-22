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

type ActiveView = "explorer" | "federation";

export function DemoRoot() {
  // Interim view toggle (D2-04) — throwaway; Phase 4 shell replaces this
  const [activeView, setActiveView] = useState<ActiveView>("explorer");

  return (
    <WorldProvider>
      <div className="min-h-screen bg-slate-50 text-slate-800">
        <DemoBanner />
        <RoleSwitcherHeader />
        <div className="mx-auto max-w-5xl px-6 py-2 flex gap-2">
          <button
            className={`rounded px-3 py-1.5 text-sm ${activeView === "explorer" ? "bg-slate-800 text-white" : "border border-slate-300 text-slate-600 hover:bg-slate-50"}`}
            onClick={() => setActiveView("explorer")}
          >
            Decision Explorer
          </button>
          <button
            className={`rounded px-3 py-1.5 text-sm ${activeView === "federation" ? "bg-slate-800 text-white" : "border border-slate-300 text-slate-600 hover:bg-slate-50"}`}
            onClick={() => setActiveView("federation")}
          >
            Federation Hub
          </button>
        </div>
        <main className="mx-auto max-w-5xl px-6 py-6">
          {activeView === "explorer" ? <DecisionExplorer /> : <FederationHub />}
        </main>
      </div>
    </WorldProvider>
  );
}
