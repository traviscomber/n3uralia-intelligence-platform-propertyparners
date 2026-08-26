# Property Partners — Monthly Executive Report Standard

Status: CANONICAL
Version: 2026.08.25-v1
Audience: Pedro Pablo / CEO / Dirección
Scope: reports generated from the app under Management / Reportería.

## Purpose

The monthly report is a management decision document, not a generic analytics export. It must answer, in this order:

1. What happened this month?
2. How does it compare with the previous month (MoM)?
3. How does it compare with the same month last year (YoY), when comparable canonical data exists?
4. Where is conversion being lost?
5. What is happening with the portfolio?
6. What are the three actions for the next cycle?

The report must remain concise, executive, printable and evidence-grounded.

## Canonical source policy

Primary source: `public.management_metric_values` joined to `public.management_metric_definitions` and `public.management_entities`.

Targets: `public.management_goals`.

Evidence lineage: `public.management_source_records`, `public.management_import_runs`, `public.management_metric_reconciliations` and source references stored with each metric.

Never use `weekly_reports` as a source for monthly executive KPIs unless a metric has been explicitly reconciled into `management_metric_values`.

Never replace missing canonical values with values from market intelligence, valuation, scraped listings, demo data, hard-coded assumptions, model guesses or prose memory.

Market intelligence and valuation are separate product pillars. They must not be mixed into the monthly management report unless the report type explicitly requests a cross-pillar appendix.

## Required monthly metrics

Use these metrics when they are verified/evaluable for the selected company and period:

- `sales` — Ventas
- `sales_uf` — Volumen vendido UF
- `goal_compliance` — Cumplimiento de meta
- `requirements` — Requerimientos online
- `leads` — Leads
- `scheduled_visits` — Visitas agendadas
- `realized_visits` — Visitas realizadas
- `listings` — Captaciones
- `stock` — Cartera publicada
- `suspended_listings` — Propiedades suspendidas

Advanced management metrics may be added only when valid for the requested period:

- `active_leads_snapshot`
- `classified_leads`
- `unclassified_leads`
- `stale_90_leads`
- `active_a_leads`
- `stale_15a_leads`
- `conversion`
- `conversion_6m_operational`
- `productivity`
- `sales_velocity`
- canonical portfolio/follow-up/conversion/management scores.

## Derived metrics allowed

Derived values are allowed only when every input is canonical, comparable and from the same period. Label them as derived.

For the funnel:

- requirements_to_leads = leads / requirements
- leads_to_scheduled = scheduled_visits / leads
- scheduled_to_realized = realized_visits / scheduled_visits
- realized_to_sales = sales / realized_visits
- leads_to_sales = sales / leads

For sales:

- average_ticket_uf = sales_uf / sales, only when sales > 0
- target_gap_sales = target_sales - sales

Do not silently round source values before calculating. Round only for display.

## MoM policy

MoM is mandatory when the immediately previous calendar month exists with the same metric code and compatible `formula_version`.

Formula:

`(current - previous) / previous * 100`

If previous is zero, display `N/D` rather than infinity.

Always show the current value, prior value and delta. Do not describe a negative MoM as a structural decline without additional evidence.

## YoY policy

YoY is mandatory only when the same calendar month from the previous year exists with compatible metric definition and formula version.

If YoY evidence does not exist, show `N/D` and do not infer it from annual averages or unrelated baselines.

Do not imply broad deterioration when MoM is negative but YoY is stable. The report must explicitly distinguish short-term movement from year-over-year performance.

## Organizational breakdown

Company-level metrics are the default.

Office/partner comparisons may appear only when canonical metric values exist for those entity IDs for the same period and metric methodology.

Never infer an office value by distributing the company total. If coverage is incomplete, state `Sin cobertura canónica por oficina/partner para este período`.

## Mandatory report structure

Maximum recommended length: 6 pages for the monthly CEO report.

### Page 1 — CEO summary

Show only the most decision-relevant values:

