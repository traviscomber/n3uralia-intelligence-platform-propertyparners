export type PedroPabloRoute = 'fast-track' | 'full-agentic'

export type PedroPabloDomain =
  | 'management'
  | 'tasks'
  | 'valuations'
  | 'properties'
  | 'reports'
  | 'market'
  | 'cross-domain'

export type PedroPabloRoutingDecision = {
  route: PedroPabloRoute
  domains: PedroPabloDomain[]
  reason: string
  maxEvidenceItems: number
}

const normalize = (value: string) =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()

const DOMAIN_TERMS: Array<[PedroPabloDomain, readonly string[]]> = [
  ['tasks', ['tarea', 'pendiente', 'vencid', 'seguimiento']],
  ['valuations', ['valoriza', 'tasacion', 'tasar', 'comparable', 'precio por m2', 'precio/m2']],
  ['properties', ['propiedad', 'cartera', 'inmueble', 'identidad', 'vigencia']],
  ['reports', ['reporte', 'informe', 'entrega', 'envio']],
  ['market', ['mercado', 'oferta', 'absorcion', 'competencia', 'portal', 'cbrs', 'liquidez', 'precio de salida', 'descuento', 'dias en mercado', 'microzona', 'lo curro', 'santa maria', 'tabancura', 'jardines del este']],
  ['management', ['desempen', 'rendimiento', 'cumplimiento', 'meta', 'oficina', 'equipo', 'venta']],
]

const AGENTIC_TERMS = [
  'por que',
  'porque',
  'que requiere',
  'que deberia',
  'que importa',
  'prioriza',
  'prioridad',
  'comparar',
  'compara',
  'riesgo',
  'bloque',
  'detenid',
  'estancad',
  'investiga',
  'analiza',
  'cruza',
  'cambio',
  'desde ayer',
  'esta semana',
  'causa',
  'precio de salida',
  'liquidez',
  'estrategia',
  'negoci',
  'microzona',
  'due diligence',
]

export function routePedroPabloPrompt(prompt: string): PedroPabloRoutingDecision {
  const text = normalize(prompt)
  const domains = DOMAIN_TERMS
    .filter(([, terms]) => terms.some((term) => text.includes(term)))
    .map(([domain]) => domain)

  const uniqueDomains = [...new Set(domains)]
  const crossDomain = uniqueDomains.length > 1
  const asksForSynthesis = AGENTIC_TERMS.some((term) => text.includes(term))
  const longQuestion = text.length > 140

  if (crossDomain || asksForSynthesis || longQuestion) {
    return {
      route: 'full-agentic',
      domains: crossDomain ? [...uniqueDomains, 'cross-domain'] : (uniqueDomains.length ? uniqueDomains : ['cross-domain']),
      reason: crossDomain
        ? 'La consulta cruza más de un dominio operacional y requiere sintetizar evidencia.'
        : 'La consulta pide diagnóstico, priorización o causalidad; requiere investigación multi-step.',
      maxEvidenceItems: 12,
    }
  }

  return {
    route: 'fast-track',
    domains: uniqueDomains.length ? uniqueDomains : ['management'],
    reason: 'La consulta puede resolverse con el contexto canónico directo y autorizado.',
    maxEvidenceItems: 6,
  }
}
