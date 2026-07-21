#!/usr/bin/env node

import fs from 'node:fs'
import crypto from 'node:crypto'
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

const REQUIRED_COLUMNS = {
  sales: ['operacion - id', 'operacion - fecha cierre negocio', 'operacion - moneda', 'operacion - precio de cierre', 'propiedad - estado', 'propiedad - operacion', 'propiedad - tipo', 'propiedad - agente'],
  captures: ['propiedad - id', 'propiedad - estado', 'propiedad - operacion', 'propiedad - tipo', 'propiedad - agente'],
  leads: ['lead - id', 'lead - fecha de creacion', 'lead - tipo', 'lead - origen', 'sucursal - nombre'],
  requirements: ['requerimiento - id', 'requerimiento - fecha de creacion', 'propiedad - operacion', 'propiedad - tipo', 'lead - tipo', 'sucursal - nombre'],
  visits: ['visita - id', 'visita - fecha programada', 'visita - estado', 'propiedad - operacion', 'propiedad - tipo', 'sucursal - nombre'],
  suspended: ['propiedad - id', 'propiedad - estado', 'propiedad - operacion', 'propiedad - tipo', 'propiedad - fecha de suspension'],
  stock: ['propiedad - id', 'propiedad - estado', 'propiedad - operacion', 'propiedad - tipo'],
}

function parseArgs() {
  const args = process.argv.slice(2)
  const value = (flag) => {
    const index = args.indexOf(flag)
    return index >= 0 ? args[index + 1] : null
  }
  const input = value('--input') || process.env.CRM_XLS_ROOT
  const output = value('--output') || path.resolve('data/crm-intelligence.json')
  const manifestOutput = value('--manifest-output') || path.resolve('data/crm-cell-manifest.json')
  if (!input) throw new Error('Use --input <Datos CRM> or define CRM_XLS_ROOT.')
  return { input: path.resolve(input), output: path.resolve(output), manifestOutput: path.resolve(manifestOutput) }
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

function stableValue(value) {
  if (value instanceof Date) return { $date: value.toISOString() }
  if (Buffer.isBuffer(value)) return { $buffer: value.toString('base64') }
  if (Array.isArray(value)) return value.map(stableValue)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, stableValue(item)]))
  }
  return value
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex')
}

function classifyWorkbook(relativePath) {
  const name = normalize(path.basename(relativePath)).replace(/[_-]+/g, ' ')
  if (name.includes('sin gestion 15')) return 'lead_stale_15_90'
  if (name.includes('sin gestion 90')) return 'lead_stale_over_90'
  if (name.includes('sin clasificar')) return 'lead_unclassified'
  if (name.includes('clasificados')) return 'lead_classified'
  if (name.includes('activos')) return 'lead_active'
  if (name.includes('leads')) return 'lead_created'
  if (name.includes('requerimientos')) return 'requirement_created'
  if (name.includes('visitas')) return 'visit_appointment'
  if (name.includes('captad') || name.includes('captacion')) return 'property_capture'
  if (name.includes('suspendid')) return 'property_suspension'
  if (name.includes('cartera')) return 'property_stock'
  if (name.includes('venta') || name.includes('cierre') || name.includes('undefined')) return name.includes('resumen') ? 'sales_summary' : 'sale_closed'
  return 'unclassified'
}

