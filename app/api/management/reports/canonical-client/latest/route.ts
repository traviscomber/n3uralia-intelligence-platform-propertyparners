import { NextResponse } from 'next/server'
import { requireRoleAccess } from '@/lib/api-access'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  generateCanonicalClientReport,
  type CanonicalClientReportInput,
  type CanonicalContractItem,
  type CanonicalEvidence,
  type CanonicalPortalFeature,
} from '@/lib/n3uralia-canonical-client-report'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const REPORTIN_VERSION = '1.0'

type MetricRow = {
  id: string
  entity_id: string
  metric_code: string
  period_start: string
  period_end: string
  value: number | string | null
  source_name: string
  source_reference: string | null
  source_cutoff_at: string | null
  quality_status: string
  evaluation_status: string
  formula_version: number
  updated_at: string
}

type EntityRow = { id: string; entity_type: string; name: string }
type DefinitionRow = { code: string; label: string; unit: string }
type CapabilityRow = {
  capability_key: string
  domain: string
  title: string
  description: string
  contract_required: boolean
  implementation_status: string
  updated_at: string
}
type GoalRow = { id: string; status: string; target_value: number | string | null }
type ExistingDocument = { id: string; title: string; created_at: string; tags: string[] | null }

function reportStatus(status: string): CanonicalPortalFeature['status'] {
  if (status === 'implemented' || status === 'validated') return 'complete'
  if (status === 'planned') return 'pending_n3uralia'
  return 'partial'
}

function isoDate(value: string | null | undefined, fallback: string) {
  if (!value) return fallback
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? fallback : parsed.toISOString().slice(0, 10)
}

function formatMetricValue(value: number | string | null, unit: string) {
  if (value === null) return 'N/D'
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return String(value)
  const formatted = numeric.toLocaleString('es-CL', { maximumFractionDigits: 2 })
  return unit === 'uf' ? `${formatted} UF` : formatted
}

