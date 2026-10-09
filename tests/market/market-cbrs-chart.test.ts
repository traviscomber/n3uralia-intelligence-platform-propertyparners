import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { cbrsBarPercent, cbrsComparisonData } from '../../lib/market-cbrs-chart'
import type { AnnualCbrsMeasure } from '../../lib/market-pedro-history'

const data: AnnualCbrsMeasure[] = [
  { year: 2022, propertyType: 'Casa', transactions: 346, medianPriceUf: 15749.99, medianUfM2: 103.17 },
  { year: 2022, propertyType: 'Departamento', transactions: 1161, medianPriceUf: 10400, medianUfM2: 98.8 },
  { year: 2023, propertyType: 'Casa', transactions: 301, medianPriceUf: 15500, medianUfM2: 98.63 },
  { year: 2023, propertyType: 'Departamento', transactions: 1006, medianPriceUf: 10735, medianUfM2: 93.89 },
  { year: 2024, propertyType: 'Casa', transactions: 347, medianPriceUf: 14350, medianUfM2: 104.26 },
  { year: 2024, propertyType: 'Departamento', transactions: 1051, medianPriceUf: 11000, medianUfM2: 95.56 },
  { year: 2025, propertyType: 'Casa', transactions: 270, medianPriceUf: 16438, medianUfM2: 110.13 },
  { year: 2025, propertyType: 'Departamento', transactions: 710, medianPriceUf: 11000, medianUfM2: 96.15 },
]

test('sales are compared using the SAME zero-based axis, including both property types', () => {
  const chart = cbrsComparisonData(data, 'transactions')
  assert.equal(chart.hasData, true)
  assert.equal(chart.axisMaximum, 1200)
  assert.deepEqual(chart.tickValues, [0, 300, 600, 900, 1200])
  assert.deepEqual(chart.years.map((item) => item.year), [2022, 2023, 2024, 2025])
  assert.equal(chart.years[3].values.Casa, 270)
  assert.equal(chart.years[3].values.Departamento, 710)
  assert.equal(cbrsBarPercent(1161, chart.axisMaximum), 96.75)
  assert.equal(cbrsBarPercent(270, chart.axisMaximum), 22.5)
})
test('median price uses common UF axis, not annual normalized curves', () => {
  const chart = cbrsComparisonData(data, 'medianPriceUf')
  assert.equal(chart.axisMaximum, 20000)
  assert.deepEqual(chart.tickValues, [0, 5000, 10000, 15000, 20000])
  assert.equal(chart.years[3].values.Casa, 16438)
  assert.equal(chart.years[3].values.Departamento, 11000)
  assert.equal(cbrsBarPercent(16438, chart.axisMaximum), 82.19)
})
test('missing data is never silently shown as zero or interpolated', () => {
  const source: AnnualCbrsMeasure[] = [
    { year: 2025, propertyType: 'Casa', transactions: null, medianPriceUf: null, medianUfM2: null },
    { year: 2025, propertyType: 'Departamento', transactions: 710, medianPriceUf: null, medianUfM2: null },
  ]
  const sales = cbrsComparisonData(source, 'transactions')
  assert.equal(sales.years[0].values.Casa, null)
  assert.equal(sales.years[0].values.Departamento, 710)
  assert.equal(cbrsBarPercent(null, sales.axisMaximum), null)
  const prices = cbrsComparisonData(source, 'medianPriceUf')
  assert.equal(prices.hasData, false)
  assert.equal(prices.axisMaximum, 0)
  assert.equal(cbrsBarPercent(0, prices.axisMaximum), null)
})
test('market page uses readable comparisons and keeps historical CBRS source', () => {
  const page = readFileSync('app/dashboard/market/page.tsx', 'utf8')
  const component = readFileSync('components/market/cbrs-comparison-bars.tsx', 'utf8')
  assert.ok(page.includes('CbrsComparisonBars'))
  assert.ok(!page.includes('YearlyTrend'))
  assert.ok(!page.includes('Las líneas muestran'))
  assert.match(component, /table className="sr-only"/)
  assert.match(component, /tickValues\.map/)
  assert.match(component, /axisMaximum/)
  assert.match(component, /eje desde 0/)
})
