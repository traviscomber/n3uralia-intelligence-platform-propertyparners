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

export const VITACURA_PRC_ARCGIS_LAYER = 'https://services3.arcgis.com/cTnMkBRk4HWkUCRo/arcgis/rest/services/PRC_2022/FeatureServer/41'
export const VITACURA_PRC_ARCGIS_SOURCE_VERSION = 'minvu-prc-vitacura-20160920'

function clean(value: unknown) {
  if (value == null) return ''
  return String(value).trim()
}

function firstAttribute(attributes: Record<string, unknown>, names: string[]) {
  for (const name of names) {
    const value = clean(attributes[name])
    if (value) return value
  }
  return ''
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
    const objectId = firstAttribute(attributes, ['OBJECTID', 'FID', 'OID'])
    const zona = firstAttribute(attributes, ['ZONA', 'ZONA_PRC', 'NOMBRE', 'SECTOR', 'ZONE'])
    const subzona = firstAttribute(attributes, ['SUBZONA', 'SECTOR', 'SUBSECTOR'])
    const rings = (feature.geometry?.rings ?? []).map(validRing).filter((ring): ring is number[][] => Boolean(ring))
    if (!objectId || !zona || !rings.length) continue

    const preferredUse = firstAttribute(attributes, ['UPREF', 'USO_PREF', 'USO_PREFERENTE'])
    const allowedUse = firstAttribute(attributes, ['UPERM', 'USO_PERM', 'USOS_PERMITIDOS'])
    rows.push({
      ext_feature_id: `minvu-prc-2022-41:${objectId}`,
      zona_prc: zona,
      zona,
      subzona,
      uso: preferredUse || allowedUse || null,
      uso_suelo: preferredUse || allowedUse || null,
      source_url: VITACURA_PRC_ARCGIS_LAYER,
      source_version: VITACURA_PRC_ARCGIS_SOURCE_VERSION,
      raw_properties: {
        ...attributes,
        source: 'MINVU ArcGIS · PRC_2022 layer 41',
        effectiveLayerName: 'PRC_Vitacura_20160920',
        historicalBacktestOnlyUntilCurrentPrcReconciled: true,
      },
      geometry: { type: 'MultiPolygon', coordinates: rings.map((ring) => [ring]) },
    })
  }
  return rows
}

export async function fetchVitacuraPrcArcgisRows() {
  const query = new URL(`${VITACURA_PRC_ARCGIS_LAYER}/query`)
  query.searchParams.set('where', '1=1')
  query.searchParams.set('outFields', '*')
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
