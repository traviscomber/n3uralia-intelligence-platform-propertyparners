import { requireAnyPageCapability } from '@/lib/access-guards'
import { CanonicalManagementReport } from '@/components/management/canonical-management-report'

export default async function CanonicalManagementReportPage() {
  await requireAnyPageCapability(['reports.global.read', 'presentations.global.read', 'dashboard.global.read'])
  return <CanonicalManagementReport />
}
