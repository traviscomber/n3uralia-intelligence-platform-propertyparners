export type UserRole = 'ceo' | 'director' | 'seller' | 'admin'

export interface Profile {
  id: string
  full_name: string | null
  role: UserRole
  team: string | null
  avatar_url: string | null
  created_at: string
}

export interface KpiSnapshot {
  id: string
  period_date: string
  period_type: 'daily' | 'weekly' | 'monthly' | 'quarterly'
  ventas_count: number
  ventas_uf: number
  captaciones_count: number
  visitas_count: number | null
  leads_count: number
  conversion_rate: number
  comision_total: number
  stock_count: number
  velocidad_venta: number
  monthly_target: number
  director_id: string | null
  agent_id: string | null
  created_at: string
}

export interface AiReport {
  id: string
  report_type: string
  title: string
  summary: string | null
  content: Record<string, unknown> | null
  period_date: string | null
  generated_by: string | null
  created_at: string
}

export interface KnowledgeDocument {
  id: string
  title: string
  content: string | null
  doc_type: string | null
  neighborhood: string | null
  tags: string[] | null
  created_at: string
}

export interface WeeklyReport {
  id: number
  report_key: string
  report_scope: 'weekly_directors' | 'weekly_summary' | 'director'
  week_start: string
  week_end: string
  director_id: string | null
  sales_count: number
  commission_total: number
  conversion_rate: number
  target_progress: number
  velocity_change: number
  status: 'on_track' | 'warning' | 'behind'
  content: Record<string, unknown>
  generated_at: string
  created_at: string
}

export interface ReportDelivery {
  id: number
  report_type: string
  report_id: number | null
  channel: 'email' | 'whatsapp_web' | 'webhook'
  recipient: string | null
  delivery_url: string | null
  status: 'queued' | 'sent' | 'failed' | 'escalated'
  subject: string | null
  message: string | null
  provider_response: Record<string, unknown> | null
  sent_at: string | null
  created_at: string
}

export interface MarketData {
  neighborhood: string
  avg_price_uf: number | null
  avg_price_m2_uf: number | null
  absorption_rate: number | null
  inventory_count: number
  avg_days_on_market?: number | null
}

export interface DataSource {
  id: string
  name: string
  source_type: string
  status: 'active' | 'error' | 'syncing' | 'inactive'
  records_count: number
  last_sync: string | null
  error_message: string | null
  pipeline_order: number
  created_at: string
}

export interface Recommendation {
  id: string
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string | null
  expected_impact: string | null
  responsible: string | null
  status: 'pending' | 'in_progress' | 'done' | 'dismissed'
  created_at: string
}

export interface ScrapeRun {
  id: string
  source: string
  status: 'success' | 'partial' | 'error'
  scraped_count: number
  inserted_count: number
  skipped_count: number
  error_count: number
  source_breakdown: Record<string, unknown> | null
  started_at: string
  finished_at: string
  created_at: string
}

export interface ExternalMarketBenchmark {
  id: string
  source: string
  source_url: string
  neighborhood: string
  listing_title: string | null
  offer_count: number
  low_price_clp: number | null
  high_price_clp: number | null
  price_currency: string | null
  recorded_at: string
  created_at: string
}

export interface ScrapeHealthIssue {
  severity: 'info' | 'warning' | 'critical'
  title: string
  detail: string
}

export interface AgentActivity {
  id: string
  agent_id: string
  activity_type: 'llamada' | 'visita' | 'oferta' | 'cierre'
  property_id: string | null
  description: string | null
  value_uf: number | null
  status: 'pending' | 'done' | 'lost'
  scheduled_at: string | null
  completed_at: string | null
  created_at: string
}

export interface ScrapeHealthSnapshot {
  id: number
  status: 'healthy' | 'warning' | 'critical' | 'unknown'
  summary: {
    recentRuns: number
    averageScraped: number
    averageInserted: number
    activeSources: number
    criticalCount: number
    warningCount: number
    successRate: number
    staleSourceCount: number
  }
  latestRun: ScrapeRun | null
  sources: DataSource[]
  benchmark: ExternalMarketBenchmark | null
  issues: ScrapeHealthIssue[]
  runsWindow: ScrapeRun[]
  generatedAt: string
  created_at?: string
}

export interface NeighborhoodMarketSnapshot {
  id: number
  snapshot_date: string
  neighborhood: string
  avg_price_uf: number | null
  avg_price_m2_uf: number | null
  absorption_rate: number | null
  inventory_count: number
  avg_days_on_market: number | null
  data_points: number
  source: string
  source_url: string | null
  recorded_at: string
  created_at: string
}

export interface ReportDeliveryTarget {
  id: number
  label: string
  channel: 'email' | 'whatsapp_web' | 'webhook'
  recipient: string
  active: boolean
  notify_weekly: boolean
  notes: string | null
  created_at: string
  updated_at: string
}
