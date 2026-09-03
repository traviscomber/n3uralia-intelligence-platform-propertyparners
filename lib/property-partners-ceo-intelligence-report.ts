import 'server-only'

export type CeoEvidenceStatus = 'verified' | 'partial' | 'not_evaluable'

export type CeoEvidence = {
  id: string
  claim: string
  source: string
  status: CeoEvidenceStatus
}

export type CeoKpi = {
  id: string
  label: string
  metricCode: string
  value: number | null
  unit: string
  status: CeoEvidenceStatus
  periodStart: string
  periodEnd: string
  formulaVersion: string
  evidenceRefs: string[]
  momPct: number | null
  yoyPct: number | null
}

export type CeoMonthlyPoint = {
  period: string
  value: number | null
  status: CeoEvidenceStatus
  formulaVersion: string
  evidenceRefs: string[]
}

export type CeoOfficeSnapshot = {
  id: string
  name: string
  metrics: CeoKpi[]
}

export type CeoMarketGeometry = {
  type: 'Polygon' | 'MultiPolygon'
  coordinates: number[][][] | number[][][][]
}

export type CeoMarketPolygon = {
  id: string
  name: string
  source: string
  version: string
  geometry: CeoMarketGeometry
  evidenceRefs: string[]
}

export type CeoMarketRow = {
  neighborhood: string
  propertyType: string
  portalListings: number | null
  cbrsTransactions: number | null
  portalMedianPriceUf: number | null
  cbrsMedianPriceUf: number | null
  portalMedianUfM2: number | null
  cbrsMedianUfM2: number | null
  gapPct: number | null
  supplyDepthRatio: number | null
  signal: string
  confidence: string
  asOfPortal: string | null
  asOfCbrs: string | null
  evidenceRefs: string[]
}

export type CeoValuationSnapshot = {
  totalCases: number
  byStatus: Array<{ status: string; count: number }>
  periodStart: string
  periodEnd: string
  evidenceRefs: string[]
}

export type CeoDelivery = {
  recipient: string | null
  status: 'draft' | 'sent' | 'resent' | 'acknowledged'
  purpose: string
  paymentStatus: 'not_applicable' | 'pending' | 'received'
  deliveredAt: string | null
}

export type CanonicalCeoIntelligenceInput = {
  reportId: string
  title: string
  client: string
  audience: string
  purpose: string
  period: {
    start: string
    end: string
    sourceCutoff: string
    emittedAt: string
  }
  evidence: CeoEvidence[]
  headlineKpis: CeoKpi[]
  monthlySeries: {
    sales: CeoMonthlyPoint[]
    salesUf: CeoMonthlyPoint[]
  }
  funnel: CeoKpi[]
  offices: CeoOfficeSnapshot[]
  market: {
    polygons: CeoMarketPolygon[]
    rows: CeoMarketRow[]
    portalCutoff: string | null
    cbrsCutoff: string | null
  }
  valuation: CeoValuationSnapshot
  dependencies: string[]
  delivery: CeoDelivery
  sourceSnapshotId: string
}

export type CeoDecision = {
  priority: number
  title: string
  rationale: string
  owner: string
  horizon: string
  control_indicator: string
  evidence_refs: string[]
}

export type CeoNarrativeSection = {
  id: string
  title: string
  summary: string
  key_findings: string[]
  risks: string[]
  recommendations: string[]
  evidence_refs: string[]
}

type CeoNarrative = {
  title: string
  subtitle: string
  executive_summary: string
  what_changed: string[]
  what_matters: string[]
  sections: CeoNarrativeSection[]
  decisions: CeoDecision[]
  limitations: string[]
}

export type PropertyPartnersCeoIntelligenceReport = CeoNarrative & {
  report_type: 'property_partners_ceo_intelligence'
  standard_version: '1.0'
  client: string
  audience: string
  purpose: string
  period: {
    start: string
    end: string
    source_cutoff: string
  }
  delivery: CeoDelivery
  source_snapshot_id: string
  snapshot: {
    headline_kpis: CeoKpi[]
    monthly_series: CanonicalCeoIntelligenceInput['monthlySeries']
    funnel: CeoKpi[]
    offices: CeoOfficeSnapshot[]
    market: CanonicalCeoIntelligenceInput['market']
    valuation: CeoValuationSnapshot
  }
  canonical_metadata: {
    provider: 'OpenAI'
    model: string
    api: 'responses'
    reasoning_effort: string
    reasoning_mode: string
    store: false
    generated_at: string
    source_policy: 'canonical_input_only'
    prompt_version: 'ceo-intelligence-1.0'
  }
}

