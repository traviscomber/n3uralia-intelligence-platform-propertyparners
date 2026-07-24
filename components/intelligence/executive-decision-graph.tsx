'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  CheckCircle2,
  Clock3,
  Network,
  RotateCcw,
  ShieldCheck,
  XCircle,
} from 'lucide-react'
import { buildExecutiveCases } from '@/lib/executive-cases'
import {
  buildEvidenceTimeline,
  simulateExecutiveImpact,
  type ExecutiveDecisionGraph,
  type ExecutiveDecisionGraphEdgeType,
  type ExecutiveImpactSimulation,
} from '@/lib/executive-decision-graph'
import { EvidenceTimeline } from '@/components/intelligence/evidence-timeline'
import { ExecutiveMemory } from '@/components/intelligence/executive-memory'

type GraphFilter = 'all' | ExecutiveDecisionGraphEdgeType
type SectionTarget = 'timeline' | 'simulator' | 'memory'

type Props = {
  graph: ExecutiveDecisionGraph
}

const labels: Record<GraphFilter, string> = {
  all: 'Todas',
  shared_domain: 'Dominio',
  shared_evidence: 'Evidencia',
  shared_risk: 'Riesgo',
  validation_dependency: 'Validación',
}

const scenarioMeta: Record<
  ExecutiveImpactSimulation['scenario'],
  { label: string; description: string; icon: typeof CheckCircle2 }
> = {
  approve: {
    label: 'Aprobar',
    description: 'Ejecutar únicamente después de validación humana.',
    icon: CheckCircle2,
  },
  defer: {
    label: 'Diferir',
    description: 'Esperar nueva evidencia o resolver dependencias.',
    icon: Clock3,
  },
  reject: {
    label: 'Rechazar',
    description: 'No ejecutar la recomendación en su estado actual.',
    icon: XCircle,
  },
}

const directionLabels = {
  positive: 'Positiva',
  neutral: 'Neutral',
  negative: 'Negativa',
} as const

const magnitudeLabels = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
} as const

const sectionIds: Record<SectionTarget, string> = {
  timeline: 'executive-evidence-timeline',
  simulator: 'executive-impact-simulator',
  memory: 'executive-memory',
}

