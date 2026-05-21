# Phase 1 — Demo Entry, Vite Build Wiring & Persistent Banner/Header

**Researched:** 2026-05-21
**Angle:** Isolated demo entry (`demo.html` + `src/demo/main.tsx`), Vite multi-entry wiring, router isolation, root-mounted `[DEMO / MOCK]` banner + global role-switcher header, reusable `[MOCK]` label.
**Confidence:** HIGH — every claim is verified by direct read of the repo files cited; Vite multi-entry behaviour cross-checked against official Rollup-input docs.

> Scope discipline: this note describes the exact files/edits needed. It does NOT write app code or edit `vite.config.ts`. Implementation is the planner's job.

---

## User Constraints (from CONTEXT.md, this angle only)

### Locked Decisions
- **D-02:** Build the consolidated demo under a **new `frontend/src/demo/` tree** served by **its own dev/build entry** (e.g. `demo.html`), **mirroring the isolated `spikes.html` pattern — NO `routeTree.gen.ts` changes.** Treat `frontend/src/spikes/` as historical/reference (delete later, not this phase).
- **D-08:** The operating-role switcher lives in a **persistent global header from Phase 1, co-located with the `[DEMO / MOCK]` banner**; current role is held in the shared world-state. Phase 4's shell **absorbs** this bar rather than rebuilding it.
- **MODEL-03 (REQUIREMENTS.md:16):** A persistent `[DEMO / MOCK]` banner is visible on **every** screen; every simulated/external trust signal is labelled `[MOCK]`.

### Claude's Discretion (from CONTEXT.md "Banner / `[MOCK]` mechanics")
- Implement the `[DEMO / MOCK]` banner as a **non-dismissable component mounted at the demo app root** (structurally on every screen, not per-route) and establish **one reusable `[MOCK]` label convention/component**. Exact styling/placement is flexible within "non-dismissable, on every screen".

### Deferred / Out of Scope for this angle
- **DEMO-04 (REQUIREMENTS.md:52, Phase 4):** "The demo builds in production (demo entry registered in the Vite build), not only in dev." The dev entry exists from Phase 1; the **prod-build Rollup input** registration is flagged below as a Phase-4 deliverable — but it's a one-line addition and is cheapest to land in Phase 1 (see Risk R1 / recommendation).
- Promoting the demo into TanStack Router / app auth flow — explicitly out of scope (REQUIREMENTS.md:70).

---

## Summary

The spikes already prove the exact isolation pattern this phase must mirror: a sibling HTML file at the Vite project root (`frontend/spikes.html`) points at a dedicated `src/spikes/main.tsx` that calls `createRoot(...).render(<Shell/>)` and imports the shared `../index.css`. The demo replicates this with `frontend/demo.html` + `frontend/src/demo/main.tsx`. Because the demo entry never imports `routeTree.gen.ts` or `@tanstack/react-router`, it is structurally off the router — no `routeTree.gen.ts` regeneration is required (D-02 satisfied by construction).

