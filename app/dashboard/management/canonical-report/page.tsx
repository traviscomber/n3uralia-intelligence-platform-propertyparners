import { requireAnyPageCapability } from '@/lib/access-guards'
import { CanonicalManagementReport } from '@/components/management/canonical-management-report'

export default async function CanonicalManagementReportPage() {
  await requireAnyPageCapability(['management.global.read', 'reports.global.read'])
  return <CanonicalManagementReport />
}
