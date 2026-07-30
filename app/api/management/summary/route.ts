import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getManagementEntities, type ManagementEntity } from '@/lib/presentations-2026'

const normalize = (value: string | null | undefined) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()

type ExtendedManagementEntity = ManagementEntity & {
  salesSummary: ManagementEntity['salesSummary'] & {
    currentTargetSalesCount?: number | null
    currentTargetSalesUf?: number | null
    cumulativeTargetSalesCount?: number | null
    cumulativeTargetSalesUf?: number | null
  }
  sales?: {
    salesCount?: Record<string, number | null>
    salesUf?: Record<string, number | null>
    targetSalesCount?: Record<string, number | null>
    targetSalesUf?: Record<string, number | null>
    cumulativeSalesCount?: Record<string, number | null>
    cumulativeSalesUf?: Record<string, number | null>
    cumulativeTargetSalesCount?: Record<string, number | null>
    cumulativeTargetSalesUf?: Record<string, number | null>
  }
  indicators: ManagementEntity['indicators'] & {
    stockTarget?: number | null
    requirementsReference?: number | null
  }
}

const percent = (value: number | null, target: number | null) =>
  value !== null && target !== null && target !== 0 ? (value / target) * 100 : null

const change = (current: number | null, previous: number | null) =>
  current !== null && previous !== null && previous !== 0 ? ((current - previous) / previous) * 100 : null

const metric = (
  code: string,
  label: string,
  unit: 'count' | 'uf' | 'percent' | 'days' | 'score',
  value: number | null,
  methodology: string,
  sourceName: string,
  sourceReference: string,
  options?: { target?: number | null; mom?: number | null; yoy?: number | null },
) => ({
  code,
  label,
  unit,
  methodology,
  value,
  target: options?.target ?? null,
  compliance: percent(value, options?.target ?? null),
  mom: options?.mom ?? null,
  yoy: options?.yoy ?? null,
  sourceName,
  periodStart: '2026-01-01',
  periodEnd: '2026-06-30',
  qualityStatus: value === null ? 'missing' : 'canonical_presentation',
  sourceReference,
})

function toPayloadEntity(rawEntity: ManagementEntity, entityType: 'company' | 'branch' | 'partner') {
  const entity = rawEntity as ExtendedManagementEntity
  const source = entity.salesSummary.source
  const sourceName = source.deck
  const sourceReference = `Lámina ${source.slide} · ${source.title}`
  const maySales = entity.sales?.salesCount?.['2026-05'] ?? null
  const maySalesUf = entity.sales?.salesUf?.['2026-05'] ?? null

  return {
    id: `${entityType}:${normalize(entity.branch)}:${normalize(entity.name)}`,
    name: entity.name,
    entityType,
    parentId: entity.branch ? `branch:${normalize(entity.branch)}` : null,
    classification: entity.scores.classification,
    metrics: [
      metric('sales', 'Cierres junio', 'count', entity.salesSummary.currentSalesCount, 'Cantidad de cierres informados para junio de 2026.', sourceName, sourceReference, { target: entity.salesSummary.currentTargetSalesCount ?? null, mom: change(entity.salesSummary.currentSalesCount, maySales) }),
      metric('sales_uf', 'Venta junio', 'uf', entity.salesSummary.currentSalesUf, 'Valor UF de cierres informado para junio de 2026.', sourceName, sourceReference, { target: entity.salesSummary.currentTargetSalesUf ?? null, mom: change(entity.salesSummary.currentSalesUf, maySalesUf) }),
      metric('cumulative_sales', 'Cierres acumulados', 'count', entity.salesSummary.cumulativeSalesCount, 'Cierres acumulados entre enero y junio de 2026.', sourceName, sourceReference, { target: entity.salesSummary.cumulativeTargetSalesCount ?? null }),
      metric('cumulative_sales_uf', 'Venta acumulada', 'uf', entity.salesSummary.cumulativeSalesUf, 'UF acumuladas entre enero y junio de 2026.', sourceName, sourceReference, { target: entity.salesSummary.cumulativeTargetSalesUf ?? null }),
      metric('management_score', 'Calidad de gestión', 'score', entity.scores.management, 'Score reproducido desde la presentación canónica.', sourceName, sourceReference, { target: 70 }),
      metric('portfolio_score', 'Calidad de cartera', 'score', entity.scores.portfolio, 'Componente de cartera reproducido desde la presentación canónica.', sourceName, sourceReference, { target: 70 }),
      metric('follow_up_score', 'Seguimiento', 'score', entity.scores.followUp, 'Componente de seguimiento reproducido desde la presentación canónica.', sourceName, sourceReference, { target: 70 }),
      metric('conversion', 'Conversión', 'score', entity.scores.conversion, 'Componente de conversión reproducido desde la presentación canónica.', sourceName, sourceReference, { target: 70 }),
      metric('stock', 'Stock', 'count', entity.indicators.stock, 'Stock informado en la presentación canónica.', sourceName, sourceReference, { target: entity.indicators.stockTarget ?? null }),
      metric('requirements', 'Requerimientos', 'count', entity.indicators.requirements, 'Requerimientos informados en la presentación canónica.', sourceName, sourceReference, { target: entity.indicators.requirementsReference ?? null }),
      metric('active_leads', 'Leads activos', 'count', entity.indicators.activeLeads, 'Leads activos informados en la presentación canónica.', sourceName, sourceReference),
      metric('classified_leads', 'Leads clasificados', 'count', entity.indicators.classifiedLeads, 'Leads clasificados informados en la presentación canónica.', sourceName, sourceReference),
      metric('stale_90_leads', 'Leads +90 días', 'count', entity.indicators.stale90Leads, 'Leads con antigüedad superior a 90 días.', sourceName, sourceReference),
      metric('realized_visits', 'Visitas realizadas', 'count', entity.indicators.realizedVisits, 'Visitas realizadas informadas en la presentación canónica.', sourceName, sourceReference),
      metric('scheduled_visits', 'Visitas agendadas', 'count', entity.indicators.scheduledVisits, 'Visitas agendadas informadas en la presentación canónica.', sourceName, sourceReference),
    ].filter((item) => item.value !== null),
    evolution: Object.keys(entity.sales?.salesCount ?? {}).sort().map((period) => ({
      period,
      sales: entity.sales?.salesCount?.[period] ?? null,
      salesTarget: entity.sales?.targetSalesCount?.[period] ?? null,
      salesUf: entity.sales?.salesUf?.[period] ?? null,
      salesUfTarget: entity.sales?.targetSalesUf?.[period] ?? null,
      cumulativeSales: entity.sales?.cumulativeSalesCount?.[period] ?? null,
      cumulativeSalesTarget: entity.sales?.cumulativeTargetSalesCount?.[period] ?? null,
    })),
  }
}

