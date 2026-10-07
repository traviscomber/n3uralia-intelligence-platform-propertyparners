import Link from 'next/link'
import { Download, ExternalLink, FileText, Send } from 'lucide-react'
import { requirePageCapability } from '@/lib/access-guards'
import {
  canonicalReportKind,
  extractCanonicalReportTrace,
  formatCanonicalReportPeriod,
  normalizeCanonicalReportStatus,
  parseCanonicalReportContent,
  resolveCanonicalReportArtifactUrl,
} from '@/lib/canonical-report-delivery'
import { formatPropertyPartnersDateTime } from '@/lib/property-partners-time'
import { createAdminClient } from '@/lib/supabase/admin'
import { DataStatusBar, WorkspaceHeader, WorkspaceShell } from '@/components/ui/workspace'
import { OperationalState } from '@/components/ui/operational-state'
import { CanonicalReportReviewActions } from '@/components/management/canonical-report-review-actions'

type CanonicalDocumentRow = { id:string; title:string; content:string; doc_type:string|null; tags:string[]|null; created_at:string }
type ReportRecord = { id:string; title:string; kind:string; period:string; status:string; createdAt:string; pdfUrl:string|null; downloadUrl:string|null; sourceCount:number; model:string|null; promptVersion:string|null; costUsd:number|null }
function formatDate(value:string){return formatPropertyPartnersDateTime(value)}
function reportPeriodLabel(value:string){
  const match=value.match(/^(\d{4})-(\d{2})-(\d{2})\s+—\s+(\d{4})-(\d{2})-(\d{2})$/)
  if(!match)return value
  const [,startYear,startMonth,startDay,endYear,endMonth,endDay]=match
  const start=new Date(`${startYear}-${startMonth}-${startDay}T12:00:00.000Z`)
  const end=new Date(`${endYear}-${endMonth}-${endDay}T12:00:00.000Z`)
  if(Number.isNaN(start.getTime())||Number.isNaN(end.getTime()))return value
  if(startYear===endYear&&startMonth===endMonth){
    const label=new Intl.DateTimeFormat('es-CL',{month:'long',year:'numeric',timeZone:'UTC'}).format(start)
    return label.charAt(0).toUpperCase()+label.slice(1)
  }
  return `${new Intl.DateTimeFormat('es-CL',{dateStyle:'medium',timeZone:'UTC'}).format(start)} — ${new Intl.DateTimeFormat('es-CL',{dateStyle:'medium',timeZone:'UTC'}).format(end)}`
}
function reportTitleLabel(value:string){
  return value
    .replace(/\s*·\s*CEO Intelligence\s*·\s*/i,' · Informe ejecutivo · ')
    .replace(/CEO Intelligence/gi,'Informe ejecutivo')
}
function reportKindLabel(value:string){return value==='CEO Intelligence'?'Informe ejecutivo':value}
function reportPeriodEnd(value:string){const match=value.match(/(\d{4}-\d{2}-\d{2})$/);return match?.[1]??null}
function isClientCanonical(document:CanonicalDocumentRow){const tags=document.tags??[];return !tags.includes('reportin-test')&&!tags.includes('qa')&&!tags.includes('mock')&&!tags.includes('demo')&&!tags.includes('fixture')&&!tags.includes('superseded')}
const DELIVERABLE_STATUSES=new Set(['Aprobado','Enviado','Reenviado','Acusado recibo','Registrado'])
function hasArtifact(report:ReportRecord){return Boolean(report.pdfUrl||report.downloadUrl)}
function isDeliverable(report:ReportRecord){return report.period!=='Sin período'&&hasArtifact(report)&&DELIVERABLE_STATUSES.has(report.status)}

