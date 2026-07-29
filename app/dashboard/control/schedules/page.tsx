'use client'

import { useEffect, useState } from 'react'

export default function ManagementSchedulesPage() {
  const [schedules,setSchedules] = useState<any[]>([])
  const [entities,setEntities] = useState<any[]>([])
  const [message,setMessage] = useState('')
  const [form,setForm] = useState({ name:'Reporte mensual ejecutivo', reportType:'monthly', entityId:'', cadence:'monthly', dayOfMonth:'1', recipients:'' })

  async function load() {
    const response = await fetch('/api/management/schedules',{cache:'no-store'})
    const data = await response.json()
    if (response.ok) { setSchedules(data.schedules ?? []); setEntities(data.entities ?? []) } else setMessage(data.error)
  }
  useEffect(() => { void load() }, [])

  async function save(event:React.FormEvent) {
    event.preventDefault(); setMessage('')
    const response = await fetch('/api/management/schedules',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({ ...form, dayOfMonth:Number(form.dayOfMonth), recipients:form.recipients.split(/[;,\n]/).map(item=>item.trim()).filter(Boolean) })})
    const data = await response.json()
    setMessage(response.ok ? `Programación creada: ${data.schedule.name}.` : data.error)
    if (response.ok) await load()
  }

  return <div className="space-y-7">
    <header><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--n3-text-muted)]">Módulo III · Automatización</p><h1 className="mt-2 text-3xl font-semibold">Programación y distribución</h1><p className="mt-2 text-sm text-[var(--n3-text-muted)]">Configuración de reportes recurrentes, ámbito y destinatarios registrados.</p></header>
    <form onSubmit={save} className="grid gap-4 border border-[var(--n3-line)] p-5 lg:grid-cols-3">
      <label className="text-sm">Nombre<input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className="mt-2 w-full border border-[var(--n3-line)] bg-transparent p-3" /></label>
      <label className="text-sm">Tipo<select value={form.reportType} onChange={e=>setForm({...form,reportType:e.target.value})} className="mt-2 w-full border border-[var(--n3-line)] bg-[var(--n3-black)] p-3"><option value="monthly">Mensual</option><option value="cumulative">Acumulado</option><option value="executive">Ejecutivo</option><option value="office">Oficina</option><option value="partner">Partner</option></select></label>
      <label className="text-sm">Entidad<select value={form.entityId} onChange={e=>setForm({...form,entityId:e.target.value})} className="mt-2 w-full border border-[var(--n3-line)] bg-[var(--n3-black)] p-3"><option value="">Consolidado</option>{entities.map(entity=><option key={entity.id} value={entity.id}>{entity.name} · {entity.entity_type}</option>)}</select></label>
      <label className="text-sm">Frecuencia<select value={form.cadence} onChange={e=>setForm({...form,cadence:e.target.value})} className="mt-2 w-full border border-[var(--n3-line)] bg-[var(--n3-black)] p-3"><option value="monthly">Mensual</option><option value="quarterly">Trimestral</option><option value="yearly">Anual</option></select></label>
      <label className="text-sm">Día del mes<input type="number" min="1" max="28" value={form.dayOfMonth} onChange={e=>setForm({...form,dayOfMonth:e.target.value})} className="mt-2 w-full border border-[var(--n3-line)] bg-transparent p-3" /></label>
      <label className="text-sm">Destinatarios<input value={form.recipients} onChange={e=>setForm({...form,recipients:e.target.value})} placeholder="correo1@dominio.cl; correo2@dominio.cl" className="mt-2 w-full border border-[var(--n3-line)] bg-transparent p-3" /></label>
      <div className="lg:col-span-3"><button className="border border-[#d7332b] px-5 py-3 text-sm">Crear programación</button></div>
    </form>
    {message ? <div className="border border-[var(--n3-line)] p-4 text-sm">{message}</div> : null}
    <section><h2 className="mb-3 text-lg font-semibold">Programaciones activas</h2><div className="overflow-x-auto border border-[var(--n3-line)]"><table className="min-w-[900px] w-full text-sm"><thead><tr>{['Nombre','Tipo','Frecuencia','Día','Destinatarios','Próxima ejecución','Estado'].map(item=><th key={item} className="p-3 text-left text-xs uppercase text-[var(--n3-text-muted)]">{item}</th>)}</tr></thead><tbody>{schedules.map(item=><tr key={item.id} className="border-t border-[var(--n3-line)]"><td className="p-3">{item.name}</td><td className="p-3">{item.report_type}</td><td className="p-3">{item.cadence}</td><td className="p-3">{item.day_of_month}</td><td className="p-3">{Array.isArray(item.recipients)?item.recipients.length:0}</td><td className="p-3">{item.next_run_at?new Date(item.next_run_at).toLocaleString('es-CL'):'Pendiente'}</td><td className="p-3">{item.active?'Activa':'Inactiva'}</td></tr>)}</tbody></table></div></section>
  </div>
}