**One important nuance to surface to the planner:** the current `vite.config.ts` has **no `build.rollupOptions.input` block at all** (verified — read of all 30 lines; `grep` for `rollupOptions|input` returns nothing). This means `vite build` today bundles **only** `index.html` (Vite's default single entry). `spikes.html` works in *dev* purely because Vite's dev server serves any HTML at the project root, but it is **not** in the production bundle. Therefore: the dev entry needs **zero config** (just the two new files), and the *prod* build needs a `build.rollupOptions.input` map listing `index.html` + `demo.html`. That input map is the DEMO-04 (Phase 4) deliverable, but it's a 4-line change and landing it in Phase 1 costs nothing and de-risks Phase 4.

The `[DEMO / MOCK]` badge currently lives **inside** the spike `Shell` header markup (`Shell.tsx:37-39`) — i.e. per-component, which would silently disappear on any screen that doesn't render that Shell. The demo must **hoist** the banner + role-switcher into a single root layout wrapper composed in `src/demo/main.tsx` (or a `DemoRoot`/`DemoLayout` component it renders), so MODEL-03 and D-08 hold *by construction*, independent of which view is active.

**Primary recommendation:** Create `frontend/demo.html` (copy of `spikes.html` re-pointed to `/src/demo/main.tsx`) + `frontend/src/demo/main.tsx` (copy of the spikes entry rendering a new `DemoRoot` instead of `Shell`). Add a `build.rollupOptions.input` map to `vite.config.ts` listing both `index.html` and `demo.html` (do it now even though DEMO-04 is Phase 4). Mount banner + role switcher in `DemoRoot` *above* the routed/active view; add `npm run dev:demo`/`build` helper scripts. Establish a `<MockTag>` component as the single `[MOCK]` convention.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Demo page bootstrap | Browser / Client (Vite entry) | Build tool (Rollup input) | Pure SPA demo; no SSR, no backend. Entry is an HTML + `createRoot` pair. |
| Persistent banner + role switcher | Browser / Client (root layout) | — | React component mounted at demo root above the view; D-08/MODEL-03. |
| Multi-entry bundling | Build tool (Vite/Rollup) | — | `build.rollupOptions.input` selects which HTML files become bundles. |
| Router isolation | Build tool + Client | — | Demo entry never imports the generated route tree; TanStack plugin only scans `./src/routes`. |

---

## 1. Entry Recipe — exact files to create

Mirror the spikes entry **exactly**, swapping the path and the rendered root component. The spikes equivalents are tiny (`spikes.html` = 12 lines, `spikes/main.tsx` = 10 lines).

### File A — `frontend/demo.html` (NEW)

Model: `frontend/spikes.html:1-12`. The only structural difference from spikes is the `<script src>` target and the `<title>`.

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Janus — Authorization Hub (DEMO/MOCK)</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/demo/main.tsx"></script>
  </body>
</html>
```

Cited substrate:
- `frontend/spikes.html:9` — `<div id="root"></div>` (same root id; demo reuses it — they never coexist in one document so no collision).
- `frontend/spikes.html:10` — `<script type="module" src="/src/spikes/main.tsx"></script>` → demo points at `/src/demo/main.tsx`.
- `frontend/spikes.html:6` — title carries the `(DEMO/MOCK)` framing; keep it for the browser-tab label.

### File B — `frontend/src/demo/main.tsx` (NEW)

Model: `frontend/src/spikes/main.tsx:1-10` verbatim except it renders `<DemoRoot />` instead of `<Shell />` and the import path adjusts.

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../index.css";          // shared Tailwind/shadcn tokens — same import the spikes use
import { DemoRoot } from "./DemoRoot";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <DemoRoot />
  </StrictMode>,
);
```

Cited substrate:
- `frontend/src/spikes/main.tsx:3` — `import "../index.css";` — the spikes pull in the shared stylesheet via a relative path from `src/spikes/`; from `src/demo/` the relative path is identical (`../index.css`). **Keep this import** — it is what gives the demo Tailwind base + the shadcn CSS variables (`src/index.css:1-59`).
- `frontend/src/spikes/main.tsx:6-9` — `createRoot(document.getElementById("root")!).render(<StrictMode>…)` — copy the StrictMode wrapper.
- `frontend/src/spikes/main.tsx:4` — spikes import `Shell`; demo imports the new root layout component instead (named `DemoRoot` here; planner may name it `DemoLayout` — see §4).

> Naming note: project convention (`CLAUDE.md` → "React components: PascalCase") — `DemoRoot.tsx`/`DemoLayout.tsx` are PascalCase like the existing `Shell.tsx`, `Spike001Abac.tsx`. The spike components dir uses PascalCase filenames, so the demo's components may follow that local convention rather than the kebab-case used under `src/routes`/`src/components` (the demo tree is its own island — match the spikes' local style, which is what D-02 says to mirror).

---

## 2. Vite Config Change — register the new HTML entry as a Rollup input

### Current state (verified)

`frontend/vite.config.ts` (full file, 30 lines) has **no `build` key and no `rollupOptions.input`**. Relevant current lines:

```ts
// frontend/vite.config.ts:7-23 (current)
export default defineConfig({
  plugins: [
    react(),
    TanStackRouterVite({
      routesDirectory: "./src/routes",
      generatedRouteTree: "./src/routeTree.gen.ts",
    }),
  ],
  server: {
    port: 15510,
    host: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // test: { ... }  (lines 24-29)
});
```

**Consequence:** `vite build` (run via `npm run build` = `tsc -b && vite build`) currently emits **only** `index.html`'s graph. `spikes.html` is dev-only and **not** in the prod bundle. So:

- **Dev (`vite dev`, this phase):** no config change needed — `vite dev` serves `demo.html` at `http://localhost:15510/demo.html` the instant the file exists, exactly like `/spikes.html` works today.
- **Prod build (DEMO-04, Phase 4):** you MUST add a `build.rollupOptions.input` map. The moment you add a `rollupOptions.input` you must list `index.html` explicitly too, otherwise the default `index.html` entry is dropped from the build.

