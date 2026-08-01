import presentationData from '@/data/presentations-2026.json'

export type CanonicalSalesComparison = {
  currentSalesCount: number | null
  previousYearSalesCount: number | null
  currentSalesUf: number | null
  previousYearSalesUf: number | null
  cumulativeSalesCount: number | null
  previousYearCumulativeSalesCount: number | null
  cumulativeSalesUf: number | null
  previousYearCumulativeSalesUf: number | null
  salesCountYoy: number | null
  salesUfYoy: number | null
  cumulativeSalesCountYoy: number | null
  cumulativeSalesUfYoy: number | null
  reportedSalesCountYoy: number | null
  reportedSalesUfYoy: number | null
  reportedCumulativeSalesCountYoy: number | null
  reportedCumulativeSalesUfYoy: number | null
  qualityNotes: string[]
  comparisonPeriod: string
  cumulativeComparisonPeriod: string
}

export type CanonicalPortfolioComparison = {
  currentStock: number | null
  previousStock: number | null
  netChange: number | null
  netChangePercent: number | null
  currentPeriod: string
  previousPeriod: string
  methodology: string
  sourceReference: string | null
}

type RawTable = Array<Array<string | number | null>>

type EntityWithRawSales = {
  name: string
  branch?: string | null
  salesSummary?: { rawTable?: RawTable }
  indicators?: { stock?: number | null }
}

const normalize = (value: unknown) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()

const parseNumber = (value: unknown, kind: 'count' | 'uf' | 'percent' = 'count') => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  const raw = String(value ?? '').trim()
  if (!raw || raw === '-') return null
  const cleaned = raw.replace(/\s/g, '').replace('%', '').replace('+', '')
  const parsed = kind === 'uf'
    ? Number(cleaned.replace(/\./g, '').replace(',', '.'))
    : Number(cleaned.replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : null
}

const calculateChange = (current: number | null, previous: number | null) =>
  current !== null && previous !== null && previous !== 0
    ? ((current - previous) / previous) * 100
    : null

const findColumn = (headers: Array<string | number | null>, candidates: string[]) => {
  const normalizedCandidates = candidates.map(normalize)
  return headers.findIndex((header) => normalizedCandidates.includes(normalize(header)))
}

const findRow = (table: RawTable, label: string) =>
  table.slice(1).find((row) => normalize(row[0]) === normalize(label)) ?? null

const valueAt = (row: Array<string | number | null> | null, index: number, kind: 'count' | 'uf' | 'percent') =>
  row && index >= 0 ? parseNumber(row[index], kind) : null

const compareReported = (label: string, calculated: number | null, reported: number | null, notes: string[]) => {
  if (calculated === null || reported === null) return
  if (Math.abs(calculated - reported) > 1.1) {
    notes.push(`${label}: YoY recalculado ${calculated.toFixed(1)}% difiere del Δ% AA informado ${reported.toFixed(1)}%.`)
  }
}

