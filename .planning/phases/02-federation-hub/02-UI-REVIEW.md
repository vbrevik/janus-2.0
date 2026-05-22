# Phase 2 — UI Review

**Audited:** 2026-05-22
**Baseline:** 02-UI-SPEC.md (approved design contract)
**Screenshots:** Captured — Chromium 1223, viewport 1440x900 (desktop) and 375x812 (mobile)
**Dev server:** http://localhost:15510/demo.html (live, Vite)

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 3/4 | Panel heading "Credential Verification" diverges from spec's "Credential Verify"; unverified DENY reason text is paraphrased, not verbatim |
| 2. Visuals | 2/4 | Holdings rows show identical pill+text lines with no subject identifier; REJECTED/TRUSTED verdict text is default-ink not red-700/green-700; mobile grid-cols-2 breaks legibly at 375px |
| 3. Color | 3/4 | Semantic palette (green/red/amber/slate) applied correctly; REJECTED/TRUSTED verdict text missing explicit red-700/green-700 coloring |
| 4. Typography | 4/4 | Four sizes (xs/sm/lg/xl), three weights (medium/semibold/bold), font-mono on transcript and sig-preview — all within spec contract |
| 5. Spacing | 4/4 | Declared spacing scale observed throughout; all sub-grid exceptions (py-0.5, py-1.5, space-y-0.5, space-y-1.5) match spec carve-outs; no arbitrary values |
| 6. Experience Design | 3/4 | Exchange parameter selects are NOT disabled during a run — text says "locked" but controls remain interactive; loading/error/empty states all present |

**Overall: 19/24**

---

## Top 3 Priority Fixes

1. **Holdings/Outbox rows are visually indistinguishable when a unit holds multiple subjects in the same domain** — A user looking at Military Unit 1's holdings sees "Military Unit 1 holds DATA authz info" four times with no subject name shown; they cannot tell which subject each pointer refers to. Fix: add the subject name (or id) to each pointer row: `<Pill tone="blue">{unitName(p.holdingUnit)}</Pill> holds <Pill tone="amber">{p.domain}</Pill> for {p.subjectId}` — or pull the display name from `subjects`.

2. **Exchange parameter selects remain interactive during a run** — The spec (D2-05, interaction contract) states "Exchange parameters locked during a run." The `Select` component in `demo/components/ui.tsx` has no `disabled` prop; the four selects in `ExchangeTranscriptPanel` stay fully editable after Publish is clicked, breaking the stated lock. Fix: add `disabled?: boolean` to `Select` and pass `disabled={!isIdle}` to each parameter select.

3. **Verdict text in CredentialVerifyPanel has no explicit text-color** — The UI-SPEC states `red-700` for REJECT and `green-700` for TRUSTED (`"✗ REJECTED" (red)` / `"✓ TRUSTED" (green)`); `DecisionTrace` correctly applies `text-green-700`/`text-red-700` on its verdict. `CredentialVerifyPanel` renders both verdict divs with `font-bold text-xl` only — inheriting default slate-800, making the verdict visually ambiguous in isolation. Fix: add `text-red-700` to the REJECTED div and `text-green-700` to the TRUSTED div.

---

## Detailed Findings

### Pillar 1: Copywriting (3/4)

**Passing:** All major spec strings are implemented verbatim or near-verbatim: hub discovery intro, "What the hub does NOT store" list with all four struck-through items and footnote, empty states ("No unit has published a pointer for this subject.", "No exchange yet. Press Publish to start a run.", "No incoming requests.", "No sent requests.", "This unit publishes no pointers."), transcript envelope format (mono, `PUBLISH/DISCOVER/RESULT/REQUEST/RESPONSE`), credential loading state ("Signing credentials…"), ABAC footnote ("The holder will not evaluate ABAC on claims it cannot verify."), [DEMO / MOCK] banner, [MOCK] tag on rogue card only. Stage trigger labels (Publish / Discover / Request detail / Respond / New run) match spec exactly. View toggle labels ("Decision Explorer" / "Federation Hub") match spec exactly.

**Deviations:**

- `CredentialVerifyPanel.tsx:46` — Panel heading is **"Credential Verification"** rather than **"Credential Verify"** as labeled in the spec copywriting table. Minor, one word different. WARNING.

- `UnitConsolePanel.tsx:85-89` — Unverified credential DENY explanation reads: *"Credential not verified — its claims were discarded and ABAC ran on a downgraded unclassified principal, which denies."* The spec copy contract (`02-UI-SPEC.md:122`) specifies the DENY reason as: *"credential not verified — claims not trusted"*. The implementation uses different, more verbose prose. The extra explanation is arguably helpful for demo legibility, but diverges from the locked copy. WARNING.

- `ExchangeTranscriptPanel.tsx:91` — Intro text reads `PUBLISH → DISCOVER → REQUEST → RESPONSE` (rendered with `&rarr;`). Spec says `PUBLISH → DISCOVER → REQUEST → RESPONSE` — exact match. PASS.

