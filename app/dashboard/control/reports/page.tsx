'use client'

import { useEffect, useMemo, useState } from 'react'
import { Download, RefreshCw } from 'lucide-react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { OperationalState } from '@/components/ui/operational-state'
import { WorkspaceHeader, WorkspaceShell } from '@/components/ui/workspace'

type ReportListItem = {
  id: string
  report_type: string
  period_start: string
  period_end: string
  status: string
  generated_at: string
}

type Snapshot = {
  schemaVersion?: string
  company?: Record<string, number | string | null>
  offices?: Array<Record<string, unknown>>
  completeness?: {
    operationalReportReady?: boolean
    fullManagementScoreReady?: boolean
    blocked?: Array<{ code?: string; reason?: string }>
  }
  qualityNotes?: string[]
  provenance?: { sourceFiles?: string[] }
}

type ReportDetail = ReportListItem & { snapshot: Snapshot }

function monthLabel(value: string, short = false) {
  const date = new Date(`${value}T00:00:00Z`)
  return new Intl.DateTimeFormat('es-CL', { month: short ? 'short' : 'long', year: short ? undefined : 'numeric', timeZone: 'UTC' }).format(date)
}

function metric(snapshot: Snapshot | undefined, key: string) {
  const value = snapshot?.company?.[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function formatNumber(value: number | null, suffix = '') {
  if (value == null) return 'n/d'
  return `${value.toLocaleString('es-CL', { maximumFractionDigits: 2 })}${suffix}`
}

export default function ManagementReportArchivePage() {
  const [reports, setReports] = useState<ReportListItem[]>([])
  const [details, setDetails] = useState<Record<string, ReportDetail>>({})
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  async function loadReports() {
    setLoading(true)
    setFailed(false)
    try {
      const response = await fetch('/api/management/reports', { cache: 'no-store' })
      if (!response.ok) throw new Error('LOAD_FAILED')
      const data = await response.json() as { reports?: ReportListItem[] }
      const allReports = data.reports ?? []
      setReports(allReports)

      const latestByPeriod = new Map<string, ReportListItem>()
      for (const report of allReports) {
        if (report.report_type !== 'monthly') continue
        const key = `${report.period_start}:${report.period_end}`
        const current = latestByPeriod.get(key)
        if (!current || new Date(report.generated_at).getTime() > new Date(current.generated_at).getTime()) latestByPeriod.set(key, report)
      }
      const monthly = [...latestByPeriod.values()].sort((a, b) => b.period_start.localeCompare(a.period_start))
      if (!monthly.length) {
        setDetails({})
        setSelectedId(null)
        return
      }
      setSelectedId(current => current && monthly.some(report => report.id === current) ? current : monthly[0].id)

      const loaded = await Promise.all(monthly.map(async report => {
        const detailResponse = await fetch(`/api/management/reports/${report.id}`, { cache: 'no-store' })
        if (!detailResponse.ok) return null
        const detailData = await detailResponse.json() as { report?: ReportDetail }
        return detailData.report ?? null
      }))
      setDetails(Object.fromEntries(loaded.filter((item): item is ReportDetail => Boolean(item)).map(item => [item.id, item])))
    } catch {
      setFailed(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void loadReports() }, [])

  const monthlyReports = useMemo(() => {
    const latestByPeriod = new Map<string, ReportListItem>()
    for (const report of reports) {
      if (report.report_type !== 'monthly') continue
      const key = `${report.period_start}:${report.period_end}`
      const current = latestByPeriod.get(key)
      if (!current || new Date(report.generated_at).getTime() > new Date(current.generated_at).getTime()) latestByPeriod.set(key, report)
    }
    return [...latestByPeriod.values()].sort((a, b) => b.period_start.localeCompare(a.period_start))
  }, [reports])

  const selected = selectedId ? details[selectedId] : null
  const missingDetailCount = monthlyReports.filter(report => !details[report.id]).length

  const trendData = useMemo(() => monthlyReports
    .map(report => details[report.id])
    .filter((report): report is ReportDetail => Boolean(report))
    .sort((a, b) => a.period_start.localeCompare(b.period_start))
    .map(report => ({
      month: monthLabel(report.period_start, true),
      cartera: metric(report.snapshot, 'cartera'),
      captaciones: metric(report.snapshot, 'captaciones'),
      leads: metric(report.snapshot, 'leadsNuevos'),
      visitas: metric(report.snapshot, 'visitasRealizadas'),
      cierres: metric(report.snapshot, 'cierresAcreditados'),
      uf: metric(report.snapshot, 'volumenUfAcreditado'),
    })), [details, monthlyReports])

  const activityData = selected ? [
    { name: 'Captaciones', value: metric(selected.snapshot, 'captaciones') },
    { name: 'Leads', value: metric(selected.snapshot, 'leadsNuevos') },
    { name: 'Requerimientos', value: metric(selected.snapshot, 'requerimientos') },
    { name: 'Visitas ag.', value: metric(selected.snapshot, 'visitasAgendadas') },
    { name: 'Visitas real.', value: metric(selected.snapshot, 'visitasRealizadas') },
  ].filter(item => item.value != null) : []

  if (loading) return <WorkspaceShell><OperationalState kind="loading" title="Cargando reportes ejecutivos" description="Preparando serie histórica y visualizaciones." /></WorkspaceShell>
  if (failed) return <WorkspaceShell><OperationalState kind="error" title="No fue posible cargar los reportes" description="Reintente la consulta."><button onClick={() => void loadReports()} className="inline-flex min-h-11 items-center gap-2 border border-[var(--n3-line)] px-4 text-sm"><RefreshCw size={15}/> Reintentar</button></OperationalState></WorkspaceShell>

  return <WorkspaceShell>
    <WorkspaceHeader eyebrow="Control de gestión" title="Reportes ejecutivos" actions={[{ label: 'Volver a operación', href: '/dashboard/control/operations' }]} />

    {!monthlyReports.length ? <OperationalState compact kind="empty" title="Sin reportes mensuales" description="Aún no existen reportes persistidos." /> : <>
      <div className="mt-6 flex gap-2 overflow-x-auto pb-2" role="tablist" aria-label="Meses disponibles">
        {monthlyReports.map(report => {
          const active = report.id === selectedId
          return <button key={report.id} role="tab" aria-selected={active} onClick={() => setSelectedId(report.id)} className={`min-h-11 shrink-0 border px-4 text-sm capitalize transition ${active ? 'border-[var(--primary)] bg-[var(--primary)] text-white' : 'border-[var(--n3-line)] bg-transparent text-[var(--n3-text-muted)] hover:text-white'}`}>{monthLabel(report.period_start)}</button>
        })}
      </div>

      {missingDetailCount > 0 && selected ? <div className="mt-4"><OperationalState compact kind="info" title="Serie histórica parcial" description={`${missingDetailCount} ${missingDetailCount === 1 ? 'mes no pudo cargarse' : 'meses no pudieron cargarse'} y se excluye temporalmente de los gráficos. Los períodos disponibles mantienen su snapshot persistido.`} /></div> : null}

      {selected ? <div className="mt-5 space-y-6">
        <section className="border-y border-[var(--n3-line)] py-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--n3-text-muted)]">Informe mensual seleccionado</p>
              <h2 className="mt-2 text-3xl font-semibold capitalize">{monthLabel(selected.period_start)}</h2>
              <p className="mt-2 text-sm text-[var(--n3-text-muted)]">{selected.period_start} — {selected.period_end} · snapshot persistido · {selected.status}</p>
            </div>
            <a href={`/api/management/reports/${selected.id}/artifact`} className="inline-flex min-h-11 items-center justify-center gap-2 bg-[var(--primary)] px-4 text-sm font-semibold text-white"><Download size={16}/> Descargar PDF</a>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-px bg-[var(--n3-line)] lg:grid-cols-5">
            {[
              ['Cartera', metric(selected.snapshot, 'cartera'), ''],
              ['Captaciones', metric(selected.snapshot, 'captaciones'), ''],
              ['Leads', metric(selected.snapshot, 'leadsNuevos'), ''],
              ['Cierres acreditados', metric(selected.snapshot, 'cierresAcreditados'), ''],
              ['Volumen acreditado', metric(selected.snapshot, 'volumenUfAcreditado'), ' UF'],
            ].map(([label, value, suffix]) => <div key={String(label)} className="bg-[var(--n3-deep)] p-4"><p className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">{label}</p><p className="mt-2 text-2xl font-semibold">{formatNumber(value as number | null, String(suffix))}</p></div>)}
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
          <div className="min-w-0 border border-[var(--n3-line)] p-4 sm:p-5">
            <div className="mb-5"><p className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Serie enero–julio</p><h3 className="mt-1 text-lg font-semibold">Evolución comercial</h3></div>
            <div className="h-[330px] w-full" aria-label="Gráfico de evolución mensual">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <defs>
                    <linearGradient id="leadsFill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--primary)" stopOpacity={0.32}/><stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/></linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="var(--n3-line)" strokeDasharray="2 6" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'var(--n3-text-muted)', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--n3-text-muted)', fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: 'var(--n3-deep)', border: '1px solid var(--n3-line)', borderRadius: 0 }} labelStyle={{ color: 'white' }} />
                  <Area type="monotone" dataKey="leads" name="Leads" stroke="var(--primary)" strokeWidth={2.5} fill="url(#leadsFill)" connectNulls />
                  <Area type="monotone" dataKey="visitas" name="Visitas realizadas" stroke="var(--n3-text-muted)" strokeWidth={1.5} fill="transparent" connectNulls={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="min-w-0 border border-[var(--n3-line)] p-4 sm:p-5">
            <div className="mb-5"><p className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Mes seleccionado</p><h3 className="mt-1 text-lg font-semibold">Actividad comercial</h3></div>
            <div className="h-[330px] w-full" aria-label="Gráfico de actividad del mes seleccionado">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activityData} layout="vertical" margin={{ top: 4, right: 16, left: 16, bottom: 0 }}>
                  <CartesianGrid horizontal={false} stroke="var(--n3-line)" strokeDasharray="2 6" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: 'var(--n3-text-muted)', fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={90} axisLine={false} tickLine={false} tick={{ fill: 'var(--n3-text-muted)', fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: 'var(--n3-deep)', border: '1px solid var(--n3-line)', borderRadius: 0 }} />
                  <Bar dataKey="value" name="Total" fill="var(--primary)" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="border border-[var(--n3-line)] p-4"><p className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Visitas</p><p className="mt-2 text-2xl font-semibold">{formatNumber(metric(selected.snapshot, 'visitasRealizadas'))}</p><p className="mt-1 text-xs text-[var(--n3-text-muted)]">de {formatNumber(metric(selected.snapshot, 'visitasAgendadas'))} agendadas · cumplimiento {formatNumber(metric(selected.snapshot, 'cumplimientoVisitas'), '%')}</p></div>
          <div className="border border-[var(--n3-line)] p-4"><p className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Requerimientos</p><p className="mt-2 text-2xl font-semibold">{formatNumber(metric(selected.snapshot, 'requerimientos'))}</p><p className="mt-1 text-xs text-[var(--n3-text-muted)]">demanda registrada en el período</p></div>
          <div className="border border-[var(--n3-line)] p-4"><p className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Suspendidas</p><p className="mt-2 text-2xl font-semibold">{formatNumber(metric(selected.snapshot, 'suspendidas'))}</p><p className="mt-1 text-xs text-[var(--n3-text-muted)]">propiedades fuera de operación</p></div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="border-t border-[var(--n3-line)] pt-4">
            <h3 className="text-sm font-semibold">Estado y limitaciones</h3>
            <p className="mt-2 text-sm text-[var(--n3-text-muted)]">Reporte operacional: {selected.snapshot.completeness?.operationalReportReady ? 'listo' : 'no listo'} · Score integral: {selected.snapshot.completeness?.fullManagementScoreReady ? 'listo' : 'bloqueado'}</p>
            <div className="mt-4 space-y-2">{(selected.snapshot.completeness?.blocked ?? []).map((item, index) => <div key={`${item.code ?? 'blocked'}-${index}`} className="border-l-2 border-[var(--n3-line)] pl-3 text-xs text-[var(--n3-text-muted)]"><strong className="text-white">{item.code ?? 'Dimensión pendiente'}</strong><br/>{item.reason ?? 'Pendiente de definición o evidencia.'}</div>)}</div>
          </div>
          <div className="border-t border-[var(--n3-line)] pt-4">
            <h3 className="text-sm font-semibold">Calidad y procedencia</h3>
            <div className="mt-4 space-y-2">{(selected.snapshot.qualityNotes ?? []).map((note, index) => <p key={index} className="text-xs leading-5 text-[var(--n3-text-muted)]">{note}</p>)}{!(selected.snapshot.qualityNotes ?? []).length ? <p className="text-xs text-[var(--n3-text-muted)]">Sin observaciones adicionales registradas.</p> : null}</div>
          </div>
        </section>
      </div> : <div className="mt-5"><OperationalState compact kind="error" title="No fue posible cargar el mes seleccionado" description="El reporte existe en el registro, pero su snapshot de detalle no pudo consultarse. No se muestra un gráfico vacío como si fuera un mes sin actividad."><button type="button" onClick={() => void loadReports()} className="inline-flex min-h-11 items-center gap-2 border border-[var(--n3-line)] px-4 text-sm font-semibold"><RefreshCw size={15}/>Reintentar</button></OperationalState></div>}
    </>}
  </WorkspaceShell>
}
