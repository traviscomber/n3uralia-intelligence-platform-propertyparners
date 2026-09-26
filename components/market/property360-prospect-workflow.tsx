'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

type Director = {
  director_key: string
  full_name: string
  role: 'director' | 'subdirector'
  office_name: string
  profile_id: string | null
  source: string
  source_effective_date: string | null
}

type ProspectData = {
  property: { id: string; address: string | null; propertyType: string | null; neighborhoodId: string | null; identityStatus: string | null }
  neighborhood: { id: string; name: string; micro_neighborhood: string | null; assignment_status: string | null } | null
  currentListing: { source_listing_id: string; url: string | null; status: string; operation: string | null; observed_at: string | null; published_at: string | null; price_uf: number | null } | null
  publishedLeadEligible: boolean
  permissions: { canManage: boolean; canCreateValuation: boolean }
  directors: Director[]
  territoryAssignment: {
    id: string
    neighborhood_id: string
    director_key: string
    valid_from: string
    assignment_reason: string | null
    source: string
    created_at: string
    director: Director | null
  } | null
  lead: {
    id: string
    status: string
    priority: string
    assigned_at: string
    first_contact_at: string | null
    last_follow_up_at: string | null
    next_follow_up_at: string | null
    won_at: string | null
    lost_at: string | null
    latest_note: string | null
    director: Director | null
  } | null
  events: Array<{ id: number; event_type: string; from_status: string | null; to_status: string | null; note: string | null; metadata: Record<string, unknown>; occurred_at: string }>
}

const STATUS_LABELS: Record<string,string> = {
  new:'Nuevo', assigned:'Asignado', contacting:'Contacto', qualified:'Calificado',
  valuation:'Valorización', proposal:'Propuesta', won:'Ganado', lost:'Perdido', archived:'Archivado',
}
const EVENT_LABELS: Record<string,string> = {
  lead_created:'Lead creado', director_assigned:'Director asignado', director_reassigned:'Director reasignado',
  status_changed:'Estado actualizado', follow_up:'Seguimiento', contacted:'Contacto',
  valuation_started:'Valorización iniciada', valuation_linked:'Valorización vinculada',
  proposal:'Propuesta', won:'Ganado', lost:'Perdido', note:'Nota',
}

function date(value: string | null | undefined) {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString('es-CL', { dateStyle:'short', timeStyle:'short' })
}

