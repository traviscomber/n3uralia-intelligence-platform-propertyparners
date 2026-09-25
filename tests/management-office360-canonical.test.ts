import test from 'node:test'
import assert from 'node:assert/strict'
import periodsData from '../data/management-canonical-periods.json' with { type: 'json' }

type Period = {
  period: string
  authority: { file: string; sha256: string }
  offices: Array<{
    name: string
    creditedClosings: number
    creditedSalesUf: number
    canonicalClosingTarget?: number | null
    managementScore?: number | null
    portfolioScore?: number | null
    followUpScore?: number | null
    conversionScore?: number | null
  }>
}

const periods = periodsData.periods as Period[]
const offices = ['Santa María','Nueva Costanera','Lo Beltrán']

test('Office 360 uses the complete Pedro Jan-Aug 2026 management series', () => {
  assert.deepEqual(periods.map((item)=>item.period), ['2026-01','2026-02','2026-03','2026-04','2026-05','2026-06','2026-07','2026-08'])
  for (const period of periods) {
    assert.deepEqual(period.offices.map((office)=>office.name), offices)
    assert.equal(period.authority.file, 'Ago_Directorio.pptx')
    assert.ok(period.authority.sha256)
  }
})

test('latest Office 360 values reconcile to Pedro August authority', () => {
  const august = periods.at(-1)
  assert.equal(august?.period, '2026-08')
  const byName = new Map(august?.offices.map((office)=>[office.name,office]) ?? [])
  assert.deepEqual(byName.get('Santa María'), {
    name:'Santa María',creditedClosings:3.5,creditedSalesUf:76800,canonicalClosingTarget:2.3,
    managementScore:67.4,portfolioScore:65.1,followUpScore:68.4,conversionScore:69.5,
    stock:134,activeLeads:532,requirements:150,scheduledVisits:94,realizedVisits:65,
  })
  assert.deepEqual(byName.get('Nueva Costanera'), {
    name:'Nueva Costanera',creditedClosings:2,creditedSalesUf:26650,canonicalClosingTarget:2.8,
    managementScore:67.5,portfolioScore:69.1,followUpScore:66.4,conversionScore:66.6,
    stock:95,activeLeads:373,requirements:165,scheduledVisits:118,realizedVisits:62,
  })
  assert.deepEqual(byName.get('Lo Beltrán'), {
    name:'Lo Beltrán',creditedClosings:2.5,creditedSalesUf:38200,canonicalClosingTarget:3.1,
    managementScore:67.9,portfolioScore:64.4,followUpScore:76.8,conversionScore:63.6,
    stock:95,activeLeads:323,requirements:153,scheduledVisits:112,realizedVisits:62,
  })
})

test('Office 360 does not manufacture office-level 2025 YoY', () => {
  assert.ok(periods.every((period)=>period.period.startsWith('2026-')))
})


test('canonical office entities expose Jan-Aug evolution for CEO drill-down', async () => {
  const mod = await import('../lib/management-canonical-periods')
  const entities = mod.getCanonicalManagementDashboardEntities()
  for (const officeName of offices) {
    const office = entities.find((entity) => entity.entityType === 'branch' && entity.name === officeName)
    assert.ok(office, `missing ${officeName}`)
    assert.equal(office?.evolution?.length, 8)
    assert.equal(office?.evolution?.at(-1)?.period, '2026-08')
    assert.equal(office?.evolution?.at(-1)?.metrics?.management_credited_sales, office?.evolution?.at(-1)?.sales)
  }
})


test('August board extract preserves Pedro report semantics and values', async () => {
  const mod = await import('../lib/management-august-board')
  const board = mod.getAugustBoard()
  assert.equal(board.source.file, 'Ago_Directorio.pptx')
  assert.equal(board.source.period, '2026-08')
  assert.equal(board.scoring.formula, 'Calidad Gestión = 0.4×Calidad Cartera + 0.3×Calidad Seguim + 0.3×Calidad Conversión')

  const company = mod.getAugustBoardCompany()
  assert.equal(company?.sale.closings, 8)
  assert.equal(company?.sale.salesUf, 141650)
  assert.equal(company?.ytd.closings, 50.5)
  assert.equal(company?.ytd.salesUf, 920786)
  assert.deepEqual(company?.scores, { management:67.4, portfolio:65.8, followUp:69.8, conversion:67.3 })

  const santaMaria = mod.getAugustBoardEntityBySlug('santa-maria')
  assert.equal(santaMaria?.sale.closingCompliancePct, 152)
  assert.equal(santaMaria?.indicators.conversion.tc6mPct, 2.5)

  const nuevaCostanera = mod.getAugustBoardEntityBySlug('nueva-costanera')
  assert.equal(nuevaCostanera?.indicators.followUp.staleA15Pct, 52)
  assert.equal(nuevaCostanera?.subscores.followUp.managedA15, 48.5)

  const loBeltran = mod.getAugustBoardEntityBySlug('lo-beltran')
  assert.equal(loBeltran?.classification, 'Potencial')
  assert.equal(loBeltran?.indicators.conversion.visitTargetPct, 35.5)
})
