import type { PortalDatasetKind } from './market-source-import'
const MAX_VERIFIED_AGE_MS = 6 * 24 * 60 * 60 * 1000

export function withinPortalInventoryWindow(now = new Date()): boolean {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Santiago',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now)
  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? '-1')
  const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? '-1')
  return hour === 8 && minute === 0
}

export type FullInventoryTimestamps = Record<'portal_houses' | 'portal_apartments', string | null>

/** Run one overdue dataset at 08:00 Chile; retry on subsequent days if unavailable. */
export function nextOverduePortalDataset(now: Date, latest: FullInventoryTimestamps): PortalDatasetKind | null {
  const entries: Array<{ dataset: PortalDatasetKind; timestamp: number }> = [
    { dataset: 'portal_houses', timestamp: Date.parse(latest.portal_houses ?? '') },
    { dataset: 'portal_apartments', timestamp: Date.parse(latest.portal_apartments ?? '') },
  ].map((item) => ({
    ...item,
    timestamp: Number.isFinite(item.timestamp) ? item.timestamp : 0,
  }))
  return entries
    .filter((item) => now.getTime() - item.timestamp >= MAX_VERIFIED_AGE_MS)
    .sort((a, b) => a.timestamp - b.timestamp)[0]?.dataset ?? null
}
