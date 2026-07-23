'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock3,
  FileText,
  Home,
  Loader2,
  Play,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from 'lucide-react'

type AgentKey = 'market_intelligence' | 'valuation' | 'executive_reports'
type RunStatus = 'draft' | 'queued' | 'running' | 'needs_review' | 'approved' | 'rejected' | 'failed' | 'completed' | 'cancelled'

type Finding = {
  id: string
  title: string
  summary: string
  severity: 'info' | 'opportunity' | 'warning' | 'critical'
  approval_status: 'pending' | 'approved' | 'rejected'
}

type Run = {
  id: string
  agent_key: AgentKey
  title: string
  status: RunStatus
  confidence: number | string | null
  created_at: string
  started_at: string | null
  finished_at: string | null
  error_message: string | null
  output: Record<string, unknown> | null
  agent_findings: Finding[]
  agent_sources: Array<{ id: string }>
  agent_artifacts: Array<{ id: string; title: string; artifact_type: string }>
}

const agentConfig = {
  market_intelligence: {
    name: 'Market Intelligence',
    role: 'Evidencia de mercado',
    icon: BarChart3,
    href: '/dashboard/market',
    endpoint: '/api/agents/market/run',
  },
  valuation: {
    name: 'Valorizador IA',
    role: 'Valorización con comparables',
    icon: Home,
    href: '/dashboard/valorizador',
    endpoint: '/api/agents/valuation/run',
  },
  executive_reports: {
    name: 'Reportes IA',
    role: 'Síntesis ejecutiva',
    icon: FileText,
    href: '/dashboard/reportes/autonomos',
    endpoint: '/api/agents/reports/run',
  },
} as const

const statusLabel: Record<RunStatus, string> = {
  draft: 'Borrador',
  queued: 'En cola',
  running: 'Ejecutando',
  needs_review: 'Requiere revisión',
  approved: 'Aprobado',
  rejected: 'Rechazado',
  failed: 'Error',
  completed: 'Completado',
  cancelled: 'Cancelado',
}

