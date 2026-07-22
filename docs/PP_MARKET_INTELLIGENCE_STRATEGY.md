# PP Market Intelligence Strategy

## Objective

Build a Vitacura-only market intelligence system for property sales that helps sellers, directors, and the CEO make better decisions every day.

## Scope

- Market: Vitacura only.
- Product: houses and departments.
- Business motion: sales only, no rentals.
- Primary users: sellers, sales directors, CEO.

## Operating Model

### 1. Capture

Ingest the widest possible raw inventory, but keep source provenance attached to every record.

Primary sources:

- Portal Inmobiliario.
- TOCTOC.
- icasas.cl.
- Yapo.
- Chilepropiedades.
- Internal properties and historical sales.
- External benchmark snapshots when available.

### 2. Normalize and deduplicate

Treat deduplication as a first-class product step, not as a cleanup afterthought.

Hard dedupe rules:

- Same external or source listing id wins immediately.
- Same listing number wins immediately.
- Same normalized source URL wins immediately.
- Same normalized address plus same neighborhood plus same property type is a duplicate.
- Near-duplicate geolocation, price, and area should collapse into one canonical record when the evidence is strong enough.

Merge rule:

- Preserve the most complete canonical record.
- Merge tags, images, source references, and listing metadata.
- Keep provenance so the team can trace where the canonical record came from.

Outcome:

- One canonical property record per real property.
- Stable data for valuation, reporting, and conversion tracking.

### 3. Rank and enrich

Once records are canonical, score them for commercial usefulness.

Signals to keep:

- Recency.
- Price position versus comparable stock.
- Area and bedroom/bathroom fit.
- Neighborhood strength.
- Inventory pressure and absorption.
- Lead or seller activity where available.

### 4. Report by role

The same market base must produce different outputs by audience.

Seller report:

- What to call today.
- Which properties to prioritize.
- Which objections and closing arguments to use.
- Which follow-ups are overdue.

Director report:

- Team performance.
- Conversion, velocity, and target gap.
- Coaching priorities.
- Pipeline risk by seller and neighborhood.

CEO report:

- Business trend.
- Market health.
- Source reliability.
- Team comparison.
- Resource allocation by neighborhood and team.

## Update Cadence

- Refresh scrapes continuously or on a fixed schedule.
- Re-score the canonical inventory after every meaningful ingest.
- Rebuild the weekly report set from the latest consolidated state.
- Escalate stale sources, low-volume runs, repeated failures, and broken dedupe coverage.

## Decision Rules

- If a source disagrees with the canonical record, keep the stronger evidence and preserve both traces.
- If a property cannot be deduplicated confidently, keep it isolated rather than merging it incorrectly.
- If a report cannot support a seller-level answer, fall back to director-level or market-level guidance instead of inventing detail.
- If data is outside Vitacura or outside sales, exclude it from the core operating model.

## Actionable Insights Contract

Every insight should end with a decision or next action.

Accepted insight shapes:

- Move effort to a specific barrio.
- Call a specific property or seller first.
- Reallocate attention to a specific team or director.
- Refresh a source or fix a missing field.
- Push a property from passive observation into active follow-up.

## Operational Metrics

Track these as the minimum set:

- Canonical property count.
- Duplicate merge rate.
- Source freshness by provider.
- Coverage by neighborhood.
- Inventory by type.
- Absorption by neighborhood.
- Conversion by team.
- Velocity by director.
- Weekly target gap.

## Professional Measurement Framework

This is the measurement layer that makes the system operationally credible. Every metric should have a formula, an owner, a cadence, and a decision threshold.

### 1. Data Quality

| Metric | Formula | Cadence | Owner | Why it matters | Action threshold |
| --- | --- | --- | --- | --- | --- |
| Inventory coverage | Canonical properties / estimated available properties | Daily | Data ops | Tells whether the system sees enough of the market | Below 85% triggers source expansion |
| Freshness lag | Now - last successful ingest per source | Hourly / daily | Data ops | Prevents stale pricing and stale inventory | Over 24h for priority sources triggers alert |
| Duplicate merge rate | Merged duplicates / raw ingested records | Daily | Dedupe owner | Shows how much noise the pipeline is removing | Sudden drops or spikes trigger audit |
| Field completeness | Filled critical fields / required critical fields | Daily | Data ops | Ensures reports can reason on usable records | Below 95% on core fields triggers backfill |
| Source reliability | Successful runs / total runs | Daily / weekly | Platform owner | Detects broken scrapers before operators feel it | Below 90% triggers source remediation |

### 2. Market Intelligence

| Metric | Formula | Cadence | Owner | Why it matters | Action threshold |
| --- | --- | --- | --- | --- | --- |
| Active inventory | Available properties by barrio and type | Daily | Market analyst | Measures real supply | Used for barrio prioritization |
| Absorption rate | Closed or moved stock / total stock in period | Weekly | Market analyst | Shows where demand is strongest | Below target means repositioning |
| Days on market | Average days from publish to close or deactivation | Weekly | CEO / director | Reveals market speed and friction | Rising trend triggers pricing review |
| Price per m2 trend | Current median UF/m2 vs previous period | Weekly / monthly | Market analyst | Shows pricing direction | Sharp deviation triggers comp review |
| Neighborhood concentration | Share of inventory and demand in each barrio | Weekly | CEO | Identifies focus zones and overexposed zones | Overconcentration triggers diversification |
| Price position vs comps | List price - comp median price | Per report | Director | Shows if a property is priced to move | Large premium without conversion triggers action |

