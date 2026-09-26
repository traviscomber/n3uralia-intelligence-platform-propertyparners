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
import { formatPropertyPartnersDateTime, propertyPartnersTimeZoneLabel } from '@/lib/property-partners-time'
import { createAdminClient } from '@/lib/supabase/admin'
import { DataStatusBar, WorkspaceHeader, WorkspaceShell } from '@/components/ui/workspace'
import { OperationalState } from '@/components/ui/operational-state'
import { CanonicalReportReviewActions } from '@/components/management/canonical-report-review-actions'

type CanonicalDocumentRow = { id:string; title:string; content:string; doc_type:string|null; tags:string[]|null; created_at:string }
type ReportRecord = { id:string; title:string; kind:string; period:string; status:string; createdAt:string; pdfUrl:string|null; downloadUrl:string|null; sourceCount:number; model:string|null; promptVersion:string|null; costUsd:number|null }
function formatDate(value:string){return formatPropertyPartnersDateTime(value)}
function isClientCanonical(document:CanonicalDocumentRow){const tags=document.tags??[];return !tags.includes('reportin-test')&&!tags.includes('qa')&&!tags.includes('mock')&&!tags.includes('demo')&&!tags.includes('fixture')&&!tags.includes('superseded')}
const DELIVERABLE_STATUSES=new Set(['Aprobado','Enviado','Reenviado','Acusado recibo','Registrado'])
function hasArtifact(report:ReportRecord){return Boolean(report.pdfUrl||report.downloadUrl)}
function isDeliverable(report:ReportRecord){return report.period!=='Sin período'&&hasArtifact(report)&&DELIVERABLE_STATUSES.has(report.status)}

