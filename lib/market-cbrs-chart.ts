import type { AnnualCbrsMeasure, CbrsPropertyType } from './market-pedro-history'

export type CbrsChartMetric = 'transactions' | 'medianPriceUf'
export type CbrsChartYear = {
  year: number
  values: Record<CbrsPropertyType, number | null>
}
export type CbrsChartData = {
  years: CbrsChartYear[]
  tickValues: number[]
  axisMaximum: number
  hasData: boolean
}

/** Both property types use one zero-based scale for each metric. */
export function cbrsComparisonData(
  rows: readonly AnnualCbrsMeasure[],
  metric: CbrsChartMetric,
): CbrsChartData {
  const years = [...new Set(rows.map((row) => row.year))]
    .filter((year) => Number.isInteger(year))
    .sort((left, right) => left - right)

  const points: CbrsChartYear[] = years.map((year) => {
    const house = rows.find((row) => row.year === year && row.propertyType === 'Casa')
    const apartment = rows.find((row) => row.year === year && row.propertyType === 'Departamento')
    return {
      year,
      values: {
        Casa: house?.[metric] ?? null,
        Departamento: apartment?.[metric] ?? null,
      },
    }
  })

  const values = points.flatMap((point) => [point.values.Casa, point.values.Departamento])
    .filter((value): value is number => value !== null && Number.isFinite(value) && value >= 0)
  if (values.length === 0) return { years: points, tickValues: [], axisMaximum: 0, hasData: false }

  // Choose round, honest ticks. The origin is always zero, not the lowest year.
  const maximum = Math.max(0, ...values)
  const minimumStep = metric === 'transactions' ? 50 : 1000
  const step = Math.max(minimumStep, Math.ceil(maximum / (4 * minimumStep)) * minimumStep)
  const axisMaximum = step * 4

  return {
    years: points,
    tickValues: [0, step, step * 2, step * 3, axisMaximum],
    axisMaximum,
    hasData: true,
  }
}

export function cbrsBarPercent(value: number | null, axisMaximum: number): number | null {
  if (value === null || !Number.isFinite(value) || value < 0 || axisMaximum <= 0) return null
  return Math.max(0, Math.min(100, value / axisMaximum * 100))
}
