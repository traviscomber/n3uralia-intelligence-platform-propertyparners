import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const ARCGIS_URL =
  'https://ideserver.sma.gob.cl/arcgis/rest/services/IDE/PRC/MapServer/312/query'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// Fetch all features from ArcGIS paged by offset
async function fetchAllFeatures() {
  const features: any[] = []
  let offset = 0
  const batchSize = 100

  while (true) {
    const params = new URLSearchParams({
      where: '1=1',
      outFields: 'ZONA,SUBZONA,USO_SUELO,SUPERFICIE',
      geometryType: 'esriGeometryPolygon',
      spatialRel: 'esriSpatialRelIntersects',
      // Bounding box: Vitacura commune approx
      inSR: '4326',
      outSR: '4326',
      f: 'geojson',
      resultOffset: String(offset),
      resultRecordCount: String(batchSize),
      returnGeometry: 'true',
    })

    const res = await fetch(`${ARCGIS_URL}?${params}`, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 0 },
    })

    if (!res.ok) throw new Error(`ArcGIS HTTP ${res.status}`)

    const json = await res.json()
    const batch = json.features || []
    features.push(...batch)

    // Stop if we got fewer results than we asked for (last page)
    if (batch.length < batchSize) break
    offset += batchSize
  }

  return features
}

// Convert ArcGIS GeoJSON geometry to WKT POLYGON
function geojsonToWkt(geometry: any): string | null {
  if (!geometry) return null
  const type = geometry.type
  const coords = geometry.coordinates

  if (type === 'Polygon') {
    const rings = coords.map((ring: number[][]) =>
      ring.map((pt: number[]) => `${pt[0]} ${pt[1]}`).join(',')
    )
    return `POLYGON(${rings.map((r: string) => `(${r})`).join(',')})`
  }

  if (type === 'MultiPolygon') {
    const polys = coords.map((poly: number[][][]) => {
      const rings = poly.map((ring: number[][]) =>
        ring.map((pt: number[]) => `${pt[0]} ${pt[1]}`).join(',')
      )
      return `(${rings.map((r: string) => `(${r})`).join(',')})`
    })
    return `MULTIPOLYGON(${polys.join(',')})`
  }

  return null
}

export async function POST() {
  try {
    const features = await fetchAllFeatures()

    if (features.length === 0) {
      return NextResponse.json({ ok: false, message: 'No features returned from ArcGIS' }, { status: 502 })
    }

    let inserted = 0
    let skipped = 0
    const errors: string[] = []

    for (const feature of features) {
      const props = feature.properties || {}
      const wkt = geojsonToWkt(feature.geometry)

      if (!wkt || !props.ZONA) {
        skipped++
        continue
      }

      const { error } = await supabase.rpc('upsert_prc_zone', {
        p_zona: props.ZONA,
        p_subzona: props.SUBZONA || null,
        p_uso_suelo: props.USO_SUELO || null,
        p_superficie: props.SUPERFICIE || null,
        p_geometry_wkt: wkt,
      })

      if (error) {
        errors.push(`${props.ZONA}: ${error.message}`)
        skipped++
      } else {
        inserted++
      }
    }

    return NextResponse.json({
      ok: true,
      total: features.length,
      inserted,
      skipped,
      errors: errors.slice(0, 10),
    })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}

// GET: preview — how many features are available in ArcGIS
export async function GET() {
  try {
    const params = new URLSearchParams({
      where: '1=1',
      returnCountOnly: 'true',
      f: 'json',
    })
    const res = await fetch(`${ARCGIS_URL}?${params}`)
    const json = await res.json()
    return NextResponse.json({ available: json.count ?? 0 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
