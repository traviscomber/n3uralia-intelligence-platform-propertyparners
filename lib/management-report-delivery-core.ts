import type { ManagementReportRecord } from '@/lib/management-report-artifact'

export type ManagementReportDeliveryConfiguration = {
  provider: 'resend'
  apiKey: string
  from: string
  replyTo: string | null
  appBaseUrl: string | null
}

function cleanBaseUrl(value: string | undefined) {
  const normalized = String(value ?? '').trim().replace(/\/$/, '')
  return normalized || null
}

export function getManagementReportDeliveryConfiguration(
  environment: NodeJS.ProcessEnv = process.env,
): ManagementReportDeliveryConfiguration | null {
  const apiKey = String(environment.RESEND_API_KEY ?? '').trim()
  const from = String(environment.REPORT_FROM_EMAIL ?? '').trim()
  if (!apiKey || !from) return null

  return {
    provider: 'resend',
    apiKey,
    from,
    replyTo: String(environment.REPORT_REPLY_TO ?? '').trim() || null,
    appBaseUrl: cleanBaseUrl(environment.APP_BASE_URL ?? environment.NEXT_PUBLIC_APP_URL),
  }
}

export function managementReportRetryDelayMs(attemptCount: number) {
  const safeAttempt = Math.max(1, Math.floor(attemptCount || 1))
  const minutes = Math.min(24 * 60, 5 * (2 ** (safeAttempt - 1)))
  return minutes * 60 * 1000
}

function reportLabel(reportType: string) {
  const labels: Record<string, string> = {
    executive: 'Reporte ejecutivo',
    office: 'Reporte de oficina',
    partner: 'Reporte individual',
    monthly: 'Reporte mensual',
    cumulative: 'Reporte acumulado',
  }
  return labels[reportType] ?? 'Reporte de gestión'
}

function htmlEscape(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export function buildManagementReportEmailContent(report: ManagementReportRecord, artifactUrl: string | null) {
  const title = reportLabel(report.report_type)
  const period = `${report.period_start} – ${report.period_end}`
  const subject = `${title} · ${period}`
  const linkHtml = artifactUrl
    ? `<p><a href="${htmlEscape(artifactUrl)}">Abrir una copia autenticada del reporte</a></p>`
    : ''
  const html = [
    '<div style="font-family:Arial,sans-serif;line-height:1.5;color:#111">',
    `<h1 style="font-size:20px">${htmlEscape(title)}</h1>`,
    `<p>Período: <strong>${htmlEscape(period)}</strong></p>`,
    '<p>Se adjunta el documento generado desde el snapshot persistido y autorizado del sistema.</p>',
    linkHtml,
    '<p style="font-size:12px;color:#666">Property Partners · N3uralia Intelligence</p>',
    '</div>',
  ].join('')
  const text = [
    title,
    `Período: ${period}`,
    'Se adjunta el documento generado desde el snapshot persistido y autorizado del sistema.',
    artifactUrl ? `Copia autenticada: ${artifactUrl}` : null,
    'Property Partners · N3uralia Intelligence',
  ].filter(Boolean).join('\n\n')

  return { subject, html, text }
}
