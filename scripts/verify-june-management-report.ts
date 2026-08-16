import { createClient } from '@supabase/supabase-js'
import { buildManagementReportPdf, type ManagementReportRecord } from '@/lib/management-report-artifact'

const reportId = '5b9bbd40-78ac-40b8-9879-46ad1490db26'
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceRoleKey) throw new Error('Missing Supabase QA environment')

const supabase = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
const { data, error } = await supabase
  .from('management_report_runs')
  .select('id,report_type,period_start,period_end,generated_at,snapshot')
  .eq('id', reportId)
  .single()

if (error || !data) throw new Error(`June report lookup failed: ${error?.message ?? 'not found'}`)
if (data.period_start !== '2026-06-01' || data.period_end !== '2026-06-30') throw new Error('Unexpected June period')
if (data.snapshot?.schemaVersion !== 'canonical-monthly-report-v1') throw new Error('Unexpected report schema')
if (data.snapshot?.completeness?.operationalReportReady !== true) throw new Error('June report is not operationally ready')
if (data.snapshot?.completeness?.fullManagementScoreReady !== false) throw new Error('June report must keep incomplete management score blocked')

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
