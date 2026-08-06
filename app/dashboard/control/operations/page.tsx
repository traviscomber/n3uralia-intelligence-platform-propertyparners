'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

type ImportRun = { id:string; source_name:string; period_start:string; period_end:string; status:string; rows_received:number; rows_inserted:number; rows_rejected?:number; created_at:string }
type Report = { id:string; report_type:string; period_start:string; period_end:string; status:string; generated_at:string }

export default function ManagementOperationsPage() {
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7))
  const [rows, setRows] = useState('[]')
  const [runs, setRuns] = useState<ImportRun[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [advancedOpen, setAdvancedOpen] = useState(false)

  async function refresh() {
    const [importsResponse, reportsResponse] = await Promise.all([
      fetch('/api/management/import', { cache: 'no-store' }),
      fetch('/api/management/reports', { cache: 'no-store' }),
    ])
    if (importsResponse.ok) setRuns((await importsResponse.json()).runs ?? [])
    if (reportsResponse.ok) setReports((await reportsResponse.json()).reports ?? [])
  }
  useEffect(() => { void refresh() }, [])

  async function evaluate() {
    setBusy(true); setMessage('')
    const response = await fetch('/api/management/evaluate-alerts', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ period }) })
    const data = await response.json()
    setMessage(response.ok ? `${data.result.created_count} alertas creadas · ${data.result.resolved_count} resueltas` : data.error)
    setBusy(false)
  }

  async function importRows() {
    setBusy(true); setMessage('')
    try {
      const parsed = JSON.parse(rows)
      const response = await fetch('/api/management/import', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sourceName: 'Carga administrativa', rows: parsed }) })
      const data = await response.json()
      setMessage(response.ok ? `${data.imported} filas procesadas` : data.error)
      if (response.ok) await refresh()
    } catch { setMessage('JSON inválido') }
    setBusy(false)
  }

  async function generateReport() {
    setBusy(true); setMessage('')
    const summaryResponse = await fetch(`/api/management/summary?period=${period}`, { cache: 'no-store' })
    const summary = await summaryResponse.json()
    if (!summaryResponse.ok) { setMessage(summary.error); setBusy(false); return }
    const start = `${period}-01`
    const endDate = new Date(`${start}T00:00:00Z`)
    endDate.setUTCMonth(endDate.getUTCMonth() + 1)
    endDate.setUTCDate(0)
    const response = await fetch('/api/management/reports', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ reportType: 'monthly', periodStart: start, periodEnd: endDate.toISOString().slice(0, 10), snapshot: summary }) })
    const data = await response.json()
    setMessage(response.ok ? 'Reporte mensual generado' : data.error)
    if (response.ok) await refresh()
    setBusy(false)
  }

  const currentRuns = useMemo(() => runs.filter(run => run.period_start.startsWith(period)), [runs, period])
  const currentReports = useMemo(() => reports.filter(report => report.period_start.startsWith(period)), [reports, period])
  const received = currentRuns.reduce((sum, run) => sum + Number(run.rows_received || 0), 0)
  const inserted = currentRuns.reduce((sum, run) => sum + Number(run.rows_inserted || 0), 0)
  const rejected = currentRuns.reduce((sum, run) => sum + Number(run.rows_rejected || 0), 0)

  return <div className="mx-auto max-w-5xl space-y-5 pb-12">
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--n3-line)] pb-5">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#ff766f]">Control de gestión</p>
        <h1 className="mt-2 text-3xl font-semibold">Operación</h1>
      </div>
      <div className="flex flex-wrap gap-2">
        <input type="month" value={period} onChange={event => setPeriod(event.target.value)} className="border border-[var(--n3-line)] bg-transparent px-3 py-2 text-sm" />
        <Link href="/dashboard/control/admin" className="border border-[var(--n3-line)] px-4 py-2 text-sm">Metas y alertas</Link>
      </div>
    </header>

    <section className="grid gap-px bg-[var(--n3-line)] sm:grid-cols-4">
      {[
        ['Importaciones', currentRuns.length],
        ['Filas recibidas', received],
        ['Insertadas', inserted],
        ['Rechazadas', rejected],
      ].map(([label, value]) => <div key={String(label)} className="bg-[#0c1111] p-4"><p className="text-[10px] uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">{label}</p><p className="mt-2 text-2xl font-semibold">{Number(value).toLocaleString('es-CL')}</p></div>)}
    </section>

    <section className="border border-[var(--n3-line)] bg-[#0c1111]">
      <div className="border-b border-[var(--n3-line)] px-4 py-3"><h2 className="text-sm font-semibold">Acciones del período</h2></div>
      <div className="grid gap-px bg-[var(--n3-line)] sm:grid-cols-2">
        <button disabled={busy} onClick={() => void evaluate()} className="bg-[#0c1111] px-4 py-4 text-left text-sm hover:bg-white/[0.03] disabled:opacity-50"><span className="block font-medium">Evaluar alertas</span><span className="mt-1 block text-xs text-[var(--n3-text-muted)]">Aplicar reglas al período seleccionado</span></button>
        <button disabled={busy} onClick={() => void generateReport()} className="bg-[#0c1111] px-4 py-4 text-left text-sm hover:bg-white/[0.03] disabled:opacity-50"><span className="block font-medium">Generar reporte mensual</span><span className="mt-1 block text-xs text-[var(--n3-text-muted)]">Crear snapshot de gestión</span></button>
      </div>
    </section>

    {message ? <div role="status" className="border border-[var(--n3-line)] px-4 py-3 text-sm">{message}</div> : null}

    <section>
      <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold">Importaciones del período</h2><button onClick={() => setAdvancedOpen(value => !value)} className="text-xs text-[var(--n3-text-muted)] hover:text-white">{advancedOpen ? 'Cerrar carga avanzada' : 'Carga avanzada'}</button></div>
      {advancedOpen ? <div className="mb-4 border border-[var(--n3-line)] p-4"><textarea value={rows} onChange={event => setRows(event.target.value)} className="min-h-40 w-full border border-[var(--n3-line)] bg-transparent p-3 font-mono text-xs" /><button disabled={busy} onClick={() => void importRows()} className="mt-3 bg-[#d7332b] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Importar JSON</button></div> : null}
      <div className="overflow-x-auto border border-[var(--n3-line)]"><table className="min-w-[760px] w-full text-sm"><thead className="bg-[#080d0d]"><tr>{['Fuente','Estado','Recibidas','Insertadas','Rechazadas','Fecha'].map(item => <th key={item} className="p-3 text-left text-xs uppercase text-[var(--n3-text-muted)]">{item}</th>)}</tr></thead><tbody>{currentRuns.map(run => <tr key={run.id} className="border-t border-[var(--n3-line)]"><td className="p-3">{run.source_name}</td><td className="p-3">{run.status}</td><td className="p-3">{run.rows_received}</td><td className="p-3">{run.rows_inserted}</td><td className="p-3">{run.rows_rejected ?? 0}</td><td className="p-3 text-[var(--n3-text-muted)]">{new Date(run.created_at).toLocaleString('es-CL')}</td></tr>)}{!currentRuns.length ? <tr><td colSpan={6} className="p-8 text-center text-[var(--n3-text-muted)]">Sin importaciones para este período</td></tr> : null}</tbody></table></div>
    </section>

    <section>
      <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold">Reportes del período</h2><span className="text-xs text-[var(--n3-text-muted)]">{currentReports.length}</span></div>
      <div className="space-y-2">{currentReports.map(report => <div key={report.id} className="flex flex-wrap items-center justify-between gap-3 border border-[var(--n3-line)] px-4 py-3 text-sm"><span>{report.report_type} · {report.status}</span><Link href={`/dashboard/control/reports/${report.id}`} className="border border-[var(--n3-line)] px-3 py-2">Abrir</Link></div>)}{!currentReports.length ? <div className="border border-[var(--n3-line)] p-6 text-center text-sm text-[var(--n3-text-muted)]">Sin reportes para este período</div> : null}</div>
    </section>
  </div>
}
