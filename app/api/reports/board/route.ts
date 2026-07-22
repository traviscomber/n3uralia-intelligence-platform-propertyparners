import { NextResponse, type NextRequest } from 'next/server'
import { buildBoardReport } from '@/lib/board-report'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No authenticated user.' }, { status: 401 })

  const period = request.nextUrl.searchParams.get('period') || undefined
  return NextResponse.json(buildBoardReport(period), {
    headers: { 'Cache-Control': 'no-store' },
  })
}