function periodFromPath(relativePath) {
  const match = relativePath.replaceAll('\\', '/').match(/Datos (2025|2026\d{2})\//)
  if (!match) return null
  return match[1] === '2025' ? '2025' : `${match[1].slice(0, 4)}-${match[1].slice(4)}`
}

function sourceRole(relativePath) {
  const normalized = relativePath.replaceAll('\\', '/')
  if (normalized.includes('/informe_quincenal/')) return 'fortnight_audit'
  if (/ventas_enero_marzo|misc_undefined|resumen_ventas|ventas_2025_vitacura\.xlsx$/i.test(normalized)) return 'reconciliation'
  if (/leads_(activos|clasificados|sin_clasificar|sin_gestion)/i.test(normalized)) return 'snapshot'
  if (/Datos 2025\/raw\/(captaciones|propiedades_suspendidas|total_cartera)/i.test(normalized)) return 'annual_context'
  return 'authoritative'
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
  return { sheetName, headers, indexes, rows }
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
  if (!file || !fs.existsSync(file)) return { records: [], quality: { rawRows: 0, acceptedRows: 0, duplicateRows: 0, excludedRows: 0, malformedRows: 0, missingColumns: [], missing: true } }
  const { sheetName, indexes, rows } = readWorkbook(file)
  const idKey = ENTITY_IDS[kind]
  const missingColumns = REQUIRED_COLUMNS[kind].filter((column) => !indexes.has(column))
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
    quality: { source: path.basename(file), sheet: sheetName, rawRows: rows.length, acceptedRows: records.size, duplicateRows, excludedRows, malformedRows, missingColumns, missing: false },
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

function summed(records, groupKey, valueKey, limit = 12) {
  const totals = new Map()
  for (const record of records) {
    const label = display(cell(record.row, record.indexes, groupKey))
    const value = numeric(cell(record.row, record.indexes, valueKey))
    if (!label || value === null) continue
    totals.set(label, (totals.get(label) ?? 0) + value)
  }
  return [...totals.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label))
    .slice(0, limit)
}

function firstRecordValue(record, keys) {
  for (const key of keys) {
    const value = display(cell(record.row, record.indexes, key))
    if (value) return value
  }
  return ''
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
  const identifiedSellers = sales.filter((record) => {
    const value = normalize(firstRecordValue(record, ['agente vendedor', 'operacion - agente - vendedor', 'vendedor - agente', 'venta agente', 'venta - agente']))
    return value && value !== 'na' && value !== 'n/a'
  }).length
  const realizedVisits = loaded.visits.records.filter((record) => normalize(cell(record.row, record.indexes, 'visita - estado')) === 'realizada').length
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
    realizedVisitsCount: loaded.visits.quality.missing ? null : realizedVisits,
    realizedVisitsRate: loaded.visits.quality.missing || loaded.visits.records.length === 0 ? null : Number(((realizedVisits / loaded.visits.records.length) * 100).toFixed(1)),
    stockCount: loaded.stock.records.length,
    suspendedCount: loaded.suspended.records.length,
    salesByType: ranked(sales, 'propiedad - tipo'),
    salesByOffice: ranked(sales, 'sub-sucursal - nombre'),
    salesUfByOffice: summed(
      sales.filter((record) => normalize(cell(record.row, record.indexes, 'operacion - moneda')) === 'uf'),
      'sub-sucursal - nombre',
      'operacion - precio de cierre',
    ),
    requirementsByOffice: ranked(loaded.requirements.records, 'sub-sucursal - nombre', 12),
    leadsByOffice: ranked(loaded.leads.records, 'sub-sucursal - nombre', 12),
    visitsByOffice: ranked(loaded.visits.records, 'sub-sucursal - nombre', 12),
    realizedVisitsByOffice: ranked(
      loaded.visits.records.filter((record) => normalize(cell(record.row, record.indexes, 'visita - estado')) === 'realizada'),
      'sub-sucursal - nombre',
      12,
    ),
    stockByOffice: ranked(loaded.stock.records, 'sub-sucursal - nombre', 12),
    salesByListingAgent: ranked(sales, 'propiedad - agente', 12),
    capturesByAgent: ranked(loaded.captures.records, 'propiedad - agente', 12),
    visitStatusCounts: ranked(loaded.visits.records, 'visita - estado', 10),
    sellerAttribution: {
      identified: identifiedSellers,
      missing: sales.length - identifiedSellers,
      coverage: sales.length ? Number(((identifiedSellers / sales.length) * 100).toFixed(1)) : null,
    },
    leadOrigins: ranked(loaded.leads.records, 'lead - origen'),
    leadOwners: ranked(loaded.leads.records, 'partner - nombre', 12),
    quality: { sourceCoverage, expectedDatasets, acceptedRecords: accepted, excludedOutsideScope: excluded, duplicateRows: duplicates, malformedRows: malformed, missingDatasets, files: Object.fromEntries(Object.entries(loaded).map(([kind, item]) => [kind, item.quality])) },
  }
}

function findDatasetFile(folder, dataset) {
  if (!fs.existsSync(folder)) return null
  const matches = fs.readdirSync(folder)
    .filter((name) => name.toLowerCase().endsWith('.xlsx') && classifyWorkbook(name) === dataset)
    .sort((a, b) => a.localeCompare(b))
  return matches.length === 1 ? path.join(folder, matches[0]) : null
}

