type PrcLayer = 'edification' | 'land_use'
type ValuationLayer = 'edificacion' | 'uso_suelo'

type ParsedPrcRow = {
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

type PrcRow = ParsedPrcRow & {
  source_feature_id: string
  layer_type: ValuationLayer
  feature_name: string
  description: string | null
  source_map_id: string
  source_observed_at: string
}

const OFFICIAL_VIEWER = 'https://vitacura.cl/municipalidad/planificacion-urbana/visor-interactivo-prcv/'
const SOURCE_VERSION_FALLBACK = 'vitacura-prcv-current'

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

function hex(buffer: ArrayBuffer) {
  return [...new Uint8Array(buffer)].map((value) => value.toString(16).padStart(2, '0')).join('')
}

async function versionFor(rows: ParsedPrcRow[]) {
  const canonical = [...rows]
    .sort((a, b) => a.ext_feature_id.localeCompare(b.ext_feature_id))
    .map((row) => ({
      id: row.ext_feature_id,
      zona: row.zona,
      subzona: row.subzona,
      uso: row.uso,
      uso_suelo: row.uso_suelo,
      raw_properties: row.raw_properties,
      geometry: row.geometry,
    }))
  const bytes = new TextEncoder().encode(JSON.stringify(canonical))
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return `vitacura-prcv-${hex(digest).slice(0, 16)}`
}

export function parseVitacuraPrcKml(kml: string, layer: PrcLayer): ParsedPrcRow[] {
  const placemarks = [...kml.matchAll(/<Placemark(?:\s[^>]*)?>([\s\S]*?)<\/Placemark>/gi)]
  const grouped = new Map<string, ParsedPrcRow>()

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
      source_version: SOURCE_VERSION_FALLBACK,
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
  const batches: Array<{ layer: PrcLayer; mid: string; rows: ParsedPrcRow[]; status: number; bytes: number }> = []

  for (const source of SOURCES) {
    const url = `https://www.google.com/maps/d/kml?mid=${source.mid}&forcekml=1`
    const response = await fetch(url, {
      cache: 'no-store',
      headers: {
        Accept: 'application/vnd.google-earth.kml+xml, application/xml, text/xml, */*',
        Referer: OFFICIAL_VIEWER,
        'User-Agent': 'PropertyPartners-PRC-Snapshot/1.0',
      },
      signal: AbortSignal.timeout(20000),
    })
    const text = await response.text()
    if (!response.ok) throw new Error(`PRC ${source.layer} source failed with ${response.status}`)
    const parsed = parseVitacuraPrcKml(text, source.layer)
    if (!parsed.length) throw new Error(`PRC ${source.layer} source returned no polygon rows`)
    batches.push({ layer: source.layer, mid: source.mid, rows: parsed, status: response.status, bytes: text.length })
  }

  const parsedRows = batches.flatMap((batch) => batch.rows)
  const sourceVersion = await versionFor(parsedRows)
  const sourceObservedAt = new Date().toISOString()
  const rows: PrcRow[] = batches.flatMap((batch) => batch.rows.map((row) => {
    const description = typeof row.raw_properties.description === 'string' ? row.raw_properties.description : null
    return {
      ...row,
      source_version: sourceVersion,
      source_feature_id: row.ext_feature_id,
      layer_type: batch.layer === 'edification' ? 'edificacion' : 'uso_suelo',
      feature_name: batch.layer === 'land_use' ? row.uso ?? row.zona : row.zona,
      description,
      source_map_id: batch.mid,
      source_observed_at: sourceObservedAt,
    }
  }))
  const diagnostics = batches.map((batch) => ({
    layer: batch.layer,
    status: batch.status,
    bytes: batch.bytes,
    rows: batch.rows.length,
  }))

  return { rows, diagnostics, officialViewer: OFFICIAL_VIEWER, sourceVersion, sourceObservedAt }
}
