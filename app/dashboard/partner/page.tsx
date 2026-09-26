import { PartnerOperationalWorkspace } from '@/components/management/partner-operational-workspace'
import { PartnerPerformanceSummary } from '@/components/management/partner-performance-summary'

export default function PartnerDashboard() {
  return <>
    <PartnerOperationalWorkspace />
    <details className="mx-4 mt-6 border-t border-[var(--n3-line)] pt-4 lg:mx-8">
      <summary className="min-h-11 cursor-pointer py-3 text-sm font-medium text-[var(--n3-text-muted)] hover:text-[var(--n3-text-light)]">Ver mi desempeño</summary>
      <div className="mt-4">
        <PartnerPerformanceSummary />
      </div>
    </details>
  </>
}
