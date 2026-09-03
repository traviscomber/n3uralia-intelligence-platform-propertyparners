export const PROPERTY_PARTNERS_TIME_ZONE = 'America/Santiago' as const

function parseDate(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
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

export function propertyPartnersTimeZoneLabel() {
  return 'Hora Chile · America/Santiago'
}
