import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const files = {
  layout: 'app/dashboard/valuations/[id]/layout.tsx',
  reportPage: 'app/dashboard/valuations/[id]/report/page.tsx',
  director: 'components/management/director-operational-workspace.tsx',
  ceo: 'components/management/ceo-decisions.tsx',
  report: 'components/valuation/valuation-evidence-report.tsx',
}

const source = Object.fromEntries(await Promise.all(Object.entries(files).map(async ([key, path]) => [key, await readFile(path, 'utf8')])))

assert.match(source.layout, /Reporte imprimible/, 'El expediente debe enlazar al reporte imprimible')
assert.match(source.layout, /aria-label="Acciones del expediente"/, 'La navegación del expediente debe tener nombre accesible')
assert.match(source.reportPage, /requireAnyPageCapability/, 'El reporte debe aceptar capacidades autorizadas mediante el guard correcto')
assert.match(source.director, /\/report`}/, 'Dirección debe tener acceso directo al reporte')
assert.match(source.ceo, /\/report`}/, 'CEO debe tener acceso directo al reporte')
assert.match(source.ceo, /min-h-11/, 'Las acciones CEO deben mantener un objetivo táctil mínimo')
assert.match(source.report, /role="alert"/, 'El reporte debe anunciar errores')
assert.match(source.report, /role="status"/, 'El reporte debe anunciar carga')
assert.match(source.report, /caption/, 'Las tablas del reporte deben incluir caption')
assert.match(source.report, /print:hidden/, 'Los controles no deben imprimirse')

console.log('valuation report access and accessibility checks: OK')
