# AUDIT 03 — Repository Inventory

Status: IN PROGRESS — structural inventory established
Repository: `traviscomber/n3uralia-intelligence-platform-propertyparners`
Source branch: `main`
Audit branch: `audit/phase-1-reality`
Reference comparison: `b1314bc07f0aacf85314c832d632b1a73c4ff421..main`

## Evidence boundary

GitHub reports that `main` is 297 commits ahead of the selected early baseline. The comparison exposes the files added, removed or modified during that range and is sufficient to identify the major active surfaces created during the current platform build.

It is **not** a guaranteed full tree listing:

- files that existed at the baseline and never changed may not appear;
- a file appearing in the comparison may later have been removed, so status must be respected;
- file presence does not prove import, execution, deployment or database connectivity;
- zero-line statistics for some binary or connector-normalized files do not mean the files are empty.

The inventory below therefore distinguishes observed structure from verified runtime behavior.

---

## 1. Repository and framework

### Observed

- Repository visibility is public.
- Default branch is `main`.
- Repository is not archived.
- Application package name remains the generic `my-project` at version `0.1.0`.
- Runtime framework is Next.js `16.2.6`, React `19`, TypeScript `5.7.3` and Tailwind CSS `4.2.0`.
- TypeScript strict mode is enabled.
- `allowJs` and `skipLibCheck` are also enabled.
- The TypeScript configuration excludes `scripts`, so build/verification scripts are outside the main compiler boundary.
- Next image optimization is globally disabled through `images.unoptimized: true`.

### Assessment

The application is built on a current strict TypeScript stack, but the repository identity and validation boundary are immature:

- generic package identity weakens release traceability;
- excluding scripts means critical data-build and verification code can drift without TypeScript checking;
- `skipLibCheck` reduces dependency-level type assurance;
- global image optimization disablement transfers performance and sizing responsibility to every implementation surface.

### Findings

- **Medium — release identity.** `my-project@0.1.0` does not identify the production platform.
- **Medium — verification scripts outside compiler scope.** Data provenance tooling is not covered by the main TypeScript program.
- **Medium — image pipeline disabled globally.** Performance and responsive-image behavior require explicit audit.
- **Low — dependency type checks skipped.** This may hide compatibility issues across a rapidly evolving dependency set.

---

## 2. Package capability surface

### Application dependencies

Observed dependency families:

- Supabase SSR and JavaScript client;
- Vercel Analytics;
- Base UI, shadcn, Lucide, class-variance-authority and Tailwind utilities;
- Leaflet, React Leaflet, MapLibre and React Map GL;
- Recharts;
- XLSX and node-html-parser;
- DOCX, PDFKit, pdf-lib, html2pdf and html-docx tooling;
- Puppeteer and Sharp;
- Postgres direct client;
- Archiver and file-saver.

### Assessment

The dependency surface indicates one application is handling:

- authenticated operational dashboards;
- maps and territory visualization;
- document generation and export;
- data ingestion and spreadsheet processing;
- server-side browser rendering;
- direct database access;
- analytics;
- AI and executive workflows.

This is feasible, but creates a large deployment and security surface. Several overlapping libraries serve the same functional category:

- three mapping stacks;
- multiple PDF/DOCX generation approaches;
- Supabase client plus direct Postgres client;
- browser and server document exporters.

The inventory does not yet prove each dependency is still used.

### Findings

- **High — dependency overlap requires reachability audit.** Multiple libraries may represent duplicate implementations or dead code.
- **Medium — server bundle risk.** Puppeteer, Sharp, PDF libraries and XLSX can materially affect serverless bundle size and cold starts.
- **Medium — database access fragmentation.** Supabase and direct Postgres access require a clear trust-boundary and credential audit.

---

## 3. Defined verification and build commands

### Standard commands

- `dev`
- `build`
- `start`
- `lint`

### Brand, access and provenance checks

- `brand:contrast`
- `brand:dashboard`
- `tone:internal`
- `access:verify`
- `directory:verify`
- `data:provenance`

### Data artifact pipelines

- CRM build and verification, including cell-manifest verification;
- targets build and verification;
- presentations build and verification;
- market source build and verification;
- valuation build, source verification and model verification;
- ML readiness verification.

### Assessment

The repository contains unusually strong intent around auditability and deterministic data artifacts. However:

- no aggregate `verify` or CI command is defined;
- no test command is defined;
- package scripts alone do not prove checks are run in GitHub Actions or Vercel;
- several scripts operate on business-critical data while being excluded from TypeScript compilation.

