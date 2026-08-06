'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, ArrowRight, CheckCircle2, Clock3, Plus, RefreshCw } from 'lucide-react'

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

function ageInDays(value:string){
  return Math.max(0,Math.floor((Date.now()-new Date(value).getTime())/86400000))
}

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
    stale:cases.filter(item=>['draft','review'].includes(item.status)&&ageInDays(item.updated_at)>7).length,
    withoutValue:cases.filter(item=>item.estimated_value_uf==null).length,
  }),[cases])

  const pending = counts.draft+counts.review
  const primaryDecision = counts.review>0
    ? `${counts.review} valorización${counts.review===1?'':'es'} requieren revisión`
    : counts.draft>0
      ? `${counts.draft} borrador${counts.draft===1?'':'es'} deben completarse`
      : 'No hay valorizaciones pendientes de decisión'

  return <div className="space-y-7 pb-10">
    <header className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--n3-line)] pb-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d7332b]">Valorizaciones · control ejecutivo</p>
        <h1 className="mt-2 text-3xl font-semibold text-[var(--n3-text-light)]">Decisiones de valorización</h1>
        <p className="mt-2 max-w-3xl text-sm text-[var(--n3-text-muted)]">Estado de los expedientes, decisiones pendientes y acceso directo a cada caso.</p>
      </div>
      <div className="flex gap-2">
        <button onClick={()=>void load()} disabled={loading} className="inline-flex items-center gap-2 border border-[var(--n3-line)] px-4 py-2 text-sm text-[var(--n3-text-light)] disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading?'animate-spin':''}`}/>Actualizar</button>
        <Link href="/dashboard/valuation" className="inline-flex items-center gap-2 bg-[#d7332b] px-4 py-2 text-sm font-semibold text-white"><Plus className="h-4 w-4"/>Nueva valorización</Link>
      </div>
    </header>

    {error && <div role="alert" className="border border-red-900 bg-red-950/30 px-4 py-3 text-sm text-red-200">{error}</div>}

    <section className="grid gap-3 md:grid-cols-3">
      <article className="border border-[var(--n3-line)] bg-[var(--n3-deep)] p-5">
        <p className="text-xs uppercase tracking-wide text-[var(--n3-text-muted)]">Expedientes activos</p>
        <p className="mt-3 text-4xl font-semibold text-[var(--n3-text-light)]">{counts.total}</p>
        <p className="mt-2 text-sm text-[var(--n3-text-muted)]">{counts.approved+counts.issued} aprobados o emitidos</p>
      </article>
      <article className={`border bg-[var(--n3-deep)] p-5 ${pending>0?'border-[#a77a22]':'border-[#2f8f4e]'}`}>
        <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-[var(--n3-text-muted)]"><Clock3 className="h-4 w-4"/>Pendientes</p>
        <p className="mt-3 text-4xl font-semibold text-[var(--n3-text-light)]">{pending}</p>
        <p className="mt-2 text-sm text-[var(--n3-text-muted)]">{counts.review} en revisión · {counts.draft} borradores</p>
      </article>
      <article className={`border bg-[var(--n3-deep)] p-5 ${counts.stale+counts.withoutValue>0?'border-[#d7332b]':'border-[#2f8f4e]'}`}>
        <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-[var(--n3-text-muted)]"><AlertTriangle className="h-4 w-4"/>Riesgos visibles</p>
        <p className="mt-3 text-4xl font-semibold text-[var(--n3-text-light)]">{counts.stale+counts.withoutValue}</p>
        <p className="mt-2 text-sm text-[var(--n3-text-muted)]">{counts.stale} sin avance por más de 7 días · {counts.withoutValue} sin valor estimado</p>
      </article>
    </section>

    <section className="border-l-2 border-[#d7332b] bg-[#0c1111] p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#ff766f]">Decisión prioritaria</p>
      <h2 className="mt-2 text-xl font-semibold text-[var(--n3-text-light)]">{primaryDecision}</h2>
      <p className="mt-2 text-sm text-[var(--n3-text-muted)]">La acción recomendada es abrir primero los casos en revisión y luego completar borradores sin valor o sin actualización reciente.</p>
      {counts.review>0?<button onClick={()=>setStatus('review')} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#ff766f]">Ver casos en revisión<ArrowRight className="h-4 w-4"/></button>:null}
    </section>

    <section className="flex flex-col gap-3 border border-[var(--n3-line)] bg-[var(--n3-deep)] p-4 md:flex-row">
      <input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Buscar por dirección, barrio, tipo o ID" aria-label="Buscar valorizaciones" className="min-w-0 flex-1 border border-[var(--n3-line)] bg-black/20 px-3 py-2 text-sm text-[var(--n3-text-light)]"/>
      <select value={status} onChange={event=>setStatus(event.target.value)} aria-label="Filtrar por estado" className="border border-[var(--n3-line)] bg-black/20 px-3 py-2 text-sm text-[var(--n3-text-light)]">
        <option value="all">Todos los estados</option><option value="draft">Borrador</option><option value="review">En revisión</option><option value="approved">Aprobada</option><option value="issued">Emitida</option>
      </select>
    </section>

    <section className="overflow-x-auto border border-[var(--n3-line)]">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-[var(--n3-deep)] text-xs uppercase tracking-wide text-[var(--n3-text-muted)]"><tr><th className="px-4 py-3">Propiedad</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3">Valor</th><th className="px-4 py-3">Rango</th><th className="px-4 py-3">Antigüedad</th><th className="px-4 py-3">Acción</th></tr></thead>
        <tbody>
          {filtered.map(item=>{
            const age=ageInDays(item.updated_at)
            return <tr key={item.id} className="border-t border-[var(--n3-line)]">
              <td className="px-4 py-4"><p className="font-medium text-[var(--n3-text-light)]">{item.address || 'Propiedad sin dirección'}</p><p className="mt-1 text-xs text-[var(--n3-text-muted)]">{item.neighborhood || 'Sin barrio'} · {item.property_type || 'Sin tipo'} · v{item.version_number || 1}</p></td>
              <td className="px-4 py-4"><span className="border border-[var(--n3-line)] px-2 py-1 text-xs uppercase tracking-wide text-[var(--n3-text-light)]">{statusLabels[item.status] || item.status}</span></td>
              <td className="px-4 py-4 font-medium text-[var(--n3-text-light)]">{item.estimated_value_uf==null?'N/D':`UF ${money.format(item.estimated_value_uf)}`}</td>
              <td className="px-4 py-4 text-[var(--n3-text-muted)]">{item.low_value_uf==null||item.high_value_uf==null?'N/D':`${money.format(item.low_value_uf)}–${money.format(item.high_value_uf)} UF`}</td>
              <td className={`px-4 py-4 ${age>7&&['draft','review'].includes(item.status)?'text-[#ff766f]':'text-[var(--n3-text-muted)]'}`}>{age} días</td>
              <td className="px-4 py-4"><Link href={`/dashboard/valuations/${item.id}`} className="inline-flex items-center gap-1 text-sm font-medium text-[#ff766f]">Revisar<ArrowRight className="h-4 w-4"/></Link></td>
            </tr>
          })}
          {!loading && !filtered.length && <tr><td colSpan={6} className="px-4 py-12 text-center text-[var(--n3-text-muted)]">No hay valorizaciones que coincidan con los filtros.</td></tr>}
        </tbody>
      </table>
    </section>

    <details className="border border-[var(--n3-line)] bg-[var(--n3-deep)] p-4 text-sm text-[var(--n3-text-muted)]">
      <summary className="cursor-pointer font-semibold text-[var(--n3-text-light)]">Ver metodología y trazabilidad</summary>
      <div className="mt-4 space-y-2 leading-6">
        <p>Los estados reflejan el workflow persistido de cada expediente. La vista no recalcula valores ni modifica casos.</p>
        <p>“Sin avance” significa que un borrador o caso en revisión no registra actualización durante más de siete días. “N/D” conserva valores ausentes sin convertirlos en cero.</p>
        <p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4"/>Cada expediente mantiene versión, rango, confianza y fecha de actualización en su detalle.</p>
      </div>
    </details>
  </div>
}
