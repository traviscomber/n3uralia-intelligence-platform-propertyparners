import { NextResponse } from 'next/server'
import { getCronAuthorizationFailure } from '@/lib/management-report-schedule'
import { recoverStaleDocumentDistributionClaims } from '@/lib/document-delivery-recovery'
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
    let claimed = 0
    let sent = 0
    let failed = 0

    const recovered = await recoverStaleDocumentDistributionClaims()
    const distributions = (await getPendingDocumentDistributions(50)) as any[]

    for (const distribution of distributions) {
      try {
        const claimedDist = await claimDocumentDistribution(distribution.id)
        if (!claimedDist) continue
        claimed++

        const details = (await getDocumentDetails(distribution.schedule_id)) as any
        if (!details || !details.documents) {
          throw new Error('Document details not found')
        }

        try {
          const response = await sendDocumentEmail(
            distribution.id,
            distribution.schedule_id,
            details.documents.title,
            details.documents.file_url,
            distribution.recipient_email,
          )

          if (response.data?.id) {
            await markDocumentAsSent(distribution.id, response.data.id)
            sent++

            const remaining = await getPendingDocumentDistributions(1)
            if (remaining.length === 0) {
              await updateScheduleNextSendAt(
                distribution.schedule_id,
                details.cadence,
                details.day_of_week,
                details.day_of_month,
                details.send_time,
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
      }
    }

    return NextResponse.json({
      configured: true,
      recovered,
      claimed,
      sent,
      failed,
      total: distributions.length,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorDetails = error instanceof Error ? error.stack : JSON.stringify(error)
    console.error('[Document Delivery Claim] Cron error:', errorMessage, errorDetails)
    return NextResponse.json({ error: 'Internal server error', details: errorMessage }, { status: 500 })
  }
}

export const GET = handleCron
export const POST = handleCron