### 3. Commercial Execution

| Metric | Formula | Cadence | Owner | Why it matters | Action threshold |
| --- | --- | --- | --- | --- | --- |
| Lead response time | First contact time - lead arrival time | Daily | Seller / director | Conversion is highly sensitive to speed | Over 5 minutes for digital leads triggers alert |
| Lead to conversation | Conversations / new leads | Weekly | Director | Measures early funnel effectiveness | Below target means tighten outreach |
| Conversation to appointment | Appointments / conversations | Weekly | Director | Shows quality of follow-up and qualification | Below target triggers script review |
| Appointment to offer | Offers / appointments | Weekly | Director | Measures serious commercial momentum | Weak ratio signals mismatch or pricing issue |
| Offer to close | Closed deals / offers | Weekly / monthly | CEO | Final conversion efficiency | Low ratio triggers pricing / negotiation review |
| Follow-up completion | Completed follow-ups / planned follow-ups | Daily / weekly | Seller | Ensures disciplined execution | Below 90% triggers coaching |

### 4. Management and Forecasting

| Metric | Formula | Cadence | Owner | Why it matters | Action threshold |
| --- | --- | --- | --- | --- | --- |
| Forecast accuracy | 1 - absolute error between forecast and actual / actual | Monthly | CEO | Shows whether planning is trustworthy | Below threshold triggers forecast review |
| Target gap | Target - actual | Weekly | CEO / director | Keeps focus on business outcome | Persistent gap triggers resource shift |
| Productivity per seller | Closed deals / active seller | Weekly | Director | Normalizes performance by headcount | Bottom quartile triggers coaching |
| Pipeline coverage | Weighted pipeline / target | Weekly | Director | Tells whether future weeks are safe | Below 3x target triggers pipeline build |
| Time to action | Insight generated -> action logged | Weekly | Operating lead | Measures if intelligence changes behavior | Over 7 days triggers workflow review |

### 5. AI Quality

| Metric | Formula | Cadence | Owner | Why it matters | Action threshold |
| --- | --- | --- | --- | --- | --- |
| Recommendation adoption | Useful feedback / total feedback | Weekly | Product / market intel | Measures if the AI is trusted | Below 60% means rework ranking |
| Recommendation rejection | Ignored feedback / total feedback | Weekly | Product / market intel | Detects noisy or low-value outputs | Rising trend means prune prompts |
| Feedback coverage | Recommendations with feedback / total recommendations | Weekly | Product / market intel | Ensures the learning loop is active | Below 70% means insufficient usage |
| Action conversion | Recommendations that became logged actions / total recommendations | Weekly | Product / market intel | Measures if insights drive execution | Low conversion means outputs are not operational enough |
| Hallucination rate | Invalid or unsupported claims / total AI claims sampled | Monthly | QA / product | Protects trust in executive reporting | Any sustained non-zero rate needs review |

### 6. Cadence and Ownership

- `Daily`: data freshness, dedupe issues, lead response, source reliability.
- `Weekly`: neighborhood performance, team conversion, recommendation adoption, target gap.
- `Monthly`: forecast accuracy, pricing trend, portfolio concentration, AI quality review.
- `Quarterly`: market coverage strategy, source expansion, KPI revisions, role scorecard reset.

### 7. Decision Hierarchy

- `CEO`: allocate resources, shift barrio focus, and approve market strategy changes.
- `Director`: manage funnel health, coach sellers, and reassign priorities.
- `Seller`: execute follow-up, calls, visits, and property-specific actions.
- `Data ops`: fix freshness, dedupe, and source reliability issues before they contaminate the business view.

### 8. Operating Principle

The system should only count as professional if every insight ends in one of four outputs:

- A decision.
- A task.
- A forecast change.
- A corrective action on data quality.

## Current Status

The repo already has:

- Vitacura-only market scope helpers.
- Role-based AI report generation.
- Sales director and CEO report lanes.
- Scrape health and benchmark persistence.
- Property deduplication helpers and maintenance endpoints.

What still matters most:

- Keep dedupe strict enough to protect trust in the canonical inventory.
- Keep report outputs short, specific, and tied to a decision.
- Keep the whole system anchored to Vitacura and sales only.

## Real Source Architecture

The operating model uses each supplied source for the question it can actually answer. A presentation never replaces a CRM fact, an asking price never becomes a registered sale, and a geographic overlap never becomes an inferred neighborhood.

