import presentationData from '@/data/presentations-2026.json'

export type ManagementConcept =
  | 'sales'
  | 'sales_uf'
  | 'cumulative_sales'
  | 'stock'
  | 'captations'
  | 'requirements'
  | 'leads'
  | 'visits'
  | 'follow_up'
  | 'conversion'
  | 'management_score'
  | 'portfolio_score'
  | 'goal'
  | 'compliance'
  | 'mom'
  | 'yoy'
  | 'ranking'
  | 'alert'
  | 'unknown'

export type FormulaCandidate = {
  kind: 'explicit' | 'derived' | 'relationship'
  expression: string
  variables: string[]
  confidence: 'high' | 'medium' | 'low'
  reason: string
}

export type SlideAnalysis = {
  deck: string
  slide: number
  title: string
  sourcePath: string
  rawText: string
  concepts: ManagementConcept[]
  numbers: string[]
  periods: string[]
  formulaCandidates: FormulaCandidate[]
  interpretation: string[]
  questions: string[]
  quality: {
    hasText: boolean
    hasTableLikeData: boolean
    visualReviewRequired: boolean
    confidence: 'high' | 'medium' | 'low'
  }
}

export type PresentationAnalysis = {
  generatedAt: string
  source: 'data/presentations-2026.json'
  deckCount: number
  slideCount: number
  slides: SlideAnalysis[]
  conceptIndex: Record<string, Array<{ deck: string; slide: number; title: string }>>
  formulaIndex: Array<FormulaCandidate & { deck: string; slide: number; title: string }>
  unresolvedQuestions: Array<{ deck: string; slide: number; title: string; question: string }>
}

type UnknownRecord = Record<string, unknown>

const CONCEPT_PATTERNS: Array<[ManagementConcept, RegExp]> = [
  ['cumulative_sales', /acumulad[oa]s?|acum\.?/i],
  ['sales_uf', /venta.*uf|uf.*venta|monto.*uf/i],
  ['sales', /cierres?|ventas?|vendid[oa]s?/i],
  ['stock', /stock|cartera actual|inventario/i],
  ['captations', /captaciones?|ingresos? de propiedades|altas?/i],
  ['requirements', /requerimientos?|solicitudes?/i],
  ['leads', /leads?|prospectos?|contactos?/i],
  ['visits', /visitas?|agendamientos?/i],
  ['follow_up', /seguimiento|follow.?up/i],
  ['conversion', /conversi[oó]n|tasa de cierre/i],
  ['management_score', /gesti[oó]n|management score/i],
  ['portfolio_score', /calidad de cartera|portfolio score/i],
  ['goal', /meta|objetivo|target/i],
  ['compliance', /cumplimiento|avance.*meta|%.*meta/i],
  ['mom', /mom|mes contra mes|mensual|mes anterior/i],
  ['yoy', /yoy|año contra año|interanual|2025.*2026|2026.*2025/i],
  ['ranking', /ranking|posici[oó]n|clasificaci[oó]n/i],
  ['alert', /alerta|brecha|riesgo|cr[ií]tic[oa]/i],
]

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function scalarText(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value)
  return ''
}

function collectText(value: unknown, depth = 0): string[] {
  if (depth > 8) return []
  if (Array.isArray(value)) return value.flatMap((item) => collectText(item, depth + 1))
  if (isRecord(value)) return Object.entries(value).flatMap(([key, item]) => [key, ...collectText(item, depth + 1)])
  const text = scalarText(value).trim()
  return text ? [text] : []
}

function detectConcepts(text: string): ManagementConcept[] {
  const concepts = CONCEPT_PATTERNS.filter(([, pattern]) => pattern.test(text)).map(([concept]) => concept)
  return concepts.length ? [...new Set(concepts)] : ['unknown']
}

function detectPeriods(text: string): string[] {
  const matches = text.match(/(?:ene(?:ro)?|feb(?:rero)?|mar(?:zo)?|abr(?:il)?|may(?:o)?|jun(?:io)?|jul(?:io)?|ago(?:sto)?|sept?(?:iembre)?|oct(?:ubre)?|nov(?:iembre)?|dic(?:iembre)?)[\s./-]*(?:20\d{2})?|20\d{2}(?:[-/]\d{1,2})?/gi) ?? []
  return [...new Set(matches.map((item) => item.trim()))]
}

