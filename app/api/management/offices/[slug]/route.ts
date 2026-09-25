import { NextResponse } from 'next/server'
import { accessErrorResponse, requireAnyCapability } from '@/lib/access-guards'
import { createServiceClient } from '@/lib/supabase/service'
import { getCanonicalManagementPeriods } from '@/lib/management-canonical-periods'

const OFFICE_BY_SLUG: Record<string,string> = {
  'santa-maria':'Santa María',
  'nueva-costanera':'Nueva Costanera',
  'lo-beltran':'Lo Beltrán',
}

const ACTIVE_PROSPECT = new Set(['new','assigned','contacting','qualified','valuation','proposal'])

function n(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function pct(value: number | null, target: number | null) {
  return value != null && target != null && target !== 0 ? value / target * 100 : null
}

function hoursBetween(a: string | null, b: string | null) {
  if (!a || !b) return null
  const start = new Date(a).getTime()
  const end = new Date(b).getTime()
  return Number.isFinite(start) && Number.isFinite(end) && end >= start ? (end - start) / 3_600_000 : null
}

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  let scope: Awaited<ReturnType<typeof requireAnyCapability>>
  try {
    scope = await requireAnyCapability(['management.global.read','management.office.read'])
  } catch (error) {
    return accessErrorResponse(error)
  }

  const { slug } = await context.params
  const officeName = OFFICE_BY_SLUG[slug]
  if (!officeName) return NextResponse.json({ error:'Oficina no encontrada.' },{status:404})
  if (scope.scope === 'office' && scope.team && scope.team !== officeName) {
    return NextResponse.json({ error:'Fuera del alcance de oficina.' },{status:403})
  }

  const periods = getCanonicalManagementPeriods()
  const series = periods.map((period) => {
    const office = period.offices.find((item) => item.name === officeName)
    if (!office) return null
    return {
      period: period.period,
      authority: period.authority,
      closings: office.creditedClosings,
      salesUf: office.creditedSalesUf,
      target: office.canonicalClosingTarget ?? null,
      compliancePct: pct(office.creditedClosings, office.canonicalClosingTarget ?? null),
      managementScore: office.managementScore ?? null,
      portfolioScore: office.portfolioScore ?? null,
      followUpScore: office.followUpScore ?? null,
      conversionScore: office.conversionScore ?? null,
      stock: office.stock ?? null,
      leads: office.leads ?? null,
      activeLeads: office.activeLeads ?? null,
      requirements: office.requirements ?? null,
      scheduledVisits: office.scheduledVisits ?? null,
      realizedVisits: office.realizedVisits ?? null,
      visitExecutionPct: pct(office.realizedVisits ?? null, office.scheduledVisits ?? null),
    }
  }).filter((item): item is NonNullable<typeof item> => Boolean(item))

  const latest = series.at(-1) ?? null
  const previous = series.at(-2) ?? null
  if (!latest) return NextResponse.json({ error:'No existe serie canónica para esta oficina.' },{status:404})

  const db = createServiceClient()
  const [directorResult, neighborhoodResult, companyResult] = await Promise.all([
    db.from('property_director_directory')
      .select('director_key,full_name,role,office_name,profile_id,source,source_effective_date')
      .eq('office_name',officeName)
      .eq('active',true)
      .order('role')
      .order('full_name'),
    db.from('market_neighborhoods')
      .select('id,name')
      .order('name')
      .limit(100),
    db.from('management_entities')
      .select('id,name')
      .eq('entity_type','company')
      .eq('name','Property Partners Vitacura')
      .eq('active',true)
      .maybeSingle(),
  ])
  if (directorResult.error || neighborhoodResult.error || companyResult.error) {
    return NextResponse.json({ error:'No fue posible cargar el territorio operativo.' },{status:500})
  }

  const directorKeys=(directorResult.data??[]).map((item)=>item.director_key)
  const territoryResult=directorKeys.length
    ? await db.from('market_neighborhood_director_assignments')
        .select('id,neighborhood_id,director_key,valid_from,assignment_reason,source')
        .in('director_key',directorKeys)
        .eq('active',true)
        .is('valid_to',null)
        .limit(100)
    : {data:[],error:null}
  if(territoryResult.error) return NextResponse.json({error:'No fue posible cargar barrios asignados.'},{status:500})

  const leadsResult=directorKeys.length
    ? await db.from('property_prospect_leads')
        .select('id,property_id,neighborhood_id,director_key,status,priority,assigned_at,first_contact_at,last_follow_up_at,next_follow_up_at,won_at,lost_at,updated_at')
        .in('director_key',directorKeys)
        .order('updated_at',{ascending:false})
        .limit(500)
    : {data:[],error:null}
  if(leadsResult.error) return NextResponse.json({error:'No fue posible cargar prospección.'},{status:500})

  const leads=leadsResult.data??[]
  const propertyIds=[...new Set(leads.map((item)=>item.property_id))]
  const valuationResult=propertyIds.length
    ? await db.from('valuation_cases')
        .select('id,subject_property_id,status,estimated_value_uf,created_at,issued_at')
        .in('subject_property_id',propertyIds)
        .order('created_at',{ascending:false})
    : {data:[],error:null}
  if(valuationResult.error) return NextResponse.json({error:'No fue posible cargar valorizaciones.'},{status:500})

  const valuationPropertyIds=new Set((valuationResult.data??[]).map((item)=>item.subject_property_id))
  const now=Date.now()
  const activeLeads=leads.filter((item)=>ACTIVE_PROSPECT.has(item.status))
  const overdue=activeLeads.filter((item)=>item.next_follow_up_at && new Date(item.next_follow_up_at).getTime()<now)
  const won=leads.filter((item)=>item.status==='won')
  const lost=leads.filter((item)=>item.status==='lost')
  const firstContactHours=leads.map((item)=>hoursBetween(item.assigned_at,item.first_contact_at)).filter((v):v is number=>v!=null)
  const wonHours=won.map((item)=>hoursBetween(item.assigned_at,item.won_at)).filter((v):v is number=>v!=null)

  const historicalResult=companyResult.data
    ? await db.from('management_metric_values')
        .select('metric_code,value,source_name,source_reference,formula_version,quality_status,evaluation_status')
        .eq('entity_id',companyResult.data.id)
        .eq('period_start','2025-01-01')
        .eq('period_end','2025-12-31')
        .in('metric_code',['sales','sales_uf','leads','requirements','scheduled_visits','realized_visits'])
        .eq('quality_status','verified')
        .eq('evaluation_status','evaluable')
    : {data:[],error:null}
  if(historicalResult.error) return NextResponse.json({error:'No fue posible cargar el baseline histórico 2025.'},{status:500})
  const historicalByCode=new Map((historicalResult.data??[]).map((item)=>[item.metric_code,item]))

  const neighborhoodById=new Map((neighborhoodResult.data??[]).map((item)=>[item.id,item]))
  const territories=(territoryResult.data??[]).map((item)=>({
    ...item,
    neighborhood: neighborhoodById.get(item.neighborhood_id)??null,
    director:(directorResult.data??[]).find((director)=>director.director_key===item.director_key)??null,
  }))

  const signals=[
    latest.portfolioScore!=null && latest.portfolioScore<70 ? {key:'portfolio',severity:latest.portfolioScore<50?'critical':'warning',label:'Cartera bajo estándar',detail:`Score ${latest.portfolioScore.toFixed(1)} · referencia 70`} : null,
    latest.followUpScore!=null && latest.followUpScore<70 ? {key:'followup',severity:latest.followUpScore<50?'critical':'warning',label:'Seguimiento bajo estándar',detail:`Score ${latest.followUpScore.toFixed(1)} · referencia 70`} : null,
    latest.conversionScore!=null && latest.conversionScore<70 ? {key:'conversion',severity:latest.conversionScore<50?'critical':'warning',label:'Conversión bajo estándar',detail:`Score ${latest.conversionScore.toFixed(1)} · referencia 70`} : null,
    latest.compliancePct!=null && latest.compliancePct<90 ? {key:'goal',severity:latest.compliancePct<60?'critical':'warning',label:'Meta de cierres en riesgo',detail:`${latest.compliancePct.toFixed(1)}% de cumplimiento`} : null,
    latest.visitExecutionPct!=null && latest.visitExecutionPct<60 ? {key:'visits',severity:'warning',label:'Baja ejecución de visitas',detail:`${latest.visitExecutionPct.toFixed(1)}% realizadas/agendadas`} : null,
    overdue.length>0 ? {key:'prospect-overdue',severity:'warning',label:'Seguimientos vencidos',detail:`${overdue.length} leads requieren acción`} : null,
    territories.length===0 ? {key:'territory',severity:'warning',label:'Territorio sin asignar',detail:'No existen barrios activos asignados a la dirección de esta oficina.'} : null,
  ].filter(Boolean)

  const historicalValue=(code:string)=>n(historicalByCode.get(code)?.value)
  const historyRows=historicalResult.data??[]
  const company2025Context = {
    available: historyRows.length > 0,
    scope: 'company_only',
    note: 'El baseline 2025 está validado a nivel compañía. No se publica YoY por oficina hasta cerrar el contrato de atribución histórica de sub-sucursal/partner.',
    totals: {
      sales: historicalValue('sales'),
      salesUf: historicalValue('sales_uf'),
      leads: historicalValue('leads'),
      requirements: historicalValue('requirements'),
      scheduledVisits: historicalValue('scheduled_visits'),
      realizedVisits: historicalValue('realized_visits'),
    },
    provenance: [...new Set(historyRows.map((item)=>item.source_name).filter(Boolean))],
    formulaVersions: [...new Set(historyRows.map((item)=>item.formula_version).filter((value)=>value!=null))],
  }

  return NextResponse.json({
    office:{name:officeName,slug},
    authority:{file:latest.authority.file,sha256:latest.authority.sha256,period:latest.period},
    latest,
    previous,
    series,
    directors:directorResult.data??[],
    territories,
    prospecting:{
      leads:leads.length,
      active:activeLeads.length,
      overdue:overdue.length,
      valued:leads.filter((item)=>valuationPropertyIds.has(item.property_id)).length,
      won:won.length,
      lost:lost.length,
      conversionPct:leads.length?Number((won.length/leads.length*100).toFixed(1)):null,
      valuationRatePct:leads.length?Number((leads.filter((item)=>valuationPropertyIds.has(item.property_id)).length/leads.length*100).toFixed(1)):null,
      avgFirstContactHours:firstContactHours.length?Number((firstContactHours.reduce((a,b)=>a+b,0)/firstContactHours.length).toFixed(1)):null,
      avgWonCycleDays:wonHours.length?Number((wonHours.reduce((a,b)=>a+b,0)/wonHours.length/24).toFixed(1)):null,
    },
    signals,
    historicalContext:company2025Context,
    generatedAt:new Date().toISOString(),
  },{headers:{'Cache-Control':'no-store'}})
}
