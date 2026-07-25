import type { ReasoningMode } from './copilot-reasoning-router'

export type ReasoningRequest = {
  role: 'ceo' | 'directorio' | 'sucursal' | 'partner'
  question: string
  context: unknown
  reasoningMode?: ReasoningMode
}

export type ExecutiveEvidence = {
  domain: string
  label: string
  value: string
  source: string
  period: string
}

export type ExecutiveItem = {
  title: string
  detail: string
}

export type ExecutiveAction = ExecutiveItem & {
  action: string
  domain: 'crm' | 'executive' | 'market' | 'valuation' | 'reports'
  href: string
}

export type ReasoningResponse = {
  summary: string
  signals: ExecutiveItem[]
  evidence: ExecutiveEvidence[]
  risks: ExecutiveItem[]
  opportunities: ExecutiveAction[]
  confidence: 'alta' | 'media' | 'baja'
  confidenceReason: string
  sources: string[]
  reasoningMode: ReasoningMode
}

const MODEL = process.env.OPENAI_MODEL || 'gpt-5.2'

const RESPONSE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    summary: { type: 'string' },
    signals: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          title: { type: 'string' },
          detail: { type: 'string' },
        },
        required: ['title', 'detail'],
      },
    },
    evidence: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          domain: { type: 'string' },
          label: { type: 'string' },
          value: { type: 'string' },
          source: { type: 'string' },
          period: { type: 'string' },
        },
        required: ['domain', 'label', 'value', 'source', 'period'],
      },
    },
    risks: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          title: { type: 'string' },
          detail: { type: 'string' },
        },
        required: ['title', 'detail'],
      },
    },
    opportunities: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          title: { type: 'string' },
          detail: { type: 'string' },
          action: { type: 'string' },
          domain: { type: 'string', enum: ['crm', 'executive', 'market', 'valuation', 'reports'] },
          href: { type: 'string' },
        },
        required: ['title', 'detail', 'action', 'domain', 'href'],
      },
    },
    confidence: { type: 'string', enum: ['alta', 'media', 'baja'] },
    confidenceReason: { type: 'string' },
    sources: { type: 'array', items: { type: 'string' } },
  },
  required: ['summary', 'signals', 'evidence', 'risks', 'opportunities', 'confidence', 'confidenceReason', 'sources'],
} as const

function extractOutputText(payload: unknown): string {
  if (!payload || typeof payload !== 'object') throw new Error('OpenAI devolvió una respuesta inválida')
  const record = payload as Record<string, unknown>
  if (typeof record.output_text === 'string') return record.output_text

  const output = Array.isArray(record.output) ? record.output : []
  for (const item of output) {
    if (!item || typeof item !== 'object') continue
    const content = Array.isArray((item as Record<string, unknown>).content)
      ? (item as Record<string, unknown>).content as unknown[]
      : []
    for (const block of content) {
      if (!block || typeof block !== 'object') continue
      const blockRecord = block as Record<string, unknown>
      if (blockRecord.type === 'output_text' && typeof blockRecord.text === 'string') return blockRecord.text
    }
  }

  throw new Error('OpenAI no devolvió contenido utilizable')
}

export async function generateExecutiveReasoning(
  input: ReasoningRequest,
): Promise<ReasoningResponse> {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY no está configurada')

  const reasoningMode = input.reasoningMode ?? 'standard'
  const effort = reasoningMode === 'deep' ? 'high' : reasoningMode === 'quick' ? 'low' : 'medium'

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      store: false,
      reasoning: { effort },
      instructions: [
        'Eres el copiloto ejecutivo de N3uralia para Property Partners.',
        `Respondes para el rol ${input.role}.`,
        'Usa exclusivamente la evidencia entregada en el contexto.',
        'No inventes cifras, periodos, personas ni conclusiones.',
        'Distingue hechos, señales, riesgos y recomendaciones.',
        'Sé profesional, preciso, ejecutivo y responde en español.',
        'Limita el resumen a lo esencial y prioriza máximo tres señales principales.',
        'Cuando la evidencia sea insuficiente, decláralo y reduce la confianza.',
        'Incluye el periodo o corte de cada evidencia. Si no existe, usa "No informado".',
        'Cada oportunidad debe indicar el dominio correcto y una ruta válida entre /dashboard/ceo, /dashboard/datos-crm, /dashboard/market, /dashboard/valorizador y /dashboard/reportes/autonomos.',
        'Explica en confidenceReason por qué la confianza es alta, media o baja.',
        'Usa el historial conversacional solo para resolver referencias y continuidad; nunca lo trates como evidencia empresarial.',
      ].join('\n'),
      input: JSON.stringify({
        question: input.question,
        context: input.context,
      }),
      text: {
        format: {
          type: 'json_schema',
          name: 'n3uralia_executive_response',
          strict: true,
          schema: RESPONSE_SCHEMA,
        },
      },
    }),
  })

  const payload = await response.json()
  if (!response.ok) {
    const message = payload?.error?.message || 'OpenAI rechazó la solicitud'
    throw new Error(message)
  }

  const parsed = JSON.parse(extractOutputText(payload)) as Omit<ReasoningResponse, 'reasoningMode'>
  return { ...parsed, reasoningMode }
}
