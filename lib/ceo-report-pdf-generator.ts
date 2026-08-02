import { generateCanonicalCeoReportHTML } from '@/lib/canonical-ceo-report-generator'

export async function generateCeoReportPDFAttachment(periodOverride?: string) {
  try {
    const now = new Date()
    const period = periodOverride || `2026-${String(now.getMonth() + 1).padStart(2, '0')}`

    // Generate canonical-compliant HTML report with optional period override
    const reportHTML = generateCanonicalCeoReportHTML(period)

    // Convert HTML to base64 for email attachment
    const htmlBase64 = Buffer.from(reportHTML).toString('base64')

    return {
      filename: `ceo-reporte-integral-${period}.html`,
      content: htmlBase64,
      contentType: 'text/html',
      period,
    }
  } catch (error) {
    console.error('[PDF Generator] Error:', error)
    throw error
  }
}
