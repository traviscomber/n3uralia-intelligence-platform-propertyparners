import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

const SOURCE_VERSION = 'osm-overpass-v1'
const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]
const ROAD_CLASSES = ['motorway','trunk','primary','secondary','tertiary','unclassified','residential','living_street','service'] as const
const RANK: Record<string, number> = { motorway: 1, trunk: 1, primary: 2, secondary: 3, tertiary: 4, unclassified: 5, residential: 6, living_street: 7, service: 8 }
const ARTERIAL = new Set(['motorway','trunk','primary','secondary','tertiary'])

type Element = { id:number; center?:{lat:number;lon:number}; tags?:Record<string,string> }

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET
  return Boolean(secret) && request.headers.get('authorization') === `Bearer ${secret}`
}
function supabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('MISSING_SUPABASE_CREDENTIALS')
  return createClient(url, key, { auth: { persistSession:false, autoRefreshToken:false } })
}
function meters(aLat:number,aLon:number,bLat:number,bLon:number) {
  const r=6371000, p=Math.PI/180, dLat=(bLat-aLat)*p, dLon=(bLon-aLon)*p
  const x=Math.sin(dLat/2)**2+Math.cos(aLat*p)*Math.cos(bLat*p)*Math.sin(dLon/2)**2
  return 2*r*Math.asin(Math.sqrt(x))
}
async function fetchRoads(lat:number, lon:number) {
  const classes=ROAD_CLASSES.join('|')
  const query=`[out:json][timeout:12];way(around:700,${lat},${lon})[highway~"^(${classes})$"];out tags center;`
  let last: unknown
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),15000)
      const res=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded','user-agent':'PropertyPartners-Intelligence/1.0'},body:new URLSearchParams({data:query}),signal:controller.signal,cache:'no-store'})
      clearTimeout(timer)
      if (!res.ok) throw new Error(`OVERPASS_${res.status}`)
      const json=await res.json() as {elements?:Element[]}
      return json.elements ?? []
    } catch (e) { last=e }
  }
  throw last instanceof Error ? last : new Error('OVERPASS_UNAVAILABLE')
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({error:'No autorizado'},{status:401})
  const db=supabase()
  const { data: tx, error } = await db.from('market_cbrs_reference_transactions').select('latitude,longitude,property_type').ilike('property_type','%casa%').not('latitude','is',null).not('longitude','is',null)
  if (error) return NextResponse.json({ok:false,error:'CBRS_READ_FAILED'},{status:500})
  const unique=new Map<string,{latitude:number;longitude:number}>()
  for (const row of tx ?? []) {
    const latitude=Number(row.latitude), longitude=Number(row.longitude)
    if (!Number.isFinite(latitude)||!Number.isFinite(longitude)) continue
    const { data: barrio }=await db.rpc('valuation_pp_kml_barrio_at',{p_lat:latitude,p_lon:longitude})
    if (barrio!=='Lo Curro') continue
    unique.set(`${latitude.toFixed(6)},${longitude.toFixed(6)}`,{latitude,longitude})
  }
  let accepted=0, failed=0
  const observedAt=new Date().toISOString()
  for (const point of unique.values()) {
    try {
      const elements=await fetchRoads(point.latitude,point.longitude)
      const roads=elements.filter(e=>e.center&&e.tags?.highway).map(e=>({e,d:meters(point.latitude,point.longitude,e.center!.lat,e.center!.lon)})).sort((a,b)=>a.d-b.d)
      if (!roads.length) { failed++; continue }
      const nearest=roads[0]
      const arterial=roads.filter(x=>ARTERIAL.has(x.e.tags!.highway)).sort((a,b)=>a.d-b.d)[0]
      const cls=nearest.e.tags!.highway
      const row={latitude:point.latitude,longitude:point.longitude,nearest_road_name:nearest.e.tags?.name??null,highway_class:cls,hierarchy_rank:RANK[cls]??9,distance_to_road_m:Math.round(nearest.d),distance_to_arterial_m:arterial?Math.round(arterial.d):null,access_context:arterial&&arterial.d<150?'near_arterial':arterial&&arterial.d<400?'arterial_access':'local_access',source_name:'OpenStreetMap Overpass',source_version:SOURCE_VERSION,source_observed_at:observedAt,source_url:'https://www.openstreetmap.org',methodology:'nearest functional road by OSM way center; arterial proximity as structural shadow evidence',metadata:{nearest_osm_way_id:nearest.e.id,arterial_osm_way_id:arterial?.e.id??null,non_binding:true,valuation_adjustment_pct:0}}
      const { error: upsertError }=await db.from('valuation_road_hierarchy_samples').upsert(row,{onConflict:'latitude,longitude,source_name,source_version'})
      if (upsertError) throw upsertError
      accepted++
    } catch { failed++ }
  }
  return NextResponse.json({ok:failed===0,sourceVersion:SOURCE_VERSION,locations:unique.size,accepted,failed,changesChampionWeights:false},{status:failed===0?200:207,headers:{'Cache-Control':'no-store'}})
}
