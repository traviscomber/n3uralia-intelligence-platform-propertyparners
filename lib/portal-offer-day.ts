const TIME_ZONE = 'America/Santiago'
const formatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
})

export function portalChileDayKey(value: Date): string {
  const parts = formatter.formatToParts(value)
  const pick = (type: string) => parts.find((part) => part.type === type)?.value
  const year = pick('year'), month = pick('month'), day = pick('day')
  if (!year || !month || !day) throw new Error('INVALID_CHILE_DATE')
  return year + '-' + month + '-' + day
}

function utcStartOfChileDay(key: string): string {
  const midnight = Date.parse(key + 'T00:00:00Z')
  // First instant at which this Chilean calendar day is visible in UTC.
  let low = midnight - 18 * 3_600_000
  let high = midnight + 18 * 3_600_000
  while (high - low > 1_000) {
    const mid = Math.floor((low + high) / 2_000) * 1_000
    if (portalChileDayKey(new Date(mid)) < key) low = mid
    else high = mid
  }
  return new Date(high).toISOString()
}

export function portalChileToday(now: Date = new Date()) {
  if (!Number.isFinite(now.getTime())) throw new Error('INVALID_CHILE_DATE')
  const day = portalChileDayKey(now)
  const nextDay = new Date(Date.parse(day + 'T00:00:00Z') + 86_400_000).toISOString().slice(0, 10)
  return { day, start: utcStartOfChileDay(day), end: utcStartOfChileDay(nextDay) }
}

export function uniqueFirstSeenToday(
  observations: readonly { source_listing_id: string | null; created_at: string | null }[],
  historicalIds: ReadonlySet<string>,
) {
  const firstSeen = new Map<string, string>()
  for (const row of observations) {
    if (!row.source_listing_id || !row.created_at || historicalIds.has(row.source_listing_id)) continue
    const previous = firstSeen.get(row.source_listing_id)
    if (!previous || row.created_at < previous) firstSeen.set(row.source_listing_id, row.created_at)
  }
  return firstSeen
}
