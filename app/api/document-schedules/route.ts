import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { requireCopilotRole } from '@/lib/copilot-authorization'

const VALID_CADENCES = new Set(['weekly', 'monthly'])
const VALID_WEEKDAYS = new Set([
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
])
const VALID_RECIPIENT_ROLES = new Set(['ceo', 'director', 'manager', 'staff'])

function getSupabaseClient() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing Supabase configuration')
  }
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
}

function parseLimit(raw: string | null) {
  const parsed = Number.parseInt(raw ?? '50', 10)
  if (!Number.isFinite(parsed)) return 50
  return Math.min(Math.max(parsed, 1), 100)
}

export async function GET(request: NextRequest) {
  const access = await requireCopilotRole(['ceo', 'director'])
  if (!access.ok) return access.response

  try {
    const { searchParams } = new URL(request.url)
    const limit = parseLimit(searchParams.get('limit'))

    const { data: schedules, error } = await getSupabaseClient()
      .from('document_schedules')
      .select(`
        *,
        documents(title, file_type),
        document_recipients(recipient_role)
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error

    return NextResponse.json({ schedules })
  } catch (error) {
    console.error('Document schedules GET failed:', error instanceof Error ? error.name : 'unknown_error')
    return NextResponse.json({ error: 'No fue posible cargar las programaciones.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const access = await requireCopilotRole(['ceo', 'director'])
  if (!access.ok) return access.response

  try {
    const body = await request.json()
    const {
      document_id,
      title,
      description,
      cadence,
      day_of_week,
      day_of_month,
      send_time,
      recipient_roles,
    } = body

    if (!document_id || !title || !VALID_CADENCES.has(cadence)) {
      return NextResponse.json(
        { error: 'document_id, title y una cadencia válida son requeridos.' },
        { status: 400 },
      )
    }

    if (cadence === 'weekly' && !VALID_WEEKDAYS.has(day_of_week)) {
      return NextResponse.json(
        { error: 'La programación semanal requiere un día de semana válido.' },
        { status: 400 },
      )
    }

    const monthlyDay = Number(day_of_month)
    if (cadence === 'monthly' && (!Number.isInteger(monthlyDay) || monthlyDay < 1 || monthlyDay > 28)) {
      return NextResponse.json(
        { error: 'La programación mensual requiere un día entre 1 y 28.' },
        { status: 400 },
      )
    }

    const roles = Array.isArray(recipient_roles) ? recipient_roles : []
    if (roles.some((role) => typeof role !== 'string' || !VALID_RECIPIENT_ROLES.has(role))) {
      return NextResponse.json(
        { error: 'Existe un rol destinatario no permitido.' },
        { status: 400 },
      )
    }

    const supabase = getSupabaseClient()
    const { data: schedule, error: scheduleError } = await supabase
      .from('document_schedules')
      .insert({
        document_id,
        title,
        description,
        cadence,
        day_of_week: cadence === 'weekly' ? day_of_week : null,
        day_of_month: cadence === 'monthly' ? monthlyDay : null,
        send_time: send_time || '09:00:00',
        active: true,
        created_by: access.value.userId,
      })
      .select()
      .single()

    if (scheduleError) throw scheduleError

    if (roles.length > 0) {
      const recipients = roles.map((role: string) => ({
        schedule_id: schedule.id,
        recipient_role: role,
        active: true,
      }))

      const { error: recipientError } = await supabase
        .from('document_recipients')
        .insert(recipients)

      if (recipientError) {
        console.error('Document schedule recipient insert failed:', recipientError.code ?? 'unknown_error')
        const { error: rollbackError } = await supabase
          .from('document_schedules')
          .delete()
          .eq('id', schedule.id)

        if (rollbackError) {
          console.error('Document schedule rollback failed:', rollbackError.code ?? 'unknown_error')
        }
        return NextResponse.json(
          { error: 'No fue posible completar la programación de destinatarios.' },
          { status: 500 },
        )
      }
    }

    return NextResponse.json({ schedule }, { status: 201 })
  } catch (error) {
    console.error('Document schedules POST failed:', error instanceof Error ? error.name : 'unknown_error')
    return NextResponse.json({ error: 'No fue posible crear la programación.' }, { status: 500 })
  }
}
