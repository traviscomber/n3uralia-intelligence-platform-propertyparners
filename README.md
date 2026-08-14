# Property Partners Intelligence Platform

Enterprise operating system for real-estate intelligence, property valuation and commercial management for PL Real Estate SpA, licenciatario de Property Partners Chile S.A.

**Powered by N3uralia.**

This repository is not a generic dashboard and not a chatbot wrapper. The product is built around one operating principle:

> **Evidence → Decision → Action → Traceability**

Every meaningful surface should answer five questions:

1. What is happening?
2. How reliable and current is the information?
3. What requires attention?
4. What action is available now?
5. What evidence supports the decision?

---

## 1. Product thesis

Property Partners Intelligence Platform converts fragmented commercial, market, property and valuation information into a governed operating layer for CEO, directors, subdirectors and partners.

The system deliberately separates:

- canonical facts from assumptions;
- approved values from documentary fallback;
- deterministic business rules from AI reasoning;
- authorized scope from global information;
- proposed actions from executed actions;
- missing information from zero;
- evidence from presentation;
- AI assistance from operational authority.

The application must never invent values, silently fill missing data, expose privileged internals or imply certainty that the evidence does not support.

---

## 2. Contractual core and product intelligence

The productive contractual core remains organized around three interoperable modules:

1. **Market Intelligence**
2. **Property Valuation**
3. **Commercial Management Control**

Historical copilots, experimental multi-agent systems, executive graphs, ML Lab, experimental corporate memory and other legacy Version 2 capabilities were retired from runtime. Applied migrations and historical traceability were preserved to avoid altering database state.

### Product intelligence layer

A new governed intelligence layer is being built on top of the audited contractual core. It does **not** revive the retired legacy Copilot.

Its active interface is **Pedro Pablo**, the Property Partners executive assistant.

This layer must not be interpreted as a contractual acceptance item unless it is explicitly incorporated into contractual scope and acceptance evidence.

---

## 3. What makes this platform different

### 3.1 Decision Trace

Material signals are designed to expose their reasoning chain instead of appearing as unexplained scores.

A decision trace can include:

- evidence status;
- source;
- source reference;
- cutoff date;
- rule identifier and version;
- rule origin;
- severity;
- confidence;
- available action;
- evidence count.

The objective is not to make the interface look intelligent. The objective is to make important decisions **auditable**.

### 3.2 Canonical data before AI

AI is not the source of truth.

```text
Canonical sources
      ↓
Validated application data
      ↓
Deterministic rules / contractual methodology
      ↓
Decision Trace
      ↓
Role-specific product surface
      ↓
Pedro Pablo
      ↓
Structured proposed action
      ↓
Human confirmation
      ↓
Server-validated execution
```

AI may explain, summarize, compare and structure a next action. It must not create missing facts or silently change canonical data.

### 3.3 Honest uncertainty

The product preserves states such as:

- unavailable;
- missing;
- documentary canonical;
- canonical derived;
- approved live;
- external market evidence;
- provisional N3uralia rule;
- non-evaluable.

Unavailable information is never converted to `0` merely to complete a chart or KPI.

### 3.4 Role-native intelligence

The same database does not produce the same product for every user.

**CEO / administration**

- company-wide operational status;
- cross-office comparison;
- exceptions requiring intervention;
- source quality and freshness;
- governance and reporting;
- global valuation and property visibility according to capability.

**Director / subdirector**

- office performance;
- team workload;
- unresolved alerts and tasks;
- valuations under review;
- property assignment and evidence quality;
- next actions inside office scope.

**Partner / seller**

- personal performance;
- assigned work;
- own tasks;
- own valuations;
- authorized portfolio context;
- no visibility into unrelated offices or users.

Restricted destinations are normally hidden instead of displayed as unusable controls. UI visibility never replaces server-side authorization.

---

## 4. Pedro Pablo — objective executive assistant

Primary surface:

`/dashboard/pedro-pablo`

Pedro Pablo is an **objective executive assistant over governed operating intelligence**. It is not a personality simulator and does not provide personal opinions.

Its purpose is to help the decision-maker understand what matters, what evidence supports it, what is missing and what should be reviewed next.

### Executive operating profile

The assistant uses a versioned executive profile with the following decision lens:

1. What changed or requires attention?
2. What operational impact does it have inside the authorized scope?
3. What evidence supports the reading and what is its cutoff?
4. What information is missing or non-evaluable?
5. What is the next verifiable action and who should review it?

Communication rules:

- executive, factual, direct and neutral;
- conclusion first;
- evidence and next action second;
- short operational Spanish;
- no rhetorical or decorative language;
- no personal opinions or value judgments;
- no emotional or persuasive language;
- no unsupported recommendations.

If evidence is insufficient, Pedro Pablo must state that explicitly and stop the conclusion instead of filling the gap.

