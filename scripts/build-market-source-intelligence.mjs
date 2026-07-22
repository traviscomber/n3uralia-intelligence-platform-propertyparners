import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'
import { createHash } from 'node:crypto'
import { createGunzip } from 'node:zlib'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const [profilePath, crossPath, packagePath, manifestPath] = process.argv.slice(2).map((item) => path.resolve(item || ''))
if (!manifestPath) throw new Error('Usage: node scripts/build-market-source-intelligence.mjs <profile.json> <cross.json> <package.json> <cell-manifest.jsonl.gz>')

const profile = JSON.parse(fs.readFileSync(profilePath, 'utf8'))
const cross = JSON.parse(fs.readFileSync(crossPath, 'utf8'))
const packageProfile = JSON.parse(fs.readFileSync(packagePath, 'utf8'))
const hashFile = (file) => createHash('sha256').update(fs.readFileSync(file)).digest('hex')
const basename = (file) => path.win32.basename(file)

let manifestCellCount = 0
const lines = readline.createInterface({ input: fs.createReadStream(manifestPath).pipe(createGunzip()), crlfDelay: Infinity })
for await (const line of lines) if (line.trim()) manifestCellCount++
manifestCellCount -= 1 // The first JSONL record describes the manifest itself.

const workbooks = profile.workbooks.map((workbook) => ({
  ...workbook,
  path: undefined,
  file: basename(workbook.path),
  sourceRole: workbook.path.includes('CBR') ? 'registered_sales' : 'published_offer',
  sourceFolder: workbook.path.includes('CBR') ? 'Datos venta CBRS Vitacura' : 'Datos Scraper Portal Inmobiliario',
}))

const output = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  scope: { commune: 'Vitacura', operation: 'Venta', propertyTypes: ['Casa', 'Departamento'], excludedOperation: 'Arriendo' },
  sourceInventory: {
    folder: 'Herramienta de Inteligencia de negocios',
    fileCount: 5,
    files: [
      { folder: '.', file: 'Barrios Vitacura.kml', sha256: profile.kml.sha256, bytes: profile.kml.bytes, role: 'neighborhood_geometry' },
      ...workbooks.map((workbook) => ({ folder: workbook.sourceFolder, file: workbook.file, sha256: workbook.sha256, bytes: workbook.bytes, role: workbook.sourceRole })),
    ],
    cellManifest: { file: basename(manifestPath), sha256: hashFile(manifestPath), bytes: fs.statSync(manifestPath).size, cellCount: manifestCellCount },
  },
  kml: { ...profile.kml, path: undefined, geometryAudit: cross.kmlGeometry },
  workbooks,
  semanticFieldInventory: profile.semanticFieldInventory,
  cross: { portal: cross.portal, portalCrossFileListingIds: cross.portalCrossFileListingIds, cbrs: cross.cbrs },
  packageProfile: packageProfile.map((item) => ({ ...item, file: basename(item.file) })),
  operatingModel: {
    sourceRoles: [
      { source: 'Portal Inmobiliario', role: 'Oferta publicada', use: 'Inventario, precio de oferta, características, imágenes y vigencia.' },
      { source: 'CBRS Vitacura', role: 'Ventas registradas', use: 'Precio de cierre registral, fecha, ROL, foja, número, tipo y barrio.' },
      { source: 'KML Barrios Vitacura', role: 'Geometría territorial', use: 'Asignación espacial con estados exact, outside y ambiguous.' },
    ],
    deterministicKeys: {
      portal: 'source + MLC_ID',
      cbrsEvent: 'COMUNAS_RM + TOMO + FOJA + NUMERO + FECHA',
      cbrsAsset: 'COMUNAS_RM + TOMO + FOJA + NUMERO + FECHA + ROL',
      portalToCbrs: null,
    },
    matchPolicy: {
      confirmedRequires: ['ROL', 'dirección inequívoca', 'revisión humana'],
      candidateEvidence: ['tipología', 'barrio', 'distancia', 'superficie', 'programa', 'precio UF', 'ventana temporal'],
      statuses: ['candidate_high', 'candidate_medium', 'rejected', 'confirmed'],
      currentConfirmedMatches: 0,
      rule: 'No confirmar por score probabilístico solamente. Conservar evidencias y contradicciones por candidato.',
    },
  },
}

fs.writeFileSync(path.join(root, 'data', 'market-source-intelligence.json'), JSON.stringify(output, null, 2) + '\n')
console.log(JSON.stringify({ files: output.sourceInventory.files.length, cells: manifestCellCount, portalRows: cross.portal.reduce((sum, item) => sum + item.listingIds.present, 0), cbrsRows: cross.cbrs.rows, polygons: cross.kmlGeometry.polygonCount }, null, 2))
