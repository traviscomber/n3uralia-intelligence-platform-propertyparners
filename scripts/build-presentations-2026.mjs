import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sourcePath = path.resolve(process.argv[2] || process.env.PRESENTATIONS_AUDIT_PATH || '')
if (!process.argv[2] && !process.env.PRESENTATIONS_AUDIT_PATH) {
  throw new Error('Usage: node scripts/build-presentations-2026.mjs <presentation-summary.json>')
}

const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'))
const crm = JSON.parse(fs.readFileSync(path.join(root, 'data', 'crm-intelligence.json'), 'utf8'))
const targets = JSON.parse(fs.readFileSync(path.join(root, 'data', 'targets-2026.json'), 'utf8'))
const digest = createHash('sha256').update(fs.readFileSync(sourcePath)).digest('hex')

const months = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06']
const branchAliases = new Map([
  ['Lo Beltrán', 'Lo Beltran'],
  ['Lo Beltran', 'Lo Beltran'],
  ['Nueva Costanera', 'Nueva Costanera'],
  ['Santa María', 'Santa María'],
])

const number = (value, kind = 'count') => {
  if (typeof value === 'number') return value
  const text = String(value ?? '').replace(/\s/g, '').replace('%', '')
  if (!text || text === '-') return null
  if (kind === 'uf') return Number(text.replace(/\./g, '').replace(',', '.'))
  return Number(text.replace(',', '.'))
}
const rounded = (value, decimals = 3) => value === null || value === undefined ? null : Number(Number(value).toFixed(decimals))
const delta = (presentation, comparison) => presentation === null || comparison === null || comparison === undefined ? null : rounded(presentation - comparison)
const status = (presentation, comparison, tolerance = 0.0001) => comparison === null || comparison === undefined ? 'not_comparable' : Math.abs(presentation - comparison) <= tolerance ? 'exact' : 'different'

function slide(deck, index) {
  const found = deck.slides.find((item) => item.index === index)
  if (!found) throw new Error(`Missing slide ${index} in ${deck.file}`)
  return found
}

function rowMap(table) {
  return Object.fromEntries((table || []).slice(1).map((row) => [String(row[0]).trim(), row.slice(1)]))
}

function parseEvolution(deck, index) {
  const sourceSlide = slide(deck, index)
  const table = sourceSlide.tables[0]?.value
  if (!table) throw new Error(`Missing evolution table at ${deck.file} slide ${index}`)
  const rows = rowMap(table)
  const monthByLabel = { Ene: '2026-01', Feb: '2026-02', Mar: '2026-03', Abr: '2026-04', May: '2026-05', Jun: '2026-06' }
  const columns = table[0].slice(1).map((label, index) => ({ period: monthByLabel[String(label).trim()], index })).filter((item) => item.period)
  const parseSeries = (label, kind) => Object.fromEntries(months.map((month) => {
    const column = columns.find((item) => item.period === month)
    return [month, column ? number(rows[label]?.[column.index], kind) : null]
  }))
  return {
    source: { deck: deck.file, slide: index, title: sourceSlide.title },
    salesCount: parseSeries('Cierres mes', 'count'),
    salesUf: parseSeries('UF mes', 'uf'),
    targetSalesCount: parseSeries('Meta ci mes', 'count'),
    targetSalesUf: parseSeries('Meta UF mes', 'uf'),
    cumulativeSalesCount: parseSeries('Cierres acum.', 'count'),
    cumulativeSalesUf: parseSeries('UF acum.', 'uf'),
    cumulativeTargetSalesCount: parseSeries('Meta ci acum.', 'count'),
    cumulativeTargetSalesUf: parseSeries('Meta UF acum.', 'uf'),
  }
}

