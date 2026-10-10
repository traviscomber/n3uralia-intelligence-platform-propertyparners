import { propertyPartnersMonthKey } from '../property-partners-time'

export type ReportPeriod = { start: string; end: string; label: string; cadence: 'weekly' | 'monthly' }

function iso(date: Date) { return date.toISOString().slice(0, 10) }

function localDate(now: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now)
  const value = (key: string) => parts.find((part) => part.type === key)?.value ?? ''
  return new Date(Date.UTC(Number(value('year')), Number(value('month')) - 1, Number(value('day'))))
}

/** Monday-Sunday window, always strictly before today in Chile. */
export function lastClosedWeek(now = new Date()): ReportPeriod {
  const today = localDate(now)
  const offset = (today.getUTCDay() + 6) % 7
  const monday = new Date(today)
  monday.setUTCDate(monday.getUTCDate() - offset - 7)
  const sunday = new Date(monday)
  sunday.setUTCDate(sunday.getUTCDate() + 6)
  return { start: iso(monday), end: iso(sunday), cadence: 'weekly', label: 'Última semana completa' }
}

export function lastClosedMonth(now = new Date()): ReportPeriod {
  const key = propertyPartnersMonthKey(now)
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(key)) throw new Error('Mes Chile inválido')
  const [year, month] = key.split('-').map(Number)
  const start = new Date(Date.UTC(year, month - 2, 1))
  const end = new Date(Date.UTC(year, month - 1, 0))
  return { start: iso(start), end: iso(end), cadence: 'monthly', label: 'Último mes completo' }
}

export type EvidenceReadiness = { periodClosed: boolean; requiredVerified: boolean; sourceCutoffValid: boolean; approved: boolean }
export function reportPeriodState(input: EvidenceReadiness): 'closed' | 'incomplete' {
  return input.periodClosed && input.requiredVerified && input.sourceCutoffValid && input.approved ? 'closed' : 'incomplete'
}

export function selectLastExportable<T extends { period_end: string; state: 'closed' | 'incomplete' }>(reports: T[], end: string): T | null {
  return reports.filter((report) => report.state === 'closed' && report.period_end <= end)
    .sort((a, b) => b.period_end.localeCompare(a.period_end))[0] ?? null
}
