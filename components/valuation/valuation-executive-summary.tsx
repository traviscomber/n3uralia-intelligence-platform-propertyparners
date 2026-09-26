'use client'

import { useEffect, useMemo, useState } from 'react'

type ValuationCase = {
  address?: string | null
  neighborhood?: string | null
  latitude?: number | null
  longitude?: number | null
  estimated_value_uf?: number | null
  low_value_uf?: number | null
  high_value_uf?: number | null
  confidence?: string | null
  evidence?: Record<string, unknown> | null
  condition_status?: string | null
  condition_score?: number | null
  condition_result?: Record<string, unknown> | null
}

type Payload = { valuationCase?: ValuationCase; comparables?: Array<{ selected?: boolean; match_status?: string }>; error?: string }
const integer = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 })
const decimal = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 1 })

function numberValue(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function text(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function confidenceLabel(value: string | null | undefined) {
  if (value === 'high' || value === 'strong') return 'Alta'
  if (value === 'medium' || value === 'moderate') return 'Media'
  if (value === 'low' || value === 'weak') return 'Baja'
  return 'No disponible'
}

function historicalSaleLabel(value: string | null) {
  if (!value) return 'No disponible'
  const date = value.split('|').find((part) => /^\d{4}-\d{2}-\d{2}$/.test(part))
  if (!date) return 'Referencia histórica identificada'
  const parsed = new Date(`${date}T12:00:00Z`)
  return Number.isNaN(parsed.getTime()) ? 'Referencia histórica identificada' : `Venta registrada · ${parsed.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })}`
}

export function ValuationExecutiveSummary({ valuationId }: { valuationId: string }) {
  const [valuation, setValuation] = useState<ValuationCase | null>(null)
  const [acceptedCount, setAcceptedCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const response = await fetch(`/api/valuations/${valuationId}/comparables`, { cache: 'no-store' })
      const payload = await response.json() as Payload
      if (!response.ok || !payload.valuationCase || cancelled) return
      setValuation(payload.valuationCase)
      setAcceptedCount((payload.comparables ?? []).filter((item) => item.selected && item.match_status === 'accepted').length)
    }
    void load()
    return () => { cancelled = true }
  }, [valuationId])

  const summary = useMemo(() => {
    if (!valuation) return null
    const evidence = valuation.evidence ?? {}
    const recommendedValue = numberValue(evidence.recommendedEstimatedValueUf)
    const recommendedRate = numberValue(evidence.recommendedRateUfM2)
    const confirmedValue = numberValue(valuation.estimated_value_uf)
    const deltaPct = recommendedValue && confirmedValue ? ((confirmedValue - recommendedValue) / recommendedValue) * 100 : null
    const strictCount = numberValue(evidence.strictComparableCount)
    const gate = text(evidence.evidenceGate)
    const conditionResult = valuation.condition_result ?? {}
    const transformation = conditionResult.transformation && typeof conditionResult.transformation === 'object'
      ? conditionResult.transformation as Record<string, unknown>
      : null
    const transformationStatus = text(transformation?.status)
    const backtestMapePct = numberValue(evidence.backtestMapePct)
    const backtestReliability = text(evidence.backtestReliability)
    const holdoutEventKey = text(evidence.subjectHoldoutEventKey)
    const holdoutExcluded = evidence.holdoutExcludedFromCalculation === true
    const contractualRangeDefined = valuation.low_value_uf != null && valuation.high_value_uf != null && Number(valuation.low_value_uf) !== Number(valuation.high_value_uf)
    return { evidence, recommendedValue, recommendedRate, confirmedValue, deltaPct, strictCount, gate, transformationStatus, backtestMapePct, backtestReliability, holdoutEventKey, holdoutExcluded, contractualRangeDefined }
  }, [valuation])

  if (!valuation || !summary) return null

  const range = summary.contractualRangeDefined && valuation.low_value_uf != null && valuation.high_value_uf != null
    ? `UF ${integer.format(Number(valuation.low_value_uf))} — ${integer.format(Number(valuation.high_value_uf))}`
    : null

  return (
    <section className="mx-auto max-w-6xl bg-white px-4 pt-6 text-neutral-900 sm:px-8 print:max-w-none print:px-0 print:pt-0">
      <div className="break-inside-avoid border-2 border-neutral-900 p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-4 border-b border-neutral-300 pb-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">Resumen ejecutivo</p>
            <h2 className="mt-2 text-2xl font-semibold">{valuation.address || 'Valorización Property Partners'}</h2>
            <p className="mt-1 text-sm text-neutral-600">{valuation.neighborhood || 'Barrio no informado'}</p>
          </div>
          <div className="text-sm"><span className="font-semibold">Confianza: </span>{confidenceLabel(valuation.confidence)}</div>
        </div>

        <dl className="mt-5 grid gap-px bg-neutral-300 sm:grid-cols-3">
          <div className="bg-white p-4">
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">Valor Property Partners</dt>
            <dd className="mt-2 text-2xl font-semibold">{summary.confirmedValue ? `UF ${integer.format(summary.confirmedValue)}` : 'No disponible'}</dd>
          </div>
          <div className="bg-white p-4">
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">Evidencia utilizada</dt>
            <dd className="mt-2 text-2xl font-semibold">{acceptedCount} comparables</dd>
            <p className="mt-1 text-xs text-neutral-500">Ventas y referencias seleccionadas</p>
          </div>
          <div className="bg-white p-4">
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">Estado del inmueble</dt>
            <dd className="mt-2 text-lg font-semibold">{valuation.condition_status ? `${valuation.condition_status}${valuation.condition_score != null ? ` · ${decimal.format(Number(valuation.condition_score))}/5` : ''}` : 'Pendiente de evaluar'}</dd>
          </div>
        </dl>

        {range ? <p className="mt-4 text-sm text-neutral-600"><span className="font-semibold">Rango adicional definido:</span> {range}</p> : null}
        <p className="mt-4 text-xs leading-5 text-neutral-500">El detalle metodológico, comparables y trazabilidad permanecen disponibles en las secciones siguientes del reporte.</p>
      </div>
    </section>
  )}
