'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, ExternalLink, MapPinned, ShieldCheck } from 'lucide-react'

export type PropertyReviewRow = {
  review_id: string | null
  source_listing_id: string
  raw_address: string | null
  title: string | null
  url: string | null
  classification: string | null
  proposed_neighborhood_id: string | null
  proposed_neighborhood_name: string | null
  resolution_kind: string
  reason: string
  can_decide: boolean
  observed_at: string | null
}

type Props = {
  initialRows: PropertyReviewRow[]
}

const RESOLUTION_LABELS: Record<string,string> = {
  accepted_memory:'Memoria territorial',
  point_in_kml:'Coordenada KML',
  direct_kml:'Coincidencia KML',
  unique_kml_candidate:'Candidato KML único',
  validated_rule:'Regla territorial validada',
  cbrs_street_consensus:'Consenso histórico CBRS',
  territorial_evidence:'Evidencia territorial cruzada',
  learned_address_alias_v1:'Patrón territorial aprendido',
  learned_address_alias_conflict:'Patrón aprendido en conflicto',
  manual:'Sin resolución automática',
}

function ageDays(value:string|null){
  if(!value)return null
  const date=new Date(value)
  if(Number.isNaN(date.getTime()))return null
  return Math.max(0,Math.floor((Date.now()-date.getTime())/86_400_000))
}

function ageLabel(value:string|null){
  const days=ageDays(value)
  if(days===null)return'Sin fecha'
  if(days===0)return'Hoy'
  if(days===1)return'1 día'
  return `${days} días`
}

function statusLabel(row:PropertyReviewRow){
  if(row.can_decide&&row.proposed_neighborhood_name)return'Sugerencia lista'
  if(row.resolution_kind==='learned_address_alias_v1'&&row.proposed_neighborhood_name)return'Sugerencia aprendida'
  if(row.classification==='ambiguous')return'Barrio ambiguo'
  if(row.classification==='no_match')return'Sin match'
  return'Falta evidencia'
}

