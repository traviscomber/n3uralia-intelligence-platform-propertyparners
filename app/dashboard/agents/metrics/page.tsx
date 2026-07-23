'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, BarChart3, CheckCircle2, Gauge, ShieldCheck, Sparkles, XCircle } from 'lucide-react'

type Metric = {
  agent_key: string
  total_runs: number
  approved_runs: number
  rejected_runs: number
  failed_runs: number
  completed_runs: number
  pending_review_runs: number
  avg_confidence: number | string | null
  avg_duration_seconds: number | string | null
  approval_rate: number | string | null
  success_rate: number | string | null
  evaluation_count: number
  avg_usefulness: number | string | null
  avg_correctness: number | string | null
  avg_actionability: number | string | null
  used_count: number
  ignored_count: number
  corrected_count: number
}

type Evaluation = {
  id: string
  usefulness: number
  correctness: number
  actionability: number
  outcome: string
  correction_notes: string | null
  created_at: string
  agent_runs: { agent_key: string; title: string } | null
}

const labels: Record<string, string> = {
  market_intelligence: 'Market Intelligence',
  valuation: 'Valorizador IA',
  executive_reports: 'Reportes IA',
}

function percent(value: number | string | null) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? `${Math.round(parsed * 100)}%` : '—'
}

function score(value: number | string | null) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? `${parsed.toFixed(1)}/5` : '—'
}

