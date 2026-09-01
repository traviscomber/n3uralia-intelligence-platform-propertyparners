type PrcLayer = 'edification' | 'land_use'
type ValuationLayer = 'edificacion' | 'uso_suelo'
type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }
type Position = [number, number]

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

type CanonicalFeature = {
  id: string
  name: string
  description: string | null
  rings: Position[][]
}

const OFFICIAL_VIEWER = 'https://vitacura.cl/municipalidad/planificacion-urbana/visor-interactivo-prcv/'
const SOURCE_VERSION_FALLBACK = 'vitacura-prcv-current'
const PAGE_DATA_MARKER = 'var _pageData = '

const SOURCES: Array<{ layer: PrcLayer; mid: string }> = [
  { layer: 'edification', mid: '1c01sgZ9vUTm7sJVd8oz9cfv9hH3-9kYT' },
  { layer: 'land_use', mid: '1HvsC09ycddCXYMDVJMasi5c_HQliaBKB' },
]

function extractJavascriptStringLiteral(source: string, marker: string) {
  const markerIndex = source.indexOf(marker)
  if (markerIndex < 0) throw new Error('My Maps pageData marker not found')

  let index = markerIndex + marker.length
  while (/\s/.test(source[index] ?? '')) index += 1
  if (source[index] !== '"') throw new Error('My Maps pageData is not a string literal')

  const start = index
  index += 1
  let escaped = false
  for (; index < source.length; index += 1) {
    const char = source[index]
    if (escaped) {
      escaped = false
      continue
    }
    if (char === '\\') {
      escaped = true
      continue
    }
    if (char === '"') return source.slice(start, index + 1)
  }
  throw new Error('My Maps pageData string literal is unterminated')
}

function findMfMap(value: JsonValue): JsonValue[] | null {
  if (Array.isArray(value)) {
    if (value[0] === 'mf.map') return value
    for (const child of value) {
      const found = findMfMap(child)
      if (found) return found
    }
    return null
  }
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) {
      const found = findMfMap(child)
      if (found) return found
    }
  }
  return null
}

function parsePageData(html: string) {
  const literal = extractJavascriptStringLiteral(html, PAGE_DATA_MARKER)
  const encoded = JSON.parse(literal) as string
  const data = JSON.parse(encoded) as JsonValue
  const map = findMfMap(data)
  if (!map) throw new Error('My Maps mf.map model not found')
  return map
}

function coordinatePair(value: JsonValue): Position | null {
  if (!Array.isArray(value) || value.length !== 2) return null
  const latitude = value[0]
  const longitude = value[1]
  if (typeof latitude !== 'number' || !Number.isFinite(latitude) || typeof longitude !== 'number' || !Number.isFinite(longitude)) return null
  if (latitude < -34 || latitude > -33 || longitude < -71 || longitude > -70) return null
  return [longitude, latitude]
}

function countCoordinatePairs(value: JsonValue): number {
  if (coordinatePair(value)) return 1
  if (!Array.isArray(value)) return 0
  return value.reduce((sum, child) => sum + countCoordinatePairs(child), 0)
}

function findFirstCoordinatePair(value: JsonValue): Position | null {
  const direct = coordinatePair(value)
  if (direct) return direct
  if (!Array.isArray(value)) return null
  for (const child of value) {
    const found = findFirstCoordinatePair(child)
    if (found) return found
  }
  return null
}

function closeRing(points: Position[]) {
  const deduped = points.filter((point, index) => index === 0 || point[0] !== points[index - 1][0] || point[1] !== points[index - 1][1])
  if (deduped.length < 3) return deduped
  const first = deduped[0]
  const last = deduped[deduped.length - 1]
  if (first[0] !== last[0] || first[1] !== last[1]) deduped.push([...first])
  return deduped
}

