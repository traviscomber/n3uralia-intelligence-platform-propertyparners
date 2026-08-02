import { Resend } from 'resend'
import { generateEnhancedCeoReportHTML } from '@/lib/enhanced-ceo-report-generator'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { period, recipient_email } = await request.json()

    // Generate enhanced report HTML
    const reportHTML = await generateEnhancedCeoReportHTML(period)

    // Send email via Resend
    const emailResponse = await resend.emails.send({
      from: 'reporte@n3uralia.com',
      to: recipient_email,
      subject: `Reporte CEO Integral - ${period}`,
      html: reportHTML,
    })

    return Response.json({
      success: true,
      emailId: emailResponse.id,
      recipient: recipient_email,
      period,
    })
  } catch (error) {
    console.error('[Send Enhanced Report] Error:', error)
    return Response.json({ error: String(error) }, { status: 500 })
  }
}
