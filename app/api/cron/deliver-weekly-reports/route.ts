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

async function sendWebhookWithRetry(payload: Record<string, unknown>, webhookUrl: string, attempts = 3) {
  const errors: string[] = []

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const responseText = await response.text().catch(() => '')
      let parsedBody: Record<string, unknown> | string | null = null
      if (responseText) {
        try {
          parsedBody = JSON.parse(responseText) as Record<string, unknown>
        } catch {
          parsedBody = responseText
        }
      }

      if (!response.ok) {
        const detail =
          (parsedBody && typeof parsedBody === 'object' && (parsedBody.message || parsedBody.error)) ||
          (typeof parsedBody === 'string' ? parsedBody : '') ||
          response.statusText
        throw new Error(`Webhook request failed (${response.status}): ${detail}`)
      }

      return {
        ok: true,
        attempts: attempt,
        response: parsedBody,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown webhook error'
      errors.push(errorMessage)
      if (attempt < attempts) {
        await delay(attempt * 600)
      }
    }
  }

  return {
    ok: false,
    attempts,
    error: new Error(errors[errors.length - 1] || 'Webhook delivery failed'),
    errors,
  }
}

type DeliveryTarget = {
  id: number
  label: string
  channel: 'email' | 'whatsapp_web' | 'webhook'
  recipient: string
  active: boolean
  notify_weekly: boolean
  notes: string | null
}

type StoredReport = {
  id: number
  report_type: string
  title: string
  summary: string | null
  content: Record<string, unknown> | null
  period_date: string | null
  generated_by: string | null
  created_at: string
}

type DeliveryAudience = 'ceo' | 'director' | 'seller' | 'market' | 'weekly'

function normalizeText(value: string | null | undefined) {
  return (value || '').trim().toLowerCase()
}

function resolveDeliveryAudience(target: DeliveryTarget): DeliveryAudience {
  const haystack = normalizeText([target.label, target.notes || '', target.recipient].join(' '))
  if (haystack.includes('ceo') || haystack.includes('gerencia') || haystack.includes('directivo')) return 'ceo'
  if (haystack.includes('seller') || haystack.includes('vendedor') || haystack.includes('ejecutivo')) return 'seller'
  if (haystack.includes('market') || haystack.includes('mercado') || haystack.includes('captacion')) return 'market'
  if (haystack.includes('director')) return 'director'
  return 'weekly'
}

function reportAudience(report: StoredReport): DeliveryAudience {
  const content = report.content || {}
  const requested = typeof content.requested_report_type === 'string' ? content.requested_report_type : ''
  const audience = typeof content.audience === 'string' ? content.audience : ''
  const hint = normalizeText(requested || audience || report.report_type)

  if (hint.includes('ceo')) return 'ceo'
  if (hint.includes('seller') || hint.includes('vendedor') || hint.includes('ejecutivo')) return 'seller'
  if (hint.includes('market') || hint.includes('captation') || hint.includes('captacion') || hint.includes('mercado')) return 'market'
  if (hint.includes('director')) return 'director'
  return 'weekly'
}

function reportMatchesAudience(report: StoredReport, audience: DeliveryAudience) {
  const reportBucket = reportAudience(report)
  if (audience === 'weekly') return reportBucket === 'weekly' || reportBucket === 'director'
  return reportBucket === audience
}

function buildReportDeliveryMessage(report: StoredReport, fallbackMessage: string) {
  const summary = report.summary || fallbackMessage
  const content = report.content || {}
  const highlights = Array.isArray(content.highlights) ? content.highlights.slice(0, 3).filter((item): item is string => typeof item === 'string') : []
  const lines = [
    report.title,
    '',
    summary,
  ]

  if (highlights.length) {
    lines.push('', 'Puntos clave:')
    highlights.forEach((item) => {
      lines.push(`- ${item}`)
    })
  }

  return lines.join('\n')
}

