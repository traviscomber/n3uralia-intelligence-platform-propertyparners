# N3uralia Intelligence Platform — Roadmap 2026

## ? Next Steps

1. **IMPLEMENTED IN MAIN:**
   - Weekly reports are now derived from live KPI snapshots and shown in `Reportes IA`
   - Market intelligence now exposes computed opportunity insights from `market_data`
   - Valorizador now accepts real properties from `properties` when available
   - Home dashboard now includes an AI-backed summary endpoint and live KPI comparison
   - The property scraper now aggregates Portal Inmobiliario, TOCTOC, icasas.cl, and Yapo listings and records source stats
   - Scraper executions are now persisted in `scrape_runs` and surfaced in `Fuentes de Datos`
   - Scraper health snapshots are now persisted with anomaly history and surfaced in `Fuentes de Datos`
   - Realtor International benchmark snapshots now feed `Market Intelligence` through a persisted external source
   - Valorizador now uses weighted real property comparables and external benchmark snapshots for its estimate range
   - Weekly director and summary reports are now persisted in `weekly_reports` and surfaced in `Reportes IA`
   - Automated nightly refresh route now updates scraper and benchmark data via Vercel cron
   - Scraper health now exposes anomaly detection for stale sources, repeated errors, and low-volume runs

2. **NEXT IMPLEMENTATION BLOCK:**
   - Add a scheduled job for automatic report generation and email delivery
   - Build historical neighborhood analytics with `neighborhood_market_data`
   - Add comparable property matching and scoring to the valorizador
   - Add a second stable public listing source beyond Yapo for coverage redundancy

3. **FOLLOW-UP ROADMAP:**
   - Add director/seller drill-down views and exportable report PDFs
   - Expand anomaly detection on KPIs and market changes using the persisted health history
   - Add automatic report delivery when the scheduled weekly generator is in place
   - Keep tightening accessibility, responsiveness, and loading states

---

## ?? Support & Questions

- **GitHub Issues:** https://github.com/traviscomber/n3uralia-intelligence-platform-propertyparners/issues
- **v0 Chat:** https://v0.dev/chat (for UI/code generation)
- **Vercel Support:** https://vercel.com/help
- **Supabase Docs:** https://supabase.com/docs

---

**Last Updated:** July 10, 2026  
**Maintained By:** v0 AI + Travis Comber  
**Version:** 0.6.3 (MVP + Real Data + AI Reports + Scraper Health + New Sources + Weekly Persistence)
