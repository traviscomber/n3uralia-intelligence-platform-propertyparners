# AUDIT 04 — Runtime reachability and consistency map (1–8)

Repository: `traviscomber/n3uralia-intelligence-platform-propertyparners`
Branch audited: `main`
Audit branch: `audit/phase-1-reality`
Mode: evidence-first; no product behavior changed in this step.

## Scope

1. `app/dashboard/layout.tsx`
2. `components/layout/sidebar.tsx`
3. `components/layout/topbar.tsx`
4. Role and access helpers
5. Privileged API routes
6. Runtime imports into `lib`
7. Root data vs `data/canonical`
8. Supabase tables and expected RLS

---

## Executive result

The application has a real authenticated dashboard shell and a middleware-level authorization layer, but the current system is not yet internally consistent.

The main inconsistency is that navigation, route authorization, provenance labels, role naming and data authority are defined independently in multiple files. They partially agree, but no single policy object governs the complete runtime.

No confirmed P0 was established from static inspection. Several P1 risks remain.

---

# 1. Dashboard layout

File: `app/dashboard/layout.tsx`

## Confirmed runtime behavior

- Creates a server-side Supabase client.
- Calls `auth.getUser()`.
- Redirects unauthenticated users to `/auth/login`.
- Reads the complete `profiles` row using `.select('*')`.
- Passes the profile to the sidebar and topbar.
- Renders the CEO assistant only when `profile.role` lowercases to `ceo`.

## Findings

### P1 — Authorization is not owned by the layout

The layout authenticates but does not independently enforce the current pathname against role permissions. Enforcement depends on proxy execution.

Impact:
- a future matcher/configuration regression can expose a dashboard page that assumes authorization has already occurred;
- tests or alternate runtimes that bypass proxy may render unauthorized pages.

Correction:
- retain proxy enforcement;
- add a server-side route guard helper for privileged layouts/pages or introduce role-specific route groups;
- do not rely on UI visibility as authorization.

### P2 — Profile over-fetching

The layout selects all profile columns while the visible shell needs only a small subset.

Correction:
- select an explicit profile projection such as `id, full_name, role, organization_id` once the schema is confirmed.

### P2 — Role normalization differs across files

The layout lowercases the role, while the sidebar compares raw values exactly.

Impact:
- `CEO`, `Ceo` or whitespace variants could render the CEO widget but not executive navigation.

Correction:
- normalize role once in a shared server utility and pass a typed normalized role to all consumers.

---

# 2. Sidebar

File: `components/layout/sidebar.tsx`

## Confirmed runtime behavior

- Uses three independently defined navigation trees: executive, director and seller.
- Treats `ceo` and `admin` as executive.
- Treats only exact `director` as director.
- All other profiles receive the seller menu.

## Findings

### P1 — Unknown roles receive seller navigation

The expression selecting sections defaults to `sellerSections` for every role not equal to CEO/admin/director.

Impact:
- a malformed, new or unauthorized role can see seller links even though middleware may reject route access;
- UI policy and security policy communicate different truths.

Correction:
- unknown roles must render no operational navigation and an explicit unauthorized state.

### P1 — Navigation policy duplicates authorization policy

Sidebar sections and `dashboard-access.ts` contain separate route lists.

Observed inconsistency examples:
- `/dashboard/agente` is allowed to sellers by access policy but is absent from seller navigation.
- `/dashboard/director` appears in director navigation while the access helper allows directors almost every non-executive-only dashboard path.
- administration labels and paths are separately maintained.

Correction:
- create one typed route registry containing path, label, icon key, roles, group, provenance class and exact/prefix behavior;
- derive sidebar and authorization decisions from that registry.

### P2 — Brand tokens are bypassed

Active navigation uses hardcoded `#d7332b` and `#ff766f` values instead of semantic tokens.

Correction:
- map active, icon and semantic colors to approved brand tokens.

### P2 — Mixed-language information architecture

Section headings are English while page labels are Spanish.

