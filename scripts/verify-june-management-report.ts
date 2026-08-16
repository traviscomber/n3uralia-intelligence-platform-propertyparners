import { createClient } from '@supabase/supabase-js'
import { buildManagementReportPdf, type ManagementReportRecord } from '@/lib/management-report-artifact'

async function main() {
  const reportId = 'd23ab3e2-82a4-486b-8c11-cd547f28785c'
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) throw new Error('Missing Supabase QA environment')

  const supabase = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data, error } = await supabase
    .from('management_report_runs')
    .select('id,report_type,period_start,period_end,generated_at,snapshot')
    .eq('id', reportId)
    .single()

  if (error || !data) throw new Error(`April report lookup failed: ${error?.message ?? 'not found'}`)
  if (data.period_start !== '2026-04-01' || data.period_end !== '2026-04-30') throw new Error('Unexpected April period')
  if (data.snapshot?.schemaVersion !== 'canonical-monthly-report-v1') throw new Error('Unexpected report schema')
  if (data.snapshot?.completeness?.operationalReportReady !== true) throw new Error('April report is not operationally ready')
  if (data.snapshot?.completeness?.fullManagementScoreReady !== false) throw new Error('April report must keep incomplete management score blocked')

  const artifact = await buildManagementReportPdf(data as ManagementReportRecord)
  const bytes = Buffer.from(artifact.bytes)
  if (bytes.length < 1000) throw new Error(`PDF unexpectedly small: ${bytes.length}`)
  if (bytes.subarray(0, 5).toString('ascii') !== '%PDF-') throw new Error('Artifact is not a PDF')

  console.log(JSON.stringify({
    status: 'ok',
    reportId,
    period: `${data.period_start}..${data.period_end}`,
    filename: artifact.filename,
    pdfBytes: bytes.length,
    operationalReportReady: data.snapshot.completeness.operationalReportReady,
    fullManagementScoreReady: data.snapshot.completeness.fullManagementScoreReady,
    blockedDimensions: data.snapshot.completeness.blocked?.length ?? 0,
  }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
