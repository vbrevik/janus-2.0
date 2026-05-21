// DemoRoot — final composition of the Foundation demo island (plan 01-04).
// WorldProvider wraps the whole tree; DemoBanner + RoleSwitcherHeader are SIBLINGS of
// <main> (outside the swappable region) so a future swapped view can never omit them (R7).
// Router-isolated by construction: imports no app router / generated route tree (D-02/R5).
import { WorldProvider } from "./store/world-state";
import { DemoBanner } from "./components/DemoBanner";
import { RoleSwitcherHeader } from "./components/RoleSwitcherHeader";
import { DecisionExplorer } from "./components/DecisionExplorer";

export function DemoRoot() {
  return (
    <WorldProvider>
      <div className="min-h-screen bg-slate-50 text-slate-800">
        <DemoBanner />
        <RoleSwitcherHeader />
        <main className="mx-auto max-w-5xl px-6 py-6">
          <DecisionExplorer />
        </main>
      </div>
    </WorldProvider>
  );
}
