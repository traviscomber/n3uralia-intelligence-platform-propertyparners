import { NextResponse, type NextRequest } from 'next/server'
import { requireRoleAccess } from '@/lib/api-access'
import { createClient } from '@/lib/supabase/server'
import { AGENT_KEYS } from '@/lib/agents/types'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const access = await requireRoleAccess(['admin', 'ceo', 'director', 'analyst', 'seller'])
  if (!access.allowed) return NextResponse.json({ error: 'Acceso restringido.' }, { status: access.status })

  const agentKey = request.nextUrl.searchParams.get('agent')
  const status = request.nextUrl.searchParams.get('status')
  const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get('limit') || 20), 1), 100)

  if (agentKey && !AGENT_KEYS.includes(agentKey as (typeof AGENT_KEYS)[number])) {
    return NextResponse.json({ error: 'Agente no válido.' }, { status: 400 })
  }

  const supabase = await createClient()
  let query = supabase
    .from('agent_runs')
    .select('*, agent_findings(*), agent_sources(*), agent_artifacts(*)')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (agentKey) query = query.eq('agent_key', agentKey)
  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ runs: data ?? [] })
}
