import { getCronAuthorizationFailure } from '@/lib/management-report-schedule'
import {
  getPendingDocumentDistributions,
  claimDocumentDistribution,
  getDocumentDetails,
  sendDocumentEmail,
  markDocumentAsSent,
  markDocumentAsFailed,
  updateScheduleNextSendAt,
} from '@/lib/document-delivery'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: Request) {
  // Verify CRON_SECRET
  const authFailure = getCronAuthorizationFailure(request)
  if (authFailure) {
    return Response.json({ error: 'Unauthorized', details: authFailure }, { status: 401 })
  }

  try {
    let claimed = 0
    let sent = 0
    let failed = 0

    // Get pending distributions
    const distributions = await getPendingDocumentDistributions(50)

    for (const distribution of distributions) {
      try {
        // Claim this distribution
        const claimed_dist = await claimDocumentDistribution(distribution.id)
        if (!claimed_dist) continue
        claimed++

        // Get document details
        const details = await getDocumentDetails(distribution.schedule_id)
        if (!details || !details.documents) {
          throw new Error('Document details not found')
        }

        // Send email
        try {
          const response = await sendDocumentEmail(
            distribution.id,
            distribution.schedule_id,
            details.documents.title,
            details.documents.file_url,
            distribution.recipient_email
          )

          if (response.id) {
            await markDocumentAsSent(distribution.id, response.id)
            sent++

            // Update schedule next_send_at if this is the last distribution for today
            const remaining = await getPendingDocumentDistributions(1)
            if (remaining.length === 0) {
              await updateScheduleNextSendAt(
                distribution.schedule_id,
                details.cadence,
                details.day_of_week,
                details.day_of_month,
                details.send_time
              )
            }
          }
        } catch (sendError) {
          const errorMsg = sendError instanceof Error ? sendError.message : 'Unknown error'
          await markDocumentAsFailed(distribution.id, errorMsg, distribution.attempt_count + 1)
          failed++
        }
      } catch (error) {
        console.error(`[Document Claim] Error processing distribution ${distribution.id}:`, error)
        failed++
        continue
      }
    }

    return Response.json({
      configured: true,
      claimed,
      sent,
      failed,
      total: distributions.length,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[Document Delivery Claim] Cron error:', error)
    return Response.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    )
  }
}
