'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChevronRight, Database, Save, Target } from 'lucide-react'
import { PublicErrorNotice } from '@/components/feedback/public-error-notice'
import { OperationalState } from '@/components/ui/operational-state'
import { DataStatusBar, MetricStrip, WorkspaceHeader, WorkspaceShell } from '@/components/ui/workspace'
import { getPublicErrorMessage } from '@/lib/public-error'

type Entity = { id: string; name: string; entity_type: string }
type Definition = { code: string; label: string; unit: string; methodology: string }
type Goal = { id:string; entity_id:string; metric_code:string; period_start:string; period_end:string; target_value:number; management_entities?:{name:string}; management_metric_definitions?:{label:string;unit:string} }
type Rule = { id:string; code:string; label:string; metric_code:string; comparison:string; threshold:number; severity:string; scope_type:string; active:boolean }
type Alert = { id:string; title:string; detail:string; severity:string; status:string; created_at:string; management_entities?:{name:string} }
type Payload = { entities:Entity[]; definitions:Definition[]; goals:Goal[]; rules:Rule[]; alerts:Alert[] }
type Feedback = { kind:'success'|'error'; message:string } | null

const monthBounds = (month:string) => { const start=`${month}-01`; const date=new Date(`${start}T00:00:00Z`); date.setUTCMonth(date.getUTCMonth()+1); date.setUTCDate(0); return {start,end:date.toISOString().slice(0,10)} }
const formatMonth = (value:string) => { const [year,month]=value.slice(0,7).split('-').map(Number); return year&&month ? new Intl.DateTimeFormat('es-CL',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(Date.UTC(year,month-1,1))) : value }