const NARRATIVE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'title', 'subtitle', 'executive_summary', 'what_changed', 'what_matters',
    'sections', 'decisions', 'limitations',
  ],
  properties: {
    title: { type: 'string', minLength: 1 },
    subtitle: { type: 'string', minLength: 1 },
    executive_summary: { type: 'string', minLength: 1 },
    what_changed: { type: 'array', minItems: 1, maxItems: 5, items: { type: 'string' } },
    what_matters: { type: 'array', minItems: 1, maxItems: 5, items: { type: 'string' } },
    sections: {
      type: 'array',
      minItems: 5,
      maxItems: 8,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'title', 'summary', 'key_findings', 'risks', 'recommendations', 'evidence_refs'],
        properties: {
          id: { type: 'string', minLength: 1 },
          title: { type: 'string', minLength: 1 },
          summary: { type: 'string', minLength: 1 },
          key_findings: { type: 'array', items: { type: 'string' } },
          risks: { type: 'array', items: { type: 'string' } },
          recommendations: { type: 'array', items: { type: 'string' } },
          evidence_refs: { type: 'array', minItems: 1, items: { type: 'string' } },
        },
      },
    },
    decisions: {
      type: 'array',
      minItems: 3,
      maxItems: 5,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['priority', 'title', 'rationale', 'owner', 'horizon', 'control_indicator', 'evidence_refs'],
        properties: {
          priority: { type: 'integer', minimum: 1, maximum: 5 },
          title: { type: 'string', minLength: 1 },
          rationale: { type: 'string', minLength: 1 },
          owner: { type: 'string', minLength: 1 },
          horizon: { type: 'string', minLength: 1 },
          control_indicator: { type: 'string', minLength: 1 },
          evidence_refs: { type: 'array', minItems: 1, items: { type: 'string' } },
        },
      },
    },
    limitations: { type: 'array', items: { type: 'string' } },
  },
} as const

const DEVELOPER_INSTRUCTIONS = `
Genera el CEO Intelligence Report mensual de Property Partners Vitacura para su CEO.

Reglas obligatorias:
1. Usa exclusivamente el paquete canónico de entrada. No uses conocimiento externo.
2. El informe es de negocio y decisión: mercado, resultados comerciales, conversión, oficinas, cartera, valorización y decisiones. No es un informe de avance de desarrollo de N3uralia.
3. No describas PRs, CI, Vercel, arquitectura, estados de implementación, tickets ni QA salvo que aparezcan como una limitación material del dato y sea imprescindible.
4. Toda afirmación material debe apuntar a uno o más evidence_refs existentes en la entrada.
5. Mantén N/D cuando un KPI sea not_evaluable o tenga value=null. Nunca reconstruyas metas, cumplimiento o ratios ausentes.
6. Separa claramente el período comercial del corte de referencia de mercado. Si Portal o CBRS tienen un corte distinto, dilo expresamente y no los presentes como datos del mes.
7. Usa el KML/micromercado como estructura territorial: identifica señales por barrio sin inventar causalidad.
8. Prioriza comparación MoM y YoY sólo cuando existan en headlineKpis. No calcules comparaciones adicionales.
9. No confundas ventas corporativas con cierres acreditados de gestión. Son dimensiones distintas.
10. Las decisiones deben ser 3 a 5, concretas, accionables y ligadas a evidencia. El owner debe ser un rol funcional (CEO, Dirección, Oficina, Comercial, Valorización), no una persona inventada.
11. El resumen ejecutivo debe poder leerse en menos de un minuto y responder: qué pasó, qué importa y qué decidir.
12. Devuelve sólo el JSON exigido por el esquema.
`.trim()

function extractResponseText(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return ''
  const response = payload as {
    output_text?: unknown
    output?: Array<{ type?: string; content?: Array<{ type?: string; text?: string; refusal?: string }> }>
  }
  if (typeof response.output_text === 'string') return response.output_text
  for (const item of response.output || []) {
    if (item.type !== 'message') continue
    for (const content of item.content || []) {
      if (content.type === 'output_text' && typeof content.text === 'string') return content.text
      if (content.type === 'refusal' && typeof content.refusal === 'string') throw new Error('OPENAI_CEO_INTELLIGENCE_REFUSED')
    }
  }
  return ''
}

