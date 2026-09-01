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
    const monthlySchedules = schedules.filter((schedule) => schedule.cadence === 'monthly')
    let distributionsCreated = 0

    for (const schedule of monthlySchedules) {
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
            'monthly',
            undefined,
            schedule.day_of_month,
            schedule.send_time,
          )
        }
      } catch (error) {
        console.error(
          `[Document Delivery] Monthly schedule ${schedule.id} failed:`,
          error instanceof Error ? error.message : 'DOCUMENT_DELIVERY_UNKNOWN_ERROR',
        )
      }
    }

    return NextResponse.json({
      configured: true,
      schedules: monthlySchedules.length,
      distributionsCreated,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error(
      '[Document Delivery] Monthly cron failed:',
      error instanceof Error ? error.message : 'DOCUMENT_DELIVERY_UNKNOWN_ERROR',
    )
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export const GET = handleCron
export const POST = handleCron
