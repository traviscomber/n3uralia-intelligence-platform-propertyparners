#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import XLSX from 'xlsx'

const MONTHS = [
  { period: '2026-01', folder: 'Datos 202601', label: 'Ene 2026', names: { sales: 'cierres_enero_2026_ventas.xlsx', captures: 'captadas_enero_2026.xlsx', leads: 'leads_enero_2026.xlsx', requirements: 'requerimientos_online_enero_2026.xlsx', visits: 'visitas_enero_2026.xlsx', suspended: 'suspendidas_enero_2026.xlsx', stock: 'total_cartera_20260218.xlsx' } },
  { period: '2026-02', folder: 'Datos 202602', label: 'Feb 2026', names: { sales: 'ventas_febrero_2026.xlsx', captures: 'captadas_febrero_2026.xlsx', leads: 'leads_febrero_2026.xlsx', requirements: 'requerimientos_online_febrero_2026.xlsx', visits: null, suspended: 'suspendidas_febrero_2026.xlsx', stock: 'total_cartera_febrero_2026.xlsx' } },
  { period: '2026-03', folder: 'Datos 202603', label: 'Mar 2026', names: { sales: 'ventas_marzo_2026.xlsx', captures: 'captadas_marzo_2026.xlsx', leads: 'leads_marzo_2026.xlsx', requirements: 'requerimientos_online_marzo_2026.xlsx', visits: 'visitas_marzo_2026.xlsx', suspended: 'suspendidas_marzo_2026.xlsx', stock: 'total_cartera_20260402.xlsx' } },
  { period: '2026-04', folder: 'Datos 202604', label: 'Abr 2026', names: { sales: 'cierres_abril_2026.xlsx', captures: 'captadas_abril_2026.xlsx', leads: 'leads_abril_2026.xlsx', requirements: 'requerimientos_online_abril_2026.xlsx', visits: 'visitas_abril_2026.xlsx', suspended: 'suspendidas_abril_2026.xlsx', stock: 'total_cartera_abril_2026.xlsx' } },
  { period: '2026-05', folder: 'Datos 202605', label: 'May 2026', names: { sales: 'cierres_mayo_2026.xlsx', captures: 'captadas_mayo_2026.xlsx', leads: 'leads_mayo_2026.xlsx', requirements: 'requerimientos_online_mayo_2026.xlsx', visits: 'visitas_mayo_2026.xlsx', suspended: 'suspendidas_mayo_2026.xlsx', stock: 'total_cartera_mayo_2026.xlsx' } },
  { period: '2026-06', folder: 'Datos 202606', label: 'Jun 2026', names: { sales: 'cierres_junio_2026.xlsx', captures: 'captadas_junio_2026.xlsx', leads: 'leads_junio_2026.xlsx', requirements: 'requerimientos_online_junio_2026.xlsx', visits: 'visitas_junio_2026.xlsx', suspended: 'suspendidas_junio_2026.xlsx', stock: 'total_cartera_junio_2026.xlsx' } },
]

const ENTITY_IDS = {
  sales: 'operacion - id',
  captures: 'propiedad - id',
  leads: 'lead - id',
  requirements: 'requerimiento - id',
  visits: 'visita - id',
  suspended: 'propiedad - id',
  stock: 'propiedad - id',
}

function parseArgs() {
  const args = process.argv.slice(2)
  const value = (flag) => {
    const index = args.indexOf(flag)
    return index >= 0 ? args[index + 1] : null
  }
  const input = value('--input') || process.env.CRM_XLS_ROOT
  const output = value('--output') || path.resolve('data/crm-intelligence.json')
  if (!input) throw new Error('Use --input <Datos CRM> or define CRM_XLS_ROOT.')
  return { input: path.resolve(input), output: path.resolve(output) }
}

