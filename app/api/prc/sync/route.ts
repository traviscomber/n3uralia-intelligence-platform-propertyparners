import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireExecutiveAccess } from '@/lib/api-access'

const ARCGIS_URL =
  'https://ideserver.sma.gob.cl/arcgis/rest/services/IDE/PRC/MapServer/312/query'

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('MISSING_SUPABASE_CREDENTIALS')
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

async function fetchAllFeatures() {
  const features: any[] = []
  let offset = 0
  const batchSize = 100

  while (true) {
    const params = new URLSearchParams({
      where: '1=1',
      outFields: 'ZONA,NOMBRE,UPREF,SECTOR,SHAPE_Area',
      outSR: '4326',
      f: 'json',
      resultOffset: String(offset),
      resultRecordCount: String(batchSize),
      returnGeometry: 'true',
    })

    const res = await fetch(`${ARCGIS_URL}?${params}`, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 0 },
    })

    if (!res.ok) throw new Error('ARCGIS_REQUEST_FAILED')

    const json = await res.json()
    if (json.error) throw new Error('ARCGIS_RESPONSE_FAILED')

    const batch = json.features || []
    features.push(...batch)

    if (batch.length < batchSize) break
    offset += batchSize
  }

  return features
}

function esriToWkt(geometry: any): string | null {
  if (!geometry || !geometry.rings || !geometry.rings.length) return null

  const rings: string[] = geometry.rings.map((ring: number[][]) =>
    '(' + ring.map((pt: number[]) => `${pt[0]} ${pt[1]}`).join(',') + ')'
  )

  if (rings.length === 1) {
    return `POLYGON(${rings[0]})`
  }

  return `POLYGON(${rings.join(',')})`
}

export async function POST() {
  const access = await requireExecutiveAccess()
  if (!access.allowed) return NextResponse.json({ error: 'Acceso restringido.' }, { status: access.status })

  try {
    const supabase = getSupabaseClient()
    const features = await fetchAllFeatures()

    if (features.length === 0) {
      return NextResponse.json(
        { ok: false, message: 'La fuente oficial no devolvió zonas disponibles.' },
        { status: 502 },
      )
    }

    let synced = 0
    let skipped = 0
    const failedZones: string[] = []

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
        console.error('PRC_ZONE_UPSERT_FAILED', { code: error.code ?? 'UNKNOWN', zone: String(props.ZONA) })
        failedZones.push(String(props.ZONA))
        skipped++
      } else {
        synced++
      }
    }

    const { error: enrichmentError } = await supabase.rpc('enrich_neighborhoods_zona_prc')
    if (enrichmentError) {
      console.error('PRC_ENRICHMENT_FAILED', { code: enrichmentError.code ?? 'UNKNOWN' })
    }

    return NextResponse.json({
      ok: true,
      total: features.length,
      synced,
      skipped,
      failedZones: failedZones.slice(0, 10),
      enrichmentCompleted: !enrichmentError,
    })
  } catch {
    console.error('PRC_SYNC_FAILED')
    return NextResponse.json({ ok: false, error: 'No pudimos sincronizar las zonas PRC.' }, { status: 500 })
  }
}

export async function GET() {
  const access = await requireExecutiveAccess()
  if (!access.allowed) return NextResponse.json({ error: 'Acceso restringido.' }, { status: access.status })

  try {
    const params = new URLSearchParams({
      where: '1=1',
      returnCountOnly: 'true',
      f: 'json',
    })
    const res = await fetch(`${ARCGIS_URL}?${params}`)
    if (!res.ok) {
      return NextResponse.json({ error: 'No pudimos consultar la fuente PRC.' }, { status: 502 })
    }
    const json = await res.json()
    if (json.error) {
      return NextResponse.json({ error: 'No pudimos consultar la fuente PRC.' }, { status: 502 })
    }
    return NextResponse.json({ available: json.count ?? 0 })
  } catch {
    console.error('PRC_PREVIEW_FAILED')
    return NextResponse.json({ error: 'No pudimos consultar la fuente PRC.' }, { status: 500 })
  }
}
