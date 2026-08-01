import { NextResponse } from 'next/server'
import { getCronAuthorizationFailure, runDueManagementReports } from '@/lib/management-monthly-report'

export async function GET(request: Request) {
  const authorizationFailure = getCronAuthorizationFailure(
    request.headers.get('authorization'),
    process.env.CRON_SECRET,
  )

  if (authorizationFailure) {
    console.warn('[management-monthly] unauthorized cron request', {
      reason: authorizationFailure,
      authorizationPresent: Boolean(request.headers.get('authorization')),
      cronSecretConfigured: Boolean(process.env.CRON_SECRET),
    })
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const result = await runDueManagementReports({ trigger: 'cron' })
    console.info('[management-monthly] cron completed', {
      period: result.period,
      schedulesDue: result.schedulesDue,
      schedulesProcessed: result.schedulesProcessed,
      schedulesFailed: result.schedulesFailed,
    })
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error no identificado'
    console.error('[management-monthly] cron failed', { message })
    return NextResponse.json({ error: 'No fue posible ejecutar los reportes mensuales.' }, { status: 500 })
  }
}
