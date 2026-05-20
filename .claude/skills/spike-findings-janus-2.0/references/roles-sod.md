# Operating Roles & Separation of Duties

## Requirements
- **8 operating roles** (who runs Janus), distinct from ABAC resource-access decisions:
  System Administrator, Security Officer, Access Approver/AO, Personnel/Org Manager, Auditor/Compliance,
  Manager/Supervisor (scoped), Org/Vendor Sponsor (scoped), End User/Subject (scoped).
- **Strict SoD for Admin** — system + user/role administration only; no access-grant or clearance authority.
- **Grant authority** — Access Approver decides; Manager/Supervisor requests; Security Officer flags (deny override) but cannot grant.
- **Personnel records** — Personnel/Org Manager edits identity + affiliation; clearance is external/read-only; Security Officer owns annotations + the import mapping.

## How to Build It
1. Roles → allowed-ops map in data (`sources/code/lib/data.ts` → `ROLES`): each role has a `label` + `ops[]`.
2. Gate UI actions by `roleDef.ops.includes(op)` (`sources/code/components/Spike004Sod.tsx`):
   - `approve_attribute`/`revoke_attribute` → Approver mutates the subject's compartments → decision flips DENY↔ALLOW.
   - `flag_risk` → Security Officer toggles `securityHold` → deny override flips ALLOW→DENY.
   - `request_attribute` → Manager logs a request only (no mutation).
   - `view_eval`/`view_all_readonly` → Auditor sees the action/evaluation log, read-only.
   - No matching ops → render an explicit "no access-decision authority (separation of duties)" state.
3. Keep ONE shared decision (reuse the 001 engine + `DecisionTrace`) and only vary the *action set* by role — that's what makes SoD legible.
4. Maintain an action/evaluation log; it doubles as the audit system-of-record under pure-ABAC.

## What to Avoid
- **Giving Admin grant power** — violates the locked strict-SoD decision. Admin runs the system, it does not decide access.
- **Letting Manager grant** — Manager requests; only Approver grants. Conflating them collapses the audit trail.
- **Editing clearance in-app** — it's external/read-only; Security Officer manages annotations + import mapping, not raw clearance values.

## Constraints
- The 3 scoped roles (Manager → own team, Sponsor → own org, Subject → self) need **data-level (ownership/relationship) authorization** — a flat role list cannot express them. The demo shows the role set; real scoping is a larger build.

## Origin
Synthesized from spikes: 004 (uses the 001 engine).
Source files: `sources/code/components/Spike004Sod.tsx`, `sources/code/lib/data.ts` (`ROLES`), `sources/004-role-sod/`.
