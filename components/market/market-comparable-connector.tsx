'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, RefreshCw } from 'lucide-react'

type ValuationCase = { id:string; address:string|null; property_type:string|null; status:string; requested_by:string }
type Listing = { id:string; property_id:string|null; source_listing_id:string|null; status:string|null; url:string|null; title:string|null; normalized_address:string|null; price_uf:number|null; price_uf_m2:number|null; observed_at:string|null; published_at:string|null }
type Payload = { valuationCases:ValuationCase[]; listings:Listing[]; error?:string }

const nf = new Intl.NumberFormat('es-CL',{maximumFractionDigits:0})

export function MarketComparableConnector(){
  const [data,setData]=useState<Payload|null>(null)
  const [caseId,setCaseId]=useState('')
  const [query,setQuery]=useState('')
  const [busy,setBusy]=useState<string|null>(null)
  const [message,setMessage]=useState<string|null>(null)

  async function load(){
    setMessage(null)
    const response=await fetch('/api/market/comparables',{cache:'no-store'})
    const payload=await response.json() as Payload
    if(!response.ok){setMessage(payload.error||'No fue posible cargar la conexión.');return}
    setData(payload)
    if(!caseId&&payload.valuationCases[0])setCaseId(payload.valuationCases[0].id)
  }
  useEffect(()=>{void load()},[])

  const listings=useMemo(()=>{
    const needle=query.trim().toLowerCase()
    if(!needle)return data?.listings??[]
    return (data?.listings??[]).filter(item=>`${item.title??''} ${item.normalized_address??''}`.toLowerCase().includes(needle))
  },[data,query])

  async function attach(listingId:string){
    if(!caseId){setMessage('Seleccione una valorización en borrador.');return}
    setBusy(listingId);setMessage(null)
    try{
      const response=await fetch('/api/market/comparables',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({valuationCaseId:caseId,listingId})})
      const payload=await response.json()
      if(!response.ok)throw new Error(payload.error||'No fue posible vincular la publicación.')
      setMessage('Comparable vinculado al expediente como candidato trazable.')
    }catch(error){setMessage(error instanceof Error?error.message:'Error de vinculación')}
    finally{setBusy(null)}
  }

  return <div className="space-y-6">
    <section className="border border-[var(--n3-line)] bg-[#0c1111] p-5">
      <h2 className="text-xl font-semibold">Destino de valorización</h2>
      <p className="mt-2 text-sm text-[var(--n3-text-muted)]">Sólo aparecen expedientes en borrador dentro del alcance autenticado.</p>
      <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto]">
        <select value={caseId} onChange={event=>setCaseId(event.target.value)} className="border border-[var(--n3-line)] bg-black/20 px-3 py-3 text-sm">
          <option value="">Seleccione una valorización</option>
          {(data?.valuationCases??[]).map(item=><option key={item.id} value={item.id}>{item.address||'Sin dirección'} · {item.property_type||'Sin tipología'}</option>)}
        </select>
        {caseId?<Link href={`/dashboard/valuations/${caseId}`} className="inline-flex items-center justify-center gap-2 border border-[var(--n3-line)] px-4 py-3 text-sm">Abrir expediente<ArrowRight size={14}/></Link>:null}
      </div>
    </section>

    <section>
      <div className="flex flex-col gap-3 border-b border-[var(--n3-line)] pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#ff766f]">Módulo I → Valorización</p><h2 className="mt-2 text-2xl font-semibold">Publicaciones persistidas</h2><p className="mt-2 text-sm text-[var(--n3-text-muted)]">Vincular una publicación no confirma venta ni disponibilidad. Queda registrada como evidencia observada.</p></div>
        <div className="flex gap-2"><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Buscar dirección" className="border border-[var(--n3-line)] bg-black/20 px-3 py-2 text-sm"/><button onClick={()=>void load()} className="border border-[var(--n3-line)] px-3 py-2"><RefreshCw size={15}/></button></div>
      </div>
      {message?<div role="status" className="mt-4 border border-[var(--n3-line)] p-4 text-sm">{message}</div>:null}
      <div className="mt-4 grid gap-3 xl:grid-cols-2">
        {listings.map(item=><article key={item.id} className="border border-[var(--n3-line)] bg-[#0c1111] p-4">
          <div className="flex items-start justify-between gap-4"><div><p className="font-semibold">{item.normalized_address||item.title||'Publicación sin dirección'}</p><p className="mt-1 text-xs text-[var(--n3-text-muted)]">Observada: {item.observed_at?new Date(item.observed_at).toLocaleString('es-CL'):'sin fecha'} · estado {item.status||'n/d'}</p></div><p className="whitespace-nowrap text-lg font-semibold">{item.price_uf==null?'UF n/d':`UF ${nf.format(item.price_uf)}`}</p></div>
          <p className="mt-2 text-xs text-[var(--n3-text-muted)]">{item.price_uf_m2==null?'UF/m² n/d':`${item.price_uf_m2.toLocaleString('es-CL',{maximumFractionDigits:1})} UF/m²`}</p>
          <div className="mt-4 flex flex-wrap gap-2"><button disabled={busy===item.id||!caseId} onClick={()=>void attach(item.id)} className="border border-[#d7332b] px-3 py-2 text-xs text-[#ff766f] disabled:opacity-40">{busy===item.id?'Vinculando…':'Agregar como candidato'}</button>{item.url?<a href={item.url} target="_blank" rel="noreferrer" className="border border-[var(--n3-line)] px-3 py-2 text-xs">Abrir fuente</a>:null}</div>
        </article>)}
        {!listings.length?<div className="border border-dashed border-[var(--n3-line)] p-6 text-sm text-[var(--n3-text-muted)]">No existen publicaciones con precio para el filtro actual.</div>:null}
      </div>
    </section>
  </div>
}
