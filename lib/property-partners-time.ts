export const PROPERTY_PARTNERS_TIME_ZONE = 'America/Santiago' as const

function parseDate(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function propertyPartnersCalendarKey(value: string | Date) {
  const date = parseDate(value)
  if (!date) return null
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: PROPERTY_PARTNERS_TIME_ZONE,
  }).formatToParts(date)
  const year = parts.find((part) => part.type === 'year')?.value
  const month = parts.find((part) => part.type === 'month')?.value
  const day = parts.find((part) => part.type === 'day')?.value
  return year && month && day ? `${year}-${month}-${day}` : null
}

export function formatPropertyPartnersDateTime(value: string | Date) {
  const date = parseDate(value)
  if (!date) return typeof value === 'string' ? value : 'N/D'
  return new Intl.DateTimeFormat('es-CL', {
    dateStyle: 'medium',
    timeStyle: 'short',
    hourCycle: 'h23',
    timeZone: PROPERTY_PARTNERS_TIME_ZONE,
  }).format(date)
}

export function formatPropertyPartnersDate(value: string | Date) {
  const date = parseDate(value)
  if (!date) return typeof value === 'string' ? value : 'N/D'
  return new Intl.DateTimeFormat('es-CL', {
    dateStyle: 'medium',
    timeZone: PROPERTY_PARTNERS_TIME_ZONE,
  }).format(date)
}

export function formatPropertyPartnersPeriod(period: string) {
  if (!/^\d{4}-\d{2}$/.test(period)) return period || 'N/D'
  const date = new Date(`${period}-01T12:00:00.000Z`)
  if (Number.isNaN(date.getTime())) return period
  return new Intl.DateTimeFormat('es-CL', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

export function propertyPartnersMonthKey(value: string | Date = new Date()) {
  const date = parseDate(value)
  if (!date) return 'N/D'
  const parts = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: '2-digit',
    timeZone: PROPERTY_PARTNERS_TIME_ZONE,
  }).formatToParts(date)
  const year = parts.find((part) => part.type === 'year')?.value
  const month = parts.find((part) => part.type === 'month')?.value
  return year && month ? `${year}-${month}` : 'N/D'
}

export function propertyPartnersCalendarDayAge(value: string | Date, now: string | Date = new Date()) {
  const observedKey = propertyPartnersCalendarKey(value)
  const currentKey = propertyPartnersCalendarKey(now)
  if (!observedKey || !currentKey) return null

  const observedDay = Date.parse(`${observedKey}T00:00:00.000Z`)
  const currentDay = Date.parse(`${currentKey}T00:00:00.000Z`)
  if (!Number.isFinite(observedDay) || !Number.isFinite(currentDay)) return null
  return Math.max(0, Math.round((currentDay - observedDay) / 86_400_000))
}

export function propertyPartnersTimeZoneLabel() {
  return 'Hora Chile · America/Santiago'
}
