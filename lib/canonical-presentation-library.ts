import corpus from '@/data/presentations-2026.json'
import semanticPages from '@/data/management-canonical-interpretation-pages-006-010.json'

type UnknownRecord = Record<string, unknown>

export type AggregationMethod =
  | 'ratio_of_totals'
  | 'average_partner_scores'
  | 'average_eligible_items'
  | 'sum_attributed_values'
  | 'sum_unique_operations'
  | 'not_defined'

export type EvaluationState = 'evaluable' | 'not_evaluable' | 'inconsistent_source'

export type CanonicalTable = {
  name: string
  rows: string[][]
}

export type CanonicalChartSeries = {
  name: string
  categories: string[]
  values: string[]
}

export type CanonicalChart = {
  name: string
  kinds: string[]
  series: CanonicalChartSeries[]
}

export type VerifiedCalculation = {
  expression: string
  result: number
  displayed: number
}

export type CanonicalInterpretation = {
  managementMeaning: string
  verifiedCalculations: VerifiedCalculation[]
  trafficLights?: Record<string, string>
  managementConclusion: string
  pendingDefinitions: string[]
}

export type SourceValidationWarning = {
  code: 'period_mismatch' | 'missing_month' | 'stale_label' | 'source_inconsistency'
  message: string
}

export type CanonicalSlide = {
  deckIndex: number
  deckFile: string
  page: number
  title: string
  backgroundColor: string | null
  texts: string[]
  tables: CanonicalTable[]
  charts: CanonicalChart[]
  notes: string[]
  sourceReference: string
  periodLabels: string[]
  validationWarnings: SourceValidationWarning[]
  interpretation: CanonicalInterpretation | null
}

export type CanonicalDeck = {
  index: number
  file: string
  slideCount: number
  mediaCount: number | null
  tableCount: number | null
  chartCount: number | null
  colors: Array<{ hex: string; uses: number }>
  slides: CanonicalSlide[]
}

export const MANAGEMENT_AGGREGATION_METHODS = {
  portfolioTarget: 'ratio_of_totals',
  requirementsBenchmark: 'average_partner_scores',
  pricingQuality: 'average_eligible_items',
  classifiedLeads: 'ratio_of_totals',
  leadsWithout90DayAbandonment: 'ratio_of_totals',
  priorityLeadsWithin15Days: 'ratio_of_totals',
  visitsAgainstTarget: 'average_partner_scores',
  completedVisitsAgainstScheduled: 'ratio_of_totals',
  sixMonthCloseRate: 'ratio_of_totals',
  attributedUf: 'sum_attributed_values',
  uniqueTransactionUf: 'sum_unique_operations',
} as const satisfies Record<string, AggregationMethod>

export function safeRatioScore(numerator: number, denominator: number, cap = 100): number | null {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) return null
  return Math.min((numerator / denominator) * 100, cap)
}

export function evaluationState(numerator: number, denominator: number): EvaluationState {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) return 'inconsistent_source'
  if (denominator <= 0) return 'not_evaluable'
  return 'evaluable'
}

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function records(value: unknown): UnknownRecord[] {
  return Array.isArray(value) ? value.filter(isRecord) : []
}

function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((item) => typeof item === 'string' || typeof item === 'number' ? String(item) : '').filter(Boolean)
    : []
}

