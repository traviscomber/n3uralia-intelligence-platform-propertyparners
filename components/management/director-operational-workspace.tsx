import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { requirePageCapability } from '@/lib/access-guards'

type Valuation = { id:string; status:string; address:string|null; requested_by:string; updated_at:string; version_number:number|null }
type Task = { id:string; title:string; status:string; priority:string|null; assigned_to:string|null; due_date:string|null }
type Profile = { id:string; full_name:string|null; role:string|null }

function date(value:string|null){
  if(!value) return 'Sin fecha'
  const parsed=new Date(value)
  return Number.isNaN(parsed.getTime())?'Fecha inválida':parsed.toLocaleDateString('es-CL')
}

export async function DirectorOperationalWorkspace(){
  const scope=await requirePageCapability('management.office.read')
  const supabase=await createClient()
  const visible=scope.visibleProfileIds

  const [valuationsResult,tasksResult,profilesResult]=await Promise.all([
    visible.length ? supabase.from('valuation_cases').select('id,status,address,requested_by,updated_at,version_number').in('requested_by',visible).in('status',['review','draft']).order('updated_at',{ascending:false}).limit(30) : Promise.resolve({data:[],error:null}),
    supabase.from('management_tasks').select('id,title,status,priority,assigned_to,due_date').eq('office',scope.team).in('status',['open','in_progress']).order('due_date',{ascending:true,nullsFirst:false}).limit(30),
    visible.length ? supabase.from('profiles').select('id,full_name,role').in('id',visible) : Promise.resolve({data:[],error:null}),
  ])

  const valuations=(valuationsResult.data??[]) as Valuation[]
  const tasks=(tasksResult.data??[]) as Task[]
  const profiles=(profilesResult.data??[]) as Profile[]
  const profileMap=Object.fromEntries(profiles.map((profile)=>[profile.id,profile]))
  const errors=[valuationsResult.error,tasksResult.error,profilesResult.error].filter(Boolean).map((item)=>item?.message)

  return <section className="mx-auto max-w-7xl space-y-5 px-4 pb-8 lg:px-8">
    <div className="border-b border-[var(--n3-line)] pb-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#ff766f]">Flujo operativo de oficina</p>
      <h2 className="mt-2 text-2xl font-semibold">Valorizaciones, responsables y tareas</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--n3-text-muted)]">La cola se limita a {scope.team||'la oficina autorizada'} y a los perfiles visibles resueltos por el alcance central.</p>
    </div>
    {errors.length?<div role="alert" className="border border-[#d7332b] p-4 text-sm text-[#ff766f]">No fue posible cargar parte del flujo: {errors.join(' · ')}</div>:null}
    <div className="grid gap-5 xl:grid-cols-2">
      <div className="border border-[var(--n3-line)] bg-[#0c1111]">
        <div className="border-b border-[var(--n3-line)] p-4"><h3 className="font-semibold">Cola de valorizaciones</h3><p className="mt-1 text-xs text-[var(--n3-text-muted)]">Borradores y casos en revisión de la oficina.</p></div>
        <div className="divide-y divide-[var(--n3-line)]">{valuations.map((item)=>{
          const owner=profileMap[item.requested_by]
          return <article key={item.id} className="p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div><strong>{item.address||'Propiedad sin dirección'}</strong><p className="mt-1 text-xs text-[var(--n3-text-muted)]">Responsable: {owner?.full_name||'Perfil sin nombre'} · v{item.version_number||1} · {date(item.updated_at)}</p><span className="mt-2 inline-block border border-[var(--n3-line)] px-2 py-1 text-[10px] uppercase">{item.status}</span></div>
              <div className="flex flex-wrap gap-2">
                <Link href={`/dashboard/valuations/${item.id}`} className="inline-flex min-h-11 items-center border border-[var(--n3-line)] px-3 py-2 text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--n3-teal)]">Abrir expediente</Link>
                <Link href={`/dashboard/valuations/${item.id}/report`} className="inline-flex min-h-11 items-center border border-[var(--n3-teal)] px-3 py-2 text-xs text-[var(--n3-teal)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--n3-teal)]">Ver reporte</Link>
              </div>
            </div>
          </article>
        })}{!valuations.length?<p className="p-5 text-sm text-[var(--n3-text-muted)]">No hay valorizaciones pendientes dentro del alcance de oficina.</p>:null}</div>
      </div>
      <div className="border border-[var(--n3-line)] bg-[#0c1111]">
        <div className="border-b border-[var(--n3-line)] p-4"><h3 className="font-semibold">Responsables y seguimiento</h3><p className="mt-1 text-xs text-[var(--n3-text-muted)]">Tareas abiertas vinculadas a integrantes de la oficina.</p></div>
        <div className="divide-y divide-[var(--n3-line)]">{tasks.map((task)=>{
          const owner=task.assigned_to?profileMap[task.assigned_to]:null
          return <article key={task.id} className="p-4"><div className="flex items-start justify-between gap-3"><div><strong>{task.title}</strong><p className="mt-1 text-xs text-[var(--n3-text-muted)]">{owner?.full_name||'Sin responsable'} · vence {date(task.due_date)} · prioridad {task.priority||'n/d'}</p></div><span className="border border-[var(--n3-line)] px-2 py-1 text-[10px] uppercase">{task.status}</span></div></article>
        })}{!tasks.length?<p className="p-5 text-sm text-[var(--n3-text-muted)]">No existen tareas abiertas en la oficina.</p>:null}</div>
      </div>
    </div>
  </section>
}
