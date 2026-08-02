import { NextResponse } from 'next/server'
import { runManagementReportDelivery } from '@/lib/management-report-delivery'

export const runtime = 'nodejs'
export const maxDuration = 60

const ONE_TIME_TOKEN = '3b7d4c8f1a2e49d6b0c5f8a1e7d93462'

export async function GET(request: Request) {
  const url = new URL(request.url)
  if (url.searchParams.get('token') !== ONE_TIME_TOKEN) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const result = await runManagementReportDelivery({ limit: 1 })
  return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } })
}