function leadSnapshotFromFolder(folder, period, source = 'month_end') {
  const files = {
    active: findDatasetFile(folder, 'lead_active'),
    classified: findDatasetFile(folder, 'lead_classified'),
    unclassified: findDatasetFile(folder, 'lead_unclassified'),
    stale15: findDatasetFile(folder, 'lead_stale_15_90'),
    stale90: findDatasetFile(folder, 'lead_stale_over_90'),
  }
  const loaded = Object.fromEntries(Object.entries(files).map(([key, file]) => [key, canonicalRows(file, 'leads')]))
  const count = (key) => loaded[key].quality.missing ? null : loaded[key].records.length
  const activeIds = new Set(loaded.active.records.map((record) => record.id))
  const classifiedIds = new Set(loaded.classified.records.map((record) => record.id).filter((id) => activeIds.has(id)))
  const unclassifiedIds = new Set(loaded.unclassified.records.map((record) => record.id).filter((id) => activeIds.has(id)))
  const classifiedCoverageIds = new Set([...classifiedIds, ...unclassifiedIds])
  const stale15To90 = count('stale15')
  const staleOver90 = count('stale90')
  const active = count('active')
  const staleOver15Total = stale15To90 === null || staleOver90 === null ? null : stale15To90 + staleOver90
  return {
    period,
    source,
    active,
    classified: count('classified'),
    unclassified: count('unclassified'),
    stale15To90,
    staleOver90,
    staleOver15Total,
    staleOver15Rate: active && staleOver15Total !== null && staleOver15Total <= active ? Number(((staleOver15Total / active) * 100).toFixed(1)) : null,
    classificationCoverage: active && !loaded.classified.quality.missing && !loaded.unclassified.quality.missing
      ? Number(((classifiedCoverageIds.size / active) * 100).toFixed(1))
      : null,
    availableDatasets: Object.fromEntries(Object.entries(loaded).map(([key, value]) => [key, !value.quality.missing])),
  }
}

function buildLeadSnapshots(root) {
  const snapshots = ['202602', '202603', '202604', '202605', '202606'].map((period) => (
    leadSnapshotFromFolder(path.join(root, `Datos ${period}`, 'raw'), `${period.slice(0, 4)}-${period.slice(4)}`)
  ))
  const aprilFortnight = leadSnapshotFromFolder(
    path.join(root, 'Datos 202604', 'informe_quincenal', 'raw'),
    '2026-04-17',
    'fortnight_audit',
  )
  return { snapshots, aprilFortnight }
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
        recordsByKind[kind].set(record.id, record)
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
    knownRealizedVisitsCount: [...recordsByKind.visits.values()].filter((record) => normalize(cell(record.row, record.indexes, 'visita - estado')) === 'realizada').length,
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
    const { sheetName, headers, rows } = readWorkbook(file)
    const workbook = XLSX.readFile(file, { cellFormula: true, cellStyles: true, cellNF: true, cellDates: true, sheetStubs: true })
    let formulaCells = 0
    let formulaErrorCells = 0
    let storedCells = 0
    let populatedCells = 0
    const sheets = []
    for (const name of workbook.SheetNames) {
      const sheet = workbook.Sheets[name]
      const addresses = Object.keys(sheet).filter((address) => !address.startsWith('!')).sort((a, b) => a.localeCompare(b))
      const digest = crypto.createHash('sha256')
      let sheetFormulaCells = 0
      let sheetFormulaErrors = 0
      let sheetPopulatedCells = 0
      let commentCells = 0
      let hyperlinkCells = 0
      for (const address of addresses) {
        const value = sheet[address]
        digest.update(JSON.stringify([address, stableValue(value)]))
        if (value?.f) formulaCells += 1
        if (value?.f) sheetFormulaCells += 1
        if (value?.t === 'e') {
          formulaErrorCells += 1
          sheetFormulaErrors += 1
        }
        if (value?.v !== undefined || value?.f) {
          populatedCells += 1
          sheetPopulatedCells += 1
        }
        if (value?.c?.length) commentCells += 1
        if (value?.l) hyperlinkCells += 1
      }
      storedCells += addresses.length
      sheets.push({
        name,
        range: sheet['!ref'] ?? null,
        storedCells: addresses.length,
        populatedCells: sheetPopulatedCells,
        formulaCells: sheetFormulaCells,
        formulaErrorCells: sheetFormulaErrors,
        commentCells,
        hyperlinkCells,
        cellDigest: digest.digest('hex'),
      })
    }
    const relativeFile = path.relative(root, file).replaceAll('\\', '/')
    return {
      file: relativeFile,
      period: periodFromPath(relativeFile),
      dataset: classifyWorkbook(relativeFile),
      sourceRole: sourceRole(relativeFile),
      byteSize: fs.statSync(file).size,
      fileSha256: sha256(fs.readFileSync(file)),
      selectedSheet: sheetName,
      sheetCount: workbook.SheetNames.length,
      dataRows: rows.length,
      columnCount: headers.length,
      emptyHeaderCount: headers.filter((header) => !normalize(header)).length,
      duplicateHeaderCount: headers.map(normalize).filter(Boolean).length - new Set(headers.map(normalize).filter(Boolean)).size,
      storedCells,
      populatedCells,
      formulaCells,
      formulaErrorCells,
      sheets,
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
    uniqueVisitAppointmentsCount: visits.length,
    realizedVisitsCount: visits.filter((record) => normalize(cell(record.row, record.indexes, 'visita - estado')) === 'realizada').length,
    firstHalfSalesCount: months.slice(0, 6).reduce((sum, month) => sum + month.salesCount, 0),
    firstHalfSalesUf: Math.round(months.slice(0, 6).reduce((sum, month) => sum + month.salesUf, 0)),
    months,
  }
}

