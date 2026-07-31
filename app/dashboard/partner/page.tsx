import { ManagementRoleDashboard } from '@/components/management/role-dashboard'
import { PartnerOperationalWorkspace } from '@/components/management/partner-operational-workspace'

export default function PartnerDashboard() {
  return <>
    <ManagementRoleDashboard view="partner" />
    <PartnerOperationalWorkspace />
  </>
}
