import { PartnerOperationalWorkspace } from '@/components/management/partner-operational-workspace'
import { PartnerPerformanceSummary } from '@/components/management/partner-performance-summary'
import { DataLayerLegend } from '@/components/management/data-layer-legend'

export default function PartnerDashboard() {
  return <>
    <PartnerPerformanceSummary />
    <details className="mx-4 mt-6 border-t border-[var(--n3-line)] pt-4 lg:mx-8">
      <summary className="cursor-pointer text-xs font-medium text-[var(--n3-text-muted)] hover:text-[var(--n3-text-light)]">Ver detalle operativo y datos</summary>
      <div className="mt-5">
        <PartnerOperationalWorkspace />
        <DataLayerLegend />
      </div>
    </details>
  </>
}
