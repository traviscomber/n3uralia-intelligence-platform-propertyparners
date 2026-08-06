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

type CanonicalNarrativeSection = {
  id: string
  title: string
  status: 'verified' | 'partial' | 'pending_client' | 'pending_n3uralia' | 'informational'
  summary: string
  key_findings: string[]
  next_actions: string[]
  evidence_refs: string[]
}

type CanonicalNarrative = {
  title: string
  subtitle: string
  executive_summary: string
  sections: CanonicalNarrativeSection[]
  conclusions: string[]
  client_actions: string[]
  n3uralia_actions: string[]
  limitations: string[]
}

export type CanonicalClientReport = CanonicalNarrative & {
  report_type: 'n3uralia_client_canonical'
  standard_version: '1.0'
  client: string
  audience: string
  purpose: string
  period: {
    start: string
    end: string
    source_cutoff: string
  }
  delivery: CanonicalDelivery
  canonical_metadata: {
    provider: 'OpenAI'
    model: string
    api: 'responses'
    reasoning_effort: string
    reasoning_mode: string
    store: false
    generated_at: string
    source_policy: 'canonical_input_only'
  }
}

const NARRATIVE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'title',
    'subtitle',
    'executive_summary',
    'sections',
    'conclusions',
    'client_actions',
    'n3uralia_actions',
    'limitations',
  ],
  properties: {
    title: { type: 'string', minLength: 1 },
    subtitle: { type: 'string', minLength: 1 },
    executive_summary: { type: 'string', minLength: 1 },
    sections: {
      type: 'array',
      minItems: 6,
      maxItems: 12,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'title', 'status', 'summary', 'key_findings', 'next_actions', 'evidence_refs'],
        properties: {
          id: { type: 'string', minLength: 1 },
          title: { type: 'string', minLength: 1 },
          status: {
            type: 'string',
            enum: ['verified', 'partial', 'pending_client', 'pending_n3uralia', 'informational'],
          },
          summary: { type: 'string', minLength: 1 },
          key_findings: { type: 'array', items: { type: 'string' } },
          next_actions: { type: 'array', items: { type: 'string' } },
          evidence_refs: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    conclusions: { type: 'array', minItems: 1, items: { type: 'string' } },
    client_actions: { type: 'array', items: { type: 'string' } },
    n3uralia_actions: { type: 'array', items: { type: 'string' } },
    limitations: { type: 'array', items: { type: 'string' } },
  },
} as const

const DEVELOPER_INSTRUCTIONS = `
Genera un informe ejecutivo canónico de N3uralia dirigido al Cliente.

Reglas obligatorias:
1. Usa exclusivamente la información contenida en el paquete de entrada. No uses conocimiento externo.
2. No inventes cifras, estados, avances, fechas, conclusiones, fuentes ni compromisos.
3. Toda afirmación material debe conservar referencias de evidencia en evidence_refs.
4. Cuando falte información, declárala en limitations o usa el estado pending_client/pending_n3uralia.
5. Distingue con claridad: trabajo ejecutado, avance parcial, dependencia del Cliente y trabajo pendiente de N3uralia.
6. El tono debe ser ejecutivo, directo, factual y apto para envío al Cliente.
7. No expongas secretos, claves, nombres de tablas, rutas internas, mensajes de error ni detalles de implementación innecesarios.
8. No declares un pago como recibido salvo que paymentStatus sea received. Una entrega para solicitar pago no equivale a pago recibido.
9. Mantén el foco en resultados, funcionalidades del portal, estado contractual, dependencias, próximos hitos y decisiones requeridas.
10. Devuelve sólo el objeto JSON exigido por el esquema.
`.trim()

const ALLOWED_EFFORTS = new Set(['none', 'low', 'medium', 'high', 'xhigh', 'max'])

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
      if (content.type === 'refusal' && typeof content.refusal === 'string') {
        throw new Error('OPENAI_CANONICAL_REPORT_REFUSED')
      }
    }
  }

  return ''
}

function assertNarrative(value: unknown): asserts value is CanonicalNarrative {
  if (!value || typeof value !== 'object') throw new Error('OPENAI_CANONICAL_REPORT_INVALID_JSON')
  const narrative = value as Partial<CanonicalNarrative>
  if (
    typeof narrative.title !== 'string' ||
    typeof narrative.subtitle !== 'string' ||
    typeof narrative.executive_summary !== 'string' ||
    !Array.isArray(narrative.sections) ||
    !Array.isArray(narrative.conclusions) ||
    !Array.isArray(narrative.client_actions) ||
    !Array.isArray(narrative.n3uralia_actions) ||
    !Array.isArray(narrative.limitations)
  ) {
    throw new Error('OPENAI_CANONICAL_REPORT_INVALID_SHAPE')
  }
}

export function getCanonicalClientReportConfiguration() {
  const configuredEffort = process.env.OPENAI_CANONICAL_REPORT_REASONING_EFFORT || 'max'
  return {
    reportType: 'n3uralia_client_canonical' as const,
    name: 'Informe Canónico N3uralia hacia Cliente',
    standardVersion: '1.0' as const,
    provider: 'OpenAI' as const,
    api: 'responses' as const,
    model: process.env.OPENAI_CANONICAL_REPORT_MODEL || 'gpt-5.6-sol',
    reasoningEffort: ALLOWED_EFFORTS.has(configuredEffort) ? configuredEffort : 'max',
    reasoningMode: process.env.OPENAI_CANONICAL_REPORT_REASONING_MODE === 'standard' ? 'standard' : 'pro',
    store: false as const,
    sourcePolicy: 'canonical_input_only' as const,
    requiredSections: [
      'Resumen ejecutivo',
      'Desempeño y evidencia del período',
      'Avances y funcionalidades del portal',
      'Estado técnico y de seguridad',
      'Alineación contractual',
      'Dependencias y decisiones del Cliente',
      'Próximos hitos de N3uralia',
      'Limitaciones y trazabilidad',
    ],
  }
}

export async function generateCanonicalClientReport(
  input: CanonicalClientReportInput,
): Promise<CanonicalClientReport> {
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
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: configuration.model,
        store: false,
        reasoning,
        max_output_tokens: 20_000,
        text: {
          verbosity: 'high',
          format: {
            type: 'json_schema',
            name: 'n3uralia_canonical_client_report',
            strict: true,
            schema: NARRATIVE_SCHEMA,
          },
        },
        input: [
          {
            role: 'developer',
            content: [{ type: 'input_text', text: DEVELOPER_INSTRUCTIONS }],
          },
          {
            role: 'user',
            content: [{ type: 'input_text', text: JSON.stringify(input) }],
          },
        ],
      }),
      signal: controller.signal,
    })

    const payload = await response.json().catch(() => null)
    if (!response.ok) {
      console.error('OPENAI_CANONICAL_REPORT_REQUEST_FAILED', {
        status: response.status,
        model: configuration.model,
      })
      throw new Error('OPENAI_CANONICAL_REPORT_REQUEST_FAILED')
    }

    const outputText = extractResponseText(payload)
    if (!outputText) throw new Error('OPENAI_CANONICAL_REPORT_EMPTY')

    const narrative = JSON.parse(outputText) as unknown
    assertNarrative(narrative)

    return {
      ...narrative,
      report_type: 'n3uralia_client_canonical',
      standard_version: '1.0',
      client: input.client,
      audience: input.audience,
      purpose: input.purpose,
      period: {
        start: input.periodStart,
        end: input.periodEnd,
        source_cutoff: input.sourceCutoff,
      },
      delivery: input.delivery,
      canonical_metadata: {
        provider: 'OpenAI',
        model: configuration.model,
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
