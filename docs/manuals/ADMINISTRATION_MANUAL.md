# Administration manual

Date: September 1, 2026.  
UX sync: PR #173 decision-first V1 administration surfaces.

## 1. Administrative responsibilities

Technical and functional administration must keep the following aligned with production:

- users, roles and office scope;
- authorized sources and ingestion status;
- import and reconciliation traceability;
- approved metrics, goals and rules;
- report schedules and recipients;
- secrets, backups, logs and incident records;
- release and rollback evidence;
- delivery documentation.

The V1 administration experience separates daily decisions from technical configuration. Operational users should see exceptions and required actions first; evidence, rules, source mechanics and raw ingestion remain available under secondary disclosures.

## 2. Primary administration surfaces

For CEO/admin users, the Administration section contains:

- **Gestión** — `/dashboard/control/operations`
- **Metas y alertas** — `/dashboard/control/admin`
- **Datos y metodología** — `/dashboard/market/fuentes`
- **Asignaciones** — `/dashboard/properties/admin`
- **Usuarios y configuración** — `/dashboard/settings`

Director/subdirector users only see administrative routes allowed by their capability set. Do not expose unusable links to restricted routes.

## 3. Metas y alertas — decision workflow

Route: `/dashboard/control/admin`.

The page opens with **Qué requiere decisión**. Operational sequence:

1. review critical alerts first;
2. review other open alerts;
3. acknowledge an alert when investigation starts;
4. resolve or dismiss only with an appropriate note when required;
5. review goal coverage if no alert is currently open;
6. edit approved goals only when the business definition is known;
7. use advanced configuration for evidence and alert rules only when administration is necessary.

Only the first priorities should dominate the visible surface. Additional alerts, goal editing and technical rule configuration remain secondary.

## 4. Cierre del período

Route: `/dashboard/control/operations`.

The page answers **Qué falta para cerrar**. Administration must follow the surfaced guardrails:

- **Rejected rows > 0:** review reconciliation before report generation.
- **No current-period imports:** do not generate the monthly closeout.
- **Valid period data and no report:** evaluate alerts/exceptions, then generate the report.
- **Report already available:** review/open the latest report; previous versions remain secondary.

The monthly report action is intentionally disabled when period evidence is absent or rejected rows remain. Do not bypass this UX guard with manual API calls for routine operation.

Technical imports, run details and raw JSON loading remain under **Operación técnica de datos**.

## 5. User provisioning and changes

1. Create the account in Supabase Auth through an authorized channel.
2. Create or verify the corresponding `profiles` row with the same UUID.
3. Assign one current application role: `admin`, `ceo`, `director`, `subdirector`, `seller`.
4. For director/subdirector, assign the canonical office/team scope.
5. For seller, link the applicable management entity/profile relationship.
6. Confirm the `office → partner` hierarchy.
7. Run role/isolation QA before credentials are handed over.

Do not share accounts between people.

## 6. User offboarding

1. Disable access in Auth according to policy.
2. Disable active organizational assignments.
3. Reassign open tasks, properties and valuation cases.
4. Preserve audit history and issued valuation evidence.
5. Never delete an issued valuation snapshot simply to remove a user.

## 7. Organizational entities

`management_entities` represents company, offices, teams and partners.

Controls:

- unique and consistent office names;
- unambiguous profile linkage;
- correct parent hierarchy;
- inactive entities marked `active=false`;
- metadata free of secrets and unnecessary personal data.

After hierarchy changes, run authenticated role/isolation QA.

## 8. Market Intelligence V1

The operational acceptance scope is **houses for sale in Vitacura**.

Canonical V1 evidence includes:

- Portal Inmobiliario house listings through the active market-refresh pipeline;
- CBRS reference transactions;
- Property Partners territorial KML / canonical neighborhood polygons.

Apartment and project refreshes are outside the operational V1 acceptance scope and must not be represented as required V1 coverage.

The main Market screen exposes only decision metrics and exceptions. Source quality, KML, reconciliation, exports and source administration belong under Data and methodology.

Before importing or enabling a source:

- confirm contractual/legal authorization;
- identify system and dataset;
- record source, period and lineage;
- validate required fields and reconciliation rules;
- fail closed on invalid or partial ingestion.

Do not bypass CAPTCHA, access controls or provider terms.

## 9. Valuation administration

The Valuation module requires:

- traceable subject evidence;
- a minimum of three human-selected accepted comparables;
- documented review decisions;
- authorized workflow transitions;
- CEO final approval/issuance where required by the current workflow;
- immutable issued snapshots.

