import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const ARCGIS_URL =
  'https://ideserver.sma.gob.cl/arcgis/rest/services/IDE/PRC/MapServer/312/query'

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials')
  }

  return createClient(supabaseUrl, supabaseKey)
}

// Fetch all features from ArcGIS paged — uses f=json (Esri native, geojson not supported)
async function fetchAllFeatures() {
  const features: any[] = []
  let offset = 0
  const batchSize = 100

  while (true) {
    const params = new URLSearchParams({
      where: '1=1',
      outFields: 'ZONA,NOMBRE,UPREF,SECTOR,SHAPE_Area',
      outSR: '4326',
      f: 'json',               // ← Esri JSON (this server doesn't support geojson)
      resultOffset: String(offset),
      resultRecordCount: String(batchSize),
      returnGeometry: 'true',
    })

    const res = await fetch(`${ARCGIS_URL}?${params}`, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 0 },
    })

    if (!res.ok) throw new Error(`ArcGIS HTTP ${res.status}`)

    const json = await res.json()
    if (json.error) throw new Error(`ArcGIS error: ${json.error.message}`)

    const batch = json.features || []
    features.push(...batch)

    if (batch.length < batchSize) break
    offset += batchSize
  }

  return features
}

// Convert Esri rings geometry → WKT POLYGON / MULTIPOLYGON
function esriToWkt(geometry: any): string | null {
  if (!geometry || !geometry.rings || !geometry.rings.length) return null

  const rings: string[] = geometry.rings.map((ring: number[][]) =>
    '(' + ring.map((pt: number[]) => `${pt[0]} ${pt[1]}`).join(',') + ')'
  )

  if (rings.length === 1) {
    return `POLYGON(${rings[0]})`
  }

  // Multiple rings → use first as outer, rest as inner (holes)
  return `POLYGON(${rings.join(',')})`
}

export async function POST() {
  try {
    const supabase = getSupabaseClient()
    const features = await fetchAllFeatures()

    if (features.length === 0) {
      return NextResponse.json(
        { ok: false, message: 'No features returned from ArcGIS' },
        { status: 502 },
      )
    }

    let synced = 0
    let skipped = 0
    const errors: string[] = []

    for (const feature of features) {
      const props = feature.attributes || {}
      const wkt = esriToWkt(feature.geometry)

      if (!wkt || !props.ZONA) {
        skipped++
        continue
      }

      const { error } = await supabase.rpc('upsert_prc_zone', {
        p_zona: String(props.ZONA),
        p_subzona: props.NOMBRE ? String(props.NOMBRE).slice(0, 100) : null,
        p_uso_suelo: props.UPREF ? String(props.UPREF) : null,
        p_superficie: props.SHAPE_Area ? Number(props.SHAPE_Area) : null,
        p_geometry_wkt: wkt,
      })

      if (error) {
        errors.push(`${props.ZONA}: ${error.message}`)
        skipped++
      } else {
        synced++
      }
    }

    // After sync: enrich neighborhood zona_prc from official PRC polygons
    await supabase.rpc('enrich_neighborhoods_zona_prc')

    return NextResponse.json({
      ok: true,
      total: features.length,
      synced,
      skipped,
      errors: errors.slice(0, 10),
    })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}

// GET: preview — how many PRC features are available in ArcGIS
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