function numeric(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function stringValue(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function findArray(record: UnknownRecord, keys: string[]): unknown[] {
  for (const key of keys) if (Array.isArray(record[key])) return record[key] as unknown[]
  return []
}

function parseTable(value: UnknownRecord, index: number): CanonicalTable {
  const rawRows = Array.isArray(value.value) ? value.value : []
  return {
    name: stringValue(value.name, `Tabla ${index + 1}`),
    rows: rawRows.map((row) => Array.isArray(row) ? row.map((cell) => cell === null || cell === undefined ? '' : String(cell)) : []),
  }
}

function parseChart(value: UnknownRecord, index: number): CanonicalChart {
  const chartValue = isRecord(value.value) ? value.value : value
  return {
    name: stringValue(value.name, `Gráfico ${index + 1}`),
    kinds: strings(chartValue.chartKinds),
    series: records(chartValue.series).map((series, seriesIndex) => ({
      name: stringValue(series.name, `Serie ${seriesIndex + 1}`),
      categories: strings(series.categories),
      values: strings(series.values),
    })),
  }
}

function parseColors(metadata: UnknownRecord): Array<{ hex: string; uses: number }> {
  const style = isRecord(metadata.style) ? metadata.style : {}
  const raw = Array.isArray(style.colors) ? style.colors : []
  return raw.flatMap((entry) => {
    if (!Array.isArray(entry) || typeof entry[0] !== 'string') return []
    const uses = typeof entry[1] === 'number' ? entry[1] : Number(entry[1])
    return [{ hex: entry[0], uses: Number.isFinite(uses) ? uses : 0 }]
  })
}

function unique(values: string[]): string[] {
  return [...new Set(values)]
}

function detectPeriodLabels(content: string): string[] {
  const matches = content.match(/(?:Ene-(?:May|Jun)|H1|Q[1-4]|May|Jun|Mar)\s*2026|(?:Ene-(?:May|Jun)|H1|Q[1-4]|May|Jun)/gi) ?? []
  return unique(matches.map((value) => value.replace(/\s+/g, ' ').trim()))
}

function validateSlidePeriod(deckFile: string, title: string, texts: string[], charts: CanonicalChart[]): SourceValidationWarning[] {
  const content = [title, ...texts].join(' ')
  const normalized = content.toLocaleLowerCase('es')
  const warnings: SourceValidationWarning[] = []

  const deckDeclaresQ2 = /q2/i.test(deckFile)
  const slideDeclaresMay = /\bmay\b|ene-may/i.test(content)
  const slideDeclaresJuneOrH1 = /\bjun\b|ene-jun|\bh1\b|\bq2\b/i.test(content)

  if (deckDeclaresQ2 && slideDeclaresMay && !slideDeclaresJuneOrH1) {
    warnings.push({
      code: 'period_mismatch',
      message: 'El archivo declara cierre Q2/H1, pero esta lámina está rotulada como mayo o Ene-May. El período debe validarse antes de usar la cifra como cierre de junio.',
    })
  }

  if (/ene\s*[·|,]\s*feb\s*[·|,]\s*mar\s*[·|,]\s*abr\s*[·|,]\s*jun/i.test(content)) {
    warnings.push({
      code: 'missing_month',
      message: 'La secuencia mensual omite mayo. Los deltas visibles deben etiquetarse como abril–junio y mayo no debe inferirse como cero.',
    })
  }

  if (deckDeclaresQ2 && /scores may|venta may|indicadores ene-may/i.test(normalized)) {
    warnings.push({
      code: 'stale_label',
      message: 'Posible rótulo desactualizado dentro de un reporte Q2. Mantener el dato, pero mostrar advertencia de período hasta reconciliar la fuente.',
    })
  }

  const chartPeriods = unique(charts.flatMap((chart) => chart.series.flatMap((series) => series.categories)))
  if (chartPeriods.some((period) => /q2 2026/i.test(period)) && slideDeclaresMay) {
    warnings.push({
      code: 'source_inconsistency',
      message: 'El gráfico embebido declara Q2 2026 mientras el título de la lámina declara mayo. Tabla, título y gráfico no son temporalmente consistentes.',
    })
  }

  return warnings
}

const semanticIndex = new Map<number, CanonicalInterpretation>(
  semanticPages.pages.map((page) => [page.page, {
    managementMeaning: page.managementMeaning,
    verifiedCalculations: page.verifiedCalculations,
    trafficLights: 'trafficLights' in page ? page.trafficLights : undefined,
    managementConclusion: page.managementConclusion,
    pendingDefinitions: page.pendingDefinitions,
  }]),
)

function parseDeck(deck: UnknownRecord, deckIndex: number): CanonicalDeck {
  const metadata = isRecord(deck.metadata) ? deck.metadata : deck
  const stats = isRecord(metadata.stats) ? metadata.stats : {}
  const file = stringValue(metadata.file, stringValue(deck.file, `Presentación ${deckIndex + 1}`))
  const slideRecords = records(findArray(deck, ['slides', 'pages', 'items']))
  const slides = slideRecords.map((slide, slideIndex): CanonicalSlide => {
    const page = numeric(slide.index) ?? numeric(slide.page) ?? slideIndex + 1
    const title = stringValue(slide.title, `Página ${slideIndex + 1}`)
    const texts = strings(slide.texts)
    const charts = records(slide.charts).map(parseChart)
    const periodLabels = detectPeriodLabels([title, ...texts].join(' '))

    return {
      deckIndex: deckIndex + 1,
      deckFile: file,
      page,
      title,
      backgroundColor: typeof slide.backgroundColor === 'string' ? slide.backgroundColor : null,
      texts,
      tables: records(slide.tables).map(parseTable),
      charts,
      notes: strings(slide.notes),
      sourceReference: `${file} · página ${page}`,
      periodLabels,
      validationWarnings: validateSlidePeriod(file, title, texts, charts),
      interpretation: deckIndex === 0 ? semanticIndex.get(page) ?? null : null,
    }
  })

  return {
    index: deckIndex + 1,
    file,
    slideCount: numeric(metadata.slideCount) ?? slides.length,
    mediaCount: numeric(metadata.mediaCount),
    tableCount: numeric(stats.tables),
    chartCount: numeric(stats.charts),
    colors: parseColors(metadata),
    slides,
  }
}

function resolveDecks(): UnknownRecord[] {
  const root = corpus as unknown
  if (Array.isArray(root)) return records(root)
  if (!isRecord(root)) return []
  return records(findArray(root, ['decks', 'presentations', 'documents', 'items']))
}

const canonicalDecks = resolveDecks().map(parseDeck)

export function getCanonicalDecks(): CanonicalDeck[] {
  return canonicalDecks
}

export function getCanonicalDeck(deckIndex: number): CanonicalDeck | null {
  return canonicalDecks.find((deck) => deck.index === deckIndex) ?? null
}

export function getCanonicalSlide(deckIndex: number, page: number): CanonicalSlide | null {
  return getCanonicalDeck(deckIndex)?.slides.find((slide) => slide.page === page) ?? null
}

export function searchCanonicalSlides(query: string, limit = 50): CanonicalSlide[] {
  const normalized = query.trim().toLocaleLowerCase('es')
  if (!normalized) return []
  return canonicalDecks
    .flatMap((deck) => deck.slides)
    .filter((slide) => [
      slide.title,
      ...slide.texts,
      ...slide.notes,
      ...slide.periodLabels,
      ...slide.validationWarnings.map((warning) => warning.message),
      slide.interpretation?.managementMeaning ?? '',
      slide.interpretation?.managementConclusion ?? '',
      ...(slide.interpretation?.pendingDefinitions ?? []),
    ].join(' ').toLocaleLowerCase('es').includes(normalized))
    .slice(0, Math.max(1, Math.min(limit, 200)))
}

export function getCanonicalLibrarySummary() {
  const slides = canonicalDecks.flatMap((deck) => deck.slides)
  return {
    status: 'canonical-with-validation' as const,
    source: 'data/presentations-2026.json' as const,
    deckCount: canonicalDecks.length,
    slideCount: slides.length,
    interpretedSlideCount: slides.filter((slide) => slide.interpretation).length,
    warningCount: slides.reduce((total, slide) => total + slide.validationWarnings.length, 0),
    slidesWithWarnings: slides.filter((slide) => slide.validationWarnings.length > 0).length,
    tableCount: slides.reduce((total, slide) => total + slide.tables.length, 0),
    chartCount: slides.reduce((total, slide) => total + slide.charts.length, 0),
    aggregationMethods: MANAGEMENT_AGGREGATION_METHODS,
    decks: canonicalDecks.map(({ slides: _slides, ...deck }) => deck),
  }
}
