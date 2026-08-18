import crm from '@/data/crm-intelligence.json'
import type { ManagementReportRecord } from '@/lib/management-report-artifact'

type GoalRow = { metric_code: string; period_start: string; period_end: string; target_value: number | string; source_name?: string | null; status?: string | null; approved_at?: string | null; formula_version?: number | null }
type CanonicalMetricRow = { metric_code: string; period_start: string; period_end: string; value: number | string; source_name?: string | null; source_reference?: string | null; quality_status?: string | null; evaluation_status?: string | null }
type ReportLike = ManagementReportRecord & { entity_id?: string | null }
type MetricSpec = { key: string; label: string; current: (company: Record<string, unknown>, scope: Record<string, unknown>) => number | null; deltaMode?: 'percent' | 'points' }
type HistoricalSalesMonth = { period: string; salesCount: number; salesUf: number }

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value)
const number = (value: unknown): number | null => { if (typeof value === 'number' && Number.isFinite(value)) return value; if (typeof value === 'string' && value.trim()) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : null } return null }
const companyOf = (report: ReportLike) => isRecord(report.snapshot?.company) ? report.snapshot.company : {}
const scopeOf = (report: ReportLike) => isRecord(report.snapshot?.scope) ? report.snapshot.scope : {}
export const creditedClosures = (report: ReportLike) => number(companyOf(report).cierresAcreditados) ?? number(scopeOf(report).managementCreditedClosures) ?? number(companyOf(report).cierresOperacionales) ?? number(scopeOf(report).rawOperations)
export const creditedSalesUf = (report: ReportLike) => number(companyOf(report).volumenUfAcreditado) ?? number(scopeOf(report).managementCreditedSalesUf) ?? number(companyOf(report).volumenUfBruto) ?? number(scopeOf(report).grossSalesUf)
export const operationalClosures = (report: ReportLike) => number(companyOf(report).cierresOperacionales) ?? number(scopeOf(report).rawOperations) ?? number(companyOf(report).cierresAcreditados) ?? number(scopeOf(report).managementCreditedClosures)
export const operationalSalesUf = (report: ReportLike) => number(companyOf(report).volumenUfOperacionalBruto) ?? number(scopeOf(report).grossSalesUf) ?? number(companyOf(report).volumenUfBruto) ?? number(companyOf(report).volumenUfAcreditado) ?? number(scopeOf(report).managementCreditedSalesUf)

const historicalSalesMonths = (((crm as unknown as { baseline2025?: { months?: HistoricalSalesMonth[] } }).baseline2025?.months) ?? [])
const historicalSalesMonth = (period: string) => historicalSalesMonths.find((month) => month.period === period) ?? null
function historicalSalesYtd(endPeriod: string) { const year = endPeriod.slice(0, 4); const months = historicalSalesMonths.filter((month) => month.period.startsWith(year) && month.period <= endPeriod); return months.length ? { periodStart: `${year}-01`, periodEnd: endPeriod, salesCount: months.reduce((s,m)=>s+m.salesCount,0), salesUf: months.reduce((s,m)=>s+m.salesUf,0) } : null }
const canonicalMetric = (rows: CanonicalMetricRow[], code: string) => number(rows.find((row) => row.metric_code === code)?.value)
const canonicalMetricSum = (rows: CanonicalMetricRow[], code: string) => { const values = rows.filter((row) => row.metric_code === code).map((row) => number(row.value)).filter((value): value is number => value != null); return values.length ? values.reduce((sum,value)=>sum+value,0) : null }

const metrics: MetricSpec[] = [
  { key:'closures', label:'Cierres acreditados', current:()=>null }, { key:'creditedUf', label:'Volumen acreditado', current:()=>null },
  { key:'leads', label:'Leads nuevos', current:(c)=>number(c.leadsNuevos) }, { key:'requirements', label:'Requerimientos', current:(c)=>number(c.requerimientos) },
  { key:'portfolio', label:'Cartera', current:(c)=>number(c.cartera) }, { key:'captures', label:'Captaciones', current:(c)=>number(c.captaciones) },
  { key:'scheduledVisits', label:'Visitas agendadas', current:(c)=>number(c.visitasAgendadas) }, { key:'realizedVisits', label:'Visitas realizadas', current:(c)=>number(c.visitasRealizadas) },
  { key:'visitCompliance', label:'Cumplimiento de visitas', current:(c)=>number(c.cumplimientoVisitas), deltaMode:'points' }, { key:'suspended', label:'Suspendidas', current:(c)=>number(c.suspendidas) },
]
function metricValue(spec: MetricSpec, report: ReportLike) { if (spec.key==='closures') return creditedClosures(report); if (spec.key==='creditedUf') return creditedSalesUf(report); return spec.current(companyOf(report),scopeOf(report)) }
function delta(current:number|null, previous:number|null, mode:'percent'|'points'='percent') { if(current==null||previous==null)return null; if(mode==='points')return {value:current-previous,unit:'pp' as const}; if(previous===0)return null; return {value:((current/previous)-1)*100,unit:'%' as const} }
const goalFor=(goals:GoalRow[],code:string,period:string)=>goals.find(g=>g.metric_code===code&&g.period_start<=period&&g.period_end>=period)??null
function targetComparison(actual:number|null,goal:GoalRow|null){const target=goal?number(goal.target_value):null;return{actual,target,attainmentPct:actual!=null&&target!=null&&target!==0?(actual/target)*100:null,gap:actual!=null&&target!=null?actual-target:null,status:goal?.status??null,sourceName:goal?.source_name??null,approvedAt:goal?.approved_at??null,formulaVersion:goal?.formula_version??null,officialForScoring:String(goal?.status??'').toLowerCase()==='approved'&&Boolean(goal?.approved_at)}}

