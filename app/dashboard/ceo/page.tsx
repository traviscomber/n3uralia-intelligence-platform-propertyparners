import { CeoDashboardV2 } from '@/components/management/ceo-dashboard-v2'
import { CeoIntelligencePanel } from '@/components/management/ceo-intelligence-panel'
import { DataLayerLegend } from '@/components/management/data-layer-legend'

export default function CeoDashboard() {
  return <>
    <DataLayerLegend showProvisionalRules />
    <CeoIntelligencePanel />
    <CeoDashboardV2 />
  </>
}
