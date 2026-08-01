import { NextResponse } from 'next/server'
import { getCronAuthorizationFailure } from '@/lib/management-report-schedule'
import { runManagementReportDelivery } from '@/lib/management-report-delivery'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(request: Request) {
  const authorizationFailure = getCronAuthorizationFailure(
    request.headers.get('authorization'),
    process.env.CRON_SECRET,
  )

  if (authorizationFailure) {
    console.warn('[management-delivery] unauthorized cron request', {
      reason: authorizationFailure,
      authorizationPresent: Boolean(request.headers.get('authorization')),
      cronSecretConfigured: Boolean(process.env.CRON_SECRET),
    })
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const result = await runManagementReportDelivery()
    console.info('[management-delivery] cron completed', {
      configured: result.configured,
      provider: result.provider,
      claimed: result.claimed,
      sent: result.sent,
      failed: result.failed,
      terminal: result.terminal,
    })
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } })
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Error no identificado'
    console.error('[management-delivery] cron failed', { message })
    return NextResponse.json({ error: 'No fue posible procesar la cola de reportes.' }, { status: 500 })
  }
}
