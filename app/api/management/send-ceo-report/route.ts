import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { generateCeoReportData, generateCeoReportHTML } from '@/lib/ceo-report-html-generator'

// Lazy initialization to avoid errors during build
let resend: Resend | null = null

function getResend() {
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY)
  }
  return resend
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 })
    }

    // Generate report data and HTML
    const reportData = generateCeoReportData()
    const reportHTML = generateCeoReportHTML(reportData)

    // Send via Resend
    const response = await getResend().emails.send({
      from: 'onboarding@resend.dev',
      to: email,
      subject: `Reporte Integral Ejecutivo - Property Partners ${reportData.period}`,
      html: reportHTML,
    })

    if (response.error) {
      const errorDetails = JSON.stringify(response.error)
      console.error('[Send Report] Resend error:', errorDetails)
      return NextResponse.json(
        { error: 'Failed to send email', details: errorDetails },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        message: `Reporte enviado a ${email}`,
        emailId: response.data?.id,
        period: reportData.period,
      },
      { status: 200 }
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('[Send Report] Error:', errorMessage)
    return NextResponse.json({ error: 'Internal server error', details: errorMessage }, { status: 500 })
  }
}

// GET endpoint to preview report HTML
export async function GET(request: NextRequest) {
  try {
    const reportData = generateCeoReportData()
    const reportHTML = generateCeoReportHTML(reportData)

    return new NextResponse(reportHTML, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('[Preview Report] Error:', errorMessage)
    return NextResponse.json({ error: 'Failed to generate report', details: errorMessage }, { status: 500 })
  }
}
