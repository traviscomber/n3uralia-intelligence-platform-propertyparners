'use client'

import { FormEvent, useMemo, useState } from 'react'
import { ArrowRight, Bot, CornerDownLeft, Search, ShieldCheck, Sparkles } from 'lucide-react'
import type { ExecutivePortfolio } from '@/lib/executive-decision-graph'

type Props = {
  portfolio: ExecutivePortfolio
  onSelectCase: (caseId: string, target?: 'timeline' | 'simulator' | 'memory') => void
}

type CopilotAnswer = {
  title: string
  summary: string
  reasons: string[]
  caseIds: string[]
  confidence: 'high' | 'medium' | 'low'
}

const prompts = [
  '¿Qué debería decidir esta semana?',
  '¿Qué bloquea más valor?',
  '¿Qué decisión tiene mayor efecto cascada?',
  '¿Qué evidencia falta?',
]

const priorityWeight = { high: 3, medium: 2, low: 1 } as const
const confidenceWeight = { high: 3, medium: 2, low: 1 } as const

export function ExecutiveCopilot({ portfolio, onSelectCase }: Props) {
  const [query, setQuery] = useState(prompts[0])
  const [submittedQuery, setSubmittedQuery] = useState(prompts[0])

  const answer = useMemo(() => buildAnswer(submittedQuery, portfolio), [submittedQuery, portfolio])

  function submit(event?: FormEvent) {
    event?.preventDefault()
    const normalized = query.trim()
    if (normalized) setSubmittedQuery(normalized)
  }

  return (
    <section id="executive-copilot" className="border-t border-[var(--n3-line)] bg-[#080d0d] p-5">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)]">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--n3-teal-soft)]">
            <Bot size={15} /> Executive Copilot
          </div>
          <h3 className="mt-2 text-xl font-semibold text-[var(--n3-text-light)]">Pregunta al portfolio</h3>
          <p className="mt-2 text-xs leading-5 text-[var(--n3-text-muted)]">
            Respuestas explicables derivadas de casos, evidencia, simulaciones y relaciones existentes. No ejecuta decisiones ni incorpora datos externos.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {prompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => {
                  setQuery(prompt)
                  setSubmittedQuery(prompt)
                }}
                className="border border-[var(--n3-line)] bg-[#0c1111] px-3 py-2 text-left text-[10px] text-[var(--n3-text-muted)] transition hover:border-[var(--n3-teal-soft)] hover:text-[var(--n3-text-light)]"
              >
                {prompt}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="mt-4 flex border border-[var(--n3-line)] bg-[#0c1111] focus-within:border-[var(--n3-teal-soft)]">
            <Search size={16} className="ml-3 mt-3 text-[var(--n3-text-muted)]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Pregunta para Executive Copilot"
              className="min-w-0 flex-1 bg-transparent px-3 py-3 text-xs text-[var(--n3-text-light)] outline-none placeholder:text-[var(--n3-text-muted)]"
              placeholder="Pregunta sobre prioridades, bloqueos, evidencia o impacto"
            />
            <button type="submit" className="border-l border-[var(--n3-line)] px-4 text-[var(--n3-teal-soft)] hover:bg-[#111919]" aria-label="Consultar">
              <CornerDownLeft size={16} />
            </button>
          </form>
        </div>

        <article className="border border-[var(--n3-line)] bg-[#0c1111] p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.11em] text-[var(--n3-teal-soft)]">
                <Sparkles size={13} /> Respuesta del portfolio
              </div>
              <h4 className="mt-2 text-lg font-semibold text-[var(--n3-text-light)]">{answer.title}</h4>
            </div>
            <span className={`inline-flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.1em] ${answer.confidence === 'high' ? 'text-emerald-300' : answer.confidence === 'medium' ? 'text-amber-300' : 'text-[#ff766f]'}`}>
              <ShieldCheck size={13} /> Confianza {answer.confidence}
            </span>
          </div>

          <p className="mt-4 text-sm leading-6 text-[var(--n3-text-light)]">{answer.summary}</p>

          <div className="mt-5 border-l-2 border-[var(--n3-teal-soft)] pl-4">
            <p className="text-[9px] font-semibold uppercase tracking-[0.11em] text-[var(--n3-text-muted)]">Por qué</p>
            <ul className="mt-2 space-y-2">
              {answer.reasons.map((reason) => (
                <li key={reason} className="text-[11px] leading-5 text-[var(--n3-text-muted)]">{reason}</li>
              ))}
            </ul>
          </div>

          {answer.caseIds.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {answer.caseIds.map((caseId, index) => {
                const executiveCase = portfolio.cases.find((item) => item.id === caseId)
                return (
                  <button
                    key={caseId}
                    type="button"
                    onClick={() => onSelectCase(caseId, executiveCase?.readiness === 'blocked' ? 'timeline' : 'simulator')}
                    className="inline-flex items-center gap-2 border border-[var(--n3-line)] px-3 py-2 text-[10px] font-semibold text-[var(--n3-text-light)] hover:border-[var(--n3-teal-soft)]"
                  >
                    {index + 1}. {executiveCase?.subject ?? 'Abrir caso'} <ArrowRight size={11} />
                  </button>
                )
              })}
            </div>
          )}

          <p className="mt-5 text-[9px] leading-4 text-[var(--n3-text-muted)]">
            La respuesta prioriza revisión humana. No representa una aprobación, predicción garantizada ni instrucción automática de ejecución.
          </p>
        </article>
      </div>
    </section>
  )
}

