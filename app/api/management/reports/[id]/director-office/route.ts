import { NextResponse } from 'next/server'
import { requireAnyCapability, accessErrorResponse } from '@/lib/access-guards'
import { createClient } from '@/lib/supabase/server'
import { verifyDirectorOfficeReportScope } from '@/lib/property-partners-director-report-scope'
import { buildManagementReportPdf, type ManagementReportRecord } from '@/lib/management-report-artifact'

export const runtime='nodejs'
/** Office-scoped document. Never falls back to a corporate/global snapshot. */
export async function GET(_request:Request,context:{params:Promise<{id:string}>}) {
  let scope
  try {scope=await requireAnyCapability(['reports.office.read','reports.global.read'])}
  catch(error){return accessErrorResponse(error)}
  const {id}=await context.params
  const db=await createClient()
  const {data,error}=await db.from('management_report_runs')
    .select('id,entity_id,report_type,period_start,period_end,generated_at,snapshot').eq('id',id).maybeSingle()
  if(error)return NextResponse.json({error:'No fue posible cargar el informe.'},{status:500})
  if(!data)return NextResponse.json({error:'Informe no encontrado o fuera de alcance.'},{status:404})
  if(data.report_type!=='director' && data.report_type!=='office')
    return NextResponse.json({error:'No corresponde a un informe de oficina.'},{status:422})
  const snap=data.snapshot as Record<string,unknown>
  try {
    verifyDirectorOfficeReportScope({
      requestScope:scope.scope,officeId:scope.officeId,
      visibleEntityIds:scope.visibleEntityIds,
    },data.entity_id??null,typeof snap.officeEntityId==='string'?snap.officeEntityId:null)
    // Explicitly reject mixed-office corporate snapshots. The editorial report
    // must be issued from an office-only source, never filtered after rendering.
    if(snap.audiencePartnerRows || snap.audienceOperations || snap.offices || !snap.officeVerified)
      throw new Error('DIRECTOR_OFFICE_CANONICAL_SOURCE_REQUIRED')
    const artifact=await buildManagementReportPdf(data as ManagementReportRecord)
    return new Response(Buffer.from(artifact.bytes),{headers:{
      'Content-Type':'application/pdf',
      'Content-Disposition':`attachment; filename="${artifact.filename}"`,
      'Cache-Control':'private, no-store, max-age=0',
      'X-Content-Type-Options':'nosniff',
    }})
  } catch(error) {
    console.error('[director-report] export denied',{reportId:id,code:error instanceof Error?error.message:'unknown'})
    return NextResponse.json({error:'Informe de oficina no disponible o fuera de alcance.'},{status:403})
  }
}
