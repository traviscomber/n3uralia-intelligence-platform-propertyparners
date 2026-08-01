import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSubscribersForReport } from '@/lib/report-subscriptions'

export async function syncSubscribersToReportDistribution(
  reportRunId: string,
  reportType: string,
  entityId?: string
): Promise<{ synced: number; skipped: number; errors: string[] }> {
  try {
    const subscribers = await getSubscribersForReport(reportType, entityId)

    if (!subscribers.length) {
      return { synced: 0, skipped: 0, errors: [] }
    }

    const supabase = await createAdminClient()
    const errors: string[] = []
    let synced = 0
    let skipped = 0

    for (const subscriber of subscribers) {
      try {
        const { error } = await supabase.from('management_report_distributions').upsert(
          {
            report_run_id: reportRunId,
            recipient: subscriber.email,
            channel: 'email',
            status: 'pending',
          },
          { onConflict: 'report_run_id,recipient,channel' }
        )

        if (error) {
          errors.push(`${subscriber.email}: ${error.message}`)
          skipped++
        } else {
          synced++
        }
      } catch (cause) {
        const msg = cause instanceof Error ? cause.message : 'Unknown error'
        errors.push(`${subscriber.email}: ${msg}`)
        skipped++
      }
    }

    return { synced, skipped, errors }
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Unknown error'
    console.error('[sync-subscriptions] failed:', message)
    return { synced: 0, skipped: 0, errors: [message] }
  }
}
