import { NextResponse, type NextRequest } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { accessErrorResponse, requireCapability } from '@/lib/access-guards'

export const dynamic = 'force-dynamic'

type DeliveryTarget = {
  id: number
  label: string
  channel: 'email' | 'whatsapp_web' | 'webhook'
  recipient: string
  active: boolean
  notify_weekly: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey) throw new Error('MISSING_SUPABASE_CREDENTIALS')
  return createSupabaseClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function clean(value: string) {
  return value.trim()
}

function isAccessError(error: unknown) {
  return error instanceof Error && ['AuthenticationRequiredError', 'ProfileRequiredError', 'AccessDeniedError'].includes(error.name)
}

function internalCode(error: unknown) {
  return typeof error === 'object' && error && 'code' in error ? String(error.code) : 'UNKNOWN'
}

async function requireSettingsAccess() {
  return requireCapability('settings.manage')
}

export async function GET() {
  try {
    await requireSettingsAccess()
    const supabase = getSupabaseClient()
    const { data, error } = await supabase.from('report_delivery_targets').select('*').order('created_at', { ascending: false })
    if (error) throw error
    return NextResponse.json({ targets: data || [] })
  } catch (error) {
    if (isAccessError(error)) return accessErrorResponse(error)
    console.error('REPORT_DELIVERY_TARGETS_LOAD_FAILED', { code: internalCode(error) })
    return NextResponse.json({ error: 'No pudimos cargar los destinatarios.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireSettingsAccess()
    const body = await req.json().catch(() => ({})) as Partial<DeliveryTarget>
    const label = clean(body.label || '')
    const channel = body.channel
    const recipient = clean(body.recipient || '')
    if (!label || !recipient || !['email', 'whatsapp_web', 'webhook'].includes(String(channel))) {
      return NextResponse.json({ error: 'label, channel y recipient son requeridos.' }, { status: 400 })
    }
    if (channel === 'webhook') {
      try {
        const url = new URL(recipient)
        if (url.protocol !== 'https:') return NextResponse.json({ error: 'El webhook debe usar HTTPS.' }, { status: 400 })
      } catch {
        return NextResponse.json({ error: 'URL de webhook inválida.' }, { status: 400 })
      }
    }
    const supabase = getSupabaseClient()
    const { data, error } = await supabase.from('report_delivery_targets').insert({
      label,
      channel,
      recipient,
      active: body.active ?? true,
      notify_weekly: body.notify_weekly ?? true,
      notes: typeof body.notes === 'string' ? body.notes.trim().slice(0, 500) || null : null,
    }).select('*').single<DeliveryTarget>()
    if (error) throw error
    return NextResponse.json({ target: data }, { status: 201 })
  } catch (error) {
    if (isAccessError(error)) return accessErrorResponse(error)
    console.error('REPORT_DELIVERY_TARGET_CREATE_FAILED', { code: internalCode(error) })
    return NextResponse.json({ error: 'No pudimos crear el destinatario.' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await requireSettingsAccess()
    const body = await req.json().catch(() => ({})) as Partial<DeliveryTarget>
    if (!Number.isInteger(body.id) || Number(body.id) <= 0) return NextResponse.json({ error: 'id válido es requerido.' }, { status: 400 })
    const updates: Record<string, unknown> = {}
    if (typeof body.label === 'string' && clean(body.label)) updates.label = clean(body.label)
    if (body.channel && ['email', 'whatsapp_web', 'webhook'].includes(body.channel)) updates.channel = body.channel
    if (typeof body.recipient === 'string' && clean(body.recipient)) updates.recipient = clean(body.recipient)
    if (typeof body.active === 'boolean') updates.active = body.active
    if (typeof body.notify_weekly === 'boolean') updates.notify_weekly = body.notify_weekly
    if (typeof body.notes === 'string') updates.notes = body.notes.trim().slice(0, 500) || null
    if (!Object.keys(updates).length) return NextResponse.json({ error: 'No hay campos válidos para actualizar.' }, { status: 400 })
    const supabase = getSupabaseClient()
    const { data, error } = await supabase.from('report_delivery_targets').update(updates).eq('id', body.id).select('*').maybeSingle<DeliveryTarget>()
    if (error) throw error
    if (!data) return NextResponse.json({ error: 'Destinatario no encontrado.' }, { status: 404 })
    return NextResponse.json({ target: data })
  } catch (error) {
    if (isAccessError(error)) return accessErrorResponse(error)
    console.error('REPORT_DELIVERY_TARGET_UPDATE_FAILED', { code: internalCode(error) })
    return NextResponse.json({ error: 'No pudimos actualizar el destinatario.' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requireSettingsAccess()
    const body = await req.json().catch(() => ({})) as { id?: number }
    if (!Number.isInteger(body.id) || Number(body.id) <= 0) return NextResponse.json({ error: 'id válido es requerido.' }, { status: 400 })
    const supabase = getSupabaseClient()
    const { data, error } = await supabase.from('report_delivery_targets').delete().eq('id', body.id).select('id').maybeSingle()
    if (error) throw error
    if (!data) return NextResponse.json({ error: 'Destinatario no encontrado.' }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (error) {
    if (isAccessError(error)) return accessErrorResponse(error)
    console.error('REPORT_DELIVERY_TARGET_DELETE_FAILED', { code: internalCode(error) })
    return NextResponse.json({ error: 'No pudimos eliminar el destinatario.' }, { status: 500 })
  }
}
