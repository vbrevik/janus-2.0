# Phase 12: Demo UI, Loader & Tab Integration - Research

**Researched:** 2026-07-02
**Domain:** React 19 + TanStack Query frontend island consuming a Rust/Rocket REST API; no backend changes
**Confidence:** HIGH (all core findings grounded directly in this repo's source — backend DTOs, frontend types, existing hook/component patterns)

## Summary

Phase 12 is pure frontend work inside `frontend/src/demo/`, a router-isolated island with its own Vite entry (`demo.html` → `src/demo/main.tsx`). Three things in the codebase are **not yet in place** and must be built fresh: (1) there is **no `QueryClientProvider` anywhere in the demo tree** — `main.tsx` only wraps `<DemoRoot/>` in `<StrictMode>`, so one must be added before any `useQuery`/`useMutation` call will work; (2) the reducer in `world-state.tsx` has **no upsert-by-id action** — only `TOGGLE_GRANT`/`TOGGLE_RESOURCE_GRANT` exist, so two new actions (`SET_DIGITAL_RESOURCES`, `UPSERT_RESOURCE_GRANT`/`UPSERT_RESOURCE_DELEGATE`) must be added, following the existing immutable-update style; (3) the backend's `/world` response is **flatter than the frontend's `DigitalResourceWorld` types** — it is not a simple case-renaming job. `NetworkNode`/`PlatformNode`/`ApplicationNode` in `model.ts` each embed their own `org_links`/`policy_assignments` arrays and a synthetic `tier` literal that the backend does not send; the mapper must **denormalize** the backend's flat `org_links`/`policy_assignments` arrays (keyed by `resource_id`/`resource_tier`) back onto each node, and must **resolve `policy_id` → the full `ResourcePolicy` object** looked up from the flat `policies` array, because the frontend's `PolicyAssignment.policy` is a nested object, not an id string.

A fourth, higher-risk finding: **the SPEC/UI-SPEC's "admin, manager" issuing-authority claim does not match the as-built backend.** `backend/src/digital_resources/handlers.rs` gates both `POST /grants` and `POST /delegates` with `if auth.claims.role != "admin" { return Err(Status::Forbidden); }` — there is no `manager` branch anywhere in that file. See Common Pitfalls #1 and Open Questions #1 — this needs a decision before the client-side role gate is implemented, because building it to spec ("admin OR manager") will silently show a permanently-broken form to every manager, which directly contradicts the UI-SPEC's own "hidden, not disabled" rationale ("a disabled trigger could never become enabled ... inviting clicks that can't succeed").

**Primary recommendation:** Reuse `apiFetch`/`ApiError` from `@/lib/api` directly inside `src/demo/` (do not wrap or duplicate — it is a pure fetch helper with no router/context dependency); read `localStorage` directly for the role-gate check (do not import `useAuth`/`AuthProvider`, which would require wrapping `DemoRoot` in unwanted app machinery); add one small `QueryClientProvider` to `main.tsx`; add two new reducer actions instead of extending `TOGGLE_RESOURCE_GRANT`; and gate the client-side issuing UI on `role === "admin"` only, flagging the SPEC/UI-SPEC text discrepancy for the user rather than silently picking a side.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Hybrid loader (fetch + envelope unwrap + mapping) | Frontend Server (demo island, client-rendered) | API / Backend (`GET /world`, already built) | Phase 12 owns only the client-side fetch/map/dispatch; the data itself is already served by Phase 11 |
| Auth/token reuse | Browser / Client (`localStorage`) | — | No server change; the demo reads the same `localStorage` keys the main app already writes |
| snake_case→camelCase + denormalization mapping | Browser / Client (pure TS function) | — | One-time fixed-shape transform, not a generalized data layer concern |
| Resource Browser tree + detail | Browser / Client (React component + pure selectors) | — | Read-only render over already-fetched `WorldState`; selectors (`buildResourceTree`, `activeGrantsForResource`) already exist and are pure |
| Access Resolution Explorer + gate-chain trace | Browser / Client (React component + pure selectors) | — | `resolveResourceAt` is already a pure function; the component only wires inputs (person/resource/timestamp) to it via `useMemo` |
| Grant toggle | Browser / Client (reducer action, already exists) | — | `TOGGLE_RESOURCE_GRANT` is in-memory only; no server round-trip |
| Issuing forms (grant/delegate) | Browser / Client (form + mutation) | API / Backend (`POST /grants`, `POST /delegates`, already built) | Client submits; server is the authority (role check, dedup); client dispatches the server's response back into `WorldState` |
| Seed-apply script (R7) | Database / Storage (direct psql against `janus2`) | — | One-time data-loading step, outside the request/response cycle; not a backend code change |
| Tab wiring | Frontend Server (demo island shell, `DemoRoot.tsx`) | — | Pure `useState`/conditional-render, no router involvement (explicit phase constraint) |

## User Constraints

<user_constraints>
### Locked Decisions

No user-adjudicated decisions this round (the 3 implementation-rigor questions posed in `/gsd-discuss-phase` went unanswered within the session window). The defaults below were applied per workflow guidance and are recorded as Claude's Discretion — **not** locked user preferences; the planner may deviate if research or planning surfaces a better-grounded reason.

### Claude's Discretion

- **Test coverage for new UI code:** Precedent is split — `demo/lib/` and `demo/store/` carry heavy Vitest coverage (confirmed: `abac.test.ts`, `auditlog.test.ts`, `digital-resource-golden-export.test.ts`, `digital-resource.test.ts`, `obligations.test.ts`, `physical-access.test.ts`, `policy.test.ts` in `demo/lib/`; `world-state.test.tsx` in `demo/store/`); `demo/components/` has **zero** `.test.tsx` files verified by direct `find` — no prior component-test pattern to match either way. Default: unit-test the loader hook's pure logic (envelope unwrap, snake_case→camelCase + denormalization mapping, the four loader-state classification rules) as pure functions, mirroring the existing lib-level testing discipline. Do NOT add component-render tests for `DigitalResourcesPanel`/`ResourceBrowser`/`ResourceAccessExplorer`. See §Common Pitfalls and §Code Examples for a concrete test-file recommendation.
- **Seed-apply mechanism (R7):** Default to a small checked-in idempotent script (`backend/scripts/apply-digital-resource-seed.sh`, no `backend/scripts/` directory exists yet) that wraps the exact `docker exec ... psql ... -f -` pattern already used in Phase 11 for `20260601130002`/`20260601130003` (per `11-04-SUMMARY.md`: "Permission seed applied directly via psql to live janus2 AND janus2_fresh ... the migration file is idempotent"). See §Code Examples for the concrete script.
- **Verification method:** Default to a live walkthrough against the running dev stack (backend :15520 + frontend :15510 + seeded `janus2`) for stateful acceptance criteria (toggle round-trip, timestamp-boundary trace change, issuing flow, loader error states) — matches the project's established `/gsd-verify-work` conversational-UAT convention.

### Deferred Ideas (OUT OF SCOPE)

- Org-based issuing authority (SEED-012) — UI mirrors the server's role-based Option B model only; do not build the `canIssueResourceGrant` org-check UI path even though it exists in `model.ts`.
- Component-level render tests for the three new UI components — deferred per Claude's Discretion above unless a low-cost logic-only way to cover the interactive acceptance criteria surfaces.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| RSRC-UI-01 | Resource Browser renders Network→Platform→Application hierarchy with classification badges (Application inherited) | `buildResourceTree` selector already exists (`digital-resource-selectors.ts`); `zone-browser.tsx` gives the exact tree/expand-collapse/detail-panel structural pattern to mirror — see §Architecture Patterns Pattern 2 |
| RSRC-UI-02 | Org links grouped by role, classification, active policy, active grants, delegates, NSM badges on Platform | Backend `/world` gives flat `org_links`/`policy_assignments`; mapper must denormalize onto each node — see §Standard Stack mapping section and §Common Pitfalls #2 |
| RSRC-UI-03 | Access Resolution Explorer: person + resource + timestamp → gate-chain trace with amber advisory row | `resolveResourceAt` selector already exists and is pure; `access-resolution-explorer.tsx`'s `ZoneResolutionTrace` is the exact local-component pattern to mirror for the new `ResourceResolutionTrace` — see §Architecture Patterns Pattern 3 |
| RSRC-UI-04 | Hybrid loader populates `WorldState.digitalResources` at mount; 4 mutually-exclusive states | No `QueryClientProvider` exists yet (must add); React Query v5 has no `onSuccess` on `useQuery` (must use `useEffect` to dispatch) — see §Common Pitfalls #3 and §Code Examples |
| RSRC-UI-05 | Grant toggle interactive; verdict updates live | `TOGGLE_RESOURCE_GRANT` reducer action already exists and is wired correctly (`disabledResourceGrantIds` Set, immutable update) — no new reducer work needed for this requirement |
| RSRC-UI-06 | Issuing forms call POST endpoints; role-gated; duplicate-submit upserts by id | Reducer has NO existing upsert-by-id action (must add); backend role gate is `admin`-only, not `admin`+`manager` as SPEC/UI-SPEC claim — see §Common Pitfalls #1 (high-priority); `IssueGrantRequest`/`IssueDelegateRequest` require fields (`actor_org_id`, `granted_by_org_id`) the UI-SPEC form fields don't mention — see §Common Pitfalls #4 |
</phase_requirements>

## Standard Stack

### Core

| Library | Version (installed) | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@tanstack/react-query` | `^5.90.5` [VERIFIED: `frontend/package.json`] (registry current `5.101.2` [VERIFIED: `npm view @tanstack/react-query version`]) | Loader fetch, issue-grant/issue-delegate mutations | Already the project's only data-fetching library (`src/hooks/use-*.ts`); no new dependency needed |
| React 19 | `^19.1.1` [VERIFIED: `frontend/package.json`] | Component layer | Stack-locked (CLAUDE.md) |

No new packages are introduced by this phase — `@tanstack/react-query` is already installed and used project-wide. **Package Legitimacy Audit is not applicable** (no new external packages).

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none new) | — | — | Reuse existing demo primitives (`Card`, `Pill`, `Field`, `Select`, `MockTag` from `demo/components/ui.tsx`) and existing pure selectors (`digital-resource-selectors.ts`) — UI-SPEC explicitly prohibits new primitives |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-written per-entity mapper functions | A generic recursive snake_case→camelCase converter | **Rejected.** Confirmed via `grep -rn "\.orgLinks\|\.policyAssignments"` (zero hits) and `grep -rn "\.org_links\|\.policy_assignments"` (all hits are per-node embedded fields, e.g. `net.org_links`, `resource.policy_assignments`) that the frontend model does **not** uniformly camelCase nested fields — `OrgLink.org_id`, `OrgLink.valid_from`, `ResourceAccessGrant.person_id`, `PolicyAssignment.valid_from` etc. are all still snake_case in the TS types (`model.ts`). Only the **top-level** `DigitalResourceWorld` keys `org_links`→`orgLinks` and `policy_assignments`→`policyAssignments` are renamed. A generic recursive converter would incorrectly camelCase every nested field and break every existing selector/test that reads `.org_links`, `.resource_id`, `.valid_from`, etc. Hand-written per-entity mappers are correct here because the transform is a **fixed, asymmetric, one-time shape** (partial rename + denormalize + Date-parse + policy-id resolution), not a generic problem. |
| `useEffect`-based dispatch from query result into reducer | React Query `useQuery({ onSuccess })` | **Not available.** TanStack Query v5 removed `onSuccess`/`onError`/`onSettled` from `useQuery` (kept on `useMutation`) [CITED: tanstack.com/query/latest/docs/framework/react/guides/migrating-to-v5]. Installed version is v5.90.5. Must bridge query success into the reducer via `useEffect` watching `query.data`. |

**Installation:** None — no new packages.

## Architecture Patterns

### System Architecture Diagram

```
localStorage["token"] ──┐
localStorage["user"]  ──┼─► DigitalResourcesPanel (mount)
                         │      │
                         │      ├─► token present? ──NO──► "Not logged in." (query disabled, no fetch)
                         │      │
                         │     YES
                         │      │
                         │      ▼
                         │  useDigitalResourcesWorld() [React Query]
                         │      │  GET /api/digital-resources/world  (Bearer token)
                         │      │  ──► backend AuthGuard ──► 401 if token invalid
                         │      │
                         │      ├─ isLoading ─────────────► spinner "Loading digital resource data…"
                         │      ├─ isError, status===401 ─► "Session invalid or expired."
                         │      ├─ isError, other ────────► "Could not load…" + optional Retry
                         │      ├─ success, empty ────────► "No digital resources found."
                         │      └─ success, data present
                         │             │
                         │             ▼
                         │      mapWorldResponse(raw) [pure fn: denormalize + camelCase + Date-parse]
                         │             │
                         │             ▼  useEffect (once per fetch)
                         │      dispatch({type:"SET_DIGITAL_RESOURCES", world})
                         │             │
                         │             ▼
                         │      WorldState.digitalResources  (single source of truth for render)
                         │             │
                         │      ┌──────┴───────────────────────────┐
                         │      ▼                                  ▼
                         │  ResourceBrowser                ResourceAccessExplorer
                         │  (buildResourceTree,             (resolveResourceAt selector,
                         │   activeGrantsForResource)         live gate-chain trace)
                         │      │                                  │
                         │      │  "+ Issue new delegate"          │  "+ Issue new grant"
                         │      │  (role==="admin" only)           │  (role==="admin" only)
                         │      ▼                                  ▼
                         │  useMutation → POST /delegates    useMutation → POST /grants
                         │      │  (Bearer token)                  │  (Bearer token)
                         │      │  backend re-checks role==admin   │  backend re-checks role==admin
                         │      │  server dedupes (ON CONFLICT)    │  server dedupes (ON CONFLICT)
                         │      ▼                                  ▼
                         │  dispatch({type:"UPSERT_RESOURCE_DELEGATE", delegate: response.data})
                         └──────────────────────────────────────────► WorldState (upsert by id, never append)
```

### Recommended Project Structure

```
frontend/src/demo/
├── hooks/                                  # NEW directory — does not exist yet
│   └── use-digital-resources.ts            # useDigitalResourcesWorld, useIssueGrant, useIssueDelegate
├── lib/
│   ├── digital-resource-mapper.ts          # NEW — pure mapWorldResponse() + per-entity helpers
│   ├── digital-resource-mapper.test.ts     # NEW — unit tests for the mapper + loader-state classification
│   ├── digital-resource-selectors.ts       # EXISTING — reuse, do not modify
│   └── model.ts                            # EXISTING — add `export` to nothing here; see Pitfall #5 for access-resolution-explorer.tsx
├── components/
│   ├── digital-resources-panel.tsx         # NEW — tab root, 4-state loader gate, sub-nav
│   ├── resource-browser.tsx                # NEW — tree + detail (mirrors zone-browser.tsx)
│   ├── resource-access-explorer.tsx        # NEW — selectors + local ResourceResolutionTrace (mirrors access-resolution-explorer.tsx)
│   └── access-resolution-explorer.tsx      # EXISTING — add `export` to CLEARANCE_TONE (1-line surgical edit; see Pitfall #5)
├── store/
│   └── world-state.tsx                     # EXISTING — add SET_DIGITAL_RESOURCES, UPSERT_RESOURCE_GRANT, UPSERT_RESOURCE_DELEGATE actions
├── DemoRoot.tsx                            # EXISTING — add "digital-resources" ActiveView + 7th tab button
└── main.tsx                                # EXISTING — add QueryClientProvider (currently absent)

backend/scripts/                            # NEW directory — does not exist yet
└── apply-digital-resource-seed.sh          # NEW — R7 idempotent psql-apply wrapper
```

### Pattern 1: React Query hook shape (mirrors `use-info-systems.ts`/`use-access.ts`)

**What:** Every existing hook in `frontend/src/hooks/use-*.ts` follows the same shape: import `apiFetch` from `@/lib/api`, type the response as `ApiResponse<T>` or `PaginatedResponse<T>` from `@/types/api`, unwrap `.data` inside `queryFn`/`mutationFn`, use array `queryKey`s (`["info-systems", page, perPage]`), and call `queryClient.invalidateQueries` in `onSuccess` for mutations only (never for queries — v5 removed that).
**When to use:** The new `demo/hooks/use-digital-resources.ts` file — same shape, same imports, just located under `demo/hooks/` instead of `src/hooks/` and typed against `DigitalResourceWorldResponse`-shaped raw JSON → `DigitalResourceWorld` mapped output.
**Example:**
```typescript
// Source: frontend/src/hooks/use-info-systems.ts (existing pattern, verbatim shape)
export function useInfoSystemsList(page: number = 1, perPage: number = 20) {
  return useQuery({
    queryKey: ["info-systems", page, perPage],
    queryFn: async () => {
      return apiFetch<PaginatedResponse<InfoSystem>>(
        `/api/info-systems?page=${page}&per_page=${perPage}`,
      );
    },
  });
}
```

### Pattern 2: Collapsible tree + detail panel (mirrors `zone-browser.tsx`)

**What:** `ZoneTreeNode` is a self-recursive component taking `{ zone, depth, allZones, expandedIds, selectedId, onSelect, onToggle }`; children are computed by filtering `allZones` by `parent_id === zone.id` (not by pre-built child arrays); indent via `style={{ marginLeft: depth * 16 }}`; expand toggle is a `<span>` inside the row button with `e.stopPropagation()` so clicking the toggle doesn't also select the node. `ZoneBrowser` (the exported component) owns `expandedIds: Set<string>` and `selectedId: string | null` as local `useState`, and renders `Card title="Zone Hierarchy"` (tree, col 1) beside `Card title="Zone Detail"` (detail, `col-span-2`) in a `grid grid-cols-3 gap-4`.
**When to use:** `ResourceBrowser`'s tree — but note `buildResourceTree` (the existing Phase 10 selector) already returns a **pre-nested** `ResourceTreeNode[]` (with `children: ResourceTreeNode[]`), unlike `zone-browser.tsx`'s flat-filter-by-parent_id approach. Use the selector's pre-built `children` array directly instead of re-deriving parent/child relationships — do not reimplement the flat-filter pattern; it would duplicate logic `buildResourceTree` already owns.
**Example:**
```typescript
// Source: frontend/src/demo/components/zone-browser.tsx:35-89 (adapt: use node.children directly, not allZones.filter)
function ResourceTreeNodeRow({
  node, depth, expandedIds, selectedId, onSelect, onToggle,
}: { node: ResourceTreeNode; depth: number; expandedIds: Set<string>;
     selectedId: string | null; onSelect: (id: string) => void; onToggle: (id: string) => void }) {
  const isExpanded = expandedIds.has(node.id);
  const isSelected = selectedId === node.id;
  return (
    <div style={{ marginLeft: depth * 16 }}>
      <button
        className={`flex w-full items-center gap-2 rounded px-2 py-1 text-left text-sm ${isSelected ? "bg-slate-200" : "hover:bg-slate-100"}`}
        onClick={() => onSelect(node.id)}
      >
        {node.children.length > 0 ? (
          <span className="w-4 text-xs text-slate-400"
            onClick={(e) => { e.stopPropagation(); onToggle(node.id); }}>
            {isExpanded ? "▼" : "▶"}
          </span>
        ) : <span className="w-4" />}
        <Pill tone={TIER_TONE[node.tier]}>{node.tier}</Pill>
        <span className="text-sm">{node.name}</span>
      </button>
      {isExpanded && node.children.map((child) => (
        <ResourceTreeNodeRow key={child.id} node={child} depth={depth + 1} {...{ expandedIds, selectedId, onSelect, onToggle }} />
      ))}
    </div>
  );
}
```
Per UI-SPEC: root Networks start expanded, Applications start collapsed — seed `expandedIds` initial state with all Network ids (not empty `Set`, unlike `zone-browser.tsx`'s `useState<Set<string>>(new Set())`).

### Pattern 3: Local gate-chain trace component (mirrors `ZoneResolutionTrace` in `access-resolution-explorer.tsx`)

**What:** `ZoneResolutionTrace` is declared as a **module-scope function component inside `access-resolution-explorer.tsx`** (not exported, not in `ui.tsx`), typed to the domain-specific result type (`ZoneAccessResult`), rendering a `rounded-lg border p-4` verdict banner (`bg-green-50 border-green-200` / `bg-red-50 border-red-200`), a `text-lg font-semibold` verdict line, then an `<ul className="mt-3 space-y-1.5">` of gate rows each `flex gap-2 text-sm` with a `✓`/`✗` glyph, a `w-28 shrink-0 font-medium` label column, and a `text-slate-600` detail column.
**When to use:** The new `ResourceResolutionTrace`, declared the same way inside `resource-access-explorer.tsx`, typed to `ResourceAccessResult` (not `ZoneAccessResult` — UI-SPEC explicitly prohibits forking/renaming `DecisionTrace`, and this is a third, resource-specific trace type). Iterate `result.gates: ResourceGateResult[]` for the gate rows (label via the `GATE_LABEL` lookup table in UI-SPEC's Gate label copy table), then conditionally render the amber advisory block when `result.zoneAdvisory !== null`.
**Example:**
```typescript
// Source: frontend/src/demo/components/access-resolution-explorer.tsx:38-139 (structural pattern; verdict banner + gate row shape)
function ResourceResolutionTrace({ result }: { result: ResourceAccessResult }) {
  return (
    <div className={`rounded-lg border p-4 ${result.allow ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
      <div className="text-lg font-semibold">{result.allow ? "✓ ALLOW" : "✗ DENY"}</div>
      <p className="text-xs text-slate-400">
        Policy: {result.policyVersion
          ? `${result.policyVersion.valid_from ?? "open"} – ${result.policyVersion.valid_until ?? "open"}`
          : "No active policy at this time."}
      </p>
      <ul className="mt-3 space-y-1.5">
        {result.gates.map((g, i) => (
          <li key={i} className="flex gap-2 text-sm">
            <span className={g.pass ? "text-green-600" : "text-red-600"}>{g.pass ? "✓" : "✗"}</span>
            <span className="w-28 shrink-0 font-medium">{GATE_LABEL[g.kind] ?? `Gate: ${g.kind}`}</span>
            <span className="text-slate-600">{g.reason}</span>
          </li>
        ))}
      </ul>
      {result.zoneAdvisory !== null && (
        <div className="bg-amber-50 border border-amber-200 rounded p-3 mt-2 flex gap-2 text-sm">
          <span className="text-amber-700">⚠</span>
          <div>
            <span className="font-medium text-amber-900">Zone prerequisite</span>{" "}
            <span className="text-amber-800">{/* zone detail text from zoneAdvisory */}</span>
            <Pill tone="amber">Advisory (non-blocking)</Pill>
            <span className="text-xs text-amber-700 block mt-1">
              This zone requirement is advisory — it does not affect the ALLOW/DENY verdict.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Access resolution logic | A new resolver / re-derive ALLOW-DENY in the component | `resolveResourceAt` (`digital-resource-selectors.ts`, wraps `resolveResourceAccess` from `model.ts`) | Already pure, already tested (`digital-resource.test.ts`), already handles disabled-grant filtering (D-06) and fail-closed `NO_ACTIVE_POLICY` |
| Tree hierarchy assembly | Manually joining networks/platforms/applications by id in the component | `buildResourceTree` (`digital-resource-selectors.ts`) | Already handles orphan-skip and effective-classification derivation for Applications |
| Active-grant filtering | Re-implementing the window-check + disabled-set filter | `activeGrantsForResource` (`digital-resource-selectors.ts`) | Encodes the exact inclusive-window rule (`isWindowActive`) other code already relies on |
| Generic deep object key transformation | A recursive snake_case→camelCase library/utility | Hand-written per-entity mapper functions (see §Standard Stack Alternatives Considered) | Confirmed via grep the frontend types are NOT uniformly camelCase — a generic converter would corrupt fields that must stay snake_case |
| React Query success side-effects on a query | `useQuery({ onSuccess })` | `useEffect` watching `query.data`/`query.isSuccess` | Removed in v5 (installed version); would be a compile error against the actual installed types, not a style choice |

**Key insight:** every piece of *business logic* this phase needs (resolution, tree-building, active-grant filtering, window checks) already exists as a tested pure function in `demo/lib/`. Phase 12's actual net-new logic surface is narrow: the fetch/map/dispatch loader, the two new reducer actions, and the presentational components wiring existing selectors to existing UI primitives.

## Common Pitfalls

### Pitfall 1: Backend issuing-authority gate is `admin`-only, not `admin`+`manager` (HIGH PRIORITY)

**What goes wrong:** 12-SPEC.md's Constraints section and 12-UI-SPEC.md's §Role-Gated Issuing Affordances both state the authorized roles are "admin, manager (Option B)". Direct read of `backend/src/digital_resources/handlers.rs` shows both `issue_grant` (line 146) and `issue_delegate` (line 222) check `if auth.claims.role != "admin" { return Err(Status::Forbidden); }` — there is no `manager` branch anywhere in the file (confirmed via `grep -n "manager" handlers.rs mod.rs models.rs resolver.rs` — zero hits).
**Why it happens:** The SPEC/UI-SPEC text was likely written against the *intended* Option-B design (which conventionally would include manager) before/independent of the actual Phase 11 handler implementation, and the 2026-07-02 reconciliation pass didn't cross-check the literal `if` condition in the merged code.
**How to avoid:** Do not build the client-side gate as written (`role === "admin" || role === "manager"`). Gate on `role === "admin"` only, matching the server. This is consistent with the UI-SPEC's own stated rationale for "hidden, not disabled" (a manager who could see the form would face a form that can *never* succeed for the life of the session — exactly the "permanently dead UI" the UI-SPEC says to avoid). Flag this discrepancy explicitly to the user during planning/discuss — do not silently "fix" the SPEC copy; the fix belongs to whoever owns the spec, but the *implementation* must match the real server or acceptance criteria around "control hidden/disabled without the role permission" will be wrong for manager logins.
**Warning signs:** A manager-role UAT walkthrough where the "+ Issue new grant" trigger is visible, the form submits, and the result is *always* a 403 — that's this pitfall manifesting, not a bug in the mutation code.

### Pitfall 2: The backend `/world` response requires denormalization, not just field renaming

**What goes wrong:** Treating the mapping task as "rename `org_links`→`orgLinks`, `policy_assignments`→`policyAssignments`" (as the 12-SPEC.md prose literally suggests) produces a `DigitalResourceWorld` whose `networks`/`platforms`/`applications` are missing `org_links`, `policy_assignments`, and `tier` — because the backend's `ResourceNetwork`/`ResourcePlatform`/`ResourceApplication` structs (`backend/src/digital_resources/models.rs:24-51`) do **not** embed those fields; they are separate flat arrays in the response (`org_links: Vec<ResourceOrgLink>` with `resource_id`+`resource_tier` columns, `policy_assignments: Vec<ResourcePolicyAssignment>` with `resource_id`+`resource_tier`+`policy_id`).
**Why it happens:** The backend chose "8 flat queries, no N+1" (handler comment: "assembles a `DigitalResourceWorldResponse`... in memory") for simplicity/performance, while the frontend's Phase-9/10 types were designed around a denormalized per-node shape for convenient selector code.
**How to avoid:** The mapper must, for each network/platform/application: (1) add the literal `tier` field per source array (`"NETWORK"`/`"PLATFORM"`/`"APPLICATION"`), (2) filter the flat `org_links` array by `resource_id === node.id && resource_tier === tier`, strip `id`/`resource_id`/`resource_tier`, and assign as `node.org_links`, (3) filter the flat `policy_assignments` array the same way, then for each assignment look up `policies.find(p => p.id === assignment.policy_id)` and construct `{ policy, valid_from, valid_until }` per the `PolicyAssignment` type (which nests the full policy object, not an id). The top-level `DigitalResourceWorld.orgLinks`/`.policyAssignments` fields (the flat mirrors) should be populated the same way but without the `resource_id`/`resource_tier` filter — confirmed via grep that nothing in the current codebase reads these top-level fields today (`grep -rn "\.orgLinks\|\.policyAssignments\b" src/` returns zero hits), so a straightforward flat map is sufficient there; do not over-engineer it.
**Warning signs:** `TypeError: Cannot read properties of undefined (reading 'org_links')` when `ResourceBrowser` renders the detail panel, or an empty "Org links" card despite the seed data having org-links rows.

### Pitfall 3: React Query v5 has no `onSuccess` on `useQuery` — dispatch via `useEffect`

**What goes wrong:** Writing `useQuery({ queryKey, queryFn, onSuccess: (data) => dispatch(...) })` compiles against stale mental models of React Query v4 but is a type error against the installed `@tanstack/react-query@^5.90.5` — v5 removed `onSuccess`/`onError`/`onSettled` from queries (kept only on mutations) [CITED: https://tanstack.com/query/latest/docs/framework/react/guides/migrating-to-v5].
**Why it happens:** Training-data familiarity with the older API; the existing codebase hooks (`use-access.ts`, `use-info-systems.ts`) only use `onSuccess` on `useMutation`, which is still valid — easy to over-generalize that pattern to `useQuery`.
**How to avoid:** In the component that owns the dispatch (likely `DigitalResourcesPanel`), use `useEffect(() => { if (query.isSuccess && query.data) dispatch({ type: "SET_DIGITAL_RESOURCES", world: query.data }); }, [query.isSuccess, query.data, dispatch])`. Guard against re-dispatching on every render by relying on React Query's stable object identity for `query.data` (it only changes reference on refetch/new data, not on every render) — no additional ref-guard needed for `SET_DIGITAL_RESOURCES` since the reducer case can safely be idempotent (same shape overwrite).
**Warning signs:** TypeScript build failure ("Object literal may only specify known properties, and 'onSuccess' does not exist in type...") — this will be caught at `npm run build`, not silently at runtime, so low risk once someone tries it, but worth flagging up front to avoid the detour.

### Pitfall 4: `IssueGrantRequest`/`IssueDelegateRequest` require fields the UI-SPEC form doesn't mention

**What goes wrong:** `backend/src/digital_resources/models.rs` defines `IssueGrantRequest` with a **required** (non-`Option`) `actor_org_id: String` field, and `IssueDelegateRequest` with a **required** `granted_by_org_id: String` field. Neither field appears in 12-UI-SPEC.md's "Issue Grant form" or "Issue Delegate form" field tables (which list only Person/Delegate, Resource, Valid from, Valid until). If the mutation body omits these fields, Rocket's JSON deserialization will reject the request before the handler body even runs (400, not the modeled 403/generic-error paths).
**Why it happens:** The handler code explicitly does *not* use these fields for the authorization decision (comment at `handlers.rs:151-152`: "The org_links/policies loaded here belong to the resolver's /world semantics, not the write-authz decision"; the actual authz is `auth.claims.role != "admin"`) — they are vestigial from the org-based Option-A design (SEED-012, deferred) but remain required by the struct.
**How to avoid:** Populate these fields silently in the mutation call without adding new form inputs (UI-SPEC's field list is authoritative for what the *user* sees). Concretely: for `actor_org_id`, use the selected grantee `Subject.unit` (the `world.subjects` person picker already has this); for `granted_by_org_id`, use the same field on the selected delegate-target `Subject`, or fall back to the current role-switcher subject's `.unit` if a cleaner source isn't available. Since the server does not use these values for any decision, any syntactically valid org-id string satisfies the contract — but keeping it derived from real seed data avoids a magic-string smell.
**Warning signs:** A 400 (not 403, not the generic "Issue failed" message) on every submit if this is missed — the SPEC's modeled error states (403 / generic) will never fire because deserialization fails first.

### Pitfall 5: `CLEARANCE_TONE` is not exported from `access-resolution-explorer.tsx`

**What goes wrong:** UI-SPEC's Resource Browser interaction contract says "use `CLEARANCE_TONE` mapping from `access-resolution-explorer.tsx`" — but the const is declared `const CLEARANCE_TONE: Record<Clearance, ...> = {...}` with no `export` keyword (confirmed by direct read, line 24). Importing it from a sibling component file will fail to compile.
**Why it happens:** `CLEARANCE_TONE` was originally local-only because it was only ever used inside that one file (Phase 8).
**How to avoid:** Add `export` to the existing `const CLEARANCE_TONE` declaration in `access-resolution-explorer.tsx` (one-line surgical edit — do not duplicate the mapping in the new files, and do not move it into `ui.tsx` or `model.ts`, which would be a bigger change than needed). Both `resource-browser.tsx` and `resource-access-explorer.tsx` then `import { CLEARANCE_TONE } from "./access-resolution-explorer"`. Note: the Phase 12 mapping table in UI-SPEC (§Color, "Classification badge color mapping") is byte-identical to the existing `CLEARANCE_TONE` values (UNCLASSIFIED→slate, RESTRICTED→blue, CONFIDENTIAL→slate, SECRET→amber, TOP_SECRET→red) — confirmed by direct comparison, so reuse is correct, not coincidental.
**Warning signs:** `Module '"./access-resolution-explorer"' declares 'CLEARANCE_TONE' locally, but it is not exported` at `npm run build`.

### Pitfall 6: No `QueryClientProvider` exists in the demo tree

**What goes wrong:** Any `useQuery`/`useMutation` call inside a component rendered under `<DemoRoot/>` will throw `No QueryClient set, use QueryClientProvider to set one` at runtime, because `frontend/src/demo/main.tsx` currently renders only `<StrictMode><DemoRoot/></StrictMode>` — confirmed by direct read; no `QueryClientProvider` import anywhere under `src/demo/`.
**Why it happens:** The demo island predates any server-backed data (Phases 1-10 were fully client-side seed data); Phase 11 added the backend, but no prior phase needed React Query inside the demo.
**How to avoid:** Add a `QueryClient` + `QueryClientProvider` to `main.tsx`, following the main app's `src/main.tsx` pattern exactly (`new QueryClient({ defaultOptions: { queries: { staleTime: ..., refetchOnWindowFocus: false } } })`), wrapping `<DemoRoot/>`. This does not touch the router-isolation constraint (D-02/R5) — `QueryClientProvider` has zero TanStack Router dependency; it is a separate `@tanstack/react-query` package.
**Warning signs:** Immediate white-screen crash on navigating to the "Digital Resources" tab, with the exact `No QueryClient set` error in the console.

## Code Examples

### Loader hook + panel-level dispatch

```typescript
// Source: pattern synthesized from frontend/src/hooks/use-info-systems.ts (hook shape)
// + frontend/src/lib/api.ts (apiFetch/ApiError) + this research's mapper design.
// New file: frontend/src/demo/hooks/use-digital-resources.ts
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiFetch, ApiError } from "@/lib/api";
import type { ApiResponse } from "@/types/api";
import { mapWorldResponse, type DigitalResourceWorldResponse } from "../lib/digital-resource-mapper";
import type { DigitalResourceWorld } from "../lib/model";

export function useDigitalResourcesWorld(hasToken: boolean) {
  return useQuery({
    queryKey: ["digital-resources", "world"],
    queryFn: async (): Promise<DigitalResourceWorld> => {
      const res = await apiFetch<ApiResponse<DigitalResourceWorldResponse>>(
        "/api/digital-resources/world",
      );
      return mapWorldResponse(res.data);
    },
    enabled: hasToken, // missing-token state never fires the request (UI-SPEC requirement)
    retry: false,      // a 401 or unreachable API should not silently retry before showing the error state
    refetchOnWindowFocus: false,
  });
}
```

```typescript
// In digital-resources-panel.tsx — dispatch on success via useEffect (React Query v5 has no onSuccess on useQuery)
const hasToken = !!localStorage.getItem("token"); // same key auth-context.tsx writes — direct read, no useAuth() import
const query = useDigitalResourcesWorld(hasToken);
const dispatch = useWorldDispatch();

useEffect(() => {
  if (query.isSuccess && query.data) {
    dispatch({ type: "SET_DIGITAL_RESOURCES", world: query.data });
  }
}, [query.isSuccess, query.data, dispatch]);
```

### New reducer actions (extend `world-state.tsx`)

```typescript
// Add to the Action union in frontend/src/demo/store/world-state.tsx (alongside existing TOGGLE_RESOURCE_GRANT)
| { type: "SET_DIGITAL_RESOURCES"; world: DigitalResourceWorld }
| { type: "UPSERT_RESOURCE_GRANT"; grant: ResourceAccessGrant }
| { type: "UPSERT_RESOURCE_DELEGATE"; delegate: ResourceAccessDelegate };

// Add to the reducer switch:
case "SET_DIGITAL_RESOURCES":
  // Loader success — replace the whole sub-object. Preserves disabledResourceGrantIds
  // (a client-only Set) across refetches; do not let the fetched world overwrite it.
  return {
    ...state,
    digitalResources: {
      ...action.world,
      disabledResourceGrantIds: state.digitalResources.disabledResourceGrantIds,
    },
  };

case "UPSERT_RESOURCE_GRANT": {
  // Upsert-by-id (UI-SPEC Duplicate-Submit Feedback contract) — mirrors the immutable-Set
  // style of TOGGLE_RESOURCE_GRANT, but on an array: replace-if-found, else append.
  const existingIdx = state.digitalResources.grants.findIndex((g) => g.id === action.grant.id);
  const grants =
    existingIdx === -1
      ? [...state.digitalResources.grants, action.grant]
      : state.digitalResources.grants.map((g, i) => (i === existingIdx ? action.grant : g));
  return { ...state, digitalResources: { ...state.digitalResources, grants } };
}
// UPSERT_RESOURCE_DELEGATE mirrors UPSERT_RESOURCE_GRANT exactly, targeting .delegates.
```

**No existing reducer case does this today** — confirmed by full read of `world-state.tsx`'s `reducer` function (all 15 existing cases either replace a scalar field, map-and-clone one matching item, or toggle Set membership; none do find-or-append on an array). This is new logic, not an extension of an existing pattern.

### Seed-apply script (R7)

```bash
#!/usr/bin/env bash
# backend/scripts/apply-digital-resource-seed.sh
# Idempotent direct-psql apply of the committed seed migration, following the
# exact pattern used in Phase 11 (11-04-SUMMARY.md) for 20260601130002/130003,
# because `sqlx migrate run` remains broken on the drifted `janus2` dev DB
# (see project memory project_migrations_fresh_db_broken).
set -euo pipefail
SEED_FILE="$(dirname "$0")/../migrations/20260601130001_seed_digital_resources.sql"
CONTAINER_ID=$(docker ps --filter "publish=15530" -q)
if [ -z "$CONTAINER_ID" ]; then
  echo "Postgres container not found on :15530 — is docker-compose.dev.yml up?" >&2
  exit 1
fi
for DB in janus2 janus2_fresh; do
  echo "Applying seed to ${DB}..."
  docker exec -i -e PGPASSWORD=janus_dev_password "$CONTAINER_ID" \
    psql -U janus -d "$DB" -f - < "$SEED_FILE"
done
echo "Done. Re-running this script is a no-op (ON CONFLICT DO NOTHING / WHERE NOT EXISTS guards in the seed file)."
```

The seed file's guards (confirmed by direct read of `20260601130001_seed_digital_resources.sql`) are already `ON CONFLICT DO NOTHING` (TEXT-PK tables) and `WHERE NOT EXISTS` (SERIAL-PK link tables) — the script does not need its own idempotency logic beyond re-running the same file safely, which it already is.

### Mapper unit test shape (for the Claude's-Discretion loader-hook test coverage)

```typescript
// New file: frontend/src/demo/lib/digital-resource-mapper.test.ts
// Mirrors the existing test-file naming/location convention (digital-resource.test.ts sits
// alongside digital-resource-selectors.ts's sibling model.ts in the same demo/lib/ dir).
import { describe, it, expect } from "vitest";
import { mapWorldResponse } from "./digital-resource-mapper";

describe("mapWorldResponse", () => {
  it("denormalizes flat org_links onto the matching network by resource_id + resource_tier", () => { /* ... */ });
  it("resolves policy_assignments.policy_id to the full ResourcePolicy object", () => { /* ... */ });
  it("parses valid_from/valid_until ISO strings into Date objects", () => { /* ... */ });
  it("assigns the correct tier literal per entity array", () => { /* ... */ });
});

// Loader-state classification is pure enough to unit-test without React Query at all —
// extract a small classifyLoaderState(hasToken, query) => "missing-token"|"loading"|"401"|"error"|"empty"|"success"
// pure function and test it directly, rather than trying to unit-test the hook itself.
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| `useQuery({ onSuccess })` for side effects | `useEffect` watching `query.data`/`query.isSuccess` | TanStack Query v5 (installed version) | Directly affects the loader's dispatch-into-`WorldState` mechanism — see Pitfall #3 |

No other stack-relevant deprecations found; React 19, Rocket 0.5, sqlx are all unchanged from Phase 11's stack.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Populating `actor_org_id`/`granted_by_org_id` from the selected `Subject.unit` field (rather than a hardcoded constant or a new hidden org-picker) is an acceptable default since the server does not use these values for authorization | Pitfall #4 | Low — worst case is a planner/user preference for a different silent-default source; does not affect correctness or security since the field is genuinely unused server-side (confirmed by direct code read of the comment at handlers.rs:151-152) |
| A2 | Gating the client-side issuing UI on `role === "admin"` only (rather than building to the SPEC's literal "admin, manager" text) is the correct resolution of the SPEC/implementation mismatch | Pitfall #1 / Open Question #1 | Medium — if the *intended* fix is actually "add manager to the backend gate" (a backend change, out of scope per Phase 12 boundaries) rather than "narrow the UI to match the backend," building the UI now on admin-only and later widening the backend would require revisiting this component. Recommend surfacing this to the user before Wave 1 rather than deciding unilaterally in planning. |
| A3 | `Subject.unit` values (e.g. `"MILITARY_1"`, `"INTEL"`) are valid `org_id` values accepted by the backend's `actor_org_id`/`granted_by_org_id` fields | Pitfall #4 | Low — these are plain `String` fields with no FK constraint visible in the migration for the grant/delegate tables (only `resource_org_links.org_id` and org-link role checks reference org ids elsewhere); any string value satisfies the Rocket JSON deserialization, so even an imperfect choice here won't break functionality, only semantic tidiness |

## Open Questions

1. **(RESOLVED 2026-07-02, pre-planning)** Should the client-side issuing-authority gate be `admin`-only (matching the as-built backend) or should the backend be extended to accept `manager` (matching the SPEC/UI-SPEC text)?
   - What we know: The backend (`handlers.rs`) checks `role != "admin"` with no `manager` branch. 12-SPEC.md and 12-UI-SPEC.md both explicitly say "admin, manager". Phase 12's Boundaries explicitly prohibit "Any backend change... especially NO relaxation of AuthGuard/RBAC/CORS" — though adding a manager branch to an existing role check is arguably not a "relaxation" in the security-hole sense the prohibition targets (it was 11-04-SUMMARY's SEC-02 fold, aimed at closing unauthenticated/unauthorized holes, not at this specific business rule).
   - What's unclear: Whether "admin, manager" in the SPEC was an intentional design choice that the backend simply didn't implement correctly (a Phase-11 bug), or whether the SPEC copy is stale/wrong and admin-only was always the real intent.
   - **Resolution:** Surfaced to the user (AskUserQuestion, no response within session window); applied the recommended default. `12-SPEC.md` and `12-UI-SPEC.md` corrected in place to admin-only (see each doc's "Corrected 2026-07-02" note); `12-CONTEXT.md` D-01 locks it as a decision, not discretion. Zero backend changes. Verified implemented consistently across all 6 Phase 12 plans by gsd-plan-checker.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Yes (indirectly) | Demo reuses the main-app's existing Bearer JWT from `localStorage["token"]`; no new authentication surface is introduced — the loader/mutations rely entirely on the backend's existing `AuthGuard` |
| V3 Session Management | Yes (indirectly) | No new session mechanism; the demo has no login flow (explicit out-of-scope) and depends on the main app's token lifecycle. The 401 loader state exists specifically so an expired/invalid session degrades explicitly rather than silently |
| V4 Access Control | Yes | Client-side role gate (`role === "admin"`, see Pitfall #1) is a **UI convenience only** — UI-SPEC itself states this ("This is a client-side pre-check only — the backend re-validates the JWT role on every POST"). The actual access-control enforcement point is the server (`auth.claims.role != "admin"` in `handlers.rs`), which this phase must not weaken |
| V5 Input Validation | Yes | Form field values (timestamp, org/person selects) are constrained to `Select`-driven closed sets (existing `world.subjects`/resource list) except the two `date` inputs (`valid_from`/`valid_until`), which the backend already validates via `chrono::DateTime<Utc>` deserialization (malformed dates 400 at the Rocket layer, not silently accepted) |
| V6 Cryptography | No | No cryptographic operations in this phase; JWT verification is entirely server-side (Phase 11, `AuthGuard`), unchanged here |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Client trusts its own role-gate as the security boundary and skips a server 403 check in tests | Elevation of Privilege | UI-SPEC already mandates the 403 inline-error path coexist with the visible-gate path ("A 403 through a visible form is an expected edge, not a bug") — verification must exercise the actual POST with a non-admin token, not just the UI hidden/shown state |
| Loader silently falls back to stale/hardcoded `seedWorld()` digital-resource arrays on fetch failure, masking a real auth/network problem as normal operation | Tampering / Information Disclosure (masking) | Explicitly prohibited by SPEC (Prohibitions table); `seedWorld()` already initializes `digitalResources` to empty arrays post-11-03, so there is no hardcoded fallback data available to leak into this state even by accident — confirmed by direct read of `world-state.tsx:130-143` |
| `IssueGrantRequest`/`IssueDelegateRequest`'s vestigial `actor_org_id`/`granted_by_org_id` fields are read by a developer as "this is how authorization works" and later wired into a client-trusted authz decision | Elevation of Privilege | These fields are explicitly NOT used for authorization server-side (comment in `handlers.rs` references the prior `8ea8948` IDOR fix that removed exactly this trust) — treat them as opaque required-but-unused payload fields, never as an authorization input in any new code |

## Sources

### Primary (HIGH confidence — direct source reads, this repo)

- `frontend/src/demo/main.tsx`, `DemoRoot.tsx`, `store/world-state.tsx`, `lib/model.ts`, `lib/digital-resource-selectors.ts`, `components/zone-browser.tsx`, `components/access-resolution-explorer.tsx` — component/store/selector structure
- `frontend/src/hooks/use-access.ts`, `use-info-systems.ts`, `src/lib/api.ts`, `src/contexts/auth-context.tsx`, `src/main.tsx`, `src/types/api.ts` — React Query hook convention, auth/API client convention
- `backend/src/digital_resources/models.rs`, `handlers.rs`, `mod.rs`, `backend/src/shared/rocket_setup.rs`, `backend/src/shared/response.rs` — exact backend response/request shapes, role-gate logic, route mounts
- `backend/migrations/20260601130001_seed_digital_resources.sql`, `20260601120200_seed_enduser_official_users.sql` — seed idempotency pattern
- `.planning/phases/11-digital-resource-backend/11-04-SUMMARY.md`, `11-VERIFICATION.md` — established direct-psql apply precedent, SEC-02 role-gate fold details
- `.planning/phases/12-demo-ui-tab-integration/12-SPEC.md`, `12-UI-SPEC.md`, `12-CONTEXT.md` — locked requirements and design contract (this research's primary constraint set)
- `frontend/package.json`, `npm view @tanstack/react-query version` — installed vs. current registry version

### Secondary (MEDIUM confidence)

- [Migrating to TanStack Query v5 | TanStack Query React Docs](https://tanstack.com/query/latest/docs/framework/react/guides/migrating-to-v5) — `onSuccess`/`onError`/`onSettled` removal from `useQuery` in v5

### Tertiary (LOW confidence)

- None — all findings for this phase were groundable directly in the repo or an official migration guide; no unverified web claims were needed.

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — no new packages; installed version confirmed via `package.json` + `npm view`
- Architecture: HIGH — every pattern cited is a direct read of the exact file it mirrors, with line-level references
- Pitfalls: HIGH — all 6 pitfalls are grounded in direct source reads (backend structs, reducer code, grep results), not inferred; Pitfall #1 (admin/manager mismatch) is the single highest-value finding of this research pass and should be resolved explicitly before planning locks the role-gate implementation

**Research date:** 2026-07-02
**Valid until:** 2026-08-01 (30 days — stable internal codebase, no fast-moving external dependency)
</content>
