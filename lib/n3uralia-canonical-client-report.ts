import 'server-only'

export type CanonicalEvidence = {
  id: string
  claim: string
  source: string
  status?: 'verified' | 'partial' | 'pending_client' | 'pending_n3uralia'
}

export type CanonicalPortalFeature = {
  name: string
  status: 'complete' | 'partial' | 'pending_client' | 'pending_n3uralia'
  evidence: string
}

export type CanonicalContractItem = {
  requirement: string
  status: 'complete' | 'partial' | 'pending_client' | 'pending_n3uralia'
  evidence: string
  dependency?: string
}

export type CanonicalDelivery = {
  recipient: string | null
  status: 'draft' | 'sent' | 'resent' | 'acknowledged'
  purpose: string
  paymentMilestonePercent: number | null
  paymentStatus: 'not_applicable' | 'pending' | 'received'
  deliveredAt: string | null
}

export type CanonicalClientReportInput = {
  title: string
  client: string
  periodStart: string
  periodEnd: string
  sourceCutoff: string
  purpose: string
  audience: string
  verifiedEvidence: CanonicalEvidence[]
  portalFeatures: CanonicalPortalFeature[]
  contractualProgress: CanonicalContractItem[]
  clientDependencies: string[]
  n3uraliaNextSteps: string[]
  delivery: CanonicalDelivery
}

export type CanonicalChartSeries = {
  id: string
  label: string
  values: Array<number | null>
  unit: string
  evidence_refs: string[]
  methodology_version: string | null
}

export type CanonicalChartSpec = {
  id: string
  title: string
  purpose: string
  type: 'bar' | 'grouped_bar' | 'line' | 'combo_bar_line' | 'progress' | 'donut'
  categories: string[]
  series: CanonicalChartSeries[]
  source_note: string
  evidence_refs: string[]
  status: 'verified' | 'partial' | 'not_evaluable'
  direct_labels: boolean
  target_series_id: string | null
}

export type CanonicalNarrativeSection = {
  id: string
  title: string
  status: 'verified' | 'partial' | 'pending_client' | 'pending_n3uralia' | 'informational'
  summary: string
  key_findings: string[]
  next_actions: string[]
  evidence_refs: string[]
}

export type CanonicalNarrative = {
  title: string
  subtitle: string
  executive_summary: string
  sections: CanonicalNarrativeSection[]
  charts: CanonicalChartSpec[]
  conclusions: string[]
  client_actions: string[]
  n3uralia_actions: string[]
  limitations: string[]
}

export type CanonicalClientReport = CanonicalNarrative & {
  report_type: 'n3uralia_client_canonical'
  standard_version: '1.1'
  client: string
  audience: string
  purpose: string
  period: { start: string; end: string; source_cutoff: string }
  delivery: CanonicalDelivery
  canonical_metadata: {
    provider: 'OpenAI'
    model: string
    response_id: string | null
    prompt_version: 'reportin-1.1'
    api: 'responses'
    reasoning_effort: string
    reasoning_mode: string
    store: false
    generated_at: string
    source_policy: 'canonical_input_only'
  }
}

const STRING_ARRAY = { type: 'array', items: { type: 'string' } } as const

const CHART_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'title', 'purpose', 'type', 'categories', 'series', 'source_note', 'evidence_refs', 'status', 'direct_labels', 'target_series_id'],
  properties: {
    id: { type: 'string', minLength: 1 },
    title: { type: 'string', minLength: 1 },
    purpose: { type: 'string', minLength: 1 },
    type: { type: 'string', enum: ['bar', 'grouped_bar', 'line', 'combo_bar_line', 'progress', 'donut'] },
    categories: { type: 'array', minItems: 1, maxItems: 24, items: { type: 'string' } },
    series: {
      type: 'array', minItems: 1, maxItems: 4,
      items: {
        type: 'object', additionalProperties: false,
        required: ['id', 'label', 'values', 'unit', 'evidence_refs', 'methodology_version'],
        properties: {
          id: { type: 'string', minLength: 1 },
          label: { type: 'string', minLength: 1 },
          values: { type: 'array', minItems: 1, maxItems: 24, items: { anyOf: [{ type: 'number' }, { type: 'null' }] } },
          unit: { type: 'string', minLength: 1 },
          evidence_refs: STRING_ARRAY,
          methodology_version: { anyOf: [{ type: 'string' }, { type: 'null' }] },
        },
      },
    },
    source_note: { type: 'string', minLength: 1 },
    evidence_refs: STRING_ARRAY,
    status: { type: 'string', enum: ['verified', 'partial', 'not_evaluable'] },
    direct_labels: { type: 'boolean' },
    target_series_id: { anyOf: [{ type: 'string' }, { type: 'null' }] },
  },
} as const

