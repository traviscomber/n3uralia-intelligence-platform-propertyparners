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
  visitas_count: number
  leads_count: number
  conversion_rate: number
  comision_total: number
  stock_count: number
  velocidad_venta: number
  monthly_target: number
  director_id: string | null
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