function compareIdSets(leftRecords, rightRecords) {
  const left = new Set(leftRecords.map((record) => record.id))
  const right = new Set(rightRecords.map((record) => record.id))
  const overlap = [...left].filter((id) => right.has(id)).length
  return {
    left: left.size,
    right: right.size,
    overlap,
    leftOnly: left.size - overlap,
    rightOnly: right.size - overlap,
    exactMatch: left.size === right.size && overlap === left.size,
  }
}

function compareBusinessRows(leftFile, rightFile, keys) {
  const signatures = (file) => {
    const { indexes, rows } = readWorkbook(file)
    const values = new Map()
    for (const row of rows.filter((candidate) => inScope(candidate, indexes))) {
      const signature = JSON.stringify(keys.map((key) => stableValue(cell(row, indexes, key))))
      values.set(signature, (values.get(signature) ?? 0) + 1)
    }
    return values
  }
  const left = signatures(leftFile)
  const right = signatures(rightFile)
  let overlap = 0
  for (const [signature, count] of left) overlap += Math.min(count, right.get(signature) ?? 0)
  const leftCount = [...left.values()].reduce((sum, count) => sum + count, 0)
  const rightCount = [...right.values()].reduce((sum, count) => sum + count, 0)
  return {
    left: leftCount,
    right: rightCount,
    overlap,
    leftOnly: leftCount - overlap,
    rightOnly: rightCount - overlap,
    exactMatch: leftCount === rightCount && overlap === leftCount,
    comparisonKey: keys,
  }
}

function buildAnnualContext2025(root) {
  const base = path.join(root, 'Datos 2025', 'raw')
  const captures = canonicalRows(path.join(base, 'captaciones_vigentes_y_vendidas_dic_2025.xlsx'), 'captures')
  const suspended = canonicalRows(path.join(base, 'propiedades_suspendidas_2025.xlsx'), 'suspended')
  const stock = canonicalRows(path.join(base, 'total_cartera_cierre_2025.xlsx'), 'stock')
  return {
    captures: captures.records.length,
    suspended: suspended.records.length,
    publishedStock: stock.records.length,
    quality: {
      captures: captures.quality,
      suspended: suspended.quality,
      stock: stock.quality,
    },
  }
}

function buildSourceReconciliations(root) {
  const base2025 = path.join(root, 'Datos 2025', 'raw')
  const baseMarch = path.join(root, 'Datos 202603', 'raw')
  const monthlyQ1 = ['202601', '202602', '202603'].flatMap((period) => {
    const config = MONTHS.find((month) => month.period.replace('-', '') === period)
    return canonicalRows(path.join(root, config.folder, 'raw', config.names.sales), 'sales').records
  })
  return {
    sales2025WithoutSellerVsWithSeller: compareIdSets(
      canonicalRows(path.join(base2025, 'ventas_2025_vitacura.xlsx'), 'sales').records,
      canonicalRows(path.join(base2025, 'ventas_2025_vitacura_con_vendedor.xlsx'), 'sales').records,
    ),
    sales2025SummaryVsAuthoritative: compareBusinessRows(
      path.join(base2025, 'resumen_ventas_2025_vitacura.xlsx'),
      path.join(base2025, 'ventas_2025_vitacura_con_vendedor.xlsx'),
      ['operacion - fecha cierre negocio', 'operacion - moneda', 'operacion - precio de cierre', 'propiedad - agente', 'propiedad - tipo', 'venta - agente'],
    ),
    q1CumulativeVsMonthlyUnion: compareIdSets(
      canonicalRows(path.join(baseMarch, 'ventas_enero_marzo_2026.xlsx'), 'sales').records,
      monthlyQ1,
    ),
    marchMiscVsMarchSales: compareIdSets(
      canonicalRows(path.join(baseMarch, 'misc_undefined_20260402.xlsx'), 'sales').records,
      canonicalRows(path.join(baseMarch, 'ventas_marzo_2026.xlsx'), 'sales').records,
    ),
  }
}

