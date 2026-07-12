import { NextResponse, type NextRequest } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

type DeliveryTarget = {
  id: number
  label: string
  channel: 'email' | 'whatsapp_web'
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

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials')
  }

  return createSupabaseClient(supabaseUrl, supabaseKey)
}

function cleanRecipient(value: string) {
  return value.trim()
}

export async function GET() {
  try {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('report_delivery_targets')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ targets: data || [] })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'No pudimos cargar los destinatarios.' },
      { status: 500 },
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({})) as Partial<DeliveryTarget>
    const label = cleanRecipient(body.label || '')
    const channel = body.channel
    const recipient = cleanRecipient(body.recipient || '')

    if (!label || !recipient || (channel !== 'email' && channel !== 'whatsapp_web')) {
      return NextResponse.json({ error: 'label, channel y recipient son requeridos.' }, { status: 400 })
    }

    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('report_delivery_targets')
      .insert({
        label,
        channel,
        recipient,
        active: body.active ?? true,
        notify_weekly: body.notify_weekly ?? true,
        notes: body.notes || null,
      })
      .select('*')
      .single<DeliveryTarget>()

    if (error) throw error

    return NextResponse.json({ target: data }, { status: 201 })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'No pudimos crear el destinatario.' },
      { status: 500 },
    )
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({})) as Partial<DeliveryTarget>
    if (!body.id) {
      return NextResponse.json({ error: 'id es requerido.' }, { status: 400 })
    }

    const supabase = getSupabaseClient()
    const updates: Record<string, unknown> = {}

    if (typeof body.label === 'string') updates.label = cleanRecipient(body.label)
    if (body.channel === 'email' || body.channel === 'whatsapp_web') updates.channel = body.channel
    if (typeof body.recipient === 'string') updates.recipient = cleanRecipient(body.recipient)
    if (typeof body.active === 'boolean') updates.active = body.active
    if (typeof body.notify_weekly === 'boolean') updates.notify_weekly = body.notify_weekly
    if (typeof body.notes === 'string') updates.notes = body.notes.trim() || null

    if (!Object.keys(updates).length) {
      return NextResponse.json({ error: 'No hay campos para actualizar.' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('report_delivery_targets')
      .update(updates)
      .eq('id', body.id)
      .select('*')
      .single<DeliveryTarget>()

    if (error) throw error

    return NextResponse.json({ target: data })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'No pudimos actualizar el destinatario.' },
      { status: 500 },
    )
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({})) as { id?: number }
    if (!body.id) {
      return NextResponse.json({ error: 'id es requerido.' }, { status: 400 })
    }

    const supabase = getSupabaseClient()
    const { error } = await supabase.from('report_delivery_targets').delete().eq('id', body.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'No pudimos eliminar el destinatario.' },
      { status: 500 },
    )
  }
}
