import { ReportQuickGenerator } from '@/components/management/report-quick-generator'
import { PedroPabloOperationalMemory } from '@/components/intelligence/pedro-pablo-operational-memory'
import { PedroPabloWorkspaceV2 } from '@/components/intelligence/pedro-pablo-workspace-v2'
import { reportBranches, reportPartners } from '@/lib/report-audiences'

export default function PedroPabloPage() {
  return <div className="space-y-8">
    <PedroPabloWorkspaceV2 />
    <ReportQuickGenerator branches={reportBranches} partners={reportPartners} compact />
    <PedroPabloOperationalMemory />
  </div>
}
