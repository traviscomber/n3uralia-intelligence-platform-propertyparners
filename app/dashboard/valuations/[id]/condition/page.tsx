'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import {
  PropertyConditionAssessmentForm,
  createEmptyConditionAssessment,
} from '@/components/valuation/property-condition-assessment'
import type { PropertyConditionAssessment } from '@/lib/valuation-condition'

export default function ValuationConditionPage() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const [assessment, setAssessment] = useState<PropertyConditionAssessment>(createEmptyConditionAssessment())
  const [canEdit, setCanEdit] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const response = await fetch(`/api/valuations/${id}/condition`, { cache: 'no-store' })
        const payload = await response.json()
        if (!response.ok) throw new Error(payload.error || 'No fue posible cargar la inspección')
        if (!cancelled) {
          const stored = payload.assessment
          setAssessment(stored && Object.keys(stored).length ? stored : createEmptyConditionAssessment())
          setCanEdit(Boolean(payload.canEdit))
        }
      } catch (error) {
        if (!cancelled) setMessage(error instanceof Error ? error.message : 'No fue posible cargar la inspección')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [id])

  async function save() {
    setSaving(true)
    setMessage(null)
    try {
      const response = await fetch(`/api/valuations/${id}/condition`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assessment: { ...assessment, inspectedAt: new Date().toISOString() },
          reason: 'Ficha de inspección actualizada desde el expediente de valorización',
        }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'No fue posible guardar la inspección')
      setAssessment(payload.assessment)
      setMessage(`Inspección guardada · versión ${payload.versionNumber}`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No fue posible guardar la inspección')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <main className="p-8 text-sm text-[var(--n3-text-muted)]">Cargando ficha de inspección…</main>

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-6 md:p-8">
      <header className="border-b border-[var(--n3-line)] pb-5">
        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Módulo II · Valorización</div>
        <h1 className="mt-2 text-2xl font-semibold">Estado material de la propiedad</h1>
        <p className="mt-2 max-w-3xl text-sm text-[var(--n3-text-muted)]">
          Evaluación ponderada, versionada y respaldada por evidencia. El resultado clasifica la condición física; no aplica automáticamente un ajuste económico.
        </p>
      </header>

      <PropertyConditionAssessmentForm value={assessment} onChange={setAssessment} readOnly={!canEdit} />

      <div className="flex items-center justify-between gap-4 border-t border-[var(--n3-line)] pt-5">
        <a href={`/dashboard/valuations/${id}`} className="text-sm text-[var(--n3-text-muted)] hover:text-white">Volver al expediente</a>
        {canEdit ? (
          <button
            type="button"
            disabled={saving}
            onClick={save}
            className="border border-[#d7332b] px-5 py-3 text-sm font-semibold disabled:opacity-50"
          >
            {saving ? 'Guardando…' : 'Guardar inspección'}
          </button>
        ) : null}
      </div>

      {message ? <div className="border border-[var(--n3-line)] bg-[#0c1111] px-4 py-3 text-sm">{message}</div> : null}
    </main>
  )
}
