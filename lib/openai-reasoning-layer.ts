import type { N3uraliaIntelligenceContext, IntelligenceEvidence } from './n3uralia-intelligence-engine'
import type { TraceableClaim } from './executive-response-guard'

export type ReasoningRequest = {
  role: 'ceo' | 'directorio' | 'sucursal' | 'partner'
  question: string
  reasoningMode?: 'quick' | 'standard' | 'deep'
  context: {
    source: string
    requestedAt: string
    intelligence?: N3uraliaIntelligenceContext
  }
}

export type ReasoningResponse = {
  answer: string
  sections: {
    resumenEjecutivo: string
    senalesPrincipales: string[]
    evidenciaUtilizada: { domain: string; items: string[] }[]
    riesgos: string[]
    oportunidades: string[]
    nivelConfianza: { label: 'Alta' | 'Media' | 'Baja'; score: number; justificacion: string }
  }
  confidence: number
  sources: string[]
  evidenceIds: string[]
  claims: TraceableClaim[]
}

function getNumericEvidence(evidence: IntelligenceEvidence[], id: string): number {
  return Number(evidence.find((e) => e.id === id)?.value ?? 0)
}

function getStringEvidence(evidence: IntelligenceEvidence[], id: string): string {
  return String(evidence.find((e) => e.id === id)?.value ?? '')
}

function signalConfidence(confidence: 'high' | 'medium' | 'low'): number {
  return confidence === 'high' ? 0.85 : confidence === 'medium' ? 0.65 : 0.4
}

