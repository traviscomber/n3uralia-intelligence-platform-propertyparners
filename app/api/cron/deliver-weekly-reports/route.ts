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

function splitRecipients(value: string | undefined | null) {
  return [...new Set((value || '').split(/[,;]+/).map((entry) => entry.trim()).filter(Boolean))]
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
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

async function sendResendEmailWithRetry(subject: string, message: string, recipients: string[], attempts = 3) {
  const cleanedRecipients = [...new Set(recipients.map((recipient) => recipient.trim()).filter(Boolean))]
  if (!cleanedRecipients.length) {
    return {
      ok: false,
      attempts: 0,
      error: new Error('No hay destinatarios'),
    }
  }

  const errors: string[] = []

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await sendResendEmail(subject, message, cleanedRecipients)
      return {
        ok: true,
        attempts: attempt,
        response,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown email error'
      errors.push(errorMessage)
      if (attempt < attempts) {
        await delay(attempt * 600)
      }
    }
  }

  return {
    ok: false,
    attempts,
    error: new Error(errors[errors.length - 1] || 'Email delivery failed'),
    errors,
  }
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
    const warnings: string[] = []

    const emailTargets = targets.filter((target) => target.channel === 'email')
    const whatsappTargets = targets.filter((target) => target.channel === 'whatsapp_web')

    const fallbackEmails = splitRecipients(process.env.REPORT_EMAIL_TO)
    const fallbackWhatsApp = splitRecipients(process.env.REPORT_WHATSAPP_PHONE)
    const escalationEmails = splitRecipients(process.env.REPORT_ESCALATION_EMAIL_TO)
    const escalationWhatsApp = splitRecipients(process.env.REPORT_ESCALATION_WHATSAPP_PHONE)

    const emailRecipients = emailTargets.length ? emailTargets.map((target) => target.recipient) : fallbackEmails
    const whatsappRecipients = whatsappTargets.length ? whatsappTargets.map((target) => target.recipient) : fallbackWhatsApp
    const needsEscalation = !emailRecipients.length

    let emailDelivered = false

    if (emailRecipients.length) {
      const emailDelivery = await sendResendEmailWithRetry(subject, message, emailRecipients, 3)
      if (emailDelivery.ok) {
        emailDelivered = true
        deliveries.push({
          channel: 'email',
          status: 'sent',
          provider_response: {
            attempts: emailDelivery.attempts,
            response: emailDelivery.response,
          },
          recipient: emailRecipients.join(', '),
        })
      } else {
        const primaryEmailError = emailDelivery.error?.message || 'Email delivery failed'
        warnings.push(`Email primario fallido: ${primaryEmailError}`)
        deliveries.push({
          channel: 'email',
          status: 'failed',
          provider_response: {
            attempts: emailDelivery.attempts,
            errors: emailDelivery.errors || [primaryEmailError],
          },
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

    const shouldEscalate = !emailDelivered && (emailRecipients.length > 0 || needsEscalation)

    if (shouldEscalate && escalationEmails.length) {
      const escalationSubject = `[ESCALATION] ${subject}`
      const escalationMessage = [
        'Escalamiento automatico de reporte semanal.',
        `Fallo primario: ${warnings[0] || 'no se pudo enviar el email principal.'}`,
        '',
        message,
      ].join('\n')
      const escalationDelivery = await sendResendEmailWithRetry(escalationSubject, escalationMessage, escalationEmails, 2)

      if (escalationDelivery.ok) {
        deliveries.push({
          channel: 'email',
          status: 'escalated',
          provider_response: {
            attempts: escalationDelivery.attempts,
            response: escalationDelivery.response,
            escalation: true,
          },
          recipient: escalationEmails.join(', '),
        })
      } else {
        const escalationError = escalationDelivery.error?.message || 'Escalated email delivery failed'
        warnings.push(`Escalamiento email fallido: ${escalationError}`)
        deliveries.push({
          channel: 'email',
          status: 'failed',
          provider_response: {
            attempts: escalationDelivery.attempts,
            errors: escalationDelivery.errors || [escalationError],
            escalation: true,
          },
          recipient: escalationEmails.join(', '),
        })
      }
    }

    if (shouldEscalate && escalationWhatsApp.length) {
      escalationWhatsApp.forEach((whatsappPhone) => {
        deliveries.push({
          channel: 'whatsapp_web',
          status: 'escalated',
          delivery_url: buildWhatsAppWebUrl(whatsappPhone, `ALERTA: ${message}`),
          recipient: whatsappPhone,
        })
      })
    }

    if (deliveries.length) {
      const deliveredAt = new Date().toISOString()
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
          sent_at: delivery.status === 'sent' || delivery.status === 'escalated' ? deliveredAt : null,
        })),
      )
    }

    return NextResponse.json({
      success: true,
      generatedAt: new Date().toISOString(),
      report: latestWeekly,
      deliveries,
      whatsappUrls: whatsappRecipients.map((phone) => buildWhatsAppWebUrl(phone, message)),
      emailDelivered,
      escalationTriggered: shouldEscalate,
      warnings,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'No pudimos distribuir el reporte semanal.' },
      { status: 500 },
    )
  }
}
