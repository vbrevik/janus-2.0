# Stack Research

**Domain:** In-browser ABAC authorization-hub demo (no backend, no persistence)
**Researched:** 2026-05-21
**Confidence:** HIGH — entire stack is already present and running; question is wiring, not new choices

---

## Decision: Keep the spikes.html entry, do not promote to TanStack routes

**Verdict:** Extend the existing `frontend/spikes.html` → `src/spikes/` subtree. Do NOT add the demo
to TanStack Router routes.

**Rationale:**

The spikes already work as a coherent app: one HTML entry, one `Shell` component with tabs, all
9 spike panels loaded. The shell-with-tabs model is *exactly right* for a demo that must show each
mechanism independently and composable together. Promoting to TanStack routes would mean:

1. Touching `routeTree.gen.ts` (auto-generated — any hand-edit is invalid; must regenerate on every
   file-system change).
2. Pulling the demo into the real app's auth flow (JWT, ProtectedRoute guards) — breaking the
   "DEMO/MOCK, no real backend" constraint.
3. Adding route-level lazy loading complexity for no benefit at demo scale.

The spikes.html is already registered as a Vite multi-entry point (it resolves via the dev server
at `/spikes.html` and is a separate production build entry). Keep that model.

---

## Recommended Stack

### Core Technologies — all already installed, zero new installs needed

| Technology | Version (installed) | Purpose | Why |
|------------|---------------------|---------|-----|
| React 19 | 19.1.1 | UI rendering | Already in use; no alternative |
| Vite 7 | 7.1.7 | Dev server + build | Already in use; provides `spikes.html` as a second entry via `rolldownOptions.input` (Vite 7 uses Rolldown, not Rollup — important for config) |
| TypeScript | ~5.9.3 | Type safety | Already in use |
| Tailwind CSS | 3.4.x | Styling | Already in use; spike UI uses raw Tailwind utility classes — no shadcn required in the demo subtree |
| Vitest | 4.0.x | Unit tests for engine code | Already in use; all spike `*.test.ts` files run via `npm test` |
| Web Crypto API | (browser built-in) | HMAC-SHA256 signing in credential.ts (spike 006) | Already used; no library needed — `crypto.subtle` is available in all modern browsers and in jsdom ≥ 28 |

### Supporting Libraries — already installed, confirm these are being used

| Library | Version | Purpose | When Used |
|---------|---------|---------|-----------|
| `clsx` + `tailwind-merge` | 2.1.1 / 3.3.1 | Class merging | Available if spike components need conditional classes; not yet imported in spikes/ but zero cost to use |
| `lucide-react` | 0.548 | Icons | Use for status icons in demo panels (lock, shield, check, x-circle) rather than emoji — already installed |

### No New Installs Required

The entire demo stack is: React 19 + Vite 7 + TypeScript + Tailwind + Vitest. Everything already in
`package.json`. The demo's data layer is pure TypeScript objects in `lib/data.ts`. The transport
layer is the in-process `Network` class in `lib/contract.ts`. No server, no database, no new libs.

---

## State Management: React useState for per-panel, shared ref/module for hub state

**The question:** Should the demo share state across spike panels (e.g., the audit log accumulating
events as you navigate tab-to-tab) or keep each panel isolated?

**Answer:** Keep per-panel `useState` as the primary mechanism. Introduce one shared module-level
mutable object (a plain JS object, not a library) for the event log and the Network transcript if
the integrated demo scenario requires cross-panel continuity.

**Why not Zustand or similar:**

- The demo has no async actions (all evaluation is synchronous) and no derived/computed state
  heavy enough to warrant a store abstraction.
- The spike panels today are isolated by design — each has its own seeded state. The coherent demo
  needs ONE shared event log (audit) and ONE shared Network (federation), not a global store for
  everything.
- Adding Zustand (v5.0.12, latest) would require `npm install zustand` and introduce a pattern
  not present elsewhere in the codebase — violating the "no new frameworks" constraint.

**Pattern to use instead:**

```typescript
// src/spikes/lib/store.ts — plain module singleton (no library needed)
import { Network } from './contract';
import type { AttrEvent } from './auditlog';

export const sharedNetwork = new Network();
export const sharedEventLog: AttrEvent[] = [];
```

Panels that need to read/write cross-panel state import from `store.ts` directly. React state in
the Shell component controls the active tab and triggers re-renders when needed. This is 10 lines
of code and zero dependencies.

**If cross-panel reactivity becomes necessary** (e.g., tab A's action must update tab B's live
display), upgrade to a single `useReducer` + `React.createContext` in `Shell.tsx`. Still zero new
libraries. Only reach for Zustand if the context-provider approach creates unmaintainable prop
drilling across 5+ levels — that level of complexity is not anticipated in a demo.

---

## Vite Configuration for the spikes.html Entry

Vite 7 uses **Rolldown** internally (migrated from Rollup). The multi-entry build config uses
`rolldownOptions.input`, not `rollupOptions.input`. The current `vite.config.ts` does not yet
register `spikes.html` as a build entry — it works in dev because Vite serves any `.html` file
from the project root, but the production build will not include it unless explicitly registered.

```typescript
// vite.config.ts — add build.rolldownOptions for the spikes entry
import path from 'path';
export default defineConfig({
  build: {
    rolldownOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        spikes: path.resolve(__dirname, 'spikes.html'),
      },
    },
  },
  // ...existing plugins, server, resolve, test config unchanged
});
```

Source: Context7 `/vitejs/vite` docs, "Define Multiple Entry Points" — verified 2026-05-21.

Note: The `TanStackRouterVite` plugin watches `src/routes/` only. Adding the spikes entry does not
affect route generation. The plugin is scoped to `routesDirectory: './src/routes'`.

