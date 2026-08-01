import type { ManagementReportRecord } from '@/lib/management-report-artifact'

export const DEFAULT_REPORT_FROM_EMAIL = 'Business Intelligence Property Partners <info@ppartnersgroup.app>'
export const DEFAULT_REPORT_ALLOWED_FROM_DOMAINS = ['ppartnersgroup.app'] as const
export const managementReportRetryDelayMs = 5000

export type ManagementReportDeliveryConfiguration = {
  from: string
  appBaseUrl?: string
  replyTo?: string
  apiKey: string
  provider: 'resend'
}

export function getManagementReportDeliveryConfiguration(): ManagementReportDeliveryConfiguration {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw new Error('RESEND_API_KEY environment variable is required')
  }

  return {
    from: DEFAULT_REPORT_FROM_EMAIL,
    appBaseUrl: process.env.NEXT_PUBLIC_APP_URL,
    replyTo: process.env.REPORT_REPLY_TO_EMAIL,
    apiKey,
    provider: 'resend',
  }
}

export function buildManagementReportEmailContent(
  report: ManagementReportRecord,
  artifactUrl?: string | null,
) {
  const reportTypeLabel = report.report_type
    .replace(/_/g, ' ')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

  const generatedDate = report.generated_at ? new Date(report.generated_at).toLocaleDateString('es-CL') : new Date().toLocaleDateString('es-CL')
  const periodEndDate = new Date(report.period_end).toLocaleDateString('es-CL')

  const subject = `Property Partners Intelligence Report: ${reportTypeLabel} - ${periodEndDate}`

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; }
    .content { padding: 20px; background: #f9f9f9; border-radius: 8px; margin-top: 20px; }
    .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; }
    .button { display: inline-block; background: #667eea; color: white; padding: 10px 20px; border-radius: 4px; text-decoration: none; margin-top: 10px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${reportTypeLabel}</h1>
      <p>Report Period: ${new Date(report.period_start).toLocaleDateString('es-CL')} - ${periodEndDate}</p>
    </div>
    <div class="content">
      <p>Hello,</p>
      <p>Your scheduled Property Partners Intelligence report is ready.</p>
      <ul>
        <li><strong>Report Type:</strong> ${reportTypeLabel}</li>
        <li><strong>Period:</strong> ${new Date(report.period_start).toLocaleDateString('es-CL')} to ${periodEndDate}</li>
        <li><strong>Generated:</strong> ${generatedDate}</li>
      </ul>
      ${artifactUrl ? `<p><a href="${artifactUrl}" class="button">Download Report</a></p>` : ''}
      <p>If you have any questions, please contact Property Partners Intelligence Support.</p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Property Partners. All rights reserved.</p>
      <p>Business Intelligence Property Partners | info@ppartnersgroup.app</p>
    </div>
  </div>
</body>
</html>`

  const text = `${reportTypeLabel} Report\n\nPeriod: ${new Date(report.period_start).toLocaleDateString('es-CL')} - ${periodEndDate}\nGenerated: ${generatedDate}\n\nYour scheduled Property Partners Intelligence report is ready.\n\nReport Type: ${reportTypeLabel}\nPeriod: ${new Date(report.period_start).toLocaleDateString('es-CL')} to ${periodEndDate}\n${artifactUrl ? `\nDownload: ${artifactUrl}` : ''}`

  return { subject, html, text }
}