The primary registry route `/dashboard/valuations` shows pending work first and keeps the complete registry secondary. Never rewrite historical `issued` evidence from live data.

## 10. Property administration

Use `/dashboard/properties/admin` only for authorized assignment/admin work. Identity-review links must only appear for roles allowed to open the corresponding route.

The normal portfolio route `/dashboard/properties` is intentionally simpler and should not be expanded with administrative controls unless the role requires them.

## 11. Management metrics

The dashboard must not promote any imported row to an official KPI automatically.

Official publication requires the appropriate approved/persisted metric path and supporting evidence. Keep entity, metric, period, formula version and source aligned.

Provisional thresholds must not be treated as formal employee evaluation rules until Property Partners approves the KPI dictionary.

## 12. Reports and schedules

The primary executive report surface is `/dashboard/reportes/canonicos`. It prioritizes the latest deliverable and its open/download actions. Technical traceability stays available under disclosure.

Only authorized executive roles may create or modify recurring schedules.

Validate:

- report type;
- scope/entity;
- cadence;
- authorized recipients;
- next execution date;
- delivery channel;
- approval state.

### Management delivery

Primary management delivery processing is protected by `CRON_SECRET` and uses the configured report provider. A successful cron invocation and a successful email delivery are separate facts.

### Document delivery

Weekly/monthly document schedules resolve recipient roles against current application profiles and Supabase Auth. The `profiles` table is the role/scope source; user email is resolved from Auth, not from removed legacy profile columns.

A schedule must advance its `next_send_at` only after the applicable scheduling action has completed safely. Failed delivery attempts remain observable and must not be silently reclassified as sent.

## 13. Secrets and credentials

- Keep secrets in Vercel, GitHub Actions or an approved secret manager.
- Use environment-specific values.
- Restrict administrative access.
- Rotate credentials during control transfer when required.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` or equivalent privileged secrets to the browser.
- Do not copy secrets into documentation, logs, tickets or screenshots.

## 14. Backups and recovery

- Verify the actual backup capability of the contracted Supabase plan.
- Record backup/retention evidence before claiming a contractual backup SLA.
- Test restoration in an isolated environment where feasible.
- Record agreed RPO/RTO when approved.
- Create an appropriate recovery point before high-risk migrations.
- Never restore over production without explicit authorization.

Architecture or documentation alone does not prove historical backup retention or successful restore testing.

## 15. Monitoring

Review:

- GitHub Actions;
- Vercel deployment/build status;
- production runtime errors and 5xx;
- cron execution and delivery failures;
- ingestion failures and stale sources;
- rejected rows/reconciliation blockers before closeout;
- Supabase security findings;
- growth and error states in operational tables.

Escalate repeated cron failures even if the HTTP route returns 200, because per-item failures can otherwise be hidden inside a successful scheduler invocation.

## 16. Release procedure

1. Branch from `main`.
2. Audit affected code/schema and contract impact.
3. Implement a narrow change.
4. Add or update deterministic verification.
5. Update user/administration/training documentation when visible workflows change.
6. Open or update the PR.
7. Require contractual CI and security/IP checks to pass.
8. Require Vercel Preview `READY`.
9. Review relevant runtime/build evidence.
10. Merge to `main` only after the release gate is satisfied or an authorized override is explicit.
11. Confirm Production `READY`.
12. Verify the affected production route or workflow.
13. Review runtime errors after deployment.
14. Freeze delivery documentation against the accepted `main` commit.
15. Regenerate final delivery-package checksum/evidence when the transfer bundle is emitted.

## 17. QA by role

Minimum role expectations:

- CEO/admin: authorized global scope;
- director/subdirector: assigned office and own team only;
- seller: own authorized entity/cases/tasks;
- no cross-office or cross-user data exposure;
- valuation transitions restricted to their current workflow permissions;
- mobile navigation and primary actions remain accessible without horizontal dependence.

Authenticated UAT requires designated test participants/credentials. Do not use uncontrolled real accounts to manufacture acceptance evidence.

## 18. Incident management

1. Classify integrity, availability, confidentiality or third-party impact.
2. Preserve evidence without exposing secrets.
3. Contain the issue.
4. Restore a stable service.
5. Determine root cause.
6. Apply the smallest safe correction with rollback available.
7. Add regression coverage.
8. Verify deployment and production behavior.
9. Record closure and responsible parties.

This manual reflects the V1 UX on the PR #173 release branch. Freeze it against the final accepted `main` commit before issuing the definitive delivery package.