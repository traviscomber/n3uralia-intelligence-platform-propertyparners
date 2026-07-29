'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, RefreshCw, Send, XCircle } from 'lucide-react'

type Comparable = {
  id: string
  rank: number
  source_type?: string | null
  source_reference?: string | null
  address?: string | null
  neighborhood?: string | null
  price_uf?: number | null
  price_uf_m2?: number | null
  similarity_score: number
  distance_meters?: number | null
  selected: boolean
  match_status: string
  adjustment_pct: number
  adjustment_notes?: string | null
  exclusion_reason?: string | null
}

type Payload = {
  valuationCase: Record<string, unknown>
  comparables: Comparable[]
  candidates?: unknown[]
  decisions?: Array<Record<string, unknown>>
  error?: string
}

function money(value?: number | null) {
  return value == null ? 'N/A' : `${new Intl.NumberFormat('es-CL', { maximumFractionDigits: 1 }).format(value)} UF`
}

export default function ValuationReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState('')
  const [data, setData] = useState<Payload | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => { void params.then(({ id }) => setId(id)) }, [params])
  useEffect(() => { if (id) void load() }, [id])

  async function load() {
    setLoading(true)
    try {
      const response = await fetch(`/api/valuation-engine/cases/${id}`, { cache: 'no-store' })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'No fue posible cargar el caso.')
      setData(payload)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No fue posible cargar el caso.')
    } finally {
      setLoading(false)
    }
  }

  async function action(body: Record<string, unknown>) {
    setLoading(true)
    setMessage(null)
    try {
      const response = await fetch(`/api/valuation-engine/cases/${id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'No fue posible completar la acción.')
      setData((current) => ({ ...(current || { valuationCase: {}, comparables: [] }), ...payload }))
      setMessage('Acción registrada con trazabilidad.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No fue posible completar la acción.')
    } finally {
      setLoading(false)
    }
  }

  async function updateAdjustment(comparable: Comparable, value: string) {
    await action({ action: 'adjust_comparable', comparableId: comparable.id, adjustmentPct: Number(value || 0), notes: comparable.adjustment_notes || '' })
  }

  const valuationCase = data?.valuationCase || {}
  const selected = data?.comparables.filter((item) => item.selected).length || 0

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--n3-line)] pb-5">
        <div>
          <Link href="/dashboard/valuation" className="inline-flex items-center gap-2 text-sm text-[var(--n3-text-muted)]"><ArrowLeft size={15} />Volver a valorización</Link>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-[#d7332b]">Módulo II · Revisión contractual</p>
          <h1 className="mt-1 text-3xl font-bold text-[var(--n3-text-light)]">Comparables y aprobación</h1>
          <p className="mt-2 text-sm text-[var(--n3-text-muted)]">Caso {id.slice(0, 8)} · Estado {String(valuationCase.status || 'desconocido')} · {selected} comparables seleccionados.</p>
        </div>
        <button onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 border border-[var(--n3-line)] px-4 py-2 text-sm"><RefreshCw size={15} className={loading ? 'animate-spin' : ''} />Actualizar</button>
      </div>

      {message ? <div className="border border-[var(--n3-line)] bg-[#0c1111] px-4 py-3 text-sm text-[var(--n3-text-light)]">{message}</div> : null}

      <div className="grid gap-3 md:grid-cols-4">
        <div className="border border-[var(--n3-line)] bg-[#0c1111] p-4"><p className="text-xs text-[var(--n3-text-muted)]">Dirección</p><p className="mt-2 font-semibold">{String(valuationCase.address || 'Pendiente')}</p></div>
        <div className="border border-[var(--n3-line)] bg-[#0c1111] p-4"><p className="text-xs text-[var(--n3-text-muted)]">Barrio</p><p className="mt-2 font-semibold">{String(valuationCase.neighborhood || 'Pendiente')}</p></div>
        <div className="border border-[var(--n3-line)] bg-[#0c1111] p-4"><p className="text-xs text-[var(--n3-text-muted)]">Valor sugerido</p><p className="mt-2 font-semibold">{money(Number(valuationCase.estimated_value_uf || 0) || null)}</p></div>
        <div className="border border-[var(--n3-line)] bg-[#0c1111] p-4"><p className="text-xs text-[var(--n3-text-muted)]">Versión</p><p className="mt-2 font-semibold">{String(valuationCase.version_number || 1)}</p></div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button onClick={() => void action({ action: 'generate_candidates', limit: 30 })} disabled={loading} className="border border-[var(--n3-line)] bg-[#0c1111] px-4 py-2 text-sm font-semibold">Generar candidatos desde mercado</button>
        <button onClick={() => void action({ action: 'submit_review' })} disabled={loading} className="inline-flex items-center gap-2 bg-[#d7332b] px-4 py-2 text-sm font-semibold text-white"><Send size={15} />Enviar a revisión</button>
        <button onClick={() => void action({ action: 'approve' })} disabled={loading} className="inline-flex items-center gap-2 border border-[var(--n3-line)] px-4 py-2 text-sm font-semibold"><CheckCircle2 size={15} />Aprobar</button>
        <button onClick={() => void action({ action: 'issue' })} disabled={loading} className="border border-[var(--n3-line)] px-4 py-2 text-sm font-semibold">Emitir</button>
      </div>

      <div className="space-y-3">
        {(data?.comparables || []).map((item) => (
          <div key={item.id} className="border border-[var(--n3-line)] bg-[#0c1111] p-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#d7332b]">#{item.rank} · {item.source_type || 'fuente'}</p>
                <h2 className="mt-1 text-lg font-semibold">{item.address || 'Sin dirección'}</h2>
                <p className="mt-1 text-xs text-[var(--n3-text-muted)]">{item.neighborhood || 'Sin barrio'} · Ref. {item.source_reference || 'N/A'} · similitud {Number(item.similarity_score || 0).toFixed(1)}%</p>
              </div>
              <div className="text-right"><p className="font-semibold">{money(item.price_uf)}</p><p className="text-xs text-[var(--n3-text-muted)]">{item.price_uf_m2 ? `${Number(item.price_uf_m2).toFixed(1)} UF/m²` : 'UF/m² N/A'}</p></div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto_auto]">
              <input type="number" step="0.1" defaultValue={item.adjustment_pct || 0} onBlur={(event) => void updateAdjustment(item, event.target.value)} className="border border-[var(--n3-line)] bg-[#080d0d] px-3 py-2 text-sm" placeholder="Ajuste %" />
              <input defaultValue={item.adjustment_notes || ''} onBlur={(event) => { item.adjustment_notes = event.target.value }} className="border border-[var(--n3-line)] bg-[#080d0d] px-3 py-2 text-sm" placeholder="Justificación del ajuste" />
              <button onClick={() => void action({ action: 'select_comparable', comparableId: item.id })} disabled={loading} className="inline-flex items-center justify-center gap-2 border border-[var(--n3-line)] px-3 py-2 text-sm"><CheckCircle2 size={14} />Seleccionar</button>
              <button onClick={() => { const reason = window.prompt('Motivo de exclusión'); if (reason) void action({ action: 'exclude_comparable', comparableId: item.id, reason }) }} disabled={loading} className="inline-flex items-center justify-center gap-2 border border-[var(--n3-line)] px-3 py-2 text-sm"><XCircle size={14} />Excluir</button>
            </div>
            <p className="mt-3 text-xs text-[var(--n3-text-muted)]">Estado: {item.match_status}{item.exclusion_reason ? ` · ${item.exclusion_reason}` : ''}</p>
          </div>
        ))}
        {!loading && !data?.comparables.length ? <div className="border border-dashed border-[var(--n3-line)] p-8 text-center text-sm text-[var(--n3-text-muted)]">No hay comparables materializados. Genere candidatos después de cargar publicaciones o transacciones reales en el Módulo I.</div> : null}
      </div>
    </div>
  )
}
