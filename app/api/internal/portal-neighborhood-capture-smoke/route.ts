import { NextRequest, NextResponse } from 'next/server'
import { collectPortalListingDetails } from '@/lib/portal-inmobiliario-collector'
import { createServiceClient } from '@/lib/supabase/service'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const maxDuration=300

export async function GET(request:NextRequest){
  if(process.env.VERCEL_GIT_COMMIT_REF!=='feat/portal-nearby-neighborhood-intelligence'){
    return new NextResponse(null,{status:404})
  }
  const ids=(request.nextUrl.searchParams.get('ids')||'')
    .split(',').map((value)=>value.trim()).filter(Boolean).slice(0,24)
  if(!ids.length) return NextResponse.json({error:'ids required'},{status:400})

  const db=createServiceClient()
  const {data,error}=await db
    .from('market_current_listings')
    .select('source_listing_id,url')
    .in('source_listing_id',ids)
    .in('status',['active','observed'])
  if(error) return NextResponse.json({error:'listing lookup failed'},{status:500})
  const urlById=new Map((data||[]).filter((row)=>row.url).map((row)=>[row.source_listing_id,row.url as string]))
  const ordered=ids.flatMap((id)=>urlById.has(id)?[urlById.get(id)!]:[])
  const capture=await collectPortalListingDetails({datasetKind:'portal_houses',listingUrls:ordered,waitMs:250})
  return NextResponse.json({
    requested:ids.length,
    found:ordered.length,
    captured:capture.rows.length,
    failures:capture.failures,
    rows:capture.rows.map((row)=>({
      source_listing_id:row.source_listing_id,
      latitude:row.latitude??null,
      longitude:row.longitude??null,
      nearby_places:Array.isArray(row.nearby_places)?row.nearby_places:[],
      nearby_place_names:Array.isArray(row.nearby_place_names)?row.nearby_place_names:[],
      address:row.address??null,
      title:row.title??null,
    }))
  },{headers:{'Cache-Control':'no-store'}})
}
