import { requirePageCapability } from '@/lib/access-guards'
import { ValuationEvidenceReport } from '@/components/valuation/valuation-evidence-report'

export default async function ValuationReportPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePageCapability(['valuations.self.create', 'valuations.office.review', 'valuations.global.read'])
  const { id } = await params
  return <ValuationEvidenceReport valuationId={id} />
}
