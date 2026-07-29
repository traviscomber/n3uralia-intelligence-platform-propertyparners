'use client'

import { useState } from 'react'

type Candidate = {
  source_type: string
  source_reference: string
  comparable_property_id: string | null
  source_transaction_id: string | null
  source_listing_id: string | null
  transaction_date: string | null
  observed_at: string | null
  address: string | null
  neighborhood: string | null
  property_type: string | null
  built_area_m2: number | null
  bedrooms: number | null
  bathrooms: number | null
  parking_spaces: number | null
  price_uf: number | null
  price_uf_m2: number | null
  distance_meters: number | null
  similarity_score: number
  evidence: unknown[]
  selected?: boolean
  adjustment_pct?: number
  exclusion_reason?: string
}

export default function ValuationTracePage() {
  const [caseId, setCaseId] = useState('')
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function load() {
    if (!caseId.trim()) return
    setLoading(true)
    setMessage('')
    try {
      const response = await fetch(`/api/valuation/cases/${encodeURIComponent(caseId.trim())}/comparables`)
      const json = await response.json()
      if (!response.ok) throw new Error(json.error || 'No se pudieron cargar los comparables')
      const selectedRefs = new Set((json.comparables || []).filter((item: any) => item.selected).map((item: any) => `${item.source_type}:${item.source_reference}`))
      setCandidates((json.candidates || []).map((item: Candidate) => ({ ...item, selected: selectedRefs.has(`${item.source_type}:${item.source_reference}`), adjustment_pct: 0 })))
      setMessage(`${json.candidates?.length || 0} candidatos encontrados`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Error de carga')
    } finally {
      setLoading(false)
    }
  }

  async function save() {
    setLoading(true)
    setMessage('')
    try {
      const payload = candidates.filter((item) => item.selected || item.exclusion_reason).map((item) => ({
        ...item,
        selected: Boolean(item.selected),
        adjusted_value_uf: item.price_uf == null ? null : item.price_uf * (1 + Number(item.adjustment_pct || 0) / 100),
      }))
      const response = await fetch(`/api/valuation/cases/${encodeURIComponent(caseId.trim())}/comparables`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ comparables: payload, reason: 'Selección realizada desde consola de trazabilidad' }),
      })
      const json = await response.json()
      if (!response.ok) throw new Error(json.error || 'No se pudo guardar la selección')
      setMessage(`${json.comparables?.length || 0} decisiones guardadas`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Error al guardar')
    } finally {
      setLoading(false)
    }
  }

  async function changeStatus(status: 'review' | 'approved' | 'issued') {
    setLoading(true)
    setMessage('')
    try {
      const response = await fetch(`/api/valuation/cases/${encodeURIComponent(caseId.trim())}/workflow`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status, reason: `Cambio de estado desde consola: ${status}` }),
      })
      const json = await response.json()
      if (!response.ok) throw new Error(json.error || 'No se pudo cambiar el estado')
      setMessage(`Valorización actualizada a ${json.valuation.status}, versión ${json.valuation.version_number}`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Error de workflow')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 pb-10">
      <div>
        <h1 className="text-3xl font-semibold text-[var(--n3-text-light)]">Trazabilidad de valorizaciones</h1>
        <p className="mt-2 text-sm text-[var(--n3-text-muted)]">Selecciona comparables provenientes de transacciones y publicaciones canónicas, registra ajustes y controla revisión, aprobación y emisión.</p>
      </div>

      <div className="flex flex-col gap-3 border border-[var(--n3-line)] bg-[var(--n3-deep)] p-5 md:flex-row">
        <input value={caseId} onChange={(event) => setCaseId(event.target.value)} placeholder="UUID de valuation_case" className="min-w-0 flex-1 border border-[var(--n3-line)] bg-black/30 px-3 py-2 text-sm text-[var(--n3-text-light)]" />
        <button onClick={() => void load()} disabled={loading || !caseId.trim()} className="bg-[var(--n3-teal)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50">Cargar candidatos</button>
        <button onClick={() => void save()} disabled={loading || !caseId.trim()} className="border border-[var(--n3-line)] px-4 py-2 text-sm text-[var(--n3-text-light)] disabled:opacity-50">Guardar decisiones</button>
      </div>

      {message && <div className="border border-[var(--n3-line)] bg-black/20 px-4 py-3 text-sm text-[var(--n3-text-light)]">{message}</div>}

      <div className="overflow-x-auto border border-[var(--n3-line)]">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[var(--n3-deep)] text-[var(--n3-text-light)]">
            <tr><th className="px-3 py-3">Usar</th><th className="px-3 py-3">Fuente</th><th className="px-3 py-3">Dirección</th><th className="px-3 py-3">Barrio</th><th className="px-3 py-3">UF</th><th className="px-3 py-3">UF/m²</th><th className="px-3 py-3">Similitud</th><th className="px-3 py-3">Distancia</th><th className="px-3 py-3">Ajuste %</th><th className="px-3 py-3">Motivo exclusión</th></tr>
          </thead>
          <tbody>
            {candidates.map((item, index) => (
              <tr key={`${item.source_type}-${item.source_reference}-${index}`} className="border-t border-[var(--n3-line)] text-[var(--n3-text-light)]">
                <td className="px-3 py-3"><input type="checkbox" checked={Boolean(item.selected)} onChange={(event) => setCandidates((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, selected: event.target.checked } : row))} /></td>
                <td className="px-3 py-3">{item.source_type}</td>
                <td className="px-3 py-3">{item.address || 'Sin dirección'}</td>
                <td className="px-3 py-3">{item.neighborhood || 'N/A'}</td>
                <td className="px-3 py-3">{item.price_uf == null ? 'N/A' : new Intl.NumberFormat('en-CL').format(item.price_uf)}</td>
                <td className="px-3 py-3">{item.price_uf_m2 == null ? 'N/A' : new Intl.NumberFormat('en-CL', { maximumFractionDigits: 2 }).format(item.price_uf_m2)}</td>
                <td className="px-3 py-3">{Number(item.similarity_score).toFixed(1)}%</td>
                <td className="px-3 py-3">{item.distance_meters == null ? 'N/A' : `${Math.round(item.distance_meters)} m`}</td>
                <td className="px-3 py-3"><input type="number" min="-50" max="50" step="0.5" value={item.adjustment_pct || 0} onChange={(event) => setCandidates((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, adjustment_pct: Number(event.target.value) } : row))} className="w-24 border border-[var(--n3-line)] bg-black/30 px-2 py-1" /></td>
                <td className="px-3 py-3"><input value={item.exclusion_reason || ''} onChange={(event) => setCandidates((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, exclusion_reason: event.target.value } : row))} className="min-w-52 border border-[var(--n3-line)] bg-black/30 px-2 py-1" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-3">
        <button onClick={() => void changeStatus('review')} disabled={loading || !caseId.trim()} className="border border-[var(--n3-line)] px-4 py-2 text-sm text-[var(--n3-text-light)]">Enviar a revisión</button>
        <button onClick={() => void changeStatus('approved')} disabled={loading || !caseId.trim()} className="border border-[var(--n3-line)] px-4 py-2 text-sm text-[var(--n3-text-light)]">Aprobar</button>
        <button onClick={() => void changeStatus('issued')} disabled={loading || !caseId.trim()} className="bg-[var(--n3-teal)] px-4 py-2 text-sm font-medium text-white">Emitir</button>
      </div>
    </div>
  )
}