function pickReportForTarget(target: DeliveryTarget, reports: StoredReport[], weeklyMessage: string, weeklyReportType = 'weekly_directors') {
  const audience = resolveDeliveryAudience(target)
  const matchingReport = reports.find((report) => reportMatchesAudience(report, audience))
  if (matchingReport) {
    return {
      report: matchingReport,
      audience,
      reportType: matchingReport.content && typeof matchingReport.content.requested_report_type === 'string'
        ? matchingReport.content.requested_report_type
        : matchingReport.report_type,
      subject: `${matchingReport.title}${matchingReport.period_date ? ` - ${matchingReport.period_date}` : ''}`,
      message: buildReportDeliveryMessage(matchingReport, weeklyMessage),
    }
  }

  return {
    report: null,
    audience,
    reportType: weeklyReportType,
    subject: 'Reporte semanal Vitacura',
    message: weeklyMessage,
  }
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
      return NextResponse.json({ error: 'No hay reportes semanales disponibles para distribuir.' }, { status: 422 })
    }

    const weeklyMessage = buildWeeklyReportMessage({
      weekStart: latestWeekly.week_start,
      weekEnd: latestWeekly.week_end,
      salesCount: latestWeekly.sales_count,
      commissionTotal: latestWeekly.commission_total,
      conversionRate: latestWeekly.conversion_rate,
      targetProgress: latestWeekly.target_progress,
      topDirector: latestDirector?.director_id || null,
      reportCount: weeklyJson.history?.length || 0,
    })
    const weeklySubject = `Reporte semanal ${latestWeekly.week_start} - ${latestWeekly.week_end}`

    const [{ data: aiReports, error: aiReportsError }, targets] = await Promise.all([
      supabase
        .from('ai_reports')
        .select('id, report_type, title, summary, content, period_date, generated_by, created_at')
        .order('created_at', { ascending: false })
        .limit(20),
      loadDeliveryTargets(supabase),
    ])

    if (aiReportsError) throw aiReportsError

    const reports = (aiReports || []) as StoredReport[]
    const deliveries: Array<Record<string, unknown>> = []
    const warnings: string[] = []

    const fallbackEmails = splitRecipients(process.env.REPORT_EMAIL_TO)
    const fallbackWhatsApp = splitRecipients(process.env.REPORT_WHATSAPP_PHONE)
    const fallbackWebhooks = splitRecipients(process.env.REPORT_WEBHOOK_URL)
    const escalationEmails = splitRecipients(process.env.REPORT_ESCALATION_EMAIL_TO)
    const escalationWhatsApp = splitRecipients(process.env.REPORT_ESCALATION_WHATSAPP_PHONE)
    const escalationWebhooks = splitRecipients(process.env.REPORT_ESCALATION_WEBHOOK_URL)

    const channelTargets = {
      email: targets.filter((target) => target.channel === 'email'),
      whatsapp_web: targets.filter((target) => target.channel === 'whatsapp_web'),
      webhook: targets.filter((target) => target.channel === 'webhook'),
    }

    const emailRecipients = channelTargets.email.length ? channelTargets.email.map((target) => target.recipient) : fallbackEmails
    const whatsappRecipients = channelTargets.whatsapp_web.length ? channelTargets.whatsapp_web.map((target) => target.recipient) : fallbackWhatsApp
    const webhookRecipients = channelTargets.webhook.length ? channelTargets.webhook.map((target) => target.recipient) : fallbackWebhooks

    let emailSuccessCount = 0
    let emailFailureCount = 0

    if (channelTargets.email.length) {
      for (const target of channelTargets.email) {
        const deliveryPlan = pickReportForTarget(target, reports, weeklyMessage)
        const sentRecipients = [target.recipient]
        const emailDelivery = await sendResendEmailWithRetry(deliveryPlan.subject, deliveryPlan.message, sentRecipients, 3)

        if (emailDelivery.ok) {
          emailSuccessCount += 1
          deliveries.push({
            channel: 'email',
            status: 'sent',
            provider_response: {
              attempts: emailDelivery.attempts,
              response: emailDelivery.response,
              audience: deliveryPlan.audience,
              report_type: deliveryPlan.reportType,
            },
            recipient: target.recipient,
            subject: deliveryPlan.subject,
            message: deliveryPlan.message,
            report_type: deliveryPlan.reportType,
            report_id: deliveryPlan.report?.id || null,
          })
        } else {
          emailFailureCount += 1
          const primaryEmailError = emailDelivery.error?.message || 'Email delivery failed'
          warnings.push(`Email primario fallido para ${target.label}: ${primaryEmailError}`)
          deliveries.push({
            channel: 'email',
            status: 'failed',
            provider_response: {
              attempts: emailDelivery.attempts,
              errors: emailDelivery.errors || [primaryEmailError],
              audience: deliveryPlan.audience,
              report_type: deliveryPlan.reportType,
            },
            recipient: target.recipient,
            subject: deliveryPlan.subject,
            message: deliveryPlan.message,
            report_type: deliveryPlan.reportType,
            report_id: deliveryPlan.report?.id || null,
          })
        }
      }
    } else if (emailRecipients.length) {
      const emailDelivery = await sendResendEmailWithRetry(weeklySubject, weeklyMessage, emailRecipients, 3)
      if (emailDelivery.ok) {
        emailSuccessCount += 1
        deliveries.push({
          channel: 'email',
          status: 'sent',
          provider_response: {
            attempts: emailDelivery.attempts,
            response: emailDelivery.response,
            audience: 'weekly',
            report_type: 'weekly_directors',
          },
          recipient: emailRecipients.join(', '),
          subject: weeklySubject,
          message: weeklyMessage,
          report_type: 'weekly_directors',
          report_id: null,
        })
      } else {
        emailFailureCount += 1
        const primaryEmailError = emailDelivery.error?.message || 'Email delivery failed'
        warnings.push(`Email primario fallido: ${primaryEmailError}`)
        deliveries.push({
          channel: 'email',
          status: 'failed',
          provider_response: {
            attempts: emailDelivery.attempts,
            errors: emailDelivery.errors || [primaryEmailError],
            audience: 'weekly',
            report_type: 'weekly_directors',
          },
          recipient: emailRecipients.join(', '),
          subject: weeklySubject,
          message: weeklyMessage,
          report_type: 'weekly_directors',
          report_id: null,
        })
      }
    }

    if (channelTargets.whatsapp_web.length) {
      for (const target of channelTargets.whatsapp_web) {
        const deliveryPlan = pickReportForTarget(target, reports, weeklyMessage)
        deliveries.push({
          channel: 'whatsapp_web',
          status: 'queued',
          delivery_url: buildWhatsAppWebUrl(target.recipient, deliveryPlan.message),
          recipient: target.recipient,
          subject: deliveryPlan.subject,
          message: deliveryPlan.message,
          report_type: deliveryPlan.reportType,
          report_id: deliveryPlan.report?.id || null,
        })
      }
    } else {
      whatsappRecipients.forEach((whatsappPhone) => {
        deliveries.push({
          channel: 'whatsapp_web',
          status: 'queued',
          delivery_url: buildWhatsAppWebUrl(whatsappPhone, weeklyMessage),
          recipient: whatsappPhone,
          subject: weeklySubject,
          message: weeklyMessage,
          report_type: 'weekly_directors',
          report_id: null,
        })
      })
    }

    if (channelTargets.webhook.length) {
      for (const target of channelTargets.webhook) {
        const deliveryPlan = pickReportForTarget(target, reports, weeklyMessage)
        const webhookDelivery = await sendWebhookWithRetry(
          {
            reportType: deliveryPlan.reportType,
            audience: deliveryPlan.audience,
            subject: deliveryPlan.subject,
            message: deliveryPlan.message,
            report: deliveryPlan.report,
            weeklyReport: latestWeekly,
            director: latestDirector,
            generatedAt: new Date().toISOString(),
          },
          target.recipient,
          3,
        )

        if (webhookDelivery.ok) {
          deliveries.push({
            channel: 'webhook',
            status: 'sent',
            delivery_url: target.recipient,
            recipient: target.recipient,
            subject: deliveryPlan.subject,
            message: deliveryPlan.message,
            report_type: deliveryPlan.reportType,
            report_id: deliveryPlan.report?.id || null,
            provider_response: {
              attempts: webhookDelivery.attempts,
              response: webhookDelivery.response,
              audience: deliveryPlan.audience,
            },
          })
        } else {
          const webhookError = webhookDelivery.error?.message || 'Webhook delivery failed'
          warnings.push(`Webhook fallido para ${target.label}: ${webhookError}`)
          deliveries.push({
            channel: 'webhook',
            status: 'failed',
            delivery_url: target.recipient,
            recipient: target.recipient,
            subject: deliveryPlan.subject,
            message: deliveryPlan.message,
            report_type: deliveryPlan.reportType,
            report_id: deliveryPlan.report?.id || null,
            provider_response: {
              attempts: webhookDelivery.attempts,
              errors: webhookDelivery.errors || [webhookError],
              audience: deliveryPlan.audience,
            },
          })
        }
      }
    } else {
      for (const webhookUrl of webhookRecipients) {
        const webhookDelivery = await sendWebhookWithRetry(
          {
            reportType: 'weekly_directors',
            audience: 'weekly',
            subject: weeklySubject,
            message: weeklyMessage,
            report: latestWeekly,
            director: latestDirector,
            generatedAt: new Date().toISOString(),
          },
          webhookUrl,
          3,
        )

        if (webhookDelivery.ok) {
          deliveries.push({
            channel: 'webhook',
            status: 'sent',
            delivery_url: webhookUrl,
            recipient: webhookUrl,
            subject: weeklySubject,
            message: weeklyMessage,
            report_type: 'weekly_directors',
            report_id: null,
            provider_response: {
              attempts: webhookDelivery.attempts,
              response: webhookDelivery.response,
              audience: 'weekly',
            },
          })
        } else {
          const webhookError = webhookDelivery.error?.message || 'Webhook delivery failed'
          warnings.push(`Webhook fallido: ${webhookError}`)
          deliveries.push({
            channel: 'webhook',
            status: 'failed',
            delivery_url: webhookUrl,
            recipient: webhookUrl,
            subject: weeklySubject,
            message: weeklyMessage,
            report_type: 'weekly_directors',
            report_id: null,
            provider_response: {
              attempts: webhookDelivery.attempts,
              errors: webhookDelivery.errors || [webhookError],
              audience: 'weekly',
            },
          })
        }
      }
    }

    const shouldEscalate = emailRecipients.length > 0 && emailSuccessCount === 0

    if (shouldEscalate && escalationEmails.length) {
      const escalationSubject = `[ESCALATION] ${weeklySubject}`
      const escalationMessage = [
        'Escalamiento automatico de reporte.',
        `Fallo primario: ${warnings[0] || 'no se pudo enviar el email principal.'}`,
        '',
        weeklyMessage,
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
            audience: 'weekly',
          },
          recipient: escalationEmails.join(', '),
          subject: escalationSubject,
          message: escalationMessage,
          report_type: 'weekly_directors',
          report_id: null,
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
            audience: 'weekly',
          },
          recipient: escalationEmails.join(', '),
          subject: escalationSubject,
          message: escalationMessage,
          report_type: 'weekly_directors',
          report_id: null,
        })
      }
    }

    if (shouldEscalate && escalationWhatsApp.length) {
      escalationWhatsApp.forEach((whatsappPhone) => {
        deliveries.push({
          channel: 'whatsapp_web',
          status: 'escalated',
          delivery_url: buildWhatsAppWebUrl(whatsappPhone, `ALERTA: ${weeklyMessage}`),
          recipient: whatsappPhone,
          subject: `[ESCALATION] ${weeklySubject}`,
          message: `ALERTA: ${weeklyMessage}`,
          report_type: 'weekly_directors',
          report_id: null,
        })
      })
    }

    if (shouldEscalate && escalationWebhooks.length) {
      for (const webhookUrl of escalationWebhooks) {
        const escalationDelivery = await sendWebhookWithRetry(
          {
            reportType: 'weekly_directors',
            audience: 'weekly',
            subject: `[ESCALATION] ${weeklySubject}`,
            message: `ALERTA: ${weeklyMessage}`,
            report: latestWeekly,
            director: latestDirector,
            escalated: true,
            generatedAt: new Date().toISOString(),
          },
          webhookUrl,
          2,
        )

        if (escalationDelivery.ok) {
          deliveries.push({
            channel: 'webhook',
            status: 'escalated',
            delivery_url: webhookUrl,
            recipient: webhookUrl,
            subject: `[ESCALATION] ${weeklySubject}`,
            message: `ALERTA: ${weeklyMessage}`,
            report_type: 'weekly_directors',
            report_id: null,
            provider_response: {
              attempts: escalationDelivery.attempts,
              response: escalationDelivery.response,
              escalation: true,
              audience: 'weekly',
            },
          })
        } else {
          const escalationWebhookError = escalationDelivery.error?.message || 'Escalated webhook delivery failed'
          warnings.push(`Escalamiento webhook fallido: ${escalationWebhookError}`)
          deliveries.push({
            channel: 'webhook',
            status: 'failed',
            delivery_url: webhookUrl,
            recipient: webhookUrl,
            subject: `[ESCALATION] ${weeklySubject}`,
            message: `ALERTA: ${weeklyMessage}`,
            report_type: 'weekly_directors',
            report_id: null,
            provider_response: {
              attempts: escalationDelivery.attempts,
              errors: escalationDelivery.errors || [escalationWebhookError],
              escalation: true,
              audience: 'weekly',
            },
          })
        }
      }
    }

    if (deliveries.length) {
      const deliveredAt = new Date().toISOString()
      await supabase.from('report_deliveries').insert(
        deliveries.map((delivery) => ({
          report_type: (delivery.report_type as string) || 'weekly_directors',
          report_id: delivery.report_id ?? null,
          channel: delivery.channel,
          recipient: delivery.recipient || null,
          delivery_url: delivery.delivery_url || null,
          status: delivery.status,
          subject: delivery.subject || weeklySubject,
          message: delivery.message || weeklyMessage,
          provider_response: delivery.provider_response || null,
          sent_at: delivery.status === 'sent' || delivery.status === 'escalated' ? deliveredAt : null,
        })),
      )
    }

    return NextResponse.json({
      success: true,
      generatedAt: new Date().toISOString(),
      report: latestWeekly,
      latestReports: reports.slice(0, 5).map((report) => ({
        id: report.id,
        report_type: report.report_type,
        title: report.title,
        summary: report.summary,
        audience: reportAudience(report),
      })),
      deliveries,
      whatsappUrls: whatsappRecipients.map((phone) => buildWhatsAppWebUrl(phone, weeklyMessage)),
      webhookUrls: webhookRecipients,
      emailDelivered: emailSuccessCount > 0,
      escalationTriggered: shouldEscalate,
      warnings,
      aiReportsDistributed: channelTargets.email.length + channelTargets.whatsapp_web.length + channelTargets.webhook.length,
      fallbackMode: !reports.length,
      emailFailures: emailFailureCount,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'No pudimos distribuir el reporte semanal.' },
      { status: 500 },
    )
  }
}
