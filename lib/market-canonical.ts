export function selectCanonicalSales(...values: Array<number | null | undefined>): number | null {
  const available = values.filter(
    (value): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0,
  )

  return available.length ? Math.max(...available) : null
}
