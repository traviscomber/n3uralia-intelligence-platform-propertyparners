import { requireAnyPageCapability } from '@/lib/access-guards'
import { ValuationEvidenceReport } from '@/components/valuation/valuation-evidence-report'
import { ValuationReportStatusBanner } from '@/components/valuation/valuation-report-status-banner'

export default async function ValuationReportPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAnyPageCapability(['valuations.self.create', 'valuations.office.review', 'valuations.global.read'])
  const { id } = await params
  return <>
    <ValuationReportStatusBanner valuationId={id} />
    <ValuationEvidenceReport valuationId={id} />
  </>
}
