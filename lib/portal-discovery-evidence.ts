/** Source evidence that prevents an unverified Portal response from becoming a complete inventory. */
export function extractPortalReportedCount(html: string): number | null {
  const visible = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/\s+/g, ' ')
  const match = visible.match(/(?:^|\s)(\d{1,3}(?:[.,\s]\d{3})+|\d{2,7})\s+resultados?\b/i)
  if (!match?.[1]) return null
  const n = Number(match[1].replace(/[^\d]/g, ''))
  return Number.isSafeInteger(n) && n >= 30 && n <= 100_000 ? n : null
}
export function portalChallengeDetected(html: string): boolean {
  return /suspicious-traffic-frontend|suspicious traffic|account-verification|verify you are human|captcha.challenge|access denied/i.test(html)
}
export function portalExplicitNoResults(html: string): boolean {
  return /sin resultados|no (?:se encontraron|encontramos|hay|existen) (?:[^<]{0,90} )?resultados|no encontramos propiedades|no hay inmuebles/i.test(html)
}
export type PortalPageDecisionInput = {
  candidateCount: number
  newlyDiscovered: number
  uniqueTotal: number
  publishedTotal: number | null
  pageSize: number
  challenge: boolean
  explicitNoResults: boolean
}
export function decidePortalPageCompletion(input: PortalPageDecisionInput): 'continue' | 'exhausted' {
  const published = input.publishedTotal
  const sourceCoverage = published != null && published > 0
    && input.uniqueTotal >= published * 0.97
    && input.uniqueTotal <= published * 1.05

  if (input.candidateCount === 0) {
    if (input.challenge) throw new Error('PORTAL_SOURCE_CHALLENGE')
    if (input.uniqueTotal >= 30 && (input.explicitNoResults || sourceCoverage)) return 'exhausted'
    throw new Error('PORTAL_UNVERIFIED_EMPTY_PAGE')
  }
  if (input.newlyDiscovered <= 0) {
    // Repeated search pages can be a cache/challenge response, not pagination exhaustion.
    throw new Error('PORTAL_REPEATED_PAGE_UNVERIFIED')
  }
  if (published != null && input.uniqueTotal >= published && sourceCoverage) return 'exhausted'
  if (input.candidateCount < input.pageSize && sourceCoverage) return 'exhausted'
  return 'continue'
}
