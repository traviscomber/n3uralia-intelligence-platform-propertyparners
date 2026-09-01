import { NextResponse } from 'next/server'
import { getCronAuthorizationFailure } from '@/lib/management-report-schedule'
import {
  getScheduledDocuments,
  createDocumentDistributions,
  updateScheduleNextSendAt,
} from '@/lib/document-delivery'
import { getRecipientsForSchedule } from '@/lib/document-recipient-resolution'

export const runtime = 'nodejs'

async function handleCron(request: Request) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  const authFailure = getCronAuthorizationFailure(authHeader, cronSecret)
  if (authFailure) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
        console.error(
          `[Document Delivery] Weekly schedule ${schedule.id} failed:`,
          error instanceof Error ? error.message : 'DOCUMENT_DELIVERY_UNKNOWN_ERROR',
        )
      }
    }

    return NextResponse.json({
      configured: true,
      schedules: weeklySchedules.length,
      distributionsCreated,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error(
      '[Document Delivery] Weekly cron failed:',
      error instanceof Error ? error.message : 'DOCUMENT_DELIVERY_UNKNOWN_ERROR',
    )
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export const GET = handleCron
export const POST = handleCron
