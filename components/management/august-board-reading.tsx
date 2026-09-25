'use client'

export type AugustBoardEntity = {
  name:string
  slug?:string
  classification:string
  sale:{closings:number;closingTarget:number;closingCompliancePct:number;salesUf:number;salesUfTarget:number;salesUfCompliancePct:number}
  ytd:{closings:number;closingTarget:number;closingCompliancePct:number;salesUf:number;salesUfTarget:number;salesUfCompliancePct:number}
  scores:{management:number;portfolio:number;followUp:number;conversion:number}
  indicators:{
    portfolio:{stock:number;stockTarget:number;stockCompliancePct:number;requirements:number;requirementsExpected:number;requirementsCompliancePct:number;pricing:{lte105:number;lte110:number;gt110:number;score:number}}
    followUp:{classified:number;active:number;activeA:number;stale90:number;stale90Pct:number;staleA15:number;staleA15Pct:number}
    conversion:{realizedVisits:number;visitTarget:number;visitTargetPct:number;scheduledVisits:number;visitExecutionPct:number;tc6mPct:number}
  }
  subscores:{
    portfolio:{metaPortfolio:number;requirementsByType:number;priceQuality:number}
    followUp:{classifiedLeads:number;managed90:number;managedA15:number}
    conversion:{visitsToTarget:number;visitExecution:number;tc6m:number}
  }
  scoreEvolution:{management:number[];portfolio:number[];followUp:number[];conversion:number[]}
}

const MONTHS=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago']
const nf0=new Intl.NumberFormat('es-CL',{maximumFractionDigits:0})
const nf1=new Intl.NumberFormat('es-CL',{minimumFractionDigits:1,maximumFractionDigits:1})
const n=(v:number,d=0)=>d?nf1.format(v):nf0.format(v)
const pct=(v:number)=>`${nf1.format(v)}%`
const signed=(v:number)=>`${v>0?'+':''}${n(v,1)}`
const gap=(actual:number,target:number)=>actual-target
const direction=(delta:number)=>delta>0?'sube':delta<0?'baja':'se mantiene'

function scoreTone(value:number){
  if(value>=70)return 'text-[#78d59a]'
  if(value>=50)return 'text-[#f0c96a]'
  return 'text-[#ff8d87]'
}
function scoreDot(value:number){
  if(value>=70)return 'bg-[#78d59a]'
  if(value>=50)return 'bg-[#f0c96a]'
  return 'bg-[#ff8d87]'
}
function scoreBand(value:number){
  if(value>=70)return 'En estándar'
  if(value>=50)return 'A mejorar'
  return 'Crítico'
}
function complianceTone(value:number){
  if(value>=100)return 'text-[#78d59a]'
  if(value>=90)return 'text-[#f0c96a]'
  return 'text-[#ff8d87]'
}

