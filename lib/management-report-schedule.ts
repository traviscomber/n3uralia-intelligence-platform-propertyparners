import { propertyPartnersMonthKey } from '@/lib/property-partners-time'

export type ManagementReportTrigger = 'cron' | 'manual'
export type CronAuthorizationFailure = 'missing_secret' | 'missing_authorization' | 'invalid_authorization' | null

export function canRunManagementReports(role: string | null | undefined) {
  return ['admin', 'ceo'].includes(String(role ?? '').trim().toLowerCase())
}

export function getCronAuthorizationFailure(authorization: string | null, cronSecret: string | undefined): CronAuthorizationFailure {
  if (!cronSecret) return 'missing_secret'
  if (!authorization) return 'missing_authorization'
  if (authorization !== `Bearer ${cronSecret}`) return 'invalid_authorization'
  return null
}

export function previousMonthBounds(now = new Date()) {
  const currentPeriod = propertyPartnersMonthKey(now)
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(currentPeriod)) {
    throw new Error('No fue posible resolver el mes calendario de Property Partners.')
  }
  const [year, month] = currentPeriod.split('-').map(Number)
  const start = new Date(Date.UTC(year, month - 2, 1))
  const end = new Date(Date.UTC(year, month - 1, 0))
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  }
}

export function isClosedMonthlyPeriod(period: string, now = new Date()) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) return false
  const currentPeriod = propertyPartnersMonthKey(now)
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(currentPeriod)) return false
  return period < currentPeriod
}

export function assertClosedMonthlyPeriod(period: string, now = new Date()) {
  if (!isClosedMonthlyPeriod(period, now)) {
    throw new Error('El informe mensual sólo puede cerrarse para un mes completamente terminado.')
  }
}

export function advanceSchedule(nextRunAt: string | null, cadence: string, now = new Date()) {
  const next = new Date(nextRunAt || now.toISOString())
  if (Number.isNaN(next.getTime())) throw new Error('La programación contiene next_run_at inválido.')

  const advanceOnce = () => {
    if (cadence === 'monthly') next.setUTCMonth(next.getUTCMonth() + 1)
    else if (cadence === 'quarterly') next.setUTCMonth(next.getUTCMonth() + 3)
    else if (cadence === 'yearly') next.setUTCFullYear(next.getUTCFullYear() + 1)
    else throw new Error(`Cadencia no soportada: ${cadence}`)
  }

  advanceOnce()
  let guard = 0
  while (next <= now && guard < 120) {
    advanceOnce()
    guard += 1
  }
  if (next <= now) throw new Error('No fue posible avanzar la programación a una fecha futura.')
  return next.toISOString()
}
