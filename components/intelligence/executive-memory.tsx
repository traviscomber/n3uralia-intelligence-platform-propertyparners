'use client'

import { useEffect, useMemo, useState } from 'react'
import { BookOpenCheck, CheckCircle2, Database, Save, ShieldCheck } from 'lucide-react'
import type { ExecutiveCase } from '@/lib/executive-cases'
import type { ExecutiveImpactSimulation } from '@/lib/executive-decision-graph'

type MemoryDecision = 'approve' | 'defer' | 'reject'
type OutcomeStatus = 'pending' | 'positive' | 'neutral' | 'negative'

type ExecutiveMemoryRecord = {
  caseId: string
  decision: MemoryDecision
  decisionRationale: string
  validator: string
  expectedImpact: string
  actualOutcome: string
  outcomeStatus: OutcomeStatus
  lessonLearned: string
  reusablePattern: string
  evidenceSnapshot: string[]
  updatedAt: string
}

type Props = {
  executiveCase: ExecutiveCase
  simulation: ExecutiveImpactSimulation
  onSelectCase?: (caseId: string) => void
}

const decisionLabels: Record<MemoryDecision, string> = {
  approve: 'Aprobar',
  defer: 'Diferir',
  reject: 'Rechazar',
}

const outcomeLabels: Record<OutcomeStatus, string> = {
  pending: 'Pendiente',
  positive: 'Positivo',
  neutral: 'Neutral',
  negative: 'Negativo',
}

function storageKey(caseId: string) {
  return `n3uralia.executive-memory.${caseId}`
}

function blankRecord(executiveCase: ExecutiveCase, simulation: ExecutiveImpactSimulation): ExecutiveMemoryRecord {
  return {
    caseId: executiveCase.id,
    decision: simulation.scenario,
    decisionRationale: '',
    validator: '',
    expectedImpact: `${simulation.estimatedDirection} / ${simulation.estimatedMagnitude}`,
    actualOutcome: '',
    outcomeStatus: 'pending',
    lessonLearned: '',
    reusablePattern: '',
    evidenceSnapshot: [executiveCase.reason, ...simulation.assumptions].filter(Boolean),
    updatedAt: new Date().toISOString(),
  }
}