### Active context domains

Pedro Pablo currently composes authorized context from four operating domains:

- **Management** — metrics, compliance and alerts.
- **Tasks** — active, overdue and urgent operational work.
- **Valuations** — visible cases and workflow state.
- **Properties** — authorized portfolio assignments, identity status and freshness signals.

The assistant degrades honestly when a domain is unavailable for the current role.

### Current capabilities

Pedro Pablo can currently:

- answer what requires attention today;
- summarize performance and compliance;
- analyze an authorized management entity by name;
- identify active, overdue and urgent tasks;
- include visible valuation cases and their workflow state;
- surface cases in draft, review, approved or issued states;
- identify property assignments requiring identity review;
- identify portfolio records requiring freshness review;
- expose data coverage by domain;
- expose source and cutoff alongside evaluable answers;
- generate structured action proposals;
- assign priority and domain to each proposal;
- preserve evidence references inside proposals;
- distinguish proposal, preview and executed states;
- avoid direct database writes from the reasoning layer.

### Decision policy

Pedro Pablo applies deterministic prioritization before any future model reasoning:

```text
Authorized evidence
      ↓
Overdue / urgent tasks
      ↓
Valuations requiring review
      ↓
Property identity / freshness attention
      ↓
Management alerts and compliance gaps
```

The policy is visible and versionable.

### Proposal contract

Decision Support converts navigation-oriented recommendations into structured proposals.

Current proposal fields include:

```ts
{
  id: string
  kind: 'review' | 'follow_up' | 'verify' | 'prepare'
  domain: 'management' | 'tasks' | 'valuations' | 'properties' | 'cross-domain'
  action: string
  objectLabel: string
  reason: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  href: string
  requiresConfirmation: true
  executionStatus: 'proposed'
  evidence: Evidence[]
}
```

Proposal identifiers are content-addressed so the server can regenerate and verify that a proposal still matches current authorized context before execution.

### Action Gateway

A first controlled Action Gateway is implemented server-side:

`/api/pedro-pablo/action-gateway`

Current supported consequential action:

- convert a current Pedro Pablo proposal into an operational task.

The gateway does **not** trust a task payload supplied by the browser.

```text
prompt + proposalId
        ↓
Regenerate current proposal server-side
        ↓
Capability check
        ↓
Preview generated task
        ↓
Explicit human confirmation
        ↓
Existing management task API
        ↓
RLS / scope validation
        ↓
Persisted operational task
```

Rules:

- requires `tasks.global.manage` or `tasks.office.manage`;
- rejects stale or forged proposals;
- regenerates the task draft server-side;
- requires `confirm: true` before execution;
- preserves proposal origin and evidence in the task detail;
- does not give Pedro Pablo unrestricted database credentials;
- does not allow arbitrary inserts through the gateway.

The current Pedro Pablo workspace displays proposals but **does not yet expose the execution/confirmation CTA**. Server-side execution exists and remains intentionally separated until the UI confirmation flow is completed and verified.

### Core safety boundary

```text
User
  ↓
Authenticated session
  ↓
Role + capability + RLS scope
  ↓
Authorized context APIs
  ↓
Pedro Pablo reasoning / decision support
  ↓
Structured proposal
  ↓
Optional Action Gateway
  ↓
Explicit human confirmation
  ↓
Validated server action
```

Pedro Pablo itself never decides authorization and never writes directly to Supabase.

---

## 5. Core product modules

### Market Intelligence

Primary surfaces:

- `/dashboard/market`
- `/dashboard/properties`

Capabilities include:

- property intelligence;
- market identity and evidence;
- source governance;
- comparable evidence;
- operational portfolio assignments;
- controlled imports and exports.

The market layer separates raw observations, canonical property identity and operational intelligence.

### Property Valuation

Primary surfaces:

- `/dashboard/valuation`
- `/dashboard/valuations`

Capabilities include:

- valuation case creation;
- comparable selection and evidence;
- contractual calculation methodology;
- qualitative factors;
- condition assessment;
- workflow states;
- case versions;
- approval and issue controls;
- property linkage;
- scope-aware access.

Approval and issuance are consequential operations and remain governed server-side.

### Commercial Management Control

Primary surfaces:

- `/dashboard/control/operations`
- `/dashboard/control/admin`
- `/dashboard/ceo`
- `/dashboard/director`
- `/dashboard/partner`

Capabilities include:

- company, office and partner performance;
- approved metric overlays;
- documentary fallback;
- goals;
- alerts;
- tasks;
- workload;
- operational follow-up;
- source and methodology traceability.

### Reports and delivery

Primary surfaces include:

- `/dashboard/reportes/canonicos`
- `/dashboard/reportes/autonomos`
- `/dashboard/reportes/operacion`

