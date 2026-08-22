import {
  calculateCanonicalComparableUfM2,
  type ValuationComparable,
} from './valuation-contract'

export type ComparableWorkbenchSignal = {
  id: string
  score: number
  tier: 'Prioritario' | 'Útil' | 'Revisar'
  canonicalUfM2: number
  deviationPct: number | null
  isOutlier: boolean
  strengths: string[]
  risks: string[]
}

function median(values: number[]) {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle]
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)))
}

export function buildComparableWorkbench(comparables: ValuationComparable[]): ComparableWorkbenchSignal[] {
  const canonical = comparables.map((item) => ({
    item,
    ufM2: calculateCanonicalComparableUfM2(item),
  }))
  const center = median(canonical.map(({ ufM2 }) => ufM2).filter((value) => value > 0))

  return canonical.map(({ item, ufM2 }) => {
    const deviationPct = center && ufM2 > 0
      ? Number(((ufM2 / center - 1) * 100).toFixed(1))
      : null
    const isOutlier = deviationPct != null && Math.abs(deviationPct) > 35
    const strengths: string[] = []
    const risks: string[] = []

    let score = 0
    if (ufM2 > 0) {
      score += 25
      strengths.push('UF/m² canónico calculable')
    } else {
      risks.push('Falta superficie o precio suficiente')
    }
    if (item.sourceReference.trim()) score += 10
    else risks.push('Sin referencia trazable')
    if (item.address.trim()) score += 10
    else risks.push('Sin dirección')
    if (item.distanceMeters != null && item.distanceMeters > 0) {
      if (item.distanceMeters <= 1_000) {
        score += 20
        strengths.push('A menos de 1 km')
      } else if (item.distanceMeters <= 3_000) {
        score += 10
        strengths.push('A menos de 3 km')
      } else {
        risks.push('Distancia superior a 3 km')
      }
    } else {
      risks.push('Distancia no disponible')
    }

    score += Math.round(Math.max(0, Math.min(1, item.similarityScore)) * 20)
    if (item.similarityScore >= 0.75) strengths.push('Alta similitud operacional')
    else if (item.similarityScore < 0.5) risks.push('Similitud operacional baja')

    if (item.sourceType === 'CBRS') {
      if (item.transactionDate) {
        score += 15
        strengths.push('Venta con fecha')
      } else {
        risks.push('Venta sin fecha')
      }
    } else {
      score += 10
      strengths.push('Oferta de mercado')
    }

    if (isOutlier) {
      score -= 25
      risks.push(`UF/m² se desvía ${Math.abs(deviationPct ?? 0).toLocaleString('es-CL')}% de la mediana`)
    } else if (deviationPct != null) {
      strengths.push('Dentro del rango central')
    }

    const normalizedScore = clampScore(score)
    const tier: ComparableWorkbenchSignal['tier'] = normalizedScore >= 75
      ? 'Prioritario'
      : normalizedScore >= 55
        ? 'Útil'
        : 'Revisar'

    return {
      id: item.id,
      score: normalizedScore,
      tier,
      canonicalUfM2: ufM2,
      deviationPct,
      isOutlier,
      strengths,
      risks,
    }
  })
}
