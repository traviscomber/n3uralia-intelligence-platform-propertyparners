import { NextResponse } from 'next/server'
import { requireCapability, accessErrorResponse } from '@/lib/access-guards'
import { createClient } from '@/lib/supabase/server'
import { mapCanonicalCeoSnapshot } from '@/lib/property-partners-ceo-canonical-mapper'
import { buildCeoEditorialPdf } from '@/lib/property-partners-ceo-editorial-pdf'
import { verifyAudienceSnapshot, type AudienceSnapshot, type SignedOperation } from '@/lib/property-partners-audience-snapshot'

export const runtime='nodejs'
/** CEO-only export; never share a company-wide report through an office/partner scope. */
export async function GET(_request:Request,context:{params:Promise<{id:string}>}) {
  try { await requireCapability('reports.global.read') } catch(error) { return accessErrorResponse(error) }
  const {id}=await context.params
  const supabase=await createClient()
  const {data,error}=await supabase.from('management_report_runs')
    .select('id,report_type,period_start,period_end,snapshot').eq('id',id).maybeSingle()
  if(error) return NextResponse.json({error:'No fue posible cargar el reporte.'},{status:500})
  if(!data) return NextResponse.json({error:'Reporte no encontrado o fuera de alcance.'},{status:404})
  if(data.report_type!=='executive') return NextResponse.json({error:'No corresponde a un informe CEO.'},{status:422})
  const snap=data.snapshot as Record<string,unknown>
  if(!Array.isArray(snap.metrics)||!Array.isArray(snap.evidence)||!snap.period||typeof snap.period!=='object'||
    !snap.sourceSnapshotId||!Array.isArray(snap.audienceOperations)||!snap.previousVerifiedMetrics) {
    return NextResponse.json({error:'Datos canónicos del CEO incompletos. No se genera un informe parcial.'},{status:422})
  }
  try {
    const canonical=snap as unknown as AudienceSnapshot & {sourceSnapshotId:string;period:{start:string;end:string;sourceCutoff?:string}}
    const verified=verifyAudienceSnapshot(canonical)
    if(verified.period!==data.period_start.slice(0,7)) throw new Error('CEO_SOURCE_PERIOD_MISMATCH')
    const mapped=mapCanonicalCeoSnapshot(canonical,
      snap.previousVerifiedMetrics as Record<string,number>,snap.audienceOperations as SignedOperation[])
    const output=await buildCeoEditorialPdf(mapped)
    return new Response(Buffer.from(output.bytes),{headers:{
      'Content-Type':'application/pdf',
      'Content-Disposition':`attachment; filename="${output.filename}"`,
      'Cache-Control':'private, no-store, max-age=0',
      'X-Content-Type-Options':'nosniff',
    }})
  } catch(error) {
    console.error('[ceo-editorial] canonical validation failed',{reportId:id,code:error instanceof Error?error.message:'unknown'})
    return NextResponse.json({error:'Informe CEO pendiente de conciliación canónica.'},{status:422})
  }
}