async function buildLatestCanonicalInput(): Promise<CanonicalClientReportInput> {
  const supabase = createAdminClient()
  const { data: latestPeriod, error: latestError } = await supabase
    .from('management_metric_values')
    .select('period_start,period_end')
    .order('period_end', { ascending: false })
    .limit(1)
    .single()

  if (latestError || !latestPeriod) throw new Error('CANONICAL_PERIOD_UNAVAILABLE')

  const periodStart = String(latestPeriod.period_start)
  const periodEnd = String(latestPeriod.period_end)
  const [metricsResult, entitiesResult, definitionsResult, capabilitiesResult, goalsResult] = await Promise.all([
    supabase
      .from('management_metric_values')
      .select('id,entity_id,metric_code,period_start,period_end,value,source_name,source_reference,source_cutoff_at,quality_status,evaluation_status,formula_version,updated_at')
      .eq('period_start', periodStart)
      .eq('period_end', periodEnd)
      .order('updated_at', { ascending: false }),
    supabase.from('management_entities').select('id,entity_type,name').eq('active', true),
    supabase.from('management_metric_definitions').select('code,label,unit').eq('active', true),
    supabase
      .from('platform_capabilities')
      .select('capability_key,domain,title,description,contract_required,implementation_status,updated_at')
      .order('domain', { ascending: true }),
    supabase
      .from('management_goals')
      .select('id,status,target_value')
      .eq('period_start', periodStart)
      .eq('period_end', periodEnd),
  ])

  if (metricsResult.error || entitiesResult.error || definitionsResult.error || capabilitiesResult.error || goalsResult.error) {
    throw new Error('CANONICAL_SOURCE_QUERY_FAILED')
  }

  const metrics = (metricsResult.data || []) as MetricRow[]
  const entities = new Map(((entitiesResult.data || []) as EntityRow[]).map((row) => [row.id, row]))
  const definitions = new Map(((definitionsResult.data || []) as DefinitionRow[]).map((row) => [row.code, row]))
  const capabilities = (capabilitiesResult.data || []) as CapabilityRow[]
  const goals = (goalsResult.data || []) as GoalRow[]
  if (!metrics.length) throw new Error('CANONICAL_METRICS_UNAVAILABLE')
  if (!capabilities.length) throw new Error('CANONICAL_CAPABILITIES_UNAVAILABLE')

  const uniqueMetrics = new Map<string, MetricRow>()
  for (const metric of metrics) {
    const key = `${metric.entity_id}:${metric.metric_code}`
    if (!uniqueMetrics.has(key)) uniqueMetrics.set(key, metric)
  }

  const verifiedEvidence: CanonicalEvidence[] = [...uniqueMetrics.values()].map((metric) => {
    const entity = entities.get(metric.entity_id)
    const definition = definitions.get(metric.metric_code)
    const label = definition?.label || metric.metric_code
    const unit = definition?.unit || 'value'
    const verified = metric.quality_status === 'verified' && metric.evaluation_status === 'evaluable'
    const value = verified ? formatMetricValue(metric.value, unit) : 'N/D'
    const source = [metric.source_name, metric.source_reference].filter(Boolean).join(' · ')

    return {
      id: `metric:${metric.entity_id}:${metric.metric_code}:${periodStart}:${periodEnd}`,
      claim: `${entity?.name || 'Entidad canónica'} · ${label}: ${value}. Calidad ${metric.quality_status}; evaluación ${metric.evaluation_status}; fórmula v${metric.formula_version}.`,
      source: source || 'Fuente canónica de gestión',
      status: verified ? 'verified' : 'partial',
    }
  })

  const portalFeatures: CanonicalPortalFeature[] = capabilities.map((capability) => ({
    name: capability.title,
    status: reportStatus(capability.implementation_status),
    evidence: `Registro canónico de capacidad ${capability.capability_key}; estado ${capability.implementation_status}; última actualización ${isoDate(capability.updated_at, periodEnd)}.`,
  }))

  const contractualProgress: CanonicalContractItem[] = capabilities
    .filter((capability) => capability.contract_required)
    .map((capability) => ({
      requirement: capability.title,
      status: reportStatus(capability.implementation_status) as CanonicalContractItem['status'],
      evidence: `${capability.description} Estado canónico: ${capability.implementation_status}; actualizado ${isoDate(capability.updated_at, periodEnd)}.`,
      dependency: capability.implementation_status === 'planned'
        ? 'Pendiente de implementación o validación por N3uralia según registro canónico.'
        : undefined,
    }))

  const pendingGoals = goals.filter((goal) => goal.status !== 'approved')
  const clientDependencies = pendingGoals.length
    ? [`Aprobación formal pendiente de ${pendingGoals.length} meta(s) del período; cualquier indicador que dependa de esas metas debe permanecer N/D hasta su aprobación.`]
    : ['Sin dependencias de metas pendientes identificadas en el registro canónico del período.']

  const n3uraliaNextSteps = capabilities
    .filter((capability) => !['implemented', 'validated'].includes(capability.implementation_status))
    .slice(0, 12)
    .map((capability) => `Completar o validar ${capability.title}; estado canónico actual: ${capability.implementation_status}.`)

  const latestCutoff = [...uniqueMetrics.values()]
    .map((metric) => metric.source_cutoff_at)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1)
  const sourceCutoff = isoDate(latestCutoff, periodEnd)

  return {
    title: `Informe ejecutivo canónico Property Partners — ${periodStart.slice(0, 7)}`,
    client: 'Property Partners',
    periodStart,
    periodEnd,
    sourceCutoff,
    purpose: 'Informe ejecutivo mensual canónico para revisión previa a entrega al Cliente.',
    audience: 'Gerencia y contraparte designada de Property Partners',
    verifiedEvidence,
    portalFeatures,
    contractualProgress,
    clientDependencies,
    n3uraliaNextSteps,
    delivery: {
      recipient: null,
      status: 'draft',
      purpose: 'Revisión interna previa a entrega al Cliente.',
      paymentMilestonePercent: null,
      paymentStatus: 'not_applicable',
      deliveredAt: null,
    },
  }
}