function detectNumbers(text: string): string[] {
  const matches = text.match(/-?\d{1,3}(?:[.\s]\d{3})*(?:,\d+)?\s*(?:%|UF|uf|d[ií]as?)?/g) ?? []
  return [...new Set(matches.map((item) => item.trim()))].slice(0, 80)
}

function formulaCandidates(text: string, concepts: ManagementConcept[]): FormulaCandidate[] {
  const candidates: FormulaCandidate[] = []
  const explicit = text.match(/[^.;\n]{0,80}(?:=|÷|\/|×|\*)[^.;\n]{0,100}/g) ?? []
  for (const expression of explicit.slice(0, 10)) {
    candidates.push({
      kind: 'explicit',
      expression: expression.trim(),
      variables: concepts.filter((item) => item !== 'unknown'),
      confidence: 'high',
      reason: 'La lámina contiene un operador o igualdad explícita.',
    })
  }

  if (concepts.includes('compliance') && concepts.includes('goal')) {
    candidates.push({
      kind: 'derived',
      expression: 'cumplimiento (%) = resultado / meta × 100',
      variables: ['resultado', 'meta'],
      confidence: 'medium',
      reason: 'La lámina relaciona resultado, meta y cumplimiento; debe confirmarse la base exacta.',
    })
  }
  if (concepts.includes('mom')) {
    candidates.push({
      kind: 'derived',
      expression: 'MoM (%) = (valor actual - valor mes anterior) / valor mes anterior × 100',
      variables: ['valor actual', 'valor mes anterior'],
      confidence: 'medium',
      reason: 'Convención estándar inferida por la referencia mensual; requiere validación contra la tabla.',
    })
  }
  if (concepts.includes('yoy')) {
    candidates.push({
      kind: 'derived',
      expression: 'YoY (%) = (valor actual - valor mismo período año anterior) / valor año anterior × 100',
      variables: ['valor actual', 'valor año anterior'],
      confidence: 'medium',
      reason: 'Convención interanual inferida; la aplicación recalcula sólo cuando existen valores base explícitos.',
    })
  }
  if (concepts.includes('conversion')) {
    candidates.push({
      kind: 'relationship',
      expression: 'conversión = resultado final / universo de oportunidades',
      variables: ['resultado final', 'universo de oportunidades'],
      confidence: 'low',
      reason: 'La presentación menciona conversión, pero el numerador y denominador deben identificarse en la lámina o ser definidos por el Cliente.',
    })
  }
  return candidates.filter((candidate, index, all) => all.findIndex((item) => item.expression === candidate.expression) === index)
}

function getSlideNumber(record: UnknownRecord, fallback: number): number {
  for (const key of ['slide', 'slideNumber', 'slide_number', 'page', 'pageNumber', 'number', 'index']) {
    const value = record[key]
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value === 'string' && /^\d+$/.test(value)) return Number(value)
  }
  return fallback
}

function getTitle(record: UnknownRecord, fallback: string): string {
  for (const key of ['title', 'slideTitle', 'slide_title', 'heading', 'name']) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return fallback
}

function looksLikeSlide(record: UnknownRecord, path: string): boolean {
  const keys = Object.keys(record).map((key) => key.toLowerCase())
  const hasSlideKey = keys.some((key) => ['slide', 'slidenumber', 'slide_number', 'page', 'pagenumber'].includes(key))
  const pathSuggestsSlide = /slides?|pages?|láminas?|laminas?/i.test(path)
  const hasContent = keys.some((key) => ['title', 'text', 'content', 'tables', 'shapes', 'rawtext', 'notes'].includes(key))
  return (hasSlideKey || pathSuggestsSlide) && hasContent
}

function deckNameFromPath(path: string, record: UnknownRecord): string {
  for (const key of ['deck', 'deckName', 'presentation', 'file', 'source', 'sourceName']) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  const segments = path.split('.').filter(Boolean)
  const slideIndex = segments.findIndex((segment) => /slides?|pages?|láminas?|laminas?/i.test(segment))
  return slideIndex > 0 ? segments[slideIndex - 1] : segments[0] || 'Presentación sin nombre'
}

function walkSlides(value: unknown, path = 'root', output: Array<{ record: UnknownRecord; path: string }> = []) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => walkSlides(item, `${path}.${index}`, output))
    return output
  }
  if (!isRecord(value)) return output
  if (looksLikeSlide(value, path)) output.push({ record: value, path })
  for (const [key, item] of Object.entries(value)) walkSlides(item, `${path}.${key}`, output)
  return output
}

