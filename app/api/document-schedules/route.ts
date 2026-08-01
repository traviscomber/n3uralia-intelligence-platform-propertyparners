import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { requireCopilotRole } from '@/lib/copilot-authorization'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    await requireCopilotRole(['ceo', 'director'])

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')

    const { data: schedules, error } = await supabase
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
    const message = error instanceof Error ? error.message : 'Unauthorized'
    const statusCode = message === 'Unauthorized' ? 401 : 500
    return NextResponse.json({ error: message }, { status: statusCode })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireCopilotRole(['ceo', 'director'])

    const body = await request.json()
    const { document_id, title, description, cadence, day_of_week, day_of_month, send_time, recipient_roles } = body

    if (!document_id || !title || !cadence) {
      return NextResponse.json(
        { error: 'Missing required fields: document_id, title, cadence' },
        { status: 400 }
      )
    }

    if (cadence === 'weekly' && !day_of_week) {
      return NextResponse.json(
        { error: 'day_of_week required for weekly cadence' },
        { status: 400 }
      )
    }

    if (cadence === 'monthly' && !day_of_month) {
      return NextResponse.json(
        { error: 'day_of_month required for monthly cadence' },
        { status: 400 }
      )
    }

    // Create schedule
    const { data: schedule, error: scheduleError } = await supabase
      .from('document_schedules')
      .insert({
        document_id,
        title,
        description,
        cadence,
        day_of_week,
        day_of_month,
        send_time: send_time || '09:00:00',
        active: true,
      })
      .select()
      .single()

    if (scheduleError) throw scheduleError

    // Add recipients
    if (recipient_roles && recipient_roles.length > 0) {
      const recipients = recipient_roles.map((role: string) => ({
        schedule_id: schedule.id,
        recipient_role: role,
        active: true,
      }))

      const { error: recipientError } = await supabase
        .from('document_recipients')
        .insert(recipients)

      if (recipientError) throw recipientError
    }

    return NextResponse.json({ schedule }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Server error'
    const statusCode = message === 'Unauthorized' ? 401 : 500
    return NextResponse.json({ error: message }, { status: statusCode })
  }
}
