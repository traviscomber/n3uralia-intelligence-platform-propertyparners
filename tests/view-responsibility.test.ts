import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

test('top-level views keep one clear responsibility', () => {
  const navigation = readFileSync('lib/navigation.ts', 'utf8')
  const market = readFileSync('app/dashboard/market/page.tsx', 'utf8')
  const ceo = readFileSync('components/management/ceo-dashboard-command.tsx', 'utf8')
  const director = readFileSync('components/management/director-dashboard-v3.tsx', 'utf8')
  const pedro = readFileSync('components/intelligence/pedro-pablo-workspace-v2.tsx', 'utf8')

  assert.match(navigation, /Cierre mensual/)
  assert.doesNotMatch(navigation, /label: 'Gestión', href: '\/dashboard\/control\/operations'/)

  assert.match(market, /Mercado responde oferta, ventas, evolución y territorio/)
  assert.doesNotMatch(market, /Balanced Scorecard/)
  assert.doesNotMatch(market, /Proceso comercial/)
  assert.doesNotMatch(market, /Alertas del mes/)
  assert.doesNotMatch(market, /09 · Property 360/)

  assert.match(ceo, /Cartera/)
  assert.match(ceo, /Seguimiento/)
  assert.match(ceo, /Conversión/)

  assert.match(director, /MoM/)
  assert.match(director, /YoY/)
  assert.match(director, /Alertas/)
  assert.match(director, /Tareas/)

  assert.match(pedro, /Asistente ejecutivo objetivo/)
  assert.match(pedro, /evidencia/)
  assert.match(pedro, /siguiente acción/)
})
