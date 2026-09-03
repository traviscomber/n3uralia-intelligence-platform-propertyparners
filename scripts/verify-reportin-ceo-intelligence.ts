import assert from 'node:assert/strict'
import { PDFDocument } from 'pdf-lib'
import {
  getCeoIntelligenceReportConfiguration,
  type CeoKpi,
  type PropertyPartnersCeoIntelligenceReport,
} from '../lib/property-partners-ceo-intelligence-report'
import { buildCeoIntelligencePdf } from '../lib/reportin-ceo-intelligence-pdf'
import { parseCanonicalReportContent, resolveCanonicalReportArtifactUrl } from '../lib/canonical-report-delivery'

const kpi = (code: string, label: string, value: number | null, unit = 'count'): CeoKpi => ({
  id: `metric:company:${code}:2026-07-01:2026-07-31`,
  label,
  metricCode: code,
  value,
  unit,
  status: value === null ? 'not_evaluable' : 'verified',
  periodStart: '2026-07-01',
  periodEnd: '2026-07-31',
  formulaVersion: '1',
  evidenceRefs: [`metric:company:${code}:2026-07-01:2026-07-31`],
  momPct: value === null ? null : 10,
  yoyPct: value === null ? null : 5,
})

const report: PropertyPartnersCeoIntelligenceReport = {
  report_type: 'property_partners_ceo_intelligence',
  standard_version: '1.0',
  title: 'Property Partners Vitacura · CEO Intelligence · 2026-07',
  subtitle: 'Mercado · Operación · Conversión · Micromercados · Decisiones',
  client: 'Property Partners Vitacura',
  audience: 'CEO y dirección ejecutiva',
  purpose: 'Prueba determinística del CEO Intelligence Report.',
  executive_summary: 'El informe integra resultados comerciales, benchmark territorial y decisiones usando únicamente un snapshot controlado de prueba.',
  what_changed: ['La actividad comercial aumentó frente al período comparable de prueba.'],
  what_matters: ['La señal territorial conserva su corte independiente del período comercial.'],
  sections: [
    {
      id: 'mercado-micromercados',
      title: 'Micromercados',
      summary: 'La geometría KML se renderiza como mapa vectorial y la señal conserva su fecha de referencia.',
      key_findings: ['El benchmark de prueba está alineado.'],
      risks: [],
      recommendations: ['Mantener corte y evidencia visibles.'],
      evidence_refs: ['kml:test:1', 'market:1'],
    },
    {
      id: 'resultado-comercial',
      title: 'Resultado comercial',
      summary: 'La serie mensual se conserva como dato canónico.',
      key_findings: ['Ventas de prueba verificadas.'],
      risks: [],
      recommendations: ['Revisar conversión.'],
      evidence_refs: ['metric:company:sales:2026-07-01:2026-07-31'],
    },
    {
      id: 'conversion-funnel',
      title: 'Conversión',
      summary: 'El funnel se presenta como lectura mensual direccional.',
      key_findings: ['Las etapas no se interpretan como cohorte.'],
      risks: [],
      recommendations: ['Mantener trazabilidad.'],
      evidence_refs: ['metric:company:leads:2026-07-01:2026-07-31'],
    },
    {
      id: 'oficinas',
      title: 'Oficinas',
      summary: 'La comparación por oficina preserva métricas y unidades.',
      key_findings: ['Una oficina de prueba.'],
      risks: [],
      recommendations: ['Comparar sólo métricas compatibles.'],
      evidence_refs: ['metric:office:sales:2026-07-01:2026-07-31'],
    },
    {
      id: 'valorizacion',
      title: 'Valorización',
      summary: 'La ausencia de casos del período no se transforma en falla del módulo.',
      key_findings: ['Sin casos de prueba.'],
      risks: [],
      recommendations: [],
      evidence_refs: ['valuation:2026-07-01:2026-07-31'],
    },
  ],
  decisions: [
    { priority: 1, title: 'Revisar conversión', rationale: 'El control debe concentrarse en la etapa final del funnel.', owner: 'Dirección', horizon: 'Semanal', control_indicator: 'Visitas realizadas / cierres', evidence_refs: ['metric:company:sales:2026-07-01:2026-07-31'] },
    { priority: 2, title: 'Usar micromercados', rationale: 'La geometría permite ordenar la lectura territorial.', owner: 'CEO', horizon: 'Mensual', control_indicator: 'Gap UF/m² por barrio', evidence_refs: ['market:1'] },
    { priority: 3, title: 'Conservar trazabilidad', rationale: 'Cada decisión debe mantener evidencia y corte.', owner: 'Comercial', horizon: 'Mensual', control_indicator: 'Cobertura de evidencia', evidence_refs: ['kml:test:1'] },
  ],
  limitations: ['Fixture técnico; no contiene datos reales del Cliente.'],
  period: { start: '2026-07-01', end: '2026-07-31', source_cutoff: '2026-08-02' },
  delivery: { recipient: null, status: 'draft', purpose: 'Prueba técnica', paymentStatus: 'not_applicable', deliveredAt: null },
  source_snapshot_id: 'fixture:ceo-intelligence:2026-07',
  snapshot: {
    headline_kpis: [
      kpi('sales', 'Ventas', 11),
      kpi('sales_uf', 'UF vendidas', 186357, 'uf'),
      kpi('goal_compliance', 'Cumplimiento', null, 'percent'),
      kpi('leads', 'Leads', 435),
      kpi('realized_visits', 'Visitas realizadas', 160),
      kpi('listings', 'Captaciones', 29),
      kpi('stock', 'Stock', 350),
      kpi('suspended_listings', 'Suspendidas', 56),
    ],
    monthly_series: {
      sales: ['01', '02', '03', '04', '05', '06', '07'].map((month, index) => ({ period: `2026-${month}`, value: index + 4, status: 'verified' as const, formulaVersion: '1', evidenceRefs: [`sales:${month}`] })),
      salesUf: ['01', '02', '03', '04', '05', '06', '07'].map((month, index) => ({ period: `2026-${month}`, value: 60000 + index * 10000, status: 'verified' as const, formulaVersion: '1', evidenceRefs: [`sales-uf:${month}`] })),
    },
    funnel: [kpi('requirements', 'Requerimientos', 629), kpi('leads', 'Leads', 435), kpi('scheduled_visits', 'Visitas agendadas', 307), kpi('realized_visits', 'Visitas realizadas', 160), kpi('sales', 'Ventas', 11)],
    offices: [{ id: 'office', name: 'Oficina prueba', metrics: [kpi('management_credited_sales', 'Cierres gestión', 4), kpi('management_credited_sales_uf', 'UF gestión', 58325, 'uf'), kpi('canonical_follow_up_score', 'Seguimiento', 81.33, 'percent'), kpi('realized_visits', 'Visitas', 71), kpi('stale_90_leads', '>90d', 6), kpi('stock', 'Stock', 94)] }],
    market: {
      polygons: [{ id: 'test', name: 'Micromercado prueba', source: 'Property Partners', version: '1', geometry: { type: 'Polygon', coordinates: [[[-70.60, -33.40], [-70.58, -33.40], [-70.58, -33.38], [-70.60, -33.38], [-70.60, -33.40]]] }, evidenceRefs: ['kml:test:1'] }],
      rows: [{ neighborhood: 'Micromercado prueba', propertyType: 'Casa', portalListings: 10, cbrsTransactions: 30, portalMedianPriceUf: 10000, cbrsMedianPriceUf: 9500, portalMedianUfM2: 100, cbrsMedianUfM2: 95, gapPct: 0.0526, supplyDepthRatio: 0.33, signal: 'market_aligned', confidence: 'high', asOfPortal: '2026-03-09', asOfCbrs: '2026-01-09', evidenceRefs: ['market:1'] }, { neighborhood: 'Micromercado prueba', propertyType: 'Departamento', portalListings: 12, cbrsTransactions: 40, portalMedianPriceUf: 9000, cbrsMedianPriceUf: 8000, portalMedianUfM2: 110, cbrsMedianUfM2: 90, gapPct: 0.2222, supplyDepthRatio: 0.30, signal: 'asking_well_above_sales', confidence: 'high', asOfPortal: '2026-03-09', asOfCbrs: '2026-01-09', evidenceRefs: ['market:2'] }],
      portalCutoff: '2026-03-09',
      cbrsCutoff: '2026-01-09',
    },
    valuation: { totalCases: 0, byStatus: [], periodStart: '2026-07-01', periodEnd: '2026-07-31', evidenceRefs: ['valuation:2026-07-01:2026-07-31'] },
  },
  canonical_metadata: { provider: 'OpenAI', model: 'verification-model', api: 'responses', reasoning_effort: 'medium', reasoning_mode: 'standard', store: false, generated_at: '2026-09-03T17:00:00.000Z', source_policy: 'canonical_input_only', prompt_version: 'ceo-intelligence-1.0' },
}