function buildExecutiveResponse(
  question: string,
  ctx: N3uraliaIntelligenceContext,
  mode: 'quick' | 'standard' | 'deep'
): ReasoningResponse {
  const ev = ctx.evidence
  const evidenceIdSet = new Set(ev.map((item) => item.id))
  const salesYtd = getNumericEvidence(ev, 'client.crm.sales-ytd')
  const salesUf = getNumericEvidence(ev, 'client.crm.sales-uf-ytd')
  const compliance = getStringEvidence(ev, 'client.executive.sales-compliance')
  const coverage = getNumericEvidence(ev, 'client.crm.source-coverage')
  const attributed = getNumericEvidence(ev, 'client.executive.branch-attribution')
  const attrRate = salesYtd > 0 ? Math.round((attributed / salesYtd) * 100) : null

  const resumenEjecutivo = [
    `Property Partners registra ${salesYtd} cierres acumulados YTD equivalentes a ${salesUf} UF`,
    compliance ? `, con cumplimiento acumulado de ${compliance}` : '',
    `. La cobertura de fuentes entregadas es del ${coverage}%.`,
    attrRate !== null
      ? ` Solo el ${attrRate}% de los cierres puede atribuirse a sucursal, lo que limita la precisión diagnóstica.`
      : '',
    ctx.signals.length > 0
      ? ` N3uralia identifica ${ctx.signals.length} señal${ctx.signals.length > 1 ? 'es' : ''} derivada${ctx.signals.length > 1 ? 's' : ''} del análisis: ${ctx.signals[0].title.toLowerCase()}.`
      : '',
  ].join('')

  const selectedSignals = ctx.signals.slice(0, 3)
  const claims: TraceableClaim[] = selectedSignals.map((signal) => ({
    statement: `${signal.title} — ${signal.interpretation}`,
    evidenceIds: signal.evidenceIds.filter((id) => evidenceIdSet.has(id)),
    confidence: signalConfidence(signal.confidence),
  }))

  const senalesPrincipales = selectedSignals.map((signal) => {
    const conf = signal.confidence === 'high'
      ? 'Alta confianza'
      : signal.confidence === 'medium'
        ? 'Confianza media'
        : 'Confianza baja'
    return `${signal.title} — ${signal.interpretation} (${conf})`
  })

  const domainMap: Record<string, string[]> = {}
  for (const e of ev) {
    if (!domainMap[e.domain]) domainMap[e.domain] = []
    const label = e.value !== null && e.value !== '' ? `${e.label}: ${e.value}` : e.label
    domainMap[e.domain].push(label)
  }
  const evidenciaUtilizada = Object.entries(domainMap).map(([domain, items]) => ({
    domain: domain.charAt(0).toUpperCase() + domain.slice(1),
    items: items.slice(0, mode === 'quick' ? 2 : mode === 'standard' ? 3 : 5),
  }))

  const riesgos = ctx.risks
    .filter((r) => r.severity === 'critical' || r.severity === 'warning')
    .slice(0, mode === 'quick' ? 2 : 4)
    .map((r) => {
      const tag = r.severity === 'critical' ? 'CRÍTICO' : 'ADVERTENCIA'
      return `[${tag}] ${r.title}: ${r.detail}`
    })

  const supportedEvidenceIds = new Set(claims.flatMap((claim) => claim.evidenceIds))
  const oportunidades = ctx.actions
    .filter((action) => action.priority === 'high')
    .filter((action) => action.evidenceIds.some((id) => supportedEvidenceIds.has(id)))
    .slice(0, mode === 'quick' ? 2 : 3)
    .map((action) => `${action.title}: ${action.action}`)

  const supportedClaims = claims.filter((claim) => claim.evidenceIds.length > 0)
  const highClaims = supportedClaims.filter((claim) => claim.confidence >= 0.75).length
  const evidenceCount = ev.length
  let confidenceLabel: 'Alta' | 'Media' | 'Baja'
  let confidenceScore: number
  let justificacion: string

  if (evidenceCount >= 10 && highClaims >= 2) {
    confidenceLabel = 'Alta'
    confidenceScore = 0.85
    justificacion = `${evidenceCount} registros analizados y ${highClaims} afirmaciones de alta confianza con evidencia asociada.`
  } else if (evidenceCount >= 5 && supportedClaims.length > 0) {
    confidenceLabel = 'Media'
    confidenceScore = 0.65
    justificacion = `${evidenceCount} registros disponibles y ${supportedClaims.length} afirmación${supportedClaims.length === 1 ? '' : 'es'} respaldada${supportedClaims.length === 1 ? '' : 's'}.`
  } else {
    confidenceLabel = 'Baja'
    confidenceScore = supportedClaims.length > 0 ? 0.4 : 0
    justificacion = supportedClaims.length > 0
      ? 'Cobertura de datos insuficiente para inferencias de alta confianza.'
      : 'No existen afirmaciones con evidencia asociada.'
  }

  const sources = Array.from(new Set(ev.map((e) => e.source))).slice(0, 5)

  return {
    answer: resumenEjecutivo,
    sections: {
      resumenEjecutivo,
      senalesPrincipales,
      evidenciaUtilizada,
      riesgos,
      oportunidades,
      nivelConfianza: { label: confidenceLabel, score: confidenceScore, justificacion },
    },
    confidence: confidenceScore,
    sources,
    evidenceIds: ev.map((item) => item.id),
    claims,
  }
}

export async function generateExecutiveReasoning(
  input: ReasoningRequest
): Promise<ReasoningResponse> {
  const mode = input.reasoningMode ?? 'standard'

  if (input.context.intelligence) {
    return buildExecutiveResponse(input.question, input.context.intelligence, mode)
  }

  return {
    answer: 'No se pudo construir el contexto de inteligencia. Verifique que los extractores de datos estén activos.',
    sections: {
      resumenEjecutivo: 'Sin contexto de inteligencia disponible.',
      senalesPrincipales: [],
      evidenciaUtilizada: [],
      riesgos: [],
      oportunidades: [],
      nivelConfianza: { label: 'Baja', score: 0, justificacion: 'Sin evidencia disponible.' },
    },
    confidence: 0,
    sources: [],
    evidenceIds: [],
    claims: [],
  }
}
