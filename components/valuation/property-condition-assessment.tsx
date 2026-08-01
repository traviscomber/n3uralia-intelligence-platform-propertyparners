'use client'

import { useMemo } from 'react'
import {
  CONDITION_CRITERIA,
  VALUATION_CONDITION_VERSION,
  evaluatePropertyCondition,
  type ConditionCriterionCode,
  type ConditionLevel,
  type PropertyConditionAssessment,
} from '@/lib/valuation-condition'

const STATUS_LABELS = {
  critical: 'Crítico',
  deficient: 'Deficiente',
  regular: 'Regular',
  good: 'Bueno',
  excellent: 'Excelente',
  not_evaluable: 'No evaluable',
} as const

export function createEmptyConditionAssessment(): PropertyConditionAssessment {
  return {
    version: VALUATION_CONDITION_VERSION,
    inspectedAt: new Date().toISOString(),
    criteria: CONDITION_CRITERIA.map((criterion) => ({
      code: criterion.code,
      score: null,
      note: '',
      evidence: [],
      criticalIssue: false,
    })),
    generalNote: '',
  }
}

type Props = {
  value: PropertyConditionAssessment
  onChange: (value: PropertyConditionAssessment) => void
  readOnly?: boolean
}

export function PropertyConditionAssessmentForm({ value, onChange, readOnly = false }: Props) {
  const result = useMemo(() => evaluatePropertyCondition(value), [value])

  function updateCriterion(code: ConditionCriterionCode, patch: Record<string, unknown>) {
    onChange({
      ...value,
      inspectedAt: value.inspectedAt || new Date().toISOString(),
      criteria: value.criteria.map((criterion) => criterion.code === code ? { ...criterion, ...patch } : criterion),
    })
  }

  return (
    <section className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <div className="border border-[var(--n3-line)] bg-[#0c1111] p-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">Estado</div>
          <div className="mt-2 text-xl font-semibold">{STATUS_LABELS[result.status]}</div>
        </div>
        <div className="border border-[var(--n3-line)] bg-[#0c1111] p-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">Puntaje</div>
          <div className="mt-2 text-xl font-semibold">{result.score ?? '—'} / 5</div>
        </div>
        <div className="border border-[var(--n3-line)] bg-[#0c1111] p-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">Cobertura</div>
          <div className="mt-2 text-xl font-semibold">{result.coveragePct}%</div>
        </div>
        <div className="border border-[var(--n3-line)] bg-[#0c1111] p-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">Evidencia</div>
          <div className="mt-2 text-xl font-semibold">{result.evidenceCoveragePct}%</div>
        </div>
      </div>

      <div className="border border-[var(--n3-line)] bg-[#080d0d] px-4 py-3 text-xs text-[var(--n3-text-muted)]">
        La clasificación física no modifica automáticamente la valorización. Cualquier impacto económico debe documentarse por separado y aprobarse dentro del flujo.
      </div>

      <div className="space-y-3">
        {CONDITION_CRITERIA.map((definition) => {
          const criterion = value.criteria.find((item) => item.code === definition.code) ?? {
            code: definition.code,
            score: null,
            note: '',
            evidence: [],
            criticalIssue: false,
          }
          const evidenceReference = criterion.evidence[0]?.reference ?? ''
          return (
            <div key={definition.code} className="border border-[var(--n3-line)] bg-[#0c1111] p-4">
              <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr_1fr]">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold">{definition.label}</h3>
                    <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">{definition.weight}%</span>
                    {definition.critical ? <span className="border border-[#d7332b] px-2 py-0.5 text-[9px] uppercase tracking-[0.12em]">Crítico</span> : null}
                  </div>
                  <p className="mt-1 text-xs text-[var(--n3-text-muted)]">{definition.description}</p>
                  <textarea
                    disabled={readOnly}
                    value={criterion.note ?? ''}
                    onChange={(event) => updateCriterion(definition.code, { note: event.target.value })}
                    placeholder="Hallazgo de inspección y justificación del nivel"
                    className="mt-3 min-h-20 w-full border border-[var(--n3-line)] bg-[#080d0d] px-3 py-2 text-xs outline-none focus:border-[#d7332b] disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">Nivel observado</label>
                  <select
                    disabled={readOnly}
                    value={criterion.score ?? ''}
                    onChange={(event) => updateCriterion(definition.code, { score: event.target.value ? Number(event.target.value) as ConditionLevel : null })}
                    className="mt-2 w-full border border-[var(--n3-line)] bg-[#080d0d] px-3 py-3 text-sm disabled:opacity-60"
                  >
                    <option value="">No evaluado</option>
                    <option value="1">1 · Crítico</option>
                    <option value="2">2 · Deficiente</option>
                    <option value="3">3 · Regular</option>
                    <option value="4">4 · Bueno</option>
                    <option value="5">5 · Excelente</option>
                  </select>
                  <label className="mt-4 flex items-center gap-2 text-xs">
                    <input
                      disabled={readOnly}
                      type="checkbox"
                      checked={Boolean(criterion.criticalIssue)}
                      onChange={(event) => updateCriterion(definition.code, { criticalIssue: event.target.checked })}
                    />
                    Hallazgo crítico o riesgo de seguridad
                  </label>
                </div>

                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">Referencia de evidencia</label>
                  <input
                    disabled={readOnly}
                    value={evidenceReference}
                    onChange={(event) => updateCriterion(definition.code, {
                      evidence: event.target.value.trim()
                        ? [{ kind: 'inspection_note', reference: event.target.value.trim() }]
                        : [],
                    })}
                    placeholder="Foto, documento, informe o nota de inspección"
                    className="mt-2 w-full border border-[var(--n3-line)] bg-[#080d0d] px-3 py-3 text-xs outline-none focus:border-[#d7332b] disabled:opacity-60"
                  />
                  {!criterion.evidence.length && criterion.score !== null
                    ? <p className="mt-2 text-xs text-[#d7a12b]">El puntaje carece de evidencia referenciada.</p>
                    : null}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <label className="block">
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">Conclusión general de inspección</span>
        <textarea
          disabled={readOnly}
          value={value.generalNote ?? ''}
          onChange={(event) => onChange({ ...value, generalNote: event.target.value })}
          className="mt-2 min-h-24 w-full border border-[var(--n3-line)] bg-[#080d0d] px-3 py-3 text-sm outline-none focus:border-[#d7332b] disabled:opacity-60"
        />
      </label>

      {result.blockers.length ? (
        <div className="border border-[#d7332b] bg-[#160b0b] p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.12em]">Bloqueos</div>
          <ul className="mt-2 space-y-1 text-xs text-[var(--n3-text-muted)]">
            {result.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}
          </ul>
        </div>
      ) : null}
    </section>
  )
}
