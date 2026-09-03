export const PROPERTY_PARTNERS_TIME_ZONE = 'America/Santiago' as const

export function formatPropertyPartnersDateTime(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return typeof value === 'string' ? value : 'N/D'
  return new Intl.DateTimeFormat('es-CL', {
    dateStyle: 'medium',
    timeStyle: 'short',
    hourCycle: 'h23',
    timeZone: PROPERTY_PARTNERS_TIME_ZONE,
  }).format(date)
}

export function propertyPartnersTimeZoneLabel() {
  return 'Hora Chile · America/Santiago'
}
