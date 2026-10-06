import { ReportQuickGenerator } from '@/components/management/report-quick-generator'
import { PedroPabloOperationalMemory } from '@/components/intelligence/pedro-pablo-operational-memory'
import { PedroPabloWorkspaceV2 } from '@/components/intelligence/pedro-pablo-workspace-v2'
import { reportBranches, reportPartners } from '@/lib/report-audiences'

export default function PedroPabloPage() {
  return <div className="space-y-8">
    <PedroPabloWorkspaceV2 />

    <details className="border-t border-[var(--n3-line)] pt-4">
      <summary className="cursor-pointer text-xs font-medium text-[var(--n3-text-muted)] hover:text-[var(--n3-text-light)]">
        Ver herramientas
      </summary>
      <div className="mt-6 space-y-8">
        <ReportQuickGenerator branches={reportBranches} partners={reportPartners} compact />
        <PedroPabloOperationalMemory />
      </div>
    </details>
  </div>
}