export function PropertyReviewInbox({initialRows}:Props){
  const [rows,setRows]=useState(initialRows)
  const [selectedId,setSelectedId]=useState(initialRows[0]?.source_listing_id??null)
  const [filter,setFilter]=useState<'pending'|'today'|'old'>('pending')
  const [busy,setBusy]=useState(false)
  const [message,setMessage]=useState<string|null>(null)

  const visible=useMemo(()=>rows.filter(row=>{
    const days=ageDays(row.observed_at)
    if(filter==='today')return days===0
    if(filter==='old')return days!==null&&days>=2
    return true
  }),[rows,filter])

  const selected=visible.find(row=>row.source_listing_id===selectedId)
    ??visible[0]
    ??null

  async function confirm(){
    if(!selected?.review_id||!selected.proposed_neighborhood_id||!selected.can_decide)return
    setBusy(true)
    setMessage(null)
    try{
      const response=await fetch('/api/properties/review',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          reviewId:selected.review_id,
          proposedNeighborhoodId:selected.proposed_neighborhood_id,
        }),
      })
      const payload=await response.json()
      if(!response.ok){
        if(payload?.error==='MFA_REQUIRED'){
          window.location.href='/auth/mfa?next=/dashboard/properties'
          return
        }
        throw new Error(payload?.error||'No fue posible confirmar el barrio.')
      }
      const next=rows.filter(row=>row.source_listing_id!==selected.source_listing_id)
      setRows(next)
      setSelectedId(next[0]?.source_listing_id??null)
      setMessage('Barrio confirmado. La propiedad salió de la bandeja y continúa al flujo operativo.')
    }catch(error){
      setMessage(error instanceof Error?error.message:'No fue posible confirmar el barrio.')
    }finally{
      setBusy(false)
    }
  }

  const today=rows.filter(row=>ageDays(row.observed_at)===0).length
  const old=rows.filter(row=>{
    const days=ageDays(row.observed_at)
    return days!==null&&days>=2
  }).length

  return <div className="mt-6 grid min-h-[620px] overflow-hidden border border-[var(--n3-line)] bg-[var(--n3-black)] lg:grid-cols-[360px_minmax(0,1fr)]">
    <aside className="border-b border-[var(--n3-line)] lg:border-b-0 lg:border-r">
      <div className="border-b border-[var(--n3-line)] p-3">
        <div className="flex gap-1 overflow-x-auto">
          {([
            ['pending','Pendientes',rows.length],
            ['today','Hoy',today],
            ['old','>48 h',old],
          ] as const).map(([key,label,count])=><button
            key={key}
            onClick={()=>setFilter(key)}
            className={`min-h-9 shrink-0 border px-3 text-xs font-medium ${filter===key?'border-[#d7332b] bg-[#d7332b]/10 text-white':'border-[var(--n3-line)] text-[var(--n3-text-muted)]'}`}
          >{label} · {count}</button>)}
        </div>
      </div>

      <div className="max-h-[70vh] overflow-y-auto">
        {visible.map(row=>{
          const active=row.source_listing_id===selected?.source_listing_id
          return <button
            key={row.source_listing_id}
            onClick={()=>{setSelectedId(row.source_listing_id);setMessage(null)}}
            className={`block w-full border-b border-[var(--n3-line)] px-4 py-4 text-left transition-colors ${active?'bg-white/[0.045]':'hover:bg-white/[0.02]'}`}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="line-clamp-2 text-sm font-medium leading-5 text-[var(--n3-text-light)]">{row.raw_address||row.title||'Dirección no disponible'}</p>
              <span className={`shrink-0 text-[10px] ${ageDays(row.observed_at)!==null&&ageDays(row.observed_at)!>=2?'text-[#f0c96a]':'text-[var(--n3-text-muted)]'}`}>{ageLabel(row.observed_at)}</span>
            </div>
            <p className="mt-2 text-[11px] text-[var(--n3-text-muted)]">{statusLabel(row)}</p>
            {row.proposed_neighborhood_name?<p className="mt-1 text-xs text-[var(--n3-accent)]">{row.proposed_neighborhood_name}</p>:null}
          </button>
        })}
        {!visible.length?<div className="p-5 text-sm text-[var(--n3-text-muted)]">No hay propiedades en este filtro.</div>:null}
      </div>
    </aside>

    <section className="min-w-0 p-5 lg:p-7">
      {selected?<div className="mx-auto max-w-4xl">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] uppercase tracking-[0.14em] text-[#ff8d87]">{statusLabel(selected)}</span>
          <span className="text-[10px] uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">{RESOLUTION_LABELS[selected.resolution_kind]??'Evidencia territorial'}</span>
        </div>

        <h2 className="mt-3 text-2xl font-medium leading-tight text-[var(--n3-text-light)]">{selected.raw_address||selected.title||'Dirección no disponible'}</h2>
        {selected.title&&selected.raw_address?<p className="mt-2 text-sm text-[var(--n3-text-muted)]">{selected.title}</p>:null}

        <div className="mt-6 grid gap-px bg-[var(--n3-line)] sm:grid-cols-3">
          <div className="bg-[var(--n3-black)] p-4"><p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">ID Portal</p><p className="mt-1 text-sm">MLC-{selected.source_listing_id}</p></div>
          <div className="bg-[var(--n3-black)] p-4"><p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Antigüedad</p><p className="mt-1 text-sm">{ageLabel(selected.observed_at)}</p></div>
          <div className="bg-[var(--n3-black)] p-4"><p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Estado</p><p className="mt-1 text-sm">{statusLabel(selected)}</p></div>
        </div>

        <section className="mt-7 border-t border-[var(--n3-line)] pt-5">
          <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">Evidencia</p>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--n3-text-light)]">{selected.reason}</p>
          {selected.proposed_neighborhood_name?<div className="mt-4 flex items-start gap-2 border-l-2 border-[var(--n3-accent)] pl-4">
            <MapPinned size={15} className="mt-0.5 shrink-0 text-[var(--n3-accent)]"/>
            <div><p className="text-xs text-[var(--n3-text-muted)]">Barrio sugerido</p><p className="mt-1 text-base font-semibold">{selected.proposed_neighborhood_name}</p></div>
          </div>:null}
        </section>

        <section className="mt-7 border-t border-[var(--n3-line)] pt-5">
          <div className="flex flex-wrap items-center gap-3">
            {selected.can_decide&&selected.review_id&&selected.proposed_neighborhood_id?<button
              onClick={()=>void confirm()}
              disabled={busy}
              className="inline-flex min-h-11 items-center gap-2 bg-[#d7332b] px-4 text-xs font-semibold text-white disabled:opacity-50"
            ><CheckCircle2 size={14}/>{busy?'Confirmando…':'Confirmar barrio'}</button>:null}
            {selected.url?<Link href={selected.url} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 border border-[var(--n3-line)] px-4 text-xs font-semibold text-[var(--n3-text-light)]">Abrir aviso <ExternalLink size={13}/></Link>:null}
          </div>
          {!selected.can_decide?<div className="mt-4 flex items-start gap-2 text-xs leading-5 text-[var(--n3-text-muted)]"><ShieldCheck size={14} className="mt-0.5 shrink-0"/>{selected.resolution_kind==='learned_address_alias_v1'?'La señal aprendida sirve para priorizar la revisión, pero no escribe barrio ni crea asignaciones. Debe validarse antes de continuar al flujo operativo.':'La evidencia todavía no permite una confirmación segura. El caso permanece abierto hasta que exista una señal territorial determinística.'}</div>:null}
          {message?<p className="mt-4 text-xs leading-5 text-[var(--n3-text-light)]">{message}</p>:null}
        </section>
      </div>:<div className="flex min-h-[500px] items-center justify-center text-sm text-[var(--n3-text-muted)]">No hay propiedades pendientes de revisión.</div>}
    </section>
  </div>
}
