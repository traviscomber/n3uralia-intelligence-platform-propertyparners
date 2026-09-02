export const PUBLIC_ESTIMATE_MIN_SAMPLE = 5

export type PublicCoverageLevel = 'sector' | 'vitacura'

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

export type PublicValuationCoverageOption = {
  neighborhood: string
  sampleCount: number
  coverageLevel: PublicCoverageLevel
}

export type PublicValuationEstimate = {
  estimateUf: number
  lowUf: number
  highUf: number
  medianUfM2: number
  sampleCount: number
  marketSampleCount: number
  sectorSampleCount: number
  newestObservation: string | null
  coverageLevel: PublicCoverageLevel
  referenceArea: string
  methodology: 'median-active-offer-built-uf-m2'
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

function validEvidence(rows: PublicValuationEvidenceRow[], propertyType: 'Casa') {
  return rows.filter(
    (row) =>
      row.propertyType === propertyType &&
      validNumber(row.priceUfM2) &&
      validNumber(row.builtAreaM2),
  )
}

function refineOptionalDiscrete(
  pool: PublicValuationEvidenceRow[],
  value: number | null | undefined,
  selector: (row: PublicValuationEvidenceRow) => number | null,
) {
  if (!validNumber(value)) return pool

  const measured = pool.filter((row) => validNumber(selector(row)))
  if (measured.length < PUBLIC_ESTIMATE_MIN_SAMPLE || measured.length / pool.length < 0.5) return pool

  const comparable = measured.filter((row) => Math.abs(Number(selector(row)) - Number(value)) <= 1)
  return comparable.length >= PUBLIC_ESTIMATE_MIN_SAMPLE ? comparable : pool
}

export function buildPublicCoverageOptions(rows: PublicValuationEvidenceRow[]) {
  const counts = new Map<string, number>()
  for (const row of validEvidence(rows, 'Casa')) {
    counts.set(row.neighborhood, (counts.get(row.neighborhood) ?? 0) + 1)
  }

  return Array.from(counts.entries())
    .filter(([, sampleCount]) => sampleCount >= PUBLIC_ESTIMATE_MIN_SAMPLE)
    .map(([neighborhood, sampleCount]) => ({ neighborhood, sampleCount }))
    .sort((a, b) => a.neighborhood.localeCompare(b.neighborhood, 'es'))
}

export function buildPublicVitacuraCoverageOptions(
  rows: PublicValuationEvidenceRow[],
  canonicalNeighborhoods: string[],
): PublicValuationCoverageOption[] {
  const counts = new Map<string, number>()
  for (const row of validEvidence(rows, 'Casa')) {
    counts.set(row.neighborhood, (counts.get(row.neighborhood) ?? 0) + 1)
  }

  return Array.from(new Set(canonicalNeighborhoods.filter(Boolean)))
    .sort((a, b) => a.localeCompare(b, 'es'))
    .map((neighborhood) => {
      const sampleCount = counts.get(neighborhood) ?? 0
      return {
        neighborhood,
        sampleCount,
        coverageLevel: sampleCount >= PUBLIC_ESTIMATE_MIN_SAMPLE ? 'sector' : 'vitacura',
      }
    })
}

export function buildPublicValuationEstimate(
  rows: PublicValuationEvidenceRow[],
  input: PublicValuationInput,
): PublicValuationEstimate | null {
  const vitacuraPool = validEvidence(rows, input.propertyType)
  if (vitacuraPool.length < PUBLIC_ESTIMATE_MIN_SAMPLE) return null

  const sectorPool = vitacuraPool.filter((row) => row.neighborhood === input.neighborhood)
  const coverageLevel: PublicCoverageLevel =
    sectorPool.length >= PUBLIC_ESTIMATE_MIN_SAMPLE ? 'sector' : 'vitacura'
  const territoryPool = coverageLevel === 'sector' ? sectorPool : vitacuraPool

  let pool = territoryPool

  const areaPool = pool.filter(
    (row) => row.builtAreaM2 >= input.builtAreaM2 * 0.65 && row.builtAreaM2 <= input.builtAreaM2 * 1.35,
  )
  if (areaPool.length >= PUBLIC_ESTIMATE_MIN_SAMPLE) pool = areaPool

  pool = refineOptionalDiscrete(pool, input.bedrooms, (row) => row.bedrooms)
  pool = refineOptionalDiscrete(pool, input.bathrooms, (row) => row.bathrooms)

  const rates = pool.map((row) => row.priceUfM2).sort((a, b) => a - b)
  if (rates.length < PUBLIC_ESTIMATE_MIN_SAMPLE) return null

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
    marketSampleCount: territoryPool.length,
    sectorSampleCount: sectorPool.length,
    newestObservation,
    coverageLevel,
    referenceArea: coverageLevel === 'sector' ? input.neighborhood : 'Vitacura',
    methodology: 'median-active-offer-built-uf-m2',
  }
}