function extractRings(value: JsonValue): Position[][] {
  if (!Array.isArray(value)) return []

  if (value.length >= 3) {
    const points: Position[] = []
    let sequence = true
    for (const child of value) {
      if (countCoordinatePairs(child) !== 1) {
        sequence = false
        break
      }
      const point = findFirstCoordinatePair(child)
      if (!point) {
        sequence = false
        break
      }
      points.push(point)
    }
    if (sequence && points.length >= 3) return [closeRing(points)]
  }

  return value.flatMap((child) => extractRings(child))
}

function attributes(value: JsonValue | undefined) {
  const result = new Map<string, string>()
  if (!Array.isArray(value)) return result
  for (const item of value) {
    if (!Array.isArray(item) || typeof item[0] !== 'string' || !Array.isArray(item[1]) || typeof item[1][0] !== 'string') continue
    result.set(item[0].toLowerCase(), item[1][0].trim())
  }
  return result
}

function collectCanonicalFeatures(value: JsonValue, seen = new Set<string>(), output: CanonicalFeature[] = []) {
  if (!Array.isArray(value)) return output

  if (value.length >= 8 && typeof value[0] === 'string' && Array.isArray(value[3]) && Array.isArray(value[5])) {
    const id = value[0]
    const attrs = attributes(value[5])
    const name = attrs.get('nombre')
    const rings = extractRings(value[3]).filter((ring) => ring.length >= 4)
    if (name && rings.length && !seen.has(id)) {
      seen.add(id)
      output.push({ id, name, description: attrs.get('descripción') ?? null, rings })
    }
  }

  for (const child of value) collectCanonicalFeatures(child, seen, output)
  return output
}

function canonicalZone(layer: PrcLayer, rawName: string) {
  const compact = rawName.trim().replace(/\s+/g, ' ')

  if (layer === 'edification') {
    const match = compact.match(/^E\s*(Aa|Ab|Am|Ae|Ee|e)\s*(\d+)(sz)?$/i)
    if (!match) return null
    const rawFamily = match[1]
    const family = rawFamily.toLowerCase() === 'e' ? 'e' : rawFamily[0].toUpperCase() + rawFamily.slice(1).toLowerCase()
    return `E-${family}${match[2]}${match[3]?.toLowerCase() === 'sz' ? 'sz' : ''}`
  }

  const normalized = compact.replace(/[\s_-]+/g, '').toUpperCase()
  const exact: Record<string, string> = {
    UV: 'U-V',
    UPVEV: 'U-PVEV',
    UPVEVSZ: 'U-PVEVsz',
    UPVO: 'U-PVO',
    UPVOSZ: 'U-PVOsz',
    UPOC: 'U-POC',
    UPOCSZ: 'U-POCsz',
    UPC: 'U-PC',
    UPCSZ: 'U-PCsz',
    UAV: 'U-AV',
  }
  if (exact[normalized]) return exact[normalized]

  const equipment = compact.match(/^U\s*Ee\s*(\d+)(sz)?$/i)
  if (equipment) return `U-Ee${equipment[1]}${equipment[2]?.toLowerCase() === 'sz' ? 'sz' : ''}`
  return null
}

function containsString(value: JsonValue, needle: string): boolean {
  if (value === needle) return true
  if (!Array.isArray(value)) return false
  return value.some((child) => containsString(child, needle))
}

function sourceLayerTitle(map: JsonValue[], featureId: string) {
  const layers = Array.isArray(map[6]) ? map[6] : []
  for (const layer of layers) {
    if (!Array.isArray(layer) || typeof layer[2] !== 'string') continue
    if (containsString(layer, featureId)) return layer[2]
  }
  return null
}

function descriptionSummary(description: string | null) {
  if (!description) return null
  return description.replace(/\s+/g, ' ').trim() || null
}

