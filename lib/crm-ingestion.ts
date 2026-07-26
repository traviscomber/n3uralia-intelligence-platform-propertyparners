/**
 * CRM Ingestion — pure, side-effect-free functions shared between
 * scripts/build-crm-intelligence.mjs and the Next.js application layer.
 *
 * Rules:
 *  - No file I/O here. Callers pass file contents / paths in.
 *  - No process.exit / console.log.
 *  - Every function is a named export so callers cherry-pick.
 */

import crypto from 'node:crypto'
import path from 'node:path'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DatasetKind =
  | 'lead_stale_15_90'
  | 'lead_stale_over_90'
  | 'lead_unclassified'
  | 'lead_classified'
  | 'lead_active'
  | 'lead_created'
  | 'requirement_created'
  | 'visit_appointment'
  | 'property_capture'
  | 'property_suspension'
  | 'property_stock'
  | 'sales_summary'
  | 'sale_closed'
  | 'unclassified'

export type SourceRole =
  | 'fortnight_audit'
  | 'reconciliation'
  | 'snapshot'
  | 'annual_context'
  | 'authoritative'

export type SheetAudit = {
  name: string
  range: string | null
  storedCells: number
  populatedCells: number
  formulaCells: number
  formulaErrorCells: number
  commentCells: number
  hyperlinkCells: number
  cellDigest: string
}

export type WorkbookAudit = {
  file: string
  period: string | null
  dataset: DatasetKind
  sourceRole: SourceRole
  byteSize: number
  fileSha256: string
  selectedSheet: string
  sheetCount: number
  dataRows: number
  columnCount: number
  emptyHeaderCount: number
  duplicateHeaderCount: number
  storedCells: number
  populatedCells: number
  formulaCells: number
  formulaErrorCells: number
  sheets: SheetAudit[]
}

// ---------------------------------------------------------------------------
// String / value helpers
// ---------------------------------------------------------------------------

/** Normalise a cell value to a comparable lowercase ASCII string. */
export function normalize(value: unknown): string {
  return String(value ?? '')
    .replace(/\u00a0/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

/** Trim a cell value for display without stripping diacritics. */
export function display(value: unknown): string {
  return String(value ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim()
}

/** Recursively convert a value to a stable JSON-serialisable form for hashing. */
export function stableValue(value: unknown): unknown {
  if (value instanceof Date) return { $date: value.toISOString() }
  if (Buffer.isBuffer(value)) return { $buffer: value.toString('base64') }
  if (Array.isArray(value)) return value.map(stableValue)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, stableValue(item)]),
    )
  }
  return value
}

/** SHA-256 hex digest of a Buffer or string. */
export function sha256(value: Buffer | string): string {
  return crypto.createHash('sha256').update(value).digest('hex')
}

/** Parse a numeric value from a cell, returning null for non-finite results. */
export function numeric(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const parsed = Number(String(value ?? '').replace(/[^0-9.-]/g, ''))
  return Number.isFinite(parsed) ? parsed : null
}

// ---------------------------------------------------------------------------
// Workbook classification
// ---------------------------------------------------------------------------

/**
 * Classify an xlsx file by dataset type based on its filename.
 * Input: relative path from the CRM root (forward-slashes).
 */
export function classifyWorkbook(relativePath: string): DatasetKind {
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
  if (name.includes('venta') || name.includes('cierre') || name.includes('undefined'))
    return name.includes('resumen') ? 'sales_summary' : 'sale_closed'
  return 'unclassified'
}

/**
 * Derive a YYYY-MM period string from a relative file path.
 * Expects a path segment like "Datos 202604/".
 */
