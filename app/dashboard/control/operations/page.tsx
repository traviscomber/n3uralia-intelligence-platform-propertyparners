'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Download, FileText, RefreshCw } from 'lucide-react'
import { MetricStrip, WorkspaceHeader, WorkspaceShell } from '@/components/ui/workspace'
import { OperationalState } from '@/components/ui/operational-state'

type ImportRun = { id:string; source_name:string; period_start:string; status:string; rows_received:number; rows_inserted:number; rows_rejected?:number; created_at:string }
type Report = { id:string; report_type:string; period_start:string; status:string; generated_at:string }

export default function ManagementOperationsPage() {
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7))
  const [rows, setRows] = useState('[]')
  const [runs, setRuns] = useState<ImportRun[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [advancedOpen, setAdvancedOpen] = useState(false)

  async function refresh() {
    setLoading(true)
    setFailed(false)
    try {
      const [importsResponse, reportsResponse] = await Promise.all([
        fetch('/api/management/import', { cache: 'no-store' }),
        fetch('/api/management/reports', { cache: 'no-store' }),
      ])
      if (!importsResponse.ok || !reportsResponse.ok) throw new Error('LOAD_FAILED')
      setRuns((await importsResponse.json()).runs ?? [])
      setReports((await reportsResponse.json()).reports ?? [])
    } catch {
      setFailed(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void refresh() }, [])

  async function evaluate() {
    setBusy(true)
    setMessage('')
    try {
      const response = await fetch('/api/management/evaluate-alerts', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ period }) })
      const data = await response.json()
      setMessage(response.ok ? `${data.result.created_count} alertas creadas · ${data.result.resolved_count} resueltas` : data.error)
    } finally {
      setBusy(false)
    }
  }

  async function generateReport() {
    setBusy(true)
    setMessage('')
    try {
      const summaryResponse = await fetch(`/api/management/summary?period=${period}`, { cache: 'no-store' })
      const summary = await summaryResponse.json()
      if (!summaryResponse.ok) { setMessage(summary.error); return }
      const start = `${period}-01`
      const endDate = new Date(`${start}T00:00:00Z`)
      endDate.setUTCMonth(endDate.getUTCMonth() + 1)
      endDate.setUTCDate(0)
      const response = await fetch('/api/management/reports', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ reportType: 'monthly', periodStart: start, periodEnd: endDate.toISOString().slice(0, 10), snapshot: summary }) })
      const data = await response.json()
      setMessage(response.ok ? 'Reporte mensual generado' : data.error)
      if (response.ok) await refresh()
    } finally {
      setBusy(false)
    }
  }

  async function importRows() {
    setBusy(true)
    setMessage('')
    try {
      const parsed = JSON.parse(rows)
      const response = await fetch('/api/management/import', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sourceName: 'Carga administrativa', rows: parsed }) })
      const data = await response.json()
      setMessage(response.ok ? `${data.imported} filas procesadas` : data.error)
      if (response.ok) await refresh()
    } catch {
      setMessage('JSON inválido')
    } finally {
      setBusy(false)
    }
  }

  const currentRuns = useMemo(() => runs.filter((run) => run.period_start.startsWith(period)), [runs, period])
  const currentReports = useMemo(() => reports.filter((report) => report.period_start.startsWith(period)), [reports, period])
  const rejected = currentRuns.reduce((sum, run) => sum + Number(run.rows_rejected || 0), 0)
  const latestReport = currentReports[0] ?? null
  const inserted = currentRuns.reduce((sum, run) => sum + Number(run.rows_inserted || 0), 0)
  const nextStep = rejected > 0
    ? { title: 'Revisar observaciones antes de cerrar', detail: `${rejected} filas fueron rechazadas en las cargas del período.`, label: 'Revisar reconciliación', href: '/dashboard/control/reconciliacion' }
    : currentRuns.length === 0
      ? { title: 'Aún no hay datos del período', detail: 'El cierre no debe generarse hasta contar con evidencia operativa cargada.', label: 'Ver operación de datos', href: '#technical-data' }
      : !latestReport
        ? { title: 'El período está listo para preparar cierre', detail: 'Evalúa excepciones y genera el reporte mensual cuando las alertas estén revisadas.', label: 'Evaluar alertas', action: 'evaluate' as const }
        : { title: 'Reporte mensual disponible', detail: `Último reporte: ${new Date(latestReport.generated_at).toLocaleDateString('es-CL')}.`, label: 'Abrir reporte', href: `/dashboard/control/reports/${latestReport.id}` }

  if (loading) return <WorkspaceShell><OperationalState kind="loading" title="Cargando gestión" description="Consultando el período seleccionado." /></WorkspaceShell>
  if (failed) return <WorkspaceShell><OperationalState kind="error" title="No fue posible cargar gestión" description="Reintente la consulta."><button onClick={() => void refresh()} className="inline-flex min-h-11 items-center gap-2 border border-[var(--n3-line)] px-4 text-sm"><RefreshCw size={15}/> Reintentar</button></OperationalState></WorkspaceShell>

  return (
    <WorkspaceShell>
      <WorkspaceHeader
        eyebrow="Gestión"
        title="Qué falta para cerrar"
        meta={rejected ? `${rejected} observaciones de datos requieren revisión` : latestReport ? 'Reporte mensual disponible' : 'Cierre aún no emitido'}
        controls={<div><label htmlFor="management-period" className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Período</label><input id="management-period" type="month" value={period} onChange={(event) => setPeriod(event.target.value)} className="mt-1 block min-h-11 border border-[var(--n3-line)] bg-[var(--n3-deep)] px-3 text-sm" /></div>}
        actions={[{ label: 'Metas y alertas', href: '/dashboard/control/admin' }]}
      />

      <MetricStrip items={[
        { label: 'Cargas', value: currentRuns.length },
        { label: 'Filas incorporadas', value: inserted },
        { label: 'Observaciones', value: rejected, tone: rejected ? 'warning' : 'success' },
        { label: 'Reportes', value: currentReports.length, tone: currentReports.length ? 'success' : 'default' },
      ]} />

      <section className="mt-7 max-w-5xl">
        <div className="border-b border-[var(--n3-line)] pb-2"><h2 className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Siguiente decisión</h2></div>
        <div className="grid gap-4 border-b border-[var(--n3-line)] py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div><h3 className="text-base font-semibold">{nextStep.title}</h3><p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--n3-text-muted)]">{nextStep.detail}</p></div>
          {'action' in nextStep ? <button disabled={busy} onClick={() => void evaluate()} className="min-h-11 bg-[var(--primary)] px-5 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Procesando…' : nextStep.label}</button> : <Link href={nextStep.href} className="inline-flex min-h-11 items-center justify-center border border-[var(--n3-line)] px-5 text-sm font-semibold text-[var(--n3-text-light)] hover:border-[var(--n3-text-muted)]">{nextStep.label}</Link>}
        </div>
      </section>

      {message ? <div role="status" aria-live="polite" className="mt-4 max-w-5xl border border-[var(--n3-line)] px-4 py-3 text-sm">{message}</div> : null}

      <section className="mt-8 max-w-5xl">
        <div className="flex items-center justify-between border-b border-[var(--n3-line)] pb-2"><h2 className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Cierre mensual</h2><span className="text-xs text-[var(--n3-text-muted)]">{currentReports.length ? 'Disponible' : 'Pendiente'}</span></div>
        {latestReport ? <article className="grid gap-4 border-b border-[var(--n3-line)] py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"><div><p className="text-sm font-medium">Reporte {latestReport.report_type}</p><p className="mt-1 text-xs text-[var(--n3-text-muted)]">{latestReport.status} · {new Date(latestReport.generated_at).toLocaleDateString('es-CL')}</p></div><div className="flex flex-wrap gap-2"><Link href={`/dashboard/control/reports/${latestReport.id}`} className="inline-flex min-h-11 items-center gap-2 border border-[var(--n3-line)] px-4 text-sm"><FileText size={14}/> Abrir</Link><a href={`/api/management/reports/${latestReport.id}/artifact`} className="inline-flex min-h-11 items-center gap-2 border border-[var(--n3-line)] px-4 text-sm"><Download size={14}/> PDF</a></div></article> : <div className="border-b border-[var(--n3-line)] py-6"><p className="text-sm text-[var(--n3-text-muted)]">Todavía no existe un reporte mensual para este período.</p><button disabled={busy || currentRuns.length===0 || rejected>0} onClick={() => void generateReport()} className="mt-4 min-h-11 bg-[var(--primary)] px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">{busy ? 'Procesando…' : 'Generar reporte mensual'}</button>{currentRuns.length===0?<p className="mt-2 text-xs text-[var(--n3-text-muted)]">Carga evidencia del período antes de generar el cierre.</p>:rejected>0?<p className="mt-2 text-xs text-[var(--n3-text-muted)]">Resuelve las observaciones de datos antes de generar el cierre.</p>:null}</div>}
        {currentReports.length>1?<details className="border-b border-[var(--n3-line)]"><summary className="min-h-11 cursor-pointer py-3 text-xs font-medium text-[var(--n3-text-muted)]">Ver {currentReports.length-1} reporte{currentReports.length-1===1?' anterior':'s anteriores'}</summary><div className="divide-y divide-[var(--n3-line)]">{currentReports.slice(1).map((report) => <div key={report.id} className="flex flex-wrap items-center justify-between gap-3 py-4 text-sm"><div><p className="font-medium">Reporte {report.report_type}</p><p className="mt-1 text-xs text-[var(--n3-text-muted)]">{report.status} · {new Date(report.generated_at).toLocaleDateString('es-CL')}</p></div><Link href={`/dashboard/control/reports/${report.id}`} className="inline-flex min-h-11 items-center gap-2 border border-[var(--n3-line)] px-4"><FileText size={14}/> Abrir</Link></div>)}</div></details>:null}
        <Link href="/dashboard/control/reports" className="mt-3 inline-flex min-h-11 items-center text-xs font-medium text-[var(--n3-teal-soft)]">Ver archivo completo</Link>
      </section>

      <details className="mt-9 max-w-5xl border-t border-[var(--n3-line)] pt-4"><summary className="min-h-11 cursor-pointer py-3 text-xs font-medium text-[var(--n3-text-muted)]">Acciones secundarias</summary><div className="grid border-y border-[var(--n3-line)] sm:grid-cols-2"><button disabled={busy} onClick={() => void evaluate()} className="min-h-20 border-b border-[var(--n3-line)] px-4 text-left text-sm hover:bg-white/[0.03] disabled:opacity-50 sm:border-b-0 sm:border-r"><strong>Reevaluar alertas</strong><span className="mt-1 block text-xs text-[var(--n3-text-muted)]">Actualizar excepciones a partir de los datos actuales.</span></button><button disabled={busy || currentRuns.length===0 || rejected>0} onClick={() => void generateReport()} className="min-h-20 px-4 text-left text-sm hover:bg-white/[0.03] disabled:opacity-40"><strong>Regenerar reporte</strong><span className="mt-1 block text-xs text-[var(--n3-text-muted)]">Crear una nueva versión del resumen mensual.</span></button></div></details>

      <details id="technical-data" className="mt-7 max-w-5xl border-t border-[var(--n3-line)] pt-4">
        <summary className="min-h-11 cursor-pointer py-3 text-xs font-medium text-[var(--n3-text-muted)] hover:text-[var(--n3-text-light)]">Operación técnica de datos</summary>
        <div className="mt-4 space-y-5">
          <div className="divide-y divide-[var(--n3-line)] border-y border-[var(--n3-line)]">
            {currentRuns.map((run) => <div key={run.id} className="grid gap-2 py-3 text-xs sm:grid-cols-[minmax(0,1fr)_100px_150px] sm:items-center"><span className="text-sm">{run.source_name}</span><span className="text-[var(--n3-text-muted)]">{run.status}</span><span className="text-[var(--n3-text-muted)]">{run.rows_inserted}/{run.rows_received} incorporadas{run.rows_rejected ? ` · ${run.rows_rejected} rechazadas` : ''}</span></div>)}
            {!currentRuns.length ? <div className="py-6 text-sm text-[var(--n3-text-muted)]">Sin cargas para este período.</div> : null}
          </div>
          <button onClick={() => setAdvancedOpen((value) => !value)} className="min-h-11 text-xs font-medium text-[var(--n3-teal-soft)]">{advancedOpen ? 'Cerrar carga avanzada' : 'Carga avanzada'}</button>
          {advancedOpen ? <div className="border border-[var(--n3-line)] p-4"><label htmlFor="management-json" className="mb-2 block text-xs text-[var(--n3-text-muted)]">JSON de importación</label><textarea id="management-json" value={rows} onChange={(event) => setRows(event.target.value)} className="min-h-40 w-full border border-[var(--n3-line)] bg-transparent p-3 font-mono text-xs" /><button disabled={busy} onClick={() => void importRows()} className="mt-3 min-h-11 bg-[var(--primary)] px-4 text-sm font-semibold text-white disabled:opacity-50">Importar JSON</button></div> : null}
        </div>
      </details>
    </WorkspaceShell>
  )
}
