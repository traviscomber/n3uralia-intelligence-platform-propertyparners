import type { SupabaseClient } from '@supabase/supabase-js'
import type { ManagementReportRecord } from '@/lib/management-report-artifact'
import { buildManagementReportComparisons, enrichManagementReportWithComparisons } from '@/lib/management-report-comparisons'

type ReportWithEntity = ManagementReportRecord & { entity_id