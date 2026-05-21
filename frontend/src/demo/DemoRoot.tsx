// DemoRoot — placeholder root for the demo island (plan 01-01).
// Plan 01-04 REPLACES this file with WorldProvider + DemoBanner + RoleSwitcherHeader + DecisionExplorer.
// Router imports are excluded by construction — this chain is router-isolated (D-02).

export function DemoRoot() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="sticky top-0 border-b border-slate-200 bg-amber-100 px-6 py-2 text-xs font-medium text-amber-900">
        [DEMO / MOCK]
      </header>
      <main className="mx-auto max-w-5xl px-6 py-6">
        Decision Explorer mounts here (01-04).
      </main>
    </div>
  );
}
