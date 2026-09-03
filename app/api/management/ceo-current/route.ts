import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  buildCeoCurrentOperationalSnapshot,
  type CeoOperationalGoalRow,
  type CeoOperationalMetricRow,
} from '@/lib/management-ceo-current'

const normalize = (value: string | null | undefined) => String(value ?? '').trim().toLowerCase()

const METRIC_CODES = [
  'sales',
  'sales_uf',
  'management_credited_sales',
  'requirements',
  'leads',
  'active_leads_snapshot',
  'stale_90_leads',
  'scheduled_visits',
  'realized_visits',
  'listings',
  'stock',
  'suspended_listings',
  'canonical_follow_up_score',
]

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id,role')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError || !profile) return NextResponse.json({ error: 'Perfil no configurado' }, { status: 403 })
  if (!['ceo', 'admin'].includes(normalize(profile.role))) return NextResponse.json({ error: 'Rol no autorizado' }, { status: 403 })

  const { data: company, error: companyError } = await supabase
    .from('management_entities')
    .select('id,name,entity_type')
    .eq('entity_type', 'company')
    .eq('name', 'Property Partners Vitacura')
    .eq('active', true)
    .maybeSingle()

  if (companyError || !company) {
    return NextResponse.json({ error: 'No fue posible resolver la entidad corporativa.' }, { status: 503 })
  }

  const [metricsResult, goalsResult] = await Promise.all([
    supabase
      .from('management_metric_values')
      .select('metric_code,period_start,period_end,value,source_name,source_reference,source_cutoff_at,quality_status,evaluation_status,updated_at')
      .eq('entity_id', company.id)
      .in('metric_code', METRIC_CODES)
      .eq('quality_status', 'verified')
      .eq('evaluation_status', 'evaluable')
      .not('value', 'is', null)
      .order('period_end', { ascending: true })
      .order('updated_at', { ascending: true }),
    supabase
      .from('management_goals')
      .select('metric_code,period_start,period_end,target_value,status,approved_at,source_name')
      .eq('entity_id', company.id)
      .eq('metric_code', 'sales')
      .order('period_end', { ascending: true })
      .order('approved_at', { ascending: true }),
  ])

  if (metricsResult.error || goalsResult.error) {
    return NextResponse.json({ error: 'No fue posible consultar el período operativo verificado.' }, { status: 503 })
  }

  const snapshot = buildCeoCurrentOperationalSnapshot({
    metrics: (metricsResult.data ?? []) as CeoOperationalMetricRow[],
    goals: (goalsResult.data ?? []) as CeoOperationalGoalRow[],
  })

  if (!snapshot) {
    return NextResponse.json({
      snapshot: null,
      status: 'unavailable',
      message: 'No existe un período con ventas verificadas y evaluables.',
      generatedAt: new Date().toISOString(),
    }, { headers: { 'Cache-Control': 'no-store' } })
  }

  return NextResponse.json({
    snapshot,
    status: snapshot.status,
    generatedAt: new Date().toISOString(),
    note: 'Vista operativa verificada. No sustituye un cierre mensual emitido ni publica métricas no aprobadas.',
  }, { headers: { 'Cache-Control': 'no-store' } })
}
