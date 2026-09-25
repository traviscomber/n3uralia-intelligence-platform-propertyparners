# Property Partners — Canonical Data Model

## Purpose

This document defines ownership of the main facts used by Property Partners. It prevents management, market, valuation and advisory intelligence from overwriting one another.

## 1. Management

Current management authority:
- `Ago_Directorio.pptx`
- current management-credit series and scoring through August 2026.

Historical reports remain immutable evidence of what was reported at the time. Later Pedro board reports may restate management-credit series, goals or scores.

Do not mix:
- operational CRM sales;
- management-credited sales;
- monthly goals;
- cumulative goals.

Monthly and cumulative goals are separate published facts.

## 2. Historical CRM 2025

Authority:
- source contracts and SHA-verified 2025 CRM workbooks;
- `data/crm-intelligence.json#baseline2025.months`.

Supports company-level monthly history for:
- sales;
- sales UF;
- leads;
- requirements;
- scheduled visits;
- realized visits.

Office/Partner historical attribution requires explicit identity and credit rules; do not infer by fuzzy name matching.

## 3. Registered market sales — CBRS

Authority:
- `BASE_CBR_CON_BARRIO_ASIGNADO VITACURA.xlsx`
- source code `cbrs_vitacura_canonical_2014_2026`.

Raw rows: 40,843.

Raw rows are transaction components, not residential sales.

Canonical residential event:
- one `FOJA + NUMERO + FECHA + TOMO`;
- exactly one residential primary asset;
- sum UF across event components;
- exclude remate and permuta.

Canonical residential compraventa events: 17,581.
- Casa: 5,007.
- Departamento: 12,574.

## 4. Portal reference market

Authority date: 2026-03-09.

Reference benchmark:
- houses: 1,731 valid listings;
- departments: 3,440 valid listings;
- projects: 26 valid listings.

These are benchmark/reference universes.

They are not interchangeable with:
- current live Portal capture;
- partial scraper runs;
- Property Partners internal stock.

A live capture can be called a full current market only when the ingestion run proves full coverage.

## 5. Territory

Authority:
- `Barrios Vitacura.kml`
- SHA-256 `334fc652e0cd02389f61c5eb2dc068d6c322524f1ad3de7c313e0659bfa1fa52`.

Official PP neighborhoods: 19.

Application maps may use another basemap, but PP neighborhood geometry comes from this KML.

## 6. Valuation

Authority:
- `data/canonical/valuation-intelligence.json`;
- original Property Partners valuation templates.

### Casa

Commercial value:

`built_m2 × built_rate_uf_m2 + land_m2 × land_rate_uf_m2`

Comparable/effective area:

`built_m2 + land_m2 / 4`

Comparable UF/m²:

`price_uf / effective_area`

### Departamento

Commercial value:

`useful_m2 × applied_useful_uf_m2`

Portal/TocToc comparable area:

`useful_m2 + (total_m2 - useful_m2) / 2`

CBRS comparable:
- use registered source area;
- do not invent a terrace split or relabel source area without evidence.

Subject comparison area:

`useful_m2 + terrace_m2 / 2`

### Publication scenarios

Canonical:
- 0%
- 5%
- 10%

Formula:

`commercial_value / (1 - margin)`

+5% may be the preferred operational recommendation; it does not delete 0% or 10%.

### Comparables

- minimum 3 selected/calculable;
- normal reliable maximum 5;
- >5 requires explicit justification;
- explicit duplicates count once;
- do not automatically remove low-price/outlier observations;
- lowest 20% can be an opportunity/review signal.

### Qualitative factors

Condition, remodeling, orientation, floor, light, view, noise and commercial potential are review evidence.

Current canonical v2 applies **no automatic economic adjustment** from those fields.

## 7. Valuation intelligence layers

Canonical owner of price:
- source-template mathematics + explicit subject rates + selected evidence + human workflow decision.

Advisory only:
- similarity;
- second opinion;
- ML shadow;
- PRC;
- topography;
- road hierarchy;
- regime routing;
- professional review recommendations.

Advisory layers can improve review/confidence; they cannot silently rewrite canonical value.

## 8. Property 360

Property 360 is a projection over canonical evidence. It is not a separate source of truth.

It may combine:
- canonical property identity;
- listing lifecycle;
- CBRS transactions;
- Portal evidence;
- KML territory;
- valuation cases/comparables;
- CRM assignment.

If evidence is below a decision gate, show the evidence and mark the decision non-evaluable.

## 9. Report generation

Every report must preserve:
- period;
- entity;
- source;
- source reference/hash when available;
- methodology/formula version;
- current-vs-historical/restated semantics;
- warnings and missing evidence.

Never backfill a missing fact by borrowing a similar metric from another domain.
