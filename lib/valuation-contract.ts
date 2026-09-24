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
  sourceType: 'CBRS' | 'Portal' | 'TocToc' | 'Cliente'
  sourceReference: string
  address: string
  neighborhood: string
  transactionDate?: string
  distanceMeters?: number
  propertyType: 'Casa' | 'Departamento'
  totalAreaM2?: number
  usefulAreaM2?: number
  builtAreaM2?: number
  landAreaM2?: number
  bedrooms?: number
  bathrooms?: number
  parkingSpaces?: number
  priceUf: number
  /** Persisted canonical UF/m2. The calculator derives it from source-specific area rules. */
  priceUfM2: number
  /** Retained as review evidence; methodology v2 does not use it as an economic weight. */
  similarityScore: number
  selected: boolean
  /** Retained as review evidence; methodology v2 does not auto-apply subjective adjustments. */
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
  usefulRateUfM2?: number
  builtRateUfM2?: number
  landRateUfM2?: number
  bedrooms?: number
  bathrooms?: number
  parkingSpaces?: number
  constructionYear?: number
  floorNumber?: number
}

export type MarketSummary = {
  count: number
  minPriceUf: number | null
  averagePriceUf: number | null
  medianPriceUf: number | null
  maxPriceUf: number | null
  minUfM2: number | null
  averageUfM2: number | null
  medianUfM2: number | null
  maxUfM2: number | null
}

export type PublicationScenario = {
  upliftPct: 0 | 5 | 10
  suggestedPriceUf: number
  suggestedUfM2: number
  varianceVsOfferMaxPct: number | null
  varianceVsOfferAveragePct: number | null
  varianceUfM2VsOfferMaxPct: number | null
  varianceUfM2VsOfferAveragePct: number | null
}

export type ValuationResult = {
  methodologyVersion: 'property-partners-valuation-v2'
  baseUfM2: number
  baseValueUf: number
  qualitativeAdjustmentPct: number
  adjustedValueUf: number
  lowValueUf: number
  highValueUf: number
  comparableCount: number
  portalSummary: MarketSummary
  cbrsSummary: MarketSummary
  commercialUfM2: number
  salePriceVarianceVsCbrsMaxPct: number | null
  salePriceVarianceVsCbrsAveragePct: number | null
  saleUfM2VarianceVsCbrsMaxPct: number | null
  saleUfM2VarianceVsCbrsAveragePct: number | null
  publicationScenarios: PublicationScenario[]
  warnings: string[]
  justification: string
}

const round = (value: number, digits = 2) => Number(value.toFixed(digits))
const positive = (value: number | undefined) => Number.isFinite(value) && Number(value) > 0 ? Number(value) : 0
const ratioVariance = (value: number, benchmark: number | null) => benchmark && benchmark > 0 ? round(value / benchmark - 1, 4) : null
const MIN_SELECTED_COMPARABLES = 3

function median(values: number[]) {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle]
}

function summarize(values: Array<{ priceUf: number; ufM2: number }>): MarketSummary {
  if (!values.length) {
    return {
      count: 0,
      minPriceUf: null,
      averagePriceUf: null,
      medianPriceUf: null,
      maxPriceUf: null,
      minUfM2: null,
      averageUfM2: null,
      medianUfM2: null,
      maxUfM2: null,
    }
  }
  const prices = values.map((item) => item.priceUf)
  const unit = values.map((item) => item.ufM2)
  return {
    count: values.length,
    minPriceUf: round(Math.min(...prices)),
    averagePriceUf: round(prices.reduce((sum, value) => sum + value, 0) / prices.length),
    medianPriceUf: round(median(prices) ?? 0),
    maxPriceUf: round(Math.max(...prices)),
    minUfM2: round(Math.min(...unit)),
    averageUfM2: round(unit.reduce((sum, value) => sum + value, 0) / unit.length),
    medianUfM2: round(median(unit) ?? 0),
    maxUfM2: round(Math.max(...unit)),
  }
}

export function calculateCanonicalComparableUfM2(item: ValuationComparable): number {
  const price = positive(item.priceUf)
  if (!price) return 0

  if (item.propertyType === 'Casa') {
    const weightedArea = positive(item.builtAreaM2) + positive(item.landAreaM2) / 4
    return weightedArea > 0 ? round(price / weightedArea) : 0
  }

  if (item.sourceType === 'CBRS') {
    // Some imported CBRS department records expose their source area through
    // built_area_m2. Until the source semantics are audited, use the available
    // registered area for arithmetic without relabeling it as definitively useful.
    const registeredArea = positive(item.usefulAreaM2) || positive(item.builtAreaM2)
    return registeredArea > 0 ? round(price / registeredArea) : 0
  }

  const useful = positive(item.usefulAreaM2)
  const total = positive(item.totalAreaM2)
  const weightedArea = useful > 0 && total >= useful ? useful + (total - useful) / 2 : 0
  return weightedArea > 0 ? round(price / weightedArea) : 0
}

function calculateCommercialValue(subject: ValuationSubject) {
  if (subject.propertyType === 'Departamento') {
    const useful = positive(subject.usefulAreaM2)
    const rate = positive(subject.usefulRateUfM2)
    if (!useful || !rate) throw new Error('Departamento: se requieren m² útiles y UF/m² útil de valorización.')
    return {
      valueUf: round(useful * rate),
      commercialUfM2: round(rate),
      comparisonAreaM2: useful + positive(subject.terraceAreaM2) / 2,
    }
  }

  const built = positive(subject.builtAreaM2)
  const land = positive(subject.landAreaM2)
  const builtRate = positive(subject.builtRateUfM2)
  const landRate = positive(subject.landRateUfM2)
  if ((!built || !builtRate) && (!land || !landRate)) throw new Error('Casa: se requiere al menos una superficie con su UF/m² de valorización.')
  const valueUf = built * builtRate + land * landRate
  const comparisonAreaM2 = built + land / 4
  if (comparisonAreaM2 <= 0) throw new Error('Casa: la superficie ponderada debe ser mayor que cero.')
  return { valueUf: round(valueUf), commercialUfM2: round(valueUf / comparisonAreaM2), comparisonAreaM2 }
}

