type PrcLayer = 'edification' | 'land_use'

type PrcRow = {
  ext_feature_id: string
  zona_prc: string
  zona: string
  subzona: string
  uso: string | null
  uso_suelo: string | null
  source_url: string
  source_version: string
  raw_properties: Record<string, unknown>
  geometry: { type: 'MultiPolygon'; coordinates: number[][][][] }
}

const OFFICIAL_VIEWER = 'https://vitacura.cl/municipalidad/planificacion-urbana/visor-interactivo-prcv/'
const SOURCE_VERSION = 'vitacura-prcv-current'

const SOURCES: Array<{ layer: PrcLayer; mid: string }> = [
  { layer: 'edification', mid: '1c01sgZ9vUTm7sJVd8oz9cfv9hH3-9kYT' },
  { layer: 'land_use', mid: '1HvsC09ycddCXYMDVJMasi5c_HQliaBKB' },
]

function decodeXml(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

function plainText(value: string) {
  return decodeXml(value).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function tag(block: string, name: string) {
  const match = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, 'i'))
  return match ? plainText(match[1]) : ''
}

function inferZone(layer: PrcLayer, text: string) {
  const normalized = text.replace(/[–—]/g, '-')
  const pattern = layer === 'edification'
    ? /\b(E-(?:Ab|Am|Aa|Ae|Ee|e)[A-Za-z0-9.-]*)\b/i
    : /\b(U-[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*)\b/i
  const match = normalized.match(pattern)
  return match?.[1]?.replace(/[.,;:]$/, '') ?? null
}

function inferSubzone(text: string) {
  const match = text.match(/\bsubzona\s*[:#-]?\s*([A-Za-z0-9.-]+)/i)
  return match?.[1] ?? ''
}

function coordinateRings(block: string) {
  const matches = [...block.matchAll(/<coordinates[^>]*>([\s\S]*?)<\/coordinates>/gi)]
  return matches.map((match) => {
    const points = decodeXml(match[1])
      .trim()
      .split(/\s+/)
      .map((token) => token.split(',').slice(0, 2).map(Number))
      .filter((point) => point.length === 2 && point.every(Number.isFinite))
    if (points.length < 4) return null
    const first = points[0]
    const last = points[points.length - 1]
    if (first[0] !== last[0] || first[1] !== last[1]) points.push([...first])
    return points
  }).filter((ring): ring is number[][] => Boolean(ring))
}

export function parseVitacuraPrcKml(kml: string, layer: PrcLayer): PrcRow[] {
  const placemarks = [...kml.matchAll(/<Placemark(?:\s[^>]*)?>([\s\S]*?)<\/Placemark>/gi)]
  const grouped = new Map<string, PrcRow>()

  for (const [, block] of placemarks) {
    const name = tag(block, 'name')
    const description = tag(block, 'description')
    const text = `${name} ${description}`.trim()
    const zona = inferZone(layer, text)
    const rings = coordinateRings(block)
    if (!zona || !rings.length) continue

    const subzona = inferSubzone(text)
    const key = `${layer}:${zona.toLowerCase()}:${subzona.toLowerCase()}`
    const polygons = rings.map((ring) => [ring])
    const existing = grouped.get(key)
    if (existing) {
      existing.geometry.coordinates.push(...polygons)
      const labels = existing.raw_properties.labels as string[]
      if (name && !labels.includes(name)) labels.push(name)
      continue
    }

    grouped.set(key, {
      ext_feature_id: key,
      zona_prc: zona,
      zona,
      subzona,
      uso: layer === 'land_use' ? name || description || zona : null,
      uso_suelo: layer === 'land_use' ? name || description || zona : null,
      source_url: OFFICIAL_VIEWER,
      source_version: SOURCE_VERSION,
      raw_properties: {
        sourceLayer: layer,
        labels: name ? [name] : [],
        description: description || null,
        mapProvider: 'Google My Maps',
      },
      geometry: { type: 'MultiPolygon', coordinates: polygons },
    })
  }

  return [...grouped.values()]
}

export async function fetchVitacuraPrcRows() {
  const rows: PrcRow[] = []
  const diagnostics: Array<{ layer: PrcLayer; status: number; bytes: number; rows: number }> = []

  for (const source of SOURCES) {
    const url = `https://www.google.com/maps/d/kml?mid=${source.mid}&forcekml=1`
    const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(20000) })
    const text = await response.text()
    if (!response.ok) throw new Error(`PRC ${source.layer} source failed with ${response.status}`)
    const parsed = parseVitacuraPrcKml(text, source.layer)
    diagnostics.push({ layer: source.layer, status: response.status, bytes: text.length, rows: parsed.length })
    rows.push(...parsed)
  }

  if (!rows.length) throw new Error('PRC sources returned no polygon rows')
  return { rows, diagnostics, officialViewer: OFFICIAL_VIEWER, sourceVersion: SOURCE_VERSION }
}
