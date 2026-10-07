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
  const floatingPedro = readFileSync('components/intelligence/pedro-pablo-floating-chat.tsx', 'utf8')
  const director = readFileSync('components/management/director-dashboard-v3.tsx', 'utf8')
  const partner = readFileSync('components/management/partner-performance-summary.tsx', 'utf8')
  const valuation = readFileSync('app/dashboard/valuation/page.tsx', 'utf8')
  const sidebar = readFileSync('components/layout/sidebar.tsx', 'utf8')
  const dataLayer = readFileSync('components/management/data-layer-legend.tsx', 'utf8')
  const directorOps = readFileSync('components/management/director-operational-workspace.tsx', 'utf8')
  const partnerOps = readFileSync('components/management/partner-operational-workspace.tsx', 'utf8')
  const publicHome = readFileSync('app/page.tsx', 'utf8')
  const publicEstimator = readFileSync('components/public/public-valuation-estimator.tsx', 'utf8')
  const login = readFileSync('app/auth/login/page.tsx', 'utf8')

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
  assert.doesNotMatch(market, /cron automático/)
  assert.doesNotMatch(market, /El KML es la autoridad territorial/)

  assert.match(valuations, /Actualizado/)
  assert.match(valuations, /Ver calidad de datos/)

  assert.match(management, /Qué falta para cerrar/)
  assert.match(management, /Actualizado/)
  assert.match(management, /Ver calidad de datos/)
  assert.match(management, /reportTypeLabel/)
  assert.match(management, /statusLabel/)
  assert.match(management, />Datos y cargas<\/summary>/)

  assert.match(reports, /Informe actual/)
  assert.match(reports, /Ver trazabilidad/)
  assert.match(reports, /Ver historial/)
  assert.match(reports, /Ver calidad de datos/)

  assert.match(properties, /Requiere decisión/)
  assert.match(properties, /Ver calidad de datos/)

  assert.match(offer, /Cambios de hoy/)
  assert.match(offer, /Ver inventario completo/)
  assert.doesNotMatch(offer, /snapshot diario/i)
  assert.doesNotMatch(offer, /snapshot completo/i)

  assert.match(pedro, /Decisiones con datos verificados/)
  assert.match(pedro, /Ver detalle/)
  assert.match(pedro, /evidenceSourceLabel/)
  assert.match(pedro, /Actualizado \{evidenceCutoffLabel\(item\.cutoff\)\}/)
  assert.doesNotMatch(pedro, /usuario autenticado \+ capabilities \+ RLS/)
  assert.doesNotMatch(pedro, /\{item\.domain \?/)
  assert.doesNotMatch(pedro, /\{item\.reference \?/)

  assert.doesNotMatch(floatingPedro, /rounded-(?:full|xl|lg|md)/)
  assert.doesNotMatch(floatingPedro, /shadow-(?:xl|2xl)/)
  assert.doesNotMatch(floatingPedro, /hover:-translate-y/)

  assert.match(director, /eyebrow="Hoy"/)
  assert.match(director, /Ver seguimiento y análisis/)
  assert.doesNotMatch(director, /01 · Pulso de la oficina/)

  assert.match(partner, /Mi desempeño/)
  assert.match(partner, /Ver detalle/)
  assert.doesNotMatch(partner, /Corte canónico vigente/)

  assert.match(valuation, /title="Nueva valorización"/)
  assert.match(valuation, /Revisar estado/)
  assert.match(valuation, /Referencia sugerida confirmada/)
  assert.doesNotMatch(valuation, /Referencia Champion v5/)
  assert.doesNotMatch(valuation, /Funcionalidad V2 habilitada para N3uralia/)
  assert.doesNotMatch(valuation, /property-partners-valuation-v2/)

  assert.doesNotMatch(sidebar, /Intelligence Platform/)

  assert.doesNotMatch(dataLayer, /junio 2026/)
  assert.doesNotMatch(dataLayer, /Supabase/)
  assert.doesNotMatch(dataLayer, /RLS/)
  assert.match(dataLayer, /último período aprobado disponible/)

  assert.doesNotMatch(directorOps, /alcance central/)
  assert.match(directorOps, /statusLabel/)
  assert.match(directorOps, /En revisión/)
  assert.doesNotMatch(partnerOps, /RLS al alcance personal/)
  assert.match(partnerOps, /statusLabel/)
  assert.match(partnerOps, /En curso/)

  assert.match(publicHome, /Cómo se calcula/)
  assert.doesNotMatch(publicHome, /KML/)
  assert.doesNotMatch(publicHome, /Piso mínimo de evidencia/)
  assert.match(publicEstimator, /Rango referencial/)
  assert.match(publicEstimator, /Ver detalle del cálculo/)
  assert.match(publicEstimator, /Referencia central/)
  assert.match(publicEstimator, /Actualizado \{dateTime\.format\(new Date\(result\.newestObservation\)\)\}/)
  assert.match(publicEstimator, /options\.find\(\(option\) => option\.coverageLevel === 'sector'\)/)

  assert.match(login, /Ingresa con tu cuenta de Property Partners/)
  assert.doesNotMatch(login, /Acceso administrado internamente/)
  assert.doesNotMatch(login, /Inteligencia de mercado Vitacura/)
})

test('shared workspace metadata is sentence case and freshness is explicit', () => {
  const workspace = readFileSync('components/ui/workspace.tsx', 'utf8')

  assert.doesNotMatch(workspace, /meta \? <div className="[^"]*uppercase/)
  assert.match(workspace, /Actualizado/)
  assert.match(workspace, /Sin observaciones/)
})
