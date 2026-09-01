# Training execution pack — Property Partners Intelligence Platform

**Cutoff:** 2026-09-01  
**UX sync:** PR #173 decision-first V1 surfaces  
**Current status:** NOT SCHEDULED / CLIENT HOLD

This document prepares the training closeout without claiming attendance or acceptance before it occurs.

## Session 1 — Platform overview and governance

**Planned duration:** 60 min  
**Status:** not scheduled

Coverage:
- V1 scope and exclusions;
- three product pillars: Market Intelligence, Valuation, Management Control;
- decision-first UX principle: situation → priority → action → evidence;
- evidence vs inference vs approved KPI;
- role-specific primary navigation;
- authorization boundaries;
- support and escalation process.

Required client participants:
- executive sponsor or delegated owner;
- functional administrator.

Evidence required for completion:
- date/duration;
- participant names;
- attendance confirmation;
- questions/open items;
- training attendance record.

## Session 2 — CEO, Directors and reporting

**Planned duration:** 60 min  
**Status:** not scheduled

Coverage:
- CEO **Hoy** view: business status, KPI strip and priorities;
- Director **Hoy** view: office/team summary before operational detail;
- role-specific five-item primary navigation;
- progressive disclosure for methodology/governance;
- approved vs provisional management metrics;
- canonical report surface and latest-deliverable workflow;
- report schedules and authorized recipients;
- interpretation of generation and delivery states;
- pending KPI/reporting decisions.

Required client participants:
- CEO or delegated executive;
- Director representative;
- management/reporting owner.

## Session 3 — Commercial operation and roles

**Planned duration:** 60 min  
**Status:** not scheduled

Coverage:
- seller/executive **Hoy** view and personal performance;
- seller primary navigation: Hoy, Mercado, Valorizaciones, Propiedades, Mi reporte;
- property portfolio and attention states;
- valuation cases and next action;
- role boundaries;
- mobile navigation and portfolio use;
- incident reporting for wrong-scope visibility;
- user provisioning/offboarding responsibilities.

Required client participants:
- commercial/CRM owner;
- seller/executive representative;
- functional administrator.

## Session 4 — Market Intelligence and Valuation

**Planned duration:** 90 min  
**Status:** not scheduled

Coverage:
- V1 market scope: houses for sale in Vitacura;
- four primary market decision metrics: active supply, confirmed sales, days on market, absorption;
- exceptions before methodology/detail;
- Portal, CBRS and territorial KML evidence under Data and methodology;
- identity/reconciliation rules;
- valuation registry **Qué necesita avanzar**;
- valuation creation and review;
- minimum three accepted comparables;
- seller → review → return/correction → CEO approval/issuance;
- immutable `issued` snapshot;
- non-binding R&D/context layers.

Required client participants:
- valuation owner/reviewer;
- market intelligence owner;
- CEO or authorized final valuation representative for the end-to-end acceptance case.

Acceptance objective:
- complete one authorized real valuation case through the workflow to `issued` if the client has an appropriate case available.

Do not create a fictitious production valuation solely to satisfy UAT.

## Session 5 — Management administration, continuity and handover

**Planned duration:** 60 min  
**Status:** not scheduled

Coverage:
- **Metas y alertas**: Qué requiere decisión, critical/open alerts, Review → Resolve/Dismiss;
- goal coverage and goal editing as secondary work;
- advanced evidence/rule configuration under disclosure;
- **Cierre del período**: Qué falta para cerrar;
- rejected rows → reconciliation before closeout;
- no period data → no monthly report;
- valid data → evaluate exceptions → generate monthly report;
- technical ingestion/JSON under Operación técnica de datos;
- environments and deployments;
- GitHub/Vercel/Supabase responsibilities;
- environment-variable names without secret values;
- release/rollback procedure;
- documentation-freeze rule after final accepted `main` commit;
- role QA and isolation checks;
- report delivery monitoring;
- incident management;
- backup/restore evidence and agreed operational responsibilities;
- third-party account ownership and credential rotation.

Required client participants:
- technical counterpart;
- functional administrator;
- sponsor/owner for account-transfer decisions.

## Materials to provide during training

- `EXECUTIVE_USER_MANUAL.md`;
- `ROLE_USER_MANUAL.md`;
- `ADMINISTRATION_MANUAL.md`;
- `DELIVERY_REQUIREMENTS_MATRIX_2026-09-01.md`;
- `HANDOVER_READINESS_2026-09-01.md`;
- `SUPPORT_AND_INCIDENT_RUNBOOK.md`;
- `ROLLBACK_AND_RECOVERY_PLAN.md`;
- UAT execution record;
- client dependency register;
- acceptance record template.

The copies used in training must correspond to the release commit under UAT. If PR #173 or another delivery PR changes visible workflows before acceptance, regenerate/freeze the manuals against that accepted commit.

## Completion rule

Training is complete only when each required session is either:

- completed with evidence; or
- explicitly waived by Property Partners with recorded authorization.

A scheduled meeting without attendance evidence is not completion. A document sent by email is not training acceptance by itself.