'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CalendarDays, CheckCircle2, Plus, RefreshCw } from 'lucide-react'

type Task = {
  id:string
  milestone_code:string|null
  title:string
  status:string
  due_date:string|null
  assignedProfile:{full_name:string|null}|null
}

type SaleCase = {
  id:string
  operation_key:string|null
  office:string
  seller_name:string|null
  property_address:string|null
  property_type:string|null
  amount_uf:number|null
  sale_date:string
  expected_handover_date:string
  status:string
  tasks:Task[]
}

type Payload = {
  cases:SaleCase[]
  offices:string[]
  permissions:{canCreate:boolean}
  scope:{kind:string;office:string|null}
}

type View = 'agenda'|'calendar'|'alerts'

const MS_DAY=86400000
const WEEK_WIDTH=118
const LABEL_WIDTH=300

function parseDay(value:string){ return new Date(value+'T12:00:00Z') }
function dayDiff(a:string,b:string){ return Math.round((parseDay(b).getTime()-parseDay(a).getTime())/MS_DAY) }
function addDays(value:string,days:number){ const date=parseDay(value); date.setUTCDate(date.getUTCDate()+days); return date.toISOString().slice(0,10) }
function todayKey(){ return new Date().toLocaleDateString('en-CA',{timeZone:'America/Santiago'}) }
function pretty(value:string|null|undefined){
  if(!value) return '—'
  return new Intl.DateTimeFormat('es-CL',{day:'2-digit',month:'short',year:'numeric',timeZone:'UTC'}).format(parseDay(value))
}
function short(value:string){ return new Intl.DateTimeFormat('es-CL',{day:'2-digit',month:'short',timeZone:'UTC'}).format(parseDay(value)) }
function statusLabel(value:string){ return value==='done'?'Completada':value==='in_progress'?'En curso':value==='dismissed'?'Descartada':'Pendiente' }
function progress(tasks:Task[]){ if(!tasks.length) return 0; return Math.round(tasks.filter((task)=>task.status==='done'||task.status==='dismissed').length/tasks.length*100) }

