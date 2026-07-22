import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const XLSX = require('xlsx')
const [valuationRootArg, marketRootArg] = process.argv.slice(2).filter((argument) => argument !== '--')
if (!valuationRootArg || !marketRootArg) {
  throw new Error('Usage: node scripts/build-valuation-intelligence.mjs <valuation-folder> <market-source-folder>')
}

const valuationRoot = path.resolve(valuationRootArg)
const marketRoot = path.resolve(marketRootArg)
const houseFile = path.join(valuationRoot, 'Plantilla de Valorización Casas.xlsx')
const apartmentFile = path.join(valuationRoot, 'Plantilla de Valorización Departamentos.xlsx')
const cbrsFile = path.join(marketRoot, 'Datos venta CBRS Vitacura', 'BASE_CBR_CON_BARRIO_ASIGNADO VITACURA.xlsx')
const portalFiles = [
  path.join(marketRoot, 'Datos Scraper Portal Inmobiliario', 'portal_detalle_deptos_full.xlsx'),
  path.join(marketRoot, 'Datos Scraper Portal Inmobiliario', 'portal_detalle_Proyectos.xlsx'),
  path.join(marketRoot, 'Datos Scraper Portal Inmobiliario', 'portal_urls_casas_final.xlsx'),
]
const marketSourceAudit = JSON.parse(fs.readFileSync(path.join(root, 'data', 'market-source-intelligence.json'), 'utf8'))

const hash = (file) => createHash('sha256').update(fs.readFileSync(file)).digest('hex')
const round = (value, decimals = 2) => Number(Number(value).toFixed(decimals))
const normalize = (value) => String(value ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toUpperCase()
  .replace(/[^A-Z0-9]+/g, ' ')
  .trim()

function readWorkbook(file) {
  return XLSX.readFile(file, { cellDates: true, cellFormula: true, cellStyles: true, cellNF: true })
}

function matrix(workbook, sheetIndex = 0) {
  return XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[sheetIndex]], { header: 1, defval: null, raw: true })
}

function rows(workbook, sheetName) {
  return XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: null, raw: true })
}

function profileWorkbook(file, workbook) {
  return {
    file: path.basename(file),
    bytes: fs.statSync(file).size,
    sha256: hash(file),
    modifiedAt: workbook.Props?.ModifiedDate?.toISOString?.() || workbook.Props?.ModifiedDate || null,
    sheetCount: workbook.SheetNames.length,
    sheets: workbook.SheetNames.map((name) => {
      const sheet = workbook.Sheets[name]
      const cells = Object.entries(sheet).filter(([address]) => !address.startsWith('!'))
      const populatedCells = cells.filter(([, cell]) => cell.v !== null && cell.v !== undefined || cell.f).length
      return {
        name,
        range: sheet['!ref'] || null,
        populatedCells,
        formulaCells: cells.filter(([, cell]) => cell.f).length,
        formulaErrorCells: cells.filter(([, cell]) => cell.t === 'e').length,
      }
    }),
  }
}

function stats(values) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b)
  if (!sorted.length) return { count: 0, min: null, average: null, median: null, max: null }
  const middle = Math.floor(sorted.length / 2)
  const median = sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
  return {
    count: sorted.length,
    min: round(sorted[0]),
    average: round(sorted.reduce((sum, value) => sum + value, 0) / sorted.length),
    median: round(median),
    max: round(sorted.at(-1)),
  }
}

const houseWorkbook = readWorkbook(houseFile)
const apartmentWorkbook = readWorkbook(apartmentFile)
const apartmentMatrix = matrix(apartmentWorkbook)

const offerComparables = apartmentMatrix.slice(11, 18)
  .map((row, index) => ({
    sourceRow: index + 12,
    url: row[0],
    totalArea: Number(row[4]),
    usefulArea: Number(row[6]),
    priceUf: Number(row[8]),
    weightedUfM2: Number(row[9]),
    source: row[11],
  }))
  .filter((item) => item.url && Number.isFinite(item.priceUf))

const registeredComparables = apartmentMatrix.slice(21, 27).map((row, index) => ({
  sourceRow: index + 22,
  address: row[0],
  constructionYear: Number(row[3]),
  usefulArea: Number(row[6]),
  priceUf: Number(row[8]),
  weightedUfM2: Number(row[9]),
  saleDate: row[11] instanceof Date ? row[11].toISOString() : row[11],
  source: row[12],
}))

