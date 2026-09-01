# Administration manual

Date: September 1, 2026.

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

## 2. User provisioning and changes

1. Create the account in Supabase Auth through an authorized channel.
2. Create or verify the corresponding `profiles` row with the same UUID.
3. Assign one current application role: `admin`, `ceo`, `director`, `subdirector`, `seller`.
4. For director/subdirector, assign the canonical office/team scope.
5. For seller, link the applicable management entity/profile relationship.
6. Confirm the `office → partner` hierarchy.
7. Run role/isolation QA before credentials are handed over.

Do not share accounts between people.

## 3. User offboarding

1. Disable access in Auth according to policy.
2. Disable active organizational assignments.
3. Reassign open tasks, properties and valuation cases.
4. Preserve audit history and issued valuation evidence.
5. Never delete an issued valuation snapshot simply to remove a user.

## 4. Organizational entities

`management_entities` represents company, offices, teams and partners.

Controls:

- unique and consistent office names;
- unambiguous profile linkage;
- correct parent hierarchy;
- inactive entities marked `active=false`;
- metadata free of secrets and unnecessary personal data.

After hierarchy changes, run authenticated role/isolation QA.

## 5. Market Intelligence V1

The operational acceptance scope is **houses for sale in Vitacura**.

Canonical V1 evidence includes:

- Portal Inmobiliario house listings through the active market-refresh pipeline;
- CBRS reference transactions;
- Property Partners territorial KML / canonical neighborhood polygons.

Apartment and project refreshes are outside the operational V1 acceptance scope and must not be represented as required V1 coverage.

Before importing or enabling a source:

- confirm contractual/legal authorization;
- identify system and dataset;
- record source, period and lineage;
- validate required fields and reconciliation rules;
- fail closed on invalid or partial ingestion.

Do not bypass CAPTCHA, access controls or provider terms.

## 6. Valuation administration

The Valuation module requires:

- traceable subject evidence;
- a minimum of three human-selected accepted comparables;
- documented review decisions;
- authorized workflow transitions;
- CEO final approval/issuance where required by the current workflow;
- immutable issued snapshots.

Never rewrite historical `issued` evidence from live data.

## 7. Management metrics

The dashboard must not promote any imported row to an official KPI automatically.

Official publication requires the appropriate approved/persisted metric path and supporting evidence. Keep entity, metric, period, formula version and source aligned.

Provisional thresholds must not be treated as formal employee evaluation rules until Property Partners approves the KPI dictionary.

## 8. Reports and schedules

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

## 9. Secrets and credentials

- Keep secrets in Vercel, GitHub Actions or an approved secret manager.
- Use environment-specific values.
- Restrict administrative access.
- Rotate credentials during control transfer when required.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` or equivalent privileged secrets to the browser.
- Do not copy secrets into documentation, logs, tickets or screenshots.

## 10. Backups and recovery

- Verify the actual backup capability of the contracted Supabase plan.
- Record backup/retention evidence before claiming a contractual backup SLA.
- Test restoration in an isolated environment where feasible.
- Record agreed RPO/RTO when approved.
- Create an appropriate recovery point before high-risk migrations.
- Never restore over production without explicit authorization.

Architecture or documentation alone does not prove historical backup retention or successful restore testing.

## 11. Monitoring

Review:

- GitHub Actions;
- Vercel deployment/build status;
- production runtime errors and 5xx;
- cron execution and delivery failures;
- ingestion failures and stale sources;
- Supabase security findings;
- growth and error states in operational tables.

Escalate repeated cron failures even if the HTTP route returns 200, because per-item failures can otherwise be hidden inside a successful scheduler invocation.

## 12. Release procedure

1. Branch from `main`.
2. Audit affected code/schema and contract impact.
3. Implement a narrow change.
4. Add or update deterministic verification.
5. Open a PR.
6. Require contractual CI and security/IP checks to pass.
7. Require Vercel Preview `READY`.
8. Review relevant runtime/build evidence.
9. Merge to `main`.
10. Confirm Production `READY`.
11. Verify the affected production route or workflow.
12. Review runtime errors after deployment.
13. Update delivery evidence when the change affects acceptance scope.

## 13. QA by role

Minimum role expectations:

- CEO/admin: authorized global scope;
- director/subdirector: assigned office and own team only;
- seller: own authorized entity/cases/tasks;
- no cross-office or cross-user data exposure;
- valuation transitions restricted to their current workflow permissions.

Authenticated UAT requires designated test participants/credentials. Do not use uncontrolled real accounts to manufacture acceptance evidence.

## 14. Incident management

1. Classify integrity, availability, confidentiality or third-party impact.
2. Preserve evidence without exposing secrets.
3. Contain the issue.
4. Restore a stable service.
5. Determine root cause.
6. Apply the smallest safe correction with rollback available.
7. Add regression coverage.
8. Verify deployment and production behavior.
9. Record closure and responsible parties.
