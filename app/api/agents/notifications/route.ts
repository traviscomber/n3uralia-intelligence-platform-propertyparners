import { NextResponse, type NextRequest } from 'next/server'
import { requireRoleAccess } from '@/lib/api-access'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const access = await requireRoleAccess(['admin', 'ceo', 'director', 'analyst', 'seller'])
  if (!access.allowed) return NextResponse.json({ error: 'Acceso restringido.' }, { status: access.status })

  const unreadOnly = request.nextUrl.searchParams.get('unread') === 'true'
  const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get('limit') || 30), 1), 100)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })

  let query = supabase
    .from('agent_notifications')
    .select('*')
    .eq('recipient_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (unreadOnly) query = query.eq('read', false)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ notifications: data || [] })
}

export async function PATCH(request: NextRequest) {
  const access = await requireRoleAccess(['admin', 'ceo', 'director', 'analyst', 'seller'])
  if (!access.allowed) return NextResponse.json({ error: 'Acceso restringido.' }, { status: access.status })

  const body = await request.json().catch(() => ({})) as { id?: string; markAllRead?: boolean }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })

  const now = new Date().toISOString()
  let query = supabase
    .from('agent_notifications')
    .update({ read: true, read_at: now })
    .eq('recipient_id', user.id)
    .eq('read', false)

  if (!body.markAllRead) {
    if (!body.id) return NextResponse.json({ error: 'Notificación inválida.' }, { status: 400 })
    query = query.eq('id', body.id)
  }

  const { error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