function formatDate(value: string | null) {
  if (!value) return 'Sin registro'
  return new Intl.DateTimeFormat('es-CL', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
}

function confidenceLabel(value: number | string | null) {
  const score = Number(value)
  if (!Number.isFinite(score)) return 'Sin confianza'
  return `${Math.round(score * 100)}%`
}

export default function AgentControlCenter() {
  const [runs, setRuns] = useState<Run[]>([])
  const [loading, setLoading] = useState(true)
  const [busyAgent, setBusyAgent] = useState<AgentKey | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [marketNeighborhood, setMarketNeighborhood] = useState('')
  const [valuationNeighborhood, setValuationNeighborhood] = useState('')
  const [valuationType, setValuationType] = useState<'Departamento' | 'Casa'>('Departamento')
  const [area, setArea] = useState('180')
  const [secondaryArea, setSecondaryArea] = useState('30')
  const [ufM2, setUfM2] = useState('110')
  const [secondaryUfM2, setSecondaryUfM2] = useState('18')
  const [reportAudience, setReportAudience] = useState<'ceo' | 'director' | 'partner'>('ceo')

  const loadRuns = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/agents/runs?limit=40', { cache: 'no-store' })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'No se pudo cargar el historial.')
      setRuns(payload.runs || [])
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo cargar el historial.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadRuns()
  }, [loadRuns])

  const latestByAgent = useMemo(() => {
    return (Object.keys(agentConfig) as AgentKey[]).reduce<Record<AgentKey, Run | undefined>>((acc, key) => {
      acc[key] = runs.find((run) => run.agent_key === key)
      return acc
    }, {} as Record<AgentKey, Run | undefined>)
  }, [runs])

  const pendingRuns = runs.filter((run) => run.status === 'needs_review')
  const failedRuns = runs.filter((run) => run.status === 'failed')
  const averageConfidence = runs.length
    ? runs.reduce((sum, run) => sum + (Number(run.confidence) || 0), 0) / runs.filter((run) => Number(run.confidence) > 0).length
    : 0

  async function executeAgent(agentKey: AgentKey) {
    setBusyAgent(agentKey)
    setMessage(null)
    try {
      let body: Record<string, unknown> = {}
      if (agentKey === 'market_intelligence') {
        body = { neighborhood: marketNeighborhood || undefined }
      }
      if (agentKey === 'valuation') {
        const primaryArea = Number(area)
        const primaryUf = Number(ufM2)
        if (!(primaryArea > 0) || !(primaryUf > 0)) throw new Error('Ingresa superficie y UF/m² válidos.')
        body = valuationType === 'Departamento'
          ? {
              neighborhood: valuationNeighborhood || undefined,
              propertyType: 'Departamento',
              comparableLimit: 10,
              valuation: {
                propertyType: 'Departamento',
                usefulAreaM2: primaryArea,
                terraceAreaM2: Number(secondaryArea) || 0,
                appliedUsefulUfM2: primaryUf,
              },
            }
          : {
              neighborhood: valuationNeighborhood || undefined,
              propertyType: 'Casa',
              comparableLimit: 10,
              valuation: {
                propertyType: 'Casa',
                builtAreaM2: primaryArea,
                landAreaM2: Number(secondaryArea) || 0,
                builtUfM2: primaryUf,
                landUfM2: Number(secondaryUfM2) || 0,
              },
            }
      }
      if (agentKey === 'executive_reports') {
        body = { audience: reportAudience, periodType: 'weekly', title: 'Reporte ejecutivo semanal' }
      }

      const response = await fetch(agentConfig[agentKey].endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'No se pudo ejecutar el agente.')
      setMessage(`${agentConfig[agentKey].name} terminó correctamente y quedó registrado.`)
      await loadRuns()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo ejecutar el agente.')
    } finally {
      setBusyAgent(null)
    }
  }

  async function decideRun(runId: string, decision: 'approved' | 'rejected') {
    setMessage(null)
    try {
      const response = await fetch('/api/agents/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runId, decision }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'No se pudo registrar la decisión.')
      setMessage(decision === 'approved' ? 'Ejecución aprobada.' : 'Ejecución rechazada.')
      await loadRuns()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo registrar la decisión.')
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-6 pb-10">
      <section className="rounded-xl border border-[var(--n3-line)] bg-[var(--n3-dark-surface)] p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--n3-teal-soft)]">Sistema multiagente Property Partners</p>
            <h1 className="mt-2 text-2xl font-semibold text-[var(--n3-text-light)] sm:text-3xl">Centro de control operativo</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--n3-text-muted)]">Ejecuta, revisa y aprueba los tres agentes desde una sola consola. Cada resultado conserva fuentes, confianza, hallazgos y artefactos.</p>
          </div>
          <button type="button" onClick={() => void loadRuns()} className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--n3-line)] bg-[var(--n3-black)] px-4 py-2.5 text-sm text-[var(--n3-text-light)]">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Actualizar
          </button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Ejecuciones" value={String(runs.length)} icon={<Activity className="h-4 w-4" />} />
          <Metric label="Pendientes" value={String(pendingRuns.length)} icon={<Clock3 className="h-4 w-4" />} />
          <Metric label="Errores" value={String(failedRuns.length)} icon={<AlertTriangle className="h-4 w-4" />} />
          <Metric label="Confianza media" value={averageConfidence > 0 ? `${Math.round(averageConfidence * 100)}%` : '—'} icon={<ShieldCheck className="h-4 w-4" />} />
        </div>
      </section>

      {message ? <div className="rounded-lg border border-[var(--n3-line)] bg-[var(--n3-black)] px-4 py-3 text-sm text-[var(--n3-text-light)]">{message}</div> : null}

      <section className="grid gap-4 xl:grid-cols-3">
        {(Object.keys(agentConfig) as AgentKey[]).map((agentKey) => {
          const config = agentConfig[agentKey]
          const Icon = config.icon
          const latest = latestByAgent[agentKey]
          const busy = busyAgent === agentKey
          return (
            <article key={agentKey} className="flex flex-col rounded-xl border border-[var(--n3-line)] bg-[var(--n3-dark-surface)] p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-[var(--n3-line)] bg-[var(--n3-black)] text-[var(--n3-teal-soft)]"><Icon className="h-5 w-5" /></div>
                <StatusBadge status={latest?.status || 'draft'} />
              </div>
              <p className="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--n3-teal-soft)]">{config.role}</p>
              <h2 className="mt-1 text-xl font-semibold text-[var(--n3-text-light)]">{config.name}</h2>

              <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <SmallStat label="Última ejecución" value={latest ? formatDate(latest.created_at) : 'Sin ejecuciones'} />
                <SmallStat label="Confianza" value={latest ? confidenceLabel(latest.confidence) : '—'} />
                <SmallStat label="Fuentes" value={latest ? String(latest.agent_sources?.length || 0) : '0'} />
                <SmallStat label="Hallazgos" value={latest ? String(latest.agent_findings?.length || 0) : '0'} />
              </div>

              <div className="mt-5 space-y-3">
                {agentKey === 'market_intelligence' ? (
                  <input value={marketNeighborhood} onChange={(event) => setMarketNeighborhood(event.target.value)} placeholder="Barrio opcional" className="w-full rounded-lg border border-[var(--n3-line)] bg-[var(--n3-black)] px-3 py-2.5 text-sm text-[var(--n3-text-light)] outline-none" />
                ) : null}

                {agentKey === 'valuation' ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      {(['Departamento', 'Casa'] as const).map((type) => <button key={type} type="button" onClick={() => setValuationType(type)} className={`rounded-lg border px-3 py-2 text-xs ${valuationType === type ? 'border-[var(--n3-teal-soft)] bg-[var(--n3-black)] text-[var(--n3-text-light)]' : 'border-[var(--n3-line)] text-[var(--n3-text-muted)]'}`}>{type}</button>)}
                    </div>
                    <input value={valuationNeighborhood} onChange={(event) => setValuationNeighborhood(event.target.value)} placeholder="Barrio" className="w-full rounded-lg border border-[var(--n3-line)] bg-[var(--n3-black)] px-3 py-2.5 text-sm text-[var(--n3-text-light)] outline-none" />
                    <div className="grid grid-cols-2 gap-2">
                      <input type="number" value={area} onChange={(event) => setArea(event.target.value)} placeholder={valuationType === 'Casa' ? 'M² construidos' : 'M² útiles'} className="rounded-lg border border-[var(--n3-line)] bg-[var(--n3-black)] px-3 py-2.5 text-sm text-[var(--n3-text-light)] outline-none" />
                      <input type="number" value={ufM2} onChange={(event) => setUfM2(event.target.value)} placeholder="UF/m²" className="rounded-lg border border-[var(--n3-line)] bg-[var(--n3-black)] px-3 py-2.5 text-sm text-[var(--n3-text-light)] outline-none" />
                      <input type="number" value={secondaryArea} onChange={(event) => setSecondaryArea(event.target.value)} placeholder={valuationType === 'Casa' ? 'M² terreno' : 'M² terraza'} className="rounded-lg border border-[var(--n3-line)] bg-[var(--n3-black)] px-3 py-2.5 text-sm text-[var(--n3-text-light)] outline-none" />
                      {valuationType === 'Casa' ? <input type="number" value={secondaryUfM2} onChange={(event) => setSecondaryUfM2(event.target.value)} placeholder="UF/m² terreno" className="rounded-lg border border-[var(--n3-line)] bg-[var(--n3-black)] px-3 py-2.5 text-sm text-[var(--n3-text-light)] outline-none" /> : <div />}
                    </div>
                  </div>
                ) : null}

                {agentKey === 'executive_reports' ? (
                  <select value={reportAudience} onChange={(event) => setReportAudience(event.target.value as typeof reportAudience)} className="w-full rounded-lg border border-[var(--n3-line)] bg-[var(--n3-black)] px-3 py-2.5 text-sm text-[var(--n3-text-light)] outline-none">
                    <option value="ceo">CEO</option>
                    <option value="director">Director</option>
                    <option value="partner">Ejecutivo / Partner</option>
                  </select>
                ) : null}
              </div>

              <div className="mt-auto grid grid-cols-[1fr_auto] gap-2 pt-5">
                <button type="button" disabled={busy || busyAgent !== null} onClick={() => void executeAgent(agentKey)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--n3-teal)] px-4 py-3 text-sm font-semibold text-[var(--n3-black)] disabled:opacity-50">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} Ejecutar
                </button>
                <Link href={config.href} className="inline-flex items-center justify-center rounded-lg border border-[var(--n3-line)] bg-[var(--n3-black)] px-3 text-[var(--n3-text-light)]"><ArrowRight className="h-4 w-4" /></Link>
              </div>
            </article>
          )
        })}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-xl border border-[var(--n3-line)] bg-[var(--n3-dark-surface)] p-5">
          <div className="flex items-center justify-between gap-3"><div><h2 className="font-semibold text-[var(--n3-text-light)]">Historial de ejecuciones</h2><p className="text-sm text-[var(--n3-text-muted)]">Últimas 40 ejecuciones registradas.</p></div>{loading ? <Loader2 className="h-4 w-4 animate-spin text-[var(--n3-teal-soft)]" /> : null}</div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-[10px] uppercase tracking-[0.14em] text-[var(--n3-text-muted)]"><tr><th className="pb-3">Agente</th><th className="pb-3">Estado</th><th className="pb-3">Confianza</th><th className="pb-3">Fuentes</th><th className="pb-3">Fecha</th></tr></thead>
              <tbody className="divide-y divide-[var(--n3-line)]">
                {runs.map((run) => <tr key={run.id}><td className="py-3 pr-4 text-[var(--n3-text-light)]">{agentConfig[run.agent_key]?.name || run.agent_key}<div className="text-xs text-[var(--n3-text-muted)]">{run.title}</div></td><td className="py-3 pr-4"><StatusBadge status={run.status} /></td><td className="py-3 pr-4 text-[var(--n3-text-light)]">{confidenceLabel(run.confidence)}</td><td className="py-3 pr-4 text-[var(--n3-text-light)]">{run.agent_sources?.length || 0}</td><td className="py-3 text-xs text-[var(--n3-text-muted)]">{formatDate(run.created_at)}</td></tr>)}
                {!runs.length && !loading ? <tr><td colSpan={5} className="py-8 text-center text-[var(--n3-text-muted)]">Todavía no hay ejecuciones registradas.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border border-[var(--n3-line)] bg-[var(--n3-dark-surface)] p-5">
          <h2 className="font-semibold text-[var(--n3-text-light)]">Pendientes de aprobación</h2>
          <p className="text-sm text-[var(--n3-text-muted)]">Resultados que requieren decisión humana.</p>
          <div className="mt-4 space-y-3">
            {pendingRuns.slice(0, 8).map((run) => <div key={run.id} className="rounded-lg border border-[var(--n3-line)] bg-[var(--n3-black)] p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-[var(--n3-text-light)]">{run.title}</p><p className="mt-1 text-xs text-[var(--n3-text-muted)]">{agentConfig[run.agent_key]?.name} · {confidenceLabel(run.confidence)} · {run.agent_findings?.length || 0} hallazgos</p></div><Clock3 className="h-4 w-4 text-[var(--n3-teal-soft)]" /></div><div className="mt-4 grid grid-cols-2 gap-2"><button type="button" onClick={() => void decideRun(run.id, 'approved')} className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--n3-line)] px-3 py-2 text-xs font-semibold text-[var(--n3-text-light)]"><CheckCircle2 className="h-4 w-4" /> Aprobar</button><button type="button" onClick={() => void decideRun(run.id, 'rejected')} className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--n3-line)] px-3 py-2 text-xs font-semibold text-[var(--n3-text-muted)]"><XCircle className="h-4 w-4" /> Rechazar</button></div></div>)}
            {!pendingRuns.length ? <div className="rounded-lg border border-dashed border-[var(--n3-line)] p-6 text-center text-sm text-[var(--n3-text-muted)]">No hay ejecuciones pendientes de aprobación.</div> : null}
          </div>
        </div>
      </section>
    </div>
  )
}

function Metric({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return <div className="rounded-lg border border-[var(--n3-line)] bg-[var(--n3-black)] p-4"><div className="flex items-center gap-2 text-[var(--n3-teal-soft)]">{icon}<span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">{label}</span></div><div className="mt-2 text-2xl font-semibold text-[var(--n3-text-light)]">{value}</div></div>
}

function SmallStat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-[var(--n3-line)] bg-[var(--n3-black)] p-3"><div className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">{label}</div><div className="mt-1 truncate text-xs font-semibold text-[var(--n3-text-light)]">{value}</div></div>
}

function StatusBadge({ status }: { status: RunStatus }) {
  const className = status === 'approved' || status === 'completed'
    ? 'text-emerald-300 border-emerald-400/30 bg-emerald-400/10'
    : status === 'failed' || status === 'rejected'
      ? 'text-red-300 border-red-400/30 bg-red-400/10'
      : status === 'running'
        ? 'text-sky-300 border-sky-400/30 bg-sky-400/10'
        : status === 'needs_review'
          ? 'text-amber-300 border-amber-400/30 bg-amber-400/10'
          : 'text-[var(--n3-text-muted)] border-[var(--n3-line)] bg-[var(--n3-black)]'
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${className}`}>{statusLabel[status]}</span>
}
