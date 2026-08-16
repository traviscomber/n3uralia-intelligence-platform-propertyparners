'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Sparkles } from 'lucide-react'

type UnitOption = {
  unit: string
  address: string
  rol?: string
  registeredAreaM2?: number
  bedrooms?: number
  bathrooms?: number
  lastTransactionDate: string
}

type ResolvedLookup = {
  status: 'resolved'
  subject: {
    propertyType: 'Casa' | 'Departamento'
    address: string
    neighborhood: string
    rol: string
    latitude?: number
    longitude?: number
    usefulAreaM2?: number
    builtAreaM2?: number
    landAreaM2?: number
    bedrooms?: number
    bathrooms?: number
    parkingSpaces?: number
    constructionYear?: number
  }
  unit?: string
  registeredAreaM2?: number
  areaSemantics?: 'cbrs_registered_area_not_confirmed_as_useful' | 'operational_useful_area'
  sourceEventKey: string
  sourceTransactionDate: string
  sourcePriceUf?: number
  history: Array<{ eventKey: string; transactionDate: string; priceUf?: number }>
  provenance: Record<string, 'CBRS' | 'Identidad canónica'>
}

type LookupResponse =
  | ResolvedLookup
  | { status: 'units'; buildingAddress: string; units: UnitOption[] }
  | { status: 'not_found'; message: string }

function formatNumber(value: number | undefined, suffix = '') {
  return value === undefined ? '—' : `${value.toLocaleString('es-CL')}${suffix}`
}

