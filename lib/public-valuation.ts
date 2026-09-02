export const PUBLIC_ESTIMATE_MIN_SAMPLE = 5

export type PublicValuationEvidenceRow = {
  neighborhood: string
  propertyType: 'Casa'
  priceUfM2: number
  builtAreaM2: number
  bedrooms: number | null
  bathrooms: number | null
  observedAt: string | null
}

export type PublicValuationInput = {
  neighborhood: string
  propertyType: 'Casa'
  builtAreaM2: number
  bedrooms?: number | null
  bathrooms?: number | null
}

export type PublicValuationEstimate = {
  estimateUf: number
  lowUf: number
  highUf: number
  medianUfM2: number
  sampleCount: number
  marketSampleCount: number
  newestObservation: string | null
  methodology: 'median-active-offer-uf-m2'
}

function quantile(values: number[], q: number) {
  if (values.length === 0) return 0
  if (values.length === 1) return values[0]
  const position = (values.length - 1) * q
  const lower = Math.floor(position)
  const upper = Math.ceil(position)
  if (lower === upper) return values[lower]
  const weight = position - lower
  return values[lower] * (1 - weight) + values[upper] * weight
}

function roundUf(value: number) {
  return Math.max(0, Math.round(value / 10) * 10)
}

function validNumber(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

export function buildPublicCoverageOptions(rows: PublicValuationEvidenceRow[]) {
  const counts = new Map<string, number>()
  for (const row of rows) {
    if (!validNumber(row.priceUfM2) || !validNumber(row.builtAreaM2)) continue
    counts.set(row.neighborhood, (counts.get(row.neighborhood) ?? 0) + 1)
  }

  return Array.from(counts.entries())
    .filter(([, sampleCount]) => sampleCount >= PUBLIC_ESTIMATE_MIN_SAMPLE)
    .map(([neighborhood, sampleCount]) => ({ neighborhood, sampleCount }))
    .sort((a, b) => a.neighborhood.localeCompare(b.neighborhood, 'es'))
}

export function buildPublicValuationEstimate(
  rows: PublicValuationEvidenceRow[],
  input: PublicValuationInput,
): PublicValuationEstimate | null {
  const marketPool = rows.filter(
    (row) =>
      row.propertyType === input.propertyType &&
      row.neighborhood === input.neighborhood &&
      validNumber(row.priceUfM2) &&
      validNumber(row.builtAreaM2),
  )

  if (marketPool.length < PUBLIC_ESTIMATE_MIN_SAMPLE) return null

  let pool = marketPool

  const areaPool = pool.filter(
    (row) => row.builtAreaM2 >= input.builtAreaM2 * 0.65 && row.builtAreaM2 <= input.builtAreaM2 * 1.35,
  )
  if (areaPool.length >= PUBLIC_ESTIMATE_MIN_SAMPLE) pool = areaPool

  if (validNumber(input.bedrooms)) {
    const bedroomPool = pool.filter(
      (row) => row.bedrooms !== null && Math.abs(row.bedrooms - Number(input.bedrooms)) <= 1,
    )
    if (bedroomPool.length >= PUBLIC_ESTIMATE_MIN_SAMPLE) pool = bedroomPool
  }

  if (validNumber(input.bathrooms)) {
    const bathroomPool = pool.filter(
      (row) => row.bathrooms !== null && Math.abs(row.bathrooms - Number(input.bathrooms)) <= 1,
    )
    if (bathroomPool.length >= PUBLIC_ESTIMATE_MIN_SAMPLE) pool = bathroomPool
  }

  const rates = pool.map((row) => row.priceUfM2).sort((a, b) => a - b)
  const medianUfM2 = quantile(rates, 0.5)
  const lowUfM2 = quantile(rates, 0.25)
  const highUfM2 = quantile(rates, 0.75)

  const newestObservation = pool
    .map((row) => row.observedAt)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1) ?? null

  return {
    estimateUf: roundUf(medianUfM2 * input.builtAreaM2),
    lowUf: roundUf(lowUfM2 * input.builtAreaM2),
    highUf: roundUf(highUfM2 * input.builtAreaM2),
    medianUfM2: Math.round(medianUfM2 * 100) / 100,
    sampleCount: pool.length,
    marketSampleCount: marketPool.length,
    newestObservation,
    methodology: 'median-active-offer-uf-m2',
  }
}
