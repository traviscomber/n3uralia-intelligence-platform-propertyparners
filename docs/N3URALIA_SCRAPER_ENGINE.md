# N3uralia Scraper Engine

## Goal

Operate the Property Partners Portal Inmobiliario collector without a per-page paid dependency.

Firecrawl remains an emergency fallback, not the canonical acquisition runtime.

## Runtime

Primary worker:

- GitHub Actions self-hosted runner.
- Labels: `self-hosted, n3uralia, portal, chile`.
- Runs on an always-on N3uralia machine using a normal Chilean office/residential network.
- System Google Chrome/Chromium + Puppeteer.
- GitHub OIDC authenticates the worker to `/api/internal/portal-github-ingest`.
- No Supabase service-role key is stored on the worker.
- Scheduled at 07:30 Chile.

## Pipeline

```
Portal Inmobiliario
  -> Chrome browser worker
  -> discovery pages
  -> canonical listing IDs
  -> quality gates
  -> detail enrichment
  -> GitHub OIDC
  -> Property Partners ingest endpoint
  -> Supabase raw evidence
  -> canonical market listings
  -> identity matching
  -> prospect intelligence
```

## Acquisition rules

1. Use a persistent Chrome profile/session when practical.
2. Pace navigation like a normal browser.
3. Reuse one browser/session for the full run.
4. Inventory discovery is authoritative for presence only after all quality gates pass.
5. Detail extraction is incremental where possible.
6. Never convert a partial snapshot into removals.
7. Keep raw URL/source evidence and observed timestamps.
8. Treat blocks, account-verification pages, empty pages and repeated pages as failed acquisition evidence, not valid negatives.

## Quality gates

A new full snapshot must satisfy all of:

- discovery exhausted naturally;
- no internal page gaps;
- not capped by configured max pages;
- inventory count within the verified baseline tolerance;
- valid canonical IDs and URLs;
- no suspicious-traffic/account-verification response;
- ingestion endpoint policy acceptance.

Any failure preserves the last verified snapshot.

## Cost strategy

Normal operation uses only N3uralia infrastructure and GitHub Actions control-plane traffic.

Firecrawl is reserved for:

- manual emergency recovery;
- validation against the in-house engine;
- temporary fallback when the self-hosted worker misses its freshness SLA.

The production cron must check for a fresh self-hosted snapshot before spending Firecrawl credits.

## Operations

Recommended hardware:

- any always-on Mac mini, Windows PC, Linux mini PC or NUC;
- stable Chilean office/home connection;
- Chrome installed;
- GitHub self-hosted runner service configured to auto-start.

The machine does not need inbound public ports.

## Observability

Record for every run:

- runtime;
- pages visited;
- unique listings;
- duplicate candidates;
- detail successes/failures;
- block/verification detection;
- new/updated/removed counts;
- source runtime (`self_hosted_chrome`, `firecrawl_fallback`);
- GitHub run ID/SHA;
- canonical ingest run ID.

## Release sequence

1. Register one self-hosted runner.
2. Run the workflow manually.
3. Require a full snapshot comparable to the last verified baseline.
4. Verify Supabase canonical counts and downstream intelligence.
5. Only then make Firecrawl fallback-only.
6. Keep rollback by restoring the current Firecrawl production path.