function parseSalesSummary(deck, index) {
  const sourceSlide = slide(deck, index)
  const table = sourceSlide.tables[0]?.value
  if (!table) throw new Error(`Missing sales summary at ${deck.file} slide ${index}`)
  const rows = rowMap(table)
  return {
    source: { deck: deck.file, slide: index, title: sourceSlide.title },
    currentSalesCount: number(rows.Cierres?.[0], 'count'),
    currentSalesUf: number(rows.UF?.[0], 'uf'),
    currentTargetSalesCount: number(rows.Cierres?.[1], 'count'),
    currentTargetSalesUf: number(rows.UF?.[1], 'uf'),
    cumulativeSalesCount: number(rows.Cierres?.[5], 'count'),
    cumulativeSalesUf: number(rows.UF?.[5], 'uf'),
    cumulativeTargetSalesCount: number(rows.Cierres?.[6], 'count'),
    cumulativeTargetSalesUf: number(rows.UF?.[6], 'uf'),
    rawTable: table,
  }
}

function parseScores(deck, index) {
  const sourceSlide = slide(deck, index)
  const text = sourceSlide.texts.map((item) => item.text).join(' | ')
  const capture = (label) => {
    const match = text.match(new RegExp(`${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} \\| ([0-9.]+)`))
    return match ? Number(match[1]) : null
  }
  const classification = text.match(/(?:Calidad Gestión|Calidad Gesti.n): [0-9.]+ \| ([^|]+) \|?$/)?.[1]?.trim() || null
  return {
    source: { deck: deck.file, slide: index, title: sourceSlide.title },
    management: capture('Calidad Gestión'),
    portfolio: capture('Calidad Cartera (40%)'),
    followUp: capture('Calidad Seguim (30%)'),
    conversion: capture('Calidad Conversión (30%)'),
    classification,
    rawText: text,
  }
}

function parseIndicators(deck, index) {
  const sourceSlide = slide(deck, index)
  const tables = sourceSlide.tables.map((item) => item.value)
  const portfolio = rowMap(tables[0])
  const followUp = rowMap(tables[1])
  const conversion = rowMap(tables[2])
  const ratio = (value) => String(value || '').split('/').map((item) => number(item, 'count'))
  const [classified, active] = ratio(followUp['Leads clasif/activos']?.[0])
  const [stale90] = ratio(followUp['Leads sg 90d / activos']?.[0])
  const [stale15A, activeA] = ratio(followUp['Leads A sg 15d / A']?.[0])
  const [realizedVisits, scheduledVisits] = ratio(conversion['Vis realizadas / agendadas']?.[0])
  const tcText = String(conversion['TC 6 meses']?.[0] || '')
  return {
    source: { deck: deck.file, slide: index, title: sourceSlide.title },
    stock: number(portfolio['Cartera actual']?.[0], 'count'),
    stockTarget: number(portfolio['Cartera actual']?.[1], 'count'),
    requirements: number(portfolio.Requerimientos?.[0], 'count'),
    requirementsReference: number(String(portfolio.Requerimientos?.[1] || '').replace(/[^0-9.,-]/g, ''), 'count'),
    classifiedLeads: classified,
    activeLeads: active,
    activeALeads: number(String(followUp['Leads clasif/activos']?.[1] || '').replace(/[^0-9.,-]/g, ''), 'count'),
    stale90Leads: stale90,
    stale15ALeads: stale15A,
    stale15ADenominator: activeA,
    realizedVisits,
    scheduledVisits,
    conversionClosings: number(tcText.match(/[0-9.]+/)?.[0], 'count'),
    conversionLeadBase: number(tcText.split('/')[1]?.replace(/[^0-9.,-]/g, ''), 'count'),
    rawTables: tables,
  }
}

function parseEntity(deck, start, name, branch) {
  return {
    name,
    branch,
    slideRange: [start, start + 7],
    salesSummary: parseSalesSummary(deck, start),
    sales: parseEvolution(deck, start + 1),
    scores: parseScores(deck, start + 2),
    indicators: parseIndicators(deck, start + 3),
    trendSlides: [start + 4, start + 5, start + 6, start + 7],
  }
}

const director = source.decks.find((deck) => deck.file === 'Jun_Directorio_5.pptx')
const q2Director = source.decks.find((deck) => deck.file === 'Q2_Directorio_1.pptx')
if (!director || !q2Director) throw new Error('Director decks are required')