- The `RESPONSE → {unit}: RELEASED | WITHHELD` envelope line (`ExchangeTranscriptPanel.tsx:27`) matches spec verbatim. PASS.

---

### Pillar 2: Visuals (2/4)

**Holdings rows have no subject identifier — visually indistinguishable (BLOCKER-level UX):**

`UnitConsolePanel.tsx:42-50` and `HubDiscoveryPanel.tsx:44-49` render pointer rows as `{holdingUnitPill} holds {domainPill} authz info` with no subject name. When a unit holds data for multiple subjects in the same domain, all rows are pixel-identical. Screenshot evidence: Military Unit 1's Holdings card shows four rows all reading "Military Unit 1 holds DATA authz info." Military Unit 2's Holdings shows two rows both reading "Military Unit 2 holds PHYSICAL authz info." A user cannot determine which subjects the pointers refer to. This is the most significant usability failure in the surface.

**Verdict text in CredentialVerifyPanel has no explicit color (WARNING):**

`CredentialVerifyPanel.tsx:57,71` — The `✗ REJECTED` and `✓ TRUSTED` verdict divs use `font-bold text-xl` with no text color class. The card backgrounds (red-50 / green-50) provide color context, but the verdict text itself is not red-700 or green-700. `DecisionTrace` in `ui.tsx` does apply correct verdict colors. This inconsistency weakens the signal hierarchy for the two most important outcomes in the credential panel.

**Mobile grid layout breaks at 375px (WARNING):**

`HubDiscoveryPanel.tsx:35` — `grid grid-cols-2 gap-4` is not responsive. At 375px viewport, the left card truncates the amber domain pill ("PHYS|I" cut mid-word) and the blue unit pill ("Military Unit 1" wraps across two lines). The right card text wraps to 3-4 lines per item making it nearly unreadable. The spec explicitly defers legibility polish to Phase 4 (D2-04), so this is a WARNING not a blocker — but it should be recorded.

**Passing:** Visual hierarchy through heading → intro → card sequence is clear and consistent. The non-dismissable [DEMO / MOCK] banner is present on every screen. MockTag [MOCK] appears only on the rogue credential card. Stage triggers show solid slate active / dimmed inactive correctly. The Hub Discovery two-column layout works well at 1440px. The Credential Verify side-by-side layout is effective with red-50/green-50 backgrounds. DecisionTrace ALLOW/DENY within the inbox is correctly rendered with per-rule rule rows and ⛔ override treatment.

---

### Pillar 3: Color (3/4)

**Passing:** 60/30/10 split is respected — white/slate-50 dominates, slate card borders and text as secondary, blue accent reserved for holding-unit pills and current-control state only. Semantic palette applied correctly: green for ALLOW/RELEASED/TRUSTED, red for DENY/WITHHELD/REJECTED, amber for [MOCK] tags and domain pointers, slate for stage-trigger neutral buttons. No hardcoded hex colors anywhere (`grep -rn "#[0-9a-fA-F]"` returns zero hits in demo/). No `bg-primary`/`text-primary` usage (0 instances). `bg-blue-100 text-blue-800` reserved exclusively for holding-unit pills and verified badge — not used decoratively.

**Deviation — REJECTED/TRUSTED verdict text color (WARNING):**

`CredentialVerifyPanel.tsx:57,71` — verdict text uses `font-bold text-xl` without `text-red-700` / `text-green-700`. The spec assigns `red-700 solid` to REJECT and `green-700 solid` to TRUSTED verdicts. This is the same defect as the Visuals finding — the background provides hue context but the text color should be explicit per the spec's `red-700` / `green-700` rule for verdict lines.

**Green/red are applied only in verdict contexts:** `DecisionTrace` tick/cross icons (`text-green-600` / `text-red-600`), override line (`text-red-600` / `text-red-700`), credential cards (`bg-red-50 border-red-200` / `bg-green-50 border-green-200`), Pill tone="green"/"red" for RELEASED/WITHHELD/verified/unverified — all semantically justified. No decorative misuse observed.

**Registry audit:** 0 third-party blocks; no new shadcn blocks fetched in Phase 2. Official shadcn components pre-existing, not audited (per spec). PASS.

---

### Pillar 4: Typography (4/4)

Four sizes in use: `text-xs` (12px — labels, pills, mono transcript, footnotes), `text-sm` (14px — body prose, rule detail, select options), `text-lg` (18px — panel headings h2), `text-xl` (20px — verdict display). Exactly matches the declared four-role table in the spec — no fifth size introduced.

Three weights: `font-medium` (500 — unit names, rule names in DecisionTrace), `font-semibold` (600 — panel headings, card labels, MockTag), `font-bold` (700 — verdict lines only: `✓ ALLOW` / `✗ DENY` in DecisionTrace, `✗ REJECTED` / `✓ TRUSTED` in CredentialVerifyPanel). Weight distribution matches the spec's 400 body / 500 medium / 600 semibold / 700 verdict-only contract.

`font-mono text-xs` applied on the transcript envelope list (`ExchangeTranscriptPanel.tsx:212`) exactly as specified. The card title labels (`text-xs font-semibold uppercase tracking-wide`) in `ui.tsx:51-53` match the "Label" row in the typography table. No rogue weights or sizes detected in any of the five federation components.

