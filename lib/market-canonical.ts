export function selectCanonicalSales(...values: Array<number | null | undefined>): number | null {
  for (const value of [...values].reverse()) {
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0) return value
  }
  return null
}