### Precise diff shape (recommended to land in Phase 1)

Add a single `build` block inside `defineConfig({...})`. Use `path.resolve` (Rollup multi-entry inputs should be absolute or it resolves relative to CWD; absolute is the documented, safest form). `path` is already imported (`vite.config.ts:4`).

```diff
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
+ build: {
+   rollupOptions: {
+     input: {
+       main: path.resolve(__dirname, "index.html"),
+       demo: path.resolve(__dirname, "demo.html"),
+       // spikes: path.resolve(__dirname, "spikes.html"), // optional — keep dev-only or include while spikes survive
+     },
+   },
+ },
  test: {
```

Notes for the planner:
- **`main` MUST be listed.** Once `rollupOptions.input` is an object, Vite stops auto-including `index.html`; omitting `main` would silently break the main app's production build (Risk R3).
- Output filenames derive from the input keys — `main`/`demo` are conventional and produce stable chunk names. Per Vite docs, when input is an object the HTML outputs land at `dist/index.html` and `dist/demo.html` respectively (Vite preserves the HTML file's basename for HTML inputs, the key is used for the JS chunk naming).
- **`spikes.html`:** currently dev-only and *not* in any build. You have three options: (a) leave it unlisted (stays dev-only, current behaviour, will eventually 404 in prod — fine, D-02 says spikes are being retired); (b) list it too while it still exists; (c) delete `spikes.html`+`src/spikes/` in a later cleanup (deferred per CONTEXT.md:108). Recommendation: leave `spikes.html` unlisted (option a) — it keeps the prod bundle lean and matches the "stop maintaining spikes" decision.
- **Why land it now (Phase 1) even though DEMO-04 is Phase 4:** the change is 4 lines, has zero runtime cost, and removes a hidden footgun where Phase 4 discovers the demo "works in dev but vanishes in prod." If the planner prefers strict phase hygiene, the *minimum* Phase-1 change is the two new files only (dev works with no config edit); the `build` block is then a Phase-4 task. Flagging both paths; recommend landing now.

### Helper scripts (optional, `frontend/package.json`)

Current scripts (`package.json:6-13`) have `dev`, `build`, `preview`. `vite dev` serves all root HTML simultaneously, so no separate dev script is strictly required (just open `/demo.html`). For discoverability you may add:

```jsonc
"dev:demo": "vite --open /demo.html",
"preview:demo": "vite preview --open /demo.html"
```

These are conveniences, not requirements. `npm run build` already covers the demo once the `input` map exists.

---

## 3. Router Isolation — confirmed, no `routeTree.gen.ts` change

**Verified isolation by construction:**
- The demo entry chain is `demo.html` → `src/demo/main.tsx` → `DemoRoot` → demo views. **None** of these import `@tanstack/react-router`, `RouterProvider`, or `./routeTree.gen.ts`. The spikes prove the pattern: `src/spikes/main.tsx` (10 lines) renders `<Shell/>` with plain `useState` tab switching (`Shell.tsx:26`) and zero router involvement.
- The TanStack Router Vite plugin only **generates** `routeTree.gen.ts` from files under `./src/routes` (`vite.config.ts:11` — `routesDirectory: "./src/routes"`). The demo tree lives at `./src/demo`, **outside** the scanned directory, so the plugin never touches it and `routeTree.gen.ts` is never regenerated on account of the demo. [VERIFIED: vite.config.ts:10-13]
- **No new route dirs**, so the CLAUDE.md rule ("new route dirs committed before regen") does not apply — the demo adds nothing under `src/routes`.

**Conclusion:** D-02's "NO `routeTree.gen.ts` changes" is satisfied automatically. The only thing to watch (Risk R2) is that the demo must NOT be wired into `src/main.tsx`/`__root.tsx`/`src/routes`.

---

## 4. Persistent Banner + Header — root-mounted structure

### The problem with the spikes' current placement

The `[DEMO / MOCK]` badge today is **inline markup inside the spike Shell's `<header>`** (`Shell.tsx:37-39`):

```tsx
// Shell.tsx:37-39 — per-component, NOT structural
<span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
  DEMO / MOCK
</span>
```

That works for the spikes because *every* spike renders through that one Shell. But MODEL-03 + D-08 require the banner/role-switcher to be present on **every screen by construction** — independent of the active view. So the demo must hoist them above the view into a root layout.

### Recommended component structure

Compose a thin root layout that wraps whatever view is active. The view region is the only thing that changes; banner + role header are siblings rendered *outside* the swappable region.

```
src/demo/main.tsx
  └─ <DemoRoot/>                         // owns the world-state store (useReducer, MODEL-02) via context/provider
       ├─ <DemoBanner/>                  // non-dismissable [DEMO / MOCK] strip — sticky top, always rendered
       ├─ <RoleSwitcherHeader/>          // operating-role <select> (1 of 8); reads/writes role in the store (D-08)
       └─ <main> {activeView} </main>    // Phase 1 = <DecisionExplorer/> (D-09); Phase 4 shell absorbs this bar
```

Key structural rules for the planner:
- **`DemoBanner` and `RoleSwitcherHeader` are rendered by `DemoRoot`, never by individual views.** This is what makes "on every screen" a structural guarantee rather than a per-view discipline (MODEL-03). A view cannot accidentally omit them.
- **Non-dismissable:** the banner has **no close button and no dismiss state**. Recommend `sticky top-0 z-50` so it stays pinned while content scrolls. (Discretion per CONTEXT.md:43 — styling is flexible; the only hard constraints are "non-dismissable" and "every screen".)
- **Role switcher reads/writes the shared store, not local state** (D-08: "current role is held in the shared world-state"). The header is a thin control bound to `state.operatingRole` + a `SET_OPERATING_ROLE` action. Source the 8 roles from the lifted `ROLES` map (`spikes/lib/data.ts` → `ROLES`, per roles-sod.md:11). Do NOT use `useState` for the role — that would break MODEL-02 single-source-of-truth and D-08.
- **Phase-4 absorption (D-08):** keep `DemoBanner` + `RoleSwitcherHeader` as standalone components so Phase 4's coherent shell can *re-host* this same bar rather than rebuild it. Avoid baking nav/tabs into them now (DEMO-01 forbids per-mechanism tabs — do **not** copy the spike `Shell`'s `<nav>` tab strip at `Shell.tsx:48-60`).

