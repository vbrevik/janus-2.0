# ABAC Engine

## Requirements
- **Pure-computed ABAC** — decisions evaluated live from attributes; no stored access rows.
- **Conjunctive base rules + explicit deny overrides** — ALLOW iff all base rules pass AND no override fires.
- **Per-domain tiers** — each domain (computer/data/physical) has its own tier scale; subjects hold a separate authorization level per domain.
- Clearance is an **external, read-only** attribute (imported, never edited in Janus).

## How to Build It
1. Model attributes as data (`sources/code/lib/data.ts`): clearance ladder (ranked), per-domain `TIERS`, compartments (need-to-know), entity affiliations + cross-entity `AGREEMENTS`, subject `flags` (revoked, securityHold).
2. Single evaluator (`sources/code/lib/abac.ts`): `evaluate(principal, requirement) -> { decision, rules[], overrides[], failed[] }`.
   - Base rules, each emitting a human-readable `detail`: **Clearance** (rank ≥), **Domain tier** (only when requirement has a domain; `TIERS[domain].indexOf` compare), **Need-to-know** (required compartments ⊆ held), **Affiliation** (`hasAgreement(entity, owner)`, same-entity always true).
   - **Deny overrides** from `principal.flags`: `revoked`, `securityHold` → force DENY even when base rules pass.
   - `decision = basePass && overrides.length === 0 ? 'ALLOW' : 'DENY'`.
3. Render with a single `DecisionTrace` component (`sources/code/components/ui.tsx`) reused everywhere — shows ✓/✗ per rule + override lines.
4. Test the logic with Vitest (`sources/code/lib/abac.test.ts`) — covers ALLOW, tier-only DENY, missing-compartment DENY, cross-entity DENY, release ALLOW, override flip. 6/6 green.

## What to Avoid
- **Collapsing tiers into one clearance ladder** — you lose the ability to say "clearance fine, but COMPUTER tier too low." Keep per-domain tiers distinct (early version did this and it was a downgrade).
- **No explanation trace** — a bare allow/deny is unauditable. Every rule MUST carry a `detail` string.
- **Relying on stored grants for revocation** — there are none. Use deny overrides (revoked / hold) instead.

## Constraints
- "Who has access right now" is NOT stored — it must be reconstructed by replaying evaluations. Plan an **evaluation log** as the audit system-of-record.
- Same-entity access is implicitly agreed; cross-entity requires an explicit `AGREEMENTS` entry.

## Origin
Synthesized from spikes: 001 (004 reuses the engine).
Source files: `sources/code/lib/`, `sources/code/components/ui.tsx`, `sources/001-abac-engine/`.