export function calculateContractualValuation(
  subject: ValuationSubject,
  comparables: ValuationComparable[],
  _factors: QualitativeFactors,
): ValuationResult {
  const selected = comparables.filter((item) => item.selected && item.priceUf > 0)
  if (selected.length < MIN_SELECTED_COMPARABLES) throw new Error('Se requieren al menos tres comparables seleccionados.')

  const normalized = selected
    .map((item) => ({ item, ufM2: calculateCanonicalComparableUfM2(item) }))
    .filter(({ ufM2 }) => ufM2 > 0)
  if (normalized.length < MIN_SELECTED_COMPARABLES) throw new Error('Se requieren al menos tres comparables con superficies suficientes para calcular UF/m² canónico.')

  const commercial = calculateCommercialValue(subject)
  const portalValues = normalized
    .filter(({ item }) => item.sourceType === 'Portal' || item.sourceType === 'TocToc')
    .map(({ item, ufM2 }) => ({ priceUf: item.priceUf, ufM2 }))
  const cbrsValues = normalized
    .filter(({ item }) => item.sourceType === 'CBRS')
    .map(({ item, ufM2 }) => ({ priceUf: item.priceUf, ufM2 }))

  const portalSummary = summarize(portalValues)
  const cbrsSummary = summarize(cbrsValues)
  const publicationScenarios: PublicationScenario[] = ([0, 5, 10] as const).map((upliftPct) => {
    const suggestedPriceUf = round(commercial.valueUf / (1 - upliftPct / 100))
    const suggestedUfM2 = commercial.comparisonAreaM2 > 0 ? round(suggestedPriceUf / commercial.comparisonAreaM2) : 0
    return {
      upliftPct,
      suggestedPriceUf,
      suggestedUfM2,
      varianceVsOfferMaxPct: ratioVariance(suggestedPriceUf, portalSummary.maxPriceUf),
      varianceVsOfferAveragePct: ratioVariance(suggestedPriceUf, portalSummary.averagePriceUf),
      varianceUfM2VsOfferMaxPct: ratioVariance(suggestedUfM2, portalSummary.maxUfM2),
      varianceUfM2VsOfferAveragePct: ratioVariance(suggestedUfM2, portalSummary.averageUfM2),
    }
  })

  const warnings: string[] = []
  if (!portalSummary.count) warnings.push('Sin comparables de oferta Portal/TocToc seleccionados.')
  if (!cbrsSummary.count) warnings.push('Sin ventas CBRS seleccionadas para contraste.')
  if (portalSummary.count < 3) warnings.push('La muestra de oferta tiene menos de tres comparables.')
  if (cbrsSummary.count < 3) warnings.push('La muestra CBRS tiene menos de tres ventas comparables.')
  if (selected.length > 5) warnings.push('La muestra supera cinco comparables; debe documentarse por qué la evidencia adicional mejora calidad o confianza.')

  const justification = subject.propertyType === 'Departamento'
    ? `Metodología canónica Property Partners para departamentos: valor comercial = m² útiles × UF/m² útil definido por el valorizador; oferta comparada con m² útiles + 50% de terraza y CBRS con la superficie registrada en la fuente canónica.`
    : `Metodología canónica Property Partners para casas: valor comercial = m² construidos × UF/m² construido + m² terreno × UF/m² terreno; comparables expresados sobre m² construidos + terreno/4.`

  return {
    methodologyVersion: 'property-partners-valuation-v2',
    baseUfM2: commercial.commercialUfM2,
    baseValueUf: commercial.valueUf,
    qualitativeAdjustmentPct: 0,
    adjustedValueUf: commercial.valueUf,
    lowValueUf: commercial.valueUf,
    highValueUf: commercial.valueUf,
    comparableCount: normalized.length,
    portalSummary,
    cbrsSummary,
    commercialUfM2: commercial.commercialUfM2,
    salePriceVarianceVsCbrsMaxPct: ratioVariance(commercial.valueUf, cbrsSummary.maxPriceUf),
    salePriceVarianceVsCbrsAveragePct: ratioVariance(commercial.valueUf, cbrsSummary.averagePriceUf),
    saleUfM2VarianceVsCbrsMaxPct: ratioVariance(commercial.commercialUfM2, cbrsSummary.maxUfM2),
    saleUfM2VarianceVsCbrsAveragePct: ratioVariance(commercial.commercialUfM2, cbrsSummary.averageUfM2),
    publicationScenarios,
    warnings,
    justification,
  }
}

export function buildValuationReportPayload(subject: ValuationSubject, comparables: ValuationComparable[], factors: QualitativeFactors, result: ValuationResult) {
  return {
    methodologyVersion: result.methodologyVersion,
    generatedAt: new Date().toISOString(),
    subject,
    comparables: comparables.filter((item) => item.selected).map((item) => ({
      ...item,
      canonicalUfM2: calculateCanonicalComparableUfM2(item),
    })),
    qualitativeFactors: factors,
    qualitativeFactorsPolicy: 'review_evidence_only_no_automatic_economic_adjustment',
    result,
    disclosure: 'Valorización basada en las plantillas canónicas Property Partners para casas y departamentos. Comparables, fuentes, fórmulas y escenarios quedan trazables y sujetos a revisión humana.',
  }
}
