'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Check, RefreshCw, X } from 'lucide-react'

type Comparable = {
  id:string
  rank:number
  source_type:string|null
  source_reference:string|null
  address:string|null
  neighborhood:string|null
  property_type:string|null
  similarity_score:number
  distance_meters:number|null
  transaction_date:string|null
  source_observed_at:string|null
  price_uf:number|null
  price_uf_m2:number|null
  built_area_m2:number|null
  bedrooms:number|null
  bathrooms:number|null
  parking_spaces:number|null
  selected:boolean
  match_status:string
  adjustment_pct:number
  adjusted_value_uf:number|null
  exclusion_reason:string|null
  evidence:unknown[]
}

type Payload = {
  valuationCase: {
    id:string
    address:string|null
    neighborhood:string|null
    property_type:string|null
    built_area_m2:number|null
    estimated_value_uf:number|null
    low_value_uf:number|null
    high_value_uf:number|null
    confidence:string|null
    methodology_version:string
  }
  comparables:Comparable[]
  decisions:unknown[]
  error?:string
}

function uf(value:number|null|undefined) {
  return value == null ? '—' : `UF ${new Intl.NumberFormat('es-CL',{ maximumFractionDigits:1 }).format(value)}`
}

export default function ValuationComparablesPage({ params }:{ params:Promise<{ id:string }> }) {
  const [id,setId] = useState('')
  const [data,setData] = useState<Payload|null>(null)
  const [loading,setLoading] = useState(true)
  const [working,setWorking] = useState<string|null>(null)
  const [error,setError] = useState<string|null>(null)

  useEffect(()=>{ void params.then(({id})=>setId(id)) },[params])
  useEffect(()=>{ if(id) void load() },[id])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/valuations/${id}/comparables`,{ cache:'no-store' })
      const json = await response.json()
      if(!response.ok) throw new Error(json.error || 'No se pudo cargar la valorización')
      setData(json)
    } catch(err) {
      setError(err instanceof Error ? err.message : 'Error de carga')
    } finally { setLoading(false) }
  }

  async function action(body:Record<string,unknown>, key:string) {
    setWorking(key)
    setError(null)
    try {
      const response = await fetch(`/api/valuations/${id}/comparables`,{ method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body) })
      const json = await response.json()
      if(!response.ok) throw new Error(json.error || 'No se pudo completar la acción')
      await load()
    } catch(err) {
      setError(err instanceof Error ? err.message : 'Error de operación')
    } finally { setWorking(null) }
  }

  const selected = useMemo(()=>data?.comparables.filter(item=>item.selected && item.match_status==='accepted') ?? [],[data])

  return (
    <div className="space-y-6 pb-10">
      <div className="border-b border-[var(--n3-line)] pb-5">
        <Link href="/dashboard/valuations" className="inline-flex items-center gap-2 text-sm text-[var(--n3-text-muted)]"><ArrowLeft className="h-4 w-4"/>Volver a valorizaciones</Link>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-[var(--n3-text-light)]">Comparables trazables</h1>
            <p className="mt-1 text-sm text-[var(--n3-text-muted)]">{data?.valuationCase.address || 'Propiedad sin dirección'} · {data?.valuationCase.neighborhood || 'Sin barrio'}</p>
          </div>
          <button onClick={()=>void action({action:'generate',limit:30},'generate')} disabled={working!==null || !id} className="inline-flex items-center gap-2 bg-[var(--n3-teal)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${working==='generate'?'animate-spin':''}`}/>Generar desde Módulo I
          </button>
        </div>
      </div>

      {error && <div className="border border-red-900 bg-red-950/30 px-4 py-3 text-sm text-red-200">{error}</div>}
      {loading && <div className="text-sm text-[var(--n3-text-muted)]">Cargando...</div>}

      {data && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            {[
              ['Tipo',data.valuationCase.property_type || '—'],
              ['Superficie',data.valuationCase.built_area_m2 ? `${data.valuationCase.built_area_m2} m²` : '—'],
              ['Estimación',uf(data.valuationCase.estimated_value_uf)],
              ['Rango',`${uf(data.valuationCase.low_value_uf)} – ${uf(data.valuationCase.high_value_uf)}`],
              ['Confianza',data.valuationCase.confidence || '—'],
            ].map(([label,value])=><div key={label} className="border border-[var(--n3-line)] bg-[var(--n3-deep)] p-4"><p className="text-xs uppercase tracking-wide text-[var(--n3-text-muted)]">{label}</p><p className="mt-2 text-sm font-semibold text-[var(--n3-text-light)]">{value}</p></div>)}
          </div>

          <div className="flex items-center justify-between"><h2 className="text-xl font-semibold text-[var(--n3-text-light)]">Candidatos ({data.comparables.length})</h2><span className="text-sm text-[var(--n3-text-muted)]">Seleccionados: {selected.length}</span></div>

          <div className="overflow-x-auto border border-[var(--n3-line)]">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[var(--n3-deep)] text-xs uppercase tracking-wide text-[var(--n3-text-muted)]"><tr>
                <th className="px-4 py-3">#</th><th className="px-4 py-3">Fuente</th><th className="px-4 py-3">Propiedad</th><th className="px-4 py-3">Similitud</th><th className="px-4 py-3">Precio</th><th className="px-4 py-3">Ajuste</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3">Acciones</th>
              </tr></thead>
              <tbody>
                {data.comparables.map(item=><tr key={item.id} className="border-t border-[var(--n3-line)] align-top">
                  <td className="px-4 py-4 text-[var(--n3-text-muted)]">{item.rank}</td>
                  <td className="px-4 py-4"><p className="font-medium text-[var(--n3-text-light)]">{item.source_type || '—'}</p><p className="max-w-[180px] truncate text-xs text-[var(--n3-text-muted)]">{item.source_reference || '—'}</p></td>
                  <td className="px-4 py-4"><p className="font-medium text-[var(--n3-text-light)]">{item.address || 'Sin dirección'}</p><p className="text-xs text-[var(--n3-text-muted)]">{item.neighborhood || '—'} · {item.built_area_m2 || '—'} m² · {item.bedrooms ?? '—'}D/{item.bathrooms ?? '—'}B</p></td>
                  <td className="px-4 py-4"><p className="text-[var(--n3-text-light)]">{Number(item.similarity_score).toFixed(1)}%</p><p className="text-xs text-[var(--n3-text-muted)]">{item.distance_meters == null ? 'Distancia N/D' : `${Math.round(item.distance_meters)} m`}</p></td>
                  <td className="px-4 py-4"><p className="text-[var(--n3-text-light)]">{uf(item.price_uf)}</p><p className="text-xs text-[var(--n3-text-muted)]">{item.price_uf_m2 == null ? 'UF/m² N/D' : `${Number(item.price_uf_m2).toFixed(2)} UF/m²`}</p></td>
                  <td className="px-4 py-4"><input id={`adj-${item.id}`} type="number" min="-50" max="50" defaultValue={item.adjustment_pct || 0} className="w-20 border border-[var(--n3-line)] bg-transparent px-2 py-1 text-[var(--n3-text-light)]"/><span className="ml-1 text-[var(--n3-text-muted)]">%</span><p className="mt-1 text-xs text-[var(--n3-text-muted)]">{uf(item.adjusted_value_uf)}</p></td>
                  <td className="px-4 py-4"><span className="text-xs uppercase tracking-wide text-[var(--n3-text-muted)]">{item.match_status}</span>{item.exclusion_reason && <p className="mt-1 max-w-[180px] text-xs text-red-300">{item.exclusion_reason}</p>}</td>
                  <td className="px-4 py-4"><div className="flex gap-2">
                    <button onClick={()=>{const input=document.getElementById(`adj-${item.id}`) as HTMLInputElement|null; void action({action:'select',comparableId:item.id,adjustmentPct:Number(input?.value||0),notes:'Selección manual con ajuste'},item.id)}} disabled={working!==null} className="inline-flex items-center gap-1 border border-[var(--n3-line)] px-2 py-1 text-xs text-[var(--n3-text-light)]"><Check className="h-3 w-3"/>Usar</button>
                    <button onClick={()=>{const reason=window.prompt('Motivo de exclusión'); if(reason) void action({action:'exclude',comparableId:item.id,reason},item.id)}} disabled={working!==null} className="inline-flex items-center gap-1 border border-[var(--n3-line)] px-2 py-1 text-xs text-[var(--n3-text-light)]"><X className="h-3 w-3"/>Excluir</button>
                  </div></td>
                </tr>)}
                {!data.comparables.length && <tr><td colSpan={8} className="px-4 py-10 text-center text-[var(--n3-text-muted)]">No hay comparables generados. La fuente contractual todavía puede estar vacía.</td></tr>}
              </tbody>
            </table>
          </div>

          <div className="border border-[var(--n3-line)] bg-[var(--n3-deep)] p-4 text-sm text-[var(--n3-text-muted)]">
            Metodología activa: <span className="text-[var(--n3-text-light)]">{data.valuationCase.methodology_version}</span>. Las publicaciones representan oferta; las transacciones registradas tienen mayor fuerza probatoria y deben priorizarse en la revisión profesional.
          </div>
        </>
      )}
    </div>
  )
}