function normalize(value) {
  return String(value ?? '')
    .replace(/\u00a0/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

function display(value) {
  return String(value ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim()
}

function numeric(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const parsed = Number(String(value ?? '').replace(/[^0-9.-]/g, ''))
  return Number.isFinite(parsed) ? parsed : null
}

function readWorkbook(file) {
  const workbook = XLSX.readFile(file, { cellDates: true })
  const sheetName = workbook.SheetNames.includes('Data') ? 'Data' : workbook.SheetNames.at(-1)
  const matrix = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: null, raw: true })
  const headers = matrix[0] ?? []
  const indexes = new Map(headers.map((header, index) => [normalize(header), index]).filter(([header]) => header))
  const rows = matrix.slice(1).filter((row) => row.some((value) => value !== null && value !== ''))
  return { sheetName, indexes, rows }
}

function cell(row, indexes, key) {
  const index = indexes.get(key)
  return index === undefined ? null : row[index]
}

function inScope(row, indexes) {
  const branch = normalize(cell(row, indexes, 'sucursal - nombre'))
  const operation = normalize(cell(row, indexes, 'propiedad - operacion'))
  const propertyType = normalize(cell(row, indexes, 'propiedad - tipo'))
  const leadType = normalize(cell(row, indexes, 'lead - tipo'))
  return (!branch || branch === 'vitacura')
    && (!operation || operation === 'venta')
    && (!propertyType || propertyType === 'casa' || propertyType === 'departamento')
    && (!leadType || leadType === 'compra')
}

function canonicalRows(file, kind) {
  if (!file || !fs.existsSync(file)) return { records: [], quality: { rawRows: 0, acceptedRows: 0, duplicateRows: 0, excludedRows: 0, malformedRows: 0, missing: true } }
  const { sheetName, indexes, rows } = readWorkbook(file)
  const idKey = ENTITY_IDS[kind]
  const records = new Map()
  let malformedRows = 0
  let excludedRows = 0
  let duplicateRows = 0

  for (const row of rows) {
    const id = normalize(cell(row, indexes, idKey))
    if (!id || id === idKey) {
      malformedRows += 1
      continue
    }
    if (!inScope(row, indexes)) {
      excludedRows += 1
      continue
    }
    if (kind === 'sales' && normalize(cell(row, indexes, 'propiedad - estado')) !== 'vendida') {
      excludedRows += 1
      continue
    }
    if (kind === 'stock' && normalize(cell(row, indexes, 'propiedad - estado')) !== 'publicada') {
      excludedRows += 1
      continue
    }
    if (kind === 'suspended' && normalize(cell(row, indexes, 'propiedad - estado')) !== 'suspendida') {
      excludedRows += 1
      continue
    }
    if (records.has(id)) {
      duplicateRows += 1
      continue
    }
    records.set(id, { id, row, indexes })
  }

  return {
    records: [...records.values()],
    quality: { source: path.basename(file), sheet: sheetName, rawRows: rows.length, acceptedRows: records.size, duplicateRows, excludedRows, malformedRows, missing: false },
  }
}

function ranked(records, key, limit = 8) {
  const values = new Map()
  for (const record of records) {
    const original = display(cell(record.row, record.indexes, key))
    const canonical = normalize(original)
    if (!canonical || canonical === 'n/a' || canonical === 'na') continue
    const current = values.get(canonical) || { label: original, count: 0 }
    current.count += 1
    if (original.length > current.label.length) current.label = original
    values.set(canonical, current)
  }
  return [...values.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)).slice(0, limit)
}

