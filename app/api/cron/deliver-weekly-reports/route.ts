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

async function sendResendEmail(subject: string, message: string, recipients: string[]) {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.REPORT_EMAIL_FROM

  if (!apiKey || !from || !recipients.length) {
    return null
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from,
      to: recipients,
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

type DeliveryTarget = {
  id: number
  label: string
  channel: 'email' | 'whatsapp_web'
  recipient: string
  active: boolean
  notify_weekly: boolean
  notes: string | null
}

async function loadDeliveryTargets(supabase: ReturnType<typeof getSupabaseClient>) {
  const { data, error } = await supabase
    .from('report_delivery_targets')
    .select('*')
    .eq('active', true)
    .eq('notify_weekly', true)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []) as DeliveryTarget[]
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

    const targets = await loadDeliveryTargets(supabase)
    const deliveries: Array<Record<string, unknown>> = []

    const emailTargets = targets.filter((target) => target.channel === 'email')
    const whatsappTargets = targets.filter((target) => target.channel === 'whatsapp_web')

    const fallbackEmails = process.env.REPORT_EMAIL_TO
      ? process.env.REPORT_EMAIL_TO.split(/[,;]+/).map((entry) => entry.trim()).filter(Boolean)
      : []
    const fallbackWhatsApp = process.env.REPORT_WHATSAPP_PHONE ? [process.env.REPORT_WHATSAPP_PHONE] : []

    const emailRecipients = emailTargets.length ? emailTargets.map((target) => target.recipient) : fallbackEmails
    const whatsappRecipients = whatsappTargets.length ? whatsappTargets.map((target) => target.recipient) : fallbackWhatsApp

    if (emailRecipients.length) {
      const emailDelivery = await sendResendEmail(subject, message, emailRecipients)
      if (emailDelivery) {
        deliveries.push({
          channel: 'email',
          status: 'sent',
          provider_response: emailDelivery,
          recipient: emailRecipients.join(', '),
        })
      }
    }

    whatsappRecipients.forEach((whatsappPhone) => {
      const whatsappUrl = buildWhatsAppWebUrl(whatsappPhone, message)
      deliveries.push({
        channel: 'whatsapp_web',
        status: 'queued',
        delivery_url: whatsappUrl,
        recipient: whatsappPhone,
      })
    })

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
      whatsappUrls: whatsappRecipients.map((phone) => buildWhatsAppWebUrl(phone, message)),
      emailDelivered: Boolean(emailRecipients.length),
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'No pudimos distribuir el reporte semanal.' },
      { status: 500 },
    )
  }
}
