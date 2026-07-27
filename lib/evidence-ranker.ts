import type { IntelligenceDomain, IntelligenceEvidence } from './n3uralia-intelligence-engine'

// Domain priority boosts — executive and crm evidence is surfaced first
// unless the question shifts the topic domain.
const DOMAIN_BASE_SCORE: Record<IntelligenceDomain, number> = {
  executive:  6,
  crm:        5,
  market:     4,
  valuation:  3,
  reports:    2,
  documents:  1,
}

// Source-class trust weights
const SOURCE_CLASS_WEIGHT: Record<string, number> = {
  client_evidence:    1.0,
  n3uralia_model:     0.9,
  n3uralia_inference: 0.8,
  external_market:    0.7,
}

// Keyword → domain affinity map for question-topic detection
const DOMAIN_KEYWORDS: Record<IntelligenceDomain, string[]> = {
  executive:  ['estrategia', 'empresa', 'dirección', 'objetivo', 'meta', 'goal', 'executive', 'kpi'],
  crm:        ['venta', 'lead', 'agente', 'captación', 'cierre', 'conversión', 'crm', 'cliente', 'negocio'],
  market:     ['mercado', 'competencia', 'precio', 'm2', 'oferta', 'demanda', 'vitacura', 'zona', 'market'],
  valuation:  ['valoriz', 'tasación', 'valor', 'precio', 'uf', 'comparable', 'valuation', 'avalúo'],
  reports:    ['reporte', 'informe', 'resumen', 'performance', 'resultado'],
  documents:  ['documento', 'presentación', 'brief', 'deck', 'slide'],
}

export type RankedEvidence = IntelligenceEvidence & { _score: number }

/**
 * Ranks evidence items by their relevance to the user's question.
 *
 * Scoring factors:
 *   1. Base domain priority (executive > crm > market > …)
 *   2. Source-class trust weight
 *   3. Keyword affinity — if the question mentions terms matching a domain,
 *      evidence from that domain receives a +4 boost
 *   4. Value presence bonus — items with a concrete numeric/string value
 *      score higher than null-value items (+1)
 *
 * Returns evidence sorted descending by score, preserving all items so
 * callers can choose their own slice.
 */
export function rankEvidence(
  evidence: IntelligenceEvidence[],
  question: string,
): RankedEvidence[] {
  const questionLower = question.toLowerCase()

  // Determine which domains the question is topically focused on
  const topicalDomains = new Set<IntelligenceDomain>()
  for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS) as [IntelligenceDomain, string[]][]) {
    if (keywords.some((kw) => questionLower.includes(kw))) {
      topicalDomains.add(domain)
    }
  }

  const scored: RankedEvidence[] = evidence.map((item) => {
    const base = DOMAIN_BASE_SCORE[item.domain] ?? 0
    const trust = SOURCE_CLASS_WEIGHT[item.sourceClass] ?? 0.5
    const topicBoost = topicalDomains.has(item.domain) ? 4 : 0
    const valueBonus = item.value !== null && item.value !== '' ? 1 : 0

    const _score = (base + topicBoost + valueBonus) * trust

    return { ...item, _score }
  })

  return scored.sort((a, b) => b._score - a._score)
}