function median(values) {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

function buildMonth(root, config) {
  const base = path.join(root, config.folder, 'raw')
  const loaded = Object.fromEntries(Object.entries(config.names).map(([kind, name]) => [kind, canonicalRows(name ? path.join(base, name) : null, kind)]))
  const sales = loaded.sales.records
  const prices = sales
    .filter((record) => normalize(cell(record.row, record.indexes, 'operacion - moneda')) === 'uf')
    .map((record) => numeric(cell(record.row, record.indexes, 'operacion - precio de cierre')))
    .filter((value) => value !== null)
  const accepted = Object.values(loaded).reduce((sum, item) => sum + item.quality.acceptedRows, 0)
  const malformed = Object.values(loaded).reduce((sum, item) => sum + item.quality.malformedRows, 0)
  const duplicates = Object.values(loaded).reduce((sum, item) => sum + item.quality.duplicateRows, 0)
  const excluded = Object.values(loaded).reduce((sum, item) => sum + item.quality.excludedRows, 0)
  const missingDatasets = Object.entries(loaded).filter(([, item]) => item.quality.missing).map(([kind]) => kind)
  const expectedDatasets = Object.keys(config.names).length
  const sourceCoverage = expectedDatasets === 0
    ? 0
    : Number((((expectedDatasets - missingDatasets.length) / expectedDatasets) * 100).toFixed(1))

  return {
    period: config.period,
    label: config.label,
    salesCount: sales.length,
    salesUf: Math.round(prices.reduce((sum, value) => sum + value, 0)),
    medianSaleUf: median(prices),
    capturesCount: loaded.captures.records.length,
    newLeadsCount: loaded.leads.records.length,
    requirementsCount: loaded.requirements.records.length,
    visitsCount: loaded.visits.quality.missing ? null : loaded.visits.records.length,
    stockCount: loaded.stock.records.length,
    suspendedCount: loaded.suspended.records.length,
    salesByType: ranked(sales, 'propiedad - tipo'),
    salesByOffice: ranked(sales, 'sub-sucursal - nombre'),
    salesByListingAgent: ranked(sales, 'propiedad - agente', 12),
    capturesByAgent: ranked(loaded.captures.records, 'propiedad - agente', 12),
    leadOrigins: ranked(loaded.leads.records, 'lead - origen'),
    leadOwners: ranked(loaded.leads.records, 'partner - nombre', 12),
    quality: { sourceCoverage, expectedDatasets, acceptedRecords: accepted, excludedOutsideScope: excluded, duplicateRows: duplicates, malformedRows: malformed, missingDatasets, files: Object.fromEntries(Object.entries(loaded).map(([kind, item]) => [kind, item.quality])) },
  }
}

function leadSnapshot(root, period) {
  const base = path.join(root, `Datos ${period}`, 'raw')
  const files = {
    active: `leads_activos_${period === '202604' ? 'abril_2026' : period === '202605' ? 'mayo_2026' : period === '202606' ? 'junio_2026' : '2026'}.xlsx`,
    classified: `leads_clasificados_${period === '202604' ? 'abril_2026' : period === '202605' ? 'mayo_2026' : period === '202606' ? 'junio_2026' : '2026'}.xlsx`,
    unclassified: `leads_sin_clasificar_${period === '202604' ? 'abril_2026' : period === '202605' ? 'mayo_2026' : period === '202606' ? 'junio_2026' : '2026'}.xlsx`,
    stale15: `leads_sin_gestion_15_dias_${period === '202604' ? 'abril_2026' : period === '202605' ? 'mayo_2026' : period === '202606' ? 'junio_2026' : '2026'}.xlsx`,
    stale90: `leads_sin_gestion_90_dias_${period === '202604' ? 'abril_2026' : period === '202605' ? 'mayo_2026' : period === '202606' ? 'junio_2026' : '2026'}.xlsx`,
  }
  const loaded = Object.fromEntries(Object.entries(files).map(([key, name]) => [key, canonicalRows(path.join(base, name), 'leads')]))
  const count = (key) => loaded[key].records.length
  const activeIds = new Set(loaded.active.records.map((record) => record.id))
  const classifiedIds = new Set(loaded.classified.records.map((record) => record.id).filter((id) => activeIds.has(id)))
  const unclassifiedIds = new Set(loaded.unclassified.records.map((record) => record.id).filter((id) => activeIds.has(id)))
  const classifiedCoverageIds = new Set([...classifiedIds, ...unclassifiedIds])
  const stale15To90 = count('stale15')
  const staleOver90 = count('stale90')
  return {
    period: `${period.slice(0, 4)}-${period.slice(4)}`,
    active: count('active'),
    classified: count('classified'),
    unclassified: count('unclassified'),
    stale15To90,
    staleOver90,
    staleOver15Total: stale15To90 + staleOver90,
    staleOver15Rate: count('active') ? Number((((stale15To90 + staleOver90) / count('active')) * 100).toFixed(1)) : null,
    classificationCoverage: count('active') ? Number(((classifiedCoverageIds.size / count('active')) * 100).toFixed(1)) : null,
  }
}

function buildYtdEventDedupe(root) {
  const kinds = ['sales', 'captures', 'leads', 'requirements', 'visits']
  const recordsByKind = Object.fromEntries(kinds.map((kind) => [kind, new Map()]))
  const crossPeriodDuplicateIds = Object.fromEntries(kinds.map((kind) => [kind, new Set()]))

  for (const month of MONTHS) {
    const base = path.join(root, month.folder, 'raw')
    for (const kind of kinds) {
      const fileName = month.names[kind]
      if (!fileName) continue
      for (const record of canonicalRows(path.join(base, fileName), kind).records) {
        if (recordsByKind[kind].has(record.id)) crossPeriodDuplicateIds[kind].add(record.id)
        else recordsByKind[kind].set(record.id, record)
      }
    }
  }

  const salesUf = [...recordsByKind.sales.values()]
    .filter((record) => normalize(cell(record.row, record.indexes, 'operacion - moneda')) === 'uf')
    .map((record) => numeric(cell(record.row, record.indexes, 'operacion - precio de cierre')) ?? 0)
    .reduce((sum, value) => sum + value, 0)

  return {
    uniqueCounts: Object.fromEntries(kinds.map((kind) => [kind, recordsByKind[kind].size])),
    crossPeriodDuplicateIds: Object.fromEntries(kinds.map((kind) => [kind, crossPeriodDuplicateIds[kind].size])),
    salesUf: Math.round(salesUf),
  }
}

function buildAprilFortnightReconciliation(root) {
  const fortnightBase = path.join(root, 'Datos 202604', 'informe_quincenal', 'raw')
  const monthBase = path.join(root, 'Datos 202604', 'raw')
  const sources = {
    sales: ['ventas_quincena_abril_vitacura.xlsx', 'cierres_abril_2026.xlsx'],
    captures: ['captadas_este_mes_vitacura.xlsx', 'captadas_abril_2026.xlsx'],
    leads: ['leads_este_mes_vitacura.xlsx', 'leads_abril_2026.xlsx'],
    requirements: ['requerimientos_online_este_mes_vitacura.xlsx', 'requerimientos_online_abril_2026.xlsx'],
    visits: ['visitas_este_mes_vitacura.xlsx', 'visitas_abril_2026.xlsx'],
    suspended: ['suspendidas_este_mes_vitacura.xlsx', 'suspendidas_abril_2026.xlsx'],
  }

  return Object.fromEntries(Object.entries(sources).map(([kind, [fortnightName, monthName]]) => {
    const fortnightIds = new Set(canonicalRows(path.join(fortnightBase, fortnightName), kind).records.map((record) => record.id))
    const monthIds = new Set(canonicalRows(path.join(monthBase, monthName), kind).records.map((record) => record.id))
    const overlap = [...fortnightIds].filter((id) => monthIds.has(id)).length
    return [kind, {
      fortnight: fortnightIds.size,
      month: monthIds.size,
      overlap,
      fortnightOnly: fortnightIds.size - overlap,
      monthOnly: monthIds.size - overlap,
    }]
  }))
}

function mergeRankings(months, field, limit = 12) {
  const merged = new Map()
  for (const month of months) {
    for (const entry of month[field]) {
      const key = normalize(entry.label)
      const current = merged.get(key) || { label: entry.label, count: 0 }
      current.count += entry.count
      merged.set(key, current)
    }
  }
  return [...merged.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)).slice(0, limit)
}

