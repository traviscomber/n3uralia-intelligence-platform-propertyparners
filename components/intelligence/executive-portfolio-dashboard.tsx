'use client'

import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  CircleGauge,
  Clock3,
  Layers3,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import type { ExecutivePortfolio } from '@/lib/executive-decision-graph'

type Props = {
  portfolio: ExecutivePortfolio
  selectedCaseId: string
  onSelectCase: (caseId: string, target?: 'timeline' | 'simulator' | 'memory') => void
}

const priorityWeight = { high: 3, medium: 2, low: 1 } as const
const confidenceWeight = { high: 3, medium: 2, low: 1 } as const

export function ExecutivePortfolioDashboard({ portfolio, selectedCaseId, onSelectCase }: Props) {
  const { metrics, cases, graph, simulations, memory } = portfolio
  const blockedRatio = metrics.totalCases > 0 ? metrics.blockedCases / metrics.totalCases : 0
  const validationRatio = metrics.totalCases > 0 ? metrics.validatedCases / metrics.totalCases : 0
  const readinessRatio = metrics.totalCases > 0 ? metrics.readyCases / metrics.totalCases : 0
  const healthScore = Math.max(0, Math.min(100, Math.round(
    metrics.evidenceCoverage * 0.42
    + readinessRatio * 100 * 0.24
    + validationRatio * 100 * 0.22
    + (1 - blockedRatio) * 100 * 0.12,
  )))

  const rankedCases = [...cases]
    .sort((left, right) => {
      const leftScore = priorityWeight[left.priority] * 10 + confidenceWeight[left.confidence] * 3 - left.openQuestionCount * 2
      const rightScore = priorityWeight[right.priority] * 10 + confidenceWeight[right.confidence] * 3 - right.openQuestionCount * 2
      return rightScore - leftScore
    })
    .slice(0, 5)

  const domains = Array.from(new Set(graph.nodes.map((node) => node.domain))).map((domain) => {
    const nodes = graph.nodes.filter((node) => node.domain === domain)
    const blocked = nodes.filter((node) => node.readiness === 'blocked').length
    const validated = nodes.filter((node) => node.status === 'validated').length
    const exposure = Math.min(100, Math.round((blocked * 55 + (nodes.length - validated) * 20) / Math.max(1, nodes.length)))
    return { domain, total: nodes.length, blocked, validated, exposure }
  }).sort((left, right) => right.exposure - left.exposure)

  const positiveImpact = simulations.filter((item) => item.estimatedDirection === 'positive').length
  const highImpact = simulations.filter((item) => item.estimatedMagnitude === 'high').length
  const reusableLessons = memory.filter((item) => item.lesson.trim().length > 0).length

  return (
    <section id="executive-portfolio-dashboard" className="border border-[var(--n3-line)] bg-[#0c1111]">
      <header className="border-b border-[var(--n3-line)] p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--n3-teal-soft)]">
              <Layers3 size={15} /> Executive Portfolio
            </div>
            <h2 className="mt-2 text-2xl font-semibold text-[var(--n3-text-light)]">Centro de control de decisiones</h2>
            <p className="mt-1 max-w-3xl text-xs leading-5 text-[var(--n3-text-muted)]">
              Vista agregada de readiness, evidencia, riesgo, impacto y aprendizaje. Ningún indicador autoriza ejecución automática.
            </p>
          </div>
          <div className="flex items-center gap-4 border border-[var(--n3-line)] bg-[#080d0d] px-5 py-4">
            <CircleGauge size={30} className="text-[var(--n3-teal-soft)]" />
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Portfolio Health</p>
              <p className="mt-1 text-3xl font-semibold text-[var(--n3-text-light)]">{healthScore}<span className="text-sm text-[var(--n3-text-muted)]">/100</span></p>
            </div>
          </div>
        </div>
      </header>

      <div className="grid gap-px bg-[var(--n3-line)] sm:grid-cols-2 xl:grid-cols-4">
        <PortfolioMetric icon={Layers3} label="Casos activos" value={metrics.totalCases} detail={`${metrics.openQuestions} preguntas abiertas`} />
        <PortfolioMetric icon={AlertTriangle} label="Bloqueados" value={metrics.blockedCases} detail="Requieren evidencia o responsable" warning={metrics.blockedCases > 0} />
        <PortfolioMetric icon={ShieldCheck} label="Listos para validar" value={metrics.readyCases} detail="Pendientes de revisión humana" />
        <PortfolioMetric icon={CheckCircle2} label="Cobertura de evidencia" value={`${metrics.evidenceCoverage}%`} detail={`${metrics.validatedCases} casos validados`} />
      </div>

      <div className="grid gap-px bg-[var(--n3-line)] xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <div className="bg-[#080d0d] p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--n3-teal-soft)]">Priority Queue</p>
              <h3 className="mt-1 text-lg font-semibold text-[var(--n3-text-light)]">Casos que requieren atención</h3>
            </div>
            <Sparkles size={18} className="text-[var(--n3-teal-soft)]" />
          </div>

          <div className="mt-4 space-y-2">
            {rankedCases.map((item, index) => {
              const active = item.id === selectedCaseId
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectCase(item.id, item.readiness === 'blocked' ? 'timeline' : 'simulator')}
                  className={`grid w-full gap-3 border p-4 text-left transition sm:grid-cols-[34px_minmax(0,1fr)_auto] sm:items-center ${active ? 'border-[#d7332b] bg-[#101717]' : 'border-[var(--n3-line)] bg-[#0c1111] hover:border-[var(--n3-teal-soft)]'}`}
                >
                  <span className="text-lg font-semibold text-[var(--n3-text-muted)]">{String(index + 1).padStart(2, '0')}</span>
                  <span>
                    <span className="block text-sm font-semibold text-[var(--n3-text-light)]">{item.subject}</span>
                    <span className="mt-1 block text-[10px] uppercase tracking-[0.09em] text-[var(--n3-text-muted)]">
                      {item.priority} · {item.confidence} · {item.openQuestionCount} preguntas
                    </span>
                  </span>
                  <span className={`inline-flex items-center gap-2 text-[10px] font-semibold uppercase ${item.readiness === 'blocked' ? 'text-amber-300' : 'text-emerald-300'}`}>
                    {item.readiness === 'blocked' ? <AlertTriangle size={13} /> : <ShieldCheck size={13} />}
                    {item.readiness === 'blocked' ? 'Bloqueado' : 'Validable'}
                    <ArrowRight size={12} />
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <aside className="bg-[#0c1111] p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--n3-teal-soft)]">Impact & Learning</p>
          <h3 className="mt-1 text-lg font-semibold text-[var(--n3-text-light)]">Capacidad acumulada</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <SignalCard icon={BarChart3} label="Impacto positivo estimado" value={positiveImpact} detail={`${highImpact} escenarios de alta magnitud`} />
            <SignalCard icon={Clock3} label="Tiempo de decisión" value={metrics.blockedCases === 0 ? 'Óptimo' : 'En riesgo'} detail={`${metrics.blockedCases} dependencias bloqueantes`} />
            <SignalCard icon={Sparkles} label="Lecciones reutilizables" value={reusableLessons} detail="Memoria con trazabilidad de evidencia" />
          </div>
        </aside>
      </div>

      <div className="border-t border-[var(--n3-line)] bg-[#0c1111] p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--n3-teal-soft)]">Risk Heatmap</p>
            <h3 className="mt-1 text-lg font-semibold text-[var(--n3-text-light)]">Exposición por dominio</h3>
          </div>
          <p className="text-[10px] text-[var(--n3-text-muted)]">Derivado de bloqueos y estados de validación; no reemplaza evaluación humana.</p>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {domains.map((item) => (
            <div key={item.domain} className="border border-[var(--n3-line)] bg-[#080d0d] p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold capitalize text-[var(--n3-text-light)]">{item.domain}</p>
                <p className={`text-sm font-semibold ${item.exposure >= 65 ? 'text-[#ff766f]' : item.exposure >= 35 ? 'text-amber-300' : 'text-emerald-300'}`}>{item.exposure}%</p>
              </div>
              <div className="mt-3 h-1.5 bg-[#151d1d]">
                <div className="h-full bg-[var(--n3-teal-soft)]" style={{ width: `${item.exposure}%` }} />
              </div>
              <p className="mt-3 text-[10px] text-[var(--n3-text-muted)]">{item.total} casos · {item.blocked} bloqueados · {item.validated} validados</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function PortfolioMetric({ icon: Icon, label, value, detail, warning = false }: {
  icon: typeof Layers3
  label: string
  value: string | number
  detail: string
  warning?: boolean
}) {
  return (
    <div className="bg-[#0c1111] p-5">
      <div className="flex items-center justify-between gap-3">
        <Icon size={17} className={warning ? 'text-amber-300' : 'text-[var(--n3-teal-soft)]'} />
        {warning && <span className="text-[9px] font-semibold uppercase tracking-[0.1em] text-amber-300">Atención</span>}
      </div>
      <p className="mt-5 text-3xl font-semibold text-[var(--n3-text-light)]">{value}</p>
      <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.11em] text-[var(--n3-text-muted)]">{label}</p>
      <p className="mt-2 text-[10px] leading-4 text-[var(--n3-text-muted)]">{detail}</p>
    </div>
  )
}

function SignalCard({ icon: Icon, label, value, detail }: {
  icon: typeof Layers3
  label: string
  value: string | number
  detail: string
}) {
  return (
    <div className="border border-[var(--n3-line)] bg-[#080d0d] p-4">
      <div className="flex items-center gap-2 text-[var(--n3-teal-soft)]">
        <Icon size={15} />
        <p className="text-[9px] font-semibold uppercase tracking-[0.11em]">{label}</p>
      </div>
      <p className="mt-3 text-xl font-semibold text-[var(--n3-text-light)]">{value}</p>
      <p className="mt-2 text-[10px] leading-4 text-[var(--n3-text-muted)]">{detail}</p>
    </div>
  )
}
