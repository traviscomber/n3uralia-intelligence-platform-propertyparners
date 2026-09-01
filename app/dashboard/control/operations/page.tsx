'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Download, FileText, RefreshCw } from 'lucide-react'
import { WorkspaceHeader, WorkspaceShell } from '@/components/ui/workspace'
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

  if (loading) return <WorkspaceShell><OperationalState kind="loading" title="Cargando gestión" description="Consultando el período seleccionado." /></WorkspaceShell>
  if (failed) return <WorkspaceShell><OperationalState kind="error" title="No fue posible cargar gestión" description="Reintente la consulta."><button onClick={() => void refresh()} className="inline-flex min-h-10 items-center gap-2 border border-[var(--n3-line)] px-4 text-sm"><RefreshCw size={15}/> Reintentar</button></OperationalState></WorkspaceShell>

  return (
    <WorkspaceShell>
      <WorkspaceHeader
        eyebrow="Gestión"
        title="Cierre del período"
        meta={`${currentReports.length} reportes · ${rejected ? `${rejected} observaciones de datos` : 'datos sin rechazos'}`}
        controls={<div><label htmlFor="management-period" className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Período</label><input id="management-period" type="month" value={period} onChange={(event) => setPeriod(event.target.value)} className="mt-1 block min-h-11 border border-[var(--n3-line)] bg-[var(--n3-deep)] px-3 text-sm" /></div>}
        actions={[{ label: 'Metas y alertas', href: '/dashboard/control/admin' }]}
      />

      <section className="mt-7 max-w-5xl">
        <div className="border-b border-[var(--n3-line)] pb-2">
          <h2 className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Acciones del período</h2>
        </div>
        <div className="grid border-b border-[var(--n3-line)] sm:grid-cols-2">
          <button disabled={busy} onClick={() => void evaluate()} className="min-h-20 border-b border-[var(--n3-line)] px-4 text-left text-sm hover:bg-white/[0.03] disabled:opacity-50 sm:border-r">
            <strong>Evaluar alertas</strong>
            <span className="mt-1 block text-xs text-[var(--n3-text-muted)]">Detectar excepciones que requieren gestión.</span>
          </button>
          <button disabled={busy} onClick={() => void generateReport()} className="min-h-20 border-b border-[var(--n3-line)] px-4 text-left text-sm hover:bg-white/[0.03] disabled:opacity-50">
            <strong>Generar reporte mensual</strong>
            <span className="mt-1 block text-xs text-[var(--n3-text-muted)]">Crear el resumen ejecutivo del período.</span>
          </button>
        </div>
      </section>

      {message ? <div role="status" className="mt-4 max-w-5xl border border-[var(--n3-line)] px-4 py-3 text-sm">{message}</div> : null}

      <section className="mt-8 max-w-5xl">
        <div className="flex items-center justify-between border-b border-[var(--n3-line)] pb-2">
          <h2 className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Reportes</h2>
          <Link href="/dashboard/control/reports" className="text-xs text-[var(--n3-teal-soft)]">Ver archivo</Link>
        </div>
        <div className="divide-y divide-[var(--n3-line)]">
          {currentReports.map((report) => (
            <div key={report.id} className="flex flex-wrap items-center justify-between gap-3 py-4 text-sm">
              <div>
                <p className="font-medium">Reporte {report.report_type}</p>
                <p className="mt-1 text-xs text-[var(--n3-text-muted)]">{report.status} · {new Date(report.generated_at).toLocaleDateString('es-CL')}</p>
              </div>
              <div className="flex gap-2">
                <Link href={`/dashboard/control/reports/${report.id}`} className="inline-flex min-h-9 items-center gap-2 border border-[var(--n3-line)] px-3"><FileText size={14}/> Abrir</Link>
                <a href={`/api/management/reports/${report.id}/artifact`} className="inline-flex min-h-9 items-center gap-2 border border-[var(--n3-line)] px-3"><Download size={14}/> PDF</a>
              </div>
            </div>
          ))}
          {!currentReports.length ? <div className="py-8 text-sm text-[var(--n3-text-muted)]">No hay reportes para este período.</div> : null}
        </div>
      </section>

      <details className="mt-10 max-w-5xl border-t border-[var(--n3-line)] pt-4">
        <summary className="cursor-pointer text-xs font-medium text-[var(--n3-text-muted)] hover:text-[var(--n3-text-light)]">Operación técnica de datos</summary>
        <div className="mt-5 space-y-5">
          <div className="divide-y divide-[var(--n3-line)] border-y border-[var(--n3-line)]">
            {currentRuns.map((run) => (
              <div key={run.id} className="grid gap-2 py-3 text-xs sm:grid-cols-[minmax(0,1fr)_100px_150px] sm:items-center">
                <span className="text-sm">{run.source_name}</span>
                <span className="text-[var(--n3-text-muted)]">{run.status}</span>
                <span className="text-[var(--n3-text-muted)]">{run.rows_inserted}/{run.rows_received} incorporadas{run.rows_rejected ? ` · ${run.rows_rejected} rechazadas` : ''}</span>
              </div>
            ))}
            {!currentRuns.length ? <div className="py-6 text-sm text-[var(--n3-text-muted)]">Sin cargas para este período.</div> : null}
          </div>

          <button onClick={() => setAdvancedOpen((value) => !value)} className="text-xs text-[var(--n3-teal-soft)]">{advancedOpen ? 'Cerrar carga avanzada' : 'Carga avanzada'}</button>
          {advancedOpen ? (
            <div className="border border-[var(--n3-line)] p-4">
              <textarea value={rows} onChange={(event) => setRows(event.target.value)} className="min-h-40 w-full border border-[var(--n3-line)] bg-transparent p-3 font-mono text-xs" />
              <button disabled={busy} onClick={() => void importRows()} className="mt-3 bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Importar JSON</button>
            </div>
          ) : null}
        </div>
      </details>
    </WorkspaceShell>
  )
}
