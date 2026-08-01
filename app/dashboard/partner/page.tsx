import { PartnerOperationalWorkspace } from '@/components/management/partner-operational-workspace'
import { PartnerPerformanceSummary } from '@/components/management/partner-performance-summary'
import { DataLayerLegend } from '@/components/management/data-layer-legend'

export default function PartnerDashboard() {
  return <>
    <DataLayerLegend />
    <PartnerPerformanceSummary />
    <PartnerOperationalWorkspace />
  </>
}
