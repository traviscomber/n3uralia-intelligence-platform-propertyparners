import type { AudienceSnapshot } from './property-partners-audience-snapshot'
import type { DirectorOfficeEditorial } from './property-partners-director-editorial-pdf'

const OFFICES=['Santa María','Nueva Costanera','Lo Beltrán'] as const
type VerifiedPrevious={leads:number;stock:number;visitsScheduled:number;visitsRealized:number}
/** Reject unverifiable office details instead of manufacturing missing comparisons. */
export function mapVerifiedDirectorOffice(
 snapshot:AudienceSnapshot & {sourceSnapshotId?:string},
 office:string, previous:VerifiedPrevious,
 gradeA:{total:number;stale15:number},
):DirectorOfficeEditorial {
 if(!OFFICES.includes(office as typeof OFFICES[number]))throw new Error('DIRECTOR_INVALID_OFFICE')
 const metrics=new Map(snapshot.metrics.map(m=>[m.id,m]))
 function get(code:string) {
  const record=metrics.get(office+'_'+code)
  if(!record||record.status!=='verified'||typeof record.value!=='number'||!Number.isFinite(record.value)||!record.evidenceRefs?.length)
   throw new Error('DIRECTOR_CANONICAL_METRIC_MISSING:'+code)
  return record.value
 }
 if(!snapshot.sourceSnapshotId)throw new Error('DIRECTOR_SOURCE_MISSING')
 const numbers=[...Object.values(previous),gradeA.total,gradeA.stale15]
 if(numbers.some(n=>!Number.isFinite(n)))throw new Error('DIRECTOR_COMPARISON_MISSING')
 return {
  period:snapshot.period.start.slice(0,7),cutoff:snapshot.period.end,
  sourceId:snapshot.sourceSnapshotId,office,
  closures:get('sales'),uf:get('sales_uf'),leads:get('active'),
  stock:get('stock'),classified:get('classified'),stale90:get('stale90'),
  visitsRealized:get('realized'),visitsScheduled:get('scheduled'),
  captures:get('captured'),suspended:get('suspended'),
  gradeATotal:gradeA.total,gradeAStale15:gradeA.stale15,previous,
 }
}
