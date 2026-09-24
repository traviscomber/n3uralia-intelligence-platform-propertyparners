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
| Leaflet basemap | CONFIRMED | Use Leaflet as the interactive basemap over the canonical Property Partners KML geometry. Do not depend on Google Maps. |
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
| Publication strategy | CONFIRMED | Recommended publication uplift is +5%. Keep negotiation as a separate range, not as a second publication markup. |
| 20% opportunity band | CONFIRMED | Use the cheapest 20% as an opportunity signal to identify a potential 'cazar la casa' case. Do not automatically remove those records; surface them for review/recommendation. |
| Comparable sample size | CONFIRMED | 3 comparables remain the minimum. 5 is the default maximum reliable sample. More than 5 requires explicit justification and should only be accepted when it demonstrably improves evidence quality/confidence. |
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
| Weekly management reporting | CONFIRMED | Generate/update the management report when the system’s source data is uploaded, normally once per week. Reports must reflect the newly uploaded canonical period and not run from stale data. |

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

Status: **CONFIRMED DESIGN; NOT YET MODELED AS A CANONICAL WORKFLOW**.

Confirmed sequence: offer → seller/negotiation → promise → title study → escritura draft → signed escritura → CBRS registration → delivery. The implementation should preserve the two business closing milestones described by Pedro as distinct tracked milestones, with stage ownership/auditability explicit in the model. Durations are operational targets unless a canonical PP rule says otherwise.

## Immediate development order

1. Complete and QA PR #235: Pedro market intelligence v2.
2. Reconcile Portal full-snapshot coverage and Pedro’s 46 / 151 / 1,527 figures.
3. Expose publication strategy/quintile position inside Property 360 once offer coverage is reliable.
4. Model the closing lifecycle after stage ownership is confirmed.
5. Connect P&L only after PP supplies a canonical financial source.
6. Add user-view/activity tracking only after scope/retention is approved.

## Confirmed product rules from follow-up

- Portal counts such as 46 / 151 / 1,527 are source/search-filter observations and must retain their filter + capture context instead of being confused with canonical PP inventory.
- Publication recommendation: +5% over commercial valuation as the standard strategy.
- Negotiation is a separate range from publication strategy and should be presented as a decision band, not silently folded into valuation.
- Cheapest 20% of the relevant market cohort is an opportunity signal, not an automatic outlier deletion rule.
- Comparable evidence: minimum 3; target/default maximum 5. >5 requires an explicit reason and evidence that quality/confidence improves.
- Closing lifecycle sequence confirmed.
- Weekly reports should be data-triggered after the weekly source upload.
- Territory map direction: Leaflet + canonical PP KML/KMZ geometry.