async function main() {
  const config = getCeoIntelligenceReportConfiguration()
  assert.equal(config.model, process.env.OPENAI_CEO_INTELLIGENCE_MODEL || process.env.OPENAI_CANONICAL_REPORT_MODEL || 'gpt-5.6-sol')
  assert.equal(config.reasoningEffort, 'medium')
  assert.equal(config.reasoningMode, 'standard')
  assert.equal(config.store, false)
  assert.equal(config.sourcePolicy, 'canonical_input_only')

  const parsed = parseCanonicalReportContent(JSON.stringify(report))
  assert.ok(parsed)
  const metadata = { docType: 'report', tags: ['canonical', 'n3uralia-client-report', 'ceo-intelligence-report'] }
  assert.equal(resolveCanonicalReportArtifactUrl(parsed, 'pdf', 'fixture-id', metadata), '/api/management/reports/ceo-intelligence/fixture-id/artifact?disposition=inline')
  assert.equal(resolveCanonicalReportArtifactUrl(parsed, 'download', 'fixture-id', metadata), '/api/management/reports/ceo-intelligence/fixture-id/artifact')

  const artifact = await buildCeoIntelligencePdf(report)
  assert.equal(artifact.reportinVersion, '1.1')
  assert.match(artifact.filename, /^property-partners-vitacura-ceo-intelligence-2026-07-2026-07-31\.pdf$/)
  assert.ok(artifact.bytes.byteLength > 3_000)
  const loaded = await PDFDocument.load(artifact.bytes)
  assert.equal(loaded.getPageCount(), 8)
  assert.equal(loaded.getTitle(), report.title)
  assert.equal(loaded.getSubject(), report.purpose)
  assert.equal(loaded.getAuthor(), 'N3uralia Intelligence Platform')

  await assert.rejects(
    () => buildCeoIntelligencePdf({ ...report, canonical_metadata: { ...report.canonical_metadata, source_policy: 'external_sources_forbidden' as PropertyPartnersCeoIntelligenceReport['canonical_metadata']['source_policy'] } }),
    /REPORTIN_INVALID_SOURCE_POLICY/,
  )

  console.log('Reportin CEO intelligence contract verification passed.')
}

main().catch((error) => {
  console.error('Reportin CEO intelligence verification failed.', error)
  process.exitCode = 1
})