const NARRATIVE_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['title', 'subtitle', 'executive_summary', 'sections', 'charts', 'conclusions', 'client_actions', 'n3uralia_actions', 'limitations'],
  properties: {
    title: { type: 'string', minLength: 1 },
    subtitle: { type: 'string', minLength: 1 },
    executive_summary: { type: 'string', minLength: 1 },
    sections: {
      type: 'array', minItems: 6, maxItems: 12,
      items: {
        type: 'object', additionalProperties: false,
        required: ['id', 'title', 'status', 'summary', 'key_findings', 'next_actions', 'evidence_refs'],
        properties: {
          id: { type: 'string', minLength: 1 },
          title: { type: 'string', minLength: 1 },
          status: { type: 'string', enum: ['verified', 'partial', 'pending_client', 'pending_n3uralia', 'informational'] },
          summary: { type: 'string', minLength: 1 },
          key_findings: STRING_ARRAY,
          next_actions: STRING_ARRAY,
          evidence_refs: STRING_ARRAY,
        },
      },
    },
    charts: { type: 'array', maxItems: 8, items: CHART_SCHEMA },
    conclusions: { type: 'array', minItems: 1, items: { type: 'string' } },
    client_actions: STRING_ARRAY,
    n3uralia_actions: STRING_ARRAY,
    limitations: STRING_ARRAY,
  },
} as const

const DEVELOPER_INSTRUCTIONS = `
Genera un informe ejecutivo canónico y una especificación visual Reportin dirigida al Cliente.

Reglas obligatorias:
1. Usa exclusivamente el paquete de entrada. No uses conocimiento externo ni completes datos ausentes.
2. No inventes cifras, fechas, estados, fuentes, compromisos, series ni categorías.
3. Toda afirmación y toda serie debe conservar IDs existentes en evidence_refs.
4. Declara faltantes en limitations o con estados pending_client, pending_n3uralia o not_evaluable.
5. Distingue hechos verificados, interpretación, riesgo, recomendación y dependencia.
6. No declares pago recibido salvo paymentStatus=received.
7. Produce gráficos solo cuando existan al menos dos valores numéricos exactos, comparables y con la misma unidad, período, universo y metodología.
8. No extraigas una serie desde lenguaje ambiguo. No conviertas N/D o null en cero.
9. Patrones preferidos: combo_bar_line para desempeño mensual vs meta; line para acumulado real vs meta; grouped_bar para oficinas o entidades; progress para un porcentaje verificado; donut solo si el universo suma exactamente 100%.
10. Cada gráfico debe incluir source_note, unidad, propósito, referencias de evidencia y longitudes de serie iguales a categories.
11. Máximo cuatro series por gráfico. Usa direct_labels=true cuando sea legible.
12. Si no existe data suficiente, devuelve charts=[]; nunca generes un gráfico decorativo.
13. Devuelve solo el JSON exigido por el esquema.
`.trim()

const ALLOWED_EFFORTS = new Set(['none', 'low', 'medium', 'high', 'xhigh', 'max'])

function extractResponse(payload: unknown) {
  if (!payload || typeof payload !== 'object') return { id: null as string | null, text: '' }
  const response = payload as { id?: unknown; output_text?: unknown; output?: Array<{ type?: string; content?: Array<{ type?: string; text?: string; refusal?: string }> }> }
  if (typeof response.output_text === 'string') return { id: typeof response.id === 'string' ? response.id : null, text: response.output_text }
  for (const item of response.output || []) {
    if (item.type !== 'message') continue
    for (const content of item.content || []) {
      if (content.type === 'output_text' && typeof content.text === 'string') return { id: typeof response.id === 'string' ? response.id : null, text: content.text }
      if (content.type === 'refusal') throw new Error('OPENAI_CANONICAL_REPORT_REFUSED')
    }
  }
  return { id: typeof response.id === 'string' ? response.id : null, text: '' }
}

