# Spike Conventions

Patterns established across this spike session. New spikes follow these unless the question requires otherwise.

## Stack

- **React + TypeScript inside the real Vite app** (not CDN). The project's security guardrail (semgrep)
  blocks CDN `<script>` tags without SRI hashes, so spikes use the installed stack.
- Tailwind via the app's `src/index.css` (theme tokens available); plain Tailwind utilities, no shadcn coupling.
- Logic verified with the project's **Vitest** (`*.test.ts` next to the module).

## Structure

- All spike code under `frontend/src/spikes/`:
  - `lib/` — framework-agnostic model + engine (`data.ts`, `abac.ts`) + tests.
  - `components/` — one component per spike + shared `ui.tsx` + `Shell.tsx` (tabs).
  - `main.tsx` — mounts `Shell`, imports `../index.css`.
- Dev entry: `frontend/spikes.html` → `/spikes.html` on the dev server. **Deliberately bypasses the
  TanStack router** so no `src/routes/**` files are added and `routeTree.gen.ts` is never regenerated.
- `.planning/spikes/NNN-*/README.md` documents each spike; the runnable code lives in `frontend/`.

## Patterns

- **Shared mock substrate** (`lib/data.ts`): seeded, deterministic, in-memory. No persistence, no backend.
- **Pure-computed ABAC** (`lib/abac.ts`): `evaluate(principal, requirement)` returns `{decision, rules[], overrides[], failed[]}`.
  Every rule emits a human-readable `detail` so any DENY is explainable.
- **DecisionTrace** component renders a `Decision` consistently across spikes.
- **Rule-effect modeling** (009): context rules carry an `effect` (`BASE` / `GRANT` / `DENY`) so additive grants (obligations) and subtractive denies (shielding) compose on a base decision — shield applied last.
- **Typed contract over an in-process `Network`** (005): entities exchange only via envelopes + a transcript; swap the Network for real transport later, keep the envelopes.
- **Verify-before-trust** (006): signed credentials via Web Crypto HMAC-SHA256; verify signature + trusted-issuer allowlist before any ABAC evaluation.
- **Append-only event log as system-of-record** (007): reconstruct state/access by replay; never a stored grants table.
- Isolation: spike code is excluded from the real router; it IS type-checked + linted by the app
  (kept clean so `npm run build` / `eslint .` stay green).

## Tools & Libraries

- No new dependencies added. Uses React 19, Tailwind 3, Vitest 4 already in the project.
- Avoid: CDN scripts (guardrail), new packages, backend wiring — all out of scope for these demos.