function assertNarrative(value: unknown): asserts value is CeoNarrative {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('OPENAI_CEO_INTELLIGENCE_INVALID_JSON')
  const narrative = value as Partial<CeoNarrative>
  if (
    typeof narrative.title !== 'string'
    || typeof narrative.subtitle !== 'string'
    || typeof narrative.executive_summary !== 'string'
    || !Array.isArray(narrative.what_changed)
    || !Array.isArray(narrative.what_matters)
    || !Array.isArray(narrative.sections)
    || !Array.isArray(narrative.decisions)
    || !Array.isArray(narrative.limitations)
  ) throw new Error('OPENAI_CEO_INTELLIGENCE_INVALID_SHAPE')
}

export function getCeoIntelligenceReportConfiguration() {
  return {
    reportType: 'property_partners_ceo_intelligence' as const,
    standardVersion: '1.0' as const,
    provider: 'OpenAI' as const,
    api: 'responses' as const,
    model: process.env.OPENAI_CEO_INTELLIGENCE_MODEL || process.env.OPENAI_CANONICAL_REPORT_MODEL || 'gpt-5.6-sol',
    reasoningEffort: 'medium' as const,
    reasoningMode: 'standard' as const,
    verbosity: 'medium' as const,
    maxOutputTokens: 10_000,
    timeoutMs: 120_000,
    store: false as const,
    sourcePolicy: 'canonical_input_only' as const,
    promptVersion: 'ceo-intelligence-1.0' as const,
  }
}

export async function generateCeoIntelligenceReport(input: CanonicalCeoIntelligenceInput): Promise<PropertyPartnersCeoIntelligenceReport> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY_MISSING')

  const configuration = getCeoIntelligenceReportConfiguration()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), configuration.timeoutMs)

  try {
    let response: Response
    try {
      response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: configuration.model,
          store: false,
          reasoning: { effort: configuration.reasoningEffort, context: 'current_turn' },
          max_output_tokens: configuration.maxOutputTokens,
          text: {
            verbosity: configuration.verbosity,
            format: {
              type: 'json_schema',
              name: 'property_partners_ceo_intelligence_report',
              strict: true,
              schema: NARRATIVE_SCHEMA,
            },
          },
          input: [
            { role: 'developer', content: [{ type: 'input_text', text: DEVELOPER_INSTRUCTIONS }] },
            { role: 'user', content: [{ type: 'input_text', text: JSON.stringify(input) }] },
          ],
        }),
        signal: controller.signal,
      })
    } catch (error) {
      if (controller.signal.aborted) throw new Error('OPENAI_CEO_INTELLIGENCE_TIMEOUT')
      throw error
    }

    const payload = await response.json().catch(() => null)
    if (!response.ok) {
      console.error('OPENAI_CEO_INTELLIGENCE_REQUEST_FAILED', { status: response.status, model: configuration.model })
      throw new Error('OPENAI_CEO_INTELLIGENCE_REQUEST_FAILED')
    }

    const outputText = extractResponseText(payload)
    if (!outputText) throw new Error('OPENAI_CEO_INTELLIGENCE_EMPTY')
    const narrative = JSON.parse(outputText) as unknown
    assertNarrative(narrative)

    return {
      ...narrative,
      report_type: 'property_partners_ceo_intelligence',
      standard_version: '1.0',
      client: input.client,
      audience: input.audience,
      purpose: input.purpose,
      period: {
        start: input.period.start,
        end: input.period.end,
        source_cutoff: input.period.sourceCutoff,
      },
      delivery: input.delivery,
      source_snapshot_id: input.sourceSnapshotId,
      snapshot: {
        headline_kpis: input.headlineKpis,
        monthly_series: input.monthlySeries,
        funnel: input.funnel,
        offices: input.offices,
        market: input.market,
        valuation: input.valuation,
      },
      canonical_metadata: {
        provider: 'OpenAI',
        model: configuration.model,
        api: 'responses',
        reasoning_effort: configuration.reasoningEffort,
        reasoning_mode: configuration.reasoningMode,
        store: false,
        generated_at: new Date().toISOString(),
        source_policy: 'canonical_input_only',
        prompt_version: configuration.promptVersion,
      },
    }
  } finally {
    clearTimeout(timeout)
  }
}
