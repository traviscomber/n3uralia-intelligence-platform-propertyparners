import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import XLSX from 'xlsx'

export type CrmManifestSheet = {
  name: string
  cellDigest: string
}

export type CrmManifestWorkbook = {
  path: string
  sha256: string
  size: number
  modifiedAt: string
  ingestedAt: string
  dataset: string
  period: string | null
  sourceRole: string
  sheets: CrmManifestSheet[]
}

export type CrmIngestionManifest = {
  schemaVersion: 1
  generatedAt: string
  sourceRoot: string
  workbookCount: number
  workbooks: CrmManifestWorkbook[]
}

export type CrmManifestChanges = {
  added: CrmManifestWorkbook[]
  modified: CrmManifestWorkbook[]
  removed: CrmManifestWorkbook[]
  unchanged: CrmManifestWorkbook[]
}

function normalize(value: unknown): string {
  return String(value ?? '')
    .replace(/\u00a0/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

function stableValue(value: unknown): unknown {
  if (value instanceof Date) return { $date: value.toISOString() }
  if (Buffer.isBuffer(value)) return { $buffer: value.toString('base64') }
  if (Array.isArray(value)) return value.map(stableValue)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, stableValue(item)]),
    )
  }
  return value
}

function sha256(value: crypto.BinaryLike): string {
  return crypto.createHash('sha256').update(value).digest('hex')
}

export function classifyCrmWorkbook(relativePath: string): string {
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
  if (name.includes('venta') || name.includes('cierre') || name.includes('undefined')) {
    return name.includes('resumen') ? 'sales_summary' : 'sale_closed'
  }
  return 'unclassified'
}

export function crmPeriodFromPath(relativePath: string): string | null {
  const normalized = relativePath.replaceAll('\\', '/')
  const match = normalized.match(/Datos (2025|2026\d{2})\//)
  if (!match) return null
  return match[1] === '2025' ? '2025' : `${match[1].slice(0, 4)}-${match[1].slice(4)}`
}

export function crmSourceRole(relativePath: string): string {
  const normalized = relativePath.replaceAll('\\', '/')
  if (normalized.includes('/informe_quincenal/')) return 'fortnight_audit'
  if (/ventas_enero_marzo|misc_undefined|resumen_ventas|ventas_2025_vitacura\.xlsx$/i.test(normalized)) {
    return 'reconciliation'
  }
  if (/leads_(activos|clasificados|sin_clasificar|sin_gestion)/i.test(normalized)) return 'snapshot'
  if (/Datos 2025\/raw\/(captaciones|propiedades_suspendidas|total_cartera)/i.test(normalized)) {
    return 'annual_context'
  }
  return 'authoritative'
}

export function listCrmWorkbooks(root: string): string[] {
  const files: string[] = []

  function visit(folder: string): void {
    for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
      const absolute = path.join(folder, entry.name)
      if (entry.isDirectory()) visit(absolute)
      else if (entry.name.toLowerCase().endsWith('.xlsx')) files.push(absolute)
    }
  }

  visit(root)
  return files.sort((left, right) => left.localeCompare(right))
}

function digestWorkbookSheets(file: string): CrmManifestSheet[] {
  const workbook = XLSX.readFile(file, {
    cellDates: true,
    cellFormula: true,
    cellNF: true,
    cellStyles: true,
    sheetStubs: true,
  })

  return workbook.SheetNames.map((name) => {
    const sheet = workbook.Sheets[name]
    const addresses = Object.keys(sheet)
      .filter((address) => !address.startsWith('!'))
      .sort((left, right) => left.localeCompare(right))
    const digest = crypto.createHash('sha256')

    for (const address of addresses) {
      digest.update(JSON.stringify([address, stableValue(sheet[address])]))
    }

    return { name, cellDigest: digest.digest('hex') }
  })
}

export function scanCrmSources(
  root: string,
  previousManifest?: CrmIngestionManifest | null,
  now = new Date(),
): CrmIngestionManifest {
  const absoluteRoot = path.resolve(root)
  const generatedAt = now.toISOString()
  const previousByPath = new Map(
    (previousManifest?.workbooks ?? []).map((workbook) => [workbook.path, workbook]),
  )

  const workbooks = listCrmWorkbooks(absoluteRoot).map((file): CrmManifestWorkbook => {
    const relativePath = path.relative(absoluteRoot, file).replaceAll('\\', '/')
    const stats = fs.statSync(file)
    const hash = sha256(fs.readFileSync(file))
    const previous = previousByPath.get(relativePath)

    return {
      path: relativePath,
      sha256: hash,
      size: stats.size,
      modifiedAt: stats.mtime.toISOString(),
      ingestedAt: previous?.sha256 === hash ? previous.ingestedAt : generatedAt,
      dataset: classifyCrmWorkbook(relativePath),
      period: crmPeriodFromPath(relativePath),
      sourceRole: crmSourceRole(relativePath),
      sheets: digestWorkbookSheets(file),
    }
  })

  return {
    schemaVersion: 1,
    generatedAt,
    sourceRoot: absoluteRoot,
    workbookCount: workbooks.length,
    workbooks,
  }
}

export function compareCrmManifests(
  previous: CrmIngestionManifest | null | undefined,
  current: CrmIngestionManifest,
): CrmManifestChanges {
  const previousByPath = new Map((previous?.workbooks ?? []).map((workbook) => [workbook.path, workbook]))
  const currentByPath = new Map(current.workbooks.map((workbook) => [workbook.path, workbook]))
  const added: CrmManifestWorkbook[] = []
  const modified: CrmManifestWorkbook[] = []
  const unchanged: CrmManifestWorkbook[] = []

  for (const workbook of current.workbooks) {
    const prior = previousByPath.get(workbook.path)
    if (!prior) added.push(workbook)
    else if (prior.sha256 !== workbook.sha256) modified.push(workbook)
    else unchanged.push(workbook)
  }

  const removed = (previous?.workbooks ?? []).filter((workbook) => !currentByPath.has(workbook.path))

  return { added, modified, removed, unchanged }
}

export function readCrmManifest(file: string): CrmIngestionManifest | null {
  if (!fs.existsSync(file)) return null
  return JSON.parse(fs.readFileSync(file, 'utf8')) as CrmIngestionManifest
}

export function writeCrmManifest(file: string, manifest: CrmIngestionManifest): void {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, `${JSON.stringify(manifest, null, 2)}\n`)
}