### Styling substrate to reuse

Reuse the spikes' plain-Tailwind chrome idiom (the demo already inherits the same `index.css`):
- Banner colours: amber set already used by the spikes — `bg-amber-100 text-amber-900` (`Shell.tsx:38`, `ui.tsx:16`). A more assertive full-width strip (e.g. `bg-amber-400 text-amber-950`) reads better as a persistent "this is a mock" warning; discretion.
- Header shell: `border-b border-slate-200 bg-white` + a centered container (`Shell.tsx:31-32`) is the established look.
- shadcn tokens (`--background`, `--foreground`, etc. in `src/index.css:6-49`) are available because the demo imports `../index.css` — the demo *may* use shadcn components, but the spikes deliberately used plain Tailwind ("no app coupling", `ui.tsx:1`). Recommend the demo follow the spikes' plain-Tailwind approach for its own island components to avoid pulling app `src/components/ui/*` into the demo bundle.

### Reusable `[MOCK]` label convention

Establish **one** component as the single convention for tagging simulated/external trust signals (MODEL-03 second clause). Model it on the existing `Pill` (`ui.tsx:5-26`):

```tsx
// e.g. src/demo/components/MockTag.tsx
export function MockTag({ children = "MOCK" }: { children?: ReactNode }) {
  return (
    <span className="inline-block rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900">
      [{children}]
    </span>
  );
}
```

Usage convention to document for downstream phases: **any externally-sourced or simulated trust signal** (signed credential, issuer trust, federated attribute, external clearance value) renders a `<MockTag/>` next to it. Phases 2–3 (FED-03 signed creds, CTX-01 release policy) lean on this — establishing the single component now prevents ad-hoc `[MOCK]` strings later. Could alternatively extend the existing `Pill` with a `mock` tone, but a dedicated named component makes intent greppable.

---

## 5. Risks

