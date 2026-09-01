# User manual by role

Date: September 1, 2026.  
UX sync: PR #173 decision-first V1 surfaces.

## 1. Common principles

The platform separates three information layers:

- **Approved persisted data**: reconciled value authorized for publication.
- **Documentary evidence**: canonical source cut identified by period and source.
- **Operational data**: valuations, assignments, tasks and market data subject to role and RLS controls.

The V1 interface follows one operating rule: **show the decision first and the evidence second**. Technical detail remains available through progressive disclosure and must still be reviewed when a decision requires traceability.

Interpretation rules:

- `n/d` means there is not enough evidence; it does not mean zero.
- A candidate property is not a confirmed identity.
- A `pending` distribution does not prove that an email was delivered.
- A valuation requires professional review and the authorized workflow before it can be issued.
- Provisional rankings or thresholds do not replace a client-approved KPI rule.

## 2. V1 delivery scope

The operational V1 acceptance scope is:

- Market Intelligence for houses for sale in Vitacura;
- Valuation workflow with at least three human-selected comparables;
- Management Control, dashboards and reporting by authorized role.

Apartment and project market refreshes are not V1 acceptance blockers and remain outside the active operational market-refresh scope.

## 3. Access

1. Open the authorized production URL.
2. Sign in with the assigned corporate account.
3. Verify that the visible role, office and scope are correct.
4. Sign out when using a shared device.

If a user can see an office, person or valuation case outside their authorized scope, stop using that surface and report it as an authorization incident.

## 4. Primary navigation by role

### CEO

Primary navigation:

- **Hoy** — `/dashboard/ceo`
- **Mercado** — `/dashboard/market`
- **Valorizaciones** — `/dashboard/valuations`
- **Propiedades** — `/dashboard/properties`
- **Informes** — `/dashboard/reportes/canonicos`

Administrative functions are available in the secondary Administration section only when the role has the corresponding capability.

### Admin

Primary navigation:

- **Hoy** — `/dashboard`
- **Mercado** — `/dashboard/market`
- **Valorizaciones** — `/dashboard/valuations`
- **Propiedades** — `/dashboard/properties`
- **Informes** — `/dashboard/reportes/canonicos`

Secondary administration includes Management, Goals and alerts, Data and methodology, Assignments, and Users/configuration.

### Director / subdirector

Primary navigation:

- **Hoy** — `/dashboard/director`
- **Mercado** — `/dashboard/market`
- **Valorizaciones** — `/dashboard/valuations`
- **Propiedades** — `/dashboard/properties`
- **Informes** — `/dashboard/director/reporte`

Administrative options only appear when authorized, such as Management, Goals and alerts, and Assignments.

### Seller / executive

Primary navigation:

- **Hoy** — `/dashboard/partner`
- **Mercado** — `/dashboard/market`
- **Valorizaciones** — `/dashboard/valuations`
- **Propiedades** — `/dashboard/properties`
- **Mi reporte** — `/dashboard/reportes/audiencias/ejecutivo`

## 5. CEO and executive administration

### Hoy

Route: `/dashboard/ceo`.

The CEO sees business status first, followed by a compact KPI strip and up to three priorities. Typical priorities may include overdue work, sales gap, stale leads, weak visit execution, valuations awaiting review or paused assignments when supported by real data.

Evidence, methodology and governance remain available under the disclosure section rather than dominating the initial view.

### Reading metrics

1. Confirm the visible period.
2. Read the business status and priorities first.
3. Open methodology/provenance only when needed for validation or audit.
4. Confirm whether a metric is approved persisted data or documentary/provisional evidence.
5. Do not compare different periods without checking their boundaries.
6. Treat alerts derived from provisional thresholds as decision support, not automatic sanctions.

### Valuation authority

The CEO is the final authorization role for valuation approval and issuance. An `issued` valuation is frozen as the traceable historical snapshot and must not be replaced by live evidence.

### Reports

Use `/dashboard/reportes/canonicos` as the primary executive report surface. The latest deliverable, status and open/download actions are shown first. Technical traceability remains available under disclosure.

Create or modify schedules only with authorized recipients. Generation and delivery status are separate facts. `pending` means delivery has not yet been proven.

## 6. Director and subdirector

### Hoy

Route: `/dashboard/director`.

Scope must remain limited to the user's office and team. The summary and decisions appear before operational evidence/details.

Functions include:

- review office and team performance;
- review valuations under the authorized scope;
- return a valuation for correction or perform permitted review actions;
- manage authorized assignments and tasks;
- consult market and office reports allowed by the role.

