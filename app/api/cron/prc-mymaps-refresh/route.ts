import { createHash } from 'node:crypto'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

const MAPS = [
  { layerType: 'edificacion', mapId: '1c01sgZ9vUTm7sJVd8oz9cfv9hH3-9kYT' },
  { layerType: 'uso_suelo', mapId: '1HvsC09ycddCXYMDVJMasi5c_HQliaBKB' },
] as const

type LayerType = typeof MAPS[number]['layerType']

type SyncRow = {
  source_feature_id: string
  layer_type: LayerType
  feature_name: string
  description: string | null
  source_map_id: string
  source_url: string
  source_version: string
  source_observed_at: string
  raw_properties: Record<string, unknown>
  geometry: { type: 'MultiPolygon'; coordinates: number[][][][] }
}

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET
  return Boolean(secret) && request.headers.get('authorization') === `Bearer ${secret}`
}

function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('MISSING_SUPABASE_CREDENTIALS')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

function decodeXml(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .trim()
}

function tag(block: string, name: string) {
  const match = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, 'i'))
  return match ? decodeXml(match[1]) : ''
}

function parseCoordinates(raw: string): number[][] {
  const ring = raw.trim().split(/\s+/).map((item) => {
    const [lon, lat] = item.split(',').map(Number)
    return [lon, lat]
  }).filter(([lon, lat]) => Number.isFinite(lon) && Number.isFinite(lat))
  if (ring.length < 4) return []
  const first = ring[0], last = ring[ring.length - 1]
  if (first[0] !== last[0] || first[1] !== last[1]) ring.push([...first])
  return ring
}

function parseKml(kml: string, layerType: LayerType, mapId: string, sourceVersion: string, observedAt: string): SyncRow[] {
  const placemarks = [...kml.matchAll(/<Placemark(?:\s[^>]*)?>([\s\S]*?)<\/Placemark>/gi)]
  const rows: SyncRow[] = []
  placemarks.forEach((pm, placemarkIndex) => {
    const block = pm[1]
    const name = tag(block, 'name') || 'Sin nombre'
    const description = tag(block, 'description') || null
    const polygons = [...block.matchAll(/<Polygon(?:\s[^>]*)?>([\s\S]*?)<\/Polygon>/gi)]
    polygons.forEach((poly, polygonIndex) => {
      const outer = poly[1].match(/<outerBoundaryIs[\s\S]*?<coordinates(?:\s[^>]*)?>([\s\S]*?)<\/coordinates>[\s\S]*?<\/outerBoundaryIs>/i)
      if (!outer) return
      const outerRing = parseCoordinates(outer[1])
      if (!outerRing.length) return
      const holes = [...poly[1].matchAll(/<innerBoundaryIs[\s\S]*?<coordinates(?:\s[^>]*)?>([\s\S]*?)<\/coordinates>[\s\S]*?<\/innerBoundaryIs>/gi)]
        .map((m) => parseCoordinates(m[1])).filter((ring) => ring.length)
      const sourceFeatureId = createHash('sha256').update(`${mapId}|${placemarkIndex}|${polygonIndex}|${name}|${outer[1]}`).digest('hex')
      rows.push({
        source_feature_id: sourceFeatureId,
        layer_type: layerType,
        feature_name: name,
        description,
        source_map_id: mapId,
        source_url: `https://www.google.com/maps/d/embed?mid=${mapId}`,
        source_version: sourceVersion,
        source_observed_at: observedAt,
        raw_properties: { placemarkIndex, polygonIndex, officialViewer: 'https://vitacura.cl/municipalidad/planificacion-urbana/visor-interactivo-prcv/' },
        geometry: { type: 'MultiPolygon', coordinates: [[outerRing, ...holes]] },
      })
    })
  })
  return rows
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const supabase = db()
  const observedAt = new Date().toISOString()
  const results: Array<Record<string, unknown>> = []

  for (const source of MAPS) {
    const kmlUrl = `https://www.google.com/maps/d/u/0/kml?mid=${source.mapId}&forcekml=1`
    const response = await fetch(kmlUrl, { cache: 'no-store', headers: { 'user-agent': 'PropertyPartners-PRC-Snapshot/1.0' } })
    if (!response.ok) {
      results.push({ layerType: source.layerType, ok: false, status: response.status })
      continue
    }
    const kml = await response.text()
    const sourceVersion = `mymaps-sha256-${createHash('sha256').update(kml).digest('hex')}`
    const rows = parseKml(kml, source.layerType, source.mapId, sourceVersion, observedAt)
    let affected = 0
    for (let i = 0; i < rows.length; i += 150) {
      const batch = rows.slice(i, i + 150)
      const { data, error } = await supabase.rpc('sync_vitacura_prc_features_v1', { p_rows: batch })
      if (error) throw error
      affected += Number(data?.affected ?? batch.length)
    }
    results.push({ layerType: source.layerType, ok: true, sourceVersion, polygons: rows.length, affected })
  }

  return NextResponse.json({ ok: results.every((r) => r.ok), observedAt, results, changesChampionWeights: false }, { headers: { 'Cache-Control': 'no-store' } })
}
