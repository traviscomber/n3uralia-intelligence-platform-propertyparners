import {NextResponse} from 'next/server'
import {requireCapability,accessErrorResponse} from '@/lib/access-guards'
import {createClient} from '@/lib/supabase/server'
import {buildPartnerEditorialPdf} from '@/lib/property-partners-partner-editorial-pdf'
import {verifyAudienceSnapshot,type AudienceSnapshot,type PartnerReportRow} from '@/lib/property-partners-audience-snapshot'
export const runtime='nodejs'
/** Whole-company partner roster is confidential: CEO/admin only. Self-scoped
 * partner exports must be created separately and filtered server-side. */
export async function GET(_request:Request,context:{params:Promise<{id:string}>}){
 try{await requireCapability('reports.global.read')}catch(error){return accessErrorResponse(error)}
 const {id}=await context.params
 const db=await createClient()
 const {data,error}=await db.from('management_report_runs')
  .select('id,report_type,period_start,snapshot').eq('id',id).maybeSingle()
 if(error)return NextResponse.json({error:'No fue posible cargar el reporte.'},{status:500})
 if(!data)return NextResponse.json({error:'Reporte no encontrado.'},{status:404})
 if(data.report_type!=='partner')return NextResponse.json({error:'Audiencia incorrecta.'},{status:422})
 const snap=data.snapshot as Record<string,unknown>
 if(!Array.isArray(snap.metrics)||!Array.isArray(snap.evidence)||!snap.period||!snap.sourceSnapshotId||
    !Array.isArray(snap.audiencePartnerRows)||!snap.audiencePartnerRoster)
  return NextResponse.json({error:'Detalle canónico nominal incompleto.'},{status:422})
 try{
  const checked=verifyAudienceSnapshot(snap as unknown as AudienceSnapshot)
  if(checked.period!==data.period_start.slice(0,7))throw new Error('PARTNER_REPORT_PERIOD_MISMATCH')
  const evidence=(snap as unknown as AudienceSnapshot).evidence.map(e=>{
   const match=e.source?.match(/^(.+)#sha256=([a-f\d]{64})$/i)
   if(e.status!=='verified'||!match)throw new Error('PARTNER_EVIDENCE_INVALID')
   return {name:match[1],sha256:match[2]}
  })
  const period=(snap.period as {end:string}).end
  const output=await buildPartnerEditorialPdf({
   period:checked.period,cutoff:period,sourceId:String(snap.sourceSnapshotId),
   rows,
   roster:snap.audiencePartnerRoster as Record<string,string[]>,sources:evidence,
  })
  return new Response(Buffer.from(output.bytes),{headers:{
   'Content-Type':'application/pdf',
   'Content-Disposition':`attachment; filename="${output.filename}"`,
   'Cache-Control':'private, no-store, max-age=0','X-Content-Type-Options':'nosniff',
  }})
 }catch(error){
  console.error('[partner-editorial] validation failed',{reportId:id,code:error instanceof Error?error.message:'unknown'})
  return NextResponse.json({error:'Informe nominal pendiente de conciliación.'},{status:422})
 }
}