function mapRows(map: JsonValue[], layer: PrcLayer, mid: string): ParsedPrcRow[] {
  const features = collectCanonicalFeatures(map)
  const grouped = new Map<string, ParsedPrcRow>()

  for (const feature of features) {
    const zone = canonicalZone(layer, feature.name)
    if (!zone) continue
    const key = `${layer}:${zone.toLowerCase()}`
    const polygons = feature.rings.map((ring) => [ring])
    const existing = grouped.get(key)
    if (existing) {
      existing.geometry.coordinates.push(...polygons)
      ;(existing.raw_properties.featureIds as string[]).push(feature.id)
      const descriptions = existing.raw_properties.descriptions as string[]
      const summary = descriptionSummary(feature.description)
      if (summary && !descriptions.includes(summary)) descriptions.push(summary)
      continue
    }

    const summary = descriptionSummary(feature.description)
    grouped.set(key, {
      ext_feature_id: key,
      zona_prc: zone,
      zona: zone,
      subzona: /sz$/i.test(zone) ? 'sz' : '',
      uso: layer === 'land_use' ? zone : null,
      uso_suelo: layer === 'land_use' ? zone : null,
      source_url: OFFICIAL_VIEWER,
      source_version: SOURCE_VERSION_FALLBACK,
      raw_properties: {
        sourceLayer: layer,
        sourceTransport: 'google-mymaps-embed-pagedata',
        sourceMapId: mid,
        sourceLayerTitle: sourceLayerTitle(map, feature.id),
        featureIds: [feature.id],
        descriptions: summary ? [summary] : [],
        nonBinding: true,
        valuationAdjustmentPct: 0,
      },
      geometry: { type: 'MultiPolygon', coordinates: polygons },
    })
  }

  return [...grouped.values()]
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
      geometry: row.geometry,
    }))
  const bytes = new TextEncoder().encode(JSON.stringify(canonical))
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return `vitacura-prcv-${hex(digest).slice(0, 16)}`
}

export async function fetchVitacuraPrcRows() {
  const batches: Array<{ layer: PrcLayer; mid: string; rows: ParsedPrcRow[]; status: number; bytes: number; mapTitle: string | null }> = []

  for (const source of SOURCES) {
    const url = `https://www.google.com/maps/d/embed?mid=${source.mid}`
    const response = await fetch(url, {
      cache: 'no-store',
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        Referer: OFFICIAL_VIEWER,
        'User-Agent': 'PropertyPartners-PRC-Snapshot/2.0',
      },
      signal: AbortSignal.timeout(20000),
    })
    const text = await response.text()
    if (!response.ok) throw new Error(`PRC ${source.layer} source failed with ${response.status}`)
    const map = parsePageData(text)
    if (map[1] !== source.mid) throw new Error(`PRC ${source.layer} map id mismatch`)
    const parsed = mapRows(map, source.layer, source.mid)
    if (!parsed.length) throw new Error(`PRC ${source.layer} source returned no canonical polygon rows`)
    batches.push({
      layer: source.layer,
      mid: source.mid,
      rows: parsed,
      status: response.status,
      bytes: text.length,
      mapTitle: typeof map[2] === 'string' ? map[2] : null,
    })
  }

  const parsedRows = batches.flatMap((batch) => batch.rows)
  const sourceVersion = await versionFor(parsedRows)
  const sourceObservedAt = new Date().toISOString()
  const rows: PrcRow[] = batches.flatMap((batch) => batch.rows.map((row) => {
    const descriptions = row.raw_properties.descriptions as string[]
    return {
      ...row,
      source_version: sourceVersion,
      source_feature_id: row.ext_feature_id,
      layer_type: batch.layer === 'edification' ? 'edificacion' : 'uso_suelo',
      feature_name: row.zona,
      description: descriptions[0] ?? null,
      source_map_id: batch.mid,
      source_observed_at: sourceObservedAt,
    }
  }))
  const diagnostics = batches.map((batch) => ({
    layer: batch.layer,
    status: batch.status,
    bytes: batch.bytes,
    rows: batch.rows.length,
    mapTitle: batch.mapTitle,
    transport: 'google-mymaps-embed-pagedata',
  }))

  return { rows, diagnostics, officialViewer: OFFICIAL_VIEWER, sourceVersion, sourceObservedAt }
}
