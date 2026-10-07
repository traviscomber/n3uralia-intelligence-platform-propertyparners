import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

test('core product surfaces keep decision content first and technical detail disclosed', () => {
  const ceo = readFileSync('components/management/ceo-dashboard-command.tsx', 'utf8')
  const august = readFileSync('components/management/august-board-reading.tsx', 'utf8')
  const market = readFileSync('app/dashboard/market/page.tsx', 'utf8')
  const valuations = readFileSync('app/dashboard/valuations/page.tsx', 'utf8')
  const management = readFileSync('app/dashboard/control/operations/page.tsx', 'utf8')
  const reports = readFileSync('app/dashboard/reportes/canonicos/page.tsx', 'utf8')
  const properties = readFileSync('app/dashboard/properties/page.tsx', 'utf8')
  const offer = readFileSync('app/dashboard/market/oferta/page.tsx', 'utf8')
  const pedro = readFileSync('components/intelligence/pedro-pablo-workspace-v2.tsx', 'utf8')

  assert.doesNotMatch(ceo, /Control Tower/)
  assert.match(ceo, /Requiere atención/)
  assert.match(ceo, /Ver todas las oficinas/)
  assert.match(ceo, /Ver calidad de datos/)

  assert.doesNotMatch(august, /SYS \/ CONTROL DE GESTIÓN/)
  assert.match(august, /Ver análisis de agosto/)

  assert.match(market, /Inventario verificado/)
  assert.match(market, /Nuevas hoy/)
  assert.match(market, /Ver detalle de datos/)
  assert.match(market, /Ver evolución y gestión/)

  assert.match(valuations, /Actualizado/)
  assert.match(valuations, /Ver calidad de datos/)

  assert.match(management, /Qué falta para cerrar/)
  assert.match(management, /Actualizado/)
  assert.match(management, /Ver calidad de datos/)

  assert.match(reports, /Informe actual/)
  assert.match(reports, /Ver trazabilidad/)
  assert.match(reports, /Ver historial/)
  assert.match(reports, /Ver calidad de datos/)

  assert.match(properties, /Requiere decisión/)
  assert.match(properties, /Ver calidad de datos/)

  assert.match(offer, /Cambios de hoy/)
  assert.match(offer, /Ver inventario completo/)

  assert.match(pedro, /Decisiones con datos verificados/)
  assert.match(pedro, /Ver detalle/)
})

test('shared workspace metadata is sentence case and freshness is explicit', () => {
  const workspace = readFileSync('components/ui/workspace.tsx', 'utf8')

  assert.doesNotMatch(workspace, /meta \? <div className="[^"]*uppercase/)
  assert.match(workspace, /Actualizado/)
  assert.match(workspace, /Sin observaciones/)
})
