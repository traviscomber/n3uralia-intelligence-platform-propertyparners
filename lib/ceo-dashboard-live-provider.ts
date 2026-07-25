import { buildCEODashboardData } from './ceo-dashboard-data-adapter'

export async function getCEODashboardLiveData() {
  // Future connection point for Supabase + N3uralia Intelligence Engine.
  // The dashboard consumes structured intelligence, not raw database data.
  return buildCEODashboardData({
    priorities: [],
    risks: [],
    opportunities: [],
    decisions: [],
    sources: [
      'CRM',
      'Metas 2026',
      'Mercado',
      'Valuación',
      'Documentos empresariales',
      'Memoria histórica',
    ],
  })
}