### Findings

- **High — no automated test command observed.** There is no unit, integration or end-to-end test entry point in `package.json`.
- **High — no single release gate.** Build, lint, access, provenance and data checks are separate and may not run together.
- **Medium — verification presence may be mistaken for execution.** CI and deployment wiring remain unverified.

---

## 4. Application routes observed

### Authentication

- `/auth/login`
- `/auth/sign-up`
- `/auth/error`

### Dashboard shell and primary roles

- `/dashboard`
- `/dashboard/ceo`
- `/dashboard/director`
- `/dashboard/agente`
- `/dashboard/board`
- `/dashboard/control`

### Intelligence and data

- `/dashboard/inteligencia`
- `/dashboard/datos-crm`
- `/dashboard/metas`
- `/dashboard/presentaciones`
- `/dashboard/knowledge`
- `/dashboard/ml-lab`

### Market and property operations

- `/dashboard/market`
- `/dashboard/market/fuentes`
- `/dashboard/market/import`
- `/dashboard/properties`
- `/dashboard/valorizador`
- `/dashboard/sources`

### Agents and Copilot

- `/dashboard/agents`
- `/dashboard/agents/metrics`
- `/dashboard/copilot`
- `/dashboard/copilot/chat`

### Reports

- `/dashboard/reportes`
- `/dashboard/reportes/autonomos`
- `/dashboard/reportes/directorio`
- `/dashboard/reportes/[directorId]`
- `/dashboard/reportes/audiencias/[audience]`

### Settings

- `/dashboard/settings`

### Assessment

The product surface is broad and contains overlapping executive interfaces:

- CEO dashboard;
- board dashboard;
- intelligence dashboard;
- Copilot root and chat;
- autonomous reports and board reports;
- several agent surfaces.

The route inventory suggests the application may have evolved by addition rather than consolidation. Navigation, ownership and canonical workflow need dependency and runtime tracing before any redesign.

### Findings

- **High — information architecture overlap.** CEO, board, intelligence, Copilot and agents may expose duplicated decision workflows.
- **Medium — route ownership unclear.** Several surfaces may be shells over the same engines or isolated prototypes.
- **Medium — dynamic report authorization requires verification.** `[directorId]` and `[audience]` routes must be checked for role and record-level access.

---

## 5. API surface observed

### CEO

- `/api/ceo/question`
- `/api/ceo/feedback`

### Agent execution and governance

- `/api/agents/approvals`
- `/api/agents/evaluations`
- `/api/agents/exports`
- `/api/agents/market/run`
- `/api/agents/metrics`
- `/api/agents/notifications`
- `/api/agents/reports/run`
- `/api/agents/runs`
- `/api/agents/valuation/run`
- `/api/cron/agents`

### Reports

- `/api/report-directory`
- `/api/report-deliveries`
- `/api/report-delivery-targets`
- `/api/reports`
- `/api/reports/board`
- `/api/reports/generate`
- `/api/reports/weekly`
- `/api/reports/export`
- director-specific export and PDF routes
- weekly delivery cron

### Market and scraping

- `/api/market/import`
- `/api/market/import/template`
- `/api/market/insights`
- `/api/scrape/portal-inmobiliario`
- source-refresh cron

### Valuation

- `/api/valorizador/analisis`
- `/api/valorizador/pdf`

### Profiles and access

- `/api/profile`
- `/api/profiles`
- `/api/pp/recommendations`
- `/api/prc/sync`

### Database and maintenance endpoints

- `/api/db/init`
- `/api/db/migrate`
- `/api/db/reinit`
- `/api/db/expand-roles`
- `/api/maintenance/dedupe-properties`

### Assessment

This is a large privileged API surface. The presence of database initialization, migration, reinitialization, role expansion, maintenance, scraping, cron and autonomous agent execution endpoints creates a high-priority security boundary.

Several endpoints were heavily reduced rather than deleted, so their current behavior must be inspected. A small route can still invoke privileged shared code.

### Findings

- **High — privileged administrative routes.** Database initialization, migration, reinitialization and role expansion must be verified for environment restriction and authorization.
- **High — autonomous execution surface.** Agent run, cron, approval and export paths require explicit human-approval and idempotency review.
- **High — scraping boundary.** Portal scraping remains present after other scraper routes were removed; legal, authentication, rate and runtime behavior remain unverified.
- **Medium — overlapping report endpoints.** Generation, export, PDF and scheduled delivery need one canonical pipeline and consistent access control.

