'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

type ValuationCase = {
  id: string
  property_type?: string | null
  estimated_value_uf?: number | null
  low_value_uf?: number | null
  high_value_uf?: number | null
  built_area_m2?: number | null
  land_area_m2?: number | null
  useful_area_m2?: number | null
  terrace_area_m2?: number | null
  condition_status?: string | null
  condition_score?: number | null
  evidence?: Record<string, unknown> | null
}

type Comparable = {
  address?: string | null
  source_type?: string | null
  selected?: boolean
  match_status?: string | null
  price_uf?: number | null
  price_uf_m2?: number | null
  distance_meters?: number | null
}

type Payload = {
  valuationCase?: ValuationCase
  comparables?: Comparable[]
  error?: string
}

const integer = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 })
const decimal = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 1 })

function numberValue(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function textValue(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function median(values: number[]) {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null
}

function percentile(values: number[], p: number) {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const index = (sorted.length - 1) * p
  const low = Math.floor(index)
  const high = Math.ceil(index)
  if (low === high) return sorted[low]
  return sorted[low] + (sorted[high] - sorted[low]) * (index - low)
}

function pctDelta(value: number | null, base: number | null) {
  return value != null && base != null && base !== 0 ? ((value - base) / base) * 100 : null
}

function pct(value: number | null) {
  return value == null ? '—' : `${value >= 0 ? '+' : ''}${decimal.format(value)}%`
}

function uf(value: number | null) {
  return value == null ? '—' : `UF ${integer.format(value)}`
}

export function ValuationDecisionIntelligence({ valuationId }: { valuationId: string }) {
  const [payload, setPayload] = useState<Payload | null>(null)

  useEffect(() => {
    let cancelled = false
    void fetch(`/api/valuations/${valuationId}/comparables`, { cache: 'no-store' })
      .then(async (response) => {
        const json = await response.json() as Payload
        if (!response.ok) throw new Error(json.error || 'No fue posible cargar inteligencia.')
        if (!cancelled) setPayload(json)
      })
      .catch(() => { if (!cancelled) setPayload(null) })
    return () => { cancelled = true }
  }, [valuationId])

  const metrics = useMemo(() => {
    const valuation = payload?.valuationCase
    if (!valuation) return null

    const accepted = (payload.comparables ?? []).filter((item) => item.selected && item.match_status === 'accepted')
    const rates = accepted.map((item) => numberValue(item.price_uf_m2)).filter((value): value is number => value != null)
    const prices = accepted.map((item) => numberValue(item.price_uf)).filter((value): value is number => value != null)
    const distances = accepted.map((item) => numberValue(item.distance_meters)).filter((value): value is number => value != null)

    const medianUfM2 = median(rates)
    const averageUfM2 = average(rates)
    const minUfM2 = rates.length ? Math.min(...rates) : null
    const maxUfM2 = rates.length ? Math.max(...rates) : null
    const medianPrice = median(prices)
    const medianDistance = median(distances)
    const estimated = numberValue(valuation.estimated_value_uf)

    const effectiveArea = valuation.property_type === 'Casa'
      ? (numberValue(valuation.built_area_m2) != null && numberValue(valuation.land_area_m2) != null
          ? Number(valuation.built_area_m2) + Number(valuation.land_area_m2) / 4
          : null)
      : numberValue(valuation.useful_area_m2) != null
        ? Number(valuation.useful_area_m2) + (numberValue(valuation.terrace_area_m2) ?? 0) / 2
        : null

    const impliedUfM2 = estimated != null && effectiveArea != null && effectiveArea > 0 ? estimated / effectiveArea : null
    const dispersionPct = medianUfM2 != null && minUfM2 != null && maxUfM2 != null && medianUfM2 > 0
      ? ((maxUfM2 - minUfM2) / medianUfM2) * 100
      : null

    const evidenceBand = effectiveArea != null && minUfM2 != null && maxUfM2 != null
      ? { low: minUfM2 * effectiveArea, high: maxUfM2 * effectiveArea }
      : null

    const p20UfM2 = percentile(rates, 0.2)
    const opportunities = accepted.filter((item) => {
      const rate = numberValue(item.price_uf_m2)
      return rate != null && p20UfM2 != null && rate <= p20UfM2
    })

    const evidence = valuation.evidence ?? {}
    const backtestMapePct = numberValue(evidence.backtestMapePct)
    const backtestReliability = textValue(evidence.backtestReliability)
    const dateCoverage = numberValue(evidence.comparableTransactionDateCoveragePct)
    const distanceCoverage = numberValue(evidence.comparableDistanceCoveragePct)
    const holdoutEventKey = textValue(evidence.subjectHoldoutEventKey)
    const holdoutExcluded = evidence.holdoutExcludedFromCalculation === true
    const cbrsCount = accepted.filter((item) => item.source_type === 'CBRS').length
    const offerCount = accepted.filter((item) => item.source_type === 'Portal' || item.source_type === 'TocToc').length
    const contractualRangeDefined = numberValue(valuation.low_value_uf) != null
      && numberValue(valuation.high_value_uf) != null
      && Number(valuation.low_value_uf) !== Number(valuation.high_value_uf)

    return {
      valuation,
      accepted,
      medianUfM2,
      averageUfM2,
      minUfM2,
      maxUfM2,
      medianPrice,
      medianDistance,
      effectiveArea,
      impliedUfM2,
      dispersionPct,
      evidenceBand,
      p20UfM2,
      opportunities,
      backtestMapePct,
      backtestReliability,
      dateCoverage,
      distanceCoverage,
      holdoutEventKey,
      holdoutExcluded,
      cbrsCount,
      offerCount,
      contractualRangeDefined,
      deltaVsMedianUfM2: pctDelta(impliedUfM2, medianUfM2),
      deltaVsMedianPrice: pctDelta(estimated, medianPrice),
      scenarios: estimated == null ? [] : [0, 5, 10].map((margin) => ({
        margin,
        price: estimated / (1 - margin / 100),
      })),
    }
  }, [payload])

  if (!metrics) return null

  return <section className="border border-[var(--n3-line)] bg-[var(--n3-deep)]">
    <div className="border-b border-[var(--n3-line)] p-4">
      <p className="text-xs uppercase tracking-[0.16em] text-[var(--n3-teal)]">INTELIGENCIA PARA DECISIÓN</p>
      <h2 className="mt-1 text-lg font-semibold text-[var(--n3-text-light)]">Qué respalda el valor y qué falta antes de decidir</h2>
      <p className="mt-1 text-sm text-[var(--n3-text-muted)]">Lectura descriptiva sobre evidencia aceptada. No aplica ajustes económicos automáticos.</p>
    </div>

    <div className="grid gap-px bg-[var(--n3-line)] sm:grid-cols-2 lg:grid-cols-4">
      <Metric label="Área comparable sujeto" value={metrics.effectiveArea == null ? '—' : `${decimal.format(metrics.effectiveArea)} m²`} detail={metrics.valuation.property_type === 'Casa' ? 'Construidos + terreno/4' : 'Útil + terraza/2'} />
      <Metric label="UF/m² implícito" value={metrics.impliedUfM2 == null ? '—' : `${decimal.format(metrics.impliedUfM2)} UF/m²`} detail={`vs mediana ${pct(metrics.deltaVsMedianUfM2)}`} />
      <Metric label="Mediana comparables" value={metrics.medianUfM2 == null ? '—' : `${decimal.format(metrics.medianUfM2)} UF/m²`} detail={metrics.averageUfM2 == null ? 'Promedio no disponible' : `Promedio ${decimal.format(metrics.averageUfM2)} UF/m²`} />
      <Metric label="Dispersión muestra" value={metrics.dispersionPct == null ? '—' : `${decimal.format(metrics.dispersionPct)}%`} detail={metrics.minUfM2 == null || metrics.maxUfM2 == null ? 'Rango no disponible' : `${decimal.format(metrics.minUfM2)}–${decimal.format(metrics.maxUfM2)} UF/m²`} />
    </div>

    <div className="grid gap-4 p-4 lg:grid-cols-3">
      <Panel title="Precio vs evidencia">
        <p>Mediana de precios: <strong>{uf(metrics.medianPrice)}</strong></p>
        <p>Valor vs mediana: <strong>{pct(metrics.deltaVsMedianPrice)}</strong></p>
        <p>Distancia mediana: <strong>{metrics.medianDistance == null ? '—' : `${integer.format(metrics.medianDistance)} m`}</strong></p>
      </Panel>
      <Panel title="Cobertura de evidencia">
        <p><strong>{metrics.cbrsCount}</strong> ventas CBRS · <strong>{metrics.offerCount}</strong> ofertas Portal/TocToc.</p>
        <p>{metrics.offerCount === 0 ? 'Sin contraste de oferta activa en la muestra seleccionada.' : 'Existe contraste entre venta registrada y oferta observada.'}</p>
      </Panel>
      <Panel title="Backtest y trazabilidad">
        <p>{metrics.backtestMapePct == null ? 'MAPE no disponible' : `MAPE ${decimal.format(metrics.backtestMapePct)}%`} · confiabilidad {metrics.backtestReliability || 'no informada'}.</p>
        <p>Fechas {metrics.dateCoverage == null ? '—' : `${decimal.format(metrics.dateCoverage)}%`} · distancias {metrics.distanceCoverage == null ? '—' : `${decimal.format(metrics.distanceCoverage)}%`}.</p>
      </Panel>
    </div>

    <div className="grid gap-4 border-t border-[var(--n3-line)] p-4 lg:grid-cols-3">
      <Panel title="Rango / banda">
        {metrics.contractualRangeDefined
          ? <p>Rango contractual persistido: <strong>{uf(numberValue(metrics.valuation.low_value_uf))} — {uf(numberValue(metrics.valuation.high_value_uf))}</strong>.</p>
          : <p><strong>Rango contractual aún no definido.</strong></p>}
        <p>{metrics.evidenceBand ? `Banda observable de comparables: ${uf(metrics.evidenceBand.low)} — ${uf(metrics.evidenceBand.high)}.` : 'Banda de evidencia no evaluable.'}</p>
        <p className="text-xs text-[var(--n3-text-muted)]">La banda observable no reemplaza una regla contractual de rango que Property Partners no ha definido en las fuentes revisadas.</p>
      </Panel>
      <Panel title="Estado del inmueble">
        <p><strong>{metrics.valuation.condition_status ? `${metrics.valuation.condition_status}${metrics.valuation.condition_score != null ? ` · ${decimal.format(Number(metrics.valuation.condition_score))}/5` : ''}` : 'No evaluado'}</strong></p>
        <p>{metrics.valuation.condition_status ? 'Existe evidencia física registrada.' : 'Faltan condición/remodelación y factores subjetivos para una lectura completa.'}</p>
        {!metrics.valuation.condition_status && <Link href={`/dashboard/valuations/${valuationId}/condition`} className="mt-3 inline-flex min-h-10 items-center border border-[var(--n3-teal)] px-3 py-2 text-xs text-[var(--n3-teal)]">Evaluar estado</Link>}
      </Panel>
      <Panel title="Venta histórica del sujeto">
        <p className="break-all">{metrics.holdoutEventKey || 'No disponible'}</p>
        <p>{metrics.holdoutExcluded ? 'Holdout excluido del cálculo: sirve para validación externa.' : 'Estado de exclusión no confirmado.'}</p>
      </Panel>
    </div>

    <div className="grid gap-4 border-t border-[var(--n3-line)] p-4 lg:grid-cols-2">
      <Panel title="Señal de oportunidad · 20% inferior">
        {metrics.opportunities.length
          ? metrics.opportunities.map((item, index) => <p key={index}>{item.address || 'Sin dirección'} · {numberValue(item.price_uf_m2) == null ? '—' : `${decimal.format(Number(item.price_uf_m2))} UF/m²`} · {uf(numberValue(item.price_uf))}</p>)
          : <p>Sin señal disponible.</p>}
        <p className="text-xs text-[var(--n3-text-muted)]">Señal de revisión; no elimina comparables automáticamente.</p>
      </Panel>
      <Panel title="Escenarios de publicación 0 / 5 / 10">
        <div className="grid gap-2 sm:grid-cols-3">
          {metrics.scenarios.map((scenario) => <div key={scenario.margin} className="border border-[var(--n3-line)] p-3">
            <p className="text-xs text-[var(--n3-text-muted)]">{scenario.margin === 5 ? '+5% · estándar PP' : `+${scenario.margin}%`}</p>
            <p className="mt-1 font-semibold">{uf(scenario.price)}</p>
          </div>)}
        </div>
      </Panel>
    </div>
  </section>
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="bg-[var(--n3-deep)] p-4">
    <p className="text-xs uppercase text-[var(--n3-text-muted)]">{label}</p>
    <p className="mt-2 text-xl font-semibold text-[var(--n3-text-light)]">{value}</p>
    <p className="mt-1 text-xs text-[var(--n3-text-muted)]">{detail}</p>
  </div>
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="space-y-2 border border-[var(--n3-line)] p-4 text-sm text-[var(--n3-text-light)]">
    <p className="text-xs uppercase text-[var(--n3-text-muted)]">{title}</p>
    {children}
  </div>
}
