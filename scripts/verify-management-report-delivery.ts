import assert from 'node:assert/strict'
import {
  buildManagementReportEmailContent,
  getManagementReportDeliveryConfiguration,
  managementReportRetryDelayMs,
} from '../lib/management-report-delivery-core'
import { buildManagementReportPdf } from '../lib/management-report-artifact'

assert.equal(getManagementReportDeliveryConfiguration({} as NodeJS.ProcessEnv), null)

const configuration = getManagementReportDeliveryConfiguration({
  RESEND_API_KEY: 're_test',
  REPORT_FROM_EMAIL: 'Property Partners <reports@example.com>',
  REPORT_REPLY_TO: 'support@example.com',
  APP_BASE_URL: 'https://example.com/',
} as NodeJS.ProcessEnv)
assert.ok(configuration)
assert.equal(configuration.provider, 'resend')
assert.equal(configuration.appBaseUrl, 'https://example.com')
assert.equal(configuration.replyTo, 'support@example.com')

assert.equal(managementReportRetryDelayMs(1), 5 * 60 * 1000)
assert.equal(managementReportRetryDelayMs(2), 10 * 60 * 1000)
assert.equal(managementReportRetryDelayMs(3), 20 * 60 * 1000)
assert.equal(managementReportRetryDelayMs(20), 24 * 60 * 60 * 1000)

const report = {
  id: '00000000-0000-0000-0000-000000000001',
  report_type: 'executive',
  period_start: '2026-07-01',
  period_end: '2026-07-31',
  generated_at: '2026-08-01T09:00:00.000Z',
  snapshot: {
    generatedAt: '2026-08-01T09:00:00.000Z',
    period: '2026-07',
    dataProvenance: 'Muestra sintética de verificación.',
    entities: [{
      id: 'entity-1',
      name: 'Oficina de prueba',
      entity_type: 'office',
      metrics: [{
        metric_code: 'sales',
        label: 'Ventas',
        value: 3,
        unit: 'count',
        quality_status: 'verified',
        evaluation_status: 'evaluable',
      }],
    }],
    alerts: [{ severity: 'warning', title: 'Control de prueba', detail: 'Sin efecto productivo.' }],
  },
}

const email = buildManagementReportEmailContent(report, 'https://example.com/api/management/reports/1/artifact')
assert.match(email.subject, /Reporte ejecutivo/)
assert.match(email.subject, /2026-07-01/)
assert.match(email.html, /snapshot persistido/)
assert.match(email.text, /Copia autenticada/)

const artifact = await buildManagementReportPdf(report)
assert.ok(artifact.bytes.length > 1000)
assert.equal(Buffer.from(artifact.bytes).subarray(0, 4).toString('ascii'), '%PDF')
assert.match(artifact.filename, /reporte-ejecutivo-2026-07-01-2026-07-31\.pdf/)

console.log('Management report delivery verification passed.')
