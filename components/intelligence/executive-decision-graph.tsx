'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ArrowDown, ArrowRight, Network, RotateCcw } from 'lucide-react'
import { buildExecutiveCases } from '@/lib/executive-cases'
import {
  buildEvidenceTimeline,
  type ExecutiveDecisionGraph,
  type ExecutiveDecisionGraphEdgeType,
} from '@/lib/executive-decision-graph'
import { EvidenceTimeline } from '@/components/intelligence/evidence-timeline'

type GraphFilter = 'all' | ExecutiveDecisionGraphEdgeType

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

export function ExecutiveDecisionGraphView({ graph }: Props) {
  const cases = useMemo(() => buildExecutiveCases('ceo'), [])
  const timeline = useMemo(() => buildEvidenceTimeline('ceo'), [])
  const [filter, setFilter] = useState<GraphFilter>('all')
  const [selectedId, setSelectedId] = useState(graph.nodes[0]?.id ?? cases[0]?.id ?? '')

  const visibleEdges = useMemo(
    () => graph.edges.filter((edge) => filter === 'all' || edge.type === filter),
    [filter, graph.edges],
  )
  const selected = graph.nodes.find((node) => node.id === selectedId)
  const related = visibleEdges.filter((edge) => edge.from === selectedId || edge.to === selectedId)

  function selectCase(caseId: string, scrollToTimeline = false) {
    setSelectedId(caseId)
    if (scrollToTimeline) {
      window.requestAnimationFrame(() => {
        document.getElementById('executive-evidence-timeline')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    }
  }

  function resetGraph() {
    setFilter('all')
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
            <p className="mt-1 text-xs text-[var(--n3-text-muted)]">Selecciona un caso para inspeccionar conexiones y sincronizar su expediente cronológico.</p>
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
                  <button type="button" onClick={() => selectCase(selected.id, true)} className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--n3-teal-soft)]">
                    Ver Timeline <ArrowDown size={14} />
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
    </div>
  )
}