export async function POST() {
  const access = await requireRoleAccess(['admin', 'ceo'])
  if (!access.allowed) return NextResponse.json({ error: 'Acceso restringido.' }, { status: access.status })

  const startedAt = Date.now()
  try {
    const input = await buildLatestCanonicalInput()
    const supabase = createAdminClient()
    const periodTag = `${input.periodStart}_${input.periodEnd}`

    const { data: candidates } = await supabase
      .from('knowledge_documents')
      .select('id,title,created_at,tags')
      .contains('tags', ['canonical', 'n3uralia-client-report', periodTag])
      .order('created_at', { ascending: false })
      .limit(10)

    const existing = ((candidates || []) as ExistingDocument[])
      .find((document) => !(document.tags || []).some((tag) => ['reportin-test', 'qa', 'mock', 'demo', 'fixture'].includes(tag)))

    if (existing) {
      return NextResponse.json({
        id: existing.id,
        createdAt: existing.created_at,
        title: existing.title,
        artifactUrl: `/api/management/reports/canonical-client/${existing.id}/artifact`,
        reused: true,
      })
    }

    const generationStartedAt = Date.now()
    const report = await generateCanonicalClientReport(input)
    const openaiAndValidationMs = Date.now() - generationStartedAt
    const modelTag = `openai-${report.canonical_metadata.model}`.toLowerCase().replace(/[^a-z0-9-]+/g, '-')

    const persistenceStartedAt = Date.now()
    const { data, error } = await supabase
      .from('knowledge_documents')
      .insert({
        title: report.title,
        content: JSON.stringify(report),
        doc_type: 'report',
        neighborhood: null,
        tags: [
          'canonical',
          'n3uralia-client-report',
          'client-facing',
          modelTag,
          `reportin-${REPORTIN_VERSION}`,
          periodTag,
          'draft',
          'payment-not-applicable',
        ],
      })
      .select('id,created_at')
      .single()

    if (error || !data) throw error || new Error('REPORT_PERSISTENCE_FAILED')

    const artifactUrl = `/api/management/reports/canonical-client/${data.id}/artifact`
    const persistenceMs = Date.now() - persistenceStartedAt
    const totalMs = Date.now() - startedAt

    const { error: auditError } = await supabase.from('report_directory_audit_log').insert({
      actor_id: access.userId,
      action: 'create',
      entity_type: 'n3uralia_client_canonical',
      entity_id: data.id,
      before_state: null,
      after_state: {
        title: report.title,
        client: report.client,
        period: report.period,
        delivery: report.delivery,
        canonical_metadata: report.canonical_metadata,
        source_snapshot: {
          metric_evidence_count: input.verifiedEvidence.length,
          capability_count: input.portalFeatures.length,
          contractual_item_count: input.contractualProgress.length,
          source_cutoff: input.sourceCutoff,
        },
        reportin: { version: REPORTIN_VERSION, artifact_url: artifactUrl, design_authority: 'DESIGN.md' },
        timing: { openai_and_validation_ms: openaiAndValidationMs, persistence_ms: persistenceMs, total_ms: totalMs },
      },
    })
    if (auditError) console.error('CANONICAL_LATEST_REPORT_AUDIT_FAILED', { reportId: data.id })

    return NextResponse.json({
      id: data.id,
      createdAt: data.created_at,
      title: report.title,
      artifactUrl,
      reused: false,
      sourceSnapshot: {
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        sourceCutoff: input.sourceCutoff,
        evidenceCount: input.verifiedEvidence.length,
      },
      timing: { openaiAndValidationMs, persistenceMs, totalMs },
    }, { status: 201 })
  } catch (error) {
    const code = error instanceof Error ? error.message : 'CANONICAL_LATEST_REPORT_FAILED'
    const status = code === 'OPENAI_API_KEY_MISSING' ? 503 : 500
    console.error('CANONICAL_LATEST_REPORT_FAILED', { code, totalMs: Date.now() - startedAt })
    return NextResponse.json({
      error: status === 503
        ? 'La generación canónica está pendiente de configurar OPENAI_API_KEY.'
        : 'No fue posible generar el informe canónico del último período disponible.',
      code,
    }, { status })
  }
}