Correction:
- choose a single interface language for the internal product and apply it consistently.

---

# 3. Topbar

File: `components/layout/topbar.tsx`

## Confirmed runtime behavior

- Classifies routes as `audited`, `live`, or `pending` using hardcoded pathname arrays.
- Displays hardcoded source-cutoff labels by pathname.
- Signs the user out through the browser Supabase client.

## Findings

### P1 — “Fuente auditada” is asserted from pathname alone

A page is labelled audited because its path appears in a static array. No runtime verification of artifact hash, validation result, source freshness or query provenance is used.

Impact:
- users may interpret the badge as a live integrity guarantee;
- new or changed page internals can remain labelled audited after their evidence chain changes.

Correction:
- rename the current badge to a non-verifying classification such as `Vista basada en artefacto auditado`, or calculate state from a server-provided provenance contract;
- provenance must be attached to the data response, not inferred from URL.

### P1 — Cutoff labels can become stale silently

Dates such as June 2026, September 2020 and January 2026 are embedded in the component.

Correction:
- read source dates from the same generated artifact or API payload used by the page;
- show `fecha no disponible` when no verified timestamp exists.

### P2 — Unused `user` contract

The component type requires `user`, but the implementation destructures only `profile`.

Correction:
- remove the unused prop or use it for an intentional identity function.

---

# 4. Role and access helpers

Files reviewed:
- `lib/dashboard-access.ts`
- `lib/role-access-control.ts`
- `proxy.ts`
- `lib/supabase/proxy.ts`

## Confirmed runtime chain

```text
proxy.ts
  -> updateSession(request)
     -> Supabase auth.getUser()
     -> profiles.role
     -> canAccessDashboardPath(role, pathname)
```

This proves that dashboard path authorization is enforced in production middleware when the configured proxy matcher runs.

## Findings

### P1 — Two incompatible authorization abstractions

`dashboard-access.ts` performs path-prefix authorization. `role-access-control.ts` checks whether a route exactly equals one dashboard value returned by `role-intelligence-model`.

Impact:
- callers can receive different answers for the same role and route;
- one helper can become a decorative abstraction rather than the actual security boundary.

Correction:
- designate one authorization module as authoritative;
- delete or adapt the other to call the authoritative policy.

### P1 — Cookie-based redirect role vocabulary differs from profile role vocabulary

`proxy.ts` redirects `/dashboard` using a client cookie with roles such as `board_director`, `account_director` and `executive`. The access helper and sidebar use `admin`, `ceo`, `director` and `seller`.

Impact:
- redirect destination can disagree with the authenticated profile;
- routes such as `/dashboard/accounts` and `/dashboard/executive` may not exist or may not match authorization policy.

Correction:
- remove role routing based on the independent cookie;
- resolve the authenticated profile role server-side and use the same route registry as authorization and navigation.

### P1 — Development disables authentication enforcement

`lib/supabase/proxy.ts` skips auth enforcement entirely when `NODE_ENV === development`.

Impact:
- local validation can miss authorization defects;
- developers can mistakenly treat a development flow as production-equivalent.

Correction:
- do not disable authentication globally in development;
- use an explicit opt-in test bypass variable that cannot be enabled in production.

### P2 — Directors are effectively allowed by default

After excluding a limited `EXECUTIVE_ONLY` list, directors are allowed every remaining dashboard route.

Correction:
- use explicit allowlists for all roles, including directors.

---

# 5. Privileged API routes

## Confirmed positive finding

Legacy database mutation endpoints such as `app/api/db/init/route.ts` and `app/api/db/reinit/route.ts` are retired and return HTTP 410 without writes.

## Cron behavior

`app/api/cron/agents/route.ts`:
- uses the Supabase service-role key;
- checks `Authorization: Bearer <CRON_SECRET>`;
- allows execution without a secret outside production;
- writes agent runs, sources and findings;
- constructs an idempotency key from schedule ID and next-run timestamp.