export function QuickSubjectLookup() {
  const router = useRouter()
  const [address, setAddress] = useState('')
  const [unit, setUnit] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<LookupResponse | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [confirmRegisteredArea, setConfirmRegisteredArea] = useState(false)

  async function lookup(overrideUnit?: string) {
    if (!address.trim()) {
      setMessage('Ingresa calle y número.')
      return
    }
    setLoading(true)
    setMessage(null)
    setConfirmRegisteredArea(false)
    try {
      const response = await fetch('/api/valuation/subject/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: address.trim(), unit: overrideUnit ?? (unit.trim() || undefined) }),
      })
      const payload = await response.json() as LookupResponse & { error?: string }
      if (!response.ok && payload.status !== 'not_found') throw new Error(payload.error || 'No fue posible buscar la propiedad.')
      setResult(payload)
      if (payload.status === 'not_found') setMessage(payload.message)
      if (payload.status === 'resolved' && payload.unit) setUnit(payload.unit)
    } catch (error) {
      setResult(null)
      setMessage(error instanceof Error ? error.message : 'No fue posible buscar la propiedad.')
    } finally {
      setLoading(false)
    }
  }

  function useResolvedSubject(autoAnalyze: boolean) {
    if (!result || result.status !== 'resolved') return
    const params = new URLSearchParams()
    params.set('quickLookup', '1')
    if (autoAnalyze) params.set('autoAnalyze', '1')
    params.set('propertyType', result.subject.propertyType)
    params.set('address', result.subject.address)
    params.set('neighborhood', result.subject.neighborhood)
    if (result.subject.rol) params.set('rol', result.subject.rol)
    if (result.subject.latitude !== undefined) params.set('latitude', String(result.subject.latitude))
    if (result.subject.longitude !== undefined) params.set('longitude', String(result.subject.longitude))
    if (result.subject.bedrooms !== undefined) params.set('bedrooms', String(result.subject.bedrooms))
    if (result.subject.bathrooms !== undefined) params.set('bathrooms', String(result.subject.bathrooms))
    if (result.subject.parkingSpaces !== undefined) params.set('parkingSpaces', String(result.subject.parkingSpaces))
    if (result.subject.constructionYear !== undefined) params.set('constructionYear', String(result.subject.constructionYear))
    if (result.subject.usefulAreaM2 !== undefined) params.set('usefulAreaM2', String(result.subject.usefulAreaM2))
    else if (result.subject.propertyType === 'Departamento' && confirmRegisteredArea && result.registeredAreaM2 !== undefined) {
      params.set('usefulAreaM2', String(result.registeredAreaM2))
      params.set('areaConfirmedByValuer', '1')
    }
    if (result.subject.builtAreaM2 !== undefined) params.set('builtAreaM2', String(result.subject.builtAreaM2))
    if (result.subject.landAreaM2 !== undefined) params.set('landAreaM2', String(result.subject.landAreaM2))
    params.set('eventKey', result.sourceEventKey)
    router.replace(`/dashboard/valuation?${params.toString()}`)
  }

  const resolved = result?.status === 'resolved' ? result : null
  const needsAreaConfirmation = Boolean(
    resolved?.subject.propertyType === 'Departamento' &&
    resolved.subject.usefulAreaM2 === undefined &&
    resolved.registeredAreaM2 !== undefined,
  )

  return <section className="border border-[var(--n3-line)] bg-[#0c1111]">
    <div className="border-b border-[var(--n3-line)] p-5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#d7332b]">Búsqueda rápida</p>
      <h2 className="mt-1 text-lg font-semibold">Encontrar propiedad por dirección</h2>
      <p className="mt-1 text-xs text-[var(--n3-text-muted)]">Carga automáticamente los antecedentes canónicos disponibles. Para departamentos puedes indicar la unidad o elegirla después.</p>
    </div>
    <div className="grid gap-3 p-5 md:grid-cols-[1fr_180px_auto]">
      <label className="block"><span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">Dirección</span><input value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Las Nieves 3850" className="w-full border border-[var(--n3-line)] bg-[#080d0d] px-3 py-3 text-sm outline-none focus:border-[#d7332b]" /></label>
      <label className="block"><span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">Depto. opcional</span><input value={unit} onChange={(event) => setUnit(event.target.value)} placeholder="101" className="w-full border border-[var(--n3-line)] bg-[#080d0d] px-3 py-3 text-sm outline-none focus:border-[#d7332b]" /></label>
      <button type="button" disabled={loading} onClick={() => void lookup()} className="mt-[22px] inline-flex min-h-11 items-center justify-center gap-2 bg-[#d7332b] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"><Search size={15} />{loading ? 'Buscando…' : 'Buscar propiedad'}</button>
    </div>

    {result?.status === 'units' ? <div className="border-t border-[var(--n3-line)] p-5">
      <p className="text-sm font-semibold">Unidades encontradas en {result.buildingAddress}</p>
      <div className="mt-3 flex flex-wrap gap-2">{result.units.map((item) => <button key={item.unit} type="button" onClick={() => { setUnit(item.unit); void lookup(item.unit) }} className="border border-[var(--n3-line)] px-3 py-2 text-xs hover:border-[#d7332b]">Depto {item.unit}{item.registeredAreaM2 ? ` · ${item.registeredAreaM2} m²` : ''}{item.bedrooms !== undefined ? ` · ${item.bedrooms}D/${item.bathrooms ?? '—'}B` : ''}</button>)}</div>
    </div> : null}

    {resolved ? <div className="border-t border-[var(--n3-line)] p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#7eb5ad]">Propiedad encontrada</p><h3 className="mt-1 text-base font-semibold">{resolved.subject.address}</h3><p className="mt-1 text-xs text-[var(--n3-text-muted)]">{resolved.subject.neighborhood} · ROL {resolved.subject.rol || 'no disponible'} · fuente sujeto CBRS</p></div>
        <div className="text-right text-xs text-[var(--n3-text-muted)]"><div>Última venta registrada</div><strong className="mt-1 block text-sm text-[var(--n3-text-light)]">{formatNumber(resolved.sourcePriceUf, ' UF')}</strong><div>{resolved.sourceTransactionDate}</div></div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <div className="border border-[var(--n3-line)] p-3"><span className="text-[10px] uppercase text-[var(--n3-text-muted)]">Superficie</span><strong className="mt-1 block text-sm">{resolved.subject.usefulAreaM2 !== undefined ? `${resolved.subject.usefulAreaM2} m² útiles` : resolved.registeredAreaM2 !== undefined ? `${resolved.registeredAreaM2} m² registrados` : '—'}</strong></div>
        <div className="border border-[var(--n3-line)] p-3"><span className="text-[10px] uppercase text-[var(--n3-text-muted)]">Dormitorios</span><strong className="mt-1 block text-sm">{formatNumber(resolved.subject.bedrooms)}</strong></div>
        <div className="border border-[var(--n3-line)] p-3"><span className="text-[10px] uppercase text-[var(--n3-text-muted)]">Baños</span><strong className="mt-1 block text-sm">{formatNumber(resolved.subject.bathrooms)}</strong></div>
        <div className="border border-[var(--n3-line)] p-3"><span className="text-[10px] uppercase text-[var(--n3-text-muted)]">Estacionamientos</span><strong className="mt-1 block text-sm">{formatNumber(resolved.subject.parkingSpaces)}</strong></div>
        <div className="border border-[var(--n3-line)] p-3"><span className="text-[10px] uppercase text-[var(--n3-text-muted)]">Año</span><strong className="mt-1 block text-sm">{formatNumber(resolved.subject.constructionYear)}</strong></div>
        <div className="border border-[var(--n3-line)] p-3"><span className="text-[10px] uppercase text-[var(--n3-text-muted)]">Historial</span><strong className="mt-1 block text-sm">{resolved.history.length} venta{resolved.history.length === 1 ? '' : 's'}</strong></div>
      </div>
      {needsAreaConfirmation ? <label className="mt-4 flex items-start gap-3 border border-[#806f37] bg-[#15130b] p-3 text-xs"><input type="checkbox" checked={confirmRegisteredArea} onChange={(event) => setConfirmRegisteredArea(event.target.checked)} className="mt-0.5" /><span><strong>Confirmar superficie para valorización.</strong> CBRS registra {resolved.registeredAreaM2} m², pero la semántica útil/construida no está certificada. Márcalo solo si el valorizador confirma que corresponde usar esa superficie como m² útiles.</span></label> : null}
      <div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => useResolvedSubject(false)} className="border border-[var(--n3-line)] px-4 py-2.5 text-xs font-semibold hover:border-[#d7332b]">Usar ficha</button><button type="button" disabled={needsAreaConfirmation && !confirmRegisteredArea} onClick={() => useResolvedSubject(true)} className="inline-flex items-center gap-2 bg-[#d7332b] px-4 py-2.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"><Sparkles size={14} />Usar ficha y analizar mercado</button></div>
    </div> : null}

    {message ? <div role="alert" className="border-t border-[var(--n3-line)] px-5 py-3 text-xs text-[#ff766f]">{message}</div> : null}
  </section>
}