function listWorkbooks(root) {
  const files = []
  function visit(folder) {
    for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
      const absolute = path.join(folder, entry.name)
      if (entry.isDirectory()) visit(absolute)
      else if (entry.name.toLowerCase().endsWith('.xlsx')) files.push(absolute)
    }
  }
  visit(root)
  return files.sort((a, b) => a.localeCompare(b))
}

function auditWorkbooks(root) {
  return listWorkbooks(root).map((file) => {
    const { sheetName, rows } = readWorkbook(file)
    const workbook = XLSX.readFile(file, { cellFormula: true })
    let formulaCells = 0
    let formulaErrorCells = 0
    for (const name of workbook.SheetNames) {
      for (const [address, value] of Object.entries(workbook.Sheets[name])) {
        if (address.startsWith('!')) continue
        if (value?.f) formulaCells += 1
        if (value?.t === 'e') formulaErrorCells += 1
      }
    }
    return {
      file: path.relative(root, file).replaceAll('\\', '/'),
      selectedSheet: sheetName,
      dataRows: rows.length,
      formulaCells,
      formulaErrorCells,
    }
  })
}

function build2025Baseline(root) {
  const base = path.join(root, 'Datos 2025', 'raw')
  const sales = canonicalRows(path.join(base, 'ventas_2025_vitacura_con_vendedor.xlsx'), 'sales').records
  const leads = canonicalRows(path.join(base, 'leads_2025.xlsx'), 'leads').records
  const requirements = canonicalRows(path.join(base, 'requerimientos_por_propiedades_2025.xlsx'), 'requirements').records
  const visits = canonicalRows(path.join(base, 'visitas_agendadas_2025.xlsx'), 'visits').records
  const monthlySales = new Map(Array.from({ length: 12 }, (_, index) => [`2025-${String(index + 1).padStart(2, '0')}`, { salesCount: 0, salesUf: 0 }]))
  let salesUf = 0

  for (const record of sales) {
    const closeDate = cell(record.row, record.indexes, 'operacion - fecha cierre negocio')
    const date = closeDate instanceof Date ? closeDate : new Date(closeDate)
    const period = Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 7)
    const price = normalize(cell(record.row, record.indexes, 'operacion - moneda')) === 'uf'
      ? numeric(cell(record.row, record.indexes, 'operacion - precio de cierre')) ?? 0
      : 0
    salesUf += price
    if (period && monthlySales.has(period)) {
      const month = monthlySales.get(period)
      month.salesCount += 1
      month.salesUf += price
    }
  }

  const months = [...monthlySales.entries()].map(([period, values]) => ({ period, ...values }))
  return {
    salesCount: sales.length,
    salesUf: Math.round(salesUf),
    newLeadsCount: leads.length,
    requirementsCount: requirements.length,
    uniqueVisitsCount: visits.length,
    firstHalfSalesCount: months.slice(0, 6).reduce((sum, month) => sum + month.salesCount, 0),
    firstHalfSalesUf: Math.round(months.slice(0, 6).reduce((sum, month) => sum + month.salesUf, 0)),
    months,
  }
}