const company = parseEntity(director, 4, 'PL Real Estate Spa', null)
const branchStarts = [['Santa María', 13], ['Nueva Costanera', 22], ['Lo Beltrán', 31]]
const branches = branchStarts.map(([name, start]) => parseEntity(director, start, name, name))

const partnerDecks = source.decks.filter((deck) => deck.file.startsWith('Jun_Partners_'))
const partners = []
for (const deck of partnerDecks) {
  const branch = deck.slides[2]?.title || deck.slides[11]?.title?.replace(' Detalle por Partner', '')
  for (let start = 13; start <= deck.slideCount; start += 8) {
    const title = slide(deck, start).title
    const name = title.split(' — ')[0].trim()
    partners.push(parseEntity(deck, start, name, branch))
  }
}

const crmByMonth = Object.fromEntries(crm.months.map((month) => [month.period, month]))
const targetBranch = (branch, metric, period) => {
  const targetName = branchAliases.get(branch) || branch
  return targets.branches.find((item) => item.branch === targetName)?.sections.find((item) => item.metric === metric)?.branchMonths?.[period] || null
}

const comparisons = []
function compare(scope, metric, period, presentation, comparison, comparisonSource, sourceRef, tolerance = 0.0001) {
  comparisons.push({
    scope, metric, period, presentation, comparison,
    delta: delta(presentation, comparison), status: status(presentation, comparison, tolerance),
    presentationSource: sourceRef, comparisonSource,
  })
}

for (const period of months) {
  const month = crmByMonth[period]
  compare('PL Real Estate Spa', 'sales_count', period, company.sales.salesCount[period], month.salesCount, 'CRM mensual normalizado', company.sales.source)
  compare('PL Real Estate Spa', 'sales_uf', period, company.sales.salesUf[period], month.salesUf, 'CRM mensual normalizado', company.sales.source)
  compare('PL Real Estate Spa', 'target_sales_count', period, company.sales.targetSalesCount[period], targets.companyMonthlyTargets.sales_count[period], 'Metas 2026 rev 202607, suma cruda de sucursales', company.sales.source, 0.05)
  compare('PL Real Estate Spa', 'target_sales_uf', period, company.sales.targetSalesUf[period], targets.companyMonthlyTargets.sales_uf[period], 'Metas 2026 rev 202607, suma cruda de sucursales', company.sales.source, 1)
  for (const branch of branches) {
    const office = branch.name
    const crmCount = month.salesByOffice.find((item) => item.label === office)?.count ?? null
    const crmUf = month.salesUfByOffice.find((item) => item.label === office)?.value ?? null
    compare(office, 'sales_count', period, branch.sales.salesCount[period], crmCount, 'CRM mensual por sucursal', branch.sales.source)
    compare(office, 'sales_uf', period, branch.sales.salesUf[period], crmUf, 'CRM mensual por sucursal', branch.sales.source)
    const countTarget = targetBranch(office, 'sales_count', period)
    const ufTarget = targetBranch(office, 'sales_uf', period)
    compare(office, 'target_sales_count', period, branch.sales.targetSalesCount[period], countTarget?.value ?? null, countTarget ? `Metas 2026 ${countTarget.cell}` : 'Sin celda comparable', branch.sales.source, 0.05)
    compare(office, 'target_sales_uf', period, branch.sales.targetSalesUf[period], ufTarget?.value ?? null, ufTarget ? `Metas 2026 ${ufTarget.cell}` : 'Sin celda comparable', branch.sales.source, 1)
  }
}