The reporting layer supports canonical snapshots, PDF generation, governed delivery, recipient control, retries and delivery traceability.

---

## 6. Canonical data and provenance

`/api/management/summary` is a major trust boundary.

It resolves scope according to authenticated role before exposing management entities.

The documentary 2026 source remains an explicitly identified fallback. When values exist in `management_approved_metric_values`, only equivalent metrics that are verified, reconciled and approved replace documentary values.

Goals are used only when approval is registered.

Important distinctions:

- documentary source ≠ approved persisted value;
- net portfolio change ≠ gross acquisition;
- missing captations ≠ zero captations;
- provisional internal alert thresholds ≠ client-approved methodology.

---

## 7. Operational tasks

`management_tasks` is the shared operational follow-up layer.

Tasks can preserve:

- source key;
- severity;
- priority;
- office;
- subject profile;
- assignee;
- due date;
- comments;
- lifecycle events;
- resolution note;
- source context such as a valuation case;
- Pedro Pablo proposal origin and evidence when created through the Action Gateway.

Task visibility and mutation are restricted by capability and scope.

A completed task requires a recorded result instead of disappearing without trace.

---

## 8. Reporting and automation

Vercel executes protected report workflows.

Current management reporting includes:

- snapshot generation for due schedules;
- delivery queue processing;
- transactional claiming;
- distribution idempotency;
- retry limits;
- exponential backoff;
- persisted snapshot artifacts;
- authenticated download under RLS.

CEO and authorized administration can recover report execution through governed server endpoints.

Email delivery requires `RESEND_API_KEY`.

Default sender:

`Property Partners Intelligence <reportes@ppartnersgroup.app>`

Allowed sender overrides are constrained by `REPORT_ALLOWED_FROM_DOMAINS`.

If the provider is unavailable or configuration is incomplete, the worker must expose a blocked operational state instead of pretending a delivery occurred.

---

## 9. Security model

Security is enforced at multiple layers:

```text
Interface visibility
      ↓
Server capability check
      ↓
Role / office / self scope
      ↓
Supabase RLS
      ↓
Database grants / constraints
      ↓
Auditability
```

The application must not rely on hidden buttons as an authorization mechanism.

Current roles include:

- CEO;
- administrator;
- director;
- subdirector;
- partner / seller.

Security practices include:

- RLS on exposed operational tables;
- capability-based server guards;
- tenant-isolation review;
- restricted privileged routes;
- server-only privileged clients;
- controlled `SECURITY DEFINER` functions;
- fixed `search_path` for privileged functions;
- explicit grants;
- no anonymous access to contractual views;
- no raw provider/database exception messages returned to users;
- proposal regeneration before AI-originated task execution;
- explicit human confirmation for consequential Pedro Pablo writes.

Legacy compatibility surfaces are progressively hardened or retired rather than silently reused.

---

## 10. Design system

`DESIGN.md` is the repository-level visual and UX authority.

The product language is:

- dark;
- technical;
- editorial;
- architectural;
- rectangular;
- high contrast;
- compact but readable;
- restrained in motion and decoration.

Premium quality comes from precision, not decoration.

The interface avoids:

- gradients;
- glass effects;
- glow;
- excessive cards;
- decorative metrics;
- arbitrary shadows;
- generic SaaS styling.

Canonical principles:

- `0px` default radius;
- semantic design tokens;
- Montserrat as main UI typeface;
- Rajdhani only for controlled technical display treatments;
- honest loading, empty, stale and error states;
- explicit source/cutoff when it affects a decision;
- keyboard-visible focus;
- responsive review at 390, 768, 1280 and 1440–1600 px.

---

## 11. Technology stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- Supabase
- PostgreSQL
- Vercel
- Recharts
- MapLibre
- Leaflet
- PDF / DOCX / XLSX generation
- Resend for authorized email delivery

Deterministic product logic is intentionally independent from any future LLM provider.

---

## 12. Runtime architecture

```text
                         PROPERTY PARTNERS
                                │
               ┌────────────────┴────────────────┐
               │                                 │
         Role-specific UI                 Pedro Pablo
               │                         Executive Assistant
               │                                 │
               └────────────────┬────────────────┘
                                │
                    Authorization + Scope
                                │
        ┌───────────────────────┼────────────────────────┐
        │                       │                        │
 Management Intelligence   Valuation Engine       Market / Properties
        │                       │                        │
        └───────────────────────┼────────────────────────┘
                                │
                         Decision Trace
                                │
                       Structured Proposal
                                │
                      Human Confirmation
                                │
                         Action Gateway
                                │
                         Operational Task
                                │
                              Audit
                                │
                         Canonical Postgres
```

---

## 13. Main routes

