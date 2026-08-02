import { CeoDecisions } from '@/components/management/ceo-decisions'
import { CeoIntelligencePanel } from '@/components/management/ceo-intelligence-panel'

export default function CeoDecisionsPage(){
  return <div className="space-y-6">
    <CeoIntelligencePanel />
    <CeoDecisions />
  </div>
}