export function buildManagementReportComparisons(args:{current:ReportLike;previous?:ReportLike|null;samePeriodPriorYear?:ReportLike|null;priorYearMetrics?:CanonicalMetricRow[];priorYearYtdMetrics?:CanonicalMetricRow[];ytdReports?:ReportLike[];goals?:GoalRow[]}){
 const {current,previous=null,samePeriodPriorYear=null,priorYearMetrics=[],priorYearYtdMetrics=[],ytdReports=[],goals=[]}=args
 const mom=previous?Object.fromEntries(metrics.map(spec=>{const c=metricValue(spec,current),p=metricValue(spec,previous);return[spec.key,{label:spec.label,current:c,previous:p,delta:delta(c,p,spec.deltaMode)}]})):null
 const salesGoal=goalFor(goals,'sales',current.period_start), leadsGoal=goalFor(goals,'leads',current.period_start)
 const currentTargets={sales:targetComparison(creditedClosures(current),salesGoal),leads:targetComparison(number(companyOf(current).leadsNuevos),leadsGoal)}
 const currentYear=current.period_start.slice(0,4); const throughCurrent=ytdReports.filter(r=>r.period_start.startsWith(currentYear)&&r.period_start<=current.period_start).sort((a,b)=>a.period_start.localeCompare(b.period_start))
 const ytdClosures=throughCurrent.reduce((s,r)=>s+(creditedClosures(r)??0),0), ytdOperationalClosures=throughCurrent.reduce((s,r)=>s+(operationalClosures(r)??0),0), ytdOperationalUf=throughCurrent.reduce((s,r)=>s+(operationalSalesUf(r)??0),0)
 const ytdSalesGoals=goals.filter(g=>g.metric_code==='sales'&&g.period_start.startsWith(currentYear)&&g.period_start<=current.period_start), ytdSalesTarget=ytdSalesGoals.reduce((s,g)=>s+(number(g.target_value)??0),0)
 const priorYearPeriod=`${Number(currentYear)-1}-${current.period_start.slice(5,7)}`, fallbackMonth=historicalSalesMonth(priorYearPeriod), fallbackYtd=historicalSalesYtd(priorYearPeriod)
 const canonicalClosures=canonicalMetric(priorYearMetrics,'sales'), canonicalUf=canonicalMetric(priorYearMetrics,'sales_uf')
 const priorOperationalClosures=samePeriodPriorYear?operationalClosures(samePeriodPriorYear):canonicalClosures??fallbackMonth?.salesCount??null
 const priorOperationalUf=samePeriodPriorYear?operationalSalesUf(samePeriodPriorYear):canonicalUf??fallbackMonth?.salesUf??null
 const yoySource=samePeriodPriorYear?'canonical-monthly-report':canonicalClosures!=null||canonicalUf!=null?'management_metric_values':fallbackMonth?'crm-intelligence.baseline2025':null
 const yoy=priorOperationalClosures!=null||priorOperationalUf!=null?{status:'exact_operational' as const,period:priorYearPeriod,source:yoySource,dimension:'operational_corporate' as const,closures:{current:operationalClosures(current),previous:priorOperationalClosures,delta:delta(operationalClosures(current),priorOperationalClosures)},salesUf:{current:operationalSalesUf(current),previous:priorOperationalUf,delta:delta(operationalSalesUf(current),priorOperationalUf)},managementCredited:{currentClosures:creditedClosures(current),currentSalesUf:creditedSalesUf(current),previousClosures:null,previousSalesUf:null,status:'prior_year_credit_dimension_unavailable' as const}}:{status:'same_period_not_canonicalized' as const,period:priorYearPeriod}
 const canonicalYtdClosures=canonicalMetricSum(priorYearYtdMetrics,'sales'), canonicalYtdUf=canonicalMetricSum(priorYearYtdMetrics,'sales_uf')
 const priorYtdClosures=canonicalYtdClosures??fallbackYtd?.salesCount??null, priorYtdUf=canonicalYtdUf??fallbackYtd?.salesUf??null
 const operationalYoyYtd=priorYtdClosures!=null||priorYtdUf!=null?{status:'exact_operational' as const,periodStart:`${Number(currentYear)-1}-01`,periodEnd:priorYearPeriod,source:canonicalYtdClosures!=null||canonicalYtdUf!=null?'management_metric_values' as const:'crm-intelligence.baseline2025' as const,closures:{current:ytdOperationalClosures,previous:priorYtdClosures,delta:delta(ytdOperationalClosures,priorYtdClosures)},salesUf:{current:ytdOperationalUf,previous:priorYtdUf,delta:delta(ytdOperationalUf,priorYtdUf)},managementCreditedClosures:ytdClosures,historicalCreditDimensionAvailable:false}:null
 return{generatedFrom:'canonical-monthly-reports+management-goals+management_metric_values',mom:previous?{status:'exact',previousPeriod:previous.period_start.slice(0,7),metrics:mom}:{status:'no_previous_month',metrics:null},targets:{current:currentTargets,ytd:{closures:ytdClosures,target:ytdSalesTarget||null,attainmentPct:ytdSalesTarget?(ytdClosures/ytdSalesTarget)*100:null,goalStatus:ytdSalesGoals.length?(ytdSalesGoals.every(g=>String(g.status).toLowerCase()==='approved'&&g.approved_at)?'approved':'documentary'):'missing',officialForScoring:ytdSalesGoals.length>0&&ytdSalesGoals.every(g=>String(g.status).toLowerCase()==='approved'&&Boolean(g.approved_at))}},yoy,operationalYoyYtd}
}

