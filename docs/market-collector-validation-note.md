# Market collector validation

Production validation context for the Portal Inmobiliario collector.

- HTTP-only collection returned zero discovered listings for apartments, houses, and projects in Vitacura.
- The serverless Chromium branch restores browser-rendered discovery while preserving the v2 canonical ingestion boundary.
- No canonical data is manually modified by this change.
