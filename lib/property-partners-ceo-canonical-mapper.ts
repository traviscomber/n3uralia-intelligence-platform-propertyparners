import type { CeoEditorialSnapshot } from './property-partners-ceo-editorial-pdf'
import type { AudienceSnapshot, SignedOperation } from './property-partners-audience-snapshot'

type Metric={id:string;value:number|null;status:string}
const OFFICES=['Santa María','Nueva Costanera','Lo Beltrán']
const COMPANY='Property Partners Vitacura'
/** Convert audited audience metrics, never legacy aggregates, to the CEO editorial contract. */
export function mapCanonicalCeoSnapshot(
  snapshot:AudienceSnapshot & {sourceSnapshotId?:string; period:{start:string;end:string;sourceCutoff?:string}},
  previous:Record<string,number>,
  operations:SignedOperation[],
):CeoEditorialSnapshot {
  const metric=new Map<string,Metric>(snapshot.metrics.map(m=>[m.id,m]))
  const get=(scope:string,key:string)=>{
    const m=metric.get(scope+'_'+key)
    if(!m || m.status!=='verified' || typeof m.value!=='number' || !Number.isFinite(m.value)) throw new Error('CEO_CANONICAL_METRIC_MISSING:'+scope+'_'+key)
    return m.value
  }
  const period=snapshot.period.start.slice(0,7)
  const prior=(key:string)=>{
    const n=previous[key]
    if(typeof n!=='number'||!Number.isFinite(n)) throw new Error('CEO_PREVIOUS_METRIC_MISSING:'+key)
    return n
  }
  const netClosures=get(COMPANY,'sales'),netUf=get(COMPANY,'sales_uf')
  const closuresActive=operations.filter(o=>!o.adjustment).reduce((s,o)=>s+o.closureCount,0)
  const ufActive=operations.filter(o=>!o.adjustment).reduce((s,o)=>s+o.uf,0)
  const closuresAdjustment=operations.filter(o=>o.adjustment).reduce((s,o)=>s+o.closureCount,0)
  const ufAdjustment=operations.filter(o=>o.adjustment).reduce((s,o)=>s+o.uf,0)
  if(closuresActive+closuresAdjustment!==netClosures||ufActive+ufAdjustment!==netUf) throw new Error('CEO_OPERATION_TOTAL_MISMATCH')
  return {
    period,cutoff:snapshot.period.sourceCutoff??snapshot.period.end,
    sourceVersion:snapshot.sourceSnapshotId??'',
    closuresActive,ufActive,closuresAdjustment,ufAdjustment,
    leads:get(COMPANY,'active'),leadsPrevious:prior('active'),
    visitsScheduled:get(COMPANY,'scheduled'),visitsScheduledPrevious:prior('scheduled'),
    visitsRealized:get(COMPANY,'realized'),visitsRealizedPrevious:prior('realized'),
    stock:get(COMPANY,'stock'),stockPrevious:prior('stock'),
    offices:OFFICES.map(name=>({
      name,closures:get(name,'sales'),uf:get(name,'sales_uf'),leads:get(name,'active'),
      classified:get(name,'classified'),stale90:get(name,'stale90'),
      realized:get(name,'realized'),scheduled:get(name,'scheduled'),stock:get(name,'stock'),
    })),
    operations,
    sources:snapshot.evidence.map(e=>{
      const source=e.source??''
      const match=source.match(/^(.+)#sha256=([a-f\d]{64})$/i)
      if(e.status!=='verified'||!match)throw new Error('CEO_CANONICAL_SOURCE_INVALID')
      return {name:match[1],sha256:match[2]}
    }),
  }
}