function buildAnswer(query: string, portfolio: ExecutivePortfolio): CopilotAnswer {
  const normalized = query.toLowerCase()
  const { cases, graph, simulations } = portfolio

  const ranked = cases.map((item) => {
    const connectedEdges = graph.edges.filter((edge) => edge.from === item.id || edge.to === item.id)
    const simulation = simulations.find((entry) => entry.caseId === item.id)
    const score = priorityWeight[item.priority] * 20
      + confidenceWeight[item.confidence] * 10
      + (simulation?.estimatedMagnitude === 'high' ? 25 : simulation?.estimatedMagnitude === 'medium' ? 15 : 5)
      + Math.min(15, connectedEdges.length * 3)
      - (item.readiness === 'blocked' ? 18 : 0)
      - Math.min(20, item.openQuestionCount * 4)
    return { item, score, connectedEdges, simulation }
  }).sort((left, right) => right.score - left.score)

  if (normalized.includes('bloque') || normalized.includes('desbloque')) {
    const blocked = ranked.filter(({ item }) => item.readiness === 'blocked')
    const top = blocked[0]
    if (!top) return emptyAnswer('No hay bloqueos críticos', 'El portfolio no contiene casos bloqueados en este momento.')
    return {
      title: 'Principal bloqueo del portfolio',
      summary: `${top.item.subject} es el bloqueo más relevante por su prioridad, preguntas abiertas y efecto sobre ${top.connectedEdges.length} decisiones relacionadas.`,
      reasons: [
        `Prioridad declarada: ${top.item.priority}.`,
        `${top.item.openQuestionCount} preguntas abiertas requieren resolución humana.`,
        `${top.connectedEdges.length} relaciones en el Decision Graph pueden propagar demora.`,
      ],
      caseIds: [top.item.id, ...relatedIds(top.item.id, top.connectedEdges).slice(0, 2)],
      confidence: top.item.confidence,
    }
  }

  if (normalized.includes('cascada') || normalized.includes('efecto') || normalized.includes('impact')) {
    const networkRanked = [...ranked].sort((left, right) => right.connectedEdges.length - left.connectedEdges.length || right.score - left.score)
    const top = networkRanked[0]
    if (!top) return emptyAnswer('No hay suficiente información', 'El portfolio todavía no contiene relaciones para evaluar efectos en cascada.')
    return {
      title: 'Mayor efecto potencial en cascada',
      summary: `${top.item.subject} conecta con ${top.connectedEdges.length} decisiones y presenta impacto estimado ${top.simulation?.estimatedMagnitude ?? 'bajo'}.`,
      reasons: [
        `${top.connectedEdges.length} conexiones estructurales dentro del portfolio.`,
        `Impacto estimado: ${top.simulation?.estimatedMagnitude ?? 'low'}; dirección: ${top.simulation?.estimatedDirection ?? 'neutral'}.`,
        `Las conexiones representan evidencia, riesgo, dominio o dependencia compartida; no causalidad confirmada.`,
      ],
      caseIds: [top.item.id, ...relatedIds(top.item.id, top.connectedEdges).slice(0, 3)],
      confidence: top.item.confidence,
    }
  }

  if (normalized.includes('evidencia') || normalized.includes('falta')) {
    const missing = [...ranked].sort((left, right) => right.item.openQuestionCount - left.item.openQuestionCount || right.score - left.score)
    const top = missing[0]
    if (!top || top.item.openQuestionCount === 0) return emptyAnswer('Evidencia suficientemente cubierta', 'No hay preguntas abiertas registradas en los casos actuales.')
    return {
      title: 'Brecha de evidencia prioritaria',
      summary: `${top.item.subject} concentra la mayor necesidad de clarificación antes de una validación responsable.`,
      reasons: [
        `${top.item.openQuestionCount} preguntas abiertas registradas.`,
        `Readiness actual: ${top.item.readiness}.`,
        `La evidencia debe actualizarse en el Timeline y quedar asociada a una fuente verificable.`,
      ],
      caseIds: [top.item.id],
      confidence: top.item.confidence,
    }
  }

  const recommended = ranked.filter(({ item }) => item.readiness === 'ready_for_validation').slice(0, 3)
  const fallback = recommended.length > 0 ? recommended : ranked.slice(0, 3)
  if (fallback.length === 0) return emptyAnswer('Portfolio sin casos', 'No existen decisiones disponibles para analizar.')

  return {
    title: 'Agenda ejecutiva recomendada',
    summary: `Revisaría ${fallback.map(({ item }) => item.subject).join('; ')}. El orden combina prioridad, confianza, impacto, conectividad y bloqueos.`,
    reasons: fallback.map(({ item, score }) => `${item.subject}: score ${Math.max(0, Math.min(100, score))}, prioridad ${item.priority}, confianza ${item.confidence}, readiness ${item.readiness}.`),
    caseIds: fallback.map(({ item }) => item.id),
    confidence: fallback.every(({ item }) => item.confidence === 'high') ? 'high' : fallback.some(({ item }) => item.confidence === 'low') ? 'low' : 'medium',
  }
}

function relatedIds(caseId: string, edges: ExecutivePortfolio['graph']['edges']) {
  return Array.from(new Set(edges.map((edge) => edge.from === caseId ? edge.to : edge.from)))
}

function emptyAnswer(title: string, summary: string): CopilotAnswer {
  return { title, summary, reasons: ['La respuesta se limita a la información estructurada disponible en el portfolio.'], caseIds: [], confidence: 'low' }
}
