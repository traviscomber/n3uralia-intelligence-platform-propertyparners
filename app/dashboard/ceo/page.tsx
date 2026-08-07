import { CeoDashboardCommand } from '@/components/management/ceo-dashboard-command'
import { CeoIntelligenceGovernance } from '@/components/management/ceo-intelligence-governance'
import { CeoIntelligencePanel } from '@/components/management/ceo-intelligence-panel'

export default function CeoDashboard() {
  return (
    <>
      <div className="mx-auto w-full max-w-[1500px] space-y-4 px-4 pt-6 sm:px-6 lg:px-8">
        <CeoIntelligencePanel />
        <CeoIntelligenceGovernance />
      </div>
      <CeoDashboardCommand />
    </>
  )
}
