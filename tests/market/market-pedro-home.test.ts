import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { canonicalCbrsHistory, verifiableChange } from '../../lib/market-pedro-history'

test('CBRS annual history keeps houses and apartments separate', () => {
  const input = [
    { year: 2025, property_type: 'Casa', transactions: 270, median_price_uf: '16438', median_uf_m2: '110.13' },
    { year: 2025, property_type: 'Departamento', transactions: 710, median_price_uf: '11000', median_uf_m2: '96.15' },
    { year: 2024, property_type: 'Casa', transactions: 347, median_price_uf: '14350', median_uf_m2: '104.26' },
  ]
  const series = canonicalCbrsHistory(input, 2025)
  assert.equal(series.length, 8)
  assert.equal(series.find((row) => row.propertyType === 'Casa' && row.year === 2025)?.transactions, 270)
  assert.equal(series.find((row) => row.propertyType === 'Departamento' && row.year === 2025)?.transactions, 710)
  assert.equal(series.find((row) => row.propertyType === 'Departamento' && row.year === 2024)?.transactions, null)
  assert.equal(series.find((row) => row.propertyType === 'Casa' && row.year === 2025)?.medianPriceUf, 16438)
})
test('duplicate conflicting CBRS years fail rather than double-counting sales', () => {
  assert.throws(() => canonicalCbrsHistory([
    {year:2025,property_type:'Casa',transactions:270,median_price_uf:'16438',median_uf_m2:null},
    {year:2025,property_type:'Casa',transactions:271,median_price_uf:'16438',median_uf_m2:null},
  ],2025),/CONFLICTING_CANONICAL_CBRS_YEAR/)
})
test('do not fabricate YoY on missing or zero historical period', () => {
  assert.equal(verifiableChange(270, 347), 270 / 347 - 1)
  assert.equal(verifiableChange(710, null), null)
  assert.equal(verifiableChange(null, 347), null)
  assert.equal(verifiableChange(5, 0), null)
})
test('Market homepage displays four market pillars, not the management funnel', () => {
  const page = readFileSync('app/dashboard/market/page.tsx','utf8')
  for (const label of ['Oferta publicada','Nuevos de hoy','Lo publicado no es lo vendido','Evolución del mercado','Vitacura, barrio por barrio']) {
    assert.ok(page.includes(label), 'Missing Pedro market pillar: '+label)
  }
  for (const unrelated of ['Balanced Scorecard','Leads → visitas','Property 360','getExecutiveDashboardSnapshot']) {
    assert.ok(!page.includes(unrelated), 'Management-only surface leaked into Mercado: '+unrelated)
  }
  assert.match(page, /category\.daily\.updatedAt/)
  assert.match(page, /category\.group\?\.addedTodayCount/)
  assert.doesNotMatch(page, /offerToSalesRatio|absorptionRate/)
})
test('home source reads canonical CBRS years and daily deltas, never global Portal benchmark', () => {
  const service=readFileSync('lib/market-pedro-overview.ts','utf8')
  assert.match(service,/market_cbrs_reference_metrics/)
  assert.match(service,/portal_daily_delta_v1/)
  assert.match(service,/includeInventory: false/)
  assert.doesNotMatch(service,/market_portal_reference_metrics/)
})
