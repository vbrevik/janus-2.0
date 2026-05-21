// demo/components/DemoBanner.tsx — structural, permanent [DEMO / MOCK] banner.
// R7/MODEL-03: no hide control and no local state — the user cannot remove it; permanent
// by construction. Lives outside the swappable region so no view can ever omit it.
export function DemoBanner() {
  return (
    <div className="sticky top-0 z-50 border-b border-amber-200 bg-amber-100 text-amber-900">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-3 gap-y-1 px-6 py-2">
        <span className="rounded bg-amber-200 px-2 py-0.5 text-xs font-bold uppercase tracking-wide">
          [DEMO / MOCK]
        </span>
        <span className="text-xs">
          Seeded, in-memory world-state — every value is simulated. Nothing here
          is a real authorization decision.
        </span>
      </div>
    </div>
  );
}