function main() {
  const { input, output } = parseArgs()
  if (!fs.existsSync(input)) throw new Error(`Input folder does not exist: ${input}`)
  const months = MONTHS.map((month) => buildMonth(input, month))
  const workbookAudit = auditWorkbooks(input)
  const baseline2025 = build2025Baseline(input)
  const latestLeadSnapshot = leadSnapshot(input, '202606')
  const ytdEventDedupe = buildYtdEventDedupe(input)
  const aprilFortnightReconciliation = buildAprilFortnightReconciliation(input)
  const total = (field) => months.reduce((sum, month) => sum + (month[field] ?? 0), 0)
  const firstStock = months[0].stockCount
  const latestStock = months.at(-1).stockCount
  const workbookCount = workbookAudit.length
  const ytd = {
    salesCount: ytdEventDedupe.uniqueCounts.sales,
    salesUf: ytdEventDedupe.salesUf,
    capturesCount: ytdEventDedupe.uniqueCounts.captures,
    newLeadsCount: ytdEventDedupe.uniqueCounts.leads,
    requirementsCount: ytdEventDedupe.uniqueCounts.requirements,
    visitsCount: months.some((month) => month.visitsCount === null) ? null : ytdEventDedupe.uniqueCounts.visits,
    knownVisitsCount: ytdEventDedupe.uniqueCounts.visits,
    crossPeriodDuplicateIds: ytdEventDedupe.crossPeriodDuplicateIds,
    stockChange: latestStock - firstStock,
    comparison2025: {
      salesChangePct: baseline2025.firstHalfSalesCount > 0 ? Number((((total('salesCount') / baseline2025.firstHalfSalesCount) - 1) * 100).toFixed(1)) : null,
      salesUfChangePct: baseline2025.firstHalfSalesUf > 0 ? Number((((total('salesUf') / baseline2025.firstHalfSalesUf) - 1) * 100).toFixed(1)) : null,
    },
    salesByOffice: mergeRankings(months, 'salesByOffice'),
    salesByListingAgent: mergeRankings(months, 'salesByListingAgent'),
    capturesByAgent: mergeRankings(months, 'capturesByAgent'),
  }
  const latest = months.at(-1)
  const previous = months.at(-2)
  const qualityIssues = [
    { severity: 'critical', code: 'MISSING_VISITS_2026_02', title: 'Visitas de febrero sin archivo', detail: 'El acumulado semestral de visitas se mantiene como no disponible; solo se informa el total de meses conocidos.' },
    { severity: 'warning', code: 'CROSS_PERIOD_VISIT_IDS', title: 'Visitas reagendadas entre cortes', detail: `${ytdEventDedupe.crossPeriodDuplicateIds.visits} IDs de visita aparecen en dos meses. El acumulado conocido se deduplica globalmente por Visita - Id.` },
    { severity: 'warning', code: 'JUNE_SALES_AUXILIARY_ROWS', title: 'Filas auxiliares en cierres de junio', detail: `${latest.quality.files.sales.malformedRows} filas sin Operacion - Id fueron puestas en cuarentena; junio conserva ${latest.salesCount} ventas validas.` },
    { severity: 'warning', code: 'SOURCE_FORMULA_ERRORS_2025_STOCK', title: 'Errores de formula en cartera 2025', detail: `${workbookAudit.reduce((sum, workbook) => sum + workbook.formulaErrorCells, 0)} celdas con error de formula fueron detectadas en las fuentes. No alimentan los KPI publicados y los XLS originales se mantienen inmutables.` },
    { severity: 'warning', code: 'APRIL_FORTNIGHT_SNAPSHOT_DRIFT', title: 'Deriva entre quincena y cierre de abril', detail: `El corte quincenal contiene ${aprilFortnightReconciliation.sales.fortnightOnly} venta, ${aprilFortnightReconciliation.captures.fortnightOnly} captacion y ${aprilFortnightReconciliation.leads.fortnightOnly} leads que no aparecen en el cierre mensual. El cierre mensual es la fuente autoritativa.` },
    { severity: 'info', code: 'OUT_OF_SCOPE_FILTERED', title: 'Alcance comercial aplicado', detail: 'Se excluyeron arriendos, propiedades rentadas, terrenos y duplex. Solo se publican ventas de casas y departamentos en Vitacura.' },
    { severity: 'warning', code: 'TARGETS_NOT_LOADED', title: 'Metas 2026 aun no integradas', detail: 'Los campos de meta y cumplimiento permanecen nulos hasta validar los archivos de Metas 2026.' },
  ]
  const payload = {
    schemaVersion: 2,
    generatedAt: new Date().toISOString(),
    scope: { commune: 'Vitacura', operation: 'Venta', propertyTypes: ['Casa', 'Departamento'], excludedOperations: ['Arriendo'], piiIncluded: false },
    sourceInventory: { workbookCount, periodStart: '2025-01', periodEnd: latest.period, monthlyOperationalStart: '2026-01', aprilFortnightIncluded: true, aprilFortnightReconciliation, formulaErrorCount: workbookAudit.reduce((sum, workbook) => sum + workbook.formulaErrorCells, 0), workbooks: workbookAudit },
    baseline2025,
    months,
    latestLeadSnapshot,
    ytd,
    quality: {
      sourceCoverage: Number((months.reduce((sum, month) => sum + month.quality.sourceCoverage, 0) / months.length).toFixed(1)),
      issues: qualityIssues,
    },
    actions: {
      ceo: [
        { priority: 'medium', title: 'Consolidar crecimiento interanual', evidence: `Las ventas suben ${ytd.comparison2025.salesChangePct}% y el volumen UF ${ytd.comparison2025.salesUfChangePct}% frente al primer semestre de 2025.`, action: 'Separar crecimiento por tipo, sucursal y agente de captacion para definir donde escalar.' },
        { priority: 'high', title: 'Proteger la cartera disponible', evidence: `La cartera comparable baja de ${firstStock} a ${latestStock} propiedades (${ytd.stockChange}).`, action: 'Revisar suspensiones, reposicionamiento y captaciones netas por sucursal.' },
        { priority: 'medium', title: 'Consolidar el repunte de cierres', evidence: `Junio registra ${latest.salesCount} ventas y UF ${latest.salesUf.toLocaleString('es-CL')}, versus ${previous.salesCount} ventas en mayo.`, action: 'Identificar los segmentos y agentes que explican el repunte antes de asignar presupuesto.' },
      ].sort((a, b) => (a.priority === 'high' ? -1 : 1) - (b.priority === 'high' ? -1 : 1)),
      director: [
        { priority: 'high', title: 'Recuperar leads sin gestion', evidence: `${latestLeadSnapshot.staleOver15Total} leads superan 15 dias sin gestion: ${latestLeadSnapshot.stale15To90} entre 15 y 90 dias y ${latestLeadSnapshot.staleOver90} sobre 90 dias.`, action: 'Distribuir una cola diaria por responsable y registrar resultado de contacto.' },
        { priority: 'high', title: 'Cerrar brecha de clasificacion', evidence: `${latestLeadSnapshot.unclassified} leads permanecen sin clasificar; la cobertura exportada es ${latestLeadSnapshot.classificationCoverage}%.`, action: 'Exigir clasificacion y proxima accion para cada lead activo priorizado.' },
      ],
      seller: [
        { priority: 'high', title: 'Trabajar primero la cola vencida', evidence: 'La prioridad diaria debe salir de los leads sin gestion y de requerimientos sin visita.', action: 'Contactar, clasificar y fijar siguiente hito verificable.' },
        { priority: 'medium', title: 'Usar origen para adaptar el contacto', evidence: `El principal origen de junio es ${latest.leadOrigins[0]?.label ?? 'sin dato'} con ${latest.leadOrigins[0]?.count ?? 0} leads.`, action: 'Aplicar guion y SLA diferenciados por canal de adquisicion.' },
      ],
    },
    targetsContract: {
      status: 'not_loaded',
      requiredFields: ['period', 'role', 'person_or_team_id', 'metric', 'target_value', 'unit', 'valid_from', 'valid_to', 'version'],
      rule: 'Targets are never inferred from actual CRM activity.',
    },
  }

  fs.mkdirSync(path.dirname(output), { recursive: true })
  fs.writeFileSync(output, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
  console.log(`CRM intelligence written to ${output}`)
  console.log(JSON.stringify({ workbooks: workbookCount, months: months.length, ytd, latestLeadSnapshot, quality: payload.quality }, null, 2))
}

main()
