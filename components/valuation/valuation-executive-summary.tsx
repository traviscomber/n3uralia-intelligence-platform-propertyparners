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
type PrcZone = { zona?: string; subzona?: string | null; usoSuelo?: string | null }
type Reliability = {
  barrio?: string
  isGlobalFallback?: boolean
  evaluationYear?: number
  sampleCount?: number
  mapePct?: number
  medianAbsErrorPct?: number
  p80AbsErrorPct?: number
  p90AbsErrorPct?: number
  within15Pct?: number
  within20Pct?: number
  reliability?: string
  reviewMode?: string
}

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
  if (value === 'high') return 'Alta'
  if (value === 'medium') return 'Media'
  if (value === 'low') return 'Baja'
  return 'No disponible'
}

function reviewLabel(value: string | null | undefined) {
  if (value === 'standard_review') return 'Revisión estándar'
  if (value === 'reinforced_review') return 'Revisión reforzada'
  if (value === 'mandatory_professional_review') return 'Revisión profesional obligatoria'
  return 'Revisión según expediente'
}

export function ValuationExecutiveSummary({ valuationId }: { valuationId: string }) {
  const [valuation, setValuation] = useState<ValuationCase | null>(null)
  const [acceptedCount, setAcceptedCount] = useState(0)
  const [prcZones, setPrcZones] = useState<PrcZone[]>([])
  const [reliability, setReliability] = useState<Reliability | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const response = await fetch(`/api/valuations/${valuationId}/comparables`, { cache: 'no-store' })
      const payload = await response.json() as Payload
      if (!response.ok || !payload.valuationCase || cancelled) return
      setValuation(payload.valuationCase)
      setAcceptedCount((payload.comparables ?? []).filter((item) => item.selected && item.match_status === 'accepted').length)

      const barrio = payload.valuationCase.neighborhood?.trim()
      if (barrio) {
        const reliabilityResponse = await fetch(`/api/valuation/reliability?barrio=${encodeURIComponent(barrio)}`, { cache: 'no-store' })
        const reliabilityPayload = await reliabilityResponse.json().catch(() => null) as { reliability?: Reliability | null } | null
        if (!cancelled && reliabilityResponse.ok) setReliability(reliabilityPayload?.reliability ?? null)
      }

      const lat = numberValue(payload.valuationCase.latitude)
      const lon = numberValue(payload.valuationCase.longitude)
      if (lat != null && lon != null) {
        const prcResponse = await fetch(`/api/market/prc/lookup?lat=${lat}&lon=${lon}`, { cache: 'no-store' })
        const prcPayload = await prcResponse.json().catch(() => null) as { zones?: PrcZone[] } | null
        if (!cancelled && prcResponse.ok) setPrcZones(prcPayload?.zones ?? [])
      }
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
    const p80 = numberValue(reliability?.p80AbsErrorPct)
    const statisticalRange = recommendedValue && p80 != null && p80 > 0 && p80 < 100
      ? {
          low: recommendedValue / (1 + p80 / 100),
          high: recommendedValue / (1 - p80 / 100),
          errorPct: p80,
        }
      : null
    return { evidence, recommendedValue, recommendedRate, confirmedValue, deltaPct, strictCount, gate, transformationStatus, statisticalRange }
  }, [valuation, reliability])

  if (!valuation || !summary) return null

  const contractualRange = valuation.low_value_uf != null && valuation.high_value_uf != null
    ? `UF ${integer.format(Number(valuation.low_value_uf))} — ${integer.format(Number(valuation.high_value_uf))}`
    : 'No disponible'
  const statisticalRange = summary.statisticalRange
    ? `UF ${integer.format(summary.statisticalRange.low)} — ${integer.format(summary.statisticalRange.high)}`
    : contractualRange
  const prcLabel = prcZones.length ? prcZones.map((zone) => [zone.zona, zone.subzona].filter(Boolean).join(' · ')).join(' / ') : 'Pendiente de capa PRC'
  const reliabilityLabel = reliability?.reliability ? confidenceLabel(reliability.reliability) : confidenceLabel(valuation.confidence)

  return (
    <section className="mx-auto max-w-6xl bg-white px-4 pt-6 text-neutral-900 sm:px-8 print:max-w-none print:px-0 print:pt-0">
      <div className="break-inside-avoid border-2 border-neutral-900 p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-4 border-b border-neutral-300 pb-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">Resumen ejecutivo · decisión en 20 segundos</p>
            <h2 className="mt-2 text-2xl font-semibold">{valuation.address || 'Valorización Property Partners'}</h2>
            <p className="mt-1 text-sm text-neutral-600">{valuation.neighborhood || 'Barrio no informado'} · PRC {prcLabel}</p>
          </div>
          <div className="text-sm"><span className="font-semibold">Confiabilidad histórica champion: </span>{reliabilityLabel}</div>
        </div>

        <dl className="mt-5 grid gap-px bg-neutral-300 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-white p-4"><dt className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">Modelo champion</dt><dd className="mt-2 text-xl font-semibold">{summary.recommendedValue ? `UF ${integer.format(summary.recommendedValue)}` : 'No disponible'}</dd>{summary.recommendedRate ? <p className="mt-1 text-xs text-neutral-500">{decimal.format(summary.recommendedRate)} UF/m² ponderado</p> : null}</div>
          <div className="bg-white p-4"><dt className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">Confirmado PP</dt><dd className="mt-2 text-xl font-semibold">{summary.confirmedValue ? `UF ${integer.format(summary.confirmedValue)}` : 'No disponible'}</dd>{summary.deltaPct != null ? <p className="mt-1 text-xs text-neutral-500">{summary.deltaPct >= 0 ? '+' : ''}{decimal.format(summary.deltaPct)}% vs champion</p> : null}</div>
          <div className="bg-white p-4"><dt className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">Rango estadístico P80</dt><dd className="mt-2 text-base font-semibold">{statisticalRange}</dd>{summary.statisticalRange ? <p className="mt-1 text-xs text-neutral-500">Error histórico P80 ±{decimal.format(summary.statisticalRange.errorPct)}% · no reemplaza el rango profesional</p> : <p className="mt-1 text-xs text-neutral-500">Sin muestra v5 suficiente; se muestra rango persistido</p>}</div>
          <div className="bg-white p-4"><dt className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">Evidencia</dt><dd className="mt-2 text-xl font-semibold">{acceptedCount} comparables</dd><p className="mt-1 text-xs text-neutral-500">{summary.strictCount != null ? `${summary.strictCount} físicamente compatibles` : 'Compatibilidad no disponible'}</p></div>
        </dl>

        <div className="mt-5 grid gap-4 text-sm lg:grid-cols-3">
          <div className="border border-neutral-300 p-4"><div className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">Selección y confiabilidad</div><p className="mt-2 font-semibold">Barrio PP + compatibilidad física</p><p className="mt-1 text-xs leading-5 text-neutral-600">Gate: {summary.gate || 'metodología histórica / no disponible'}.</p>{reliability ? <p className="mt-1 text-xs leading-5 text-neutral-600">{reviewLabel(reliability.reviewMode)} · n={reliability.sampleCount ?? '—'} · MAPE {reliability.mapePct != null ? `${decimal.format(Number(reliability.mapePct))}%` : '—'} · ±15%: {reliability.within15Pct != null ? `${decimal.format(Number(reliability.within15Pct))}%` : '—'}.</p> : null}</div>
          <div className="border border-neutral-300 p-4"><div className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">Condición física</div><p className="mt-2 font-semibold">{valuation.condition_status ? `${valuation.condition_status}${valuation.condition_score != null ? ` · ${decimal.format(Number(valuation.condition_score))}/5` : ''}` : 'No evaluada'}</p><p className="mt-1 text-xs leading-5 text-neutral-600">Transformación: {summary.transformationStatus === 'verified' ? 'verificada' : summary.transformationStatus === 'weak_evidence' ? 'requiere revisión' : 'sin evidencia verificada'}.</p></div>
          <div className="border border-neutral-300 p-4"><div className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">Normativa PRC</div><p className="mt-2 font-semibold">{prcLabel}</p><p className="mt-1 text-xs leading-5 text-neutral-600">La zonificación es evidencia contextual; la información oficial predial corresponde a certificados DOM.</p></div>
        </div>
      </div>
    </section>
  )
}
