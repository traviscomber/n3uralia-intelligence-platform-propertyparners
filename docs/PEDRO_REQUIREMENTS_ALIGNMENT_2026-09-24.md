# Pedro requirements alignment — 2026-09-24

Status legend: **ALIGNED**, **PARTIAL**, **BLOCKED_SOURCE**, **NEEDS_DECISION**.

## Market intelligence

| Requirement | Status | Current implementation / next action |
| --- | --- | --- |
| 3–4 years with lines, visuals and deviations | ALIGNED in PR #235 | Separate Casa / Departamento, 4 complete CBRS years, transaction and UF/m² lines, YoY and deviation vs 4-year average. |
| MoM and YoY further back | PARTIAL | Current executive dashboard verifies latest comparable month. Historical annual series is now explicit. Monthly backfill needs additional verified periods from PP/Pedro before publishing longer MoM/YoY series. |
| Offer, sales, average monthly sales, absorption | PARTIAL | Average monthly sales is derived from the latest complete CBRS year. Absorption is intentionally blocked unless Portal proves a full snapshot. |
| Price quintiles, 20% cheapest / most expensive | ALIGNED for sales; PARTIAL for offer | CBRS sale quintiles are available. Offer quintiles are only published when a full Portal snapshot exists. |
| Publication stay / DOM | ALIGNED | Property 360 exposes source DOM, observed span, evidence age and confirmed DOM when a transaction closes the lifecycle. |
| Houses and apartments separated | ALIGNED in PR #235 | Both types are shown independently. Parking/storage are not merged into these residential transaction series. |
| Large trends connected to sales | ALIGNED | Market Intelligence compares supply evidence with CBRS transactions and price gaps; annual CBRS trend is separated by type. |
| Intramonth evolution / rotation up or down | PARTIAL | Canonical monthly snapshots exist but currently only one verified market period is available; no trend is fabricated. |
| Neighborhood KML/KMZ | ALIGNED | Canonical Property Partners KML polygons are already used. |
| Google Maps basemap | NEEDS_DECISION | Current map is an internal SVG/KML map, not Google Maps. Requires explicit choice/API configuration if Pedro needs Google Maps as the base layer. |
| Similar neighborhoods | PARTIAL | Valuation candidate logic and neighborhood comparability exist, but a client-facing explicit “similar neighborhoods” recommendation layer is not yet exposed. |

## Portal inventory and source truth

The following Pedro-note figures are **not yet canonical KPIs** because their universes are not reconciled:

- 46 Portal houses
- 151 including apartments on 2026-09-22
- 1,527 active houses on 2026-09-22

Current evidence:
- the collector run on 2026-09-22 is explicitly **partial**, 12 house rows, not a full snapshot;
- current canonical Portal-source active evidence contains more rows accumulated over time, but cannot be called the total live market until a full snapshot is proven;
- the product therefore fails closed and does not publish absorption/quintiles as full-market facts.

## CBRS transaction scope

**ALIGNED:** canonical CBRS reference metrics already separate Casa and Departamento. Parking/storage are not counted as Casa/Departamento transaction series.

Observed complete-year house counts in the canonical reference are materially below the note “~1,200 house sales/year”, so that note must not replace canonical metrics without reconciling the source/universe.

## Valuation and publication strategy

| Requirement | Status | Current implementation |
| --- | --- | --- |
| Weighted house area: built + land/4 | ALIGNED | Canonical valuation model uses built area + land/4 for comparison. |
| Max / average / minimum market values | ALIGNED | Portal and CBRS summaries persist min, average, median and max. |
| Publication scenarios +5% | ALIGNED | Canonical model exposes 0%, +5% and +10% publication scenarios. |
| Compare proposed publication to market | ALIGNED | Scenarios include variance vs Portal average/max by price and UF/m². |
| 10–15% starting range | NEEDS_DECISION | Existing canonical publication scenarios are 0/5/10. A fixed 10–15% rule would change methodology and needs Pedro confirmation. |
| 20% remove one chosen comparable | PARTIAL / NEEDS_DECISION | Human comparable selection/rejection exists. No automatic “remove 20%” rule is encoded because the note is ambiguous. |
| Maximum 18 months; first 14 available | NEEDS_DECISION | Needs definition: age of comparable, publication horizon, or review window. |
| Recommendation: cheap/expensive relative to current listings | PARTIAL | Property 360 positions price vs comparable median; publication scenario UI can be made more explicit as percentile/quintile positioning after Portal full-snapshot coverage is reliable. |

## Management / reporting

| Requirement | Status | Current implementation |
| --- | --- | --- |
| Leads, visits, process indicators | ALIGNED | Canonical metrics include leads, classified/unclassified, visits scheduled/realized, conversion and follow-up. |
| Quick indicators and monthly alerts | ALIGNED | CEO and director views expose verified period metrics and alerts. |
| Director sees office and partners | ALIGNED | Director workspace contains partner performance, goals, tasks and reports. |
| Each executive assigned a neighborhood | PARTIAL | Property assignment and KML neighborhood ownership are present, but “attractive / opportunity score” per assigned neighborhood is not yet one consolidated executive workflow. |
| P&L by business / office / partner | BLOCKED_SOURCE | Finance/margin/P&L is intentionally not fabricated. A Property Partners canonical financial source is required. |
| Activity reports | PARTIAL | Management reports exist; access/view telemetry is not a canonical management metric yet. |
| See whether users viewed accesses | BLOCKED_SOURCE / NEEDS_DECISION | No canonical per-user product-view event model exists. Requires explicit tracking scope and retention/privacy decision. |
| Preventive management CBR monthly directors / weekly | NEEDS_DECISION | “CBR” needs an exact business definition and recipients/actions before scheduling. |

## Closing workflow

Requested stages:
1. offer;
2. seller / negotiation (2–3 days, maximum 7);
3. current operation / inventory;
4. promise;
5. title study;
6. escritura draft;
7. signed escritura;
8. CBRS registration;
9. delivery (~4 months).

Status: **NOT YET MODELED AS A CANONICAL WORKFLOW**.

Before implementation, confirm:
- whether this is one workflow per closed sale or two linked “close” milestones;
- which system/source owns each stage;
- whether durations are targets/SLA or mandatory rules;
- which roles may advance/return each stage.

## Immediate development order

1. Complete and QA PR #235: Pedro market intelligence v2.
2. Reconcile Portal full-snapshot coverage and Pedro’s 46 / 151 / 1,527 figures.
3. Expose publication strategy/quintile position inside Property 360 once offer coverage is reliable.
4. Model the closing lifecycle after stage ownership is confirmed.
5. Connect P&L only after PP supplies a canonical financial source.
6. Add user-view/activity tracking only after scope/retention is approved.
