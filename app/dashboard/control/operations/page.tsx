'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { FileText, RefreshCw } from 'lucide-react'
import { DataStatusBar, MetricStrip, WorkspaceHeader, WorkspaceShell } from '@/components/ui/workspace'
import { OperationalState } from '@/components/ui/operational-state'

type ImportRun = { id:string; source_name:string; period_start:string; period_end:string; status:string; rows_received:number; rows_inserted:number; rows_rejected?:number; created_at:string }
type Report = { id:string; report_type:string; period_start:string; period_end:string; status:string; generated_at:string }

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
    setLoading(true); setFailed(false)
    try {
      const [importsResponse, reportsResponse] = await Promise.all([
        fetch('/api/management/import', { cache: 'no-store' }),
        fetch('/api/management/reports', { cache: 'no-store' }),
      ])
      if (!importsResponse.ok || !reportsResponse.ok) throw new Error('LOAD_FAILED')
      setRuns((await importsResponse.json()).runs ?? [])
      setReports((await reportsResponse.json()).reports ?? [])
    } catch { setFailed(true) } finally { setLoading(false) }
  }
  useEffect(() => { void refresh() }, [])

  async function evaluate() {
    setBusy(true); setMessage('')
    try {
      const response = await fetch('/api/management/evaluate-alerts', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ period }) })
      const data = await response.json()
      setMessage(response.ok ? `${data.result.created_count} alertas creadas · ${data.result.resolved_count} resueltas` : data.error)
    } finally { setBusy(false) }
  }

  async function importRows() {
    setBusy(true); setMessage('')
    try {
      const parsed = JSON.parse(rows)
      const response = await fetch('/api/management/import', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sourceName: 'Carga administrativa', rows: parsed }) })
      const data = await response.json()
      setMessage(response.ok ? `${data.imported} filas procesadas` : data.error)
      if (response.ok) await refresh()
    } catch { setMessage('JSON inválido') } finally { setBusy(false) }
  }

  async function generateReport() {
    setBusy(true); setMessage('')
    try {
      const summaryResponse = await fetch(`/api/management/summary?period=${period}`, { cache: 'no-store' })
      const summary = await summaryResponse.json()
      if (!summaryResponse.ok) { setMessage(summary.error); return }
      const start = `${period}-01`
      const endDate = new Date(`${start}T00:00:00Z`)
      endDate.setUTCMonth(endDate.getUTCMonth() + 1); endDate.setUTCDate(0)
      const response = await fetch('/api/management/reports', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ reportType: 'monthly', periodStart: start, periodEnd: endDate.toISOString().slice(0, 10), snapshot: summary }) })
      const data = await response.json()
      setMessage(response.ok ? 'Reporte mensual generado' : data.error)
      if (response.ok) await refresh()
    } finally { setBusy(false) }
  }

  const currentRuns = useMemo(() => runs.filter(run => run.period_start.startsWith(period)), [runs, period])
  const currentReports = useMemo(() => reports.filter(report => report.period_start.startsWith(period)), [reports, period])
  const received = currentRuns.reduce((sum, run) => sum + Number(run.rows_received || 0), 0)
  const inserted = currentRuns.reduce((sum, run) => sum + Number(run.rows_inserted || 0), 0)
  const rejected = currentRuns.reduce((sum, run) => sum + Number(run.rows_rejected || 0), 0)
  const latest = currentRuns.map(run => new Date(run.created_at)).filter(date => !Number.isNaN(date.getTime())).sort((a,b)=>b.getTime()-a.getTime())[0]
  const cutoff = latest ? latest.toLocaleString('es-CL') : '—'
  const status = currentRuns.length === 0 ? 'blocked' : rejected > 0 ? 'partial' : 'ready'

  if (loading) return <WorkspaceShell><OperationalState kind="loading" title="Cargando control de gestión" description="Consultando importaciones y reportes del período." /></WorkspaceShell>
  if (failed) return <WorkspaceShell><OperationalState kind="error" title="No fue posible cargar control de gestión" description="Reintente la consulta." ><button onClick={() => void refresh()} className="inline-flex min-h-10 items-center gap-2 border border-[var(--n3-line)] px-4 text-sm"><RefreshCw size={15}/> Reintentar</button></OperationalState></WorkspaceShell>

  return <WorkspaceShell>
    <WorkspaceHeader eyebrow="Control de gestión" title="Operación" controls={<div><label htmlFor="management-period" className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Período</label><input id="management-period" type="month" value={period} onChange={event => setPeriod(event.target.value)} className="mt-1 block min-h-11 border border-[var(--n3-line)] bg-[var(--n3-deep)] px-3 text-sm" /></div>} actions={[{ label:'Metas y alertas', href:'/dashboard/control/admin' }]} />

    <MetricStrip items={[
      { label:'Importaciones', value:currentRuns.length },
      { label:'Filas recibidas', value:received },
      { label:'Insertadas', value:inserted, tone: inserted > 0 ? 'success' : 'default' },
      { label:'Rechazadas', value:rejected, tone: rejected > 0 ? 'danger' : 'default' },
    ]} />

    <section className="mt-6"><div className="flex items-center justify-between border-b border-[var(--n3-line)] pb-2"><h2 className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Acciones</h2><span className="text-xs text-[var(--n3-text-muted)]">{currentReports.length} reportes</span></div><div className="grid border-b border-[var(--n3-line)] sm:grid-cols-2"><button disabled={busy} onClick={() => void evaluate()} className="min-h-16 border-b border-[var(--n3-line)] px-4 text-left text-sm hover:bg-white/[0.03] disabled:opacity-50 sm:border-r"><strong>Evaluar alertas</strong></button><button disabled={busy} onClick={() => void generateReport()} className="min-h-16 border-b border-[var(--n3-line)] px-4 text-left text-sm hover:bg-white/[0.03] disabled:opacity-50"><strong>Generar reporte mensual</strong></button></div></section>

    {message ? <div role="status" className="mt-4 border border-[var(--n3-line)] px-4 py-3 text-sm">{message}</div> : null}

    <section className="mt-6"><div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold">Importaciones</h2><button onClick={() => setAdvancedOpen(value => !value)} className="text-xs text-[var(--n3-text-muted)] hover:text-white">{advancedOpen ? 'Cerrar carga avanzada' : 'Carga avanzada'}</button></div>{advancedOpen ? <div className="mb-4 border border-[var(--n3-line)] p-4"><textarea value={rows} onChange={event => setRows(event.target.value)} className="min-h-40 w-full border border-[var(--n3-line)] bg-transparent p-3 font-mono text-xs" /><button disabled={busy} onClick={() => void importRows()} className="mt-3 bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Importar JSON</button></div> : null}<div className="overflow-x-auto border border-[var(--n3-line)]"><table className="min-w-[760px] w-full text-sm"><thead className="bg-[var(--n3-deep)]"><tr>{['Fuente','Estado','Recibidas','Insertadas','Rechazadas','Fecha'].map(item => <th key={item} className="p-3 text-left text-xs uppercase text-[var(--n3-text-muted)]">{item}</th>)}</tr></thead><tbody>{currentRuns.map(run => <tr key={run.id} className="border-t border-[var(--n3-line)]"><td className="p-3">{run.source_name}</td><td className="p-3">{run.status}</td><td className="p-3">{run.rows_received}</td><td className="p-3">{run.rows_inserted}</td><td className="p-3">{run.rows_rejected ?? 0}</td><td className="p-3 text-[var(--n3-text-muted)]">{new Date(run.created_at).toLocaleString('es-CL')}</td></tr>)}{!currentRuns.length ? <tr><td colSpan={6} className="p-8 text-center text-[var(--n3-text-muted)]">Sin importaciones para este período</td></tr> : null}</tbody></table></div></section>

    <section className="mt-6"><div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold">Reportes del período</h2><span className="text-xs text-[var(--n3-text-muted)]">{currentReports.length}</span></div><div className="space-y-2">{currentReports.map(report => <div key={report.id} className="flex flex-wrap items-center justify-between gap-3 border border-[var(--n3-line)] px-4 py-3 text-sm"><span>{report.report_type} · {report.status}</span><Link href={`/dashboard/control/reports/${report.id}`} className="inline-flex min-h-9 items-center gap-2 border border-[var(--n3-line)] px-3"><FileText size={14}/> Abrir</Link></div>)}{!currentReports.length ? <OperationalState compact kind="empty" title="Sin reportes" description="No existen reportes para el período seleccionado." /> : null}</div></section>

    <DataStatusBar cutoff={cutoff} coverage={`${inserted} de ${received} filas incorporadas`} issues={rejected} status={status} />
  </WorkspaceShell>
}
