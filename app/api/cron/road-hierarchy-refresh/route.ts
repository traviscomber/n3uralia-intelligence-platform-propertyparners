import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

const SOURCE_VERSION = 'osm-overpass-v2'
const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]
const ROAD_CLASSES = ['motorway','trunk','primary','secondary','tertiary','unclassified','residential','living_street','service'] as const
const RANK: Record<string, number> = { motorway: 1, trunk: 1, primary: 2, secondary: 3, tertiary: 4, unclassified: 5, residential: 6, living_street: 7, service: 8 }
const ARTERIAL = new Set(['motorway','trunk','primary','secondary','tertiary'])

type Point = { lat:number; lon:number }
type Element = { id:number; geometry?:Point[]; tags?:Record<string,string> }
type Road = { element:Element; highway:string; geometry:Point[] }
type ExistingSample = { id:string; latitude:number; longitude:number }

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

function coordinateKey(latitude:number, longitude:number) {
  return `${latitude.toFixed(6)},${longitude.toFixed(6)}`
}

function meters(aLat:number,aLon:number,bLat:number,bLon:number) {
  const r=6371000, p=Math.PI/180, dLat=(bLat-aLat)*p, dLon=(bLon-aLon)*p
  const x=Math.sin(dLat/2)**2+Math.cos(aLat*p)*Math.cos(bLat*p)*Math.sin(dLon/2)**2
  return 2*r*Math.asin(Math.sqrt(x))
}

function projectToMeters(origin:Point, point:Point) {
  const p=Math.PI/180
  return {
    x:(point.lon-origin.lon)*p*6371000*Math.cos(origin.lat*p),
    y:(point.lat-origin.lat)*p*6371000,
  }
}

function pointToSegmentMeters(point:Point, a:Point, b:Point) {
  const av=projectToMeters(point,a), bv=projectToMeters(point,b)
  const dx=bv.x-av.x, dy=bv.y-av.y
  if (dx===0 && dy===0) return meters(point.lat,point.lon,a.lat,a.lon)
  const t=Math.max(0,Math.min(1,-(av.x*dx+av.y*dy)/(dx*dx+dy*dy)))
  return Math.hypot(av.x+t*dx,av.y+t*dy)
}

function distanceToRoad(point:Point, geometry:Point[]) {
  if (geometry.length===1) return meters(point.lat,point.lon,geometry[0].lat,geometry[0].lon)
  let best=Number.POSITIVE_INFINITY
  for (let i=1;i<geometry.length;i++) best=Math.min(best,pointToSegmentMeters(point,geometry[i-1],geometry[i]))
  return best
}

async function fetchRoadNetwork(points:Point[]) {
  const minLat=Math.min(...points.map(p=>p.lat))-0.008
  const maxLat=Math.max(...points.map(p=>p.lat))+0.008
  const minLon=Math.min(...points.map(p=>p.lon))-0.01
  const maxLon=Math.max(...points.map(p=>p.lon))+0.01
  const classes=ROAD_CLASSES.join('|')
  const query=`[out:json][timeout:45];way[highway~"^(${classes})$"](${minLat},${minLon},${maxLat},${maxLon});out tags geom;`
  let last: unknown
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),55000)
      const res=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded','user-agent':'PropertyPartners-Intelligence/2.0'},body:new URLSearchParams({data:query}),signal:controller.signal,cache:'no-store'})
      clearTimeout(timer)
      if (!res.ok) throw new Error(`OVERPASS_${res.status}`)
      const json=await res.json() as {elements?:Element[]}
      const roads=(json.elements??[]).flatMap((element):Road[]=>{
        const highway=element.tags?.highway
        const geometry=element.geometry
        if (!highway || !geometry?.length || !(highway in RANK)) return []
        return [{element,highway,geometry}]
      })
      if (!roads.length) throw new Error('OVERPASS_EMPTY_ROAD_NETWORK')
      return roads
    } catch (error) { last=error }
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
    unique.set(coordinateKey(latitude,longitude),{latitude,longitude})
  }

  const points=[...unique.values()].map(({latitude,longitude})=>({lat:latitude,lon:longitude}))
  if (!points.length) return NextResponse.json({ok:true,sourceVersion:SOURCE_VERSION,locations:0,accepted:0,failed:0,changesChampionWeights:false},{headers:{'Cache-Control':'no-store'}})

  let roads:Road[]
  try {
    roads=await fetchRoadNetwork(points)
  } catch (error) {
    console.error('ROAD_HIERARCHY_NETWORK_FETCH_FAILED',error)
    return NextResponse.json({ok:false,error:'ROAD_NETWORK_FETCH_FAILED',sourceVersion:SOURCE_VERSION,locations:points.length,accepted:0,failed:points.length,changesChampionWeights:false},{status:503,headers:{'Cache-Control':'no-store'}})
  }

  const { data: existing, error: existingError }=await db.from('valuation_road_hierarchy_samples').select('id,latitude,longitude').eq('source_name','OpenStreetMap Overpass').eq('source_version',SOURCE_VERSION)
  if (existingError) return NextResponse.json({ok:false,error:'ROAD_SAMPLE_READ_FAILED'},{status:500})
  const existingByCoordinate=new Map((existing as ExistingSample[]??[]).map(row=>[coordinateKey(Number(row.latitude),Number(row.longitude)),row.id]))

  let accepted=0, failed=0
  const observedAt=new Date().toISOString()
  for (const point of unique.values()) {
    try {
      const origin={lat:point.latitude,lon:point.longitude}
      const ranked=roads.map(road=>({road,distance:distanceToRoad(origin,road.geometry)})).sort((a,b)=>a.distance-b.distance)
      const nearest=ranked[0]
      const arterial=ranked.find(candidate=>ARTERIAL.has(candidate.road.highway))
      if (!nearest) { failed++; continue }
      const row={
        latitude:point.latitude,
        longitude:point.longitude,
        nearest_road_name:nearest.road.element.tags?.name??null,
        highway_class:nearest.road.highway,
        hierarchy_rank:RANK[nearest.road.highway]??9,
        distance_to_road_m:Math.round(nearest.distance),
        distance_to_arterial_m:arterial?Math.round(arterial.distance):null,
        access_context:arterial&&arterial.distance<150?'near_arterial':arterial&&arterial.distance<400?'arterial_access':'local_access',
        source_name:'OpenStreetMap Overpass',
        source_version:SOURCE_VERSION,
        source_observed_at:observedAt,
        source_url:'https://www.openstreetmap.org',
        methodology:'nearest distance to OSM road geometry; arterial proximity as structural shadow evidence',
        metadata:{nearest_osm_way_id:nearest.road.element.id,arterial_osm_way_id:arterial?.road.element.id??null,non_binding:true,valuation_adjustment_pct:0},
      }
      const existingId=existingByCoordinate.get(coordinateKey(point.latitude,point.longitude))
      const write=existingId
        ? await db.from('valuation_road_hierarchy_samples').update(row).eq('id',existingId)
        : await db.from('valuation_road_hierarchy_samples').insert(row)
      if (write.error) throw write.error
      accepted++
    } catch (error) {
      console.error('ROAD_HIERARCHY_SAMPLE_WRITE_FAILED',{latitude:point.latitude,longitude:point.longitude,error})
      failed++
    }
  }

  return NextResponse.json({ok:failed===0,sourceVersion:SOURCE_VERSION,roadWays:roads.length,locations:unique.size,accepted,failed,changesChampionWeights:false},{status:failed===0?200:207,headers:{'Cache-Control':'no-store'}})
}