function validateNarrative(value: unknown, input: CanonicalClientReportInput): asserts value is CanonicalNarrative {
  if (!value || typeof value !== 'object') throw new Error('OPENAI_CANONICAL_REPORT_INVALID_JSON')
  const narrative = value as Partial<CanonicalNarrative>
  if (typeof narrative.title !== 'string' || typeof narrative.subtitle !== 'string' || typeof narrative.executive_summary !== 'string' || !Array.isArray(narrative.sections) || !Array.isArray(narrative.charts) || !Array.isArray(narrative.conclusions) || !Array.isArray(narrative.client_actions) || !Array.isArray(narrative.n3uralia_actions) || !Array.isArray(narrative.limitations)) throw new Error('OPENAI_CANONICAL_REPORT_INVALID_SHAPE')

  const evidenceIds = new Set(input.verifiedEvidence.map((item) => item.id))
  const assertRefs = (refs: string[]) => {
    if (!refs.every((ref) => evidenceIds.has(ref))) throw new Error('OPENAI_CANONICAL_REPORT_UNKNOWN_EVIDENCE')
  }
  narrative.sections.forEach((section) => assertRefs(section.evidence_refs))
  narrative.charts.forEach((chart) => {
    if (!chart.categories.length || !chart.source_note.trim()) throw new Error('OPENAI_CANONICAL_CHART_INVALID')
    assertRefs(chart.evidence_refs)
    chart.series.forEach((series) => {
      if (!series.unit.trim() || series.values.length !== chart.categories.length) throw new Error('OPENAI_CANONICAL_CHART_INVALID')
      assertRefs(series.evidence_refs)
    })
    const versions = new Set(chart.series.map((series) => series.methodology_version).filter(Boolean))
    if (versions.size > 1) throw new Error('OPENAI_CANONICAL_CHART_INCOMPATIBLE_METHODOLOGY')
    if (chart.type === 'donut') {
      const values = chart.series.flatMap((series) => series.values).filter((value): value is number => typeof value === 'number')
      const total = values.reduce((sum, value) => sum + value, 0)
      if (Math.abs(total - 100) > 0.01) throw new Error('OPENAI_CANONICAL_CHART_INVALID_DONUT')
    }
  })
}

export function getCanonicalClientReportConfiguration() {
  const configuredEffort = process.env.OPENAI_CANONICAL_REPORT_REASONING_EFFORT || 'max'
  return {
    reportType: 'n3uralia_client_canonical' as const,
    name: 'Informe Canónico N3uralia hacia Cliente',
    standardVersion: '1.1' as const,
    reportinVersion: '1.1' as const,
    provider: 'OpenAI' as const,
    api: 'responses' as const,
    model: process.env.OPENAI_CANONICAL_REPORT_MODEL || 'gpt-5.6-sol',
    reasoningEffort: ALLOWED_EFFORTS.has(configuredEffort) ? configuredEffort : 'max',
    reasoningMode: process.env.OPENAI_CANONICAL_REPORT_REASONING_MODE === 'standard' ? 'standard' : 'pro',
    store: false as const,
    sourcePolicy: 'canonical_input_only' as const,
    chartPatterns: ['combo_bar_line', 'line', 'grouped_bar', 'progress', 'donut'] as const,
  }
}

export async function generateCanonicalClientReport(input: CanonicalClientReportInput): Promise<CanonicalClientReport> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY_MISSING')
  const configuration = getCanonicalClientReportConfiguration()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 240_000)
  try {
    const reasoning = configuration.reasoningMode === 'pro'
      ? { effort: configuration.reasoningEffort, mode: 'pro', context: 'current_turn' }
      : { effort: configuration.reasoningEffort, context: 'current_turn' }
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: configuration.model,
        store: false,
        reasoning,
        max_output_tokens: 20_000,
        text: { verbosity: 'high', format: { type: 'json_schema', name: 'n3uralia_canonical_client_report', strict: true, schema: NARRATIVE_SCHEMA } },
        input: [
          { role: 'developer', content: [{ type: 'input_text', text: DEVELOPER_INSTRUCTIONS }] },
          { role: 'user', content: [{ type: 'input_text', text: JSON.stringify(input) }] },
        ],
      }),
      signal: controller.signal,
    })
    const payload = await response.json().catch(() => null)
    if (!response.ok) {
      console.error('OPENAI_CANONICAL_REPORT_REQUEST_FAILED', { status: response.status, model: configuration.model })
      throw new Error('OPENAI_CANONICAL_REPORT_REQUEST_FAILED')
    }
    const extracted = extractResponse(payload)
    if (!extracted.text) throw new Error('OPENAI_CANONICAL_REPORT_EMPTY')
    const narrative = JSON.parse(extracted.text) as unknown
    validateNarrative(narrative, input)
    return {
      ...narrative,
      report_type: 'n3uralia_client_canonical',
      standard_version: '1.1',
      client: input.client,
      audience: input.audience,
      purpose: input.purpose,
      period: { start: input.periodStart, end: input.periodEnd, source_cutoff: input.sourceCutoff },
      delivery: input.delivery,
      canonical_metadata: {
        provider: 'OpenAI',
        model: configuration.model,
        response_id: extracted.id,
        prompt_version: 'reportin-1.1',
        api: 'responses',
        reasoning_effort: configuration.reasoningEffort,
        reasoning_mode: configuration.reasoningMode,
        store: false,
        generated_at: new Date().toISOString(),
        source_policy: 'canonical_input_only',
      },
    }
  } finally {
    clearTimeout(timeout)
  }
}
