export function comparisonPeriod(period: string, monthsBack: number) {
  const [year, month] = period.split('-').map(Number)
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) return null
  return new Date(Date.UTC(year, month - 1 - monthsBack, 1)).toISOString().slice(0, 7)
}

export function verifiedChange(
  current: { value: number | null; formulaVersion: number | null } | null,
  previous: { value: number | null; formulaVersion: number | null } | null,
) {
  if (!current || !previous || current.value === null || previous.value === null || previous.value === 0) return null
  if (current.formulaVersion === null || current.formulaVersion !== previous.formulaVersion) return null
  return current.value / previous.value - 1
}
