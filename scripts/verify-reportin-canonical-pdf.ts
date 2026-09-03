import assert from 'node:assert/strict'
import { PDFDocument } from 'pdf-lib'
import type { CanonicalClientReport } from '../lib/n3uralia-canonical-client-report'
import {
  extractCanonicalReportTrace,
  formatCanonicalReportPeriod,
  parseCanonicalReportContent,
  resolveCanonicalReportArtifactUrl,
} from '../lib/canonical-report-delivery'

const report: CanonicalClientReport = {
  report_type: 'n3uralia_client_canonical',
  standard_version: '1.0',
  title: 'Informe Canónico de Avance Property Partners',
  subtitle: 'Verificación determinística de Reportin',
  client: 'Property Partners',
  audience: 'Dirección ejecutiva',
  purpose: 'Validar la generación del artefacto PDF sin datos simulados de negocio.',
  executive_summary: 'El generador produce un PDF válido a partir de una estructura canónica controlada para pruebas técnicas.',
  period: {
    start: '2026-07-01',
    end: '2026-07-31',
    source_cutoff: '2026-08-01T00:00:00.000Z',
  },
  delivery: {
    recipient: null,
    status: 'draft',
    purpose: 'Prueba técnica interna',
    paymentMilestonePercent: null,
    paymentStatus: 'not_applicable',
    deliveredAt: null,
  },
  canonical_metadata: {
    provider: 'OpenAI',
    model: 'verification-model',
    api: 'responses',
    reasoning_effort: 'high',
    reasoning_mode: 'reasoning',
    store: false,
    generated_at: '2026-08-06T12:00:00.000Z',
    source_policy: 'canonical_input_only',
  },
  sections: [
    {
      id: 'scope',
      title: 'Alcance verificado',
      status: 'verified',
      summary: 'Esta sección contiene únicamente contenido técnico controlado por la prueba.',
      key_findings: ['El documento conserva el estándar canónico.'],
      next_actions: ['Mantener esta verificación conectada al build.'],
      evidence_refs: ['scripts/verify-reportin-canonical-pdf.ts'],
    },
  ],
  conclusions: ['El artefacto puede ser abierto por pdf-lib.'],
  client_actions: [],
  n3uralia_actions: ['Conservar la validación determinística.'],
  limitations: ['Esta prueba valida estructura técnica, no contenido comercial ni datos reales del cliente.'],
}

async function main() {
  const parsedReport = parseCanonicalReportContent(JSON.stringify(report))
  assert.ok(parsedReport)
  assert.equal(formatCanonicalReportPeriod(parsedReport), '2026-07-01 — 2026-07-31')

  const metadata = {
    docType: 'report',
    tags: ['canonical', 'n3uralia-client-report'],
  }
  const deterministicArtifact = '/api/management/reports/canonical-client/reportin-contract-test/artifact'
  assert.equal(
    resolveCanonicalReportArtifactUrl(parsedReport, 'pdf', 'reportin-contract-test', metadata),
    `${deterministicArtifact}?disposition=inline`,
  )
  assert.equal(
    resolveCanonicalReportArtifactUrl(parsedReport, 'download', 'reportin-contract-test', metadata),
    deterministicArtifact,
  )
  assert.equal(
    resolveCanonicalReportArtifactUrl(parsedReport, 'download', 'reportin-contract-test', {
      docType: 'report',
      tags: ['n3uralia-client-report'],
    }),
    null,
  )
  assert.equal(
    resolveCanonicalReportArtifactUrl({ ...parsedReport, standard_version: '2.0' }, 'download', 'reportin-contract-test', metadata),
    null,
  )
  assert.equal(
    resolveCanonicalReportArtifactUrl({
      ...parsedReport,
      canonical_metadata: { source_policy: 'external_sources_forbidden' },
    }, 'download', 'reportin-contract-test', metadata),
    null,
  )
  assert.equal(
    resolveCanonicalReportArtifactUrl({ report_type: 'legacy_report' }, 'pdf', 'legacy-report', metadata),
    null,
  )
  assert.equal(
    resolveCanonicalReportArtifactUrl({
      ...parsedReport,
      artifacts: { pdf: { url: '/explicit/view.pdf', downloadUrl: '/explicit/download.pdf' } },
    }, 'pdf', 'reportin-contract-test'),
    '/explicit/view.pdf',
  )
  assert.equal(
    resolveCanonicalReportArtifactUrl({
      ...parsedReport,
      artifacts: { pdf: { url: '/explicit/view.pdf', downloadUrl: '/explicit/download.pdf' } },
    }, 'download', 'reportin-contract-test'),
    '/explicit/download.pdf',
  )

  const trace = extractCanonicalReportTrace(parsedReport)
  assert.equal(trace.model, 'verification-model')
  assert.equal(trace.promptVersion, '1.0')
  assert.equal(trace.sourceCount, 1)

  const { buildReportinCanonicalPdf } = await import('../lib/reportin-canonical-pdf')
  const artifact = await buildReportinCanonicalPdf(report)
  assert.equal(artifact.reportinVersion, '1.0')
  assert.match(artifact.filename, /^informe-canonico-de-avance-property-partners-2026-07-31\.pdf$/)
  assert.ok(artifact.bytes.byteLength > 1_000)

  const parsed = await PDFDocument.load(artifact.bytes)
  assert.ok(parsed.getPageCount() >= 5)
  assert.equal(parsed.getTitle(), report.title)
  assert.equal(parsed.getSubject(), report.purpose)
  assert.equal(parsed.getAuthor(), 'N3uralia Intelligence Platform')
  assert.equal(parsed.getCreator(), 'Reportin 1.0')
  assert.match(parsed.getProducer() ?? '', /^pdf-lib /)

  await assert.rejects(
    () => buildReportinCanonicalPdf({
      ...report,
      canonical_metadata: {
        ...report.canonical_metadata,
        source_policy: 'external_sources_forbidden' as CanonicalClientReport['canonical_metadata']['source_policy'],
      },
    }),
    /REPORTIN_INVALID_SOURCE_POLICY/,
  )

  console.log('Reportin canonical PDF and delivery contract verification passed.')
}

main().catch((error) => {
  console.error('Reportin canonical PDF verification failed.', error)
  process.exitCode = 1
})