## Findings

### P1 — API authentication is broad, authorization remains route-specific

Middleware rejects unauthenticated API consumers, except cron paths. It does not establish role authorization for all authenticated API routes.

Correction:
- every privileged API route must call a shared server authorization helper;
- document route capability requirements: read, import, approve, execute agent, administer settings, mutate database.

### P1 — Service-role endpoints require a complete inventory

Any cron route bypasses browser authentication and can use elevated credentials. Static inspection of one cron route confirms a correct secret comparison, but this does not prove all cron routes follow the same contract.

Correction:
- centralize `requireCronSecret()` and service-client creation;
- prohibit local fail-open behavior unless an explicit development variable is set;
- audit every `app/api/cron/**/route.ts`.

### P2 — Database endpoints remain routable although retired

Returning 410 is safer than execution, but keeping public route surfaces increases noise and future regression risk.

Correction:
- remove retired routes after confirming no operational dependency, or maintain a tested deny-only handler shared across retired administrative endpoints.

---

# 6. Runtime imports into `lib`

## Confirmed active chain

The following path is directly reachable from the dashboard shell:

```text
app/dashboard/layout.tsx
  -> components/ceo/ceo-ai-assistant-widget.tsx
  -> /api/ceo/question
  -> lib/ceo-intelligence-context.ts
  -> lib/n3uralia-intelligence-engine.ts
  -> source snapshot modules
  -> lib/executive-reasoning-pipeline.ts
  -> lib/openai-reasoning-layer.ts
```

The shell also directly reaches sidebar, topbar, Supabase server/client utilities and role access middleware.

## Findings

### P1 — File presence is not runtime reachability

The repository contains many similarly named engines and orchestrators. Current evidence does not establish that each is imported by an app route, API route, component or another reachable module.

Correction:
- generate an import graph from all app entry points;
- classify every `lib` file as `reachable`, `test/tooling only`, `orphan candidate` or `dynamic/unknown`;
- remove or archive orphan candidates only after build and behavior checks.

### P1 — Multiple conceptual owners exist

Examples include several CEO orchestrators, intelligence orchestrators, memory engines and reasoning engines.

Correction:
- choose one owner per capability and route all callers through it;
- rename experimental modules explicitly with an `experimental/` boundary if they must remain.

### Validation gap

GitHub code search returned incomplete results for exact import queries, so a complete graph still requires repository checkout or a CI-generated static dependency artifact. This limitation is recorded; no claim of complete reachability is made.

---

# 7. Root data versus `data/canonical`

## Confirmed runtime evidence

`lib/crm-snapshot.ts` imports:

```text
@/data/crm-intelligence.json
@/data/targets-2026.json
```

It does not import the corresponding files under `data/canonical/`.

## Findings

### P1 — “Canonical” files are not proven authoritative at runtime

The repository contains duplicate semantic datasets in root and canonical directories, while a confirmed runtime module consumes root data.

Impact:
- users and developers cannot infer the active source from directory naming;
- build scripts can update one copy while runtime reads the other;
- documentation can describe canonical state that is not actually delivered.

Correction options:

Preferred:
- generated artifacts live only under `data/canonical/`;
- runtime snapshot modules import only canonical paths;
- build scripts write atomically to canonical paths;
- verification scripts validate those exact files.

Temporary alternative:
- keep root compatibility files as generated aliases;
- add a verification script requiring byte/hash equality with canonical files;
- mark root files deprecated.

### P1 — Generated timestamps and target data influence runtime directly

`crm-snapshot.ts` maps generated artifact data into KPI fallbacks and uses target values from the root target file.

Correction:
- attach artifact version, hash, generated-at, source period and validation status to every runtime snapshot;
- reject or clearly degrade invalid/stale artifacts.

---

# 8. Supabase tables and expected RLS

## Confirmed code-level table usage in reviewed flows

