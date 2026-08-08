# Canonical Data Audit — 2026-08-08

Status: ACTIVE GATE

This document freezes the current evidence state and defines the minimum data conditions required before expanding Pedro Pablo with additional autonomous or analytical capabilities.

## Product priority

The platform priority is not adding more assistant features. The priority is to complete analysis, reconciliation, freshness, provenance and canonicalization of the real Property Partners / Vitacura data.

Pedro Pablo may only become more capable when the underlying evidence supports the capability.

## Evidence measured in production

Supabase project: `orfncinmhymhhoxbxgjb`
Audit date: 2026-08-08

### Market inventory

- `properties`: 837 rows.
- `market_properties`: 837 rows.
- `market_current_listings`: 837 rows, all marked active.
- Listing operation: 837 Venta.
- Property mix: 502 departamentos, 335 casas.
- Latest observed listing evidence: 2026-07-20 01:04:30 UTC.
- `market_properties.identity_status`: 837 candidate, 0 confirmed.
- `market_properties_canonical`: 0 rows.
- `market_transactions`: 0 rows.
- `valuation_cases`: 0 rows.

### Listing provenance and identity

Legacy `properties` data:

- 837 total rows.
- 371 rows missing `source_listing_id`.
- 74 rows missing `source_url` and source.
- 174 duplicate normalized address groups representing 477 rows.
- Maximum rows sharing one normalized address: 23.

Source-level gaps include:

- `portal_inmobiliario`: 310 rows, 58 missing listing ID.
- `portal_inmobiliario_departments`: 121 rows, 120 missing listing ID.
- `portal_inmobiliario_houses`: 120 rows, 119 missing listing ID.
- 74 rows with no source.

Conclusion: address cannot be treated as a unique property identity. Identity must remain candidate until stronger evidence exists.

### Listing price quality

Observed legacy asking-price data has substantial dispersion requiring outlier control before aggregate intelligence:

- Departamentos: median asking price ~14,666 UF; median ~99.2 UF/m²; observed range ~20.8–625 UF/m².
- Casas: median asking price ~32,000 UF; median ~104.2 UF/m²; observed range ~27–2,666.7 UF/m².
- 9 rows below 40 UF/m².
- 17 rows above 250 UF/m².

These thresholds are audit flags only, not automatic corrections or exclusion rules.

### Ingestion state

Canonical ingestion runs currently recorded:

- `portal_apartments`: 502 received / 502 accepted / 0 rejected.
- `portal_houses`: 335 received / 335 accepted / 0 rejected.
- Source system: `manual_import`.
- Recorded completion: 2026-07-30.

The imported listings themselves have last-observed evidence from 2026-07-20, so ingestion completion date must not be confused with market freshness.

### Legacy source registry

The source registry still references larger legacy datasets, including:

- Portal Inmobiliario: 12,847 rows.
- Historial de Ventas: 4,231 rows.
- Base de Conocimiento: 892 rows, currently quarantined.
- KMZ Barrios: 48 rows.
- Legacy properties bridge: 837 rows, period 2026-07-11 to 2026-07-20.

These source registry counts do not mean those datasets are available in the current canonical transactional tables.

### Neighborhood intelligence

- `market_data`: 11 rows, all from 2026-07-11.
- All 11 lack `source` and `source_url`.
- `neighborhood_market_data`: 33 rows, dates 2026-07-13 to 2026-07-22.
- All 33 lack `source_url`.
- Each neighborhood row reports only `data_points = 1`.
- Opportunity scores exist (54–62), but provenance is insufficient to present them as fully traced market facts.

Until the origin and methodology are reconciled, neighborhood aggregates and opportunity scores are `untraced_derived_evidence`.

### Management intelligence

- `management_metric_values`: 97 rows.
- All 97: `quality_status = verified`.
- All 97: `evaluation_status = evaluable`.
- Latest period end: 2026-07-31.
- Latest source cutoff: 2026-08-02.
- `management_approved_metric_values`: 0 rows.

Management evidence can therefore be described as verified/evaluable, but not as formally approved/published when that distinction matters.

## Canonical ownership decisions

### Current canonical business state

- Operational management state: management entities / goals / metrics / tasks under current governance contracts.
- Property assignment state: `property_assignments`.
- Valuation workflow state: `valuation_cases` when real cases exist.

### Current market evidence

- `market_current_listings` / `market_properties` are operational market evidence, not confirmed property truth.
- `market_properties.identity_status = candidate` must remain visible.
- Asking prices are evidence of listing offers, not closed transaction values.

### Not currently available as canonical evidence

- Confirmed canonical market-property corpus (`market_properties_canonical` is empty).
- Closed transaction corpus (`market_transactions` is empty).
- Real valuation-case corpus (`valuation_cases` is empty).

## Pedro Pablo intelligence gates

Pedro Pablo MUST:

1. State the cutoff for market answers.
2. Distinguish asking/listing evidence from transaction evidence.
3. Distinguish candidate identity from confirmed property identity.
4. Never use address equality as proof of property identity.
5. Never present `neighborhood_market_data` opportunity scores as fully traced facts until provenance is repaired.
6. Never infer transaction prices while `market_transactions` is empty.
7. Never imply valuation performance/history while `valuation_cases` is empty.
8. Distinguish `verified/evaluable` management metrics from formally approved/published metrics.
9. Degrade confidence when data is stale, untraced or structurally incomplete.
10. Prefer `not evaluable` over filling gaps.

## P0 data work before further assistant expansion

1. Reconcile the 837 operational listings against source evidence and determine refresh strategy.
2. Resolve why `market_properties_canonical` remains empty and define the production canonicalization path.
3. Recover / ingest the registered 4,231 historical sales records into the governed transaction model, if the underlying source evidence is valid and available.
4. Reconcile the 12,847-row legacy Portal Inmobiliario source against the 837 currently operational listings; classify obsolete, duplicate, rejected and missing records.
5. Repair provenance for `market_data` and `neighborhood_market_data`, including methodology for opportunity score.
6. Build explicit quality flags for listing identity, freshness, source traceability and price/area outliers. Do not silently modify source values.
7. Only after items 1–6, enable deeper market reasoning in Pedro Pablo.

## Development freeze

Until the P0 data work is materially resolved:

- no new autonomous Pedro Pablo write types;
- no new AI-generated market scores;
- no speculative prediction layer;
- no embeddings/vector database unless a concrete retrieval requirement appears;
- no new dashboard metrics without canonical source and methodology;
- memory remains subordinate to canonical evidence.

Allowed work:

- data auditing;
- ingestion repair;
- canonicalization;
- provenance;
- quality controls;
- deterministic analysis;
- safe UI exposure of data quality and uncertainty;
- Pedro Pablo changes required to enforce these gates.

## North star

The system is successful when it can answer, for every important property or market conclusion:

1. What evidence do we have?
2. Where did it come from?
3. When was it observed?
4. Is the property identity confirmed or only a candidate?
5. Is the value an asking price, derived metric or real transaction?
6. How complete and reliable is the evidence?
7. What conclusion is justified by that evidence — and what is not?

Pedro Pablo is the interface to this intelligence. The data system is the intelligence.