---

## 6. Shared component surface observed

### Layout and brand

- `components/layout/sidebar.tsx`
- `components/layout/topbar.tsx`
- `components/brand/pp-logo.tsx`

### CEO workspace

- AI assistant widget;
- thinking indicator;
- assistant session;
- intelligence feed;
- Copilot control center.

### Intelligence UI

- design-system primitives;
- evidence timeline;
- executive Copilot;
- decision graph;
- executive memory;
- portfolio dashboard.

### Agents and reports

- agent control center;
- exports and notifications;
- board print control;
- report directory and delivery-target managers.

### Assessment

A shared UI system exists in naming, but actual reuse and consistency are not yet established. The repository contains both generic `components/intelligence/design-system.tsx` and direct hardcoded styles in feature components. The global visual audit must begin with tokens, `globals.css`, brandbook, layout shell and shared navigation before screen-level conclusions.

### Findings

- **High — possible parallel design systems.** Named design-system components coexist with feature-local styling.
- **Medium — executive component fragmentation.** Multiple CEO/Copilot components may overlap or be inactive.
- **Medium — shell is a critical dependency.** Sidebar, topbar and dashboard layout control consistency across nearly every route.

---

## 7. Intelligence and agent library surface

The comparison exposes a very large `lib` layer with families for:

- CEO context, profiles, questions, live context, briefings and operating system;
- executive reasoning, memory, truth, governance, actions, reports and communication;
- agent management, evaluation, collaboration, approvals and autonomous execution;
- market, territory, opportunity, portfolio and valuation intelligence;
- data, document, evidence, knowledge and graph intelligence;
- Supabase gateways, mappers, live intelligence and auth context;
- temporal analytics, forecasting, predictive intelligence and ML readiness;
- Copilot routing, memory, orchestration and knowledge routing.

### Assessment

The volume and naming indicate significant architectural duplication risk. Similar responsibilities appear under multiple modules:

- orchestrator, runtime orchestrator, gateway and engine variants;
- executive reasoning engine, reasoning pipeline, reasoning core and OpenAI layer;
- several memory engines and graphs;
- multiple CEO context and live-provider modules;
- multiple agent intelligence implementations.

File presence does not prove this is a coherent architecture. The next phase must build an import/invocation graph and classify every module as:

1. active runtime dependency;
2. indirectly active;
3. script-only;
4. documentation/prototype;
5. orphaned/dead;
6. superseded but still present.

### Findings

- **High — probable orchestration duplication.** Multiple similarly named layers can create contradictory business rules.
- **High — dead-code risk.** The number of newly added libraries is disproportionate to the number of active route entry points.
- **High — trust-boundary diffusion.** Supabase, autonomous actions, AI reasoning and data governance are spread across many modules.

---

## 8. Data artifacts observed

### Primary artifacts

- `data/crm-intelligence.json`
- `data/targets-2026.json`
- `data/targets-cell-manifest.json`
- `data/presentations-2026.json`
- `data/presentations-2026-summary.json`
- `data/market-source-intelligence.json`
- `data/valuation-intelligence.json`

### Canonical copies

- `data/canonical/crm-intelligence.json`
- `data/canonical/targets-2026.json`
- `data/canonical/presentations-2026.json`
- `data/canonical/market-source-intelligence.json`
- `data/canonical/valuation-intelligence.json`
- `data/canonical/knowledge-base.json`
- `data/canonical/kpi-history.json`

### Assessment

The coexistence of root data artifacts and `data/canonical` copies creates an immediate source-of-truth question:

- which path is imported by runtime code;
- whether both are generated from the same inputs;
- whether hashes and timestamps reconcile;
- whether canonical copies are actually authoritative or just duplicated exports.

Earlier commit inspection already confirmed several runtime modules import root-level artifacts. The canonical directory therefore cannot be assumed to be the active source of truth.

### Findings

- **High — duplicate artifact authority.** Root and canonical copies may diverge.
- **High — naming can overstate governance.** A `canonical` directory is not proof of canonical runtime use.
- **Medium — generated artifacts are committed.** Build reproducibility, source confidentiality and stale-data handling require verification.

---

## 9. Documentation surface observed

Major documentation groups include:

