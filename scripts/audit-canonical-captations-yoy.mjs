import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const source = JSON.parse(fs.readFileSync(path.join(root, 'data', 'presentations-2026.json'), 'utf8'))

const families = {
  captations: ['captacion', 'captaciones', 'captada', 'captadas', 'nueva propiedad', 'nuevas propiedades', 'incorporacion', 'incorporaciones', 'alta de propiedad', 'altas de propiedades', 'exclusiva', 'exclusivas'],
  yoy: ['2025', 'ano anterior', 'variacion anual', 'interanual', 'yoy'],
  portfolio: ['stock', 'cartera actual', 'propiedades nuevas', 'propiedades captadas'],
}

const normalize = (value) => String(value ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()

const results = Object.fromEntries(Object.keys(families).map((key) => [key, []]))

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
      results[family].push({
        deck: deck.file,
        slide: slide.index,
        title: slide.title,
        matches: [...new Set(matches)],
      })
    }
  }
}

console.log('CANONICAL_COVERAGE_AUDIT_START')
console.log(JSON.stringify({
  source: source.source,
  decks: source.decks?.map((deck) => ({ file: deck.file, slideCount: deck.slideCount, embeddingCount: deck.embeddingCount })),
  results,
}, null, 2))
console.log('CANONICAL_COVERAGE_AUDIT_END')
