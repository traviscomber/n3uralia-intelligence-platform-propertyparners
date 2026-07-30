import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getManagementEntities, type ManagementEntity } from '@/lib/presentations-2026'

const normalize = (value: string | null | undefined) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()

const metric = (
  code: string,
  label: string,
  unit: 'count' | 'uf' | 'percent' | 'days' | 'score',
  value: number | null,
  methodology: string,
  sourceName: string,
  sourceReference: string,
) => ({
  code,
  label,
  unit,
  methodology,
  value,
  target: null,
  compliance: null,
  mom: null,
  yoy: null,
  sourceName,
  periodStart: '2026-01-01',
  periodEnd: '2026-06-30',
  qualityStatus: value === null ? 'missing' : 'canonical_presentation',
  sourceReference,
})

function toPayloadEntity(entity: ManagementEntity, entityType: 'company' | 'branch' | 'partner') {
  const source = entity.salesSummary.source
  const sourceName = source.deck
  const sourceReference = `Lámina ${source.slide} · ${source.title}`

  return {
    id: `${entityType}:${normalize(entity.branch)}:${normalize(entity.name)}`,
    name: entity.name,
    entityType,
    parentId: entity.branch ? `branch:${normalize(entity.branch)}` : null,
    classification: entity.scores.classification,
    metrics: [
      metric('sales', 'Cierres del período', 'count', entity.salesSummary.currentSalesCount, 'Cantidad de cierres informados para junio de 2026 en la presentación canónica.', sourceName, sourceReference),
      metric('sales_uf', 'Venta del período', 'uf', entity.salesSummary.currentSalesUf, 'Valor UF de cierres informado para junio de 2026 en la presentación canónica.', sourceName, sourceReference),
      metric('cumulative_sales', 'Cierres acumulados', 'count', entity.salesSummary.cumulativeSalesCount, 'Cantidad acumulada de cierres informada entre enero y junio de 2026.', sourceName, sourceReference),
      metric('cumulative_sales_uf', 'Venta acumulada', 'uf', entity.salesSummary.cumulativeSalesUf, 'Valor UF acumulado informado entre enero y junio de 2026.', sourceName, sourceReference),
      metric('management_score', 'Calidad de gestión', 'score', entity.scores.management, 'Score de gestión reproducido desde la presentación fuente, sin reinterpretación.', sourceName, sourceReference),
      metric('portfolio_score', 'Calidad de cartera', 'score', entity.scores.portfolio, 'Componente de cartera reproducido desde la presentación fuente.', sourceName, sourceReference),
      metric('follow_up_score', 'Seguimiento', 'score', entity.scores.followUp, 'Componente de seguimiento reproducido desde la presentación fuente.', sourceName, sourceReference),
      metric('conversion', 'Conversión', 'score', entity.scores.conversion, 'Componente de conversión reproducido desde la presentación fuente.', sourceName, sourceReference),
      metric('stock', 'Stock', 'count', entity.indicators.stock, 'Stock informado en la presentación fuente.', sourceName, sourceReference),
      metric('requirements', 'Requerimientos', 'count', entity.indicators.requirements, 'Requerimientos informados en la presentación fuente.', sourceName, sourceReference),
      metric('active_leads', 'Leads activos', 'count', entity.indicators.activeLeads, 'Leads activos informados en la presentación fuente.', sourceName, sourceReference),
      metric('classified_leads', 'Leads clasificados', 'count', entity.indicators.classifiedLeads, 'Leads clasificados informados en la presentación fuente.', sourceName, sourceReference),
      metric('stale_90_leads', 'Leads +90 días', 'count', entity.indicators.stale90Leads, 'Leads con antigüedad superior a 90 días informados en la presentación fuente.', sourceName, sourceReference),
      metric('realized_visits', 'Visitas realizadas', 'count', entity.indicators.realizedVisits, 'Visitas realizadas informadas en la presentación fuente.', sourceName, sourceReference),
      metric('scheduled_visits', 'Visitas agendadas', 'count', entity.indicators.scheduledVisits, 'Visitas agendadas informadas en la presentación fuente.', sourceName, sourceReference),
    ].filter((item) => item.value !== null),
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
      const scores = [
        { code: 'management_score', label: 'gestión' },
        { code: 'portfolio_score', label: 'cartera' },
        { code: 'follow_up_score', label: 'seguimiento' },
        { code: 'conversion', label: 'conversión' },
      ]

      return scores.flatMap(({ code, label }) => {
        const value = getMetricValue(entity, code)
        if (value === null || value >= 70) return []
        const severity = value < 50 ? 'critical' as const : 'warning' as const
        return [{
          id: `${entity.id}:${code}`,
          severity,
          status: 'open',
          title: `${label.charAt(0).toUpperCase()}${label.slice(1)} requiere atención`,
          detail: `Score ${value.toLocaleString('es-CL', { maximumFractionDigits: 1 })}. Criterio canónico: rojo bajo 50, amarillo entre 50 y 70 y verde desde 70.`,
          entityName: entity.name,
          createdAt: '2026-06-30T23:59:59.000Z',
        }]
      })
    })
    .sort((a, b) => (a.severity === b.severity ? a.entityName.localeCompare(b.entityName) : a.severity === 'critical' ? -1 : 1))
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id,role,full_name,team')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError || !profile) {
    return NextResponse.json({ error: profileError?.message ?? 'Perfil no configurado.' }, { status: 403 })
  }

  const role = normalize(profile.role)
  const canonical = getManagementEntities()
  let entities: PayloadEntity[] = []
  let scopeLabel = 'Ámbito sin configurar'

  if (role === 'admin' || role === 'ceo') {
    entities = [
      toPayloadEntity(canonical.company, 'company'),
      ...canonical.branches.map((item) => toPayloadEntity(item, 'branch')),
      ...canonical.partners.map((item) => toPayloadEntity(item, 'partner')),
    ]
    scopeLabel = 'Compañía completa'
  } else if (role === 'director' || role === 'subdirector') {
    const team = normalize(profile.team)
    const branch = canonical.branches.find((item) => normalize(item.name) === team || normalize(item.branch) === team)
    const partners = canonical.partners.filter((item) => normalize(item.branch) === team || (branch && normalize(item.branch) === normalize(branch.name)))
    entities = [
      ...(branch ? [toPayloadEntity(branch, 'branch')] : []),
      ...partners.map((item) => toPayloadEntity(item, 'partner')),
    ]
    scopeLabel = branch?.name ?? profile.team ?? 'Sucursal asignada'
  } else if (role === 'seller') {
    const partner = canonical.partners.find((item) => normalize(item.name) === normalize(profile.full_name))
    if (partner) entities = [toPayloadEntity(partner, 'partner')]
    scopeLabel = partner ? `${partner.name} · ${partner.branch ?? profile.team ?? 'Sin sucursal'}` : `${profile.full_name ?? 'Partner'} · sin ficha canónica vinculada`
  } else {
    return NextResponse.json({ error: 'Rol no autorizado.' }, { status: 403 })
  }

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
    { label: 'Vista de dirección', href: '/dashboard/director', permission: 'read', detail: 'Resultados y equipo de la sucursal asignada.' },
    { label: 'Valorizaciones', href: '/dashboard/valuations', permission: 'manage', detail: 'Revisión y aprobación dentro de la sucursal.' },
    { label: 'Asignar propiedades', href: '/dashboard/properties/admin', permission: 'manage', detail: 'Asignaciones sólo a ejecutivas dentro del alcance autorizado.' },
    { label: 'Control de gestión', href: '/dashboard/control', permission: 'read', detail: 'Metas, métricas y alertas de la sucursal.' },
    { label: 'Metas y alertas', href: '/dashboard/control/admin', permission: 'manage', detail: 'Administración operativa dentro de la sucursal.' },
    { label: 'Inteligencia de mercado', href: '/dashboard/market', permission: 'read', detail: 'Información operativa y evidencia disponible.' },
    { label: 'Reportes', href: '/dashboard/reportes/autonomos', permission: 'read', detail: 'Reportes autorizados para dirección.' },
  ] : []

  return NextResponse.json({
    role,
    scopeLabel,
    entities,
    alerts: isDirector ? buildDirectorAlerts(entities) : [],
    operational,
    accesses,
    periodLabel: 'Enero–junio 2026 · cierre junio',
    dataProvenance: 'Presentaciones canónicas 2026 y registros operativos visibles mediante RLS.',
  }, { headers: { 'Cache-Control': 'no-store' } })
}
