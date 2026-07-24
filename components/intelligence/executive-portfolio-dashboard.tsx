'use client'

import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  CircleGauge,
  Clock3,
  Layers3,
  Lightbulb,
  Link2,
  Network,
  Search,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import type { ExecutivePortfolio } from '@/lib/executive-decision-graph'

type Props = {
  portfolio: ExecutivePortfolio
  selectedCaseId: string
  onSelectCase: (caseId: string, target?: 'timeline' | 'simulator' | 'memory') => void
}

type Opportunity = {
  id: string
  type: 'synergy' | 'unlock' | 'neglected'
  title: string
  detail: string
  rationale: string
  score: number
  caseIds: string[]
  action: string
}

const priorityWeight = { high: 3, medium: 2, low: 1 } as const
const confidenceWeight = { high: 3, medium: 2, low: 1 } as const
const magnitudeWeight = { high: 3, medium: 2, low: 1 } as const

const edgeLabels = {
  shared_domain: 'Dominio compartido',
  shared_evidence: 'Evidencia compartida',
  shared_risk: 'Riesgo compartido',
  validation_dependency: 'Dependencia de validación',
} as const

const opportunityLabels = {
  synergy: 'Sinergia',
  unlock: 'Desbloqueo',
  neglected: 'Decisión olvidada',
} as const

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

  const scoredCases = cases.map((item) => {
    const simulation = simulations.find((entry) => entry.caseId === item.id)
    const connectedEdges = graph.edges.filter((edge) => edge.from === item.id || edge.to === item.id)
    const urgency = priorityWeight[item.priority] * 20
    const confidence = confidenceWeight[item.confidence] * 10
    const impact = magnitudeWeight[simulation?.estimatedMagnitude ?? 'low'] * 10
    const networkEffect = Math.min(15, connectedEdges.length * 3)
    const validationPenalty = item.readiness === 'blocked' ? 18 : 0
    const questionPenalty = Math.min(20, item.openQuestionCount * 4)
    const score = Math.max(0, Math.min(100, urgency + confidence + impact + networkEffect - validationPenalty - questionPenalty))

    return {
      item,
      score,
      urgency,
      confidence,
      impact,
      networkEffect,
      validationPenalty,
      questionPenalty,
    }
  }).sort((left, right) => right.score - left.score)

  const rankedCases = scoredCases.slice(0, 5)

  const domains = Array.from(new Set(graph.nodes.map((node) => node.domain))).map((domain) => {
    const nodes = graph.nodes.filter((node) => node.domain === domain)
    const blocked = nodes.filter((node) => node.readiness === 'blocked').length
    const validated = nodes.filter((node) => node.status === 'validated').length
    const exposure = Math.min(100, Math.round((blocked * 55 + (nodes.length - validated) * 20) / Math.max(1, nodes.length)))
    return { domain, total: nodes.length, blocked, validated, exposure }
  }).sort((left, right) => right.exposure - left.exposure)

  const crossImpact = [...graph.edges]
    .sort((left, right) => right.strength - left.strength)
    .slice(0, 8)
    .map((edge) => ({
      ...edge,
      fromCase: cases.find((item) => item.id === edge.from),
      toCase: cases.find((item) => item.id === edge.to),
    }))

  const opportunities: Opportunity[] = []

  graph.edges
    .filter((edge) => edge.strength >= 55 && (edge.type === 'shared_evidence' || edge.type === 'shared_risk'))
    .forEach((edge) => {
      const fromCase = cases.find((item) => item.id === edge.from)
      const toCase = cases.find((item) => item.id === edge.to)
      if (!fromCase || !toCase) return

      opportunities.push({
        id: `synergy.${edge.id}`,
        type: 'synergy',
        title: `${fromCase.subject} + ${toCase.subject}`,
        detail: edge.label,
        rationale: `Relación de ${edge.strength}% detectada por ${edgeLabels[edge.type].toLowerCase()}.`,
        score: Math.min(100, edge.strength + (fromCase.readiness === 'ready_for_validation' ? 8 : 0) + (toCase.readiness === 'ready_for_validation' ? 8 : 0)),
        caseIds: [fromCase.id, toCase.id],
        action: 'Revisar ambos casos en una misma sesión y validar si comparten una intervención, responsable o secuencia de ejecución.',
      })
    })

  cases
    .filter((item) => item.readiness === 'blocked' && item.priority === 'high')
    .forEach((item) => {
      const connections = graph.edges.filter((edge) => edge.from === item.id || edge.to === item.id)
      opportunities.push({
        id: `unlock.${item.id}`,
        type: 'unlock',
        title: `Desbloquear: ${item.subject}`,
        detail: `${item.openQuestionCount} preguntas abiertas · ${connections.length} decisiones conectadas`,
        rationale: 'Caso de alta prioridad cuyo bloqueo puede propagar demora a otras decisiones relacionadas.',
        score: Math.min(100, 62 + connections.length * 5 + item.openQuestionCount * 3),
        caseIds: [item.id],
        action: 'Asignar responsable humano, resolver la pregunta bloqueante de mayor impacto y actualizar la evidencia antes de validar.',
      })
    })

  cases
    .filter((item) => {
      const connections = graph.edges.filter((edge) => edge.from === item.id || edge.to === item.id).length
      return item.priority === 'high' && item.status === 'generated' && connections <= 1
    })
    .forEach((item) => {
      opportunities.push({
        id: `neglected.${item.id}`,
        type: 'neglected',
        title: `Revisar decisión aislada: ${item.subject}`,
        detail: 'Alta prioridad con baja conectividad en el portfolio',
        rationale: 'Una decisión importante con pocas relaciones puede estar subdocumentada, mal conectada o fuera del flujo de revisión.',
        score: item.confidence === 'low' ? 82 : item.confidence === 'medium' ? 74 : 66,
        caseIds: [item.id],
        action: 'Confirmar dominio, evidencia y dependencias. Si la decisión es válida, incorporarla explícitamente al ciclo ejecutivo.',
      })
    })

  const opportunityQueue = opportunities
    .filter((item, index, all) => all.findIndex((candidate) => candidate.id === item.id) === index)
    .sort((left, right) => right.score - left.score)
    .slice(0, 6)

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
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--n3-teal-soft)]">Decision Prioritization Engine</p>
              <h3 className="mt-1 text-lg font-semibold text-[var(--n3-text-light)]">Casos que requieren atención</h3>
            </div>
            <Sparkles size={18} className="text-[var(--n3-teal-soft)]" />
          </div>

          <div className="mt-4 space-y-2">
            {rankedCases.map(({ item, score, urgency, impact, networkEffect, validationPenalty, questionPenalty }, index) => {
              const active = item.id === selectedCaseId
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectCase(item.id, item.readiness === 'blocked' ? 'timeline' : 'simulator')}
                  className={`grid w-full gap-3 border p-4 text-left transition sm:grid-cols-[34px_minmax(0,1fr)_72px] sm:items-center ${active ? 'border-[#d7332b] bg-[#101717]' : 'border-[var(--n3-line)] bg-[#0c1111] hover:border-[var(--n3-teal-soft)]'}`}
                >
                  <span className="text-lg font-semibold text-[var(--n3-text-muted)]">{String(index + 1).padStart(2, '0')}</span>
                  <span>
                    <span className="block text-sm font-semibold text-[var(--n3-text-light)]">{item.subject}</span>
                    <span className="mt-1 block text-[10px] uppercase tracking-[0.09em] text-[var(--n3-text-muted)]">
                      Urgencia {urgency} · Impacto {impact} · Red {networkEffect} · Penalización {validationPenalty + questionPenalty}
                    </span>
                    <span className={`mt-2 inline-flex items-center gap-2 text-[10px] font-semibold uppercase ${item.readiness === 'blocked' ? 'text-amber-300' : 'text-emerald-300'}`}>
                      {item.readiness === 'blocked' ? <AlertTriangle size={13} /> : <ShieldCheck size={13} />}
                      {item.readiness === 'blocked' ? 'Bloqueado' : 'Validable'}
                    </span>
                  </span>
                  <span className="text-right">
                    <span className="block text-2xl font-semibold text-[var(--n3-text-light)]">{score}</span>
                    <span className="text-[9px] uppercase tracking-[0.1em] text-[var(--n3-text-muted)]">Priority score</span>
                  </span>
                </button>
              )
            })}
          </div>
          <p className="mt-4 text-[10px] leading-4 text-[var(--n3-text-muted)]">Score explicable basado en prioridad, confianza, impacto estimado, conexiones, bloqueos y preguntas abiertas. Sirve para ordenar revisión humana, no para aprobar decisiones.</p>
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
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--n3-teal-soft)]">
              <Search size={14} /> Strategic Opportunity Scanner
            </div>
            <h3 className="mt-1 text-lg font-semibold text-[var(--n3-text-light)]">Oportunidades, desbloqueos y decisiones olvidadas</h3>
          </div>
          <p className="text-[10px] text-[var(--n3-text-muted)]">Hallazgos derivados del portfolio actual, no de datos externos ni del CRM.</p>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {opportunityQueue.map((opportunity) => (
            <article key={opportunity.id} className="border border-[var(--n3-line)] bg-[#080d0d] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  {opportunity.type === 'synergy' ? <Link2 size={15} className="text-[var(--n3-teal-soft)]" /> : opportunity.type === 'unlock' ? <ShieldCheck size={15} className="text-amber-300" /> : <Lightbulb size={15} className="text-[#ff766f]" />}
                  <span className="text-[9px] font-semibold uppercase tracking-[0.11em] text-[var(--n3-text-muted)]">{opportunityLabels[opportunity.type]}</span>
                </div>
                <span className="text-right">
                  <span className="block text-xl font-semibold text-[var(--n3-text-light)]">{opportunity.score}</span>
                  <span className="text-[8px] uppercase tracking-[0.1em] text-[var(--n3-text-muted)]">Potential</span>
                </span>
              </div>
              <h4 className="mt-3 text-sm font-semibold leading-5 text-[var(--n3-text-light)]">{opportunity.title}</h4>
              <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--n3-teal-soft)]">{opportunity.detail}</p>
              <p className="mt-3 text-[11px] leading-5 text-[var(--n3-text-muted)]">{opportunity.rationale}</p>
              <div className="mt-4 border-l-2 border-[var(--n3-teal-soft)] pl-3">
                <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[var(--n3-text-muted)]">Acción sugerida</p>
                <p className="mt-1 text-[11px] leading-5 text-[var(--n3-text-light)]">{opportunity.action}</p>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {opportunity.caseIds.map((caseId) => (
                  <button key={caseId} type="button" onClick={() => onSelectCase(caseId, 'timeline')} className="inline-flex items-center gap-1 border border-[var(--n3-line)] px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-[var(--n3-text-muted)] hover:border-[var(--n3-teal-soft)] hover:text-[var(--n3-text-light)]">
                    Abrir caso <ArrowRight size={10} />
                  </button>
                ))}
              </div>
            </article>
          ))}
          {opportunityQueue.length === 0 && <p className="border border-[var(--n3-line)] bg-[#080d0d] p-5 text-xs text-[var(--n3-text-muted)]">No hay oportunidades estructurales suficientes con los datos actuales.</p>}
        </div>
        <p className="mt-4 text-[10px] leading-4 text-[var(--n3-text-muted)]">Cada hallazgo requiere validación humana. El scanner identifica patrones estructurales, pero no confirma causalidad, valor financiero ni viabilidad de ejecución.</p>
      </div>

      <div className="border-t border-[var(--n3-line)] bg-[#080d0d] p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--n3-teal-soft)]">
              <Network size={14} /> Cross-Impact Matrix
            </div>
            <h3 className="mt-1 text-lg font-semibold text-[var(--n3-text-light)]">Dependencias y propagación entre decisiones</h3>
          </div>
          <p className="text-[10px] text-[var(--n3-text-muted)]">Ordenada por intensidad de relación dentro del Decision Graph.</p>
        </div>

        <div className="mt-4 overflow-x-auto border border-[var(--n3-line)]">
          <div className="min-w-[760px]">
            <div className="grid grid-cols-[minmax(210px,1fr)_150px_90px_minmax(210px,1fr)] bg-[#0c1111] px-4 py-3 text-[9px] font-semibold uppercase tracking-[0.11em] text-[var(--n3-text-muted)]">
              <span>Decisión origen</span>
              <span>Relación</span>
              <span>Intensidad</span>
              <span>Decisión relacionada</span>
            </div>
            {crossImpact.map((edge) => (
              <div key={edge.id} className="grid grid-cols-[minmax(210px,1fr)_150px_90px_minmax(210px,1fr)] items-center border-t border-[var(--n3-line)] px-4 py-3">
                <button type="button" onClick={() => onSelectCase(edge.from, 'simulator')} className="text-left text-xs font-semibold text-[var(--n3-text-light)] hover:text-[var(--n3-teal-soft)]">
                  {edge.fromCase?.subject ?? edge.from}
                </button>
                <span className="text-[10px] text-[var(--n3-text-muted)]">{edgeLabels[edge.type]}</span>
                <span>
                  <span className={`text-sm font-semibold ${edge.strength >= 70 ? 'text-[#ff766f]' : edge.strength >= 45 ? 'text-amber-300' : 'text-emerald-300'}`}>{edge.strength}%</span>
                  <span className="mt-1 block h-1 w-16 bg-[#151d1d]"><span className="block h-full bg-[var(--n3-teal-soft)]" style={{ width: `${edge.strength}%` }} /></span>
                </span>
                <button type="button" onClick={() => onSelectCase(edge.to, 'simulator')} className="flex items-center justify-between gap-3 text-left text-xs font-semibold text-[var(--n3-text-light)] hover:text-[var(--n3-teal-soft)]">
                  <span>{edge.toCase?.subject ?? edge.to}</span><ArrowRight size={13} />
                </button>
              </div>
            ))}
            {crossImpact.length === 0 && <p className="border-t border-[var(--n3-line)] p-5 text-xs text-[var(--n3-text-muted)]">No existen relaciones suficientes para construir la matriz.</p>}
          </div>
        </div>
        <p className="mt-4 text-[10px] leading-4 text-[var(--n3-text-muted)]">Las relaciones muestran evidencia, riesgo, dominio o secuencia de validación compartida. No implican causalidad comprobada y requieren interpretación humana.</p>
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
