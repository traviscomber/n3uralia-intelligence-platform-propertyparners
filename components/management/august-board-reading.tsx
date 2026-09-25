'use client'

type AugustBoardEntity = {
  name:string
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

const nf0=new Intl.NumberFormat('es-CL',{maximumFractionDigits:0})
const nf1=new Intl.NumberFormat('es-CL',{minimumFractionDigits:1,maximumFractionDigits:1})
const n=(v:number,d=0)=>d?nf1.format(v):nf0.format(v)
const pct=(v:number)=>`${nf1.format(v)}%`

function scoreTone(value:number){
  if(value>=70)return 'text-[#78d59a]'
  if(value>=50)return 'text-[#f0c96a]'
  return 'text-[#ff8d87]'
}

function scoreBand(value:number){
  if(value>=70)return 'En estándar'
  if(value>=50)return 'A mejorar'
  return 'Crítico'
}

function ScoreMeter({label,value,weight,delta}:{label:string;value:number;weight:string;delta:number|null}){
  const width=Math.max(0,Math.min(100,value))
  return <div className="border-t border-[var(--n3-line)] py-4">
    <div className="flex items-end justify-between gap-4">
      <div><p className="text-xs text-[var(--n3-text-muted)]">{label} · {weight}</p><p className={`mt-1 text-2xl font-semibold tabular-nums ${scoreTone(value)}`}>{n(value,1)}</p></div>
      <div className="text-right"><p className="text-xs text-[var(--n3-text-muted)]">{scoreBand(value)}</p><p className="mt-1 text-xs tabular-nums text-[var(--n3-text-muted)]">{delta==null?'Sin comparación':`${delta>0?'+':''}${n(delta,1)} vs Jul`}</p></div>
    </div>
    <div className="mt-3 h-1.5 overflow-hidden bg-white/[0.05]"><div className="h-full bg-current opacity-70" style={{width:`${width}%`}} /></div>
  </div>
}

function Dimension({title,score,rows}:{title:string;score:number;rows:Array<{label:string,value:string,score:number}>}){
  return <div className="border-t border-[var(--n3-line)] pt-4">
    <div className="flex items-end justify-between"><h3 className="text-sm font-semibold">{title}</h3><strong className={`text-lg tabular-nums ${scoreTone(score)}`}>{n(score,1)}</strong></div>
    <div className="mt-3 divide-y divide-[var(--n3-line)]">
      {rows.map(row=><div key={row.label} className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 py-3 text-sm">
        <div><p className="text-[var(--n3-text-muted)]">{row.label}</p><p className="mt-1 text-xs text-[var(--n3-text-muted)]">{row.value}</p></div>
        <strong className={`tabular-nums ${scoreTone(row.score)}`}>{n(row.score,1)}</strong>
      </div>)}
    </div>
  </div>
}

export function AugustBoardReading({entity,sourceFile}:{entity:AugustBoardEntity;sourceFile:string}){
  const mgmtDelta=entity.scoreEvolution.management.at(-1)!-entity.scoreEvolution.management.at(-2)!
  const portfolioDelta=entity.scoreEvolution.portfolio.at(-1)!-entity.scoreEvolution.portfolio.at(-2)!
  const followDelta=entity.scoreEvolution.followUp.at(-1)!-entity.scoreEvolution.followUp.at(-2)!
  const conversionDelta=entity.scoreEvolution.conversion.at(-1)!-entity.scoreEvolution.conversion.at(-2)!

  const weakest=[
    {label:'Cartera',value:entity.scores.portfolio},
    {label:'Seguimiento',value:entity.scores.followUp},
    {label:'Conversión',value:entity.scores.conversion},
  ].sort((a,b)=>a.value-b.value)[0]

  return <section className="mt-6">
    <div className="flex flex-col gap-2 border-b border-[var(--n3-line)] pb-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Cierre Agosto · lectura ejecutiva</p>
        <h2 className="mt-1 text-xl font-medium text-[var(--n3-text-light)]">{entity.name}</h2>
      </div>
      <p className="text-xs text-[var(--n3-text-muted)]">{sourceFile}</p>
    </div>

    <div className="grid gap-px bg-[var(--n3-line)] lg:grid-cols-[1.15fr_.85fr_.85fr_.85fr]">
      <div className="bg-[var(--n3-deep)] p-5">
        <p className="text-[10px] uppercase tracking-[.13em] text-[var(--n3-text-muted)]">01 · Resultado Agosto</p>
        <div className="mt-3 flex items-baseline gap-2"><strong className="text-4xl font-semibold tabular-nums">{n(entity.sale.closings,1)}</strong><span className="text-sm text-[var(--n3-text-muted)]">cierres</span></div>
        <p className="mt-2 text-sm">{n(entity.sale.salesUf)} UF</p>
        <p className="mt-3 text-xs text-[var(--n3-text-muted)]">Meta {n(entity.sale.closingTarget,1)} · <span className={scoreTone(entity.sale.closingCompliancePct>=100?100:entity.sale.closingCompliancePct)}>{pct(entity.sale.closingCompliancePct)} cierres</span> · {pct(entity.sale.salesUfCompliancePct)} UF</p>
      </div>
      <div className="bg-[var(--n3-deep)] p-5">
        <p className="text-[10px] uppercase tracking-[.13em] text-[var(--n3-text-muted)]">02 · Acumulado Ene–Ago</p>
        <strong className="mt-3 block text-3xl font-semibold tabular-nums">{n(entity.ytd.closings,1)}</strong>
        <p className="mt-2 text-sm">{n(entity.ytd.salesUf)} UF</p>
        <p className="mt-3 text-xs text-[var(--n3-text-muted)]">{pct(entity.ytd.closingCompliancePct)} cierres · {pct(entity.ytd.salesUfCompliancePct)} UF</p>
      </div>
      <div className="bg-[var(--n3-deep)] p-5">
        <p className="text-[10px] uppercase tracking-[.13em] text-[var(--n3-text-muted)]">03 · Calidad Gestión</p>
        <strong className={`mt-3 block text-3xl font-semibold tabular-nums ${scoreTone(entity.scores.management)}`}>{n(entity.scores.management,1)}</strong>
        <p className="mt-2 text-sm">{entity.classification}</p>
        <p className="mt-3 text-xs text-[var(--n3-text-muted)]">{mgmtDelta>0?'+':''}{n(mgmtDelta,1)} vs julio</p>
      </div>
      <div className="bg-[var(--n3-deep)] p-5">
        <p className="text-[10px] uppercase tracking-[.13em] text-[var(--n3-text-muted)]">04 · Principal brecha</p>
        <strong className={`mt-3 block text-2xl font-semibold ${scoreTone(weakest.value)}`}>{weakest.label}</strong>
        <p className="mt-2 text-sm tabular-nums">{n(weakest.value,1)} pts</p>
        <p className="mt-3 text-xs text-[var(--n3-text-muted)]">Menor de las 3 dimensiones del modelo</p>
      </div>
    </div>

    <div className="mt-7 grid gap-6 lg:grid-cols-[.8fr_1.2fr]">
      <div>
        <p className="text-[10px] uppercase tracking-[.16em] text-[var(--n3-text-muted)]">Por qué</p>
        <h3 className="mt-1 text-lg font-medium">Las 3 dimensiones</h3>
        <div className="mt-3">
          <ScoreMeter label="Cartera" value={entity.scores.portfolio} weight="40%" delta={portfolioDelta}/>
          <ScoreMeter label="Seguimiento" value={entity.scores.followUp} weight="30%" delta={followDelta}/>
          <ScoreMeter label="Conversión" value={entity.scores.conversion} weight="30%" delta={conversionDelta}/>
        </div>
      </div>

      <div>
        <p className="text-[10px] uppercase tracking-[.16em] text-[var(--n3-text-muted)]">Qué lo explica</p>
        <h3 className="mt-1 text-lg font-medium">9 palancas del mismo modelo</h3>
        <div className="mt-3 grid gap-5 xl:grid-cols-3">
          <Dimension title="Cartera" score={entity.scores.portfolio} rows={[
            {label:'Meta cartera',value:`${n(entity.indicators.portfolio.stock)} / ${n(entity.indicators.portfolio.stockTarget)} propiedades`,score:entity.subscores.portfolio.metaPortfolio},
            {label:'Reqs x Tipo Prop',value:`${n(entity.indicators.portfolio.requirements)} / ${n(entity.indicators.portfolio.requirementsExpected)} esperados`,score:entity.subscores.portfolio.requirementsByType},
            {label:'Calidad Precio',value:`≤1.05: ${n(entity.indicators.portfolio.pricing.lte105)} · ≤1.10: ${n(entity.indicators.portfolio.pricing.lte110)} · >1.10: ${n(entity.indicators.portfolio.pricing.gt110)}`,score:entity.subscores.portfolio.priceQuality},
          ]}/>
          <Dimension title="Seguimiento" score={entity.scores.followUp} rows={[
            {label:'% Leads Clasif',value:`${n(entity.indicators.followUp.classified)} / ${n(entity.indicators.followUp.active)} activos`,score:entity.subscores.followUp.classifiedLeads},
            {label:'% Leads c-g90',value:`${n(entity.indicators.followUp.stale90)} sin gestión 90d · ${pct(entity.indicators.followUp.stale90Pct)}`,score:entity.subscores.followUp.managed90},
            {label:'%LeadsA c-g15',value:`${n(entity.indicators.followUp.staleA15)} / ${n(entity.indicators.followUp.activeA)} · ${pct(entity.indicators.followUp.staleA15Pct)} sin gestión`,score:entity.subscores.followUp.managedA15},
          ]}/>
          <Dimension title="Conversión" score={entity.scores.conversion} rows={[
            {label:'Vis Realiz/Meta',value:`${n(entity.indicators.conversion.realizedVisits)} / ${n(entity.indicators.conversion.visitTarget)}`,score:entity.subscores.conversion.visitsToTarget},
            {label:'%Vis realizad/agend',value:`${n(entity.indicators.conversion.realizedVisits)} / ${n(entity.indicators.conversion.scheduledVisits)}`,score:entity.subscores.conversion.visitExecution},
            {label:'TC 6m/leads tot',value:`${pct(entity.indicators.conversion.tc6mPct)} tasa conversión`,score:entity.subscores.conversion.tc6m},
          ]}/>
        </div>
      </div>
    </div>

    <details className="mt-7 border-t border-[var(--n3-line)] pt-4">
      <summary className="cursor-pointer text-xs font-semibold text-[var(--n3-text-muted)] hover:text-[var(--n3-text-light)]">Ver detalle exacto del informe</summary>
      <div className="mt-4 grid gap-5 lg:grid-cols-3 text-sm">
        <div><p className="text-xs uppercase tracking-[.12em] text-[var(--n3-text-muted)]">Cartera</p><p className="mt-2">Cartera actual <strong className="float-right">{n(entity.indicators.portfolio.stock)} / {n(entity.indicators.portfolio.stockTarget)}</strong></p><p className="mt-2">Requerimientos <strong className="float-right">{n(entity.indicators.portfolio.requirements)} / {n(entity.indicators.portfolio.requirementsExpected)}</strong></p><p className="mt-2">Pricing score <strong className="float-right">{n(entity.indicators.portfolio.pricing.score,1)}</strong></p></div>
        <div><p className="text-xs uppercase tracking-[.12em] text-[var(--n3-text-muted)]">Seguimiento</p><p className="mt-2">Clasificados <strong className="float-right">{n(entity.indicators.followUp.classified)} / {n(entity.indicators.followUp.active)}</strong></p><p className="mt-2">Sin gestión 90d <strong className="float-right">{n(entity.indicators.followUp.stale90)}</strong></p><p className="mt-2">A sin gestión 15d <strong className="float-right">{n(entity.indicators.followUp.staleA15)}</strong></p></div>
        <div><p className="text-xs uppercase tracking-[.12em] text-[var(--n3-text-muted)]">Conversión</p><p className="mt-2">Visitas / meta <strong className="float-right">{n(entity.indicators.conversion.realizedVisits)} / {n(entity.indicators.conversion.visitTarget)}</strong></p><p className="mt-2">Realizadas / agendadas <strong className="float-right">{n(entity.indicators.conversion.realizedVisits)} / {n(entity.indicators.conversion.scheduledVisits)}</strong></p><p className="mt-2">TC 6 meses <strong className="float-right">{pct(entity.indicators.conversion.tc6mPct)}</strong></p></div>
      </div>
    </details>
  </section>
}
