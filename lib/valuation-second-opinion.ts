import {
  calculateCanonicalComparableUfM2,
  type ValuationComparable,
  type ValuationResult,
  type ValuationSubject,
} from './valuation-contract'

export const VALUATION_SECOND_OPINION_VERSION = 'property-partners-second-opinion-v1' as const

export type SecondOpinionFinding = {
  tone: 'attention' | 'context' | 'positive'
  title: string
  detail: string
  evidence: string
}

export type ValuationSecondOpinion = {
  version: typeof VALUATION_SECOND_OPINION_VERSION
  coverage: 'Baja' | 'Media' | 'Alta'
  findings: SecondOpinionFinding[]
  disclaimer: string
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle]
}

function formatUfM2(value: number) {
  return value.toLocaleString('es-CL', { maximumFractionDigits: 1 })
}

export function buildValuationSecondOpinion(input: {
  subject: ValuationSubject
  comparables: ValuationComparable[]
  result?: ValuationResult | null
  hasCurrentStateNotes?: boolean
}): ValuationSecondOpinion {
  const selected = input.comparables
    .filter((item) => item.selected)
    .map((item) => ({ item, ufM2: calculateCanonicalComparableUfM2(item) }))
    .filter(({ ufM2 }) => ufM2 > 0)

  const findings: SecondOpinionFinding[] = []
  const values = selected.map(({ ufM2 }) => ufM2)
  const selectedMedian = values.length ? median(values) : 0
  const minimum = values.length ? Math.min(...values) : 0
  const maximum = values.length ? Math.max(...values) : 0
  const dispersionPct = selectedMedian > 0 ? ((maximum - minimum) / selectedMedian) * 100 : 0
  const outliers = selected.filter(({ ufM2 }) => selectedMedian > 0 && Math.abs(ufM2 - selectedMedian) / selectedMedian > 0.25)
  const cbrsCount = selected.filter(({ item }) => item.sourceType === 'CBRS').length
  const offerCount = selected.filter(({ item }) => item.sourceType === 'Portal' || item.sourceType === 'TocToc').length

  if (selected.length < 3) {
    findings.push({
      tone: 'attention',
      title: 'Evidencia todavía insuficiente',
      detail: 'Selecciona al menos tres referencias.',
      evidence: `${selected.length} comparables.`,
    })
  } else {
    findings.push({
      tone: 'positive',
      title: 'Muestra suficiente',
      detail: 'Mínimo Property Partners cubierto.',
      evidence: `${selected.length} comparables.`,
    })
  }

  if (dispersionPct > 25) {
    findings.push({
      tone: 'attention',
      title: 'Dispersión alta',
      detail: 'Revisar estado, terreno o venta.',
      evidence: `${dispersionPct.toLocaleString('es-CL', { maximumFractionDigits: 1 })}% del rango sobre la mediana.`,
    })
  }

  if (outliers.length) {
    findings.push({
      tone: 'attention',
      title: 'Valores atípicos',
      detail: 'Requieren revisión de Property Partners.',
      evidence: outliers.map(({ item, ufM2 }) => `${item.address}: ${formatUfM2(ufM2)} UF/m²`).join(' · '),
    })
  }

  if (cbrsCount > 0 && offerCount === 0) {
    findings.push({
      tone: 'context',
      title: 'Solo ventas',
      detail: 'Sin contraste de oferta activa utilizable.',
      evidence: `${cbrsCount} CBRS · 0 ofertas.`,
    })
  }

  if (!input.hasCurrentStateNotes) {
    findings.push({
      tone: 'context',
      title: 'Estado sin documentar',
      detail: 'Registrar conservación o remodelaciones.',
      evidence: 'Sin observación del inmueble.',
    })
  }

  if (input.result && selectedMedian > 0) {
    const variancePct = ((input.result.commercialUfM2 - selectedMedian) / selectedMedian) * 100
    if (Math.abs(variancePct) > 20) {
      findings.push({
        tone: 'attention',
        title: 'Decisión fuera de rango',
        detail: 'Requiere justificación profesional.',
        evidence: `${variancePct > 0 ? '+' : ''}${variancePct.toLocaleString('es-CL', { maximumFractionDigits: 1 })}% frente a la mediana.`,
      })
    }
  }

  const coverage = selected.length >= 3 && cbrsCount > 0 && offerCount > 0 && input.hasCurrentStateNotes
    ? 'Alta'
    : selected.length >= 3
      ? 'Media'
      : 'Baja'

  return {
    version: VALUATION_SECOND_OPINION_VERSION,
    coverage,
    findings: findings.slice(0, 4),
    disclaimer: 'No vinculante. No modifica la valorización.',
  }
}
