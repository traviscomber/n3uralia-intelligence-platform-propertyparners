import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

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
    throw new Error('Missing Supabase credentials')
  }

  return createClient(supabaseUrl, supabaseKey)
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getServiceClient()
    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role')
    const team = searchParams.get('team')
    const search = searchParams.get('search')
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
    if (error) throw error

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
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'No pudimos cargar los perfiles.' },
      { status: 500 },
    )
  }
}
