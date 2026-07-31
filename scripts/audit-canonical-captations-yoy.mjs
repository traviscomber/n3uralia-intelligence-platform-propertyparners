import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const source = JSON.parse(fs.readFileSync(path.join(root, 'data', 'presentations-2026.json'), 'utf8'))

const normalize = (value) => String(value ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()

const families = {
  captations: ['captacion', 'captaciones', 'captada', 'captadas', 'nueva propiedad', 'nuevas propiedades', 'incorporacion', 'incorporaciones', 'alta de propiedad', 'altas de propiedades', 'exclusiva', 'exclusivas'],
  yoy: ['2025', 'ano anterior', 'variacion anual', 'interanual', 'yoy'],
  portfolio: ['stock', 'cartera actual', 'propiedades nuevas', 'propiedades captadas'],
}

const results = Object.fromEntries(Object.keys(families).map((key) => [key, []]))
const detailedYoy = []
const portfolioEvidence = []
const selectedDirectorSlides = new Set([4, 5, 13, 14, 22, 23, 31, 32])

for (const deck of source.decks ?? []) {
  for (const slide of deck.slides ?? []) {
    const content = [
      ...(slide.texts ?? []),
      JSON.stringify(slide.tables ?? []),
      JSON.stringify(slide.charts ?? []),
      JSON.stringify(slide.notes ?? []),
    ].join(' | ')
    const normalized = normalize(content)

    for (const [family, terms] of Object.entries(families)) {
      const matches = terms.filter((term) => normalized.includes(normalize(term)))
      if (!matches.length) continue
      results[family].push({ deck: deck.file, slide: slide.index, title: slide.title, matches: [...new Set(matches)] })
    }

    if (deck.file === 'Jun_Directorio_5.pptx' && selectedDirectorSlides.has(slide.index) && normalized.includes('2025')) {
      detailedYoy.push({
        deck: deck.file,
        slide: slide.index,
        title: slide.title,
        texts: (slide.texts ?? []).filter((text) => normalize(text).includes('2025') || /venta|cierre|uf|meta|acum|jun|may/i.test(text)).slice(0, 40),
        tables: slide.tables ?? [],
        charts: slide.charts ?? [],
      })
    }

    if ((deck.file === 'Jun_Directorio_5.pptx' || deck.file === 'Q2_Directorio_1.pptx') && /Indicadores|Evolución/i.test(slide.title ?? '') && /cartera actual|stock/i.test(normalized)) {
      portfolioEvidence.push({
        deck: deck.file,
        slide: slide.index,
        title: slide.title,
        tables: slide.tables ?? [],
        chartSummaries: (slide.charts ?? []).map((chart) => ({ title: chart.title, categories: chart.categories, series: chart.series })),
      })
    }
  }
}

console.log('CANONICAL_COVERAGE_AUDIT_START')
console.log(JSON.stringify({
  source: source.source,
  counts: Object.fromEntries(Object.entries(results).map(([key, value]) => [key, value.length])),
  detailedYoy,
  portfolioEvidence,
}, null, 2))
console.log('CANONICAL_COVERAGE_AUDIT_END')