export function ExecutiveDecisionGraphView({ graph }: Props) {
  const cases = useMemo(() => buildExecutiveCases('ceo'), [])
  const timeline = useMemo(() => buildEvidenceTimeline('ceo'), [])
  const [filter, setFilter] = useState<GraphFilter>('all')
  const [selectedId, setSelectedId] = useState(graph.nodes[0]?.id ?? cases[0]?.id ?? '')
  const [scenario, setScenario] = useState<ExecutiveImpactSimulation['scenario']>('approve')

  const visibleEdges = useMemo(
    () => graph.edges.filter((edge) => filter === 'all' || edge.type === filter),
    [filter, graph.edges],
  )
  const selected = graph.nodes.find((node) => node.id === selectedId)
  const selectedCase = cases.find((item) => item.id === selectedId) ?? cases[0]
  const related = visibleEdges.filter((edge) => edge.from === selectedId || edge.to === selectedId)
  const simulation = useMemo(
    () => selectedCase ? simulateExecutiveImpact(selectedCase, graph, scenario) : null,
    [graph, scenario, selectedCase],
  )

  function selectCase(caseId: string, target?: SectionTarget) {
    setSelectedId(caseId)
    if (target) {
      window.requestAnimationFrame(() => {
        document.getElementById(sectionIds[target])?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    }
  }

  function resetGraph() {
    setFilter('all')
    setScenario('approve')
    setSelectedId(graph.nodes[0]?.id ?? cases[0]?.id ?? '')
  }

  return (
    <div className="space-y-5">
      <div className="border border-[var(--n3-line)] bg-[#0c1111]">
        <div className="flex flex-col gap-4 border-b border-[var(--n3-line)] p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--n3-teal-soft)]">
              <Network size={15} /> Decision Graph
            </div>
            <h3 className="mt-2 text-xl font-semibold text-[var(--n3-text-light)]">Relaciones entre casos ejecutivos</h3>
            <p className="mt-1 text-xs text-[var(--n3-text-muted)]">Selecciona un caso para inspeccionar conexiones, evidencia, impacto y memoria ejecutiva.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(labels) as GraphFilter[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`border px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] ${filter === key ? 'border-[var(--n3-teal-soft)] text-[var(--n3-text-light)]' : 'border-[var(--n3-line)] text-[var(--n3-text-muted)]'}`}
              >
                {labels[key]}
              </button>
            ))}
            <button type="button" onClick={resetGraph} className="border border-[var(--n3-line)] p-2 text-[var(--n3-text-muted)]" aria-label="Restablecer grafo">
              <RotateCcw size={14} />
            </button>
          </div>
        </div>

        <div className="grid gap-px bg-[var(--n3-line)] lg:grid-cols-[minmax(0,1.25fr)_minmax(300px,0.75fr)]">
          <div className="grid gap-3 bg-[#080d0d] p-5 sm:grid-cols-2 xl:grid-cols-3">
            {graph.nodes.map((node) => {
              const count = visibleEdges.filter((edge) => edge.from === node.id || edge.to === node.id).length
              const active = node.id === selectedId
              return (
                <button
                  key={node.id}
                  type="button"
                  onClick={() => selectCase(node.id)}
                  className={`min-h-36 border p-4 text-left transition ${active ? 'border-[#d7332b] bg-[#101717]' : 'border-[var(--n3-line)] bg-[#0c1111] hover:border-[var(--n3-teal-soft)]'}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--n3-teal-soft)]">{node.domain}</span>
                    <span className="text-[9px] uppercase text-[var(--n3-text-muted)]">{count} conexiones</span>
                  </div>
                  <p className="mt-3 text-sm font-semibold leading-5 text-[var(--n3-text-light)]">{node.label}</p>
                  <p className="mt-3 text-[10px] uppercase tracking-[0.1em] text-[var(--n3-text-muted)]">{node.priority} · {node.confidence} · {node.readiness === 'blocked' ? 'bloqueado' : 'listo'}</p>
                </button>
              )
            })}
          </div>

          <aside className="bg-[#0c1111] p-5">
            {selected ? (
              <>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#ff766f]">Caso seleccionado</p>
                <h4 className="mt-2 text-lg font-semibold text-[var(--n3-text-light)]">{selected.label}</h4>
                <div className="mt-4 space-y-2">
                  {related.length > 0 ? related.map((edge) => {
                    const otherId = edge.from === selected.id ? edge.to : edge.from
                    const other = graph.nodes.find((node) => node.id === otherId)
                    return (
                      <button key={edge.id} type="button" onClick={() => selectCase(otherId)} className="w-full border border-[var(--n3-line)] bg-[#080d0d] p-3 text-left hover:border-[var(--n3-teal-soft)]">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--n3-teal-soft)]">{labels[edge.type]} · {edge.strength}%</p>
                        <p className="mt-1 text-xs font-semibold text-[var(--n3-text-light)]">{other?.label ?? otherId}</p>
                        <p className="mt-1 text-[10px] text-[var(--n3-text-muted)]">{edge.label}</p>
                      </button>
                    )
                  }) : <p className="border border-dashed border-[var(--n3-line)] p-4 text-xs text-[var(--n3-text-muted)]">No hay conexiones para el filtro actual.</p>}
                </div>
                <div className="mt-5 flex flex-wrap gap-4">
                  <button type="button" onClick={() => selectCase(selected.id, 'timeline')} className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--n3-teal-soft)]">
                    Ver Timeline <ArrowDown size={14} />
                  </button>
                  <button type="button" onClick={() => selectCase(selected.id, 'simulator')} className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--n3-teal-soft)]">
                    Simular impacto <BarChart3 size={14} />
                  </button>
                  <button type="button" onClick={() => selectCase(selected.id, 'memory')} className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--n3-teal-soft)]">
                    Registrar memoria <BookOpenCheck size={14} />
                  </button>
                  <Link href={selected.href} className="inline-flex items-center gap-2 text-xs font-semibold text-[#ff766f]">Abrir evidencia <ArrowRight size={14} /></Link>
                </div>
              </>
            ) : <p className="text-xs text-[var(--n3-text-muted)]">No existen casos ejecutivos para mostrar.</p>}
          </aside>
        </div>
      </div>

      <EvidenceTimeline
        cases={cases}
        events={timeline}
        selectedCaseId={selectedId}
        onSelectCase={selectCase}
      />

      {selectedCase && simulation && (
        <>
          <section id="executive-impact-simulator" className="border border-[var(--n3-line)] bg-[#0c1111]">
            <header className="border-b border-[var(--n3-line)] p-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--n3-teal-soft)]">
                    <BarChart3 size={15} /> Impact Simulator
                  </div>
                  <h3 className="mt-2 text-xl font-semibold text-[var(--n3-text-light)]">Simulación ejecutiva de escenarios</h3>
                  <p className="mt-1 max-w-3xl text-xs text-[var(--n3-text-muted)]">Compara aprobar, diferir o rechazar. La estimación conserva supuestos, dependencias y control humano.</p>
                </div>
                <label className="min-w-72 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">
                  Caso ejecutivo
                  <select value={selectedCase.id} onChange={(event) => selectCase(event.target.value)} className="mt-2 w-full border border-[var(--n3-line)] bg-[#080d0d] px-3 py-2 text-xs normal-case tracking-normal text-[var(--n3-text-light)] outline-none">
                    {cases.map((item) => <option key={item.id} value={item.id}>{item.subject}</option>)}
                  </select>
                </label>
              </div>
            </header>

            <div className="grid gap-px bg-[var(--n3-line)] xl:grid-cols-[minmax(280px,0.38fr)_minmax(0,1fr)]">
              <aside className="bg-[#080d0d] p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">Escenario</p>
                <div className="mt-3 space-y-2">
                  {(Object.keys(scenarioMeta) as ExecutiveImpactSimulation['scenario'][]).map((key) => {
                    const meta = scenarioMeta[key]
                    const Icon = meta.icon
                    const active = scenario === key
                    return (
                      <button key={key} type="button" onClick={() => setScenario(key)} className={`w-full border p-3 text-left ${active ? 'border-[#d7332b] bg-[#101717]' : 'border-[var(--n3-line)] bg-[#0c1111]'}`}>
                        <div className="flex items-center gap-2">
                          <Icon size={15} className={active ? 'text-[#ff766f]' : 'text-[var(--n3-text-muted)]'} />
                          <span className="text-xs font-semibold text-[var(--n3-text-light)]">{meta.label}</span>
                        </div>
                        <p className="mt-2 text-[10px] leading-4 text-[var(--n3-text-muted)]">{meta.description}</p>
                      </button>
                    )
                  })}
                </div>

                <div className={`mt-5 border p-4 ${selectedCase.readiness === 'blocked' || selectedCase.validationStatus === 'pending_human_validation' ? 'border-amber-500/50' : 'border-emerald-500/50'}`}>
                  <div className="flex items-center gap-2">
                    {selectedCase.readiness === 'blocked' || selectedCase.validationStatus === 'pending_human_validation'
                      ? <AlertTriangle size={15} className="text-amber-300" />
                      : <ShieldCheck size={15} className="text-emerald-300" />}
                    <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--n3-text-light)]">Control humano</p>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-[var(--n3-text-muted)]">
                    {selectedCase.readiness === 'blocked' || selectedCase.validationStatus === 'pending_human_validation'
                      ? 'Escenario no ejecutable: resolver preguntas abiertas y registrar validación humana.'
                      : 'Caso preparado para revisión humana final; la simulación no autoriza ejecución.'}
                  </p>
                </div>
              </aside>

              <div className="bg-[#0c1111] p-5">
                <div className="grid gap-3 sm:grid-cols-3">
                  <Metric label="Dirección estimada" value={directionLabels[simulation.estimatedDirection]} />
                  <Metric label="Magnitud" value={magnitudeLabels[simulation.estimatedMagnitude]} />
                  <Metric label="Confianza" value={simulation.confidence} />
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  <ImpactPanel title="KPIs afectados" items={simulation.affectedKpis} empty="Sin KPIs identificados" />
                  <ImpactPanel title="Dominios afectados" items={simulation.affectedDomains} empty="Sin dominios relacionados" />
                  <ImpactPanel title="Riesgos relacionados" items={simulation.affectedRisks} empty="No se detectaron riesgos compartidos" />
                  <ImpactPanel title="Supuestos de simulación" items={simulation.assumptions} empty="Sin supuestos registrados" />
                </div>

                <div className="mt-5 border border-[var(--n3-line)] bg-[#080d0d] p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--n3-teal-soft)]">Propagación entre casos</p>
                  {simulation.dependentCaseIds.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {simulation.dependentCaseIds.map((caseId) => {
                        const dependentCase = cases.find((item) => item.id === caseId)
                        return (
                          <button key={caseId} type="button" onClick={() => selectCase(caseId)} className="inline-flex items-center gap-2 border border-[var(--n3-line)] px-3 py-2 text-[10px] font-semibold text-[var(--n3-text-light)] hover:border-[var(--n3-teal-soft)]">
                            {dependentCase?.subject ?? caseId} <ArrowRight size={12} />
                          </button>
                        )
                      })}
                    </div>
                  ) : <p className="mt-3 text-xs text-[var(--n3-text-muted)]">Este caso no propaga impacto hacia otros casos del grafo.</p>}
                </div>

                <div className="mt-5 flex justify-end">
                  <button type="button" onClick={() => selectCase(selectedCase.id, 'memory')} className="inline-flex items-center gap-2 border border-[var(--n3-teal-soft)] px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--n3-text-light)]">
                    Registrar decisión <BookOpenCheck size={14} />
                  </button>
                </div>
                <p className="mt-4 text-[10px] leading-4 text-[var(--n3-text-muted)]">{simulation.disclaimer}</p>
              </div>
            </div>
          </section>

          <ExecutiveMemory executiveCase={selectedCase} simulation={simulation} onSelectCase={selectCase} />
        </>
      )}
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[var(--n3-line)] bg-[#080d0d] p-4">
      <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">{label}</p>
      <p className="mt-2 text-lg font-semibold capitalize text-[var(--n3-text-light)]">{value}</p>
    </div>
  )
}

function ImpactPanel({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <div className="border border-[var(--n3-line)] bg-[#080d0d] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--n3-teal-soft)]">{title}</p>
      {items.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {items.map((item) => <li key={item} className="text-xs leading-5 text-[var(--n3-text-muted)]">— {item}</li>)}
        </ul>
      ) : <p className="mt-3 text-xs text-[var(--n3-text-muted)]">{empty}</p>}
    </div>
  )
}