export function ExecutiveMemory({ executiveCase, simulation }: Props) {
  const initial = useMemo(() => blankRecord(executiveCase, simulation), [executiveCase, simulation])
  const [record, setRecord] = useState<ExecutiveMemoryRecord>(initial)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const next = blankRecord(executiveCase, simulation)
    try {
      const stored = window.localStorage.getItem(storageKey(executiveCase.id))
      setRecord(stored ? { ...next, ...JSON.parse(stored), caseId: executiveCase.id } : next)
    } catch {
      setRecord(next)
    }
    setSaved(false)
  }, [executiveCase, simulation])

  function update<K extends keyof ExecutiveMemoryRecord>(key: K, value: ExecutiveMemoryRecord[K]) {
    setRecord((current) => ({ ...current, [key]: value }))
    setSaved(false)
  }

  function saveMemory() {
    const next = { ...record, updatedAt: new Date().toISOString() }
    window.localStorage.setItem(storageKey(executiveCase.id), JSON.stringify(next))
    setRecord(next)
    setSaved(true)
  }

  const isValidated = record.validator.trim().length > 1 && record.decisionRationale.trim().length > 5
  const learningComplete = record.outcomeStatus !== 'pending' && record.lessonLearned.trim().length > 5

  return (
    <section id="executive-memory" className="border border-[var(--n3-line)] bg-[#0c1111]">
      <header className="border-b border-[var(--n3-line)] p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--n3-teal-soft)]">
              <BookOpenCheck size={15} /> Executive Memory
            </div>
            <h3 className="mt-2 text-xl font-semibold text-[var(--n3-text-light)]">Memoria y aprendizaje de decisiones</h3>
            <p className="mt-1 max-w-3xl text-xs text-[var(--n3-text-muted)]">Registra la decisión humana, conserva la evidencia empleada y transforma el resultado real en un patrón reutilizable.</p>
          </div>
          <div className="flex items-center gap-2 border border-[var(--n3-line)] bg-[#080d0d] px-3 py-2 text-[10px] uppercase tracking-[0.1em] text-[var(--n3-text-muted)]">
            <Database size={14} /> Persistencia local segura
          </div>
        </div>
      </header>

      <div className="grid gap-px bg-[var(--n3-line)] xl:grid-cols-[minmax(280px,0.38fr)_minmax(0,1fr)]">
        <aside className="bg-[#080d0d] p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--n3-teal-soft)]">Caso activo</p>
          <h4 className="mt-2 text-sm font-semibold leading-5 text-[var(--n3-text-light)]">{executiveCase.subject}</h4>
          <p className="mt-3 text-xs leading-5 text-[var(--n3-text-muted)]">{executiveCase.recommendation}</p>

          <div className="mt-5 space-y-3">
            <StatusCard label="Validación humana" complete={isValidated} text={isValidated ? 'Responsable y fundamento registrados' : 'Pendiente de responsable y fundamento'} />
            <StatusCard label="Ciclo de aprendizaje" complete={learningComplete} text={learningComplete ? 'Resultado y lección registrados' : 'Pendiente de medir resultado real'} />
          </div>

          <div className="mt-5 border border-[var(--n3-line)] bg-[#0c1111] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--n3-text-muted)]">Evidencia preservada</p>
            <p className="mt-2 text-2xl font-semibold text-[var(--n3-text-light)]">{record.evidenceSnapshot.length}</p>
            <p className="mt-1 text-[10px] text-[var(--n3-text-muted)]">elementos vinculados a esta memoria</p>
          </div>
        </aside>

        <div className="bg-[#0c1111] p-5">
          <div className="grid gap-4 lg:grid-cols-2">
            <Field label="Decisión humana">
              <select value={record.decision} onChange={(event) => update('decision', event.target.value as MemoryDecision)} className="control">
                {(Object.keys(decisionLabels) as MemoryDecision[]).map((key) => <option key={key} value={key}>{decisionLabels[key]}</option>)}
              </select>
            </Field>
            <Field label="Responsable humano">
              <input value={record.validator} onChange={(event) => update('validator', event.target.value)} placeholder="Nombre o rol del validador" className="control" />
            </Field>
            <Field label="Fundamento de la decisión" wide>
              <textarea value={record.decisionRationale} onChange={(event) => update('decisionRationale', event.target.value)} placeholder="Explica por qué se tomó esta decisión y qué evidencia fue determinante." className="control min-h-24 resize-y" />
            </Field>
            <Field label="Impacto esperado">
              <input value={record.expectedImpact} onChange={(event) => update('expectedImpact', event.target.value)} className="control" />
            </Field>
            <Field label="Estado del resultado">
              <select value={record.outcomeStatus} onChange={(event) => update('outcomeStatus', event.target.value as OutcomeStatus)} className="control">
                {(Object.keys(outcomeLabels) as OutcomeStatus[]).map((key) => <option key={key} value={key}>{outcomeLabels[key]}</option>)}
              </select>
            </Field>
            <Field label="Resultado real" wide>
              <textarea value={record.actualOutcome} onChange={(event) => update('actualOutcome', event.target.value)} placeholder="Registra métricas, efectos observados y fecha de medición." className="control min-h-24 resize-y" />
            </Field>
            <Field label="Lección aprendida">
              <textarea value={record.lessonLearned} onChange={(event) => update('lessonLearned', event.target.value)} placeholder="Qué funcionó, qué falló y qué debe cambiar." className="control min-h-28 resize-y" />
            </Field>
            <Field label="Patrón reutilizable">
              <textarea value={record.reusablePattern} onChange={(event) => update('reusablePattern', event.target.value)} placeholder="Describe cuándo esta decisión sería útil en un caso futuro similar." className="control min-h-28 resize-y" />
            </Field>
          </div>

          <div className="mt-5 border border-[var(--n3-line)] bg-[#080d0d] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--n3-teal-soft)]">Snapshot de evidencia</p>
            <ul className="mt-3 space-y-2">
              {record.evidenceSnapshot.map((item, index) => <li key={`${index}-${item}`} className="text-xs leading-5 text-[var(--n3-text-muted)]">— {item}</li>)}
            </ul>
          </div>

          <div className="mt-5 flex flex-col gap-3 border-t border-[var(--n3-line)] pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[10px] leading-4 text-[var(--n3-text-muted)]">La memoria no altera automáticamente la recomendación ni ejecuta acciones. Toda reutilización futura debe conservar trazabilidad y revisión humana.</p>
            <button type="button" onClick={saveMemory} className="inline-flex shrink-0 items-center justify-center gap-2 border border-[var(--n3-teal-soft)] px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--n3-text-light)]">
              {saved ? <CheckCircle2 size={14} /> : <Save size={14} />}
              {saved ? 'Memoria guardada' : 'Guardar memoria'}
            </button>
          </div>
        </div>
      </div>
      <style jsx>{`
        .control { width: 100%; border: 1px solid var(--n3-line); background: #080d0d; padding: 0.75rem; font-size: 0.75rem; color: var(--n3-text-light); outline: none; }
        .control:focus { border-color: var(--n3-teal-soft); }
      `}</style>
    </section>
  )
}

function Field({ label, wide = false, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return <label className={`${wide ? 'lg:col-span-2' : ''} text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--n3-text-muted)]`}>{label}<div className="mt-2 normal-case tracking-normal">{children}</div></label>
}

function StatusCard({ label, complete, text }: { label: string; complete: boolean; text: string }) {
  return (
    <div className={`border p-3 ${complete ? 'border-emerald-500/50' : 'border-amber-500/50'}`}>
      <div className="flex items-center gap-2">
        <ShieldCheck size={14} className={complete ? 'text-emerald-300' : 'text-amber-300'} />
        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--n3-text-light)]">{label}</p>
      </div>
      <p className="mt-2 text-[10px] leading-4 text-[var(--n3-text-muted)]">{text}</p>
    </div>
  )
}
