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

test('monthly audience reporting policy stays canonical and complete', () => {
  const contract = source('docs/reporting/PROPERTY_PARTNERS_AUDIENCE_REPORT_CANONICAL.md')
  for (const requirement of [
    'CEO/Directorio', 'Directoras', 'Partners', 'detalle nominal',
    '−22.000 UF', 'No sustituir un informe completo', 'PDFino',
    'render de **todas** las páginas',
  ]) assert.ok(contract.includes(requirement), requirement)
})

test('legacy management PDF export runs mandatory PDFino A4 preflight', () => {
  const generator = source('lib/management-report-artifact.ts')
  assert.match(generator, /verifyPdfinoReport\(bytes/)
  assert.match(generator, /requireA4: true/)
  assert.match(generator, /pdf\.setTitle\(/)
})

test('embedded reporting skill follows canonical DESIGN.md and protects all three audiences', () => {
  const skill = source('.agents/skills/property-partners-reporting/SKILL.md')
  for (const requirement of ['DESIGN.md', 'PROPERTY_PARTNERS_AUDIENCE_REPORT_CANONICAL.md',
    'CEO:', 'Directors:', 'Partners:', '37 September partner rows', 'every',
    'Server-side RBAC', 'HOLD', 'CI']) {
    assert.ok(skill.includes(requirement), 'missing reporting skill requirement: ' + requirement)
  }
})

test('legacy management PDF uses approved logo bytes instead of invented monogram', () => {
  const generator = source('lib/management-report-artifact.ts')
  assert.match(generator, /public\/brand\/property-partners-vitacura\.png/)
  assert.match(generator, /page\.drawImage\(approvedLogo/)
  assert.doesNotMatch(generator, /page\.drawText\('P', \{ x, y, size/)
})

test('management PDF embeds actual report dates and a SHA-256 fingerprint of its source snapshot', () => {
  const generator = source('lib/management-report-artifact.ts')
  assert.match(generator, /createHash\('sha256'\)/)
  assert.match(generator, /JSON\.stringify\(report\.snapshot\)/)
  assert.match(generator, /pdf\.setSubject\(/)
  assert.match(generator, /pdf\.setKeywords\(/)
  assert.match(generator, /report\.period_start/)
  assert.match(generator, /report\.period_end/)
})

test('download route verifies PDF subject and source snapshot hash before response', () => {
  const route = source('app/api/management/reports/[id]/artifact/route.ts')
  assert.match(route, /PDFDocument\.load\(artifact\.bytes\)/)
  assert.match(route, /createHash\('sha256'\)/)
  assert.match(route, /JSON\.stringify\(normalized\.snapshot\)/)
  assert.match(route, /document\.getSubject\(\) !== expectedSubject/)
  assert.match(route, /REPORT_ARTIFACT_SOURCE_MISMATCH/)
})

test('canonical audience snapshots are reconciled before real PDF export', () => {
  const route = source('app/api/management/reports/[id]/artifact/route.ts')
  assert.match(route, /verifyAudienceSnapshot\(canonical as unknown as AudienceSnapshot\)/)
  assert.match(route, /REPORT_PERIOD_SNAPSHOT_MISMATCH/)
  assert.match(route, /Array\.isArray\(canonical\.metrics\)/)
})

test('management PDF includes canonical audited nominal appendix only when operations are present', () => {
  const generator = source('lib/management-report-artifact.ts')
  assert.match(generator, /snapshot\.audienceOperations/)
  assert.match(generator, /verifyAudienceOperations\(/)
  assert.match(generator, /REPORT_OPERATIONS_TOTALS_MISSING/)
  assert.match(generator, /Operaciones nominales/)
  assert.match(generator, /AJUSTE HISTÓRICO/)
  assert.match(generator, /finalPageCount/)
})

test('signed closure count is visible next to UF on the real nominal PDF appendix', () => {
  const generator = source('lib/management-report-artifact.ts')
  assert.match(generator, /page\.drawText\('Cierres'/)
  assert.match(generator, /page\.drawText\(format\(op\.closureCount\)/)
  assert.match(generator, /op\.closureCount < 0/)
})

test('partner export renders only validated roster, scoped to partner audience', () => {
  const generator = source('lib/management-report-artifact.ts')
  assert.match(generator, /report\.report_type !== 'partner'/)
  assert.match(generator, /verifyPartnerReportRows\(/)
  assert.match(generator, /REPORT_PARTNER_COVERAGE_INCOMPLETE/)
  assert.match(generator, /Actividad nominal por oficina/)
  assert.match(generator, /partnerAppendixPages/)
})