export default async function CanonicalClientReportsPage(){
  const scope=await requirePageCapability('reports.global.read')
  const canReview=scope.role==='admin'||scope.role==='ceo'
  const supabase=createAdminClient()
  const {data,error}=await supabase.from('knowledge_documents').select('id,title,content,doc_type,tags,created_at').contains('tags',['n3uralia-client-report']).order('created_at',{ascending:false}).limit(48)
  const documents=(error?[]:(data||[]) as CanonicalDocumentRow[]).filter(isClientCanonical)
  const reports:ReportRecord[]=documents.map(document=>{const parsed=parseCanonicalReportContent(document.content);const trace=extractCanonicalReportTrace(parsed);const metadata={docType:document.doc_type,tags:document.tags};return{id:document.id,title:document.title,kind:canonicalReportKind(parsed),period:formatCanonicalReportPeriod(parsed),status:normalizeCanonicalReportStatus(parsed,document.tags),createdAt:document.created_at,pdfUrl:resolveCanonicalReportArtifactUrl(parsed,'pdf',document.id,metadata),downloadUrl:resolveCanonicalReportArtifactUrl(parsed,'download',document.id,metadata),...trace}})
  const current=reports.find(isDeliverable)??null
  const history=reports.filter(report=>report.id!==current?.id)
  const incomplete=reports.filter(report=>!isDeliverable(report))
  const deliverableCount=reports.filter(isDeliverable).length
  const status=reports.length===0?'blocked':incomplete.length>0?'partial':'ready'
  const cutoff=current?formatDate(current.createdAt):'—'

  if(error){
    return <WorkspaceShell>
      <WorkspaceHeader eyebrow="Pilar 05 · Informes" title="Último informe" meta="Consulta no disponible" actions={[{label:'Generar y revisar',href:'/dashboard/reportes/operacion',primary:true,icon:<Send size={15}/>}]} />
      <div className="mt-6 max-w-5xl"><OperationalState kind="error" title="No fue posible consultar informes" description="La consulta de informes canónicos falló. No se interpreta este estado como ausencia de informes; reintenta más tarde o revisa la operación de reportes." /></div>
    </WorkspaceShell>
  }

  return <WorkspaceShell>
    <WorkspaceHeader eyebrow="Pilar 05 · Informes" title="Último informe entregable" meta={current?`${current.kind} · ${current.status} · ${current.period}`:'Sin informe entregable'} actions={[{label:'Generar y revisar',href:'/dashboard/reportes/operacion',primary:true,icon:<Send size={15}/>}]} />

    <section className="mt-6 max-w-5xl">
      {current?<article className="grid gap-6 border-y border-[var(--n3-line)] py-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">{current.kind} · {current.period}</p>
          <h2 className="mt-2 break-words text-xl font-semibold">{current.title}</h2>
          <p className="mt-2 text-sm text-[var(--n3-text-muted)]">Generado {formatDate(current.createdAt)} · {propertyPartnersTimeZoneLabel()}</p>
          <p className="mt-1 text-sm text-[var(--n3-text-muted)]">Estado: {current.status}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {current.pdfUrl?<Link href={current.pdfUrl} target="_blank" className="inline-flex min-h-11 items-center gap-2 border border-[var(--n3-line)] px-4 text-xs"><ExternalLink size={14}/>Abrir</Link>:null}
          {current.downloadUrl?<Link href={current.downloadUrl} className="inline-flex min-h-11 items-center gap-2 bg-[var(--primary)] px-4 text-xs font-semibold text-white"><Download size={14}/>Descargar PDF</Link>:null}
        </div>
      </article>:<OperationalState compact kind="empty" title="Sin informe listo para entrega" description="Aún no hay un informe canónico listo para entrega. Los borradores incompletos quedan en el historial."/>}
    </section>

    {current?<details className="mt-5 max-w-5xl border-b border-[var(--n3-line)] pb-5">
      <summary className="flex min-h-11 cursor-pointer items-center text-xs font-medium text-[var(--n3-text-muted)] hover:text-[var(--n3-text-light)]">Ver trazabilidad</summary>
      <div className="mt-4 grid gap-4 text-xs text-[var(--n3-text-muted)] sm:grid-cols-2 lg:grid-cols-4">
        <div><p className="uppercase tracking-[0.12em]">Fuentes</p><p className="mt-1 text-sm text-[var(--n3-text-light)]">{current.sourceCount||'—'}</p></div>
        <div><p className="uppercase tracking-[0.12em]">Modelo</p><p className="mt-1 break-words text-sm text-[var(--n3-text-light)]">{current.model||'—'}</p></div>
        <div><p className="uppercase tracking-[0.12em]">Versión</p><p className="mt-1 break-words text-sm text-[var(--n3-text-light)]">{current.promptVersion||'—'}</p></div>
        <div><p className="uppercase tracking-[0.12em]">Costo técnico</p><p className="mt-1 text-sm text-[var(--n3-text-light)]">{current.costUsd==null?'—':`US$ ${current.costUsd.toFixed(4)}`}</p></div>
      </div>
    </details>:null}

    <section className="mt-8 max-w-5xl">
      <div className="flex items-center justify-between border-b border-[var(--n3-line)] pb-2"><h2 className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Historial</h2><span className="text-xs tabular-nums text-[var(--n3-text-muted)]">{history.length}</span></div>
      {history.length?<div className="divide-y divide-[var(--n3-line)]">{history.map(report=>{const incompleteReport=!isDeliverable(report);const workflowLabel=report.status==='Borrador'||report.status==='En revisión'?report.status:incompleteReport?'Incompleto':report.status;return <article key={report.id} className="grid gap-3 py-4 sm:grid-cols-[140px_minmax(0,1fr)_120px_minmax(140px,auto)] sm:items-center"><span className="text-xs text-[var(--n3-text-muted)]">{report.period}</span><div className="min-w-0"><p className="break-words text-sm font-medium sm:truncate">{report.title}</p><p className="mt-1 text-[11px] text-[var(--n3-text-muted)]">{report.kind} · {formatDate(report.createdAt)} · hora Chile</p></div><span className={`text-xs ${incompleteReport?'text-[#f0c96a]':'text-[var(--n3-text-muted)]'}`}>{workflowLabel}</span><div className="flex flex-wrap items-center gap-2 sm:justify-end">{report.pdfUrl?<Link href={report.pdfUrl} target="_blank" aria-label={`Abrir ${report.title}`} className="inline-flex h-11 w-11 items-center justify-center border border-[var(--n3-line)]"><ExternalLink size={14}/></Link>:null}{report.downloadUrl?<Link href={report.downloadUrl} aria-label={`Descargar ${report.title}`} className="inline-flex h-11 w-11 items-center justify-center border border-[var(--n3-line)]"><Download size={14}/></Link>:null}{!hasArtifact(report)?<span aria-label="PDF no vinculado" className="inline-flex h-11 w-11 items-center justify-center border border-[var(--n3-line)] text-[var(--n3-text-muted)]"><FileText size={14}/></span>:null}{canReview?<CanonicalReportReviewActions reportId={report.id} status={report.status}/>:null}</div></article>})}</div>:<div className="py-6 text-sm text-[var(--n3-text-muted)]">Sin versiones anteriores.</div>}
    </section>

    <details className="mt-8 max-w-5xl">
      <summary className="flex min-h-11 cursor-pointer items-center text-xs font-medium text-[var(--n3-text-muted)] hover:text-[var(--n3-text-light)]">Estado de datos</summary>
      <DataStatusBar cutoff={cutoff} coverage={reports.length?`${deliverableCount}/${reports.length} entregables con período y PDF`:'Sin informes'} issues={incomplete.length} status={status}/>
    </details>
  </WorkspaceShell>
}
