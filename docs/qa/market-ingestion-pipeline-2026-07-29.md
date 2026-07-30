# Canonical market ingestion validation

Date: 2026-07-29

## Scope

Validated the aggregate market ingestion path from API input to canonical storage and dashboard status.

## Controls implemented

1. `market_ingestion_runs` execution record.
2. `market_raw_records` persistence for every received row.
3. Explicit accepted/rejected validation status and error codes.
4. Accepted aggregate rows materialized in `market_metric_snapshots`.
5. Execution closure with received, accepted and rejected counts.
6. Dashboard freshness, latest status and row-quality indicators.

## Production database validation

A transaction-scoped smoke test submitted two rows:

- one valid row;
- one invalid row with missing neighborhood, absorption above 1 and negative days on market.

Observed result:

- valid row: `accepted`;
- invalid row: `rejected`;
- validation errors: `missing_neighborhood`, `invalid_absorption_rate`, `invalid_days_on_market`;
- transaction rolled back, leaving no test data in production.

## Design constraint

The current market import template contains aggregate metrics by neighborhood. It does not contain property-level address, listing ID, price and coordinates. Therefore the canonical target is `market_metric_snapshots`; the pipeline does not fabricate properties or listings from aggregate rows.