export default async function CanonicalClientReportsPage(){
  const scope=await requirePageCapability('reports.global.read')
  const canReview=scope.role==='admin'||scope.role==='ceo'
  const supabase=createAdminClient()
  const [{data,error},{data:latestPeriods,error:latestPeriodError}]=await Promise.all([
    supabase.from('knowledge_documents').select('id,title,content,doc_type,tags,created_at').contains('tags',['n3uralia-client-report']).order('created_at',{ascending:false}).limit(48),
    supabase.from('management_metric_values').select('period_start,period_end').order('period_end',{ascending:false}).limit(1),
  ])
  const documents=(error?[]:(data||[]) as CanonicalDocumentRow[]).filter(isClientCanonical)
  const reports:ReportRecord[]=documents.map(document=>{const parsed=parseCanonicalReportContent(document.content);const trace=extractCanonicalReportTrace(parsed);const metadata={docType:document.doc_type,tags:document.tags};return{id:document.id,title:document.title,kind:canonicalReportKind(parsed),period:formatCanonicalReportPeriod(parsed),status:normalizeCanonicalReportStatus(parsed,document.tags),createdAt:document.created_at,pdfUrl:resolveCanonicalReportArtifactUrl(parsed,'pdf',document.id,metadata),downloadUrl:resolveCanonicalReportArtifactUrl(parsed,'download',document.id,metadata),...trace}})
  const current=reports.find(isDeliverable)??null
  const latestCanonicalPeriod=!latestPeriodError&&latestPeriods?.[0]?{start:String(latestPeriods[0].period_start),end:String(latestPeriods[0].period_end)}:null
  const currentPeriodEnd=current?reportPeriodEnd(current.period):null
  const periodAhead=Boolean(latestCanonicalPeriod&&latestCanonicalPeriod.end!==currentPeriodEnd)
  const latestDraft=latestCanonicalPeriod
    ? reports.find(report=>reportPeriodEnd(report.period)===latestCanonicalPeriod.end&&!isDeliverable(report))??null
    : null
  const history=reports.filter(report=>report.id!==current?.id&&report.id!==latestDraft?.id)
  const incomplete=reports.filter(report=>!isDeliverable(report))
  const deliverableCount=reports.filter(isDeliverable).length
  const status=reports.length===0?'blocked':incomplete.length>0?'partial':'ready'
  const cutoff=latestDraft?formatDate(latestDraft.createdAt):current?formatDate(current.createdAt):'—'

  if(error){
    return <WorkspaceShell>
      <WorkspaceHeader eyebrow="Informes" title="Último informe disponible" meta="Consulta no disponible" actions={[{label:'Generar y revisar',href:'/dashboard/reportes/operacion',primary:true,icon:<Send size={15}/>}]} />
      <div className="mt-6 max-w-5xl"><OperationalState kind="error" title="No fue posible consultar informes" description="La consulta de informes falló. No se interpreta este estado como ausencia de informes; reintenta más tarde o revisa la operación de reportes." /></div>
    </WorkspaceShell>
  }

  return <WorkspaceShell>
    <WorkspaceHeader eyebrow="Informes" title="Último informe disponible" meta={latestDraft?`${reportPeriodLabel(latestDraft.period)} · ${latestDraft.status}`:periodAhead&&latestCanonicalPeriod?`${reportPeriodLabel(`${latestCanonicalPeriod.start} — ${latestCanonicalPeriod.end}`)} · listo para generar`:current?`${current.status} · ${reportPeriodLabel(current.period)}`:'Sin informe listo para entrega'} actions={[{label:'Generar y revisar',href:'/dashboard/reportes/operacion',primary:true,icon:<Send size={15}/>}]} />

    {periodAhead&&latestCanonicalPeriod?<section className="mt-6 max-w-5xl border-y border-[var(--n3-line)] py-5">
      <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">Período más reciente</p>
      {latestDraft?<div className="mt-2 flex flex-wrap items-center justify-between gap-4">
        <div><p className="text-base font-semibold">{reportPeriodLabel(latestDraft.period)} · {latestDraft.status}</p><p className="mt-1 text-xs text-[var(--n3-text-muted)]">El borrador está generado y pendiente de revisión antes de aprobar o entregar.</p></div>
        <Link href="/dashboard/reportes/operacion" className="inline-flex min-h-11 items-center px-4 text-xs font-semibold text-[var(--n3-teal-soft)]">Revisar borrador</Link>
      </div>:<div className="mt-2 flex flex-wrap items-center justify-between gap-4">
        <div><p className="text-base font-semibold">{reportPeriodLabel(`${latestCanonicalPeriod.start} — ${latestCanonicalPeriod.end}`)}</p><p className="mt-1 text-xs text-[var(--n3-text-muted)]">Los datos del período ya están disponibles. Falta generar y revisar el informe ejecutivo.</p></div>
        <Link href="/dashboard/reportes/operacion" className="inline-flex min-h-11 items-center px-4 text-xs font-semibold text-[var(--n3-teal-soft)]">Generar y revisar</Link>
      </div>}
    </section>:null}

    <section className="mt-6 max-w-5xl">
      {current?<><p className="mb-2 text-[10px] uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">Último aprobado</p><article className="grid gap-6 border-y border-[var(--n3-line)] py-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">{reportPeriodLabel(current.period)}</p>
          <h2 className="mt-2 break-words text-xl font-semibold">{reportTitleLabel(current.title)}</h2>
          <p className="mt-2 text-sm text-[var(--n3-text-muted)]">Actualizado {formatDate(current.createdAt)} · hora Chile</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {current.pdfUrl?<Link href={current.pdfUrl} target="_blank" className="inline-flex min-h-11 items-center gap-2 border border-[var(--n3-line)] px-4 text-xs"><ExternalLink size={14}/>Abrir</Link>:null}
          {current.downloadUrl?<Link href={current.downloadUrl} className="inline-flex min-h-11 items-center gap-2 bg-[var(--primary)] px-4 text-xs font-semibold text-white"><Download size={14}/>Descargar PDF</Link>:null}
        </div>
      </article></>:<OperationalState compact kind="empty" title="Sin informe listo para entrega" description="Aún no hay un informe listo para entrega. Los borradores incompletos quedan en el historial."/>}
    </section>

    {current?<details className="mt-5 max-w-5xl border-b border-[var(--n3-line)] pb-5">
      <summary className="flex min-h-11 cursor-pointer items-center text-xs font-medium text-[var(--n3-text-muted)] hover:text-[var(--n3-text-light)]">Ver trazabilidad</summary>
      <div className="mt-4 grid gap-4 text-xs text-[var(--n3-text-muted)] sm:grid-cols-2 lg:grid-cols-4">
        <div><p className="uppercase tracking-[0.12em]">Tipo</p><p className="mt-1 text-sm text-[var(--n3-text-light)]">{reportKindLabel(current.kind)}</p></div>
        <div><p className="uppercase tracking-[0.12em]">Fuentes</p><p className="mt-1 text-sm text-[var(--n3-text-light)]">{current.sourceCount||'—'}</p></div>
        <div><p className="uppercase tracking-[0.12em]">Estado</p><p className="mt-1 text-sm text-[var(--n3-text-light)]">{current.status}</p></div>
        <div><p className="uppercase tracking-[0.12em]">Actualizado</p><p className="mt-1 text-sm text-[var(--n3-text-light)]">{formatDate(current.createdAt)}</p></div>
      </div>
    </details>:null}

    <details className="mt-8 max-w-5xl border-t border-[var(--n3-line)] pt-4">
      <summary className="min-h-11 cursor-pointer py-3 text-xs font-medium text-[var(--n3-text-muted)] hover:text-[var(--n3-text-light)]">Ver historial ({history.length})</summary>
      <section className="mt-2">
        {history.length?<div className="divide-y divide-[var(--n3-line)]">{history.map(report=>{const incompleteReport=!isDeliverable(report);const workflowLabel=report.status==='Borrador'||report.status==='En revisión'?report.status:incompleteReport?'Incompleto':report.status;return <article key={report.id} className="grid gap-3 py-4 sm:grid-cols-[140px_minmax(0,1fr)_120px_minmax(140px,auto)] sm:items-center"><span className="text-xs text-[var(--n3-text-muted)]">{reportPeriodLabel(report.period)}</span><div className="min-w-0"><p className="break-words text-sm font-medium sm:truncate">{reportTitleLabel(report.title)}</p><p className="mt-1 text-[11px] text-[var(--n3-text-muted)]">{reportKindLabel(report.kind)} · {formatDate(report.createdAt)} · hora Chile</p></div><span className={`text-xs ${incompleteReport?'text-[#f0c96a]':'text-[var(--n3-text-muted)]'}`}>{workflowLabel}</span><div className="flex flex-wrap items-center gap-2 sm:justify-end">{report.pdfUrl?<Link href={report.pdfUrl} target="_blank" aria-label={`Abrir ${reportTitleLabel(report.title)}`} className="inline-flex h-11 w-11 items-center justify-center border border-[var(--n3-line)]"><ExternalLink size={14}/></Link>:null}{report.downloadUrl?<Link href={report.downloadUrl} aria-label={`Descargar ${reportTitleLabel(report.title)}`} className="inline-flex h-11 w-11 items-center justify-center border border-[var(--n3-line)]"><Download size={14}/></Link>:null}{!hasArtifact(report)?<span aria-label="PDF no vinculado" className="inline-flex h-11 w-11 items-center justify-center border border-[var(--n3-line)] text-[var(--n3-text-muted)]"><FileText size={14}/></span>:null}{canReview?<CanonicalReportReviewActions reportId={report.id} status={report.status}/>:null}</div></article>})}</div>:<div className="py-6 text-sm text-[var(--n3-text-muted)]">Sin versiones anteriores.</div>}

      </section>
    </details>

    <details className="mt-8 max-w-5xl">
      <summary className="flex min-h-11 cursor-pointer items-center text-xs font-medium text-[var(--n3-text-muted)] hover:text-[var(--n3-text-light)]">Ver calidad de datos</summary>
      <DataStatusBar cutoff={cutoff} coverage={reports.length?`${deliverableCount}/${reports.length} entregables con período y PDF`:'Sin informes'} issues={incomplete.length} status={status}/>
    </details>
  </WorkspaceShell>
}
