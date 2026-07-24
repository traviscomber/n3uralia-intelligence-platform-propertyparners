'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ArrowRight, CheckCircle2, CircleHelp, FileSearch, Flag, Lightbulb, Radio, ShieldCheck } from 'lucide-react'
import type { EvidenceTimelineEvent } from '@/lib/executive-decision-graph'
import type { ExecutiveCase } from '@/lib/executive-cases'

type Props = {
  cases: ExecutiveCase[]
  events: EvidenceTimelineEvent[]
  selectedCaseId: string
  onSelectCase: (caseId: string) => void
}

const stageMeta = {
  evidence: { label: 'Evidencia', icon: FileSearch, className: 'text-cyan-300 border-cyan-500/50' },
  signal: { label: 'Señal', icon: Radio, className: 'text-sky-300 border-sky-500/50' },
  recommendation: { label: 'Recomendación', icon: Lightbulb, className: 'text-[var(--n3-teal-soft)] border-[var(--n3-teal-soft)]' },
  question: { label: 'Pregunta', icon: CircleHelp, className: 'text-amber-300 border-amber-500/50' },
  validation: { label: 'Validación', icon: ShieldCheck, className: 'text-violet-300 border-violet-500/50' },
  outcome: { label: 'Resultado', icon: Flag, className: 'text-emerald-300 border-emerald-500/50' },
} as const

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

export function EvidenceTimeline({ cases, events, selectedCaseId, onSelectCase }: Props) {
  const [stage, setStage] = useState<'all' | EvidenceTimelineEvent['stage']>('all')
  const selectedCase = cases.find((item) => item.id === selectedCaseId)
  const visible = useMemo(
    () => events
      .filter((event) => event.caseId === selectedCaseId && (stage === 'all' || event.stage === stage))
      .sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime()),
    [events, selectedCaseId, stage],
  )

  return (
    <div id="executive-evidence-timeline" className="border border-[var(--n3-line)] bg-[#0c1111]">
      <div className="border-b border-[var(--n3-line)] p-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--n3-teal-soft)]">Evidence Timeline</p>
        <div className="mt-2 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h3 className="text-xl font-semibold text-[var(--n3-text-light)]">Expediente auditable de decisiones</h3>
            <p className="mt-1 text-xs text-[var(--n3-text-muted)]">Evidencia, preguntas, validación humana y resultados conservados en una secuencia trazable y reutilizable.</p>
          </div>
          <label className="min-w-72 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">
            Caso ejecutivo
            <select value={selectedCaseId} onChange={(event) => onSelectCase(event.target.value)} className="mt-2 w-full border border-[var(--n3-line)] bg-[#080d0d] px-3 py-2 text-xs normal-case tracking-normal text-[var(--n3-text-light)] outline-none">
              {cases.map((item) => <option key={item.id} value={item.id}>{item.subject}</option>)}
            </select>
          </label>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-[var(--n3-line)] p-4">
        <button type="button" onClick={() => setStage('all')} className={`border px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.1em] ${stage === 'all' ? 'border-[#d7332b] text-[#ff766f]' : 'border-[var(--n3-line)] text-[var(--n3-text-muted)]'}`}>Todo</button>
        {(Object.keys(stageMeta) as EvidenceTimelineEvent['stage'][]).map((key) => (
          <button key={key} type="button" onClick={() => setStage(key)} className={`border px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.1em] ${stage === key ? stageMeta[key].className : 'border-[var(--n3-line)] text-[var(--n3-text-muted)]'}`}>{stageMeta[key].label}</button>
        ))}
      </div>

      <div className="grid gap-px bg-[var(--n3-line)] lg:grid-cols-[minmax(260px,0.35fr)_minmax(0,1fr)]">
        <aside className="bg-[#080d0d] p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">Estado del expediente</p>
          <h4 className="mt-2 text-lg font-semibold text-[var(--n3-text-light)]">{selectedCase?.subject ?? 'Sin caso seleccionado'}</h4>
          {selectedCase && (
            <div className="mt-4 space-y-3 text-xs text-[var(--n3-text-muted)]">
              <p><span className="font-semibold text-[var(--n3-text-light)]">Readiness:</span> {selectedCase.readiness === 'blocked' ? 'Bloqueado' : 'Listo para validación'}</p>
              <p><span className="font-semibold text-[var(--n3-text-light)]">Confianza:</span> {selectedCase.confidence}</p>
              <p><span className="font-semibold text-[var(--n3-text-light)]">Preguntas abiertas:</span> {selectedCase.openQuestionCount}</p>
              <p><span className="font-semibold text-[var(--n3-text-light)]">Validación:</span> {selectedCase.validationStatus}</p>
              <div className="flex items-center gap-2 border border-[var(--n3-line)] p-3">
                <CheckCircle2 size={15} className={selectedCase.status === 'closed' ? 'text-emerald-300' : 'text-[var(--n3-text-muted)]'} />
                <span>Resultado {selectedCase.outcome.status}</span>
              </div>
              <Link href={selectedCase.href} className="inline-flex items-center gap-2 pt-2 font-semibold text-[#ff766f]">Abrir expediente completo <ArrowRight size={14} /></Link>
            </div>
          )}
        </aside>

        <div className="bg-[#0c1111] p-5">
          {visible.length > 0 ? (
            <ol className="relative border-l border-[var(--n3-line)] pl-6">
              {visible.map((event, index) => {
                const meta = stageMeta[event.stage]
                const Icon = meta.icon
                return (
                  <li key={event.id} className={index === visible.length - 1 ? '' : 'pb-6'}>
                    <span className={`absolute -left-[15px] flex h-7 w-7 items-center justify-center rounded-full border bg-[#080d0d] ${meta.className}`}><Icon size={13} /></span>
                    <div className="border border-[var(--n3-line)] bg-[#080d0d] p-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${meta.className.split(' ')[0]}`}>{meta.label}</p>
                          <h5 className="mt-1 text-sm font-semibold text-[var(--n3-text-light)]">{event.title}</h5>
                        </div>
                        <time className="text-[10px] uppercase tracking-[0.1em] text-[var(--n3-text-muted)]">{formatDate(event.occurredAt)}</time>
                      </div>
                      <p className="mt-3 text-xs leading-5 text-[var(--n3-text-muted)]">{event.detail}</p>
                      <div className="mt-3 flex flex-col gap-2 border-t border-[var(--n3-line)] pt-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-[10px] uppercase tracking-[0.1em] text-[var(--n3-text-muted)]">Fuente · {event.source}</p>
                        {selectedCase && <Link href={selectedCase.href} className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#ff766f]">Abrir evidencia <ArrowRight size={12} /></Link>}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ol>
          ) : <p className="border border-dashed border-[var(--n3-line)] p-5 text-xs text-[var(--n3-text-muted)]">No hay eventos para el filtro seleccionado.</p>}
        </div>
      </div>
    </div>
  )
}
