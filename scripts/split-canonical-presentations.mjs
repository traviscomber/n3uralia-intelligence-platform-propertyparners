import fs from 'node:fs'
import path from 'node:path'

const inputPath = path.resolve('data/presentations-2026.json')
const outputRoot = path.resolve('data/presentations-2026-split')
const raw = JSON.parse(fs.readFileSync(inputPath, 'utf8'))

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
    slides: [],
  }

  for (const [slideIndex, slide] of slides.entries()) {
    const page = slideIndex + 1
    const fileName = `slide-${String(page).padStart(3, '0')}.json`
    const payload = {
      presentation: { index: deckIndex + 1, name, slug, metadata },
      canonicalPage: page,
      slide: { canonicalPage: page, ...slide },
    }
    fs.writeFileSync(path.join(directory, fileName), `${JSON.stringify(payload, null, 2)}\n`)
    deckManifest.slides.push(`${slug}/${fileName}`)
  }

  fs.writeFileSync(path.join(directory, 'manifest.json'), `${JSON.stringify(deckManifest, null, 2)}\n`)
  manifest.presentations.push(deckManifest)
  manifest.slideCount += slides.length
}

fs.writeFileSync(path.join(outputRoot, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
console.log(`Split ${manifest.presentationCount} presentations and ${manifest.slideCount} slides into ${outputRoot}`)
