'use client'

import { useEffect, useState } from 'react'

type Schedule = { id:string; name:string; report_type:string; cadence:string; day_of_month:number; recipients:string[]|null; next_run_at:string|null; active:boolean }
type Entity = { id:string; name:string; entity_type:string }
type Approval = { status:string; ready:boolean; label:string }
type Payload = { schedules:Schedule[]; entities:Entity[]; reportingApproval:Approval; error?:string }

export default function ManagementSchedulesPage() {
  const [schedules,setSchedules] = useState<Schedule[]>([])
  const [entities,setEntities] = useState<Entity[]>([])
  const [approval,setApproval] = useState<Approval>({ status:'pending', ready:false, label:'Calendario, destinatarios y reglas de reportes' })
  const [message,setMessage] = useState('')
  const [form,setForm] = useState({ name:'Reporte mensual ejecutivo', reportType:'management', entityId:'', cadence:'monthly', dayOfMonth:'1', recipients:'' })

  async function load() {
    const response = await fetch('/api/management/schedules',{cache:'no-store'})
    const data = await response.json() as Payload
    if (response.ok) { setSchedules(data.schedules ?? []); setEntities(data.entities ?? []); setApproval(data.reportingApproval) } else setMessage(data.error ?? 'No fue posible cargar la programación.')
  }
  useEffect(() => { void load() }, [])

  async function save(event:React.FormEvent) {
    event.preventDefault(); setMessage('')
    if (!approval.ready) { setMessage('Programación bloqueada hasta recibir aprobación formal de calendario, destinatarios y reglas de reporting.'); return }
    const response = await fetch('/api/management/schedules',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({ ...form, dayOfMonth:Number(form.dayOfMonth), recipients:form.recipients.split(/[;,\n]/).map(item=>item.trim()).filter(Boolean) })})
    const data = await response.json() as { schedule?:Schedule; error?:string }
    setMessage(response.ok && data.schedule ? `Programación creada: ${data.schedule.name}.` : data.error ?? 'No fue posible crear la programación.')
    if (response.ok) await load()
  }

  return <div className="space-y-7">
    <header><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--n3-text-muted)]">Módulo III · Automatización</p><h1 className="mt-2 text-3xl font-semibold">Programación y distribución</h1><p className="mt-2 text-sm text-[var(--n3-text-muted)]">Configuración de reportes recurrentes, ámbito y destinatarios registrados.</p></header>
    {!approval.ready?<div className="border border-[#a77a22]/50 bg-[#a77a22]/5 p-4 text-sm"><strong className="text-[#f0c96a]">Configuración bloqueada por aprobación del Cliente.</strong><p className="mt-1 text-[var(--n3-text-muted)]">{approval.label}. Estado contractual: {approval.status}. La plataforma no creará calendarios ni destinatarios definitivos mientras esta dependencia siga pendiente.</p></div>:null}
    <form onSubmit={save} className="grid gap-4 border border-[var(--n3-line)] p-5 lg:grid-cols-3">
      <label className="text-sm">Nombre<input disabled={!approval.ready} value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className="mt-2 w-full border border-[var(--n3-line)] bg-transparent p-3 disabled:opacity-40" /></label>
      <label className="text-sm">Tipo<select disabled={!approval.ready} value={form.reportType} onChange={e=>setForm({...form,reportType:e.target.value})} className="mt-2 w-full border border-[var(--n3-line)] bg-[var(--n3-black)] p-3 disabled:opacity-40"><option value="management">Gestión</option><option value="executive">Ejecutivo</option><option value="director">Dirección</option></select></label>
      <label className="text-sm">Entidad<select disabled={!approval.ready} value={form.entityId} onChange={e=>setForm({...form,entityId:e.target.value})} className="mt-2 w-full border border-[var(--n3-line)] bg-[var(--n3-black)] p-3 disabled:opacity-40"><option value="">Consolidado</option>{entities.map(entity=><option key={entity.id} value={entity.id}>{entity.name} · {entity.entity_type}</option>)}</select></label>
      <label className="text-sm">Frecuencia<select disabled={!approval.ready} value={form.cadence} onChange={e=>setForm({...form,cadence:e.target.value})} className="mt-2 w-full border border-[var(--n3-line)] bg-[var(--n3-black)] p-3 disabled:opacity-40"><option value="monthly">Mensual</option></select></label>
      <label className="text-sm">Día del mes<input disabled={!approval.ready} type="number" min="1" max="28" value={form.dayOfMonth} onChange={e=>setForm({...form,dayOfMonth:e.target.value})} className="mt-2 w-full border border-[var(--n3-line)] bg-transparent p-3 disabled:opacity-40" /></label>
      <label className="text-sm">Destinatarios<input disabled={!approval.ready} value={form.recipients} onChange={e=>setForm({...form,recipients:e.target.value})} placeholder="correo1@dominio.cl; correo2@dominio.cl" className="mt-2 w-full border border-[var(--n3-line)] bg-transparent p-3 disabled:opacity-40" /></label>
      <div className="lg:col-span-3"><button disabled={!approval.ready} className="border border-[#d7332b] px-5 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-40">Crear programación</button></div>
    </form>
    {message ? <div className="border border-[var(--n3-line)] p-4 text-sm">{message}</div> : null}
    <section><h2 className="mb-3 text-lg font-semibold">Programaciones registradas</h2><div className="overflow-x-auto border border-[var(--n3-line)]"><table className="min-w-[900px] w-full text-sm"><thead><tr>{['Nombre','Tipo','Frecuencia','Día','Destinatarios','Próxima ejecución','Estado'].map(item=><th key={item} className="p-3 text-left text-xs uppercase text-[var(--n3-text-muted)]">{item}</th>)}</tr></thead><tbody>{schedules.map(item=><tr key={item.id} className="border-t border-[var(--n3-line)]"><td className="p-3">{item.name}</td><td className="p-3">{item.report_type}</td><td className="p-3">{item.cadence}</td><td className="p-3">{item.day_of_month}</td><td className="p-3">{Array.isArray(item.recipients)?item.recipients.length:0}</td><td className="p-3">{item.next_run_at?new Date(item.next_run_at).toLocaleString('es-CL'):'Pendiente'}</td><td className="p-3">{item.active?'Activa':'Inactiva'}</td></tr>)}{!schedules.length?<tr><td colSpan={7} className="p-5 text-sm text-[var(--n3-text-muted)]">No hay programaciones registradas.</td></tr>:null}</tbody></table></div></section>
  </div>
}