export function parseCanonicalSalesComparison(entity: EntityWithRawSales): CanonicalSalesComparison | null {
  const table = entity.salesSummary?.rawTable
  if (!table?.length || !table[0]?.length) return null

  const headers = table[0]
  const currentIndex = findColumn(headers, ['Jun 2026'])
  const previousIndex = findColumn(headers, ['Jun 2025'])
  const reportedCurrentYoyIndex = findColumn(headers, ['Δ% AA'])
  const cumulativeIndex = findColumn(headers, ['Acum 2026'])
  const cumulativePreviousIndex = findColumn(headers, ['Acum 2025'])
  const reportedCumulativeYoyIndex = headers.findIndex((header, index) => index > cumulativePreviousIndex && normalize(header) === normalize('Δ% AA'))

  if (currentIndex < 0 || previousIndex < 0 || cumulativeIndex < 0 || cumulativePreviousIndex < 0) return null

  const countRow = findRow(table, 'Cierres')
  const ufRow = findRow(table, 'UF')
  const currentSalesCount = valueAt(countRow, currentIndex, 'count')
  const previousYearSalesCount = valueAt(countRow, previousIndex, 'count')
  const currentSalesUf = valueAt(ufRow, currentIndex, 'uf')
  const previousYearSalesUf = valueAt(ufRow, previousIndex, 'uf')
  const cumulativeSalesCount = valueAt(countRow, cumulativeIndex, 'count')
  const previousYearCumulativeSalesCount = valueAt(countRow, cumulativePreviousIndex, 'count')
  const cumulativeSalesUf = valueAt(ufRow, cumulativeIndex, 'uf')
  const previousYearCumulativeSalesUf = valueAt(ufRow, cumulativePreviousIndex, 'uf')

  const salesCountYoy = calculateChange(currentSalesCount, previousYearSalesCount)
  const salesUfYoy = calculateChange(currentSalesUf, previousYearSalesUf)
  const cumulativeSalesCountYoy = calculateChange(cumulativeSalesCount, previousYearCumulativeSalesCount)
  const cumulativeSalesUfYoy = calculateChange(cumulativeSalesUf, previousYearCumulativeSalesUf)
  const reportedSalesCountYoy = valueAt(countRow, reportedCurrentYoyIndex, 'percent')
  const reportedSalesUfYoy = valueAt(ufRow, reportedCurrentYoyIndex, 'percent')
  const reportedCumulativeSalesCountYoy = valueAt(countRow, reportedCumulativeYoyIndex, 'percent')
  const reportedCumulativeSalesUfYoy = valueAt(ufRow, reportedCumulativeYoyIndex, 'percent')
  const qualityNotes: string[] = []

  compareReported('Cierres junio', salesCountYoy, reportedSalesCountYoy, qualityNotes)
  compareReported('UF junio', salesUfYoy, reportedSalesUfYoy, qualityNotes)
  compareReported('Cierres acumulados', cumulativeSalesCountYoy, reportedCumulativeSalesCountYoy, qualityNotes)
  compareReported('UF acumuladas', cumulativeSalesUfYoy, reportedCumulativeSalesUfYoy, qualityNotes)

  return {
    currentSalesCount,
    previousYearSalesCount,
    currentSalesUf,
    previousYearSalesUf,
    cumulativeSalesCount,
    previousYearCumulativeSalesCount,
    cumulativeSalesUf,
    previousYearCumulativeSalesUf,
    salesCountYoy,
    salesUfYoy,
    cumulativeSalesCountYoy,
    cumulativeSalesUfYoy,
    reportedSalesCountYoy,
    reportedSalesUfYoy,
    reportedCumulativeSalesCountYoy,
    reportedCumulativeSalesUfYoy,
    qualityNotes,
    comparisonPeriod: 'Junio 2026 vs junio 2025',
    cumulativeComparisonPeriod: 'Enero–junio 2026 vs enero–junio 2025',
  }
}

function getQ2Stock(entityName: string) {
  const deck = (presentationData.decks as Array<{
    file: string
    slides: Array<{
      index: number
      title: string
      tables: Array<{ value: RawTable }>
    }>
  }>).find((item) => item.file === 'Q2_Directorio_1.pptx')

  if (!deck) return { value: null, reference: null }
  const expectedTitle = normalize(`${entityName} — Indicadores Ene-May`)
  const sourceSlide = deck.slides.find((item) => normalize(item.title) === expectedTitle)
  const table = sourceSlide?.tables?.[0]?.value
  const stockRow = table ? findRow(table, 'Cartera actual') : null
  return {
    value: valueAt(stockRow, 1, 'count'),
    reference: sourceSlide ? `${deck.file} · lámina ${sourceSlide.index} · ${sourceSlide.title}` : null,
  }
}

export function getCanonicalPortfolioComparison(entity: EntityWithRawSales): CanonicalPortfolioComparison {
  const currentStock = entity.indicators?.stock ?? null
  const previous = getQ2Stock(entity.name)
  const netChange = currentStock !== null && previous.value !== null ? currentStock - previous.value : null
  return {
    currentStock,
    previousStock: previous.value,
    netChange,
    netChangePercent: calculateChange(currentStock, previous.value),
    currentPeriod: 'Junio 2026',
    previousPeriod: 'Mayo 2026',
    methodology: 'Variación neta de cartera entre los cortes de mayo y junio. No equivale a captaciones brutas porque incorpora altas, bajas, ventas, retiros y cambios de estado.',
    sourceReference: previous.reference,
  }
}
