import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import XLSX from 'xlsx'
import contracts from '../data/management-source-contracts-2025.json'
import { display, normalize, numeric } from '../lib/crm-ingestion'

type SourceContract = (typeof contracts.sources)[number]
type PreparedRow = {
  dataset: string
  source_file: string
  source_sha256: string
  source_row_number: number
  source_record_id: string
  event_date: string | null
  amount_uf: number | null
  validation_status: 'accepted' | 'rejected'
  validation_reason: string | null
  payload: Record<string, unknown>
}

const args = process.argv.slice(2)
const value = (flag: string) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : null }
const root = path.resolve(value('--input-root') ?? process.env.CRM_XLS_ROOT ?? '.')
const output = path.resolve(value('--output') ?? 'tmp/management-2025-granular.json')

const fileSha256 = (file: string) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')
const asDate = (value: unknown): string | null => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10)
  if (typeof value === 'number' && Number.isFinite(value)) {
    const parsed = XLSX.SSF.parse_date_code(value)
    if (parsed) return `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`
  }
  const text = display(value)
  if (!text) return null
  const parsed = new Date(text)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10)
}

function loadMatrix(file: string) {
  const workbook = XLSX.readFile(file, { cellDates: true })
  const sheetName = workbook.SheetNames.includes('Data') ? 'Data' : workbook.SheetNames.at(-1)!
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], { header: 1, defval: null, raw: true })
  const headers = (matrix[0] ?? []).map((item) => display(item))
  const indexes = new Map(headers.map((header, index) => [normalize(header), index]).filter(([key]) => key))
  const rows = matrix.slice(1).filter((row) => row.some((item) => item !== null && item !== ''))
  return { sheetName, headers, indexes, rows }
}

const cell = (row: unknown[], indexes: Map<string, number>, key?: string) => {
  if (!key) return null
  const index = indexes.get(normalize(key))
  return index == null ? null : row[index]
}

function inScope(row: unknown[], indexes: Map<string, number>, dataset: string) {
  const branch = normalize(cell(row, indexes, 'sucursal - nombre'))
  const operation = normalize(cell(row, indexes, 'propiedad - operacion'))
  const propertyType = normalize(cell(row, indexes, 'propiedad - tipo'))
  const leadType = normalize(cell(row, indexes, 'lead - tipo'))
  if (branch && branch !== 'vitacura') return false
  if (dataset !== 'lead_created' && operation && operation !== 'venta') return false
  if (dataset !== 'lead_created' && propertyType && !['casa', 'departamento'].includes(propertyType)) return false
  if (['lead_created', 'requirement_created'].includes(dataset) && leadType && leadType !== 'compra') return false
  return true
}

function rowPayload(headers: string[], row: unknown[]) {
  return Object.fromEntries(headers.map((header, index) => [header || `__column_${index + 1}`, row[index] instanceof Date ? (row[index] as Date).toISOString() : row[index] ?? null]))
}

function prepareSource(contract: SourceContract) {
  const absolute = path.join(root, contract.file)
  if (!fs.existsSync(absolute)) throw new Error(`Missing canonical source: ${contract.file}`)
  const sha = fileSha256(absolute)
  if (sha !== contract.sha256) throw new Error(`SHA-256 mismatch for ${contract.file}: expected ${contract.sha256}, got ${sha}`)
  const { sheetName, headers, indexes, rows } = loadMatrix(absolute)
  const required = [contract.idColumn, contract.dateColumn].filter(Boolean)
  for (const column of required) if (!indexes.has(normalize(column))) throw new Error(`Missing required column "${column}" in ${contract.file}`)

  const seen = new Set<string>()
  const prepared: PreparedRow[] = []
  let excluded = 0
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i]
    if (!inScope(row, indexes, contract.dataset)) { excluded += 1; continue }
    const statusColumn = 'statusColumn' in contract ? contract.statusColumn : undefined
    if (contract.dataset === 'sale_closed' && normalize(cell(row, indexes, statusColumn)) !== 'vendida') { excluded += 1; continue }
    const id = display(cell(row, indexes, contract.idColumn))
    const eventDate = asDate(cell(row, indexes, contract.dateColumn))
    const duplicate = Boolean(id) && seen.has(normalize(id))
    if (id && !duplicate) seen.add(normalize(id))
    const currency = 'currencyColumn' in contract ? normalize(cell(row, indexes, contract.currencyColumn)) : ''
    const amountUf = 'amountColumn' in contract && currency === 'uf' ? numeric(cell(row, indexes, contract.amountColumn)) : null
    const validationReason = !id ? 'missing_id' : !eventDate ? 'invalid_event_date' : duplicate ? 'duplicate_id' : null
    prepared.push({
      dataset: contract.dataset,
      source_file: contract.file,
      source_sha256: sha,
      source_row_number: i + 2,
      source_record_id: id,
      event_date: eventDate,
      amount_uf: amountUf,
      validation_status: validationReason ? 'rejected' : 'accepted',
      validation_reason: validationReason,
      payload: rowPayload(headers, row),
    })
  }

  const accepted = prepared.filter((row) => row.validation_status === 'accepted')
  const acceptedUf = accepted.reduce((sum, row) => sum + (row.amount_uf ?? 0), 0)
  if (accepted.length !== contract.expectedCanonicalRows) throw new Error(`${contract.dataset}: expected ${contract.expectedCanonicalRows} canonical rows, got ${accepted.length}`)
  if ('expectedCanonicalUf' in contract && contract.expectedCanonicalUf != null && Math.round(acceptedUf) !== contract.expectedCanonicalUf) {
    throw new Error(`${contract.dataset}: expected ${contract.expectedCanonicalUf} UF, got ${Math.round(acceptedUf)}`)
  }
  return {
    summary: { dataset: contract.dataset, file: contract.file, sha256: sha, sheet: sheetName, rawRows: rows.length, acceptedRows: accepted.length, rejectedRows: prepared.length - accepted.length, excludedRows: excluded, acceptedUf: Math.round(acceptedUf) },
    rows: prepared,
  }
}

const sources = contracts.sources.map(prepareSource)
const result = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  publicationStatus: 'prepared_not_published',
  contractsSha256: crypto.createHash('sha256').update(JSON.stringify(contracts)).digest('hex'),
  summaries: sources.map((source) => source.summary),
  rows: sources.flatMap((source) => source.rows),
}
fs.mkdirSync(path.dirname(output), { recursive: true })
fs.writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`)
console.log(JSON.stringify({ output, summaries: result.summaries }, null, 2))
