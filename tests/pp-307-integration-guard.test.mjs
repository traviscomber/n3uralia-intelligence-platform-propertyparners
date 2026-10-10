import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const source = (file) => readFileSync(file, 'utf8')

test('approved three pillars take precedence over older PR #307 navigation', () => {
  const nav = source('lib/navigation.ts')
  for (const exportName of ['CEO_NAVIGATION', 'ADMIN_NAVIGATION', 'DIRECTOR_NAVIGATION', 'SELLER_NAVIGATION']) {
    const block = nav.split('export const ' + exportName + ':')[1]?.split('export const ')[0]
    assert.ok(block, exportName + ' must exist')
    assert.match(block, /label: 'Tres pilares'/)
    for (const label of ['Mercado', 'Valorizador', 'Reportes']) assert.match(block, new RegExp("label: '" + label + "'"))
    assert.match(block, /label: 'Más herramientas'/)
    assert.doesNotMatch(block, /label: 'Principal'/)
  }
})

test('market keeps distinct houses and apartments and never presents daily delta as full inventory', () => {
  const market = source('app/dashboard/market/page.tsx')
  assert.match(market, /market\.categories/)
  assert.match(market, /Avisos del último inventario completo verificado/)
  assert.match(market, /Inventario verificado/)
  assert.match(market, /nuevos hoy/)
  assert.match(market, /Actualización diaria pendiente/)
  const refresh = source('app/api/cron/market-refresh/route.ts')
  assert.match(refresh, /'portal_houses'/)
  assert.match(refresh, /'portal_apartments'/)
  assert.match(refresh, /evaluatePortalInventoryCompleteness/)
  assert.match(refresh, /withinPortalInventoryWindow/)
})

test('report delivery remains review-gated, not an automatically approved draft', () => {
  const reports = source('app/dashboard/reportes/canonicos/page.tsx')
  assert.match(reports, /DELIVERABLE_STATUSES/)
  assert.match(reports, /isDeliverable\(report/)
  assert.match(reports, /CanonicalReportReviewActions/)
  assert.match(reports, /Sin informe listo para entrega/)
})

test('partner sees four decision metrics first and optional secondary context', () => {
  const partner = source('components/management/partner-performance-summary.tsx')
  assert.match(partner, /Mi desempeño/)
  assert.match(partner, /primaryCards/)
  assert.match(partner, /secondaryCards/)
  assert.match(partner, /Leads activos/)
  assert.match(partner, /Visitas realizadas/)
  assert.match(partner, /Ver detalle/)
  assert.doesNotMatch(partner, /Corte canónico vigente/)
})

test('director home prioritizes office results without losing actions', () => {
  const director = source('components/management/director-dashboard-v3.tsx')
  assert.match(director, /eyebrow="Hoy"/)
  assert.match(director, /eyebrow="Resultado"/)
  assert.match(director, /eyebrow="Prioridades"/)
  assert.match(director, /Actualizado/)
  assert.match(director, /Asignar propiedades/)
  assert.match(director, /Revisar valorizaciones/)
  assert.doesNotMatch(director, /BarChart3/)
})

test('executive report is visibly a draft pending review', () => {
  const report = source('components/management/ceo-intelligence-report-generator.tsx')
  assert.match(report, /Generar informe ejecutivo/)
  assert.match(report, /Se guarda como borrador y no se envía automáticamente/)
  assert.match(report, /Revisar informe/)
  assert.doesNotMatch(report, /Generar CEO Intelligence/)
})

test('CEO report generation remains role restricted and persists draft only', () => {
  const route = source('app/api/management/reports/ceo-intelligence/latest/route.ts')
  assert.match(route, /requireRoleAccess\(\['admin', 'ceo'\]\)/)
  assert.match(route, /isReusableCeoIntelligenceDocument/)
  assert.match(route, /sourceSnapshotId/)
  assert.match(route, /'draft'/)
  assert.doesNotMatch(route, /'approved'/)
  assert.doesNotMatch(route, /sendEmail|sendReport|resend\.emails\.send/)
})

test('automatic CEO draft job stays disabled until source, dedupe and access gates are reviewed', () => {
  const vercel = source('vercel.json')
  assert.doesNotMatch(vercel, /\/api\/cron\/ceo-intelligence-draft/)
})

test('canonical PDF invokes PDFino brand and document preflight on every export', () => {
  const generator = source('lib/reportin-canonical-pdf.ts')
  const qa = source('lib/pdfino-report-quality.ts')
  assert.match(generator, /public\/brand\/property-partners-vitacura\.png/)
  assert.match(generator, /pdf\.embedPng\(logoBytes\)/)
  assert.match(generator, /pdf\.save\(\)/)
  assert.match(generator, /await verifyPdfinoReport\(bytes/)
  assert.match(qa, /PDFINO_PAGE_SIZE_INVALID/)
  assert.match(qa, /PDFINO_TITLE_MISMATCH/)
})

test('CEO intelligence PDF uses the same approved brand and preflight', () => {
  const generator = source('lib/reportin-ceo-intelligence-pdf.ts')
  assert.match(generator, /public\/brand\/property-partners-vitacura\.png/)
  assert.match(generator, /pdf\.embedPng\(logoBytes\)/)
  assert.match(generator, /await verifyPdfinoReport\(bytes/)
  assert.match(generator, /minPages: 8/)
})