export function enrichManagementReportWithComparisons<T extends ReportLike>(report:T,comparisons:ReturnType<typeof buildManagementReportComparisons>):T{
 const snapshot=isRecord(report.snapshot)?{...report.snapshot}:{}; snapshot.comparisons=comparisons
 const notes=Array.isArray(snapshot.qualityNotes)?snapshot.qualityNotes.filter((v):v is string=>typeof v==='string'):[]
 const momMetrics=comparisons.mom.status==='exact'?comparisons.mom.metrics:null, closuresMom=momMetrics&&isRecord(momMetrics.closures)?momMetrics.closures:null, leadsMom=momMetrics&&isRecord(momMetrics.leads)?momMetrics.leads:null
 const closureDelta=closuresMom&&isRecord(closuresMom.delta)?number(closuresMom.delta.value):null, leadsDelta=leadsMom&&isRecord(leadsMom.delta)?number(leadsMom.delta.value):null
 if(closureDelta!=null&&leadsDelta!=null)notes.unshift(`Comparación MoM exacta: cierres acreditados ${closureDelta>=0?'+':''}${closureDelta.toFixed(1)}% y leads nuevos ${leadsDelta>=0?'+':''}${leadsDelta.toFixed(1)}% versus ${comparisons.mom.previousPeriod}.`)
 const salesTarget=comparisons.targets.current.sales; if(salesTarget.target!=null&&salesTarget.actual!=null&&salesTarget.attainmentPct!=null){const qualifier=salesTarget.officialForScoring?'meta aprobada':'meta documental asignada; comparación informativa, no scoring oficial';notes.unshift(`Meta de cierres: ${salesTarget.actual.toLocaleString('es-CL')} / ${salesTarget.target.toLocaleString('es-CL')} = ${salesTarget.attainmentPct.toFixed(1)}% (${qualifier}).`)}
 const ytd=comparisons.targets.ytd; if(ytd.target!=null)notes.unshift(`Acumulado año a la fecha: ${ytd.closures.toLocaleString('es-CL')} cierres acreditados / ${ytd.target.toLocaleString('es-CL')} de referencia = ${(ytd.attainmentPct??0).toFixed(1)}%.`)
 if(comparisons.yoy.status==='exact_operational'){const cd=comparisons.yoy.closures.delta?.value??null,ud=comparisons.yoy.salesUf.delta?.value??null;if(cd!=null&&ud!=null)notes.unshift(`YoY operacional exacto vs ${comparisons.yoy.period}: cierres ${cd>=0?'+':''}${cd.toFixed(1)}% y volumen UF ${ud>=0?'+':''}${ud.toFixed(1)}%. El crédito de gestión se mantiene separado porque 2025 no posee esa dimensión.`)}
 snapshot.qualityNotes=[...new Set(notes)]; return{...report,snapshot}
}
