# Contractual handover readiness — 2026-09-24

## Purpose

This is the current operational closeout record for the Property Partners delivery. It does not declare client acceptance. It separates:

- software already implemented and technically verifiable;
- contractual functions that are implemented but await Property Partners business definitions or UAT;
- automation that is intentionally fail-closed until reporting rules are approved;
- final transfer/training actions that require an authorized client receiver.

## Contractual acceptance principle

The project is not considered contractually closed because code exists. Closure requires the three modules to operate coherently, dashboards to reflect available information correctly, automatic processes to operate under their approved configuration, and all committed technology assets to be delivered.

No missing business definition is replaced with an inferred KPI.

## Workstream 1 — Role dashboards

### CEO

Implemented:
- consolidated result and office result;
- management / portfolio / follow-up / conversion scores;
- monthly targets and YTD;
- MoM and YoY where semantically comparable;
- alerts and office drill-down;
- August board reading aligned to Pedro's Directorio.

Open client definitions:
- official productivity formula;
- official ranking rule, tie-breaks and effective period;
- final captation source semantics where not yet attributable.

### Director / Subdirector

Implemented:
- office result and team result;
- partner-level documentary metrics when the source publishes them;
- targets, tasks, alerts, valuations and property assignments;
- explicit MoM / YoY presentation;
- explicit display of missing captations/productivity/ranking rather than inference.

Open:
- final client approval for KPI definitions and ranking policy;
- authenticated UAT with the final Director/Subdirector participants.

### Partner / Agent

Implemented:
- personal performance;
- personal targets and documentary comparisons;
- MoM and YoY when canonical source evidence supports them;
- assigned properties, valuation workflow, tasks and review history under personal RLS scope.

Open:
- attributable captations source;
- official productivity formula;
- official personal ranking definition;
- final UAT account selection.

## Workstream 2 — MoM / YoY reporting

Canonical rule:
- MoM compares the same metric with the prior canonical month.
- YoY is published only when the same operational dimension exists for the same prior-year period.
- Management-credit closings and operational closings remain separate dimensions.
- 2025 operational history is not converted into 2026 management-credit history.

Current implementation:
- monthly report view distinguishes MoM credited closings from YoY operational closings;
- monthly YoY exposes closure and UF deltas when exact operational evidence exists;
- YTD YoY uses the same cumulative cutoff;
- missing comparable evidence is shown as unavailable, never inferred.

Related change: PR #239.

## Workstream 3 — Automated reporting

Implemented:
- Vercel monthly generation cron;
- independent hourly delivery worker;
- authorization using CRON_SECRET and fail-closed behavior;
- monthly schedules by report type, entity and recipients;
- persisted report runs and distributions;
- PDF artifact generated from persisted snapshot;
- Resend delivery with idempotency key and retry handling;
- manual recovery controls for CEO/admin;
- executive, management and director report types normalized across API/artifact/UI;
- automated contractual checks for cron wiring and authorization.

Observed current production data state on 2026-09-24:
- active report schedules: 0;
- historical report runs exist;
- successful historical deliveries exist.

Reason schedules remain inactive:
- reporting calendar / authorized recipients remain pending client approval;
- KPI dictionary remains pending client approval.

This is an intentional contractual safety gate, not a missing automation engine.

Related change: PR #241.

## Workstream 4 — Training, handover and transfer

### Already assembled

- source repository and history;
- package manifest;
- lockfile and build instructions;
- Supabase migrations;
- data model and dictionary;
- functional documentation;
- role user manual;
- administration manual;
- installation/recovery runbook;
- rollback procedure;
- UAT plan and status;
- client dependency register;
- production schema fingerprint;
- training execution plan.

### Must remain pending until client action

Training:
- TRN-01 General platform and governance;
- TRN-02 CEO, Direction and reports;
- TRN-03 CRM and commercial operation;
- TRN-04 Market and valuation;
- TRN-05 Technical administration and continuity.

Current status: all sessions remain not scheduled. Do not mark them completed without attendance evidence or a formal client waiver.

Final transfer:
- identify authorized technical receiver;
- confirm final ownership/billing for Vercel, Supabase, Resend and other third parties;
- lock the accepted main commit and production deployment;
- execute final clean reconstruction;
- execute isolated backup/restore drill;
- generate final ZIP from the accepted commit;
- inspect exclusions and secret boundaries;
- calculate SHA-256 checksum;
- grant/transfer administrative access through secure channels;
- rotate credentials where custody changes;
- record final UAT and client acceptance.

## Current contractual blockers

| Blocker | Owner | Why it remains open |
| --- | --- | --- |
| KPI dictionary | Shared / Pedro final validation | Required for official captations/productivity/ranking/alerts semantics |
| Reporting calendar + recipients | Shared / Pedro | Required to activate recurring schedules |
| UAT final participants/date | Client | Required for final role and business acceptance |
| Training participants/date | Client | Required for contractual training evidence |
| Third-party ownership/costs | Shared | Required before custody transfer |
| Technical receiver | Client | Required before repo/cloud access transfer |
| Backup/restore drill | Shared | Required for continuity evidence |
| Accepted commit / acceptance record | Client + N3uralia | Required before final ZIP/checksum and ownership handover |

## Release discipline

No workstream above may be called contractually complete solely because a preview/build passes.

Required sequence for each release:

branch -> preview -> checks -> authenticated QA -> explicit merge authorization -> exact-SHA production deploy -> smoke test -> runtime review.

## Exit condition

The project can be marked contractually delivered only when:

1. the accepted software SHA is fixed;
2. required UAT cases are passed or formally accepted as exceptions;
3. training is completed or formally waived;
4. reporting rules and KPI definitions are approved or formally waived;
5. final transfer package is reconstructed, checksumed and delivered;
6. administrative custody transfer is recorded;
7. client acceptance is recorded.