---

### Pillar 5: Spacing (4/4)

Spacing is internally consistent and aligns with the declared scale. Dominant pattern is `p-4` (16px) for card content, `space-y-4` (16px) between cards within each panel, `gap-4` (16px) for the two-column grids, `space-y-6` (24px) between the four top-level panels in `FederationHub.tsx`. The toggle row uses `py-2 flex gap-2` (correct). The main container is `px-6 py-6` (24px).

All three documented sub-grid exceptions appear correctly: `py-0.5` on Pill/MockTag (`ui.tsx:23`), `py-1.5` on stage-trigger buttons (`ExchangeTranscriptPanel.tsx:151,164,184,191`), `space-y-1.5` on DecisionTrace rule rows (`ui.tsx:108`), `space-y-0.5` on transcript envelope list (`ExchangeTranscriptPanel.tsx:212`). No new arbitrary values (`grep "\[.*px\]\|\[.*rem\]"` returns zero hits in demo/). `mt-1`, `mt-2`, `mt-3`, `p-2` values observed — all standard 4/8/12-pt tokens.

---

### Pillar 6: Experience Design (3/4)

**Passing:** Loading state — `CredentialVerifyPanel` correctly renders "Signing credentials…" until `fedCredentials.valid` and both verify results are present (`CredentialVerifyPanel.tsx:32-42`). Error state — `FederationHub.tsx:65-69` renders the spec's exact crypto error string via `bg-destructive/10 text-destructive p-4 rounded-md`. Empty states — all four declared empty states implemented: hub no-pointer, transcript no-exchange, inbox no-requests, outbox no-requests, unit no-pointers. The async cancelled-guard pattern (`let cancelled = false`) prevents StrictMode double-dispatch in both `FederationHub` and `CredentialVerifyPanel`. Auto-verify on mount (D2-09) fires correctly via `useEffect` keyed on `[fedCredentials.valid, fedCredentials.rogue]`.

**Defect — Exchange parameters not actually locked during a run (WARNING):**

`ExchangeTranscriptPanel.tsx:97-130` — The four `<Select>` components (requester unit, holder unit, subject, domain) have no `disabled` prop. The helper text "Exchange parameters are locked during a run. Press 'New run' to reset." appears (`!isIdle` guard), but the selects themselves remain interactive. A user can change the requester mid-run after Publish, before clicking Discover — this doesn't break state because stage buttons reject out-of-turn clicks, but it violates the interaction contract (D2-05: "Each trigger enabled ONLY on its turn; current is the solid-slate button") and the spec's stated lock behavior. The `Select` component in `ui.tsx:77-98` does not accept a `disabled` prop at all.

**No destructive confirmations needed:** Phase 2 has no destructive actions (confirmed by spec — "New run" is non-destructive, append-only inbox/outbox). Confirmed correct.

**State machine — FEDERATION_RESET:** Verified that "New run" clears transcript and resets to IDLE, while inbox/outbox entries from the completed run persist (D2-06/Pitfall 7). Confirmed correct via screenshot of Mil-2 inbox after exchange.

---

## Registry Safety

Registry audit: 0 third-party blocks declared in UI-SPEC.md. `components.json` exists (shadcn initialized, new-york/slate). No new shadcn blocks fetched in Phase 2. The Phase 2 surface uses only the plain-Tailwind helpers in `demo/components/ui.tsx` (not fetched from any registry). Registry vetting gate: not triggered.

---

## Files Audited

- `frontend/src/demo/DemoRoot.tsx` — interim toggle implementation
- `frontend/src/demo/components/FederationHub.tsx` — surface scaffold, credential bootstrap
- `frontend/src/demo/components/HubDiscoveryPanel.tsx` — FED-01
- `frontend/src/demo/components/ExchangeTranscriptPanel.tsx` — FED-02
- `frontend/src/demo/components/CredentialVerifyPanel.tsx` — FED-03
- `frontend/src/demo/components/UnitConsolePanel.tsx` — FED-04
- `frontend/src/demo/components/ui.tsx` — primitive component library (Card, Field, Select, Pill, MockTag, DecisionTrace)
- `frontend/src/demo/lib/seed.ts` — HUB_INDEX, SUBJECTS (investigated holdings duplication)
- `frontend/components.json` — registry safety
- `.planning/phases/02-federation-hub/02-UI-SPEC.md` — design contract baseline
- `.planning/phases/02-federation-hub/02-CONTEXT.md` — locked decisions
- `.planning/phases/02-federation-hub/02-01-SUMMARY.md` through `02-06-SUMMARY.md` — execution summaries
- Screenshots captured: `fed-hub-top.png`, `fed-hub-transcript.png`, `fed-hub-credentials.png`, `fed-hub-credentials.png`, `fed-hub-unit-console.png`, `transcript-full-run.png`, `unit-console-mil2-inbox.png`, `exchange-allow-transcript.png`, `mobile-375-fed-hub.png`
