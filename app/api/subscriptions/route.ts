import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  addEmailSubscription,
  getEmailSubscriptions,
} from '@/lib/report-subscriptions'

export const runtime = 'nodejs'

const MANAGER_ROLES = new Set(['admin', 'ceo'])
const REPORT_TYPES = new Set(['executive', 'office', 'partner', 'monthly', 'cumulative', 'all'])
const CADENCES = new Set(['weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'])
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function text(value: unknown, maxLength: number) {
  const normalized = String(value ?? '').trim()
  return normalized ? normalized.slice(0, maxLength) : undefined
}

async function requireSubscriptionManager() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: NextResponse.json({ error: 'No autorizado' }, { status: 401 }) }
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  if (error) {
    console.error('[subscriptions] profile lookup failed', { message: error.message })
    return { error: NextResponse.json({ error: 'No fue posible validar el perfil' }, { status: 500 }) }
  }

  const role = String(profile?.role ?? '').trim().toLowerCase()
  if (!MANAGER_ROLES.has(role)) {
    return { error: NextResponse.json({ error: 'Acceso denegado' }, { status: 403 }) }
  }

  return { user }
}

export async function GET(request: NextRequest) {
  const context = await requireSubscriptionManager()
  if ('error' in context) return context.error

  try {
    const { searchParams } = new URL(request.url)
    const reportType = searchParams.get('reportType')
    const entityId = searchParams.get('entityId')
    const active = searchParams.get('active')

    if (reportType && !REPORT_TYPES.has(reportType)) {
      return NextResponse.json({ error: 'Tipo de reporte inválido' }, { status: 400 })
    }
    if (entityId && !UUID_PATTERN.test(entityId)) {
      return NextResponse.json({ error: 'Entidad inválida' }, { status: 400 })
    }
    if (active !== null && !['true', 'false'].includes(active)) {
      return NextResponse.json({ error: 'Filtro active inválido' }, { status: 400 })
    }

    const subscriptions = await getEmailSubscriptions({
      reportType: reportType || undefined,
      entityId: entityId || undefined,
      active: active !== null ? active === 'true' : undefined,
    })

    return NextResponse.json({ success: true, data: subscriptions, count: subscriptions.length })
  } catch (cause) {
    console.error('[subscriptions] GET failed', {
      message: cause instanceof Error ? cause.message : 'Unknown error',
    })
    return NextResponse.json({ error: 'No fue posible consultar las suscripciones' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const context = await requireSubscriptionManager()
  if ('error' in context) return context.error

  try {
    const body = await request.json() as Record<string, unknown>
    const email = String(body.email ?? '').trim().toLowerCase()
    const reportType = String(body.reportType ?? '').trim()
    const cadence = String(body.cadence ?? '').trim()
    const entityId = text(body.entityId, 36)

    if (!EMAIL_PATTERN.test(email)) {
      return NextResponse.json({ error: 'Correo inválido' }, { status: 400 })
    }
    if (!REPORT_TYPES.has(reportType)) {
      return NextResponse.json({ error: 'Tipo de reporte inválido' }, { status: 400 })
    }
    if (!CADENCES.has(cadence)) {
      return NextResponse.json({ error: 'Frecuencia inválida' }, { status: 400 })
    }
    if (entityId && !UUID_PATTERN.test(entityId)) {
      return NextResponse.json({ error: 'Entidad inválida' }, { status: 400 })
    }

    const subscription = await addEmailSubscription(email, reportType, cadence, {
      recipientName: text(body.recipientName, 160),
      recipientRole: text(body.recipientRole, 80),
      entityId,
      notes: text(body.notes, 1000),
      createdBy: context.user.id,
    })

    return NextResponse.json({ success: true, data: subscription }, { status: 201 })
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Unknown error'
    console.error('[subscriptions] POST failed', { message })
    if (/duplicate|unique/i.test(message)) {
      return NextResponse.json({ error: 'El correo ya está suscrito a este reporte y alcance' }, { status: 409 })
    }
    return NextResponse.json({ error: 'No fue posible crear la suscripción' }, { status: 500 })
  }
}
