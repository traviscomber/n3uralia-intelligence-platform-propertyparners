'use client'

import type { PropertyConditionAssessment, TransformationStatus, EvidenceKind } from '@/lib/valuation-condition'

type Props = {
  value: PropertyConditionAssessment
  onChange: (value: PropertyConditionAssessment) => void
  readOnly?: boolean
}

const statusLabels: Record<TransformationStatus, string> = {
  unknown: 'Sin revisar',
  no_evidence: 'Sin evidencia de transformación',
  weak_evidence: 'Evidencia débil / revisar',
  verified: 'Transformación verificada',
}

const evidenceKinds: Array<{ value: EvidenceKind; label: string }> = [
  { value: 'dom_permit', label: 'Permiso DOM' },
  { value: 'final_reception', label: 'Recepción final' },
  { value: 'sii_record', label: 'Registro SII' },
  { value: 'listing', label: 'Publicación identificada' },
  { value: 'technical_report', label: 'Informe técnico' },
  { value: 'document', label: 'Documento' },
]

export function PropertyTransformationEvidence({ value, onChange, readOnly = false }: Props) {
  const transformation = value.transformation ?? {
    status: 'unknown' as const,
    effectiveDate: null,
    builtAreaOverrideM2: null,
    constructionYearOverride: null,
    summary: '',
    sources: [],
  }
  const first = transformation.sources[0]

  function update(patch: Partial<typeof transformation>) {
    onChange({ ...value, transformation: { ...transformation, ...patch } })
  }

  function updateSource(patch: { kind?: EvidenceKind; reference?: string; observedAt?: string | null }) {
    const next = {
      kind: patch.kind ?? first?.kind ?? 'dom_permit',
      reference: patch.reference ?? first?.reference ?? '',
      observedAt: patch.observedAt ?? first?.observedAt ?? null,
      note: first?.note ?? null,
    }
    update({ sources: next.reference.trim() ? [next] : [] })
  }

  return (
    <section className="border border-[var(--n3-line)] bg-[#0c1111] p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">Property Quality / Transformation</div>
          <h2 className="mt-1 text-base font-semibold">Cambio físico posterior al catastro</h2>
          <p className="mt-2 max-w-3xl text-xs leading-5 text-[var(--n3-text-muted)]">Registra ampliaciones, reconstrucciones o remodelaciones mayores sólo con evidencia trazable. Esta ficha no modifica automáticamente el valor; alimenta el ML shadow y la revisión profesional.</p>
        </div>
        <div className="border border-[var(--n3-line)] px-3 py-2 text-xs">{statusLabels[transformation.status]}</div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-4">
        <label className="block">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Estado</span>
          <select disabled={readOnly} value={transformation.status} onChange={(event) => update({ status: event.target.value as TransformationStatus })} className="mt-2 w-full border border-[var(--n3-line)] bg-[#080d0d] px-3 py-3 text-sm disabled:opacity-60">
            <option value="unknown">Sin revisar</option>
            <option value="no_evidence">Sin evidencia</option>
            <option value="weak_evidence">Evidencia débil</option>
            <option value="verified">Verificada</option>
          </select>
        </label>
        <label className="block">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Fecha efectiva</span>
          <input disabled={readOnly} type="date" value={transformation.effectiveDate ?? ''} onChange={(event) => update({ effectiveDate: event.target.value || null })} className="mt-2 w-full border border-[var(--n3-line)] bg-[#080d0d] px-3 py-3 text-sm disabled:opacity-60" />
        </label>
        <label className="block">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Construido vigente</span>
          <input disabled={readOnly} type="number" min="1" value={transformation.builtAreaOverrideM2 ?? ''} onChange={(event) => update({ builtAreaOverrideM2: event.target.value ? Number(event.target.value) : null })} placeholder="m²" className="mt-2 w-full border border-[var(--n3-line)] bg-[#080d0d] px-3 py-3 text-sm disabled:opacity-60" />
        </label>
        <label className="block">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Año efectivo</span>
          <input disabled={readOnly} type="number" min="1900" max="2100" value={transformation.constructionYearOverride ?? ''} onChange={(event) => update({ constructionYearOverride: event.target.value ? Number(event.target.value) : null })} className="mt-2 w-full border border-[var(--n3-line)] bg-[#080d0d] px-3 py-3 text-sm disabled:opacity-60" />
        </label>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[0.7fr_1.5fr_0.8fr]">
        <label className="block">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Tipo de evidencia</span>
          <select disabled={readOnly} value={first?.kind ?? 'dom_permit'} onChange={(event) => updateSource({ kind: event.target.value as EvidenceKind })} className="mt-2 w-full border border-[var(--n3-line)] bg-[#080d0d] px-3 py-3 text-sm disabled:opacity-60">
            {evidenceKinds.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Referencia verificable</span>
          <input disabled={readOnly} value={first?.reference ?? ''} onChange={(event) => updateSource({ reference: event.target.value })} placeholder="URL, permiso, recepción o identificador documental" className="mt-2 w-full border border-[var(--n3-line)] bg-[#080d0d] px-3 py-3 text-sm disabled:opacity-60" />
        </label>
        <label className="block">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Observado</span>
          <input disabled={readOnly} type="date" value={first?.observedAt?.slice(0, 10) ?? ''} onChange={(event) => updateSource({ observedAt: event.target.value || null })} className="mt-2 w-full border border-[var(--n3-line)] bg-[#080d0d] px-3 py-3 text-sm disabled:opacity-60" />
        </label>
      </div>

      <label className="mt-4 block">
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Conclusión</span>
        <textarea disabled={readOnly} value={transformation.summary ?? ''} onChange={(event) => update({ summary: event.target.value })} placeholder="Qué cambió físicamente y por qué la evidencia permite considerarlo vigente." className="mt-2 min-h-20 w-full border border-[var(--n3-line)] bg-[#080d0d] px-3 py-3 text-sm disabled:opacity-60" />
      </label>

      {transformation.status === 'verified' && !transformation.sources.length ? <p className="mt-3 text-xs text-[#d7a12b]">Una transformación no puede quedar verificada sin una referencia de evidencia.</p> : null}
    </section>
  )
}