---

## What NOT to Add

| Do NOT add | Why | What to do instead |
|------------|-----|--------------------|
| Zustand / Jotai / Redux | New framework dependency; overkill for synchronous in-memory demo state | Plain module singleton (`store.ts`) + `useReducer`/context if reactivity needed |
| TanStack Router routes for demo pages | Requires regenerating `routeTree.gen.ts`; pulls demo into app auth flow | Keep the `spikes.html` / `src/spikes/` subtree — isolated by design |
| Real backend calls from the demo | The demo must run without the Rust/Rocket backend; adding fetch calls to the backend breaks the "no real backend" constraint | All data is seeded in `lib/data.ts`; all evaluation is in-browser |
| Real identity provider / OIDC | Out of scope per AUTH-MODEL §10 and PROJECT.md; demo uses seeded identity with role selectors | Keep `ROLES` constant + role picker in each panel |
| Asymmetric crypto / Web PKI | Out of scope per AUTH-MODEL §10; real key distribution is a production concern | Keep the HMAC + mock key registry in `credential.ts` (spike 006) |
| Persistence (localStorage, IndexedDB) | Demo is intentionally ephemeral; persistence adds reset/migration complexity | In-memory only; page refresh resets to seed state — that is a feature, not a bug |
| React Query (`@tanstack/react-query`) in the demo | TanStack Query manages server state; the demo has no server | `useState` + synchronous evaluation functions; no async queries |
| shadcn/ui components inside `src/spikes/` | shadcn components depend on Radix primitives and CSS variable tokens from the main app's `index.css`; importing them into the spike subtree creates a coupling that is hard to remove | Build demo UI from raw Tailwind + the existing `ui.tsx` helpers (`Card`, `Pill`, `DecisionTrace`, `Field`, `Select`) |
| Immer | Demo data mutations are simple array/object operations; Immer's draft-proxy adds indirection not worth the import for this scale | Plain spread + filter mutations as already done in `auditlog.ts` and `policy.ts` |
| MSW (Mock Service Worker) | The demo simulates transport in-process via `Network` class; there is no HTTP to intercept | Use the `Network` class from `contract.ts` — it IS the mock transport |
| A separate Vite project / monorepo workspace for the demo | Adds build tooling overhead; the demo fits cleanly inside the existing Vite app as a second entry | `spikes.html` + `src/spikes/` in the existing workspace |

---

## Integration Points with the Existing App

The demo lives in `frontend/src/spikes/` and shares exactly three things with the main app:

1. **`frontend/src/index.css`** — Tailwind directives; already imported by `src/spikes/main.tsx`.
   Keep this import. Do not import the main app's shadcn CSS variable overrides separately.

2. **Vite config** — `vite.config.ts` serves both entries. The `TanStackRouterVite` plugin only
   watches `src/routes/`; `src/spikes/` is invisible to it. Vitest's `exclude` already handles
   e2e tests; no change needed for spike tests (they are under `src/spikes/lib/*.test.ts` and
   picked up by the existing glob).

3. **`tsconfig.app.json`** — The `@/` path alias resolves to `./src`. Spike files that need
   nothing from the main app should avoid the `@/` alias to keep the coupling explicit. If a
   spike legitimately needs a shared pure utility (e.g., a formatting helper), importing via `@/`
   is acceptable — but import NO components, NO hooks, NO contexts from the main app.

Everything else (routing, auth, React Query, WebSocket context) is main-app-only and must NOT
bleed into `src/spikes/`.

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Extend spikes.html Shell with tabs | Promote to TanStack Router routes | Only if the demo becomes a shipping product that must live inside the app's auth flow (not this milestone) |
| Plain module singleton for shared state | Zustand store | If the demo expands to 20+ panels with complex cross-panel derived state and async actions (not anticipated) |
| Raw Tailwind + `ui.tsx` helpers in demo | shadcn/ui components | If the demo needs to match the production app's design system exactly for a client presentation (adds coupling risk) |
| `rolldownOptions.input` in vite.config | Separate `vite.config.spikes.ts` | If the spike build needs fundamentally different Vite plugins or TS config from the main app |

---

## Version Compatibility Notes

| Concern | Detail |
|---------|--------|
| Vite 7 uses Rolldown | `rolldownOptions` replaces `rollupOptions` for build input config. Using `rollupOptions.input` in Vite 7 will silently use legacy Rollup compat shim — use `rolldownOptions` directly. Verified via Context7 `/vitejs/vite` docs. |
| jsdom 28 + Web Crypto | `credential.ts` calls `crypto.subtle` (async HMAC). jsdom 28 (installed) includes a Web Crypto implementation. Vitest runs the credential tests under jsdom — confirmed working (spike 006 tests are green). |
| Vitest 4.x + TypeScript strict | Vitest 4.0.x requires no separate `@types/vitest` — globals are injected via `globals: true` in vite.config.ts test block. Already configured correctly. |

---

## Sources

- Context7 `/vitejs/vite` — "Define Multiple Entry Points for Multi-Page Apps" — `rolldownOptions.input` pattern — HIGH confidence
- Context7 `/pmndrs/zustand` v5.0.12 — consulted to confirm it adds no value here — HIGH confidence
- Direct code inspection of `frontend/src/spikes/` — current state of spike files — HIGH confidence
- `frontend/package.json` — installed versions verified directly — HIGH confidence
- `frontend/vite.config.ts` — current Vite config verified directly — HIGH confidence

---

*Stack research for: Janus 2.0 Authorization Hub DEMO — spikes.html coherent app*
*Researched: 2026-05-21*
