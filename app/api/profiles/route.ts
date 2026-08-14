import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireExecutiveAccess } from '@/lib/api-access'

export const dynamic = 'force-dynamic'

const ALLOWED_ROLES = new Set(['ceo', 'director', 'seller', 'admin'])
const MAX_FILTER_LENGTH = 80

type ProfileRow = {
  id: string
  full_name: string | null
  role: 'ceo' | 'director' | 'seller' | 'admin' | string
  team: string | null
  avatar_url: string | null
  created_at: string
}

function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('PROFILE_DIRECTORY_CONFIGURATION_MISSING')
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function sanitizeFilter(value: string | null) {
  if (!value) return null
  const sanitized = value
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N}@._\-\s]/gu, '')
    .trim()
    .slice(0, MAX_FILTER_LENGTH)

  return sanitized || null
}

export async function GET(request: NextRequest) {
  const access = await requireExecutiveAccess()
  if (!access.allowed) {
    return NextResponse.json({ error: 'Acceso restringido.' }, { status: access.status })
  }

  try {
    const supabase = getServiceClient()
    const { searchParams } = new URL(request.url)
    const requestedRole = searchParams.get('role')?.toLowerCase() ?? null
    const role = requestedRole && ALLOWED_ROLES.has(requestedRole) ? requestedRole : null
    const team = sanitizeFilter(searchParams.get('team'))
    const search = sanitizeFilter(searchParams.get('search'))
    const limitParam = Number.parseInt(searchParams.get('limit') || '50', 10)
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 200) : 50

    let query = supabase
      .from('profiles')
      .select('id, full_name, role, team, avatar_url, created_at')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (role) query = query.eq('role', role)
    if (team) query = query.ilike('team', `%${team}%`)
    if (search) {
      query = query.or(`full_name.ilike.%${search}%,id.ilike.%${search}%,team.ilike.%${search}%`)
    }

    const { data, error } = await query
    if (error) throw new Error('PROFILE_DIRECTORY_QUERY_FAILED')

    const profiles = (data || []) as ProfileRow[]
    const summary = {
      total: profiles.length,
      sellers: profiles.filter((profile) => profile.role === 'seller').length,
      directors: profiles.filter((profile) => profile.role === 'director').length,
      admins: profiles.filter((profile) => profile.role === 'admin').length,
      ceos: profiles.filter((profile) => profile.role === 'ceo').length,
      teams: new Set(profiles.map((profile) => profile.team).filter(Boolean)).size,
    }

    return NextResponse.json({
      profiles,
      summary,
      filters: { role, team, search, limit },
    })
  } catch {
    return NextResponse.json(
      { error: 'No fue posible cargar el directorio de perfiles.' },
      { status: 500 },
    )
  }
}
