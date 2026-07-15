import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials')
  }

  return createSupabaseClient(supabaseUrl, supabaseKey)
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient()
    const { searchParams } = new URL(request.url)
    const source = searchParams.get('source')
    const status = searchParams.get('status')
    const limitParam = Number.parseInt(searchParams.get('limit') || '20', 10)
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 100) : 20

    let query = supabase
      .from('scrape_runs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (source) query = query.eq('source', source)
    if (status) query = query.eq('status', status)

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({
      runs: data || [],
      generatedAt: new Date().toISOString(),
    })
  } catch (err) {
    return NextResponse.json(
      { runs: [], error: err instanceof Error ? err.message : 'No pudimos cargar el historial de scraping.' },
      { status: 200 },
    )
  }
}