export default function ManagementAdminPage(){
  const currentMonth=new Date().toISOString().slice(0,7)
  const [data,setData]=useState<Payload|null>(null)
  const [loading,setLoading]=useState(true)
  const [saving,setSaving]=useState(false)
  const [feedback,setFeedback]=useState<Feedback>(null)
  const [selectedMonth,setSelectedMonth]=useState(currentMonth)
  const [goal,setGoal]=useState({entityId:'',metricCode:'sales',month:currentMonth,targetValue:'',sourceName:'Meta aprobada'})
  const [metric,setMetric]=useState({entityId:'',metricCode:'sales',month:currentMonth,value:'',sourceName:'Carga administrativa',sourceReference:'',qualityStatus:'provisional'})
  const [rule,setRule]=useState({code:'',label:'',metricCode:'sales',comparison:'lt',threshold:'',severity:'warning',scopeType:'all',responsibleRole:'director'})

  async function load(options:{background?:boolean}={}){
    const background=options.background===true
    if(!background){setLoading(true);setFeedback(null)}
    try{
      const response=await fetch('/api/management/admin',{cache:'no-store'})
      const payload=await response.json() as Payload
      if(!response.ok) throw new Error('LOAD_FAILED')
      setData(payload)
      const first=payload.entities?.[0]?.id||''
      setGoal(value=>({...value,entityId:value.entityId||first}))
      setMetric(value=>({...value,entityId:value.entityId||first}))
      return true
    }catch{
      if(!background){setData(null);setFeedback({kind:'error',message:getPublicErrorMessage('DATA_UNAVAILABLE')})}
      return false
    }finally{
      if(!background)setLoading(false)
    }
  }
  useEffect(()=>{void load()},[])
  useEffect(()=>{setGoal(value=>({...value,month:selectedMonth}));setMetric(value=>({...value,month:selectedMonth}))},[selectedMonth])

  async function post(body:unknown){
    if(saving)return
    setSaving(true);setFeedback(null)
    try{
      const response=await fetch('/api/management/admin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
      if(!response.ok)throw new Error('SAVE_FAILED')
      const refreshed=await load({background:true})
      setFeedback(refreshed
        ? {kind:'success',message:'Cambios guardados.'}
        : {kind:'error',message:'Los cambios se guardaron, pero no fue posible actualizar la vista. Recarga antes de continuar.'})
    }catch{
      setFeedback({kind:'error',message:getPublicErrorMessage('SAVE_FAILED')})
    }finally{setSaving(false)}
  }

  async function updateAlert(id:string,action:string){
    if(saving)return
    let notes=''
    if(action==='resolve'||action==='dismiss'){
      const prompted=window.prompt('Notas')
      if(prompted===null)return
      notes=prompted.trim()
    }
    setSaving(true);setFeedback(null)
    try{
      const response=await fetch('/api/management/admin',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,action,notes})})
      if(!response.ok)throw new Error('ALERT_UPDATE_FAILED')
      const refreshed=await load({background:true})
      setFeedback(refreshed
        ? {kind:'success',message:'Alerta actualizada.'}
        : {kind:'error',message:'La alerta se actualizó, pero no fue posible refrescar la vista. Recarga antes de continuar.'})
    }catch{
      setFeedback({kind:'error',message:getPublicErrorMessage('REQUEST_FAILED')})
    }finally{setSaving(false)}
  }

  const goalsForMonth=useMemo(()=>data?.goals.filter(item=>item.period_start.slice(0,7)===selectedMonth)??[],[data,selectedMonth])
  const openAlerts=useMemo(()=>data?.alerts.filter(alert=>['open','acknowledged'].includes(alert.status))??[],[data])
  const sortedAlerts=useMemo(()=>[...openAlerts].sort((a,b)=>Number(b.severity==='critical')-Number(a.severity==='critical')||new Date(b.created_at).getTime()-new Date(a.created_at).getTime()),[openAlerts])
  const criticalAlerts=sortedAlerts.filter(alert=>alert.severity==='critical').length
  const activeRules=data?.rules.filter(item=>item.active).length??0
  const coverage=data?.entities.length ? Math.round(goalsForMonth.length/data.entities.length*100) : 0
  const visibleAlerts=sortedAlerts.slice(0,3)
  const remainingAlerts=sortedAlerts.slice(3)

  if(loading)return <WorkspaceShell><OperationalState kind="loading" title="Cargando gestión" description="Consultando metas y excepciones vigentes." /></WorkspaceShell>
  if(!data)return <WorkspaceShell>{feedback?.kind==='error'?<PublicErrorNotice message={feedback.message}/>:<OperationalState kind="error" title="Sin acceso a gestión" description="No fue posible consultar la información."/>}</WorkspaceShell>

  const dataStatus=goalsForMonth.length===0?'blocked':coverage<100?'partial':'ready'
  const decisionSummary=criticalAlerts>0?`${criticalAlerts} alerta${criticalAlerts===1?' crítica requiere':'s críticas requieren'} decisión`:openAlerts.length>0?`${openAlerts.length} alerta${openAlerts.length===1?' requiere':'s requieren'} seguimiento`:coverage<100?`Cobertura de metas incompleta: ${coverage}%`:'Sin excepciones abiertas para este período'

  const renderAlert=(alert:Alert)=><article key={alert.id} className="grid gap-3 py-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${alert.severity==='critical'?'text-[var(--destructive)]':'text-[var(--chart-4)]'}`}>{alert.severity==='critical'?'Crítica':'Atención'}</span>
        {alert.status==='acknowledged'?<span className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">En revisión</span>:null}
      </div>
      <h3 className="mt-1 text-sm font-medium">{alert.title}</h3>
      <p className="mt-1 text-xs leading-5 text-[var(--n3-text-muted)]">{alert.management_entities?.name??'Entidad'}{alert.detail?` · ${alert.detail}`:''}</p>
    </div>
    <div className="flex flex-wrap gap-2" aria-busy={saving}>
      {alert.status==='open'?<button disabled={saving} onClick={()=>void updateAlert(alert.id,'acknowledge')} className="min-h-11 border border-[var(--n3-line)] px-4 text-xs font-medium disabled:opacity-40">Revisar</button>:null}
      <button disabled={saving} onClick={()=>void updateAlert(alert.id,'resolve')} className="min-h-11 border border-[#78d59a]/35 px-4 text-xs font-medium text-[#78d59a] disabled:opacity-40">Resolver</button>
      <button disabled={saving} onClick={()=>void updateAlert(alert.id,'dismiss')} className="min-h-11 border border-[var(--n3-line)] px-4 text-xs text-[var(--n3-text-muted)] disabled:opacity-40">Descartar</button>
    </div>
  </article>

  return <WorkspaceShell>
    <WorkspaceHeader eyebrow="Gestión" title="Qué requiere decisión" controls={<div><label htmlFor="goals-period" className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Período</label><input id="goals-period" type="month" value={selectedMonth} onChange={event=>setSelectedMonth(event.target.value)} className="mt-1 block min-h-11 border border-[var(--n3-line)] bg-[var(--n3-deep)] px-3 text-base font-semibold"/></div>} meta={`${formatMonth(selectedMonth)} · ${decisionSummary}`} />

    {feedback?.kind==='error'?<div className="mt-4"><PublicErrorNotice message={feedback.message}/></div>:null}
    {feedback?.kind==='success'?<div role="status" aria-live="polite" className="mt-4 border border-[#78d59a]/40 px-4 py-3 text-sm text-[#78d59a]">{feedback.message}</div>:null}

    <MetricStrip items={[
      {label:'Críticas',value:criticalAlerts,tone:criticalAlerts?'danger':'success'},
      {label:'Abiertas',value:openAlerts.length,tone:openAlerts.length?'warning':'success'},
      {label:'Cobertura metas',value:`${coverage}%`,tone:coverage===100?'success':coverage>0?'warning':'danger'},
      {label:'Reglas activas',value:activeRules},
    ]}/>

    <section className="mt-7 max-w-5xl">
      <div className="flex items-center justify-between border-b border-[var(--n3-line)] pb-2"><h2 className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Prioridades</h2><span className="text-xs text-[var(--n3-text-muted)]">{openAlerts.length}</span></div>
      {visibleAlerts.length?<div className="divide-y divide-[var(--n3-line)]">{visibleAlerts.map(renderAlert)}</div>:<OperationalState compact kind="success" title="Sin alertas abiertas" description="No existen excepciones pendientes de decisión."/>}
      {remainingAlerts.length?<details className="border-t border-[var(--n3-line)] pt-3"><summary className="min-h-11 cursor-pointer py-3 text-xs font-medium text-[var(--n3-text-muted)] hover:text-[var(--n3-text-light)]">Ver {remainingAlerts.length} alerta{remainingAlerts.length===1?'':'s'} adicional{remainingAlerts.length===1?'':'es'}</summary><div className="divide-y divide-[var(--n3-line)]">{remainingAlerts.map(renderAlert)}</div></details>:null}
    </section>

    <section className="mt-8 max-w-5xl">
      <div className="flex items-center justify-between border-b border-[var(--n3-line)] pb-2"><h2 className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Metas vigentes</h2><span className="text-xs text-[var(--n3-text-muted)]">{goalsForMonth.length}/{data.entities.length} entidades</span></div>
      {goalsForMonth.length?<div className="divide-y divide-[var(--n3-line)]">{goalsForMonth.map(item=><div key={item.id} className="grid gap-1 py-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-center sm:gap-4"><span className="text-sm font-medium">{item.management_entities?.name??item.entity_id}</span><span className="text-xs text-[var(--n3-text-muted)]">{item.management_metric_definitions?.label??item.metric_code}</span><strong className="text-sm tabular-nums">{Number(item.target_value).toLocaleString('es-CL')}</strong></div>)}</div>:<OperationalState compact kind="empty" title="Sin metas para este período" description="Define sólo las metas aprobadas que deban gobernar alertas y reportes."/>}

      <details className="border-t border-[var(--n3-line)] pt-3"><summary className="min-h-11 cursor-pointer py-3 text-xs font-medium text-[var(--n3-text-muted)] hover:text-[var(--n3-text-light)]">Editar metas</summary><div className="grid gap-3 border-y border-[var(--n3-line)] py-4 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_180px_auto]"><label className="sr-only" htmlFor="goal-entity">Entidad</label><select id="goal-entity" value={goal.entityId} onChange={event=>setGoal({...goal,entityId:event.target.value})} className="min-h-11 border border-[var(--n3-line)] bg-[var(--n3-deep)] px-3 text-sm">{data.entities.map(entity=><option key={entity.id} value={entity.id}>{entity.name}</option>)}</select><label className="sr-only" htmlFor="goal-metric">Métrica</label><select id="goal-metric" value={goal.metricCode} onChange={event=>setGoal({...goal,metricCode:event.target.value})} className="min-h-11 border border-[var(--n3-line)] bg-[var(--n3-deep)] px-3 text-sm">{data.definitions.map(definition=><option key={definition.code} value={definition.code}>{definition.label}</option>)}</select><label className="sr-only" htmlFor="goal-value">Nueva meta</label><input id="goal-value" type="number" value={goal.targetValue} onChange={event=>setGoal({...goal,targetValue:event.target.value})} placeholder="Nueva meta" className="min-h-11 border border-[var(--n3-line)] bg-[var(--n3-deep)] px-3 text-sm"/><button disabled={saving||!goal.entityId||!goal.targetValue} onClick={()=>{const bounds=monthBounds(selectedMonth);void post({type:'goal',...goal,month:selectedMonth,periodStart:bounds.start,periodEnd:bounds.end})}} className="inline-flex min-h-11 items-center justify-center gap-2 bg-[var(--primary)] px-5 text-sm font-semibold disabled:opacity-40"><Save size={15}/>{saving?'Guardando…':'Guardar meta'}</button></div></details>
    </section>

    <details className="mt-9 max-w-5xl border-t border-[var(--n3-line)] pt-4"><summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-sm text-[var(--n3-text-muted)]"><span>Configuración avanzada</span><ChevronRight size={16}/></summary><div className="mt-5 space-y-8">
      <section><h2 className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Registrar evidencia</h2><div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4"><label className="sr-only" htmlFor="metric-entity">Entidad de evidencia</label><select id="metric-entity" value={metric.entityId} onChange={event=>setMetric({...metric,entityId:event.target.value})} className="min-h-11 border border-[var(--n3-line)] bg-[var(--n3-deep)] px-3 text-sm">{data.entities.map(entity=><option key={entity.id} value={entity.id}>{entity.name}</option>)}</select><label className="sr-only" htmlFor="metric-code">Métrica de evidencia</label><select id="metric-code" value={metric.metricCode} onChange={event=>setMetric({...metric,metricCode:event.target.value})} className="min-h-11 border border-[var(--n3-line)] bg-[var(--n3-deep)] px-3 text-sm">{data.definitions.map(definition=><option key={definition.code} value={definition.code}>{definition.label}</option>)}</select><label className="sr-only" htmlFor="metric-value">Valor de evidencia</label><input id="metric-value" type="number" value={metric.value} onChange={event=>setMetric({...metric,value:event.target.value})} placeholder="Valor" className="min-h-11 border border-[var(--n3-line)] bg-[var(--n3-deep)] px-3 text-sm"/><label className="sr-only" htmlFor="metric-reference">Referencia de fuente</label><input id="metric-reference" value={metric.sourceReference} onChange={event=>setMetric({...metric,sourceReference:event.target.value})} placeholder="Referencia" className="min-h-11 border border-[var(--n3-line)] bg-[var(--n3-deep)] px-3 text-sm"/><label className="sr-only" htmlFor="metric-quality">Calidad de evidencia</label><select id="metric-quality" value={metric.qualityStatus} onChange={event=>setMetric({...metric,qualityStatus:event.target.value})} className="min-h-11 border border-[var(--n3-line)] bg-[var(--n3-deep)] px-3 text-sm"><option value="provisional">Provisional</option><option value="verified">Verificada</option></select><button disabled={saving||!metric.value} onClick={()=>{const bounds=monthBounds(selectedMonth);void post({type:'metric',...metric,month:selectedMonth,periodStart:bounds.start,periodEnd:bounds.end})}} className="inline-flex min-h-11 items-center justify-center gap-2 border border-[var(--n3-line)] px-4 text-sm disabled:opacity-40"><Database size={15}/>Registrar</button></div></section>
      <section><h2 className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Reglas de alerta</h2><div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4"><label className="sr-only" htmlFor="rule-code">Código</label><input id="rule-code" value={rule.code} onChange={event=>setRule({...rule,code:event.target.value})} placeholder="Código" className="min-h-11 border border-[var(--n3-line)] bg-[var(--n3-deep)] px-3 text-sm"/><label className="sr-only" htmlFor="rule-label">Nombre</label><input id="rule-label" value={rule.label} onChange={event=>setRule({...rule,label:event.target.value})} placeholder="Nombre" className="min-h-11 border border-[var(--n3-line)] bg-[var(--n3-deep)] px-3 text-sm"/><label className="sr-only" htmlFor="rule-metric">Métrica</label><select id="rule-metric" value={rule.metricCode} onChange={event=>setRule({...rule,metricCode:event.target.value})} className="min-h-11 border border-[var(--n3-line)] bg-[var(--n3-deep)] px-3 text-sm">{data.definitions.map(definition=><option key={definition.code} value={definition.code}>{definition.label}</option>)}</select><label className="sr-only" htmlFor="rule-comparison">Comparación</label><select id="rule-comparison" value={rule.comparison} onChange={event=>setRule({...rule,comparison:event.target.value})} className="min-h-11 border border-[var(--n3-line)] bg-[var(--n3-deep)] px-3 text-sm"><option value="lt">Menor que</option><option value="lte">Menor o igual</option><option value="gt">Mayor que</option><option value="gte">Mayor o igual</option><option value="drop_pct">Caída %</option><option value="increase_pct">Aumento %</option></select><label className="sr-only" htmlFor="rule-threshold">Umbral</label><input id="rule-threshold" type="number" value={rule.threshold} onChange={event=>setRule({...rule,threshold:event.target.value})} placeholder="Umbral" className="min-h-11 border border-[var(--n3-line)] bg-[var(--n3-deep)] px-3 text-sm"/><label className="sr-only" htmlFor="rule-severity">Severidad</label><select id="rule-severity" value={rule.severity} onChange={event=>setRule({...rule,severity:event.target.value})} className="min-h-11 border border-[var(--n3-line)] bg-[var(--n3-deep)] px-3 text-sm"><option value="info">Informativa</option><option value="warning">Advertencia</option><option value="critical">Crítica</option></select><label className="sr-only" htmlFor="rule-scope">Alcance</label><select id="rule-scope" value={rule.scopeType} onChange={event=>setRule({...rule,scopeType:event.target.value})} className="min-h-11 border border-[var(--n3-line)] bg-[var(--n3-deep)] px-3 text-sm"><option value="all">Todos</option><option value="company">Compañía</option><option value="office">Oficina</option><option value="team">Equipo</option><option value="partner">Partner</option><option value="agent">Agente</option></select><button disabled={saving||!rule.code||!rule.label||!rule.threshold} onClick={()=>void post({type:'rule',...rule})} className="inline-flex min-h-11 items-center justify-center gap-2 border border-[var(--n3-line)] px-4 text-sm disabled:opacity-40"><Target size={15}/>Guardar regla</button></div><div className="mt-4 divide-y divide-[var(--n3-line)] border-t border-[var(--n3-line)]">{data.rules.map(item=><div key={item.id} className="grid gap-2 py-3 text-sm sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center sm:gap-4"><span>{item.label}</span><span className="tabular-nums text-[var(--n3-text-muted)]">Umbral {item.threshold}</span><span className={item.active?'text-[#78d59a]':'text-[var(--n3-text-muted)]'}>{item.active?'Activa':'Inactiva'}</span></div>)}</div></section>
    </div></details>

    <details className="mt-6 max-w-5xl"><summary className="min-h-11 cursor-pointer py-3 text-xs font-medium text-[var(--n3-text-muted)] hover:text-[var(--n3-text-light)]">Estado de configuración</summary><DataStatusBar cutoff={selectedMonth} coverage={`${goalsForMonth.length} metas para ${data.entities.length} entidades · ${coverage}%`} issues={criticalAlerts} status={dataStatus}/></details>
  </WorkspaceShell>
}