- `profiles`
- `copilot_feedback`
- `decision_history`
- `agent_runs`
- `agent_sources`
- `agent_findings`
- agent schedule-related tables implied by cron execution

Previously reviewed repository work also references valuation and canonical market tables.

## Findings

### P1 — `lib/rls-security-map.ts` is descriptive, not enforcement

The file contains human-readable policy labels for generic names such as `decisions`, but it does not prove PostgreSQL RLS is enabled or that actual table policies exist.

Correction:
- derive an RLS inventory from migrations or live Supabase metadata;
- map exact physical tables, policies, commands, roles and predicates;
- fail CI when an exposed table lacks enabled RLS or expected policies.

### P1 — Exact authorization requirements are not encoded for executive memory

Code-level writes to `decision_history` and `copilot_feedback` require verification of:
- role restrictions;
- organization/tenant scoping;
- ownership predicates;
- update/delete policy;
- service-role-only operations where applicable.

Correction:
- use explicit `organization_id` or equivalent tenant key on operational tables;
- enforce role and tenant predicates in RLS, not only API code;
- add policy tests using authenticated CEO, director, seller and cross-tenant fixtures.

### P1 — Service-role writes bypass RLS

Cron code uses the service-role key, which is expected for controlled automation but bypasses normal RLS.

Correction:
- authenticate cron strictly;
- validate schedule ownership and target organization before each write;
- add audit fields for execution identity, schedule, source and request ID;
- never treat RLS as protection for service-role code.

---

# Cross-system consistency matrix

| Concern | Current owners | Status |
|---|---|---|
| Role vocabulary | profile, sidebar, dashboard access, cookie redirect, intelligence model | inconsistent |
| Route registry | sidebar arrays, access arrays, topbar arrays | duplicated |
| Provenance | pathname badges, JSON artifacts, verification scripts | not unified |
| Data authority | root JSON and canonical JSON | ambiguous |
| API authorization | middleware plus route-specific checks | incomplete inventory |
| RLS truth | migrations/live database vs descriptive TS map | unverified |
| AI runtime | confirmed primary chain plus many similarly named modules | partial reachability |
| Cron security | per-route implementation | requires centralization |

---

# Required implementation order

## Phase A — One role and route contract

1. Define normalized roles.
2. Define one typed route registry.
3. Derive sidebar navigation from it.
4. Derive middleware access from it.
5. Derive default dashboard redirects from it.
6. Remove independent role cookie routing.
7. Render unknown roles as unauthorized.

## Phase B — Honest provenance contract

1. Remove pathname-only claims of audit status.
2. Add a server-provided provenance object to each data domain.
3. Show artifact version, period, generated-at and validation status.
4. Display honest unavailable/stale states.

## Phase C — Canonical data authority

1. Select `data/canonical` as the only generated authority.
2. Update runtime imports.
3. Update builders and verification scripts.
4. Add hash equality checks during transition.
5. Remove deprecated duplicates after validation.

## Phase D — API and Supabase security

1. Inventory every API route by capability.
2. Centralize user-role authorization.
3. Centralize cron authorization and service client creation.
4. Audit migrations and live RLS.
5. Add policy tests for each role and tenant boundary.

## Phase E — Dependency reduction

1. Generate a complete import graph.
2. Label reachable and orphan modules.
3. Consolidate overlapping engines.
4. Remove dead modules in small verified commits.

---

# Approval status

Not approved as globally consistent.

Confirmed strengths:
- real server authentication in the dashboard layout;
- production middleware path authorization;
- retired legacy database mutation endpoints;
- cron secret comparison in the inspected agent route;
- clear intent to separate audited artifacts and live sources.

Blocking consistency issues:
- duplicated route and role policy;
- cookie/profile role mismatch;
- pathname-based provenance claims;
- root/canonical data ambiguity;
- incomplete API authorization inventory;
- RLS not proven by the descriptive map;
- incomplete reachability graph.

Next execution target: implement Phase A first on the audit branch, then run build/lint/access verification before touching data authority or database policy.