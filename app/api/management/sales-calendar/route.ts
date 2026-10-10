import { NextRequest, NextResponse } from 'next/server'
import { accessErrorResponse, assertProfileVisible, requireAnyCapability } from '@/lib/access-guards'
import { createServiceClient } from '@/lib/supabase/service'

const readCapabilities = ['management.global.read','management.office.read'] as const
const writeCapabilities = ['tasks.global.manage','tasks.office.manage'] as const

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function validDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(value + 'T00:00:00Z').getTime())
}

export async function GET(request: NextRequest) {
  try {
    const scope = await requireAnyCapability(readCapabilities)
    const db = createServiceClient()
    const includeDelivered = request.nextUrl.searchParams.get('includeDelivered') === '1'

    let casesQuery = db
      .from('management_sale_cases')
      .select('id,source_record_id,operation_key,office,seller_name,property_address,property_type,amount_uf,sale_date,expected_handover_date,actual_handover_date,status,created_at,updated_at')
      .neq('status','cancelled')
      .order('expected_handover_date',{ascending:true})
      .limit(150)

    if (!includeDelivered) casesQuery = casesQuery.eq('status','active')
    if (scope.scope === 'office' && scope.team) casesQuery = casesQuery.eq('office',scope.team)

    const [casesResult,groupsResult] = await Promise.all([
      casesQuery,
      db.from('property_territory_groups').select('group_key,name').eq('active',true).order('name'),
    ])

    if (casesResult.error || groupsResult.error) {
      console.error('[sale-handover-calendar] case load failed',{
        cases:casesResult.error?.code,
        groups:groupsResult.error?.code,
      })
      return NextResponse.json({error:'No fue posible cargar el calendario de ventas.'},{status:500})
    }

    const cases = casesResult.data ?? []
    const ids = cases.map((item)=>item.id)
    const tasksResult = ids.length
      ? await db
          .from('management_tasks')
          .select('id,sale_case_id,milestone_code,title,detail,status,priority,assigned_to,due_date,completed_at,started_at,updated_at')
          .in('sale_case_id',ids)
          .order('due_date',{ascending:true})
      : {data:[],error:null}

    if (tasksResult.error) {
      console.error('[sale-handover-calendar] milestone load failed',{code:tasksResult.error.code})
      return NextResponse.json({error:'No fue posible cargar los hitos del calendario.'},{status:500})
    }

    const tasks = tasksResult.data ?? []
    const assigneeIds = [...new Set(tasks.map((task)=>task.assigned_to).filter(Boolean))] as string[]
    const profilesResult = assigneeIds.length
      ? await db.from('profiles').select('id,full_name,team,role').in('id',assigneeIds)
      : {data:[],error:null}

    if (profilesResult.error) {
      console.error('[sale-handover-calendar] assignee load failed',{code:profilesResult.error.code})
      return NextResponse.json({error:'No fue posible resolver responsables.'},{status:500})
    }

    const profileMap = Object.fromEntries((profilesResult.data ?? []).map((profile)=>[profile.id,profile]))
    const enriched = cases.map((saleCase)=>({
      ...saleCase,
      tasks:tasks
        .filter((task)=>task.sale_case_id===saleCase.id)
        .map((task)=>({...task,assignedProfile:task.assigned_to?profileMap[task.assigned_to]??null:null})),
    }))

    return NextResponse.json({
      cases:enriched,
      offices:(groupsResult.data ?? []).map((group)=>group.name),
      permissions:{canCreate:scope.scope==='global'||scope.scope==='office'},
      scope:{kind:scope.scope,office:scope.team??null},
      generatedAt:new Date().toISOString(),
    },{headers:{'Cache-Control':'no-store'}})
  } catch (error) {
    return accessErrorResponse(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const scope = await requireAnyCapability(writeCapabilities)
    const body = await request.json()
    const db = createServiceClient()

    const requestedOffice = text(body.office)
    const office = scope.scope === 'office' && scope.team ? scope.team : requestedOffice
    const saleDate = text(body.saleDate)
    const expectedHandoverDate = text(body.expectedHandoverDate)
    const assignedTo = text(body.assignedTo) || null

    if (!office || !validDate(saleDate)) {
      return NextResponse.json({error:'Oficina y fecha de venta válidas son requeridas.'},{status:400})
    }
    if (expectedHandoverDate && !validDate(expectedHandoverDate)) {
      return NextResponse.json({error:'La fecha esperada de entrega no es válida.'},{status:400})
    }
    if (expectedHandoverDate && expectedHandoverDate < saleDate) {
      return NextResponse.json({error:'La entrega esperada no puede ser anterior a la venta.'},{status:400})
    }
    if (assignedTo) assertProfileVisible(scope,assignedTo)

    const {data:group,error:groupError} = await db
      .from('property_territory_groups')
      .select('name')
      .eq('name',office)
      .eq('active',true)
      .maybeSingle()

    if (groupError || !group) {
      return NextResponse.json({error:'La oficina no pertenece a la estructura territorial vigente.'},{status:409})
    }

    const amountUf = body.amountUf === '' || body.amountUf == null ? null : Number(body.amountUf)
    if (amountUf != null && (!Number.isFinite(amountUf) || amountUf < 0)) {
      return NextResponse.json({error:'El monto UF no es válido.'},{status:400})
    }

    const {data,error} = await db.rpc('create_management_sale_case_v1',{
      p_office:office,
      p_sale_date:saleDate,
      p_expected_handover_date:expectedHandoverDate||null,
      p_actor_id:scope.profileId,
      p_seller_name:text(body.sellerName)||null,
      p_property_address:text(body.propertyAddress)||null,
      p_property_type:text(body.propertyType)||null,
      p_amount_uf:amountUf,
      p_operation_key:text(body.operationKey)||null,
      p_source_record_id:text(body.sourceRecordId)||null,
      p_assigned_to:assignedTo,
    })

    if (error) {
      console.error('[sale-handover-calendar] case creation failed',{code:error.code})
      return NextResponse.json({error:'No fue posible crear el calendario de la venta.'},{status:422})
    }

    return NextResponse.json({ok:true,result:data},{status:201})
  } catch (error) {
    return accessErrorResponse(error)
  }
}
