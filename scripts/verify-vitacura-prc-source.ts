import { fetchVitacuraPrcRows } from '../lib/vitacura-prc'

function verifyGeometry(row: Awaited<ReturnType<typeof fetchVitacuraPrcRows>>['rows'][number]) {
  if (row.geometry.type !== 'MultiPolygon' || row.geometry.coordinates.length === 0) {
    throw new Error(`${row.zona}: missing MultiPolygon geometry`)
  }

  let pointCount = 0
  for (const polygon of row.geometry.coordinates) {
    if (!polygon.length) throw new Error(`${row.zona}: empty polygon`)
    for (const ring of polygon) {
      if (ring.length < 4) throw new Error(`${row.zona}: ring has fewer than 4 points`)
      const first = ring[0]
      const last = ring[ring.length - 1]
      if (first[0] !== last[0] || first[1] !== last[1]) throw new Error(`${row.zona}: ring is not closed`)
      for (const point of ring) {
        const [lon, lat] = point
        if (!Number.isFinite(lon) || !Number.isFinite(lat)) throw new Error(`${row.zona}: non-finite coordinate`)
        if (lon < -70.62 || lon > -70.51 || lat < -33.42 || lat > -33.35) {
          throw new Error(`${row.zona}: coordinate outside Vitacura PRC bounds: ${lon}, ${lat}`)
        }
        pointCount += 1
      }
    }
  }
  return pointCount
}

async function main() {
  const result = await fetchVitacuraPrcRows()
  const layers = new Map(result.diagnostics.map((item) => [item.layer, item]))

  if (result.diagnostics.length !== 2) throw new Error(`Expected 2 PRC layers, got ${result.diagnostics.length}`)
  const edification = layers.get('edification')
  const landUse = layers.get('land_use')
  if (!edification?.rows || edification.status !== 200) throw new Error('Vitacura PRC edification source is not healthy')
  if (!landUse?.rows || landUse.status !== 200) throw new Error('Vitacura PRC land-use source is not healthy')
  if (edification.transport !== 'google-mymaps-embed-pagedata' || landUse.transport !== 'google-mymaps-embed-pagedata') {
    throw new Error('Unexpected PRC source transport')
  }
  if (!result.sourceVersion.match(/^vitacura-prcv-[0-9a-f]{16}$/)) throw new Error(`Unexpected source version ${result.sourceVersion}`)
  if (!result.rows.some((row) => row.layer_type === 'edificacion')) throw new Error('Missing valuation edification rows')
  if (!result.rows.some((row) => row.layer_type === 'uso_suelo')) throw new Error('Missing valuation land-use rows')
  if (!result.rows.some((row) => row.zona === 'E-Ae2')) throw new Error('Known edification zone E-Ae2 was not parsed')
  if (!result.rows.some((row) => row.zona === 'U-V')) throw new Error('Known land-use zone U-V was not parsed')

  let pointCount = 0
  for (const row of result.rows) {
    pointCount += verifyGeometry(row)
    if (row.raw_properties.sourceTransport !== 'google-mymaps-embed-pagedata') throw new Error(`${row.zona}: missing source transport lineage`)
    if (row.raw_properties.nonBinding !== true) throw new Error(`${row.zona}: PRC must remain non-binding`)
    if (row.raw_properties.valuationAdjustmentPct !== 0) throw new Error(`${row.zona}: PRC may not change valuation weights`)
  }
  if (pointCount < 1000) throw new Error(`PRC geometry coverage unexpectedly low: ${pointCount} points`)

  console.log(JSON.stringify({
    ok: true,
    sourceVersion: result.sourceVersion,
    totalRows: result.rows.length,
    totalPoints: pointCount,
    zones: result.rows.map((row) => row.zona).sort(),
    diagnostics: result.diagnostics,
  }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
