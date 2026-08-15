'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Printer, RefreshCw } from 'lucide-react'

type ValuationCase = {
  id: string
  status: string
  address: string | null
  neighborhood: string | null
  homogeneous_area: string | null
  rol: string | null
  latitude: number | null
  longitude: number | null
  property_type: string | null
  useful_area_m2: number | null
  terrace_area_m2: number | null
  built_area_m2: number | null
  land_area_m2: number | null
  bedrooms: number | null
  bathrooms: number | null
  parking_spaces: number | null
  construction_year: number | null
  floor_number: number | null
  base_value_uf: number | null
  adjustment_total_pct: number | null
  estimated_value_uf: number | null
  low_value_uf: number | null
  high_value_uf: number | null
  confidence: string | null
  methodology_version: string | null
  version_number: number | null
  justification: string | null
  valuation_date: string | null
}

type Comparable = {
  id: string
  rank: number
  source_type: string | null
  source_reference: string | null
  source_observed_at: string | null
  source_methodology_version: string | null
  transaction_date: string | null
  address: string | null
  neighborhood: string | null
  property_type: string | null
  useful_area_m2: number | null
  built_area_m2: number | null
  land_area_m2: number | null
  bedrooms: number | null
  bathrooms: number | null
  parking_spaces: number | null
  price_uf: number | null
  price_uf_m2: number | null
  base_value_uf: number | null
  adjusted_value_uf: number | null
  similarity_score: number | null
  distance_meters: number | null
  selected: boolean
  match_status: string
  adjustment_pct: number | null
  adjustment_notes: string | null
  exclusion_reason: string | null
  evidence: unknown
}

type Decision = {
  id: string
  action: string
  reason: string | null
  created_at: string
  actor_id?: string | null
}

type Payload = {
  valuationCase: ValuationCase
  comparables: Comparable[]
  decisions: Decision[]
  error?: string
}

const number = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 1 })
const integer = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 })
const statusLabels: Record<string, string> = { draft: 'Borrador', review: 'En revisión', approved: 'Aprobada', issued: 'Emitida' }

function available(value: unknown) {
  return value === null || value === undefined || value === '' ? 'No disponible' : String(value)
}

function uf(value: number | null | undefined) {
  return value == null ? 'No disponible' : `UF ${integer.format(value)}`
}

function decimal(value: number | null | undefined, suffix = '') {
  return value == null ? 'No disponible' : `${number.format(value)}${suffix}`
}

function date(value: string | null | undefined) {
  if (!value) return 'No disponible'
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? 'No disponible' : parsed.toLocaleDateString('es-CL')
}

function dateTime(value: string | null | undefined) {
  if (!value) return 'No disponible'
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? 'No disponible' : parsed.toLocaleString('es-CL')
}

function similarity(value: number | null | undefined) {
  if (value == null) return 'No disponible'
  return `${number.format(value <= 1 ? value * 100 : value)}%`
}

function evidenceIdentity(value: unknown) {
  const first = Array.isArray(value) ? value[0] : value
  if (!first || typeof first !== 'object') return null
  const identity = (first as Record<string, unknown>).identityStatus
  return identity ? String(identity) : null
}

function areaSemantics(value: unknown) {
  const first = Array.isArray(value) ? value[0] : value
  if (!first || typeof first !== 'object') return null
  const semantics = (first as Record<string, unknown>).areaSemantics
  return semantics ? String(semantics) : null
}