- Codex/reference and integration-complete documents;
- company knowledge and model canons;
- CRM and targets data contracts;
- data provenance audit;
- CEO dashboard and Copilot architecture;
- N3uralia OS architecture;
- market intelligence strategy;
- knowledge-base and extraction narratives.

### Assessment

Documentation is extensive and often uses definitive production language. Previous commit auditing already found several claims that exceed demonstrated evidence. Documentation must be mapped to active code and deployment state rather than treated as proof.

### Findings

- **High — claim inflation risk.** Architecture and “complete” documents may describe intended state.
- **Medium — documentation duplication.** Multiple canon/reference files may conflict.
- **Medium — stale operational guidance.** Removed database setup/fix documentation and retained DB routes suggest changing operational procedures.

---

## 10. Removed or superseded surfaces

The comparison records removal of:

- Realtor and Portal Inmobiliario benchmark routes;
- several scraper routes and scraper base modules;
- neighborhood APIs and map component;
- proposal-generation endpoints and generated proposal assets;
- valuation AI and PDF modules;
- prior database setup/fix documents;
- large portions of reports, properties and scraper implementations.

### Assessment

The platform has undergone major replacement rather than incremental stabilization. Neighboring references, imports, navigation entries and documentation may remain stale. Removal itself is not proof that all callers were removed.

### Findings

- **High — stale-reference risk.** Removed routes and modules require import/link searches.
- **Medium — lost functionality risk.** Large deletions should be compared against current acceptance criteria.
- **Medium — migration residue.** Old and replacement architectures may coexist under new names.

---

## 11. Preliminary architecture map

```text
Next.js App Router
│
├── Auth pages
├── Dashboard shell
│   ├── role dashboards
│   ├── CRM / targets / presentations
│   ├── market / properties / valuation
│   ├── agents / Copilot / intelligence
│   └── reports / settings
│
├── Route handlers
│   ├── CEO reasoning and feedback
│   ├── autonomous agents and cron
│   ├── reports and exports
│   ├── market import / insight / scrape
│   ├── valuation
│   ├── profile / recommendations / sync
│   └── database administration / maintenance
│
├── Shared components
│   ├── brand and shell
│   ├── CEO workspace
│   ├── intelligence visualizations
│   └── agent and report controls
│
├── Intelligence libraries
│   ├── deterministic artifact readers
│   ├── temporal / market / valuation analytics
│   ├── executive reasoning and OpenAI
│   ├── memory and decision history
│   ├── autonomous agent execution
│   └── Supabase gateways and authorization
│
├── Committed data artifacts
│   ├── root runtime artifacts
│   └── canonical copies
│
└── External systems
    ├── Supabase
    ├── OpenAI
    ├── Vercel
    ├── scraping sources
    └── document generation runtime
```

---

## 12. Current risk concentration

### P0 / Critical

None confirmed from structure alone.

### P1 / High

1. Privileged database and autonomous-execution API routes require immediate access-control tracing.
2. The intelligence library contains probable duplicate and orphaned implementations.
3. Root and canonical data artifacts have unresolved source-of-truth semantics.
4. No automated test command or unified release gate is defined.
5. Documentation frequently appears more definitive than verified runtime state.
6. Multiple executive and intelligence routes may duplicate user workflows and business logic.
7. Removed modules and major rewrites create stale-reference and regression risk.

### P2 / Medium

1. Generic package identity and versioning.
2. Data scripts excluded from TypeScript compilation.
3. Global image optimization disabled.
4. Overlapping map, document and database dependency stacks.
5. Dynamic report authorization unverified.

---

## 13. What is now established

The repository is not a small dashboard. It is a broad operating platform containing:

- role-based workspaces;
- executive AI;
- agent execution;
- market and valuation workflows;
- reporting and document generation;
- committed business intelligence artifacts;
- privileged database and maintenance endpoints;
- multiple overlapping architecture generations.

The central technical risk is no longer absence of functionality. It is **uncertain reachability, duplicated authority and insufficiently verified trust boundaries**.

---

## 14. Next mandatory audit step

Build the dependency and reachability graph in this order:

1. dashboard layout, sidebar, topbar and role access;
2. every active API route and its authorization helper;
3. imports from each page and route into `lib` modules;
4. runtime imports of root versus canonical data artifacts;
5. Supabase table usage, writes and expected RLS;
6. autonomous action and cron entry points;
7. dead, superseded and documentation-only modules;
8. CI and Vercel execution of package verification scripts.

No remediation should begin until the active dependency graph identifies the canonical runtime paths.
