import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const SERVICE = 'https://services3.arcgis.com/cTnMkBRk4HWkUCRo/ArcGIS/rest/services/PRC_2022/FeatureServer/41'
const SOURCE_VERSION = 'minvu-prc-vitacura-20160920'
const OUTPUT = path.join(process.cwd(), 'data', 'structural', 'vitacura_prc_20160920.json')

function clean(value) {
  return value == null ? '' : String(value).trim()
}

function closeRing(ring) {
  const points = (ring ?? [])
    .map((point) => [Number(point?.[0]), Number(point?.[1])])
    .filter((point) => point.length === 2 && point.every(Number.isFinite))
  if (points.length < 4) return null
  const first = points[0]
  const last = points[points.length - 1]
  if (first[0] !== last[0] || first[1] !== last[1]) points.push([...first])
  return points
}

function featureToRow(feature) {
  const attributes = feature?.attributes ?? {}
  const objectId = clean(attributes.OBJECTID)
  const zona = clean(attributes.ZONA)
  const subzona = clean(attributes.SECTOR)
  const rings = (feature?.geometry?.rings ?? []).map(closeRing).filter(Boolean)
  if (!objectId || !zona || rings.length === 0) return null

  const uso = clean(attributes.UPERM) || clean(attributes.NOMBRE) || null
  return {
    ext_feature_id: `minvu-prc-2022-41:${objectId}`,
    zona_prc: zona,
    zona,
    subzona,
    uso,
    uso_suelo: uso,
    source_url: SERVICE,
    source_version: SOURCE_VERSION,
    raw_properties: {
      ...attributes,
      source: 'MINVU ArcGIS · PRC_2022 layer 41',
      layerName: 'PRC_Vitacura_20160920',
      historicalBacktestOnly: true,
    },
    geometry: { type: 'MultiPolygon', coordinates: rings.map((ring) => [ring]) },
  }
}

async function main() {
  const query = new URL(`${SERVICE}/query`)
  query.searchParams.set('where', '1=1')
  query.searchParams.set('outFields', '*')
  query.searchParams.set('returnGeometry', 'true')
  query.searchParams.set('outSR', '4326')
  query.searchParams.set('f', 'json')

  const response = await fetch(query, { signal: AbortSignal.timeout(30000) })
  if (!response.ok) throw new Error(`MINVU PRC source returned ${response.status}`)
  const payload = await response.json()
  if (payload.error) throw new Error(payload.error.message || 'MINVU PRC query failed')

  const rows = (payload.features ?? []).map(featureToRow).filter(Boolean)
  if (rows.length === 0) throw new Error('MINVU PRC source returned no usable Vitacura polygons')

  const checksumSha256 = createHash('sha256').update(JSON.stringify(rows)).digest('hex')
  const snapshot = {
    schemaVersion: 1,
    source: {
      provider: 'MINVU ArcGIS',
      service: SERVICE,
      layerId: 41,
      layerName: 'PRC_Vitacura_20160920',
      sourceVersion: SOURCE_VERSION,
      observedAt: new Date().toISOString(),
      effectiveContext: 'historical_backtest_only',
    },
    rows,
    checksumSha256,
  }

  await mkdir(path.dirname(OUTPUT), { recursive: true })
  await writeFile(OUTPUT, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8')
  console.log(JSON.stringify({ ok: true, output: OUTPUT, rows: rows.length, checksumSha256 }, null, 2))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
