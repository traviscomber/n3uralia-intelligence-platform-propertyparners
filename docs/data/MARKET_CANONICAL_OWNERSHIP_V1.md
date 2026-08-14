# Market Canonical Ownership V1

Status: ACTIVE ARCHITECTURE DECISION
Date: 2026-08-08

## Decision

The production system currently contains two parallel property models. They must not be treated as two canonical sources.

### Canonical property identity

`public.market_properties` is the current operational owner of property identity.

Evidence:

- `market_listings.property_id -> market_properties.id`
- `market_transactions.property_id -> market_properties.id`
- `property_assignments.property_id -> market_properties.id`
- `valuation_cases.subject_property_id -> market_properties.id`
- market identity decisions, lifecycle and match candidates also reference `market_properties`.

Identity remains explicitly provisional while `identity_status = candidate`.

### Listing / offer evidence

`public.market_listings` and `public.market_current_listings` own listing/offer state. Asking price, status, URL and observation dates are listing evidence and must not be promoted to transaction truth.

`public.market_raw_records` owns immutable ingestion evidence and provenance. It is not canonical property identity.

### Parallel empty model

`public.market_properties_canonical` is not an active second canonical authority.

Current production evidence on 2026-08-08:

- `market_properties_canonical`: 0 rows
- `market_property_observations`: 0 rows
- `valuation_comparables`: 0 rows
- no database views depend on `market_properties_canonical`
- no database functions depend on `market_properties_canonical`

Its two known downstream relationships are:

- `market_property_observations.property_id -> market_properties_canonical.id`
- `valuation_comparables.comparable_property_id -> market_properties_canonical.id`

This is a structural split, not evidence of a second populated canonical corpus.

## Required rule

Do not backfill `market_properties_canonical` by copying `market_properties` blindly.

The two tables have different semantics: `market_properties` represents stable property identity, while `market_properties_canonical` also contains listing-like fields such as operation, price, listing status, source record and publication lifecycle.

Before any FK migration or retirement, the observation/comparable workflow must be aligned explicitly to the intended business entity:

- physical property identity -> `market_properties`
- listing/offer observation -> `market_listings` / raw evidence
- transaction evidence -> `market_transactions`
- valuation comparable -> property identity plus explicit source listing or transaction reference

`valuation_comparables` already contains `source_listing_id` and `source_transaction_id`, so source evidence must remain explicit rather than embedded into a second property identity table.

## Current quality gate

`private.market_data_quality_v1` is the server-only readiness gate.

It is not exposed to `anon` or `authenticated` and does not mutate canonical data.

Current result at implementation:

- `market_decision_status = blocked_identity_unconfirmed`
- `market_freshness_ok = false`
- `identity_confirmation_available = false`
- `transaction_evidence_available = false`
- `neighborhood_provenance_ok = false`
- `management_published_available = false`

The gate measures each failure independently so intelligence consumers can degrade confidence by dimension.

## Next data work

1. Reconstruct deterministic lineage from each accepted `market_raw_records` row to listing and property identity.
2. Classify records that cannot be linked deterministically; do not use address-only matching as proof.
3. Identify or recover the underlying source for the registered 4,231 historical sales rows and ingest only validated evidence into `market_transactions`.
4. Reconcile the registered 12,847-row Portal Inmobiliario legacy source with current listing evidence.
5. Repair source provenance for neighborhood aggregates.
6. Decide, only after lineage is proven, whether the empty parallel model is retired, converted into a projection, or replaced by explicit observation relationships.

## Invariant

One business fact has one canonical owner. Derived projections may exist, but they must declare their canonical source, freshness, rebuild path and failure behavior.