- `/dashboard` — role-aware operational entry point.
- `/dashboard/pedro-pablo` — objective executive assistant and decision support.
- `/dashboard/market` — market intelligence.
- `/dashboard/properties` — operational property portfolio.
- `/dashboard/valuation` — create a valuation.
- `/dashboard/valuations` — valuation register and cases.
- `/dashboard/control/operations` — commercial management control.
- `/dashboard/control/admin` — goals and alerts administration.
- `/dashboard/ceo` — authorized CEO command surface.
- `/dashboard/director` — office and team management.
- `/dashboard/partner` — personal performance and operation.
- `/dashboard/reportes/canonicos` — canonical reports.
- `/dashboard/reportes/autonomos` — authorized operational reports.
- `/dashboard/reportes/operacion` — report generation and delivery operations.

Legacy `/dashboard/copilot`, `/dashboard/copilot/chat` and `/dashboard/agente` remain compatibility redirects and are not the active intelligence architecture.

---

## 14. Pedro Pablo APIs

Current server surfaces:

- `POST /api/pedro-pablo` — canonical multi-domain operating context and deterministic responses.
- `GET /api/pedro-pablo/properties` — governed property context for the current capability/scope.
- `POST /api/pedro-pablo/decision-support` — structured content-addressed proposals.
- `POST /api/pedro-pablo/action-gateway` — preview and human-confirmed task execution.

No endpoint grants the assistant unrestricted database access.

---

## 15. Development

```bash
corepack enable
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm dev
```

Open:

`http://localhost:3000`

---

## 16. Validation gates

The repository includes automated checks across security, contractual delivery, provenance, management, market, valuation and reporting.

Core commands include:

```bash
pnpm security:ip-boundaries
pnpm security:credential-boundaries
pnpm security:exposure-boundaries
pnpm security:tenant-isolation
pnpm security:dashboard-trust
pnpm audit:legacy
pnpm access:verify
pnpm market:identity:verify
pnpm market:contract:verify
pnpm valuation:model:verify
pnpm valuation:workflow:verify
pnpm valuation:condition:verify
pnpm management:scoring:verify
pnpm management:reports:verify
pnpm management:persisted:verify
pnpm management:reconciliation:verify
pnpm management:delivery:verify
pnpm reportin:verify
pnpm build
```

Authenticated QA:

```bash
pnpm qa:roles
pnpm qa:visual
pnpm qa:technical
```

Authenticated role and visual QA require authorized `QA_*` accounts and must not be replaced by assumptions from source code or screenshots.

Scripts requiring private datasets or credentials must run only in authorized environments.

---

## 17. Engineering invariants

1. Never invent canonical data.
2. Never convert missing values to zero for presentation convenience.
3. Never let an LLM decide authorization.
4. Never give an LLM unrestricted database credentials.
5. Never expose raw database, provider, API or stack errors to the client.
6. Never execute consequential AI-proposed writes without explicit human approval and server validation.
7. Never weaken RLS to simplify UI development.
8. Never hide incomplete evidence behind a confidence-looking score.
9. Prefer deterministic rules where business logic is defined.
10. Preserve source, cutoff, methodology and audit trail for material decisions.
11. Multi-step operational writes should be transactional or have a proven equivalent safeguard.
12. Product intelligence must degrade safely when a source or provider is unavailable.
13. Pedro Pablo must remain factual, neutral and evidence-bound.
14. Pedro Pablo must not issue personal opinions or unsupported recommendations.
15. A proposal is not an execution.
16. A preview is not an execution.
17. AI memory must never become canonical truth without validated source evidence.

---

## 18. Documentation

Key documentation:

- `DESIGN.md`
- `docs/CONTRACTUAL_SCOPE_MATRIX.md`
- `docs/architecture/OPERATING_INTELLIGENCE.md`
- `docs/architecture/DATA_MODEL_AND_DICTIONARY.md`
- `docs/operations/INSTALLATION_RECOVERY_RUNBOOK.md`
- `docs/operations/REPORT_DELIVERY.md`
- `docs/manuals/ROLE_USER_MANUAL.md`
- `docs/manuals/ADMINISTRATION_MANUAL.md`
- `docs/transfer/TRANSFER_ACCEPTANCE_PACKAGE.md`

The existence of documentation does not replace clean reconstruction testing, authenticated QA, training or client acceptance.

---

## 19. Product north star

The target experience is not:

> “Ask AI anything.”

It is:

> **“Show me what matters, why it matters, what evidence supports it, what I can do next, and what happened after we acted.”**

The differentiator is not the language model.

It is the operating graph connecting:

```text
Canonical evidence
        ↓
Deterministic rules
        ↓
Decision Trace
        ↓
Role-specific intelligence
        ↓
Pedro Pablo
        ↓
Structured action proposal
        ↓
Human confirmation
        ↓
Validated execution
        ↓
Audit
        ↓
Measured outcome
```

That is the governed operating intelligence standard for Property Partners powered by N3uralia.
