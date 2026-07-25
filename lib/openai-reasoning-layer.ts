import type { N3uraliaIntelligenceContext, IntelligenceEvidence } from './n3uralia-intelligence-engine'

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
}

function getNumericEvidence(evidence: IntelligenceEvidence[], id: string): number {
  return Number(evidence.find((e) => e.id === id)?.value ?? 0)
}

function getStringEvidence(evidence: IntelligenceEvidence[], id: string): string {
  return String(evidence.find((e) => e.id === id)?.value ?? '')
}

function buildExecutiveResponse(
  question: string,
  ctx: N3uraliaIntelligenceContext,
  mode: 'quick' | 'standard' | 'deep'
): ReasoningResponse {
  const ev = ctx.evidence
  const salesYtd = getNumericEvidence(ev, 'client.crm.sales-ytd')
  const salesUf = getNumericEvidence(ev, 'client.crm.sales-uf-ytd')
  const compliance = getStringEvidence(ev, 'client.executive.sales-compliance')
  const coverage = getNumericEvidence(ev, 'client.crm.source-coverage')
  const attributed = getNumericEvidence(ev, 'client.executive.branch-attribution')
  const attrRate = salesYtd > 0 ? Math.round((attributed / salesYtd) * 100) : null

  // --- RESUMEN EJECUTIVO ---
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

  // --- SENALES PRINCIPALES ---
  const senalesPrincipales = ctx.signals.slice(0, 3).map((s) => {
    const conf = s.confidence === 'high' ? 'Alta confianza' : s.confidence === 'medium' ? 'Confianza media' : 'Confianza baja'
    return `${s.title} — ${s.interpretation} (${conf})`
  })

  // --- EVIDENCIA UTILIZADA por dominio ---
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

  // --- RIESGOS ---
  const riesgos = ctx.risks
    .filter((r) => r.severity === 'critical' || r.severity === 'warning')
    .slice(0, mode === 'quick' ? 2 : 4)
    .map((r) => {
      const tag = r.severity === 'critical' ? 'CRÍTICO' : 'ADVERTENCIA'
      return `[${tag}] ${r.title}: ${r.detail}`
    })

  // --- OPORTUNIDADES (from actions) ---
  const oportunidades = ctx.actions
    .filter((a) => a.priority === 'high')
    .slice(0, mode === 'quick' ? 2 : 3)
    .map((a) => `${a.title}: ${a.action}`)

  // --- NIVEL DE CONFIANZA ---
  const highSignals = ctx.signals.filter((s) => s.confidence === 'high').length
  const evidenceCount = ev.length
  let confidenceLabel: 'Alta' | 'Media' | 'Baja'
  let confidenceScore: number
  let justificacion: string

  if (evidenceCount >= 10 && highSignals >= 2) {
    confidenceLabel = 'Alta'
    confidenceScore = 0.85
    justificacion = `${evidenceCount} registros de evidencia analizados, ${highSignals} señales de alta confianza derivadas.`
  } else if (evidenceCount >= 5) {
    confidenceLabel = 'Media'
    confidenceScore = 0.65
    justificacion = `${evidenceCount} registros disponibles. Se requiere información de mercado adicional para aumentar confianza.`
  } else {
    confidenceLabel = 'Baja'
    confidenceScore = 0.4
    justificacion = 'Cobertura de datos insuficiente para inferencias de alta confianza.'
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
  }
}

export async function generateExecutiveReasoning(
  input: ReasoningRequest
): Promise<ReasoningResponse> {
  const mode = input.reasoningMode ?? 'standard'

  if (input.context.intelligence) {
    return buildExecutiveResponse(input.question, input.context.intelligence, mode)
  }

  // No intelligence context available
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
  }
}
