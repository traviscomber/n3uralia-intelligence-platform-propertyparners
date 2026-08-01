import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  updateEmailSubscription,
  deleteEmailSubscription,
} from '@/lib/report-subscriptions'

export const runtime = 'nodejs'

const MANAGER_ROLES = new Set(['admin', 'ceo'])
const CADENCES = new Set(['weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'])
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

async function requireSubscriptionManager() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'No autorizado' }, { status: 401 }) }

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

function optionalText(value: unknown, maxLength: number) {
  if (value === undefined) return undefined
  const normalized = String(value ?? '').trim()
  return normalized ? normalized.slice(0, maxLength) : null
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await requireSubscriptionManager()
  if ('error' in context) return context.error

  const { id } = await params
  if (!UUID_PATTERN.test(id)) {
    return NextResponse.json({ error: 'Suscripción inválida' }, { status: 400 })
  }

  try {
    const body = await request.json() as Record<string, unknown>
    const updates: Parameters<typeof updateEmailSubscription>[1] = {}

    if (body.active !== undefined) {
      if (typeof body.active !== 'boolean') {
        return NextResponse.json({ error: 'Estado active inválido' }, { status: 400 })
      }
      updates.active = body.active
    }
    if (body.cadence !== undefined) {
      const cadence = String(body.cadence).trim()
      if (!CADENCES.has(cadence)) {
        return NextResponse.json({ error: 'Frecuencia inválida' }, { status: 400 })
      }
      updates.cadence = cadence as typeof updates.cadence
    }
    if (body.recipientName !== undefined) updates.recipientName = optionalText(body.recipientName, 160)
    if (body.recipientRole !== undefined) updates.recipientRole = optionalText(body.recipientRole, 80)
    if (body.notes !== undefined) updates.notes = optionalText(body.notes, 1000)

    if (!Object.keys(updates).length) {
      return NextResponse.json({ error: 'No hay campos permitidos para actualizar' }, { status: 400 })
    }

    const updated = await updateEmailSubscription(id, updates)
    return NextResponse.json({ success: true, data: updated })
  } catch (cause) {
    console.error('[subscriptions] PATCH failed', {
      message: cause instanceof Error ? cause.message : 'Unknown error',
    })
    return NextResponse.json({ error: 'No fue posible actualizar la suscripción' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await requireSubscriptionManager()
  if ('error' in context) return context.error

  const { id } = await params
  if (!UUID_PATTERN.test(id)) {
    return NextResponse.json({ error: 'Suscripción inválida' }, { status: 400 })
  }

  try {
    await deleteEmailSubscription(id)
    return NextResponse.json({ success: true, message: 'Suscripción desactivada' })
  } catch (cause) {
    console.error('[subscriptions] DELETE failed', {
      message: cause instanceof Error ? cause.message : 'Unknown error',
    })
    return NextResponse.json({ error: 'No fue posible desactivar la suscripción' }, { status: 500 })
  }
}
