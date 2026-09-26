import { NextRequest, NextResponse } from 'next/server'
import { collectPortalListingDetails } from '@/lib/portal-inmobiliario-collector'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const maxDuration=300

export async function GET(request:NextRequest){
  if(process.env.VERCEL_GIT_COMMIT_REF!=='feat/portal-nearby-neighborhood-intelligence'){
    return new NextResponse(null,{status:404})
  }

  const encoded=request.nextUrl.searchParams.get('urls')||''
  if(!encoded) return NextResponse.json({error:'urls required'},{status:400})

  let urls:string[]=[]
  try{
    const decoded=Buffer.from(encoded,'base64url').toString('utf8')
    const parsed=JSON.parse(decoded)
    if(Array.isArray(parsed)) urls=parsed.filter((value):value is string=>typeof value==='string'&&value.startsWith('https://www.portalinmobiliario.com/')).slice(0,12)
  }catch{
    return NextResponse.json({error:'invalid urls payload'},{status:400})
  }

  if(!urls.length) return NextResponse.json({error:'no valid urls'},{status:400})

  const capture=await collectPortalListingDetails({datasetKind:'portal_houses',listingUrls:urls,waitMs:250})
  return NextResponse.json({
    requested:urls.length,
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