export default function AgentMetricsPage() {
  const [metrics, setMetrics] = useState<Metric[]>([])
  const [evaluations, setEvaluations] = useState<Evaluation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/agents/metrics', { cache: 'no-store' })
      .then(async (response) => {
        const payload = await response.json()
        if (!response.ok) throw new Error(payload.error || 'No se pudieron cargar las métricas.')
        setMetrics(payload.metrics || [])
        setEvaluations(payload.evaluations || [])
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'No se pudieron cargar las métricas.'))
      .finally(() => setLoading(false))
  }, [])

  const totals = useMemo(() => metrics.reduce((acc, item) => {
    acc.runs += Number(item.total_runs) || 0
    acc.approved += Number(item.approved_runs) || 0
    acc.failed += Number(item.failed_runs) || 0
    acc.evaluations += Number(item.evaluation_count) || 0
    return acc
  }, { runs: 0, approved: 0, failed: 0, evaluations: 0 }), [metrics])

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-6 pb-10">
      <section className="rounded-xl border border-[var(--n3-line)] bg-[var(--n3-dark-surface)] p-5 sm:p-6">
        <Link href="/dashboard/agents" className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--n3-teal-soft)]"><ArrowLeft className="h-4 w-4" /> Volver al Centro de Control</Link>
        <div className="mt-5 flex items-start gap-3"><Sparkles className="mt-1 h-5 w-5 text-[var(--n3-teal-soft)]" /><div><h1 className="text-2xl font-semibold text-[var(--n3-text-light)] sm:text-3xl">Métricas y aprendizaje</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--n3-text-muted)]">Evaluación basada en resultados observables y feedback humano. La confianza del agente se compara con aprobación, uso y correcciones reales.</p></div></div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Summary label="Ejecuciones" value={String(totals.runs)} icon={<BarChart3 className="h-4 w-4" />} />
          <Summary label="Aprobadas" value={String(totals.approved)} icon={<CheckCircle2 className="h-4 w-4" />} />
          <Summary label="Fallidas" value={String(totals.failed)} icon={<XCircle className="h-4 w-4" />} />
          <Summary label="Evaluaciones humanas" value={String(totals.evaluations)} icon={<ShieldCheck className="h-4 w-4" />} />
        </div>
      </section>

      {loading ? <div className="rounded-xl border border-[var(--n3-line)] p-8 text-center text-[var(--n3-text-muted)]">Cargando métricas…</div> : null}
      {error ? <div className="rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-200">{error}</div> : null}

      <section className="grid gap-4 xl:grid-cols-3">
        {metrics.map((metric) => (
          <article key={metric.agent_key} className="rounded-xl border border-[var(--n3-line)] bg-[var(--n3-dark-surface)] p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--n3-teal-soft)]">Desempeño del agente</p>
            <h2 className="mt-2 text-xl font-semibold text-[var(--n3-text-light)]">{labels[metric.agent_key] || metric.agent_key}</h2>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Cell label="Éxito" value={percent(metric.success_rate)} />
              <Cell label="Aprobación" value={percent(metric.approval_rate)} />
              <Cell label="Confianza" value={percent(metric.avg_confidence)} />
              <Cell label="Duración media" value={metric.avg_duration_seconds !== null ? `${Number(metric.avg_duration_seconds).toFixed(1)} s` : '—'} />
              <Cell label="Utilidad" value={score(metric.avg_usefulness)} />
              <Cell label="Corrección" value={score(metric.avg_correctness)} />
              <Cell label="Accionabilidad" value={score(metric.avg_actionability)} />
              <Cell label="Evaluaciones" value={String(metric.evaluation_count || 0)} />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
              <Outcome label="Usados" value={metric.used_count} />
              <Outcome label="Ignorados" value={metric.ignored_count} />
              <Outcome label="Corregidos" value={metric.corrected_count} />
            </div>
          </article>
        ))}
      </section>

      <section className="rounded-xl border border-[var(--n3-line)] bg-[var(--n3-dark-surface)] p-5">
        <div className="flex items-center gap-3"><Gauge className="h-5 w-5 text-[var(--n3-teal-soft)]" /><div><h2 className="font-semibold text-[var(--n3-text-light)]">Evaluaciones recientes</h2><p className="text-sm text-[var(--n3-text-muted)]">Feedback humano utilizado para revisar prompts, umbrales y fuentes.</p></div></div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="text-[10px] uppercase tracking-[0.14em] text-[var(--n3-text-muted)]"><tr><th className="pb-3">Ejecución</th><th className="pb-3">Resultado</th><th className="pb-3">Utilidad</th><th className="pb-3">Corrección</th><th className="pb-3">Acción</th><th className="pb-3">Fecha</th></tr></thead>
            <tbody className="divide-y divide-[var(--n3-line)]">
              {evaluations.map((item) => <tr key={item.id}><td className="py-3 pr-4 text-[var(--n3-text-light)]">{item.agent_runs?.title || 'Ejecución'}<div className="text-xs text-[var(--n3-text-muted)]">{labels[item.agent_runs?.agent_key || ''] || item.agent_runs?.agent_key}</div></td><td className="py-3 pr-4 text-[var(--n3-text-light)]">{item.outcome}</td><td className="py-3 pr-4">{item.usefulness}/5</td><td className="py-3 pr-4">{item.correctness}/5</td><td className="py-3 pr-4">{item.actionability}/5</td><td className="py-3 text-xs text-[var(--n3-text-muted)]">{new Intl.DateTimeFormat('es-CL', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(item.created_at))}</td></tr>)}
              {!evaluations.length && !loading ? <tr><td colSpan={6} className="py-8 text-center text-[var(--n3-text-muted)]">Todavía no existen evaluaciones humanas.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function Summary({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return <div className="rounded-lg border border-[var(--n3-line)] bg-[var(--n3-black)] p-4"><div className="flex items-center gap-2 text-[var(--n3-teal-soft)]">{icon}<span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">{label}</span></div><div className="mt-2 text-2xl font-semibold text-[var(--n3-text-light)]">{value}</div></div>
}
function Cell({ label, value }: { label: string; value: string }) { return <div className="rounded-lg border border-[var(--n3-line)] bg-[var(--n3-black)] p-3"><div className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">{label}</div><div className="mt-1 font-semibold text-[var(--n3-text-light)]">{value}</div></div> }
function Outcome({ label, value }: { label: string; value: number }) { return <div className="rounded-lg border border-[var(--n3-line)] p-2"><div className="font-semibold text-[var(--n3-text-light)]">{value || 0}</div><div className="text-[10px] uppercase tracking-[0.1em] text-[var(--n3-text-muted)]">{label}</div></div> }