const portalRows = portalFiles.flatMap((file) => {
  const workbook = readWorkbook(file)
  return rows(workbook, workbook.SheetNames[0]).map((row) => ({ ...row, sourceFile: path.basename(file) }))
})
const validPortalRows = portalRows.filter((row) => /^https?:\/\//.test(String(row.url || '')))
const portalRentIndicators = marketSourceAudit.cross.portal.reduce((sum, source) => sum + Number(source.operationIndicators?.rent_indicator || 0), 0)

const portalReconciliation = offerComparables.map((comparable) => {
  const ids = [...String(comparable.url).matchAll(/(?:MLC-|\/)(\d{6,})/g)].map((match) => match[1])
  const matches = validPortalRows.filter((row) => ids.some((id) => String(row.url).includes(id)))
  return { sourceRow: comparable.sourceRow, ids, currentMatchCount: matches.length, status: matches.length ? 'MATCHED' : 'NOT_IN_CURRENT_SNAPSHOT' }
})

const cbrsWorkbook = readWorkbook(cbrsFile)
const cbrsSheet = cbrsWorkbook.SheetNames.find((name) => name === 'Sheet1') || cbrsWorkbook.SheetNames[1]
const cbrsRows = rows(cbrsWorkbook, cbrsSheet)
const summarizeSale = (row) => ({
  date: row.FECHA instanceof Date ? row.FECHA.toISOString() : row.FECHA,
  address: row.DIRECCION,
  rol: row.ROL,
  priceUf: Number(row.UF),
  usefulArea: Number(row.SUP_CONSTRUIDA),
  constructionYear: Number(row['AÑO_CONSTRUCCION']),
  neighborhood: row.BARRIO,
  geoStatus: row.GEO_STATUS,
})

const registeredReconciliation = registeredComparables.map((comparable) => {
  const sourceYear = Number(String(comparable.saleDate).slice(0, 4))
  const exact = cbrsRows.filter((row) =>
    normalize(row.DESCRIPCION) === 'DEPARTAMENTO' &&
    Number(row.TOMO) === sourceYear &&
    Number(row.SUP_CONSTRUIDA) === comparable.usefulArea &&
    Math.abs(Number(row.UF) - comparable.priceUf) < 1,
  )
  return {
    sourceRow: comparable.sourceRow,
    exactMatchCount: exact.length,
    status: exact.length === 1 ? 'EXACT' : exact.length > 1 ? 'AMBIGUOUS' : 'NOT_REPRODUCIBLE',
    matches: exact.map(summarizeSale),
  }
})

const subjectSales = cbrsRows
  .filter((row) => normalize(row.ROL) === '413 293' && normalize(row.DESCRIPCION) === 'DEPARTAMENTO')
  .map(summarizeSale)

const rawOfferUfM2 = offerComparables.map((item) => item.weightedUfM2)
const dedupeOptionA = offerComparables.filter((item) => item.sourceRow !== 17).map((item) => item.weightedUfM2)
const dedupeOptionB = offerComparables.filter((item) => item.sourceRow !== 16).map((item) => item.weightedUfM2)
const commercialValue = Number(apartmentMatrix[34][4])
const scenarios = [0, 0.05, 0.1].map((margin) => ({
  margin,
  publicationUf: round(commercialValue / (1 - margin), 0),
  weightedUfM2: round((commercialValue / (1 - margin)) / (Number(apartmentMatrix[30][1]) + Number(apartmentMatrix[31][1]) / 2), 1),
}))

const subjectSale = subjectSales[0] || null
const output = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  scope: { commune: 'Vitacura', operation: 'Venta', propertyTypes: ['Casa', 'Departamento'], excludedOperation: 'Arriendo' },
  sourceInventory: [
    profileWorkbook(houseFile, houseWorkbook),
    profileWorkbook(apartmentFile, apartmentWorkbook),
  ],
  methodology: {
    house: {
      effectiveAreaFormula: 'builtAreaM2 + landAreaM2 / 4',
      commercialValueFormula: 'builtAreaM2 * builtUfM2 + landAreaM2 * landUfM2',
      sourceCells: ['Hoja1!K12:K17', 'Hoja1!K22:K25', 'Hoja1!F31:F36', 'Hoja1!H41:N63'],
    },
    apartment: {
      effectiveAreaFormula: 'usefulAreaM2 + terraceAreaM2 / 2',
      offerComparableFormula: 'priceUf / (usefulAreaM2 + (totalAreaM2 - usefulAreaM2) / 2)',
      registeredComparableFormula: 'priceUf / usefulAreaM2',
      commercialValueFormula: 'appliedUfM2 * usefulAreaM2',
      sourceCells: ['Hoja1!K12:K17', 'Hoja1!K22:K27', 'Hoja1!F31:F35', 'Hoja1!H39:N61'],
    },
    publicationScenarios: [0, 0.05, 0.1],
    publicationFormula: 'commercialValueUf / (1 - margin)',
    prohibitedAutomaticAdjustments: ['age bonus', 'floor bonus', 'bedroom bonus', 'condition bonus', 'parking bonus', 'storage bonus', 'pool bonus'],
  },
  templateCase: {
    status: 'HISTORICAL_SOURCE_CASE',
    subject: {
      propertyType: 'Departamento',
      branch: 'Nueva Costanera',
      commune: 'Vitacura',
      neighborhood: 'Las Nieves',
      address: 'Navidad 1427, depto 81',
      rol: '413-293',
      usefulAreaM2: Number(apartmentMatrix[30][1]),
      terraceAreaM2: Number(apartmentMatrix[31][1]),
      constructionYear: 1994,
    },
    sourceCalculation: {
      appliedUfM2: Number(apartmentMatrix[30][2]),
      commercialValueUf: commercialValue,
      scenarios,
    },
    offerComparables: {
      rawCount: offerComparables.length,
      sourceStats: stats(rawOfferUfM2),
      explicitDuplicateGroup: { sourceRows: [16, 17], evidenceCell: 'Hoja1!B19' },
      canonicalCount: offerComparables.length - 1,
      dedupeAwareAverageUfM2Range: [round(stats(dedupeOptionA).average), round(stats(dedupeOptionB).average)],
      presentInCurrentPortalSnapshot: portalReconciliation.filter((item) => item.status === 'MATCHED').length,
    },
    registeredComparables: {
      sourceCount: registeredComparables.length,
      sourceStats: stats(registeredComparables.map((item) => item.weightedUfM2)),
      exactInCurrentCbrs: registeredReconciliation.filter((item) => item.status === 'EXACT').length,
    },
    laterRegisteredEvent: subjectSale ? {
      ...subjectSale,
      status: 'NOT_COMPARABLE_TEMPORALLY',
      reason: 'The template was modified in 2020 and the registered transaction occurred in 2024.',
      deltaToCommercialValueUf: round(subjectSale.priceUf - commercialValue, 0),
      deltaToCommercialValuePct: round(subjectSale.priceUf / commercialValue - 1, 4),
      deltaToFivePercentScenarioUf: round(subjectSale.priceUf - scenarios[1].publicationUf, 0),
    } : null,
  },
  sourceReconciliation: {
    currentPortalValidListings: validPortalRows.length,
    currentPortalSaleEligibleListings: validPortalRows.length - portalRentIndicators,
    portalListingsQuarantinedByRentIndicator: portalRentIndicators,
    currentCbrsRows: cbrsRows.length,
    portalTemplateRows: portalReconciliation,
    registeredTemplateRows: registeredReconciliation,
    subjectRolMatches: subjectSales.length,
  },
  qualityIssues: [
    { severity: 'critical', code: 'MISPLACED_RUT_VALUE', sourceCell: 'Hoja1!I4', detail: 'The RUT field contains a useful-area description and must not be interpreted as an identifier.' },
    { severity: 'critical', code: 'EXPLICIT_DUPLICATE_INCLUDED_IN_FORMULAS', sourceCell: 'Hoja1!B19', detail: 'Rows 16 and 17 are declared to be the same apartment but both feed the source averages.' },
    { severity: 'warning', code: 'STALE_PORTAL_COMPARABLES', detail: 'None of the six template offer URLs appears in the supplied current Portal snapshot.' },
    { severity: 'warning', code: 'PARTIAL_CBRS_REPRODUCIBILITY', detail: `${registeredReconciliation.filter((item) => item.status === 'EXACT').length} of 6 template registered comparables reproduce exactly in the supplied CBRS base.` },
    { severity: 'warning', code: 'HOUSE_TEMPLATE_HAS_NO_CASE_DATA', detail: 'The house workbook supplies methodology and formulas but no populated valuation case.' },
    { severity: 'warning', code: 'SOURCE_VINTAGE_2020', detail: 'Both valuation workbooks were last modified in 2020.' },
  ],
  privacy: {
    excludedFields: ['owner name', 'RUT', 'buyer name', 'seller name'],
    rawTransactionRowsCommitted: false,
  },
}

fs.writeFileSync(path.join(root, 'data', 'valuation-intelligence.json'), `${JSON.stringify(output, null, 2)}\n`)
console.log(JSON.stringify({
  sources: output.sourceInventory.length,
  formulas: output.sourceInventory.reduce((sum, item) => sum + item.sheets.reduce((sheetSum, sheet) => sheetSum + sheet.formulaCells, 0), 0),
  portalListings: output.sourceReconciliation.currentPortalValidListings,
  cbrsRows: output.sourceReconciliation.currentCbrsRows,
  issues: output.qualityIssues.length,
}, null, 2))