- sales
- sales UF
- target compliance
- MoM sales
- YoY sales
- one short executive diagnosis

The diagnosis must be factual and brief. Maximum three key messages.

### Page 2 — MoM / YoY

Show exact comparisons for the core commercial metrics.

Preferred charts:

- sales: current vs previous month vs same month last year
- sales UF: current vs previous month vs same month last year

Keep exact numbers adjacent to charts. Use `N/D` rather than fabricated bars.

### Page 3 — Commercial funnel

Show the chain:

`requirements → leads → scheduled visits → realized visits → sales`

Show conversion rate between each adjacent stage and highlight the largest meaningful loss.

Do not call normal funnel attrition a problem by itself; identify the bottleneck based on the actual conversion pattern and available historical context.

### Page 4 — Portfolio

Show:

- stock
- listings/captations
- suspended listings
- MoM deltas

Highlight unusual movement only when supported by the canonical comparison.

### Page 5 — Management diagnosis and decisions

Maximum three findings and maximum three actions.

Each action must be linked to a verified finding in the same report. Avoid generic recommendations such as `improve sales`, `expand market`, or invented benchmarks.

Use action language:

- owner/action area
- concrete action
- metric to monitor next month

### Page 6 — Sources, coverage and methodology

Include:

- period
- entity scope
- source cutoff
- metric formula versions
- canonical source references
- missing coverage
- any reconciliation note

This page may be denser than the executive pages but must remain readable.

## Visual standard

Follow repository `DESIGN.md` first.

For formal reports:

- A4 portrait
- white/light editorial pages
- Montserrat for report typography
- black/deep charcoal headings and text
- Property Partners red as restrained structural accent
- square corners
- no gradients, glow, glass, 3D effects or decorative dashboard UI
- direct labels on charts where possible
- subtle gridlines
- no more than four series per chart
- no tiny legends or axis labels
- generous margins and whitespace
- consistent header/footer and page numbering

Every page must have one primary management question. Avoid card grids that compete for attention.

## Chart rules

Charts are evidence, not decoration.

- Zero baseline for bar charts.
- Never convert null to zero.
- Never compare incompatible formula versions.
- Always show units.
- Always attach a source note.
- Prefer direct labels.
- MoM and YoY must not share an ambiguous unlabeled series.
- Do not use pie/donut charts unless the values form a verified 100% composition.

## Narrative rules

The report language is Spanish, concise and operational.

Separate:

- HECHO: verified canonical fact
- LECTURA: interpretation of those facts
- ACCIÓN: recommendation supported by the facts

Do not include unsupported phrases such as market benchmarks, industry standards, cycle times, growth percentages, ROI, productivity standards or market opportunities unless those values are canonical evidence for the report.

Do not include market-intelligence or valuation commentary by default.

## Validation gates

Generation must fail rather than produce an unreliable report when:

- the requested company/period cannot be resolved;
- required source evidence is absent for a displayed metric;
- metric formula versions are incompatible for a comparison;
- a chart contains unsupported or missing values represented as zero;
- generated conclusions introduce facts not in the canonical snapshot;
- PDF rendering fails;
- page QA detects clipping, overlap or unreadable chart labels.

A missing metric is acceptable and must appear as `N/D`; a fabricated metric is not acceptable.

## QA before publishing

Before a generated report becomes downloadable:

1. validate canonical snapshot;
2. validate derived formulas;
3. validate MoM/YoY comparability;
4. validate every chart source;
5. render PDF to images;
6. inspect every page for clipping, overlap and hierarchy;
7. verify that no more than three actions appear;
8. verify that sources/methodology are included;
9. persist report snapshot and generation metadata;
10. only then mark `completed`.

## Approved reference

The approved visual/content reference is the August 25, 2026 manually validated May 2026 executive report (`Property_Partners_Informe_Mayo_2026_EXECUTIVE_FINAL.pdf`). Future app reports should reproduce its information hierarchy and management logic, while populating values dynamically from canonical data for the requested period.
