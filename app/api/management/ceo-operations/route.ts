import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const normalize = (value: string | null | undefined) => String(value ?? '').trim().toLowerCase()

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id,role,full_name,team')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError || !profile) return NextResponse.json({ error: profileError?.message ?? 'Perfil no configurado' }, { status: 403 })
  if (!['ceo', 'admin'].includes(normalize(profile.role))) return NextResponse.json({ error: 'Rol no autorizado' }, { status: 403 })

  const [valuations, assignments, properties, tasks, profiles] = await Promise.all([
    supabase.from('valuation_cases').select('id,status,updated_at').eq('property_type', 'Casa'),
    supabase.from('property_assignments').select('id,status,assigned_to,updated_at'),
    supabase.from('market_properties').select('id,identity_status,last_seen_at').eq('property_type', 'Casa'),
    supabase.from('management_tasks').select('id,status,priority,due_date,office,assigned_to,updated_at'),
    supabase.from('profiles').select('id,role,team'),
  ])

  const errors = [valuations.error, assignments.error, properties.error, tasks.error, profiles.error]
    .map((error) => error?.message)
    .filter((message): message is string => Boolean(message))

  const valuationRows = valuations.data ?? []
  const assignmentRows = assignments.data ?? []
  const propertyRows = properties.data ?? []
  const taskRows = tasks.data ?? []
  const profileRows = profiles.data ?? []
  const today = new Date().toISOString().slice(0, 10)
  const countStatus = (rows: Array<{ status: string | null }>, status: string) => rows.filter((row) => row.status === status).length
  const openTasks = taskRows.filter((task) => ['open', 'in_progress'].includes(String(task.status)))

  return NextResponse.json({
    valuations: {
      total: valuationRows.length,
      draft: countStatus(valuationRows, 'draft'),
      review: countStatus(valuationRows, 'review'),
      approved: countStatus(valuationRows, 'approved'),
      issued: countStatus(valuationRows, 'issued'),
    },
    assignments: {
      total: assignmentRows.length,
      active: countStatus(assignmentRows, 'active'),
      paused: countStatus(assignmentRows, 'paused'),
    },
    market: {
      properties: propertyRows.length,
      confirmed: propertyRows.filter((property) => property.identity_status === 'confirmed').length,
      pendingIdentity: propertyRows.filter((property) => property.identity_status !== 'confirmed').length,
    },
    tasks: {
      total: taskRows.length,
      open: openTasks.length,
      overdue: openTasks.filter((task) => task.due_date && task.due_date < today).length,
      urgent: openTasks.filter((task) => task.priority === 'urgent').length,
      byOffice: Object.entries(openTasks.reduce<Record<string, number>>((acc, task) => {
        const office = task.office || 'Sin oficina'
        acc[office] = (acc[office] ?? 0) + 1
        return acc
      }, {})).map(([office, count]) => ({ office, count })),
    },
    people: {
      total: profileRows.length,
      sellers: profileRows.filter((item) => normalize(item.role) === 'seller').length,
      leaders: profileRows.filter((item) => ['ceo', 'admin', 'director', 'subdirector'].includes(normalize(item.role))).length,
    },
    generatedAt: new Date().toISOString(),
    errors,
  }, { headers: { 'Cache-Control': 'no-store' } })
}