export function ValuationEvidenceReport({ valuationId }: { valuationId: string }) {
  const [data, setData] = useState<Payload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/valuations/${valuationId}/comparables`, { cache: 'no-store' })
      const payload = (await response.json()) as Payload
      if (!response.ok) throw new Error(payload.error || 'No fue posible cargar el reporte.')
      setData(payload)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No fue posible cargar el reporte.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [valuationId])

  const accepted = useMemo(() => data?.comparables.filter((item) => item.selected && item.match_status === 'accepted') ?? [], [data])
  const rejected = useMemo(() => data?.comparables.filter((item) => item.match_status === 'rejected') ?? [], [data])

  if (loading) return <main role="status" aria-live="polite" className="p-8 text-sm text-[var(--n3-text-muted)]">Preparando reporte imprimible…</main>

  if (error || !data?.valuationCase) {
    return <main className="p-6"><div role="alert" className="border border-red-800 bg-red-950/30 p-5 text-sm text-red-200"><p>{error || 'Valorización no encontrada.'}</p><button type="button" onClick={() => void load()} className="mt-4 inline-flex items-center gap-2 border border-red-700 px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"><RefreshCw size={15} />Reintentar</button></div></main>
  }

  const valuation = data.valuationCase
  const subjectFields: Array<[string, string | number]> = [
    ['Tipo', available(valuation.property_type)],
    ['Barrio', available(valuation.neighborhood)],
    ['Área homogénea', available(valuation.homogeneous_area)],
    ['ROL', available(valuation.rol)],
    ['Latitud', decimal(valuation.latitude)],
    ['Longitud', decimal(valuation.longitude)],
    ['Superficie útil', decimal(valuation.useful_area_m2, ' m²')],
    ['Terraza', decimal(valuation.terrace_area_m2, ' m²')],
    ['Superficie construida', decimal(valuation.built_area_m2, ' m²')],
    ['Terreno', decimal(valuation.land_area_m2, ' m²')],
    ['Dormitorios', available(valuation.bedrooms)],
    ['Baños', available(valuation.bathrooms)],
    ['Estacionamientos', available(valuation.parking_spaces)],
    ['Año de construcción', available(valuation.construction_year)],
    ['Piso', available(valuation.floor_number)],
  ]

  return <main className="mx-auto max-w-6xl bg-white p-4 text-neutral-900 sm:p-8 print:max-w-none print:p-0">
    <nav aria-label="Acciones del reporte" className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
      <Link href={`/dashboard/valuations/${valuationId}`} className="inline-flex min-h-11 items-center gap-2 border border-neutral-300 px-4 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"><ArrowLeft size={16} />Volver al expediente</Link>
      <button type="button" onClick={() => window.print()} className="inline-flex min-h-11 items-center gap-2 bg-neutral-900 px-4 py-2 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"><Printer size={16} />Imprimir o guardar PDF</button>
    </nav>

    <header className="border-b-2 border-neutral-900 pb-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em]">Property Partners · Reporte de valorización</p>
      <div className="mt-3 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><h1 className="text-3xl font-semibold">{valuation.address || 'Propiedad sin dirección'}</h1><p className="mt-1 text-sm text-neutral-600">{valuation.property_type || 'Tipo no informado'} · {valuation.neighborhood || 'Barrio no informado'}</p></div>
        <dl className="text-sm"><div><dt className="inline font-semibold">Estado: </dt><dd className="inline">{statusLabels[valuation.status] || valuation.status}</dd></div><div><dt className="inline font-semibold">Versión: </dt><dd className="inline">{valuation.version_number ?? 'No disponible'}</dd></div><div><dt className="inline font-semibold">Fecha: </dt><dd className="inline">{valuation.valuation_date || 'No disponible'}</dd></div></dl>
      </div>
    </header>

    <section aria-labelledby="resultado" className="mt-7 break-inside-avoid"><h2 id="resultado" className="text-xl font-semibold">1. Resultado</h2><dl className="mt-4 grid gap-px border border-neutral-300 bg-neutral-300 sm:grid-cols-2 lg:grid-cols-4">{[
      ['Valor comercial base', uf(valuation.base_value_uf)],
      ['Ajuste automático', valuation.adjustment_total_pct === 0 ? 'No aplicado' : decimal(valuation.adjustment_total_pct, '%')],
      ['Valor comercial', uf(valuation.estimated_value_uf)],
      ['Referencia persistida', valuation.low_value_uf === valuation.high_value_uf ? uf(valuation.estimated_value_uf) : `${uf(valuation.low_value_uf)} — ${uf(valuation.high_value_uf)}`],
      ['Calidad / confianza', valuation.confidence || 'No disponible'],
      ['Comparables aceptados', String(accepted.length)],
      ['Metodología', valuation.methodology_version || 'No disponible'],
      ['Versión', String(valuation.version_number ?? 'No disponible')],
    ].map(([label, value]) => <div key={label} className="bg-white p-4"><dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{label}</dt><dd className="mt-2 text-lg font-semibold">{value}</dd></div>)}</dl></section>

    <section aria-labelledby="ficha" className="mt-7"><h2 id="ficha" className="text-xl font-semibold">2. Ficha objetiva del inmueble</h2><dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">{subjectFields.map(([label, value]) => <div key={label} className="break-inside-avoid border border-neutral-300 p-3"><dt className="font-semibold">{label}</dt><dd className="mt-1 text-neutral-700">{String(value)}</dd></div>)}</dl></section>

    <section aria-labelledby="comparables" className="mt-7"><h2 id="comparables" className="text-xl font-semibold">3. Comparables y evidencia</h2><p className="mt-2 text-sm text-neutral-600">Cada registro conserva fuente, fecha, distancia, características, metodología y decisión humana. Una publicación no equivale a una venta confirmada y los ajustes cualitativos no reprician automáticamente el caso.</p>
      <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[1180px] border-collapse text-left text-xs"><caption className="sr-only">Comparables utilizados, rechazados y candidatos en la valorización</caption><thead><tr className="border-y-2 border-neutral-900"><th scope="col" className="p-2">#</th><th scope="col" className="p-2">Fuente</th><th scope="col" className="p-2">Propiedad</th><th scope="col" className="p-2">Características</th><th scope="col" className="p-2">Distancia y similitud</th><th scope="col" className="p-2">Precio</th><th scope="col" className="p-2">Decisión</th></tr></thead><tbody>{data.comparables.map((item) => {
        const identity = evidenceIdentity(item.evidence)
        const semantics = areaSemantics(item.evidence)
        const isCbrsDepartment = item.source_type?.toLowerCase() === 'cbrs' && item.property_type?.toLowerCase().startsWith('depart')
        return <tr key={item.id} className="break-inside-avoid border-b border-neutral-300 align-top"><td className="p-2">{item.rank}</td><td className="p-2"><p className="font-semibold">{item.source_type || 'Fuente no informada'}</p><p className="mt-1 break-all text-neutral-600">{item.source_reference || 'Sin referencia'}</p><p className="mt-1">Transacción: {date(item.transaction_date)}</p><p>Observado: {dateTime(item.source_observed_at)}</p><p>Metodología: {item.source_methodology_version || 'No disponible'}</p>{identity ? <p>Identidad: {identity === 'unconfirmed' ? 'operativa no confirmada' : identity}</p> : null}</td><td className="p-2"><p>{item.address || 'Sin dirección'}</p><p className="text-neutral-600">{item.neighborhood || 'Sin barrio'} · {item.property_type || 'Sin tipo'}</p></td><td className="p-2">{isCbrsDepartment ? <p>Superficie registrada CBRS: {decimal(item.built_area_m2, ' m²')}</p> : <><p>Útil: {decimal(item.useful_area_m2, ' m²')}</p><p>Construida: {decimal(item.built_area_m2, ' m²')}</p></>}<p>Terreno: {decimal(item.land_area_m2, ' m²')}</p><p>{available(item.bedrooms)} dorm. · {available(item.bathrooms)} baños · {available(item.parking_spaces)} est.</p>{semantics === 'source_registered_area_not_confirmed_as_useful' ? <p className="mt-1 text-neutral-600">Semántica de superficie CBRS pendiente de auditoría; no se presenta como m² útil.</p> : null}</td><td className="p-2"><p>Distancia: {decimal(item.distance_meters, ' m')}</p><p>Similitud: {similarity(item.similarity_score)}</p></td><td className="p-2"><p>{uf(item.price_uf)}</p><p>{item.price_uf_m2 == null ? 'UF/m² no disponible' : `${number.format(item.price_uf_m2)} UF/m²`}</p><p className="mt-1 text-neutral-600">{item.adjustment_notes || item.exclusion_reason || 'Sin observación'}</p></td><td className="p-2"><p className="font-semibold">{item.selected && item.match_status === 'accepted' ? 'Aceptado' : item.match_status === 'rejected' ? 'Excluido' : 'Candidato'}</p></td></tr>
      })}</tbody></table></div>
      {!data.comparables.length ? <div role="status" className="mt-4 border border-dashed border-neutral-400 p-5 text-sm text-neutral-600">No existen comparables vinculados. El reporte mantiene el estado vacío sin completar evidencia ficticia.</div> : null}
      <p className="mt-3 text-xs text-neutral-600">Resumen: {accepted.length} aceptados · {rejected.length} excluidos · {data.comparables.length - accepted.length - rejected.length} candidatos.</p>
    </section>

    <section aria-labelledby="decisiones" className="mt-7"><h2 id="decisiones" className="text-xl font-semibold">4. Historial de decisiones</h2><ol className="mt-4 space-y-3">{data.decisions.map((item) => <li key={item.id} className="break-inside-avoid border-l-4 border-neutral-900 pl-4"><p className="font-semibold">{item.action.replaceAll('_', ' ')}</p><p className="text-xs text-neutral-600">{dateTime(item.created_at)}</p><p className="mt-1 text-sm">{item.reason || 'Sin observación adicional'}</p></li>)}</ol>{!data.decisions.length ? <div role="status" className="mt-4 border border-dashed border-neutral-400 p-5 text-sm text-neutral-600">No existen decisiones registradas para este expediente.</div> : null}</section>

    <section aria-labelledby="metodologia" className="mt-7 break-inside-avoid border-t border-neutral-400 pt-5"><h2 id="metodologia" className="text-xl font-semibold">5. Metodología y alcance</h2><dl className="mt-3 text-sm"><div><dt className="font-semibold">Versión metodológica</dt><dd>{valuation.methodology_version || 'No disponible'}</dd></div><div className="mt-3"><dt className="font-semibold">Justificación</dt><dd>{valuation.justification || 'No informada'}</dd></div></dl><p className="mt-4 text-xs leading-5 text-neutral-600">Este reporte reproduce los datos persistidos en el expediente. Portal representa oferta observada; CBRS representa ventas registradas. Los valores faltantes permanecen explícitamente como no disponibles y la decisión final de tasa corresponde al valorizador.</p></section>

    <footer className="mt-8 border-t border-neutral-300 pt-3 text-xs text-neutral-500">Expediente {valuation.id} · generado {new Date().toLocaleString('es-CL')}</footer>
  </main>
}
