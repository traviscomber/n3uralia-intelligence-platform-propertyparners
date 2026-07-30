export type QualitativeFactors = {
  condition: number
  remodeling: number
  orientation: number
  floor: number
  light: number
  view: number
  noise: number
  commercialPotential: number
}

export type ValuationComparable = {
  id: string
  sourceType: 'CBRS' | 'Portal' | 'Cliente'
  sourceReference: string
  address: string
  neighborhood: string
  transactionDate?: string
  distanceMeters?: number
  propertyType: 'Casa' | 'Departamento'
  usefulAreaM2?: number
  builtAreaM2?: number
  landAreaM2?: number
  bedrooms?: number
  bathrooms?: number
  parkingSpaces?: number
  priceUf: number
  priceUfM2: number
  similarityScore: number
  selected: boolean
  adjustmentPct: number
  adjustmentNotes?: string
}

export type ValuationSubject = {
  propertyType: 'Casa' | 'Departamento'
  address: string
  neighborhood: string
  homogeneousArea?: string
  latitude?: number
  longitude?: number
  rol?: string
  usefulAreaM2?: number
  terraceAreaM2?: number
  builtAreaM2?: number
  landAreaM2?: number
  bedrooms?: number
  bathrooms?: number
  parkingSpaces?: number
  constructionYear?: number
  floorNumber?: number
}

export type ValuationResult = {
  baseUfM2: number
  baseValueUf: number
  qualitativeAdjustmentPct: number
  adjustedValueUf: number
  lowValueUf: number
  highValueUf: number
  comparableCount: number
  justification: string
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const round = (value: number, digits = 2) => Number(value.toFixed(digits))

export function calculateQualitativeAdjustment(factors: QualitativeFactors) {
  return round(clamp(
    factors.condition +
      factors.remodeling +
      factors.orientation +
      factors.floor +
      factors.light +
      factors.view +
      factors.noise +
      factors.commercialPotential,
    -35,
    35,
  ))
}

function weightedMedian(values: Array<{ value: number; weight: number }>) {
  const ordered = [...values].sort((a, b) => a.value - b.value)
  const total = ordered.reduce((sum, item) => sum + item.weight, 0)
  let accumulated = 0
  for (const item of ordered) {
    accumulated += item.weight
    if (accumulated >= total / 2) return item.value
  }
  return ordered.at(-1)?.value ?? 0
}

export function calculateContractualValuation(
  subject: ValuationSubject,
  comparables: ValuationComparable[],
  factors: QualitativeFactors,
): ValuationResult {
  const selected = comparables.filter((item) => item.selected && item.priceUfM2 > 0)
  if (selected.length < 2) throw new Error('Se requieren al menos dos comparables seleccionados.')

  const adjustedComparableValues = selected.map((item) => ({
    value: item.priceUfM2 * (1 + item.adjustmentPct / 100),
    weight: clamp(item.similarityScore, 0.1, 1),
  }))
  const baseUfM2 = round(weightedMedian(adjustedComparableValues))

  const effectiveArea = subject.propertyType === 'Departamento'
    ? Number(subject.usefulAreaM2 ?? 0) + Number(subject.terraceAreaM2 ?? 0) * 0.5
    : Number(subject.builtAreaM2 ?? 0) + Number(subject.landAreaM2 ?? 0) * 0.2

  if (effectiveArea <= 0) throw new Error('La superficie efectiva de la propiedad debe ser mayor que cero.')

  const baseValueUf = round(baseUfM2 * effectiveArea)
  const qualitativeAdjustmentPct = calculateQualitativeAdjustment(factors)
  const adjustedValueUf = round(baseValueUf * (1 + qualitativeAdjustmentPct / 100))
  const lowValueUf = round(adjustedValueUf * 0.95)
  const highValueUf = round(adjustedValueUf * 1.05)

  const justification = [
    `Valor base determinado con ${selected.length} comparables seleccionados y mediana ponderada por similitud.`,
    `Superficie efectiva utilizada: ${round(effectiveArea)} m².`,
    `Ajuste cualitativo total: ${qualitativeAdjustmentPct}%.`,
    `Rango sugerido: ${lowValueUf.toLocaleString('es-CL')} a ${highValueUf.toLocaleString('es-CL')} UF.`,
  ].join(' ')

  return {
    baseUfM2,
    baseValueUf,
    qualitativeAdjustmentPct,
    adjustedValueUf,
    lowValueUf,
    highValueUf,
    comparableCount: selected.length,
    justification,
  }
}

export function buildValuationReportPayload(subject: ValuationSubject, comparables: ValuationComparable[], factors: QualitativeFactors, result: ValuationResult) {
  return {
    methodologyVersion: 'valuation-contract-v1',
    generatedAt: new Date().toISOString(),
    subject,
    comparables: comparables.filter((item) => item.selected),
    qualitativeFactors: factors,
    result,
    disclosure: 'Resultado orientativo sujeto a revisión y aprobación humana. La plataforma conserva fuentes, ajustes y supuestos utilizados.',
  }
}