function main() {
  const { input, output, manifestOutput } = parseArgs()
  if (!fs.existsSync(input)) throw new Error(`Input folder does not exist: ${input}`)
  const months = MONTHS.map((month) => buildMonth(input, month))
  const workbookAudit = auditWorkbooks(input)
  const baseline2025 = build2025Baseline(input)
  const leadSnapshotCoverage = buildLeadSnapshots(input)
  const latestLeadSnapshot = leadSnapshotCoverage.snapshots.at(-1)
  const annualContext2025 = buildAnnualContext2025(input)
  const sourceReconciliations = buildSourceReconciliations(input)
  const ytdEventDedupe = buildYtdEventDedupe(input)
  const aprilFortnightReconciliation = buildAprilFortnightReconciliation(input)
  const total = (field) => months.reduce((sum, month) => sum + (month[field] ?? 0), 0)
  const firstStock = months[0].stockCount
  const latestStock = months.at(-1).stockCount
  const workbookCount = workbookAudit.length
  const generatedAt = new Date().toISOString()
  const targetsPath = path.resolve('data/targets-2026.json')
  const targets = fs.existsSync(targetsPath) ? JSON.parse(fs.readFileSync(targetsPath, 'utf8')) : null
  const cellCoverage = {
    workbookCount,
    sheetCount: workbookAudit.reduce((sum, workbook) => sum + workbook.sheetCount, 0),
    storedCells: workbookAudit.reduce((sum, workbook) => sum + workbook.storedCells, 0),
    populatedCells: workbookAudit.reduce((sum, workbook) => sum + workbook.populatedCells, 0),
    formulaCells: workbookAudit.reduce((sum, workbook) => sum + workbook.formulaCells, 0),
    formulaErrorCells: workbookAudit.reduce((sum, workbook) => sum + workbook.formulaErrorCells, 0),
  }
  const datasetCoverage = Object.values(workbookAudit.reduce((groups, workbook) => {
    const current = groups[workbook.dataset] ?? { dataset: workbook.dataset, workbookCount: 0, dataRows: 0, periods: new Set(), sourceRoles: new Set() }
    current.workbookCount += 1
    current.dataRows += workbook.dataRows
    if (workbook.period) current.periods.add(workbook.period)
    current.sourceRoles.add(workbook.sourceRole)
    groups[workbook.dataset] = current
    return groups
  }, {})).map((group) => ({ ...group, periods: [...group.periods].sort(), sourceRoles: [...group.sourceRoles].sort() }))
  const ytd = {
    salesCount: ytdEventDedupe.uniqueCounts.sales,
    salesUf: ytdEventDedupe.salesUf,
    capturesCount: ytdEventDedupe.uniqueCounts.captures,
    newLeadsCount: ytdEventDedupe.uniqueCounts.leads,
    requirementsCount: ytdEventDedupe.uniqueCounts.requirements,
    visitsCount: months.some((month) => month.visitsCount === null) ? null : ytdEventDedupe.uniqueCounts.visits,
    knownVisitsCount: ytdEventDedupe.uniqueCounts.visits,
    knownRealizedVisitsCount: ytdEventDedupe.knownRealizedVisitsCount,
    knownRealizedVisitsRate: ytdEventDedupe.uniqueCounts.visits ? Number(((ytdEventDedupe.knownRealizedVisitsCount / ytdEventDedupe.uniqueCounts.visits) * 100).toFixed(1)) : null,
    sellerAttribution: {
      identified: months.reduce((sum, month) => sum + month.sellerAttribution.identified, 0),
      missing: months.reduce((sum, month) => sum + month.sellerAttribution.missing, 0),
      coverage: total('salesCount') ? Number(((months.reduce((sum, month) => sum + month.sellerAttribution.identified, 0) / total('salesCount')) * 100).toFixed(1)) : null,
    },
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
    { severity: 'warning', code: 'APRIL_FORTNIGHT_LEAD_BASE_MISMATCH', title: 'Colas quincenales no comparables con activos', detail: `El corte quincenal suma ${leadSnapshotCoverage.aprilFortnight.staleOver15Total} registros en colas sin gestion frente a ${leadSnapshotCoverage.aprilFortnight.active} leads activos y no incluye archivo sin clasificar. Las tasas del corte se publican como n/d.` },
    { severity: 'info', code: 'SELLER_ATTRIBUTION_PARTIAL', title: 'Atribucion de vendedor no canonica', detail: `${months.reduce((sum, month) => sum + month.sellerAttribution.identified, 0)} de ${total('salesCount')} cierres identifican vendedor. Los encabezados y nombres varian entre archivos; el ranking publicado se mantiene como lado captador.` },
    { severity: 'info', code: 'SOURCE_EMPTY_HEADERS', title: 'Columnas auxiliares sin encabezado', detail: `${workbookAudit.reduce((sum, workbook) => sum + workbook.emptyHeaderCount, 0)} columnas sin encabezado fueron detectadas en tres fuentes 2025. No corresponden a campos requeridos por los KPI.` },
    { severity: 'info', code: 'OUT_OF_SCOPE_FILTERED', title: 'Alcance comercial aplicado', detail: 'Se excluyeron arriendos, propiedades rentadas, terrenos y duplex. Solo se publican ventas de casas y departamentos en Vitacura.' },
    ...(targets ? [{ severity: 'warning', code: 'TARGETS_SOURCE_ISSUES', title: 'Metas 2026 integradas con incidencias de origen', detail: `${targets.quality.criticalCount} incidencias criticas y ${targets.quality.issueCount} observaciones se preservan sin corregir ni omitir celdas.` }] : [{ severity: 'warning', code: 'TARGETS_NOT_LOADED', title: 'Metas 2026 aun no integradas', detail: 'Los campos de meta y cumplimiento permanecen nulos hasta validar los archivos de Metas 2026.' }]),
  ]
  const payload = {
    schemaVersion: 5,
    generatedAt,
    scope: { commune: 'Vitacura', operation: 'Venta', propertyTypes: ['Casa', 'Departamento'], excludedOperations: ['Arriendo'], piiIncluded: false },
    sourceInventory: { workbookCount, periodStart: '2025-01', periodEnd: latest.period, monthlyOperationalStart: '2026-01', aprilFortnightIncluded: true, aprilFortnightReconciliation, cellCoverage, datasetCoverage, formulaErrorCount: workbookAudit.reduce((sum, workbook) => sum + workbook.formulaErrorCells, 0), emptyHeaderCount: workbookAudit.reduce((sum, workbook) => sum + workbook.emptyHeaderCount, 0), duplicateHeaderCount: workbookAudit.reduce((sum, workbook) => sum + workbook.duplicateHeaderCount, 0), workbooks: workbookAudit },
    baseline2025,
    annualContext2025,
    months,
    leadSnapshots: leadSnapshotCoverage.snapshots,
    aprilFortnightLeadSnapshot: leadSnapshotCoverage.aprilFortnight,
    latestLeadSnapshot,
    sourceReconciliations,
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
      status: targets ? targets.status : 'not_loaded',
      version: targets?.version ?? null,
      workbookCount: targets?.cellCoverage?.workbookCount ?? 0,
      storedCells: targets?.cellCoverage?.storedCells ?? 0,
      sourceIssueCount: targets?.quality?.issueCount ?? 0,
      criticalSourceIssueCount: targets?.quality?.criticalCount ?? 0,
      requiredFields: ['period', 'role', 'person_or_team_id', 'metric', 'target_value', 'unit', 'valid_from', 'valid_to', 'version'],
      rule: 'Targets are read from the three versioned workbooks and never inferred from actual CRM activity.',
    },
  }

  const manifest = {
    schemaVersion: 1,
    generatedAt,
    privacy: {
      rawValuesIncluded: false,
      customerPiiIncluded: false,
      rule: 'Only workbook, sheet and aggregate cell digests are published. Raw cell values remain in the private XLS sources.',
    },
    coverage: cellCoverage,
    workbooks: workbookAudit,
  }

  fs.mkdirSync(path.dirname(output), { recursive: true })
  fs.mkdirSync(path.dirname(manifestOutput), { recursive: true })
  fs.writeFileSync(output, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
  fs.writeFileSync(manifestOutput, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
  console.log(`CRM intelligence written to ${output}`)
  console.log(`CRM cell manifest written to ${manifestOutput}`)
  console.log(JSON.stringify({ workbooks: workbookCount, months: months.length, ytd, latestLeadSnapshot, quality: payload.quality }, null, 2))
}

main()
