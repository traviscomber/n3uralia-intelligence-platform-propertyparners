# Market ingestion acceptance criteria

- Import creates a `market_ingestion_runs` record.
- Every received row is preserved in `market_raw_records`.
- Invalid rows are rejected with explicit validation errors.
- Accepted aggregate rows materialize in `market_metric_snapshots`.
- Execution closes with received, accepted and rejected counts.
- Dashboard exposes latest execution status and freshness.
- Aggregate imports do not fabricate property-level records.