function Sparkline({values,label}:{values:number[];label:string}){
  const width=176
  const height=46
  const min=Math.min(...values)
  const max=Math.max(...values)
  const spread=Math.max(1,max-min)
  const points=values.map((value,index)=>{
    const x=(index/(values.length-1))*width
    const y=height-4-((value-min)/spread)*(height-8)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  return <div className="mt-3">
    <svg role="img" aria-label={label} viewBox={`0 0 ${width} ${height}`} className="h-11 w-full overflow-visible text-[var(--n3-text-muted)]">
      <line x1="0" y1={height-4} x2={width} y2={height-4} stroke="currentColor" strokeOpacity=".16"/>
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke"/>
      {values.map((value,index)=>{
        const x=(index/(values.length-1))*width
        const y=height-4-((value-min)/spread)*(height-8)
        return <circle key={index} cx={x} cy={y} r={index===values.length-1?2.8:1.5} fill="currentColor" opacity={index===values.length-1?1:.5}/>
      })}
    </svg>
    <div className="mt-1 flex justify-between text-[9px] uppercase tracking-[.08em] text-[var(--n3-text-muted)]">
      {MONTHS.map(month=><span key={month}>{month}</span>)}
    </div>
  </div>
}

function ScoreDimension({label,weight,value,values}:{label:string;weight:string;value:number;values:number[]}){
  const previous=values.at(-2) ?? value
  const delta=value-previous
  const explanation=delta===0
    ? `${label} se mantiene en ${n(value,1)} puntos frente a julio. Su peso en Calidad Gestión es ${weight}.`
    : `${label} ${direction(delta)} ${n(Math.abs(delta),1)} puntos frente a julio, hasta ${n(value,1)}. Su peso en Calidad Gestión es ${weight}.`
  return <article className="border-t border-[var(--n3-line)] py-5">
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="flex items-center gap-2">
          <span className={`h-1.5 w-1.5 rounded-full ${scoreDot(value)}`}/>
          <p className="text-[10px] uppercase tracking-[.14em] text-[var(--n3-text-muted)]">{label} · {weight}</p>
        </div>
        <strong className={`mt-2 block text-3xl font-semibold tabular-nums ${scoreTone(value)}`}>{n(value,1)}</strong>
      </div>
      <div className="text-right">
        <p className="text-xs text-[var(--n3-text-muted)]">{scoreBand(value)}</p>
        <p className={`mt-1 text-xs tabular-nums ${delta<0?'text-[#ff8d87]':delta>0?'text-[#78d59a]':'text-[var(--n3-text-muted)]'}`}>{signed(delta)} vs Jul</p>
      </div>
    </div>
    <Sparkline values={values} label={`Evolución Ene-Ago de ${label}`}/>
    <p className="mt-3 text-xs leading-5 text-[var(--n3-text-muted)]"><span className="font-medium text-[var(--n3-text-light)]">Lectura:</span> {explanation} Clasificación: {scoreBand(value)}.</p>
  </article>
}

function Lever({label,evidence,score}:{label:string;evidence:string;score:number}){
  return <div className="grid min-h-20 grid-cols-[minmax(0,1fr)_auto] gap-4 border-t border-[var(--n3-line)] py-3">
    <div className="min-w-0">
      <p className="text-sm font-medium text-[var(--n3-text-light)]">{label}</p>
      <p className="mt-1 text-xs leading-5 text-[var(--n3-text-muted)]">{evidence}</p>
    </div>
    <div className="text-right">
      <strong className={`text-xl tabular-nums ${scoreTone(score)}`}>{n(score,1)}</strong>
      <p className="mt-1 text-[10px] uppercase tracking-[.1em] text-[var(--n3-text-muted)]">{scoreBand(score)}</p>
    </div>
  </div>
}

export function AugustBoardReading({entity,sourceFile}:{entity:AugustBoardEntity;sourceFile:string}){
  const managementDelta=entity.scoreEvolution.management.at(-1)!-entity.scoreEvolution.management.at(-2)!
  const weakest=[
    {label:'Cartera',value:entity.scores.portfolio},
    {label:'Seguimiento',value:entity.scores.followUp},
    {label:'Conversión',value:entity.scores.conversion},
  ].sort((a,b)=>a.value-b.value)[0]
  const closingGap=gap(entity.sale.closings,entity.sale.closingTarget)
  const ufGap=gap(entity.sale.salesUf,entity.sale.salesUfTarget)
  const ytdClosingGap=gap(entity.ytd.closings,entity.ytd.closingTarget)
  const ytdUfGap=gap(entity.ytd.salesUf,entity.ytd.salesUfTarget)

  return <section className="mt-6">
    <header className="relative overflow-hidden border-y border-[var(--n3-line)] bg-[var(--n3-deep)] px-4 py-5 sm:px-6 sm:py-7">
      <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 w-px bg-[var(--n3-line)] sm:right-[30%]"/>
      <div className="relative grid gap-7 lg:grid-cols-[minmax(0,1.45fr)_minmax(260px,.55fr)] lg:items-end">
        <div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-[.18em] text-[var(--n3-teal-soft)]">SYS / CONTROL DE GESTIÓN</p>
            <span className="text-[10px] uppercase tracking-[.14em] text-[var(--n3-text-muted)]">Cierre Agosto 2026</span>
          </div>
          <h2 className="mt-3 max-w-3xl text-[clamp(2rem,5vw,4.35rem)] font-medium leading-[.95] tracking-[-.045em] text-[var(--n3-text-light)]">{entity.name}</h2>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--n3-text-muted)]">Mismos datos y fórmulas del Directorio. Ordenados para leer primero resultado, desviación y causa.</p>

          <div className="mt-7 flex flex-wrap items-end gap-x-8 gap-y-5">
            <div>
              <p className="text-[10px] uppercase tracking-[.14em] text-[var(--n3-text-muted)]">Venta Agosto</p>
              <div className="mt-1 flex items-baseline gap-2">
                <strong className="text-[clamp(3.2rem,8vw,6rem)] font-semibold leading-none tracking-[-.06em] tabular-nums">{n(entity.sale.closings,1)}</strong>
                <span className="text-sm text-[var(--n3-text-muted)]">cierres</span>
              </div>
            </div>
            <div className="pb-1">
              <p className="text-[10px] uppercase tracking-[.14em] text-[var(--n3-text-muted)]">UF Agosto</p>
              <strong className="mt-2 block text-xl font-semibold tabular-nums">{n(entity.sale.salesUf)} UF</strong>
            </div>
            <div className="pb-1">
              <p className="text-[10px] uppercase tracking-[.14em] text-[var(--n3-text-muted)]">Cumplimiento</p>
              <strong className={`mt-2 block text-xl font-semibold tabular-nums ${complianceTone(entity.sale.closingCompliancePct)}`}>{pct(entity.sale.closingCompliancePct)}</strong>
            </div>
          </div>
        </div>

        <div className="border-t border-[var(--n3-line)] pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
          <p className="text-[10px] uppercase tracking-[.14em] text-[var(--n3-text-muted)]">Calidad Gestión</p>
          <div className="mt-2 flex items-end justify-between gap-4">
            <strong className={`text-5xl font-semibold tracking-[-.04em] tabular-nums ${scoreTone(entity.scores.management)}`}>{n(entity.scores.management,1)}</strong>
            <span className="pb-1 text-xs text-[var(--n3-text-muted)]">{entity.classification}</span>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-[var(--n3-line)] pt-3 text-xs">
            <span className="text-[var(--n3-text-muted)]">vs julio</span>
            <strong className={managementDelta<0?'text-[#ff8d87]':managementDelta>0?'text-[#78d59a]':'text-[var(--n3-text-muted)]'}>{signed(managementDelta)} pts</strong>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="text-[var(--n3-text-muted)]">Principal brecha</span>
            <strong className={scoreTone(weakest.value)}>{weakest.label} · {n(weakest.value,1)}</strong>
          </div>
        </div>
      </div>
    </header>

    <section className="grid gap-px border-b border-[var(--n3-line)] bg-[var(--n3-line)] md:grid-cols-3">
      <div className="bg-[var(--n3-black)] px-4 py-4 sm:px-5">
        <p className="text-[10px] uppercase tracking-[.14em] text-[var(--n3-text-muted)]">Meta mensual</p>
        <p className="mt-2 text-lg font-semibold tabular-nums">{n(entity.sale.closingTarget,1)} cierres · {n(entity.sale.salesUfTarget)} UF</p>
        <p className="mt-1 text-xs text-[var(--n3-text-muted)]">{pct(entity.sale.closingCompliancePct)} cierres · {pct(entity.sale.salesUfCompliancePct)} UF</p>
      </div>
      <div className="bg-[var(--n3-black)] px-4 py-4 sm:px-5">
        <p className="text-[10px] uppercase tracking-[.14em] text-[var(--n3-text-muted)]">Acumulado Ene–Ago</p>
        <p className="mt-2 text-lg font-semibold tabular-nums">{n(entity.ytd.closings,1)} cierres · {n(entity.ytd.salesUf)} UF</p>
        <p className="mt-1 text-xs text-[var(--n3-text-muted)]">{pct(entity.ytd.closingCompliancePct)} cierres · {pct(entity.ytd.salesUfCompliancePct)} UF</p>
      </div>
      <div className="bg-[var(--n3-black)] px-4 py-4 sm:px-5">
        <p className="text-[10px] uppercase tracking-[.14em] text-[var(--n3-text-muted)]">Fuente</p>
        <p className="mt-2 text-sm font-medium">{sourceFile}</p>
        <p className="mt-1 text-xs text-[var(--n3-text-muted)]">Sin reinterpretar fórmulas ni umbrales</p>
      </div>
    </section>

    <section className="mt-7 border-y border-[var(--n3-line)] py-5">
      <p className="text-[10px] uppercase tracking-[.17em] text-[var(--n3-text-muted)]">01 / Lectura ejecutiva</p>
      <h3 className="mt-1 text-xl font-medium">Qué significan los resultados</h3>
      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div>
          <p className="text-[10px] uppercase tracking-[.12em] text-[var(--n3-text-muted)]">Cierres del mes</p>
          <p className="mt-2 text-sm leading-6 text-[var(--n3-text-light)]">{n(entity.sale.closings,1)} de {n(entity.sale.closingTarget,1)} cierres: {pct(entity.sale.closingCompliancePct)} de la meta.</p>
          <p className="mt-1 text-xs leading-5 text-[var(--n3-text-muted)]">{closingGap===0?'Meta exacta.':closingGap>0?`${n(closingGap,1)} cierres sobre la meta.`:`Faltaron ${n(Math.abs(closingGap),1)} cierres para la meta.`}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[.12em] text-[var(--n3-text-muted)]">UF del mes</p>
          <p className="mt-2 text-sm leading-6 text-[var(--n3-text-light)]">{n(entity.sale.salesUf)} UF versus {n(entity.sale.salesUfTarget)} UF: {pct(entity.sale.salesUfCompliancePct)}.</p>
          <p className="mt-1 text-xs leading-5 text-[var(--n3-text-muted)]">{ufGap===0?'Meta exacta.':ufGap>0?`${n(ufGap)} UF sobre la meta.`:`Brecha de ${n(Math.abs(ufGap))} UF bajo la meta.`}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[.12em] text-[var(--n3-text-muted)]">Calidad de gestión</p>
          <p className="mt-2 text-sm leading-6 text-[var(--n3-text-light)]">{n(entity.scores.management,1)} puntos, {scoreBand(entity.scores.management).toLowerCase()}.</p>
          <p className="mt-1 text-xs leading-5 text-[var(--n3-text-muted)]">{managementDelta===0?'Sin variación frente a julio.':`${direction(managementDelta)} ${n(Math.abs(managementDelta),1)} puntos frente a julio.`} La principal brecha es {weakest.label.toLowerCase()} ({n(weakest.value,1)}).</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[.12em] text-[var(--n3-text-muted)]">Acumulado Ene–Ago</p>
          <p className="mt-2 text-sm leading-6 text-[var(--n3-text-light)]">{n(entity.ytd.closings,1)} cierres y {n(entity.ytd.salesUf)} UF.</p>
          <p className="mt-1 text-xs leading-5 text-[var(--n3-text-muted)]">{ytdClosingGap===0?'Cierres acumulados en meta.':ytdClosingGap>0?`${n(ytdClosingGap,1)} cierres sobre meta acumulada.`:`Brecha acumulada de ${n(Math.abs(ytdClosingGap),1)} cierres.`} {ytdUfGap===0?'UF acumuladas en meta.':ytdUfGap>0?`${n(ytdUfGap)} UF sobre meta acumulada.`:`Brecha acumulada de ${n(Math.abs(ytdUfGap))} UF.`}</p>
        </div>
      </div>
      <p className="mt-4 border-t border-[var(--n3-line)] pt-3 text-xs leading-5 text-[var(--n3-text-muted)]">Lectura descriptiva calculada sólo desde los valores y metas del Directorio. No cambia fórmulas, ponderaciones ni umbrales.</p>
    </section>

    <div className="mt-9 grid gap-8 lg:grid-cols-[.72fr_1.28fr]">
      <section>
        <p className="text-[10px] uppercase tracking-[.17em] text-[var(--n3-text-muted)]">02 / Evolución</p>
        <h3 className="mt-1 text-xl font-medium">Qué cambió</h3>
        <div className="mt-4">
          <ScoreDimension label="Cartera" weight="40%" value={entity.scores.portfolio} values={entity.scoreEvolution.portfolio}/>
          <ScoreDimension label="Seguimiento" weight="30%" value={entity.scores.followUp} values={entity.scoreEvolution.followUp}/>
          <ScoreDimension label="Conversión" weight="30%" value={entity.scores.conversion} values={entity.scoreEvolution.conversion}/>
        </div>
      </section>

      <section>
        <p className="text-[10px] uppercase tracking-[.17em] text-[var(--n3-text-muted)]">03 / Diagnóstico</p>
        <h3 className="mt-1 text-xl font-medium">Qué explica el resultado</h3>
        <div className="mt-4 grid gap-6 xl:grid-cols-3">
          <div>
            <div className="flex items-end justify-between border-b border-[var(--n3-line)] pb-3"><span className="text-sm font-semibold">Cartera</span><strong className={`text-xl ${scoreTone(entity.scores.portfolio)}`}>{n(entity.scores.portfolio,1)}</strong></div>
            <Lever label="Meta cartera" evidence={`${n(entity.indicators.portfolio.stock)} / ${n(entity.indicators.portfolio.stockTarget)} propiedades`} score={entity.subscores.portfolio.metaPortfolio}/>
            <Lever label="Reqs x Tipo Prop" evidence={`${n(entity.indicators.portfolio.requirements)} / ${n(entity.indicators.portfolio.requirementsExpected)} esperados`} score={entity.subscores.portfolio.requirementsByType}/>
            <Lever label="Calidad Precio" evidence={`≤1.05: ${n(entity.indicators.portfolio.pricing.lte105)} · ≤1.10: ${n(entity.indicators.portfolio.pricing.lte110)} · >1.10: ${n(entity.indicators.portfolio.pricing.gt110)}`} score={entity.subscores.portfolio.priceQuality}/>
          </div>
          <div>
            <div className="flex items-end justify-between border-b border-[var(--n3-line)] pb-3"><span className="text-sm font-semibold">Seguimiento</span><strong className={`text-xl ${scoreTone(entity.scores.followUp)}`}>{n(entity.scores.followUp,1)}</strong></div>
            <Lever label="% Leads Clasif" evidence={`${n(entity.indicators.followUp.classified)} / ${n(entity.indicators.followUp.active)} activos`} score={entity.subscores.followUp.classifiedLeads}/>
            <Lever label="% Leads c-g90" evidence={`${n(entity.indicators.followUp.stale90)} sin gestión 90d · ${pct(entity.indicators.followUp.stale90Pct)}`} score={entity.subscores.followUp.managed90}/>
            <Lever label="%LeadsA c-g15" evidence={`${n(entity.indicators.followUp.staleA15)} / ${n(entity.indicators.followUp.activeA)} · ${pct(entity.indicators.followUp.staleA15Pct)} sin gestión`} score={entity.subscores.followUp.managedA15}/>
          </div>
          <div>
            <div className="flex items-end justify-between border-b border-[var(--n3-line)] pb-3"><span className="text-sm font-semibold">Conversión</span><strong className={`text-xl ${scoreTone(entity.scores.conversion)}`}>{n(entity.scores.conversion,1)}</strong></div>
            <Lever label="Vis Realiz/Meta" evidence={`${n(entity.indicators.conversion.realizedVisits)} / ${n(entity.indicators.conversion.visitTarget)}`} score={entity.subscores.conversion.visitsToTarget}/>
            <Lever label="%Vis realizad/agend" evidence={`${n(entity.indicators.conversion.realizedVisits)} / ${n(entity.indicators.conversion.scheduledVisits)}`} score={entity.subscores.conversion.visitExecution}/>
            <Lever label="TC 6m/leads tot" evidence={`${pct(entity.indicators.conversion.tc6mPct)} tasa conversión`} score={entity.subscores.conversion.tc6m}/>
          </div>
        </div>
      </section>
    </div>

    <details className="group mt-9 border-y border-[var(--n3-line)] py-4">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-xs font-semibold uppercase tracking-[.12em] text-[var(--n3-text-muted)] hover:text-[var(--n3-text-light)] focus-visible:outline-none">
        <span>04 / Evidencia exacta del Directorio</span>
        <span aria-hidden="true" className="text-lg font-normal transition-transform group-open:rotate-45">+</span>
      </summary>
      <div className="mt-5 grid gap-6 border-t border-[var(--n3-line)] pt-5 lg:grid-cols-3 text-sm">
        <div><p className="text-xs uppercase tracking-[.12em] text-[var(--n3-text-muted)]">Cartera</p><p className="mt-3">Cartera actual <strong className="float-right">{n(entity.indicators.portfolio.stock)} / {n(entity.indicators.portfolio.stockTarget)}</strong></p><p className="mt-2">Requerimientos <strong className="float-right">{n(entity.indicators.portfolio.requirements)} / {n(entity.indicators.portfolio.requirementsExpected)}</strong></p><p className="mt-2">Pricing score <strong className="float-right">{n(entity.indicators.portfolio.pricing.score,1)}</strong></p></div>
        <div><p className="text-xs uppercase tracking-[.12em] text-[var(--n3-text-muted)]">Seguimiento</p><p className="mt-3">Clasificados <strong className="float-right">{n(entity.indicators.followUp.classified)} / {n(entity.indicators.followUp.active)}</strong></p><p className="mt-2">Sin gestión 90d <strong className="float-right">{n(entity.indicators.followUp.stale90)}</strong></p><p className="mt-2">A sin gestión 15d <strong className="float-right">{n(entity.indicators.followUp.staleA15)}</strong></p></div>
        <div><p className="text-xs uppercase tracking-[.12em] text-[var(--n3-text-muted)]">Conversión</p><p className="mt-3">Visitas / meta <strong className="float-right">{n(entity.indicators.conversion.realizedVisits)} / {n(entity.indicators.conversion.visitTarget)}</strong></p><p className="mt-2">Realizadas / agendadas <strong className="float-right">{n(entity.indicators.conversion.realizedVisits)} / {n(entity.indicators.conversion.scheduledVisits)}</strong></p><p className="mt-2">TC 6 meses <strong className="float-right">{pct(entity.indicators.conversion.tc6mPct)}</strong></p></div>
      </div>
    </details>
  </section>
}
