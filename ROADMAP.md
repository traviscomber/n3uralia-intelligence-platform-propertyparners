# N3uralia Intelligence Platform — Roadmap 2026

## ? Next Steps

1. **IMPLEMENTED IN MAIN:**
   - Weekly reports are now derived from live KPI snapshots and shown in `Reportes IA`
   - Market intelligence now exposes computed opportunity insights from `market_data`
   - Valorizador now accepts real properties from `properties` when available
   - Home dashboard now includes an AI-backed summary endpoint and live KPI comparison
   - The property scraper now aggregates Portal Inmobiliario and TOCTOC listings and records source stats
   - Scraper executions are now persisted in `scrape_runs` and surfaced in `Fuentes de Datos`
   - Realtor International benchmark snapshots now feed `Market Intelligence` through a persisted external source
   - Valorizador now uses real property comparables and external benchmark snapshots for its estimate range

2. **NEXT IMPLEMENTATION BLOCK:**
   - Persist weekly director reports into a dedicated `weekly_reports` table
   - Add a scheduled job for automatic report generation and email delivery
   - Build historical neighborhood analytics with `neighborhood_market_data`
   - Add comparable property matching and scoring to the valorizador

3. **FOLLOW-UP ROADMAP:**
   - Add director/seller drill-down views and exportable report PDFs
   - Add anomaly detection on KPIs and market changes
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
**Version:** 0.6.0 (MVP + Real Data + AI Reports)
