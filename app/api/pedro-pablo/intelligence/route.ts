import { NextRequest, NextResponse } from 'next/server'

type ExpertiseSource = {
  id: string
  authority: string
  title: string
  url: string
  verifiedAt: string
}

type ExpertiseCard = {
  topic: string
  label: string
  guidance: string[]
  limits: string[]
  sources: ExpertiseSource[]
}

type ExpertisePayload = {
  available: boolean
  expertiseProfile: {
    id: string
    market: string
    purpose: string
    precedence: readonly string[]
    rules: readonly string[]
  }
  cards: ExpertiseCard[]
  interpretationPolicy: string
  generatedAt: string
}

type MemoryItem = {
  id: string
  memory_kind: string
  content: string
  source_kind: string
  source_reference: string | null
  confidence: string
  expires_at: string | null
  created_at: string
}

type MemoryPayload = {
  memories: MemoryItem[]
  memoryPolicy: string
  canonicalAuthority: false
  generatedAt: string
}

type OperationalMemoryPayload = {
  available: boolean
  reason: 'role_scope' | 'source_unavailable' | null
  summary: {
    total: number
    open: number
    inProgress: number
    done: number
    dismissed: number
    outcomesRecorded: number
  } | null
  items: Array<Record<string, unknown>>
  mode: string
  learningClaim?: string
  generatedAt: string
  writesPerformed: 0
}

type DecisionPayload = Record<string, unknown> & {
  title: string
  answer: string
  evidence?: Array<Record<string, unknown>>
  proposals?: unknown[]
}

function buildExpertAnswer(cards: ExpertiseCard[]) {
  const lines: string[] = []
  for (const card of cards) {
    lines.push(card.label)
    for (const item of card.guidance.slice(0, 3)) lines.push(`- ${item}`)
    for (const limit of card.limits.slice(0, 2)) lines.push(`Límite: ${limit}`)
  }
  lines.push('La evidencia canónica y específica del inmueble prevalece sobre este conocimiento general.')
  return lines.join('\n')
}

function expertEvidence(cards: ExpertiseCard[]) {
  return cards.flatMap((card) => card.sources.map((source) => ({
    label: `${card.label} · ${source.authority}`,
    source: source.title,
    reference: source.url,
    cutoff: source.verifiedAt,
    domain: 'expertise',
  }))).slice(0, 6)
}

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400 })
  }

  const prompt = typeof (body as { prompt?: unknown })?.prompt === 'string'
    ? (body as { prompt: string }).prompt.trim()
    : ''

  if (!prompt || prompt.length > 800) {
    return NextResponse.json({ error: 'La consulta debe contener entre 1 y 800 caracteres.' }, { status: 400 })
  }

  const cookie = request.headers.get('cookie') ?? ''
  const headers = { 'Content-Type': 'application/json', cookie }
  const [decisionResponse, memoryResponse, operationalMemoryResponse, expertiseResponse] = await Promise.all([
    fetch(new URL('/api/pedro-pablo/decision-support', request.url), {
      method: 'POST', headers, body: JSON.stringify({ prompt }), cache: 'no-store',
    }),
    fetch(new URL('/api/pedro-pablo/memory', request.url), {
      headers: { cookie }, cache: 'no-store',
    }),
    fetch(new URL('/api/pedro-pablo/operational-memory', request.url), {
      headers: { cookie }, cache: 'no-store',
    }),
    fetch(new URL('/api/pedro-pablo/expertise', request.url), {
      method: 'POST', headers, body: JSON.stringify({ prompt }), cache: 'no-store',
    }),
  ])

  const decisionPayload = await decisionResponse.json() as DecisionPayload | { error?: string }
  if (!decisionResponse.ok) {
    const error = 'error' in decisionPayload && typeof decisionPayload.error === 'string'
      ? decisionPayload.error
      : 'No fue posible consultar Pedro Pablo.'
    return NextResponse.json({ error }, { status: decisionResponse.status })
  }

  const decision = decisionPayload as DecisionPayload
  const memory = memoryResponse.ok
    ? await memoryResponse.json() as MemoryPayload
    : { memories: [], memoryPolicy: 'unavailable', canonicalAuthority: false, generatedAt: new Date().toISOString() } as MemoryPayload
  const operationalMemory = operationalMemoryResponse.ok
    ? await operationalMemoryResponse.json() as OperationalMemoryPayload
    : {
        available: false,
        reason: 'source_unavailable',
        summary: null,
        items: [],
        mode: 'verified-task-history-only',
        learningClaim: 'none',
        generatedAt: new Date().toISOString(),
        writesPerformed: 0,
      } as OperationalMemoryPayload
  const expertise = expertiseResponse.ok
    ? await expertiseResponse.json() as ExpertisePayload
    : null

  const cards = expertise?.cards ?? []
  const expertMode = cards.length > 0

  const response = expertMode
    ? {
        ...decision,
        title: cards.length === 1 ? `Criterio inmobiliario · ${cards[0].label}` : 'Criterio inmobiliario · Vitacura',
        answer: buildExpertAnswer(cards),
        evidence: expertEvidence(cards),
        proposals: [],
        confidence: 'high',
      }
    : decision

  return NextResponse.json({
    ...response,
    memoryContext: {
      available: memory.memories.length > 0,
      count: memory.memories.length,
      items: memory.memories.slice(0, 6),
      policy: memory.memoryPolicy,
      canonicalAuthority: false,
    },
    operationalMemoryContext: {
      available: operationalMemory.available,
      reason: operationalMemory.reason,
      summary: operationalMemory.summary,
      items: operationalMemory.items.slice(0, 6),
      mode: operationalMemory.mode,
      learningClaim: operationalMemory.learningClaim ?? 'none',
      canonicalAuthority: false,
      writesPerformed: 0,
    },
    expertiseContext: expertise ? {
      available: expertise.available,
      profile: expertise.expertiseProfile,
      cards,
      policy: expertise.interpretationPolicy,
    } : {
      available: false,
      profile: null,
      cards: [],
      policy: 'unavailable',
    },
    reasoningPrecedence: 'canonical_data > property_specific_evidence > official_regulation > market_evidence > verified_operational_outcomes > confirmed_memory > expert_interpretation',
    intelligenceMode: expertMode ? 'vitacura-expertise' : 'canonical-operating-intelligence',
    learningPolicy: 'verified outcomes may inform future context; no autonomous canonical rewrite; explicit memory remains confirmation-bound',
    writesPerformed: 0,
  }, { headers: { 'Cache-Control': 'no-store' } })
}