| Pillar | Source | Operational role | Update rule |
| --- | --- | --- | --- |
| Control de Gestion | 84 CRM workbooks | Observed commercial activity | Rebuild and verify every received workbook and cell manifest |
| Control de Gestion | 3 Metas 2026 workbooks | Monthly contract by branch and partner | Preserve raw values and source revision |
| Control de Gestion | 5 Presentaciones 2026 decks | Management interpretation and historical reporting | Compare every comparable table or chart against CRM and targets |
| Inteligencia de Negocios | Portal Inmobiliario exports | Published offer and asking conditions | Keep source ID and quality flags; exclude explicit rental records |
| Inteligencia de Negocios | Barrios Vitacura KML | Polygon geometry | Mark points in overlapping polygons as `AMBIGUOUS_POLYGON` |
| Inteligencia de Negocios | CBRS Vitacura workbook | Registered transactions | Preserve operation, property type, date, ROL and geocoding status |
| Valorizacion de Propiedades | Plantilla Casas | Commercial valuation method for houses | Preserve separate construction and land rates; weight land at 25% only for comparison |
| Valorizacion de Propiedades | Plantilla Departamentos | Commercial valuation method for apartments | Value useful area; weight terrace at 50% only for comparison |

### Current verified coverage

- Presentations: 5 decks, 304 slides, 320 tables, 210 charts and 210 embedded workbooks.
- Presentation reconciliation: 115 comparable observations, with 60 exact, 45 different and 10 not comparable.
- Portal: 5,197 globally unique publication IDs across departments, projects and houses.
- KML: 19 polygons and 12 candidate overlap pairs; two supplied Portal coordinates fall in more than one polygon.
- CBRS: 40,843 rows and 1,287,176 populated cells in the principal sheet, covering 2014-01-02 through 2026-01-09.
- Portal to CBRS: zero confirmed deterministic matches with the supplied fields. The system must not manufacture this join.
- Valuation templates: 2 workbooks, 4 sheets, 436 populated cells and 122 formulas with zero stored formula errors.
- Historical valuation case: 6 Portal rows represent 5 declared entities; 2 of 6 registered comparables reproduce exactly in the supplied CBRS base.

## Connected Decision Loop

1. `Hecho`: CRM and CBRS preserve observed activity and registered transactions.
2. `Contrato`: Metas 2026 defines expected performance by branch and partner.
3. `Contexto`: Portal and KML describe supply, asking conditions and neighborhood geometry.
4. `Interpretacion`: Presentations preserve management's reported reading at a point in time.
5. `Conciliacion`: every mismatch remains visible with source, period, metric and delta.
6. `Accion`: the role report converts only supported findings into a task, decision, forecast change or data-quality correction.

### Valuation decision loop

1. Identify the asset with address, neighborhood and ROL; identifiers do not alter the formula.
2. Select reviewed Portal offer and CBRS registered comparables without mixing asking and closing prices.
3. Resolve duplicate groups before using averages or medians.
4. Apply a professionally approved UF/m2 input. The system does not invent this value from age, floor, bedrooms or amenities.
5. Calculate the source commercial value and the exact 0%, 5% and 10% publication scenarios.
6. Compare a later close only when dates and definitions make the observation temporally comparable.

House source method:

- Commercial value: `built area * built UF/m2 + land area * land UF/m2`.
- Comparative weighted area: `built area + land area / 4`.

Apartment source method:

- Commercial value: `useful area * applied useful UF/m2`.
- Comparative weighted area: `useful area + terrace area / 2`.

## Evidence States

- `EXACT`: source values agree after documented normalization.
- `DIFFERENT`: both source values exist and the delta is retained.
- `NOT_COMPARABLE`: definitions, periods or granularity do not support a valid comparison.
- `AMBIGUOUS_POLYGON`: a coordinate belongs to multiple supplied KML polygons.
- `PENDING_MATCH`: potentially related records lack a deterministic shared key.
- `CONFIRMED_MATCH`: only available when deterministic identifiers or reviewed evidence prove identity.
- `NOT_COMPARABLE_TEMPORALLY`: the same asset is identified, but the dates do not support model-accuracy measurement.

## Role Outputs

- `Ejecutivo de venta`: overdue follow-up, visits, active requirements, property priorities and supported talking points.
- `Director de venta`: target gap, funnel conversion, stale leads, branch comparisons, data incidents and coaching priorities.
- `CEO`: closing and UF trend, forecast gap, source reliability, portfolio concentration and allocation decisions.

## Refresh and Quality Gates

- CRM, targets and presentations: rebuild on every new file delivery; reject publication when source hashes or cell coverage differ from the manifest.
- Portal: scheduled ingest with source-level freshness, row-quality checks and strict deduplication before canonical inventory.
- KML: versioned geometry; rerun spatial assignment after any polygon change.
- CBRS: append by source period, verify formulas independently and flag partial-period coverage.
- AI: generate recommendations only from cited records and expose unsupported or non-comparable claims instead of completing them heuristically.

## Privacy and Repository Policy

The repository stores verified aggregates, schemas, hashes and reconciliation evidence needed by the application. Raw personal CRM rows and unrestricted transaction-level source files remain outside the public code history unless an approved access-controlled data store is configured.
