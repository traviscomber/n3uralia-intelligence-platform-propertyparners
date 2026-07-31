import { ManagementRoleDashboard } from '@/components/management/role-dashboard'
import { PartnerOperationalWorkspace } from '@/components/management/partner-operational-workspace'
import { PartnerPerformanceSummary } from '@/components/management/partner-performance-summary'

export default function PartnerDashboard() {
  return <>
    <ManagementRoleDashboard view="partner" />
    <PartnerPerformanceSummary />
    <PartnerOperationalWorkspace />
  </>
}