export function Property360ProspectWorkflow({
  propertyId,
  valuationHref,
}: {
  propertyId: string
  valuationHref: string
}) {
  const [data,setData] = useState<ProspectData|null>(null)
  const [loading,setLoading] = useState(true)
  const [saving,setSaving] = useState(false)
  const [message,setMessage] = useState<string|null>(null)
  const [directorKey,setDirectorKey] = useState('')
  const [status,setStatus] = useState('assigned')
  const [note,setNote] = useState('')
  const [nextFollowUpAt,setNextFollowUpAt] = useState('')

  async function load() {
    setLoading(true)
    try {
      const res=await fetch(`/api/prospects/property/${encodeURIComponent(propertyId)}`,{cache:'no-store'})
      if(!res.ok) throw new Error('No fue posible cargar la gestión comercial.')
      const payload=await res.json() as ProspectData
      setData(payload)
      setDirectorKey(payload.territoryAssignment?.director_key || '')
      setStatus(payload.lead?.status || 'assigned')
    } catch(e) {
      setMessage(e instanceof Error ? e.message : 'No fue posible cargar la gestión comercial.')
    } finally { setLoading(false) }
  }

  useEffect(()=>{ void load() },[propertyId])

  const director = data?.lead?.director || data?.territoryAssignment?.director || null
  const actionable = Boolean(data?.permissions.canManage)
  const canCreateLead = Boolean(data?.publishedLeadEligible && data?.territoryAssignment && !data?.lead)
  const timeline = useMemo(()=>data?.events?.slice(0,8) || [],[data])

  async function mutate(body: Record<string,unknown>) {
    setSaving(true);setMessage(null)
    try{
      const res=await fetch(`/api/prospects/property/${encodeURIComponent(propertyId)}`,{
        method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),
      })
      const payload=await res.json()
      if(!res.ok) throw new Error(payload.error || 'No fue posible guardar.')
      await load()
      setNote('')
      const createdLeads = Number(payload?.assignment?.createdLeads ?? 0)
      setMessage(createdLeads > 0
        ? `Territorio guardado. ${createdLeads} lead${createdLeads === 1 ? '' : 's'} elegible${createdLeads === 1 ? '' : 's'} creado${createdLeads === 1 ? '' : 's'} automáticamente para el barrio.`
        : 'Guardado.')
    }catch(e){ setMessage(e instanceof Error ? e.message : 'No fue posible guardar.') }
    finally{ setSaving(false) }
  }

  if(loading) return <section className="mt-7 border-y border-[var(--n3-line)] py-5 text-sm text-[var(--n3-text-muted)]">Cargando gestión de lead…</section>
  if(!data) return <section className="mt-7 border-y border-[var(--n3-line)] py-5 text-sm text-[#f0c96a]">{message || 'Gestión comercial no disponible.'}</section>

  return <section className="mt-7">
    <div className="flex flex-col gap-3 border-b border-[var(--n3-line)] pb-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Lead Property Partners</p>
        <h2 className="mt-1 text-lg font-medium text-[var(--n3-text-light)]">Asignación territorial y seguimiento</h2>
      </div>
      <div className="flex flex-wrap gap-2">
        {data.permissions.canCreateValuation ? <Link href={valuationHref} className="border border-[var(--n3-line)] px-3 py-2 text-xs font-semibold hover:border-[#d7332b]">Valorizar propiedad</Link> : null}
        {data.currentListing?.url ? <a href={data.currentListing.url} target="_blank" rel="noreferrer" className="border border-[var(--n3-line)] px-3 py-2 text-xs font-semibold">Abrir publicación</a> : null}
      </div>
    </div>

    <div className="grid gap-px bg-[var(--n3-line)] sm:grid-cols-3">
      <div className="bg-[var(--n3-deep)] p-4">
        <span className="text-xs text-[var(--n3-text-muted)]">Barrio</span>
        <strong className="mt-2 block text-base">{data.neighborhood?.name || 'Sin barrio canónico'}</strong>
        <p className="mt-1 text-xs text-[var(--n3-text-muted)]">{data.neighborhood?.assignment_status || 'No asignado territorialmente'}</p>
      </div>
      <div className="bg-[var(--n3-deep)] p-4">
        <span className="text-xs text-[var(--n3-text-muted)]">Dirección responsable</span>
        <strong className="mt-2 block text-base">{director?.full_name || 'Sin director/a asignado'}</strong>
        <p className="mt-1 text-xs text-[var(--n3-text-muted)]">{director ? `${director.role === 'director' ? 'Director/a' : 'Subdirector/a'} · ${director.office_name}` : 'Se asigna por barrio, no por ejecutiva.'}</p>
      </div>
      <div className="bg-[var(--n3-deep)] p-4">
        <span className="text-xs text-[var(--n3-text-muted)]">Estado lead</span>
        <strong className="mt-2 block text-base">{data.lead ? STATUS_LABELS[data.lead.status] || data.lead.status : 'Aún no creado'}</strong>
        <p className="mt-1 text-xs text-[var(--n3-text-muted)]">{data.lead ? `Último seguimiento ${date(data.lead.last_follow_up_at)}` : data.publishedLeadEligible ? 'Publicación elegible para prospección.' : 'Publicación no elegible actualmente.'}</p>
      </div>
    </div>

    {actionable ? <div className="mt-5 grid gap-5 lg:grid-cols-2">
      <div className="border-t border-[var(--n3-line)] pt-4">
        <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">01 · Territorio</p>
        <label className="mt-3 block text-xs text-[var(--n3-text-muted)]">Director/a por barrio
          <select value={directorKey} onChange={e=>setDirectorKey(e.target.value)} className="mt-1 min-h-11 w-full border border-[var(--n3-line)] bg-black px-3 text-sm">
            <option value="">Seleccionar</option>
            {data.directors.map(item=><option key={item.director_key} value={item.director_key}>{item.full_name} · {item.office_name}</option>)}
          </select>
        </label>
        <button disabled={!directorKey||saving||!data.neighborhood} onClick={()=>void mutate({action:'assign_director',directorKey,reason:'Asignación territorial desde Property 360'})} className="mt-3 min-h-10 border border-[var(--n3-line)] px-4 text-xs font-semibold disabled:opacity-40">Guardar director/a del barrio</button>
        <p className="mt-2 text-[11px] leading-4 text-[var(--n3-text-muted)]">La asignación es territorial: las propiedades publicadas, vinculadas y elegibles de este barrio se convierten en leads con esa dirección responsable. No se asignan por ejecutiva.</p>
        {canCreateLead ? <button disabled={saving} onClick={()=>void mutate({action:'create_lead',priority:'normal'})} className="ml-2 mt-3 min-h-10 bg-[#d7332b] px-4 text-xs font-semibold text-white disabled:opacity-40">Crear lead PP</button> : null}
      </div>

      <div className="border-t border-[var(--n3-line)] pt-4">
        <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">02 · Seguimiento</p>
        {data.lead ? <>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-[var(--n3-text-muted)]">Estado
              <select value={status} onChange={e=>setStatus(e.target.value)} className="mt-1 min-h-11 w-full border border-[var(--n3-line)] bg-black px-3 text-sm">
                {Object.entries(STATUS_LABELS).filter(([key])=>key!=='new').map(([key,label])=><option key={key} value={key}>{label}</option>)}
              </select>
            </label>
            <label className="text-xs text-[var(--n3-text-muted)]">Próximo seguimiento
              <input type="datetime-local" value={nextFollowUpAt} onChange={e=>setNextFollowUpAt(e.target.value)} className="mt-1 min-h-11 w-full border border-[var(--n3-line)] bg-black px-3 text-sm" />
            </label>
          </div>
          <label className="mt-3 block text-xs text-[var(--n3-text-muted)]">Nota auditada
            <textarea value={note} onChange={e=>setNote(e.target.value)} rows={3} maxLength={1000} className="mt-1 w-full border border-[var(--n3-line)] bg-black px-3 py-2 text-sm" placeholder="Resultado del contacto, hipótesis, próximo paso…" />
          </label>
          <button disabled={saving} onClick={()=>void mutate({action:'follow_up',status,note,nextFollowUpAt:nextFollowUpAt ? new Date(nextFollowUpAt).toISOString() : null})} className="mt-3 min-h-10 bg-[#d7332b] px-4 text-xs font-semibold text-white disabled:opacity-40">Registrar seguimiento</button>
        </> : <p className="mt-3 text-sm text-[var(--n3-text-muted)]">Al confirmar el director/a del barrio, el sistema crea automáticamente los leads elegibles y habilita seguimiento y rendimiento.</p>}
      </div>
    </div> : null}

    {data.lead ? <div className="mt-6 border-t border-[var(--n3-line)] pt-4">
      <div className="flex items-end justify-between"><div><p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">03 · Auditoría</p><h3 className="mt-1 text-sm font-semibold">Últimos eventos</h3></div><span className="text-xs text-[var(--n3-text-muted)]">{data.events.length} eventos</span></div>
      <div className="mt-2 divide-y divide-[var(--n3-line)]">
        {timeline.map(event=><div key={event.id} className="grid gap-1 py-3 sm:grid-cols-[160px_180px_1fr]">
          <span className="text-xs text-[var(--n3-text-muted)]">{date(event.occurred_at)}</span>
          <span className="text-xs font-semibold">{EVENT_LABELS[event.event_type] || event.event_type}</span>
          <span className="text-xs text-[var(--n3-text-muted)]">{event.note || (event.to_status ? `→ ${STATUS_LABELS[event.to_status] || event.to_status}` : 'Evento auditado')}</span>
        </div>)}
      </div>
    </div> : null}

    {message ? <p className="mt-4 text-xs text-[var(--n3-text-muted)]">{message}</p> : null}
  </section>
}
