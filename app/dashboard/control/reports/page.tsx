'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Download, FileText, RefreshCw } from 'lucide-react'
import { OperationalState } from '@/components/ui/operational-state'
import { WorkspaceHeader, WorkspaceShell } from '@/components/ui/workspace'

type Report = {
  id: string
  report_type: string
  period_start: string
  period_end: string
  status: string
  generated_at: string
}

function monthLabel(value: string) {
  const date = new Date(`${value}T00:00:00Z`)
  return new Intl.DateTimeFormat('es-CL', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date)
}

export default function ManagementReportArchivePage() {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  async function loadReports() {
    setLoading(true)
    setFailed(false)
    try {
      const response = await fetch('/api/management/reports', { cache: 'no-store' })
      if (!response.ok) throw new Error('LOAD_FAILED')
      const data = await response.json() as { reports?: Report[] }
      setReports(data.reports ?? [])
    } catch {
      setFailed(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void loadReports() }, [])

  const monthlyReports = useMemo(() => {
    const latestByPeriod = new Map<string, Report>()
    for (const report of reports) {
      if (report.report_type !== 'monthly') continue
      const key = `${report.period_start}:${report.period_end}`
      const current = latestByPeriod.get(key)
      if (!current || new Date(report.generated_at).getTime() > new Date(current.generated_at).getTime()) {
        latestByPeriod.set(key, report)
      }
    }
    return [...latestByPeriod.values()].sort((a, b) => b.period_start.localeCompare(a.period_start))
  }, [reports])

  if (loading) {
    return <WorkspaceShell><OperationalState kind="loading" title="Cargando archivo de reportes" description="Consultando los reportes mensuales disponibles." /></WorkspaceShell>
  }

  if (failed) {
    return <WorkspaceShell><OperationalState kind="error" title="No fue posible cargar los reportes" description="Reintente la consulta."><button onClick={() => void loadReports()} className="inline-flex min-h-10 items-center gap-2 border border-[var(--n3-line)] px-4 text-sm"><RefreshCw size={15}/> Reintentar</button></OperationalState></WorkspaceShell>
  }

  return <WorkspaceShell>
    <WorkspaceHeader eyebrow="Control de gestión" title="Archivo de reportes" actions={[{ label: 'Volver a operación', href: '/dashboard/control/operations' }]} />

    <div className="mt-6 border border-[var(--n3-line)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--n3-line)] px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold">Reportes mensuales disponibles</h2>
          <p className="mt-1 text-xs text-[var(--n3-text-muted)]">Se muestra la versión más reciente de cada período.</p>
        </div>
        <span className="text-xs text-[var(--n3-text-muted)]">{monthlyReports.length} períodos</span>
      </div>

      {monthlyReports.length ? <div className="divide-y divide-[var(--n3-line)]">
        {monthlyReports.map(report => <article key={report.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium capitalize">{monthLabel(report.period_start)}</p>
            <p className="mt-1 text-xs text-[var(--n3-text-muted)]">{report.period_start} — {report.period_end} · {report.status}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/dashboard/control/reports/${report.id}`} className="inline-flex min-h-10 items-center gap-2 border border-[var(--n3-line)] px-3 text-sm"><FileText size={15}/> Abrir</Link>
            <a href={`/api/management/reports/${report.id}/artifact`} className="inline-flex min-h-10 items-center gap-2 bg-[var(--primary)] px-3 text-sm font-semibold text-white"><Download size={15}/> Descargar PDF</a>
          </div>
        </article>)}
      </div> : <div className="p-6"><OperationalState compact kind="empty" title="Sin reportes mensuales" description="Aún no existen reportes persistidos." /></div>}
    </div>
  </WorkspaceShell>
}
