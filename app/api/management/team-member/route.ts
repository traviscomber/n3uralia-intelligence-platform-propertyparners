import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const slugify = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-')

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('id,role,team').eq('id', user.id).maybeSingle()
  const role = String(profile?.role ?? '').toLowerCase()
  if (!profile || !['admin','ceo','director','subdirector'].includes(role)) return NextResponse.json({ error: 'Rol no autorizado' }, { status: 403 })

  const slug = request.nextUrl.searchParams.get('slug') ?? ''
  const { data: candidates, error: profileError } = await supabase.from('profiles').select('id,full_name,team,role').eq('team', profile.team).eq('role', 'seller')
  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 400 })
  const member = candidates?.find((item) => slugify(String(item.full_name ?? '')) === slug)
  if (!member) return NextResponse.json({ error: 'Ejecutiva fuera del alcance autorizado o sin perfil vinculado' }, { status: 404 })

  const [valuationResult, assignmentResult, taskResult] = await Promise.all([
    supabase.from('valuation_cases').select('id,status,address,property_type,estimated_value_uf,valuation_date,created_at,updated_at').eq('requested_by', member.id).order('created_at', { ascending: false }).limit(20),
    supabase.from('property_assignments').select('id,status,assignment_role,notes,assigned_at,ended_at,market_properties(id,normalized_address,property_type,bedrooms,bathrooms,useful_area_m2,last_seen_at)').eq('assigned_to', member.id).order('assigned_at', { ascending: false }).limit(20),
    supabase.from('management_tasks').select('id,status,priority,due_date,created_at').eq('subject_profile_id', member.id),
  ])

  const valuations = valuationResult.data ?? []
  const assignments = assignmentResult.data ?? []
  const tasks = taskResult.data ?? []
  return NextResponse.json({
    member,
    valuations,
    assignments,
    summary: {
      valuationCount: valuations.length,
      valuationDrafts: valuations.filter((item) => item.status === 'draft').length,
      valuationInReview: valuations.filter((item) => item.status === 'review').length,
      activeAssignments: assignments.filter((item) => item.status === 'active').length,
      activeTasks: tasks.filter((item) => item.status === 'open' || item.status === 'in_progress').length,
      overdueTasks: tasks.filter((item) => item.due_date && new Date(item.due_date) < new Date() && item.status !== 'done' && item.status !== 'dismissed').length,
    },
    errors: [valuationResult.error?.message, assignmentResult.error?.message, taskResult.error?.message].filter(Boolean),
  }, { headers: { 'Cache-Control': 'no-store' } })
}
