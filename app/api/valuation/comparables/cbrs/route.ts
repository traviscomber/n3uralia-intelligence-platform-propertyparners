import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { accessErrorResponse, requireAnyCapability } from '@/lib/access-guards'

type Payload = { propertyType: 'Casa' | 'Departamento'; neighborhood: string; usefulAreaM2?: number; builtAreaM2?: number; latitude?: number; longitude?: number }
type Row = { id:string; event_key:string; transaction_date:string; address:string|null; rol:string|null; price_uf:number|string|null; built_area_m2:number|string|null; land_area_m2:number|string|null; latitude:number|string|null; longitude:number|string|null; neighborhood:string|null }
const num=(v:unknown)=>{const n=Number(v);return Number.isFinite(n)?n:0}
const similarity=(a:number,b:number)=>a>0&&b>0?Math.max(0,1-Math.min(Math.abs(a-b)/a,1)):0.5
function distance(lat1:number,lon1:number,lat2:number,lon2:number){const r=(v:number)=>v*Math.PI/180,e=6371000,dLat=r(lat2-lat1),dLon=r(lon2-lon1),a=Math.sin(dLat/2)**2+Math.cos(r(lat1))*Math.cos(r(lat2))*Math.sin(dLon/2)**2;return e*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a))}

export async function POST(request:Request){
  try{
    await requireAnyCapability(['valuations.self.create','valuations.office.review','valuations.global.approve'])
    const payload=await request.json() as Payload
    if(!payload?.neighborhood||!['Casa','Departamento'].includes(payload.propertyType)) return NextResponse.json({error:'Tipo y barrio son obligatorios.'},{status:400})
    const admin=createAdminClient()
    const {data,error}=await admin.from('market_cbrs_reference_transactions').select('id,event_key,transaction_date,address,rol,price_uf,built_area_m2,land_area_m2,latitude,longitude,neighborhood').eq('property_type',payload.propertyType).ilike('neighborhood',payload.neighborhood.trim()).not('price_uf','is',null).gt('price_uf',0).not('built_area_m2','is',null).gt('built_area_m2',0).order('transaction_date',{ascending:false}).limit(150)
    if(error) return NextResponse.json({error:'No fue posible consultar ventas CBRS.'},{status:422})
    const subjectArea=payload.propertyType==='Departamento'?num(payload.usefulAreaM2):num(payload.builtAreaM2)
    const suggestions=((data??[]) as unknown as Row[]).map((row)=>{
      const built=num(row.built_area_m2),land=num(row.land_area_m2),price=num(row.price_uf)
      const weighted=payload.propertyType==='Casa'?built+land/4:built
      const lat=num(row.latitude),lon=num(row.longitude)
      const distanceMeters=payload.latitude&&payload.longitude&&lat&&lon?Math.round(distance(payload.latitude,payload.longitude,lat,lon)):undefined
      const locationScore=distanceMeters===undefined?0.05:Math.max(0,1-Math.min(distanceMeters/3000,1))*0.1
      const ageDays=Math.max(0,(Date.now()-new Date(row.transaction_date).getTime())/86400000)
      const recency=Math.max(0,1-Math.min(ageDays/(365*10),1))*0.15
      const score=similarity(subjectArea,built)*0.75+locationScore+recency
      return {id:`cbrs-${row.id}`,sourceType:'CBRS' as const,sourceReference:`CBRS ${row.event_key}${row.rol?` · ROL ${row.rol}`:''}`,address:row.address||'Venta registrada CBRS',neighborhood:row.neighborhood||payload.neighborhood,propertyType:payload.propertyType,totalAreaM2:payload.propertyType==='Departamento'?built:undefined,usefulAreaM2:payload.propertyType==='Departamento'?built:undefined,builtAreaM2:built,landAreaM2:land||undefined,priceUf:price,priceUfM2:Number((price/weighted).toFixed(2)),similarityScore:Number(Math.min(1,score).toFixed(4)),selected:false,adjustmentPct:0,adjustmentNotes:'Venta efectiva CBRS consolidada por inscripción.',distanceMeters,transactionDate:row.transaction_date,quality:'canonical'}
    }).sort((a,b)=>b.similarityScore-a.similarityScore).slice(0,8)
    return NextResponse.json({suggestions,source:'CBRS Vitacura canonical 2014-2026'})
  }catch(error){return accessErrorResponse(error)}
}
