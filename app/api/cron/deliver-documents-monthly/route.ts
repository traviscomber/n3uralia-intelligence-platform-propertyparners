import { NextResponse } from 'next/server'
import { getCronAuthorizationFailure } from '@/lib/management-report-schedule'
import {
  getScheduledDocuments,
  createDocumentDistributions,
  getRecipientsForSchedule,
} from '@/lib/document-delivery'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  // Verify CRON_SECRET
  const authFailure = getCronAuthorizationFailure(request)
  if (authFailure) {
    return NextResponse.json({ error: 'Unauthorized', details: authFailure }, { status: 401 })
  }

  try {
    // Get all active monthly document schedules
    const schedules = await getScheduledDocuments()
    const monthlySchedules = schedules.filter((s) => s.cadence === 'monthly')

    let distributionsCreated = 0

    for (const schedule of monthlySchedules) {
      try {
        // Get recipients for this schedule
        const recipients = await getRecipientsForSchedule(schedule.id)

        if (recipients.length > 0) {
          // Create distribution records for each recipient
          await createDocumentDistributions(
            schedule.id,
            recipients.map((r) => ({
              email: r.email,
              role: r.role,
            }))
          )

          distributionsCreated += recipients.length
        }
      } catch (error) {
        console.error(`[Document Delivery] Error processing schedule ${schedule.id}:`, error)
        continue
      }
    }

    return NextResponse.json({
      configured: true,
      schedules: monthlySchedules.length,
      distributionsCreated,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[Document Delivery] Cron error:', error)
    return NextResponse.json({ error: 'Internal server error', details: String(error) }, { status: 500 })
  }
}
