import { requireAnyPageCapability } from '@/lib/access-guards'
import { ValuationEvidenceReport } from '@/components/valuation/valuation-evidence-report'
import { ValuationExecutiveSummary } from '@/components/valuation/valuation-executive-summary'
import { ValuationReportProfessionalInsight } from '@/components/valuation/valuation-report-professional-insight'
import { ValuationReportStatusBanner } from '@/components/valuation/valuation-report-status-banner'

export default async function ValuationReportPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAnyPageCapability(['valuations.self.create', 'valuations.office.review', 'valuations.global.read'])
  const { id } = await params
  return <>
    <ValuationReportStatusBanner valuationId={id} />
    <ValuationExecutiveSummary valuationId={id} />
    <ValuationReportProfessionalInsight valuationId={id} />
    <ValuationEvidenceReport valuationId={id} />
  </>
}
