import { createClient } from '@supabase/supabase-js'
import { buildManagementReportPdf, type ManagementReportRecord } from '@/lib/management-report-artifact'

async function main() {
  const reportId = '4e737aa8-0abb-4a98-841f-708cd0dcdf27'
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) throw new Error('Missing Supabase QA environment')

  const supabase = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data, error } = await supabase
    .from('management_report_runs')
    .select('id,report_type,period_start,period_end,generated_at,snapshot')
    .eq('id', reportId)
    .single()

  if (error || !data) throw new Error(`February report lookup failed: ${error?.message ?? 'not found'}`)
  if (data.period_start !== '2026-02-01' || data.period_end !== '2026-02-28') throw new Error('Unexpected February period')
  if (data.snapshot?.schemaVersion !== 'canonical-monthly-report-v1') throw new Error('Unexpected report schema')
  if (data.snapshot?.completeness?.operationalReportReady !== true) throw new Error('February report is not operationally ready')
  if (data.snapshot?.completeness?.fullManagementScoreReady !== false) throw new Error('February report must keep incomplete management score blocked')
  if ((data.snapshot?.completeness?.blocked?.length ?? 0) !== 8) throw new Error('February must expose exactly 8 blocked dimensions')
  if (data.snapshot?.company?.visitasAgendadas != null || data.snapshot?.company?.visitasRealizadas != null) throw new Error('February visit metrics must remain unavailable, not fabricated')

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
    visitsAvailable: false,
  }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