A Director or Subdirector must not be treated as the final issuer when the workflow requires CEO approval.

### Isolation control

Before operating:

1. Confirm the office shown in the interface.
2. Confirm that partners from other offices are not visible.
3. Confirm that valuations and assignments belong to the visible team.

Any deviation is an authorization/RLS incident.

## 7. Seller / executive

### Hoy

Route: `/dashboard/partner`.

The primary surface prioritizes personal performance and the next relevant action. A seller should only see:

- own profile and metrics;
- assigned properties;
- own valuation cases;
- own tasks;
- market information permitted by the product;
- own report.

### Valuation flow

1. Open Valorizaciones and start a new case through `/dashboard/valuation` when authorized.
2. Register address, property type, surfaces and available attributes.
3. Confirm neighborhood, ROL and location evidence when available.
4. Select at least **three accepted human-reviewed comparables**.
5. Record exclusions and justification where required.
6. Save as draft.
7. Submit for review once minimum evidence requirements are met.
8. Correct returned observations without deleting the historical trail.

The seller cannot approve or issue the final valuation.

## 8. Market Intelligence

Main route: `/dashboard/market`.

The visible V1 surface is **Vitacura · Casas** and prioritizes four decision metrics: active supply, confirmed sales, days on market and absorption. Exceptions requiring action appear before the full source/coverage layer.

Full territorial coverage, source quality, KML, reconciliation, neighborhood administration and XLSX export are available under **Data and methodology**.

### V1 sources

- Portal Inmobiliario operational refresh for houses for sale in Vitacura;
- CBRS reference transactions;
- Property Partners territorial KML / canonical neighborhood polygons.

### Interpretation

- Review observation date and coverage when needed.
- A candidate identity is not a confirmed identity.
- ROL contradictions reject identity matching.
- Neighborhood conflicts reduce match confidence.
- PRC, road hierarchy and other R&D/context layers are non-binding unless the product explicitly states otherwise.
- Market context does not automatically change the official valuation model weights.

## 9. Valorizaciones registry

Route: `/dashboard/valuations`.

The registry opens with **what needs to advance** and a next action when one is available. Full search/filter history remains under **View all valuations**.

States:

- `draft`: editable case under preparation;
- `review`: case submitted for review;
- `approved`: approved by the authorized workflow role before issuance, when applicable;
- `issued`: final frozen version for reporting and audit.

Do not accept a valuation as final if required comparables, source, dates, adjustments or justification are missing.

## 10. Properties

Route: `/dashboard/properties`.

The portfolio prioritizes assignments requiring attention, such as stale evidence or identity review when the role is authorized. Sellers never receive administrative identity actions they cannot open.

Mobile uses operational blocks rather than requiring horizontal table scrolling.

## 11. Management Control and reports

### Goals and alerts

Route: `/dashboard/control/admin` for authorized roles.

The page opens with **what requires a decision**. Critical/open alerts appear before goal editing or rule configuration. The normal flow is Review → Resolve/Dismiss.

### Period closeout

Route: `/dashboard/control/operations` for authorized roles.

The page explains **what is missing before closeout**. If there are rejected rows, reconciliation comes first. If no period data exists, closeout should not be generated. If data is valid and no report exists, evaluate exceptions before generating the monthly report.

Technical ingestion and JSON operations remain under a secondary technical-data disclosure.

### Reporting rules

- Use only approved metrics as official KPI.
- Keep period, entity, source and formula version traceable.
- Report generation, scheduling and delivery are separate states.
- Recurring reporting must use an approved calendar and authorized recipients.
- Do not interpret `pending` as `sent`.

## 12. Error messages

### `401 Unauthorized`

The session does not exist, expired, or an automation did not provide its required secret.

### `403 Forbidden`

The account is authenticated but the requested action is outside its role or scope.

### `n/d` or missing data

The source or period is unavailable, not approved or not sufficiently supported. Do not replace missing evidence with zero.

### Import error

Review source compatibility, authorization, required fields, period, entity identifiers and row-level errors.

## 13. Support and incidents

When reporting an issue include:

- date and time;
- user and role, without passwords;
- route or URL;
- action performed;
- exact visible message;
- case/report/import ID when available;
- screenshot without unnecessary personal or confidential data.

Never send passwords, tokens, service-role keys or secrets by email or chat.

This manual reflects the V1 UX on the PR #173 release branch. Freeze it against the final accepted `main` commit before issuing the definitive delivery package.