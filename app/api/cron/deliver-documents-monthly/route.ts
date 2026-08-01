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
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorDetails = error instanceof Error ? error.stack : JSON.stringify(error)
    console.error('[Document Delivery] Cron error:', errorMessage, errorDetails)
    return new NextResponse(JSON.stringify({ error: 'Internal server error', details: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
