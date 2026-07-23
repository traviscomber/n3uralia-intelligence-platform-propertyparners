import { NextResponse, type NextRequest } from 'next/server'
import { buildBoardReport } from '@/lib/board-report'
import { requireRoleAccess } from '@/lib/api-access'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const access = await requireRoleAccess(['admin', 'ceo', 'director'])
  if (!access.allowed) return NextResponse.json({ error: 'Acceso restringido.' }, { status: access.status })

  const period = request.nextUrl.searchParams.get('period') || undefined
  return NextResponse.json(buildBoardReport(period), {
    headers: { 'Cache-Control': 'no-store' },
  })
}