export function SaleHandoverCalendar(){
  const [data,setData]=useState<Payload|null>(null)
  const [loading,setLoading]=useState(true)
  const [failed,setFailed]=useState(false)
  const [view,setView]=useState<View>('agenda')
  const [office,setOffice]=useState('all')
  const [createOpen,setCreateOpen]=useState(false)
  const [saving,setSaving]=useState(false)
  const [message,setMessage]=useState('')
  const initialToday=todayKey()
  const [form,setForm]=useState({
    office:'',
    saleDate:initialToday,
    expectedHandoverDate:addDays(initialToday,120),
    propertyAddress:'',
    propertyType:'Casa',
    sellerName:'',
    amountUf:'',
    operationKey:'',
  })

  async function load(){
    setLoading(true); setFailed(false)
    try{
      const response=await fetch('/api/management/sales-calendar',{cache:'no-store'})
      if(!response.ok) throw new Error('LOAD_FAILED')
      const payload=await response.json() as Payload
      setData(payload)
      setForm((current)=>current.office?current:{...current,office:payload.scope.office||payload.offices[0]||''})
    }catch{ setFailed(true) } finally { setLoading(false) }
  }

  useEffect(()=>{ void load() },[])

  const cases=useMemo(()=>data?.cases.filter((item)=>office==='all'||item.office===office)??[],[data,office])
  const allTasks=useMemo(()=>cases.flatMap((item)=>item.tasks.map((task)=>({task,saleCase:item}))),[cases])
  const today=todayKey()
  const fourteen=addDays(today,14)
  const thirty=addDays(today,30)

  const agenda=useMemo(()=>allTasks
    .filter(({task})=>task.due_date&&task.status!=='done'&&task.status!=='dismissed'&&task.due_date>=today&&task.due_date<=fourteen)
    .sort((a,b)=>(a.task.due_date||'').localeCompare(b.task.due_date||'')),[allTasks,today,fourteen])

  const overdue=useMemo(()=>allTasks
    .filter(({task})=>task.due_date&&task.status!=='done'&&task.status!=='dismissed'&&task.due_date<today)
    .sort((a,b)=>(a.task.due_date||'').localeCompare(b.task.due_date||'')),[allTasks,today])

  const upcomingHandovers=cases.filter((item)=>item.expected_handover_date>=today&&item.expected_handover_date<=thirty).length

  const timeline=useMemo(()=>{
    const anchor=cases.length?[today,...cases.map((item)=>item.sale_date)].sort()[0]:today
    const start=addDays(anchor,-7)
    const endCandidates=[addDays(today,126),...cases.map((item)=>item.expected_handover_date)]
    const end=endCandidates.sort().at(-1)||addDays(today,126)
    const days=Math.max(126,dayDiff(start,end)+14)
    const weeks=Math.ceil(days/7)
    return {start,weeks,labels:Array.from({length:weeks},(_,index)=>addDays(start,index*7)),width:weeks*WEEK_WIDTH}
  },[cases,today])

  async function createCase(){
    if(!form.office||!form.saleDate) return
    setSaving(true); setMessage('')
    try{
      const response=await fetch('/api/management/sales-calendar',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({...form,amountUf:form.amountUf?Number(form.amountUf):null}),
      })
      const payload=await response.json()
      if(!response.ok) throw new Error(payload.error||'No fue posible crear el calendario.')
      setMessage('Venta incorporada. Se generaron 8 hitos operativos hasta la entrega.')
      setCreateOpen(false)
      await load()
    }catch(error){ setMessage(error instanceof Error?error.message:'No fue posible crear el calendario.') }
    finally{ setSaving(false) }
  }

  if(loading) return <div className="py-8 text-sm text-[var(--n3-text-muted)]">Cargando calendario venta → entrega…</div>
  if(failed||!data) return <div className="border border-[#d7332b] p-4 text-sm"><p>No fue posible cargar el calendario.</p><button onClick={()=>void load()} className="mt-3 inline-flex min-h-10 items-center gap-2 border border-[var(--n3-line)] px-3"><RefreshCw size={14}/> Reintentar</button></div>

  return <div>
    <div className="flex flex-col gap-4 border-b border-[var(--n3-line)] pb-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Venta → entrega</p>
        <h2 className="mt-1 text-xl font-semibold">Calendario operacional postventa</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--n3-text-muted)]">Desde el cierre comercial hasta la entrega esperada. La plantilla inicial usa 4 meses y concentra los primeros documentos entre el día 4 y el día 7; cada tarea sigue siendo editable en Gestión.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <select value={office} onChange={(event)=>setOffice(event.target.value)} className="min-h-10 border border-[var(--n3-line)] bg-[var(--n3-deep)] px-3 text-sm">
          <option value="all">Todas las oficinas</option>
          {data.offices.map((item)=><option key={item} value={item}>{item}</option>)}
        </select>
        {data.permissions.canCreate?<button onClick={()=>setCreateOpen((value)=>!value)} className="inline-flex min-h-10 items-center gap-2 bg-[var(--primary)] px-4 text-sm font-semibold text-white"><Plus size={14}/>{createOpen?'Cerrar':'Nueva venta'}</button>:null}
      </div>
    </div>

    <div className="grid border-b border-[var(--n3-line)] sm:grid-cols-4">
      <div className="border-b border-[var(--n3-line)] p-4 sm:border-b-0 sm:border-r"><p className="text-[10px] uppercase text-[var(--n3-text-muted)]">En proceso</p><p className="mt-1 text-2xl font-semibold">{cases.length}</p></div>
      <div className="border-b border-[var(--n3-line)] p-4 sm:border-b-0 sm:border-r"><p className="text-[10px] uppercase text-[var(--n3-text-muted)]">Próximos 14 días</p><p className="mt-1 text-2xl font-semibold">{agenda.length}</p></div>
      <div className="border-b border-[var(--n3-line)] p-4 sm:border-b-0 sm:border-r"><p className="text-[10px] uppercase text-[var(--n3-text-muted)]">Vencidas</p><p className={'mt-1 text-2xl font-semibold '+(overdue.length?'text-[#ff8d87]':'')}>{overdue.length}</p></div>
      <div className="p-4"><p className="text-[10px] uppercase text-[var(--n3-text-muted)]">Entregas 30 días</p><p className="mt-1 text-2xl font-semibold">{upcomingHandovers}</p></div>
    </div>

    {createOpen?<div className="grid gap-3 border-b border-[var(--n3-line)] py-5 md:grid-cols-4">
      <label className="text-xs text-[var(--n3-text-muted)]">Oficina<select value={form.office} disabled={Boolean(data.scope.office)} onChange={(e)=>setForm({...form,office:e.target.value})} className="mt-1 min-h-10 w-full border border-[var(--n3-line)] bg-[var(--n3-deep)] px-3 text-sm text-[var(--n3-text-light)]">{data.offices.map((item)=><option key={item}>{item}</option>)}</select></label>
      <label className="text-xs text-[var(--n3-text-muted)]">Fecha venta<input type="date" value={form.saleDate} onChange={(e)=>setForm({...form,saleDate:e.target.value,expectedHandoverDate:addDays(e.target.value,120)})} className="mt-1 min-h-10 w-full border border-[var(--n3-line)] bg-[var(--n3-deep)] px-3 text-sm"/></label>
      <label className="text-xs text-[var(--n3-text-muted)]">Entrega esperada<input type="date" value={form.expectedHandoverDate} onChange={(e)=>setForm({...form,expectedHandoverDate:e.target.value})} className="mt-1 min-h-10 w-full border border-[var(--n3-line)] bg-[var(--n3-deep)] px-3 text-sm"/></label>
      <label className="text-xs text-[var(--n3-text-muted)]">Tipo<select value={form.propertyType} onChange={(e)=>setForm({...form,propertyType:e.target.value})} className="mt-1 min-h-10 w-full border border-[var(--n3-line)] bg-[var(--n3-deep)] px-3 text-sm"><option>Casa</option><option>Departamento</option><option>Otro</option></select></label>
      <label className="text-xs text-[var(--n3-text-muted)] md:col-span-2">Propiedad / dirección<input value={form.propertyAddress} onChange={(e)=>setForm({...form,propertyAddress:e.target.value})} placeholder="Dirección o referencia" className="mt-1 min-h-10 w-full border border-[var(--n3-line)] bg-[var(--n3-deep)] px-3 text-sm"/></label>
      <label className="text-xs text-[var(--n3-text-muted)]">Vendedor/a<input value={form.sellerName} onChange={(e)=>setForm({...form,sellerName:e.target.value})} className="mt-1 min-h-10 w-full border border-[var(--n3-line)] bg-[var(--n3-deep)] px-3 text-sm"/></label>
      <label className="text-xs text-[var(--n3-text-muted)]">UF<input type="number" min="0" value={form.amountUf} onChange={(e)=>setForm({...form,amountUf:e.target.value})} className="mt-1 min-h-10 w-full border border-[var(--n3-line)] bg-[var(--n3-deep)] px-3 text-sm"/></label>
      <div className="md:col-span-4 flex items-center gap-3"><button disabled={saving} onClick={()=>void createCase()} className="min-h-10 bg-[var(--primary)] px-4 text-sm font-semibold text-white disabled:opacity-50">{saving?'Creando…':'Crear calendario de 4 meses'}</button><span className="text-xs text-[var(--n3-text-muted)]">Genera 8 hitos editables. No altera datos históricos ni el cierre comercial.</span></div>
    </div>:null}

    {message?<p className="border-b border-[var(--n3-line)] py-3 text-sm">{message}</p>:null}

    <div className="flex items-center gap-1 border-b border-[var(--n3-line)] py-3">
      <button onClick={()=>setView('agenda')} className={'min-h-9 px-3 text-xs '+(view==='agenda'?'bg-white/[0.08]':'text-[var(--n3-text-muted)]')}>Agenda 14 días</button>
      <button onClick={()=>setView('calendar')} className={'min-h-9 px-3 text-xs '+(view==='calendar'?'bg-white/[0.08]':'text-[var(--n3-text-muted)]')}>Calendario</button>
      <button onClick={()=>setView('alerts')} className={'min-h-9 px-3 text-xs '+(view==='alerts'?'bg-white/[0.08]':'text-[var(--n3-text-muted)]')}>Alertas{overdue.length?' · '+overdue.length:''}</button>
    </div>

    {view==='agenda'?<div className="divide-y divide-[var(--n3-line)]">
      {agenda.map(({task,saleCase})=><div key={task.id} className="grid gap-2 py-4 sm:grid-cols-[130px_minmax(0,1fr)_180px] sm:items-center">
        <div><p className="text-sm font-semibold">{pretty(task.due_date)}</p><p className="text-[10px] uppercase text-[var(--n3-text-muted)]">{saleCase.office}</p></div>
        <div><p className="text-sm font-medium">{task.title}</p><p className="mt-1 text-xs text-[var(--n3-text-muted)]">{saleCase.property_address||saleCase.operation_key||'Venta sin dirección'} · {saleCase.seller_name||'Vendedor no informado'}</p></div>
        <div className="text-xs text-[var(--n3-text-muted)]">{task.assignedProfile?.full_name||'Sin responsable'} · {statusLabel(task.status)}</div>
      </div>)}
      {!agenda.length?<p className="py-7 text-sm text-[var(--n3-text-muted)]">No hay hitos pendientes durante los próximos 14 días.</p>:null}
    </div>:null}

    {view==='alerts'?<div className="divide-y divide-[var(--n3-line)]">
      {overdue.map(({task,saleCase})=><div key={task.id} className="flex items-start gap-3 py-4"><AlertTriangle size={15} className="mt-0.5 shrink-0 text-[#ff8d87]"/><div><p className="text-sm font-medium">{task.title} · {saleCase.property_address||saleCase.operation_key||'Venta'}</p><p className="mt-1 text-xs text-[var(--n3-text-muted)]">Venció {pretty(task.due_date)} · {saleCase.office} · {task.assignedProfile?.full_name||'sin responsable'}</p></div></div>)}
      {!overdue.length?<div className="flex items-center gap-2 py-7 text-sm text-[var(--n3-text-muted)]"><CheckCircle2 size={15}/> Sin hitos vencidos.</div>:null}
    </div>:null}

    {view==='calendar'?<div className="overflow-x-auto border-b border-[var(--n3-line)]">
      <div style={{minWidth:LABEL_WIDTH+timeline.width}}>
        <div className="flex border-b border-[var(--n3-line)]">
          <div style={{width:LABEL_WIDTH}} className="shrink-0 px-3 py-2 text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Venta / avance</div>
          <div className="relative flex" style={{width:timeline.width}}>
            {timeline.labels.map((week)=><div key={week} style={{width:WEEK_WIDTH}} className="shrink-0 border-l border-[var(--n3-line)] px-2 py-2 text-[10px] uppercase text-[var(--n3-text-muted)]">{short(week)}</div>)}
          </div>
        </div>
        {cases.map((saleCase)=>{
          const left=Math.max(0,dayDiff(timeline.start,saleCase.sale_date))/7*WEEK_WIDTH
          const width=Math.max(18,dayDiff(saleCase.sale_date,saleCase.expected_handover_date)/7*WEEK_WIDTH)
          const pct=progress(saleCase.tasks)
          return <div key={saleCase.id} className="flex min-h-20 border-b border-[var(--n3-line)]">
            <div style={{width:LABEL_WIDTH}} className="shrink-0 px-3 py-3">
              <div className="flex items-center justify-between gap-2"><strong className="truncate text-sm">{saleCase.property_address||saleCase.operation_key||'Venta'}</strong><span className="text-xs tabular-nums text-[var(--n3-text-muted)]">{pct}%</span></div>
              <p className="mt-1 truncate text-xs text-[var(--n3-text-muted)]">{saleCase.office} · {saleCase.seller_name||'sin vendedor'} · entrega {pretty(saleCase.expected_handover_date)}</p>
            </div>
            <div className="relative" style={{width:timeline.width}}>
              {timeline.labels.map((week)=><div key={week} className="absolute inset-y-0 border-l border-[var(--n3-line)]" style={{left:dayDiff(timeline.start,week)/7*WEEK_WIDTH}} />)}
              <div className="absolute top-8 h-2 bg-white/10" style={{left,width}}><div className="h-full bg-[var(--primary)]" style={{width:Math.min(100,pct)+'%'}} /></div>
              {saleCase.tasks.map((task)=>{
                if(!task.due_date) return null
                const x=dayDiff(timeline.start,task.due_date)/7*WEEK_WIDTH
                const done=task.status==='done'||task.status==='dismissed'
                const late=!done&&task.due_date<today
                return <div key={task.id} title={task.title+' · '+pretty(task.due_date)} className={'absolute top-[27px] h-4 w-4 -translate-x-1/2 rounded-full border-2 border-[var(--n3-deep)] '+(done?'bg-[#78d59a]':late?'bg-[#ff766f]':'bg-[#f0c96a]')} style={{left:x}} />
              })}
            </div>
          </div>
        })}
        {!cases.length?<p className="px-3 py-8 text-sm text-[var(--n3-text-muted)]">Aún no hay ventas activas con calendario postventa.</p>:null}
      </div>
    </div>:null}

    <div className="mt-4 flex flex-wrap items-center gap-5 text-[11px] text-[var(--n3-text-muted)]">
      <span className="inline-flex items-center gap-1"><CalendarDays size={12}/> horizonte inicial: 4 meses</span>
      <span>amarillo: pendiente · rojo: vencido · verde: completado</span>
    </div>
  </div>
}
