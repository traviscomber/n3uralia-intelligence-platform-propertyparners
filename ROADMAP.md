# N3uralia Intelligence Platform - Roadmap 2026

## Current Status

- Latest production branch: `main`
- Current deployed stack: Next.js 16, Supabase, Vercel cron
- Manual report generation works and weekly reports are persisted in `weekly_reports`
- Scraper pipeline tracks Portal Inmobiliario, TOCTOC, icasas.cl, and Yapo
- Scrape health snapshots are persisted and surfaced in `Fuentes de Datos`
- Weekly delivery now supports email and WhatsApp Web links
- Weekly delivery now retries primary email and escalates to backup recipients when needed

## Project Links

| Platform | Link |
|----------|------|
| GitHub Repository | https://github.com/traviscomber/n3uralia-intelligence-platform-propertyparners |
| Main Branch | https://github.com/traviscomber/n3uralia-intelligence-platform-propertyparners/tree/main |
| Production Deployment | https://n3uralia-intelligence-platform.vercel.app |
| Vercel Project | https://vercel.com/travis-projects-c14a785a/n3uralia-intelligence-platform |
| Supabase Project | orfncinmhymhhoxbxgjb |

## Implemented

1. Weekly reports are derived from live KPI snapshots and shown in `Reportes IA`.
2. Market intelligence exposes computed opportunity insights from `market_data`.
3. Valorizador accepts real properties from `properties` when available.
4. Home dashboard includes an AI-backed summary endpoint and live KPI comparison.
5. Property scraper aggregates Portal Inmobiliario, TOCTOC, icasas.cl, and Yapo listings and records source stats.
6. Scraper executions are persisted in `scrape_runs` and surfaced in `Fuentes de Datos`.
7. Scrape health snapshots are persisted with anomaly history and surfaced in `Fuentes de Datos`.
8. Realtor International benchmark snapshots feed `Market Intelligence` through a persisted external source.
9. Valorizador uses weighted real property comparables and external benchmark snapshots for its estimate range.
10. Weekly director and summary reports are persisted in `weekly_reports` and surfaced in `Reportes IA`.
11. Automated nightly refresh route updates scraper and benchmark data via Vercel cron.
12. Scrape health detects stale sources, repeated errors, and low-volume runs.
13. Weekly report distribution supports email delivery and WhatsApp Web links for manual sending.
14. Automatic weekly delivery targets can now be managed from Settings for email and WhatsApp Web.
15. Market intelligence persists historical neighborhood snapshots in `neighborhood_market_data`.
16. Valorizador scoring now weights comparable properties with market alignment and recency signals.
17. Scraper redundancy now includes Chilepropiedades as an additional public listing source.
18. Director drill-down views and PDF exports are available from `Reportes IA`.

## Next Implementation Block

1. Expand anomaly detection on KPIs and market changes using the persisted health history.
2. Keep tightening accessibility, responsiveness, and loading states.

## Follow-Up Roadmap

1. Add director/seller export variants with week selection and filters.
2. Add more delivery channels and richer delivery telemetry.

## Notes

- `OPENAI_API_KEY` is used directly for report generation.
- WhatsApp delivery currently opens `web.whatsapp.com` with a prefilled message.
- The weekly delivery cron is scheduled for Monday at 06:00 in Vercel.
