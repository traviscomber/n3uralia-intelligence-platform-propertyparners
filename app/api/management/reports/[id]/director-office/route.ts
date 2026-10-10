import { NextResponse } from 'next/server'
import { requireAnyCapability, accessErrorResponse } from '@/lib/access-guards'
import { createClient } from '@/lib/supabase/server'
import { verifyDirectorOfficeReportScope } from '@/lib/property-partners-director-report-scope'
import { buildDirectorOfficeEditorialPdf } from '@/lib/property-partners-director-editorial-pdf'
import { mapVerifiedDirectorOffice } from '@/lib/property-partners-director-canonical-mapper'
import { verifyAudienceSnapshot, type AudienceSnapshot } from '@/lib/property-partners-audience-snapshot'

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
    if(!Array.isArray(snap.metrics)||!Array.isArray(snap.evidence)||!snap.period||!snap.sourceSnapshotId)
      throw new Error('DIRECTOR_CANONICAL_SNAPSHOT_MISSING')
    const verified=verifyAudienceSnapshot(snap as unknown as AudienceSnapshot)
    if(verified.period!==data.period_start.slice(0,7))throw new Error('DIRECTOR_PERIOD_MISMATCH')
    const office=typeof snap.officeName==='string'?snap.officeName:null
    if(!office||(scope.scope!=='global' && office!==scope.officeName))throw new Error('DIRECTOR_OFFICE_NAME_MISMATCH')
    const comparisons=snap.officePreviousVerified
    if(!comparisons||typeof comparisons!=='object'||Array.isArray(comparisons))
      throw new Error('DIRECTOR_PREVIOUS_COMPARISONS_MISSING')
    const editorial=mapVerifiedDirectorOffice(
      snap as unknown as AudienceSnapshot & {sourceSnapshotId:string},
      office,comparisons as {leads:number;stock:number;visitsScheduled:number;visitsRealized:number},
    )
    const artifact=await buildDirectorOfficeEditorialPdf(editorial)
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
