import { PartnerOperationalWorkspace } from '@/components/management/partner-operational-workspace'
import { PartnerPerformanceSummary } from '@/components/management/partner-performance-summary'
import { DataLayerLegend } from '@/components/management/data-layer-legend'

export default function PartnerDashboard() {
  return <>
    <PartnerOperationalWorkspace />
    <details className="mx-4 mt-6 border-t border-[var(--n3-line)] pt-4 lg:mx-8">
      <summary className="min-h-11 cursor-pointer py-3 text-sm font-medium text-[var(--n3-text-muted)] hover:text-[var(--n3-text-light)]">Ver mi desempeño</summary>
      <div className="mt-4">
        <PartnerPerformanceSummary />
      </div>
    </details>
    <details className="mx-4 mt-4 border-t border-[var(--n3-line)] pt-4 lg:mx-8">
      <summary className="min-h-11 cursor-pointer py-3 text-xs font-medium text-[var(--n3-text-muted)] hover:text-[var(--n3-text-light)]">Ver datos de respaldo</summary>
      <div className="mt-4">
        <DataLayerLegend />
      </div>
    </details>
  </>
}
