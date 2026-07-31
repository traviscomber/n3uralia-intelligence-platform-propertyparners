import fs from 'node:fs'
import path from 'node:path'

const inputPath = path.resolve('data/presentations-2026.json')
const outputRoot = path.resolve('data/presentations-2026-split')
const raw = JSON.parse(fs.readFileSync(inputPath, 'utf8'))

function asArray(value) {
  return Array.isArray(value) ? value : []
}

function resolveDecks(value) {
  if (Array.isArray(value)) return value
  for (const key of ['presentations', 'decks', 'documents', 'items']) {
    if (Array.isArray(value?.[key])) return value[key]
  }
  throw new Error('Unable to locate presentation array in canonical corpus')
}

function resolveSlides(deck) {
  for (const key of ['slides', 'pages', 'items']) {
    if (Array.isArray(deck?.[key])) return deck[key]
  }
  return []
}

function deckName(deck, index) {
  return String(deck?.name ?? deck?.title ?? deck?.sourceDeck ?? deck?.fileName ?? `presentation-${index + 1}`)
}

function slugify(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'presentation'
}

fs.rmSync(outputRoot, { recursive: true, force: true })
fs.mkdirSync(outputRoot, { recursive: true })

const decks = resolveDecks(raw)
const manifest = {
  generatedAt: new Date().toISOString(),
  source: 'data/presentations-2026.json',
  rootKeys: raw && !Array.isArray(raw) && typeof raw === 'object' ? Object.keys(raw) : [],
  presentationCount: decks.length,
  slideCount: 0,
  presentations: [],
}

for (const [deckIndex, deck] of decks.entries()) {
  const name = deckName(deck, deckIndex)
  const slug = `${String(deckIndex + 1).padStart(2, '0')}-${slugify(name)}`
  const slides = resolveSlides(deck)
  const directory = path.join(outputRoot, slug)
  fs.mkdirSync(directory, { recursive: true })

  const metadata = Object.fromEntries(
    Object.entries(deck ?? {}).filter(([key]) => !['slides', 'pages', 'items'].includes(key)),
  )

  const deckManifest = {
    index: deckIndex + 1,
    name,
    slug,
    slideCount: slides.length,
    metadata,
    chunks: [],
  }

  for (let start = 0; start < slides.length; start += 10) {
    const end = Math.min(start + 10, slides.length)
    const fileName = `slides-${String(start + 1).padStart(3, '0')}-${String(end).padStart(3, '0')}.json`
    const payload = {
      presentation: { index: deckIndex + 1, name, slug, metadata },
      range: { start: start + 1, end },
      slides: slides.slice(start, end).map((slide, localIndex) => ({
        canonicalPage: start + localIndex + 1,
        ...slide,
      })),
    }
    fs.writeFileSync(path.join(directory, fileName), `${JSON.stringify(payload, null, 2)}\n`)
    deckManifest.chunks.push(`${slug}/${fileName}`)
  }

  fs.writeFileSync(path.join(directory, 'manifest.json'), `${JSON.stringify(deckManifest, null, 2)}\n`)
  manifest.presentations.push(deckManifest)
  manifest.slideCount += slides.length
}

fs.writeFileSync(path.join(outputRoot, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
console.log(`Split ${manifest.presentationCount} presentations and ${manifest.slideCount} slides into ${outputRoot}`)
