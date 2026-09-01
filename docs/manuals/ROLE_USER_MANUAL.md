# User manual by role

Date: September 1, 2026.

## 1. Common principles

The platform separates three information layers:

- **Approved persisted data**: reconciled value authorized for publication.
- **Documentary evidence**: canonical source cut identified by period and source.
- **Operational data**: valuations, assignments, tasks and market data subject to role and RLS controls.

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

## 4. CEO and executive administration

### Main view

Route: `/dashboard/ceo`.

The CEO can review:

- monthly and accumulated performance;
- offices and partners;
- goals and compliance;
- monthly and year-over-year comparisons;
- derived risks and alerts;
- valuations awaiting executive action;
- tasks, assignments and market identity status.

### Reading metrics

1. Confirm the visible period.
2. Open methodology and provenance when available.
3. Confirm whether the metric is approved persisted data or documentary/provisional evidence.
4. Do not compare different periods without checking `periodStart` and `periodEnd`.
5. Treat alerts derived from provisional thresholds as decision support, not automatic sanctions.

### Valuation authority

The CEO is the final authorization role for valuation approval and issuance. An `issued` valuation is frozen as the traceable historical snapshot and must not be replaced by live evidence.

### Reports

- Review reports in `/dashboard/reportes/autonomos` and related management report surfaces.
- Create or modify schedules only with authorized recipients.
- Verify generation and delivery status separately.
- `pending` means delivery has not yet been proven.

## 5. Director and subdirector

### Main view

Route: `/dashboard/director`.

Scope must remain limited to the user's office and team.

Functions include:

- review office and team performance;
- review valuations under the authorized scope;
- return a valuation for correction or perform permitted review actions;
- manage assignments and tasks;
- consult market and reports allowed by the role.

A Director or Subdirector must not be treated as the final issuer when the workflow requires CEO approval.

### Isolation control

Before operating:

1. Confirm the office shown in the interface.
2. Confirm that partners from other offices are not visible.
3. Confirm that valuations and assignments belong to the visible team.

Any deviation is an authorization/RLS incident.

### Valuation states

- `draft`: editable case under preparation.
- `review`: case submitted for review.
- `approved`: approved by the authorized workflow role before issuance, when applicable.
- `issued`: final frozen version for reporting and audit.

Do not accept a valuation as final if required comparables, source, dates, adjustments or justification are missing.

## 6. Seller / executive

### Main view

Route: `/dashboard/partner` or the seller route assigned by the application.

A seller should see only:

- their own profile and metrics;
- assigned properties;
- their valuation cases;
- their tasks;
- market information permitted by the product.

### Valuation flow

1. Open the Valuation module.
2. Register address, property type, surfaces and available attributes.
3. Confirm neighborhood, ROL and location evidence when available.
4. Select at least **three accepted human-reviewed comparables**.
5. Record exclusions and justification where required.
6. Save as draft.
7. Submit for review once minimum evidence requirements are met.
8. Correct returned observations without deleting the historical trail.

The seller cannot approve or issue the final valuation.

## 7. Market Intelligence

Main route: `/dashboard/market`.

### V1 sources

- Portal Inmobiliario operational refresh for houses for sale in Vitacura;
- CBRS reference transactions;
- Property Partners territorial KML / canonical neighborhood polygons.

### Interpretation

- Review observation date and coverage.
- A candidate identity is not a confirmed identity.
- ROL contradictions reject identity matching.
- Neighborhood conflicts reduce match confidence.
- PRC, road hierarchy and other R&D/context layers are non-binding unless the product explicitly states otherwise.
- Market context does not automatically change the official valuation model weights.

## 8. Management Control and reports

- Use only approved metrics as official KPI.
- Keep period, entity, source and formula version traceable.
- Report generation, scheduling and delivery are separate states.
- Recurring reporting must use an approved calendar and authorized recipients.
- Do not interpret `pending` as `sent`.

## 9. Error messages

### `401 Unauthorized`

The session does not exist, expired, or an automation did not provide its required secret.

### `403 Forbidden`

The account is authenticated but the requested action is outside its role or scope.

### `n/d` or missing data

The source or period is unavailable, not approved or not sufficiently supported. Do not replace missing evidence with zero.

### Import error

Review source compatibility, authorization, required fields, period, entity identifiers and row-level errors.

## 10. Support and incidents

When reporting an issue include:

- date and time;
- user and role, without passwords;
- route or URL;
- action performed;
- exact visible message;
- case/report/import ID when available;
- screenshot without unnecessary personal or confidential data.

Never send passwords, tokens, service-role keys or secrets by email or chat.