export function periodFromPath(relativePath: string): string | null {
  const match = relativePath.replaceAll('\\', '/').match(/Datos (2025|2026\d{2})\//)
  if (!match) return null
  return match[1] === '2025' ? '2025' : `${match[1].slice(0, 4)}-${match[1].slice(4)}`
}

/**
 * Determine the source role of a file based on its relative path.
 * Roles drive data-quality weighting in the intelligence engine.
 */
export function sourceRole(relativePath: string): SourceRole {
  const normalized = relativePath.replaceAll('\\', '/')
  if (normalized.includes('/informe_quincenal/')) return 'fortnight_audit'
  if (/ventas_enero_marzo|misc_undefined|resumen_ventas|ventas_2025_vitacura\.xlsx$/i.test(normalized))
    return 'reconciliation'
  if (/leads_(activos|clasificados|sin_clasificar|sin_gestion)/i.test(normalized)) return 'snapshot'
  if (/Datos 2025\/raw\/(captaciones|propiedades_suspendidas|total_cartera)/i.test(normalized))
    return 'annual_context'
  return 'authoritative'
}

// ---------------------------------------------------------------------------
// File listing  (requires fs — imported by callers, injected here)
// ---------------------------------------------------------------------------

/**
 * Recursively list all .xlsx files under `root`, sorted alphabetically.
 * Accepts an `fs` module so the function stays testable without real disk I/O.
 */
export function listWorkbooks(
  root: string,
  fs: {
    readdirSync: (
      folder: string,
      opts: { withFileTypes: true },
    ) => Array<{ name: string; isDirectory(): boolean }>
  },
): string[] {
  const files: string[] = []
  function visit(folder: string) {
    for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
      const absolute = path.join(folder, entry.name)
      if (entry.isDirectory()) visit(absolute)
      else if (entry.name.toLowerCase().endsWith('.xlsx')) files.push(absolute)
    }
  }
  visit(root)
  return files.sort((a, b) => a.localeCompare(b))
}

// ---------------------------------------------------------------------------
// Workbook auditing  (requires xlsx + fs — injected by caller)
// ---------------------------------------------------------------------------

type XlsxCell = {
  v?: unknown
  f?: string
  t?: string
  c?: unknown[]
  l?: unknown
}

type XlsxSheet = Record<string, XlsxCell> & { '!ref'?: string }

type XlsxWorkbook = {
  SheetNames: string[]
  Sheets: Record<string, XlsxSheet>
}

type XlsxLib = {
  readFile: (file: string, opts?: Record<string, unknown>) => XlsxWorkbook
  utils: {
    sheet_to_json: (
      sheet: XlsxSheet,
      opts: { header: 1; defval: null; raw: boolean },
    ) => unknown[][]
  }
}

/**
 * Audit every workbook under `root`, producing one `WorkbookAudit` per file.
 * Pass real `fs` and `XLSX` in production; pass mocks in tests.
 */
export function auditWorkbooks(
  root: string,
  fs: {
    readdirSync: (
      folder: string,
      opts: { withFileTypes: true },
    ) => Array<{ name: string; isDirectory(): boolean }>
    statSync: (file: string) => { size: number }
    readFileSync: (file: string) => Buffer
  },
  XLSX: XlsxLib,
): WorkbookAudit[] {
  return listWorkbooks(root, fs).map((file) => {
    const basicWb = XLSX.readFile(file, { cellDates: true })
    const sheetName = basicWb.SheetNames.includes('Data')
      ? 'Data'
      : basicWb.SheetNames.at(-1)!
    const matrix = XLSX.utils.sheet_to_json(basicWb.Sheets[sheetName], {
      header: 1,
      defval: null,
      raw: true,
    })
    const headers = (matrix[0] ?? []) as unknown[]
    const rows = matrix.slice(1).filter((row) => row.some((v) => v !== null && v !== ''))

    const auditWb = XLSX.readFile(file, {
      cellFormula: true,
      cellStyles: true,
      cellNF: true,
      cellDates: true,
      sheetStubs: true,
    })

    let formulaCells = 0
    let formulaErrorCells = 0
    let storedCells = 0
    let populatedCells = 0
    const sheets: SheetAudit[] = []

    for (const name of auditWb.SheetNames) {
      const sheet = auditWb.Sheets[name]
      const addresses = Object.keys(sheet)
        .filter((addr) => !addr.startsWith('!'))
        .sort((a, b) => a.localeCompare(b))
      const digest = crypto.createHash('sha256')
      let sheetFormulaCells = 0
      let sheetFormulaErrors = 0
      let sheetPopulatedCells = 0
      let commentCells = 0
      let hyperlinkCells = 0

      for (const address of addresses) {
        const value = sheet[address]
        digest.update(JSON.stringify([address, stableValue(value)]))
        if (value?.f) { formulaCells += 1; sheetFormulaCells += 1 }
        if (value?.t === 'e') { formulaErrorCells += 1; sheetFormulaErrors += 1 }
        if (value?.v !== undefined || value?.f) { populatedCells += 1; sheetPopulatedCells += 1 }
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
      sheetCount: auditWb.SheetNames.length,
      dataRows: rows.length,
      columnCount: headers.length,
      emptyHeaderCount: headers.filter((h) => !normalize(h)).length,
      duplicateHeaderCount:
        headers.map(normalize).filter(Boolean).length -
        new Set(headers.map(normalize).filter(Boolean)).size,
      storedCells,
      populatedCells,
      formulaCells,
      formulaErrorCells,
      sheets,
    }
  })
}