function analyzeSlide(record: UnknownRecord, path: string, fallbackNumber: number): SlideAnalysis {
  const rawText = collectText(record).join(' | ').replace(/\s+/g, ' ').trim()
  const concepts = detectConcepts(rawText)
  const formulas = formulaCandidates(rawText, concepts)
  const hasTableLikeData = Array.isArray(record.tables) || /table|row|column|fila|columna/i.test(rawText)
  const visualReviewRequired = !rawText || /chart|graph|image|picture|shape|gr[aá]fic[oa]|imagen/i.test(rawText)
  const questions: string[] = []

  if (concepts.includes('conversion') && !formulas.some((item) => item.kind === 'explicit')) questions.push('Confirmar numerador, denominador y universo de la conversión.')
  if (concepts.includes('ranking')) questions.push('Confirmar fórmula, ponderaciones, desempates y exclusiones del ranking.')
  if (concepts.includes('alert')) questions.push('Confirmar umbral, severidad, responsable y plazo de resolución de cada alerta.')
  if (concepts.includes('captations')) questions.push('Confirmar qué eventos se consideran captación bruta y su fecha de reconocimiento.')
  if (visualReviewRequired) questions.push('Revisar visualmente la lámina original: puede contener información no representada en el texto extraído.')

  const interpretation = concepts.filter((item) => item !== 'unknown').map((concept) => `La lámina aporta evidencia relacionada con ${concept}.`)
  if (formulas.length) interpretation.push(`Se detectaron ${formulas.length} relaciones o fórmulas candidatas; las inferidas deben validarse antes de tratarlas como reglas oficiales.`)

  return {
    deck: deckNameFromPath(path, record),
    slide: getSlideNumber(record, fallbackNumber),
    title: getTitle(record, `Lámina ${fallbackNumber}`),
    sourcePath: path,
    rawText,
    concepts,
    numbers: detectNumbers(rawText),
    periods: detectPeriods(rawText),
    formulaCandidates: formulas,
    interpretation,
    questions: [...new Set(questions)],
    quality: {
      hasText: Boolean(rawText),
      hasTableLikeData,
      visualReviewRequired,
      confidence: !rawText ? 'low' : formulas.some((item) => item.kind === 'explicit') || hasTableLikeData ? 'high' : 'medium',
    },
  }
}

export function analyzeManagementPresentations(): PresentationAnalysis {
  const candidates = walkSlides(presentationData as unknown)
  const slides = candidates.map(({ record, path }, index) => analyzeSlide(record, path, index + 1))
    .filter((slide, index, all) => all.findIndex((item) => item.deck === slide.deck && item.slide === slide.slide && item.title === slide.title) === index)
    .sort((a, b) => a.deck.localeCompare(b.deck) || a.slide - b.slide)

  const conceptIndex: PresentationAnalysis['conceptIndex'] = {}
  const formulaIndex: PresentationAnalysis['formulaIndex'] = []
  const unresolvedQuestions: PresentationAnalysis['unresolvedQuestions'] = []

  for (const slide of slides) {
    for (const concept of slide.concepts) {
      if (!conceptIndex[concept]) conceptIndex[concept] = []
      conceptIndex[concept].push({ deck: slide.deck, slide: slide.slide, title: slide.title })
    }
    for (const formula of slide.formulaCandidates) formulaIndex.push({ ...formula, deck: slide.deck, slide: slide.slide, title: slide.title })
    for (const question of slide.questions) unresolvedQuestions.push({ deck: slide.deck, slide: slide.slide, title: slide.title, question })
  }

  return {
    generatedAt: new Date().toISOString(),
    source: 'data/presentations-2026.json',
    deckCount: new Set(slides.map((slide) => slide.deck)).size,
    slideCount: slides.length,
    slides,
    conceptIndex,
    formulaIndex,
    unresolvedQuestions,
  }
}

export function findPresentationEvidence(query: string, limit = 30): SlideAnalysis[] {
  const normalized = query.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
  if (!normalized) return []
  const tokens = normalized.split(/\s+/).filter((token) => token.length > 2)
  return analyzeManagementPresentations().slides
    .map((slide) => {
      const haystack = `${slide.deck} ${slide.title} ${slide.rawText} ${slide.concepts.join(' ')}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
      const score = tokens.reduce((total, token) => total + (haystack.includes(token) ? 1 : 0), 0)
      return { slide, score }
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.slide.slide - b.slide.slide)
    .slice(0, Math.max(1, Math.min(limit, 100)))
    .map((item) => item.slide)
}