const latest = crmByMonth['2026-06']
const latestLead = crm.latestLeadSnapshot
const snapshotMetrics = [
  ['stock', company.indicators.stock, latest.stockCount, 'CRM total cartera junio'],
  ['requirements', company.indicators.requirements, latest.requirementsCount, 'CRM requerimientos junio'],
  ['active_leads', company.indicators.activeLeads, latestLead.active, 'CRM snapshot leads junio'],
  ['classified_leads', company.indicators.classifiedLeads, latestLead.classified, 'CRM snapshot leads junio'],
  ['stale_90_leads', company.indicators.stale90Leads, latestLead.staleOver90, 'CRM snapshot leads junio'],
  ['scheduled_visits', company.indicators.scheduledVisits, latest.visitsCount, 'CRM visitas junio'],
  ['realized_visits', company.indicators.realizedVisits, latest.realizedVisitsCount, 'CRM visitas junio'],
]
for (const [metric, presentation, comparison, comparisonSource] of snapshotMetrics) {
  compare('PL Real Estate Spa', metric, '2026-06-snapshot', presentation, comparison, comparisonSource, company.indicators.source)
}
for (const branch of branches) {
  const office = branch.name
  const stock = latest.stockByOffice.find((item) => item.label === office)?.count ?? null
  const requirements = latest.requirementsByOffice.find((item) => item.label === office)?.count ?? null
  const visits = latest.visitsByOffice.find((item) => item.label === office)?.count ?? null
  const realized = latest.realizedVisitsByOffice.find((item) => item.label === office)?.count ?? null
  for (const [metric, presentation, comparison, comparisonSource] of [
    ['stock', branch.indicators.stock, stock, 'CRM total cartera junio por sucursal'],
    ['requirements', branch.indicators.requirements, requirements, 'CRM requerimientos junio por sucursal'],
    ['scheduled_visits', branch.indicators.scheduledVisits, visits, 'CRM visitas junio por sucursal'],
    ['realized_visits', branch.indicators.realizedVisits, realized, 'CRM visitas junio por sucursal'],
  ]) compare(office, metric, '2026-06-snapshot', presentation, comparison, comparisonSource, branch.indicators.source)
}

const internalChecks = []
const addInternal = (check, expected, observed, sources, tolerance = 0.0001) => internalChecks.push({ check, expected, observed, delta: delta(observed, expected), status: status(observed, expected, tolerance), sources })
for (const period of months) {
  addInternal(`Suma sucursales vs compañía, cierres ${period}`, company.sales.salesCount[period], branches.reduce((sum, branch) => sum + (branch.sales.salesCount[period] || 0), 0), [company.sales.source, ...branches.map((branch) => branch.sales.source)])
  addInternal(`Suma sucursales vs compañía, UF ${period}`, company.sales.salesUf[period], branches.reduce((sum, branch) => sum + (branch.sales.salesUf[period] || 0), 0), [company.sales.source, ...branches.map((branch) => branch.sales.source)])
}
for (const branch of branches) {
  const matchingPartners = partners.filter((partner) => partner.branch === branch.name)
  for (const period of months) {
    const partnerCount = matchingPartners.reduce((sum, partner) => sum + (period === '2026-06' ? partner.salesSummary.currentSalesCount : partner.sales.salesCount[period] || 0), 0)
    const partnerUf = matchingPartners.reduce((sum, partner) => sum + (period === '2026-06' ? partner.salesSummary.currentSalesUf : partner.sales.salesUf[period] || 0), 0)
    addInternal(`Suma partners vs ${branch.name}, cierres ${period}`, branch.sales.salesCount[period], partnerCount, [branch.sales.source, ...matchingPartners.map((partner) => period === '2026-06' ? partner.salesSummary.source : partner.sales.source)])
    addInternal(`Suma partners vs ${branch.name}, UF ${period}`, branch.sales.salesUf[period], partnerUf, [branch.sales.source, ...matchingPartners.map((partner) => period === '2026-06' ? partner.salesSummary.source : partner.sales.source)])
  }
}

const rawDecks = source.decks.map((deck) => ({
  file: deck.file,
  sha256: deck.sha256,
  byteSize: deck.byteSize,
  slideCount: deck.slideCount,
  mediaCount: deck.mediaCount,
  embeddingCount: deck.embeddingCount,
  stats: deck.stats,
  style: deck.style,
  slides: deck.slides.map((item) => ({
    index: item.index,
    title: item.title,
    backgroundColor: item.backgroundColor,
    texts: item.texts.map((text) => text.text),
    tables: item.tables,
    charts: item.charts,
    notes: item.notes,
  })),
}))

