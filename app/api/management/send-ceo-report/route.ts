import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { accessErrorResponse, requireCapability } from '@/lib/access-guards'
import { generateCeoReportData, generateCeoReportHTML } from '@/lib/ceo-report-html-generator'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

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
    await requireCapability('management.global.manage')
  } catch (error) {
    return accessErrorResponse(error)
  }

  try {
    const body = await request.json().catch(() => null)
    const email = String(body?.email ?? '').trim().toLowerCase()

    if (!EMAIL_PATTERN.test(email)) {
      return NextResponse.json({ error: 'Email inválido' }, { status: 400 })
    }

    const reportData = generateCeoReportData()
    const reportHTML = generateCeoReportHTML(reportData)

    const response = await getResend().emails.send({
      from: 'onboarding@resend.dev',
      to: email,
      subject: `Reporte Integral Ejecutivo - Property Partners ${reportData.period}`,
      html: reportHTML,
    })

    if (response.error) {
      console.error('[Send Report] Resend error', {
        name: response.error.name,
        message: response.error.message,
      })
      return NextResponse.json({ error: 'No fue posible enviar el reporte.' }, { status: 502 })
    }

    return NextResponse.json({
      success: true,
      message: `Reporte enviado a ${email}`,
      emailId: response.data?.id,
      period: reportData.period,
    })
  } catch (error) {
    console.error('[Send Report] Unexpected error', {
      message: error instanceof Error ? error.message : 'unknown',
    })
    return NextResponse.json({ error: 'No fue posible enviar el reporte.' }, { status: 500 })
  }
}

// GET endpoint to preview report HTML
export async function GET(_request: NextRequest) {
  try {
    await requireCapability('reports.global.read')
  } catch (error) {
    return accessErrorResponse(error)
  }

  try {
    const reportData = generateCeoReportData()
    const reportHTML = generateCeoReportHTML(reportData)

    return new NextResponse(reportHTML, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    console.error('[Preview Report] Unexpected error', {
      message: error instanceof Error ? error.message : 'unknown',
    })
    return NextResponse.json({ error: 'No fue posible generar la vista previa.' }, { status: 500 })
  }
}