| # | Risk | Likelihood | Mitigation |
|---|------|-----------|------------|
| **R1** | **Demo "works in dev, vanishes in prod."** The current config has no `rollupOptions.input`, so `vite build` ignores `demo.html`. If left until Phase 4 and forgotten, the prod demo 404s. | HIGH if not addressed | Land the `build.rollupOptions.input` map (with `main` + `demo`) in Phase 1 even though DEMO-04 is Phase 4. Verify with `npm run build && ls dist/demo.html`. |
| **R2** | **Demo leaks into the main app build.** If anyone imports a demo module from `src/main.tsx`, `__root.tsx`, or any `src/routes/*` file, demo code (and its seed data) gets pulled into the main app bundle and onto the TanStack router. | MEDIUM | Keep the demo tree an island: demo imports go demo→demo and demo→shared (`index.css`, possibly `lib/utils`). Nothing under `src/routes`/`src/main.tsx`/`__root.tsx` may import from `src/demo`. Add a verification grep in the plan: `grep -rn "src/demo\|/demo/" src/routes src/main.tsx src/components` must be empty. |
| **R3** | **Adding `rollupOptions.input` drops the main entry.** Once `input` is an object, Vite no longer auto-includes `index.html`. Forgetting the `main` key silently breaks the production app. | MEDIUM | Always list `main: …/index.html` alongside `demo`. Smoke-test: `npm run build` then confirm both `dist/index.html` and `dist/demo.html` exist. |
| **R4** | **Tailwind/shadcn config sharing.** Tailwind scans `./index.html` + `./src/**/*.{js,ts,jsx,tsx}` (`tailwind.config.js:4-7`). The demo lives under `src/`, so its classes ARE scanned automatically. But `demo.html` is **not** in the `content` glob (only `./index.html` is listed). | LOW | Tailwind's `content` controls *class extraction*, not entry registration — and `demo.html` contains no Tailwind classes (just a `<div id="root">`), so the omission is harmless. If the planner ever adds utility classes directly in `demo.html`, add `"./demo.html"` to `tailwind.config.js` content. Flag but no action needed now. |
| **R5** | **Single `index.css` import duplication.** Both the main app (`src/main.tsx`) and the demo (`src/demo/main.tsx`) import the same `index.css`. In separate bundles this is correct (each entry needs its own CSS). | LOW | None — this is the intended multi-entry behaviour; each HTML entry gets its own emitted CSS. No shared global-state collision because they are separate documents/bundles. |
| **R6** | **Banner placed per-view instead of at root** (repeating the spike `Shell.tsx:37` mistake). A future view added in Phase 4 could forget the banner. | MEDIUM | Mount `DemoBanner`/`RoleSwitcherHeader` in `DemoRoot` *outside* the swappable view region (§4). Make it impossible for a view to omit them. |
| **R7** | **`#root` id reuse across `index.html`/`spikes.html`/`demo.html`.** All three use `<div id="root">`. | NONE | They are separate documents loaded independently; the id never collides at runtime. No action. |

---

## Sources

### Primary (HIGH confidence — direct repo reads)
- `frontend/spikes.html:1-12` — isolated entry HTML template to mirror.
- `frontend/src/spikes/main.tsx:1-10` — `createRoot`/`StrictMode`/`../index.css` entry pattern.
- `frontend/vite.config.ts:1-30` — confirmed NO `build.rollupOptions.input`; plugins/alias/test config.
- `frontend/src/spikes/components/Shell.tsx:30-65` — current banner placement (`:37-39`) + tab nav (`:48-60`, do NOT copy).
- `frontend/src/spikes/components/ui.tsx:5-26` — `Pill` to model `MockTag` on; amber tones.
- `frontend/index.html:1-13`, `frontend/src/index.css:1-59`, `frontend/tailwind.config.js:1-61`, `frontend/tsconfig.app.json:1-35`, `frontend/package.json:1-55` — main entry, shared CSS/Tailwind tokens, content globs, scripts.
- `.planning/phases/01-foundation/01-CONTEXT.md` — D-02, D-08, discretion clauses.
- `.planning/REQUIREMENTS.md:16,52,70` — MODEL-03, DEMO-04, router-isolation out-of-scope.
- `.claude/skills/spike-findings-janus-2.0/references/roles-sod.md:11-19` — `ROLES` ops map source for the role switcher.
- `bash`: `grep -rn "rollupOptions|build:|input:" vite.config.ts` → no matches (confirms single-entry default build).

### Secondary (MEDIUM — cross-check)
- Vite multiple-entry / `build.rollupOptions.input` behaviour (object input drops default `index.html` auto-inclusion; HTML inputs emit at their basename). Matches Rollup input-map semantics. [CITED: vite.dev/guide/build — "Multi-Page App"]

## Metadata
- Standard stack / config: HIGH (verified against the actual files, no training-data reliance).
- Banner/header structure: HIGH for the constraints (D-02/D-08/MODEL-03 read verbatim); MEDIUM for exact styling (explicitly Claude's discretion).
- **Research date:** 2026-05-21 · **Valid until:** stable until `vite.config.ts` or the spikes tree changes.