const output = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  source: {
    file: path.basename(sourcePath),
    sha256: digest,
    presentationCount: source.deckCount,
    slideCount: source.slideCount,
    contentCoverage: { slides: source.slideCount, tables: source.decks.reduce((sum, deck) => sum + deck.stats.tables, 0), charts: source.decks.reduce((sum, deck) => sum + deck.stats.charts, 0), textObjects: source.decks.reduce((sum, deck) => sum + deck.stats.textObjects, 0), embeddedWorkbooks: source.decks.reduce((sum, deck) => sum + deck.embeddingCount, 0) },
  },
  scope: { commune: 'Vitacura', operation: 'Venta', period: '2026-01/2026-06', audiences: ['Directorio', 'Partners'] },
  brandbook: {
    provenance: 'Frecuencias y geometría extraídas de las cinco presentaciones reales; no corresponde al tema Office declarado.',
    font: 'Calibri',
    backgrounds: source.style.backgrounds,
    textColors: source.style.colors,
    fills: source.style.fills,
    rules: [
      'Portadas negras con logotipo Property Partners Vitacura centrado y línea blanca.',
      'Láminas analíticas en gris #F0F0F0 con encabezado negro y acento rojo.',
      'Rojo #E74C3C para alerta o bajo desempeño, ámbar #F39C12 para transición, verde #27AE60 para cumplimiento y azul #1565C0 para cartera/metas.',
      'Tablas compactas, encabezados negros, cifras de alta densidad y títulos sin ornamentación.',
    ],
  },
  scoringDefinition: { source: { deck: director.file, slide: 2 }, text: slide(director, 2).texts.map((item) => item.text), tables: slide(director, 2).tables },
  management: { company, branches, partners },
  reconciliation: {
    rule: 'Una diferencia no se corrige ni se promedia. Se conserva cada valor con su corte, definición y fuente.',
    counts: {
      total: comparisons.length,
      exact: comparisons.filter((item) => item.status === 'exact').length,
      different: comparisons.filter((item) => item.status === 'different').length,
      notComparable: comparisons.filter((item) => item.status === 'not_comparable').length,
    },
    comparisons,
    internalCounts: {
      total: internalChecks.length,
      exact: internalChecks.filter((item) => item.status === 'exact').length,
      different: internalChecks.filter((item) => item.status === 'different').length,
    },
    internalChecks,
    headline: {
      presentationYtdSales: company.sales.cumulativeSalesCount['2026-06'],
      crmYtdSales: crm.ytd.salesCount,
      salesDelta: delta(company.sales.cumulativeSalesCount['2026-06'], crm.ytd.salesCount),
      presentationYtdUf: company.sales.cumulativeSalesUf['2026-06'],
      crmYtdUf: crm.ytd.salesUf,
      ufDelta: delta(company.sales.cumulativeSalesUf['2026-06'], crm.ytd.salesUf),
    },
  },
  decks: rawDecks,
}

fs.writeFileSync(path.join(root, 'data', 'presentations-2026.json'), JSON.stringify(output, null, 2) + '\n')
fs.writeFileSync(path.join(root, 'data', 'presentations-2026-summary.json'), JSON.stringify({
  schemaVersion: output.schemaVersion,
  generatedAt: output.generatedAt,
  source: output.source,
  scope: output.scope,
  brandbook: output.brandbook,
  management: {
    company: output.management.company,
    branches: output.management.branches,
    partnerCount: output.management.partners.length,
  },
  reconciliation: {
    rule: output.reconciliation.rule,
    counts: output.reconciliation.counts,
    internalCounts: output.reconciliation.internalCounts,
    headline: output.reconciliation.headline,
  },
  decks: output.decks.map(({ file, sha256, byteSize, slideCount, mediaCount, embeddingCount, stats }) => ({ file, sha256, byteSize, slideCount, mediaCount, embeddingCount, stats })),
}, null, 2) + '\n')
console.log(JSON.stringify({ source: output.source, reconciliation: output.reconciliation.counts, internal: output.reconciliation.internalCounts, headline: output.reconciliation.headline }, null, 2))
