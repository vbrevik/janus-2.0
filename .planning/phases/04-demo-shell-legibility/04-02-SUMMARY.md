---
plan: 04-02
phase: 04-demo-shell-legibility
status: complete
completed: 2026-05-22
---

# Plan 04-02 Summary: Legibility + Build Gate

## What Changed

- `frontend/src/demo/components/ui.tsx`: Added optional `prose?: string` prop to `DecisionTrace`; renders `<p className="mt-2 text-sm italic text-slate-600">` between verdict badge and rule list when prop is present.
- `frontend/src/demo/components/DecisionExplorer.tsx`: Passes `captionFor(...)` output as `prose` prop to `<DecisionTrace>`; removed the now-redundant standalone `<p className="text-xs text-slate-400">` caption paragraph.
- `frontend/src/demo/components/ContextView.tsx`: Added `proseSentence(decision)` helper (maps overrides/rules to D-02 sentence patterns); inserted `<p className="mt-2 text-sm italic text-slate-600">{proseSentence(decision)}</p>` inside `ContextTrace` between verdict and rule list.

## Verification

- `prose` refs in ui.tsx: 3 (prop decl + conditional + JSX) ✓
- `proseSentence` refs in ContextView.tsx: 2 (definition + call) ✓
- `tsc -b --noEmit`: TS_OK ✓
- Vitest: 80/80 passed ✓
- `npm run build`: exits 0, `dist/demo.html` present ✓

## Requirements Satisfied

- DEMO-03: Every ALLOW/DENY trace shows a plain-prose sentence a non-developer can narrate without coaching
- DEMO-04: Production build passes, `dist/demo.html` present
