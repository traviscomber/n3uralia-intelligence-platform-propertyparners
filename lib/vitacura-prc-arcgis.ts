type EsriFeature = {
  attributes?: Record<string, unknown>
  geometry?: { rings?: number[][][] }
}

type EsriResponse = {
  features?: EsriFeature[]
  exceededTransferLimit?: boolean
  error?: { message?: string }
}

export type PrcRow = {
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

export const VITACURA_PRC_ARCGIS_LAYER = 'https://ideserver.sma.gob.cl/arcgis/rest/services/IDE/PRC/MapServer/312'
export const VITACURA_PRC_ARCGIS_SOURCE_VERSION = 'minvu-sma-prc-vitacura-2016'

function clean(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function validRing(ring: number[][]) {
  const points = ring
    .map((point) => [Number(point?.[0]), Number(point?.[1])])
    .filter((point) => point.every(Number.isFinite))
  if (points.length < 4) return null
  const first = points[0]
  const last = points[points.length - 1]
  if (first[0] !== last[0] || first[1] !== last[1]) points.push([...first])
  return points
}

export function parseVitacuraArcgisFeatures(payload: EsriResponse): PrcRow[] {
  if (payload.error) throw new Error(payload.error.message || 'ArcGIS PRC query failed')
  const rows: PrcRow[] = []
  for (const feature of payload.features ?? []) {
    const attributes = feature.attributes ?? {}
    const objectId = String(attributes.OBJECTID ?? '')
    const zona = clean(attributes.ZONA) || clean(attributes.NOMBRE) || clean(attributes.SECTOR)
    const subzona = clean(attributes.SECTOR)
    const rings = (feature.geometry?.rings ?? []).map(validRing).filter((ring): ring is number[][] => Boolean(ring))
    if (!objectId || !zona || !rings.length) continue

    const preferredUse = clean(attributes.UPREF)
    const allowedUse = clean(attributes.UPERM)
    rows.push({
      ext_feature_id: `arcgis-prc-312:${objectId}`,
      zona_prc: zona,
      zona,
      subzona,
      uso: preferredUse || allowedUse || null,
      uso_suelo: preferredUse || allowedUse || null,
      source_url: VITACURA_PRC_ARCGIS_LAYER,
      source_version: VITACURA_PRC_ARCGIS_SOURCE_VERSION,
      raw_properties: {
        source: 'IDE/SMA · MINVU',
        sourceYear: 2016,
        historicalBacktestOnlyUntilCurrentPrcReconciled: true,
        region: clean(attributes.REGION) || null,
        comuna: clean(attributes.COMUNA) || null,
        sector: subzona || null,
        nombre: clean(attributes.NOMBRE) || null,
        usosPermitidos: allowedUse || null,
        usosProhibidos: clean(attributes.UPROH) || null,
        usoPreferente: preferredUse || null,
        capa: clean(attributes.Capa) || null,
      },
      geometry: { type: 'MultiPolygon', coordinates: rings.map((ring) => [ring]) },
    })
  }
  return rows
}

export async function fetchVitacuraPrcArcgisRows() {
  const query = new URL(`${VITACURA_PRC_ARCGIS_LAYER}/query`)
  query.searchParams.set('where', '1=1')
  query.searchParams.set('outFields', 'OBJECTID,REGION,COMUNA,SECTOR,ZONA,NOMBRE,UPERM,UPROH,UPREF,Capa')
  query.searchParams.set('returnGeometry', 'true')
  query.searchParams.set('outSR', '4326')
  query.searchParams.set('f', 'json')

  const response = await fetch(query, { cache: 'no-store', signal: AbortSignal.timeout(20000) })
  const text = await response.text()
  if (!response.ok) throw new Error(`ArcGIS PRC source failed with ${response.status}`)
  const payload = JSON.parse(text) as EsriResponse
  const rows = parseVitacuraArcgisFeatures(payload)
  if (!rows.length) throw new Error('ArcGIS PRC source returned no usable polygons')
  return {
    rows,
    sourceVersion: VITACURA_PRC_ARCGIS_SOURCE_VERSION,
    sourceUrl: VITACURA_PRC_ARCGIS_LAYER,
    diagnostics: {
      status: response.status,
      bytes: text.length,
      rows: rows.length,
      exceededTransferLimit: Boolean(payload.exceededTransferLimit),
    },
  }
}
