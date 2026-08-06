'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Plus, RefreshCw } from 'lucide-react'

type ValuationCase = {
  id:string
  status:string
  valuation_date:string|null
  address:string|null
  neighborhood:string|null
  property_type:string|null
  estimated_value_uf:number|null
  low_value_uf:number|null
  high_value_uf:number|null
  confidence:string|null
  version_number:number|null
  created_at:string
  updated_at:string
}

type Payload = { cases:ValuationCase[]; error?:string }

const money = new Intl.NumberFormat('es-CL',{ maximumFractionDigits:0 })
const statusLabels:Record<string,string> = { draft:'Borrador',review:'En revisión',approved:'Aprobada',issued:'Emitida' }

export default function ValuationRegistryPage(){
  const [cases,setCases] = useState<ValuationCase[]>([])
  const [loading,setLoading] = useState(true)
  const [error,setError] = useState<string|null>(null)
  const [query,setQuery] = useState('')
  const [status,setStatus] = useState('all')

  async function load(){
    setLoading(true); setError(null)
    try{
      const response = await fetch('/api/valuation/cases',{ cache:'no-store' })
      const payload = await response.json() as Payload
      if(!response.ok) throw new Error(payload.error || 'No fue posible cargar las valorizaciones')
      setCases(payload.cases || [])
    }catch(err){ setError(err instanceof Error ? err.message : 'Error de carga') }
    finally{ setLoading(false) }
  }

  useEffect(()=>{ void load() },[])

  const filtered = useMemo(()=>cases.filter(item=>{
    const text = `${item.address || ''} ${item.neighborhood || ''} ${item.property_type || ''} ${item.id}`.toLowerCase()
    return (status==='all' || item.status===status) && text.includes(query.trim().toLowerCase())
  }),[cases,query,status])

  const counts = useMemo(()=>({
    total:cases.length,
    draft:cases.filter(item=>item.status==='draft').length,
    review:cases.filter(item=>item.status==='review').length,
    approved:cases.filter(item=>item.status==='approved').length,
    issued:cases.filter(item=>item.status==='issued').length,
  }),[cases])

  const actionCount = counts.draft + counts.review

  return <div className="mx-auto max-w-5xl space-y-5 pb-12">
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--n3-line)] pb-5">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#ff766f]">Valorizaciones</p>
        <h1 className="mt-2 text-3xl font-semibold text-[var(--n3-text-light)]">Registro</h1>
        <p className="mt-2 text-xs text-[var(--n3-text-muted)]">{actionCount} requieren acción</p>
      </div>
      <div className="flex gap-2">
        <button onClick={()=>void load()} disabled={loading} aria-label="Actualizar" className="inline-flex items-center border border-[var(--n3-line)] px-3 py-2 text-sm disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading?'animate-spin':''}`}/></button>
        <Link href="/dashboard/valuation" className="inline-flex items-center gap-2 bg-[#d7332b] px-4 py-2 text-sm font-semibold text-white"><Plus className="h-4 w-4"/>Nueva</Link>
      </div>
    </header>

    {error ? <div className="border border-red-900 bg-red-950/30 px-4 py-3 text-sm text-red-200">{error}</div> : null}

    <section className="grid gap-px bg-[var(--n3-line)] sm:grid-cols-4">
      {[
        ['Total',counts.total],['Borradores',counts.draft],['En revisión',counts.review],['Aprobadas / emitidas',counts.approved + counts.issued]
      ].map(([label,value])=><div key={String(label)} className="bg-[var(--n3-deep)] p-4"><p className="text-[10px] uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">{label}</p><p className="mt-2 text-2xl font-semibold text-[var(--n3-text-light)]">{value}</p></div>)}
    </section>

    {actionCount > 0 ? <section className="border border-[var(--n3-line)] bg-[#0c1111]">
      <div className="border-b border-[var(--n3-line)] px-4 py-3"><h2 className="text-sm font-semibold">Acciones</h2></div>
      <div className="divide-y divide-[var(--n3-line)]">
        {counts.review > 0 ? <button onClick={()=>setStatus('review')} className="flex w-full items-center justify-between px-4 py-3 text-sm hover:bg-white/[0.03]"><span>Revisar valorizaciones</span><strong>{counts.review}</strong></button> : null}
        {counts.draft > 0 ? <button onClick={()=>setStatus('draft')} className="flex w-full items-center justify-between px-4 py-3 text-sm hover:bg-white/[0.03]"><span>Completar borradores</span><strong>{counts.draft}</strong></button> : null}
      </div>
    </section> : null}

    <section className="flex flex-col gap-3 border border-[var(--n3-line)] bg-[var(--n3-deep)] p-3 md:flex-row">
      <input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Buscar dirección, barrio, tipo o ID" className="min-w-0 flex-1 border border-[var(--n3-line)] bg-black/20 px-3 py-2 text-sm text-[var(--n3-text-light)]"/>
      <select value={status} onChange={event=>setStatus(event.target.value)} className="border border-[var(--n3-line)] bg-black/20 px-3 py-2 text-sm text-[var(--n3-text-light)]">
        <option value="all">Todos</option><option value="draft">Borrador</option><option value="review">En revisión</option><option value="approved">Aprobada</option><option value="issued">Emitida</option>
      </select>
    </section>

    <section className="overflow-x-auto border border-[var(--n3-line)]">
      <table className="min-w-[820px] w-full text-left text-sm">
        <thead className="bg-[var(--n3-deep)] text-xs uppercase tracking-wide text-[var(--n3-text-muted)]"><tr><th className="px-4 py-3">Propiedad</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3 text-right">Valor UF</th><th className="px-4 py-3">Confianza</th><th className="px-4 py-3">Versión</th><th className="px-4 py-3">Actualización</th><th className="px-4 py-3"></th></tr></thead>
        <tbody>
          {filtered.map(item=><tr key={item.id} className="border-t border-[var(--n3-line)] hover:bg-white/[0.02]">
            <td className="px-4 py-3"><p className="font-medium text-[var(--n3-text-light)]">{item.address || 'Sin dirección'}</p><p className="mt-1 text-xs text-[var(--n3-text-muted)]">{item.neighborhood || 'Sin barrio'} · {item.property_type || 'Sin tipo'}</p></td>
            <td className="px-4 py-3"><span className="text-xs uppercase tracking-wide text-[var(--n3-text-light)]">{statusLabels[item.status] || item.status}</span></td>
            <td className="px-4 py-3 text-right font-medium text-[var(--n3-text-light)]">{item.estimated_value_uf==null?'—':money.format(item.estimated_value_uf)}</td>
            <td className="px-4 py-3 text-[var(--n3-text-muted)]">{item.confidence || '—'}</td>
            <td className="px-4 py-3 text-[var(--n3-text-light)]">v{item.version_number || 1}</td>
            <td className="px-4 py-3 text-[var(--n3-text-muted)]">{new Date(item.updated_at).toLocaleDateString('es-CL')}</td>
            <td className="px-4 py-3"><Link href={`/dashboard/valuations/${item.id}`} className="text-sm font-medium text-[#ff766f]">Abrir</Link></td>
          </tr>)}
          {!loading && !filtered.length ? <tr><td colSpan={7} className="px-4 py-10 text-center text-[var(--n3-text-muted)]">Sin resultados</td></tr> : null}
        </tbody>
      </table>
    </section>
  </div>
}
