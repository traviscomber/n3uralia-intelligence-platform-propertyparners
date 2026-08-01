import { CeoDashboardV2 } from '@/components/management/ceo-dashboard-v2'
import { DataLayerLegend } from '@/components/management/data-layer-legend'

export default function CeoDashboard() {
  return <>
    <DataLayerLegend showProvisionalRules />
    <CeoDashboardV2 />
  </>
}
