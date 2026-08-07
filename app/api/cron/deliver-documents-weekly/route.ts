import { NextResponse } from 'next/server'
import { getCronAuthorizationFailure } from '@/lib/management-report-schedule'
import {
  getScheduledDocuments,
  createDocumentDistributions,
  getRecipientsForSchedule,
  updateScheduleNextSendAt,
} from '@/lib/document-delivery'

export const runtime = 'nodejs'

async function handleCron(request: Request) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  const authFailure = getCronAuthorizationFailure(authHeader, cronSecret)
  if (authFailure) {
    return new NextResponse(JSON.stringify({ error: 'Unauthorized', details: authFailure }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const schedules = await getScheduledDocuments()
    const weeklySchedules = schedules.filter((schedule) => schedule.cadence === 'weekly')
    let distributionsCreated = 0

    for (const schedule of weeklySchedules) {
      try {
        const recipients = await getRecipientsForSchedule(schedule.id)
        if (recipients.length > 0) {
          const created = await createDocumentDistributions(
            schedule.id,
            schedule.next_send_at,
            recipients.map((recipient) => ({ email: recipient.email, role: recipient.role })),
          )
          distributionsCreated += created.length
          await updateScheduleNextSendAt(
            schedule.id,
            'weekly',
            schedule.day_of_week,
            undefined,
            schedule.send_time,
          )
        }
      } catch (error) {
        console.error(`[Document Delivery] Error processing schedule ${schedule.id}:`, error)
      }
    }

    return NextResponse.json({
      configured: true,
      schedules: weeklySchedules.length,
      distributionsCreated,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorDetails = error instanceof Error ? error.stack : JSON.stringify(error)
    console.error('[Document Delivery] Cron error:', errorMessage, errorDetails)
    return NextResponse.json({ error: 'Internal server error', details: errorMessage }, { status: 500 })
  }
}

export const GET = handleCron
export const POST = handleCron