type PayloadEntity = ReturnType<typeof toPayloadEntity>

function getMetricValue(entity: PayloadEntity, code: string) {
  return entity.metrics.find((item) => item.code === code)?.value ?? null
}

function buildDirectorAlerts(entities: PayloadEntity[]) {
  return entities
    .filter((entity) => entity.entityType === 'partner')
    .flatMap((entity) => {
      const scoreAlerts = [
        { code: 'management_score', label: 'Gestión' },
        { code: 'portfolio_score', label: 'Cartera' },
        { code: 'follow_up_score', label: 'Seguimiento' },
        { code: 'conversion', label: 'Conversión' },
      ].flatMap(({ code, label }) => {
        const value = getMetricValue(entity, code)
        if (value === null || value >= 70) return []
        return [{
          id: `${entity.id}:${code}`,
          severity: value < 50 ? 'critical' as const : 'warning' as const,
          status: 'open',
          title: `${label} bajo umbral`,
          detail: `Score ${value.toLocaleString('es-CL', { maximumFractionDigits: 1 })}. Objetivo operativo: 70 puntos. Brecha: ${(70 - value).toFixed(1)} puntos.`,
          entityName: entity.name,
          createdAt: '2026-06-30T23:59:59.000Z',
        }]
      })

      const sales = entity.metrics.find((item) => item.code === 'sales')
      const stock = entity.metrics.find((item) => item.code === 'stock')
      const commercialAlerts = []
      if (sales?.compliance !== null && sales.compliance < 90) {
        commercialAlerts.push({
          id: `${entity.id}:sales-goal`, severity: sales.compliance < 60 ? 'critical' as const : 'warning' as const, status: 'open',
          title: 'Meta de cierres en riesgo', detail: `Cumplimiento junio: ${sales.compliance.toFixed(1)}%. Meta: ${sales.target?.toLocaleString('es-CL') ?? 'n/d'} cierres.`, entityName: entity.name, createdAt: '2026-06-30T23:59:59.000Z',
        })
      }
      if (stock?.compliance !== null && stock.compliance < 90) {
        commercialAlerts.push({
          id: `${entity.id}:stock-goal`, severity: stock.compliance < 60 ? 'critical' as const : 'warning' as const, status: 'open',
          title: 'Cartera bajo meta', detail: `Stock actual: ${stock.value?.toLocaleString('es-CL') ?? 'n/d'} de ${stock.target?.toLocaleString('es-CL') ?? 'n/d'}. Cumplimiento: ${stock.compliance.toFixed(1)}%.`, entityName: entity.name, createdAt: '2026-06-30T23:59:59.000Z',
        })
      }
      return [...scoreAlerts, ...commercialAlerts]
    })
    .sort((a, b) => (a.severity === b.severity ? a.entityName.localeCompare(b.entityName) : a.severity === 'critical' ? -1 : 1))
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile, error: profileError } = await supabase.from('profiles').select('id,role,full_name,team').eq('id', user.id).maybeSingle()
  if (profileError || !profile) return NextResponse.json({ error: profileError?.message ?? 'Perfil no configurado.' }, { status: 403 })

  const role = normalize(profile.role)
  const canonical = getManagementEntities()
  let entities: PayloadEntity[] = []
  let scopeLabel = 'Ámbito sin configurar'

  if (role === 'admin' || role === 'ceo') {
    entities = [toPayloadEntity(canonical.company, 'company'), ...canonical.branches.map((item) => toPayloadEntity(item, 'branch')), ...canonical.partners.map((item) => toPayloadEntity(item, 'partner'))]
    scopeLabel = 'Compañía completa'
  } else if (role === 'director' || role === 'subdirector') {
    const team = normalize(profile.team)
    const branch = canonical.branches.find((item) => normalize(item.name) === team || normalize(item.branch) === team)
    const partners = canonical.partners.filter((item) => normalize(item.branch) === team || (branch && normalize(item.branch) === normalize(branch.name)))
    entities = [...(branch ? [toPayloadEntity(branch, 'branch')] : []), ...partners.map((item) => toPayloadEntity(item, 'partner'))]
    scopeLabel = branch?.name ?? profile.team ?? 'Sucursal asignada'
  } else if (role === 'seller') {
    const partner = canonical.partners.find((item) => normalize(item.name) === normalize(profile.full_name))
    if (partner) entities = [toPayloadEntity(partner, 'partner')]
    scopeLabel = partner ? `${partner.name} · ${partner.branch ?? profile.team ?? 'Sin sucursal'}` : `${profile.full_name ?? 'Partner'} · sin ficha canónica vinculada`
  } else return NextResponse.json({ error: 'Rol no autorizado.' }, { status: 403 })

  const isDirector = role === 'director' || role === 'subdirector'
  let operational = null
  if (isDirector) {
    const [valuationResult, assignmentResult] = await Promise.all([
      supabase.from('valuation_cases').select('id,status'),
      supabase.from('property_assignments').select('id,status,assigned_to'),
    ])
    const valuationRows = valuationResult.data ?? []
    const assignmentRows = assignmentResult.data ?? []
    const countStatus = (rows: Array<{ status: string | null }>, status: string) => rows.filter((row) => row.status === status).length
    operational = {
      valuationCases: valuationRows.length,
      valuationDrafts: countStatus(valuationRows, 'draft'),
      valuationInReview: countStatus(valuationRows, 'review'),
      valuationApproved: countStatus(valuationRows, 'approved') + countStatus(valuationRows, 'issued'),
      propertyAssignments: assignmentRows.length,
      activePropertyAssignments: countStatus(assignmentRows, 'active'),
      pausedPropertyAssignments: countStatus(assignmentRows, 'paused'),
      teamMembers: entities.filter((entity) => entity.entityType === 'partner').length,
      errors: [valuationResult.error?.message, assignmentResult.error?.message].filter(Boolean),
    }
  }

  const accesses = isDirector ? [
    { label: 'Valorizaciones', href: '/dashboard/valuations', permission: 'manage', detail: 'Revisar y aprobar casos dentro de la sucursal.' },
    { label: 'Asignar propiedades', href: '/dashboard/properties/admin', permission: 'manage', detail: 'Asignar cartera a ejecutivas bajo alcance.' },
    { label: 'Control de gestión', href: '/dashboard/control', permission: 'read', detail: 'Consultar metas, métricas y alertas de la oficina.' },
    { label: 'Metas y alertas', href: '/dashboard/control/admin', permission: 'manage', detail: 'Administrar seguimiento operativo de la sucursal.' },
    { label: 'Inteligencia de mercado', href: '/dashboard/market', permission: 'read', detail: 'Consultar evidencia de mercado disponible.' },
    { label: 'Reportes', href: '/dashboard/reportes/autonomos', permission: 'read', detail: 'Consultar reportes autorizados para dirección.' },
  ] : []

  return NextResponse.json({
    role,
    scopeLabel,
    entities,
    alerts: isDirector ? buildDirectorAlerts(entities) : [],
    operational,
    accesses,
    periodLabel: 'Enero–junio 2026 · cierre junio',
    generatedAt: new Date().toISOString(),
    dataProvenance: 'Presentaciones canónicas 2026 y registros operativos visibles mediante RLS.',
  }, { headers: { 'Cache-Control': 'no-store' } })
}
