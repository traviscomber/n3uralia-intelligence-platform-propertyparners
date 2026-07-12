import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { buildWhatsAppWebUrl, buildWeeklyReportMessage } from '@/lib/whatsapp-web'

export const dynamic = 'force-dynamic'

function isAuthorized(request: Request) {
  const url = new URL(request.url)
  const secret = process.env.CRON_SECRET || process.env.VERCEL_CRON_SECRET
  if (!secret) return true

  const headerSecret = request.headers.get('x-cron-secret')
  const querySecret = url.searchParams.get('secret')
  return headerSecret === secret || querySecret === secret
}

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials')
  }

  return createSupabaseClient(supabaseUrl, supabaseKey)
}

async function sendResendEmail(subject: string, message: string) {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.REPORT_EMAIL_FROM
  const recipients = process.env.REPORT_EMAIL_TO

  if (!apiKey || !from || !recipients) {
    return null
  }

  const to = recipients
    .split(/[,;]+/)
    .map((entry) => entry.trim())
    .filter(Boolean)

  if (!to.length) return null

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      text: message,
    }),
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const detail = payload?.message || response.statusText
    throw new Error(`Resend request failed (${response.status}): ${detail}`)
  }

  return payload as Record<string, unknown>
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = getSupabaseClient()
    const baseUrl = new URL(request.url)
    const weeklyResponse = await fetch(new URL('/api/reports/weekly', baseUrl), {
      method: 'GET',
      headers: {
        'x-cron-secret': process.env.CRON_SECRET || process.env.VERCEL_CRON_SECRET || '',
      },
    })

    const weeklyJson = await weeklyResponse.json().catch(() => ({}))
    if (!weeklyResponse.ok) {
      throw new Error(weeklyJson.error || 'No pudimos generar el reporte semanal.')
    }

    const latestWeekly = weeklyJson.reports?.[0] || null
    const latestDirector = weeklyJson.directors?.[0] || null
    if (!latestWeekly) {
      return NextResponse.json(
        { error: 'No hay reportes semanales disponibles para distribuir.' },
        { status: 422 },
      )
    }

    const message = buildWeeklyReportMessage({
      weekStart: latestWeekly.week_start,
      weekEnd: latestWeekly.week_end,
      salesCount: latestWeekly.sales_count,
      commissionTotal: latestWeekly.commission_total,
      conversionRate: latestWeekly.conversion_rate,
      targetProgress: latestWeekly.target_progress,
      topDirector: latestDirector?.director_id || null,
      reportCount: weeklyJson.history?.length || 0,
    })
    const subject = `Reporte semanal ${latestWeekly.week_start} - ${latestWeekly.week_end}`

    const deliveries: Array<Record<string, unknown>> = []

    const emailDelivery = await sendResendEmail(subject, message)
    if (emailDelivery) {
      deliveries.push({
        channel: 'email',
        status: 'sent',
        provider_response: emailDelivery,
        recipient: process.env.REPORT_EMAIL_TO,
      })
    }

    const whatsappPhone = process.env.REPORT_WHATSAPP_PHONE
    if (whatsappPhone) {
      const whatsappUrl = buildWhatsAppWebUrl(whatsappPhone, message)
      deliveries.push({
        channel: 'whatsapp_web',
        status: 'queued',
        delivery_url: whatsappUrl,
        recipient: whatsappPhone,
      })
    }

    if (deliveries.length) {
      await supabase.from('report_deliveries').insert(
        deliveries.map((delivery) => ({
          report_type: 'weekly_directors',
          report_id: null,
          channel: delivery.channel,
          recipient: delivery.recipient || null,
          delivery_url: delivery.delivery_url || null,
          status: delivery.status,
          subject,
          message,
          provider_response: delivery.provider_response || null,
          sent_at: delivery.status === 'sent' ? new Date().toISOString() : null,
        })),
      )
    }

    return NextResponse.json({
      success: true,
      generatedAt: new Date().toISOString(),
      report: latestWeekly,
      deliveries,
      whatsappUrl: whatsappPhone ? buildWhatsAppWebUrl(whatsappPhone, message) : null,
      emailDelivered: Boolean(emailDelivery),
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'No pudimos distribuir el reporte semanal.' },
      { status: 500 },
    )
  }
}
